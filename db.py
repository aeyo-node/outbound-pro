import os
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger("outbound-db")
from collections import defaultdict
from config import REALTIME_MODEL, DEFAULT_VOICE

# ---------------------------------------------------------------------------
# DEFAULTS — loaded from environment variables only.
# ---------------------------------------------------------------------------
DEFAULTS = {
    "LIVEKIT_URL":             os.getenv("LIVEKIT_URL", ""),
    "LIVEKIT_API_KEY":         os.getenv("LIVEKIT_API_KEY", ""),
    "LIVEKIT_API_SECRET":      os.getenv("LIVEKIT_API_SECRET", ""),
    "GOOGLE_API_KEY":          os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY", ""),
    "GEMINI_MODEL":            os.getenv("GEMINI_MODEL", REALTIME_MODEL),
    "GEMINI_VOICE":            os.getenv("GEMINI_VOICE", DEFAULT_VOICE),
    "USE_GEMINI_REALTIME":     os.getenv("USE_GEMINI_REALTIME", "true"),
    "VOBIZ_SIP_DOMAIN":        os.getenv("VOBIZ_SIP_DOMAIN", ""),
    "VOBIZ_USERNAME":          os.getenv("VOBIZ_USERNAME", ""),
    "VOBIZ_PASSWORD":          os.getenv("VOBIZ_PASSWORD", ""),
    "VOBIZ_OUTBOUND_NUMBER":   os.getenv("VOBIZ_OUTBOUND_NUMBER", ""),
    "OUTBOUND_TRUNK_ID":       os.getenv("OUTBOUND_TRUNK_ID", ""),
    "DEFAULT_TRANSFER_NUMBER": os.getenv("DEFAULT_TRANSFER_NUMBER", ""),
    "SUPABASE_URL":            os.getenv("SUPABASE_URL", ""),
    "SUPABASE_SERVICE_KEY":    os.getenv("SUPABASE_SERVICE_KEY", ""),
}


def _default(key: str) -> str:
    return os.getenv(key, DEFAULTS.get(key, ""))


SUPABASE_URL = _default("SUPABASE_URL")
SUPABASE_KEY = _default("SUPABASE_SERVICE_KEY")

SENSITIVE_KEYS = {
    "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "GOOGLE_API_KEY",
    "VOBIZ_PASSWORD", "TWILIO_AUTH_TOKEN", "SUPABASE_SERVICE_KEY",
    "AWS_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY", "CALCOM_API_KEY",
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
        "GOOGLE_API_KEY", "GEMINI_MODEL", "GEMINI_VOICE", "USE_GEMINI_REALTIME",
        "VOBIZ_SIP_DOMAIN", "VOBIZ_USERNAME", "VOBIZ_PASSWORD",
        "VOBIZ_OUTBOUND_NUMBER", "OUTBOUND_TRUNK_ID", "DEFAULT_TRANSFER_NUMBER",
        "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER",
        "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_ENDPOINT_URL", "S3_REGION", "S3_BUCKET",
        "CALCOM_API_KEY", "CALCOM_EVENT_TYPE_ID", "CALCOM_TIMEZONE", "CALCOM_USERNAME",
        "ENABLED_TOOLS", "KNOWLEDGE_BASE",
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
        elif isinstance(v, str):
            import ast
            try:
                # Recursively unwrap stringified dicts
                unwrapped = v
                while unwrapped.startswith("{") and "value" in unwrapped:
                    parsed = ast.literal_eval(unwrapped)
                    if isinstance(parsed, dict) and "value" in parsed:
                        unwrapped = str(parsed["value"])
                    else:
                        break
                val_str = unwrapped
            except Exception:
                pass
        
        rows.append({"key": k, "value": str(val_str).strip(), "updated_at": updated_at})
    
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


async def get_incoming_calls(limit: int = 50, tenant_id: str = "system") -> list:
    db = await _adb()
    q = db.table("incoming_calls").select("*, tenants(name)")
    if tenant_id != "system":
        q = q.eq("tenant_id", tenant_id)
    result = await q.order("timestamp", desc=True).limit(limit).execute()
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


async def get_all_appointments(date_filter: Optional[str] = None, tenant_id: str = "system") -> list:
    await cleanup_unknown_rows()
    db = await _adb()
    query = db.table("appointments").select("*, tenants(name)").order("created_at", desc=True)
    if date_filter:
        query = query.eq("date", date_filter)
    if tenant_id != "system":
        query = query.eq("tenant_id", tenant_id)
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
        logger.info(f"[DB] Successfully inserted call log for {phone_number}")
    except Exception as e:
        logger.warning(f"Failed to insert call log (attempt 1): {e}")
        # Try stripping optional columns one by one
        for col in ["business_name", "industry", "place", "campaign_id", "notes", "recording_url"]:
            if col in row:
                row.pop(col)
        try:
            await db.table("call_logs").insert(row).execute()
            logger.info(f"[DB] Call log saved on retry (stripped optional columns) for {phone_number}")
        except Exception as e2:
            logger.error(f"Failed to insert call log even after stripping columns: {e2}")
    
    # Auto-add/update CRM contacts
    display_name = lead_name if lead_name and lead_name.lower() not in ["there", "unknown", ""] else f"Lead {phone_number}"
    
    temperature = None
    if notes:
        if "[HOT]" in notes.upper(): temperature = "HOT"
        elif "[WARM]" in notes.upper(): temperature = "WARM"
        elif "[COLD]" in notes.upper(): temperature = "COLD"
        elif "[UNRATED]" in notes.upper(): temperature = "UNRATED"

    try:
        existing = await db.table("contacts").select("id, name, business_name, industry, place, lead_temperature").eq("phone", phone_number).execute()
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
            if temperature: contact_data["lead_temperature"] = temperature
            await db.table("contacts").insert(contact_data).execute()
            logger.info(f"Auto-added contact to CRM: {display_name} ({phone_number})")
        else:
            # Update existing contact if details are empty or default name
            contact_id = existing.data[0]["id"]
            existing_name = existing.data[0].get("name", "")
            ex_biz = existing.data[0].get("business_name", "")
            ex_ind = existing.data[0].get("industry", "")
            ex_place = existing.data[0].get("place", "")
            ex_temp = existing.data[0].get("lead_temperature", "")
            
            update_data = {}
            if business_name and business_name != "our company" and (not ex_biz or ex_biz == "our company"):
                update_data["business_name"] = business_name
            if industry and industry != "our service" and (not ex_ind or ex_ind == "our service"):
                update_data["industry"] = industry
            if place and place != "your area" and (not ex_place or ex_place == "your area"):
                update_data["place"] = place
            if temperature and temperature != ex_temp:
                update_data["lead_temperature"] = temperature
            
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
    all_data = []
    offset = 0
    limit = 5000
    while offset < limit:
        chunk = min(1000, limit - offset)
        result = await db.table("call_logs").select("*").eq("campaign_id", campaign_id).order("timestamp", desc=True).range(offset, offset + chunk - 1).execute()
        data = result.data or []
        if not data:
            break
        all_data.extend(data)
        offset += len(data)
        if len(data) < chunk:
            break
    return all_data

async def get_all_calls(page: int = 1, limit: int = 5000, tenant_id: str = "system") -> list:
    await cleanup_unknown_rows()
    db = await _adb()
    
    all_data = []
    total_fetched = 0
    base_offset = (page - 1) * limit
    
    while total_fetched < limit:
        chunk = min(1000, limit - total_fetched)
        current_offset = base_offset + total_fetched
        q = db.table("call_logs").select("*, tenants(name)")
        if tenant_id != "system":
            q = q.eq("tenant_id", tenant_id)
        result = await q.order("timestamp", desc=True).range(current_offset, current_offset + chunk - 1).execute()
        
        data = result.data or []
        if not data:
            break
        all_data.extend(data)
        total_fetched += len(data)
        if len(data) < chunk:
            break
            
    return all_data


async def get_calls_by_phone(phone: str) -> list:
    db = await _adb()
    all_data = []
    offset = 0
    limit = 5000
    while offset < limit:
        chunk = min(1000, limit - offset)
        result = await db.table("call_logs").select("*").eq("phone_number", phone).order("timestamp", desc=True).range(offset, offset + chunk - 1).execute()
        data = result.data or []
        if not data:
            break
        all_data.extend(data)
        offset += len(data)
        if len(data) < chunk:
            break
    return all_data


async def update_call_notes(call_id: str, notes: str) -> bool:
    db = await _adb()
    result = await db.table("call_logs").update({"notes": notes}).eq("id", call_id).execute()
    return len(result.data or []) > 0


async def get_contacts(tenant_id: str = "system") -> list:
    db = await _adb()
    q = db.table("contacts").select("*, tenants(name)")
    if tenant_id != "system":
        q = q.eq("tenant_id", tenant_id)
    try:
        result = await q.order("created_at", desc=True).execute()
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

async def get_stats(tenant_id: str = "system") -> dict:
    db = await _adb()
    # Outbound calls — paginate to get ALL rows past Supabase's 1000-row limit
    rows = []
    offset = 0
    while True:
        q = db.table("call_logs").select("outcome, duration_seconds, timestamp")
        if tenant_id != "system":
            q = q.eq("tenant_id", tenant_id)
        chunk = (await q.order("timestamp", desc=True).range(offset, offset + 999).execute()).data or []
        rows.extend(chunk)
        if len(chunk) < 1000:
            break
        offset += 1000

    total_calls    = len(rows)
    booked         = sum(1 for r in rows if r.get("outcome") == "booked")
    not_interested = sum(1 for r in rows if r.get("outcome") == "not_interested")
    durations      = [r["duration_seconds"] for r in rows if r.get("duration_seconds")]
    avg_dur        = sum(durations) / len(durations) if durations else 0
    booking_rate   = round((booked / total_calls * 100) if total_calls else 0, 1)
    
    # Incoming calls
    inc_q = db.table("incoming_calls").select("id")
    if tenant_id != "system":
        inc_q = inc_q.eq("tenant_id", tenant_id)
    incoming_rows = (await inc_q.execute()).data or []
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


async def get_all_campaigns(tenant_id: str = "system") -> list:
    db = await _adb()
    q = db.table("campaigns").select("*, tenants(name)")
    if tenant_id != "system":
        q = q.eq("tenant_id", tenant_id)
    result = await q.order("created_at", desc=True).execute()
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

async def save_agent_profile(profile_id: str, name: str, voice: str, model: str, system_prompt: str, enabled_tools: str, is_default: bool = False, welcome_message: str = "", speech_settings: str = "{}", call_settings: str = "{}", place: str = "", knowledge_base: str = "") -> str:
    import json
    db = await _adb()
    # Force integer (Supabase INTEGER column expects 0 or 1, not boolean)
    default_val = 1 if is_default in (True, 1, "true", "1") else 0
    
    # Store knowledge_base inside call_settings to avoid DB schema migration
    cs_dict = {}
    try:
        cs_dict = json.loads(call_settings) if call_settings else {}
    except Exception:
        pass
    cs_dict["knowledge_base"] = knowledge_base
    call_settings = json.dumps(cs_dict)
    
    row = {
        "id": profile_id, "name": name, "voice": voice, "model": model,
        "system_prompt": system_prompt, "enabled_tools": enabled_tools,
        "is_default": default_val, "created_at": datetime.now().isoformat(),
        "welcome_message": welcome_message, "speech_settings": speech_settings,
        "call_settings": call_settings
    }
    if place:
        row["place"] = place

    if default_val == 1:
        await db.table("agent_profiles").update({"is_default": 0}).neq("id", "placeholder").execute()
    await db.table("agent_profiles").upsert(row).execute()
    return profile_id


async def get_all_agent_profiles(tenant_id: str = "system") -> list:
    import json
    db = await _adb()
    q = db.table("agent_profiles").select("*, tenants(name)")
    if tenant_id != "system":
        q = q.eq("tenant_id", tenant_id)
    result = await q.order("created_at", desc=True).execute()
    data = result.data or []
    for row in data:
        row["knowledge_base"] = ""
        if row.get("call_settings"):
            try:
                cs = json.loads(row["call_settings"])
                row["knowledge_base"] = cs.get("knowledge_base", "")
            except Exception:
                pass
    return data


async def get_agent_profile(profile_id: str) -> Optional[dict]:
    import json
    db = await _adb()
    result = await db.table("agent_profiles").select("*").eq("id", profile_id).maybe_single().execute()
    data = result.data if result else None
    if data:
        data["knowledge_base"] = ""
        if data.get("call_settings"):
            try:
                cs = json.loads(data["call_settings"])
                data["knowledge_base"] = cs.get("knowledge_base", "")
            except Exception:
                pass
    return data

async def get_default_inbound_profile() -> Optional[dict]:
    """Return the profile marked is_default=1, or the first profile if none are marked."""
    import json
    db = await _adb()
    result = await db.table("agent_profiles").select("*").eq("is_default", 1).limit(1).execute()
    
    data = None
    if result and result.data:
        data = result.data[0]
    else:
        # Fallback: return first available profile
        fallback = await db.table("agent_profiles").select("*").order("created_at", desc=False).limit(1).execute()
        data = fallback.data[0] if fallback and fallback.data else None
        
    if data:
        data["knowledge_base"] = ""
        if data.get("call_settings"):
            try:
                cs = json.loads(data["call_settings"])
                data["knowledge_base"] = cs.get("knowledge_base", "")
            except Exception:
                pass
    return data


async def create_agent_profile(
    name: str, voice: str = DEFAULT_VOICE, model: str = REALTIME_MODEL,
    system_prompt: Optional[str] = None, enabled_tools: str = "[]", is_default: bool = False,
    place: Optional[str] = None, welcome_message: Optional[str] = None,
    speech_settings: str = "{}", call_settings: str = "{}", knowledge_base: str = ""
) -> str:
    import json
    profile_id = str(uuid.uuid4())
    db = await _adb()
    # Force integer (Supabase INTEGER column expects 0 or 1, not boolean)
    default_val = 1 if is_default in (True, 1, "true", "1") else 0
    
    # Store knowledge_base inside call_settings to avoid DB schema migration
    cs_dict = {}
    try:
        cs_dict = json.loads(call_settings) if call_settings else {}
    except Exception:
        pass
    cs_dict["knowledge_base"] = knowledge_base
    call_settings = json.dumps(cs_dict)
    
    row = {
        "id": profile_id, "name": name, "voice": voice, "model": model,
        "system_prompt": system_prompt, "enabled_tools": enabled_tools,
        "is_default": default_val, "created_at": datetime.now().isoformat(),
        "welcome_message": welcome_message, "speech_settings": speech_settings,
        "call_settings": call_settings
    }
    if place:
        row["place"] = place

    if default_val == 1:
        await db.table("agent_profiles").update({"is_default": 0}).neq("id", "placeholder").execute()
    await db.table("agent_profiles").insert(row).execute()
    return profile_id


async def update_agent_profile(profile_id: str, updates: dict) -> bool:
    import json
    db = await _adb()
    
    # Normalize is_default to integer
    if "is_default" in updates:
        val = updates["is_default"]
        default_val = 1 if val in (True, 1, "true", "1") else 0
        updates["is_default"] = default_val
        if default_val == 1:
            await db.table("agent_profiles").update({"is_default": 0}).neq("id", "placeholder").execute()
    
    # knowledge_base is stored inside call_settings JSON (no separate DB column)
    if "knowledge_base" in updates:
        kb = updates.pop("knowledge_base")
        # Fetch existing call_settings to merge
        try:
            existing = await db.table("agent_profiles").select("call_settings").eq("id", profile_id).single().execute()
            cs_str = (existing.data or {}).get("call_settings") or "{}"
            cs_dict = json.loads(cs_str) if cs_str else {}
        except Exception:
            cs_dict = {}
        cs_dict["knowledge_base"] = kb
        updates["call_settings"] = json.dumps(cs_dict)
    
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

async def get_all_transactions(limit: int = 50, tenant_id: str = "system") -> list:
    await cleanup_unknown_rows()
    db = await _adb()
    q = db.table("transactions").select("*, tenants(name)")
    if tenant_id != "system":
        q = q.eq("tenant_id", tenant_id)
    result = await q.order("created_at", desc=True).limit(limit).execute()
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

async def get_incoming_calls(limit: int = 5000) -> list:
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


# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-TENANT: Tenants, Users, Subscriptions, Phone Numbers, Analytics
# ═══════════════════════════════════════════════════════════════════════════════

# ── Tenants ───────────────────────────────────────────────────────────────────

async def get_all_tenants() -> list:
    db = await _adb()
    result = await db.table("tenants").select("*, billing_plans(name, price_inr)").order("created_at", desc=True).execute()
    return result.data or []


async def get_tenant(tenant_id: str) -> Optional[dict]:
    db = await _adb()
    result = await db.table("tenants").select("*, billing_plans(*)").eq("id", tenant_id).maybe_single().execute()
    return result.data if result else None


async def create_tenant(name: str, email: str, plan_id: str = "starter") -> dict:
    import json as _json
    db = await _adb()
    tenant_id = str(uuid.uuid4())
    row = {
        "id": tenant_id,
        "name": name,
        "email": email.lower().strip(),
        "plan_id": plan_id,
        "status": "active",
        "calls_used": 0,
        "created_at": datetime.now().isoformat(),
    }
    await db.table("tenants").insert(row).execute()
    return row


async def update_tenant(tenant_id: str, updates: dict) -> bool:
    db = await _adb()
    updates["updated_at"] = datetime.now().isoformat()
    result = await db.table("tenants").update(updates).eq("id", tenant_id).execute()
    return len(result.data or []) > 0


async def get_tenant_call_count(tenant_id: str) -> int:
    db = await _adb()
    result = await db.table("call_logs").select("id").eq("tenant_id", tenant_id).execute()
    return len(result.data or [])


# ── Users ─────────────────────────────────────────────────────────────────────

async def create_user(email: str, password: str, tenant_id: str, role: str = "admin", name: str = "") -> dict:
    from auth import make_password_hash
    db = await _adb()
    user_id = str(uuid.uuid4())
    row = {
        "id": user_id,
        "email": email.lower().strip(),
        "password_hash": make_password_hash(password),
        "tenant_id": tenant_id,
        "role": role,
        "name": name,
        "created_at": datetime.now().isoformat(),
    }
    await db.table("users").insert(row).execute()
    return row


async def get_tenant_users(tenant_id: str) -> list:
    db = await _adb()
    result = await db.table("users").select("id, email, name, role, last_login, created_at").eq("tenant_id", tenant_id).execute()
    return result.data or []


async def update_user_password(user_id: str, new_password: str) -> bool:
    from auth import make_password_hash
    db = await _adb()
    result = await db.table("users").update({"password_hash": make_password_hash(new_password)}).eq("id", user_id).execute()
    return len(result.data or []) > 0


# ── Billing Plans & Subscriptions ─────────────────────────────────────────────

async def get_billing_plans() -> list:
    db = await _adb()
    result = await db.table("billing_plans").select("*").order("sort_order").execute()
    return result.data or []


async def get_active_subscription(tenant_id: str) -> Optional[dict]:
    db = await _adb()
    result = await db.table("subscriptions").select("*, billing_plans(*)").eq("tenant_id", tenant_id).eq("status", "active").maybe_single().execute()
    return result.data if result else None


async def create_subscription(tenant_id: str, plan_id: str, payment_ref: str = "", amount_paid: int = 0) -> dict:
    db = await _adb()
    # Cancel existing active subscriptions
    await db.table("subscriptions").update({"status": "cancelled"}).eq("tenant_id", tenant_id).eq("status", "active").execute()
    # Create new one (30-day term)
    sub_id = str(uuid.uuid4())
    expires_at = (datetime.now() + timedelta(days=30)).isoformat()
    row = {
        "id": sub_id,
        "tenant_id": tenant_id,
        "plan_id": plan_id,
        "status": "active",
        "started_at": datetime.now().isoformat(),
        "expires_at": expires_at,
        "payment_ref": payment_ref,
        "amount_paid": amount_paid,
        "created_at": datetime.now().isoformat(),
    }
    await db.table("subscriptions").insert(row).execute()
    # Update tenant's plan_id
    await db.table("tenants").update({"plan_id": plan_id, "updated_at": datetime.now().isoformat()}).eq("id", tenant_id).execute()
    return row


async def get_all_subscriptions() -> list:
    """Super admin: get all subscriptions across tenants."""
    db = await _adb()
    result = await db.table("subscriptions").select("*, tenants(name, email), billing_plans(name, price_inr)").order("created_at", desc=True).execute()
    return result.data or []


# ── Phone Numbers ─────────────────────────────────────────────────────────────

async def get_phone_numbers(tenant_id: str) -> list:
    db = await _adb()
    result = await db.table("phone_numbers").select("id, label, provider, number, trunk_id, is_active, created_at").eq("tenant_id", tenant_id).execute()
    return result.data or []


async def upsert_phone_number(tenant_id: str, label: str, provider: str, number: str,
                               trunk_id: str = "", credentials: dict = None) -> dict:
    import json as _json
    db = await _adb()
    pn_id = str(uuid.uuid4())
    row = {
        "id": pn_id,
        "tenant_id": tenant_id,
        "label": label,
        "provider": provider,
        "number": number,
        "trunk_id": trunk_id,
        "credentials": _json.dumps(credentials or {}),
        "is_active": True,
        "created_at": datetime.now().isoformat(),
    }
    await db.table("phone_numbers").insert(row).execute()
    return row


async def delete_phone_number(pn_id: str, tenant_id: str) -> bool:
    db = await _adb()
    result = await db.table("phone_numbers").delete().eq("id", pn_id).eq("tenant_id", tenant_id).execute()
    return len(result.data or []) > 0


# ── Full Analytics ─────────────────────────────────────────────────────────────

async def get_analytics(tenant_id: str = "system", days: int = 30) -> dict:
    """Comprehensive analytics for a tenant over the last N days."""
    import json as _json
    db = await _adb()
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()

    # All calls in window
    q = db.table("call_logs").select(
        "id, outcome, duration_seconds, timestamp, phone_number, business_name, place, agent_profile_id, campaign_id, recording_url"
    ).gte("timestamp", cutoff)
    if tenant_id != "system":
        q = q.eq("tenant_id", tenant_id)
    rows = (await q.execute()).data or []

    # All calls ever (for totals)
    q_all = db.table("call_logs").select("id, outcome, duration_seconds")
    if tenant_id != "system":
        q_all = q_all.eq("tenant_id", tenant_id)
    all_rows = (await q_all.execute()).data or []

    # Basic KPIs
    total = len(rows)
    total_ever = len(all_rows)
    durations = [r["duration_seconds"] for r in rows if r.get("duration_seconds")]
    total_minutes = round(sum(durations) / 60, 1) if durations else 0
    avg_duration = round(sum(durations) / len(durations), 1) if durations else 0

    outcomes: dict = {}
    for r in rows:
        o = (r.get("outcome") or "unknown").lower()
        outcomes[o] = outcomes.get(o, 0) + 1

    booked = outcomes.get("booked", 0)
    no_answer = outcomes.get("no_answer", 0) + outcomes.get("no answer", 0)
    failed = outcomes.get("failed", 0)
    connected = total - no_answer - failed

    booking_rate = round((booked / total * 100) if total else 0, 1)
    connect_rate = round((connected / total * 100) if total else 0, 1)

    # Daily timeline
    daily: dict = defaultdict(int)
    for r in rows:
        ts = (r.get("timestamp") or "")[:10]
        if ts:
            daily[ts] += 1
    today = datetime.now().date()
    timeline = [
        {"date": (today - timedelta(days=i)).isoformat(), "count": daily.get((today - timedelta(days=i)).isoformat(), 0)}
        for i in range(days - 1, -1, -1)
    ]

    # Hourly distribution (heatmap)
    hourly: dict = defaultdict(int)
    for r in rows:
        ts = r.get("timestamp") or ""
        if len(ts) >= 13:
            try:
                hour = int(ts[11:13])
                hourly[hour] += 1
            except Exception:
                pass
    hourly_data = [{"hour": h, "calls": hourly.get(h, 0)} for h in range(24)]

    # Outcome breakdown with durations
    outcome_stats = {}
    dur_by_outcome: dict = defaultdict(list)
    for r in rows:
        o = (r.get("outcome") or "unknown").lower()
        d = r.get("duration_seconds")
        if d:
            dur_by_outcome[o].append(d)
    for o, durs in dur_by_outcome.items():
        outcome_stats[o] = {
            "count": outcomes.get(o, 0),
            "avg_duration": round(sum(durs) / len(durs), 1)
        }
    for o in outcomes:
        if o not in outcome_stats:
            outcome_stats[o] = {"count": outcomes[o], "avg_duration": 0}

    # Agent performance
    agent_stats: dict = defaultdict(lambda: {"calls": 0, "booked": 0, "duration": 0})
    for r in rows:
        aid = r.get("agent_profile_id") or "default"
        agent_stats[aid]["calls"] += 1
        if (r.get("outcome") or "").lower() == "booked":
            agent_stats[aid]["booked"] += 1
        agent_stats[aid]["duration"] += r.get("duration_seconds") or 0
    agent_performance = []
    for aid, s in agent_stats.items():
        agent_performance.append({
            "agent_id": aid,
            "calls": s["calls"],
            "booked": s["booked"],
            "booking_rate": round((s["booked"] / s["calls"] * 100) if s["calls"] else 0, 1),
            "avg_duration": round(s["duration"] / s["calls"], 1) if s["calls"] else 0,
        })
    agent_performance.sort(key=lambda x: x["calls"], reverse=True)

    # Campaign performance
    campaign_stats: dict = defaultdict(lambda: {"calls": 0, "booked": 0, "connected": 0})
    for r in rows:
        cid = r.get("campaign_id") or "manual"
        campaign_stats[cid]["calls"] += 1
        o = (r.get("outcome") or "").lower()
        if o == "booked":
            campaign_stats[cid]["booked"] += 1
        if o not in ("no_answer", "no answer", "failed"):
            campaign_stats[cid]["connected"] += 1
    campaign_performance = [
        {
            "campaign_id": cid,
            "calls": s["calls"],
            "connected": s["connected"],
            "booked": s["booked"],
            "booking_rate": round((s["booked"] / s["calls"] * 100) if s["calls"] else 0, 1),
        }
        for cid, s in campaign_stats.items()
    ]
    campaign_performance.sort(key=lambda x: x["calls"], reverse=True)

    # Top locations
    loc_counts: dict = defaultdict(int)
    for r in rows:
        loc = r.get("place") or r.get("business_name") or "Unknown"
        if loc and loc != "Unknown":
            loc_counts[loc] += 1
    top_locations = sorted(
        [{"name": k, "calls": v} for k, v in loc_counts.items()],
        key=lambda x: x["calls"], reverse=True
    )[:10]

    # Recordings count
    recordings = sum(1 for r in rows if r.get("recording_url"))

    return {
        "period_days": days,
        "total_calls": total,
        "total_calls_ever": total_ever,
        "connected_calls": connected,
        "no_answer": no_answer,
        "failed_calls": failed,
        "booked": booked,
        "total_minutes": total_minutes,
        "avg_duration_seconds": avg_duration,
        "booking_rate_percent": booking_rate,
        "connect_rate_percent": connect_rate,
        "recordings_count": recordings,
        "outcomes": outcomes,
        "outcome_stats": outcome_stats,
        "timeline": timeline,
        "hourly_distribution": hourly_data,
        "agent_performance": agent_performance,
        "campaign_performance": campaign_performance,
        "top_locations": top_locations,
    }


# ── Super Admin: Platform-wide overview ────────────────────────────────────────

async def get_admin_overview() -> dict:
    """Aggregate metrics across all tenants for the super admin dashboard."""
    db = await _adb()
    tenants = (await db.table("tenants").select("id, name, email, plan_id, status, calls_used, created_at").execute()).data or []
    total_tenants = len([t for t in tenants if t["id"] != "system"])
    active_tenants = len([t for t in tenants if t.get("status") == "active" and t["id"] != "system"])

    # All calls ever — paginate to bypass Supabase's 1000-row default limit
    all_calls = []
    offset = 0
    while True:
        chunk = (await db.table("call_logs").select("id, outcome, timestamp, tenant_id").order("timestamp", desc=True).range(offset, offset + 999).execute()).data or []
        all_calls.extend(chunk)
        if len(chunk) < 1000:
            break
        offset += 1000

    total_calls = len(all_calls)
    total_booked = sum(1 for r in all_calls if (r.get("outcome") or "").lower() == "booked")

    # MRR from active subscriptions
    subs = (await db.table("subscriptions").select("tenant_id, plan_id, status, billing_plans(price_inr)").eq("status", "active").execute()).data or []
    mrr = sum((s.get("billing_plans") or {}).get("price_inr", 0) for s in subs if s.get("tenant_id") != "system")

    # Recent signups (last 7 days)
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    recent_tenants = [t for t in tenants if (t.get("created_at") or "") >= week_ago and t["id"] != "system"]

    # Calls today
    today = datetime.now().date().isoformat()
    calls_today = sum(1 for r in all_calls if (r.get("timestamp") or "")[:10] == today)

    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "total_calls_platform": total_calls,
        "total_booked_platform": total_booked,
        "mrr_inr": mrr,
        "calls_today": calls_today,
        "recent_signups": len(recent_tenants),
        "tenants": [t for t in tenants if t["id"] != "system"],
        "subscriptions": subs,
    }

