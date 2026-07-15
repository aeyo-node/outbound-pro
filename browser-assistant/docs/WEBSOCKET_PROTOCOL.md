# WebSocket Protocol

The extension opens a **persistent WebSocket** to the Swaram backend. The
backend is the server; the extension is the client. Every frame is a single JSON
object with a `type` field. All messages are UTF-8 JSON.

## Connection lifecycle

1. Extension connects to the configured `wsUrl` (popup → Backend WebSocket URL).
2. Extension sends `authenticate` with the configured `backendToken`.
3. Backend replies `authenticated` (session established) or `unauthorized`
   (extension stops retrying until credentials are fixed).
4. Either side may send `ping`; the other replies `pong`. The extension
   heartbeats every 30 s and forces a reconnect if two heartbeats are missed.
5. The extension auto-reconnects with exponential backoff + jitter
   (1 s → 30 s cap). A `chrome.alarms` heartbeat re-establishes the socket if
   Chrome has suspended the MV3 service worker.

## Message envelopes

### Extension → Backend

#### `authenticate`
```json
{ "type": "authenticate", "token": "<backendToken>",
  "extensionId": "<chrome runtime id>", "version": "1.0.0" }
```

#### `response`  (result of an `execute`)
```json
{ "type": "response", "id": "<correlation id>",
  "result": { "success": true, "tool": "click", "time": 120, "data": { ... } } }
```
On failure `result` carries `reason`, optional `code`, `trace`, and `screenshot`
(base64 data URL).

#### `status`  (periodic snapshot)
```json
{ "type": "status", "connected": true, "loggedIn": true,
  "currentUrl": "https://app.swaram.io/app?tab=campaigns",
  "currentPage": "app?tab=campaigns", "lastAction": "click → ok",
  "lastError": null, "ts": 1700000000000 }
```

#### `monitor`  (dashboard monitor tick, every ~30 s)
```json
{ "type": "monitor", "campaigns": [[...rows...]], "calls": [[...]],
  "errors": [], "completionPct": 73, "disconnected": 0, "failed": 2,
  "url": "https://app.swaram.io/app", "ts": 1700000000000 }
```

#### `logs`
```json
{ "type": "logs", "level": "info", "message": "WS: open — authenticating",
  "ts": 1700000000000, "traceId": "optional" }
```

#### `pong`
```json
{ "type": "pong", "ts": 1700000000000 }
```

#### `error`  (protocol-level)
```json
{ "type": "error", "code": "bad_args", "message": "Missing required argument: phone" }
```

### Backend → Extension

#### `execute`  (run a tool)
```json
{ "type": "execute", "id": "<correlation id>", "tool": "click",
  "args": { "selector": "#save" }, "timeout": 30000, "traceId": "call-123" }
```
The extension echoes `id` in the `response`. `timeout` is optional (default
30 s). `traceId` is optional and surfaces in `logs`.

#### `cancel`
```json
{ "type": "cancel", "id": "<execute id>", "reason": "user interrupted" }
```
Best-effort: the in-flight tool is flagged cancelled; the eventual `response`
includes `"cancelled": true`.

#### `ping`
```json
{ "type": "ping", "ts": 1700000000000 }
```
Extension replies `pong` and resets its heartbeat clock.

#### `authenticated` / `unauthorized`
```json
{ "type": "authenticated", "sessionId": "s-1700000000" }
{ "type": "unauthorized", "reason": "bad token" }
```

#### `reload`  (ops)
```json
{ "type": "reload" }
```
Calls `chrome.runtime.reload()` — handy during development.

## Security

- The extension only acts on `execute` commands after a successful
  `authenticate`. Unknown origins are rejected by the browser (only the
  configured `wsUrl` is reachable).
- `backendToken` is stored encrypted at rest (AES-GCM). See `src/lib/crypto.ts`.
- Cookie values returned by `getCookies` are redacted to a 4-char preview.
- `runJavascript` is gated by `window.__SWARAM_ALLOW_JS__` and can be disabled.
- CSP restricts `connect-src` to the extension origin plus `wss/ws/http/https`.
  Narrow this in production to your backend host only.

## Correlation & timeouts

Every `execute` has a server-generated `id`. The extension routes the result
back with the same `id`. If the tool exceeds `timeout`, the extension returns a
failure result with `code: "timeout"` and sends a `cancel` is implicit. The
backend sample client (`samples/backend-client/client.py`) shows
future-based correlation with `asyncio.wait_for`.
