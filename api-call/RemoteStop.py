import os
import requests
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

from chargepoints import resolve_charger, fetch_chargepoint_details
from auth_key import get_auth_token

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path)

# BASE_URL settings are now fetched dynamically inside functions.
ORG_ID = "64b793030dd6bb39c1c3e270"
PROJECT_ID = "6494141957d29409895704d2"
def make_request(method, url, **kwargs):
    token = get_auth_token()
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    headers["Content-Type"] = "application/json"
    
    response = requests.request(method, url, headers=headers, **kwargs)
    
    if response.status_code in (401, 403):
        # We don't import invalidate_token to avoid circular deps if needed, 
        # but let's assume auth_key handles it or we just force refresh
        from auth_key import invalidate_token
        invalidate_token()
        token = get_auth_token(force_refresh=True)
        headers["Authorization"] = f"Bearer {token}"
        response = requests.request(method, url, headers=headers, **kwargs)
        
    return response

def get_available_connectors(identity):
    details = fetch_chargepoint_details(identity)
    if not details:
        return None, "Failed to fetch charger details"

    evses = details.get("evses", [])
    if not evses:
        return None, "No connectors found"

    connectors = []
    for evse in evses:
        connectors.append({
            "id": evse.get("connectorId"),
            "status": evse.get("connectorStatus", evse.get("status", "Unknown")),
            "evse_status": evse.get("status", "Unknown"),
            "type": evse.get("connectors", {}).get("name", "Unknown")
        })
    return connectors, None

def remote_stop(identifier, confirmed_mobile=None):
    """
    Handles the remote stop flow:
    1. Checks if the charger is currently charging.
    2. Fetches the active transaction.
    3. Verifies the user's mobile.
    4. Executes the stop command.
    """
    resolved = resolve_charger(identifier)
    if resolved["status"] != "resolved":
        return resolved

    identity = resolved["charger"]["identity"]

    # 1. Check charger connector status first
    connectors, err = get_available_connectors(identity)
    if err:
        return {"error": err}

    # Find the connector that is actively charging
    charging_connector = None
    for c in connectors:
        if c["status"] in ["Charging", "Preparing"]:
            charging_connector = c
            break

    if not charging_connector:
        # Report current status
        statuses = ", ".join(f"Gun {c['id']}: {c['status']}" for c in connectors)
        unavailable = any(c["status"] in ["Available"] for c in connectors)
        if unavailable:
            return {
                "status": "no_active_session",
                "message": f"Charger is Available — no active charging session to stop. ({statuses})"
            }
        return {
            "status": "unavailable",
            "message": f"Charger is not in a stoppable state. Current status: {statuses}"
        }

    connector_id = charging_connector["id"]

    # 2. Fetch active transaction for this charger
    base_url = os.getenv("BASE_LS", "https://ls.console.chargemod.com")
    if not base_url:
        return {"error": "BASE_URL not configured"}

    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    end_date = now.strftime("%Y-%m-%dT%H:%M:%S.000Z")

    payload = {
        "organizationId": ORG_ID,
        "projectId": PROJECT_ID,
        "perPageCount": 50,
        "pageNumber": 1,
        "filterDate": {"startDate": start_date, "endDate": end_date},
        "searchValue": {"searchKey": str(identity)},
        "allowedLocations": [],
        "transactionType": None,
        "sortType": -1,
        "solarType": ""
    }

    try:
        resp = make_request("POST", f"{base_url}/pwr/charger/get-pwr-active-transaction", json=payload)
        if resp.status_code != 200:
            return {"error": f"Failed to fetch active transactions. Status: {resp.status_code}"}
        data = resp.json()
    except Exception as e:
        return {"error": f"Exception while fetching active transactions: {e}"}

    # Find transaction matching this charger identity
    active_tx = None
    results = data.get("result", [])
    
    # We will search multiple fields for identity just in case
    for tx in results:
        tx_identity = str(tx.get("identity", "")).strip()
        tx_station_id = str(tx.get("stationId", "")).strip()
        tx_chargepoint_id = str(tx.get("chargepointId", "")).strip()
        tx_charger_id = str(tx.get("chargerId", "")).strip()
        
        # Sometimes it's nested
        if not any([tx_identity, tx_station_id, tx_chargepoint_id, tx_charger_id]):
            charger_details = tx.get("chargerDetails", {})
            tx_identity = str(charger_details.get("identity", "")).strip()

        target_identity = str(identity).strip()
        
        if target_identity in [tx_identity, tx_station_id, tx_chargepoint_id, tx_charger_id]:
            active_tx = tx
            break

    if not active_tx:
        tx_id = 0
        tx_mobile = ""
        tx_user = "Ghost Session"
    else:
        tx_id = active_tx.get("transactionId") or active_tx.get("_id")
        tx_mobile = active_tx.get("userMobile") or active_tx.get("mobile", "")
        tx_user = active_tx.get("userName", "Unknown")

    # 3. Verify mobile
    if not confirmed_mobile:
        if not active_tx:
            return {
                "status": "verify_mobile",
                "tx_id": 0,
                "tx_mobile": "",
                "tx_user": "Ghost Session",
                "is_ghost": True,
                "message": "Charger is active but no backend transaction found (ghost session). Use Force Stop to terminate."
            }
        return {
            "status": "verify_mobile",
            "tx_id": tx_id,
            "tx_mobile": tx_mobile,
            "tx_user": tx_user,
            "tx_details": {
                "user": tx_user,
                "mobile": tx_mobile,
                "energy_kwh": active_tx.get("usedEnergy"),
                "start_time": active_tx.get("startAt"),
                "amount": active_tx.get("currentUsedAmount"),
            },
            "message": f"Active session found for {tx_user} ({tx_mobile}). Confirm to stop."
        }

    # Allow force-stop (confirmed_mobile="0000000000") to bypass mismatch check
    if active_tx is not None and confirmed_mobile != "0000000000" and str(confirmed_mobile).strip() != str(tx_mobile).strip():
        return {
            "status": "mobile_mismatch",
            "message": f"Mobile number does not match the active session user ({tx_mobile}). Stop aborted."
        }

    # 4. Get connection type
    charger_details = fetch_chargepoint_details(identity)
    connection_type = charger_details.get("chargePointConnectionProtocol", "GRIDSCAPE") if charger_details else "GRIDSCAPE"

    # 5. Execute Remote Stop
    stop_url = f"{os.getenv('BASE_TTS', 'https://tts.console.chargemod.com')}/{identity}/Socket-RemoteStopTransaction"
    stop_payload = {
        "transactionId": tx_id,
        "connectionType": connection_type,
        "connectorId": connector_id,
        "isEmergency": False
    }

    response = make_request("POST", stop_url, json=stop_payload)

    if response.status_code != 200:
        return {
            "status": "failed",
            "message": "Remote stop failed",
            "details": response.text
        }

    return {
        "status": "success",
        "message": f"Charging stopped for {tx_user} on connector {connector_id}.",
        "transactionId": tx_id,
        "tx_details": {
            "user": tx_user,
            "mobile": tx_mobile,
            "energy_kwh": active_tx.get("usedEnergy") if active_tx else None,
            "start_time": active_tx.get("startAt") if active_tx else None,
            "amount": active_tx.get("currentUsedAmount") if active_tx else None,
            "charger_name": charger_details.get("chargerName", identity) if charger_details else identity
        }
    }


