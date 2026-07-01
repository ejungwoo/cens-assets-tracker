import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  applyTheme,
  applyPreset,
  loadFonts,
  FONT_DEFAULTS,
  Button,
  Input,
  Badge,
  Card,
  useMediaQuery,
} from 'lilak-ui'
import {
  Cube,
  ListDashes,
  UserList,
  Camera,
  CameraPlus,
  ClockCounterClockwise,
  SignOut,
  Plus,
  Minus,
  Images,
  MagnifyingGlass,
  PencilSimple,
  CaretDown,
  Trash,
  CheckCircle,
  ArrowCircleDown,
  ArrowCircleUp,
  FloppyDisk,
  MapPin,
  Tag,
  CaretRight,
  ShieldCheck,
  CalendarPlus,
  UploadSimple,
  ArrowsMerge,
} from '@phosphor-icons/react'

// Two-tone palette. Tone A (primary): top-bar icons, scan FAB, active tab, selection.
const BRAND = '#3D5A80'        // slate blue
// Tone B (secondary): the content actions — photo button + My List "+" circle.
const ADD_COLOR = '#C98A2E'    // amber gold
const PHOTO_COLOR = '#C98A2E'  // amber gold

// Make the Verify / Check-out / Check-in / Edit buttons large (tab-icon scale).
const ACTION_BTN = { fontSize: 16, padding: '10px 16px' }

const STORAGE_KEYS = {
  assets: 'cens.assets',
  records: 'cens.records',
  myList: 'cens.myList',
  language: 'cens.language',
  projects: 'cens.projects',
  currentProjectId: 'cens.currentProjectId',
}

const AUTH_ALLOWED_DOMAIN = 'ibs.re.kr'
const DEFAULT_PROJECT_ID = 'LIST-default'
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCzqVQWrkKsYRWZO3cZylOUyNI31Odc_fk',
  authDomain: 'cens-assets-tracker.firebaseapp.com',
  projectId: 'cens-assets-tracker',
  storageBucket: 'cens-assets-tracker.firebasestorage.app',
  messagingSenderId: '493140318257',
  appId: '1:493140318257:web:ad8e3c879d40765645dd10',
}

// Portal integration: when served under the LILAK portal proxy, the portal
// injects window.__PORTAL_BASE__ = /pp/asset_manager/<project>. Then the PROJECT
// (asset list) is the portal project, and AUTH is the portal account (SSO) — so
// the app skips its own list-picker + Firebase login.
const PORTAL_BASE = (typeof window !== 'undefined' && window.__PORTAL_BASE__) || ''
const PORTAL_PARTS = PORTAL_BASE.split('/').filter(Boolean)        // ['pp','asset_manager','<project>']
const PORTAL_PROJECT = PORTAL_PARTS.length ? PORTAL_PARTS[PORTAL_PARTS.length - 1] : ''
const PORTAL_SERVICE = PORTAL_PARTS.length >= 2 ? PORTAL_PARTS[PORTAL_PARTS.length - 2] : ''
function portalUser() {
  try {
    const t = localStorage.getItem('lilak_portal_token') || localStorage.getItem('elog_token')
    if (!t) return null
    const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const email = p.email || p.username || 'portal'
    return { email, name: p.name || p.username || email, role: p.role || p.prole || '' }
  } catch { return null }
}

// The portal marks admins with role "manager" (first signup). Outside the portal
// (standalone) the local user owns their own lists, so treat them as admin.
function isAdminUser(user) {
  if (!PORTAL_BASE) return true
  return ['manager', 'admin'].includes(String(user?.role || '').toLowerCase())
}

const tabs = [
  { id: 'assets', label: 'Assets', Glyph: ListDashes },
  { id: 'mylist', label: 'My List', Glyph: UserList },
  { id: 'scan', label: 'Scan', Glyph: Camera, fab: true },
  { id: 'classification', label: 'Class', Glyph: Tag },
  { id: 'history', label: 'History', Glyph: ClockCounterClockwise },
]

// QR/barcode text → bare asset number. Accepts a raw number, a URL with an
// assetId-style query/path, or any string containing a run of digits.
function extractAssetNumber(text) {
  const value = String(text || '').trim()
  if (!value) return ''
  const urlMatch = value.match(/[?&](?:assetId|asset|id|no|number)=([A-Za-z0-9_-]+)/i)
  if (urlMatch) return urlMatch[1]
  const pathMatch = value.match(/\/([0-9]{2,})(?:[/?#]|$)/)
  if (pathMatch) return pathMatch[1]
  const numeric = value.match(/[0-9]{2,}/)
  return numeric ? numeric[0] : value
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function seedAssets() {
  return Array.isArray(window.CENS_SEED_ASSETS) ? window.CENS_SEED_ASSETS : []
}

function defaultProjectId() {
  return DEFAULT_PROJECT_ID
}

function projectKey(projectId, key) {
  return `cens.project.${projectId}.${key}`
}

// Admin-set display name for a list, stored per project. Survives portal reloads
// (where ensureProjectState otherwise rebuilds the name from the portal project).
function projectDisplayName(projectId, fallback) {
  return localStorage.getItem(projectKey(projectId, 'name')) || fallback
}

// Sync the in-app list name to the portal so the portal's project list shows the
// same name (the folder/URL id is unchanged — this only sets a display label).
function pushPortalName(name) {
  if (!PORTAL_BASE || !PORTAL_SERVICE || !PORTAL_PROJECT) return
  const tok = localStorage.getItem('lilak_portal_token') || localStorage.getItem('elog_token')
  fetch(`/api/services/${PORTAL_SERVICE}/projects/${PORTAL_PROJECT}/name`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
    body: JSON.stringify({ name: name || '' }),
  }).catch(() => {})
}

function ensureProjectState() {
  // Under the portal, the project IS the portal project (one list per portal
  // project); the portal manages create/switch, so don't use the in-app picker.
  if (PORTAL_PROJECT) {
    if (!localStorage.getItem(projectKey(PORTAL_PROJECT, 'assets'))) {
      saveProjectData(PORTAL_PROJECT, { assets: seedAssets(), records: [], myList: [] })
    }
    return { projects: [{ projectId: PORTAL_PROJECT, name: PORTAL_PROJECT }], currentProjectId: PORTAL_PROJECT }
  }
  let projects = readJson(STORAGE_KEYS.projects, null)
  let currentProjectId = localStorage.getItem(STORAGE_KEYS.currentProjectId) || ''
  if (!Array.isArray(projects) || projects.length === 0) {
    const now = new Date().toISOString()
    projects = [{ projectId: defaultProjectId(), name: 'Default list', createdAt: now, updatedAt: now }]
    currentProjectId = defaultProjectId()
    writeJson(STORAGE_KEYS.projects, projects)
    localStorage.setItem(STORAGE_KEYS.currentProjectId, currentProjectId)
  }
  if (!projects.some((project) => project.projectId === currentProjectId)) {
    currentProjectId = projects[0].projectId
    localStorage.setItem(STORAGE_KEYS.currentProjectId, currentProjectId)
  }
  if (!localStorage.getItem(projectKey(currentProjectId, 'assets'))) {
    const legacyAssets = readJson(STORAGE_KEYS.assets, null)
    saveProjectData(currentProjectId, {
      assets: Array.isArray(legacyAssets) && legacyAssets.length ? legacyAssets : seedAssets(),
      records: readJson(STORAGE_KEYS.records, []),
      myList: readJson(STORAGE_KEYS.myList, []),
    })
  }
  return { projects, currentProjectId }
}

// Fill missing type / account holder from the seed (by assetId) without
// overwriting any user-entered value — so existing lists pick up sheet updates.
function mergeSeedMeta(assets) {
  const seed = seedAssets()
  if (!seed.length || !assets.length) return assets
  const m = {}
  for (const s of seed) m[s.assetId] = s
  let changed = false
  const next = assets.map((a) => {
    const s = m[a.assetId]
    if (!s) return a
    const patch = {}
    if (!a.type && s.type) patch.type = s.type
    if (!a.accountHolder && s.accountHolder) patch.accountHolder = s.accountHolder
    if (!Object.keys(patch).length) return a
    changed = true
    return { ...a, ...patch }
  })
  return changed ? next : assets
}

function loadProjectData(projectId) {
  return {
    assets: mergeSeedMeta(readJson(projectKey(projectId, 'assets'), [])),
    records: readJson(projectKey(projectId, 'records'), []),
    myList: readJson(projectKey(projectId, 'myList'), []),
    // Photos taken for My List items, pending commit to the asset on the next
    // check-out/check-in/verify. Keyed by assetId → { sticker, whole } data URLs.
    myPhotos: readJson(projectKey(projectId, 'myPhotos'), {}),
    // Location records: [{ name, photo }]. Asset locations not yet recorded are
    // merged in at render time (see locationList).
    locations: readJson(projectKey(projectId, 'locations'), []),
    // Type classification records: [{ name, photo, description, memo, ... }].
    types: readJson(projectKey(projectId, 'types'), []),
    myListName: localStorage.getItem(projectKey(projectId, 'myListName')) || '',
    currentListId: localStorage.getItem(projectKey(projectId, 'currentListId')) || '',
    myLocation: localStorage.getItem(projectKey(projectId, 'myLocation')) || '',
  }
}

function saveProjectData(projectId, data) {
  writeJson(projectKey(projectId, 'assets'), data.assets || [])
  writeJson(projectKey(projectId, 'records'), data.records || [])
  writeJson(projectKey(projectId, 'myList'), data.myList || [])
  writeJson(projectKey(projectId, 'myPhotos'), data.myPhotos || {})
  writeJson(projectKey(projectId, 'locations'), data.locations || [])
  writeJson(projectKey(projectId, 'types'), data.types || [])
  localStorage.setItem(projectKey(projectId, 'myListName'), data.myListName || '')
  localStorage.setItem(projectKey(projectId, 'currentListId'), data.currentListId || '')
  localStorage.setItem(projectKey(projectId, 'myLocation'), data.myLocation || '')
}

// Make `name` unique among existing record names by bumping its trailing -NN index.
function uniqueName(name, records, exceptId) {
  const taken = new Set((records || []).filter((r) => r.id !== exceptId).map((r) => r.name))
  if (!taken.has(name)) return name
  const m = String(name).match(/^(.+?)-(\d+)$/)
  const base = m ? m[1] : name
  let n = m ? parseInt(m[2], 10) : 1
  let candidate
  do { n += 1; candidate = `${base}-${String(n).padStart(2, '0')}` } while (taken.has(candidate))
  return candidate
}

// Default My List name = today's date with the next free index (e.g. 2026-06-28-01).
function makeListName(records) {
  const today = new Date().toISOString().slice(0, 10)
  return uniqueName(`${today}-01`, records)
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function sameIdSet(a, b) {
  const x = a || []
  const y = b || []
  if (x.length !== y.length) return false
  const s = new Set(x)
  return y.every((id) => s.has(id))
}

// Application-form field sets (ported from the old manual page). Keys map to the
// HWPX/PDF export fields used in phase 2.
const REQUEST_FORMS = {
  takeout: {
    label: '반출 신청',
    placeKey: 'takeoutPlace',   // place comes from the location input above
    fields: [
      { k: 'applicantName', l: '신청자 이름', req: true },
      { k: 'applicantOrg', l: '소속', req: true },
      { k: 'takeoutPeriod', l: '반출 기간', ph: '2026.05.27.~2026.12.31', req: true },
      { k: 'takeoutReason', l: '반출 사유', area: true, req: true },
      { k: 'domesticOrInternational', l: '국외/국내 반출 여부', ph: 'O/X' },
    ],
  },
  return: {
    label: '반입 신청',
    placeKey: 'returnPlace',
    fields: [
      { k: 'applicantName', l: '신청자 이름', req: true },
      { k: 'applicantOrg', l: '소속', req: true },
      { k: 'returnDate', l: '반입 일자', req: true },
      { k: 'returnReason', l: '반입 사유', area: true, req: true },
    ],
  },
  extension: {
    label: '연장 신청',
    fields: [
      { k: 'applicantName', l: '신청자 이름', req: true },
      { k: 'applicantOrg', l: '소속', req: true },
      { k: 'extensionPeriod', l: '연장 기간', req: true },
      { k: 'extensionReason', l: '연장 사유', area: true, req: true },
    ],
  },
}

const REQUEST_TYPE_LABEL = { takeout: '반출신청', return: '반입신청', extension: '연장신청' }

function sanitizeFileName(value) {
  return String(value || '').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim() || 'asset-list'
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
}

// --- minimal ZIP reader for HWPX import (STORE + DEFLATE via DecompressionStream) ---
const z16 = (b, o) => b[o] | (b[o + 1] << 8)
const z32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('이 브라우저는 압축 해제를 지원하지 않습니다.')
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readZipEntry(bytes, targetName) {
  let eocd = -1
  for (let i = bytes.length - 22; i >= 0; i -= 1) { if (z32(bytes, i) === 0x06054b50) { eocd = i; break } }
  if (eocd < 0) throw new Error('올바른 HWPX(zip) 파일이 아닙니다.')
  const count = z16(bytes, eocd + 10)
  let off = z32(bytes, eocd + 16)
  for (let i = 0; i < count; i += 1) {
    if (z32(bytes, off) !== 0x02014b50) break
    const method = z16(bytes, off + 10)
    const csize = z32(bytes, off + 20)
    const nlen = z16(bytes, off + 28)
    const elen = z16(bytes, off + 30)
    const clen = z16(bytes, off + 32)
    const lo = z32(bytes, off + 42)
    const name = new TextDecoder().decode(bytes.slice(off + 46, off + 46 + nlen))
    if (name === targetName) {
      const lnlen = z16(bytes, lo + 26)
      const lelen = z16(bytes, lo + 28)
      const ds = lo + 30 + lnlen + lelen
      const data = bytes.slice(ds, ds + csize)
      return method === 0 ? data : inflateRaw(data)
    }
    off += 46 + nlen + elen + clen
  }
  throw new Error(`${targetName}를 찾을 수 없습니다.`)
}

// File → list of asset numbers. Supports .json (our payload) and .hwpx (zip).
async function importFileToNumbers(file) {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.json')) {
    const data = JSON.parse(await file.text())
    const rows = Array.isArray(data) ? data : (data.rows || data.assetIds || [])
    return rows.map((r) => (typeof r === 'string' ? r : (r.assetNumber || r.assetId || ''))).filter(Boolean)
  }
  if (lower.endsWith('.hwpx')) {
    const xml = new TextDecoder('utf-8').decode(await readZipEntry(new Uint8Array(await file.arrayBuffer()), 'Contents/section0.xml'))
    return [...new Set(xml.match(/[0-9]{5,}/g) || [])]
  }
  if (lower.endsWith('.pdf')) throw new Error('PDF는 불러올 수 없습니다 (출력 전용). HWPX/JSON을 사용하세요.')
  throw new Error('지원하지 않는 형식입니다 (HWPX/JSON).')
}

// Payload shape expected by the ported window.CensHwpx.build (from the old manual page).
function buildRequestPayload(type, fields, assets, photos, title) {
  return {
    version: 1,
    title: title || '자산 목록',
    savedAt: new Date().toISOString(),
    printSettings: { fontSize: 12, rowStart: 1, orientation: 'portrait', viewMode: 'wide', description: 'hide', photos: 'show' },
    request: { type, fields },
    rows: assets.map((a) => ({
      assetNumber: a.assetId,
      assetName: a.name || '',
      assetDescription: a.description || '',
      numberPhoto: (photos[a.assetId] && photos[a.assetId].sticker) || a.photo2 || '',
      wholePhoto: (photos[a.assetId] && photos[a.assetId].whole) || a.photo1 || '',
    })),
  }
}

async function exportRequestHwpx(type, fields, assets, photos, title) {
  if (!window.CensHwpx) throw new Error('HWPX 모듈을 불러오지 못했습니다. 새로고침하세요.')
  const payload = buildRequestPayload(type, fields, assets, photos, title)
  const blob = await window.CensHwpx.build(payload, REQUEST_TYPE_LABEL[type] || '')
  downloadBlob(blob, `${sanitizeFileName(title)}.hwpx`)
}

// PDF = print the list + filled form via a hidden iframe (no library, like the old page).
function exportRequestPdf(type, fields, assets, title) {
  const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const placeKey = REQUEST_FORMS[type].placeKey
  const fieldRows = REQUEST_FORMS[type].fields.map((f) => `<tr><th>${esc(f.l)}</th><td>${esc(fields[f.k] || '')}</td></tr>`).join('')
    + (placeKey ? `<tr><th>장소</th><td>${esc(fields[placeKey] || '')}</td></tr>` : '')
  const itemRows = assets.map((a, i) => `<tr><td>${i + 1}</td><td>${esc(a.assetId)}</td><td>${esc(a.name || '')}</td><td>${esc(a.location || '')}</td></tr>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font-family:'IBM Plex Sans','Apple SD Gothic Neo',sans-serif;color:#111;padding:24px;}
    h1{font-size:20px;margin:0 0 4px;} h2{font-size:14px;color:#555;margin:0 0 16px;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;}
    th,td{border:1px solid #999;padding:6px 8px;text-align:left;vertical-align:top;}
    .info th{width:140px;background:#f3f3f3;} .items th{background:#f3f3f3;}
  </style></head><body>
    <h1>${esc(title)}</h1><h2>${esc(REQUEST_TYPE_LABEL[type] || '')}</h2>
    <table class="info">${fieldRows}</table>
    <table class="items"><thead><tr><th>#</th><th>자산번호</th><th>자산명</th><th>위치</th></tr></thead><tbody>${itemRows}</tbody></table>
  </body></html>`
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open(); doc.write(html); doc.close()
  iframe.contentWindow.focus()
  setTimeout(() => { iframe.contentWindow.print(); setTimeout(() => iframe.remove(), 1000) }, 300)
}

function normalizeEmail(value) {
  const input = String(value || '').trim().toLowerCase()
  if (!input) return ''
  return input.includes('@') ? input : `${input}@${AUTH_ALLOWED_DOMAIN}`
}

function sortAssets(list, sort) {
  const dir = sort.dir === 'asc' ? 1 : -1
  const val = (a) => {
    if (sort.key === 'name') return String(a.name || '').toLowerCase()
    if (sort.key === 'lastUpdate') return a.lastUpdate || ''
    if (sort.key === 'request') return a.verifyRequested ? 0 : 1   // asc → requested first
    const n = Number(a.assetId)
    return Number.isFinite(n) ? n : a.assetId
  }
  return [...list].sort((a, b) => {
    const va = val(a)
    const vb = val(b)
    if (va < vb) return -dir
    if (va > vb) return dir
    return 0
  })
}

// Build a classification list (location or type) from its store + asset values,
// with live item counts. Field = 'location' | 'type'.
function buildClassList(field, store, assets) {
  const map = new Map()
  for (const l of store) if (l?.name) map.set(l.name, { ...l })
  for (const a of assets) { const v = a[field]; if (v && !map.has(v)) map.set(v, { name: v, photo: '' }) }
  const counts = {}
  for (const a of assets) { const v = a[field]; if (v) counts[v] = (counts[v] || 0) + 1 }
  return [...map.values()]
    .map((l) => ({ photo: '', createdBy: '', address: '', description: '', memo: '', lastUpdate: '', ...l, count: counts[l.name] || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function bumpClassDates(list, names, now) {
  const map = new Map(list.map((l) => [l.name, l]))
  for (const n of names) {
    const cur = map.get(n) || { name: n, photo: '', createdBy: '', address: '', description: '', memo: '' }
    map.set(n, { ...cur, lastUpdate: now })
  }
  return [...map.values()]
}

function matchesAsset(asset, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [asset.assetId, asset.name, asset.description, asset.location, asset.manufacturerProvider]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q))
}

function App() {
  const [authStatus, setAuthStatus] = useState(PORTAL_BASE ? 'ready' : 'loading')
  const [authUser, setAuthUser] = useState(PORTAL_BASE ? (portalUser() || { email: 'portal', name: 'portal' }) : null)
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authMessage, setAuthMessage] = useState('')
  const [projectState, setProjectState] = useState(() => ensureProjectState())
  const [tab, setTab] = useState('assets')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [assets, setAssets] = useState(() => loadProjectData(projectState.currentProjectId).assets)
  const [records, setRecords] = useState(() => loadProjectData(projectState.currentProjectId).records)
  const [myList, setMyList] = useState(() => loadProjectData(projectState.currentProjectId).myList)
  const [myPhotos, setMyPhotos] = useState(() => loadProjectData(projectState.currentProjectId).myPhotos)
  const [myListName, setMyListName] = useState(() => {
    const d = loadProjectData(projectState.currentProjectId)
    return d.myListName || makeListName(d.records)
  })
  const [currentListId, setCurrentListId] = useState(() => loadProjectData(projectState.currentProjectId).currentListId)
  const [locations, setLocations] = useState(() => loadProjectData(projectState.currentProjectId).locations)
  const [types, setTypes] = useState(() => loadProjectData(projectState.currentProjectId).types)
  const [myLocation, setMyLocation] = useState(() => loadProjectData(projectState.currentProjectId).myLocation)
  const [notice, setNotice] = useState('')
  const [scanning, setScanning] = useState(false)
  const [capture, setCapture] = useState(null)   // { kind:'asset', id } | { kind:'location', name }
  const [myListBadge, setMyListBadge] = useState(0)   // new My List adds while on another tab
  const [sort, setSort] = useState({ key: 'assetId', dir: 'asc' })
  const isMobile = useMediaQuery('(max-width: 760px)')

  // Remembered applicant name/org for request forms, per account.
  const profileKey = `cens.profile.${authUser?.email || 'local'}`
  const profile = useMemo(() => readJson(profileKey, {}), [profileKey])
  function saveProfile(name, org) {
    writeJson(profileKey, { name: name || '', org: org || '' })
  }
  function bumpBadge(n) {
    if (n > 0 && tab !== 'mylist') setMyListBadge((b) => b + n)
  }
  const pageRef = useRef(null)
  const scrollTimer = useRef(null)

  // Show the list scrollbar only while scrolling (auto-hide ~0.9s after it stops).
  function handlePageScroll() {
    const el = pageRef.current
    if (!el) return
    el.classList.add('is-scrolling')
    clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => el.classList.remove('is-scrolling'), 900)
  }

  useEffect(() => {
    loadFonts()
    for (const [key, value] of Object.entries(FONT_DEFAULTS)) {
      document.documentElement.style.setProperty(key, value)
    }
    applyPreset('teal')
    applyTheme()
    // White top/bottom bars; brand pink for focus/selection accents.
    const navTheme = {
      '--nav-bg': '#ffffff',
      '--nav-border': '#e7e9ee',
      '--nav-accent': '#f3f4f7',
      '--nav-text': '#1b2330',
      '--nav-text-muted': '#8a93a3',
      '--selection-bg': '#e7ecf3',
      '--border-focus': BRAND,
      '--brand': BRAND,
      // IBM Plex for text; D2Coding (loaded by the kit's loadFonts) for asset numbers.
      '--font-sans': "'IBM Plex Sans', 'IBM Plex Sans KR', ui-sans-serif, system-ui, sans-serif",
      '--font-mono': "'D2Coding', 'D2 coding', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    }
    for (const [key, value] of Object.entries(navTheme)) {
      document.documentElement.style.setProperty(key, value)
    }
  }, [])

  useEffect(() => {
    if (tab === 'mylist') setMyListBadge(0)
  }, [tab])

  // Browser tab title = the in-app list name (updates on rename).
  useEffect(() => {
    const cur = projectState.projects.find((p) => p.projectId === projectState.currentProjectId)
    const name = projectDisplayName(projectState.currentProjectId, cur?.name || '')
    if (name) document.title = name
  }, [projectState])

  // Backfill: on load under the portal, push the current list name so a name set
  // in-app before this sync existed still propagates to the portal's project list.
  useEffect(() => {
    if (PORTAL_BASE) pushPortalName(projectDisplayName(PORTAL_PROJECT, PORTAL_PROJECT))
  }, [])

  useEffect(() => {
    saveProjectData(projectState.currentProjectId, { assets, records, myList, myPhotos, locations, types, myListName, currentListId, myLocation })
    writeJson(STORAGE_KEYS.assets, assets)
    writeJson(STORAGE_KEYS.records, records)
    writeJson(STORAGE_KEYS.myList, myList)
  }, [assets, records, myList, myPhotos, locations, types, myListName, currentListId, myLocation, projectState.currentProjectId])

  useEffect(() => {
    if (PORTAL_BASE) return            // authenticated via the portal (SSO) — skip Firebase
    if (!window.firebase?.auth) {
      setAuthStatus('unavailable')
      setAuthMessage('Firebase Auth를 불러오지 못했습니다. 네트워크를 확인하거나 다시 새로고침하세요.')
      return
    }
    if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG)
    return window.firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        setAuthUser(null)
        setAuthStatus('signedOut')
        return
      }
      const email = String(user.email || '').toLowerCase()
      if (!email.endsWith(`@${AUTH_ALLOWED_DOMAIN}`)) {
        window.firebase.auth().signOut().catch(() => {})
        setAuthUser(null)
        setAuthStatus('signedOut')
        setAuthMessage(`Only @${AUTH_ALLOWED_DOMAIN} email accounts can use this app.`)
        return
      }
      setAuthUser({ email, name: user.displayName || email })
      setAuthForm((form) => ({ ...form, email }))
      setAuthStatus('ready')
      setAuthMessage('')
    })
  }, [])

  const filteredAssets = useMemo(() => {
    return sortAssets(assets.filter((asset) => matchesAsset(asset, query)), sort)
  }, [assets, query, sort])
  const isAdmin = isAdminUser(authUser)
  const myAssets = useMemo(() => {
    const list = myList.map((id) => assets.find((asset) => asset.assetId === id)).filter(Boolean)
    return sortAssets(list, sort)
  }, [assets, myList, sort])
  // Classification lists (location / type) merged with asset values + item counts.
  const locationList = useMemo(() => buildClassList('location', locations, assets), [locations, assets])
  const typeList = useMemo(() => buildClassList('type', types, assets), [types, assets])
  const locationPhoto = useMemo(() => {
    const m = {}
    for (const l of locations) if (l?.name && l.photo) m[l.name] = l.photo
    return (name) => m[name] || ''
  }, [locations])
  const locationCount = locationList.length
  const latestRecords = records.slice(0, 80)

  function show(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1800)
  }

  async function signIn(event) {
    event?.preventDefault?.()
    const email = normalizeEmail(authForm.email)
    if (!email.endsWith(`@${AUTH_ALLOWED_DOMAIN}`)) {
      setAuthMessage(`Enter an IBS ID or @${AUTH_ALLOWED_DOMAIN} email address.`)
      return
    }
    if (!authForm.password) {
      setAuthMessage('Enter your password.')
      return
    }
    setAuthStatus('loading')
    setAuthMessage('Signing in.')
    try {
      await window.firebase.auth().signInWithEmailAndPassword(email, authForm.password)
    } catch (error) {
      setAuthStatus('signedOut')
      setAuthMessage(`Sign-in failed: ${error?.message || error}`)
    }
  }

  async function signOut() {
    if (PORTAL_BASE) { window.location.assign('/projects'); return }   // back to the portal
    await window.firebase?.auth?.().signOut()
    setAuthStatus('signedOut')
  }

  async function sendPasswordReset() {
    const email = normalizeEmail(authForm.email)
    if (!email.endsWith(`@${AUTH_ALLOWED_DOMAIN}`)) {
      setAuthMessage(`Enter an IBS ID or @${AUTH_ALLOWED_DOMAIN} email address.`)
      return
    }
    try {
      await window.firebase.auth().sendPasswordResetEmail(email)
      setAuthMessage(`Password reset email sent to ${email}.`)
    } catch (error) {
      setAuthMessage(`Could not send password reset email: ${error?.message || error}`)
    }
  }

  async function signUp() {
    const email = normalizeEmail(authForm.email)
    if (!email.endsWith(`@${AUTH_ALLOWED_DOMAIN}`)) {
      setAuthMessage(`Enter an IBS ID or @${AUTH_ALLOWED_DOMAIN} email address.`)
      return
    }
    setAuthStatus('loading')
    setAuthMessage('Preparing sign-up email.')
    try {
      await window.firebase.auth().createUserWithEmailAndPassword(email, makeTemporaryPassword())
      await window.firebase.auth().sendPasswordResetEmail(email)
      await window.firebase.auth().signOut()
      setAuthStatus('signedOut')
      setAuthMessage(`Sign-up email sent to ${email}.`)
    } catch (error) {
      if (error?.code === 'auth/email-already-in-use') {
        await sendPasswordReset()
        setAuthStatus('signedOut')
        return
      }
      setAuthStatus('signedOut')
      setAuthMessage(`Sign-up failed: ${error?.message || error}`)
    }
  }

  function toggleMyList(assetId) {
    if (myList.includes(assetId)) {
      setMyList((list) => list.filter((id) => id !== assetId))
      setMyPhotos((photos) => {
        if (!photos[assetId]) return photos
        const next = { ...photos }
        delete next[assetId]
        return next
      })
    } else {
      setMyList((list) => [assetId, ...list])
      bumpBadge(1)
      show('My List에 추가했습니다.')
    }
  }

  function saveCapturedPhotos(assetId, shots) {
    setMyPhotos((photos) => ({ ...photos, [assetId]: { sticker: shots.sticker, whole: shots.whole } }))
    setCapture(null)
    show('사진을 My List 항목에 임시 저장했습니다.')
  }

  // --- Generic classification (location / type) helpers ---
  function upsertClass(setStore, name, patch) {
    if (!name) return
    setStore((list) => {
      const map = new Map(list.map((l) => [l.name, l]))
      const cur = map.get(name) || { name, photo: '', createdBy: authUser?.email || '', address: '', description: '', memo: '', lastUpdate: '' }
      map.set(name, { ...cur, ...patch })
      return [...map.values()]
    })
  }

  function setClassPhoto(setStore, name, photo) {
    upsertClass(setStore, name, { photo })
  }

  // Edit a class record's name + fields; renaming reassigns the asset field.
  function updateClass(field, setStore, oldName, patch) {
    const newName = String(patch.name ?? oldName).trim() || oldName
    setStore((list) => {
      const others = list.filter((l) => l.name !== oldName && l.name !== newName)
      const cur = list.find((l) => l.name === oldName) || { name: oldName, photo: '', createdBy: authUser?.email || '', address: '', description: '', memo: '', lastUpdate: '' }
      return [...others, { ...cur, ...patch, name: newName }]
    })
    if (newName !== oldName) {
      setAssets((items) => items.map((a) => (a[field] === oldName ? { ...a, [field]: newName } : a)))
      if (field === 'location' && myLocation === oldName) setMyLocation(newName)
    }
    show('정보를 저장했습니다.')
  }

  // Merge = rename into an (existing) target.
  function mergeClass(field, setStore, name) {
    const target = window.prompt(`'${name}'을(를) 어디로 병합할까요? (대상 이름)`, '')
    if (target && target.trim()) updateClass(field, setStore, name, { name: target.trim() })
  }

  function deleteClass(field, setStore, name) {
    if (!window.confirm(`'${name}'을(를) 제거할까요? 해당 자산의 값이 비워집니다.`)) return
    setAssets((items) => items.map((a) => (a[field] === name ? { ...a, [field]: '' } : a)))
    setStore((list) => list.filter((l) => l.name !== name))
    if (field === 'location' && myLocation === name) setMyLocation('')
    show('제거했습니다.')
  }

  function addClassToMyList(field, name) {
    const ids = assets.filter((a) => a[field] === name).map((a) => a.assetId)
    const added = ids.filter((id) => !myList.includes(id))
    setMyList((list) => {
      const set = new Set(list)
      return [...list, ...ids.filter((id) => !set.has(id))]
    })
    bumpBadge(added.length)
    show(`${name}: ${ids.length}개를 My List에 추가했습니다.`)
  }

  function onCaptureDone(shots) {
    if (!capture) return
    if (capture.kind === 'location') {
      setClassPhoto(setLocations, capture.name, shots.photo); setCapture(null); show('위치 사진을 저장했습니다.')
    } else if (capture.kind === 'type') {
      setClassPhoto(setTypes, capture.name, shots.photo); setCapture(null); show('타입 사진을 저장했습니다.')
    } else if (capture.kind === 'slot') {
      updateAsset(capture.id, { [capture.slot]: shots.photo }); setCapture(null)
    } else {
      saveCapturedPhotos(capture.id, shots)
    }
  }

  // My List location input creates a location record on demand.
  function addLocation(name) {
    const n = String(name || '').trim()
    if (n) upsertClass(setLocations, n, {})
  }

  function editProjectName() {
    const next = window.prompt('목록 이름', projectName)
    if (next !== null) renameProject(next)
  }

  function recordAction(type, assetIds = myList) {
    if (!assetIds.length) {
      show('먼저 자산을 My List에 추가하세요.')
      return
    }
    const now = new Date().toISOString()
    const entry = {
      id: newId(),
      name: uniqueName(myListName || makeListName(records), records),
      type,
      assetIds,                         // store asset numbers only — reloadable from History
      user: authUser?.email || '',
      createdAt: now,
    }
    // Update / Check-in / Check-out / Extension all assign the items to the
    // currently selected location (위치 입력칸). Plain Save (saveList) does not.
    const targetLoc = String(myLocation || '').trim()
    setRecords((items) => [entry, ...items])
    setAssets((items) => items.map((asset) => {
      if (!assetIds.includes(asset.assetId)) return asset
      // Commit any pending My List photos onto the asset (sticker→photo2, whole→photo1).
      const shots = myPhotos[asset.assetId]
      const photoPatch = shots ? { photo1: shots.whole || asset.photo1, photo2: shots.sticker || asset.photo2 } : {}
      const base = { ...asset, ...photoPatch, lastUpdate: now, user: authUser?.email || '', ...(targetLoc ? { location: targetLoc } : {}) }
      if (type === 'update') return { ...base, verifyRequested: false, lastVerifiedDate: now, lastVerifiedBy: authUser?.email || '' }
      return { ...base, lastInOutDate: now }
    }))
    touchClasses(assetIds, now)
    // Ensure the target location record exists and bump its last-update.
    if (targetLoc) upsertClass(setLocations, targetLoc, { lastUpdate: now })
    // Clear the committed pending photos.
    setMyPhotos((photos) => {
      const next = { ...photos }
      let changed = false
      for (const id of assetIds) if (next[id]) { delete next[id]; changed = true }
      return changed ? next : photos
    })
    show(`${typeLabel(type)} 기록을 저장했습니다.`)
  }

  // Bump last-update on the affected assets' location AND type records.
  function touchClasses(assetIds, now) {
    const affected = assets.filter((a) => assetIds.includes(a.assetId))
    const locNames = [...new Set(affected.map((a) => a.location).filter(Boolean))]
    const typeNames = [...new Set(affected.map((a) => a.type).filter(Boolean))]
    if (locNames.length) setLocations((list) => bumpClassDates(list, locNames, now))
    if (typeNames.length) setTypes((list) => bumpClassDates(list, typeNames, now))
  }

  // Save = snapshot the current My List to History (asset numbers + name) so it can
  // be reloaded later to keep working. Updates the loaded entry in place if any.
  function saveList() {
    if (!myList.length) {
      show('먼저 자산을 My List에 추가하세요.')
      return
    }
    const now = new Date().toISOString()
    // Don't save a duplicate: same set of assets already saved today.
    const today = now.slice(0, 10)
    if (!currentListId && records.some((r) => String(r.createdAt).slice(0, 10) === today && sameIdSet(r.assetIds, myList))) {
      show('동일한 목록이 오늘 이미 저장되어 있습니다.')
      return
    }
    // Unique name so History never shows duplicates (bumps the trailing index).
    const name = uniqueName(myListName || makeListName(records), records, currentListId)
    if (currentListId && records.some((r) => r.id === currentListId)) {
      setRecords((items) => items.map((r) => (r.id === currentListId ? { ...r, name, assetIds: myList, updatedAt: now } : r)))
    } else {
      const id = newId()
      setRecords((items) => [{ id, name, type: 'save', assetIds: myList, user: authUser?.email || '', createdAt: now, updatedAt: now }, ...items])
      setCurrentListId(id)
    }
    if (name !== myListName) setMyListName(name)
    show('목록을 저장했습니다.')
  }

  // Request verification: flag the assets so they float to the top of Assets
  // (amber name) until a Verify clears them; also log it to History.
  function requestVerification(ids = myList) {
    if (!ids.length) {
      show('먼저 자산을 My List에 추가하세요.')
      return
    }
    const set = new Set(ids)
    const who = String(authUser?.email || '').split('@')[0] || authUser?.email || 'unknown'
    const reqLoc = `verification request by ${who}`
    const now = new Date().toISOString()
    setAssets((items) => items.map((a) => (set.has(a.assetId) ? { ...a, verifyRequested: true, location: reqLoc, user: authUser?.email || '', lastUpdate: now } : a)))
    setRecords((items) => [{ id: newId(), name: uniqueName(myListName || makeListName(records), records), type: 'request', assetIds: ids, user: authUser?.email || '', createdAt: now }, ...items])
    show('확인 요청을 등록했습니다.')
  }

  function deleteRecord(id) {
    if (!window.confirm('이 기록을 삭제할까요?')) return
    setRecords((items) => items.filter((r) => r.id !== id))
    show('기록을 삭제했습니다.')
  }

  // Import a HWPX/JSON file → add its (existing) asset numbers to My List.
  async function importToMyList(file) {
    try {
      const numbers = await importFileToNumbers(file)
      const existing = new Set(assets.map((a) => a.assetId))
      const matched = numbers.filter((n) => existing.has(n))
      setMyList((list) => {
        const set = new Set(list)
        return [...list, ...matched.filter((n) => !set.has(n))]
      })
      show(matched.length ? `${matched.length}개 자산을 My List에 추가했습니다.` : '추가할 자산을 찾지 못했습니다.')
    } catch (e) {
      show(`불러오기 실패: ${e.message || e}`)
    }
  }

  // Multiple QR codes (from gallery images) → add all matched assets to My List.
  function onScanMany(texts) {
    setScanning(false)
    const numbers = [...new Set(texts.map(extractAssetNumber).filter(Boolean))]
    const existing = new Set(assets.map((a) => a.assetId))
    const matched = numbers.filter((n) => existing.has(n))
    const added = matched.filter((n) => !myList.includes(n))
    setMyList((list) => {
      const set = new Set(list)
      return [...list, ...matched.filter((n) => !set.has(n))]
    })
    bumpBadge(added.length)
    show(`QR ${matched.length}개 자산을 My List에 추가했습니다.`)
  }

  // History "+": merge a saved list's assets INTO My List (keep existing items).
  function addListToMyList(record) {
    const ids = Array.isArray(record.assetIds) ? record.assetIds : []
    const added = ids.filter((id) => !myList.includes(id))
    setMyList((list) => {
      const set = new Set(list)
      return [...list, ...ids.filter((id) => !set.has(id))]
    })
    bumpBadge(added.length)
    show(`${ids.length}개를 My List에 추가했습니다.`)
  }

  // History "−": remove a saved list's assets from My List in one go.
  function removeListFromMyList(record) {
    const ids = new Set(Array.isArray(record.assetIds) ? record.assetIds : [])
    setMyList((list) => list.filter((id) => !ids.has(id)))
    setMyPhotos((photos) => {
      const next = { ...photos }
      let changed = false
      for (const id of ids) if (next[id]) { delete next[id]; changed = true }
      return changed ? next : photos
    })
    show(`${ids.size}개를 My List에서 제거했습니다.`)
  }

  function clearMyList() {
    if (!myList.length) return
    if (!window.confirm('My List를 모두 비울까요?')) return
    setMyList([])
    setMyPhotos({})
    show('My List를 비웠습니다.')
  }

  function onScanResult(text) {
    setScanning(false)
    const number = extractAssetNumber(text)
    if (!number) return
    const match = assets.find((asset) => asset.assetId === number)
    setQuery(number)
    setTab('assets')
    if (match) {
      setExpandedId(match.assetId)
      show(`${match.assetId} 자산을 찾았습니다.`)
    } else {
      show(`스캔한 번호(${number})와 일치하는 자산이 없습니다.`)
    }
  }

  function updateAsset(assetId, patch) {
    const now = new Date().toISOString()
    setAssets((items) => items.map((asset) => (asset.assetId === assetId ? { ...asset, ...patch, lastUpdate: now } : asset)))
    touchClasses([assetId], now)
    show('자산 정보를 저장했습니다.')
  }

  function renameProject(rawName) {
    const name = String(rawName || '').trim()
    if (!name) return
    const id = projectState.currentProjectId
    localStorage.setItem(projectKey(id, 'name'), name)
    const projects = projectState.projects.map((project) => (project.projectId === id ? { ...project, name } : project))
    if (!PORTAL_BASE) writeJson(STORAGE_KEYS.projects, projects)
    setProjectState((current) => ({ ...current, projects }))
    // Under the portal, push the new name so the portal's project list matches.
    pushPortalName(name)
    show('리스트 이름을 변경했습니다.')
  }

  function switchProject(projectId) {
    if (!projectState.projects.some((project) => project.projectId === projectId)) return
    saveProjectData(projectState.currentProjectId, { assets, records, myList, myPhotos, locations, types, myListName, currentListId, myLocation })
    localStorage.setItem(STORAGE_KEYS.currentProjectId, projectId)
    const next = loadProjectData(projectId)
    setProjectState((current) => ({ ...current, currentProjectId: projectId }))
    setAssets(next.assets)
    setRecords(next.records)
    setMyList(next.myList)
    setMyPhotos(next.myPhotos)
    setLocations(next.locations)
    setTypes(next.types)
    setMyListName(next.myListName || makeListName(next.records))
    setCurrentListId(next.currentListId)
    setMyLocation(next.myLocation)
    setExpandedId('')
    setQuery('')
  }

  function createProject() {
    const name = window.prompt('List 이름')
    if (!name || !name.trim()) return
    saveProjectData(projectState.currentProjectId, { assets, records, myList, myPhotos, locations, types, myListName, currentListId, myLocation })
    const now = new Date().toISOString()
    const project = { projectId: `LIST-${Date.now().toString(36)}`, name: name.trim(), createdAt: now, updatedAt: now }
    const projects = [...projectState.projects, project]
    writeJson(STORAGE_KEYS.projects, projects)
    localStorage.setItem(STORAGE_KEYS.currentProjectId, project.projectId)
    saveProjectData(project.projectId, { assets: [], records: [], myList: [], myPhotos: {}, locations: [], types: [], myListName: '', currentListId: '', myLocation: '' })
    setProjectState({ projects, currentProjectId: project.projectId })
    setAssets([])
    setRecords([])
    setMyList([])
    setMyPhotos({})
    setLocations([])
    setTypes([])
    setMyListName(makeListName([]))
    setCurrentListId('')
    setMyLocation('')
    setExpandedId('')
    setQuery('')
    setAuthMessage('List created.')
  }

  if (authStatus !== 'ready') {
    return (
      <LoginScreen
        status={authStatus}
        message={authMessage}
        form={authForm}
        setForm={setAuthForm}
        projects={projectState.projects}
        currentProjectId={projectState.currentProjectId}
        onProjectChange={switchProject}
        onCreateProject={createProject}
        onSubmit={signIn}
        onSignUp={signUp}
        onReset={sendPasswordReset}
      />
    )
  }

  const currentProject = projectState.projects.find((project) => project.projectId === projectState.currentProjectId)
  const projectName = projectDisplayName(projectState.currentProjectId, currentProject?.name || '')
  const tabIconSize = isMobile ? 25 : 16
  const logoutIconSize = isMobile ? 23 : 16

  const myListSet = useMemo(() => new Set(myList), [myList])

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          <Cube size={isMobile ? 24 : 20} weight="fill" color={BRAND} />
          {projectName && <span className="topbar-project">{projectName}</span>}
        </div>
        <div className="topbar-right">
          {notice && <Badge tone="success">{notice}</Badge>}
          {isAdmin && (
            <button type="button" className="topbar-logout" title="목록 이름 편집" onClick={editProjectName}>
              <PencilSimple size={logoutIconSize} weight="fill" color={BRAND} />
            </button>
          )}
          <button type="button" className="topbar-logout" title="로그아웃" onClick={signOut}>
            <SignOut size={logoutIconSize} weight="fill" color={BRAND} />
          </button>
        </div>
      </header>
      <main className="page" ref={pageRef} onScroll={handlePageScroll}>
        {tab === 'assets' && (
          <AssetListPage
            query={query}
            setQuery={setQuery}
            assets={filteredAssets}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            myListSet={myListSet}
            myPhotos={myPhotos}
            toggleMyList={toggleMyList}
            onCapture={(id) => setCapture({ kind: 'asset', id })}
            onCaptureSlot={(id, slot) => setCapture({ kind: 'slot', id, slot })}
            recordAction={recordAction}
            updateAsset={updateAsset}
            locationPhoto={locationPhoto}
            records={latestRecords}
            sort={sort}
            setSort={setSort}
            counts={{ assets: assets.length, locations: locationCount, myList: myList.length, records: records.length }}
          />
        )}
        {tab === 'mylist' && (
          <MyListPage
            assets={myAssets}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            myPhotos={myPhotos}
            toggleMyList={toggleMyList}
            onCapture={(id) => setCapture({ kind: 'asset', id })}
            onCaptureSlot={(id, slot) => setCapture({ kind: 'slot', id, slot })}
            recordAction={recordAction}
            updateAsset={updateAsset}
            locationPhoto={locationPhoto}
            records={latestRecords}
            listName={myListName}
            setListName={setMyListName}
            onSave={saveList}
            onClear={clearMyList}
            onRequest={requestVerification}
            onImport={importToMyList}
            profile={profile}
            onSaveProfile={saveProfile}
            notify={show}
            locationList={locationList}
            myLocation={myLocation}
            setMyLocation={setMyLocation}
            addLocation={addLocation}
            onLocationPhoto={(name) => name && setCapture({ kind: 'location', name })}
            sort={sort}
            setSort={setSort}
          />
        )}
        {tab === 'history' && <RecordsPage records={latestRecords} assets={assets} myListSet={myListSet} toggleMyList={toggleMyList} onAdd={addListToMyList} onRemove={removeListFromMyList} isAdmin={isAdmin} onDelete={deleteRecord} />}
        {tab === 'classification' && (
          <ClassificationPage
            assets={assets}
            myListSet={myListSet}
            isAdmin={isAdmin}
            toggleMyList={toggleMyList}
            locationList={locationList}
            typeList={typeList}
            onUpdateLocation={(o, p) => updateClass('location', setLocations, o, p)}
            onMergeLocation={(n) => mergeClass('location', setLocations, n)}
            onDeleteLocation={(n) => deleteClass('location', setLocations, n)}
            onAddAllLocation={(n) => addClassToMyList('location', n)}
            onPhotoLocation={(n) => setCapture({ kind: 'location', name: n })}
            onUpdateType={(o, p) => updateClass('type', setTypes, o, p)}
            onMergeType={(n) => mergeClass('type', setTypes, n)}
            onDeleteType={(n) => deleteClass('type', setTypes, n)}
            onAddAllType={(n) => addClassToMyList('type', n)}
            onPhotoType={(n) => setCapture({ kind: 'type', name: n })}
          />
        )}
      </main>
      <nav className="tabbar">
        {tabs.map((item) =>
          item.fab ? (
            <button key={item.id} type="button" className="tabbar-fab" title={item.label} onClick={() => setScanning(true)}>
              <item.Glyph size={28} weight="fill" color="#ffffff" />
            </button>
          ) : (
            <button
              key={item.id}
              type="button"
              className={`tabbar-tab${tab === item.id ? ' is-active' : ''}`}
              onClick={() => setTab(item.id)}
              title={item.label}
            >
              <span className="tabbar-glyph">
                <item.Glyph size={tabIconSize} weight="fill" color={tab === item.id ? BRAND : '#9aa3b2'} />
                {item.id === 'mylist' && myListBadge > 0 && <span className="tab-badge">{myListBadge}</span>}
              </span>
              <span className="tabbar-label">{item.label}</span>
            </button>
          ),
        )}
      </nav>
      {scanning && <ScannerModal onResult={onScanResult} onResultMany={onScanMany} onClose={() => setScanning(false)} />}
      {capture && (
        <PhotoCaptureModal
          title={
            capture.kind === 'location' ? `위치 사진 · ${capture.name}`
              : capture.kind === 'type' ? `타입 사진 · ${capture.name}`
                : capture.kind === 'slot' ? `사진 다시 찍기 · ${capture.id}`
                  : `사진 촬영 · ${capture.id}`
          }
          steps={
            capture.kind === 'asset' ? ASSET_STEPS
              : capture.kind === 'slot'
                ? [{ key: 'photo', guide: capture.slot === 'photo2' ? '자산 스티커(자산번호)가 잘 보이도록 찍으세요.' : '자산 전체가 잘 보이도록 찍으세요.', label: '촬영' }]
                : LOCATION_STEPS
          }
          onDone={onCaptureDone}
          onClose={() => setCapture(null)}
        />
      )}
    </div>
  )
}

function ScannerModal({ onResult, onResultMany, onClose }) {
  const scannerRef = useRef(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const galleryRef = useRef(null)

  useEffect(() => {
    const Lib = window.Html5Qrcode
    if (!Lib) {
      setError('QR 스캐너 라이브러리를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.')
      return
    }
    const scanner = new Lib('qr-reader')
    scannerRef.current = scanner
    let stopped = false
    const stop = () => {
      if (stopped) return
      stopped = true
      return scanner.stop().catch(() => {})
    }
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => { stop(); onResult(decodedText) },
      )
      .catch((err) => setError(`카메라를 시작할 수 없습니다: ${err?.message || err}`))
    return () => { stop() }
  }, [])

  // Gallery: decode QR from one or more selected images, return all matches.
  async function onGallery(event) {
    const files = [...(event.target.files || [])]
    event.target.value = ''
    if (!files.length) return
    const Lib = window.Html5Qrcode
    if (!Lib) { setError('QR 라이브러리를 불러오지 못했습니다.'); return }
    setBusy(true)
    try {
      await scannerRef.current?.stop().catch(() => {})
    } catch { /* not running */ }
    const fileScanner = new Lib('qr-file-reader')
    const texts = []
    for (const f of files) {
      try { const t = await fileScanner.scanFile(f, false); if (t) texts.push(t) } catch { /* no QR in image */ }
    }
    setBusy(false)
    onResultMany(texts)
  }

  return (
    <div className="scanner-backdrop" onClick={onClose}>
      <section className="scanner-modal" onClick={(event) => event.stopPropagation()}>
        <header className="scanner-header">
          <h2>QR 코드 스캔</h2>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </header>
        <div id="qr-reader" className="qr-reader" />
        <div id="qr-file-reader" style={{ display: 'none' }} />
        <div className="action-row">
          <button type="button" className="amber-btn" disabled={busy} onClick={() => galleryRef.current?.click()}>
            <Images size={16} weight="fill" /> {busy ? '인식 중…' : '사진첩에서 여러 장'}
          </button>
          <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={onGallery} />
        </div>
        {error
          ? <p className="muted scanner-hint">{error}</p>
          : <p className="muted scanner-hint">카메라 접근을 허용하세요. 사진첩 버튼으로 여러 QR을 한 번에 인식할 수 있습니다.</p>}
      </section>
    </div>
  )
}

// Capture step configs. ASSET = two guided shots; LOCATION = one shot.
const ASSET_STEPS = [
  { key: 'sticker', guide: '① 자산 스티커(자산번호)가 잘 보이도록 찍으세요.', label: '스티커 촬영' },
  { key: 'whole', guide: '② 자산 전체가 잘 보이도록 찍으세요.', label: '자산 촬영' },
]
const LOCATION_STEPS = [
  { key: 'photo', guide: '위치(공간)가 잘 보이도록 찍으세요.', label: '위치 촬영' },
]

// Step-driven camera capture. Returns onDone(shots) keyed by each step's key.
function PhotoCaptureModal({ title, steps, onDone, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const galleryRef = useRef(null)
  const [step, setStep] = useState(0)
  const shotsRef = useRef({})
  const [error, setError] = useState('')

  // Pick up to steps.length images from the gallery, mapped to each step's key.
  async function onGallery(event) {
    const files = [...(event.target.files || [])].slice(0, steps.length)
    event.target.value = ''
    if (!files.length) return
    streamRef.current?.getTracks().forEach((t) => t.stop())
    const shots = {}
    for (let i = 0; i < files.length; i += 1) shots[steps[i].key] = await fileToDataUrl(files[i])
    onDone(shots)
  }

  useEffect(() => {
    let cancelled = false
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : null
    if (!md?.getUserMedia) {
      setError('이 브라우저/연결에서는 카메라를 쓸 수 없습니다. (HTTPS 또는 localhost 필요)')
      return
    }
    md.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}) }
      })
      .catch((err) => setError(`카메라를 시작할 수 없습니다: ${err?.message || err}`))
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()) }
  }, [])

  function snap() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return ''
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.7)
  }

  function capture() {
    shotsRef.current[steps[step].key] = snap()
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      onDone({ ...shotsRef.current })
    }
  }

  const last = step === steps.length - 1
  const progress = steps.length > 1 ? ` (${step + 1}/${steps.length})` : ''

  return (
    <div className="scanner-backdrop" onClick={onClose}>
      <section className="scanner-modal" onClick={(event) => event.stopPropagation()}>
        <header className="scanner-header">
          <h2>{title}</h2>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </header>
        {error ? (
          <p className="muted scanner-hint">{error}</p>
        ) : (
          <>
            <video ref={videoRef} className="qr-reader capture-video" playsInline muted />
            <p className="capture-guide">{steps[step].guide}</p>
            <div className="action-row">
              <Button variant="primary" onClick={capture}>
                <CameraPlus size={16} weight="fill" /> {steps[step].label}{last ? ' · 완료' : ''}{progress}
              </Button>
              <button type="button" className="amber-btn" onClick={() => galleryRef.current?.click()}>
                <Images size={16} weight="fill" /> 사진첩{steps.length > 1 ? ` (최대 ${steps.length}장)` : ''}
              </button>
              <input ref={galleryRef} type="file" accept="image/*" multiple={steps.length > 1} hidden onChange={onGallery} />
            </div>
          </>
        )}
        {error && (
          <div className="action-row">
            <button type="button" className="amber-btn" onClick={() => galleryRef.current?.click()}>
              <Images size={16} weight="fill" /> 사진첩{steps.length > 1 ? ` (최대 ${steps.length}장)` : ''}
            </button>
            <input ref={galleryRef} type="file" accept="image/*" multiple={steps.length > 1} hidden onChange={onGallery} />
          </div>
        )}
      </section>
    </div>
  )
}

function LoginScreen({ status, message, form, setForm, projects, currentProjectId, onProjectChange, onCreateProject, onSubmit, onSignUp, onReset }) {
  const disabled = status === 'loading' || status === 'unavailable'
  return (
    <main className="login-page">
      <section className="login-shell">
        <Card style={{ width: '100%', maxWidth: 520 }}>
          <form className="login-form" onSubmit={onSubmit}>
            <h1>Asset manager</h1>
            {message && <p className="login-message">{message}</p>}
            <label>
              List
              <select className="login-select" value={currentProjectId} onChange={(event) => onProjectChange(event.target.value)}>
                {projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>{project.name}</option>
                ))}
              </select>
            </label>
            <Button size="md" style={loginNewListButtonStyle} variant="success" disabled={status === 'loading'} type="button" onClick={onCreateProject}>New list</Button>
            <label>
              IBS ID
              <Input
                size="md"
                value={form.email}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                inputMode="email"
                placeholder="name"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label>
              Password
              <Input
                size="md"
                type="password"
                value={form.password}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                placeholder="password"
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
            <Button size="md" style={loginButtonStyle} disabled={disabled} type="submit">Sign in</Button>
            <Button size="md" style={loginButtonStyle} variant="secondary" disabled={disabled} type="button" onClick={onSignUp}>Sign up</Button>
            <Button size="md" style={loginButtonStyle} variant="ghost" disabled={disabled} type="button" onClick={onReset}>Reset password</Button>
          </form>
        </Card>
      </section>
    </main>
  )
}

function SortBar({ sort, setSort }) {
  const opts = [{ k: 'assetId', l: '번호' }, { k: 'name', l: '이름' }, { k: 'lastUpdate', l: '수정일' }, { k: 'request', l: '요청' }]
  return (
    <div className="sort-bar">
      <span className="sort-label">정렬</span>
      {opts.map((o) => {
        const active = sort.key === o.k
        return (
          <button
            key={o.k}
            type="button"
            className={`sort-btn${active ? ' is-active' : ''}`}
            onClick={() => setSort(active ? { key: o.k, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key: o.k, dir: 'asc' })}
          >
            {o.l}{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
        )
      })}
    </div>
  )
}

function AssetListPage({ query, setQuery, assets, expandedId, setExpandedId, myListSet, myPhotos, toggleMyList, onCapture, onCaptureSlot, recordAction, updateAsset, locationPhoto, records, sort, setSort, counts }) {
  return (
    <div className="stack">
      <Card title="Find asset">
        <div className="search-box">
          <MagnifyingGlass size={18} weight="fill" color={BRAND} />
          <Input size="md" value={query} placeholder="asset number, name, location" onChange={(event) => setQuery(event.target.value)} autoFocus />
        </div>
      </Card>
      <div className="list-toolbar">
        <span className="list-count">총 {assets.length}개</span>
        <SortBar sort={sort} setSort={setSort} />
      </div>
      <div className="result-list result-list-full">
        {assets.length === 0 && <Card><p className="muted">일치하는 자산이 없습니다.</p></Card>}
        {assets.map((asset) => (
          <AssetRow
            key={asset.assetId}
            asset={asset}
            expanded={expandedId === asset.assetId}
            onToggle={() => setExpandedId(expandedId === asset.assetId ? '' : asset.assetId)}
            inMyList={myListSet.has(asset.assetId)}
            shots={myPhotos[asset.assetId]}
            onToggleMyList={() => toggleMyList(asset.assetId)}
            onCapture={() => onCapture(asset.assetId)}
            onCaptureSlot={onCaptureSlot}
            recordAction={recordAction}
            updateAsset={updateAsset}
            locationPhoto={locationPhoto}
            records={records}
          />
        ))}
      </div>
      <div className="metric-grid">
        <Metric label="Assets" value={counts.assets} />
        <Metric label="Locations" value={counts.locations} />
        <Metric label="My List" value={counts.myList} />
        <Metric label="Records" value={counts.records} />
      </div>
    </div>
  )
}

const EDIT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'location', label: 'Location' },
  { key: 'type', label: 'Type' },
  { key: 'accountHolder', label: 'Account holder' },
  { key: 'applicationName', label: 'Application name (반출·반입·연장용)' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'description', label: 'Description', textarea: true },
  { key: 'memo', label: 'Memo', textarea: true },
  { key: 'manufacturerProvider', label: 'Manufacturer' },
  { key: 'acquisitionDate', label: 'Acquired' },
  { key: 'acquisitionPriceKrw', label: 'Price' },
]

function AssetThumb({ asset, inMyList, shots, onCapture }) {
  // In My List → a camera-plus button to (re)take the two guided photos.
  if (inMyList) {
    return (
      <button type="button" className={`asset-thumb is-photo${shots ? ' has-shot' : ''}`} title="사진 촬영" onClick={(e) => { e.stopPropagation(); onCapture() }}>
        {shots?.sticker ? <img src={shots.sticker} alt="" /> : <CameraPlus size={22} weight="fill" color={PHOTO_COLOR} />}
      </button>
    )
  }
  return (
    <div className="asset-thumb">
      {asset.photo1 ? <img src={asset.photo1} alt="" /> : <Images size={20} weight="fill" color="#c2c8d2" />}
    </div>
  )
}

function PhotoSlot({ src, label }) {
  return (
    <div className="photo-slot">
      <div className="photo-box">
        {src ? <img src={src} alt={label} /> : <Images size={28} weight="fill" color="#c2c8d2" />}
      </div>
      <span className="photo-label">{label}</span>
    </div>
  )
}

function AssetRow({ asset, expanded, onToggle, inMyList, shots, onToggleMyList, onCapture, onCaptureSlot, recordAction, updateAsset, locationPhoto, records }) {
  const [editing, setEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [form, setForm] = useState(asset)
  // Per-asset history is derived from the shared records — never stored twice.
  const history = useMemo(
    () => (records || []).filter((r) => (r.assetIds || []).includes(asset.assetId)),
    [records, asset.assetId],
  )

  // Reset edit/history state whenever the row collapses or the underlying asset changes.
  useEffect(() => {
    setForm(asset)
    if (!expanded) { setEditing(false); setShowHistory(false) }
  }, [asset, expanded])

  function save() {
    const patch = {}
    EDIT_FIELDS.forEach((f) => { patch[f.key] = form[f.key] || '' })
    updateAsset(asset.assetId, patch)
    setEditing(false)
  }

  return (
    <div className={`asset-row${expanded ? ' is-open' : ''}`}>
      <div className="asset-row-head" role="button" tabIndex={0} onClick={onToggle}>
        <AssetThumb asset={asset} inMyList={inMyList} shots={shots} onCapture={onCapture} />
        <div className="asset-row-main">
          <span className="mono">{asset.assetId}</span>
          <strong className={asset.verifyRequested ? 'is-requested' : ''}>{asset.name || 'Unnamed asset'}</strong>
          <span className="asset-row-caret"><CaretDown size={15} weight="bold" /></span>
        </div>
        <button
          type="button"
          className={`asset-circle${inMyList ? ' is-on' : ''}`}
          title={inMyList ? 'My List에서 제거' : 'My List에 추가'}
          onClick={(e) => { e.stopPropagation(); onToggleMyList() }}
        >
          {inMyList ? <Minus size={15} weight="bold" color="#ffffff" /> : <Plus size={15} weight="bold" color="#ffffff" />}
        </button>
      </div>
      {expanded && (
        <div className="asset-row-body">
          {editing ? (
            <div className="asset-edit">
              <div className="photo-row">
                {[{ slot: 'photo2', label: '자산 스티커' }, { slot: 'photo1', label: '자산 전체' }].map((p) => (
                  <div className="photo-slot" key={p.slot}>
                    <div className="photo-box">
                      {asset[p.slot] ? <img src={asset[p.slot]} alt={p.label} /> : <Images size={28} weight="fill" color="#c2c8d2" />}
                    </div>
                    <span className="photo-label">{p.label}</span>
                    <div className="slot-actions">
                      <button type="button" className="slot-btn" onClick={() => onCaptureSlot(asset.assetId, p.slot)}>다시 찍기</button>
                      <button type="button" className="slot-btn slot-del" disabled={!asset[p.slot]} onClick={() => updateAsset(asset.assetId, { [p.slot]: '' })}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>
              {EDIT_FIELDS.map((field) => (
                <label key={field.key}>
                  {field.label}
                  {field.textarea ? (
                    <textarea
                      className="edit-textarea"
                      value={form[field.key] || ''}
                      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  ) : (
                    <Input size="md" value={form[field.key] || ''} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} />
                  )}
                </label>
              ))}
              <div className="action-row">
                <button type="button" className="amber-btn" onClick={save}>Save</button>
                <Button variant="secondary" size="md" style={ACTION_BTN} onClick={() => { setForm(asset); setEditing(false) }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="detail-body">
              <div className="photo-row">
                <PhotoSlot src={shots?.sticker || asset.photo2} label="자산 스티커" />
                <PhotoSlot src={shots?.whole || asset.photo1} label="자산 전체" />
                <PhotoSlot src={locationPhoto ? locationPhoto(asset.location) : ''} label="위치" />
              </div>
              <h3 className="asset-full-name">{asset.name || 'Unnamed asset'}</h3>
              <p>{asset.description || 'No description'}</p>
              <dl className="kv">
                <dt>Location</dt>
                <dd>{asset.location || '-'}</dd>
                <dt>Type</dt>
                <dd>{asset.type || '-'}</dd>
                <dt>Account holder</dt>
                <dd>{asset.accountHolder || '-'}</dd>
                <dt>Application</dt>
                <dd>{asset.applicationName || '-'}</dd>
                <dt>Weight</dt>
                <dd>{asset.weight ? `${asset.weight} kg` : '-'}</dd>
                {asset.memo && <><dt>Memo</dt><dd>{asset.memo}</dd></>}
                <dt>Manufacturer</dt>
                <dd>{asset.manufacturerProvider || '-'}</dd>
                <dt>Acquired</dt>
                <dd>{asset.acquisitionDate || '-'}</dd>
                <dt>User (위치변경)</dt>
                <dd>{asset.user ? String(asset.user).split('@')[0] : '-'}</dd>
                <dt>Last update</dt>
                <dd>{formatDate(asset.lastUpdate) || '-'}</dd>
              </dl>
              <div className="action-row">
                <button type="button" className="amber-btn" onClick={() => setEditing(true)}><PencilSimple size={18} weight="fill" /> Edit</button>
                <button type="button" className="amber-btn" onClick={() => setShowHistory((s) => !s)}><ClockCounterClockwise size={18} weight="fill" /> History</button>
              </div>
              {showHistory && (
                <div className="asset-history">
                  {history.length === 0 && <p className="muted">이 자산의 기록이 없습니다.</p>}
                  {history.map((r) => (
                    <div key={r.id} className="asset-history-row">
                      <span className={`type-chip type-${r.type}`}>{typeLabel(r.type)}</span>
                      <span className="asset-history-meta">
                        {[r.name, r.user ? String(r.user).split('@')[0] : '', formatDate(r.createdAt)].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MyListPage({ assets, expandedId, setExpandedId, myPhotos, toggleMyList, onCapture, onCaptureSlot, recordAction, updateAsset, locationPhoto, records, listName, setListName, onSave, onClear, onRequest, onImport, profile, onSaveProfile, notify, locationList, myLocation, setMyLocation, addLocation, onLocationPhoto, sort, setSort }) {
  const ids = assets.map((asset) => asset.assetId)
  const empty = !assets.length
  const [panel, setPanel] = useState('')        // '', 'takeout', 'return', 'extension'
  const [fields, setFields] = useState({ applicantName: profile?.name || '', applicantOrg: profile?.org || '' })
  const [dragOver, setDragOver] = useState(false)
  const importRef = useRef(null)
  async function runExport(kind) {
    const placeKey = REQUEST_FORMS[panel].placeKey
    const exFields = placeKey ? { ...fields, [placeKey]: myLocation } : { ...fields }
    try {
      if (kind === 'pdf') exportRequestPdf(panel, exFields, assets, listName)
      else await exportRequestHwpx(panel, exFields, assets, myPhotos, listName)
      onSaveProfile(fields.applicantName, fields.applicantOrg)
      // Record the action (check-in/out/extension): logs to History + assigns location.
      const actionType = { takeout: 'checkout', return: 'checkin', extension: 'extension' }[panel]
      recordAction(actionType, ids)
    } catch (e) {
      notify(`${kind.toUpperCase()} 실패: ${e.message || e}`)
    }
  }
  function onDrop(event) {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file) onImport(file)
  }
  function commitLocation(value) {
    const v = value.trim()
    setMyLocation(v)
    if (v && !locationList.some((l) => l.name === v)) addLocation(v)
  }
  function togglePanel(type) {
    setPanel((p) => (p === type ? '' : type))
  }
  // Top row (slate) — list actions. Bottom row (amber) — application forms / import.
  const rowTop = [
    { key: 'clear', label: 'Clear', Glyph: Trash, onClick: onClear, disabled: empty },
    { key: 'update', label: 'Update', Glyph: CheckCircle, onClick: () => recordAction('update', ids), disabled: empty, cls: 'is-filled' },
    { key: 'request', label: 'Request', Glyph: ShieldCheck, onClick: () => onRequest(ids), disabled: empty },
    { key: 'save', label: 'Save', Glyph: FloppyDisk, onClick: onSave, disabled: empty },
  ]
  const rowBottom = [
    { key: 'checkin', label: 'Check-in', Glyph: ArrowCircleDown, onClick: () => togglePanel('return'), active: panel === 'return', disabled: empty },
    { key: 'checkout', label: 'Check-out', Glyph: ArrowCircleUp, onClick: () => togglePanel('takeout'), active: panel === 'takeout', disabled: empty },
    { key: 'extension', label: 'Extension', Glyph: CalendarPlus, onClick: () => togglePanel('extension'), active: panel === 'extension', disabled: empty },
    { key: 'import', label: 'Import', Glyph: UploadSimple, onClick: () => importRef.current?.click(), cls: 'no-bg' },
  ]
  const form = panel ? REQUEST_FORMS[panel] : null
  const titleReq = panel && !String(listName || '').trim()
  const locReq = panel && form?.placeKey && !String(myLocation || '').trim()
  return (
    <div
      className={`stack${dragOver ? ' is-dragover' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <input ref={importRef} type="file" accept=".hwpx,.json,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onImport(f) }} />
      {dragOver && <div className="drop-hint">HWPX / JSON 파일을 놓으면 My List에 추가됩니다</div>}
      <Card>
        <div className="mylist-head-grid">
          <span className="mylist-icon-cell"><PencilSimple size={18} weight="fill" color={BRAND} /></span>
          <Input size="md" className={titleReq ? 'is-req-empty' : undefined} value={listName} placeholder="목록 이름" onChange={(event) => setListName(event.target.value)} />
          <button
            type="button"
            className="loc-photo-btn mylist-icon-cell"
            title="위치 사진 촬영"
            disabled={!myLocation.trim()}
            onClick={() => { commitLocation(myLocation); onLocationPhoto(myLocation.trim()) }}
          >
            <CameraPlus size={18} weight="fill" color="#ffffff" />
          </button>
          <input
            className={`loc-input${locReq ? ' is-req-empty' : ''}`}
            list="mylist-loc-options"
            value={myLocation}
            placeholder="위치 검색·선택 또는 새 위치"
            onChange={(event) => setMyLocation(event.target.value)}
            onBlur={(event) => commitLocation(event.target.value)}
          />
          <datalist id="mylist-loc-options">
            {locationList.map((l) => <option key={l.name} value={l.name} />)}
          </datalist>
        </div>
        <div className="mylist-actions">
          {rowTop.map((item) => (
            <button key={item.key} type="button" className={`mylist-btn${item.cls ? ` ${item.cls}` : ''}`} disabled={item.disabled} onClick={item.onClick}>
              <item.Glyph size={20} weight="fill" color="#3d5a80" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="mylist-actions">
          {rowBottom.map((item) => (
            <button key={item.key} type="button" className={`mylist-btn tone-amber${item.active ? ' is-active' : ''}${item.cls ? ` ${item.cls}` : ''}`} disabled={item.disabled} onClick={item.onClick}>
              <item.Glyph size={20} weight="fill" color="currentColor" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        {form && (
          <div className="request-panel">
            <h4>{form.label}</h4>
            {form.fields.map((f) => (
              <label key={f.k} className={f.req && !String(fields[f.k] || '').trim() ? 'req-empty' : ''}>
                <span className="field-label">{f.l}{f.req && <span className="req-mark"> *</span>}</span>
                {f.area ? (
                  <textarea className="edit-textarea" value={fields[f.k] || ''} placeholder={f.ph || ''} onChange={(e) => setFields((c) => ({ ...c, [f.k]: e.target.value }))} />
                ) : (
                  <Input size="md" value={fields[f.k] || ''} placeholder={f.ph || ''} onChange={(e) => setFields((c) => ({ ...c, [f.k]: e.target.value }))} />
                )}
              </label>
            ))}
            {form.placeKey && <p className="muted">장소는 위 위치 입력칸 값으로 들어갑니다: {myLocation || '(미입력)'}</p>}
            <div className="action-row">
              <button type="button" className="amber-btn" onClick={() => runExport('pdf')}>PDF</button>
              <button type="button" className="amber-btn" onClick={() => runExport('hwpx')}>HWPX</button>
            </div>
          </div>
        )}
      </Card>
      <div className="list-toolbar">
        <span className="list-count">총 {assets.length}개</span>
        <SortBar sort={sort} setSort={setSort} />
      </div>
      <div className="result-list result-list-full">
        {empty && <Card><p className="muted">My List가 비어 있습니다.</p></Card>}
        {assets.map((asset) => (
          <AssetRow
            key={asset.assetId}
            asset={asset}
            expanded={expandedId === asset.assetId}
            onToggle={() => setExpandedId(expandedId === asset.assetId ? '' : asset.assetId)}
            inMyList
            shots={myPhotos[asset.assetId]}
            onToggleMyList={() => toggleMyList(asset.assetId)}
            onCapture={() => onCapture(asset.assetId)}
            onCaptureSlot={onCaptureSlot}
            recordAction={recordAction}
            updateAsset={updateAsset}
            locationPhoto={locationPhoto}
            records={records}
          />
        ))}
      </div>
    </div>
  )
}

function RecordsPage({ records, assets, myListSet, toggleMyList, onAdd, onRemove, isAdmin, onDelete }) {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState('')
  const assetMap = useMemo(() => {
    const m = {}
    for (const a of assets) m[a.assetId] = a
    return m
  }, [assets])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter((r) =>
      String(r.name || '').toLowerCase().includes(q) ||
      String(r.user || '').toLowerCase().includes(q) ||
      (r.assetIds || []).some((id) => String(id).toLowerCase().includes(q)),
    )
  }, [records, query])
  return (
    <div className="stack">
      <Card title="History">
        <div className="search-box">
          <MagnifyingGlass size={18} weight="fill" color={BRAND} />
          <Input size="md" value={query} placeholder="제목 · 작성자 · 자산번호 검색" onChange={(event) => setQuery(event.target.value)} />
        </div>
      </Card>
      {filtered.length === 0 && <Card><p className="muted">{records.length ? '검색 결과가 없습니다.' : '저장된 기록이 없습니다.'}</p></Card>}
      {filtered.map((record) => (
        <Card key={record.id}>
          <div className="history-row">
            <button type="button" className="history-info" onClick={() => setOpenId(openId === record.id ? '' : record.id)}>
              <strong>{record.name || record.id}</strong>
              <span className="history-meta">
                <span className={`type-chip type-${record.type}`}>{typeLabel(record.type)}</span>
                <span>
                  {[`${(record.assetIds || []).length}개`, record.user ? String(record.user).split('@')[0] : '', formatDate(record.createdAt)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </button>
            <span className={`loc-caret${openId === record.id ? ' is-open' : ''}`}><CaretRight size={15} weight="bold" /></span>
            <button type="button" className="asset-circle" title="My List에 추가" onClick={() => onAdd(record)}>
              <Plus size={15} weight="bold" color="#ffffff" />
            </button>
            <button type="button" className="asset-circle is-on" title="My List에서 제거" onClick={() => onRemove(record)}>
              <Minus size={15} weight="bold" color="#ffffff" />
            </button>
            {isAdmin && (
              <button type="button" className="history-del" title="기록 삭제" onClick={() => onDelete(record.id)}>
                <Trash size={16} weight="fill" color="#a32d2d" />
              </button>
            )}
          </div>
          {openId === record.id && (
            <div className="loc-detail">
              <div className="loc-items">
                {(record.assetIds || []).length === 0 && <p className="muted">항목이 없습니다.</p>}
                {(record.assetIds || []).map((id) => (
                  <div key={id} className="loc-item">
                    <span className="mono">{id}</span>
                    <strong>{assetMap[id]?.name || '(목록에 없는 자산)'}</strong>
                    <button
                      type="button"
                      className={`asset-circle${myListSet.has(id) ? ' is-on' : ''}`}
                      title={myListSet.has(id) ? 'My List에서 제거' : 'My List에 추가'}
                      onClick={() => toggleMyList(id)}
                    >
                      {myListSet.has(id) ? <Minus size={15} weight="bold" color="#fff" /> : <Plus size={15} weight="bold" color="#fff" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

// Field config per classification kind.
const CLASS_CONFIG = {
  location: {
    field: 'location',
    searchPlaceholder: '위치 이름 · 자산번호 검색',
    emptyText: '위치가 없습니다. 자산에 위치를 지정하거나 My List에서 위치를 추가하세요.',
    editFields: [
      { k: 'name', l: '이름' },
      { k: 'address', l: '정확한 주소', ph: '상세 주소 (선택)' },
      { k: 'memo', l: '메모', area: true },
    ],
    detailFields: [{ k: 'address', l: '주소' }, { k: 'memo', l: '메모' }],
  },
  type: {
    field: 'type',
    searchPlaceholder: '타입 이름 · 자산번호 검색',
    emptyText: '타입이 없습니다. 자산에 타입을 지정하세요.',
    editFields: [
      { k: 'name', l: '이름' },
      { k: 'description', l: '설명', area: true },
      { k: 'memo', l: '메모', area: true },
    ],
    detailFields: [{ k: 'description', l: '설명' }, { k: 'memo', l: '메모' }],
  },
}

function ClassificationPage(props) {
  const [sub, setSub] = useState('location')
  return (
    <div className="stack">
      <div className="subtabs">
        <button type="button" className={`subtab${sub === 'location' ? ' is-active' : ''}`} onClick={() => setSub('location')}>Location</button>
        <button type="button" className={`subtab${sub === 'type' ? ' is-active' : ''}`} onClick={() => setSub('type')}>Type</button>
      </div>
      {sub === 'location' ? (
        <ClassPage
          cfg={CLASS_CONFIG.location}
          classList={props.locationList}
          assets={props.assets}
          myListSet={props.myListSet}
          isAdmin={props.isAdmin}
          toggleMyList={props.toggleMyList}
          onUpdate={props.onUpdateLocation}
          onMerge={props.onMergeLocation}
          onDelete={props.onDeleteLocation}
          onAddAll={props.onAddAllLocation}
          onPhoto={props.onPhotoLocation}
        />
      ) : (
        <ClassPage
          cfg={CLASS_CONFIG.type}
          classList={props.typeList}
          assets={props.assets}
          myListSet={props.myListSet}
          isAdmin={props.isAdmin}
          toggleMyList={props.toggleMyList}
          onUpdate={props.onUpdateType}
          onMerge={props.onMergeType}
          onDelete={props.onDeleteType}
          onAddAll={props.onAddAllType}
          onPhoto={props.onPhotoType}
        />
      )}
    </div>
  )
}

function ClassPage({ cfg, classList, assets, myListSet, isAdmin, onUpdate, onMerge, onDelete, onPhoto, onAddAll, toggleMyList }) {
  const [openName, setOpenName] = useState('')
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return classList
    return classList.filter((c) =>
      String(c.name).toLowerCase().includes(q) ||
      assets.some((a) => a[cfg.field] === c.name && String(a.assetId).toLowerCase().includes(q)),
    )
  }, [classList, assets, query, cfg.field])
  return (
    <>
      <Card>
        <div className="search-box">
          <MagnifyingGlass size={18} weight="fill" color={BRAND} />
          <Input size="md" value={query} placeholder={cfg.searchPlaceholder} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </Card>
      {filtered.length === 0 && <Card><p className="muted">{classList.length ? '검색 결과가 없습니다.' : cfg.emptyText}</p></Card>}
      {filtered.map((c) => (
        <ClassCard
          key={c.name}
          cfg={cfg}
          rec={c}
          assets={assets}
          myListSet={myListSet}
          isAdmin={isAdmin}
          open={openName === c.name}
          onToggle={() => setOpenName(openName === c.name ? '' : c.name)}
          onUpdate={onUpdate}
          onMerge={onMerge}
          onDelete={onDelete}
          onPhoto={onPhoto}
          onAddAll={onAddAll}
          toggleMyList={toggleMyList}
        />
      ))}
    </>
  )
}

function ClassCard({ cfg, rec, assets, myListSet, isAdmin, open, onToggle, onUpdate, onMerge, onDelete, onPhoto, onAddAll, toggleMyList }) {
  const items = useMemo(() => assets.filter((a) => a[cfg.field] === rec.name), [assets, rec.name, cfg.field])
  const [editing, setEditing] = useState(false)
  const initForm = () => { const f = {}; cfg.editFields.forEach((x) => { f[x.k] = x.k === 'name' ? rec.name : (rec[x.k] || '') }); return f }
  const [form, setForm] = useState(initForm)
  useEffect(() => { setForm(initForm()) }, [rec.name, rec.address, rec.description, rec.memo])
  function saveEdit() {
    const patch = { ...form, name: (form.name || '').trim() || rec.name }
    onUpdate(rec.name, patch)
    setEditing(false)
  }
  return (
    <Card>
      <div className="loc-row">
        <button type="button" className="asset-thumb is-photo loc-thumb" title="사진 촬영" onClick={() => onPhoto(rec.name)}>
          {rec.photo ? <img src={rec.photo} alt="" /> : <CameraPlus size={22} weight="fill" color={PHOTO_COLOR} />}
        </button>
        <button type="button" className="loc-main" onClick={onToggle}>
          <strong>{rec.name}</strong>
          <span className="history-meta">{rec.count}개 물품{rec.lastUpdate ? ` · 최근변경 ${formatDate(rec.lastUpdate)}` : ''}</span>
        </button>
        {isAdmin && (
          <>
            <button type="button" className={`loc-icon-btn${editing ? ' is-active' : ''}`} title="수정하기" onClick={() => setEditing((e) => !e)}>
              <PencilSimple size={18} weight="fill" color="#3d5a80" />
            </button>
            <button type="button" className="loc-icon-btn" title="병합" onClick={() => onMerge(rec.name)}>
              <ArrowsMerge size={18} weight="fill" color="#3d5a80" />
            </button>
            <button type="button" className="loc-icon-btn loc-del" title="제거" onClick={() => onDelete(rec.name)}>
              <Trash size={18} weight="fill" color="#a32d2d" />
            </button>
          </>
        )}
        <span className={`loc-caret${open ? ' is-open' : ''}`}><CaretRight size={16} weight="bold" /></span>
      </div>
      {editing && isAdmin && (
        <div className="loc-detail loc-edit">
          {cfg.editFields.map((x) => (
            <label key={x.k}>
              {x.l}
              {x.area ? (
                <textarea className="edit-textarea" value={form[x.k] || ''} onChange={(e) => setForm((c) => ({ ...c, [x.k]: e.target.value }))} />
              ) : (
                <Input size="md" value={form[x.k] || ''} placeholder={x.ph || ''} onChange={(e) => setForm((c) => ({ ...c, [x.k]: e.target.value }))} />
              )}
            </label>
          ))}
          <div className="action-row">
            <button type="button" className="amber-btn" onClick={saveEdit}>저장</button>
            <Button variant="secondary" size="md" style={ACTION_BTN} onClick={() => setEditing(false)}>취소</Button>
          </div>
        </div>
      )}
      {open && !editing && (
        <div className="loc-detail">
          <dl className="kv">
            {rec.createdBy && <><dt>만든 사람</dt><dd>{String(rec.createdBy).split('@')[0]}</dd></>}
            {cfg.detailFields.map((x) => (rec[x.k] ? <React.Fragment key={x.k}><dt>{x.l}</dt><dd>{rec[x.k]}</dd></React.Fragment> : null))}
            <dt>최근 변경</dt><dd>{formatDate(rec.lastUpdate) || '-'}</dd>
          </dl>
          <div className="action-row">
            <button type="button" className="amber-btn" onClick={() => onAddAll(rec.name)}>전부 My List에 추가</button>
          </div>
          <div className="loc-items">
            {items.length === 0 && <p className="muted">물품이 없습니다.</p>}
            {items.map((a) => (
              <div key={a.assetId} className="loc-item">
                <span className="mono">{a.assetId}</span>
                <strong>{a.name || 'Unnamed asset'}</strong>
                <button
                  type="button"
                  className={`asset-circle${myListSet.has(a.assetId) ? ' is-on' : ''}`}
                  title={myListSet.has(a.assetId) ? 'My List에서 제거' : 'My List에 추가'}
                  onClick={() => toggleMyList(a.assetId)}
                >
                  {myListSet.has(a.assetId) ? <Minus size={15} weight="bold" color="#fff" /> : <Plus size={15} weight="bold" color="#fff" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function Metric({ label, value }) {
  return (
    <Card>
      <div className="metric">
        <span>{label}</span>
        <strong>{Number(value).toLocaleString()}</strong>
      </div>
    </Card>
  )
}

function typeLabel(type) {
  if (type === 'checkout') return 'Check-out'
  if (type === 'checkin') return 'Check-in'
  if (type === 'extension') return 'Extension'
  if (type === 'update') return 'Update'
  if (type === 'verify') return 'Update'
  if (type === 'request') return 'Request'
  if (type === 'save') return 'Saved'
  return type
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const loginButtonStyle = {
  height: 37,
  minHeight: 37,
  fontSize: 17,
}

const loginNewListButtonStyle = {
  ...loginButtonStyle,
}

function makeTemporaryPassword() {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(36)).join('') + 'Aa1!'
}

export default App
