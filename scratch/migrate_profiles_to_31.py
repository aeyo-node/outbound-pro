"""
migrate_profiles_to_31.py
Resets ALL agent profiles in Supabase to use gemini-3.1-flash-live-preview.
Run inside the swaram container:
  sudo docker compose exec swaram python scratch/migrate_profiles_to_31.py
"""
import os
import asyncio
from dotenv import load_dotenv

load_dotenv(".env", override=True)

TARGET_MODEL = "gemini-3.1-flash-live-preview"

async def main():
    from supabase import create_client, Client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY missing")
        return

    db: Client = create_client(url, key)

    # Fetch all profiles
    resp = db.table("agent_profiles").select("id,name,model").execute()
    profiles = resp.data or []
    print(f"Found {len(profiles)} agent profiles.\n")

    fixed = 0
    for p in profiles:
        old_model = p.get("model") or "(none)"
        if old_model != TARGET_MODEL:
            db.table("agent_profiles").update({"model": TARGET_MODEL}).eq("id", p["id"]).execute()
            print(f"  FIXED: '{p['name']}' — {old_model} → {TARGET_MODEL}")
            fixed += 1
        else:
            print(f"  OK:    '{p['name']}' — already {TARGET_MODEL}")

    # Also fix settings table if GEMINI_MODEL is set there
    settings_resp = db.table("settings").select("key,value").eq("key", "GEMINI_MODEL").execute()
    for row in (settings_resp.data or []):
        if row.get("value") != TARGET_MODEL:
            db.table("settings").update({"value": TARGET_MODEL}).eq("key", "GEMINI_MODEL").execute()
            print(f"\n  FIXED settings table: GEMINI_MODEL → {TARGET_MODEL}")

    print(f"\n✅ Done. Fixed {fixed} profiles.")
    print(f"   All profiles now use: {TARGET_MODEL}")

asyncio.run(main())
