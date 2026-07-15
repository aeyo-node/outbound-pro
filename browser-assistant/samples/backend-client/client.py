"""
Swaram Browser Assistant — sample backend client.

Demonstrates the full WebSocket protocol from the backend side:
  - authenticate the extension
  - execute every generic tool and every Swaram helper
  - stream status / monitor / log messages
  - heartbeat (ping/pong)
  - cancel an in-flight execution

This is a reference implementation. Wire it into your voice-agent backend:
the voice agent decides an action -> you call `execute(...)` here -> the
extension performs the browser operation -> you return the structured result.

Requires: websockets (pip install websockets)
"""
from __future__ import annotations

import asyncio
import json
import time
from typing import Any, Callable

import websockets


class SwaramExtensionClient:
    """Async client that speaks the extension's WebSocket protocol."""

    def __init__(self, host: str = "0.0.0.0", port: int = 8787, token: str = "change-me"):
        self.host = host
        self.port = port
        self.token = token
        self._ws: websockets.WebSocketServerProtocol | None = None
        self._pending: dict[str, asyncio.Future] = {}
        self._on_monitor: Callable[[dict], None] | None = None
        self._on_status: Callable[[dict], None] | None = None
        self._on_log: Callable[[dict], None] | None = None

    # ------------------------------------------------------------------ server
    async def serve(self) -> None:
        """Start the WebSocket server the extension connects to."""
        async with websockets.serve(self._handler, self.host, self.port, max_size=2**24):
            print(f"[server] listening on ws://{self.host}:{self.port}")
            await asyncio.Future()  # run forever

    async def _handler(self, ws: websockets.WebSocketServerProtocol) -> None:
        self._ws = ws
        print("[server] extension connected")
        try:
            async for raw in ws:
                msg = json.loads(raw)
                await self._on_message(msg)
        except websockets.ConnectionClosed:
            print("[server] extension disconnected")
        finally:
            self._ws = None

    async def _on_message(self, msg: dict) -> None:
        t = msg.get("type")
        if t == "authenticate":
            ok = msg.get("token") == self.token
            if ok:
                await self.send({"type": "authenticated", "sessionId": f"s-{int(time.time())}"})
                print("[server] extension authenticated")
            else:
                await self.send({"type": "unauthorized", "reason": "bad token"})
        elif t == "response":
            fut = self._pending.pop(msg.get("id"), None)
            if fut and not fut.done():
                fut.set_result(msg.get("result"))
        elif t == "monitor" and self._on_monitor:
            self._on_monitor(msg)
        elif t == "status" and self._on_status:
            self._on_status(msg)
        elif t == "logs" and self._on_log:
            self._on_log(msg)
        elif t == "pong":
            pass
        else:
            print(f"[server] recv {t}: {json.dumps(msg)[:200]}")

    # ------------------------------------------------------------------ send
    async def send(self, msg: dict) -> None:
        if self._ws:
            await self._ws.send(json.dumps(msg))

    async def execute(self, tool: str, args: dict | None = None, timeout: float = 30.0) -> dict:
        """Execute a tool on the extension and await its structured result."""
        if not self._ws:
            raise RuntimeError("extension not connected")
        msg_id = f"c-{int(time.time()*1000)}-{tool}"
        fut: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending[msg_id] = fut
        await self.send({"type": "execute", "id": msg_id, "tool": tool, "args": args or {}})
        try:
            return await asyncio.wait_for(fut, timeout)
        except asyncio.TimeoutError:
            self._pending.pop(msg_id, None)
            await self.send({"type": "cancel", "id": msg_id, "reason": "timeout"})
            return {"success": False, "tool": tool, "reason": "timeout", "time": int(timeout * 1000)}

    async def cancel(self, exec_id: str, reason: str = "") -> None:
        await self.send({"type": "cancel", "id": exec_id, "reason": reason})

    async def ping(self) -> None:
        await self.send({"type": "ping", "ts": int(time.time() * 1000)})

    # --------------------------------------------------------------- callbacks
    def on_monitor(self, fn: Callable[[dict], None]) -> None:
        self._on_monitor = fn

    def on_status(self, fn: Callable[[dict], None]) -> None:
        self._on_status = fn

    def on_log(self, fn: Callable[[dict], None]) -> None:
        self._on_log = fn


# ---------------------------------------------------------------------------
# Demo: read-only / navigation smoke test. Run:  python client.py
#
# This list is intentionally harmless — it ONLY reads state and navigates so it
# can verify the WebSocket round-trip without submitting data or mutating the
# dashboard. All create/pause/resume/delete actions were removed to avoid
# triggering server errors on a live dashboard.
# ---------------------------------------------------------------------------
DEMO_TOOLS: list[tuple[str, dict]] = [
    # Browser (read-only)
    ("currentUrl", {}),
    ("getTitle", {}),
    ("takeScreenshot", {"format": "png"}),
    ("getCookies", {}),
    # Navigation / reading (no clicks, no typing, no submits)
    ("readAllText", {}),
    ("extractErrors", {}),
    ("pageReady", {}),
    # Swaram navigation only (openPage-level, no form interaction)
    ("swaram.openDashboard", {}),
    ("swaram.openCampaigns", {}),
    ("swaram.openAnalytics", {}),
    ("swaram.monitor", {}),
]


async def main() -> None:
    client = SwaramExtensionClient(token="change-me")
    client.on_monitor(lambda m: print(f"[monitor] {m.get('completionPct')}%  errors={len(m.get('errors', []))}"))
    client.on_log(lambda m: print(f"[log:{m.get('level')}] {m.get('message')}"))

    # Run the server and the demo concurrently.
    server_task = asyncio.create_task(client.serve())

    # Wait for the extension to connect + authenticate, then run the demo.
    await asyncio.sleep(3)
    print("\n=== running demo tool calls ===")
    for tool, args in DEMO_TOOLS:
        if not client._ws:
            print("extension not connected; skipping")
            break
        res = await client.execute(tool, args)
        status = "ok" if res.get("success") else "FAIL"
        print(f"  [{status}] {tool}  ({res.get('time')}ms)  {json.dumps(res.get('data') or res.get('reason') or '')[:120]}")

    # keep the server alive for monitor stream
    print("\n=== idling — monitor stream active. Ctrl+C to quit. ===")
    await server_task


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nbye")
