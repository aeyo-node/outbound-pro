
import os
import sys
import json
import logging
import asyncio
import random
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("diagnostic")

# Load environment
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path)

# Add project root and api-call directory to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
api_path = os.path.join(project_root, "api-call")
if project_root not in sys.path:
    sys.path.insert(0, project_root)
if api_path not in sys.path:
    sys.path.insert(0, api_path)

def load_db_settings_to_env():
    """Manually load settings from Supabase to match agent.py behavior"""
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            logger.warning("Supabase URL or Key missing in .env")
            return
        
        db = create_client(url, key)
        res = db.table("settings").select("key, value").execute()
        for row in res.data:
            os.environ[row["key"]] = str(row["value"])
        logger.info(f"Loaded settings from Supabase.")
    except Exception as e:
        logger.warning(f"Failed to load settings from Supabase: {e}")

def run_full_diagnostic():
    logger.info("=" * 60)
    logger.info("Starting ULTIMATE ChargeMOD Tool Suite Diagnostic")
    logger.info("=" * 60)
    
    load_db_settings_to_env()
    
    # 1. AUTH TEST
    logger.info("\n[1/6] Testing Authentication...")
    try:
        from auth_key import get_auth_token, invalidate_token
        invalidate_token()
        token = get_auth_token(force_refresh=True)
        if token:
            logger.info(f"SUCCESS: Auth token obtained.")
        else:
            logger.error("FAILED: Authentication failed.")
            return
    except Exception as e:
        logger.error(f"EXCEPTION in Auth: {e}")
        return

    # 2. WALLET TEST
    target_phone = "8086477654" # User's requested number
    logger.info(f"\n[2/6] Testing Wallet Balance for +91{target_phone}...")
    try:
        from RemoteStart import get_customer_info, get_wallet_balance
        user, err = get_customer_info(target_phone)
        if err:
            logger.error(f"FAILED: Customer lookup: {err}")
        else:
            logger.info(f"Customer Found: {user['userName']} (ID: {user['userId']})")
            balance, b_err = get_wallet_balance(user["userId"])
            if b_err:
                logger.error(f"FAILED: Wallet lookup: {b_err}")
            else:
                logger.info(f"SUCCESS: Wallet Balance: Rs. {balance}")
    except Exception as e:
        logger.error(f"EXCEPTION in Wallet: {e}")

    # 3. DISCOVERY (FUZZY SEARCH)
    search_term = "chargemod"
    logger.info(f"\n[3/6] Testing Charger Discovery for '{search_term}'...")
    selected_identity = None
    try:
        from chargepoints import resolve_charger
        res = resolve_charger(search_term)
        logger.info(f"Resolution Status: {res.get('status')}")
        if res.get("status") == "multiple":
            options = res.get("options", [])
            logger.info(f"SUCCESS: Found {len(options)} matching chargers.")
            for opt in options:
                logger.info(f"  - {opt['identity']}: {opt['label']}")
            selected_identity = options[0]["identity"]
            logger.info(f"Auto-selecting first result for further tests: {selected_identity}")
        elif res.get("status") == "resolved":
            selected_identity = res["charger"]["identity"]
            logger.info(f"SUCCESS: Resolved to {selected_identity}")
        else:
            logger.error(f"FAILED: Unexpected status: {res.get('status')}")
    except Exception as e:
        logger.error(f"EXCEPTION in Discovery: {e}")

    # 4. AVAILABILITY & TARIFF (using resolved identity)
    if not selected_identity:
        selected_identity = "CMOD0127" # Fallback for testing if discovery fails
        logger.warning(f"Discovery failed to pick an identity. Using fallback: {selected_identity}")

    logger.info(f"\n[4/6] Testing Availability & Tariff for {selected_identity}...")
    try:
        from charger_action import charger_action
        # Test Availability
        avail = charger_action("availability", selected_identity)
        if "error" in avail:
            logger.error(f"FAILED: Availability check: {avail['error']}")
        else:
            logger.info(f"SUCCESS: Availability: {avail.get('message')}")
        
        # Test Tariff
        tariff = charger_action("tariff", selected_identity)
        if "error" in tariff:
            logger.error(f"FAILED: Tariff check: {tariff['error']}")
        else:
            logger.info(f"SUCCESS: Tariff: {tariff.get('message')}")
    except Exception as e:
        logger.error(f"EXCEPTION in Avail/Tariff: {e}")

    # 5. START CHARGING FLOW
    logger.info(f"\n[5/6] Testing Start Charging Flow for {selected_identity}...")
    try:
        # Step 1: Initial start request
        logger.info("Triggering initial start command...")
        res_s = charger_action("start", selected_identity, customer_mobile=target_phone)
        logger.info(f"Start Step 1 Result: {res_s.get('status')} - {res_s.get('message')}")
        
        # Step 2: Simulate connector selection if needed
        if res_s.get("status") == "need_connector":
            logger.info("Simulating connector selection (Gun 1)...")
            res_s2 = charger_action("start", selected_identity, customer_mobile=target_phone, connector_id=1)
            logger.info(f"Start Step 2 Result: {res_s2.get('status')} - {res_s2.get('message')}")
            if res_s2.get("status") == "need_otp_method":
                logger.info("SUCCESS: Start sequence reached OTP stage.")
        elif res_s.get("status") == "need_otp_method":
            logger.info("SUCCESS: Start sequence reached OTP stage.")
        else:
            logger.warning(f"Start flow stopped at status: {res_s.get('status')}")
    except Exception as e:
        logger.error(f"EXCEPTION in Start Flow: {e}")

    # 6. STOP CHARGING TEST
    logger.info(f"\n[6/6] Testing Stop Charging for {selected_identity}...")
    try:
        # Attempt a stop. This might return 'verify_mobile' or 'success' or an error if no session exists.
        # We just want to see if the API handles the request.
        res_p = charger_action("stop", selected_identity)
        logger.info(f"Stop Result: {res_p.get('status')} - {res_p.get('message')}")
        if res_p.get("status") in ["success", "verify_mobile"]:
            logger.info("SUCCESS: Stop API responded correctly.")
        elif "No active transaction" in res_p.get("message", ""):
            logger.info("SUCCESS: Stop API correctly reported no active session.")
        else:
            logger.warning(f"Stop API returned status: {res_p.get('status')}")
    except Exception as e:
        logger.error(f"EXCEPTION in Stop Flow: {e}")

    logger.info("\n" + "=" * 60)
    logger.info("ULTIMATE DIAGNOSTIC COMPLETE")
    logger.info("=" * 60)

if __name__ == "__main__":
    run_full_diagnostic()
