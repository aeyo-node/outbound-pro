import os
import sys
import random

# Append parent directory to path to import api functions
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from RemoteStart import (
    get_customer_info, 
    get_wallet_balance, 
    send_otp, 
    verify_otp,
    make_request,
    get_customer_info, 
    get_wallet_balance, 
    send_otp, 
    verify_otp,
    make_request,
    ORG_ID,
    PROJECT_ID
)
from RemoteStop import remote_stop
from chargepoints import fetch_chargepoint_details
from chargepoints import resolve_charger as fuzzy_resolve_charger

def charger_action(action, charger_identity, customer_mobile=None, connector_id=None, target_time=None, otp_method=None, otp_code=None, confirm_start=None, confirmed_mobile=None):
    """
    Handles the interactive charger actions.
    """
    executed_apis = []
    
    matched_as = None  # set when fuzzy resolution occurred, for display warning
    if len(str(charger_identity)) < 10 or not str(charger_identity).isdigit():
        res = fuzzy_resolve_charger(charger_identity)
        if res:
            if res.get("status") == "resolved":
                resolved_identity = res.get("charger", {}).get("identity", charger_identity)
                if str(resolved_identity) != str(charger_identity):
                    executed_apis.append(f"tools/charger_resolver.py ('{charger_identity}' -> '{resolved_identity}')")
                    if res.get("match_source") == "fuzzy":
                        charger_name = res.get("charger", {}).get("chargerName", resolved_identity)
                        matched_as = f"{charger_name} ({resolved_identity})"
                charger_identity = resolved_identity
            elif res.get("status") == "matched":
                resolved_identity = res.get("best_match", {}).get("identity", charger_identity)
                if str(resolved_identity) != str(charger_identity):
                    executed_apis.append(f"tools/charger_resolver.py ('{charger_identity}' -> '{resolved_identity}')")
                charger_identity = resolved_identity
            elif res.get("status") in ["multiple", "need_selection", "needs_confirmation"]:
                buttons = []
                for opt in res.get("options", []):
                    buttons.append({
                        "label": opt.get("label"),
                        "action": action,
                        "params": {"charger_identity": opt.get("identity")}
                    })
                return {
                    "action": action,
                    "status": res.get("status"),
                    "options": res.get("options"), # Restored for dataframe formatting
                    "buttons": buttons,
                    "message": res.get("message"),
                    "executed_apis": executed_apis
                }
            elif res.get("status") == "not_found":
                return {
                    "error": res.get("message", f"Charger '{charger_identity}' not found."),
                    "executed_apis": executed_apis
                }
    
    if action == "availability":
        executed_apis.append(f"api/chargepoints.py (details for identity='{charger_identity}')")
        details = fetch_chargepoint_details(charger_identity)
        if not details:
            return {"error": "Could not fetch charger details.", "executed_apis": executed_apis}
        
        evses = details.get("evses", [])
        connector_rows = []
        for evse in evses:
            current_status = evse.get("connectorStatus", evse.get("status", "Unknown"))
            cons = evse.get("connectors", {})
            if isinstance(cons, list): cons = cons[0] if cons else {}
            connector_rows.append({
                "connector_id": evse.get("connectorId", "—"),
                "gun": evse.get("physicalReference", "—"),
                "type": cons.get("name", "—"),
                "power_type": cons.get("powerType", "—"),
                "status": current_status,
                "max_power_kw": evse.get("maxOutputPower", "—"),
            })
        
        is_available = any(evse.get("connectorStatus", evse.get("status")) == "Available" for evse in evses)
        
        return {
            "action": "availability",
            "status": "success",
            "charger_identity": charger_identity,
            "charger_name": details.get("chargerName", ""),
            "overall_available": is_available,
            "connectors": connector_rows,
            "matched_as": matched_as,
            "message": f"Charger {details.get('chargerName', charger_identity)} is {'available' if is_available else 'not available'} for charging.",
            "executed_apis": executed_apis
        }

    elif action == "tariff":
        executed_apis.append(f"api/chargepoints.py (details for identity='{charger_identity}')")
        details = fetch_chargepoint_details(charger_identity)
        if not details:
            return {"error": "Could not fetch charger details.", "executed_apis": executed_apis}
        
        import datetime as _dt
        if target_time:
            hour = str(target_time).split(":")[0].zfill(2)
        else:
            now_ist = _dt.datetime.now(_dt.timezone(_dt.timedelta(hours=5, minutes=30)))
            hour = now_ist.strftime("%H")
        time_key = f"{hour}:00"

        # Determine which connectors to show tariff for
        # Default: connector 1 only. Pass connector_id='all' to see all guns.
        evses = details.get("evses", [])
        if connector_id and str(connector_id).lower() == "all":
            target_evses = evses
        elif connector_id is not None:
            cid_str = str(connector_id).strip()
            target_evses = [
                e for e in evses
                if str(e.get("connectorId", "")) == cid_str
                or str(e.get("physicalReference", "")).lower() == cid_str.lower()
            ] or evses[:1]
        else:
            # Default: connector 1 (or first in list)
            default = next((e for e in evses if e.get("connectorId") == 1), None) or (evses[0] if evses else None)
            target_evses = [default] if default else evses[:1]

        tariff_rows = []
        for evse in target_evses:
            cons = evse.get("connectors", {})
            if isinstance(cons, list): cons = cons[0] if cons else {}
            con_name = cons.get("name", f"Connector {evse.get('connectorId', '?')}")
            physical = evse.get("physicalReference", f"Gun {evse.get('connectorId', '?')}")

            new_tariff = evse.get("newTariff", {}).get("tariff", {})
            if new_tariff:
                is_time_based = new_tariff.get("isTimeBasedTariff", False)
                hourly = new_tariff.get("hourlyTariffBreakdown", {}).get("allday", {})
                slot = hourly.get(time_key) or hourly.get(list(hourly.keys())[0]) if hourly else {}
                base = slot.get("base", 0)
                extra = slot.get("extra", 0)
                vat = slot.get("vat", 18)
            else:
                top = details.get("tariff", [{}])
                t = top[0] if top else {}
                is_time_based = t.get("isTimeBasedTariff", False)
                base = t.get("baseDeductiveAmount", 0)
                extra = t.get("extraDeductiveAmount", 0)
                vat = 18

            energy_with_vat = extra * (1 + vat / 100)
            final_tariff = base + energy_with_vat
            tariff_rows.append({
                "Gun": physical,
                "Type": con_name,
                "Time Slot": time_key if is_time_based else "All Day",
                "Base (Rs.)": f"{base:.2f}",
                "Energy (Rs.)": f"{extra:.2f}",
                f"VAT ({vat}%)": f"{energy_with_vat - extra:.2f}",
                "Total/unit (Rs.)": f"{final_tariff:.2f}",
            })

        if not tariff_rows:
            return {"message": "No tariff information found for this charger.", "executed_apis": executed_apis}

        # Human-readable message from first gun
        r0 = tariff_rows[0]
        msg = (f"At {time_key}, {details.get('chargerName', charger_identity)}: "
               f"Base Rs.{r0['Base (Rs.)']} + Energy Rs.{r0['Energy (Rs.)']} "
               f"+ VAT = Rs.{r0['Total/unit (Rs.)']} per unit.")

        return {
            "action": "tariff",
            "status": "success",
            "charger_identity": charger_identity,
            "charger_name": details.get("chargerName", ""),
            "time_key": time_key,
            "tariff_data": tariff_rows,
            "matched_as": matched_as,
            "message": msg,
            "executed_apis": executed_apis
        }

    elif action == "stop":
        executed_apis.append(f"api/RemoteStop.py (remote_stop for identity='{charger_identity}')")
        res = remote_stop(charger_identity, confirmed_mobile=confirmed_mobile)
        if isinstance(res, dict):
            res["executed_apis"] = executed_apis

            if res.get("status") == "verify_mobile":
                tx_mobile = res.get("tx_mobile", "")
                is_ghost = res.get("is_ghost", False)
                buttons = []
                if not is_ghost and tx_mobile:
                    buttons.append({
                        "label": f"Confirm Stop ({tx_mobile})",
                        "action": "stop",
                        "params": {
                            "charger_identity": charger_identity,
                            "confirmed_mobile": tx_mobile
                        }
                    })
                buttons.append({
                    "label": "Force Stop",
                    "action": "stop",
                    "params": {
                        "charger_identity": charger_identity,
                        "confirmed_mobile": "0000000000"
                    }
                })
                res["buttons"] = buttons
        return res

    elif action == "start":
        # 1. Pre-Check: Availability
        executed_apis.append(f"api/chargepoints.py (details for identity='{charger_identity}')")
        details = fetch_chargepoint_details(charger_identity)
        if not details:
            return {"error": "Charger not found or offline.", "executed_apis": executed_apis}
        
        evses = details.get("evses", [])
        STARTABLE = {"Available", "Preparing"}
        available_evses = [e for e in evses if e.get("connectorStatus", e.get("status")) in STARTABLE]
        
        # Resolve connector_id: accept integer, numeric string, or physicalReference (e.g. 'Gun A')
        if connector_id is not None:
            resolved_connector_id = None
            cid_str = str(connector_id).strip()
            
            import re
            digits = re.findall(r'\d+', cid_str)
            cid_num = digits[0] if digits else None
            
            for evse in evses:
                # 1. Exact match on integer connectorId
                if str(evse.get("connectorId", "")) == cid_str:
                    resolved_connector_id = evse.get("connectorId")
                    break
                # 2. Exact match on physicalReference
                if str(evse.get("physicalReference", "")).lower() == cid_str.lower():
                    resolved_connector_id = evse.get("connectorId")
                    break
                # 3. Match extracted number to connectorId (e.g. 'Gun 1' -> 1)
                if cid_num and str(evse.get("connectorId", "")) == cid_num:
                    resolved_connector_id = evse.get("connectorId")
                    break
                    
            # 4. Fallback: just try to cast to int if all else fails
            if resolved_connector_id is None:
                try:
                    resolved_connector_id = int(cid_str)
                except ValueError:
                    pass
                    
            connector_id = resolved_connector_id

        if not available_evses:
            statuses = ", ".join(f"Gun {e.get('connectorId','?')}: {e.get('connectorStatus', e.get('status','Unknown'))}" for e in evses) if evses else "Unknown"
            return {
                "status": "failed",
                "matched_as": matched_as,
                "message": f"No connectors available to start. Current status — {statuses}.",
                "executed_apis": executed_apis
            }

        # 2. User & Wallet Check
        if not customer_mobile:
            return {"error": "Customer mobile number is required to start charging.", "executed_apis": executed_apis}

        import re as _re
        if not _re.match(r'^\d{10}$', str(customer_mobile).strip()):
            return {"error": f"Invalid customer_mobile '{customer_mobile}'. Must be a 10-digit mobile number. Do not pass OTP method choices (SMS/WhatsApp) as customer_mobile.", "executed_apis": executed_apis}
            
        user, err = get_customer_info(customer_mobile)
        if err:
            return {"error": f"User check failed: {err}", "executed_apis": executed_apis}
            
        balance, err = get_wallet_balance(user["userId"])
        if err == "no_wallet":
            return {
                "status": "insufficient_balance",
                "balance": 0,
                "message": f"Insufficient balance for {customer_mobile}. Wallet balance is Rs. 0.00. Please ask the customer to recharge their wallet before starting a session.",
                "executed_apis": executed_apis
            }
        if err == "api_error":
            return {
                "status": "wallet_unavailable",
                "message": f"Wallet service is temporarily unavailable for {customer_mobile}. This may not be a balance issue — please retry or verify the customer's wallet in the admin panel before proceeding.",
                "executed_apis": executed_apis
            }

        if balance <= 0:
            return {
                "status": "insufficient_balance",
                "balance": balance,
                "message": f"Insufficient balance (Rs. {balance}). Wallet must have a positive balance to start charging.",
                "executed_apis": executed_apis
            }

        # 3. Connector Selection (if not provided)
        if not connector_id:
            buttons = []
            for e in available_evses:
                cid = e.get("connectorId")
                buttons.append({
                    "label": f"Gun {cid}",
                    "action": "start",
                    "params": {
                        "charger_identity": charger_identity,
                        "customer_mobile": customer_mobile,
                        "connector_id": cid
                    }
                })
            return {
                "status": "need_connector",
                "buttons": buttons,
                "balance": balance,
                "matched_as": matched_as,
                "message": "Please select a connector (gun) to start.",
                "executed_apis": executed_apis
            }

        # 4. OTP Method selection — ask before sending
        if not otp_method:
            base_params = {
                "charger_identity": charger_identity,
                "customer_mobile": customer_mobile,
                "connector_id": connector_id
            }
            return {
                "status": "need_otp_method",
                "buttons": [
                    {"label": "SMS",                       "action": "start", "params": {**base_params, "otp_method": "sms"}},
                    {"label": "WhatsApp",                  "action": "start", "params": {**base_params, "otp_method": "whatsapp"}},
                    {"label": "Both (SMS + WhatsApp)",     "action": "start", "params": {**base_params, "otp_method": "both"}},
                    {"label": "Start Without Verification","action": "start", "params": {**base_params, "otp_method": "skip"}},
                ],
                "balance": balance,
                "message": f"How would you like to receive the OTP for starting the session on {charger_identity} Gun {connector_id}?",
                "executed_apis": executed_apis
            }

        # 4b. Skip OTP — start directly
        if otp_method == "skip":
            url = f"{os.getenv('BASE_TTS', 'https://tts.console.chargemod.com')}/{charger_identity}/Socket-RemoteStartTransaction"
            connection_type = details.get("chargePointConnectionProtocol", "GRIDSCAPE")
            payload = {
                "connectorId": int(connector_id),
                "connectionType": connection_type,
                "idTag": "CHARGEMODTAG",
                "isEmergency": False,
                "organizationId": ORG_ID,
                "projectId": PROJECT_ID,
                "subscriptionId": "",
                "usageType": "WALLET",
                "userId": user["userId"],
                "userMobile": user["userMobile"],
                "userName": user["userName"]
            }
            response = make_request("POST", url, json=payload)
            if response.status_code != 200:
                return {"status": "failed", "message": "Remote start API failed.", "details": response.text, "executed_apis": executed_apis}
            try:
                if response.json().get("status") == "Rejected":
                    return {"status": "failed", "message": "Charger rejected the start command. Please check that a vehicle is connected and the charger is ready.", "executed_apis": executed_apis}
            except Exception:
                pass
            return {
                "status": "success",
                "balance": balance,
                "message": f"Charging started on {charger_identity} Gun {connector_id}. The charger will begin charging once the vehicle authorizes the session.",
                "executed_apis": executed_apis
            }

        # 5. Generate and Send OTP (if user hasn't entered code yet)
        if not otp_code:
            generated_otp = random.randint(1000, 9999)
            sent = send_otp(customer_mobile, method=otp_method, otp=generated_otp)
            if not sent:
                return {"error": "Failed to send OTP.", "executed_apis": executed_apis}

            method_label = {"sms": "SMS", "whatsapp": "WhatsApp", "both": "SMS and WhatsApp"}.get(otp_method, otp_method)
            return {
                "status": "otp_sent",
                "generated_otp": generated_otp,
                "otp_method": otp_method,
                "otp_input_params": {
                    "charger_identity": charger_identity,
                    "customer_mobile": customer_mobile,
                    "connector_id": connector_id,
                    "otp_method": otp_method,
                },
                "balance": balance,
                "message": f"OTP sent to {customer_mobile} via {method_label}. Please enter the OTP.",
                "executed_apis": executed_apis
            }

        # 6. Execute Remote Start
        url = f"{os.getenv('BASE_TTS', 'https://tts.console.chargemod.com')}/{charger_identity}/Socket-RemoteStartTransaction"
        connection_type = details.get("chargePointConnectionProtocol", "GRIDSCAPE")

        payload = {
            "connectorId": int(connector_id),
            "connectionType": connection_type,
            "idTag": "CHARGEMODTAG",
            "isEmergency": False,
            "organizationId": ORG_ID,
            "projectId": PROJECT_ID,
            "subscriptionId": "",
            "usageType": "WALLET",
            "userId": user["userId"],
            "userMobile": user["userMobile"],
            "userName": user["userName"]
        }

        response = make_request("POST", url, json=payload)
        if response.status_code != 200:
            return {"status": "failed", "message": "Remote start API failed.", "details": response.text, "executed_apis": executed_apis}

        try:
            if response.json().get("status") == "Rejected":
                return {"status": "failed", "message": "Charger rejected the start command. Please check that a vehicle is connected and the charger is ready.", "executed_apis": executed_apis}
        except Exception:
            pass

        return {
            "status": "success",
            "balance": balance,
            "message": f"Charging started on {charger_identity} Gun {connector_id}. The charger will begin charging once the vehicle authorizes the session.",
            "executed_apis": executed_apis
        }

    return {"error": "Invalid action."}
