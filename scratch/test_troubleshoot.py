import os
import sys

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, "data"))
sys.path.append(os.path.join(project_root, "api-call"))

from dotenv import load_dotenv
load_dotenv(os.path.join(project_root, ".env"))

print("Importing troubleshoot from data.troubleshoot...")
try:
    from data.troubleshoot import troubleshoot
    print("✅ Imported troubleshoot successfully!")
    
    # Try a dry/mock run first
    print("\nRunning troubleshoot with dry-run / unknown ID:")
    res = troubleshoot(charger_name="CB1671")
    print(f"Status: {res.get('status')}")
    print(f"Message: {res.get('message')}")
    print(f"Full Result: {res}")
except Exception as e:
    print(f"❌ Failed to import or run: {e}")
    import traceback
    traceback.print_exc()
