# Handoff: Swaram Browser Assistant → Antigravity

This document is a complete briefing so an Antigravity agent can pick up the
Swaram Browser Assistant work, finish wiring it into the live server, push, and
run the end-to-end flow. Read it top to bottom. A copy-paste **Antigravity
prompt** is at the very bottom.

---

## 1. What this project is

SwaramAI runs voice agents (LiveKit + Gemini) that call customers. Today the
voice agents can't *do* anything in a browser dashboard — they can only talk.
The **Swaram Browser Assistant** is a Chrome Extension (Manifest V3) that turns
any browser dashboard into a set of **callable tools** the voice agent can
invoke. The agent decides an action → backend sends a command over WebSocket →
the extension performs the browser operation → returns structured JSON.

```
Customer speaks → Voice agent decides → server.py → WebSocket → Chrome Extension → Browser
                                  ↑                      structured JSON result ←
```

It ships with **Swaram-dashboard helpers** but the architecture is generic —
supporting a new customer dashboard (hotel CRM, hospital ERP, gov portal) means
adding a workflow module, not changing the core.

---

## 2. Repo layout (what exists today)

Two relevant trees live in the same repo (`c:\Users\chris\Documents\outbound-pro`):

### 2a. The Chrome Extension — `browser-assistant/`
Production-ready, TypeScript + React + Tailwind + Vite, **builds and lints clean**.

```
browser-assistant/
├── src/
│   ├── manifest.ts                 # MV3 manifest (@crxjs/vite-plugin)
│   ├── background/                 # SERVICE WORKER (the brain)
│   │   ├── index.ts                # boot: registers tools, starts WS, keep-alive, msg bridge
│   │   ├── ws-client.ts            # persistent WebSocket: auth, 30s heartbeat, auto-reconnect
│   │   ├── dispatcher.ts           # routes `execute` → background tool OR forwards to content
│   │   ├── auth.ts                 # login/logout + session keep-alive + auto re-login
│   │   ├── state.ts                # runtime state mirror; popup reads via getState
│   │   └── action-history.ts       # ring buffer of recent actions
│   ├── content/                    # CONTENT SCRIPT (runs in the dashboard page)
│   │   ├── index.ts                # registers DOM tools, answers executeTool messages
│   │   └── error-recovery.ts       # locator cascade + screenshot-on-fail
│   ├── tools/                      # GENERIC TOOL REGISTRY (the reusable primitives)
│   │   ├── registry.ts types.ts index.ts
│   │   ├── browser.ts              # openPage/refresh/back/forward/currentUrl/getCookies/takeScreenshot/login/logout/getTitle/getHTML
│   │   ├── navigation.ts           # findButton/findLink/findInput/findElement/scroll/scrollTo/wait
│   │   ├── actions.ts              # click/doubleClick/rightClick/hover/focus/blur
│   │   ├── inputs.ts               # type/clear/select/check/uncheck/radio
│   │   ├── reading.ts              # readText/readAllText/extractTable/extractCards/extractForm/extractErrors
│   │   ├── forms.ts                # fillForm/submit/cancel
│   │   ├── state.ts                # pageReady/isVisible/isEnabled/exists
│   │   ├── vision.ts               # highlight/annotate/clearHighlights
│   │   ├── misc.ts                 # copy/paste/pressKey/runJavascript
│   │   └── files.ts                # upload (content) + download/downloadStatus (background)
│   ├── swaram/                     # SWARAM-SPECIFIC HELPERS (compose generic tools)
│   │   ├── index.ts                # registers all swaram.* tools
│   │   ├── nav.ts                  # openDashboard/openCampaigns/openCalls/openSingleCall/...
│   │   ├── auth.ts                 # swaram.login (knows /login + swaram-email/swaram-pass)
│   │   ├── calls.ts                # createSingleCall/deleteCall/searchCustomer/openCustomer/viewNotes/downloadReports
│   │   ├── campaigns.ts            # createCampaign/createBulkCampaign/pause/resume/deleteCampaign
│   │   └── monitor.ts              # dashboard status snapshot (campaigns/calls/errors/completion%)
│   ├── popup/                      # REACT + TAILWIND UI
│   │   ├── index.html main.tsx App.tsx styles.css
│   │   └── components/ LoginForm.tsx DebugPanel.tsx ActionHistory.tsx
│   ├── lib/                        # shared utilities
│   │   ├── crypto.ts               # AES-GCM encrypt/decrypt for stored credentials
│   │   ├── storage.ts              # chrome.storage wrapper (save/load credentials + tenantId)
│   │   ├── messaging.ts            # chrome.runtime/tabs typed messaging + on-demand content injection
│   │   ├── dom.ts                  # ★ the resilient element resolver (CSS→text→aria→role→xpath)
│   │   ├── logger.ts               # buffered logger → forwarded to backend as `logs`
│   │   └── result.ts               # ToolResponse envelope factories + measure()
│   └── types/protocol.ts           # ★ shared WS + runtime message types (extension ↔ backend)
├── samples/backend-client/         # standalone reference Python WS server + demo
├── docs/                           # WEBSOCKET_PROTOCOL.md, TOOL_API.md
├── scripts/                        # gen-icons.mjs, zip.mjs (dependency-free)
├── public/icons/                   # generated placeholder icons
├── INSTALL.md  README.md  package.json  tsconfig.json  vite.config.ts
└── tailwind.config.js  postcss.config.js  .eslintrc.cjs  .prettierrc
```

### 2b. The backend integration — `server.py` (existing FastAPI app)
The `SwaramExtensionBridge` was merged into the main FastAPI app so the
WebSocket endpoint runs on the **same port (8000)** as LiveKit/Voice/dashboard
routes. See §4.

---

## 3. How the extension works (code explanation)

### The tool registry — the core abstraction
Every browser capability is a `ToolDef` (`src/tools/types.ts`): a name, a
description, an execution **context** (`background` or `content`), and an async
handler. Tools are registered into a global map (`registry.ts`).

- **`background` tools** run in the service worker: they own `chrome.*` APIs
  (tabs, cookies, `captureVisibleTab`, downloads). No DOM.
- **`content` tools** run in the dashboard page: they own the DOM.

The **dispatcher** (`background/dispatcher.ts`) receives an `execute` command,
looks up the tool, and either runs it in-process (background) or forwards it to
the active tab's content script via `chrome.tabs.sendMessage`. This split is
invisible to the caller — the backend just calls tools by name.

### Resilient locators (the "AI-friendly" part)
`src/lib/dom.ts` `resolveElement(locator)` accepts a CSS selector **or** an
object (`{selector, text, role, name, ariaLabel, xpath, index, timeout}`). If
the first strategy misses, it cascades through the others automatically. So the
LLM doesn't need exact selectors — it can say "click the Save button" and the
engine finds it by text/ARIA/XPath. On failure, a screenshot is attached. This
is the **never-silently-fail** guarantee and the error-recovery layer
(`content/error-recovery.ts`) formalizes the cascade.

### Tool composition (helpers are just tools)
`swaram.*` helpers run in the **background** context and call other tools via
`ctx.run(tool, args)`. Because `ctx.run` re-enters the dispatcher, a helper can
freely mix background tools (`openPage`) and content tools (`type`, `click`).
Example: `swaram.login` = `openPage(/login) → type(email) → type(password) → click(submit) → currentUrl(verify)`.

### The WebSocket client (`background/ws-client.ts`)
- Connects to the configured `wsUrl`, sends `authenticate` with token +
  `extensionId` + `tenantId` + version.
- 30s heartbeat (`chrome.alarms` fallback keeps the MV3 service worker alive).
- Exponential-backoff reconnect (1s → 30s cap) + jitter.
- Forwards `execute`/`cancel` to the dispatcher; sends `response`/`monitor`/
  `status`/`logs`/`pong` back.

### The response envelope (never plain text)
Every tool returns `ToolResponse` (`types/protocol.ts`):
```json
{ "success": true, "tool": "click", "time": 120, "data": { ... } }
{ "success": false, "tool": "click", "time": 240, "reason": "Button not found",
  "code": "not_found", "screenshot": "data:image/png;base64,..." }
```

### The popup (`src/popup/`)
React + Tailwind. First run → `LoginForm` collects dashboard URL, email,
password (AES-GCM encrypted at rest via `lib/crypto.ts`), backend WS URL,
backend token, and an optional **Tenant/Extension ID**. Then `DebugPanel` shows
live status (connected, logged in, current URL/page, last action/error) with
Relogin / Logout / Reconnect / Screenshot buttons, plus `ActionHistory`.

---

## 4. Backend integration (`server.py`) — what was merged

A `SwaramExtensionBridge` singleton + WebSocket route now live in `server.py`
(inserted right after the `_shutdown` hook, ~line 125). It was just upgraded to
support **MULTIPLE simultaneous extensions**.

### Key pieces
- `_ExtensionConnection` — one live WebSocket + its per-connection state
  (target id, tenant_id, extension_id, pending futures, last monitor/status).
- `SwaramExtensionBridge` — registry of connections keyed by **target** =
  `tenantId` (preferred) → `extensionId` → generated session id.
  - `attach(ws)` — accept, run receive loop, handle `authenticate`
    (verifies `SWARAM_EXTENSION_TOKEN`, replies `authenticated`/`unauthorized`,
    registers under the target; replaces any old connection for the same target).
  - `execute(tool, args, timeout, target=None)` — routes to a specific extension.
    If `target` omitted: uses the only connection, or returns an error listing
    available targets when multiple are connected.
  - `cancel(...)`, `ping(target)`, `snapshot(target)`.

### Endpoints added to the FastAPI app
| Method | Path | Purpose |
|---|---|---|
| WS | `/swaram/ws` | the endpoint Chrome extensions connect to |
| GET | `/api/extension/status?target=` | list connections or one |
| POST | `/api/extension/execute` | `{tool, args, timeout, target}` → tool result |
| POST | `/api/extension/ping` | `{target}` → `{ok}` |

### Config
`SWARAM_EXTENSION_TOKEN` env var (default `change-me`), documented in
`.env.example`. The extension popup's **Backend Auth Token** must match it.

### How other server code drives the browser
```python
from server import extension_bridge
result = await extension_bridge.execute("swaram.openCampaigns", {}, target="tenant_42")
# result is the ToolResponse dict from the extension
```

---

## 5. The WebSocket protocol (extension ↔ backend)

Full spec in `browser-assistant/docs/WEBSOCKET_PROTOCOL.md`. Summary:

- Extension → backend: `authenticate`, `response`, `status`, `monitor`, `logs`, `pong`, `error`
- Backend → extension: `authenticated`/`unauthorized`, `execute`, `cancel`, `ping`, `reload`
- Every `execute` has an `id`; the `response` echoes it (correlation).
- Heartbeat: backend can `ping`, extension replies `pong`; extension also self-heartbeats every 30s.

---

## 6. What is DONE ✅

1. Full Chrome Extension (MV3, TS, React, Tailwind, Vite) — builds + lints clean.
2. 50+ generic tools across 10 categories + Swaram helpers — all return the uniform envelope.
3. Resilient locator cascade + screenshot-on-fail error recovery.
4. Persistent WebSocket (auth, heartbeat, reconnect, MV3 keep-alive).
5. Encrypted credential storage + login lifecycle (auto-login, keep-alive, re-login).
6. Dashboard monitor stream.
7. React popup with live debug panel + action history.
8. Backend `SwaramExtensionBridge` merged into `server.py` with **multi-extension** support.
9. HTTP convenience endpoints (`/api/extension/status|execute|ping`).
10. Docs: README, INSTALL, WEBSOCKET_PROTOCOL, TOOL_API.
11. Sample Python backend client (read-only smoke test — destructive demo actions removed).
12. `tenantId` plumbed end-to-end (popup config → storage → WS auth → backend routing).

## 7. What is NOT done yet (Antigravity's job) ❌

1. **Wire the voice agent (`agent.py`) to the bridge.** The voice agent should
   call `extension_bridge.execute(...)` when it decides a browser action —
   likely exposed to the model as LiveKit/agent function-call tools. This is the
   main missing piece.
2. **Push to the server / deploy.** The code is local; needs commit + push +
   deploy to the running server (Docker / `start.sh`).
3. **Run + verify the end-to-end flow** locally: dashboard up → extension
   connected → voice agent triggers a tool → browser acts → result returned.
4. **Per-tenant token hardening** (currently one shared `SWARAM_EXTENSION_TOKEN`;
   consider per-tenant tokens for production multi-tenant).
5. **Re-tune Swaram helpers** against the live dashboard if selectors drift
   (they were matched to `swaram-dashboard/` source — `/app?tab=`, `swaram-email`,
   `swaram-pass`, Single Call `name=` fields, "Dispatch Call" button).
6. Optional: extract the bridge into its own module (`extension_bridge.py`) if
   `server.py` gets unwieldy — it's currently inline for simplicity.

---

## 8. How to run the full flow locally (the goal)

```bash
# 1. Backend (FastAPI on :8000) — serves dashboard API + /swaram/ws
cd c:\Users\chris\Documents\outbound-pro
# set SWARAM_EXTENSION_TOKEN in .env (must match extension's Backend Auth Token)
./start.sh                      # or: uvicorn server:app --host 0.0.0.0 --port 8000

# 2. Dashboard (Next.js on :3000)
cd swaram-dashboard && npx next start -p 3000   # (start.sh already does this)

# 3. Build + load the extension
cd ../browser-assistant
npm install && npm run build    # -> dist/
# Chrome → chrome://extensions → Developer mode → Load unpacked → select dist/

# 4. Configure the extension (click its icon)
#    Dashboard URL:   http://localhost:3000
#    Email/Password:  your dashboard login
#    WS URL:          ws://localhost:8000/swaram/ws
#    Backend Token:   <SWARAM_EXTENSION_TOKEN value>
#    Tenant ID:       tenant_42   (optional but recommended for multi-ext)
#    → Save & Login

# 5. Verify the connection (from another terminal)
curl http://localhost:8000/api/extension/status
curl -X POST http://localhost:8000/api/extension/execute \
  -H 'Content-Type: application/json' \
  -d '{"tool":"currentUrl","target":"tenant_42"}'

# 6. Voice agent → bridge.execute(...) → browser acts → structured result
```

---

## 9. Antigravity prompt (copy-paste)

```
You are continuing work on the Swaram Browser Assistant project. Read
c:\Users\chris\Documents\outbound-pro\browser-assistant\HANDOFF_FOR_ANTIGRAVITY.md
first — it is the full briefing.

CURRENT STATE (done, builds clean):
- Chrome Extension in browser-assistant/ (MV3, TS, React, Tailwind, Vite). Build with `npm run build` in that dir; loads unpacked from dist/.
- 50+ generic browser tools + swaram.* helpers, all returning a uniform {success,tool,time,data|reason,screenshot} envelope.
- Resilient locators (CSS→text→aria→role→xpath) + screenshot-on-fail.
- Persistent WebSocket (auth, 30s heartbeat, reconnect, MV3 keep-alive).
- Backend bridge merged into server.py as SwaramExtensionBridge with MULTIPLE-extension support, exposed at WS /swaram/ws plus GET /api/extension/status, POST /api/extension/execute, POST /api/extension/ping. Token = env SWARAM_EXTENSION_TOKEN.

YOUR TASKS, in order:
1. Wire the voice agent (agent.py) to the bridge. Expose browser actions to the model as callable function/tools; when the model invokes one, call `from server import extension_bridge; await extension_bridge.execute(tool, args, target=tenant_id)` and feed the structured result back to the model. Pick a sensible default target (e.g. the tenant of the current call) and fall back to the single connected extension.
2. Commit and push the work (extension + server.py changes) to the remote on the current branch; do NOT push secrets — .env stays local. Commit message should reference "Swaram Browser Assistant: multi-extension bridge + voice-agent wiring".
3. Help me run and verify the end-to-end flow locally: start the FastAPI server (uvicorn server:app --port 8000) with SWARAM_EXTENSION_TOKEN set, start the Next.js dashboard on :3000, load the built extension from browser-assistant/dist, configure it (Dashboard URL http://localhost:3000, WS URL ws://localhost:8000/swaram/ws, Backend Token = SWARAM_EXTENSION_TOKEN, Tenant ID = tenant_42), and confirm via curl to /api/extension/status and /api/extension/execute that a tool (e.g. currentUrl, then swaram.openCampaigns) returns success.
4. Keep everything read-only during verification (no create/pause/delete). Only mutate the dashboard when I explicitly say so.

CONSTRAINTS:
- Do not change the WebSocket protocol or ToolResponse envelope — they are documented in browser-assistant/docs/.
- Keep the bridge in server.py (or extract to extension_bridge.py only if clearly cleaner, and re-import into server.py).
- Match existing code style. Run `python -m py_compile server.py` after edits. Run `npm run build` in browser-assistant/ after any extension change.
- Ask me before deploying to production or before any destructive dashboard action.

Start by reading the handoff doc and agent.py, then propose the voice-agent wiring plan before writing code.
```
