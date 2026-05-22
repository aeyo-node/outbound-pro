import os
import asyncio
import httpx
from dotenv import load_dotenv

# Load env variables from .env
load_dotenv(".env", override=True)

async def run_all_tests():
    api_key = os.getenv("CALCOM_API_KEY")
    username = os.getenv("CALCOM_USERNAME")
    timezone = os.getenv("CALCOM_TIMEZONE", "Asia/Kolkata")
    event_type_id_str = os.getenv("CALCOM_EVENT_TYPE_ID")
    
    print("====================================================")
    print("         CAL.COM API COMPREHENSIVE DIAGNOSTICS      ")
    print("====================================================")
    print(f"CALCOM_API_KEY: {api_key[:12] if api_key else 'None'}...")
    print(f"CALCOM_USERNAME: {username}")
    print(f"CALCOM_EVENT_TYPE_ID: {event_type_id_str}")
    
    if not api_key:
        print("[!] ERROR: CALCOM_API_KEY is missing from .env!")
        return

    # Base attendee
    attendee = {
        "name": "Chris Thomas",
        "email": "alph.cthomas@gmail.com",
        "timeZone": timezone,
        "phoneNumber": "+918086477654"
    }
    
    versions = ["2024-09-04", "2024-08-13", "2024-06-14", None]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        
        print("\n----------------------------------------------------")
        print("PART 1: TESTING V2 SLOTS (GET) - DIFFERENT ENDPOINTS & PARAMS")
        print("----------------------------------------------------")
        date_str = "2026-06-16"
        start_time = f"{date_str}T00:00:00.000Z"
        end_time = f"{date_str}T23:59:59.000Z"
        
        for ver in versions:
            headers = {"Authorization": f"Bearer {api_key}"}
            if ver:
                headers["cal-api-version"] = ver
            
            # CASE 1: /v2/slots with eventTypeId as integer, using startTime/endTime
            params_1 = {
                "startTime": start_time,
                "endTime": end_time,
                "eventTypeId": int(event_type_id_str) if event_type_id_str else 0,
                "timeZone": timezone
            }
            try:
                resp = await client.get("https://api.cal.com/v2/slots", headers=headers, params=params_1)
                print(f"[v2/slots (startTime/endTime)] Version: {ver} -> Status: {resp.status_code}")
                if resp.status_code != 200:
                    print(f"  Response: {resp.text[:300]}")
                else:
                    print(f"  Success! Slots: {resp.text[:200]}")
            except Exception as e:
                print(f"  Error: {e}")
                
            # CASE 2: /v2/slots with eventTypeId as integer, using start/end
            params_2 = {
                "start": start_time,
                "end": end_time,
                "eventTypeId": int(event_type_id_str) if event_type_id_str else 0,
                "timeZone": timezone
            }
            try:
                resp = await client.get("https://api.cal.com/v2/slots", headers=headers, params=params_2)
                print(f"[v2/slots (start/end)] Version: {ver} -> Status: {resp.status_code}")
                if resp.status_code != 200:
                    print(f"  Response: {resp.text[:300]}")
                else:
                    print(f"  Success! Slots: {resp.text[:200]}")
            except Exception as e:
                print(f"  Error: {e}")

            # CASE 3: /v2/slots/available with username, using startTime/endTime
            params_3 = {
                "startTime": start_time,
                "endTime": end_time,
                "username": username,
                "timeZone": timezone
            }
            try:
                resp = await client.get("https://api.cal.com/v2/slots/available", headers=headers, params=params_3)
                print(f"[v2/slots/available (startTime/endTime)] Version: {ver} -> Status: {resp.status_code}")
                if resp.status_code != 200:
                    print(f"  Response: {resp.text[:300]}")
                else:
                    print(f"  Success! Slots: {resp.text[:200]}")
            except Exception as e:
                print(f"  Error: {e}")

        print("\n----------------------------------------------------")
        print("PART 2: TESTING V2 BOOKINGS (POST) - CLEAN PAYLOADS")
        print("----------------------------------------------------")
        
        # Clean payload (NO root-level timeZone or language)
        payload_clean = {
            "eventTypeId": int(event_type_id_str) if event_type_id_str else 0,
            "start": "2026-06-16T11:00:00Z",
            "attendee": {
                "name": "Chris Thomas",
                "email": "alph.cthomas@gmail.com",
                "timeZone": timezone,
                "phoneNumber": "+918086477654",
                "language": "en"
            }
        }
        
        # Clean payload with responses inside
        payload_with_resp = {
            "eventTypeId": int(event_type_id_str) if event_type_id_str else 0,
            "start": "2026-06-16T12:00:00Z",
            "attendee": {
                "name": "Chris Thomas",
                "email": "alph.cthomas@gmail.com",
                "timeZone": timezone,
                "phoneNumber": "+918086477654",
                "language": "en"
            },
            "responses": {
                "name": "Chris Thomas",
                "email": "alph.cthomas@gmail.com",
                "phone": "+918086477654"
            }
        }
        
        for ver in versions:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            if ver:
                headers["cal-api-version"] = ver
                
            # Try Clean Payload
            try:
                resp = await client.post("https://api.cal.com/v2/bookings", headers=headers, json=payload_clean)
                print(f"[v2/bookings - Clean Payload] Version: {ver} -> Status: {resp.status_code}")
                print(f"  Response: {resp.text[:300]}")
            except Exception as e:
                print(f"  Error: {e}")

            # Try Payload with responses
            try:
                resp = await client.post("https://api.cal.com/v2/bookings", headers=headers, json=payload_with_resp)
                print(f"[v2/bookings - Payload with responses] Version: {ver} -> Status: {resp.status_code}")
                print(f"  Response: {resp.text[:300]}")
            except Exception as e:
                print(f"  Error: {e}")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
