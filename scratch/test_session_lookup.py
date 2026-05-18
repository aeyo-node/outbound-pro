import os
import asyncio
from dotenv import load_dotenv
load_dotenv(".env")

# Add current directory and api-call to sys.path
import sys
current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if current_dir not in sys.path:
    sys.path.append(current_dir)
api_call_path = os.path.join(current_dir, "api-call")
if api_call_path not in sys.path:
    sys.path.append(api_call_path)

# Add parent directory as well if run from inside scratch/
parent_dir = os.path.dirname(os.path.abspath(__file__))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
# Also append the workspace directory itself
workspace_dir = "c:\\Users\\chris\\Documents\\outbound-pro"
if workspace_dir not in sys.path:
    sys.path.append(workspace_dir)

from tools import AppointmentTools
from db import _adb

async def run_test():
    print("=" * 60)
    print("🔍 RUNNING AUTOMATED CHARGER RESOLVER & TROUBLESHOOTING TEST")
    print("=" * 60)
    
    # 1. Prepare Supabase test transaction for caller phone number +918086477654
    print("[*] Preparing Supabase test transaction for +918086477654...")
    test_phone = "+918086477654"
    test_charger = "185599798823820"
    
    try:
        from db import log_transaction
        db_client = await _adb()
        clean_phone = "8086477654"
        res = await db_client.table("transactions").select("*").or_(f"phone.eq.{clean_phone},phone.eq.+91{clean_phone}").execute()
        if not res.data or len(res.data) == 0:
            print("[*] Mock transaction not found. Inserting mock transaction record into Supabase transactions table...")
            await log_transaction(
                charger_identity=test_charger,
                charger_name="Test Charger 3.3kW",
                user_name="Chris Test",
                phone=test_phone,
                start_time="2026-05-18T19:57:00Z",
                energy_kwh="1.25",
                amount="12.50"
            )
            print("[+] Successfully inserted test transaction record!")
        else:
            print("[+] Test transaction record already exists in Supabase database.")
    except Exception as e:
        print(f"[-] Supabase query/insert failed: {e}")

    # 2. Instantiate AppointmentTools
    print(f"\n[*] Instantiating AppointmentTools with phone: {test_phone}...")
    tools = AppointmentTools(ctx=None, phone_number=test_phone)

    # 3. Test Auto Resolver
    print("\n[*] 1. Testing Session/Charger Resolver (_resolve_charger_from_session)...")
    resolved = await tools._resolve_charger_from_session(None)
    if resolved:
        print(f"[🎉 SUCCESS] Resolved to charger: {resolved.get('name')} ({resolved.get('identity')})")
    else:
        print("[⚠️ WARNING] Could not resolve any active or previous charger for this phone number.")

    # 4. Test Check Charger Status (with auto lookup)
    print("\n[*] 2. Testing check_charger_status tool with empty/None argument (should auto-lookup & troubleshoot if abnormal)...")
    status_msg = await tools.check_charger_status(None)
    print("\n🗣️ Spoken Output from Status Checker:")
    print("-" * 60)
    print(status_msg)
    print("-" * 60)

    # 5. Test Troubleshoot Charger
    print("\n[*] 3. Testing troubleshoot_charger tool with empty/None argument...")
    trouble_msg = await tools.troubleshoot_charger(None, "session has an active issue")
    print("\n🗣️ Spoken Output from Troubleshooter:")
    print("-" * 60)
    print(trouble_msg)
    print("-" * 60)

if __name__ == "__main__":
    asyncio.run(run_test())
