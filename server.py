"""FastAPI backend for the OutboundAI dashboard."""

import asyncio
import json
import logging
import os
import random
import ssl
import certifi
import aiohttp
import urllib.parse
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request, UploadFile, File, Form
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

# ── SSL patch ─────────────────────────────────────────────────────────────────
_orig_ssl = ssl.create_default_context
def _certifi_ssl(purpose=ssl.Purpose.SERVER_AUTH, **kwargs):
    if not kwargs.get("cafile") and not kwargs.get("capath") and not kwargs.get("cadata"):
        kwargs["cafile"] = certifi.where()
    return _orig_ssl(purpose, **kwargs)
ssl.create_default_context = _certifi_ssl

from db import (
    SENSITIVE_KEYS, cancel_appointment, clear_errors, create_campaign, delete_campaign,
    get_all_appointments, get_all_calls, get_all_campaigns, get_all_settings,
    get_all_agent_profiles, get_agent_profile, create_agent_profile, update_agent_profile,
    delete_agent_profile, set_default_agent_profile, get_calls_by_phone, get_campaign,
    get_contacts, get_errors, get_logs, get_setting, get_stats, init_db, log_error,
    save_settings, set_setting, update_call_notes, update_campaign_run_stats,
    update_campaign_status, get_all_transactions, get_incoming_calls, log_incoming_call,
    cleanup_unknown_rows, create_contact
)
from prompts import DEFAULT_SYSTEM_PROMPT
from config import REALTIME_MODEL, CHAT_MODEL, DEFAULT_VOICE

load_dotenv(".env", override=True)

# ── Startup Validation ──
_lk_key = os.getenv("LIVEKIT_API_KEY", "")
_lk_secret = os.getenv("LIVEKIT_API_SECRET", "")
if not _lk_key or _lk_key == "REPLACE_WITH_API_KEY":
    import sys
    sys.exit("FATAL: LIVEKIT_API_KEY is unconfigured or set to REPLACE_WITH_API_KEY placeholder.")
if not _lk_secret or _lk_secret == "REPLACE_WITH_API_SECRET":
    import sys
    sys.exit("FATAL: LIVEKIT_API_SECRET is unconfigured or set to REPLACE_WITH_API_SECRET placeholder.")
DATA_DIR = "/data" if os.path.exists("/data") else "data"
log_path = os.path.join(DATA_DIR, "app.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler(log_path, mode='a', encoding='utf-8')]
)
logger = logging.getLogger("server")

init_db()

# Add api-call directory to path for EV tool imports
import sys
_api_call_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "api-call")
if _api_call_path not in sys.path:
    sys.path.append(_api_call_path)

try:
    from chargepoints import resolve_charger, fetch_chargepoint_details
    from charger_action import charger_action
    from RemoteStart import get_customer_info, get_wallet_balance
    _EV_TOOLS_AVAILABLE = True
except ImportError as e:
    _EV_TOOLS_AVAILABLE = False
    logger.warning(f"EV tools logic not found or incomplete: {e}")

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    _scheduler = AsyncIOScheduler()
except ImportError:
    _scheduler = None
    logger.warning("APScheduler not installed — campaign scheduling disabled")

app = FastAPI(title="OutboundAI Dashboard", version="1.0.0")

from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory="data"), name="static")



@app.on_event("startup")
async def _startup():
    # Clean stale/unknown/placeholder rows from DB on boot
    try:
        await cleanup_unknown_rows()
        print("[+] Startup: Database cleanup completed.")
    except Exception as e:
        print(f"[-] Startup: Database cleanup failed: {e}")
    if _scheduler:
        _scheduler.start()
        await _reschedule_all_campaigns()


@app.on_event("shutdown")
async def _shutdown():
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)


async def eff(key: str) -> str:
    """Effective value: Env overrides Supabase settings."""
    env_val = os.getenv(key, "")
    if env_val:
        return env_val
    return await get_setting(key, "")


# ── Request models ────────────────────────────────────────────────────────────

class CallRequest(BaseModel):
    phone: str
    lead_name: str = "there"
    business_name: str = "our company"
    service_type: Optional[str] = None
    industry: Optional[str] = None
    place: Optional[str] = None
    system_prompt: Optional[str] = None
    agent_profile_id: Optional[str] = None


class AgentProfileRequest(BaseModel):
    name: str
    voice: str = DEFAULT_VOICE
    model: str = REALTIME_MODEL
    system_prompt: Optional[str] = None
    enabled_tools: str = "[]"
    is_default: bool = False
    place: Optional[str] = None
    welcome_message: Optional[str] = None
    knowledge_base: Optional[str] = None
    speech_settings: Optional[str] = None
    call_settings: Optional[str] = None


class PromptRequest(BaseModel):
    prompt: str
    enabled_tools: Optional[str] = None


class SettingsRequest(BaseModel):
    settings: dict


class NotesRequest(BaseModel):
    notes: str


class ChatRequest(BaseModel):
    message: str
    history: list = []
    system_prompt: Optional[str] = None
    enabled_tools: Optional[str] = None
    phone_number: Optional[str] = "+919876543210"


class CampaignRequest(BaseModel):
    name: str
    contacts: list
    schedule_type: str = "once"
    schedule_time: str = "09:00"
    call_delay_seconds: int = 3
    system_prompt: Optional[str] = None
    agent_profile_id: Optional[str] = None


class StatusRequest(BaseModel):
    status: str


# ── Dashboard HTML ────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    html_path = Path(__file__).parent / "ui" / "index.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(encoding="utf-8"))
    return HTMLResponse(
        "<h1 style='font-family:sans-serif;padding:2rem'>Dashboard not found — place index.html in ui/</h1>",
        status_code=404,
    )

@app.get("/api/init_demo_data")
async def init_demo_data():
    from prompts import INDUSTRY_PROMPTS
    import uuid
    from datetime import datetime
    try:
        from db import _adb
        db_client = await _adb()
        
        # Clear existing agent profiles and contacts to reset to new Malayalam domains
        try:
            await db_client.table("agent_profiles").delete().neq("id", "").execute()
        except Exception as del_err:
            logger.warning(f"Error resetting tables: {del_err}")
        
        # 1. Insert Agent Profiles
        inserted_profiles = 0
        for name, prompt in INDUSTRY_PROMPTS.items():
            await db_client.table("agent_profiles").insert({
                "id": str(uuid.uuid4()),
                "name": name,
                "voice": DEFAULT_VOICE,
                "model": REALTIME_MODEL,
                "system_prompt": prompt,
                "enabled_tools": "[]",
                "is_default": 0,
                "created_at": datetime.now().isoformat()
            }).execute()
            inserted_profiles += 1
                
        inserted_leads = 0
                
        return JSONResponse({"status": "success", "inserted_profiles": inserted_profiles, "inserted_leads": inserted_leads})
    except Exception as e:
        logger.error(f"Error initializing demo data: {e}")
        return JSONResponse({"status": "error", "detail": str(e)}, status_code=500)

# ── Call dispatch & LiveKit ───────────────────────────────────────────────────

@app.get("/api/livekit/rooms")
async def api_get_livekit_rooms():
    url = await eff("LIVEKIT_URL")
    key = await eff("LIVEKIT_API_KEY")
    secret = await eff("LIVEKIT_API_SECRET")
    if not all([url, key, secret]):
        return []
    
    try:
        from livekit import api as lk_api
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        session = aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ctx))
        lk = lk_api.LiveKitAPI(url=url, api_key=key, api_secret=secret, session=session)
        rooms_resp = await lk.room.list_rooms(lk_api.ListRoomsRequest())
        rooms = []
        for r in rooms_resp.rooms:
            # Only show real agent call rooms — exclude SIP infra, test, and empty rooms
            name = r.name
            is_real_call = (
                name.startswith("camp-") or        # outbound campaign calls
                name.startswith("call-")           # inbound calls created by server
            )
            has_participants = r.num_participants > 0
            if is_real_call and has_participants:
                rooms.append({
                    "sid": r.sid, "name": name, "empty_timeout": r.empty_timeout,
                    "max_participants": r.max_participants, "creation_time": r.creation_time,
                    "num_participants": r.num_participants
                })
        await lk.aclose()
        await session.close()
        return {"rooms": rooms}
    except Exception as e:
        logger.error(f"Error fetching rooms: {e}")
        return {"rooms": []}


@app.post("/api/livekit/token")
async def api_generate_livekit_token(req: dict):
    room_name = req.get("room")
    participant_name = req.get("participant_name", "Dashboard_Admin")
    if not room_name:
        raise HTTPException(400, "room is required")
        
    url = await eff("LIVEKIT_URL")
    key = await eff("LIVEKIT_API_KEY")
    secret = await eff("LIVEKIT_API_SECRET")
    if not all([url, key, secret]):
        raise HTTPException(400, "LiveKit credentials not configured")
        
    try:
        from livekit.api import AccessToken, VideoGrants
        grant = VideoGrants(room=room_name, room_join=True, can_publish=True, can_subscribe=True)
        access_token = AccessToken(key, secret)
        access_token.with_identity(participant_name).with_name(participant_name).with_grants(grant)
        token = access_token.to_jwt()
        return {"token": token, "url": url}
    except Exception as e:
        logger.error(f"Error generating token: {e}")
        raise HTTPException(500, f"Token generation failed: {e}")

@app.post("/api/agent/test")
async def api_agent_test(req: dict):
    room_name = req.get("room")
    agent_profile_id = req.get("agent_profile_id")
    if not room_name:
        raise HTTPException(400, "room is required")
        
    url = await eff("LIVEKIT_URL")
    key = await eff("LIVEKIT_API_KEY")
    secret = await eff("LIVEKIT_API_SECRET")
    if not all([url, key, secret]):
        raise HTTPException(400, "LiveKit credentials not configured")
        
    try:
        from livekit import api as lk_api
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        session = aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ctx))
        lk = lk_api.LiveKitAPI(url=url, api_key=key, api_secret=secret, session=session)
        
        await lk.agent_dispatch.create_dispatch(lk_api.CreateAgentDispatchRequest(
            agent_name="outbound-caller",
            room=room_name,
            metadata=json.dumps({"agent_profile_id": agent_profile_id}) if agent_profile_id else "{}"
        ))
        
        await lk.aclose()
        await session.close()
        return {"status": "agent_dispatched"}
    except Exception as e:
        logger.error(f"Error dispatching test agent: {e}")
        raise HTTPException(500, f"Dispatch failed: {e}")

@app.post("/api/call")
async def api_dispatch_call(req: CallRequest):
    url    = await eff("LIVEKIT_URL")
    key    = await eff("LIVEKIT_API_KEY")
    secret = await eff("LIVEKIT_API_SECRET")

    if not all([url, key, secret]):
        raise HTTPException(400, "LiveKit credentials not configured. Go to Settings → LiveKit.")

    phone = req.phone.strip()
    if not phone.startswith("+"):
        raise HTTPException(400, "Phone must be in E.164 format: +919876543210")

    effective_prompt = req.system_prompt
    effective_voice  = None
    effective_model  = None
    effective_tools  = None
    req_place = req.place

    if req.agent_profile_id:
        profile = await get_agent_profile(req.agent_profile_id)
        if profile:
            if not effective_prompt and profile.get("system_prompt"):
                effective_prompt = profile["system_prompt"]
            effective_voice = profile.get("voice")
            effective_model = profile.get("model")
            effective_tools = profile.get("enabled_tools")
            if not req_place and profile.get("place"):
                req_place = profile["place"]

    req_industry = req.industry or req.service_type or "our service"
    req_place = req_place or "your area"

    if not effective_voice:
        # No voice in profile — fall back to global default from config.py
        effective_voice = os.getenv("GEMINI_VOICE", DEFAULT_VOICE)

    from prompts import build_prompt
    effective_prompt = build_prompt(req.lead_name, req.business_name, req_industry, effective_prompt, place=req_place)

    room_name = f"call-{phone.replace('+', '')}-{random.randint(1000, 9999)}"
    metadata: dict = {
        "phone_number":   phone,
        "lead_name":      req.lead_name,
        "business_name":  req.business_name,
        "industry":       req_industry,
        "place":          req_place,
        "service_type":   req_industry,
        "system_prompt":  effective_prompt,
    }
    if effective_voice:  metadata["voice_override"]  = effective_voice
    if effective_model:  metadata["model_override"]  = effective_model
    if effective_tools:  metadata["tools_override"]  = effective_tools
    if req.agent_profile_id: metadata["agent_profile_id"] = req.agent_profile_id

    try:
        from livekit import api as lk_api
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        session = aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ctx))
        lk = lk_api.LiveKitAPI(url=url, api_key=key, api_secret=secret, session=session)
        await lk.room.create_room(
            lk_api.CreateRoomRequest(name=room_name, empty_timeout=300, max_participants=5)
        )
        await lk.agent_dispatch.create_dispatch(
            lk_api.CreateAgentDispatchRequest(
                agent_name="outbound-caller",
                room=room_name,
                metadata=json.dumps(metadata),
            )
        )
        await lk.aclose()
        await session.close()
        await log_error("server", f"Call dispatched to {phone}", f"room={room_name}", "info")
        return {"status": "dispatched", "room": room_name, "phone": phone}
    except Exception as exc:
        logger.error("Dispatch error: %s", exc)
        raise HTTPException(500, f"Dispatch failed: {exc}")


# ── Calls ─────────────────────────────────────────────────────────────────────

@app.get("/api/calls")
async def api_get_all_calls(page: int = 1, limit: int = 5000) -> list:
    return await get_all_calls(page, limit)

@app.get("/api/calls/phone/{phone}")
async def api_get_calls_by_phone(phone: str) -> list:
    db = await _adb()
    decoded_phone = urllib.parse.unquote(phone)
    digits_only = "".join(filter(str.isdigit, decoded_phone))
    if digits_only:
        # Use the last 10 digits to match (ignoring country codes)
        last_10 = digits_only[-10:] if len(digits_only) >= 10 else digits_only
        result = await db.table("call_logs").select("*").ilike("phone_number", f"%{last_10}%").order("timestamp", desc=True).execute()
    else:
        result = await db.table("call_logs").select("*").eq("phone_number", decoded_phone).order("timestamp", desc=True).execute()
        
    return result.data or []


@app.patch("/api/calls/{call_id}/notes")
async def api_update_notes(call_id: str, req: NotesRequest):
    ok = await update_call_notes(call_id, req.notes)
    if not ok:
        raise HTTPException(404, "Call not found")
    return {"status": "updated"}

@app.delete("/api/calls/{call_id}")
async def api_delete_call(call_id: str):
    from db import delete_call_logs
    ok = await delete_call_logs([call_id])
    return {"status": "deleted" if ok else "failed"}

@app.post("/api/calls/delete-bulk")
async def api_delete_calls_bulk(req: dict):
    from db import delete_call_logs
    ids = req.get("ids", [])
    if not ids:
        return {"status": "success", "count": 0}
    ok = await delete_call_logs(ids)
    return {"status": "deleted" if ok else "failed", "count": len(ids)}

@app.get("/api/transactions")
async def api_get_transactions(limit: int = 50):
    return await get_all_transactions(limit=limit)

@app.get("/api/incoming_calls")
async def api_get_incoming_calls(limit: int = 50):
    return await get_incoming_calls(limit=limit)

@app.post("/api/incoming_calls/delete-bulk")
async def api_delete_incoming_calls_bulk(req: dict):
    from db import delete_incoming_calls
    ids = req.get("ids", [])
    if not ids:
        return {"status": "success", "count": 0}
    ok = await delete_incoming_calls(ids)
    return {"status": "deleted" if ok else "failed", "count": len(ids)}

@app.post("/api/webhook")
@app.post("/api/livekit/webhook")
@app.post("/api/vobiz/webhook")
async def livekit_webhook(request: Request):
    """Webhook to receive LiveKit events, such as inbound calls."""
    try:
        body = await request.body()
        data = json.loads(body.decode("utf-8"))
        event_type = data.get("event")
        logger.info(f"[WEBHOOK] Received event: {event_type}")

        if event_type == "sip_inbound_call":
            phone = data.get("sip_call", {}).get("from_uri", "Unknown")
            await log_incoming_call(phone=phone, status="received")
            logger.info(f"[WEBHOOK] Inbound SIP Call from {phone}")

        elif event_type == "participant_joined":
            participant = data.get("participant", {})
            room = data.get("room", {})
            room_name = room.get("name", "")
            identity = participant.get("identity", "")
            logger.info(f"[WEBHOOK] participant_joined room={room_name} identity={identity}")

            # Only dispatch for SIP participants in inbound rooms
            if "sip" in identity.lower() and room_name.startswith("inbound-"):
                phone = participant.get("name", identity)
                await log_incoming_call(phone=phone, status="joined_room")
                logger.info(f"[WEBHOOK] Inbound SIP participant joined. Dispatching agent for room={room_name}")

                url = await eff("LIVEKIT_URL")
                key = await eff("LIVEKIT_API_KEY")
                secret = await eff("LIVEKIT_API_SECRET")

                if not all([url, key, secret]):
                    logger.error("[WEBHOOK] LiveKit credentials missing — cannot dispatch agent")
                else:
                    try:
                        # Look up the default inbound profile
                        from db import get_default_inbound_profile
                        inbound_profile = None
                        try:
                            inbound_profile = await get_default_inbound_profile()
                        except Exception:
                            pass

                        metadata: dict = {
                            "phone_number": "",   # empty = inbound (no outbound dial)
                            "is_inbound": True,
                            "caller_phone": phone,
                        }
                        if inbound_profile:
                            metadata["agent_profile_id"] = inbound_profile.get("id", "")
                            logger.info(f"[WEBHOOK] Using inbound profile: {inbound_profile.get('name')} ({metadata['agent_profile_id']})")
                        else:
                            logger.info("[WEBHOOK] No default inbound profile — using system default")

                        from livekit import api as lk_api
                        ctx = ssl.create_default_context()
                        ctx.check_hostname = False
                        ctx.verify_mode = ssl.CERT_NONE
                        session = aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ctx))
                        lk = lk_api.LiveKitAPI(url=url, api_key=key, api_secret=secret, session=session)
                        await lk.agent_dispatch.create_dispatch(
                            lk_api.CreateAgentDispatchRequest(
                                agent_name="outbound-caller",
                                room=room_name,
                                metadata=json.dumps(metadata),
                            )
                        )
                        logger.info(f"[WEBHOOK] ✅ Agent dispatched for inbound call room={room_name}")
                        await lk.aclose()
                        await session.close()
                    except Exception as e:
                        import traceback
                        logger.error(f"[WEBHOOK] ❌ Failed to dispatch agent: {e}\n{traceback.format_exc()}")

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}



# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
async def api_get_stats():
    return await get_stats()


# ── Appointments ──────────────────────────────────────────────────────────────

@app.get("/api/appointments")
async def api_get_appointments(date: Optional[str] = None):
    try:
        from db import sync_calcom_bookings
        await sync_calcom_bookings()
    except Exception as e:
        print(f"Error syncing Cal.com bookings on API call: {e}")
        
    raw_appts = await get_all_appointments(date_filter=date)
    mapped = []
    from datetime import datetime
    for appt in raw_appts:
        c_name = appt.get("name") or "Unknown"
        c_phone = appt.get("phone") or "—"
        
        # Format time to standard ISO-8601
        a_date = appt.get("date")
        a_time = appt.get("time")
        if a_date and a_time:
            # Handle HH:MM formatting
            t_str = a_time.strip()
            if len(t_str) == 5:
                appt_time_iso = f"{a_date}T{t_str}:00"
            else:
                appt_time_iso = f"{a_date}T{t_str}"
        else:
            appt_time_iso = appt.get("created_at") or datetime.now().isoformat()
            
        status = str(appt.get("status") or "booked").lower()
        if status == "booked":
            status = "scheduled"
            
        mapped.append({
            "id": appt.get("id"),
            "client_name": c_name,
            "client_phone": c_phone,
            "appointment_time": appt_time_iso,
            "status": status,
            "service": appt.get("service") or "General Meeting",
            "whatsapp_number": appt.get("whatsapp_number") or "",
            "business_name": appt.get("business_name") or "",
            "industry": appt.get("industry") or "",
            "place": appt.get("place") or "",
            "created_at": appt.get("created_at") or datetime.now().isoformat()
        })
    return mapped


@app.delete("/api/appointments/{appointment_id}")
async def api_delete_appointment(appointment_id: str):
    from db import delete_appointments
    ok = await delete_appointments([appointment_id])
    if not ok:
        raise HTTPException(404, "Appointment not found")
    return {"status": "deleted"}

@app.post("/api/appointments/delete-bulk")
async def api_delete_appointments_bulk(req: dict):
    from db import delete_appointments
    ids = req.get("ids", [])
    if not ids:
        return {"status": "success", "count": 0}
    ok = await delete_appointments(ids)
    return {"status": "deleted" if ok else "failed", "count": len(ids)}

@app.post("/api/appointments/{appointment_id}/cancel")
async def api_post_cancel_appointment(appointment_id: str):
    ok = await cancel_appointment(appointment_id)
    if not ok:
        return {"status": "failed"}
    return {"status": "cancelled"}


# ── Prompt ────────────────────────────────────────────────────────────────────

@app.get("/api/prompt")
async def api_get_prompt():
    saved = await get_setting("system_prompt", "")
    tools = await get_setting("ENABLED_TOOLS", "[]")
    return {
        "prompt": saved or DEFAULT_SYSTEM_PROMPT, 
        "is_custom": bool(saved),
        "enabled_tools": tools
    }


@app.post("/api/prompt")
async def api_save_prompt(req: PromptRequest):
    await set_setting("system_prompt", req.prompt)
    if req.enabled_tools is not None:
        await set_setting("ENABLED_TOOLS", req.enabled_tools)
    return {"status": "saved"}


@app.delete("/api/prompt")
async def api_reset_prompt():
    await set_setting("system_prompt", "")
    return {"status": "reset", "prompt": DEFAULT_SYSTEM_PROMPT}


# ── Logs ──────────────────────────────────────────────────────────────────────

@app.get("/api/logs")
async def api_get_logs():
    try:
        log_path = "/data/app.log" if os.path.exists("/data") else "app.log"
        if not os.path.exists(log_path):
            return {"logs": "No logs generated yet."}
        # Read the last 50 lines
        with open(log_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        return {"logs": "".join(lines[-50:])}
    except Exception as e:
        return {"logs": f"Error fetching logs: {e}"}


# ── Settings ──────────────────────────────────────────────────────────────────

@app.get("/api/settings")
async def api_get_settings():
    return await get_all_settings()


@app.post("/api/settings")
async def api_save_settings(req: SettingsRequest):
    filtered = {k: v for k, v in req.settings.items() if v is not None and v != ""}
    await save_settings(filtered)
    for k, v in filtered.items():
        os.environ[k] = str(v)
    return {"status": "saved", "count": len(filtered)}


# ── Profiles ──────────────────────────────────────────────────────────────────

@app.get("/api/profiles")
async def api_get_profiles():
    return await get_all_agent_profiles()


@app.post("/api/profiles")
async def api_create_profile(req: AgentProfileRequest):
    profile_id = await create_agent_profile(
        name=req.name, voice=req.voice, model=req.model,
        system_prompt=req.system_prompt, enabled_tools=req.enabled_tools,
        is_default=req.is_default, place=req.place,
        welcome_message=req.welcome_message,
        speech_settings=req.speech_settings or "{}",
        call_settings=req.call_settings or "{}",
        knowledge_base=req.knowledge_base or ""
    )
    return {"status": "created", "id": profile_id}


@app.put("/api/profiles/{profile_id}")
async def api_update_profile(profile_id: str, updates: dict):
    ok = await update_agent_profile(profile_id, updates)
    return {"status": "updated" if ok else "not_found"}


@app.delete("/api/profiles/{profile_id}")
async def api_delete_profile(profile_id: str):
    await delete_agent_profile(profile_id)
    return {"status": "deleted"}

@app.post("/api/profiles/delete-bulk")
async def api_delete_profiles_bulk(req: dict):
    from db import delete_agent_profiles
    ids = req.get("ids", [])
    if not ids:
        return {"status": "success", "count": 0}
    ok = await delete_agent_profiles(ids)
    return {"status": "deleted" if ok else "failed", "count": len(ids)}


@app.post("/api/profiles/{profile_id}/default")
async def api_set_default_profile(profile_id: str):
    await set_default_agent_profile(profile_id)
    return {"status": "default_set"}


# ── Profile Documents / Knowledge Base ──────────────────────────────────────────

@app.get("/api/profiles/{profile_id}/documents")
async def api_get_profile_documents(profile_id: str):
    import os
    import json
    doc_dir = os.path.join(DATA_DIR, "agent_docs", profile_id)
    if not os.path.exists(doc_dir):
        return {"documents": [], "links": []}
    
    files = []
    links = []
    
    # Read files
    for f in os.listdir(doc_dir):
        if f == "links.json" or f.endswith(".txt"):
            continue
        filepath = os.path.join(doc_dir, f)
        if os.path.isfile(filepath):
            files.append({
                "name": f,
                "size": os.path.getsize(filepath)
            })
            
    # Read links
    links_file = os.path.join(doc_dir, "links.json")
    if os.path.exists(links_file):
        try:
            with open(links_file, "r") as lf:
                links = json.load(lf)
        except Exception:
            pass
            
    return {"documents": files, "links": links}


@app.post("/api/profiles/{profile_id}/documents")
async def api_upload_profile_document(profile_id: str, file: UploadFile = File(...)):
    import os
    import shutil
    doc_dir = os.path.join(DATA_DIR, "agent_docs", profile_id)
    os.makedirs(doc_dir, exist_ok=True)
    
    filepath = os.path.join(doc_dir, file.filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # If PDF, extract text for retrieval
    if file.filename.lower().endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(filepath)
            text = ""
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
            
            txt_filepath = filepath + ".txt"
            with open(txt_filepath, "w", encoding="utf-8") as tf:
                tf.write(text)
        except Exception as e:
            logger.warning("Failed to extract PDF text: %s", e)
            
    return {"status": "success", "filename": file.filename}


@app.post("/api/profiles/{profile_id}/links")
async def api_add_profile_link(profile_id: str, req: dict):
    import os
    import json
    url = req.get("url")
    desc = req.get("description", "")
    if not url:
        raise HTTPException(400, "URL is required")
        
    doc_dir = os.path.join(DATA_DIR, "agent_docs", profile_id)
    os.makedirs(doc_dir, exist_ok=True)
    
    links_file = os.path.join(doc_dir, "links.json")
    links = []
    if os.path.exists(links_file):
        try:
            with open(links_file, "r") as lf:
                links = json.load(lf)
        except Exception:
            pass
            
    links.append({"url": url, "description": desc})
    
    with open(links_file, "w") as lf:
        json.dump(links, lf)
        
    return {"status": "success", "links": links}


@app.delete("/api/profiles/{profile_id}/documents/{filename}")
async def api_delete_profile_document(profile_id: str, filename: str):
    import os
    doc_dir = os.path.join(DATA_DIR, "agent_docs", profile_id)
    filepath = os.path.join(doc_dir, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
        # Also remove extracted text file if exists
        txt_path = filepath + ".txt"
        if os.path.exists(txt_path):
            os.remove(txt_path)
        return {"status": "deleted"}
    return {"status": "not_found"}


@app.delete("/api/profiles/{profile_id}/links")
async def api_delete_profile_link(profile_id: str, url: str):
    import os
    import json
    doc_dir = os.path.join(DATA_DIR, "agent_docs", profile_id)
    links_file = os.path.join(doc_dir, "links.json")
    if os.path.exists(links_file):
        try:
            with open(links_file, "r") as lf:
                links = json.load(lf)
            new_links = [l for l in links if l.get("url") != url]
            with open(links_file, "w") as lf:
                json.dump(new_links, lf)
            return {"status": "deleted", "links": new_links}
        except Exception as e:
            raise HTTPException(500, str(e))
    return {"status": "not_found"}


# ── CRM / Contacts ────────────────────────────────────────────────────────────

@app.get("/api/contacts")
async def api_get_contacts():
    return await get_contacts()


@app.post("/api/contacts")
async def api_create_contact(req: dict):
    contact_id = await create_contact(
        name=req.get("name", "Unknown"),
        phone=req.get("phone", ""),
        email=req.get("email", ""),
        business_name=req.get("business_name"),
        industry=req.get("industry"),
        place=req.get("place")
    )
    return {"status": "created", "id": contact_id}

@app.delete("/api/contacts/{contact_id}")
async def api_delete_contact(contact_id: str):
    from db import delete_contacts
    ok = await delete_contacts([contact_id])
    if not ok:
        raise HTTPException(404, "Contact not found")
    return {"status": "deleted"}

@app.post("/api/contacts/delete-bulk")
async def api_delete_contacts_bulk(req: dict):
    from db import delete_contacts
    ids = req.get("ids", [])
    if not ids:
        return {"status": "success", "count": 0}
    ok = await delete_contacts(ids)
    return {"status": "deleted" if ok else "failed", "count": len(ids)}


# ── Campaigns ─────────────────────────────────────────────────────────────────

@app.get("/api/campaigns")
async def api_get_campaigns():
    return await get_all_campaigns()


@app.post("/api/campaigns")
async def api_create_campaign(req: dict):
    # Process contacts from JSON string or list
    contacts = req.get("contacts", [])
    import json
    contacts_json = json.dumps(contacts) if isinstance(contacts, list) else str(contacts)

    campaign_id = await create_campaign(
        name=req.get("name", "New Campaign"),
        contacts_json=contacts_json,
        schedule_type=req.get("schedule_type", "once"),
        schedule_time=req.get("schedule_time", "09:00"),
        call_delay_seconds=req.get("call_delay_seconds", 3),
        system_prompt=req.get("system_prompt"),
        agent_profile_id=req.get("agent_profile_id")
    )
    return {"status": "created", "id": campaign_id}


@app.delete("/api/campaigns/{id}")
async def api_delete_campaign(id: str):
    success = await delete_campaign(id)
    return {"status": "deleted" if success else "failed"}

@app.post("/api/campaigns/delete-bulk")
async def api_delete_campaigns_bulk(req: dict):
    from db import delete_campaigns
    ids = req.get("ids", [])
    if not ids:
        return {"status": "success", "count": 0}
    ok = await delete_campaigns(ids)
    return {"status": "deleted" if ok else "failed", "count": len(ids)}


# ── EV Operations ─────────────────────────────────────────────────────────────

@app.get("/api/ev/stations/search")
async def api_search_stations(q: str):
    if not _EV_TOOLS_AVAILABLE:
        raise HTTPException(503, "EV tools unavailable")
    res = resolve_charger(q)
    return res

@app.get("/api/ev/stations/{identity}")
async def api_get_station_details(identity: str):
    if not _EV_TOOLS_AVAILABLE:
        raise HTTPException(530, "EV tools unavailable")
    details = fetch_chargepoint_details(identity)
    if not details:
        raise HTTPException(404, "Station not found")
    return details

@app.get("/api/ev/wallet/{phone}")
async def api_get_wallet(phone: str):
    if not _EV_TOOLS_AVAILABLE:
        raise HTTPException(503, "EV tools unavailable")
    user, err = get_customer_info(phone)
    if err or not user:
        raise HTTPException(404, "User not found")
    balance, err = get_wallet_balance(user["userId"])
    return {"phone": phone, "user": user, "balance": balance, "error": err}

@app.post("/api/ev/actions")
async def api_ev_action(req: dict):
    """
    Generic endpoint for EV actions: availability, start, stop, tariff.
    """
    if not _EV_TOOLS_AVAILABLE:
        raise HTTPException(503, "EV tools unavailable")
    
    action = req.get("action")
    identity = req.get("charger_identity")
    
    res = charger_action(
        action=action,
        charger_identity=identity,
        customer_mobile=req.get("customer_mobile"),
        connector_id=req.get("connector_id"),
        otp_method=req.get("otp_method"),
        otp_code=req.get("otp_code"),
        confirmed_mobile=req.get("confirmed_mobile")
    )
    return res

# ── SIP trunk setup ───────────────────────────────────────────────────────────

@app.post("/api/setup/trunk")
async def api_setup_trunk():
    url        = await eff("LIVEKIT_URL")
    key        = await eff("LIVEKIT_API_KEY")
    secret     = await eff("LIVEKIT_API_SECRET")
    sip_domain = await eff("VOBIZ_SIP_DOMAIN")
    username   = await eff("VOBIZ_USERNAME")
    password   = await eff("VOBIZ_PASSWORD")
    phone      = await eff("VOBIZ_OUTBOUND_NUMBER")

    if not all([url, key, secret, sip_domain, username, password, phone]):
        raise HTTPException(400, "Configure LiveKit + Vobiz credentials in Settings first.")

    try:
        from livekit import api as lk_api
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        session = aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ctx))
        lk = lk_api.LiveKitAPI(url=url, api_key=key, api_secret=secret, session=session)
        trunk = await lk.sip.create_sip_outbound_trunk(
            lk_api.CreateSIPOutboundTrunkRequest(
                trunk=lk_api.SIPOutboundTrunkInfo(
                    name="Vobiz Outbound Trunk",
                    address=sip_domain,
                    auth_username=username,
                    auth_password=password,
                    numbers=[phone],
                )
            )
        )
        trunk_id = trunk.sip_trunk_id
        await set_setting("OUTBOUND_TRUNK_ID", trunk_id)
        os.environ["OUTBOUND_TRUNK_ID"] = trunk_id
        await lk.aclose()
        await session.close()
        return {"status": "created", "trunk_id": trunk_id}
    except Exception as exc:
        raise HTTPException(500, f"Trunk creation failed: {exc}")


# ── Logs ──────────────────────────────────────────────────────────────────────

@app.get("/api/logs")
async def api_get_logs(limit: int = 200, level: Optional[str] = None, source: Optional[str] = None):
    return await get_logs(level=level, source=source, limit=limit)


@app.delete("/api/logs")
async def api_clear_logs():
    await clear_errors()
    return {"status": "cleared"}


# ── CRM ───────────────────────────────────────────────────────────────────────

@app.get("/api/crm")
async def api_get_contacts():
    return {"data": await get_contacts()}


@app.get("/api/crm/calls")
async def api_get_contact_calls(phone: str = Query(...)):
    return {"data": await get_calls_by_phone(phone)}


# ── Agent Profiles ────────────────────────────────────────────────────────────

@app.get("/api/agent-profiles")
async def api_list_agent_profiles():
    try:
        return await get_all_agent_profiles()
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/api/agent-profiles")
async def api_create_agent_profile(req: AgentProfileRequest):
    try:
        profile_id = await create_agent_profile(
            name=req.name, voice=req.voice, model=req.model,
            system_prompt=req.system_prompt, enabled_tools=req.enabled_tools, is_default=req.is_default,
            place=req.place,
        )
        return {"status": "created", "id": profile_id}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.get("/api/agent-profiles/{profile_id}")
async def api_get_agent_profile(profile_id: str):
    profile = await get_agent_profile(profile_id)
    if not profile:
        raise HTTPException(404, "Profile not found")
    return profile


@app.put("/api/agent-profiles/{profile_id}")
async def api_update_agent_profile(profile_id: str, req: AgentProfileRequest):
    ok = await update_agent_profile(profile_id, {
        "name": req.name, "voice": req.voice, "model": req.model,
        "system_prompt": req.system_prompt, "enabled_tools": req.enabled_tools,
        "is_default": 1 if req.is_default else 0,
        "place": req.place,
    })
    if not ok:
        raise HTTPException(404, "Profile not found")
    return {"status": "updated"}


@app.delete("/api/agent-profiles/{profile_id}")
async def api_delete_agent_profile_route(profile_id: str):
    ok = await delete_agent_profile(profile_id)
    if not ok:
        raise HTTPException(404, "Profile not found")
    return {"status": "deleted"}


@app.post("/api/agent-profiles/{profile_id}/set-default")
async def api_set_default_profile(profile_id: str):
    try:
        await set_default_agent_profile(profile_id)
        return {"status": "default set"}
    except Exception as exc:
        raise HTTPException(500, str(exc))


# ── Campaigns ─────────────────────────────────────────────────────────────────

async def _dispatch_one(lk, lk_api, contact: dict, room_name: str,
                         prompt: Optional[str], profile: Optional[dict] = None,
                         campaign_id: Optional[str] = None) -> bool:
    try:
        # Prompt priority: 1. Campaign 2. Profile 3. Global Setting
        saved_prompt = prompt
        if not saved_prompt and profile and profile.get("system_prompt"):
            saved_prompt = profile.get("system_prompt")
        if not saved_prompt:
            saved_prompt = (await get_setting("system_prompt", "")) or None
            
        metadata: dict = {
            "phone_number":  contact["phone"],
            "lead_name":     contact.get("lead_name", "there"),
            "business_name": contact.get("business_name", "our company"),
            "industry":      contact.get("industry", "our service"),
            "place":         contact.get("place", "your area"),
            "system_prompt": saved_prompt,
        }
        
        if campaign_id:
            metadata["campaign_id"] = campaign_id
            
        if profile:
            if profile.get("voice"):         metadata["voice_override"]  = profile["voice"]
            if profile.get("model"):         metadata["model_override"]  = profile["model"]
            if profile.get("enabled_tools"): metadata["tools_override"]  = profile["enabled_tools"]
            if profile.get("id"):            metadata["agent_profile_id"] = profile["id"]
        await lk.room.create_room(
            lk_api.CreateRoomRequest(name=room_name, empty_timeout=300, max_participants=5)
        )
        await lk.agent_dispatch.create_dispatch(
            lk_api.CreateAgentDispatchRequest(
                agent_name="outbound-caller",
                room=room_name,
                metadata=json.dumps(metadata),
            )
        )
        return True
    except Exception as exc:
        logger.error("Campaign dispatch error for %s: %s", contact.get("phone"), exc)
        return False


async def _run_campaign(campaign_id: str) -> None:
    campaign = await get_campaign(campaign_id)
    if not campaign:
        return
    contacts = json.loads(campaign.get("contacts_json") or "[]")
    if not contacts:
        return
    delay            = int(campaign.get("call_delay_seconds") or 3)
    prompt           = campaign.get("system_prompt")
    agent_profile_id = campaign.get("agent_profile_id")
    profile = await get_agent_profile(agent_profile_id) if agent_profile_id else None

    url    = await eff("LIVEKIT_URL")
    key    = await eff("LIVEKIT_API_KEY")
    secret = await eff("LIVEKIT_API_SECRET")
    if not (url and key and secret):
        logger.error("Campaign %s: LiveKit not configured", campaign_id)
        return

    from livekit import api as lk_api_module
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    session = aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=ctx))

    max_concurrent = int(await get_setting("MAX_CONCURRENT_CALLS", "2"))
    
    ok_count = fail_count = 0
    try:
        lk = lk_api_module.LiveKitAPI(url=url, api_key=key, api_secret=secret, session=session)
        for i, contact in enumerate(contacts):
            # Dynamically check status to allow pausing/stopping mid-run
            current_campaign = await get_campaign(campaign_id)
            if not current_campaign or current_campaign.get("status") not in ("active", "dispatching"):
                logger.info("Campaign %s paused/stopped. Aborting run loop.", campaign_id)
                break

            phone = str(contact.get("phone", "")).strip().replace(" ", "").replace("-", "")
            
            # Auto-format phone number
            if phone and not phone.startswith("+"):
                # If it's exactly 10 digits, assume it's an Indian number
                if len(phone) == 10 and phone.isdigit():
                    phone = "+91" + phone
                else:
                    phone = "+" + phone

            if not phone or len(phone) < 7:
                logger.warning(f"Campaign {campaign_id}: Skipping invalid phone number: '{phone}'")
                fail_count += 1
                continue
            
            # SAVE the formatted phone back so _dispatch_one uses it!
            contact["phone"] = phone
                
            # Wait if we hit the concurrent call limit
            import time
            while True:
                try:
                    rooms_resp = await lk.room.list_rooms(lk_api_module.ListRoomsRequest())
                    now = time.time()
                    active_outbound = [
                        r for r in rooms_resp.rooms 
                        if r.name.startswith("camp-") and (r.num_participants > 0 or now - r.creation_time < 60)
                    ]
                    if len(active_outbound) < max_concurrent:
                        break
                    else:
                        logger.info("Campaign %s: Waiting for concurrent limit (%d/%d)...", campaign_id, len(active_outbound), max_concurrent)
                except Exception as e:
                    logger.warning("Failed to list active rooms for concurrency check: %s", e)
                await asyncio.sleep(2)

            room_name = f"camp-{campaign_id[:8]}-{phone.replace('+','')}-{random.randint(100,999)}"
            success = await _dispatch_one(lk, lk_api_module, contact, room_name, prompt, profile, campaign_id=campaign_id)
            if success:
                ok_count += 1
            else:
                fail_count += 1
            if i < len(contacts) - 1:
                await asyncio.sleep(delay)
        await lk.aclose()
    except Exception as exc:
        logger.error("Campaign run error: %s", exc)
    finally:
        await session.close()

    await update_campaign_run_stats(campaign_id, ok_count, fail_count)
    logger.info("Campaign %s done — %d dispatched, %d failed", campaign_id, ok_count, fail_count)

async def _reschedule_all_campaigns() -> None:
    if not _scheduler:
        return
    try:
        campaigns = await get_all_campaigns()
        for c in campaigns:
            if c.get("status") == "active" and c.get("schedule_type") in ("once", "daily", "weekdays"):
                _schedule_campaign(c["id"], c["schedule_type"], c.get("schedule_time", "09:00"))
    except Exception as exc:
        logger.warning("Could not reschedule campaigns: %s", exc)


def _schedule_campaign(campaign_id: str, schedule_type: str, schedule_time: str) -> None:
    if not _scheduler:
        return
    job_id = f"campaign_{campaign_id}"
    if _scheduler.get_job(job_id):
        _scheduler.remove_job(job_id)
    from apscheduler.triggers.date import DateTrigger
    import datetime
    from zoneinfo import ZoneInfo
    
    try:
        hour, minute = map(int, schedule_time.split(":"))
    except (ValueError, AttributeError):
        hour, minute = 9, 0

    tz = ZoneInfo("Asia/Kolkata")
    
    if schedule_type == "daily":
        trigger = CronTrigger(hour=hour, minute=minute, timezone=tz)
    elif schedule_type == "weekdays":
        trigger = CronTrigger(day_of_week="mon-fri", hour=hour, minute=minute, timezone=tz)
    else:
        # "once"
        now = datetime.datetime.now(tz)
        target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if target < now:
            # If the scheduled time is in the past (e.g. current minute already started, or server was offline),
            # trigger it almost immediately (in 5 seconds) instead of rescheduling it for tomorrow.
            target = now + datetime.timedelta(seconds=5)
        trigger = DateTrigger(run_date=target)

    _scheduler.add_job(
        _run_campaign, trigger=trigger, args=[campaign_id],
        id=job_id, replace_existing=True,
    )
    logger.info("Scheduled campaign %s (%s at %02d:%02d IST) — next fire: %s", campaign_id, schedule_type, hour, minute, trigger)


@app.post("/api/campaigns")
async def api_create_campaign(req: CampaignRequest):
    if not req.contacts:
        raise HTTPException(400, "contacts list cannot be empty")
    if req.schedule_type not in ("once", "daily", "weekdays"):
        raise HTTPException(400, "schedule_type must be: once | daily | weekdays")

    campaign_id = await create_campaign(
        name=req.name, contacts_json=json.dumps(req.contacts),
        schedule_type=req.schedule_type, schedule_time=req.schedule_time,
        call_delay_seconds=req.call_delay_seconds, system_prompt=req.system_prompt,
        agent_profile_id=req.agent_profile_id,
    )
    campaign = await get_campaign(campaign_id)

    _schedule_campaign(campaign_id, req.schedule_type, req.schedule_time)

    return {"status": "created", "campaign_id": campaign_id, "campaign": campaign}


@app.get("/api/campaigns")
async def api_list_campaigns():
    return await get_all_campaigns()


@app.delete("/api/campaigns/{campaign_id}")
async def api_delete_campaign(campaign_id: str):
    ok = await delete_campaign(campaign_id)
    if not ok:
        raise HTTPException(404, "Campaign not found")
    job_id = f"campaign_{campaign_id}"
    if _scheduler and _scheduler.get_job(job_id):
        _scheduler.remove_job(job_id)
    return {"status": "deleted"}


@app.post("/api/campaigns/{campaign_id}/run")
async def api_run_campaign_now(campaign_id: str):
    campaign = await get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    await update_campaign_status(campaign_id, "active")
    asyncio.create_task(_run_campaign(campaign_id))
    return {"status": "active", "campaign_id": campaign_id}

@app.get("/api/campaigns/{campaign_id}/logs")
async def api_get_campaign_logs(campaign_id: str):
    from db import get_campaign_call_logs, get_campaign, _adb
    try:
        logs = await get_campaign_call_logs(campaign_id)
        return logs
    except Exception as e:
        logger.warning(f"Error getting logs by campaign_id (column missing?): {e}. Falling back to phone numbers.")
        
        # Fallback: find logs matching the campaign's phone numbers
        try:
            campaign = await get_campaign(campaign_id)
            if not campaign:
                return []
            contacts = json.loads(campaign.get("contacts_json") or "[]")
            phones = [c.get("phone") for c in contacts if c.get("phone")]
            if not phones:
                return []
                
            db = await _adb()
            result = await db.table("call_logs").select("*").in_("phone_number", phones).order("timestamp", desc=True).limit(100).execute()
            return result.data or []
        except Exception as fallback_e:
            logger.error(f"Fallback logs error: {fallback_e}")
            return []


@app.patch("/api/campaigns/{campaign_id}/status")
async def api_update_campaign_status(campaign_id: str, req: StatusRequest):
    if req.status not in ("active", "paused", "completed"):
        raise HTTPException(400, "status must be: active | paused | completed")
    ok = await update_campaign_status(campaign_id, req.status)
    if not ok:
        raise HTTPException(404, "Campaign not found")
    job_id = f"campaign_{campaign_id}"
    if req.status == "paused" and _scheduler and _scheduler.get_job(job_id):
        _scheduler.remove_job(job_id)
    elif req.status == "active":
        campaign = await get_campaign(campaign_id)
        if campaign and campaign.get("schedule_type") in ("daily", "weekdays"):
            _schedule_campaign(campaign_id, campaign["schedule_type"], campaign.get("schedule_time", "09:00"))
    return {"status": req.status}


# ── Chat Simulation (Testing) ──────────────────────────────────────────────────

@app.post("/api/chat")
async def api_chat_test(req: ChatRequest):
    api_key = await eff("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(400, "GOOGLE_API_KEY not configured.")

    try:
        from google import genai as _genai
        from db import get_enabled_tools

        # 1. Resolve enabled tools list
        enabled = req.enabled_tools
        if enabled is None:
            enabled = await get_setting("ENABLED_TOOLS", "[]")
        try:
            enabled_list = json.loads(enabled)
        except Exception:
            enabled_list = []

        # 2. Build system prompt
        system_prompt = req.system_prompt or await get_setting("system_prompt", DEFAULT_SYSTEM_PROMPT)

        # 3. Initialize google-genai client
        client = _genai.Client(api_key=api_key)

        # 4. Build history in google-genai format
        history_contents = []
        for turn in (req.history or []):
            role = turn.get("role", "user")
            parts = turn.get("parts", [])
            text = "".join(p.get("text", "") for p in parts if isinstance(p, dict))
            if text:
                history_contents.append({"role": role, "parts": [{"text": text}]})

        # 5. Append the new user message
        history_contents.append({"role": "user", "parts": [{"text": req.message}]})

        from google.genai import types as _gtypes
        response = client.models.generate_content(
            model=CHAT_MODEL,
            contents=history_contents,
            config=_gtypes.GenerateContentConfig(system_instruction=system_prompt),
        )

        reply_text = response.text if hasattr(response, "text") else str(response)

        # 6. Build updated history for the UI
        new_history = list(req.history or [])
        new_history.append({"role": "user", "parts": [{"text": req.message}]})
        new_history.append({"role": "model", "parts": [{"text": reply_text}]})

        return {"response": reply_text, "history": new_history}
    except Exception as exc:
        logger.error("Chat test error: %s", exc)
        return {"response": f"Error: {str(exc)}", "history": req.history}


# ── Demo Data Initialization ──────────────────────────────────────────────────

@app.get("/api/init_demo_data")
async def api_init_demo_data():
    """Populate the database with sample data for demonstration."""
    import uuid
    from datetime import datetime, timedelta
    import db
    
    try:
        # 1. Add Agent Profiles
        profiles = await db.get_all_agent_profiles()
        if not profiles:
            await db.create_agent_profile(
                name="Swaram AI (Default)",
                voice=DEFAULT_VOICE,
                model=REALTIME_MODEL,
                system_prompt="You are Swaram, a friendly AI assistant for EV charging.",
                is_default=1
            )
            await db.create_agent_profile(
                name="Sales Closer",
                voice=DEFAULT_VOICE,
                model=REALTIME_MODEL,
                system_prompt="You are a professional sales closer.",
                is_default=0
            )

        # 2. Add Contacts (Leads)
        contacts = await db.get_contacts()
        if not contacts:
            leads = [
                {"name": "Chris Smith", "phone": "+919876543210", "email": "chris@example.com"},
                {"name": "Sarah Jones", "phone": "+918765432109", "email": "sarah@example.com"},
                {"name": "Mike Ross", "phone": "+917654321098", "email": "mike@example.com"},
            ]
            for lead in leads:
                await db.create_contact(lead["name"], lead["phone"], lead["email"])

        # 3. Add EV Transactions
        transactions = await db.get_all_transactions()
        if not transactions:
            db_client = await db._adb()
            for i in range(5):
                await db_client.table("transactions").insert({
                    "id": str(uuid.uuid4()),
                    "charger_identity": f"CM-00{i+1}",
                    "charger_name": f"ChargeMOD Station {i+1}",
                    "user_name": ["Chris", "Sarah", "Mike", "John", "Doe"][i],
                    "phone": f"+91900000000{i}",
                    "energy_kwh": str(round(random.uniform(5, 40), 2)),
                    "amount": str(random.randint(100, 1000)),
                    "status": "completed",
                    "created_at": (datetime.now() - timedelta(days=i)).isoformat()
                }).execute()

        # 4. Add Campaigns
        campaigns = await db.get_all_campaigns()
        if not campaigns:
            await db.create_campaign(
                name="Demo Campaign",
                contacts_json=json.dumps([{"phone": "+919876543210"}]),
                schedule_type="once"
            )

        return {"status": "success", "message": "Demo data initialized"}
    except Exception as e:
        logger.error("Failed to init demo data: %s", e)
        return {"status": "error", "message": str(e)}


@app.get("/api/temp-parse-pdf")
async def temp_parse_pdf():
    try:
        import sys
        import subprocess
        
        try:
            import pypdf
        except ImportError:
            logger.info("pypdf not found, installing via pip...")
            res = subprocess.run(
                [sys.executable, "-m", "pip", "install", "pypdf", "--trusted-host", "pypi.org", "--trusted-host", "files.pythonhosted.org", "--trusted-host", "pypi.python.org"],
                capture_output=True,
                text=True
            )
            if res.returncode != 0:
                return {"status": "error", "message": f"pip install failed:\nstdout: {res.stdout}\nstderr: {res.stderr}"}
            import pypdf
            
        pdf_path = "data/ErrorCode/most common ev charging issues and troubleshoots.pdf"
        if not os.path.exists(pdf_path):
            return {"status": "error", "message": f"File not found: {pdf_path}"}
            
        reader = pypdf.PdfReader(pdf_path)
        text_content = ""
        for i, page in enumerate(reader.pages):
            text_content += f"\n--- PAGE {i+1} ---\n"
            text_content += page.extract_text()
            
        out_path = "data/ErrorCode/most_common_issues.txt"
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text_content)
            
        return {"status": "success", "file": out_path, "preview": text_content[:1000]}
    except Exception as e:
        logger.error("Failed to parse PDF: %s", e)
        return {"status": "error", "message": str(e)}


@app.get("/api/test-calcom")
async def test_calcom():
    """Test Cal.com API v2 connectivity — fetches event types for the configured account."""
    import httpx
    try:
        api_key = os.getenv("CALCOM_API_KEY", "cal_live_47e56e649fffbff64e6799370962ce75")
        username = os.getenv("CALCOM_USERNAME", "chris-thomas-4ulokx")
        event_type_id = os.getenv("CALCOM_EVENT_TYPE_ID")
        headers_v2 = {
            "Authorization": f"Bearer {api_key}",
            "cal-api-version": "2024-06-14",
        }
        from datetime import datetime as _dt2, timedelta as _td2
        today = _dt2.now().strftime("%Y-%m-%d")
        tomorrow = (_dt2.now() + _td2(days=1)).strftime("%Y-%m-%d")

        params = {
            "start": f"{today}T00:00:00.000Z",
            "end": f"{tomorrow}T23:59:59.000Z",
            "timeZone": "Asia/Kolkata"
        }
        if event_type_id:
            try:
                params["eventTypeId"] = int(event_type_id)
            except ValueError:
                params["eventTypeId"] = event_type_id
        else:
            params["username"] = username

        async with httpx.AsyncClient(timeout=15) as client:
            et_res = await client.get("https://api.cal.com/v2/event-types", headers=headers_v2)
            av_res = await client.get(
                "https://api.cal.com/v2/slots",
                headers={**headers_v2, "cal-api-version": "2024-09-04"},
                params=params
            )

        # Safely parse — Cal.com may return list or dict
        et_raw = et_res.text
        av_raw = av_res.text
        try:
            import json as _json
            et_json = _json.loads(et_raw)
        except Exception:
            et_json = {"raw": et_raw[:500]}
        try:
            import json as _json
            av_json = _json.loads(av_raw)
        except Exception:
            av_json = {"raw": av_raw[:500]}

        # Extract event type list (handle list or dict wrapper)
        et_list = []
        try:
            data = et_json if not isinstance(et_json, dict) else et_json.get("data", et_json)
            if isinstance(data, dict):
                data = data.get("eventTypes", [])
            if isinstance(data, list):
                for et in data:
                    if isinstance(et, dict):
                        et_list.append({"id": et.get("id"), "title": et.get("title"),
                                        "slug": et.get("slug"), "duration": et.get("length") or et.get("duration")})
        except Exception as pe:
            et_list = [{"parse_error": str(pe)}]

        return {
            "api_status": "connected" if et_res.status_code == 200 else "error",
            "event_types": et_list,
            "event_types_http": et_res.status_code,
            "availability_http": av_res.status_code,
            "availability_preview": av_raw[:1000],
            "tip": "Copy an 'id' from event_types and set it as CALCOM_EVENT_TYPE_ID in your .env or Settings page."
        }
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()[-500:]}






