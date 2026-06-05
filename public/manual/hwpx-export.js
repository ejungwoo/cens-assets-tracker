(() => {
  const TEMPLATE_URL = "template.hwpx";
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let templateBytesPromise = null;
  let injectedTemplateBytes = null;

  function xmlEscape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  function createCrc32Table() {
    const table = [];
    for (let i = 0; i < 256; i += 1) {
      let value = i;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      table.push(value >>> 0);
    }
    return table;
  }

  const crcTable = createCrc32Table();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function writeUint16(bytes, value) {
    bytes.push(value & 0xff, (value >>> 8) & 0xff);
  }

  function writeUint32(bytes, value) {
    bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  }

  function readUint16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  function readUint32(bytes, offset) {
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  }

  function appendBytes(target, source) {
    for (let i = 0; i < source.length; i += 1) {
      target.push(source[i]);
    }
  }

  function getDosDateTime() {
    const now = new Date();
    const year = Math.max(1980, now.getFullYear());
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const dosDate = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    return { dosTime, dosDate };
  }

  function findEndOfCentralDirectory(bytes) {
    for (let i = bytes.length - 22; i >= 0; i -= 1) {
      if (readUint32(bytes, i) === 0x06054b50) return i;
    }
    throw new Error("HWPX template ZIP footer was not found.");
  }

  function parseStoredZip(bytes) {
    const eocd = findEndOfCentralDirectory(bytes);
    const entryCount = readUint16(bytes, eocd + 10);
    const centralOffset = readUint32(bytes, eocd + 16);
    const entries = [];
    let offset = centralOffset;

    for (let i = 0; i < entryCount; i += 1) {
      if (readUint32(bytes, offset) !== 0x02014b50) {
        throw new Error("Invalid HWPX template central directory.");
      }

      const method = readUint16(bytes, offset + 10);
      const compressedSize = readUint32(bytes, offset + 20);
      const uncompressedSize = readUint32(bytes, offset + 24);
      const nameLength = readUint16(bytes, offset + 28);
      const extraLength = readUint16(bytes, offset + 30);
      const commentLength = readUint16(bytes, offset + 32);
      const localOffset = readUint32(bytes, offset + 42);
      const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));

      if (method !== 0) {
        throw new Error(`HWPX template entry is compressed and cannot be reused in-browser: ${name}`);
      }
      if (compressedSize !== uncompressedSize) {
        throw new Error(`HWPX template entry size mismatch: ${name}`);
      }
      if (readUint32(bytes, localOffset) !== 0x04034b50) {
        throw new Error(`Invalid HWPX template local header: ${name}`);
      }

      const localNameLength = readUint16(bytes, localOffset + 26);
      const localExtraLength = readUint16(bytes, localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      entries.push({ name, data: bytes.slice(dataStart, dataStart + uncompressedSize) });
      offset += 46 + nameLength + extraLength + commentLength;
    }

    return entries;
  }

  function createStoredZip(entries) {
    const fileBytes = [];
    const centralBytes = [];
    const { dosTime, dosDate } = getDosDateTime();
    let offset = 0;

    entries.forEach((entry) => {
      const nameBytes = encoder.encode(entry.name);
      const dataBytes = typeof entry.data === "string" ? encoder.encode(entry.data) : entry.data;
      const checksum = crc32(dataBytes);
      const localOffset = offset;

      writeUint32(fileBytes, 0x04034b50);
      writeUint16(fileBytes, 20);
      writeUint16(fileBytes, 0x0800);
      writeUint16(fileBytes, 0);
      writeUint16(fileBytes, dosTime);
      writeUint16(fileBytes, dosDate);
      writeUint32(fileBytes, checksum);
      writeUint32(fileBytes, dataBytes.length);
      writeUint32(fileBytes, dataBytes.length);
      writeUint16(fileBytes, nameBytes.length);
      writeUint16(fileBytes, 0);
      appendBytes(fileBytes, nameBytes);
      appendBytes(fileBytes, dataBytes);
      offset = fileBytes.length;

      writeUint32(centralBytes, 0x02014b50);
      writeUint16(centralBytes, 20);
      writeUint16(centralBytes, 20);
      writeUint16(centralBytes, 0x0800);
      writeUint16(centralBytes, 0);
      writeUint16(centralBytes, dosTime);
      writeUint16(centralBytes, dosDate);
      writeUint32(centralBytes, checksum);
      writeUint32(centralBytes, dataBytes.length);
      writeUint32(centralBytes, dataBytes.length);
      writeUint16(centralBytes, nameBytes.length);
      writeUint16(centralBytes, 0);
      writeUint16(centralBytes, 0);
      writeUint16(centralBytes, 0);
      writeUint16(centralBytes, 0);
      writeUint32(centralBytes, 0);
      writeUint32(centralBytes, localOffset);
      appendBytes(centralBytes, nameBytes);
    });

    const centralOffset = fileBytes.length;
    appendBytes(fileBytes, centralBytes);
    writeUint32(fileBytes, 0x06054b50);
    writeUint16(fileBytes, 0);
    writeUint16(fileBytes, 0);
    writeUint16(fileBytes, entries.length);
    writeUint16(fileBytes, entries.length);
    writeUint32(fileBytes, centralBytes.length);
    writeUint32(fileBytes, centralOffset);
    writeUint16(fileBytes, 0);

    return new Blob([new Uint8Array(fileBytes)], { type: "application/hwp+zip" });
  }

  function makeLines(payload, requestTypeLabel) {
    const labels = {
      applicantName: "신청자 이름",
      applicantOrg: "소속",
      takeoutPeriod: "반출 기간",
      takeoutReason: "반출 사유",
      takeoutPlace: "반출 장소",
      assetSharing: "자산공동활용여부",
      domesticOrInternational: "국외/국내 반출 여부",
      securityManagedItem: "보안관리대상물품 여부",
      customsExemptionNumber: "관세감면사후관리 대상물품 면세번호",
      extensionPeriod: "연장 기간",
      extensionReason: "연장 사유",
      returnDate: "반입 일자",
      returnReason: "반입 사유",
      returnPlace: "반입 장소",
    };
    const fields = payload.request?.fields || {};
    const title = requestTypeLabel ? `[${requestTypeLabel}] ${payload.title}` : payload.title;
    const lines = [title, ""];

    Object.entries(labels).forEach(([key, label]) => {
      if (fields[key]) lines.push(`${label}: ${fields[key]}`);
    });

    lines.push("", "# / 자산번호 / 자산명 / 자산설명");
    payload.rows
      .filter((row) => row.assetNumber || row.assetName || row.assetDescription)
      .forEach((row, index) => {
        const description = payload.printSettings?.description === "hide" ? "" : row.assetDescription;
        lines.push(`${index + 1}. ${row.assetNumber || ""} / ${row.assetName || ""}${description ? ` / ${description}` : ""}`);
      });

    return lines;
  }

  function randomId() {
    if (globalThis.crypto?.getRandomValues) {
      return crypto.getRandomValues(new Uint32Array(1))[0];
    }
    return Math.floor(Math.random() * 0xffffffff);
  }

  function paragraphXml(text, paraPrId = "0", charPrId = "0") {
    const runs = String(text || " ")
      .split(/\r?\n/)
      .map((line) => `<hp:run charPrIDRef="${charPrId}"><hp:t>${xmlEscape(line || " ")}</hp:t></hp:run>`)
      .join("");
    return `<hp:p id="${randomId()}" paraPrIDRef="${paraPrId}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">${runs}<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="42520" flags="393216"/></hp:linesegarray></hp:p>`;
  }

  function makeSectionXml(templateSection, lines) {
    const rootMatch = templateSection.match(/^([\s\S]*?<hs:sec\b[^>]*>)/);
    const firstParagraphMatch = templateSection.match(/<hp:p\b[\s\S]*?<\/hp:p>/);
    if (!rootMatch || !firstParagraphMatch) {
      throw new Error("HWPX template section is not usable.");
    }

    const sectionStart = rootMatch[1];
    const firstParagraph = firstParagraphMatch[0].replace(/<hp:t>[\s\S]*?<\/hp:t>/, "<hp:t> </hp:t>");
    const body = lines.map((line, index) => paragraphXml(line, index === 0 ? "12" : "0", index === 0 ? "5" : "0")).join("");
    return `${sectionStart}${firstParagraph}${body}</hs:sec>`;
  }

  function makeContentHpf(title) {
    const safeTitle = xmlEscape(title || "자산 목록");
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><opf:package xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" xmlns:epub="http://www.idpf.org/2007/ops" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0" version="" unique-identifier="" id=""><opf:metadata><opf:title>${safeTitle}</opf:title><opf:language>ko</opf:language><opf:meta name="creator" content="text">CENS Assets Tracker</opf:meta><opf:meta name="subject" content="text"/><opf:meta name="description" content="text"/><opf:meta name="lastsaveby" content="text">CENS Assets Tracker</opf:meta><opf:meta name="CreatedDate" content="text">${now}</opf:meta><opf:meta name="ModifiedDate" content="text">${now}</opf:meta><opf:meta name="date" content="text">${now}</opf:meta><opf:meta name="keyword" content="text"/></opf:metadata><opf:manifest><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/><opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/><opf:item id="settings" href="settings.xml" media-type="application/xml"/></opf:manifest><opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>`;
  }

  async function loadTemplateEntries() {
    if (injectedTemplateBytes) return parseStoredZip(injectedTemplateBytes);
    if (!templateBytesPromise) {
      templateBytesPromise = fetch(TEMPLATE_URL)
        .then((response) => {
          if (!response.ok) throw new Error("HWPX template could not be loaded.");
          return response.arrayBuffer();
        })
        .then((buffer) => new Uint8Array(buffer));
    }
    return parseStoredZip(await templateBytesPromise);
  }

  function replaceEntry(entries, name, data) {
    const entry = entries.find((item) => item.name === name);
    if (!entry) throw new Error(`HWPX template is missing ${name}.`);
    entry.data = data;
  }

  async function build(payload, requestTypeLabel) {
    const entries = await loadTemplateEntries();
    const templateSection = decoder.decode(entries.find((entry) => entry.name === "Contents/section0.xml")?.data || new Uint8Array());
    const lines = makeLines(payload, requestTypeLabel);
    const title = payload.title || "자산 목록";

    replaceEntry(entries, "Contents/section0.xml", makeSectionXml(templateSection, lines));
    replaceEntry(entries, "Contents/content.hpf", makeContentHpf(title));
    replaceEntry(entries, "Preview/PrvText.txt", lines.join("\n"));

    return createStoredZip(entries);
  }

  function setTemplateBytes(bytes) {
    injectedTemplateBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    templateBytesPromise = null;
  }

  window.CensHwpx = { build, setTemplateBytes };
})();
