import sys
import os

# Set root dir
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)

print("Checking imports in tools.py...")
try:
    from tools import AppointmentTools
    print("✅ AppointmentTools imported successfully")
except Exception as e:
    print(f"❌ Failed to import AppointmentTools: {e}")
    import traceback
    traceback.print_exc()

print("\nChecking EV tools logic specifically...")
try:
    from chargepoints import resolve_charger
    print("✅ resolve_charger imported successfully")
except Exception as e:
    print(f"❌ Failed to import resolve_charger: {e}")

try:
    from RemoteStart import remote_start_with_otp
    print("✅ remote_start_with_otp imported successfully")
except Exception as e:
    print(f"❌ Failed to import remote_start_with_otp: {e}")
