import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'   // bundled (was a unpkg CDN <script>)
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
  Trash,
  CheckCircle,
  ArrowCircleDown,
  ArrowCircleUp,
  FloppyDisk,
  MapPin,
  Tag,
  ShieldCheck,
  CalendarPlus,
  UploadSimple,
  ArrowsMerge,
  ArrowUp,
  ArrowClockwise,
  Crop,
  X,
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

const DEFAULT_PROJECT_ID = 'LIST-default'

// Portal-only: this app is delivered through the LILAK portal, which injects
// window.__PORTAL_BASE__ = /pp/asset_manager/<project>. The PROJECT (chosen in the
// portal) IS the asset list, and identity is the portal account (SSO). There is no
// standalone login any more — the old Firebase email/password path was removed.
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

// PWA: offline shell. Relative 'sw.js' resolves under the portal-injected <base>,
// so the worker registers per-project (scope = /pp/asset_manager/<project>/).
if (PORTAL_BASE && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {})
  })
}

// The portal marks admins with role "manager" (first signup).
function isAdminUser(user) {
  if (!PORTAL_BASE) return false
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
// ── Server storage ───────────────────────────────────────────────────────────
// The asset list is SHARED: it lives in the backend under the portal project, not
// in this browser. localStorage stays as a fast first paint + per-user state, but
// the server is the source of truth for `SERVER_KEYS`. Standalone (no portal) has
// no backend, so it keeps the old localStorage-only behaviour.
const SERVER = !!PORTAL_PROJECT
const SERVER_KEYS = ['assets', 'records', 'locations', 'types']

function authHeaders() {
  const tok = localStorage.getItem('lilak_portal_token') || localStorage.getItem('elog_token')
  return tok ? { Authorization: `Bearer ${tok}` } : {}
}

async function fetchServerData() {
  const r = await fetch(`${PORTAL_BASE}/api/data`, { headers: authHeaders() })
  if (!r.ok) throw new Error(`GET /api/data → ${r.status}`)
  return r.json()
}

// Cheap poll: just the version number, so we only pull the full document (which
// carries inline photos) when someone actually saved.
async function fetchServerVersion() {
  const r = await fetch(`${PORTAL_BASE}/api/data/version`, { headers: authHeaders() })
  if (!r.ok) throw new Error(`GET /api/data/version → ${r.status}`)
  return (await r.json()).version
}

// Returns {conflict:true, current} when someone else saved first — the caller
// reloads from `current` instead of overwriting their work.
async function putServerData(baseVersion, shared) {
  const r = await fetch(`${PORTAL_BASE}/api/data`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ baseVersion, ...shared }),
  })
  if (r.status === 409) return { conflict: true, current: (await r.json()).current }
  if (!r.ok) throw new Error(`PUT /api/data → ${r.status}`)
  return { conflict: false, doc: await r.json() }
}

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
      // New portal projects start empty — asset data is managed per server, not
      // bundled with the app. (Seed injection here previously pre-filled every
      // new portal project with the ~1k-row CENS_SEED_ASSETS list.)
      saveProjectData(PORTAL_PROJECT, { assets: [], records: [], myList: [] })
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
  // Portal-only: ready immediately with the portal (SSO) identity. Opened outside
  // the portal there is no login — show a "open via the portal" notice instead.
  const [authStatus] = useState(PORTAL_BASE ? 'ready' : 'no-portal')
  const [authUser, setAuthUser] = useState(PORTAL_BASE ? (portalUser() || { email: 'portal', name: 'portal' }) : null)

  // The localStorage token can be missing on a device even though the portal
  // COOKIE is what got the user through the proxy (e.g. an installed PWA has its
  // own storage partition on iOS) — then portalUser() falls back to 'portal'.
  // The backend reads the cookie too, so ask IT who we are and correct the guess.
  useEffect(() => {
    if (!SERVER) return
    fetch(`${PORTAL_BASE}/api/whoami`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (me?.authenticated && (me.email || me.username)) {
          setAuthUser({
            email: me.email || me.username,
            name: me.name || me.username || me.email,
            role: me.role || '',
          })
        }
      })
      .catch(() => {})
  }, [])
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
  // Inline confirm/prompt dialog. Native window.confirm/prompt are BLOCKED when the
  // app runs inside the portal proxy frame, so all confirmations use this instead.
  const [dialog, setDialog] = useState(null)   // null | {kind, message, value?, onConfirm}
  const [scanning, setScanning] = useState(false)
  const [capture, setCapture] = useState(null)   // { kind:'asset', id } | { kind:'location', name }
  // Scanned-but-unknown asset number → prefills the "새 자산 등록" card once.
  const [assetDraft, setAssetDraft] = useState(null)
  const [myListBadge, setMyListBadge] = useState(0)   // new My List adds while on another tab
  const [sort, setSort] = useState({ key: 'assetId', dir: 'asc' })
  const isMobile = useMediaQuery('(max-width: 760px)')

  // Remembered applicant name/org for request forms, per account.
  const profileKey = `cens.profile.${authUser?.email || 'local'}`
  const profile = useMemo(() => readJson(profileKey, {}), [profileKey])
  function saveProfile(name, org) {
    writeJson(profileKey, { name: name || '', org: org || '' })
  }
  // Badge = net NEW My List items since the last visit to the tab: adds bump it
  // up, removes bump it down (floored at 0), so it always matches reality.
  function bumpBadge(n) {
    if (n !== 0 && tab !== 'mylist') setMyListBadge((b) => Math.max(0, b + n))
  }
  // The same "new since last visit" items, as ids — My List outlines them in a
  // different border colour. Cleared when the user LEAVES the tab (they've seen
  // them by then), and kept in sync with removals.
  const [newIds, setNewIds] = useState(() => new Set())
  function markNew(ids) {
    if (tab === 'mylist' || !ids.length) return
    setNewIds((s) => { const n = new Set(s); ids.forEach((id) => n.add(id)); return n })
  }
  function unmarkNew(ids) {
    setNewIds((s) => {
      if (![...ids].some((id) => s.has(id))) return s
      const n = new Set(s); ids.forEach((id) => n.delete(id)); return n
    })
  }
  const prevTab = useRef(tab)
  useEffect(() => {
    if (prevTab.current === 'mylist' && tab !== 'mylist') setNewIds(new Set())
    prevTab.current = tab
  }, [tab])
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

  // ── Server sync (shared data) ──────────────────────────────────────────────
  // `serverVersion` is the version this client last agreed with; `syncedRef` is the
  // exact payload the server holds. Comparing against it (rather than juggling
  // "skip the next save" flags) is self-correcting: a hydrate/conflict-reload sets
  // it, so the resulting state change can't echo straight back as a save.
  const serverVersion = useRef(null)
  const syncedRef = useRef(null)
  const [hydrated, setHydrated] = useState(!SERVER)
  // Latest shared state, readable from the poll timer without re-arming it.
  const sharedNow = useRef(null)
  sharedNow.current = { assets, records, locations, types }

  function applyServerDoc(doc) {
    serverVersion.current = doc.version
    syncedRef.current = JSON.stringify({
      assets: doc.assets || [], records: doc.records || [],
      locations: doc.locations || [], types: doc.types || [],
    })
    setAssets(doc.assets || [])
    setRecords(doc.records || [])
    setLocations(doc.locations || [])
    setTypes(doc.types || [])
  }

  useEffect(() => {
    if (!SERVER) return
    let cancelled = false
    ;(async () => {
      try {
        const doc = await fetchServerData()
        if (cancelled) return
        applyServerDoc(doc)
      } catch {
        if (!cancelled) setNotice('서버에서 자산을 불러오지 못했습니다. 이 기기의 사본을 표시합니다.')
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Live refresh: someone else's save should appear here without a reload. Pull
  // the full document only when the (tiny) version endpoint says it moved, and
  // never apply over unsaved local edits; the save's 409 path settles those.
  // Called by the 15s poll, foreground return, and pull-to-refresh.
  const refreshBusy = useRef(false)
  async function refreshShared() {
    if (refreshBusy.current) return
    refreshBusy.current = true
    try {
      const v = await fetchServerVersion()
      const clean = () => serverVersion.current === null ||
        JSON.stringify(sharedNow.current) === syncedRef.current
      if (v !== serverVersion.current && clean()) {
        const doc = await fetchServerData()
        if (clean()) applyServerDoc(doc)   // re-check: an edit may have landed mid-fetch
      }
    } catch {} finally { refreshBusy.current = false }
  }

  useEffect(() => {
    if (!SERVER) return
    const refresh = () => { if (document.visibilityState !== 'hidden') refreshShared() }
    const timer = setInterval(refresh, 15000)
    const onWake = () => { if (document.visibilityState === 'visible') refreshShared() }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [])

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  // Standard mobile gesture: drag the list down while it's at the top, an arrow
  // rides down with the finger, release past the threshold → refresh. The list
  // itself doesn't move (overscroll is contained); only the indicator does.
  const PTR_THRESHOLD = 64
  const ptrStartY = useRef(null)
  const [ptrPull, setPtrPull] = useState(0)
  const [ptrBusy, setPtrBusy] = useState(false)

  function onPtrStart(e) {
    const el = pageRef.current
    ptrStartY.current = (el && el.scrollTop <= 0 && !ptrBusy) ? e.touches[0].clientY : null
  }
  function onPtrMove(e) {
    if (ptrStartY.current === null) return
    const el = pageRef.current
    if (!el || el.scrollTop > 0) { ptrStartY.current = null; setPtrPull(0); return }
    const dy = e.touches[0].clientY - ptrStartY.current
    setPtrPull(dy > 0 ? Math.min(dy * 0.4, 96) : 0)   // damped, like native
  }
  function onPtrCancel() {
    ptrStartY.current = null
    setPtrPull(0)
  }
  async function onPtrEnd() {
    if (ptrStartY.current === null) return
    ptrStartY.current = null
    const fired = ptrPull >= PTR_THRESHOLD
    setPtrPull(0)
    if (!fired || ptrBusy) return
    setPtrBusy(true)
    try {
      // Keep the spinner visible for a beat even when the fetch is instant,
      // so the user sees the refresh actually happened.
      await Promise.all([refreshShared(), new Promise((r) => setTimeout(r, 600))])
    } finally { setPtrBusy(false) }
  }

  useEffect(() => {
    if (!SERVER || !hydrated || serverVersion.current === null) return
    const payload = JSON.stringify({ assets, records, locations, types })
    if (payload === syncedRef.current) return           // identical to the server
    const t = setTimeout(async () => {
      try {
        const res = await putServerData(serverVersion.current, JSON.parse(payload))
        if (res.conflict) {
          applyServerDoc(res.current)
          setNotice('다른 사용자가 먼저 저장했습니다. 최신 목록으로 새로고침했어요.')
        } else {
          serverVersion.current = res.doc.version
          syncedRef.current = payload
        }
      } catch {
        setNotice('서버 저장에 실패했습니다. 변경사항이 아직 반영되지 않았어요.')
      }
    }, 600)                                             // debounce a burst of edits
    return () => clearTimeout(t)
  }, [assets, records, locations, types, hydrated])

  const filteredAssets = useMemo(() => {
    return sortAssets(assets.filter((asset) => matchesAsset(asset, query)), sort)
  }, [assets, query, sort])
  const isAdmin = isAdminUser(authUser)
  // My List has its own sort, defaulting to the order items were added (the
  // myList array itself — newest first, since adds unshift).
  const [mySort, setMySort] = useState({ key: 'added', dir: 'asc' })
  const myAssets = useMemo(() => {
    const list = myList.map((id) => assets.find((asset) => asset.assetId === id)).filter(Boolean)
    if (mySort.key === 'added') return mySort.dir === 'asc' ? list : [...list].reverse()
    return sortAssets(list, mySort)
  }, [assets, myList, mySort])
  // Classification lists (location / type) merged with asset values + item counts.
  const locationList = useMemo(() => buildClassList('location', locations, assets), [locations, assets])
  const typeList = useMemo(() => buildClassList('type', types, assets), [types, assets])
  // Existing class names — the asset edit form's location/type dropdowns.
  const classOptions = useMemo(() => ({
    location: locationList.map((l) => l.name),
    type: typeList.map((l) => l.name),
  }), [locationList, typeList])
  const locationPhoto = useMemo(() => {
    const m = {}
    for (const l of locations) if (l?.name && l.photo) m[l.name] = l.photo
    return (name) => m[name] || ''
  }, [locations])
  const latestRecords = records.slice(0, 80)

  function show(message) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1800)
  }

  // Portal-safe replacements for window.confirm / window.prompt.
  function askConfirm(message, onConfirm) {
    setDialog({ kind: 'confirm', message, onConfirm })
  }
  function askPrompt(message, value, onConfirm) {
    setDialog({ kind: 'prompt', message, value: value ?? '', onConfirm })
  }

  function signOut() {
    // The only session is the portal's — leaving means going back to the portal.
    window.location.assign('/projects')
  }

  function toggleMyList(assetId) {
    if (myList.includes(assetId)) {
      setMyList((list) => list.filter((id) => id !== assetId))
      bumpBadge(-1)
      unmarkNew([assetId])
      setMyPhotos((photos) => {
        if (!photos[assetId]) return photos
        const next = { ...photos }
        delete next[assetId]
        return next
      })
    } else {
      setMyList((list) => [assetId, ...list])
      bumpBadge(1)
      markNew([assetId])
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

  // Register a new location/type from the "새 등록" card. Name required, no dupes.
  function createClass(field, setStore, form) {
    const name = String(form.name || '').trim()
    if (!name) { show('이름을 입력해야 등록할 수 있습니다.'); return false }
    const list = field === 'location' ? locationList : typeList
    if (list.some((l) => l.name === name)) { show(`'${name}'은(는) 이미 있습니다.`); return false }
    upsertClass(setStore, name, { ...form, name, lastUpdate: new Date().toISOString() })
    show(`'${name}'을(를) 등록했습니다.`)
    return true
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
    askPrompt(`'${name}'을(를) 어디로 병합할까요? (대상 이름)`, '', (target) => {
      if (target && target.trim()) updateClass(field, setStore, name, { name: target.trim() })
    })
  }

  function deleteClass(field, setStore, name) {
    askConfirm(`'${name}'을(를) 제거할까요? 해당 자산의 값이 비워집니다.`, () => {
      doDeleteClass(field, setStore, name)
    })
  }

  function doDeleteClass(field, setStore, name) {
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
    markNew(added)
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
    askPrompt('목록 이름', projectName, (next) => renameProject(next))
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
    askConfirm('이 기록을 삭제할까요?', () => {
      setRecords((items) => items.filter((r) => r.id !== id))
      show('기록을 삭제했습니다.')
    })
  }

  function renameRecord(id) {
    const rec = records.find((r) => r.id === id)
    askPrompt('기록 이름 편집', rec?.name || '', (name) => {
      const v = String(name || '').trim()
      if (!v) return
      setRecords((items) => items.map((r) => (r.id === id ? { ...r, name: v } : r)))
      show('기록 이름을 변경했습니다.')
    })
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
    // One code (e.g. the "촬영" still-capture path) behaves exactly like a live
    // scan — including the unknown-number → new-asset-card flow.
    if (numbers.length === 1) { handleScannedNumber(numbers[0]); return }
    const existing = new Set(assets.map((a) => a.assetId))
    const matched = numbers.filter((n) => existing.has(n))
    const added = matched.filter((n) => !myList.includes(n))
    setMyList((list) => {
      const set = new Set(list)
      return [...list, ...matched.filter((n) => !set.has(n))]
    })
    bumpBadge(added.length)
    markNew(added)
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
    markNew(added)
    show(`${ids.length}개를 My List에 추가했습니다.`)
  }

  // History "−": remove a saved list's assets from My List in one go.
  function removeListFromMyList(record) {
    const ids = new Set(Array.isArray(record.assetIds) ? record.assetIds : [])
    bumpBadge(-myList.filter((id) => ids.has(id)).length)   // only those actually removed
    unmarkNew(ids)
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
    askConfirm('My List를 모두 비울까요?', () => {
      setMyList([])
      setNewIds(new Set())
      setMyPhotos({})
      show('My List를 비웠습니다.')
    })
  }

  // A scan is an "add to My List" action (same for live scan / capture / gallery):
  // a known number drops straight into My List with no card opening and no tab
  // jump; an UNKNOWN number opens the "새 자산 등록" card with it filled in.
  function handleScannedNumber(number) {
    const match = assets.find((asset) => asset.assetId === number)
    if (!match) {
      setQuery('')                     // the new-asset card only shows when un-searched
      setExpandedId('')
      setAssetDraft({ assetId: number })
      setTab('assets')
      show(`미등록 번호(${number})입니다 — 새 자산으로 등록하세요.`)
      return
    }
    setQuery(number)                   // Assets search box shows the scanned item
    if (myList.includes(number)) {
      show(`${number} 자산은 이미 My List에 있습니다.`)
      return
    }
    setMyList((list) => [number, ...list])
    markNew([number])
    bumpBadge(1)
    show(`${number} 자산을 My List에 추가했습니다.`)
  }

  function onScanResult(text) {
    setScanning(false)
    const number = extractAssetNumber(text)
    if (!number) return
    handleScannedNumber(number)
  }

  // Append-only editor trail: "kim → lee → kim". Never cleared, never editable;
  // consecutive edits by the same person are collapsed into one entry.
  function appendEditedBy(prev, me) {
    if (!me) return prev || ''
    const chain = String(prev || '').trim()
    const last = chain.split('→').map((s) => s.trim()).filter(Boolean).pop()
    return last === me ? chain : (chain ? `${chain} → ${me}` : me)
  }

  function updateAsset(assetId, patch) {
    const now = new Date().toISOString()
    const me = authUser?.email ? String(authUser.email).split('@')[0] : ''
    // The asset number itself is editable — validate + carry references along.
    if ('assetId' in patch) {
      const newId = String(patch.assetId || '').trim()
      if (!newId) { show('자산번호는 비울 수 없습니다.'); return false }
      if ('name' in patch && !String(patch.name || '').trim()) { show('이름은 비울 수 없습니다.'); return false }
      patch = { ...patch, assetId: newId }
      if (newId !== assetId) {
        if (assets.some((a) => a.assetId === newId)) { show(`자산번호 ${newId}는 이미 있습니다.`); return false }
        setMyList((list) => list.map((id) => (id === assetId ? newId : id)))
        setMyPhotos((m) => {
          if (!m[assetId]) return m
          const n = { ...m, [newId]: m[assetId] }
          delete n[assetId]
          return n
        })
        if (expandedId === assetId) setExpandedId(newId)
      }
    }
    setAssets((items) => items.map((asset) => (
      asset.assetId === assetId ? { ...asset, ...patch, editedBy: appendEditedBy(asset.editedBy, me), lastUpdate: now } : asset
    )))
    touchClasses([assetId], now)
    show('자산 정보를 저장했습니다.')
    return true
  }

  // "전체추가" — add every asset currently listed (i.e. the filtered set) to My List.
  function addAllAssets(ids) {
    const added = ids.filter((id) => !myList.includes(id))
    if (!added.length) { show('이미 모두 My List에 있습니다.'); return }
    setMyList((list) => [...list, ...added.filter((id) => !list.includes(id))])
    bumpBadge(added.length)
    markNew(added)
    show(`${added.length}개 자산을 My List에 추가했습니다.`)
  }

  // Register a brand-new asset (the "새 자산 등록" card). Number + name required.
  function createAsset(form) {
    const id = String(form.assetId || '').trim()
    const name = String(form.name || '').trim()
    if (!id || !name) { show('자산번호와 이름을 입력해야 등록할 수 있습니다.'); return false }
    if (assets.some((a) => a.assetId === id)) { show(`자산번호 ${id}는 이미 있습니다.`); return false }
    const now = new Date().toISOString()
    const me = authUser?.email ? String(authUser.email).split('@')[0] : ''
    const asset = { photo1: '', photo2: '', photo3: '', createdAt: now, updatedAt: now, lastUpdate: now, user: authUser?.email || '', editedBy: me }
    EDIT_FIELDS.forEach((f) => { asset[f.key] = String(form[f.key] || '').trim() })
    asset.assetId = id
    asset.name = name
    setAssets((items) => [asset, ...items])
    setExpandedId(id)
    show(`새 자산 ${id}를 등록했습니다.`)
    return true
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

  if (authStatus !== 'ready') {
    return <NoPortalScreen />
  }

  const currentProject = projectState.projects.find((project) => project.projectId === projectState.currentProjectId)
  const projectName = projectDisplayName(projectState.currentProjectId, currentProject?.name || '')
  const tabIconSize = isMobile ? 29 : 19
  const logoutIconSize = isMobile ? 24 : 17

  const myListSet = useMemo(() => new Set(myList), [myList])

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          <Cube size={isMobile ? 24 : 20} weight="fill" color={BRAND} />
          {projectName && <span className="topbar-project">{projectName}</span>}
          {authUser && <span className="topbar-user">{String(authUser.email).split('@')[0]}</span>}
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
      {SERVER && (
        <div className="ptr-anchor" aria-hidden="true">
          <div
            className={`ptr${ptrPull > 0 || ptrBusy ? ' is-active' : ''}${ptrPull > 0 && !ptrBusy ? ' is-dragging' : ''}${ptrPull >= PTR_THRESHOLD ? ' is-ready' : ''}${ptrBusy ? ' is-spinning' : ''}`}
            style={{ transform: `translate(-50%, ${ptrBusy ? 20 : Math.round(ptrPull) - 44}px)` }}
          >
            <ArrowClockwise size={20} weight="bold" style={ptrBusy ? undefined : { transform: `rotate(${Math.round(ptrPull * 3)}deg)` }} />
          </div>
        </div>
      )}
      <main
        className="page"
        ref={pageRef}
        onScroll={handlePageScroll}
        onTouchStart={SERVER ? onPtrStart : undefined}
        onTouchMove={SERVER ? onPtrMove : undefined}
        onTouchEnd={SERVER ? onPtrEnd : undefined}
        onTouchCancel={SERVER ? onPtrCancel : undefined}
      >
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
            onCreate={createAsset}
            draft={assetDraft}
            onDraftDone={() => setAssetDraft(null)}
            onAddAll={addAllAssets}
            classOptions={classOptions}
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
            sort={mySort}
            setSort={setMySort}
            newIds={newIds}
            onSeenNew={(id) => unmarkNew([id])}
            classOptions={classOptions}
          />
        )}
        {tab === 'history' && <RecordsPage records={latestRecords} assets={assets} myListSet={myListSet} toggleMyList={toggleMyList} onAdd={addListToMyList} onRemove={removeListFromMyList} isAdmin={isAdmin} onDelete={deleteRecord} onRename={renameRecord} />}
        {tab === 'classification' && (
          <ClassificationPage
            assets={assets}
            myListSet={myListSet}
            isAdmin={isAdmin}
            toggleMyList={toggleMyList}
            locationList={locationList}
            typeList={typeList}
            onCreateLocation={(f) => createClass('location', setLocations, f)}
            onCreateType={(f) => createClass('type', setTypes, f)}
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
              <item.Glyph size={26} weight="fill" color="#ffffff" />
            </button>
          ) : (
            <button
              key={item.id}
              type="button"
              className={`tabbar-tab${tab === item.id ? ' is-active' : ''}`}
              onClick={() => {
                if (tab === item.id) {
                  // Re-tapping the active tab: close the open card + glide to top.
                  setExpandedId('')
                  pageRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
                } else setTab(item.id)
              }}
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
      {dialog && <Dialog dialog={dialog} onClose={() => setDialog(null)} />}
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
    const Lib = Html5Qrcode
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
        {
          fps: 15,
          // Ask for a high-res stream with continuous autofocus. The default stream
          // is often 640x480 and fixed-focus, which is the main reason a small
          // asset-sticker QR won't resolve. (Ignored where unsupported.)
          videoConstraints: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            advanced: [{ focusMode: 'continuous' }],
          },
          // Scan box scaled to the viewfinder instead of a fixed 240px square, so
          // the code doesn't have to be aimed into a small centre box.
          qrbox: (vw, vh) => { const s = Math.round(Math.min(vw, vh) * 0.7); return { width: s, height: s } },
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        },
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
    const Lib = Html5Qrcode
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

  // "촬영": grab the CURRENT live viewfinder frame and decode it in place — no
  // jump to the native camera app. The live scanner keeps running, so a failed
  // shot just shows a hint and scanning continues.
  async function onShot() {
    const video = document.querySelector('#qr-reader video')
    if (!video || !video.videoWidth) { setError('카메라 화면이 아직 준비되지 않았습니다.'); return }
    setBusy(true)
    setError('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
      const fileScanner = new Html5Qrcode('qr-file-reader')
      const text = await fileScanner.scanFile(new File([blob], 'shot.jpg', { type: 'image/jpeg' }), false)
      try { await scannerRef.current?.stop() } catch { /* already stopped */ }
      onResultMany([text])
    } catch {
      setError('촬영한 화면에서 QR을 찾지 못했습니다 — 더 가까이서 다시 시도하세요.')
    } finally {
      setBusy(false)
    }
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
        <div className="action-row scanner-actions">
          <button type="button" className="amber-btn" disabled={busy} onClick={() => galleryRef.current?.click()}>
            <Images size={20} weight="fill" /> {busy ? '인식 중…' : '사진 선택'}
          </button>
          <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={onGallery} />
          <button type="button" className="amber-btn" disabled={busy} onClick={onShot}>
            <Camera size={20} weight="fill" /> {busy ? '인식 중…' : '촬영'}
          </button>
        </div>
        {error
          ? <p className="muted scanner-hint">{error}</p>
          : <p className="muted scanner-hint">잘 인식되지 않으면 “촬영”으로 가까이서 또렷하게 찍어보세요.</p>}
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
            <div className="action-row scanner-actions">
              <button type="button" className="amber-btn" onClick={() => galleryRef.current?.click()}>
                <Images size={20} weight="fill" /> 사진 선택{steps.length > 1 ? ` (${steps.length}장)` : ''}
              </button>
              <input ref={galleryRef} type="file" accept="image/*" multiple={steps.length > 1} hidden onChange={onGallery} />
              {/* Snaps the in-app viewfinder above — never the native camera app. */}
              <button type="button" className="amber-btn" onClick={capture}>
                <Camera size={20} weight="fill" /> {steps[step].label}{last ? ' · 완료' : ''}{progress}
              </button>
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

// Shown only when the app is opened OUTSIDE the LILAK portal (there is no standalone
// login any more — the list is a portal project and identity is the portal account).
// Inline confirm/prompt overlay — a portal-safe replacement for the native
// window.confirm/window.prompt dialogs (blocked inside the portal proxy frame).
function Dialog({ dialog, onClose }) {
  const [value, setValue] = useState(dialog.kind === 'prompt' ? (dialog.value ?? '') : '')
  const inputRef = useRef(null)
  useEffect(() => { if (dialog.kind === 'prompt') inputRef.current?.focus() }, [])
  function confirm() {
    const cb = dialog.onConfirm
    onClose()
    if (dialog.kind === 'prompt') cb?.(value)
    else cb?.()
  }
  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true"
         style={{ position: 'fixed', inset: 0, background: 'rgba(20,26,38,0.45)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 4 }}>
          <p style={{ margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{dialog.message}</p>
          {dialog.kind === 'prompt' && (
            <Input
              ref={inputRef}
              size="md"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirm() }}
            />
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button size="md" variant="secondary" type="button" onClick={onClose}>취소</Button>
            <Button size="md" type="button" onClick={confirm}>확인</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function NoPortalScreen() {
  return (
    <main className="login-page">
      <section className="login-shell">
        <Card style={{ width: '100%', maxWidth: 520 }}>
          <div className="login-form">
            <h1>Asset manager</h1>
            <p className="login-message">
              이 앱은 LILAK 포털을 통해 열어주세요. 목록(리스트)은 포털의 프로젝트로 선택하고,
              로그인은 포털 계정으로 대체되었습니다.
            </p>
            <Button size="md" style={loginButtonStyle} type="button" onClick={() => window.location.assign('/projects')}>
              포털로 이동
            </Button>
          </div>
        </Card>
      </section>
    </main>
  )
}

function SortBar({ sort, setSort, withAdded }) {
  const opts = [
    ...(withAdded ? [{ k: 'added', l: '추가순' }] : []),
    { k: 'assetId', l: '번호' }, { k: 'name', l: '이름' }, { k: 'lastUpdate', l: '수정일' }, { k: 'request', l: '요청' },
  ]
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

// One asset edit field — dropdown (existing locations/types only), textarea, or input.
function EditField({ field, form, setForm, classOptions }) {
  const set = (v) => setForm((c) => ({ ...c, [field.key]: v }))
  if (field.options) {
    const opts = classOptions?.[field.options] || []
    const cur = form[field.key] || ''
    // A legacy value not in the list stays selectable so it isn't silently lost.
    const withCur = cur && !opts.includes(cur) ? [cur, ...opts] : opts
    return (
      <label>
        {field.label}
        <select className="edit-select" value={cur} onChange={(e) => set(e.target.value)}>
          <option value="">(선택 안 함)</option>
          {withCur.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
    )
  }
  return (
    <label>
      {field.label}
      {field.textarea ? (
        <textarea className="edit-textarea" value={form[field.key] || ''} onChange={(e) => set(e.target.value)} />
      ) : (
        <Input
          size="md"
          className={field.required && !String(form[field.key] || '').trim() ? 'is-req-empty' : undefined}
          value={form[field.key] || ''}
          onChange={(e) => set(e.target.value)}
        />
      )}
    </label>
  )
}

// Shared search field: magnifier on the left, icon-only clear (×) on the right
// whenever there's text.
function SearchBox({ query, setQuery, placeholder }) {
  return (
    <div className="search-box">
      <span className="mylist-icon-cell"><MagnifyingGlass size={18} weight="fill" color={BRAND} /></span>
      <Input size="md" value={query} placeholder={placeholder} onChange={(event) => setQuery(event.target.value)} />
      {String(query || '') !== '' && (
        <button type="button" className="search-clear mylist-icon-cell" title="지우기" onClick={() => setQuery('')}>
          <X size={16} weight="bold" color={BRAND} />
        </button>
      )}
    </div>
  )
}

// ── Two-phase card open/close (asset / class / history cards) ─────────────────
// OPEN: glide the still-collapsed card up under the top bar FIRST, then grow the
// body downward, then re-glide once everything settles (a card growing near the
// list end only gains scroll room as it grows, so the first glide can land off).
// CLOSE: shrink in place. No scroll restore: when a low card closes and the page
// runs out of height, the browser clamps the scroll frame-by-frame ALONG the
// animated shrink, which reads as one smooth "close + settle" motion.
// SWITCH (A open → tap B): A must vanish INSTANTLY — animating A's shrink while
// B glides makes B chase a moving target and the whole thing feels wobbly. The
// close branch defers one tick and checks `_lastOpenAt`: both effects of the same
// React commit have run by then, whatever their order in the list.
let _lastOpenAt = -1
const OPEN_DELAY_MS = 30  // past the other card's 0ms instant-close + reflow
const GLIDE_MS = 200      // let the open-glide land before the body grows
const SHRINK_MS = 300     // must match .card-expando's transition duration
const SETTLE_MS = OPEN_DELAY_MS + GLIDE_MS + SHRINK_MS + 60   // everything done

function useCardGlide(open, ref) {
  const [mounted, setMounted] = useState(open)   // body kept in the DOM
  const [grown, setGrown] = useState(open)       // 0fr ↔ 1fr animation class
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (open) {
      _lastOpenAt = performance.now()
      setMounted(true)
      // Glide only AFTER the previously-open card has instant-closed (its close
      // check runs on a 0ms timer, whichever card comes first in the list):
      // computing the scroll target against the old, still-expanded layout sent
      // this card to the wrong spot. 30ms clears that unmount + reflow and is
      // invisible to the eye. Sequence: close 1 → measure → glide 2 → grow 2.
      const t0 = setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), OPEN_DELAY_MS)
      const t1 = setTimeout(() => setGrown(true), OPEN_DELAY_MS + GLIDE_MS)
      const t2 = setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), SETTLE_MS)
      return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
    }
    let t1
    const t0 = setTimeout(() => {
      if (performance.now() - _lastOpenAt < 150) {   // another card just opened
        setGrown(false)
        setMounted(false)                            // instant, no shrink animation
        return
      }
      setGrown(false)
      t1 = setTimeout(() => setMounted(false), SHRINK_MS)
    }, 0)
    return () => { clearTimeout(t0); clearTimeout(t1) }
  }, [open])
  return { mounted, grown }
}

function Expando({ grown, children }) {
  return (
    <div className={`card-expando${grown ? ' is-grown' : ''}`}>
      <div className="card-expando-inner">{children}</div>
    </div>
  )
}

// "새 자산 등록" — the first card on the Assets tab (normal, un-searched state).
// Opens inline with the same form as Edit; number + name are required to save.
function NewAssetCard({ onCreate, classOptions, draft, onDraftDone }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  const cardRef = useRef(null)
  const { mounted, grown } = useCardGlide(open, cardRef)
  // A scanned-but-unknown number arrives as `draft`: open with it filled in, and
  // consume it right away so a later remount can't re-apply a stale draft.
  useEffect(() => {
    if (draft) { setForm((f) => ({ ...f, ...draft })); setOpen(true); onDraftDone?.() }
  }, [draft])
  function done() {
    setForm({}); setOpen(false)
  }
  function save() {
    if (onCreate(form)) done()
  }
  return (
    <div ref={cardRef} className={`asset-row${open ? ' is-open' : ''}`}>
      <div className="asset-row-head" role="button" tabIndex={0} onClick={() => (open ? done() : setOpen(true))}>
        <div className="asset-photo"><Plus size={24} weight="bold" color={BRAND} /></div>
        <div className="asset-row-open">
          <div className="asset-row-main"><strong>새 자산 등록</strong></div>
        </div>
      </div>
      {mounted && (
        <Expando grown={grown}>
          <div className="asset-row-body">
            <div className="asset-edit">
              <div className="action-row">
                <button type="button" className="amber-btn" onClick={save}>Save</button>
                <Button variant="secondary" size="md" style={ACTION_BTN} onClick={done}>Cancel</Button>
              </div>
              {EDIT_FIELDS.map((field) => (
                <EditField key={field.key} field={field} form={form} setForm={setForm} classOptions={classOptions} />
              ))}
            </div>
          </div>
        </Expando>
      )}
    </div>
  )
}

function AssetListPage({ query, setQuery, assets, expandedId, setExpandedId, myListSet, myPhotos, toggleMyList, onCapture, onCaptureSlot, recordAction, updateAsset, locationPhoto, records, sort, setSort, onCreate, onAddAll, classOptions, draft, onDraftDone }) {
  return (
    <div className="stack">
      <Card>
        {/* No autoFocus: opening the Assets tab must not pop the keyboard up. */}
        <SearchBox query={query} setQuery={setQuery} placeholder="asset number, name, location" />
      </Card>
      <div className="list-toolbar">
        <span className="list-count">
          총 {assets.length}개
          <button type="button" className="sort-btn add-all" onClick={() => onAddAll(assets.map((a) => a.assetId))}>전체추가</button>
        </span>
        <SortBar sort={sort} setSort={setSort} />
      </div>
      <div className="result-list result-list-full">
        {!query.trim() && <NewAssetCard onCreate={onCreate} classOptions={classOptions} draft={draft} onDraftDone={onDraftDone} />}
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
            classOptions={classOptions}
          />
        ))}
      </div>
    </div>
  )
}

const EDIT_FIELDS = [
  { key: 'assetId', label: 'Asset number', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'location', label: 'Location', options: 'location' },
  { key: 'type', label: 'Type', options: 'type' },
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
  // The photo is the card's whole left section (flush, like the +/- square on the
  // right). In My List it doubles as the camera hitbox for the guided photos.
  if (inMyList) {
    // Pending shot wins; otherwise the asset's whole-photo fills the section like
    // a profile picture. The camera icon only shows when there's no photo at all.
    const src = shots?.sticker || asset.photo1 || asset.photo2
    return (
      <button type="button" className={`asset-photo is-photo${shots ? ' has-shot' : ''}`} title="사진 촬영" onClick={(e) => { e.stopPropagation(); onCapture() }}>
        {src ? <img src={src} alt="" /> : <CameraPlus size={24} weight="fill" color={PHOTO_COLOR} />}
      </button>
    )
  }
  return (
    <div className="asset-photo">
      {(asset.photo1 || asset.photo2)
        ? <img src={asset.photo1 || asset.photo2} alt="" />
        : <Images size={22} weight="fill" color="#c2c8d2" />}
    </div>
  )
}

// Full-screen photo viewer (tap the backdrop or × to close).
function ImageViewer({ src, onClose }) {
  return (
    <div className="viewer-backdrop" onClick={onClose}>
      <img src={src} alt="" className="viewer-img" />
      <button type="button" className="viewer-close" title="닫기" onClick={onClose}>
        <X size={22} weight="bold" color="#ffffff" />
      </button>
    </div>
  )
}

// Minimal photo editor: rotate 90° + drag-to-crop. Edits happen on a full-
// resolution offscreen canvas; the visible canvas is just a scaled view of it.
function PhotoEditModal({ src, onSave, onClose }) {
  const workRef = useRef(null)          // offscreen canvas — the real image state
  const viewRef = useRef(null)          // on-screen, scaled-to-fit
  const dragRef = useRef(null)
  const [rect, setRect] = useState(null)  // crop selection, in WORK pixel coords
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d').drawImage(img, 0, 0)
      workRef.current = c
      setRect(null)
      setReady(true)
    }
    img.src = src
  }, [src])

  useEffect(() => { if (ready) draw() }, [ready, rect])

  function draw() {
    const work = workRef.current
    const view = viewRef.current
    if (!work || !view) return
    const maxW = Math.min(window.innerWidth * 0.86, 680)
    const maxH = window.innerHeight * 0.52
    const s = Math.min(maxW / work.width, maxH / work.height, 1)
    view.width = Math.max(1, Math.round(work.width * s))
    view.height = Math.max(1, Math.round(work.height * s))
    const ctx = view.getContext('2d')
    ctx.drawImage(work, 0, 0, view.width, view.height)
    if (rect) {                          // darken outside the selection
      const r = { x: rect.x * s, y: rect.y * s, w: rect.w * s, h: rect.h * s }
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, 0, view.width, r.y)
      ctx.fillRect(0, r.y, r.x, r.h)
      ctx.fillRect(r.x + r.w, r.y, view.width - r.x - r.w, r.h)
      ctx.fillRect(0, r.y + r.h, view.width, view.height - r.y - r.h)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2)
    }
  }

  function toWork(e) {
    const b = viewRef.current.getBoundingClientRect()
    const s = workRef.current.width / b.width
    return { x: (e.clientX - b.left) * s, y: (e.clientY - b.top) * s }
  }
  function onDown(e) {
    if (!ready) return
    e.preventDefault()
    viewRef.current.setPointerCapture?.(e.pointerId)
    dragRef.current = toWork(e)
    setRect(null)
  }
  function onMove(e) {
    if (!dragRef.current) return
    const a = dragRef.current
    const p = toWork(e)
    const work = workRef.current
    const x = Math.max(0, Math.min(a.x, p.x))
    const y = Math.max(0, Math.min(a.y, p.y))
    const w = Math.min(work.width, Math.max(a.x, p.x)) - x
    const h = Math.min(work.height, Math.max(a.y, p.y)) - y
    if (w > 4 && h > 4) setRect({ x, y, w, h })
  }
  function onUp() { dragRef.current = null }

  function rotate() {
    const work = workRef.current
    const c = document.createElement('canvas')
    c.width = work.height
    c.height = work.width
    const ctx = c.getContext('2d')
    ctx.translate(c.width / 2, c.height / 2)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(work, -work.width / 2, -work.height / 2)
    workRef.current = c
    if (rect) setRect(null)
    else draw()                          // no state change → redraw by hand
  }

  function applyCrop() {
    if (!rect) return
    const work = workRef.current
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(rect.w))
    c.height = Math.max(1, Math.round(rect.h))
    c.getContext('2d').drawImage(work, rect.x, rect.y, rect.w, rect.h, 0, 0, c.width, c.height)
    workRef.current = c
    setRect(null)
  }

  return (
    <div className="scanner-backdrop" onClick={onClose}>
      <section className="scanner-modal" onClick={(e) => e.stopPropagation()}>
        <header className="scanner-header">
          <h2>사진 편집</h2>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </header>
        <div className="photo-edit-stage">
          <canvas
            ref={viewRef}
            className="photo-edit-canvas"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
        </div>
        <p className="muted scanner-hint">
          {rect ? '선택한 영역으로 자르려면 “자르기”를 누르세요.' : '사진 위를 드래그하면 자를 영역을 선택할 수 있습니다.'}
        </p>
        <div className="action-row scanner-actions">
          <button type="button" className="amber-btn" disabled={!ready} onClick={rotate}>
            <ArrowClockwise size={20} weight="bold" /> 회전
          </button>
          <button type="button" className="amber-btn" disabled={!rect} onClick={applyCrop}>
            <Crop size={20} weight="bold" /> 자르기
          </button>
          <button type="button" className="amber-btn" disabled={!ready}
            onClick={() => onSave(workRef.current.toDataURL('image/jpeg', 0.85))}>
            저장
          </button>
        </div>
      </section>
    </div>
  )
}

function PhotoSlot({ src, label }) {
  const [view, setView] = useState(false)
  return (
    <div className="photo-slot">
      <div className={`photo-box${src ? ' is-clickable' : ''}`} onClick={() => src && setView(true)}>
        {src ? <img src={src} alt={label} /> : <Images size={28} weight="fill" color="#c2c8d2" />}
      </div>
      <span className="photo-label">{label}</span>
      {view && <ImageViewer src={src} onClose={() => setView(false)} />}
    </div>
  )
}

function AssetRow({ asset, expanded, onToggle, inMyList, isNew, shots, onToggleMyList, onCapture, onCaptureSlot, recordAction, updateAsset, locationPhoto, records, classOptions }) {
  const [editing, setEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [editPhoto, setEditPhoto] = useState('')   // slot key being edited ('photo1'…)
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

  const rowRef = useRef(null)
  // Two-phase open/close: glide up first then grow; shrink in place then glide back.
  const { mounted, grown } = useCardGlide(expanded, rowRef)

  // After leaving edit mode the row may have moved far down — glide it back
  // under the top bar (rAF: let the collapsed layout settle first).
  function scrollBack() {
    requestAnimationFrame(() => rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function save() {
    const patch = {}
    EDIT_FIELDS.forEach((f) => { patch[f.key] = form[f.key] || '' })
    if (!updateAsset(asset.assetId, patch)) return   // invalid/duplicate — stay editing
    setEditing(false)
    scrollBack()
  }

  return (
    <div ref={rowRef} className={`asset-row${expanded ? ' is-open' : ''}${isNew ? ' is-new' : ''}`}>
      <div className="asset-row-head">
        <AssetThumb asset={asset} inMyList={inMyList} shots={shots} onCapture={onCapture} />
        <div className="asset-row-open" role="button" tabIndex={0} onClick={onToggle}>
          <div className="asset-row-main">
            <span className="mono asset-id2">
              <span>{String(asset.assetId).slice(0, 4)}</span>
              {String(asset.assetId).length > 4 && <span>{String(asset.assetId).slice(4)}</span>}
            </span>
            <strong className={asset.verifyRequested ? 'is-requested' : ''}>{asset.name || 'Unnamed asset'}</strong>
          </div>
        </div>
        <button
          type="button"
          className={`asset-add${inMyList ? ' is-on' : ''}`}
          title={inMyList ? 'My List에서 제거' : 'My List에 추가'}
          onClick={(e) => { e.stopPropagation(); onToggleMyList() }}
        >
          {inMyList ? <Minus size={22} weight="bold" color="#ffffff" /> : <Plus size={22} weight="bold" color="#ffffff" />}
        </button>
      </div>
      {mounted && (
        <Expando grown={grown}>
        <div className="asset-row-body">
          {editing ? (
            <div className="asset-edit">
              <div className="action-row">
                <button type="button" className="amber-btn" onClick={save}>Save</button>
                <Button variant="secondary" size="md" style={ACTION_BTN} onClick={() => { setForm(asset); setEditing(false); scrollBack() }}>Cancel</Button>
              </div>
              <div className="photo-row">
                {[{ slot: 'photo2', label: '자산 스티커' }, { slot: 'photo1', label: '자산 전체' }].map((p) => (
                  <div className="photo-slot" key={p.slot}>
                    <div className="photo-box">
                      {asset[p.slot] ? <img src={asset[p.slot]} alt={p.label} /> : <Images size={28} weight="fill" color="#c2c8d2" />}
                    </div>
                    <span className="photo-label">{p.label}</span>
                    <div className="slot-actions">
                      <button type="button" className="slot-btn" onClick={() => onCaptureSlot(asset.assetId, p.slot)}>다시 찍기</button>
                      <button type="button" className="slot-btn" disabled={!asset[p.slot]} onClick={() => setEditPhoto(p.slot)}>편집</button>
                      <button type="button" className="slot-btn slot-del" disabled={!asset[p.slot]} onClick={() => updateAsset(asset.assetId, { [p.slot]: '' })}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>
              {EDIT_FIELDS.map((field) => (
                <EditField key={field.key} field={field} form={form} setForm={setForm} classOptions={classOptions} />
              ))}
              <div className="action-row">
                <button type="button" className="amber-btn" onClick={scrollBack}><ArrowUp size={18} weight="bold" /> 맨 위로</button>
              </div>
            </div>
          ) : (
            <div className="detail-body">
              <div className="action-row">
                <button type="button" className="amber-btn" onClick={() => setEditing(true)}><PencilSimple size={18} weight="fill" /> Edit</button>
                <button type="button" className="amber-btn" onClick={() => setShowHistory((s) => !s)}><ClockCounterClockwise size={18} weight="fill" /> History</button>
              </div>
              <div className="asset-full-id mono">{asset.assetId}</div>
              <h3 className="asset-full-name">{asset.name || 'Unnamed asset'}</h3>
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
              <div className="photo-row">
                <PhotoSlot src={shots?.sticker || asset.photo2} label="자산 스티커" />
                <PhotoSlot src={shots?.whole || asset.photo1} label="자산 전체" />
                <PhotoSlot src={locationPhoto ? locationPhoto(asset.location) : ''} label="위치" />
              </div>
              <p>{asset.description || 'No description'}</p>
              <dl className="kv">
                <dt>Location</dt>
                <dd>{asset.location || '-'}</dd>
                <dt>User (위치변경)</dt>
                <dd>{asset.user ? String(asset.user).split('@')[0] : '-'}</dd>
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
                <dt>Edited by</dt>
                <dd>{asset.editedBy || '-'}</dd>
                <dt>Last update</dt>
                <dd>{formatDate(asset.lastUpdate) || '-'}</dd>
              </dl>
            </div>
          )}
        </div>
        </Expando>
      )}
      {editPhoto && asset[editPhoto] && (
        <PhotoEditModal
          src={asset[editPhoto]}
          onSave={(url) => { updateAsset(asset.assetId, { [editPhoto]: url }); setEditPhoto('') }}
          onClose={() => setEditPhoto('')}
        />
      )}
    </div>
  )
}

function MyListPage({ assets, expandedId, setExpandedId, myPhotos, toggleMyList, onCapture, onCaptureSlot, recordAction, updateAsset, locationPhoto, records, listName, setListName, onSave, onClear, onRequest, onImport, profile, onSaveProfile, notify, locationList, myLocation, setMyLocation, addLocation, onLocationPhoto, sort, setSort, newIds, onSeenNew, classOptions }) {
  const ids = assets.map((asset) => asset.assetId)
  const empty = !assets.length
  const [panel, setPanel] = useState('')        // '', 'takeout', 'return', 'extension'
  const [fields, setFields] = useState({ applicantName: profile?.name || '', applicantOrg: profile?.org || '' })
  const [dragOver, setDragOver] = useState(false)
  const [locOpen, setLocOpen] = useState(false)
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
    if (v) setLocNudge(false)
    if (v && !locationList.some((l) => l.name === v)) addLocation(v)
  }
  // Update / Check-in / Check-out / Extension all write the selected location onto
  // the assets, so they refuse to run without one: top-bar message + open the
  // location list + mark the field.
  const [locNudge, setLocNudge] = useState(false)
  function requireLocation(fn) {
    if (!String(myLocation || '').trim()) {
      notify('위치를 먼저 선택하세요.')
      setLocNudge(true)
      setLocOpen(true)
      return
    }
    setLocNudge(false)
    fn()
  }
  function togglePanel(type) {
    if (panel === type) { setPanel(''); return }        // closing needs no location
    requireLocation(() => setPanel(type))
  }
  // Top row (slate) — list actions. Bottom row (amber) — application forms / import.
  const rowTop = [
    { key: 'clear', label: 'Clear', Glyph: Trash, onClick: onClear, disabled: empty },
    { key: 'update', label: 'Update', Glyph: CheckCircle, onClick: () => requireLocation(() => recordAction('update', ids)), disabled: empty, cls: 'is-filled' },
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
  const locFiltered = locationList.filter((l) => !myLocation.trim() || String(l.name).toLowerCase().includes(myLocation.trim().toLowerCase()))
  const titleReq = panel && !String(listName || '').trim()
  const locReq = (locNudge || (panel && form?.placeKey)) && !String(myLocation || '').trim()
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
          <Input size="md" className={`span-rest${titleReq ? ' is-req-empty' : ''}`} value={listName} placeholder="목록 이름" onChange={(event) => setListName(event.target.value)} />
          <span className="mylist-icon-cell"><MapPin size={18} weight="fill" color={BRAND} /></span>
          <span className="loc-input-wrap">
            <input
              className={`loc-input${locReq ? ' is-req-empty' : ''}`}
              value={myLocation}
              placeholder="위치 검색·선택 또는 새 위치"
              onFocus={() => setLocOpen(true)}
              onChange={(event) => { setMyLocation(event.target.value); setLocOpen(true) }}
              onBlur={(event) => { commitLocation(event.target.value); setTimeout(() => setLocOpen(false), 120) }}
            />
            {String(myLocation || '') !== '' && (
              <button type="button" className="loc-clear" title="지우기"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setMyLocation(''); setLocOpen(true) }}>
                <X size={14} weight="bold" color={BRAND} />
              </button>
            )}
          </span>
          {/* Browse the location list WITHOUT focusing the text field (mousedown is
              swallowed so no keyboard pops up and the input's blur logic stays out). */}
          <button
            type="button"
            className="loc-list-btn mylist-icon-cell"
            title="위치 목록 보기"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setLocOpen((o) => !o)}
          >
            <ListDashes size={18} weight="fill" color={BRAND} />
          </button>
        </div>
        {!locOpen && (
          <>
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
          </>
        )}
      </Card>
      {locOpen ? (
        <div className="result-list result-list-full">
          {locFiltered.length === 0 && (
            <Card><p className="muted">{locationList.length ? '일치하는 위치가 없습니다.' : '등록된 위치가 없습니다.'}{String(myLocation).trim() ? ` 입력한 "${String(myLocation).trim()}" 이름으로 새 위치가 등록됩니다.` : ''}</p></Card>
          )}
          {locFiltered.map((l) => (
            <Card key={l.name}>
              <button
                type="button"
                className={`loc-row loc-pick-row${String(myLocation).trim() === l.name ? ' is-sel' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setMyLocation(l.name); commitLocation(l.name); setLocOpen(false) }}
              >
                <span className="asset-thumb is-photo loc-thumb">
                  {l.photo ? <img src={l.photo} alt="" /> : <CameraPlus size={22} weight="fill" color={PHOTO_COLOR} />}
                </span>
                <span className="loc-main">
                  <strong>{l.name}</strong>
                  <span className="history-meta">{l.count}개 물품{l.lastUpdate ? ` · 최근변경 ${formatDate(l.lastUpdate)}` : ''}</span>
                </span>
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="list-toolbar">
            <span className="list-count">총 {assets.length}개</span>
            <SortBar sort={sort} setSort={setSort} withAdded />
          </div>
          <div className="result-list result-list-full">
            {empty && <Card><p className="muted">My List가 비어 있습니다.</p></Card>}
            {assets.map((asset) => (
              <AssetRow
                key={asset.assetId}
                asset={asset}
                expanded={expandedId === asset.assetId}
                onToggle={() => { onSeenNew?.(asset.assetId); setExpandedId(expandedId === asset.assetId ? '' : asset.assetId) }}
                inMyList
                isNew={newIds?.has(asset.assetId)}
                shots={myPhotos[asset.assetId]}
                onToggleMyList={() => toggleMyList(asset.assetId)}
                onCapture={() => onCapture(asset.assetId)}
                onCaptureSlot={onCaptureSlot}
                recordAction={recordAction}
                updateAsset={updateAsset}
                locationPhoto={locationPhoto}
                records={records}
                classOptions={classOptions}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RecordsPage({ records, assets, myListSet, toggleMyList, onAdd, onRemove, isAdmin, onDelete, onRename }) {
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
      <Card>
        <SearchBox query={query} setQuery={setQuery} placeholder="제목 · 작성자 · 자산번호 검색" />
      </Card>
      {filtered.length === 0 && <Card><p className="muted">{records.length ? '검색 결과가 없습니다.' : '저장된 기록이 없습니다.'}</p></Card>}
      {filtered.map((record) => (
        <HistoryCard
          key={record.id}
          record={record}
          assetMap={assetMap}
          myListSet={myListSet}
          isAdmin={isAdmin}
          open={openId === record.id}
          onToggle={() => setOpenId(openId === record.id ? '' : record.id)}
          onAdd={onAdd}
          onRemove={onRemove}
          onDelete={onDelete}
          onRename={onRename}
          toggleMyList={toggleMyList}
        />
      ))}
    </div>
  )
}

function HistoryCard({ record, assetMap, myListSet, isAdmin, open, onToggle, onAdd, onRemove, onDelete, onRename, toggleMyList }) {
  const cardRef = useRef(null)
  // Two-phase open/close: glide up first then grow; shrink in place then glide back.
  const { mounted, grown } = useCardGlide(open, cardRef)
  return (
    <div ref={cardRef}>
      <Card>
        <div className="history-row">
          <button type="button" className="history-info" onClick={onToggle}>
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
        </div>
        {mounted && (
          <Expando grown={grown}>
          <div className="loc-detail">
            <div className="class-admin-row">
              <button type="button" className="class-admin-btn" onClick={() => onAdd(record)}><Plus size={16} weight="bold" /> 추가</button>
              <button type="button" className="class-admin-btn" onClick={() => onRemove(record)}><Minus size={16} weight="bold" /> 제거</button>
              {isAdmin && (
                <button type="button" className="class-admin-btn" onClick={() => onRename(record.id)}><PencilSimple size={16} weight="fill" /> 이름</button>
              )}
              {isAdmin && (
                <button type="button" className="class-admin-btn danger" onClick={() => onDelete(record.id)}><Trash size={16} weight="fill" /> 삭제</button>
              )}
            </div>
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
          </Expando>
        )}
      </Card>
    </div>
  )
}

// Field config per classification kind.
const CLASS_CONFIG = {
  location: {
    field: 'location',
    createLabel: '새 위치 등록',
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
    createLabel: '새 타입 등록',
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
          onCreate={props.onCreateLocation}
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
          onCreate={props.onCreateType}
        />
      )}
    </div>
  )
}

// "새 위치/타입 등록" — same pattern as the new-asset card; name is required.
function NewClassCard({ cfg, onCreate }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  function save() {
    if (onCreate(form)) { setForm({}); setOpen(false) }
  }
  return (
    <div className={`asset-row${open ? ' is-open' : ''}`}>
      <div className="asset-row-head" role="button" tabIndex={0} onClick={() => setOpen((o) => !o)}>
        <div className="asset-photo"><Plus size={24} weight="bold" color={BRAND} /></div>
        <div className="asset-row-open">
          <div className="asset-row-main"><strong>{cfg.createLabel}</strong></div>
        </div>
      </div>
      {open && (
        <div className="asset-row-body loc-body loc-edit">
          <div className="action-row">
            <button type="button" className="amber-btn" onClick={save}>Save</button>
            <Button variant="secondary" size="md" style={ACTION_BTN} onClick={() => { setForm({}); setOpen(false) }}>Cancel</Button>
          </div>
          {cfg.editFields.map((x) => (
            <label key={x.k}>
              {x.l}
              {x.area ? (
                <textarea className="edit-textarea" value={form[x.k] || ''} onChange={(e) => setForm((c) => ({ ...c, [x.k]: e.target.value }))} />
              ) : (
                <Input
                  size="md"
                  className={x.k === 'name' && !String(form.name || '').trim() ? 'is-req-empty' : undefined}
                  value={form[x.k] || ''}
                  placeholder={x.ph || ''}
                  onChange={(e) => setForm((c) => ({ ...c, [x.k]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function ClassPage({ cfg, classList, assets, myListSet, isAdmin, onUpdate, onMerge, onDelete, onPhoto, onAddAll, toggleMyList, onCreate }) {
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
        <SearchBox query={query} setQuery={setQuery} placeholder={cfg.searchPlaceholder} />
      </Card>
      {!query.trim() && <NewClassCard cfg={cfg} onCreate={onCreate} />}
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
  const cardRef = useRef(null)
  useEffect(() => { setForm(initForm()) }, [rec.name, rec.address, rec.description, rec.memo])
  useEffect(() => { if (!open) setEditing(false) }, [open])
  // Two-phase open/close: glide up first then grow; shrink in place then glide back.
  const { mounted, grown } = useCardGlide(open, cardRef)
  function saveEdit() {
    const patch = { ...form, name: (form.name || '').trim() || rec.name }
    onUpdate(rec.name, patch)
    setEditing(false)
  }
  return (
    <div ref={cardRef} className={`asset-row${open ? ' is-open' : ''}`}>
      <div className="asset-row-head">
        <button type="button" className="asset-photo is-photo" title="사진 촬영" onClick={() => onPhoto(rec.name)}>
          {rec.photo ? <img src={rec.photo} alt="" /> : <CameraPlus size={24} weight="fill" color={PHOTO_COLOR} />}
        </button>
        <button type="button" className="asset-row-open" onClick={onToggle}>
          <span className="loc-main">
            <strong>{rec.name}</strong>
            <span className="history-meta">{rec.count}개 물품{rec.lastUpdate ? ` · 최근변경 ${formatDate(rec.lastUpdate)}` : ''}</span>
          </span>
        </button>
      </div>
      {mounted && editing && isAdmin && (
        <Expando grown={grown}>
        <div className="asset-row-body loc-body loc-edit">
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
        </Expando>
      )}
      {mounted && !editing && (
        <Expando grown={grown}>
        <div className="asset-row-body loc-body">
          {isAdmin && (
            <div className="class-admin-row">
              <button type="button" className="class-admin-btn" onClick={() => setEditing(true)}><PencilSimple size={16} weight="fill" /> 편집</button>
              <button type="button" className="class-admin-btn" onClick={() => onMerge(rec.name)}><ArrowsMerge size={16} weight="fill" /> 병합</button>
              <button type="button" className="class-admin-btn danger" onClick={() => onDelete(rec.name)}><Trash size={16} weight="fill" /> 제거</button>
            </div>
          )}
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
        </Expando>
      )}
    </div>
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


export default App
