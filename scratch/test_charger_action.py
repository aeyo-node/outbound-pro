import os
import sys
from dotenv import load_dotenv

# Load env
load_dotenv()

# Add api-call to path
api_call_path = os.path.join(os.getcwd(), "api-call")
sys.path.append(api_call_path)

from charger_action import charger_action

def test_availability():
    print("Testing availability for 'CMOD'...")
    res = charger_action("availability", "CMOD")
    print(f"Result: {res}")

if __name__ == "__main__":
    test_availability()
