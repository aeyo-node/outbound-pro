#!/usr/bin/env python3
"""
Swaram Call Diagnostic Script
------------------------------
Run on the server: python test_call.py
This script reads from .env, tests every component, and places a real test call.
"""

import os, sys, json, asyncio

# ── 1. Load .env ─────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(override=True)

LIVEKIT_URL    = os.getenv("LIVEKIT_URL", "").strip()
LIVEKIT_KEY    = os.getenv("LIVEKIT_API_KEY", "").strip()
LIVEKIT_SECRET = os.getenv("LIVEKIT_API_SECRET", "").strip()
TRUNK_ID       = os.getenv("OUTBOUND_TRUNK_ID", "").strip()
SUPABASE_URL   = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY   = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
TEST_PHONE     = os.getenv("DEFAULT_TRANSFER_NUMBER", "").strip()

SEP = "─" * 65

def ok(msg):  print(f"  ✅  {msg}")
def err(msg): print(f"  ❌  {msg}")
def warn(msg):print(f"  ⚠️   {msg}")
def hdr(msg): print(f"\n{SEP}\n  {msg}\n{SEP}")

# ── 2. Print what we loaded ───────────────────────────────────────────────────
hdr("STEP 1 — .env Values Loaded")
print(f"  LIVEKIT_URL    = {LIVEKIT_URL or '(empty)'}")
print(f"  LIVEKIT_API_KEY= {LIVEKIT_KEY or '(empty)'}")
print(f"  LIVEKIT_SECRET = {LIVEKIT_SECRET[:8] + '...' if LIVEKIT_SECRET else '(empty)'}")
print(f"  OUTBOUND_TRUNK = {TRUNK_ID or '(empty)'}")
print(f"  SUPABASE_URL   = {SUPABASE_URL or '(empty)'}")
print(f"  TEST_PHONE     = {TEST_PHONE or '(empty)'}")

problems = []
if not LIVEKIT_URL:    problems.append("LIVEKIT_URL is missing")
if not LIVEKIT_KEY:    problems.append("LIVEKIT_API_KEY is missing")
if not LIVEKIT_SECRET: problems.append("LIVEKIT_API_SECRET is missing")
if not TRUNK_ID:       problems.append("OUTBOUND_TRUNK_ID is missing")
if not TEST_PHONE:     problems.append("DEFAULT_TRANSFER_NUMBER is missing (needed for test call)")

if "53eeb610" in TRUNK_ID or (TRUNK_ID and not TRUNK_ID.startswith("ST_")):
    problems.append(f"OUTBOUND_TRUNK_ID looks wrong! It should start with 'ST_' but got: {TRUNK_ID}")
if LIVEKIT_URL and "autom8-rrblrzy4" in LIVEKIT_URL:
    problems.append("LIVEKIT_URL still points to the OLD account (autom8-rrblrzy4). Update it!")

if problems:
    print()
    for p in problems:
        err(p)
    print("\n  👆 Fix the above .env issues first, then re-run this script.")
    sys.exit(1)
else:
    ok("All required .env values look correct")

# ── 3. Test LiveKit connection ────────────────────────────────────────────────
hdr("STEP 2 — Test LiveKit API Connection")
try:
    from livekit import api as lk_api
    lk = lk_api.LiveKitAPI(url=LIVEKIT_URL, api_key=LIVEKIT_KEY, api_secret=LIVEKIT_SECRET)
    ok("LiveKit API client created")
except ImportError:
    err("livekit package not installed — run: pip install livekit")
    sys.exit(1)

# ── 4. List SIP trunks ───────────────────────────────────────────────────────
hdr("STEP 3 — List SIP Outbound Trunks on this LiveKit Project")

async def list_trunks():
    try:
        trunks = await lk.sip.list_sip_outbound_trunk(lk_api.ListSIPOutboundTrunkRequest())
        if not trunks.items:
            err("No outbound trunks found on this LiveKit project!")
            err("→ You need to create an Outbound SIP Trunk in LiveKit Cloud -> Telephony.")
        else:
            ok(f"Found {len(trunks.items)} outbound trunk(s):")
            for t in trunks.items:
                print(f"     ID: {t.sid}  Name: {t.name}  Numbers: {t.numbers}")
                if t.sid == TRUNK_ID:
                    ok(f"  → Your OUTBOUND_TRUNK_ID matches: {t.sid}")
        return trunks.items
    except Exception as e:
        err(f"Failed to list trunks: {e}")
        return []

trunks = asyncio.run(list_trunks())

# ── 5. Check Supabase settings (what the app actually uses) ──────────────────
hdr("STEP 4 — Check What's Stored in Supabase Settings DB")
try:
    from supabase import create_client
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    rows = sb.table("settings").select("key,value").execute().data or []
    db_settings = {r["key"]: r["value"] for r in rows}

    lk_url_db    = db_settings.get("LIVEKIT_URL", "(not set)")
    lk_key_db    = db_settings.get("LIVEKIT_API_KEY", "(not set)")
    lk_secret_db = db_settings.get("LIVEKIT_API_SECRET", "(not set)")
    trunk_db     = db_settings.get("OUTBOUND_TRUNK_ID", "(not set)")

    print(f"  DB LIVEKIT_URL       = {lk_url_db}")
    print(f"  DB LIVEKIT_API_KEY   = {lk_key_db}")
    print(f"  DB LIVEKIT_SECRET    = {str(lk_secret_db)[:8]}..." if lk_secret_db != '(not set)' else f"  DB LIVEKIT_SECRET    = (not set)")
    print(f"  DB OUTBOUND_TRUNK_ID = {trunk_db}")

    db_warns = []
    if lk_url_db != "(not set)" and lk_url_db != LIVEKIT_URL:
        db_warns.append(f"DB LIVEKIT_URL ({lk_url_db}) OVERRIDES your .env ({LIVEKIT_URL})!")
    if trunk_db != "(not set)" and trunk_db != TRUNK_ID:
        db_warns.append(f"DB OUTBOUND_TRUNK_ID ({trunk_db}) OVERRIDES your .env ({TRUNK_ID})!")

    if db_warns:
        print()
        for w in db_warns:
            warn(w)
        warn("The database settings take priority over .env! Update your Dashboard Settings.")
    else:
        ok("Database settings are consistent with .env (or not set, so .env wins)")
except Exception as e:
    warn(f"Could not check Supabase settings: {e}")

# ── 6. Place the actual test call ────────────────────────────────────────────
hdr("STEP 5 — Place Test Call via SIP Trunk")
print(f"  Calling: {TEST_PHONE}  via trunk: {TRUNK_ID}\n")

ROOM_NAME = "test-diagnostic-call-001"

async def place_call():
    try:
        resp = await lk.sip.create_sip_participant(
            lk_api.CreateSIPParticipantRequest(
                sip_trunk_id=TRUNK_ID,
                sip_call_to=TEST_PHONE,
                room_name=ROOM_NAME,
                participant_identity=f"diag-{TEST_PHONE}",
                participant_name="Diagnostic Test",
                play_ringtone=True,
            )
        )
        ok(f"Call dispatched! SIP participant ID: {resp.participant_identity}")
        ok(f"Room: {ROOM_NAME}")
        ok("✅ If your phone rings in the next 5–10 seconds, EVERYTHING IS WORKING!")
    except Exception as e:
        err(f"Call FAILED: {e}")
        print()
        if "not_found" in str(e):
            err("→ The OUTBOUND_TRUNK_ID doesn't exist on this LiveKit project.")
            err("  Check the trunk list above and update OUTBOUND_TRUNK_ID in .env")
        elif "unauthenticated" in str(e) or "401" in str(e):
            err("→ Wrong API Key or Secret. Double-check LIVEKIT_API_KEY and LIVEKIT_API_SECRET.")
        elif "429" in str(e) or "resource_exhausted" in str(e):
            err("→ LiveKit quota exceeded (free tier). Upgrade or create new account.")

asyncio.run(place_call())
await_close = asyncio.run(lk.aclose())
hdr("DONE")
