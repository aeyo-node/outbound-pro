import asyncio
import json
import logging
import os
import ssl
import certifi
import socket
from typing import Optional
from dotenv import load_dotenv

# ── Force IPv4 to avoid 20s timeout on AWS ──────────────────────────────────
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_only_getaddrinfo(*args, **kwargs):
    responses = _orig_getaddrinfo(*args, **kwargs)
    return [r for r in responses if r[0] == socket.AF_INET]
socket.getaddrinfo = _ipv4_only_getaddrinfo

# ── Patch SSL with certifi ──────────────────────────────────────────────────
_orig_ssl = ssl.create_default_context
def _certifi_ssl(purpose=ssl.Purpose.SERVER_AUTH, **kwargs):
    if not kwargs.get("cafile") and not kwargs.get("capath") and not kwargs.get("cadata"):
        kwargs["cafile"] = certifi.where()
    return _orig_ssl(purpose, **kwargs)
ssl.create_default_context = _certifi_ssl

from livekit import agents, api, rtc
from livekit.agents import Agent, AgentSession, RoomInputOptions
try:
    from livekit.agents import RoomOptions as _RoomOptions
    _HAS_ROOM_OPTIONS = True
except ImportError:
    _HAS_ROOM_OPTIONS = False
from livekit.plugins import noise_cancellation, silero

from db import init_db, log_error, get_enabled_tools
from prompts import build_prompt
from tools import AppointmentTools

load_dotenv(".env", override=True)
log_path = "/data/app.log" if os.path.exists("/data") else "app.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler(log_path, mode='a', encoding='utf-8')]
)
logger = logging.getLogger("outbound-agent")

SIP_DOMAIN = os.getenv("VOBIZ_SIP_DOMAIN", "")


async def _log(level: str, msg: str, detail: str = "") -> None:
    if level == "info":
        logger.info(msg)
    elif level == "warning":
        logger.warning(msg)
    else:
        logger.error(msg)
    try:
        await log_error("agent", msg, detail, level)
    except Exception:
        pass


def load_db_settings_to_env() -> None:
    """Load Supabase settings table into os.environ before worker starts."""
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        return
    try:
        from supabase import create_client
        client = create_client(url, key)
        result = client.table("settings").select("key, value").execute()
        for row in (result.data or []):
            if row.get("value"):
                val = row["value"].strip()
                # Defensive: if the value is a stringified JSON object (common corruption symptom),
                # try to unwrap it until we hit a real string.
                import ast
                try:
                    while val.startswith("{") and "value" in val:
                        parsed = ast.literal_eval(val)
                        if isinstance(parsed, dict) and "value" in parsed:
                            val = str(parsed["value"]).strip()
                        else:
                            break
                except:
                    pass
                
                os.environ[row["key"]] = val
    except Exception as exc:
        logger.warning("Could not load settings from Supabase: %s", exc)


# ── Import Google Gemini Live plugin ─────────────────────────────────────────
_google_realtime = None
_google_beta_realtime = None
_google_llm = None
_google_tts = None
_google_stt = None

try:
    from livekit.plugins import google as _gp
    # Try stable path first, then beta
    try:
        _google_realtime = _gp.realtime.RealtimeModel
        logger.info("Loaded google.realtime.RealtimeModel (stable path)")
    except AttributeError:
        pass
    try:
        _google_beta_realtime = _gp.beta.realtime.RealtimeModel
        logger.info("Loaded google.beta.realtime.RealtimeModel (beta path)")
    except AttributeError:
        pass
    try:
        _google_llm = _gp.LLM
        _google_tts = _gp.TTS
    except AttributeError:
        pass
    try:
        _google_stt = _gp.STT
        logger.info("Loaded Google STT for pipeline mode")
    except AttributeError:
        pass
except ImportError:
    logger.warning("livekit-plugins-google not installed — run: pip install livekit-plugins-google>=1.0")


# ── Session factory ──────────────────────────────────────────────────────────

def _build_session(tools: list, system_prompt: str, voice_override: Optional[str] = None) -> AgentSession:
    """
    Build AgentSession with Gemini Live realtime.

    SILENCE-PREVENTION — all 3 configs required:
    1. SessionResumptionConfig(transparent=True)   → auto-reconnect on timeout
    2. ContextWindowCompressionConfig              → prevents freeze at token limit
    3. RealtimeInputConfig(END_SENSITIVITY_LOW)    → 2s VAD silence threshold

    ⚠️  EndSensitivity MUST use END_SENSITIVITY_LOW (full string — not .LOW)
    """
    # Override whatever is in the DB settings to ensure the realtime API works
    gemini_model = "models/gemini-3.1-flash-live-preview"
    gemini_voice = voice_override or os.getenv("GEMINI_TTS_VOICE", "Aoede")
    
    # FORCED PIPELINE: Google explicitly denied WebSocket access to your project
    use_realtime = False

    RealtimeClass = _google_realtime or (_google_beta_realtime if use_realtime else None)

    if use_realtime and RealtimeClass is not None:
        logger.info("SESSION MODE: Gemini Live realtime (%s, voice=%s)", gemini_model, gemini_voice)

        _realtime_input_cfg = None
        _session_resumption_cfg = None
        _ctx_compression_cfg = None

        try:
            from google.genai import types as _gt
            _realtime_input_cfg = _gt.RealtimeInputConfig(
                automatic_activity_detection=_gt.AutomaticActivityDetection(
                    end_of_speech_sensitivity=_gt.EndSensitivity.END_SENSITIVITY_LOW,
                    silence_duration_ms=2000,
                    prefix_padding_ms=200,
                ),
            )
            _session_resumption_cfg = _gt.SessionResumptionConfig(transparent=True)
            _ctx_compression_cfg = _gt.ContextWindowCompressionConfig(
                trigger_tokens=25600,
                sliding_window=_gt.SlidingWindow(target_tokens=12800),
            )
            logger.info("Silence-prevention configs applied (VAD LOW, transparent resumption, context compression)")
        except Exception as _cfg_err:
            logger.warning("Could not build silence-prevention config: %s", _cfg_err)

        realtime_kwargs: dict = dict(
            model=gemini_model,
            voice=gemini_voice,
            instructions=system_prompt,
        )
        if _realtime_input_cfg is not None:
            realtime_kwargs["realtime_input_config"]      = _realtime_input_cfg
            realtime_kwargs["session_resumption"]         = _session_resumption_cfg
            realtime_kwargs["context_window_compression"] = _ctx_compression_cfg

        logger.error("FINAL REALTIME MODEL=%s", gemini_model)
        return AgentSession(llm=RealtimeClass(**realtime_kwargs), tools=tools)

    # ── Pipeline fallback (Google STT + Gemini LLM + Google TTS) ──────────────
    if _google_llm is None:
        raise RuntimeError(
            "No Google AI backend found. Install: pip install 'livekit-plugins-google>=1.0'"
        )
    logger.info("SESSION MODE: pipeline (Google STT + Gemini LLM + Google TTS)")
    stt = _google_stt(model="chirp_2", languages=["en-US"]) if _google_stt else None
    tts = _google_tts(voice_name="en-US-Journey-O") if _google_tts else None
    return AgentSession(
        stt=stt,
        llm=_google_llm(model="gemini-2.0-flash"),
        tts=tts,
        vad=silero.VAD.load(),
        tools=tools,
    )


class OutboundAssistant(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)


async def entrypoint(ctx: agents.JobContext) -> None:
    """
    Main entrypoint. Called per job.

    DIAL-FIRST PATTERN (critical):
    Start Gemini Live ONLY after create_sip_participant(wait_until_answered=True).
    Starting session during ring time (~20-30s) causes Gemini idle timeout before call is answered.

    NO close_on_disconnect — SIP legs have brief dropouts that look like disconnects.
    Use participant_disconnected event for the specific SIP identity instead.
    """
    await _log("info", f"Job started — room: {ctx.room.name}")
    # Refresh settings from Supabase at the start of every call
    load_db_settings_to_env()

    phone_number: Optional[str] = None
    lead_name = "there"
    business_name = "our company"
    service_type = "our service"
    custom_prompt: Optional[str] = None
    voice_override: Optional[str] = None
    model_override: Optional[str] = None
    tools_override: Optional[str] = None
    agent_profile_id: Optional[str] = None

    if ctx.job.metadata:
        try:
            data = json.loads(ctx.job.metadata)
            phone_number   = data.get("phone_number")
            lead_name      = data.get("lead_name", lead_name)
            business_name  = data.get("business_name", business_name)
            service_type   = data.get("service_type", service_type)
            custom_prompt  = data.get("system_prompt")
            voice_override = data.get("voice_override")
            model_override = data.get("model_override")
            tools_override = data.get("tools_override")
            agent_profile_id = data.get("agent_profile_id")
        except (json.JSONDecodeError, AttributeError):
            await _log("warning", "Invalid JSON in job metadata")

    # If no custom prompt from metadata, use the Global Prompt from DB/Env
    # Checking both lowercase (DB) and uppercase (Env) for safety
    if not custom_prompt:
        custom_prompt = os.environ.get("system_prompt") or os.environ.get("SYSTEM_PROMPT")
    

    # For inbound calls, try to identify the caller from participant identity
    if not phone_number:
        for p in ctx.room.remote_participants.values():
            if p.identity.startswith("sip_"):
                phone_number = p.identity.replace("sip_", "")
                break
        
        if phone_number:
            from db import get_contacts
            try:
                contacts = await get_contacts(phone_number)
                if contacts:
                    lead_name = contacts[0].get("lead_name", lead_name)
                    await _log("info", f"Inbound caller identified: {lead_name} ({phone_number})")
            except Exception:
                pass

    if not agent_profile_id:
        from db import get_default_agent_profile
        try:
            default_prof = await get_default_agent_profile()
            if default_prof:
                agent_profile_id = default_prof.get("id")
        except Exception:
            pass

    system_prompt = build_prompt(
        lead_name=lead_name, business_name=business_name,
        service_type=service_type, custom_prompt=custom_prompt,
    )
    # Add inbound awareness to the prompt
    if not phone_number:
        system_prompt += "\n\nNOTE: This is an INBOUND call. The user called YOU. Do not ask 'Am I speaking with...'. Instead, greet them warmly and ask how you can help."
    
    tool_ctx = AppointmentTools(ctx, phone_number, lead_name, agent_profile_id=agent_profile_id)

    if voice_override:
        os.environ["GEMINI_TTS_VOICE"] = voice_override
    if model_override:
        os.environ["GEMINI_MODEL"] = model_override

    if tools_override:
        try:
            enabled_tools = json.loads(tools_override)
        except Exception:
            enabled_tools = await get_enabled_tools()
    else:
        enabled_tools = await get_enabled_tools()

    # ── Connect to LiveKit room ───────────────────────────────────────────────
    await ctx.connect()
    await _log("info", f"Connected to room: {ctx.room.name}")

    # ── Dial out via SIP — MUST come before session.start() ──────────────────
    if phone_number:
        # Strip \r to fix CRLF docker issues on Windows
        trunk_id = os.getenv("OUTBOUND_TRUNK_ID", "").strip()
        
        # FAILSAFE: If the old broken Vobiz UUID is still stuck in memory, override it!
        if "53eeb610" in trunk_id:
            trunk_id = "ST_puExWSEydrQF"
            
        if not trunk_id:
            await _log("error", "OUTBOUND_TRUNK_ID not set — cannot place outbound call")
            ctx.shutdown()
            return
        await _log("info", f"Dialing {phone_number} via trunk {trunk_id}")
        try:
            await ctx.api.sip.create_sip_participant(
                api.CreateSIPParticipantRequest(
                    room_name=ctx.room.name,
                    sip_trunk_id=trunk_id,
                    sip_call_to=phone_number,
                    participant_identity=f"sip_{phone_number}",
                    wait_until_answered=True,   # blocks until call is answered
                )
            )
        except Exception as exc:
            await _log("error", f"SIP dial FAILED for {phone_number}: {exc}")
            ctx.shutdown()
            return
        await _log("info", f"Call ANSWERED — {phone_number} picked up")
        
        import time
        _call_start_time = time.time()

    # ── Build and start Gemini Live session ───────────────────────────────────
    gemini_model = os.getenv("GEMINI_MODEL", "models/gemini-2.0-flash-exp")
    await _log("info", f"Building Gemini Live session — model={gemini_model}")
    active_tools = tool_ctx.build_tool_list(enabled_tools)
    await _log("info", f"Active tools: {[t.__name__ for t in active_tools]}")

    session = _build_session(tools=active_tools, system_prompt=system_prompt, voice_override=voice_override)

    # Use RoomOptions if available (non-deprecated), else fall back
    # NEVER use close_on_disconnect=True with SIP
    if _HAS_ROOM_OPTIONS:
        from livekit.agents import RoomOptions as _RO
        _session_kwargs = dict(
            room=ctx.room,
            agent=OutboundAssistant(instructions=system_prompt),
            room_options=_RO(input_options=RoomInputOptions(
                noise_cancellation=noise_cancellation.BVCTelephony()
            )),
        )
    else:
        _session_kwargs = dict(
            room=ctx.room,
            agent=OutboundAssistant(instructions=system_prompt),
            room_input_options=RoomInputOptions(
                noise_cancellation=noise_cancellation.BVCTelephony()
            ),
        )

    await session.start(**_session_kwargs)
    await _log("info", "Agent session started — Gemini Live active")

    # ── Optional S3 call recording via LiveKit Egress ─────────────────────────
    if phone_number:
        _aws_key     = os.getenv("S3_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID", "")
        _aws_secret  = os.getenv("S3_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY", "")
        _aws_bucket  = os.getenv("S3_BUCKET") or os.getenv("AWS_BUCKET_NAME", "")
        _s3_endpoint = os.getenv("S3_ENDPOINT_URL") or os.getenv("S3_ENDPOINT", "")
        _s3_region   = os.getenv("S3_REGION") or os.getenv("AWS_REGION", "ap-south-1")
        if _aws_key and _aws_secret and _aws_bucket:
            try:
                _recording_path = f"recordings/{ctx.room.name}.ogg"
                _egress_req = api.RoomCompositeEgressRequest(
                    room_name=ctx.room.name, audio_only=True,
                    file_outputs=[api.EncodedFileOutput(
                        file_type=api.EncodedFileType.OGG, filepath=_recording_path,
                        s3=api.S3Upload(
                            access_key=_aws_key, secret=_aws_secret,
                            bucket=_aws_bucket, region=_s3_region, endpoint=_s3_endpoint,
                        ),
                    )],
                )
                _egress = await ctx.api.egress.start_room_composite_egress(_egress_req)
                _s3_ep = _s3_endpoint.rstrip("/")
                tool_ctx.recording_url = (
                    f"{_s3_ep}/{_aws_bucket}/{_recording_path}"
                    if _s3_ep else f"s3://{_aws_bucket}/{_recording_path}"
                )
                await _log("info", f"Recording started: egress={_egress.egress_id}")
            except Exception as _exc:
                await _log("warning", f"Recording start failed (non-fatal): {_exc}")

    # ── Greeting ─────────────────────────────────────────────────────────────
    greeting = (
        f"The call just connected. Speak strictly in Malayalam. Start the call by greeting the lead and using the greeting defined in your system prompt for {service_type}."
        if phone_number else f"Speak strictly in Malayalam. Greet the caller warmly and help them with {service_type}."
    )
    try:
        if hasattr(session, "chat_ctx"):
            # LiveKit 1.5+ AgentSession context
            session.chat_ctx.append(role="user", text=f"[SYSTEM: {greeting}]")
        elif hasattr(session, "agent") and hasattr(session.agent, "chat_ctx"):
            session.agent.chat_ctx.append(role="user", text=f"[SYSTEM: {greeting}]")
        else:
            await _log("warning", "No chat_ctx found on session - greeting may be delayed")
    except Exception as _gr_exc:
        await _log("warning", f"Greeting trigger failed: {_gr_exc}")

    # ── Keep session alive until SIP participant leaves ───────────────────────
    # Without this the entrypoint returns and the worker spins down.
    if phone_number:
        _sip_identity = f"sip_{phone_number}"
        _disconnect_event = asyncio.Event()

        def _on_participant_disconnected(participant: rtc.RemoteParticipant):
            if participant.identity == _sip_identity:
                _disconnect_event.set()

        def _on_room_disconnected():
            _disconnect_event.set()

        ctx.room.on("participant_disconnected", _on_participant_disconnected)
        ctx.room.on("disconnected", _on_room_disconnected)

        try:
            await asyncio.wait_for(_disconnect_event.wait(), timeout=3600)
        except asyncio.TimeoutError:
            await _log("warning", "Call reached 1-hour safety timeout — shutting down")

        await _log("info", f"SIP participant disconnected — ending session for {phone_number}")
        
        # Log the call if the LLM didn't get a chance to call end_call()
        if not getattr(tool_ctx, "_call_logged", False):
            try:
                import time
                from db import log_call
                duration = int(time.time() - _call_start_time)
                await log_call(
                    phone_number=phone_number,
                    lead_name=lead_name,
                    outcome="no_answer" if duration < 10 else "completed",
                    reason="User hung up",
                    duration_seconds=duration,
                    recording_url=getattr(tool_ctx, "recording_url", None)
                )
            except Exception as e:
                await _log("warning", f"Failed to log call on disconnect: {e}")

        try:
            await session.aclose()
        except Exception:
            pass
    else:
        # Inbound / test call — wait for room disconnect
        _done = asyncio.Event()
        ctx.room.on("disconnected", lambda: _done.set())
        try:
            await asyncio.wait_for(_done.wait(), timeout=3600)
        except asyncio.TimeoutError:
            pass


if __name__ == "__main__":
    init_db()
    load_db_settings_to_env()
    
    # ── Pre-flight check for LiveKit keys ────────────────────────────────────
    # If keys are missing (like on a fresh install), don't crash. 
    # Sleep instead so the Dashboard stays up, allowing the user to add keys in the UI.
    url = os.getenv("LIVEKIT_URL", "").strip()
    key = os.getenv("LIVEKIT_API_KEY", "").strip()
    secret = os.getenv("LIVEKIT_API_SECRET", "").strip()
    
    if not url or not key or not secret:
        logger.error("⚠️ LiveKit credentials missing! Agent worker is paused.")
        logger.error("👉 Please open the Dashboard, go to Settings, and save your LiveKit keys.")
        import time
        while True:
            time.sleep(60)
    else:
        agents.cli.run_app(
            agents.WorkerOptions(
                entrypoint_fnc=entrypoint,
                agent_name="outbound-caller",
                num_idle_processes=1,
            )
        )
