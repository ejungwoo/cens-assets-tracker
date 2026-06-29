# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

CENS Assets Tracker — a phone-first PWA for laboratory asset tracking (English/Korean). It is a fully client-side app: all runtime data lives in browser `localStorage` under `cens.*` keys. There is no live backend; ports 8040 / "Backend" are reserved for future API work.

## Two parallel implementations

This repo contains **two separate front-ends for the same product**, sharing only the seed data and `localStorage` model. Know which one you are editing.

1. **Vanilla static PWA — `public/`** (the original; `public/app.js`, ~2.4k lines)
   - Plain JS, no build step. Has a `BackendGateway` class wrapping `LocalStore`, a service worker (`public/service-worker.js`), Firebase auth via the `firebase-*-compat` CDN scripts, and i18n as inline string tables.
   - `BackendGateway.{syncWithGoogleSheets,uploadPhotoToDrive,generateDocument,prepareAuth}` are deliberate stubs — the documented extension points for future Google Sheets sync / Drive upload / PDF / Firebase Auth.
   - Served by `dev-server.py` and deployed by Firebase Hosting (`firebase.json` → `"public": "public"`).

2. **LILAK UI React app — `src-lilak/`** (newer; `App.jsx` ~700 lines)
   - React 19 + Vite. Root `index.html` → `src-lilak/main.jsx` → `App.jsx`. UI is built from the shared **`lilak-ui`** kit (`TopBar`, `Button`, `Card`, `DataTable`, `Icon`, theming/`applyPreset`, fonts).
   - `lilak-ui` resolves via a Vite alias to a sibling checkout `../lilak_ui/src` (override with `LILAK_UI_PATH`). It is source-distributed, not an npm package — there is no copy in `node_modules`.
   - `npm run build` outputs to `dist/` (Vite also copies everything in `public/` into the build, so `dist/` ends up containing both apps' files).

When asked to "change the app," confirm which variant. New work generally targets `src-lilak/`; `firebase.json` still deploys `public/`.

## Commands

```sh
# React (src-lilak) dev server — port 5140
npm run lilak:dev          # 127.0.0.1
npm run lilak:dev:lan      # 0.0.0.0 (phone on same LAN)
npm run build              # vite build -> dist/

# Static (public/) dev server — port 5040, HTTPS by default
./start.sh                 # backgrounds dev-server.py, writes .dev-server.pid + dev-server.log
./status.sh
./stop.sh
python3 -m http.server 5040 -d public   # quick desktop-only test, no HTTPS

# Deploy the static app
firebase deploy --only hosting
```

There is no test suite, linter, or type checker configured.

**HTTPS matters:** camera QR scanning only works over HTTPS or `localhost`. For phone testing, use the `:lan` script (React) or `dev-server.py --https` (static), then open `https://<LAN-IP>:<port>` and accept the self-signed cert. Certs live in `.devcert/` (git-ignored).

Local overrides go in `.env.local` (copy from `.env.example`; git-ignored). `start.sh`/`status.sh`/`stop.sh`/`dev-server.py` read it; `FRONTEND_PORT`, `FRONTEND_HOST`, `USE_HTTPS` are the keys that take effect.

## Data model (both apps)

- Each **project** is one asset list. Project data is keyed `cens.project.<projectId>.<assets|records|myList>`; the active project id is `cens.currentProjectId`. The default project is `LIST-default`.
- Initial assets come from `public/seed-assets.js` (`window.CENS_SEED_ASSETS`), generated from the Google Sheets "CENS Equipment" tab. Sheet fields like unit price, manufacturer/provider, acquisition date, and account holder are **separate asset fields**, not folded into `description`.
- Sign-in is Firebase email/password restricted to the `ibs.re.kr` domain (see `AUTH_ALLOWED_DOMAIN` / `normalizeEmail`).

## Portal integration (`src-lilak` only)

This service is primarily delivered through the **LILAK Service Manager portal** (`~/web_service/service_manager`, port 8025). The portal is the main way users reach it. There are two distinct deploy targets for the two apps:

- **Portal** serves the built React app — `dist/` — as a *managed, multi-project* service.
- **Firebase Hosting** serves the static `public/` app (`firebase.json`).

### How the portal runs it

The portal registers services via a manifest; this service's seed manifest lives at `service_manager/deploy/seed/asset_manager/service.json`:

```json
{ "kind": "asset", "mode": "managed",
  "start": { "cmd": "python3 -m http.server {port} --bind 0.0.0.0", "cwd": ".../asset_manager/dist" },
  "identity": { "accepts_portal_token": true, "link_by": "email" },
  "capabilities": { "multi_project": true, "import_export": false } }
```

Implications when changing the app:
- The portal runs `start.cmd` = **`sh portal-serve.sh {port}`**, which **rebuilds (`npm run build`) and then static-serves `dist/`** on the assigned port (`0.0.0.0`). So a portal **stop & start picks up source changes automatically** — no manual build needed. The rebuild is non-fatal: if npm is missing or the build fails, it falls back to serving the existing `dist/`. (`service_manager/build-all.sh` also builds it for the Docker image, where the seed manifest still serves `dist/` directly without rebuilding.)
- The dev server (`npm run lilak:dev`, port 5140) shows changes live but does **not** touch `dist/`; only a build (or a portal restart) updates what the portal serves.
- **`multi_project: true`** — each portal project is its own asset list, reached at **`/pp/asset_manager/<project>/`**. The portal injects `PORTAL_PROJECT` / `PORTAL_PROJECT_DATA` per project and, in the browser, `window.__PORTAL_BASE__ = /pp/asset_manager/<project>`.
- **`accepts_portal_token: true` (SSO)** — the portal forwards the user's portal JWT; the app reads identity from it instead of showing Firebase login.

### What the app does with that

When `window.__PORTAL_BASE__` is present the app **skips its own list-picker and Firebase login**: the portal project becomes the asset list and the portal SSO token (`lilak_portal_token` / `elog_token`) becomes the identity. See `PORTAL_BASE` / `portalUser()` / `ensureProjectState()` in `App.jsx`.

To make assets resolve under both standalone (`/`) and proxied (`/pp/<name>/<project>/`) serving, the build relies on `vite base: './'` plus a default `<base href="/">` in `index.html` that the portal overrides by injecting an earlier `<base>` tag. Don't remove either without understanding the other. (Note: per the portal's SERVICE_CONTRACT, managed services are normally API-only precisely to avoid base-path breakage; this service is a static-UI exception that works *because* of this dual-base setup.)
