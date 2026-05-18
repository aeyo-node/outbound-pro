import requests
import json
import os
import sys
import time
import traceback
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import logging
import zoneinfo

IST = zoneinfo.ZoneInfo("Asia/Kolkata")





def ist_converter(*args):
    return datetime.now(IST).timetuple()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logging.Formatter.converter = ist_converter

def convert_to_ist(val):
    """Helper to convert UTC ISO strings to IST readable strings."""
    if not isinstance(val, str) or not (val.endswith('Z') or '+00:00' in val):
        return val
    try:
        clean_val = val.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_val)
        return dt.astimezone(IST).strftime("%Y-%m-%d %H:%M:%S")
    except:
        return val

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
CHARGER_DIR = os.path.join(DATA_DIR, "chargers")
LOGS_DIR = os.path.join(DATA_DIR, "logs")

os.makedirs(CHARGER_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

from auth_key import get_auth_token, invalidate_token

# ===== LOAD ENV =====
load_dotenv()
BASE_LS = os.getenv("BASE_LS")
BASE_TTS = os.getenv("BASE_TTS")

if not BASE_LS or not BASE_TTS:
    raise ValueError(" BASE_LS or BASE_TTS missing in .env")


# ============================
# AUTH-AWARE REQUEST HELPER
# On 401/403 → invalidates stale cache, force-refreshes token, retries once.
# ============================
def make_api_request(method, url, **kwargs):
    token = get_auth_token()
    if not token:
        raise RuntimeError("Unable to obtain auth token.")

    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    headers.setdefault("Accept", "application/json")

    response = requests.request(method, url, headers=headers, **kwargs)

    if response.status_code in (401, 403):
        print(f"[make_api_request] {response.status_code} — token expired. Invalidating cache and refreshing...")
        invalidate_token()
        new_token = get_auth_token(force_refresh=True)
        if not new_token:
            raise RuntimeError(f"Token refresh failed after {response.status_code}.")
        headers["Authorization"] = f"Bearer {new_token}"
        response = requests.request(method, url, headers=headers, **kwargs)

    return response


# ============================
# TIME RANGE
# ============================
from datetime import datetime, timedelta, timezone

def get_time_range(timespan="2d"):
    """
    Parses timespan (e.g. '15m', '2d') and returns UTC startDate/endDate for API.
    """
    if isinstance(timespan, int):
        delta = timedelta(days=timespan)
    elif str(timespan).endswith("m"):
        delta = timedelta(minutes=int(timespan[:-1]))
    elif str(timespan).endswith("d"):
        delta = timedelta(days=int(timespan[:-1]))
    else:
        delta = timedelta(days=2)

    end_utc = datetime.now(timezone.utc)
    start_utc = end_utc - delta

    logging.info(
        f"IST Time range: {start_utc.astimezone(IST)} → {end_utc.astimezone(IST)}"
    )

    return {
        "startDate": start_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "endDate": end_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    }



# ============================
# LOAD CHARGER
# ============================
def load_charger(identity):
    path = os.path.join(CHARGER_DIR, f"charger_{identity}.json")

    if not os.path.exists(path):
        print(f"[*] Charger file not found locally: {path}. Fetching live details from API...")
        try:
            # Resilient import fallback
            api_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "api-call"))
            if api_path not in sys.path:
                sys.path.append(api_path)
            from chargepoints import fetch_chargepoint_details
            
            charger_data = fetch_chargepoint_details(identity)
            if charger_data:
                # Save locally so cache is maintained
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(charger_data, f, indent=2)
                print(f"[+] Successfully fetched and cached charger details for {identity}")
                return charger_data
            else:
                raise ValueError("API returned empty charger data")
        except Exception as e:
            print(f"[-] Failed to fetch live charger details for {identity}: {e}")
            raise FileNotFoundError(f" Charger file not found: {path} and live fetch failed: {e}")

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================
# SAVE LOGS
# ============================
def save_logs(filename, data):
    path = os.path.join(LOGS_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return path
# ============================
# FILTER LOGS (IMPORTANT)
# ============================
def filter_logs(raw_logs):
    filtered = []

    for entry in raw_logs:
        log = entry.get("logs", {})
        cp_req = log.get("cp_req", {})

        # Only MeterValues
        if cp_req.get("method") != "MeterValues":
            continue

        value = cp_req.get("value", {})
        connector_id = value.get("connectorId")

        meter_values = value.get("meterValue", [])

        for mv in meter_values:
            timestamp = convert_to_ist(mv.get("timestamp"))
            sampled_values = mv.get("sampledValue", [])

            data = {
                "connectorId": connector_id,
                "errorCode":None,
                "status":None,
                "timestamp": timestamp,
                "current": None,
                "energy": None,
                "power": None,
                "soc": None,
                "voltage": None,
                "reason":None
            }

            for sv in sampled_values:
                measurand = sv.get("measurand")
                val = sv.get("value")

                if measurand == "Current.Import":
                    data["current"] = val
                elif measurand == "Energy.Active.Import.Register":
                    data["energy"] = val
                elif measurand == "Power.Active.Import":
                    data["power"] = val
                elif measurand == "SoC":
                    data["soc"] = val
                elif measurand == "Voltage":
                    data["voltage"] = val

            filtered.append(data)

    return filtered

# ============================
# OCPP LOGS
# ============================
def fetch_ocpp_logs(identity, connectors, timespan="2d", limit=50):
    all_logs = []
    time_range = get_time_range(timespan)


    try:
        # STEP 1: Trigger all connectors
        for connector_id in connectors:
            trigger_url = f"{BASE_TTS}/{identity}/Socket-TriggerMessage"

            trigger_payload = {
                "connectionType": "OCPP",
                "requestedMessage": "StatusNotification",
                "connectorId": connector_id
            }

            make_api_request("POST", trigger_url, json=trigger_payload)
            logging.info(f"Triggered connector {connector_id}")

            time.sleep(1)

        # STEP 2: Wait for logs
        logging.info(":hourglass_flowing_sand: Waiting for logs...")
        time.sleep(5)

        # STEP 3: Fetch logs once
        logs_url = f"{BASE_LS}/logs/get-chargepoint-logs/{identity}?skip=0&limit={limit}"


        payload = {
            "filterDate": time_range,
            "menu": "All",
            "sortOrder": -1
        }

        logging.info(f"Fetching logs -> {payload}")

        res = make_api_request("POST", logs_url, json=payload)

        if res.status_code != 200:
            logging.error("Logs API failed")
            return []

        logs_data = res.json()

        # Save raw logs
        save_logs(f"logs_{identity}_raw.json", logs_data)

        raw_logs = logs_data.get("logs", [])
        
        # Keep all raw logs (so StatusNotification and other events are not lost) 
        # but convert their timestamps to IST
        for entry in raw_logs:
            log_detail = entry.get("logs", {})
            if "time" in log_detail:
                log_detail["time"] = convert_to_ist(log_detail["time"])
            
            cp_req = log_detail.get("cp_req", {})
            if isinstance(cp_req, dict):
                val = cp_req.get("value", {})
                if isinstance(val, dict) and "timestamp" in val:
                    val["timestamp"] = convert_to_ist(val["timestamp"])
                elif isinstance(val, dict) and "meterValue" in val:
                    for mv in val.get("meterValue", []):
                        if "timestamp" in mv:
                            mv["timestamp"] = convert_to_ist(mv["timestamp"])

        all_logs = raw_logs

    except Exception as e:
        logging.error(f"OCPP Error: {str(e)}")
        traceback.print_exc()

    return all_logs


# ============================
# MQTT LOGS
# ============================
def fetch_mqtt_logs(identity, timespan="2d", limit=25):
    try:
        url = f"{BASE_LS}/work-line/charger/get-logs"

        payload = {
            "identity": identity,
            "skip": 0,
            "limit": limit,
            "filterDate": get_time_range(timespan)
        }


        res = make_api_request("POST", url, json=payload)

        if res.status_code != 200:
            print(" MQTT logs API failed")
            return []

        logs_data = res.json()

        file_name = f"mqtt_{identity}.json"
        save_logs(file_name, logs_data)

        if isinstance(logs_data, dict):
            return logs_data.get("logs", [])

        return []

    except Exception as e:
        print(" MQTT Error:", e)
        return []


# ============================
# FALLBACK FROM FILE
# ============================
def load_cached_logs(identity):
    try:
        files = [
            f for f in os.listdir(LOGS_DIR)
            if identity in f
        ]

        if not files:
            return []

        latest = max(
            files,
            key=lambda x: os.path.getmtime(os.path.join(LOGS_DIR, x))
        )

        with open(os.path.join(LOGS_DIR, latest)) as f:
            data = json.load(f)

        print("[CACHE] Using cached logs:", latest)

        if isinstance(data, dict):
            return data.get("logs", [])

        return []

    except Exception as e:
        print(":warning: Cache load error:", e)
        return []


# ============================
# MAIN FUNCTION
# ============================
def fetch_logs(identity, timespan="2d", limit=50):
    try:
        charger = load_charger(identity)

        station_type = charger.get("stationType")
        protocol = charger.get("chargePointConnectionProtocol")

        connectors = [
            evse.get("connectorId")
            for evse in charger.get("evses", [])
            if evse.get("connectorId")
        ]

        logs = []

        # ============================
        # OCPP FLOW
        # ============================
        if (station_type == "DC" and protocol == "GRIDSCAPE") or \
           (station_type == "AC" and protocol == "OCPP"):

            if not connectors:
                print(" No connectors found")
                return {"logs": []}

            logs = fetch_ocpp_logs(identity, connectors, timespan=timespan, limit=limit)

        # ============================
        # MQTT FLOW
        # ============================
        elif station_type == "AC" and protocol in ["MQTT", "GRIDSCAPE"]:
            logs = fetch_mqtt_logs(identity, timespan=timespan, limit=limit)


        else:
            print(f" Unsupported: {station_type}, {protocol}")
            return {"logs": []}

        # ============================
        # FALLBACK IF EMPTY
        # ============================
        if not logs:
            logs = load_cached_logs(identity)

        print(f"[LOGS] Logs fetched: {len(logs)}")

        return {
            "logs": logs
        }

    except Exception as e:
        print("[ERROR] fetch_logs error:", str(e))
        traceback.print_exc()