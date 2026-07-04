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

from config import REALTIME_MODEL, DEFAULT_VOICE, VAD_SILENCE_DURATION_MS, VAD_PREFIX_PADDING_MS, CTX_TRIGGER_TOKENS, CTX_TARGET_TOKENS
from db import init_db, log_error, get_enabled_tools, get_all_settings
from prompts import build_prompt
from tools import AppointmentTools

# load_dotenv(".env", override=True)
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
                
                if row["key"].startswith("LIVEKIT_"):
                    continue
                os.environ[row["key"]] = val
    except Exception as exc:
        logger.warning("Could not load settings from Supabase: %s", exc)


# ── Google Gemini Live realtime Model ────────────────────────────────────────
from livekit.plugins.google import realtime

# ── Session factory ──────────────────────────────────────────────────────────

def _build_session(tools: list, system_prompt: str, voice_override: Optional[str] = None, model_override: Optional[str] = None) -> AgentSession:
    """
    Build AgentSession with Gemini Live realtime.
    All config comes from config.py constants — no hardcoding here.

    NOTE: gemini-3.1-flash-live-preview does NOT support advanced session configs
    (RealtimeInputConfig, SessionResumptionConfig, ContextWindowCompressionConfig).
    Passing them causes APIError 1011. Use minimal config only.
    """
    # ── Model: ALWAYS from config.py — no overrides allowed ──────────────────
    gemini_model = REALTIME_MODEL

    # ── Voice: profile > env > config.py constant ─────────────────────────────
    gemini_voice = voice_override or os.getenv("GEMINI_VOICE", DEFAULT_VOICE)

    logger.info("[SESSION] Gemini Live | model=%s | voice=%s | prompt_len=%d",
                gemini_model, gemini_voice, len(system_prompt))

    api_key = (
        os.getenv("GOOGLE_API_KEY")
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_GEMINI_API_KEY")
    )

    return AgentSession(
        llm=realtime.RealtimeModel(
            model=gemini_model,
            voice=gemini_voice,
            instructions=system_prompt,
            api_key=api_key,
        ),
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
    # NOTE: load_db_settings_to_env() is NOT called here — it is synchronous and would
    # block the async event loop causing ~20s delays. Settings are loaded once at startup.

    phone_number: Optional[str] = None
    lead_name = "there"
    business_name = "our company"
    industry = "our service"
    place = "your area"
    custom_prompt: Optional[str] = None
    voice_override: Optional[str] = None
    model_override: Optional[str] = None
    tools_override: Optional[str] = None
    agent_profile_id: Optional[str] = None
    campaign_id: Optional[str] = None

    if ctx.job.metadata:
        try:
            data = json.loads(ctx.job.metadata)
            phone_number   = data.get("phone_number")
            lead_name      = data.get("lead_name", lead_name)
            business_name  = data.get("business_name", business_name)
            industry       = data.get("industry", industry)
            place          = data.get("place", place)
            custom_prompt  = data.get("system_prompt")
            voice_override = data.get("voice_override")
            # model_override intentionally NOT read from metadata — config.py REALTIME_MODEL is always used
            tools_override = data.get("tools_override")
            agent_profile_id = data.get("agent_profile_id")
            campaign_id = data.get("campaign_id")
        except (json.JSONDecodeError, AttributeError):
            await _log("warning", "Invalid JSON in job metadata")

    await _log("info", f"METADATA RECEIVED — agent_profile_id={agent_profile_id}, voice_override={voice_override}, campaign_id={campaign_id}")

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

    # ── Fetch the agent profile — this is the SINGLE authoritative source ──────
    # Priority: agent_profile_id from metadata > default profile in DB
    profile = None
    if not agent_profile_id:
        from db import get_default_agent_profile
        try:
            default_prof = await get_default_agent_profile()
            if default_prof:
                agent_profile_id = default_prof.get("id")
                await _log("info", f"No profile in metadata — using default profile: {default_prof.get('name')} ({agent_profile_id})")
        except Exception as _e:
            await _log("warning", f"Could not fetch default profile: {_e}")

    if agent_profile_id:
        from db import get_agent_profile
        try:
            profile = await get_agent_profile(agent_profile_id)
            if profile:
                await _log("info", f"Loaded agent profile: '{profile.get('name')}' (id={agent_profile_id}, voice={profile.get('voice')})")
            else:
                await _log("warning", f"Profile ID '{agent_profile_id}' not found in DB — falling back to metadata prompt")
        except Exception as _e:
            await _log("warning", f"Failed to fetch profile '{agent_profile_id}': {_e}")

    # ── Determine system prompt ────────────────────────────────────────────────
    # Priority order:
    #   1. DB agent profile system_prompt  (always wins when profile exists)
    #   2. system_prompt from job metadata (set by server.py dispatch)
    #   3. industry-based default from prompts.py
    # NOTE: we deliberately do NOT fall back to os.environ["system_prompt"]
    #       because that global setting may be any profile's prompt and would
    #       cause the wrong profile to be used.
    if profile and profile.get("system_prompt") and profile["system_prompt"].strip():
        custom_prompt = profile["system_prompt"]
        await _log("info", f"PROMPT SOURCE: agent profile '{profile.get('name')}' from DB")
    elif custom_prompt and custom_prompt.strip():
        await _log("info", "PROMPT SOURCE: job metadata (profile DB fetch failed or profile has no prompt)")
    else:
        await _log("info", f"PROMPT SOURCE: industry default for '{industry}' (no profile, no metadata prompt)")

    # ── Pull voice from profile. MODEL IS ALWAYS FROM config.py — never from DB ──
    # The profile 'model' field in the DB is IGNORED. config.py REALTIME_MODEL is
    # the single source of truth. This prevents stale DB values (e.g. gemini-2.5)
    # from overriding the correct Gemini 3.1 model.
    model_override = None  # Always force config.py REALTIME_MODEL
    if profile:
        if not voice_override and profile.get("voice"):
            voice_override = profile["voice"]
            await _log("info", f"Voice set from profile: {voice_override}")
        if profile.get("model") and profile["model"] != REALTIME_MODEL:
            await _log("warning", f"Profile model '{profile.get('model')}' IGNORED — using config.py REALTIME_MODEL='{REALTIME_MODEL}'")

    system_prompt = build_prompt(
        lead_name=lead_name, business_name=business_name,
        industry=industry, place=place, custom_prompt=custom_prompt,
    )
    # Add inbound awareness to the prompt
    if not phone_number:
        system_prompt += "\n\nNOTE: This is an INBOUND call. The user called YOU. Do not ask 'Am I speaking with...'. Instead, greet them warmly and ask how you can help."
    else:
        system_prompt += "\n\n(CRITICAL INSTRUCTION: Never wait for the user to speak. You MUST start speaking immediately when the call connects, using the greeting defined in your prompt!)"

    # Inject speech settings if configured
    if profile and profile.get("speech_settings"):
        try:
            sp = json.loads(profile["speech_settings"])
            if sp:
                system_prompt += f"\n\n# SPEECH INSTRUCTIONS\n"
                if sp.get("fillers"):
                    system_prompt += "- Use conversational filler words (um, uh, ah) naturally while thinking to sound human.\n"
                if sp.get("laugh"):
                    system_prompt += "- Laugh slightly or chuckle appropriately during the conversation to build rapport.\n"
                if sp.get("speed"):
                    system_prompt += f"- Speak at a speed modifier of {sp.get('speed')}.\n"
                if sp.get("custom_instructions"):
                    system_prompt += f"- {sp.get('custom_instructions')}\n"
        except Exception:
            pass

    # Append knowledge base if configured
    knowledge_base = os.environ.get("KNOWLEDGE_BASE", "").strip()
    if knowledge_base:
        system_prompt += f"\n\n# KNOWLEDGE BASE\n{knowledge_base}"
        
    await _log("info", f"FINAL SYSTEM PROMPT:\n{system_prompt}")
    
    tool_ctx = AppointmentTools(ctx, phone_number, lead_name, business_name, industry, place, agent_profile_id=agent_profile_id, campaign_id=campaign_id)

    # DO NOT write voice_override/model_override to os.environ — it pollutes
    # subsequent calls running on the same worker process.
    # Pass them directly into _build_session instead (already done below).

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
            
        if not trunk_id:
            await _log("error", "OUTBOUND_TRUNK_ID not set — cannot place outbound call")
            ctx.shutdown()
            return
        await _log("info", f"Dialing {phone_number} via trunk {trunk_id}")
        try:
            req_payload = api.CreateSIPParticipantRequest(
                room_name=ctx.room.name,
                sip_trunk_id=trunk_id,
                sip_call_to=phone_number,
                participant_identity=f"sip_{phone_number}",
                wait_until_answered=True,   # blocks until call is answered
            )
            await _log("info", f"[SIP AUDIT] Sending CreateSIPParticipantRequest: room_name={req_payload.room_name}, sip_trunk_id={req_payload.sip_trunk_id}, sip_call_to={req_payload.sip_call_to}, identity={req_payload.participant_identity}")
            
            resp = await ctx.api.sip.create_sip_participant(req_payload)
            await _log("info", f"[SIP AUDIT] Received CreateSIPParticipant Response: {resp}")
        except Exception as exc:
            import traceback
            err_trace = traceback.format_exc()
            await _log("error", f"[SIP AUDIT] SIP dial FAILED for {phone_number}. \nException: {exc}\nTraceback: {err_trace}")
            ctx.shutdown()
            return
        await _log("info", f"Call ANSWERED — {phone_number} picked up")
        
        import time
        _call_start_time = time.time()

    # ── Comprehensive startup debug log ──────────────────────────────────────
    # ── ALWAYS use config.py — no env var override, no DB override ─────────────
    _effective_model = REALTIME_MODEL
    _effective_voice = voice_override or os.getenv("GEMINI_VOICE", DEFAULT_VOICE)
    await _log("info",
        f"\n{'='*60}\n"
        f"  CALL START DEBUG\n"
        f"  Campaign ID   : {campaign_id or 'N/A'}\n"
        f"  Agent Profile : {profile.get('name') if profile else 'N/A'} ({agent_profile_id or 'none'})\n"
        f"  Voice         : {_effective_voice}\n"
        f"  Realtime Model: {_effective_model}\n"
        f"  Prompt Length : {len(system_prompt)} chars\n"
        f"  Prompt Preview: {system_prompt[:200]}...\n"
        f"{'='*60}"
    )

    # ── Build and start Gemini Live session ───────────────────────────────────
    await _log("info", f"[AGENT] Building Gemini Live session | model={_effective_model} | voice={_effective_voice}")
    active_tools = tool_ctx.build_tool_list(enabled_tools)
    await _log("info", f"[AGENT] Active tools: {len(active_tools)} loaded")

    session = _build_session(tools=active_tools, system_prompt=system_prompt, voice_override=voice_override, model_override=model_override)
    tool_ctx.session = session

    # ── Live transcript accumulator ───────────────────────────────────────────
    # Gemini Live (realtime) does NOT populate chat_ctx.messages like a pipeline.
    # We must hook session events to build the transcript on the fly.
    _transcript_lines: list = []

    def _on_conversation_item(event):
        try:
            role = getattr(event, "role", None) or getattr(event, "type", "?")
            content = getattr(event, "content", None) or getattr(event, "text", "")
            if not content:
                return
            if isinstance(content, list):
                # Some versions return a list of content items
                for item in content:
                    if isinstance(item, str):
                        text = item.strip()
                    elif hasattr(item, "text"):
                        text = (item.text or "").strip()
                    else:
                        text = str(item).strip()
                    if text and text != "[SYSTEM:" and "Speak strictly" not in text:
                        _transcript_lines.append(f"[{str(role).upper()}]: {text}")
            else:
                text = str(content).strip()
                if text and "Speak strictly" not in text:
                    _transcript_lines.append(f"[{str(role).upper()}]: {text}")
        except Exception:
            pass

    def _on_user_transcribed(event):
        try:
            is_final = getattr(event, "is_final", True)
            if not is_final:
                return  # Skip interim results
            text = (getattr(event, "transcript", "") or "").strip()
            if text:
                _transcript_lines.append(f"[USER]: {text}")
        except Exception:
            pass

    try:
        session.on("conversation_item_added", _on_conversation_item)
    except Exception:
        pass
    try:
        session.on("user_input_transcribed", _on_user_transcribed)
    except Exception:
        pass
    
    # Share the same accumulator list with tool_ctx so end_call() uses it too
    tool_ctx._transcript_lines = _transcript_lines

    # Use RoomOptions if available (non-deprecated), else fall back
    # NEVER use close_on_disconnect=True with SIP
    # Pass system_prompt into OutboundAssistant so the Agent layer also
    # carries the instructions (prevents empty-string override of RealtimeModel).
    if _HAS_ROOM_OPTIONS:
        from livekit.agents import RoomOptions as _RO
        _session_kwargs = dict(
            room=ctx.room,
            agent=OutboundAssistant(instructions=system_prompt),
            room_options=_RO(input_options=RoomInputOptions(
                close_on_disconnect=False,
            )),
        )
    else:
        _session_kwargs = dict(
            room=ctx.room,
            agent=OutboundAssistant(instructions=system_prompt),
            room_input_options=RoomInputOptions(
                close_on_disconnect=False,
            ),
        )
    await session.start(**_session_kwargs)
    await _log("info",
        f"[AGENT] Gemini Live session STARTED | model={_effective_model} | voice={_effective_voice} "
        f"| instructions_len={len(system_prompt)}")

    # (Greeting logic removed. Agent will rely purely on system prompt.)

    # ── Optional S3 call recording via LiveKit Egress ─────────────────────────
    if phone_number:
        _aws_key     = os.getenv("S3_ACCESS_KEY_ID") or os.getenv("AWS_ACCESS_KEY_ID", "")
        _aws_secret  = os.getenv("S3_SECRET_ACCESS_KEY") or os.getenv("AWS_SECRET_ACCESS_KEY", "")
        _aws_bucket  = os.getenv("S3_BUCKET") or os.getenv("AWS_BUCKET_NAME", "")
        _s3_endpoint = os.getenv("S3_ENDPOINT_URL") or os.getenv("S3_ENDPOINT", "")
        _s3_region   = os.getenv("S3_REGION") or os.getenv("AWS_REGION", "ap-south-1")
        if _aws_key and _aws_secret and _aws_bucket:
            try:
                # Wait 2s for SIP participant to fully join the room before starting egress
                await asyncio.sleep(2)

                _recording_path = f"recordings/{ctx.room.name}.mp4"

                s3_kwargs = {
                    "access_key": _aws_key,
                    "secret": _aws_secret,
                    "bucket": _aws_bucket,
                    "region": _s3_region,
                }
                if _s3_endpoint:
                    s3_kwargs["endpoint"] = _s3_endpoint

                _s3_ep = _s3_endpoint.rstrip("/")
                tool_ctx.recording_url = (
                    f"{_s3_ep}/{_aws_bucket}/{_recording_path}"
                    if _s3_ep else f"https://{_aws_bucket}.s3.{_s3_region}.amazonaws.com/{_recording_path}"
                )

                _egress_req = api.RoomCompositeEgressRequest(
                    room_name=ctx.room.name, audio_only=True,
                    file_outputs=[api.EncodedFileOutput(
                        file_type=api.EncodedFileType.MP4, filepath=_recording_path,
                        s3=api.S3Upload(**s3_kwargs),
                    )],
                )
                # Use internal URL (ws://livekit:7880) for API calls within docker network
                _lk_url    = os.getenv("LIVEKIT_URL", "ws://livekit:7880")
                _lk_key    = os.getenv("LIVEKIT_API_KEY", "")
                _lk_secret = os.getenv("LIVEKIT_API_SECRET", "")
                _internal_url = "http://livekit:7880" if "workflow-tech" in _lk_url else _lk_url
                async with api.LiveKitAPI(url=_internal_url, api_key=_lk_key, api_secret=_lk_secret) as lkapi:
                    for attempt in range(5):
                        try:
                            _egress = await lkapi.egress.start_room_composite_egress(_egress_req)
                            await _log("info", f"Recording started: egress={_egress.egress_id}")
                            break
                        except Exception as egress_exc:
                            await _log("warning", f"Egress attempt {attempt+1} failed: {egress_exc}")
                            if attempt == 4:
                                raise egress_exc
                            await asyncio.sleep(2 ** attempt)
            except Exception as _exc:
                await _log("warning", f"Recording start failed (non-fatal): {_exc}")

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
        # Use a small delay to let end_call() finish setting _call_logged if it's running concurrently
        await asyncio.sleep(0.5)
        if not getattr(tool_ctx, "_call_logged", False):
            try:
                import time
                from db import log_call
                duration = int(time.time() - _call_start_time)
                
                # Use live-captured transcript lines (works with Gemini Realtime)
                transcript = "\n".join(_transcript_lines) if _transcript_lines else ""
                
                transcript_summary = ""
                if transcript:
                    from tools import summarize_call_transcript
                    transcript_summary = await summarize_call_transcript(transcript)

                if duration < 15:
                    prefix = "[COLD] User hung up prematurely."
                else:
                    prefix = "[UNRATED] Call disconnected by user."
                
                final_notes = prefix
                if transcript_summary:
                    final_notes += f"\n\nCall Summary:\n{transcript_summary}"

                await log_call(
                    phone_number=phone_number,
                    lead_name=lead_name,
                    outcome="no_answer" if duration < 10 else "completed",
                    reason="User hung up",
                    duration_seconds=duration,
                    recording_url=getattr(tool_ctx, "recording_url", None),
                    campaign_id=campaign_id,
                    business_name=business_name,
                    industry=industry,
                    place=place,
                    notes=final_notes
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
    
    import sys
    # ── Startup Validation ──
    lk_key = os.getenv("LIVEKIT_API_KEY", "")
    lk_secret = os.getenv("LIVEKIT_API_SECRET", "")
    
    if not lk_key or lk_key == "REPLACE_WITH_API_KEY":
        sys.exit("FATAL: LIVEKIT_API_KEY is unconfigured or set to REPLACE_WITH_API_KEY placeholder.")
    if not lk_secret or lk_secret == "REPLACE_WITH_API_SECRET":
        sys.exit("FATAL: LIVEKIT_API_SECRET is unconfigured or set to REPLACE_WITH_API_SECRET placeholder.")
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
