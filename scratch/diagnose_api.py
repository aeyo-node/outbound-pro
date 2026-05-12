
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

def run_targeted_diagnostic():
    logger.info("=" * 60)
    logger.info("Starting TARGETED ChargeMOD Office Test (CB1671)")
    logger.info("=" * 60)
    
    load_db_settings_to_env()
    
    # Target Values
    target_phone = "8086477654"
    search_term = "CB1671"
    
    # 1. AUTH TEST
    logger.info("\n[1/4] Testing Authentication...")
    try:
        from auth_key import get_auth_token
        token = get_auth_token(force_refresh=True)
        if token:
            logger.info(f"SUCCESS: Auth token obtained.")
        else:
            logger.error("FAILED: Authentication failed.")
            return
    except Exception as e:
        logger.error(f"EXCEPTION in Auth: {e}")
        return

    # 2. DISCOVERY
    logger.info(f"\n[2/4] Testing Discovery for '{search_term}'...")
    selected_identity = None
    try:
        from chargepoints import resolve_charger
        res = resolve_charger(search_term)
        logger.info(f"Resolution Status: {res.get('status')}")
        if res.get("status") in ["resolved", "multiple"]:
            if res.get("status") == "multiple":
                options = res.get("options", [])
                best = options[0]
                selected_identity = best["identity"]
                logger.info(f"Selected from multiple: {best.get('label')} ({selected_identity})")
            else:
                charger = res["charger"]
                selected_identity = charger["identity"]
                label = charger.get("chargerName") or charger.get("identity")
                logger.info(f"Resolved to: {label} ({selected_identity})")
        else:
            logger.error(f"FAILED: Could not find charger matching '{search_term}'")
            return
    except Exception as e:
        logger.error(f"EXCEPTION in Discovery: {e}")
        return

    # 3. AVAILABILITY & TARIFF
    logger.info(f"\n[3/4] Testing Availability & Tariff for {selected_identity}...")
    try:
        from charger_action import charger_action
        avail = charger_action("availability", selected_identity)
        logger.info(f"Availability: {avail.get('message')}")
        
        tariff = charger_action("tariff", selected_identity)
        logger.info(f"Tariff: {tariff.get('message')}")
    except Exception as e:
        logger.error(f"EXCEPTION in Avail/Tariff: {e}")

    # 4. START SEQUENCE (To OTP Stage)
    logger.info(f"\n[4/4] Testing Start Sequence for +91{target_phone}...")
    try:
        # Step 1: Initialize Start
        logger.info(f"Triggering start for {selected_identity}...")
        res_s1 = charger_action("start", selected_identity, customer_mobile=target_phone)
        logger.info(f"Step 1 Status: {res_s1.get('status')} - {res_s1.get('message')}")
        
        if res_s1.get("status") == "need_connector":
            buttons = res_s1.get("buttons", [])
            if buttons:
                conn_id = buttons[0].get("params", {}).get("connector_id")
                logger.info(f"Simulating selection of Connector ID: {conn_id}...")
                res_s2 = charger_action("start", selected_identity, customer_mobile=target_phone, connector_id=conn_id)
                logger.info(f"Step 2 Status: {res_s2.get('status')} - {res_s2.get('message')}")
                
                if res_s2.get("status") == "need_otp_method":
                    logger.info("SUCCESS: Reached OTP Selection Stage!")
            else:
                logger.error("No connectors available to select.")
        elif res_s1.get("status") == "need_otp_method":
            logger.info("SUCCESS: Reached OTP Selection Stage!")
        elif res_s1.get("status") == "error":
            logger.error(f"Start failed: {res_s1.get('message')}")
    except Exception as e:
        logger.error(f"EXCEPTION in Start Sequence: {e}")

    logger.info("\n" + "=" * 60)
    logger.info("TARGETED TEST COMPLETE")

if __name__ == "__main__":
    run_targeted_diagnostic()
