# CENS Assets Tracker

Phone-first English PWA for laboratory asset tracking. It is a static web app designed for Firebase Hosting and starts with local browser storage.

## Run Locally

Camera QR scanning requires HTTPS or localhost. For phone testing on the same network, use an HTTPS tunnel or a local HTTPS server.

Basic desktop test:

```sh
python3 -m http.server 5173 -d public
```

Open `http://localhost:5173`.

Phone camera test on the same network:

```sh
python3 dev-server.py --https --host 0.0.0.0 --port 5173
```

Open `https://YOUR_COMPUTER_LAN_IP:5173` on the phone and accept the local development certificate warning. The app itself stays static; this helper only serves files for local testing.

## Firebase Hosting

```sh
firebase deploy --only hosting
```

No Firebase credentials are stored in this app.

## Data Tabs for Future Google Sheets Backend

Create three tabs:

- `Assets`
- `Records`
- `PresetLists`

The app includes a backend URL setting for a Google Apps Script Web App URL. The current `BackendGateway` keeps local storage as the active data source and exposes clean extension points for Google Sheets sync, Google Drive photo upload, PDF generation, and Firebase Auth.
