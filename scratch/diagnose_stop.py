
import os
import sys
import json
import logging
import asyncio
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("diagnostic_stop")

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path)

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
api_path = os.path.join(project_root, "api-call")
if project_root not in sys.path:
    sys.path.insert(0, project_root)
if api_path not in sys.path:
    sys.path.insert(0, api_path)

def load_db_settings_to_env():
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY")
        if not url or not key:
            return
        db = create_client(url, key)
        res = db.table("settings").select("key, value").execute()
        for row in res.data:
            os.environ[row["key"]] = str(row["value"])
    except Exception as e:
        pass

def test_remote_stop():
    logger.info("=" * 60)
    logger.info("Starting DIAGNOSTIC for STOP CHARGING")
    logger.info("=" * 60)
    
    load_db_settings_to_env()
    
    target_charger = "CMOD0240"
    target_phone = "8086477654"
    
    try:
        from auth_key import get_auth_token
        token = get_auth_token(force_refresh=True)
        if token:
            logger.info("Auth OK.")
        else:
            logger.error("Auth Failed.")
            return
    except Exception as e:
        logger.error(f"Auth Exception: {e}")
        return

    logger.info(f"\nTesting RemoteStop directly for '{target_charger}' with phone '{target_phone}'")
    try:
        from RemoteStop import remote_stop
        res = remote_stop(target_charger, confirmed_mobile=target_phone)
        logger.info(f"Remote Stop Result:\n{json.dumps(res, indent=2)}")
    except Exception as e:
        logger.error(f"Remote Stop Exception: {e}")

    logger.info(f"\nTesting charger_action('stop', '{target_charger}') without mobile (to see if it requests verification)")
    try:
        from charger_action import charger_action
        res2 = charger_action("stop", target_charger)
        logger.info(f"charger_action Result:\n{json.dumps(res2, indent=2)}")
    except Exception as e:
        logger.error(f"charger_action Exception: {e}")

if __name__ == "__main__":
    test_remote_stop()
