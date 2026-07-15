# Tool API

Every tool returns the same envelope — **never plain text**:

```json
// success
{ "success": true, "tool": "click", "time": 120, "data": { ... } }

// failure
{ "success": false, "tool": "click", "time": 240, "reason": "Button not found",
  "code": "not_found", "screenshot": "data:image/png;base64,..." }
```

`time` is the wall-clock duration in ms. On failure, the extension attaches a
`screenshot` (base64 data URL) so the voice agent / human can see what the page
looked like.

## Locators

Most DOM tools accept a **locator** — either a CSS selector string or an object
with any of:

```json
{ "selector": "#save",
  "text": "Save",
  "role": "button",
  "name": "email",
  "ariaLabel": "Submit",
  "xpath": "//button[contains(text(),'Save')]",
  "index": 0,
  "timeout": 5000 }
```

If the primary strategy misses, the engine cascades through the others
(text → aria → role → xpath) automatically. This is the "AI friendly" guarantee:
the agent does not need exact selectors.

---

## Browser (background)
| tool | args | returns |
|---|---|---|
| `openPage` | `url`, `newTab?` | `{ url, tabId }` |
| `refresh` | `bypassCache?` | `{ url }` |
| `back` | — | `{}` |
| `forward` | — | `{}` |
| `currentUrl` | — | `{ url, title, tabId }` |
| `getTitle` | — | `{ title }` |
| `getHTML` | `selector?`, `maxChars?` | `{ html, truncated }` |
| `getCookies` | `url?` | `{ count, cookies[] }` (values redacted) |
| `takeScreenshot` | `format?`, `quality?` | `{ screenshot }` |
| `login` | `email?`, `password?`, `loginPath?` | `{ loggedIn, url }` |
| `logout` | — | `{ loggedOut }` |

## Navigation (content)
| tool | args | returns |
|---|---|---|
| `findButton` | `text`, `selector?` | `{ tag, text, role, visible, rect }` |
| `findLink` | `text` | match info |
| `findInput` | `label` | match info |
| `findElement` | locator | match info |
| `scroll` | `direction`, `amount?` | `{ scrollX, scrollY }` |
| `scrollTo` | locator | `{ visible, rect }` |
| `wait` | `ms`, `selector?` | `{ ms, found? }` |

## Actions (content)
| tool | args |
|---|---|
| `click` | locator |
| `doubleClick` | locator |
| `rightClick` | locator |
| `hover` | locator |
| `focus` | locator |
| `blur` | locator |

## Inputs (content)
| tool | args | notes |
|---|---|---|
| `type` | locator, `text`, `append?`, `delay?` | clears first unless `append` |
| `clear` | locator | |
| `select` | locator, `value` | matches by value or visible text |
| `check` / `uncheck` | locator | |
| `radio` | `name`, `value` | |

## File handling
| tool | context | args |
|---|---|---|
| `upload` | content | `selector`, `filename`, `content` (base64), `mimeType?` |
| `download` | background | `url`, `filename?` |
| `downloadStatus` | background | `id` |

## Reading (content)
| tool | args | returns |
|---|---|---|
| `readText` | `selector?` | `{ text, length }` |
| `readAllText` | — | `{ text, length }` |
| `extractTable` | `selector?` | `{ rows[][], rowCount }` |
| `extractCards` | `selector?` | `{ count, cards[] }` |
| `extractForm` | `selector?` | `{ fields[] }` (name, type, value, label) |
| `extractErrors` | — | `{ errors[], count }` |

## Vision (content/background)
| tool | args | returns |
|---|---|---|
| `takeScreenshot` | `format?` (bg) | `{ screenshot }` |
| `highlight` | locator, `seconds?` | `{ rect }` |
| `annotate` | locator, `label`, `seconds?` | `{ rect }` |
| `clearHighlights` | — | `{ cleared }` |

## Forms (content)
| tool | args |
|---|---|
| `fillForm` | `fields` = `{ "label|selector|name": value }` |
| `submit` | `texts?` (defaults to Submit/Save/Create/Dispatch…) |
| `cancel` | — |

## State (content)
| tool | args | returns |
|---|---|---|
| `pageReady` | `timeout?` | `{ readyState, url, title }` |
| `isVisible` | locator | `{ visible }` |
| `isEnabled` | locator | `{ enabled }` |
| `exists` | locator | `{ exists }` |

## Misc (content)
| tool | args |
|---|---|
| `copy` | `text?` |
| `paste` | `selector?` |
| `pressKey` | `key`, `selector?` |
| `runJavascript` | `js` (gated by policy) |

---

## Swaram dashboard helpers

All `swaram.*` tools run in the background and compose the generic primitives.
They know the Swaram dashboard's routes (`/app?tab=…`) and form fields.

### Navigation
`swaram.openDashboard`, `swaram.openCampaigns`, `swaram.openCalls`,
`swaram.openSingleCall`, `swaram.openContacts`, `swaram.openAppointments`,
`swaram.openAnalytics`, `swaram.openLiveMonitoring`, `swaram.openAgentProfiles`,
`swaram.openSettings`, `swaram.openBilling`, `swaram.openPage` (`path`).

### Auth
`swaram.login` — opens `/login`, fills `swaram-email` / `swaram-pass`, submits,
verifies redirect to `/app`. Returns `{ loggedIn, url, reused? }`.

### Single calls
`swaram.createSingleCall` — args: `phone` (required), `lead_name?`,
`business_name?`, `industry?`, `place?`, `agent_profile_id?`, `system_prompt?`.
Returns `{ dispatched, callId, message }`.

`swaram.deleteCall` — `row` (index or text).

### Campaigns
`swaram.createCampaign` / `swaram.createBulkCampaign` — args: `name` (required),
`agent_profile_id?`, and either `csv: { filename, contentBase64, mimeType? }`
or `contacts_raw`. Optional `schedule_type`, `schedule_time`, `language`,
`voice`, `retry_count`, `knowledge_base`. Returns `{ created, campaignId, name }`.

`swaram.pauseCampaign` / `swaram.resumeCampaign` / `swaram.deleteCampaign` —
`row` (0-based index or campaign name text).

### Customers / reports
`swaram.searchCustomer` (`query`), `swaram.openCustomer` (`row`),
`swaram.viewNotes`, `swaram.downloadReports`.

### Monitor
`swaram.monitor` — one-shot snapshot; the background also pushes a periodic
`monitor` message over the WebSocket (see WEBSOCKET_PROTOCOL.md).

---

## Chaining example (voice agent)

```
openPage(url=/app?tab=single_call)
  → pageReady
  → fillForm({ phone, lead_name, business_name })
  → select(agent_profile_id)
  → click(text="Dispatch Call")
  → extractErrors
  → readAllText  (to find the returned call id)
```

Because every step is a tool, the LLM can adapt: if `click` on "Dispatch Call"
fails, the engine retries via ARIA/XPath before returning a screenshot, and the
agent can call `takeScreenshot` + `readAllText` to recover.
