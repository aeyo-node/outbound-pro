
import os
import sys
import json
import logging
import asyncio
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
        count = 0
        for row in res.data:
            os.environ[row["key"]] = str(row["value"])
            count += 1
        logger.info(f"Loaded {count} settings from Supabase.")
    except Exception as e:
        logger.warning(f"Failed to load settings from Supabase: {e}")

def test_api_connectivity():
    logger.info("Starting ChargeMOD API Diagnostic Test")
    logger.info("=" * 50)
    
    # First, load settings from DB
    load_db_settings_to_env()
    
    # Check credentials
    email = os.getenv("USER_EMAIL")
    password = os.getenv("USER_PASSWORD")
    logger.info(f"USER_EMAIL: {email}")
    logger.info(f"USER_PASSWORD: {'SET' if password else 'MISSING'}")
    
    if not email or not password:
        logger.error("Credentials missing in .env! Cannot proceed with auth test.")
        return

    try:
        from auth_key import get_auth_token, invalidate_token
        logger.info("1. Testing Authentication API...")
        invalidate_token()
        token = get_auth_token(force_refresh=True)
        if token:
            logger.info(f"SUCCESS: Auth token obtained: {token[:20]}...")
        else:
            logger.error("FAILED: Could not obtain auth token.")
            return
    except Exception as e:
        logger.error(f"EXCEPTION during auth: {e}", exc_info=True)
        return

    try:
        from chargepoints import resolve_charger, fetch_chargepoint_details
        logger.info("\n2. Testing Charger Resolution API...")
        test_id = "chargemod"
        logger.info(f"Resolving charger identifier: '{test_id}'")
        res = resolve_charger(test_id)
        logger.info(f"Resolution Result: {json.dumps(res, indent=2)}")
        
        if res.get("status") == "resolved":
            identity = res["charger"]["identity"]
            logger.info(f"Fetching details for identity: {identity}")
            details = fetch_chargepoint_details(identity)
            if details:
                logger.info("SUCCESS: Charger details fetched.")
                logger.info(f"Charger Name: {details.get('chargerName')}")
                logger.info(f"Protocol: {details.get('chargePointConnectionProtocol')}")
            else:
                logger.error("FAILED: Charger details returned empty.")
    except Exception as e:
        logger.error(f"EXCEPTION during charger resolution: {e}", exc_info=True)

    try:
        from charger_action import charger_action
        logger.info("\n3. Testing charger_action('availability')...")
        res = charger_action("availability", test_id)
        logger.info(f"Availability Result: {json.dumps(res, indent=2)}")
        
        if "error" in res:
            logger.error(f"FAILED: charger_action returned error: {res['error']}")
        else:
            logger.info("SUCCESS: charger_action('availability') executed correctly.")
    except Exception as e:
        logger.error(f"EXCEPTION during charger_action: {e}", exc_info=True)

    logger.info("\n" + "=" * 50)
    logger.info("DIAGNOSTIC COMPLETE")

if __name__ == "__main__":
    test_api_connectivity()
