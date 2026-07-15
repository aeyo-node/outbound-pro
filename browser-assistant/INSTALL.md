# Installation

## Prerequisites

- Node.js 18+ and npm
- Google Chrome 116+ (or any Chromium MV3 browser)

## Build

```bash
cd browser-assistant
npm install
npm run build        # type-check + production build into dist/
```

The built, loadable extension is in `dist/`. To package for the Web Store:

```bash
npm run zip          # -> swaram-browser-assistant.zip
```

## Load the unpacked extension (development)

1. `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top-right)
4. Click **Load unpacked** and select the `browser-assistant/dist` folder
5. Pin the **Swaram Browser Assistant** icon to the toolbar

## Configure

1. Click the extension icon to open the popup.
2. Enter:
   - **Swaram Dashboard URL** — e.g. `https://app.swaram.io` (or `http://localhost:3000` for dev)
   - **Email** / **Password** — dashboard credentials (encrypted at rest with AES-GCM)
   - **Backend WebSocket URL** — `wss://your-backend/swaram/ws`
   - **Backend Auth Token** — token the extension presents to your backend
3. Click **Save & Login**. The extension opens the dashboard, logs in,
   verifies the session, and connects the WebSocket.

The popup's **Status** panel shows live connection/login state, current URL,
last action/error, and offers **Relogin**, **Logout**, **Reconnect WS**, and
**Screenshot** buttons.

## Run the sample backend

```bash
cd samples/backend-client
pip install websockets
python client.py          # listens on ws://0.0.0.0:8787
```

Point the extension's WebSocket URL at `ws://<host>:8787` and use token
`change-me`. The demo exercises every tool.

## Development workflow

```bash
npm run dev              # Vite dev server with HMR for the popup UI
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run format           # Prettier
```

After changing background/content code, rebuild and reload the extension on
`chrome://extensions` (or use the `reload` WebSocket command from the backend).

## Production hardening checklist

- Replace the placeholder icons in `public/icons/` with branded art.
- Narrow `host_permissions` in `src/manifest.ts` to your dashboard + backend.
- Tighten the CSP `connect-src` to your backend host only.
- Set a master passphrase (`setMasterPassphrase` in `src/lib/crypto.ts`) so the
  credential key is never persisted, or wire it to an operator login.
- Disable `runJavascript` by setting `window.__SWARAM_ALLOW_JS__ = false` on
  page init if your voice agent never needs it.
- Issue per-tenant `backendToken`s from your auth server; rotate on schedule.
