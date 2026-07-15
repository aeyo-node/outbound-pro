# Sample Backend Client

Reference Python implementation of the server side of the Swaram Browser
Assistant WebSocket protocol. Use it as the bridge between your voice agent and
the Chrome extension.

## Run

```bash
pip install websockets
python client.py
# [server] listening on ws://0.0.0.0:8787
```

Point the extension's **Backend WebSocket URL** at `ws://<this-host>:8787` and
set the **Backend Auth Token** to `change-me` (override in `SwaramExtensionClient`).

## What it demonstrates

- Accepts the extension's `authenticate` handshake and replies
  `authenticated` / `unauthorized`.
- `execute(tool, args)` sends an `execute` command and awaits the matching
  `response` (correlated by `id`), with timeout + `cancel`.
- Streams `monitor`, `status`, and `logs` messages via callbacks.
- Heartbeat `ping` helper.
- A `DEMO_TOOLS` list that exercises every generic tool and every Swaram
  helper end-to-end.

## Integrating with your voice agent

```python
client = SwaramExtensionClient(token=os.environ["SWARAM_EXT_TOKEN"])
asyncio.create_task(client.serve())

# voice agent decided to create a campaign:
result = await client.execute("swaram.createCampaign", {
    "name": "Hotels July",
    "csv": {"filename": "leads.csv", "contentBase64": b64, "mimeType": "text/csv"},
})
if result["success"]:
    speak(f"Campaign created. ID {result['data']['campaignId']}")
else:
    speak(f"Sorry, that failed: {result['reason']}")
```

For deployments behind a public endpoint, terminate TLS and run the server on
`wss://` and put a token-issuing auth layer in front. See
`docs/WEBSOCKET_PROTOCOL.md` for the full message spec.
