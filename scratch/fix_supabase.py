"""
FIX: Update Supabase settings table with the correct API key from .env
and fix all corrupted settings values.
"""
import os
from dotenv import load_dotenv

load_dotenv(".env", override=True)

new_api_key = os.getenv("GOOGLE_API_KEY", "")
supa_url = os.getenv("SUPABASE_URL", "")
supa_key = os.getenv("SUPABASE_SERVICE_KEY", "")

if not new_api_key:
    print("❌ No GOOGLE_API_KEY found in .env")
    exit(1)
if not supa_url or not supa_key:
    print("❌ Supabase credentials missing from .env")
    exit(1)

print(f"New API key from .env: {new_api_key[:15]}...{new_api_key[-4:]}")
print(f"Supabase URL: {supa_url}")

from supabase import create_client
db = create_client(supa_url, supa_key)

# Step 1: Read all current settings
result = db.table("settings").select("key, value").execute()
print(f"\nCurrent Supabase settings ({len(result.data or [])} rows):")

for row in (result.data or []):
    k = row["key"]
    v = row["value"]
    if k in ("GOOGLE_API_KEY",):
        print(f"  {k} = {v[:15]}...{v[-4:]}" if len(v) > 19 else f"  {k} = {v}")
    elif k in ("GEMINI_MODEL", "GEMINI_TTS_VOICE", "USE_GEMINI_REALTIME"):
        print(f"  {k} = {v[:80]}{'...' if len(v) > 80 else ''}")
    # Skip printing other keys for brevity

# Step 2: Fix the corrupted values
fixes = {
    "GOOGLE_API_KEY": new_api_key,
    "GEMINI_MODEL": "gemini-2.5-flash",
    "GEMINI_TTS_VOICE": "Aoede",
    "USE_GEMINI_REALTIME": "true",
}

print("\n--- APPLYING FIXES ---")
for key, new_value in fixes.items():
    display = f"{new_value[:15]}...{new_value[-4:]}" if len(new_value) > 19 and "KEY" in key else new_value
    try:
        # Upsert: update if exists, insert if not
        db.table("settings").upsert({"key": key, "value": new_value}, on_conflict="key").execute()
        print(f"  ✅ {key} → {display}")
    except Exception as e:
        print(f"  ❌ {key}: {e}")

# Step 3: Verify
print("\n--- VERIFICATION ---")
result = db.table("settings").select("key, value").execute()
for row in (result.data or []):
    k = row["key"]
    v = row["value"]
    if k in fixes:
        display = f"{v[:15]}...{v[-4:]}" if len(v) > 19 and "KEY" in k else v
        expected = fixes[k]
        match = v == expected
        print(f"  {'✅' if match else '❌'} {k} = {display}")

print("\n✅ Done! Now re-run the diagnostic:")
print("   .\\venv\\Scripts\\python scratch\\full_diagnostic.py")
