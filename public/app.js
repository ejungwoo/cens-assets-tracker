const STORAGE_KEYS = {
  assets: "cens.assets",
  records: "cens.records",
  presets: "cens.presets",
  locations: "cens.locations",
  myList: "cens.myList",
  projects: "cens.projects",
  currentProjectId: "cens.currentProjectId",
  operator: "cens.operator",
  operatorLocked: "cens.operatorLocked",
  selectedLocation: "cens.selectedLocation",
  locationLocked: "cens.locationLocked",
  homeControlsHidden: "cens.homeControlsHidden",
  language: "cens.language",
  backendUrl: "cens.backendUrl"
};

const AUTH_ALLOWED_DOMAIN = "ibs.re.kr";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCzqVQWrkKsYRWZO3cZylOUyNI31Odc_fk",
  authDomain: "cens-assets-tracker.firebaseapp.com",
  projectId: "cens-assets-tracker",
  storageBucket: "cens-assets-tracker.firebasestorage.app",
  messagingSenderId: "493140318257",
  appId: "1:493140318257:web:ad8e3c879d40765645dd10"
};

const state = {
  route: "home",
  routeParam: null,
  assets: [],
  records: [],
  presets: [],
  locations: [],
  myList: [],
  projects: [],
  currentProjectId: "",
  operator: "",
  operatorLocked: false,
  locationQuery: "",
  selectedLocation: "",
  locationLocked: false,
  assetQuery: "",
  homeMode: "empty",
  homeResults: [],
  openHomeAssetId: "",
  editingHomeAssetId: "",
  homeControlsHidden: false,
  language: "en",
  backendUrl: "",
  listSearch: "",
  listSort: "assetId",
  grabQuery: "",
  grabResults: [],
  recordFilter: "all",
  authStatus: "loading",
  authUser: null,
  authEmail: "",
  authPassword: "",
  authCreatingAccount: false,
  authMessage: "",
  authError: ""
};

const I18N = {
  en: {
    appName: "CENS Assets Tracker",
    homeLead: "Track laboratory equipment check-out, check-in, and verification records.",
    currentOperator: "Current user",
    enterName: "Enter your name",
    assetsTitle: "List of Assets",
    assetDetailTitle: "Asset Detail",
    addAssetTitle: "Add Asset",
    grabTitle: "Grab Assets",
    myListTitle: "My List",
    recordsTitle: "Records",
    presetsTitle: "Preset Lists",
    settingsTitle: "Settings",
    signInTitle: "Sign in",
    signInLead: "Sign in with your IBS ID and password.",
    signInEmail: "IBS ID",
    signInEmailPlaceholder: "name",
    signInPassword: "Password",
    signInPasswordPlaceholder: "Password",
    signInSubmit: "Sign in",
    signUp: "Sign up",
    resetPassword: "Reset password",
    signOut: "Sign out",
    signedInAs: "Signed in as",
    authLoading: "Checking sign-in status.",
    authUnavailable: "Firebase Auth is not available. Refresh the page and try again.",
    authDomainDenied: "Only {domain} email accounts can use this app.",
    authEmailRequired: "Enter an IBS ID or {domain} email address.",
    authPasswordRequired: "Enter your password.",
    authSignInFailed: "Sign-in failed: {error}",
    authSignUpFailed: "Could not start sign-up: {error}",
    authSignedUp: "Sign-up email sent to {email}. Open it to set your password.",
    authPasswordEmailSent: "Password reset email sent to {email}.",
    authPasswordEmailFailed: "Could not send password reset email: {error}",
    back: "Back",
    search: "Search",
    searchPlaceholder: "assetId, name, or description",
    scanQr: "Scan QR",
    sortBy: "Sort by",
    addAsset: "Add Asset",
    noAssets: "No assets found.",
    unnamedAsset: "Unnamed asset",
    noDescription: "No description",
    noLocation: "No location",
    lastInOut: "Last in/out",
    verified: "Verified",
    by: "by",
    assetPhoto: "Asset photo",
    photoPreview: "Photo Preview",
    saveAsset: "Save Asset",
    assetNumberOrSearch: "Asset number or search text",
    scanOrEnterAssetId: "Scan or enter assetId",
    addSearch: "Add/Search",
    savePreset: "Save as Preset",
    loadPreset: "Load Preset",
    matchingResults: "Matching results",
    addSelected: "Add Selected",
    clearResults: "Clear Results",
    searchResultsEmpty: "Search results will appear here.",
    checkoutRequest: "Check-out Request",
    checkinRequest: "Check-in Request",
    verifyLocation: "Verify Location",
    remove: "Remove",
    myListEmpty: "My List is empty.",
    filter: "Filter",
    all: "all",
    checkout: "checkout",
    checkin: "checkin",
    verify: "verify",
    noRecords: "No records yet.",
    assets: "Assets",
    user: "User",
    from: "From",
    to: "To",
    date: "Date",
    document: "Document",
    open: "Open",
    reason: "Reason",
    saveCurrentPreset: "Save Current My List as Preset",
    noPresets: "No preset lists yet.",
    createdBy: "Created by",
    on: "on",
    delete: "Delete",
    backendUrl: "Google Apps Script backend URL",
    backendPlaceholder: "Paste Web App URL later",
    testSync: "Test Sync Extension",
    currentStorage: "Current storage",
    presetLists: "Preset lists",
    project: "List",
    projectList: "Lists",
    newProject: "New list",
    projectName: "List name",
    projectCreated: "List created.",
    projectSwitched: "List switched.",
    language: "Language",
    english: "English",
    korean: "Korean",
    destinationLocation: "Destination location",
    newCurrentLocation: "New/current location",
    enterLocation: "Enter location",
    requiredReason: "Required reason",
    optionalReason: "Optional reason",
    confirmCheckout: "Confirm Check-out",
    confirmCheckin: "Confirm Check-in",
    actionNeeded: "Action Needed",
    done: "Done",
    close: "Close",
    qrTitle: "Scan QR Code",
    qrHint: "Allow camera access. On phones, camera scanning requires HTTPS hosting or localhost.",
    backendUrlMissing: "Backend URL is not set.",
    sheetsReady: "Google Sheets sync extension point is ready but not connected yet.",
    driveReady: "Google Drive photo upload extension point.",
    pdfReady: "PDF generation extension point.",
    authReady: "Firebase Auth extension point.",
    assetIdRequired: "assetId is required.",
    assetSaved: "Asset saved.",
    enterScanAsset: "Enter or scan an asset number.",
    addedToList: "{count} asset(s) added to My List.",
    recordCreated: "{type} record created. Document generation can be added in BackendGateway.generateDocument().",
    verificationRecordCreated: "Verification record created.",
    presetName: "Preset list name",
    presetSaved: "Preset saved.",
    presetLoaded: "Preset loaded into My List.",
    deletePresetConfirm: "Delete this preset list?",
    operatorRequired: "Sign in first.",
    qrLibraryMissing: "QR scanner library is still loading or unavailable.",
    cameraStartFailed: "Camera could not start: {error}",
    locationVerified: "Location verified",
    assetIdField: "assetId",
    nameField: "name",
    descriptionField: "description",
    photo1Field: "photo1",
    photo2Field: "photo2",
    photo3Field: "photo3",
    locationField: "location",
    acquisitionPriceKrwField: "Unit Price at Acquisition (KRW)",
    manufacturerProviderField: "Manufacturer/Provider",
    acquisitionDateField: "Acquisition date",
    accountHolderField: "Account holder",
    lastInOutDateField: "lastInOutDate",
    lastVerifiedDateField: "lastVerifiedDate",
    lastVerifiedByField: "lastVerifiedBy",
    loadSeedAssets: "Load CENS Equipment Assets",
    seedAssetsAvailable: "Seed assets available",
    loadSeedConfirm: "Replace the current asset list with CENS Equipment seed assets?",
    seedAssetsLoaded: "{count} CENS Equipment assets loaded.",
    nameShort: "name",
    save: "save",
    cancel: "cancel",
    edit: "edit",
    hide: "hide",
    show: "show",
    controlsFolded: "controls folded",
    manualPage: "manual page",
    find: "find",
    locationShort: "current location",
    assetNumberShort: "asset number",
    new: "new",
    camera: "camera",
    totalList: "total list",
    select: "select",
    add: "add",
    newLocation: "new location",
    locationSaved: "Location selected.",
    locationCreated: "New location created.",
    locationPhotoSaved: "Location photo saved.",
    noLocations: "No matching locations.",
    noMatches: "No matching assets.",
    listSpaceHint: "Results will appear here.",
    nameSaved: "Name saved.",
    assetAdded: "Asset added to My List.",
    takePhoto: "Take photo",
    compactInfo: "info",
    collapse: "close"
  },
  ko: {
    appName: "CENS 자산 추적기",
    homeLead: "실험실 장비의 반출, 반입, 위치 확인 기록을 관리합니다.",
    currentOperator: "현재 사용자",
    enterName: "이름을 입력하세요",
    assetsTitle: "자산 목록",
    assetDetailTitle: "자산 상세/수정",
    addAssetTitle: "자산 추가",
    grabTitle: "자산 담기",
    myListTitle: "내 목록",
    recordsTitle: "반출 / 반입 / 확인 기록",
    presetsTitle: "프리셋 목록",
    settingsTitle: "설정",
    signInTitle: "로그인",
    signInLead: "IBS 아이디와 비밀번호로 로그인하세요.",
    signInEmail: "IBS 아이디",
    signInEmailPlaceholder: "name",
    signInPassword: "비밀번호",
    signInPasswordPlaceholder: "비밀번호",
    signInSubmit: "로그인",
    signUp: "가입",
    resetPassword: "비밀번호 초기화",
    signOut: "로그아웃",
    signedInAs: "로그인 계정",
    authLoading: "로그인 상태를 확인하고 있습니다.",
    authUnavailable: "Firebase Auth를 사용할 수 없습니다. 새로고침 후 다시 시도하세요.",
    authDomainDenied: "{domain} 이메일 계정만 이 앱을 사용할 수 있습니다.",
    authEmailRequired: "IBS 아이디 또는 {domain} 이메일 주소를 입력하세요.",
    authPasswordRequired: "비밀번호를 입력하세요.",
    authSignInFailed: "로그인 실패: {error}",
    authSignUpFailed: "가입을 시작할 수 없습니다: {error}",
    authSignedUp: "{email}로 가입 메일을 보냈습니다. 메일에서 비밀번호를 설정하세요.",
    authPasswordEmailSent: "{email}로 비밀번호 초기화 메일을 보냈습니다.",
    authPasswordEmailFailed: "비밀번호 초기화 메일을 보낼 수 없습니다: {error}",
    back: "뒤로",
    search: "검색",
    searchPlaceholder: "assetId, 이름, 설명",
    scanQr: "QR 스캔",
    sortBy: "정렬 기준",
    addAsset: "자산 추가",
    noAssets: "검색된 자산이 없습니다.",
    unnamedAsset: "이름 없는 자산",
    noDescription: "설명 없음",
    noLocation: "위치 없음",
    lastInOut: "최근 반출/반입",
    verified: "확인",
    by: "작업자",
    assetPhoto: "자산 사진",
    photoPreview: "사진 미리보기",
    saveAsset: "자산 저장",
    assetNumberOrSearch: "자산 번호 또는 검색어",
    scanOrEnterAssetId: "assetId를 스캔하거나 입력하세요",
    addSearch: "추가/검색",
    savePreset: "프리셋으로 저장",
    loadPreset: "프리셋 불러오기",
    matchingResults: "검색 결과",
    addSelected: "선택 항목 추가",
    clearResults: "결과 지우기",
    searchResultsEmpty: "검색 결과가 여기에 표시됩니다.",
    checkoutRequest: "반출 요청",
    checkinRequest: "반입 요청",
    verifyLocation: "위치 확인",
    remove: "제거",
    myListEmpty: "내 목록이 비어 있습니다.",
    filter: "필터",
    all: "전체",
    checkout: "반출",
    checkin: "반입",
    verify: "확인",
    noRecords: "기록이 없습니다.",
    assets: "자산",
    user: "사용자",
    from: "기존 위치",
    to: "이동 위치",
    date: "날짜",
    document: "문서",
    open: "열기",
    reason: "사유",
    saveCurrentPreset: "현재 내 목록을 프리셋으로 저장",
    noPresets: "저장된 프리셋이 없습니다.",
    createdBy: "생성자",
    on: "생성일",
    delete: "삭제",
    backendUrl: "Google Apps Script 백엔드 URL",
    backendPlaceholder: "나중에 Web App URL 붙여넣기",
    testSync: "동기화 연결 테스트",
    currentStorage: "현재 저장소",
    presetLists: "프리셋 목록",
    project: "List",
    projectList: "List 목록",
    newProject: "새 List",
    projectName: "List 이름",
    projectCreated: "List가 생성되었습니다.",
    projectSwitched: "List가 전환되었습니다.",
    language: "언어",
    english: "영어",
    korean: "한국어",
    destinationLocation: "목적지 위치",
    newCurrentLocation: "새 위치/현재 위치",
    enterLocation: "위치를 입력하세요",
    requiredReason: "필수 사유",
    optionalReason: "선택 사유",
    confirmCheckout: "반출 확인",
    confirmCheckin: "반입 확인",
    actionNeeded: "확인이 필요합니다",
    done: "완료",
    close: "닫기",
    qrTitle: "QR 코드 스캔",
    qrHint: "카메라 접근을 허용하세요. 휴대폰에서는 HTTPS 호스팅 또는 localhost가 필요합니다.",
    backendUrlMissing: "백엔드 URL이 설정되지 않았습니다.",
    sheetsReady: "Google Sheets 동기화 확장 지점은 준비되어 있지만 아직 연결되지 않았습니다.",
    driveReady: "Google Drive 사진 업로드 확장 지점입니다.",
    pdfReady: "PDF 생성 확장 지점입니다.",
    authReady: "Firebase Auth 확장 지점입니다.",
    assetIdRequired: "assetId는 필수입니다.",
    assetSaved: "자산이 저장되었습니다.",
    enterScanAsset: "자산 번호를 입력하거나 스캔하세요.",
    addedToList: "{count}개 자산이 내 목록에 추가되었습니다.",
    recordCreated: "{type} 기록이 생성되었습니다. 문서 생성은 BackendGateway.generateDocument()에 추가할 수 있습니다.",
    verificationRecordCreated: "위치 확인 기록이 생성되었습니다.",
    presetName: "프리셋 이름",
    presetSaved: "프리셋이 저장되었습니다.",
    presetLoaded: "프리셋을 내 목록으로 불러왔습니다.",
    deletePresetConfirm: "이 프리셋을 삭제할까요?",
    operatorRequired: "먼저 로그인하세요.",
    qrLibraryMissing: "QR 스캐너 라이브러리를 아직 불러오는 중이거나 사용할 수 없습니다.",
    cameraStartFailed: "카메라를 시작할 수 없습니다: {error}",
    locationVerified: "위치 확인 완료",
    assetIdField: "자산 ID (assetId)",
    nameField: "이름 (name)",
    descriptionField: "설명 (description)",
    photo1Field: "사진 1 URL (photo1)",
    photo2Field: "사진 2 URL (photo2)",
    photo3Field: "사진 3 URL (photo3)",
    locationField: "위치 (location)",
    acquisitionPriceKrwField: "취득 단가 KRW (Unit Price at Acquisition)",
    manufacturerProviderField: "제조사/공급자 (Manufacturer/Provider)",
    acquisitionDateField: "취득일 (Acquisition date)",
    accountHolderField: "책임자",
    lastInOutDateField: "최근 반출/반입일 (lastInOutDate)",
    lastVerifiedDateField: "최근 확인일 (lastVerifiedDate)",
    lastVerifiedByField: "최근 확인자 (lastVerifiedBy)",
    loadSeedAssets: "CENS Equipment 자산 불러오기",
    seedAssetsAvailable: "사용 가능한 시드 자산",
    loadSeedConfirm: "현재 자산 목록을 CENS Equipment 시드 자산으로 교체할까요?",
    seedAssetsLoaded: "CENS Equipment 자산 {count}개를 불러왔습니다.",
    nameShort: "name",
    save: "save",
    cancel: "cancel",
    edit: "edit",
    hide: "hide",
    show: "show",
    controlsFolded: "접힌 메뉴",
    manualPage: "manual page",
    find: "find",
    locationShort: "current location",
    assetNumberShort: "asset number",
    new: "new",
    camera: "camera",
    totalList: "total list",
    select: "선택",
    add: "add",
    newLocation: "new location",
    locationSaved: "위치가 선택되었습니다.",
    locationCreated: "새 위치가 등록되었습니다.",
    locationPhotoSaved: "위치 사진이 저장되었습니다.",
    noLocations: "일치하는 위치가 없습니다.",
    noMatches: "일치하는 자산이 없습니다.",
    listSpaceHint: "목록이 여기에 표시됩니다.",
    nameSaved: "이름이 저장되었습니다.",
    assetAdded: "내 목록에 추가했습니다.",
    takePhoto: "사진 촬영",
    compactInfo: "정보",
    collapse: "닫기"
  }
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
    if (!state.backendUrl) return { ok: false, message: t("backendUrlMissing") };
    return { ok: false, message: t("sheetsReady") };
  }

  async uploadPhotoToDrive() {
    return { ok: false, message: t("driveReady") };
  }

  async generateDocument() {
    return { ok: false, message: t("pdfReady") };
  }

  async prepareAuth() {
    return { ok: false, message: t("authReady") };
  }
}

const LocalStore = {
  loadAll() {
    const { projects, currentProjectId } = ensureProjectState();
    const projectData = loadProjectData(currentProjectId);
    const operator = localStorage.getItem(STORAGE_KEYS.operator) || "";
    const operatorLocked = localStorage.getItem(STORAGE_KEYS.operatorLocked) === "true";
    const homeControlsHidden = localStorage.getItem(STORAGE_KEYS.homeControlsHidden) === "true";
    const language = localStorage.getItem(STORAGE_KEYS.language) || "en";
    const backendUrl = localStorage.getItem(STORAGE_KEYS.backendUrl) || "";
    return { ...projectData, projects, currentProjectId, operator, operatorLocked, locationQuery: projectData.selectedLocation, homeControlsHidden, language, backendUrl };
  },
  saveAll(data) {
    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(data.projects || []));
    localStorage.setItem(STORAGE_KEYS.currentProjectId, data.currentProjectId || defaultProjectId());
    saveProjectData(data.currentProjectId || defaultProjectId(), data);
    localStorage.setItem(STORAGE_KEYS.operator, data.operator || "");
    localStorage.setItem(STORAGE_KEYS.operatorLocked, data.operatorLocked ? "true" : "false");
    localStorage.setItem(STORAGE_KEYS.selectedLocation, data.selectedLocation || "");
    localStorage.setItem(STORAGE_KEYS.locationLocked, data.locationLocked ? "true" : "false");
    localStorage.setItem(STORAGE_KEYS.homeControlsHidden, data.homeControlsHidden ? "true" : "false");
    localStorage.setItem(STORAGE_KEYS.language, data.language || "en");
    localStorage.setItem(STORAGE_KEYS.backendUrl, data.backendUrl || "");
  }
};

const backend = new BackendGateway(LocalStore);
const app = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");

document.addEventListener("DOMContentLoaded", init);

async function init() {
  window.addEventListener("hashchange", routeFromHash);
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  document.addEventListener("keydown", handleKeydown);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  initAuth();
  render();
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function initAuth() {
  if (!window.firebase || !window.firebase.auth) {
    state.authStatus = "unavailable";
    state.authError = t("authUnavailable");
    render();
    return;
  }
  if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
  window.firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      state.authUser = null;
      state.authStatus = "signedOut";
      render();
      return;
    }
    if (state.authCreatingAccount) return;
    finishSignedInUser(user);
  });
}

function isAllowedEmail(email) {
  return email.endsWith(`@${AUTH_ALLOWED_DOMAIN}`);
}

function normalizeAuthEmailInput(value) {
  const input = String(value || "").trim().toLowerCase();
  if (!input) return "";
  if (input.includes("@")) return input;
  return `${input}@${AUTH_ALLOWED_DOMAIN}`;
}

async function finishSignedInUser(user) {
  const email = String(user.email || "").toLowerCase();
  if (!isAllowedEmail(email)) {
    state.authUser = null;
    state.authStatus = "denied";
    state.authError = t("authDomainDenied", { domain: `@${AUTH_ALLOWED_DOMAIN}` });
    state.authMessage = "";
    await window.firebase.auth().signOut().catch(() => {});
    render();
    return;
  }
  state.authUser = {
    email,
    name: user.displayName || email
  };
  state.authStatus = "ready";
  state.authEmail = email;
  state.authError = "";
  state.authMessage = "";
  Object.assign(state, await backend.loadAll());
  routeFromHash();
}

async function signIn() {
  if (!window.firebase || !window.firebase.auth) return;
  const email = normalizeAuthEmailInput(state.authEmail);
  const password = String(state.authPassword || "");
  if (!validateAuthEmail(email)) return;
  if (!validateAuthPassword(password)) return;
  state.authStatus = "loading";
  state.authError = "";
  state.authMessage = "";
  render();
  try {
    const credential = await window.firebase.auth().signInWithEmailAndPassword(email, password);
    await finishSignedInUser(credential.user);
  } catch (error) {
    state.authStatus = "signedOut";
    state.authError = t("authSignInFailed", { error: authErrorMessage(error) });
    render();
  }
}

function validateAuthEmail(email) {
  if (isAllowedEmail(email)) return true;
  state.authError = t("authEmailRequired", { domain: `@${AUTH_ALLOWED_DOMAIN}` });
  state.authMessage = "";
  render();
  return false;
}

function validateAuthPassword(password) {
  if (password) return true;
  state.authError = t("authPasswordRequired");
  state.authMessage = "";
  render();
  return false;
}

async function signUp() {
  if (!window.firebase || !window.firebase.auth) return;
  const email = normalizeAuthEmailInput(state.authEmail);
  if (!validateAuthEmail(email)) return;
  state.authStatus = "loading";
  state.authEmail = email;
  state.authError = "";
  state.authMessage = "";
  state.authCreatingAccount = true;
  render();
  try {
    await window.firebase.auth().createUserWithEmailAndPassword(email, makeTemporaryPassword());
    await sendPasswordEmail(email);
    await window.firebase.auth().signOut();
    state.authCreatingAccount = false;
    state.authUser = null;
    state.authStatus = "signedOut";
    state.authMessage = t("authSignedUp", { email });
    render();
  } catch (error) {
    state.authCreatingAccount = false;
    if (error && error.code === "auth/email-already-in-use") {
      await sendPasswordResetEmail();
      return;
    }
    state.authStatus = "signedOut";
    state.authError = t("authSignUpFailed", { error: authErrorMessage(error) });
    render();
  }
}

async function sendPasswordResetEmail() {
  if (!window.firebase || !window.firebase.auth) return;
  const email = normalizeAuthEmailInput(state.authEmail);
  if (!validateAuthEmail(email)) return;
  state.authStatus = "loading";
  state.authEmail = email;
  state.authError = "";
  state.authMessage = "";
  render();
  try {
    await sendPasswordEmail(email);
    state.authStatus = "signedOut";
    state.authMessage = t("authPasswordEmailSent", { email });
    render();
  } catch (error) {
    state.authStatus = "signedOut";
    state.authError = t("authPasswordEmailFailed", { error: authErrorMessage(error) });
    render();
  }
}

function sendPasswordEmail(email) {
  return window.firebase.auth().sendPasswordResetEmail(email, {
    url: `${window.location.origin}${window.location.pathname}`
  });
}

function makeTemporaryPassword() {
  const values = new Uint32Array(4);
  crypto.getRandomValues(values);
  return `Temp-${Array.from(values, (value) => value.toString(36)).join("-")}!A1`;
}

function authErrorMessage(error) {
  return error && error.message ? error.message : String(error);
}

async function signOut() {
  if (!window.firebase || !window.firebase.auth) return;
  await window.firebase.auth().signOut();
}

function defaultProjectId() {
  return "PRJ-default";
}

function makeProject(name) {
  const now = new Date().toISOString();
  return {
    projectId: makeId("PRJ"),
    name: String(name || "").trim() || t("newProject"),
    createdAt: now,
    updatedAt: now
  };
}

function ensureProjectState() {
  let projects = readJson(STORAGE_KEYS.projects, null);
  let currentProjectId = localStorage.getItem(STORAGE_KEYS.currentProjectId) || "";
  if (!Array.isArray(projects) || projects.length === 0) {
    const now = new Date().toISOString();
    projects = [{ projectId: defaultProjectId(), name: "Default list", createdAt: now, updatedAt: now }];
    currentProjectId = defaultProjectId();
    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
    localStorage.setItem(STORAGE_KEYS.currentProjectId, currentProjectId);
    if (!localStorage.getItem(projectKey(currentProjectId, "assets"))) {
      saveProjectData(currentProjectId, {
        assets: migratedAssets(),
        records: readJson(STORAGE_KEYS.records, []),
        presets: readJson(STORAGE_KEYS.presets, []),
        locations: readJson(STORAGE_KEYS.locations, []),
        myList: readJson(STORAGE_KEYS.myList, []),
        selectedLocation: localStorage.getItem(STORAGE_KEYS.selectedLocation) || "",
        locationLocked: localStorage.getItem(STORAGE_KEYS.locationLocked) === "true"
      });
    }
  }
  projects = ensureBundledLists(projects);
  if (!projects.some((project) => project.projectId === currentProjectId)) {
    currentProjectId = projects[0].projectId;
    localStorage.setItem(STORAGE_KEYS.currentProjectId, currentProjectId);
  }
  if (shouldOpenTestList(currentProjectId)) {
    currentProjectId = testWebListId();
    localStorage.setItem(STORAGE_KEYS.currentProjectId, currentProjectId);
  }
  return { projects, currentProjectId };
}

function ensureBundledLists(projects) {
  let changed = false;
  projects = projects.map((project) => {
    if (project.projectId === defaultProjectId() && project.name === "Default project") {
      changed = true;
      return { ...project, name: "Default list" };
    }
    return project;
  });
  const testListId = testWebListId();
  ensureTestWebListData();
  if (projects.some((project) => project.projectId === testListId)) {
    if (changed) localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
    return projects;
  }
  const now = new Date().toISOString();
  const nextProjects = [...projects, { projectId: testListId, name: "CENS test web index", createdAt: now, updatedAt: now }];
  localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(nextProjects));
  return nextProjects;
}

function ensureTestWebListData() {
  const testListId = testWebListId();
  const assets = readJson(projectKey(testListId, "assets"), []);
  if (Array.isArray(assets) && assets.length === testWebAssets().length) return;
  saveProjectData(testListId, testWebListData());
}

function shouldOpenTestList(currentProjectId) {
  if (currentProjectId !== defaultProjectId()) return false;
  const currentAssets = readJson(projectKey(currentProjectId, "assets"), []);
  return Array.isArray(currentAssets) && currentAssets.length === 0;
}

function testWebListId() {
  return "LIST-cens-test-web-index";
}

function migratedAssets() {
  const storedAssets = readJson(STORAGE_KEYS.assets, null);
  return shouldUseSeedAssets(storedAssets) || shouldReplaceOldSheetSeed(storedAssets) ? seedAssets() : storedAssets;
}

function projectKey(projectId, key) {
  return `cens.project.${projectId}.${key}`;
}

function loadProjectData(projectId) {
  const storedAssets = readJson(projectKey(projectId, "assets"), null);
  const assets = Array.isArray(storedAssets)
    ? (shouldReplaceOldSheetSeed(storedAssets) ? seedAssets() : storedAssets)
    : [];
  return {
    assets,
    records: readJson(projectKey(projectId, "records"), []),
    presets: readJson(projectKey(projectId, "presets"), []),
    locations: readJson(projectKey(projectId, "locations"), []),
    myList: readJson(projectKey(projectId, "myList"), []),
    selectedLocation: localStorage.getItem(projectKey(projectId, "selectedLocation")) || "",
    locationLocked: localStorage.getItem(projectKey(projectId, "locationLocked")) === "true"
  };
}

function saveProjectData(projectId, data) {
  localStorage.setItem(projectKey(projectId, "assets"), JSON.stringify(data.assets || []));
  localStorage.setItem(projectKey(projectId, "records"), JSON.stringify(data.records || []));
  localStorage.setItem(projectKey(projectId, "presets"), JSON.stringify(data.presets || []));
  localStorage.setItem(projectKey(projectId, "locations"), JSON.stringify(data.locations || []));
  localStorage.setItem(projectKey(projectId, "myList"), JSON.stringify(data.myList || []));
  localStorage.setItem(projectKey(projectId, "selectedLocation"), data.selectedLocation || "");
  localStorage.setItem(projectKey(projectId, "locationLocked"), data.locationLocked ? "true" : "false");
}

function testWebListData() {
  return {
    assets: testWebAssets(),
    records: [],
    presets: [],
    locations: testWebLocations(),
    myList: [],
    selectedLocation: "",
    locationLocked: false
  };
}

function testWebAssets() {
  const now = new Date().toISOString();
  const today = dateOnly();
  const base = "/cens_assets_test_web";
  return [
    ["1", "Oscilloscope", "실험실에서 파형 확인용으로 쓰는 디지털 오실로스코프"],
    ["2", "Function Generator", "테스트 신호를 발생시키는 함수발생기"],
    ["3", "Power Supply", "검출기 및 테스트 보드 전원 공급용 DC 파워서플라이"],
    ["4", "Multimeter", "전압, 저항, 전류 확인용 휴대용 멀티미터"],
    ["5", "Soldering Station", "케이블 및 커넥터 작업용 납땜 스테이션"],
    ["6", "Crimp Tool Set", "핀 커넥터 압착 작업용 공구 세트"],
    ["7", "NIM Crate", "NIM 모듈 장착 및 전원 공급용 크레이트"],
    ["8", "VME Crate", "DAQ 모듈 장착용 VME 크레이트"],
    ["9", "Silicon Detector Box", "실리콘 검출기 보관용 보호 박스"],
    ["10", "MPPC Test Board", "MPPC 신호 테스트용 소형 보드"],
    ["11", "Scintillator Paddle", "빔 테스트 및 트리거용 플라스틱 섬광체"],
    ["12", "Faraday Cup", "빔 전류 측정용 페러데이컵"],
    ["13", "Vacuum Pump", "챔버 배기용 소형 진공 펌프"],
    ["14", "Gas Regulator", "가스 라인 압력 조절용 레귤레이터"],
    ["15", "Laptop DAQ", "현장 DAQ 확인 및 테스트용 노트북"],
    ["16", "Ethernet Switch", "DAQ/서버 네트워크 연결용 스위치"],
    ["17", "Cable Reel BNC", "BNC 케이블 묶음 보관 릴"],
    ["18", "Toolbox", "현장 작업용 공구 박스"],
    ["19", "Sample Holder Set", "타겟 및 샘플 고정용 홀더 세트"],
    ["20", "QR Label Printer", "자산 라벨 출력 테스트용 QR 라벨 프린터"]
  ].map(([number, name, description]) => {
    const padded = number.padStart(2, "0");
    return {
      assetId: number,
      name,
      description,
      photo1: `${base}/item_photos/item_${padded}.jpg`,
      photo2: `${base}/qr/qr_${padded}.png`,
      photo3: `${base}/location_photos/location_${padded}.jpg`,
      location: `Test location ${padded}`,
      lastInOutDate: "",
      lastVerifiedDate: today,
      lastVerifiedBy: "index import",
      createdAt: now,
      updatedAt: now
    };
  });
}

function testWebLocations() {
  const base = "/cens_assets_test_web/location_photos";
  return Array.from({ length: 20 }, (_, index) => {
    const padded = String(index + 1).padStart(2, "0");
    return {
      name: `Test location ${padded}`,
      photo: `${base}/location_${padded}.jpg`
    };
  });
}

function seedAssets() {
  if (Array.isArray(window.CENS_SEED_ASSETS) && window.CENS_SEED_ASSETS.length) {
    return window.CENS_SEED_ASSETS.map((asset) => ({ ...asset }));
  }
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

function shouldUseSeedAssets(storedAssets) {
  if (!Array.isArray(storedAssets) || storedAssets.length === 0) return true;
  const ids = storedAssets.map((asset) => asset && asset.assetId).sort();
  return storedAssets.length === 2 && ids[0] === "1001" && ids[1] === "1002";
}

function shouldReplaceOldSheetSeed(storedAssets) {
  if (!Array.isArray(storedAssets) || !Array.isArray(window.CENS_SEED_ASSETS)) return false;
  if (storedAssets.length !== window.CENS_SEED_ASSETS.length) return false;
  const ids = new Set(storedAssets.map((asset) => asset && asset.assetId));
  const hasExpectedRange = ids.has("201800287") && ids.has("202401992");
  const hasOldDescriptionMetadata = storedAssets.some((asset) => String(asset && asset.description).includes(" — Type:"));
  const lacksSeparatedFields = storedAssets.every((asset) => !asset || !("acquisitionPriceKrw" in asset));
  return hasExpectedRange && hasOldDescriptionMetadata && lacksSeparatedFields;
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
    locations: state.locations,
    myList: state.myList,
    operator: state.operator,
    projects: state.projects,
    currentProjectId: state.currentProjectId,
    operatorLocked: state.operatorLocked,
    selectedLocation: state.selectedLocation,
    locationLocked: state.locationLocked,
    homeControlsHidden: state.homeControlsHidden,
    language: state.language,
    backendUrl: state.backendUrl
  });
}

function render() {
  document.documentElement.lang = state.language === "ko" ? "ko" : "en";
  document.title = t("appName");
  if (state.authStatus !== "ready") {
    app.innerHTML = renderAuthPage();
    return;
  }
  app.innerHTML = `${renderTopbar()}${renderPage()}`;
}

function renderAuthPage() {
  const loading = state.authStatus === "loading";
  const unavailable = state.authStatus === "unavailable";
  const denied = state.authStatus === "denied";
  const message = state.authError || state.authMessage || (loading ? t("authLoading") : unavailable ? t("authUnavailable") : denied ? t("authDomainDenied", { domain: `@${AUTH_ALLOWED_DOMAIN}` }) : t("signInLead"));
  return `
    <main class="auth-page">
      <section class="auth-panel">
        <div>
          <p class="eyebrow">${escapeHtml(t("appName"))}</p>
          <h1>${escapeHtml(t("signInTitle"))}</h1>
          <p>${escapeHtml(message)}</p>
        </div>
        <label>${escapeHtml(t("signInEmail"))}
          <input data-bind="authEmail" data-enter-action="sign-in" value="${escapeAttr(state.authEmail)}" placeholder="${escapeAttr(t("signInEmailPlaceholder"))}" autocomplete="username">
        </label>
        <label>${escapeHtml(t("signInPassword"))}
          <input data-bind="authPassword" data-enter-action="sign-in" type="password" value="${escapeAttr(state.authPassword)}" placeholder="${escapeAttr(t("signInPasswordPlaceholder"))}" autocomplete="current-password">
        </label>
        <button data-action="sign-in" ${loading || unavailable ? "disabled" : ""}>${escapeHtml(t("signInSubmit"))}</button>
        <button class="secondary" data-action="sign-up" ${loading || unavailable ? "disabled" : ""}>${escapeHtml(t("signUp"))}</button>
        <button class="ghost" data-action="reset-password" ${loading || unavailable ? "disabled" : ""}>${escapeHtml(t("resetPassword"))}</button>
      </section>
    </main>`;
}

function t(key, vars = {}) {
  const table = I18N[state.language] || I18N.en;
  const fallback = I18N.en[key] || key;
  return String(table[key] || fallback).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}

function recordTypeLabel(type) {
  return t(type);
}

function renderTopbar() {
  const title = {
    home: t("appName"),
    assets: t("assetsTitle"),
    asset: state.routeParam ? t("assetDetailTitle") : t("addAssetTitle"),
    grab: t("grabTitle"),
    mylist: t("myListTitle"),
    records: t("recordsTitle"),
    presets: t("presetsTitle"),
    settings: t("settingsTitle")
  }[state.route] || t("appName");
  const back = state.route === "home" ? "" : `<button class="ghost small" data-action="back">${escapeHtml(t("back"))}</button>`;
  const authInfo = state.authUser ? `<span class="auth-chip" title="${escapeAttr(t("signedInAs"))}">${escapeHtml(state.authUser.email)}</span><button class="ghost small" data-action="sign-out">${escapeHtml(t("signOut"))}</button>` : "";
  const rightButton = state.route === "home"
    ? `<div class="topbar-actions">${authInfo}<button class="ghost small ${state.homeControlsHidden ? "show-controls" : ""}" data-action="toggle-home-controls">${escapeHtml(state.homeControlsHidden ? t("show") : t("hide"))}</button><button class="ghost small" data-action="open-manual-page">${escapeHtml(t("manualPage"))}</button><button class="ghost small" data-action="show-home-settings">${escapeHtml(t("settingsTitle"))}</button></div>`
    : `<div class="topbar-actions">${authInfo}<button class="ghost small" data-action="open-manual-page">${escapeHtml(t("manualPage"))}</button><button class="ghost small" data-nav="settings">${escapeHtml(t("settingsTitle"))}</button></div>`;
  return `<header class="topbar">${back}<h1>${escapeHtml(title)}</h1>${rightButton}</header>`;
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
    <main class="page home-console ${state.homeControlsHidden ? "controls-hidden" : ""}">
      <section class="quick-panel optional-controls">
        <div class="compact-row project-row">
          <label for="home-project">${escapeHtml(t("project"))}:</label>
          <select id="home-project" data-bind="currentProjectId">
            ${state.projects.map((project) => option(project.projectId, project.name, state.currentProjectId)).join("")}
          </select>
          <button class="small" data-action="create-project">${escapeHtml(t("new"))}</button>
        </div>
        <div class="compact-row">
          <label for="home-location">${escapeHtml(t("locationShort"))}:</label>
          <input id="home-location" data-bind="locationQuery" data-enter-action="location-find" value="${escapeAttr(state.locationQuery || state.selectedLocation)}" ${state.locationLocked ? "disabled" : ""}>
          <button class="small" data-action="${state.locationLocked ? "edit-location" : "location-find"}">${escapeHtml(state.locationLocked ? t("edit") : t("find"))}</button>
        </div>
      </section>
      <div class="rule optional-controls"></div>
      ${state.homeControlsHidden ? `<button class="folded-strip" data-action="toggle-home-controls" aria-label="${escapeAttr(t("show"))}"><span></span>${escapeHtml(t("controlsFolded"))}<span></span></button>` : ""}
      <section class="quick-panel">
        <div class="quick-actions two optional-controls">
          <button class="small" data-action="show-new-asset">${escapeHtml(t("new"))}</button>
          <button class="warning small" data-action="scan-home-asset">${escapeHtml(t("camera"))}</button>
        </div>
        <div class="quick-actions two optional-controls">
          <button class="secondary small" data-action="show-total-list">${escapeHtml(t("totalList"))}</button>
          <button class="secondary small" data-action="show-home-my-list">${escapeHtml(t("myListTitle"))} (${state.myList.length})</button>
        </div>
        <div class="compact-row">
          <label for="home-asset">${escapeHtml(t("assetNumberShort"))}:</label>
          <input id="home-asset" data-bind="assetQuery" data-enter-action="asset-find" value="${escapeAttr(state.assetQuery)}" inputmode="numeric">
          <button class="small" data-action="asset-find">${escapeHtml(t("find"))}</button>
        </div>
      </section>
      <div class="rule"></div>
      <section class="list-space">${renderHomeListSpace()}</section>
    </main>`;
}

function renderHomeListSpace() {
  if (state.homeMode === "locations") return renderLocationResults();
  if (state.homeMode === "assets" || state.homeMode === "total") return renderHomeAssetResults();
  if (state.homeMode === "my") return renderHomeMyList();
  if (state.homeMode === "newAsset") return renderHomeNewAssetForm();
  if (state.homeMode === "settings") return renderSettingsContent();
  return empty(t("listSpaceHint"));
}

function renderLocationResults() {
  const query = state.locationQuery.trim();
  const rows = state.homeResults;
  return `
    <div class="list-stack">
      ${query ? `<button class="secondary" data-action="create-location">${escapeHtml(t("newLocation"))}: ${escapeHtml(query)}</button>` : ""}
      ${rows.length ? rows.map(renderLocationCard).join("") : empty(t("noLocations"))}
    </div>`;
}

function renderLocationCard(location) {
  const photo = location.photo ? `<img class="mini-photo" src="${escapeAttr(location.photo)}" alt="${escapeAttr(location.name)}">` : `<button class="warning small" data-action="capture-location-photo" data-location-name="${escapeAttr(location.name)}">${escapeHtml(t("camera"))}</button>`;
  return `
    <article class="compact-card">
      <div class="mini-media">${photo}</div>
      <div class="compact-body">
        <strong>${escapeHtml(location.name)}</strong>
        <span class="meta">${escapeHtml(location.source || "")}</span>
      </div>
      <button class="small" data-action="select-location" data-location-name="${escapeAttr(location.name)}">${escapeHtml(t("select"))}</button>
    </article>`;
}

function renderHomeAssetResults() {
  const rows = state.homeResults;
  return `<div class="list-stack">${rows.length ? rows.map((asset) => renderHomeAssetCard(asset)).join("") : empty(t("noMatches"))}</div>`;
}

function renderHomeAssetCard(asset) {
  const alreadyAdded = state.myList.includes(asset.assetId);
  const isOpen = state.openHomeAssetId === asset.assetId;
  return `
    <article class="compact-card asset-compact ${isOpen ? "open" : ""}" data-asset-id="${escapeAttr(asset.assetId)}" data-action="toggle-home-asset">
      <div class="compact-body">
        <strong>${escapeHtml(asset.assetId)} ${escapeHtml(asset.name || t("unnamedAsset"))}</strong>
        <span>${escapeHtml(asset.description || t("noDescription"))}</span>
        <span class="meta">${escapeHtml(asset.location || t("noLocation"))}${asset.accountHolder ? ` | ${escapeHtml(t("accountHolderField"))}: ${escapeHtml(asset.accountHolder)}` : ""}</span>
      </div>
      <button class="small" data-action="home-add-asset" data-asset-id="${escapeAttr(asset.assetId)}" ${alreadyAdded ? "disabled" : ""}>${escapeHtml(t("add"))}</button>
      ${isOpen ? renderHomeAssetDetails(asset, alreadyAdded) : ""}
    </article>`;
}

function renderHomeMyList() {
  const assets = state.myList.map((id) => state.assets.find((asset) => asset.assetId === id)).filter(Boolean);
  return `
    <div class="list-stack">
      <div class="quick-actions two">
        <button class="small" data-action="checkout">${escapeHtml(t("checkoutRequest"))}</button>
        <button class="small" data-action="checkin">${escapeHtml(t("checkinRequest"))}</button>
      </div>
      <button class="warning small" data-action="verify">${escapeHtml(t("verifyLocation"))}</button>
      ${assets.length ? assets.map(renderHomeMyListItem).join("") : empty(t("myListEmpty"))}
    </div>`;
}

function renderHomeMyListItem(asset) {
  const isOpen = state.openHomeAssetId === asset.assetId;
  return `
    <article class="compact-card asset-compact ${isOpen ? "open" : ""}" data-asset-id="${escapeAttr(asset.assetId)}" data-action="toggle-home-asset">
      <div class="compact-body">
        <strong>${escapeHtml(asset.assetId)} ${escapeHtml(asset.name || t("unnamedAsset"))}</strong>
        <span>${escapeHtml(asset.description || t("noDescription"))}</span>
        <span class="meta">${escapeHtml(asset.location || t("noLocation"))}</span>
      </div>
      <button class="danger small" data-action="remove-mylist" data-remove-id="${escapeAttr(asset.assetId)}">${escapeHtml(t("remove"))}</button>
      ${isOpen ? renderHomeAssetDetails(asset, true) : ""}
    </article>`;
}

function renderHomeAssetDetails(asset, alreadyAdded) {
  if (state.editingHomeAssetId === asset.assetId) return renderHomeInlineAssetForm(asset);
  const photos = [asset.photo1, asset.photo2, asset.photo3].filter(Boolean);
  return `
    <div class="compact-detail">
      ${photos.length ? `<div class="thumbs">${photos.map((src) => `<img class="thumb" src="${escapeAttr(src)}" alt="${escapeAttr(t("assetPhoto"))}" data-action="preview-photo" data-src="${escapeAttr(src)}">`).join("")}</div>` : ""}
      <div class="fields">
        <span>${escapeHtml(t("locationField"))}: ${escapeHtml(asset.location || "-")}</span>
        ${asset.acquisitionPriceKrw ? `<span>${escapeHtml(t("acquisitionPriceKrwField"))}: ${escapeHtml(asset.acquisitionPriceKrw)}</span>` : ""}
        ${asset.manufacturerProvider ? `<span>${escapeHtml(t("manufacturerProviderField"))}: ${escapeHtml(asset.manufacturerProvider)}</span>` : ""}
        ${asset.acquisitionDate ? `<span>${escapeHtml(t("acquisitionDateField"))}: ${escapeHtml(asset.acquisitionDate)}</span>` : ""}
        ${asset.accountHolder ? `<span>${escapeHtml(t("accountHolderField"))}: ${escapeHtml(asset.accountHolder)}</span>` : ""}
        <span>${escapeHtml(t("lastInOut"))}: ${escapeHtml(asset.lastInOutDate || "-")}</span>
        <span>${escapeHtml(t("verified"))}: ${escapeHtml(asset.lastVerifiedDate || "-")} ${escapeHtml(t("by"))} ${escapeHtml(asset.lastVerifiedBy || "-")}</span>
      </div>
      <div class="quick-actions two">
        <button class="secondary" data-action="edit-home-asset" data-asset-id="${escapeAttr(asset.assetId)}">${escapeHtml(t("edit"))}</button>
        <button data-action="home-add-asset" data-asset-id="${escapeAttr(asset.assetId)}" ${alreadyAdded ? "disabled" : ""}>${escapeHtml(t("add"))}</button>
      </div>
    </div>`;
}

function renderHomeInlineAssetForm(asset) {
  return `
    <form class="compact-detail compact-form inline-edit-form" data-form="asset" data-return-home="true">
      ${field("assetId", t("assetIdField"), asset.assetId, "text", "readonly")}
      ${field("name", t("nameField"), asset.name)}
      <label class="wide">${escapeHtml(t("descriptionField"))}<textarea name="description">${escapeHtml(asset.description || "")}</textarea></label>
      ${field("location", t("locationField"), asset.location)}
      ${field("photo1", t("photo1Field"), asset.photo1, "url")}
      ${field("photo2", t("photo2Field"), asset.photo2, "url")}
      ${field("photo3", t("photo3Field"), asset.photo3, "url")}
      ${field("acquisitionPriceKrw", t("acquisitionPriceKrwField"), asset.acquisitionPriceKrw)}
      ${field("manufacturerProvider", t("manufacturerProviderField"), asset.manufacturerProvider)}
      ${field("acquisitionDate", t("acquisitionDateField"), asset.acquisitionDate, "date")}
      ${field("accountHolder", t("accountHolderField"), asset.accountHolder)}
      <div class="quick-actions two">
        <button type="submit">${escapeHtml(t("save"))}</button>
        <button type="button" class="secondary" data-action="cancel-home-edit">${escapeHtml(t("cancel"))}</button>
      </div>
    </form>`;
}

function renderHomeNewAssetForm() {
  const data = { ...emptyAsset(), assetId: state.assetQuery, location: state.selectedLocation || state.locationQuery };
  return `
    <form class="panel form-grid compact-form" data-form="asset" data-return-home="true">
      ${field("assetId", t("assetIdField"), data.assetId)}
      ${field("name", t("nameField"), data.name)}
      <label class="wide">${escapeHtml(t("descriptionField"))}<textarea name="description">${escapeHtml(data.description)}</textarea></label>
      ${field("location", t("locationField"), data.location)}
      ${field("photo1", t("photo1Field"), data.photo1, "url")}
      ${field("acquisitionPriceKrw", t("acquisitionPriceKrwField"), data.acquisitionPriceKrw)}
      ${field("manufacturerProvider", t("manufacturerProviderField"), data.manufacturerProvider)}
      ${field("accountHolder", t("accountHolderField"), data.accountHolder)}
      <button class="wide" type="submit">${escapeHtml(t("saveAsset"))}</button>
    </form>`;
}

function renderAssetsPage() {
  const assets = filteredSortedAssets();
  return `
    <main class="page">
      <section class="panel toolbar">
        <label>${escapeHtml(t("search"))}
          <input data-bind="listSearch" value="${escapeAttr(state.listSearch)}" placeholder="${escapeAttr(t("searchPlaceholder"))}">
        </label>
        <button data-action="search-assets">${escapeHtml(t("search"))}</button>
        <button class="warning" data-action="scan-list">${escapeHtml(t("scanQr"))}</button>
        <label>${escapeHtml(t("sortBy"))}
          <select data-bind="listSort">
            ${option("assetId", t("assetIdField"), state.listSort)}
            ${option("name", t("nameField"), state.listSort)}
            ${option("location", t("locationField"), state.listSort)}
            ${option("lastVerifiedDate", t("lastVerifiedDateField"), state.listSort)}
          </select>
        </label>
        <button data-nav="asset">${escapeHtml(t("addAsset"))}</button>
      </section>
      <section class="asset-list">${assets.length ? assets.map(renderAssetCard).join("") : empty(t("noAssets"))}</section>
    </main>`;
}

function renderAssetCard(asset, controls = "") {
  const photos = [asset.photo1, asset.photo2, asset.photo3].filter(Boolean);
  return `
    <article class="asset-card" data-asset-id="${escapeAttr(asset.assetId)}" data-action="open-asset">
      <div class="asset-main">
        <div>
          <p class="asset-title"><span class="asset-id">${escapeHtml(asset.assetId)}</span> ${escapeHtml(asset.name || t("unnamedAsset"))}</p>
          <div class="meta">${escapeHtml(asset.description || t("noDescription"))}</div>
        </div>
        <span class="badge">${escapeHtml(asset.location || t("noLocation"))}</span>
      </div>
      <div class="fields">
        ${asset.acquisitionPriceKrw ? `<span>${escapeHtml(t("acquisitionPriceKrwField"))}: ${escapeHtml(asset.acquisitionPriceKrw)}</span>` : ""}
        ${asset.manufacturerProvider ? `<span>${escapeHtml(t("manufacturerProviderField"))}: ${escapeHtml(asset.manufacturerProvider)}</span>` : ""}
        ${asset.accountHolder ? `<span>${escapeHtml(t("accountHolderField"))}: ${escapeHtml(asset.accountHolder)}</span>` : ""}
        ${asset.acquisitionDate ? `<span>${escapeHtml(t("acquisitionDateField"))}: ${escapeHtml(asset.acquisitionDate)}</span>` : ""}
        <span>${escapeHtml(t("lastInOut"))}: ${escapeHtml(asset.lastInOutDate || "-")}</span>
        <span>${escapeHtml(t("verified"))}: ${escapeHtml(asset.lastVerifiedDate || "-")} ${escapeHtml(t("by"))} ${escapeHtml(asset.lastVerifiedBy || "-")}</span>
      </div>
      ${photos.length ? `<div class="thumbs">${photos.map((src) => `<img class="thumb" src="${escapeAttr(src)}" alt="${escapeAttr(t("assetPhoto"))}" data-action="preview-photo" data-src="${escapeAttr(src)}">`).join("")}</div>` : ""}
      ${controls}
    </article>`;
}

function renderAssetForm() {
  const asset = state.routeParam ? state.assets.find((item) => item.assetId === state.routeParam) : null;
  const data = asset || emptyAsset();
  return `
    <main class="page">
      <form class="panel form-grid" data-form="asset">
        ${field("assetId", t("assetIdField"), data.assetId, "text", state.routeParam ? "readonly" : "")}
        ${field("name", t("nameField"), data.name)}
        <label class="wide">${escapeHtml(t("descriptionField"))}
          <textarea name="description">${escapeHtml(data.description)}</textarea>
        </label>
        ${field("photo1", t("photo1Field"), data.photo1, "url")}
        ${field("photo2", t("photo2Field"), data.photo2, "url")}
        ${field("photo3", t("photo3Field"), data.photo3, "url")}
        ${field("location", t("locationField"), data.location)}
        ${field("acquisitionPriceKrw", t("acquisitionPriceKrwField"), data.acquisitionPriceKrw)}
        ${field("manufacturerProvider", t("manufacturerProviderField"), data.manufacturerProvider)}
        ${field("acquisitionDate", t("acquisitionDateField"), data.acquisitionDate, "date")}
        ${field("accountHolder", t("accountHolderField"), data.accountHolder)}
        ${field("lastInOutDate", t("lastInOutDateField"), data.lastInOutDate, "date")}
        ${field("lastVerifiedDate", t("lastVerifiedDateField"), data.lastVerifiedDate, "date")}
        ${field("lastVerifiedBy", t("lastVerifiedByField"), data.lastVerifiedBy)}
        <button class="wide" type="submit">${escapeHtml(t("saveAsset"))}</button>
      </form>
    </main>`;
}

function renderGrabPage() {
  return `
    <main class="page">
      <section class="panel">
        <label>${escapeHtml(t("assetNumberOrSearch"))}
          <input data-bind="grabQuery" value="${escapeAttr(state.grabQuery)}" placeholder="${escapeAttr(t("scanOrEnterAssetId"))}">
        </label>
        <div class="split">
          <button data-action="grab-search">${escapeHtml(t("addSearch"))}</button>
          <button class="warning" data-action="scan-grab">${escapeHtml(t("scanQr"))}</button>
        </div>
        <div class="split">
          <button class="secondary" data-nav="mylist">${escapeHtml(t("myListTitle"))} (${state.myList.length})</button>
          <button class="secondary" data-action="save-preset">${escapeHtml(t("savePreset"))}</button>
        </div>
        <button class="secondary" data-nav="presets">${escapeHtml(t("loadPreset"))}</button>
      </section>
      <section class="search-results">
        ${state.grabResults.length ? `
          <div class="panel">
            <div class="inline">
              <strong>${escapeHtml(t("matchingResults"))}</strong>
              <button class="small" data-action="add-selected-results">${escapeHtml(t("addSelected"))}</button>
            </div>
            ${state.grabResults.map(renderSelectableResult).join("")}
            <button class="ghost" data-action="clear-grab-results">${escapeHtml(t("clearResults"))}</button>
          </div>` : empty(t("searchResultsEmpty"))}
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
          <button class="small" data-action="checkout">${escapeHtml(t("checkoutRequest"))}</button>
          <button class="small" data-action="checkin">${escapeHtml(t("checkinRequest"))}</button>
        </div>
        <button class="warning small" data-action="verify">${escapeHtml(t("verifyLocation"))}</button>
      </section>
      <section class="asset-list">
        ${assets.length ? assets.map((asset) => renderAssetCard(asset, `<button class="danger small" data-action="remove-mylist" data-remove-id="${escapeAttr(asset.assetId)}">${escapeHtml(t("remove"))}</button>`)).join("") : empty(t("myListEmpty"))}
      </section>
    </main>`;
}

function renderRecordsPage() {
  const records = state.records.filter((record) => state.recordFilter === "all" || record.type === state.recordFilter);
  return `
    <main class="page">
      <section class="panel">
        <label>${escapeHtml(t("filter"))}
          <select data-bind="recordFilter">
            ${option("all", t("all"), state.recordFilter)}
            ${option("checkout", t("checkout"), state.recordFilter)}
            ${option("checkin", t("checkin"), state.recordFilter)}
            ${option("verify", t("verify"), state.recordFilter)}
          </select>
        </label>
      </section>
      <section class="record-list">${records.length ? records.map(renderRecord).join("") : empty(t("noRecords"))}</section>
    </main>`;
}

function renderRecord(record) {
  return `
    <article class="record-card">
      <div class="asset-main">
        <strong>${escapeHtml(record.recordId)}</strong>
        <span class="badge">${escapeHtml(recordTypeLabel(record.type))}</span>
      </div>
      <div class="fields">
        <span>${escapeHtml(t("assets"))}: ${escapeHtml(record.assetIds.join(", "))}</span>
        <span>${escapeHtml(t("user"))}: ${escapeHtml(record.user)}</span>
        <span>${escapeHtml(t("from"))}: ${escapeHtml(record.fromLocation || "-")}</span>
        <span>${escapeHtml(t("to"))}: ${escapeHtml(record.toLocation || "-")}</span>
        <span>${escapeHtml(t("date"))}: ${escapeHtml(record.date)}</span>
        <span>${escapeHtml(t("document"))}: ${record.generatedDocUrl ? `<a href="${escapeAttr(record.generatedDocUrl)}">${escapeHtml(t("open"))}</a>` : "-"}</span>
      </div>
      ${record.reason ? `<div class="meta">${escapeHtml(t("reason"))}: ${escapeHtml(record.reason)}</div>` : ""}
    </article>`;
}

function renderPresetsPage() {
  return `
    <main class="page">
      <section class="panel">
        <button data-action="save-preset">${escapeHtml(t("saveCurrentPreset"))}</button>
      </section>
      <section class="preset-list">${state.presets.length ? state.presets.map(renderPreset).join("") : empty(t("noPresets"))}</section>
    </main>`;
}

function renderPreset(preset) {
  return `
    <article class="preset-card">
      <div class="asset-main">
        <strong>${escapeHtml(preset.listName)}</strong>
        <span class="badge">${preset.assetIds.length} ${escapeHtml(t("assets"))}</span>
      </div>
      <div class="meta">${escapeHtml(t("createdBy"))} ${escapeHtml(preset.createdBy || "-")} ${escapeHtml(t("on"))} ${escapeHtml(dateOnly(preset.createdAt))}</div>
      <div class="split">
        <button data-action="load-preset" data-preset-id="${escapeAttr(preset.listId)}">${escapeHtml(t("loadPreset"))}</button>
        <button class="danger" data-action="delete-preset" data-preset-id="${escapeAttr(preset.listId)}">${escapeHtml(t("delete"))}</button>
      </div>
    </article>`;
}

function renderSettingsPage() {
  return `<main class="page">${renderSettingsContent()}</main>`;
}

function renderSettingsContent() {
  return `
      <section class="panel">
        <label>${escapeHtml(t("language"))}
          <select data-bind="language">
            ${option("en", t("english"), state.language)}
            ${option("ko", t("korean"), state.language)}
          </select>
        </label>
        <label>${escapeHtml(t("backendUrl"))}
          <input data-bind="backendUrl" value="${escapeAttr(state.backendUrl)}" placeholder="${escapeAttr(t("backendPlaceholder"))}">
        </label>
        <button data-action="test-sync">${escapeHtml(t("testSync"))}</button>
      </section>
      <section class="panel">
        <strong>${escapeHtml(t("projectList"))}</strong>
        <label>${escapeHtml(t("project"))}
          <select data-bind="currentProjectId">
            ${state.projects.map((project) => option(project.projectId, project.name, state.currentProjectId)).join("")}
          </select>
        </label>
        <button data-action="create-project">${escapeHtml(t("newProject"))}</button>
      </section>
      <section class="panel">
        <strong>${escapeHtml(t("seedAssetsAvailable"))}: ${seedAssets().length}</strong>
        <button data-action="load-seed-assets">${escapeHtml(t("loadSeedAssets"))}</button>
      </section>
      <section class="panel">
        <strong>${escapeHtml(t("currentStorage"))}</strong>
        <div class="fields">
          <span>${escapeHtml(t("assets"))}: ${state.assets.length}</span>
          <span>${escapeHtml(t("recordsTitle"))}: ${state.records.length}</span>
          <span>${escapeHtml(t("presetLists"))}: ${state.presets.length}</span>
          <span>${escapeHtml(t("myListTitle"))}: ${state.myList.length}</span>
        </div>
      </section>`;
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
  const action = target.dataset.action;
  if (action === "sign-in") {
    signIn();
    return;
  }
  if (action === "sign-up") {
    signUp();
    return;
  }
  if (action === "reset-password") {
    sendPasswordResetEmail();
    return;
  }
  if (action === "sign-out") {
    signOut();
    return;
  }
  if (target.dataset.nav) {
    navigate(target.dataset.nav);
    return;
  }
  if (action === "back") history.length > 1 ? history.back() : navigate("home");
  if (action === "open-asset") openAssetFromCard(event, target);
  if (action === "toggle-home-asset") toggleHomeAsset(event, target);
  if (action === "toggle-home-controls") {
    state.homeControlsHidden = !state.homeControlsHidden;
    persist();
    render();
  }
  if (action === "open-manual-page") {
    window.open("manual/index.html", "_blank", "noopener");
  }
  if (action === "show-home-settings") {
    state.homeMode = "settings";
    state.openHomeAssetId = "";
    state.editingHomeAssetId = "";
    render();
  }
  if (action === "edit-home-asset") {
    state.openHomeAssetId = target.dataset.assetId;
    state.editingHomeAssetId = target.dataset.assetId;
    render();
  }
  if (action === "cancel-home-edit") {
    state.editingHomeAssetId = "";
    render();
  }
  if (action === "preview-photo") previewPhoto(event, target);
  if (action === "create-project") createProject();
  if (action === "location-find") findLocations();
  if (action === "edit-location") editLocation();
  if (action === "create-location") createLocation();
  if (action === "select-location") selectLocation(target.dataset.locationName);
  if (action === "capture-location-photo") captureLocationPhoto(target.dataset.locationName);
  if (action === "asset-find") findHomeAssets();
  if (action === "scan-home-asset") openScanner((text) => {
    addScannedHomeAsset(text);
  });
  if (action === "show-new-asset") {
    state.homeMode = "newAsset";
    state.openHomeAssetId = "";
    state.editingHomeAssetId = "";
    render();
  }
  if (action === "show-total-list") {
    state.homeMode = "total";
    state.homeResults = sortedAssets();
    state.openHomeAssetId = "";
    state.editingHomeAssetId = "";
    render();
  }
  if (action === "show-home-my-list") {
    state.homeMode = "my";
    state.openHomeAssetId = "";
    state.editingHomeAssetId = "";
    render();
  }
  if (action === "home-add-asset") {
    addToMyList([target.dataset.assetId]);
    persist();
    render();
  }
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
  if (action === "load-seed-assets") loadSeedAssets();
}

function handleInput(event) {
  const key = event.target.dataset.bind;
  if (!key) return;
  state[key] = event.target.value;
  if (key === "operator" || key === "backendUrl" || key === "language") persist();
}

function handleChange(event) {
  const key = event.target.dataset.bind;
  if (!key) return;
  if (key === "currentProjectId") {
    switchProject(event.target.value);
    return;
  }
  state[key] = event.target.value;
  persist();
  render();
}

function createProject() {
  const name = prompt(t("projectName"));
  if (!name || !name.trim()) return;
  const project = makeProject(name);
  state.projects.push(project);
  state.currentProjectId = project.projectId;
  Object.assign(state, {
    assets: [],
    myList: [],
    records: [],
    presets: [],
    locations: [],
    selectedLocation: "",
    locationQuery: "",
    locationLocked: false,
    homeMode: "empty",
    homeResults: [],
    openHomeAssetId: "",
    editingHomeAssetId: ""
  });
  persist();
  showNotice(t("projectCreated"));
  render();
}

function switchProject(projectId) {
  if (!state.projects.some((project) => project.projectId === projectId)) return;
  persist();
  const projectData = loadProjectData(projectId);
  state.currentProjectId = projectId;
  Object.assign(state, projectData, {
    locationQuery: projectData.selectedLocation,
    homeMode: "empty",
    homeResults: [],
    openHomeAssetId: "",
    editingHomeAssetId: ""
  });
  persist();
  showNotice(t("projectSwitched"));
  render();
}

function editLocation() {
  state.locationLocked = false;
  state.selectedLocation = "";
  persist();
  render();
}

function findLocations() {
  const query = normalize(state.locationQuery);
  state.homeMode = "locations";
  state.homeResults = getLocationEntries().filter((location) => !query || normalize(location.name).includes(query));
  state.openHomeAssetId = "";
  state.editingHomeAssetId = "";
  render();
}

function createLocation() {
  const name = state.locationQuery.trim();
  if (!name) return;
  const entry = upsertLocation({ name, photo: "", source: "custom" });
  state.homeMode = "locations";
  state.homeResults = [entry];
  state.openHomeAssetId = "";
  state.editingHomeAssetId = "";
  persist();
  render();
}

function selectLocation(name) {
  state.selectedLocation = name || "";
  state.locationQuery = state.selectedLocation;
  state.locationLocked = Boolean(state.selectedLocation);
  persist();
  render();
}

function captureLocationPhoto(name) {
  if (!name) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const entry = upsertLocation({ name, photo: String(reader.result || ""), source: "custom" });
      state.homeMode = "locations";
      state.homeResults = [entry];
      state.openHomeAssetId = "";
      state.editingHomeAssetId = "";
      persist();
      render();
    });
    reader.readAsDataURL(file);
  });
  input.click();
}

function findHomeAssets() {
  const query = normalize(extractAssetNumber(state.assetQuery));
  state.homeMode = "assets";
  state.homeResults = query ? sortedAssets().filter((asset) => [asset.assetId, asset.name, asset.description].some((value) => normalize(value).includes(query))) : [];
  state.openHomeAssetId = "";
  state.editingHomeAssetId = "";
  render();
}

function addScannedHomeAsset(text) {
  const assetId = extractAssetNumber(text);
  state.assetQuery = assetId;
  const asset = state.assets.find((item) => item.assetId === assetId);
  if (asset) {
    addToMyList([asset.assetId]);
    state.homeMode = "my";
    state.homeResults = [];
    state.openHomeAssetId = asset.assetId;
    state.editingHomeAssetId = "";
    persist();
    render();
    return;
  }
  findHomeAssets();
}

function getLocationEntries() {
  const map = new Map();
  state.assets.forEach((asset) => {
    const name = String(asset.location || "").trim();
    if (name && !map.has(name)) map.set(name, { name, photo: "", source: t("assets") });
  });
  state.locations.forEach((location) => {
    const name = String(location.name || "").trim();
    if (!name) return;
    map.set(name, { name, photo: location.photo || "", source: location.source || "custom" });
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function upsertLocation(entry) {
  const name = String(entry.name || "").trim();
  const existing = state.locations.find((location) => location.name === name);
  if (existing) {
    Object.assign(existing, entry, { name, updatedAt: new Date().toISOString() });
    return existing;
  }
  const next = {
    locationId: makeId("LOC"),
    name,
    photo: entry.photo || "",
    source: entry.source || "custom",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.locations.push(next);
  return next;
}

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-form='asset']");
  if (!form) return;
  event.preventDefault();
  saveAsset(new FormData(form), form.dataset.returnHome === "true");
});

function handleKeydown(event) {
  if (event.key !== "Enter") return;
  const action = event.target.dataset.enterAction;
  if (!action) return;
  event.preventDefault();
  if (action === "sign-in") signIn();
  if (action === "sign-up") signUp();
  if (action === "reset-password") sendPasswordResetEmail();
  if (action === "location-find") findLocations();
  if (action === "asset-find") findHomeAssets();
}

function filteredSortedAssets() {
  const query = normalize(state.listSearch);
  return sortedAssets()
    .filter((asset) => !query || [asset.assetId, asset.name, asset.description, asset.manufacturerProvider, asset.accountHolder].some((value) => normalize(value).includes(query)))
}

function sortedAssets(sortKey = state.listSort) {
  return [...state.assets].sort((a, b) => String(a[sortKey] || "").localeCompare(String(b[sortKey] || ""), undefined, { numeric: true }));
}

function openAssetFromCard(event, target) {
  if (event.target.closest("button, img, a, input")) return;
  navigate(`asset/${encodeURIComponent(target.dataset.assetId)}`);
}

function toggleHomeAsset(event, target) {
  if (event.target.closest("button, img, a, input")) return;
  const assetId = target.dataset.assetId;
  state.openHomeAssetId = state.openHomeAssetId === assetId ? "" : assetId;
  if (state.openHomeAssetId !== assetId) state.editingHomeAssetId = "";
  render();
}

function previewPhoto(event, target) {
  event.stopPropagation();
  openModal(t("photoPreview"), `<img class="preview-image" src="${escapeAttr(target.dataset.src)}" alt="${escapeAttr(t("photoPreview"))}">`);
}

function saveAsset(formData, returnHome = false) {
  const now = new Date().toISOString();
  const asset = {
    assetId: String(formData.get("assetId") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    photo1: String(formData.get("photo1") || "").trim(),
    photo2: String(formData.get("photo2") || "").trim(),
    photo3: String(formData.get("photo3") || "").trim(),
    location: String(formData.get("location") || "").trim(),
    acquisitionPriceKrw: String(formData.get("acquisitionPriceKrw") || "").trim(),
    manufacturerProvider: String(formData.get("manufacturerProvider") || "").trim(),
    acquisitionDate: String(formData.get("acquisitionDate") || "").trim(),
    accountHolder: String(formData.get("accountHolder") || "").trim(),
    lastInOutDate: String(formData.get("lastInOutDate") || "").trim(),
    lastVerifiedDate: String(formData.get("lastVerifiedDate") || "").trim(),
    lastVerifiedBy: String(formData.get("lastVerifiedBy") || "").trim(),
    createdAt: now,
    updatedAt: now
  };
  if (!asset.assetId) {
    showNotice(t("assetIdRequired"), true);
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
  showNotice(t("assetSaved"));
  if (returnHome) {
    state.assetQuery = asset.assetId;
    state.openHomeAssetId = asset.assetId;
    state.editingHomeAssetId = "";
    if (state.homeMode === "my") {
      state.homeResults = [];
    } else if (state.homeMode === "total") {
      state.homeResults = sortedAssets();
    } else {
      state.homeMode = "assets";
      state.homeResults = [asset];
    }
    navigate("home");
    render();
  } else {
    navigate("assets");
  }
}

function runGrabSearch() {
  const raw = state.grabQuery.trim();
  const query = extractAssetNumber(raw);
  if (!query) {
    showNotice(t("enterScanAsset"), true);
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
  state.myList = [...new Set([...state.myList, ...assetIds])];
}

function removeFromMyList(assetId) {
  state.myList = state.myList.filter((id) => id !== assetId);
  persist();
  render();
}

function openMovementModal(type) {
  if (!requireOperator() || !requireMyList()) return;
  const locationLabel = type === "checkout" ? t("destinationLocation") : t("newCurrentLocation");
  openModal(type === "checkout" ? t("checkoutRequest") : t("checkinRequest"), `
    <form class="form-grid" data-form="movement" data-type="${type}">
      <label class="wide">${escapeHtml(locationLabel)}
        <input name="toLocation" required placeholder="${escapeAttr(t("enterLocation"))}">
      </label>
      <label class="wide">${escapeHtml(t("reason"))}
        <textarea name="reason" placeholder="${escapeAttr(type === "checkout" ? t("requiredReason") : t("optionalReason"))}" ${type === "checkout" ? "required" : ""}></textarea>
      </label>
      <button class="wide" type="submit">${escapeHtml(type === "checkout" ? t("confirmCheckout") : t("confirmCheckin"))}</button>
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
  const actor = currentActor();
  const selectedAssets = state.assets.filter((asset) => state.myList.includes(asset.assetId));
  const fromLocation = [...new Set(selectedAssets.map((asset) => asset.location).filter(Boolean))].join(", ");
  state.assets = state.assets.map((asset) => {
    if (!state.myList.includes(asset.assetId)) return asset;
    return {
      ...asset,
      location: toLocation,
      lastInOutDate: today,
      lastVerifiedDate: today,
      lastVerifiedBy: actor,
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
    user: actor,
    date: today,
    generatedDocUrl: ""
  });
  persist();
  closeModal();
  showNotice(t("recordCreated", { type: recordTypeLabel(type) }));
  navigate("records");
}

function verifyLocation() {
  if (!requireOperator() || !requireMyList()) return;
  const today = dateOnly();
  const actor = currentActor();
  state.assets = state.assets.map((asset) => {
    if (!state.myList.includes(asset.assetId)) return asset;
    return {
      ...asset,
      lastVerifiedDate: today,
      lastVerifiedBy: actor,
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
    reason: t("locationVerified"),
    user: actor,
    date: today,
    generatedDocUrl: ""
  });
  persist();
  showNotice(t("verificationRecordCreated"));
  navigate("records");
}

function savePreset() {
  if (!requireOperator() || !requireMyList()) return;
  const listName = prompt(t("presetName"));
  if (!listName) return;
  const now = new Date().toISOString();
  const actor = currentActor();
  state.presets.unshift({
    listId: makeId("LIST"),
    listName: listName.trim(),
    assetIds: [...state.myList],
    createdBy: actor,
    createdAt: now,
    updatedAt: now
  });
  persist();
  showNotice(t("presetSaved"));
  navigate("presets");
}

function loadPreset(listId) {
  const preset = state.presets.find((item) => item.listId === listId);
  if (!preset) return;
  state.myList = [...new Set([...state.myList, ...preset.assetIds])];
  persist();
  showNotice(t("presetLoaded"));
  navigate("mylist");
}

function deletePreset(listId) {
  if (!confirm(t("deletePresetConfirm"))) return;
  state.presets = state.presets.filter((preset) => preset.listId !== listId);
  persist();
  render();
}

async function testSync() {
  const result = await backend.syncWithGoogleSheets();
  showNotice(result.message, !result.ok);
}

function loadSeedAssets() {
  const assets = seedAssets();
  if (!assets.length) return;
  if (!confirm(t("loadSeedConfirm"))) return;
  state.assets = assets;
  persist();
  showNotice(t("seedAssetsLoaded", { count: assets.length }));
  navigate("assets");
}

function requireOperator() {
  if (currentActor()) return true;
  showNotice(t("operatorRequired"), true);
  navigate("home");
  return false;
}

function currentActor() {
  return state.authUser && state.authUser.email ? state.authUser.email : "";
}

function requireMyList() {
  if (state.myList.length) return true;
  showNotice(t("myListEmpty"), true);
  return false;
}

function openScanner(onSuccess) {
  const supported = window.Html5Qrcode;
  if (!supported) {
    showNotice(t("qrLibraryMissing"), true);
    return;
  }
  openModal(t("qrTitle"), `
    <div id="qr-reader"></div>
    <p class="hint">${escapeHtml(t("qrHint"))}</p>
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
      showNotice(t("cameraStartFailed", { error }), true);
    }
  });
}

function openModal(title, body, afterOpen) {
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">
        <div class="modal-header">
          <h2>${escapeHtml(title)}</h2>
          <button class="ghost small" data-action="close-modal">${escapeHtml(t("close"))}</button>
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
  openModal(isError ? t("actionNeeded") : t("done"), el.outerHTML);
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
    acquisitionPriceKrw: "",
    manufacturerProvider: "",
    acquisitionDate: "",
    accountHolder: "",
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
