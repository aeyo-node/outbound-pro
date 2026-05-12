
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
    logger.info("Starting FULL ChargeMOD Tool Suite Diagnostic")
    logger.info("=" * 60)
    
    load_db_settings_to_env()
    
    # 1. AUTH TEST
    logger.info("\n[1/5] Testing Authentication...")
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
    logger.info(f"\n[2/5] Testing Wallet Balance for +91{target_phone}...")
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

    # 3. CHARGER RESOLUTION & AVAILABILITY
    test_id = "chargemod"
    logger.info(f"\n[3/5] Testing Charger Discovery & Availability for '{test_id}'...")
    selected_identity = None
    try:
        from charger_action import charger_action
        res = charger_action("availability", test_id)
        if res.get("status") == "multiple":
            logger.info("SUCCESS: Fuzzy resolution correctly identified multiple options.")
            options = res.get("options", [])
            for opt in options:
                logger.info(f"  - {opt['identity']}: {opt['label']}")
            # Pick the first one for further testing
            selected_identity = options[0]["identity"]
            logger.info(f"Proceeding with specific identity: {selected_identity}")
            
            # Re-test availability with specific identity
            res_v2 = charger_action("availability", selected_identity)
            if "error" in res_v2:
                logger.error(f"FAILED: Availability check for {selected_identity}: {res_v2['error']}")
            else:
                logger.info(f"SUCCESS: Availability fetched for {selected_identity}")
                logger.info(f"Message: {res_v2.get('message')}")
        else:
            logger.info(f"Result: {res.get('status')} - {res.get('message')}")
            if "error" in res: logger.error(f"Error detail: {res['error']}")
    except Exception as e:
        logger.error(f"EXCEPTION in Availability: {e}")

    # 4. TARIFF TEST
    if selected_identity:
        logger.info(f"\n[4/5] Testing Tariff Fetch for {selected_identity}...")
        try:
            res_t = charger_action("tariff", selected_identity)
            if "error" in res_t:
                logger.error(f"FAILED: Tariff check: {res_t['error']}")
            else:
                logger.info(f"SUCCESS: Tariff Message: {res_t.get('message')}")
        except Exception as e:
            logger.error(f"EXCEPTION in Tariff: {e}")

    # 5. START CHARGING FLOW (UP TO OTP)
    if selected_identity:
        logger.info(f"\n[5/5] Testing Start Charging Flow (Sequence) for {selected_identity}...")
        try:
            # We test the first step of the start flow which should trigger "need_connector" or "need_otp_method"
            res_s = charger_action("start", selected_identity, customer_mobile=target_phone)
            logger.info(f"Step 1 (Initial Request) Status: {res_s.get('status')}")
            logger.info(f"Message: {res_s.get('message')}")
            
            if res_s.get("status") == "need_connector":
                # Simulate selecting Gun 1
                logger.info("Simulating Gun 1 selection...")
                res_s2 = charger_action("start", selected_identity, customer_mobile=target_phone, connector_id=1)
                logger.info(f"Step 2 (Connector Selected) Status: {res_s2.get('status')}")
                logger.info(f"Message: {res_s2.get('message')}")
                
                if res_s2.get("status") == "need_otp_method":
                    logger.info("SUCCESS: Start sequence correctly reached OTP Method stage.")
            elif res_s.get("status") == "need_otp_method":
                logger.info("SUCCESS: Start sequence correctly reached OTP Method stage.")
            else:
                logger.warning(f"Flow stopped at unexpected status: {res_s.get('status')}")
                
        except Exception as e:
            logger.error(f"EXCEPTION in Start Flow: {e}")

    logger.info("\n" + "=" * 60)
    logger.info("FULL DIAGNOSTIC COMPLETE")

if __name__ == "__main__":
    run_full_diagnostic()
