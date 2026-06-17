import os
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger("outbound-db")
from collections import defaultdict

# ---------------------------------------------------------------------------
# DEFAULTS — loaded from environment variables only.
# ---------------------------------------------------------------------------
DEFAULTS = {
    "LIVEKIT_URL":             os.getenv("LIVEKIT_URL", ""),
    "LIVEKIT_API_KEY":         os.getenv("LIVEKIT_API_KEY", ""),
    "LIVEKIT_API_SECRET":      os.getenv("LIVEKIT_API_SECRET", ""),
    "GOOGLE_API_KEY":          os.getenv("GOOGLE_API_KEY", ""),
    "GEMINI_MODEL":            os.getenv("GEMINI_MODEL", "models/gemini-2.0-flash-exp"),
    "GEMINI_TTS_VOICE":        os.getenv("GEMINI_TTS_VOICE", "Aoede"),
    "USE_GEMINI_REALTIME":     os.getenv("USE_GEMINI_REALTIME", "true"),
    "VOBIZ_SIP_DOMAIN":        os.getenv("VOBIZ_SIP_DOMAIN", ""),
    "VOBIZ_USERNAME":          os.getenv("VOBIZ_USERNAME", ""),
    "VOBIZ_PASSWORD":          os.getenv("VOBIZ_PASSWORD", ""),
    "VOBIZ_OUTBOUND_NUMBER":   os.getenv("VOBIZ_OUTBOUND_NUMBER", ""),
    "OUTBOUND_TRUNK_ID":       os.getenv("OUTBOUND_TRUNK_ID", ""),
    "DEFAULT_TRANSFER_NUMBER": os.getenv("DEFAULT_TRANSFER_NUMBER", ""),
    "SUPABASE_URL":            os.getenv("SUPABASE_URL", ""),
    "SUPABASE_SERVICE_KEY":    os.getenv("SUPABASE_SERVICE_KEY", ""),
    "DEEPGRAM_API_KEY":        os.getenv("DEEPGRAM_API_KEY", ""),
}


def _default(key: str) -> str:
    return os.getenv(key, DEFAULTS.get(key, ""))


SUPABASE_URL = _default("SUPABASE_URL")
SUPABASE_KEY = _default("SUPABASE_SERVICE_KEY")

SENSITIVE_KEYS = {
    "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "GOOGLE_API_KEY",
    "VOBIZ_PASSWORD", "TWILIO_AUTH_TOKEN", "SUPABASE_SERVICE_KEY",
    "AWS_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY", "CALCOM_API_KEY",
    "DEEPGRAM_API_KEY",
}


def _sdb():
    from supabase import create_client
    return create_client(_default("SUPABASE_URL"), _default("SUPABASE_SERVICE_KEY"))


async def _adb():
    from supabase._async.client import create_client
    return await create_client(_default("SUPABASE_URL"), _default("SUPABASE_SERVICE_KEY"))


def init_db() -> None:
    url = os.getenv("SUPABASE_URL", SUPABASE_URL)
    key = os.getenv("SUPABASE_SERVICE_KEY", SUPABASE_KEY)
    if not url or not key:
        print("⚠️  SUPABASE_URL or SUPABASE_SERVICE_KEY not set.")
        return
    try:
        db = _sdb()
        db.table("settings").select("key").limit(1).execute()
        print("✅ Supabase connected")
    except Exception as exc:
        print(f"⚠️  Supabase connection failed: {exc}")
        print("   Run supabase_schema.sql in your Supabase Dashboard → SQL Editor")


# ── Settings ─────────────────────────────────────────────────────────────────

async def get_all_settings() -> dict:
    db = await _adb()
    result = await db.table("settings").select("key, value").execute()
    KNOWN_KEYS = [
        "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET",
        "GOOGLE_API_KEY", "GEMINI_MODEL", "GEMINI_TTS_VOICE", "USE_GEMINI_REALTIME",
        "VOBIZ_SIP_DOMAIN", "VOBIZ_USERNAME", "VOBIZ_PASSWORD",
        "VOBIZ_OUTBOUND_NUMBER", "OUTBOUND_TRUNK_ID", "DEFAULT_TRANSFER_NUMBER",
        "DEEPGRAM_API_KEY", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER",
        "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_ENDPOINT_URL", "S3_REGION", "S3_BUCKET",
        "CALCOM_API_KEY", "CALCOM_EVENT_TYPE_ID", "CALCOM_TIMEZONE", "CALCOM_USERNAME",
        "ENABLED_TOOLS",
    ]
    out: dict = {}
    for k in KNOWN_KEYS:
        env_val = _default(k)
        if k in SENSITIVE_KEYS:
            out[k] = {"value": "", "configured": bool(env_val)}
        else:
            out[k] = {"value": env_val, "configured": bool(env_val)}
    for row in (result.data or []):
        k, v = row["key"], row["value"]
        if k == "TEST_KEY":
            continue
        if k in SENSITIVE_KEYS:
            out[k] = {"value": "", "configured": bool(v)}
        else:
            out[k] = {"value": v, "configured": bool(v)}
    return out


async def save_settings(data: dict) -> None:
    db = await _adb()
    updated_at = datetime.now().isoformat()
    rows = []
    for k, v in data.items():
        if v is None or v == "": continue
        
        # If the UI accidentally sends back the {value, configured} object, 
        # extract the value string before saving.
        val_str = v
        if isinstance(v, dict) and "value" in v:
            val_str = v["value"]
        
        rows.append({"key": k, "value": str(val_str), "updated_at": updated_at})
    
    if rows:
        try:
            for row in rows:
                k = row["key"]
                existing = await db.table("settings").select("key").eq("key", k).execute()
                if existing.data:
                    await db.table("settings").update({"value": row["value"], "updated_at": row["updated_at"]}).eq("key", k).execute()
                else:
                    await db.table("settings").insert(row).execute()
        except Exception as e:
            logger.error(f"Failed to save settings: {e}")


async def get_setting(key: str, default: str = "") -> str:
    env_val = os.getenv(key)
    if env_val:
        return env_val
    try:
        db = await _adb()
        result = await db.table("settings").select("value").eq("key", key).maybe_single().execute()
        if result and result.data:
            val = result.data["value"]
            if val and val.startswith("{") and "value" in val:
                import ast
                try:
                    parsed = ast.literal_eval(val)
                    if isinstance(parsed, dict) and "value" in parsed:
                        return str(parsed["value"])
                except: pass
            return val
    except Exception as exc:
        pass
    return DEFAULTS.get(key) or default


async def set_setting(key: str, value: str) -> None:
    db = await _adb()
    try:
        existing = await db.table("settings").select("key").eq("key", key).execute()
        if existing.data:
            await db.table("settings").update({"value": value, "updated_at": datetime.now().isoformat()}).eq("key", key).execute()
        else:
            await db.table("settings").insert({"key": key, "value": value, "updated_at": datetime.now().isoformat()}).execute()
    except Exception as e:
        logger.error(f"Failed to set setting {key}: {e}")


async def get_enabled_tools() -> list:
    raw = await get_setting("ENABLED_TOOLS", "")
    if not raw:
        return []
    try:
        import json
        result = json.loads(raw)
        return result if isinstance(result, list) else []
    except Exception:
        return []


# ── Error logs ────────────────────────────────────────────────────────────────

async def log_error(source: str, message: str, detail: str = "", level: str = "error") -> None:
    try:
        db = await _adb()
        await db.table("error_logs").insert({
            "id": str(uuid.uuid4()),
            "source": source,
            "level": level,
            "message": message[:500],
            "detail": detail[:2000],
            "timestamp": datetime.now().isoformat(),
        }).execute()
    except Exception:
        pass


async def get_errors(limit: int = 100) -> list:
    db = await _adb()
    result = await db.table("error_logs").select("*").order("timestamp", desc=True).limit(limit).execute()
    return result.data or []


async def get_logs(level: Optional[str] = None, source: Optional[str] = None, limit: int = 200) -> list:
    db = await _adb()
    query = db.table("error_logs").select("*").order("timestamp", desc=True).limit(limit)
    if level:
        query = query.eq("level", level)
    if source:
        query = query.eq("source", source)
    result = await query.execute()
    return result.data or []


async def clear_errors() -> None:
    db = await _adb()
    await db.table("error_logs").delete().neq("id", "").execute()


# ── Appointments ──────────────────────────────────────────────────────────────

async def insert_appointment(
    name: str, phone: str, date: str, time: str, service: str, whatsapp_number: Optional[str] = None,
    business_name: Optional[str] = None, industry: Optional[str] = None, place: Optional[str] = None
) -> str:
    full_id = str(uuid.uuid4())
    booking_id = full_id[:8].upper()
    db = await _adb()
    payload = {
        "id": full_id, "name": name, "phone": phone,
        "date": date, "time": time, "service": service,
        "status": "booked", "created_at": datetime.now().isoformat(),
    }
    if whatsapp_number: payload["whatsapp_number"] = whatsapp_number
    if business_name: payload["business_name"] = business_name
    if industry: payload["industry"] = industry
    if place: payload["place"] = place
    
    try:
        await db.table("appointments").insert(payload).execute()
    except Exception as e:
        if whatsapp_number or business_name or industry or place:
            print(f"⚠️ Insert failed: {e}. Retrying without optional columns...")
            payload.pop("whatsapp_number", None)
            payload.pop("business_name", None)
            payload.pop("industry", None)
            payload.pop("place", None)
            await db.table("appointments").insert(payload).execute()
        else:
            raise e
    return booking_id


async def check_slot(date: str, time: str) -> bool:
    """Returns True if slot is available (no existing booking)."""
    db = await _adb()
    result = await (
        db.table("appointments").select("id")
        .eq("date", date).eq("time", time).eq("status", "booked")
        .maybe_single().execute()
    )
    return result.data is None


async def get_next_available(date: str, time: str) -> str:
    try:
        dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
    except ValueError:
        dt = datetime.now().replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    for _ in range(7 * 24):
        dt += timedelta(hours=1)
        if 9 <= dt.hour < 18:
            if await check_slot(dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M")):
                return f"{dt.strftime('%Y-%m-%d')} at {dt.strftime('%H:%M')}"
    return "no open slots found in the next 7 days"


async def get_all_appointments(date_filter: Optional[str] = None) -> list:
    await cleanup_unknown_rows()
    db = await _adb()
    query = db.table("appointments").select("*").order("date").order("time")
    if date_filter:
        query = query.eq("date", date_filter)
    result = await query.execute()
    return result.data or []


async def cancel_appointment(appointment_id: str) -> bool:
    db = await _adb()
    result = await (
        db.table("appointments").update({"status": "cancelled"})
        .eq("id", appointment_id).eq("status", "booked").execute()
    )
    return len(result.data or []) > 0


async def get_appointments_by_phone(phone: str) -> list:
    db = await _adb()
    result = await db.table("appointments").select("*").eq("phone", phone).order("date", desc=True).execute()
    return result.data or []


# ── Call logs ─────────────────────────────────────────────────────────────────

async def log_call(
    phone_number: str, lead_name: Optional[str], outcome: str, reason: str,
    duration_seconds: int, recording_url: Optional[str] = None, notes: Optional[str] = None,
    campaign_id: Optional[str] = None, business_name: Optional[str] = None, 
    industry: Optional[str] = None, place: Optional[str] = None,
) -> None:
    db = await _adb()
    row: dict = {
        "id": str(uuid.uuid4()), "phone_number": phone_number, "lead_name": lead_name,
        "outcome": outcome, "reason": reason, "duration_seconds": duration_seconds,
        "timestamp": datetime.now().isoformat(),
    }
    if recording_url: row["recording_url"] = recording_url
    if notes: row["notes"] = notes
    if campaign_id: row["campaign_id"] = campaign_id
    if business_name: row["business_name"] = business_name
    if industry: row["industry"] = industry
    if place: row["place"] = place

    try:
        await db.table("call_logs").insert(row).execute()
    except Exception as e:
        logger.warning(f"Failed to insert call log (attempt 1): {e}")
        # Try stripping optional columns one by one
        for col in ["business_name", "industry", "place", "campaign_id", "notes", "recording_url"]:
            if col in row:
                row.pop(col)
        try:
            await db.table("call_logs").insert(row).execute()
            logger.info("Call log saved on retry (stripped optional columns)")
        except Exception as e2:
            logger.error(f"Failed to insert call log even after stripping columns: {e2}")
    
    # Auto-add/update CRM contacts
    display_name = lead_name if lead_name and lead_name.lower() not in ["there", "unknown", ""] else f"Lead {phone_number}"
    try:
        existing = await db.table("contacts").select("id, name, business_name, industry, place").eq("phone", phone_number).execute()
        if not existing.data:
            contact_data = {
                "id": str(uuid.uuid4()),
                "name": display_name,
                "phone": phone_number,
                "created_at": datetime.now().isoformat()
            }
            if business_name: contact_data["business_name"] = business_name
            if industry: contact_data["industry"] = industry
            if place: contact_data["place"] = place
            await db.table("contacts").insert(contact_data).execute()
            logger.info(f"Auto-added contact to CRM: {display_name} ({phone_number})")
        else:
            # Update existing contact if details are empty or default name
            contact_id = existing.data[0]["id"]
            existing_name = existing.data[0].get("name", "")
            ex_biz = existing.data[0].get("business_name", "")
            ex_ind = existing.data[0].get("industry", "")
            ex_place = existing.data[0].get("place", "")
            
            update_data = {}
            if business_name and business_name != "our company" and (not ex_biz or ex_biz == "our company"):
                update_data["business_name"] = business_name
            if industry and industry != "our service" and (not ex_ind or ex_ind == "our service"):
                update_data["industry"] = industry
            if place and place != "your area" and (not ex_place or ex_place == "your area"):
                update_data["place"] = place
            
            # If the name is default like "Lead +91..." but we have a real lead_name now, update it
            if lead_name and lead_name.lower() not in ["there", "unknown", ""] and (not existing_name or existing_name.startswith("Lead ") or existing_name.startswith("+") or existing_name == "there"):
                update_data["name"] = lead_name
                
            if update_data:
                await db.table("contacts").update(update_data).eq("id", contact_id).execute()
                logger.info(f"Updated CRM contact {contact_id} with new details: {update_data}")
    except Exception as e:
        logger.warning(f"Failed to auto-add/update contact in CRM: {e}")


async def get_campaign_call_logs(campaign_id: str) -> list:
    db = await _adb()
    result = await db.table("call_logs").select("*").eq("campaign_id", campaign_id).order("timestamp", desc=True).execute()
    return result.data or []

async def get_all_calls(page: int = 1, limit: int = 20) -> list:
    await cleanup_unknown_rows()
    db = await _adb()
    offset = (page - 1) * limit
    result = await db.table("call_logs").select("*").order("timestamp", desc=True).range(offset, offset + limit - 1).execute()
    return result.data or []


async def get_calls_by_phone(phone: str) -> list:
    db = await _adb()
    result = await db.table("call_logs").select("*").eq("phone_number", phone).order("timestamp", desc=True).execute()
    return result.data or []


async def update_call_notes(call_id: str, notes: str) -> bool:
    db = await _adb()
    result = await db.table("call_logs").update({"notes": notes}).eq("id", call_id).execute()
    return len(result.data or []) > 0


async def get_contacts() -> list:
    try:
        db = await _adb()
        result = await db.table("contacts").select("*").order("created_at", desc=True).execute()
        return result.data or []
    except Exception:
        return []


async def create_contact(
    name: str, phone: str, email: str = "",
    business_name: Optional[str] = None,
    industry: Optional[str] = None,
    place: Optional[str] = None
) -> str:
    contact_id = str(uuid.uuid4())
    db = await _adb()
    row = {
        "id": contact_id, "name": name, "phone": phone, "email": email,
        "created_at": datetime.now().isoformat()
    }
    if business_name: row["business_name"] = business_name
    if industry: row["industry"] = industry
    if place: row["place"] = place
    await db.table("contacts").insert(row).execute()
    return contact_id


# ── Stats ─────────────────────────────────────────────────────────────────────

async def get_stats() -> dict:
    db = await _adb()
    # Outbound calls
    rows = (await db.table("call_logs").select("outcome, duration_seconds, timestamp").execute()).data or []
    total_calls    = len(rows)
    booked         = sum(1 for r in rows if r.get("outcome") == "booked")
    not_interested = sum(1 for r in rows if r.get("outcome") == "not_interested")
    durations      = [r["duration_seconds"] for r in rows if r.get("duration_seconds")]
    avg_dur        = sum(durations) / len(durations) if durations else 0
    booking_rate   = round((booked / total_calls * 100) if total_calls else 0, 1)
    
    # Incoming calls
    incoming_rows = (await db.table("incoming_calls").select("id").execute()).data or []
    total_incoming = len(incoming_rows)

    outcomes: dict = {}
    for r in rows:
        o = r.get("outcome") or "unknown"
        outcomes[o] = outcomes.get(o, 0) + 1
    
    daily: dict = defaultdict(int)
    for r in rows:
        ts = (r.get("timestamp") or "")[:10]
        if ts:
            daily[ts] += 1
            
    today = datetime.now().date()
    timeline = [
        {"date": (today - timedelta(days=i)).isoformat(), "count": daily.get((today - timedelta(days=i)).isoformat(), 0)}
        for i in range(13, -1, -1)
    ]
    
    dur_sum: dict = defaultdict(float)
    dur_cnt: dict = defaultdict(int)
    for r in rows:
        o = r.get("outcome") or "unknown"
        sec = r.get("duration_seconds")
        if sec:
            dur_sum[o] += sec
            dur_cnt[o] += 1
    duration_by_outcome = {o: dur_sum[o] / dur_cnt[o] for o in dur_sum}
    
    return {
        "total_calls": total_calls, 
        "total_incoming": total_incoming,
        "booked": booked, 
        "not_interested": not_interested,
        "avg_duration_seconds": round(avg_dur, 1), 
        "booking_rate_percent": booking_rate,
        "outcomes": outcomes, 
        "timeline": timeline, 
        "duration_by_outcome": duration_by_outcome,
    }


# ── Campaigns ─────────────────────────────────────────────────────────────────

async def create_campaign(
    name: str, contacts_json: str, schedule_type: str = "once",
    schedule_time: str = "09:00", call_delay_seconds: int = 3,
    system_prompt: Optional[str] = None, agent_profile_id: Optional[str] = None,
) -> str:
    campaign_id = str(uuid.uuid4())
    db = await _adb()
    row: dict = {
        "id": campaign_id, "name": name, "status": "active",
        "contacts_json": contacts_json, "schedule_type": schedule_type,
        "schedule_time": schedule_time, "call_delay_seconds": call_delay_seconds,
        "created_at": datetime.now().isoformat(), "total_dispatched": 0, "total_failed": 0,
    }
    if system_prompt:
        row["system_prompt"] = system_prompt
    if agent_profile_id:
        row["agent_profile_id"] = agent_profile_id
    await db.table("campaigns").insert(row).execute()
    return campaign_id


async def get_all_campaigns() -> list:
    db = await _adb()
    result = await db.table("campaigns").select("*").order("created_at", desc=True).execute()
    return result.data or []


async def get_campaign(campaign_id: str) -> Optional[dict]:
    db = await _adb()
    result = await db.table("campaigns").select("*").eq("id", campaign_id).maybe_single().execute()
    return result.data if result else None


async def update_campaign_status(campaign_id: str, status: str) -> bool:
    db = await _adb()
    result = await db.table("campaigns").update({"status": status}).eq("id", campaign_id).execute()
    return len(result.data or []) > 0


async def update_campaign_run_stats(campaign_id: str, dispatched: int, failed: int) -> None:
    db = await _adb()
    await db.table("campaigns").update({
        "last_run_at": datetime.now().isoformat(),
        "total_dispatched": dispatched, "total_failed": failed, "status": "completed",
    }).eq("id", campaign_id).execute()


async def delete_campaign(campaign_id: str) -> bool:
    db = await _adb()
    result = await db.table("campaigns").delete().eq("id", campaign_id).execute()
    return len(result.data or []) > 0


# ── Contact Memory ────────────────────────────────────────────────────────────

async def add_contact_memory(phone: str, insight: str) -> None:
    db = await _adb()
    await db.table("contact_memory").insert({
        "id": str(uuid.uuid4()), "phone_number": phone,
        "insight": insight[:1000], "created_at": datetime.now().isoformat(),
    }).execute()


async def get_contact_memory(phone: str) -> list:
    db = await _adb()
    result = await (
        db.table("contact_memory").select("insight, created_at")
        .eq("phone_number", phone).order("created_at", desc=True).limit(20).execute()
    )
    return result.data or []


async def compress_contact_memory(phone: str, compressed: str) -> None:
    db = await _adb()
    await db.table("contact_memory").delete().eq("phone_number", phone).execute()
    await db.table("contact_memory").insert({
        "id": str(uuid.uuid4()), "phone_number": phone,
        "insight": compressed[:2000], "created_at": datetime.now().isoformat(),
    }).execute()


# ── Agent Profiles ────────────────────────────────────────────────────────────

async def get_all_agent_profiles() -> list:
    db = await _adb()
    result = await db.table("agent_profiles").select("*").order("created_at").execute()
    return result.data or []


async def get_agent_profile(profile_id: str) -> Optional[dict]:
    db = await _adb()
    result = await db.table("agent_profiles").select("*").eq("id", profile_id).maybe_single().execute()
    return result.data if result else None


async def create_agent_profile(
    name: str, voice: str = "Aoede", model: str = "models/gemini-2.0-flash-exp",
    system_prompt: Optional[str] = None, enabled_tools: str = "[]", is_default: bool = False,
    place: Optional[str] = None,
) -> str:
    profile_id = str(uuid.uuid4())
    db = await _adb()
    # Force integer (Supabase INTEGER column expects 0 or 1, not boolean)
    default_val = 1 if is_default in (True, 1, "true", "1") else 0
    
    row = {
        "id": profile_id, "name": name, "voice": voice, "model": model,
        "system_prompt": system_prompt, "enabled_tools": enabled_tools,
        "is_default": default_val, "created_at": datetime.now().isoformat(),
    }
    if place:
        row["place"] = place

    if default_val == 1:
        await db.table("agent_profiles").update({"is_default": 0}).neq("id", "placeholder").execute()
    await db.table("agent_profiles").insert(row).execute()
    return profile_id


async def update_agent_profile(profile_id: str, updates: dict) -> bool:
    db = await _adb()
    if "is_default" in updates:
        val = updates["is_default"]
        default_val = 1 if val in (True, 1, "true", "1") else 0
        updates["is_default"] = default_val
        if default_val == 1:
            await db.table("agent_profiles").update({"is_default": 0}).neq("id", "placeholder").execute()
    result = await db.table("agent_profiles").update(updates).eq("id", profile_id).execute()
    return len(result.data or []) > 0


async def delete_agent_profile(profile_id: str) -> bool:
    db = await _adb()
    result = await db.table("agent_profiles").delete().eq("id", profile_id).execute()
    return len(result.data or []) > 0


async def get_default_agent_profile() -> Optional[dict]:
    db = await _adb()
    result = await db.table("agent_profiles").select("*").eq("is_default", 1).execute()
    data = result.data or []
    return data[0] if data else None


async def set_default_agent_profile(profile_id: str) -> None:
    db = await _adb()
    await db.table("agent_profiles").update({"is_default": 0}).neq("id", "placeholder").execute()
    await db.table("agent_profiles").update({"is_default": 1}).eq("id", profile_id).execute()

# ── Transactions ──────────────────────────────────────────────────────────────

# ── Transactions ──────────────────────────────────────────────────────────────

async def log_transaction(
    charger_identity: str,
    charger_name: str,
    user_name: str,
    phone: str,
    start_time: str,
    energy_kwh: str = "0",
    amount: str = "0",
    call_reason: Optional[str] = None,
    rectification_used: Optional[str] = None,
    status: str = "completed"
) -> None:
    db = await _adb()
    
    # Try inserting with new call detail columns first
    try:
        await db.table("transactions").insert({
            "id": str(uuid.uuid4()),
            "charger_identity": charger_identity,
            "charger_name": charger_name,
            "user_name": user_name,
            "phone": phone,
            "start_time": start_time,
            "stop_time": datetime.now().isoformat(),
            "energy_kwh": str(energy_kwh) if energy_kwh is not None else "0",
            "amount": str(amount) if amount is not None else "0",
            "status": status,
            "call_reason": call_reason,
            "rectification_used": rectification_used,
            "created_at": datetime.now().isoformat()
        }).execute()
        return
    except Exception as e:
        # Fallback if call_reason or rectification_used columns are not in database:
        # We pack call_reason into user_name, and rectification_used into energy_kwh
        print(f"Proper transaction logging failed (likely missing columns, attempting fallback): {e}")
        
    try:
        fallback_user = f"{user_name} | Reason: {call_reason}" if call_reason else user_name
        await db.table("transactions").insert({
            "id": str(uuid.uuid4()),
            "charger_identity": charger_identity,
            "charger_name": charger_name,
            "user_name": fallback_user,
            "phone": phone,
            "start_time": start_time,
            "stop_time": datetime.now().isoformat(),
            "energy_kwh": rectification_used or "None",
            "amount": status or "completed",
            "status": status or "completed",
            "created_at": datetime.now().isoformat()
        }).execute()
    except Exception as fallback_err:
        print(f"Fallback transaction logging also failed: {fallback_err}")


async def sync_calcom_bookings() -> None:
    api_key = os.getenv("CALCOM_API_KEY")
    if not api_key:
        print("[*] Cal.com Sync: CALCOM_API_KEY is not set.")
        return
        
    print(f"[*] Cal.com Sync: Fetching bookings from Cal.com API v2...")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "cal-api-version": "2024-08-13",
        "Content-Type": "application/json"
    }
    
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://api.cal.com/v2/bookings", headers=headers, timeout=10.0)
            if resp.status_code != 200:
                print(f"[-] Cal.com Sync: API returned status {resp.status_code}: {resp.text}")
                return
            
            raw_data = resp.json()
            bookings = []
            if isinstance(raw_data, dict):
                data_field = raw_data.get("data")
                if isinstance(data_field, dict):
                    bookings = data_field.get("bookings", [])
                elif isinstance(data_field, list):
                    bookings = data_field
                else:
                    bookings = raw_data.get("bookings", [])
            elif isinstance(raw_data, list):
                bookings = raw_data
                
            print(f"[+] Cal.com Sync: Retrieved {len(bookings)} bookings.")
            
            db = await _adb()
            existing_res = await db.table("appointments").select("id, calcom_booking_uid").not_.is_("calcom_booking_uid", "null").execute()
            existing_map = {row["calcom_booking_uid"]: row["id"] for row in (existing_res.data or [])}
            
            for b in bookings:
                booking_uid = str(b.get("uid") or b.get("id") or "")
                if not booking_uid:
                    continue
                
                attendees = b.get("attendees", [])
                client_name = "Cal.com Client"
                client_phone = "unknown"
                if attendees and len(attendees) > 0:
                    att = attendees[0]
                    client_name = att.get("name") or att.get("email") or client_name
                    client_phone = att.get("phoneNumber") or att.get("phone") or client_phone
                
                client_phone = str(client_phone).strip()
                
                start_iso = b.get("start") or b.get("startTime") or ""
                if not start_iso:
                    continue
                
                try:
                    dt_part = start_iso.split("T")
                    b_date = dt_part[0]
                    b_time = dt_part[1][:5]
                except Exception:
                    b_date = datetime.now().strftime("%Y-%m-%d")
                    b_time = datetime.now().strftime("%H:%M")
                
                status = str(b.get("status", "booked")).lower()
                mapped_status = "booked"
                if status in ["cancelled", "rejected"]:
                    mapped_status = "cancelled"
                
                event_type_details = b.get("eventType") or {}
                service_name = b.get("title") or event_type_details.get("title") or "Meeting"
                
                if booking_uid in existing_map:
                    appt_id = existing_map[booking_uid]
                    await db.table("appointments").update({
                        "name": client_name,
                        "phone": client_phone,
                        "date": b_date,
                        "time": b_time,
                        "service": service_name,
                        "status": mapped_status,
                    }).eq("id", appt_id).execute()
                    print(f"[*] Cal.com Sync: Updated booking {booking_uid}")
                else:
                    new_id = str(uuid.uuid4())
                    await db.table("appointments").insert({
                        "id": new_id,
                        "name": client_name,
                        "phone": client_phone,
                        "date": b_date,
                        "time": b_time,
                        "service": service_name,
                        "status": mapped_status,
                        "calcom_booking_uid": booking_uid,
                        "created_at": datetime.now().isoformat()
                    }).execute()
                    print(f"[+] Cal.com Sync: Inserted booking {booking_uid}")
                    
    except Exception as e:
        print(f"[-] Cal.com Sync Error: {e}")

async def cleanup_unknown_rows() -> None:
    """Light cleanup — only delete rows with truly invalid phone numbers.
    NEVER delete rows based on lead_name because 'there' is the valid default."""
    try:
        db = await _adb()
        
        # 1. Clean appointments with truly invalid data
        res = await db.table("appointments").select("id, name, phone").execute()
        if res.data:
            to_delete = []
            for row in res.data:
                name = str(row.get("name") or "").lower().strip()
                phone = str(row.get("phone") or "").lower().strip()
                if (
                    not phone or 
                    phone in ["unknown", "—", "none"] or
                    (not name or name in ["unknown"])
                ):
                    to_delete.append(row["id"])
            for row_id in to_delete:
                await db.table("appointments").delete().eq("id", row_id).execute()
                
        # 2. Clean call_logs — ONLY delete truly broken rows (no phone number)
        res_calls = await db.table("call_logs").select("id, phone_number").execute()
        if res_calls.data:
            to_delete_calls = []
            for row in res_calls.data:
                phone = str(row.get("phone_number") or "").lower().strip()
                if not phone or phone in ["unknown", "—", "none"]:
                    to_delete_calls.append(row["id"])
            for row_id in to_delete_calls:
                await db.table("call_logs").delete().eq("id", row_id).execute()

        # 3. Clean incoming_calls
        res_inc = await db.table("incoming_calls").select("id, phone_number").execute()
        if res_inc.data:
            to_delete_inc = []
            for row in res_inc.data:
                phone = str(row.get("phone_number") or "").lower().strip()
                if not phone or phone in ["unknown", "—", "none"]:
                    to_delete_inc.append(row["id"])
            for row_id in to_delete_inc:
                await db.table("incoming_calls").delete().eq("id", row_id).execute()

    except Exception as e:
        logger.warning(f"Cleanup error (non-fatal): {e}")

async def get_all_transactions(limit: int = 50) -> list:
    await cleanup_unknown_rows()
    db = await _adb()
    result = await db.table("transactions").select("*").order("created_at", desc=True).limit(limit).execute()
    return result.data or []

# ── Incoming Calls ────────────────────────────────────────────────────────────

async def log_incoming_call(phone: str, status: str = "received", duration: int = 0) -> str:
    call_id = str(uuid.uuid4())
    db = await _adb()
    try:
        await db.table("incoming_calls").insert({
            "id": call_id,
            "phone_number": phone,
            "status": status,
            "duration_seconds": duration,
            "timestamp": datetime.now().isoformat()
        }).execute()
    except Exception as e:
        print(f"Error logging incoming call: {e}")
    return call_id

async def get_incoming_calls(limit: int = 50) -> list:
    await cleanup_unknown_rows()
    db = await _adb()
    result = await db.table("incoming_calls").select("*").order("timestamp", desc=True).limit(limit).execute()
    return result.data or []

async def delete_contacts(contact_ids: list) -> bool:
    try:
        db = await _adb()
        await db.table("contacts").delete().in_("id", contact_ids).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to delete contacts: {e}")
        return False

async def delete_call_logs(call_ids: list) -> bool:
    try:
        db = await _adb()
        await db.table("call_logs").delete().in_("id", call_ids).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to delete call logs: {e}")
        return False

async def delete_appointments(appointment_ids: list) -> bool:
    try:
        db = await _adb()
        await db.table("appointments").delete().in_("id", appointment_ids).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to delete appointments: {e}")
        return False

async def delete_campaigns(campaign_ids: list) -> bool:
    try:
        db = await _adb()
        await db.table("campaigns").delete().in_("id", campaign_ids).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to delete campaigns: {e}")
        return False

async def delete_agent_profiles(profile_ids: list) -> bool:
    try:
        db = await _adb()
        result = await db.table("agent_profiles").delete().in_("id", profile_ids).execute()
        return len(result.data or []) > 0
    except Exception as e:
        logger.error(f"Failed to delete agent profiles: {e}")
        return False

async def delete_incoming_calls(call_ids: list) -> bool:
    try:
        db = await _adb()
        result = await db.table("incoming_calls").delete().in_("id", call_ids).execute()
        return len(result.data or []) > 0
    except Exception as e:
        logger.error(f"Failed to delete incoming calls: {e}")
        return False
