import asyncio
import os
import sys
import uuid
import json
import traceback
from dotenv import load_dotenv

try:
    from livekit import api
except ImportError:
    print("livekit-api not installed. Run: pip install livekit-api")
    sys.exit(1)

load_dotenv(".env", override=True)

URL = os.getenv("LIVEKIT_URL")
KEY = os.getenv("LIVEKIT_API_KEY")
SECRET = os.getenv("LIVEKIT_API_SECRET")
TRUNK_ID = os.getenv("OUTBOUND_TRUNK_ID")

async def audit_sip(target_phone: str):
    print("="*60)
    print("🔍 LIVEKIT SIP DIAGNOSTIC AUDIT")
    print("="*60)

    if not all([URL, KEY, SECRET, TRUNK_ID]):
        print("❌ Missing LiveKit credentials or OUTBOUND_TRUNK_ID in .env")
        return

    print(f"Server URL : {URL}")
    print(f"Trunk ID   : {TRUNK_ID}")
    print(f"Target Num : {target_phone}\n")

    lk = api.LiveKitAPI(URL, KEY, SECRET)
    
    try:
        print("▶ TASK 4: Verifying SIP Trunks...")
        trunks = await lk.sip.list_sip_trunks(api.ListSIPTrunksRequest())
        found = False
        for t in trunks.items:
            print(f"  - Found Trunk: {t.sip_trunk_id} (Name: {t.sip_trunk_name}, Outbound: {t.outbound_number})")
            if t.sip_trunk_id == TRUNK_ID:
                found = True
                print(f"  ✅ Configured trunk {TRUNK_ID} is active in LiveKit.")
        if not found:
            print(f"  ❌ WARNING: Trunk {TRUNK_ID} NOT FOUND in LiveKit server!")
        print()

        print("▶ TASKS 7 & 8: Checking for Zombie Rooms & Concurrent Calls...")
        rooms = await lk.room.list_rooms(api.ListRoomsRequest())
        sip_rooms = [r for r in rooms.rooms if r.name.startswith("sip-audit-") or "call-" in r.name]
        print(f"  - Found {len(sip_rooms)} active SIP-related rooms.")
        for r in sip_rooms:
            print(f"  - Room: {r.name} (Participants: {r.num_participants})")
        print()

        print("▶ TASKS 1, 2, 5, 6, 12: Direct SIP Dial Test (Bypassing AI/Agent)...")
        test_room = f"sip-audit-{uuid.uuid4().hex[:8]}"
        identity = f"sip_{target_phone}"
        
        req = api.CreateSIPParticipantRequest(
            room_name=test_room,
            sip_trunk_id=TRUNK_ID,
            sip_call_to=target_phone,
            participant_identity=identity,
            wait_until_answered=True
        )
        
        print("  - [PAYLOAD SENT TO LIVEKIT]")
        print(f"    Room       : {req.room_name}")
        print(f"    Trunk      : {req.sip_trunk_id}")
        print(f"    Destination: '{req.sip_call_to}' (Length: {len(req.sip_call_to)})")
        print(f"    Identity   : {req.participant_identity}")
        
        print("\n  ⏳ Dialing... (Waiting for answer or failure)")
        try:
            resp = await lk.sip.create_sip_participant(req)
            print("  ✅ [DIAL SUCCESS] Call answered!")
            print(f"  - [RESPONSE PAYLOAD]:\n    {resp}")
        except Exception as e:
            print("  ❌ [DIAL FAILED]")
            print(f"  - Error Message: {e}")
            print(f"  - Error Type: {type(e).__name__}")
            print("  - Traceback:")
            traceback.print_exc(file=sys.stdout)
            print("\n💡 NOTE: If this failed with '486 Busy Here', the telecom network actively rejected the call. LiveKit properly delivered the INVITE, but Vobiz/Telecom refused it.")
            
    finally:
        await lk.aclose()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sip_audit_tool.py <PHONE_NUMBER>")
        print("Example: python sip_audit_tool.py +918086477654")
        sys.exit(1)
    
    asyncio.run(audit_sip(sys.argv[1]))
