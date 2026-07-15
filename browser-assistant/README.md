# Swaram Browser Assistant

A production-ready Chrome Extension (Manifest V3) that lets **SwaramAI Voice
Agents control any browser dashboard** as if a human employee were using it.

```
Customer speaks  →  Voice agent decides  →  Backend  →  WebSocket  →  Extension  →  Browser
                                                       ←  structured JSON result  ←
```

The extension exposes **generic browser tools** (click, type, read, screenshot,
…) over a secure, persistent WebSocket. The backend LLM chains them to drive a
dashboard even when no public API exists. It ships with **Swaram-dashboard
helpers** out of the box, but the architecture is vendor-agnostic: supporting a
new customer dashboard means adding a workflow module, not changing the core.

## Highlights

- **Generic tool API** — 50+ tools across Browser, Navigation, Actions, Inputs,
  Files, Reading, Vision, Forms, State, Misc. Every call returns the same JSON
  envelope; never plain text.
- **AI-friendly locators** — pass a CSS selector *or* text/aria/role/xpath. The
  engine cascades through strategies so the agent doesn't need exact selectors.
- **Error recovery** — failed clicks retry via text → ARIA → XPath before
  returning a screenshot. Never silently fails.
- **Persistent WebSocket** — auto-reconnect with backoff, 30 s heartbeat,
  `chrome.alarms` keep-alive for MV3 service-worker suspension.
- **Secure by default** — credentials encrypted at rest (AES-GCM), authenticated
  backend-only commands, redacted cookie values, JS-execution gating.
- **Login lifecycle** — auto-login, session verification, keep-alive, auto
  re-login on expiry, logout.
- **Dashboard monitor** — streams campaign/call status, errors, completion %.
- **Debug panel** — live status, current URL/page, last action/error, action
  history, rellogin/reconnect/screenshot buttons.
- **Swaram helpers** — create/pause/resume/delete campaigns, single calls,
  customer search, reports, navigation, monitor.
- **Typed & modern** — TypeScript, React + Tailwind popup, Vite, ESLint, Prettier.

## Folder structure

```
browser-assistant/
├── src/
│   ├── manifest.ts              # MV3 manifest (@crxjs)
│   ├── background/              # service worker
│   │   ├── index.ts             # entry: boot, message bridge, monitor
│   │   ├── ws-client.ts         # persistent WebSocket + reconnect + heartbeat
│   │   ├── dispatcher.ts        # route execute → background/content tool
│   │   ├── auth.ts              # login/logout + keep-alive re-login
│   │   ├── state.ts             # runtime state mirror + popup subscribe
│   │   └── action-history.ts    # action history ring buffer
│   ├── content/                 # content script (DOM)
│   │   ├── index.ts             # register tools, answer executeTool
│   │   └── error-recovery.ts    # locator cascade + screenshot-on-fail
│   ├── tools/                   # generic tool registry + modules
│   │   ├── registry.ts types.ts index.ts
│   │   ├── browser.ts navigation.ts actions.ts inputs.ts
│   │   ├── reading.ts forms.ts state.ts misc.ts vision.ts files.ts
│   ├── swaram/                  # Swaram-dashboard helpers (compose tools)
│   │   ├── index.ts nav.ts auth.ts calls.ts campaigns.ts monitor.ts
│   ├── popup/                   # React + Tailwind UI
│   │   ├── index.html main.tsx App.tsx styles.css
│   │   └── components/ LoginForm.tsx DebugPanel.tsx ActionHistory.tsx
│   ├── lib/                     # crypto, storage, messaging, logger, result, dom
│   └── types/protocol.ts        # shared WS + runtime message types
├── samples/backend-client/      # reference Python server + demo
├── docs/                        # WEBSOCKET_PROTOCOL.md, TOOL_API.md
├── scripts/                     # gen-icons.mjs, zip.mjs
├── public/icons/                # generated icons
├── INSTALL.md  README.md  package.json  tsconfig.json  vite.config.ts
└── tailwind.config.js  postcss.config.js  .eslintrc.cjs  .prettierrc
```

## Quick start

```bash
npm install
npm run build          # builds dist/
npm run zip            # optional: package .zip
```

Load `dist/` unpacked in `chrome://extensions` (Developer mode). Full steps in
[INSTALL.md](./INSTALL.md).

## How it works

1. **Popup** collects dashboard URL + credentials + WS URL + token (encrypted).
2. **Background** opens a WebSocket to the backend and authenticates.
3. Backend sends `execute { tool, args, id }`.
4. **Dispatcher** looks up the tool:
   - `background` tools (openPage, takeScreenshot, login, cookies…) run in the
     service worker;
   - `content` tools (click, type, read, …) are forwarded to the active tab's
     content script.
5. Background tools can compose others via `ctx.run` — e.g. `swaram.login`
   calls `openPage → type → click → currentUrl` to verify.
6. The result (JSON envelope, with screenshot on failure) is sent back as
   `response { id, result }`.

Because helpers are just tools that compose primitives, **adding a new
dashboard** (a CRM, ERP, hospital portal, government site) means adding a
`src/<vendor>/` module exporting `ToolDef[]` and registering it in
`src/<vendor>/index.ts` — no core changes. Only the workflows change.

## Documentation

- [INSTALL.md](./INSTALL.md) — build, load, configure, harden
- [docs/WEBSOCKET_PROTOCOL.md](./docs/WEBSOCKET_PROTOCOL.md) — full message spec
- [docs/TOOL_API.md](./docs/TOOL_API.md) — every tool, args, returns
- [samples/backend-client/](./samples/backend-client/) — reference Python server

## Security notes

Credentials are encrypted at rest with AES-GCM. Like any browser extension, the
wrapping key lives in `chrome.storage.local`; for higher assurance, set a master
passphrase (`setMasterPassphrase`) so the key is derived from a value that is
never persisted, or front it with an operator login. Only authenticated backend
commands execute; cookie values are redacted; `runJavascript` is policy-gated.
See the hardening checklist in [INSTALL.md](./INSTALL.md).

## License

Proprietary — Swaram AI.
