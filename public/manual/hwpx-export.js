(() => {
  const encoder = new TextEncoder();

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

  function getDosDateTime() {
    const now = new Date();
    const year = Math.max(1980, now.getFullYear());
    const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const dosDate = ((year - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    return { dosTime, dosDate };
  }

  function appendBytes(target, source) {
    for (let i = 0; i < source.length; i += 1) {
      target.push(source[i]);
    }
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

  function para(text, paraPrId = "0") {
    const id = crypto.getRandomValues(new Uint32Array(1))[0];
    const runs = String(text || " ")
      .split(/\r?\n/)
      .map((line) => `<hp:run><hp:t>${xmlEscape(line || " ")}</hp:t></hp:run>`)
      .join("");
    return `<hp:p id="${id}" paraPrIDRef="${paraPrId}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">${runs}</hp:p>`;
  }

  function picPara(image) {
    const id = crypto.getRandomValues(new Uint32Array(1))[0];
    const width = 18000;
    const height = 12000;
    return `<hp:p id="${id}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run><hp:pic id="${image.id}" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None"><hp:sz width="${width}" height="${height}" widthRelTo="ABSOLUTE" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:shapeComment>${xmlEscape(image.label)}</hp:shapeComment><hp:imgRect><hp:pt0 x="0" y="0"/><hp:pt1 x="${width}" y="0"/><hp:pt2 x="${width}" y="${height}"/><hp:pt3 x="0" y="${height}"/></hp:imgRect><hp:imgClip left="0" right="0" top="0" bottom="0"/><hp:inMargin left="0" right="0" top="0" bottom="0"/><hp:img dimwidth="${width}" dimheight="${height}" bright="0" contrast="0" effect="REAL_PIC" binaryItemIDRef="${image.binId}"/></hp:pic></hp:run></hp:p>`;
  }

  function sectionXml(blocks) {
    const sectionId = crypto.getRandomValues(new Uint32Array(1))[0];
    const sectionPr = `<hp:p id="${sectionId}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run><hp:secPr id="1" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="LEFT" tabStopUnit="MILLI"><hp:pagePr landscape="0" width="59528" height="84188" gutterType="LEFT_ONLY"><hp:margin header="4252" footer="4252" gutter="0" left="5669" right="5669" top="5669" bottom="4252"/></hp:pagePr><hp:footNotePr/><hp:endNotePr/><hp:pageBorderFill type="BOTH" borderFillIDRef="0" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"/></hp:secPr></hp:run></hp:p>`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<hs:sec xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">
${sectionPr}
${blocks.join("\n")}
</hs:sec>`;
  }

  function headerXml(images) {
    const binItems = images
      .map((image) => `<hh:binItem type="EMBEDDING" id="${image.binId}" binData="${image.path}" format="${image.ext}"/>`)
      .join("");
    return `<?xml version="1.0" encoding="UTF-8"?>
<hh:head xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" version="1.1" secCnt="1">
  <hh:refList>
    <hh:binDataList count="${images.length}">${binItems}</hh:binDataList>
    <hh:fontfaces itemCnt="1"><hh:fontface lang="Hangul" fontCnt="1"><hh:font id="0" face="함초롬바탕" type="TTF"/></hh:fontface></hh:fontfaces>
    <hh:borderFills itemCnt="1"><hh:borderFill id="0" threeD="0" shadow="0"><hh:leftBorder type="NONE" width="0.1 mm" color="#000000"/><hh:rightBorder type="NONE" width="0.1 mm" color="#000000"/><hh:topBorder type="NONE" width="0.1 mm" color="#000000"/><hh:bottomBorder type="NONE" width="0.1 mm" color="#000000"/></hh:borderFill></hh:borderFills>
    <hh:charProperties itemCnt="1"><hh:charPr id="0" height="1000" textColor="#000000"><hh:fontRef hangul="0" latin="0" hanja="0" japanese="0" other="0" symbol="0" user="0"/></hh:charPr></hh:charProperties>
    <hh:paraProperties itemCnt="2">
      <hh:paraPr id="0" tabPrIDRef="0"><hh:align horizontal="LEFT" vertical="BASELINE"/><hh:lineSpacing type="PERCENT" value="160"/></hh:paraPr>
      <hh:paraPr id="1" tabPrIDRef="0"><hh:align horizontal="CENTER" vertical="BASELINE"/><hh:lineSpacing type="PERCENT" value="160"/></hh:paraPr>
    </hh:paraProperties>
    <hh:styles itemCnt="1"><hh:style id="0" type="PARA" name="바탕글" engName="Normal" paraPrIDRef="0" charPrIDRef="0" nextStyleIDRef="0" langID="1042" lockForm="0"/></hh:styles>
  </hh:refList>
</hh:head>`;
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

  function dataUrlToBytes(src) {
    const [metadata, data] = String(src || "").split(",");
    if (!metadata || !data) return null;
    const mimeMatch = /^data:([^;]+)/.exec(metadata);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { bytes, mimeType };
  }

  function imageExtension(mimeType) {
    if (mimeType === "image/jpeg") return "jpg";
    if (mimeType === "image/png") return "png";
    if (mimeType === "image/gif") return "gif";
    if (mimeType === "image/bmp") return "bmp";
    return "png";
  }

  function collectImages(payload) {
    const images = [];
    payload.rows.forEach((row, rowIndex) => {
      [
        ["numberPhoto", "자산번호 확대 사진"],
        ["wholePhoto", "자산 전체 사진"],
      ].forEach(([key, label]) => {
        const data = dataUrlToBytes(row[key]);
        if (!data) return;
        const ext = imageExtension(data.mimeType);
        const index = images.length + 1;
        images.push({
          id: index,
          binId: `bin${String(index).padStart(4, "0")}`,
          path: `BinData/image${index}.${ext}`,
          ext,
          bytes: data.bytes,
          rowIndex,
          label,
        });
      });
    });
    return images;
  }

  function makeBlocks(payload, requestTypeLabel, images) {
    const lines = makeLines(payload, requestTypeLabel);
    const blocks = lines.map((line, index) => para(line, index === 0 ? "1" : "0"));
    const showPhotos = payload.printSettings?.photos !== "hide";
    if (!showPhotos || !images.length) return blocks;

    blocks.push(para(" "), para("사진"));
    payload.rows.forEach((row, rowIndex) => {
      const rowImages = images.filter((image) => image.rowIndex === rowIndex);
      if (!rowImages.length) return;
      blocks.push(para(`${rowIndex + 1}. ${row.assetNumber || ""} ${row.assetName || ""}`.trim()));
      rowImages.forEach((image) => {
        blocks.push(para(image.label), picPara(image));
      });
    });
    return blocks;
  }

  function build(payload, requestTypeLabel) {
    const images = collectImages(payload);
    const blocks = makeBlocks(payload, requestTypeLabel, images);
    const previewLines = makeLines(payload, requestTypeLabel);
    const title = xmlEscape(payload.title || "자산 목록");
    const imageManifest = images
      .map((image) => `<opf:item id="${image.binId}" href="../${image.path}" media-type="image/${image.ext === "jpg" ? "jpeg" : image.ext}"/>`)
      .join("");
    const content = `<?xml version="1.0" encoding="UTF-8"?><opf:package xmlns:opf="http://www.idpf.org/2007/opf" version="3.0"><opf:metadata><opf:title>${title}</opf:title><opf:creator>CENS Assets Tracker</opf:creator><opf:language>ko-KR</opf:language></opf:metadata><opf:manifest><opf:item id="header" href="header.xml" media-type="application/xml"/><opf:item id="section0" href="section0.xml" media-type="application/xml"/>${imageManifest}</opf:manifest><opf:spine><opf:itemref idref="section0"/></opf:spine></opf:package>`;
    const entries = [
      { name: "mimetype", data: "application/hwp+zip" },
      { name: "META-INF/container.xml", data: `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="Contents/content.hpf" media-type="application/hwp+zip"/></rootfiles></container>` },
      { name: "Contents/content.hpf", data: content },
      { name: "Contents/header.xml", data: headerXml(images) },
      { name: "Contents/section0.xml", data: sectionXml(blocks) },
      { name: "version.xml", data: `<?xml version="1.0" encoding="UTF-8"?><version app="CENS Assets Tracker" version="1.0"/>` },
      { name: "settings.xml", data: `<?xml version="1.0" encoding="UTF-8"?><settings/>` },
      { name: "Preview/PrvText.txt", data: previewLines.join("\n") },
      ...images.map((image) => ({ name: image.path, data: image.bytes })),
    ];
    return createStoredZip(entries);
  }

  window.CensHwpx = { build };
})();
