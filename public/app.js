const STORAGE_KEYS = {
  assets: "cens.assets",
  records: "cens.records",
  presets: "cens.presets",
  myList: "cens.myList",
  operator: "cens.operator",
  backendUrl: "cens.backendUrl"
};

const state = {
  route: "home",
  routeParam: null,
  assets: [],
  records: [],
  presets: [],
  myList: [],
  operator: "",
  backendUrl: "",
  listSearch: "",
  listSort: "assetId",
  grabQuery: "",
  grabResults: [],
  recordFilter: "all"
};

class BackendGateway {
  constructor(localStore) {
    this.localStore = localStore;
  }

  async loadAll() {
    return this.localStore.loadAll();
  }

  async saveAll(data) {
    this.localStore.saveAll(data);
  }

  async syncWithGoogleSheets() {
    if (!state.backendUrl) return { ok: false, message: "Backend URL is not set." };
    return { ok: false, message: "Google Sheets sync extension point is ready but not connected yet." };
  }

  async uploadPhotoToDrive() {
    return { ok: false, message: "Google Drive photo upload extension point." };
  }

  async generateDocument() {
    return { ok: false, message: "PDF generation extension point." };
  }

  async prepareAuth() {
    return { ok: false, message: "Firebase Auth extension point." };
  }
}

const LocalStore = {
  loadAll() {
    const assets = readJson(STORAGE_KEYS.assets, null) || seedAssets();
    const records = readJson(STORAGE_KEYS.records, []);
    const presets = readJson(STORAGE_KEYS.presets, []);
    const myList = readJson(STORAGE_KEYS.myList, []);
    const operator = localStorage.getItem(STORAGE_KEYS.operator) || "";
    const backendUrl = localStorage.getItem(STORAGE_KEYS.backendUrl) || "";
    return { assets, records, presets, myList, operator, backendUrl };
  },
  saveAll(data) {
    localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(data.assets));
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(data.records));
    localStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(data.presets));
    localStorage.setItem(STORAGE_KEYS.myList, JSON.stringify(data.myList));
    localStorage.setItem(STORAGE_KEYS.operator, data.operator || "");
    localStorage.setItem(STORAGE_KEYS.backendUrl, data.backendUrl || "");
  }
};

const backend = new BackendGateway(LocalStore);
const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  Object.assign(state, await backend.loadAll());
  window.addEventListener("hashchange", routeFromHash);
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  routeFromHash();
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function seedAssets() {
  const now = new Date().toISOString();
  const today = dateOnly();
  return [
    {
      assetId: "1001",
      name: "Oscilloscope",
      description: "Digital oscilloscope for electronics bench work.",
      photo1: "",
      photo2: "",
      photo3: "",
      location: "Electronics Lab",
      lastInOutDate: today,
      lastVerifiedDate: today,
      lastVerifiedBy: "System",
      createdAt: now,
      updatedAt: now
    },
    {
      assetId: "1002",
      name: "Vacuum Pump",
      description: "Portable pump for sample preparation.",
      photo1: "",
      photo2: "",
      photo3: "",
      location: "Preparation Room",
      lastInOutDate: today,
      lastVerifiedDate: today,
      lastVerifiedBy: "System",
      createdAt: now,
      updatedAt: now
    }
  ];
}

function routeFromHash() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [route = "home", param = null] = hash.split("/");
  state.route = route || "home";
  state.routeParam = param ? decodeURIComponent(param) : null;
  render();
}

function navigate(route) {
  location.hash = route;
}

function persist() {
  backend.saveAll({
    assets: state.assets,
    records: state.records,
    presets: state.presets,
    myList: state.myList,
    operator: state.operator,
    backendUrl: state.backendUrl
  });
}

function render() {
  app.innerHTML = `${renderTopbar()}${renderPage()}`;
}

function renderTopbar() {
  const title = {
    home: "CENS Assets Tracker",
    assets: "List of Assets",
    asset: state.routeParam ? "Asset Detail" : "Add Asset",
    grab: "Grab Assets",
    mylist: "My List",
    records: "Records",
    presets: "Preset Lists",
    settings: "Settings"
  }[state.route] || "CENS Assets Tracker";
  const back = state.route === "home" ? "" : `<button class="ghost small" data-action="back">Back</button>`;
  return `<header class="topbar">${back}<h1>${escapeHtml(title)}</h1><button class="ghost small" data-nav="settings">Settings</button></header>`;
}

function renderPage() {
  if (state.route === "assets") return renderAssetsPage();
  if (state.route === "asset") return renderAssetForm();
  if (state.route === "grab") return renderGrabPage();
  if (state.route === "mylist") return renderMyListPage();
  if (state.route === "records") return renderRecordsPage();
  if (state.route === "presets") return renderPresetsPage();
  if (state.route === "settings") return renderSettingsPage();
  return renderHomePage();
}

function renderHomePage() {
  return `
    <main class="page">
      <section class="brand">
        <h2>CENS Assets Tracker</h2>
        <p>Track laboratory equipment check-out, check-in, and verification records.</p>
      </section>
      <section class="panel">
        <label>Current operator name
          <input data-bind="operator" value="${escapeAttr(state.operator)}" placeholder="Enter your name" autocomplete="name">
        </label>
      </section>
      <section class="button-stack">
        <button data-nav="assets">List of Assets</button>
        <button data-nav="grab">Grab Assets</button>
        <button data-nav="records">Checkout / Checkin / Verify Records</button>
      </section>
    </main>`;
}

function renderAssetsPage() {
  const assets = filteredSortedAssets();
  return `
    <main class="page">
      <section class="panel toolbar">
        <label>Search
          <input data-bind="listSearch" value="${escapeAttr(state.listSearch)}" placeholder="assetId, name, or description">
        </label>
        <button data-action="search-assets">Search</button>
        <button class="warning" data-action="scan-list">Scan QR</button>
        <label>Sort by
          <select data-bind="listSort">
            ${option("assetId", "assetId", state.listSort)}
            ${option("name", "name", state.listSort)}
            ${option("location", "location", state.listSort)}
            ${option("lastVerifiedDate", "lastVerifiedDate", state.listSort)}
          </select>
        </label>
        <button data-nav="asset">Add Asset</button>
      </section>
      <section class="asset-list">${assets.length ? assets.map(renderAssetCard).join("") : empty("No assets found.")}</section>
    </main>`;
}

function renderAssetCard(asset, controls = "") {
  const photos = [asset.photo1, asset.photo2, asset.photo3].filter(Boolean);
  return `
    <article class="asset-card" data-asset-id="${escapeAttr(asset.assetId)}" data-action="open-asset">
      <div class="asset-main">
        <div>
          <p class="asset-title"><span class="asset-id">${escapeHtml(asset.assetId)}</span> ${escapeHtml(asset.name || "Unnamed asset")}</p>
          <div class="meta">${escapeHtml(asset.description || "No description")}</div>
        </div>
        <span class="badge">${escapeHtml(asset.location || "No location")}</span>
      </div>
      <div class="fields">
        <span>Last in/out: ${escapeHtml(asset.lastInOutDate || "-")}</span>
        <span>Verified: ${escapeHtml(asset.lastVerifiedDate || "-")} by ${escapeHtml(asset.lastVerifiedBy || "-")}</span>
      </div>
      ${photos.length ? `<div class="thumbs">${photos.map((src) => `<img class="thumb" src="${escapeAttr(src)}" alt="Asset photo" data-action="preview-photo" data-src="${escapeAttr(src)}">`).join("")}</div>` : ""}
      ${controls}
    </article>`;
}

function renderAssetForm() {
  const asset = state.routeParam ? state.assets.find((item) => item.assetId === state.routeParam) : null;
  const data = asset || emptyAsset();
  return `
    <main class="page">
      <form class="panel form-grid" data-form="asset">
        ${field("assetId", "assetId", data.assetId, "text", state.routeParam ? "readonly" : "")}
        ${field("name", "name", data.name)}
        <label class="wide">description
          <textarea name="description">${escapeHtml(data.description)}</textarea>
        </label>
        ${field("photo1", "photo1", data.photo1, "url")}
        ${field("photo2", "photo2", data.photo2, "url")}
        ${field("photo3", "photo3", data.photo3, "url")}
        ${field("location", "location", data.location)}
        ${field("lastInOutDate", "lastInOutDate", data.lastInOutDate, "date")}
        ${field("lastVerifiedDate", "lastVerifiedDate", data.lastVerifiedDate, "date")}
        ${field("lastVerifiedBy", "lastVerifiedBy", data.lastVerifiedBy)}
        <button class="wide" type="submit">Save Asset</button>
      </form>
    </main>`;
}

function renderGrabPage() {
  return `
    <main class="page">
      <section class="panel">
        <label>Asset number or search text
          <input data-bind="grabQuery" value="${escapeAttr(state.grabQuery)}" placeholder="Scan or enter assetId">
        </label>
        <div class="split">
          <button data-action="grab-search">Add/Search</button>
          <button class="warning" data-action="scan-grab">Scan QR</button>
        </div>
        <div class="split">
          <button class="secondary" data-nav="mylist">My List (${state.myList.length})</button>
          <button class="secondary" data-action="save-preset">Save as Preset</button>
        </div>
        <button class="secondary" data-nav="presets">Load Preset</button>
      </section>
      <section class="search-results">
        ${state.grabResults.length ? `
          <div class="panel">
            <div class="inline">
              <strong>Matching results</strong>
              <button class="small" data-action="add-selected-results">Add Selected</button>
            </div>
            ${state.grabResults.map(renderSelectableResult).join("")}
            <button class="ghost" data-action="clear-grab-results">Clear Results</button>
          </div>` : empty("Search results will appear here.")}
      </section>
    </main>`;
}

function renderSelectableResult(asset) {
  return `
    <label class="check-row">
      <input type="checkbox" data-result-id="${escapeAttr(asset.assetId)}">
      <span><strong>${escapeHtml(asset.assetId)} ${escapeHtml(asset.name)}</strong><br><span class="meta">${escapeHtml(asset.description || "")}</span></span>
    </label>`;
}

function renderMyListPage() {
  const assets = state.myList.map((id) => state.assets.find((asset) => asset.assetId === id)).filter(Boolean);
  return `
    <main class="page">
      <section class="panel">
        <div class="split">
          <button data-action="checkout">Check-out Request</button>
          <button data-action="checkin">Check-in Request</button>
        </div>
        <button class="warning" data-action="verify">Verify Location</button>
      </section>
      <section class="asset-list">
        ${assets.length ? assets.map((asset) => renderAssetCard(asset, `<button class="danger small" data-action="remove-mylist" data-remove-id="${escapeAttr(asset.assetId)}">Remove</button>`)).join("") : empty("My List is empty.")}
      </section>
    </main>`;
}

function renderRecordsPage() {
  const records = state.records.filter((record) => state.recordFilter === "all" || record.type === state.recordFilter);
  return `
    <main class="page">
      <section class="panel">
        <label>Filter
          <select data-bind="recordFilter">
            ${option("all", "all", state.recordFilter)}
            ${option("checkout", "checkout", state.recordFilter)}
            ${option("checkin", "checkin", state.recordFilter)}
            ${option("verify", "verify", state.recordFilter)}
          </select>
        </label>
      </section>
      <section class="record-list">${records.length ? records.map(renderRecord).join("") : empty("No records yet.")}</section>
    </main>`;
}

function renderRecord(record) {
  return `
    <article class="record-card">
      <div class="asset-main">
        <strong>${escapeHtml(record.recordId)}</strong>
        <span class="badge">${escapeHtml(record.type)}</span>
      </div>
      <div class="fields">
        <span>Assets: ${escapeHtml(record.assetIds.join(", "))}</span>
        <span>User: ${escapeHtml(record.user)}</span>
        <span>From: ${escapeHtml(record.fromLocation || "-")}</span>
        <span>To: ${escapeHtml(record.toLocation || "-")}</span>
        <span>Date: ${escapeHtml(record.date)}</span>
        <span>Document: ${record.generatedDocUrl ? `<a href="${escapeAttr(record.generatedDocUrl)}">Open</a>` : "-"}</span>
      </div>
      ${record.reason ? `<div class="meta">Reason: ${escapeHtml(record.reason)}</div>` : ""}
    </article>`;
}

function renderPresetsPage() {
  return `
    <main class="page">
      <section class="panel">
        <button data-action="save-preset">Save Current My List as Preset</button>
      </section>
      <section class="preset-list">${state.presets.length ? state.presets.map(renderPreset).join("") : empty("No preset lists yet.")}</section>
    </main>`;
}

function renderPreset(preset) {
  return `
    <article class="preset-card">
      <div class="asset-main">
        <strong>${escapeHtml(preset.listName)}</strong>
        <span class="badge">${preset.assetIds.length} assets</span>
      </div>
      <div class="meta">Created by ${escapeHtml(preset.createdBy || "-")} on ${escapeHtml(dateOnly(preset.createdAt))}</div>
      <div class="split">
        <button data-action="load-preset" data-preset-id="${escapeAttr(preset.listId)}">Load Preset</button>
        <button class="danger" data-action="delete-preset" data-preset-id="${escapeAttr(preset.listId)}">Delete</button>
      </div>
    </article>`;
}

function renderSettingsPage() {
  return `
    <main class="page">
      <section class="panel">
        <label>Google Apps Script backend URL
          <input data-bind="backendUrl" value="${escapeAttr(state.backendUrl)}" placeholder="Paste Web App URL later">
        </label>
        <button data-action="test-sync">Test Sync Extension</button>
      </section>
      <section class="panel">
        <strong>Current storage</strong>
        <div class="fields">
          <span>Assets: ${state.assets.length}</span>
          <span>Records: ${state.records.length}</span>
          <span>Preset lists: ${state.presets.length}</span>
          <span>My List: ${state.myList.length}</span>
        </div>
      </section>
    </main>`;
}

function field(name, labelText, value, type = "text", extra = "") {
  return `<label>${labelText}<input name="${name}" type="${type}" value="${escapeAttr(value || "")}" ${extra}></label>`;
}

function option(value, labelText, selected) {
  return `<option value="${escapeAttr(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(labelText)}</option>`;
}

function empty(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function handleClick(event) {
  const target = event.target.closest("[data-action], [data-nav]");
  if (!target) return;
  if (target.dataset.nav) {
    navigate(target.dataset.nav);
    return;
  }
  const action = target.dataset.action;
  if (action === "back") history.length > 1 ? history.back() : navigate("home");
  if (action === "open-asset") openAssetFromCard(event, target);
  if (action === "preview-photo") previewPhoto(event, target);
  if (action === "scan-list") openScanner((text) => {
    state.listSearch = extractAssetNumber(text);
    navigate("assets");
    render();
  });
  if (action === "scan-grab") openScanner((text) => {
    state.grabQuery = extractAssetNumber(text);
    runGrabSearch();
  });
  if (action === "search-assets") render();
  if (action === "grab-search") runGrabSearch();
  if (action === "add-selected-results") addSelectedResults();
  if (action === "clear-grab-results") {
    state.grabResults = [];
    render();
  }
  if (action === "remove-mylist") removeFromMyList(target.dataset.removeId);
  if (action === "checkout") openMovementModal("checkout");
  if (action === "checkin") openMovementModal("checkin");
  if (action === "verify") verifyLocation();
  if (action === "save-preset") savePreset();
  if (action === "load-preset") loadPreset(target.dataset.presetId);
  if (action === "delete-preset") deletePreset(target.dataset.presetId);
  if (action === "test-sync") testSync();
}

function handleInput(event) {
  const key = event.target.dataset.bind;
  if (!key) return;
  state[key] = event.target.value;
  if (key === "operator" || key === "backendUrl") persist();
}

function handleChange(event) {
  const key = event.target.dataset.bind;
  if (!key) return;
  state[key] = event.target.value;
  persist();
  render();
}

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-form='asset']");
  if (!form) return;
  event.preventDefault();
  saveAsset(new FormData(form));
});

function filteredSortedAssets() {
  const query = normalize(state.listSearch);
  return [...state.assets]
    .filter((asset) => !query || [asset.assetId, asset.name, asset.description].some((value) => normalize(value).includes(query)))
    .sort((a, b) => String(a[state.listSort] || "").localeCompare(String(b[state.listSort] || ""), undefined, { numeric: true }));
}

function openAssetFromCard(event, target) {
  if (event.target.closest("button, img, a, input")) return;
  navigate(`asset/${encodeURIComponent(target.dataset.assetId)}`);
}

function previewPhoto(event, target) {
  event.stopPropagation();
  openModal("Photo Preview", `<img class="preview-image" src="${escapeAttr(target.dataset.src)}" alt="Asset photo preview">`);
}

function saveAsset(formData) {
  const now = new Date().toISOString();
  const asset = {
    assetId: String(formData.get("assetId") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    photo1: String(formData.get("photo1") || "").trim(),
    photo2: String(formData.get("photo2") || "").trim(),
    photo3: String(formData.get("photo3") || "").trim(),
    location: String(formData.get("location") || "").trim(),
    lastInOutDate: String(formData.get("lastInOutDate") || "").trim(),
    lastVerifiedDate: String(formData.get("lastVerifiedDate") || "").trim(),
    lastVerifiedBy: String(formData.get("lastVerifiedBy") || "").trim(),
    createdAt: now,
    updatedAt: now
  };
  if (!asset.assetId) {
    showNotice("assetId is required.", true);
    return;
  }
  const existingIndex = state.assets.findIndex((item) => item.assetId === asset.assetId);
  if (existingIndex >= 0) {
    asset.createdAt = state.assets[existingIndex].createdAt || now;
    state.assets[existingIndex] = asset;
  } else {
    state.assets.push(asset);
  }
  persist();
  showNotice("Asset saved.");
  navigate("assets");
}

function runGrabSearch() {
  const raw = state.grabQuery.trim();
  const query = extractAssetNumber(raw);
  if (!query) {
    showNotice("Enter or scan an asset number.", true);
    return;
  }
  const exact = state.assets.find((asset) => asset.assetId === query);
  if (exact) {
    addToMyList([exact.assetId]);
    state.grabResults = [];
    state.grabQuery = "";
  } else {
    const normalized = normalize(query);
    state.grabResults = state.assets.filter((asset) => [asset.assetId, asset.name, asset.description].some((value) => normalize(value).includes(normalized)));
  }
  persist();
  render();
}

function addSelectedResults() {
  const selected = [...document.querySelectorAll("[data-result-id]:checked")].map((item) => item.dataset.resultId);
  addToMyList(selected);
  state.grabResults = [];
  persist();
  render();
}

function addToMyList(assetIds) {
  const before = state.myList.length;
  state.myList = [...new Set([...state.myList, ...assetIds])];
  showNotice(`${state.myList.length - before} asset(s) added to My List.`);
}

function removeFromMyList(assetId) {
  state.myList = state.myList.filter((id) => id !== assetId);
  persist();
  render();
}

function openMovementModal(type) {
  if (!requireOperator() || !requireMyList()) return;
  const locationLabel = type === "checkout" ? "Destination location" : "New/current location";
  openModal(type === "checkout" ? "Check-out Request" : "Check-in Request", `
    <form class="form-grid" data-form="movement" data-type="${type}">
      <label class="wide">${locationLabel}
        <input name="toLocation" required placeholder="Enter location">
      </label>
      <label class="wide">Reason
        <textarea name="reason" placeholder="${type === "checkout" ? "Required reason" : "Optional reason"}" ${type === "checkout" ? "required" : ""}></textarea>
      </label>
      <button class="wide" type="submit">Confirm ${type === "checkout" ? "Check-out" : "Check-in"}</button>
    </form>`);
}

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-form='movement']");
  if (!form) return;
  event.preventDefault();
  createMovementRecord(form.dataset.type, new FormData(form));
});

function createMovementRecord(type, formData) {
  const toLocation = String(formData.get("toLocation") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  if (!toLocation) return;
  const today = dateOnly();
  const selectedAssets = state.assets.filter((asset) => state.myList.includes(asset.assetId));
  const fromLocation = [...new Set(selectedAssets.map((asset) => asset.location).filter(Boolean))].join(", ");
  state.assets = state.assets.map((asset) => {
    if (!state.myList.includes(asset.assetId)) return asset;
    return {
      ...asset,
      location: toLocation,
      lastInOutDate: today,
      lastVerifiedDate: today,
      lastVerifiedBy: state.operator,
      updatedAt: new Date().toISOString()
    };
  });
  state.records.unshift({
    recordId: makeId("REC"),
    type,
    assetIds: [...state.myList],
    fromLocation,
    toLocation,
    reason,
    user: state.operator,
    date: today,
    generatedDocUrl: ""
  });
  persist();
  closeModal();
  showNotice(`${type === "checkout" ? "Check-out" : "Check-in"} record created. Document generation can be added in BackendGateway.generateDocument().`);
  navigate("records");
}

function verifyLocation() {
  if (!requireOperator() || !requireMyList()) return;
  const today = dateOnly();
  state.assets = state.assets.map((asset) => {
    if (!state.myList.includes(asset.assetId)) return asset;
    return {
      ...asset,
      lastVerifiedDate: today,
      lastVerifiedBy: state.operator,
      updatedAt: new Date().toISOString()
    };
  });
  const selectedAssets = state.assets.filter((asset) => state.myList.includes(asset.assetId));
  const fromLocation = [...new Set(selectedAssets.map((asset) => asset.location).filter(Boolean))].join(", ");
  state.records.unshift({
    recordId: makeId("REC"),
    type: "verify",
    assetIds: [...state.myList],
    fromLocation,
    toLocation: fromLocation,
    reason: "Location verified",
    user: state.operator,
    date: today,
    generatedDocUrl: ""
  });
  persist();
  showNotice("Verification record created.");
  navigate("records");
}

function savePreset() {
  if (!requireOperator() || !requireMyList()) return;
  const listName = prompt("Preset list name");
  if (!listName) return;
  const now = new Date().toISOString();
  state.presets.unshift({
    listId: makeId("LIST"),
    listName: listName.trim(),
    assetIds: [...state.myList],
    createdBy: state.operator,
    createdAt: now,
    updatedAt: now
  });
  persist();
  showNotice("Preset saved.");
  navigate("presets");
}

function loadPreset(listId) {
  const preset = state.presets.find((item) => item.listId === listId);
  if (!preset) return;
  state.myList = [...new Set([...state.myList, ...preset.assetIds])];
  persist();
  showNotice("Preset loaded into My List.");
  navigate("mylist");
}

function deletePreset(listId) {
  if (!confirm("Delete this preset list?")) return;
  state.presets = state.presets.filter((preset) => preset.listId !== listId);
  persist();
  render();
}

async function testSync() {
  const result = await backend.syncWithGoogleSheets();
  showNotice(result.message, !result.ok);
}

function requireOperator() {
  if (state.operator.trim()) return true;
  showNotice("Enter the current operator name on the Home page first.", true);
  navigate("home");
  return false;
}

function requireMyList() {
  if (state.myList.length) return true;
  showNotice("My List is empty.", true);
  return false;
}

function openScanner(onSuccess) {
  const supported = window.Html5Qrcode;
  if (!supported) {
    showNotice("QR scanner library is still loading or unavailable.", true);
    return;
  }
  openModal("Scan QR Code", `
    <div id="qr-reader"></div>
    <p class="hint">Allow camera access. On phones, camera scanning requires HTTPS hosting or localhost.</p>
  `, async () => {
    const scanner = new Html5Qrcode("qr-reader");
    modalRoot.currentScanner = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await scanner.stop().catch(() => {});
          modalRoot.currentScanner = null;
          closeModal();
          onSuccess(decodedText);
        }
      );
    } catch (error) {
      showNotice(`Camera could not start: ${error}`, true);
    }
  });
}

function openModal(title, body, afterOpen) {
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">
        <div class="modal-header">
          <h2>${escapeHtml(title)}</h2>
          <button class="ghost small" data-action="close-modal">Close</button>
        </div>
        <div class="modal-body">${body}</div>
      </section>
    </div>`;
  modalRoot.querySelector(".modal").addEventListener("click", (event) => event.stopPropagation());
  modalRoot.querySelectorAll("[data-action='close-modal']").forEach((node) => node.addEventListener("click", closeModal));
  if (afterOpen) setTimeout(afterOpen, 0);
}

async function closeModal() {
  if (modalRoot.currentScanner) {
    await modalRoot.currentScanner.stop().catch(() => {});
    modalRoot.currentScanner = null;
  }
  modalRoot.innerHTML = "";
}

function showNotice(message, isError = false) {
  const el = document.createElement("div");
  el.className = `status ${isError ? "error" : ""}`;
  el.textContent = message;
  openModal(isError ? "Action Needed" : "Done", el.outerHTML);
}

function extractAssetNumber(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  const urlMatch = value.match(/[?&](?:assetId|asset|id|no|number)=([A-Za-z0-9_-]+)/i);
  if (urlMatch) return urlMatch[1];
  const pathMatch = value.match(/\/([0-9]{2,})(?:[/?#]|$)/);
  if (pathMatch) return pathMatch[1];
  const numeric = value.match(/[0-9]{2,}/);
  return numeric ? numeric[0] : value;
}

function emptyAsset() {
  return {
    assetId: "",
    name: "",
    description: "",
    photo1: "",
    photo2: "",
    photo3: "",
    location: "",
    lastInOutDate: "",
    lastVerifiedDate: "",
    lastVerifiedBy: ""
  };
}

function dateOnly(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
