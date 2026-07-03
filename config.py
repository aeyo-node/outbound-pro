"""
config.py — Single source of truth for all Gemini Live settings.

Every other file must import from here instead of hardcoding model names,
voices, or other AI configuration values.
"""

# ── Gemini Live Realtime model ─────────────────────────────────────────────────
# Used by agent.py AgentSession / RealtimeModel
REALTIME_MODEL = "gemini-3.1-flash-live-preview"

# ── Gemini text-only model (non-realtime tasks) ────────────────────────────────
# Used by /api/chat endpoint and memory compression in tools.py
CHAT_MODEL = "gemini-2.0-flash"

# ── Default voice when no Agent Profile is selected ───────────────────────────
DEFAULT_VOICE = "Zephyr"

# ── Realtime model temperature ─────────────────────────────────────────────────
TEMPERATURE = 1.0

# ── Maximum output tokens for realtime session ────────────────────────────────
MAX_OUTPUT_TOKENS = 2048

# ── Native audio enabled (always True for Gemini Live) ────────────────────────
ENABLE_NATIVE_AUDIO = True

# ── VAD / silence settings ─────────────────────────────────────────────────────
VAD_SILENCE_DURATION_MS = 2000
VAD_PREFIX_PADDING_MS   = 200

# ── Context window compression ─────────────────────────────────────────────────
CTX_TRIGGER_TOKENS = 25600
CTX_TARGET_TOKENS  = 12800
