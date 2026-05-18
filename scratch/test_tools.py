import asyncio
import sys
import os

# Append current directory to import tools.py
sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

try:
    from tools import AppointmentTools
except Exception as e:
    print(f"[-] Import error: {e}")
    sys.exit(1)

async def test_tools():
    # Instantiate AppointmentTools with a mock phone number
    tools = AppointmentTools(phone_number="+1234567890")
    
    print("\n=== Testing get_charging_session_details ===")
    try:
        res = await tools.get_charging_session_details("CB1671")
        print("[+] Result for CB1671:")
        print(res)
    except Exception as e:
        print(f"[-] get_charging_session_details failed: {e}")
        
    print("\n=== Testing troubleshoot_charger ===")
    try:
        res = await tools.troubleshoot_charger("CB1671", "Cannot start session")
        print("[+] Result for CB1671:")
        print(res)
    except Exception as e:
        print(f"[-] troubleshoot_charger failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_tools())
