import os
import sys
import json
import re

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'api-call')))

# Import chargepoint functions
try:
    from chargepoints import (
        fetch_chargepoint_details,
        fetch_chargepoint_list,
        resolve_charger
    )
except ImportError:
    try:
        from api_call.chargepoints import (
            fetch_chargepoint_details,
            fetch_chargepoint_list,
            resolve_charger
        )
    except ImportError:
        def fetch_chargepoint_details(identity): return None
        def fetch_chargepoint_list(keyword, charger_type=None): return {"chargepoints": []}
        def resolve_charger(identifier, charger_type=None): return {"status": "not_found", "message": "Resolver missing"}

# Import fetch_logs
try:
    from data.logs import fetch_logs
except ImportError:
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "logs", 
            os.path.join(os.path.dirname(__file__), "logs (1).py")
        )
        logs_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(logs_module)
        fetch_logs = logs_module.fetch_logs
    except Exception as e:
        print(f"Error loading fetch_logs: {e}")
        def fetch_logs(identity, timespan="2d", limit=50): return {"logs": []}

# Import load_error_data
try:
    from data.ErrorCode.ErrorCode.ErrorCodeMapping import load_error_data
except ImportError:
    try:
        from data.ErrorCode.ErrorCodeMapping import load_error_data
    except ImportError:
        def load_error_data(vendor_id): return []

# Dummy implementations of transaction_data
def fetch_transaction_data(keyword, search_field="userMobile", start_date=None, end_date=None, limit=5):
    return {"error": "Transaction data module offline."}

def fetch_active_transaction(keyword):
    return {"error": "Active transaction module offline."}



# ============================
# LOAD LOCAL CHARGER (from AC)
# ============================
def load_local_charger(identity):
    path = os.path.join(
        os.path.dirname(__file__),
        "..", "data", "chargers",
        f"charger_{identity}.json"
    )

    if os.path.exists(path):
        with open(path, "r") as f:
            print(f"📁 Loaded local file: {path}")
            return json.load(f)

    return None


# ============================
# AC ERROR CODE HELPERS
# ============================
def load_ac_error_codes():
    path = os.path.join(
        os.path.dirname(__file__),
        "..", "data", "ErrorCode",
        "AC CHARGER ERROR CODE.json"
    )

    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)

    return []
# ============================
# TIERED LOG FETCHING LOGIC
# ============================
def fetch_logs_tiered(identity):
    """
    1st: Try last 15 mins.
    2nd: Try last 25 logs.
    3rd: Try last 2 days.
    """
    print(f"[*] Fetching logs for {identity} (Tier 1: 15m)")
    # Logic for 15 minutes
    logs_data = fetch_logs(identity, timespan="15m") 
    
    if not logs_data or len(logs_data.get("logs", [])) == 0:
        print(f"[*] Tier 1 empty. Fetching {identity} (Tier 2: Last 25 logs)")
        logs_data = fetch_logs(identity, limit=25)
        
    if not logs_data or len(logs_data.get("logs", [])) == 0:
        print(f"[*] Tier 2 empty. Fetching {identity} (Tier 3: 2 days)")
        logs_data = fetch_logs(identity, timespan="2d")
        
    return logs_data.get("logs", []) if isinstance(logs_data, dict) else (logs_data or [])

def get_error_details(code):
    for err in load_ac_error_codes():
        if str(err.get("Code")) == str(code):
            return {
                "code": err.get("Code"),
                "name": err.get("Error Name"),
                "resolution": err.get("Resolution")
            }
    return {
        "code": code,
        "name": "Unknown",
        "resolution": "No resolution available"
    }


def extract_error_code(text):
    if not text:
        return None
    match = re.search(r'\b\d{4}\b', str(text))
    if match:
        return match.group(0)
    return None


# ============================
# DC VENDOR ERROR HELPERS
# ============================
def get_vendor_error_details(code, vendor_id):
    if not code:
        return None

    code = str(code).strip()
    all_error_data = load_error_data(vendor_id)

    for data in all_error_data:

        # CASE 1: data is a LIST of error objects
        if isinstance(data, list):
            for item in data:
                if not isinstance(item, dict):
                    continue

                item_code = str(item.get("Code", "")).strip()

                if item_code == code:
                    return {
                        "code": item_code,
                        "description": item.get("Error Name"),
                        "cause": item.get("Error Name"),
                        "solution": item.get("Resolution")
                    }

        # CASE 2: fallback (if dict format exists for other OEMs)
        elif isinstance(data, dict):
            if code in data:
                info = data[code]
                return {
                    "code": code,
                    "description": info.get("description") or info.get("alarm_name"),
                    "cause": info.get("cause") or info.get("alarm_cause"),
                    "solution": info.get("solution") or info.get("resolution")
                }

    return None


# ============================
# PROTOCOL DETECTION
# ============================
def detect_log_protocol(raw_logs):
    if not raw_logs or not isinstance(raw_logs, list):
        return "UNKNOWN"
    
    first_log = raw_logs[0]
    
    # Check for MQTT
    if "message" in first_log or any(k in first_log for k in ["current", "voltage", "power", "soc"]):
        return "MQTT"
    
    # Check for OCPP / OCPP_OVER_MQTT
    log_detail = first_log.get("logs", {})
    if not log_detail:
        return "UNKNOWN"
        
    cp_req = log_detail.get("cp_req")
    if isinstance(cp_req, dict):
        return "OCPP"
    elif isinstance(cp_req, list):
        return "OCPP_OVER_MQTT"
        
    return "UNKNOWN"

# ============================
# SNAPSHOT EXTRACTORS
# ============================
def extract_ocpp_snapshot(raw_logs):
    snapshot = {
        "protocol": "OCPP",
        "status": {},
        "meter": {"soc": None, "voltage": None, "current": None, "power": None, "energy": None, "timestamp": None},
        "raw_log_count": len(raw_logs),
        "latest_log_timestamp": None
    }
    
    if not raw_logs:
        return snapshot
        
    first_detail = raw_logs[0].get("logs", {})
    snapshot["latest_log_timestamp"] = first_detail.get("time")

    for entry in raw_logs:
        log_detail = entry.get("logs", {})
        cp_req = log_detail.get("cp_req", {})
        if not isinstance(cp_req, dict):
            continue

        method = cp_req.get("method")
        payload = cp_req.get("value", {})
        
        # STATUS NOTIFICATION
        if method == "StatusNotification" and not snapshot["status"]:
            snapshot["status"] = {
                "value": payload.get("status"),
                "timestamp": payload.get("timestamp") or log_detail.get("time"),
                "vendor_id": payload.get("vendorId"),
                "info": payload.get("info"),
                "vendor_error": payload.get("vendorErrorCode"),
                "error_code": payload.get("errorCode"),
                "stop_reason": payload.get("reason"),
                "connector_id": payload.get("connectorId")
            }
            
        # METER VALUES
        if method == "MeterValues":
            for mv in payload.get("meterValue", []):
                for s in mv.get("sampledValue", []):
                    meas = s.get("measurand")
                    val = s.get("value")
                    
                    meter = snapshot["meter"]
                    if meas == "SoC" and meter["soc"] is None:
                        meter["soc"] = val
                    elif meas == "Voltage" and meter["voltage"] is None:
                        meter["voltage"] = val
                    elif meas == "Current.Import" and meter["current"] is None:
                        meter["current"] = val
                    elif meas == "Power.Active.Import" and meter["power"] is None:
                        meter["power"] = val
                    elif meas == "Energy.Active.Import.Register" and meter["energy"] is None:
                        meter["energy"] = val
                        
                if snapshot["meter"]["timestamp"] is None and "timestamp" in mv:
                    snapshot["meter"]["timestamp"] = mv.get("timestamp")
                    
    return snapshot

def extract_mqtt_snapshot(raw_logs):
    snapshot = {
        "protocol": "MQTT",
        "status": {},
        "meter": {"soc": None, "voltage": None, "current": None, "power": None, "energy": None, "timestamp": None},
        "raw_log_count": len(raw_logs),
        "latest_log_timestamp": None
    }
    
    if not raw_logs:
        return snapshot
        
    snapshot["latest_log_timestamp"] = raw_logs[0].get("time")

    for entry in raw_logs:
        msg = entry.get("message")
        if isinstance(msg, str):
            try:
                msg = json.loads(msg)
            except:
                msg = {}
        elif isinstance(msg, list):
            # Heartbeat packets arrive as lists — skip them entirely
            continue
        elif not msg:
            msg = entry # Top level keys

        # Skip if msg is still not a dict after all handling
        if not isinstance(msg, dict):
            continue

        # METER
        meter = snapshot["meter"]
        if meter["voltage"] is None: meter["voltage"] = msg.get("V") or msg.get("voltage")
        if meter["current"] is None: meter["current"] = msg.get("I") or msg.get("current")
        if meter["power"] is None: meter["power"] = msg.get("W") or msg.get("power")
        if meter["soc"] is None: meter["soc"] = msg.get("soc")
        if meter["energy"] is None: meter["energy"] = msg.get("energy") or msg.get("E")
        
        # STATUS
        if not snapshot["status"] and ("STATUS" in msg or "status" in msg):
            snapshot["status"] = {
                "value": msg.get("status"),
                "error_code": msg.get("STATUS") or msg.get("errorCode"),
                "timestamp": entry.get("time")
            }
            
    return snapshot

def extract_ocpp_over_mqtt_snapshot(raw_logs):
    snapshot = {
        "protocol": "OCPP_OVER_MQTT",
        "status": {},
        "meter": {"soc": None, "voltage": None, "current": None, "power": None, "energy": None, "timestamp": None},
        "raw_log_count": len(raw_logs),
        "latest_log_timestamp": None
    }
    
    if not raw_logs:
        return snapshot
        
    snapshot["latest_log_timestamp"] = raw_logs[0].get("logs", {}).get("time")

    for entry in raw_logs:
        log_detail = entry.get("logs", {})
        cp_req_list = log_detail.get("cp_req", [])
        if not isinstance(cp_req_list, list):
            continue
            
        # Often index 2 is action, index 3 is payload
        for i, item in enumerate(cp_req_list):
            if item == "StatusNotification" and not snapshot["status"] and i + 1 < len(cp_req_list):
                payload = cp_req_list[i + 1]
                if isinstance(payload, dict):
                    snapshot["status"] = {
                        "value": payload.get("status"),
                        "timestamp": payload.get("timestamp") or log_detail.get("time"),
                        "vendor_id": payload.get("vendorId"),
                        "info": payload.get("info"),
                        "vendor_error": payload.get("vendorErrorCode"),
                        "error_code": payload.get("errorCode"),
                        "stop_reason": payload.get("reason"),
                        "connector_id": payload.get("connectorId")
                    }
                    
            if item == "MeterValues" and i + 1 < len(cp_req_list):
                payload = cp_req_list[i + 1]
                if isinstance(payload, dict):
                    for mv in payload.get("meterValue", []):
                        for s in mv.get("sampledValue", []):
                            meas = s.get("measurand")
                            val = s.get("value")
                            
                            meter = snapshot["meter"]
                            if meas == "SoC" and meter["soc"] is None: meter["soc"] = val
                            elif meas == "Voltage" and meter["voltage"] is None: meter["voltage"] = val
                            elif meas == "Current.Import" and meter["current"] is None: meter["current"] = val
                            elif meas == "Power.Active.Import" and meter["power"] is None: meter["power"] = val
                            elif meas == "Energy.Active.Import.Register" and meter["energy"] is None: meter["energy"] = val
                            
                        if snapshot["meter"]["timestamp"] is None and "timestamp" in mv:
                            snapshot["meter"]["timestamp"] = mv.get("timestamp")

    # Fallback to server_conf or cp_conf if StatusNotification wasn't found
    if not snapshot["status"]:
        for entry in raw_logs:
            log_detail = entry.get("logs", {})
            conf = log_detail.get("cp_conf", {}) or log_detail.get("server_conf", {})
            val = conf.get("value", {}) if isinstance(conf, dict) else {}
            if val and "status" in val:
                snapshot["status"] = {"value": val.get("status"), "timestamp": log_detail.get("time")}
                break
                            
    return snapshot

def extract_latest_snapshot(raw_logs, charger_data=None):
    if not raw_logs:
        return {
            "protocol": "UNKNOWN",
            "status": {},
            "meter": {"soc": None, "voltage": None, "current": None, "power": None, "energy": None, "timestamp": None},
            "raw_log_count": 0,
            "latest_log_timestamp": None
        }

    protocol = detect_log_protocol(raw_logs)

    if protocol == "OCPP":
        return extract_ocpp_snapshot(raw_logs)
    elif protocol == "MQTT":
        return extract_mqtt_snapshot(raw_logs)
    elif protocol == "OCPP_OVER_MQTT":
        return extract_ocpp_over_mqtt_snapshot(raw_logs)
    else:
        snapshot = extract_ocpp_snapshot(raw_logs)
        if snapshot["status"].get("value"):
            return snapshot
        return extract_mqtt_snapshot(raw_logs)

# ============================
# HIERARCHICAL ERROR LOOKUP
# ============================
def lookup_error_code(code, vendor_id=None, oem_name=None, charger_type=None):
    if not code or str(code).lower() == "noerror":
        return None
        
    code_str = str(code).strip()

    # STEP 1: Vendor-specific lookup
    if vendor_id:
        result = get_vendor_error_details(code_str, vendor_id)
        if result:
            result["source"] = f"vendor:{vendor_id}"
            return result

    # STEP 2: OEM fallback
    if oem_name and oem_name != vendor_id:
        result = get_vendor_error_details(code_str, oem_name)
        if result:
            result["source"] = f"oem:{oem_name}"
            return result

    # STEP 3: Domain fallback
    if charger_type == "AC" or not charger_type:
        ac_result = get_error_details(code_str)
        if ac_result and ac_result.get("name") != "Unknown":
            ac_result["source"] = "ac_generic"
            return ac_result

    return None


# ============================
# AC ANALYSIS ENGINE
# ============================
def analyze_ac_charger(charger_data, snapshot):

    result = {
        "summary": None,
        "evidence": {},
        "interpretation": None,
        "next_steps": [],
        "escalation": None
    }

    evse = charger_data.get("evses", [{}])[0]

    available = charger_data.get("available")
    connector_status = evse.get("connectorStatus")
    error_code = evse.get("connectorErrCode")

    status = snapshot.get("status", {}).get("value")
    voltage = snapshot.get("meter", {}).get("voltage")
    current = snapshot.get("meter", {}).get("current")
    power = snapshot.get("meter", {}).get("power")
    
    status_code = snapshot.get("status", {}).get("vendor_error") or snapshot.get("status", {}).get("error_code")
    if status_code and str(status_code) not in ("NoError", "1000"):
        error_code = status_code

    result["evidence"] = {
        "status": status,
        "available": available,
        "connector_status": connector_status,
        "voltage": voltage,
        "current": current,
        "power": power,
        "error_code": error_code
    }

    # ============================
    # ERROR CODE PRIORITY
    # ============================
    error_info = lookup_error_code(
        code=error_code,
        oem_name=charger_data.get("oem", {}).get("oemName") if isinstance(charger_data.get("oem"), dict) else None,
        charger_type="AC"
    ) or get_error_details(error_code)
    
    result["evidence"]["error"] = {
        "code": error_info.get("code", error_code),
        "name": error_info.get("name") or error_info.get("description", "Unknown"),
        "resolution": error_info.get("resolution") or error_info.get("solution", "No resolution available")
    }

    if str(error_code) != "1000" and str(error_code) != "NoError" and error_code:
        result["summary"] = result["evidence"]["error"]["name"]
        result["interpretation"] = result["evidence"]["error"]["resolution"]
        result["next_steps"] = ["Follow resolution", "Try another charger"]
        return result

    # ============================
    # INTELLIGENT DIAGNOSIS
    # ============================

    if status == "Available":
        result["summary"] = "Charger is available and healthy"
        result["interpretation"] = "Charger is idle and ready for a vehicle to plug in. Zero power/current is normal right now."
        result["next_steps"] = [
            "Connect the charging cable to the vehicle",
            "Start the charging session from the app"
        ]
    elif status == "Charging" and (power == 0 or power is None):
        result["summary"] = "No power delivery"
        result["interpretation"] = "Session active but power not flowing"
        result["next_steps"] = [
            "Restart charging session",
            "Check cable",
            "Try different charger"
        ]
    elif status == "Disconnected":
        result["summary"] = "Charger offline"
        result["interpretation"] = "No communication from charger"
        result["next_steps"] = ["Try another station"]
        result["escalation"] = "Field support required"
    elif snapshot.get("raw_log_count", 0) == 0:
        result["summary"] = "No logs available"
        result["interpretation"] = "Charger may be offline"
        result["next_steps"] = ["Try another charger"]
    else:
        result["summary"] = "Charger working normally"
        result["interpretation"] = "No issues detected"

    return result

# ============================
# DC ANALYSIS ENGINE
# ============================
def analyze_dc(charger_data, snapshot):

    if snapshot.get("raw_log_count", 0) == 0:
        return {
            "summary": "No logs received",
            "interpretation": "Charger may be offline or not reporting",
            "next_steps": ["Check network", "Restart charger"],
            "escalation": "If persists, escalate"
        }

    status = snapshot.get("status", {}).get("value")
    ts = snapshot.get("status", {}).get("timestamp")
    vendor_error = snapshot.get("status", {}).get("vendor_error")
    error_code = snapshot.get("status", {}).get("error_code")
    stop_reason = snapshot.get("status", {}).get("stop_reason")
    conn_id = snapshot.get("status", {}).get("connector_id")
    meter = snapshot.get("meter", {})
    info = snapshot.get("status", {}).get("info")
    vendor_id = snapshot.get("status", {}).get("vendor_id")

    result = {
        "status": status,
        "timestamp": ts,
        "vendor_error": vendor_error,
        "error_code": error_code,
        "info": info,
        "connectorId": conn_id,
        "meter": meter,
        "summary": None,
        "interpretation": None,
        "next_steps": [],
        "escalation": None
    }

    # AVAILABLE
    if status == "Available":
        result["summary"] = "Charger is available"
        result["interpretation"] = "Idle and ready"
        return result

    # CHARGING
    if status in ["Charging", "Preparing"]:
        result["summary"] = "Charging in progress"
        if meter.get("power") and float(meter["power"]) > 0:
            result["interpretation"] = "Power is being delivered"
        else:
            result["interpretation"] = "No power detected"
            result["next_steps"] = ["Check cable", "Restart session"]
        return result

    # Finishing
    if status == "Finishing":
        result["summary"] = "Charging session finished"

        #  STEP 1: STOP REASON (highest priority)
        if stop_reason:
            result["interpretation"] = f"Stopped due to: {stop_reason}"
            return result

        #  STEP 2: VENDOR ERROR (OEM specific)
        v_err = vendor_error or (error_code if error_code and error_code != "NoError" else None)

        if v_err:
            v_id = vendor_id or (charger_data.get("oem", {}).get("oemName") if isinstance(charger_data.get("oem"), dict) else None)
            vendor_info = lookup_error_code(v_err, v_id, charger_data.get("oem", {}).get("oemName") if isinstance(charger_data.get("oem"), dict) else None, "DC")

            if vendor_info:
                result["summary"] = vendor_info.get("description")
                result["interpretation"] = vendor_info.get("cause")

                solution = vendor_info.get("solution")
                if isinstance(solution, list):
                    result["next_steps"] = solution
                elif solution:
                    result["next_steps"] = [solution]
            else:
                result["interpretation"] = f"Vendor Error: {v_err}"

        #  STEP 3: OCPP ERROR
        if error_code and error_code != "NoError":
            if not result["interpretation"] or f"Error: {error_code}" not in result["interpretation"]:
                if result["interpretation"]:
                    result["interpretation"] += f" | OCPP Error: {error_code}"
                else:
                    result["interpretation"] = f"OCPP Error: {error_code}"

        #  STEP 4: INFO fallback
        if not result["interpretation"] and info:
            result["interpretation"] = info

        #  STEP 5: Normal successful completion
        if not result["interpretation"]:
            result["interpretation"] = "Charging completed successfully"

        return result


    # DISCONNECTED
    if status == "Disconnected" or not status:
        result["summary"] = "Charger offline"
        result["escalation"] = "Field team check required"
        return result

    # FAULTED
    if status == "Faulted":

        result["summary"] = "Charger is in Faulted state"

        if stop_reason:
            result["summary"] = f"Stopped due to: {stop_reason}"
            result["interpretation"] = "Session terminated with a stop reason"
            return result

        # Check vendor_error OR error_code
        v_err = vendor_error or (error_code if error_code and error_code != "NoError" else None)

        if v_err:
            v_id = vendor_id or (charger_data.get("oem", {}).get("oemName") if isinstance(charger_data.get("oem"), dict) else None)
            vendor_info = lookup_error_code(v_err, v_id, charger_data.get("oem", {}).get("oemName") if isinstance(charger_data.get("oem"), dict) else None, "DC")

            if vendor_info:
                result["summary"] = vendor_info.get("description")
                result["interpretation"] = vendor_info.get("cause")

                solution = vendor_info.get("solution")
                if isinstance(solution, list):
                    result["next_steps"] = solution
                elif solution:
                    result["next_steps"] = [solution]
            else:
                result["interpretation"] = f"Vendor Error: {v_err}"

        if error_code and error_code != "NoError":
            if not result["interpretation"] or f"Error: {error_code}" not in result["interpretation"]:
                if result["interpretation"]:
                    result["interpretation"] += f" | OCPP Error: {error_code}"
                else:
                    result["interpretation"] = f"OCPP Error: {error_code}"

        if not result["interpretation"] and info:
            result["interpretation"] = info

        if not result["interpretation"]:
            result["interpretation"] = "Unknown fault"

        result["escalation"] = f"Check charger with OEM ({vendor_id or 'Unknown'}) or field team"

        return result


    # FINAL fallback
    return result

# ============================
# DIRECT ANSWERS
# ============================
def build_direct_answers(charger_data, snapshot):

    status = snapshot.get("status", {}).get("value")
    ts = snapshot.get("status", {}).get("timestamp")
    vendor_error = snapshot.get("status", {}).get("vendor_error")
    error_code = snapshot.get("status", {}).get("error_code")
    stop_reason = snapshot.get("status", {}).get("stop_reason")
    conn_id = snapshot.get("status", {}).get("connector_id")
    meter = snapshot.get("meter", {})
    info = snapshot.get("status", {}).get("info")

    connectors = charger_data.get("evses", [])

    return {
        "is_online": charger_data.get("online") or charger_data.get("connected"),
        "current_status": status,
        "timestamp": ts,
        "protocol": snapshot.get("protocol") or charger_data.get("protocol") or charger_data.get("communicationProtocol"),
        "connectorId": conn_id,
        "stop_reason": stop_reason,
        "vendor_error": vendor_error,
        "error_code": error_code,
        "info": info,
        "meter": meter,
        "connectors": connectors
    }



# ============================
# TRANSACTION QUERY HELPERS
# ============================
def resolve_required_modules(query_type=None):
    if not query_type:
        return None
    query_type = query_type.lower()
    mapping = {
        "history": "transaction",
        "charging": "transaction",
        "last_charging": "transaction",
        "transaction": "transaction",
        "transactions": "transaction",
        "active": "active_transaction",
        "active_transaction": "active_transaction",
    }
    return mapping.get(query_type, None)


def fetch_transaction_context(keyword, query_type, search_field="userMobile",
                              start_date=None, end_date=None, limit=5):
    """Fetch transaction or active transaction data and return structured context."""
    module = resolve_required_modules(query_type)
    if not module:
        return None

    user_context = {}
    executed_apis = []

    if module == "transaction":
        print(f"[*] Executing api/transaction_data.py -> Fetching transaction data for keyword: {keyword} with searchField: {search_field}...")
        executed_apis.append(f"api/transaction_data.py (keyword='{keyword}', searchField='{search_field}')")
        fetched = fetch_transaction_data(keyword, search_field=search_field,
                                         start_date=start_date, end_date=end_date,
                                         limit=limit)
        user_context['transaction'] = fetched if fetched else {"error": "No transaction data returned from backend"}

    if module == "active_transaction":
        print(f"[*] Executing api/transaction_data.py -> Fetching active transaction data for keyword: {keyword}...")
        executed_apis.append(f"api/transaction_data.py [active] (keyword='{keyword}')")
        fetched = fetch_active_transaction(keyword)
        user_context['active_transaction'] = fetched if fetched else {"error": "No active transaction data returned from backend"}

    user_context['executed_apis'] = executed_apis
    return user_context


# ============================
# MAIN UNIFIED TOOL
# ============================
def troubleshoot(
    charger_identity=None,
    charger_name=None,
    issue_summary=None,
    phone=None,
    keyword=None,
    search_field="userMobile",
    query_type=None,
    start_date=None,
    end_date=None,
    limit=5
):
    print("Troubleshoot (unified) tool called")
    print("charger_identity:", charger_identity)
    print("charger_name:", charger_name)
    print("issue_summary:", issue_summary)
    print("phone:", phone)
    print("keyword:", keyword)
    print("search_field:", search_field)
    print("query_type:", query_type)
    print("start_date:", start_date)
    print("end_date:", end_date)
    print("limit:", limit)

    executed_apis = []

    # ============================
    # TRANSACTION / ACTIVE TRANSACTION MODE
    # ============================
    if query_type and resolve_required_modules(query_type):
        search_keyword = keyword or phone or charger_identity or charger_name
        if not search_keyword:
            return {
                "tool": "troubleshoot",
                "status": "error",
                "message": "No identifier provided. Please provide phone, keyword, or charger_identity."
            }

        # Smart defaulting if the LLM provided data via explicit kwargs but left search_field as default
        if not keyword and search_field == "userMobile":
            if phone:
                search_field = "userMobile"
            elif charger_identity:
                search_field = "identity"
            elif charger_name:
                search_field = "chargerName"

        if limit is None:
            limit = 5

        tx_matched_as = None
        # Fuzzy match if the search field implies a charger
        if search_field in ["identity", "chargerName"]:
            # Long numeric IDs are direct identities — skip the fuzzy resolver
            if str(search_keyword).strip().isdigit() and len(str(search_keyword).strip()) >= 10:
                search_field = "identity"
            else:
                print(f"[*] troubleshoot: Pre-resolving charger for transaction query: {search_keyword}")
                res = resolve_charger(search_keyword)
                print(f"[*] resolve_charger returned: {res}")
                if res["status"] == "resolved":
                    resolved_identity = res["charger"]["identity"]
                    tx_matched_as = None
                    if resolved_identity != search_keyword:
                        executed_apis.append(f"tools/charger_resolver.py ('{search_keyword}' -> '{resolved_identity}')")
                        if res.get("match_source") == "fuzzy":
                            cname = res["charger"].get("chargerName", resolved_identity)
                            tx_matched_as = f"{cname} ({resolved_identity})"
                    search_keyword = resolved_identity
                    search_field = "identity"
                    print(f"[*] Resolved to identity: {search_keyword}")
                elif res["status"] == "need_selection" or res["status"] == "multiple":
                    return {
                        "tool": "troubleshoot",
                        "status": "need_selection",
                        "options": res.get("options"),
                        "message": res.get("message") or f"I found multiple chargers matching '{search_keyword}'. Please specify which one you meant:"
                    }

        tx_context = fetch_transaction_context(
            keyword=search_keyword,
            query_type=query_type,
            search_field=search_field,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        if tx_context:
            executed_apis.extend(tx_context.pop('executed_apis', []))
            return {
                "tool": "troubleshoot",
                "status": "success",
                "query_type": query_type,
                "charger_type": None,
                "data": tx_context,
                "matched_as": tx_matched_as,
                "executed_apis": executed_apis
            }

    # ============================
    # ERROR CODE ONLY MODE (no charger ID)
    # ============================
    error_code = extract_error_code(issue_summary)

    identifier = charger_identity or charger_name

    if error_code and not identifier:
        # Try AC error code lookup
        ac_error = get_error_details(error_code)

        result = {
            "tool": "troubleshoot",
            "status": "success",
            "mode": "error_lookup",
            "charger_type": None,  # unknown without charger
            "error_code_details": ac_error,
            "analysis": {
                "summary": ac_error["name"],
                "interpretation": ac_error["resolution"],
                "next_steps": ["Follow resolution"]
            },
            "direct_answers": None,
            "note": "This is an AC error code lookup. For DC vendor-specific error codes, provide the charger identity so the vendor can be identified.",
            "executed_apis": executed_apis
        }
        return result

    if not identifier:
        return {
            "tool": "troubleshoot",
            "status": "error",
            "charger_type": None,
            "message": "Provide charger identity or location",
            "executed_apis": executed_apis
        }

    # ============================
    # LIST MODE
    # ============================
    if issue_summary and any(w in issue_summary.lower() for w in ["list", "show", "find"]):

        print(f"[*] Executing api/chargepoints.py -> Fetching chargepoint list for: {identifier}...")
        executed_apis.append(f"api/chargepoints.py (list for identifier='{identifier}')")
        list_data = fetch_chargepoint_list(identifier, charger_type=None)

        return {
            "tool": "troubleshoot",
            "status": "list",
            "charger_type": None,
            "chargers": list_data.get("chargepoints", []),
            "executed_apis": executed_apis
        }

    # ============================
    # RESOLVE CHARGER (type-agnostic)
    # ============================
    # Long numeric IDs (≥10 digits) are direct charger identities — bypass
    # the local-DB fuzzy resolver and hit the API directly, same as charger_action.
    diag_matched_as = None
    if str(identifier).strip().isdigit() and len(str(identifier).strip()) >= 10:
        identity = str(identifier).strip()
        charger = {"identity": identity, "name": identity}
        executed_apis.append(f"api/chargepoints.py (direct lookup for identity='{identity}')")
    else:
        print(f"[*] Executing tools/charger_resolver.py -> Resolving charger: {identifier}...")
        resolution = resolve_charger(identifier, charger_type=None)

        if resolution["status"] == "resolved":
            resolved_identity = resolution["charger"].get("identity", identifier)
            if resolved_identity.lower() != identifier.lower():
                executed_apis.append(f"tools/charger_resolver.py ('{identifier}' -> '{resolved_identity}')")
                if resolution.get("match_source") == "fuzzy":
                    cname = resolution["charger"].get("chargerName", resolved_identity)
                    diag_matched_as = f"{cname} ({resolved_identity})"
            else:
                executed_apis.append(f"tools/charger_resolver.py (resolved '{identifier}')")
        elif resolution["status"] in ["multiple", "need_selection"]:
            executed_apis.append(f"tools/charger_resolver.py (multiple matches for '{identifier}')")
            return {
                "tool": "troubleshoot",
                "status": "need_selection",
                "charger_type": None,
                "options": resolution.get("options"),
                "message": resolution.get("message"),
                "executed_apis": executed_apis
            }
        else:
            executed_apis.append(f"tools/charger_resolver.py (not found: '{identifier}')")

        if resolution["status"] not in ["resolved", "success"]:
            return {
                "tool": "troubleshoot",
                "status": resolution["status"],
                "charger_type": None,
                "message": resolution.get("message"),
                "options": resolution.get("options"),
                "executed_apis": executed_apis
            }

        charger = resolution["charger"]
        identity = charger.get("identity")


    # ============================
    # FETCH CHARGER DETAILS
    # ============================
    print(f"[*] Executing api/chargepoints.py -> Fetching chargepoint details for identity: {identity}...")
    executed_apis.append(f"api/chargepoints.py (details for identity='{identity}')")
    charger_data = fetch_chargepoint_details(identity)

    if not charger_data:
        charger_data = load_local_charger(identity)

    if not charger_data:
        return {
            "tool": "troubleshoot",
            "status": "error",
            "charger_type": None,
            "message": "Charger data not found",
            "executed_apis": executed_apis
        }

    # ============================
    # DETERMINE CHARGER TYPE FROM API
    # ============================
    station_type = charger_data.get("stationType", "").upper()
    if station_type not in ("AC", "DC"):
        station_type = "AC"  # default fallback

    # ============================
    # FETCH LOGS (tiered)
    # ============================
    print(f"[*] Executing tiered log fetch for identity: {identity}...")
    executed_apis.append(f"api/logs.py (tiered fetch for identity='{identity}')")
    raw_logs = fetch_logs_tiered(identity)

    # ============================
    # EXTRACT LATEST SNAPSHOT
    # ============================
    snapshot = extract_latest_snapshot(raw_logs, charger_data)


    # ============================
    # RESOLVE ERROR CODE
    # ============================
    error_code_to_lookup = snapshot.get("status", {}).get("vendor_error") or snapshot.get("status", {}).get("error_code")
    vendor_id = snapshot.get("status", {}).get("vendor_id") or (charger_data.get("oem", {}).get("oemName") if isinstance(charger_data.get("oem"), dict) else None)
    
    error_info = None
    if error_code_to_lookup and error_code_to_lookup != "NoError":
        error_info = lookup_error_code(
            code=error_code_to_lookup,
            vendor_id=vendor_id,
            oem_name=charger_data.get("oem", {}).get("oemName") if isinstance(charger_data.get("oem"), dict) else None,
            charger_type=station_type
        )

    # ============================
    # ROUTE TO CORRECT ANALYSIS
    # ============================
    if station_type == "DC":
        analysis = analyze_dc(charger_data, snapshot)
        direct_answers = build_direct_answers(charger_data, snapshot)
        
        return {
            "tool": "troubleshoot",
            "status": "success",
            "charger_type": "DC",
            "charger_details": charger_data,
            "latest_snapshot": snapshot,
            "recent_logs": raw_logs[:5] if raw_logs else [],
            "error_code_details": error_info,
            "analysis": analysis,
            "direct_answers": direct_answers,
            "matched_as": diag_matched_as,
            "executed_apis": executed_apis
        }
    else:
        # AC analysis
        analysis = analyze_ac_charger(charger_data, snapshot)

        # Fallback to AC specifics if missing from snapshot
        evse = charger_data.get("evses", [{}])[0]
        ac_error_code = evse.get("connectorErrCode")
        connector = evse.get("connectors", {})

        if not error_info and ac_error_code and ac_error_code != "NoError":
            error_info = lookup_error_code(ac_error_code, charger_type="AC")

        return {
            "tool": "troubleshoot",
            "status": "success",
            "charger_type": "AC",
            "charger_details": {
                "name": charger.get("name"),
                "identity": identity,
                "available": charger_data.get("available"),
                "protocol": charger_data.get("protocol") or charger_data.get("communicationProtocol"),
                "evse": {
                    "status": evse.get("status"),
                    "connector_status": evse.get("connectorStatus"),
                    "error_code": evse.get("connectorErrCode"),
                    "connector_id": evse.get("connectorId"),
                    "physical_reference": evse.get("physicalReference"),
                    "max_output_power_kw": evse.get("maxOutputPower"),
                },
                "connector": {
                    "name": connector.get("name"),
                    "power_type": connector.get("powerType"),
                    "max_voltage": connector.get("maxVoltage"),
                    "max_amperage": connector.get("maxAmperage"),
                    "max_power_watts": connector.get("maxElectricPower"),
                }
            },
            "latest_snapshot": snapshot,
            "recent_logs": raw_logs[:5] if raw_logs else [],
            "error_code_details": error_info,
            "analysis": analysis,
            "direct_answers": None,
            "matched_as": diag_matched_as,
            "executed_apis": executed_apis
        }
