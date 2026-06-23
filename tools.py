import logging
import asyncio
import time
from datetime import datetime
import os
import sys
import json
import httpx
from typing import Optional, Dict, Any, List
from livekit import agents, api
from livekit.agents import llm
from db import (
    log_error, log_call, insert_appointment, check_slot, 
    get_next_available, get_calls_by_phone, get_appointments_by_phone,
    add_contact_memory, get_contact_memory, compress_contact_memory,
    log_transaction
)

logger = logging.getLogger("appointment-tools")

# Add api-call directory to path for EV tool imports
_api_call_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "api-call")
if _api_call_path not in sys.path:
    sys.path.append(_api_call_path)

try:
    from chargepoints import resolve_charger, fetch_chargepoint_details
    from RemoteStart import get_wallet_balance as _get_wallet_balance, remote_start_with_otp, remote_stop, get_customer_info
    from charger_action import charger_action
    _EV_TOOLS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"EV tools logic not found or incomplete: {e}")
    _EV_TOOLS_AVAILABLE = False




async def _log(msg: str, detail: str = "", level: str = "info") -> None:
    try:
        await log_error("agent", msg, detail, level)
    except Exception:
        pass


async def summarize_call_transcript(transcript: str) -> str:
    """Summarize a multilingual call transcript into a detailed English description using Gemini Flash."""
    if not transcript or not transcript.strip():
        return ""
    try:
        import google.generativeai as genai
        from db import get_setting
        
        # 1. Fetch API Key: Environment overrides database setting
        api_key = os.getenv("GOOGLE_API_KEY", "")
        if not api_key:
            api_key = await get_setting("GOOGLE_API_KEY", "")
        
        if not api_key:
            logger.warning("No GOOGLE_API_KEY found in env or database settings for transcript summary.")
            return transcript
            
        loop = asyncio.get_event_loop()
        genai.configure(api_key=api_key)
        
        # 2. Try models with robust fallbacks
        models_to_try = ["gemini-2.0-flash", "models/gemini-1.5-flash", "models/gemini-2.0-flash-exp", "gemini-1.5-flash"]
        response = None
        last_error = None
        
        prompt = (
            "You are an expert CRM and sales analyst. The following is a raw call transcript that may be in Tamil, Malayalam, Hindi, or English. "
            "Your task is to analyze the conversation and extract structured CRM notes in English. "
            "Output exactly the following Markdown structure, extracting the requested details for each section:\n\n"
            "# Summary\n"
            "(A highly descriptive, professional summary of the call)\n\n"
            "# Customer Details\n"
            "- Name: (Extracted Lead name)\n"
            "- WhatsApp Number: (Extracted WhatsApp number if any)\n"
            "- Owner Details: (Extracted Owner details if any)\n"
            "- Business Name: (Extracted Business name if any)\n\n"
            "# Interest Level\n"
            "- Customer Intent: (Summary of their intent)\n"
            "- Interest Score: (1-10)\n\n"
            "# Conversation Highlights\n"
            "- Emotion: (Customer's overall emotion)\n"
            "- Important Quotes: (Key quotes if any)\n\n"
            "# Questions\n"
            "(Questions asked by the customer)\n\n"
            "# Objections\n"
            "(Objections raised by the customer)\n\n"
            "# Customer Mood\n"
            "(Detailed customer mood analysis)\n\n"
            "# Next Steps\n"
            "- Requirements: (Specific requirements mentioned)\n"
            "- Promises Made: (Promises made by the agent)\n"
            "- Follow-up Actions: (Specific follow-up tasks)\n"
            "- Callback Schedule: (When to call back)\n"
            "- Sales Opportunity: (Potential opportunity size/details)\n\n"
            "# Agent Notes\n"
            "(Any other critical agent notes)\n\n"
            "Do NOT output the raw transcript. Output ONLY your structured markdown summary.\n\n"
            "### Raw Call Transcript:\n"
            f"{transcript}"
        )
        
        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                # Call generate_content in executor
                response = await loop.run_in_executor(None, lambda m=model, p=prompt: m.generate_content(p))
                if response and response.text:
                    translated = response.text.strip()
                    if translated:
                        logger.info(f"Successfully generated structured call notes using model: {model_name}")
                        return translated
            except Exception as e:
                last_error = e
                logger.warning(f"Failed to generate notes with model {model_name}: {e}")
                continue
                
        if last_error:
            logger.error(f"All model summarizations failed. Last error: {last_error}")
            
    except Exception as exc:
        logger.error(f"Transcript summarization wrapper failed: {exc}", exc_info=True)
    return transcript


# ANSI Colors for logging
C_BLUE = "\033[94m"
C_CYAN = "\033[96m"
C_GREEN = "\033[92m"
C_YELLOW = "\033[93m"
C_RED = "\033[91m"
C_BOLD = "\033[1m"
C_RESET = "\033[0m"

class MCPClient:
    """A minimal MCP client for SSE transport."""
    def __init__(self, endpoint: str, username: Optional[str] = None, password: Optional[str] = None):
        self.endpoint = endpoint
        self.auth = httpx.BasicAuth(username, password) if username else None
        self.session_url: Optional[str] = None
        self.client = httpx.AsyncClient(timeout=30.0)

    async def connect(self):
        """Initial SSE handshake to get the session URL."""
        if self.session_url:
            return
        
        print(f"{C_BLUE}[MCP] Connecting to {self.endpoint}...{C_RESET}")
        # Note: In a real SSE client we would listen for the 'endpoint' event.
        # For simplicity, we assume the first response or a well-known path.
        # Most MCP servers provide the session URL in the first event.
        try:
            async with self.client.stream("GET", self.endpoint, auth=self.auth) as response:
                async for line in response.aiter_lines():
                    if line.startswith("event: endpoint"):
                        continue
                    if line.startswith("data: "):
                        url = line[6:].strip()
                        if url.startswith("/"):
                            # Handle relative URLs
                            base = str(response.url).rstrip("/")
                            self.session_url = base + url
                        else:
                            self.session_url = url
                        print(f"{C_GREEN}[MCP] Session established: {self.session_url}{C_RESET}")
                        break
        except Exception as e:
            print(f"{C_RED}[MCP] Connection failed: {e}{C_RESET}")
            # Fallback to standard messages endpoint if handshake fails but we want to try
            self.session_url = self.endpoint.replace("/sse", "/messages")

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool via the session URL."""
        if not self.session_url:
            await self.connect()
        
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": name,
                "arguments": arguments
            },
            "id": int(time.time())
        }
        
        print(f"\n{C_CYAN}{C_BOLD}>>> MCP REQUEST [{name}]{C_RESET}")
        print(f"{C_CYAN}{json.dumps(arguments, indent=2)}{C_RESET}")
        
        try:
            resp = await self.client.post(self.session_url, json=payload, auth=self.auth)
            result = resp.json()
            
            print(f"{C_GREEN}{C_BOLD}<<< MCP RESPONSE [{name}] - {resp.status_code}{C_RESET}")
            print(f"{C_GREEN}{json.dumps(result, indent=2)}{C_RESET}")
            
            if "result" in result:
                content = result["result"].get("content", [])
                if content and content[0].get("type") == "text":
                    # The ChargeMOD server returns JSON inside the text content
                    try:
                        return json.loads(content[0]["text"])
                    except:
                        return {"status": "error", "message": content[0]["text"]}
            
            return result.get("error", {"status": "error", "message": "Unknown error"})
            
        except Exception as e:
            print(f"{C_RED}!!! MCP ERROR: {e}{C_RESET}")
            return {"status": "error", "message": str(e)}

class AppointmentTools(llm.ToolContext):
    """All function tools available to the appointment-booking agent."""

    def __init__(self, ctx: agents.JobContext, phone_number: Optional[str] = None, lead_name: Optional[str] = None, business_name: Optional[str] = None, industry: Optional[str] = None, place: Optional[str] = None, agent_profile_id: Optional[str] = None, campaign_id: Optional[str] = None):
        self.ctx = ctx
        self.phone_number = phone_number
        self.lead_name = lead_name
        self.business_name = business_name
        self.industry = industry
        self.place = place
        self.whatsapp_number: Optional[str] = None
        self.agent_profile_id = agent_profile_id
        self.campaign_id = campaign_id
        self._call_start_time = time.time()
        self._sip_domain = os.getenv("VOBIZ_SIP_DOMAIN", "")
        self.recording_url: Optional[str] = None
        self._call_logged = False
        self._kb_cache: Optional[str] = None
        self._transcript_lines: list = []  # Live transcript accumulator (filled by agent.py session hooks)
        self.mcp = MCPClient(
            endpoint="https://mcpserver.cs-api.chargemod.com/sse",
            username="myuser",
            password="cmod2019"
        )
        super().__init__(tools=[])

    def build_tool_list(self, enabled: list) -> list:
        """Return tool methods filtered by the enabled list. Force includes remote tools."""
        all_methods = [
            self.end_call,
            self.transfer_to_human, self.send_sms_confirmation, self.lookup_contact,
            self.remember_details, self.email_booking_details,
            self.check_charger_status, self.check_wallet_balance,
            self.start_charging_session, self.stop_charging_session,
            self.troubleshoot_charger,
            self.get_charging_session_details,
            self.check_calcom_availability,
            self.book_calcom,
            self.collect_whatsapp_number,
            self.query_knowledge_base,
        ]
        force_include = [
            "start_charging_session", "stop_charging_session", 
            "check_wallet_balance", "check_charger_status",
            "troubleshoot_charger", "get_charging_session_details",
            "check_calcom_availability", "book_calcom",
            "collect_whatsapp_number", "query_knowledge_base"
        ]
        if not enabled:
            return all_methods
        name_map = {m.__name__: m for m in all_methods}
        active = [name_map[n] for n in enabled if n in name_map]
        for f in force_include:
            if f in name_map and name_map[f] not in active:
                active.append(name_map[f])
        return active

    async def _resolve_charger_from_session(self, charger_identifier: Optional[str] = None) -> Optional[dict]:
        """
        Attempts to find a charger to troubleshoot:
        1. If charger_identifier is provided and not empty, use it directly.
        2. If empty/None, query live active transactions for self.phone_number.
        3. If no active transaction, query local Supabase database 'transactions' table for self.phone_number.
        """
        loop = asyncio.get_event_loop()
        
        # 1. If identifier is provided, resolve it directly
        if charger_identifier and str(charger_identifier).strip() and str(charger_identifier).strip().lower() != "none":
            resolved = await loop.run_in_executor(None, resolve_charger, charger_identifier)
            if resolved["status"] == "resolved":
                return resolved["charger"]
            return None

        # If no phone number, we can't query sessions
        phone = self.phone_number
        if not phone:
            return None
            
        # Clean phone number (remove +91, spaces, etc.)
        clean_phone = str(phone).strip().replace(" ", "").replace("-", "")
        if clean_phone.startswith("+91"):
            clean_phone = clean_phone[3:]
        elif clean_phone.startswith("91") and len(clean_phone) > 10:
            clean_phone = clean_phone[2:]
            
        print(f"[*] Attempting to auto-locate charger for phone: {clean_phone}...")

        from datetime import datetime, timedelta, timezone
        # 2. Check live active transactions
        try:
            base_url = os.getenv("BASE_LS", "https://ls.console.chargemod.com")
            from RemoteStop import ORG_ID, PROJECT_ID, make_request
            now = datetime.now(timezone.utc)
            start_date = (now - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            end_date = now.strftime("%Y-%m-%dT%H:%M:%S.000Z")

            payload = {
                "organizationId": ORG_ID,
                "projectId": PROJECT_ID,
                "perPageCount": 50,
                "pageNumber": 1,
                "filterDate": {"startDate": start_date, "endDate": end_date},
                "searchValue": {"searchKey": ""},
                "allowedLocations": [],
                "transactionType": None,
                "sortType": -1,
                "solarType": ""
            }
            
            resp = await loop.run_in_executor(
                None, 
                lambda: make_request("POST", f"{base_url}/pwr/charger/get-pwr-active-transaction", json=payload)
            )
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("result", [])
                for tx in results:
                    tx_mobile = str(tx.get("userMobile") or tx.get("mobile", "")).strip()
                    if clean_phone in tx_mobile or tx_mobile in clean_phone:
                        # Found active transaction!
                        charger_details = tx.get("chargerDetails", {})
                        identity = tx.get("identity") or tx.get("chargerId") or charger_details.get("identity")
                        if identity:
                            print(f"[+] Found live active transaction on charger {identity} for user")
                            return {
                                "identity": identity,
                                "name": tx.get("chargerName") or charger_details.get("chargerName") or identity
                            }
        except Exception as e:
            print(f"[-] Live active transaction search failed: {e}")

        # 3. Fallback: Check local Supabase transactions history
        try:
            from db import _adb
            db_client = await _adb()
            # Query transactions matching caller's phone number
            res = await db_client.table("transactions").select("*").or_(f"phone.eq.{clean_phone},phone.eq.+91{clean_phone}").order("created_at", desc=True).limit(1).execute()
            if res.data and len(res.data) > 0:
                last_tx = res.data[0]
                identity = last_tx.get("charger_identity")
                name = last_tx.get("charger_name") or identity
                if identity:
                    print(f"[+] Found previous transaction in Supabase on charger {identity} ({name})")
                    return {
                        "identity": identity,
                        "name": name
                    }
        except Exception as e:
            print(f"[-] Supabase transactions fallback search failed: {e}")

        return None

    @llm.function_tool
    async def check_charger_status(self, charger_identifier: Optional[str] = None) -> str:
        """
        Check live status of an EV charger. 
        
        charger_identifier: The Name, ID, or location of the charger (e.g. CMOD123). If not provided or empty, it will automatically look up the user's active or previous charging session using their phone number.
        """
        print(f"[*] TOOL CALL: check_charger_status('{charger_identifier}')")
        if not _EV_TOOLS_AVAILABLE:
            return "EV charging features are currently offline."
        
        try:
            loop = asyncio.get_event_loop()
            
            # Auto-resolve from session if not provided
            charger_info = await self._resolve_charger_from_session(charger_identifier)
            if not charger_info:
                return "I couldn't locate an active or previous charging session associated with your phone number. Could you please tell me the name or ID of the charger you are using?"
            
            identity = charger_info["identity"]
            name = charger_info.get("name") or identity
            
            details = await loop.run_in_executor(None, fetch_chargepoint_details, identity)
            if not details:
                return f"I found your charger '{name}' but couldn't retrieve its live status. Please try again in a moment."
            
            evses = details.get("evses", [])
            status_summary = []
            needs_troubleshooting = False
            for evse in evses:
                status = evse.get("connectorStatus", evse.get("status", "Unknown"))
                conn_id = evse.get("connectorId", "?")
                status_summary.append(f"Connector {conn_id} is {status}")
                if status in ("SuspendedEVSE", "Faulted", "Unavailable", "SuspendedEV") or evse.get("connectorErrCode") not in (None, "NoError", "1000", 1000):
                    needs_troubleshooting = True
            
            result = f"Status for {name}: " + ". ".join(status_summary)

            is_charging = any(evse.get("connectorStatus", evse.get("status")) in ("Charging", "Preparing") for evse in evses)
            
            if needs_troubleshooting or is_charging:
                trigger_reason = "Charging metrics" if is_charging else "Status check diagnosis"
                print(f"[*] Triggering live log retrieval for {name} ({trigger_reason})...")
                try:
                    from data.troubleshoot import troubleshoot
                    diag = await loop.run_in_executor(
                        None,
                        lambda: troubleshoot(
                            charger_name=identity,
                            charger_identity=identity,
                            issue_summary=trigger_reason,
                            phone=self.phone_number
                        )
                    )
                    if diag and diag.get("status") == "success":
                        snapshot = diag.get("latest_snapshot", {})
                        meter = snapshot.get("meter", {})
                        
                        # Format meter values if available
                        if meter:
                            meter_parts = []
                            
                            # Voltage
                            v = meter.get("voltage")
                            if v is not None:
                                try:
                                    v_val = float(v)
                                    meter_parts.append(f"voltage is {v_val:.1f} V")
                                except ValueError:
                                    pass
                            
                            # Current
                            c = meter.get("current")
                            if c is not None:
                                try:
                                    c_val = float(c)
                                    meter_parts.append(f"current is {c_val:.1f} A")
                                except ValueError:
                                    pass
                                    
                            # Power
                            p = meter.get("power")
                            if p is not None:
                                try:
                                    p_val = float(p)
                                    if p_val > 100:  # Value in Watts
                                        meter_parts.append(f"power is {p_val / 1000.0:.2f} kW")
                                    else:  # Value in kW
                                        meter_parts.append(f"power is {p_val:.2f} kW")
                                except ValueError:
                                    pass
                                    
                            # SoC
                            soc = meter.get("soc")
                            if soc is not None:
                                try:
                                    soc_val = float(soc)
                                    meter_parts.append(f"State of Charge is {soc_val:.0f}%")
                                except ValueError:
                                    pass
                                    
                            # Energy
                            e = meter.get("energy")
                            if e is not None:
                                try:
                                    e_val = float(e)
                                    meter_parts.append(f"energy consumed is {e_val:.2f} kWh")
                                except ValueError:
                                    pass
                            
                            if meter_parts:
                                result += f". Live charging metrics show: " + ", ".join(meter_parts) + "."
                        
                        if needs_troubleshooting:
                            analysis = diag.get("analysis", {})
                            summary = analysis.get("summary")
                            interpretation = analysis.get("interpretation")
                            error_details = diag.get("error_code_details")
                            
                            diag_msg = f"Automated Log Diagnosis: {summary}. Explanation: {interpretation}"
                            if error_details:
                                if isinstance(error_details, list) and len(error_details) > 0:
                                    err_info = error_details[0]
                                else:
                                    err_info = error_details
                                if isinstance(err_info, dict):
                                    err_code = err_info.get("code") or err_info.get("error_code")
                                    err_desc = err_info.get("description") or err_info.get("name")
                                    err_res = err_info.get("resolution") or err_info.get("remedy")
                                    if err_code and err_code != "NoError":
                                        diag_msg += f" (Active error code: {err_code} - {err_desc}."
                                        if err_res:
                                            diag_msg += f" Recommended solution: {err_res})"
                                        else:
                                            diag_msg += ")"
                            
                            next_steps = analysis.get("next_steps", [])
                            if next_steps:
                                diag_msg += " Recommended steps: " + ", ".join(next_steps)
                            
                            result += f". {diag_msg}"
                except Exception as ex:
                    print(f"[-] Automated diagnosis failed: {ex}")
            
            print(f"[*] Tool result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in check_charger_status: {e}")
            return "I encountered a technical error while checking the charger status."

    @llm.function_tool
    async def check_wallet_balance(self, customer_mobile: Optional[str] = None) -> str:
        """Check user's wallet balance. customer_mobile: 10-digit number."""
        phone = customer_mobile or self.phone_number
        print(f"[*] TOOL CALL: check_wallet_balance(phone={phone})")
        
        if not _EV_TOOLS_AVAILABLE:
            return "Wallet features are offline."
        
        if not phone:
            return "I need your phone number to check your balance."
        
        try:
            loop = asyncio.get_event_loop()
            customer, err = await loop.run_in_executor(None, get_customer_info, phone)
            if err or not customer:
                return f"I couldn't find a chargeMOD account for {phone}."
            
            balance, err = await loop.run_in_executor(None, _get_wallet_balance, customer["userId"])
            if err:
                return "I couldn't retrieve your balance right now."
            
            return f"Your current wallet balance is Rs. {balance}."
        except Exception as e:
            logger.error(f"Error in check_wallet_balance: {e}")
            return "Error checking balance."

    # Deprecated start_charging and stop_charging removed.



    @llm.function_tool
    async def end_call(self, outcome: str, lead_temperature: str, summary: str, reason: str = "") -> str:
        """End call. outcome: 'booked'|'not_interested'|'wrong_number'|'no_answer', lead_temperature: 'HOT'|'WARM'|'COLD', summary: details."""
        duration = int(time.time() - self._call_start_time)
        # Use live-captured transcript lines (works with Gemini Realtime which doesn't populate chat_ctx)
        transcript = "\n".join(self._transcript_lines) if self._transcript_lines else ""
        # Generate a descriptive summary of the call
        if transcript:
            transcript_summary = await summarize_call_transcript(transcript)
        else:
            transcript_summary = ""
        
        notes = f"[{lead_temperature.upper()}] {summary}"
        if transcript_summary:
            notes += f"\n\nCall Summary:\n{transcript_summary}"
        try:
            await log_call(
                phone_number=self.phone_number or "unknown",
                lead_name=self.lead_name, outcome=outcome, reason=reason,
                duration_seconds=duration, recording_url=self.recording_url,
                notes=notes, campaign_id=self.campaign_id,
                business_name=self.business_name, industry=self.industry, place=self.place
            )
            self._call_logged = True
        except Exception as exc:
            logger.error("Failed to log call: %s", exc)
        try:
            # Explicitly find and remove the SIP participant to force the phone to hang up
            for p in self.ctx.room.remote_participants.values():
                if "sip" in p.identity.lower() or p.identity.startswith("sip_"):
                    try:
                        from livekit import api
                        await self.ctx.api.room.remove_participant(
                            api.RoomParticipantIdentity(
                                room=self.ctx.room.name,
                                identity=p.identity
                            )
                        )
                        logger.info(f"Forcibly hung up SIP participant: {p.identity}")
                    except Exception as _re:
                        logger.warning(f"Failed to remove participant via API: {_re}")

            await self.ctx.room.disconnect()
        except Exception:
            pass
        return "Call ended."

    @llm.function_tool
    async def transfer_to_human(self, reason: str) -> str:
        """Transfer call to human. reason: why."""
        destination = os.getenv("DEFAULT_TRANSFER_NUMBER", "")
        if not destination:
            return "Transfer unavailable: no fallback number configured."
        if "@" not in destination:
            clean = destination.replace("tel:", "").replace("sip:", "")
            destination = f"sip:{clean}@{self._sip_domain}" if self._sip_domain else f"tel:{clean}"
        elif not destination.startswith("sip:"):
            destination = f"sip:{destination}"

        participant_identity = f"sip_{self.phone_number}" if self.phone_number else None
        if not participant_identity:
            for p in self.ctx.room.remote_participants.values():
                participant_identity = p.identity
                break
        if not participant_identity:
            return "Transfer failed: could not identify caller."
        try:
            try:
                charger_info = await self._resolve_charger_from_session()
                charger_id = charger_info["identity"] if charger_info else "General"
                charger_name = charger_info.get("name") or charger_id
                asyncio.create_task(log_transaction(
                    charger_identity=charger_id,
                    charger_name=charger_name,
                    user_name=self.lead_name or "Customer",
                    phone=self.phone_number or "unknown",
                    start_time=datetime.now().isoformat(),
                    energy_kwh="0",
                    amount="0",
                    call_reason=reason or "Unresolved issue",
                    rectification_used="Transferred to human agent",
                    status="transferred_to_human"
                ))
            except Exception as dbe:
                logger.warning(f"Failed to log transfer transaction: {dbe}")

            await self.ctx.api.sip.transfer_sip_participant(
                api.TransferSIPParticipantRequest(
                    room_name=self.ctx.room.name,
                    participant_identity=participant_identity,
                    transfer_to=destination,
                    play_dialtone=False,
                )
            )
            return "Transferring you to a human agent now. Please hold."
        except Exception as exc:
            return "Transfer failed. Please call us back directly."

    @llm.function_tool
    async def send_sms_confirmation(self, phone: str, message: str) -> str:
        """
        Send SMS confirmation after a successful booking. Skips silently if Twilio not configured.
        phone: lead's phone | message: text to send
        """
        sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        token = os.getenv("TWILIO_AUTH_TOKEN", "")
        from_num = os.getenv("TWILIO_FROM_NUMBER", "")
        if not (sid and token and from_num):
            return "SMS skipped: Twilio not configured."
        try:
            from twilio.rest import Client
            loop = asyncio.get_event_loop()
            client = Client(sid, token)
            await loop.run_in_executor(None, lambda: client.messages.create(body=message, from_=from_num, to=phone))
            return f"SMS sent to {phone}."
        except Exception as exc:
            return "SMS delivery failed, but booking is confirmed."

    @llm.function_tool
    async def lookup_contact(self, phone: str) -> str:
        """Get history/memories for phone number."""
        try:
            calls = await get_calls_by_phone(phone)
            appointments = await get_appointments_by_phone(phone)
            memories = await get_contact_memory(phone)
            if not calls and not appointments and not memories:
                return f"No history for {phone}. First-time contact."
            lines = [f"Contact history for {phone}:"]
            if memories:
                lines.append(f"\nREMEMBERED ({len(memories)} notes):")
                for m in memories[:10]:
                    lines.append(f"  • {m['insight']}")
            if calls:
                lines.append(f"\nCALL HISTORY ({len(calls)} calls):")
                for c in calls[:5]:
                    ts = (c.get("timestamp") or "")[:16]
                    lines.append(f"  • {ts} — {c.get('outcome','?')}: {c.get('reason','')}")
            if appointments:
                lines.append(f"\nAPPOINTMENTS ({len(appointments)}):")
                for a in appointments[:3]:
                    lines.append(f"  • {a.get('date')} {a.get('time')} — {a.get('service')} [{a.get('status')}]")
            return "\n".join(lines)
        except Exception as exc:
            return "Unable to retrieve contact history."

    @llm.function_tool
    async def remember_details(self, insight: str) -> str:
        """Store key insight about lead for future calls."""
        if not self.phone_number:
            return "Cannot remember — no phone number for this call."
        try:
            await add_contact_memory(self.phone_number, insight)
            memories = await get_contact_memory(self.phone_number)
            if len(memories) >= 5:
                asyncio.create_task(self._compress_memories())
            return f"Remembered: {insight}"
        except Exception:
            return "Could not save detail."

    async def _compress_memories(self) -> None:
        try:
            memories = await get_contact_memory(self.phone_number)
            if len(memories) < 5:
                return
            import google.generativeai as genai
            api_key = os.getenv("GOOGLE_API_KEY", "")
            if not api_key:
                return
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            bullet_list = "\n".join(f"- {m['insight']}" for m in memories)
            prompt = f"Compress these notes about a sales contact into 3-5 concise bullets. Keep all key facts.\n\n{bullet_list}"
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: model.generate_content(prompt))
            if response.text.strip():
                await compress_contact_memory(self.phone_number, response.text.strip())
        except Exception as exc:
            logger.warning("Memory compression failed: %s", exc)

    @llm.function_tool
    async def email_booking_details(self, name: str, phone: str, preferred_date: str, service_type: str) -> str:
        """
        Send booking details to admin@swaram.io and log the appointment.
        name: Full name
        phone: Phone number
        preferred_date: Preferred date and time (e.g. 2025-06-15 10:00 AM)
        service_type: What they want to book
        """
        if name and name.strip() and name.lower() not in ["there", "unknown"]:
            self.lead_name = name.strip()
        if phone and phone.strip() and phone.lower() not in ["unknown", "none", "—"]:
            self.phone_number = phone.strip()
            
        name = self.lead_name or name or "Swaram Lead"
        phone = self.phone_number or phone or "unknown"
        
        # Save locally so it appears in appointments tab
        try:
            date_part = preferred_date.split()[0] if " " in preferred_date else preferred_date
            time_part = preferred_date.split()[1] if " " in preferred_date else "TBD"
            booking_id = await insert_appointment(
                name, phone, date_part, time_part, service_type,
                business_name=self.business_name, industry=self.industry, place=self.place
            )
        except Exception:
            pass
            
        print(f"[*] Booking details sent to admin@swaram.io for {name} regarding {service_type} on {preferred_date}")
        return f"Success! Details have been emailed to admin@swaram.io. Our team will contact the customer to confirm."

    @llm.function_tool
    async def check_calcom_availability(self, date_str: str) -> str:
        """Check available booking slots for a given date. date_str format: YYYY-MM-DD."""
        print(f"[*] TOOL CALL: check_calcom_availability('{date_str}')")
        api_key = os.getenv("CALCOM_API_KEY")
        username = os.getenv("CALCOM_USERNAME")
        event_type_id = os.getenv("CALCOM_EVENT_TYPE_ID")
        timezone = os.getenv("CALCOM_TIMEZONE", "Asia/Kolkata")
        
        if not api_key:
            return "Cal.com calendar integration is not fully configured in settings."
            
        headers = {
            "Authorization": f"Bearer {api_key}",
            "cal-api-version": "2024-09-04",
            "Content-Type": "application/json"
        }
        
        start_time = f"{date_str}T00:00:00.000Z"
        end_time = f"{date_str}T23:59:59.000Z"
        
        params = {
            "start": start_time,
            "end": end_time,
            "timeZone": timezone
        }
        if event_type_id:
            try:
                params["eventTypeId"] = int(event_type_id)
            except ValueError:
                params["eventTypeId"] = event_type_id
        elif username:
            params["username"] = username
        else:
            return "Neither eventTypeId nor username is configured in settings."
        
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.get("https://api.cal.com/v2/slots", headers=headers, params=params, timeout=10.0)
                print(f"[*] Cal.com slots response: status={resp.status_code}")
                if resp.status_code != 200:
                    print(f"[-] Cal.com slots error: {resp.text[:300]}")
                    return f"Failed to fetch availability from Cal.com. Status code: {resp.status_code}"
                
                data = resp.json()
                slots_data = data.get("data", {})
                
                # Cal.com v2 2024-09-04 returns dates directly under "data":
                #   {"data": {"2026-06-16": [{"start": "..."}, ...]}}
                # Older versions may nest under "data.slots":
                #   {"data": {"slots": {"2026-06-16": [...]}}}
                slots_dict = slots_data.get("slots", None)
                if slots_dict is None:
                    # Dates are directly under data — filter out non-list values
                    slots_dict = {k: v for k, v in slots_data.items() if isinstance(v, list)}
                
                slots_list = []
                if isinstance(slots_dict, dict):
                    for d_key, s_items in slots_dict.items():
                        if isinstance(s_items, list):
                            slots_list.extend(s_items)
                elif isinstance(slots_dict, list):
                    slots_list = slots_dict
                
                if not slots_list:
                    return f"There are no available slots on {date_str}."
                
                available_times = []
                for slot in slots_list:
                    slot_time = slot.get("time") or slot.get("start")
                    if slot_time:
                        try:
                            t_part = slot_time.split("T")[1][:5]
                            available_times.append(t_part)
                        except Exception:
                            available_times.append(slot_time)
                
                available_times = sorted(list(set(available_times)))
                times_str = ", ".join(available_times)
                return f"Available slots on {date_str} are: {times_str}."
        except Exception as e:
            return f"Error checking Cal.com availability: {str(e)}"

    @llm.function_tool
    async def book_calcom(
        self, 
        date_str: str, 
        time_str: str, 
        name: Optional[str] = None, 
        phone: Optional[str] = None, 
        email: Optional[str] = None
    ) -> str:
        """
        Book an appointment on Cal.com. 
        date_str format: YYYY-MM-DD, time_str format: HH:MM.
        name: The customer's full name.
        phone: The customer's 10-digit phone number.
        email: The customer's email address.
        """
        print(f"[*] TOOL CALL: book_calcom('{date_str}', '{time_str}', name={name}, phone={phone}, email={email})")
        
        if name and name.strip() and name.lower() not in ["there", "unknown"]:
            self.lead_name = name.strip()
        if phone and phone.strip() and phone.lower() not in ["unknown", "none", "—"]:
            self.phone_number = phone.strip()
            
        api_key = os.getenv("CALCOM_API_KEY")
        event_type_id_str = os.getenv("CALCOM_EVENT_TYPE_ID")
        timezone = os.getenv("CALCOM_TIMEZONE", "Asia/Kolkata")
        
        if not api_key or not event_type_id_str:
            return "Cal.com is not fully configured in settings."
            
        try:
            event_type_id = int(event_type_id_str)
        except ValueError:
            return f"Invalid event type ID: {event_type_id_str}"
            
        name = self.lead_name or name or "Swaram Lead"
        phone = self.phone_number or phone or "unknown"
        email = email or f"{phone.replace('+', '')}@swaram.ai" if phone else "lead@swaram.ai"
        
        start_iso = f"{date_str}T{time_str}:00Z"
        
        payload = {
            "eventTypeId": event_type_id,
            "start": start_iso,
            "attendee": {
                "name": name,
                "email": email,
                "timeZone": timezone,
                "phoneNumber": phone,
                "language": "en"
            }
        }
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "cal-api-version": "2024-08-13",
            "Content-Type": "application/json"
        }
        
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                print(f"[*] Cal.com booking payload: {json.dumps(payload)}")
                resp = await client.post("https://api.cal.com/v2/bookings", headers=headers, json=payload, timeout=15.0)
                print(f"[*] Cal.com booking response: status={resp.status_code}, body={resp.text[:300]}")
                
                if resp.status_code != 201 and resp.status_code != 200:
                    wrapped_payload = {"booking": payload}
                    resp_wrapped = await client.post("https://api.cal.com/v2/bookings", headers=headers, json=wrapped_payload, timeout=15.0)
                    if resp_wrapped.status_code == 201 or resp_wrapped.status_code == 200:
                        resp = resp_wrapped
                
                if resp.status_code in [200, 201]:
                    data = resp.json()
                    booking_data = data.get("data", {}) or data
                    booking_uid = booking_data.get("uid") or booking_data.get("id")
                    
                    try:
                        from db import insert_appointment
                        await insert_appointment(
                            name=name,
                            phone=phone,
                            date=date_str,
                            time=time_str,
                            service=f"Cal.com booking {booking_uid}",
                            whatsapp_number=self.whatsapp_number,
                            business_name=self.business_name,
                            industry=self.industry,
                            place=self.place
                        )
                    except Exception as db_err:
                        print(f"[-] Failed to insert appointment locally: {db_err}")
                        
                    return f"Successfully booked the appointment for {date_str} at {time_str}."
                else:
                    return f"Failed to book appointment on Cal.com. Response: {resp.text}"
        except Exception as e:
            return f"Error booking appointment on Cal.com: {str(e)}"

    @llm.function_tool
    async def collect_whatsapp_number(self, whatsapp_number: str) -> str:
        """
        Store the customer's WhatsApp number for follow-up messages.
        Use this whenever the customer shares their WhatsApp number during the call.
        whatsapp_number: The WhatsApp phone number (e.g. +919876543210)
        """
        print(f"[*] TOOL CALL: collect_whatsapp_number('{whatsapp_number}')")
        cleaned = whatsapp_number.strip().replace(" ", "").replace("-", "")
        if not cleaned.startswith("+"):
            if len(cleaned) == 10:
                cleaned = "+91" + cleaned
            else:
                cleaned = "+" + cleaned
        self.whatsapp_number = cleaned
        return f"WhatsApp number {cleaned} saved. I'll include it in the booking details."

    @llm.function_tool
    async def query_knowledge_base(self, question: str) -> str:
        """
        Search the agent's knowledge base documents for relevant information.
        Use this when you need to answer specific questions about the company's services,
        pricing, capabilities, portfolio, or any other business details that the customer asks about.
        question: The question or topic to search for in the knowledge base.
        """
        print(f"[*] TOOL CALL: query_knowledge_base('{question}')")
        
        if not self.agent_profile_id:
            return "No knowledge base configured for this agent profile."
        
        # Load and cache KB content
        if self._kb_cache is None:
            self._kb_cache = ""
            doc_dir = os.path.join("/data" if os.path.exists("/data") else "data", "agent_docs", self.agent_profile_id)
            
            if os.path.exists(doc_dir):
                # Read all text files (including extracted PDF text)
                for f in sorted(os.listdir(doc_dir)):
                    filepath = os.path.join(doc_dir, f)
                    if f == "links.json":
                        continue
                    if os.path.isfile(filepath) and (f.endswith(".txt") or f.endswith(".md")):
                        try:
                            with open(filepath, "r", encoding="utf-8", errors="ignore") as fh:
                                content = fh.read()
                                self._kb_cache += f"\n--- Document: {f.replace('.txt', '')} ---\n{content}\n"
                        except Exception as e:
                            print(f"[-] Error reading KB file {f}: {e}")
                
                # Read links
                links_file = os.path.join(doc_dir, "links.json")
                if os.path.exists(links_file):
                    try:
                        import json as _json
                        with open(links_file, "r") as lf:
                            links = _json.load(lf)
                            if links:
                                self._kb_cache += "\n--- Reference Links ---\n"
                                for link in links:
                                    self._kb_cache += f"- {link.get('description', 'Link')}: {link.get('url', '')}\n"
                    except Exception:
                        pass
        
        if not self._kb_cache:
            return "Knowledge base is empty. No documents have been uploaded for this agent profile."
        
        # Return the relevant KB content (truncated to a reasonable size for the model)
        kb_text = self._kb_cache[:8000]
        return f"Here is the relevant knowledge base content to help answer about '{question}':\n\n{kb_text}"

    @llm.function_tool
    async def start_charging_session(
        self, 
        charger_identifier: str, 
        customer_mobile: Optional[str] = None,
        connector_id: Optional[str] = None,
        otp_method: Optional[str] = None,
        otp_code: Optional[str] = None
    ) -> str:
        """
        Interactive tool to start a charging session. Handles wallet check, connector selection, and OTP.
        
        charger_identifier: Name or ID of the charger (e.g. 'PTC Arcade' or 'CMOD123')
        customer_mobile: 10-digit mobile. Defaults to caller's number.
        connector_id: Connector (Gun) ID if known.
        otp_method: 'sms' or 'whatsapp' for receiving the code.
        otp_code: 4-digit code provided by the user.
        """
        phone = customer_mobile or self.phone_number
        print(f"[*] TOOL CALL: start_charging_session('{charger_identifier}', '{phone}')")
        
        if not _EV_TOOLS_AVAILABLE:
            return "EV charging features are currently offline."

        if not phone:
            return "I need a phone number to start the charging session. Could you please provide yours?"

        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, 
                charger_action, 
                "start", 
                charger_identifier, 
                phone, 
                connector_id, 
                None, 
                otp_method, 
                otp_code
            )
            
            status = result.get("status")
            message = result.get("message", "")
            
            if status == "success":
                tx_details = result.get("tx_details", {}) or {}
                asyncio.create_task(log_transaction(
                    charger_identity=charger_identifier,
                    charger_name=tx_details.get("charger_name") or charger_identifier,
                    user_name=tx_details.get("user") or self.lead_name or "Customer",
                    phone=tx_details.get("mobile") or phone,
                    start_time=tx_details.get("start_time") or datetime.now().isoformat(),
                    energy_kwh="0",
                    amount="0",
                    call_reason="Start charging session",
                    rectification_used="Remote start initiated",
                    status="success"
                ))
                return f"Success! {message}"
            elif status == "multiple":
                options = ", ".join([o["label"] for o in result.get("options", [])])
                return f"I found multiple chargers. Did you mean: {options}?"
            elif status == "need_connector":
                buttons = result.get("buttons", [])
                opts = ", ".join([f"{b.get('label')} (ID: {b.get('params', {}).get('connector_id')})" for b in buttons])
                return f"STATUS: need_connector. MESSAGE: {message}. OPTIONS: {opts}. Please ask the user which connector they want to use."
            elif status == "need_otp_method":
                return f"STATUS: need_otp_method. MESSAGE: {message}. Please ask the user if they prefer SMS or WhatsApp."
            elif status == "otp_sent":
                return f"STATUS: otp_sent. MESSAGE: {message}. Please ask the user for the 4-digit OTP code."
            else:
                return f"Error: {message}"
        except Exception as e:
            logger.error(f"Error in start_charging_session: {e}")
            return f"I encountered an error: {str(e)}"

    @llm.function_tool
    async def stop_charging_session(
        self, 
        charger_identifier: str,
        confirmed_mobile: Optional[str] = None
    ) -> str:
        """
        Interactive tool to stop an active charging session.
        
        charger_identifier: Name or ID of the charger.
        confirmed_mobile: 10-digit mobile of the person who started the session. Defaults to caller's number.
        """
        phone = confirmed_mobile or self.phone_number
        print(f"[*] TOOL CALL: stop_charging_session('{charger_identifier}', '{phone}')")
        
        if not _EV_TOOLS_AVAILABLE:
            return "EV charging features are currently offline."

        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, 
                charger_action, 
                "stop", 
                charger_identifier, 
                None, 
                None, 
                None, 
                None, 
                None, 
                None, 
                phone
            )
            
            status = result.get("status")
            message = result.get("message", "")
            
            if status == "success":
                tx_details = result.get("tx_details", {})
                if tx_details:
                    asyncio.create_task(log_transaction(
                        charger_identity=charger_identifier,
                        charger_name=tx_details.get("charger_name", charger_identifier),
                        user_name=tx_details.get("user", "Unknown"),
                        phone=tx_details.get("mobile", phone),
                        start_time=tx_details.get("start_time", ""),
                        energy_kwh=tx_details.get("energy_kwh", "0"),
                        amount=tx_details.get("amount", "0"),
                        call_reason="Stop charging session",
                        rectification_used="Remote stop initiated",
                        status="success"
                    ))
                return f"Success! {message}"
            elif status == "verify_mobile":
                return f"STATUS: verify_mobile. MESSAGE: {message}. Please ask the user to confirm their mobile number before proceeding."
            elif status == "no_active_session":
                return f"I couldn't find an active session on that charger. {message}"
            elif status == "mobile_mismatch":
                return f"STATUS: mobile_mismatch. MESSAGE: {message}. Please inform the user."
            elif status == "unavailable":
                return f"STATUS: unavailable. MESSAGE: {message}. Please inform the user."
            else:
                return f"Error: {message}"
        except Exception as e:
            logger.error(f"Error in stop_charging_session: {e}")
            return f"I encountered an error: {str(e)}"

    @llm.function_tool
    async def troubleshoot_charger(
        self,
        charger_identifier: Optional[str] = None,
        issue_summary: Optional[str] = None
    ) -> str:
        """
        Diagnose charging issues and get troubleshooting steps for a charger.
        
        charger_identifier: The name, ID, or location of the charger (e.g., 'PTC Arcade' or 'CB1671'). If not provided or empty, it will automatically look up the user's active or previous charging session using their phone number.
        issue_summary: A brief description of the issue faced by the customer (e.g. 'fails to start' or 'error 104').
        """
        print(f"[*] TOOL CALL: troubleshoot_charger('{charger_identifier}', '{issue_summary}')")
        
        try:
            from data.troubleshoot import troubleshoot
        except ImportError as e:
            logger.error(f"Failed to import troubleshoot: {e}")
            return "EV troubleshooting features are currently offline."

        try:
            loop = asyncio.get_event_loop()
            
            # Auto-resolve from session if not provided
            charger_info = await self._resolve_charger_from_session(charger_identifier)
            if not charger_info:
                return "I couldn't locate an active or previous charging session associated with your phone number. Could you please tell me the name or ID of the charger you are using?"
            
            identity = charger_info["identity"]
            name = charger_info.get("name") or identity

            result = await loop.run_in_executor(
                None,
                lambda: troubleshoot(
                    charger_name=identity,
                    charger_identity=identity,
                    issue_summary=issue_summary,
                    phone=self.phone_number
                )
            )
            
            if not result or not isinstance(result, dict):
                return "I couldn't perform the diagnosis. Please make sure the charger identifier is correct."
            
            status = result.get("status")
            if status == "error":
                return f"Error diagnosing charger: {result.get('message', 'Unknown error')}"
            
            if status in ("need_selection", "multiple"):
                options = ", ".join([o.get("label", o.get("identity", "")) for o in result.get("options", [])])
                return f"I found multiple chargers matching that description. Did you mean: {options}?"
            
            charger_type = result.get("charger_type", "AC")
            charger_details = result.get("charger_details", {})
            snapshot = result.get("latest_snapshot", {})
            error_details = result.get("error_code_details")
            analysis = result.get("analysis", {})
            matched_as = result.get("matched_as")
            
            c_name = charger_details.get("name") or charger_details.get("chargerName") or name
            oem_name = "OEM Charger"
            if isinstance(charger_details.get("oem"), dict):
                oem_name = charger_details["oem"].get("oemName", "OEM Charger")
            elif result.get("vendor_id"):
                oem_name = result.get("vendor_id")
            
            match_msg = f" (matched as {matched_as})" if matched_as else ""
            
            summary = analysis.get("summary") or "General charging issue"
            interpretation = analysis.get("interpretation") or "There might be a communication or hardware issue."
            next_steps = analysis.get("next_steps", [])
            
            response_parts = []
            response_parts.append(f"I have successfully diagnosed charger {c_name}{match_msg}, which is a {charger_type} charger manufactured by {oem_name}.")
            
            if snapshot:
                conn_status = snapshot.get("status", {}).get("connector_status") or snapshot.get("status", {}).get("status") or snapshot.get("status", {}).get("value")
                if conn_status:
                    response_parts.append(f"The charger's current status is reported as {conn_status}.")
                
                # Fetch meter values from snapshot
                meter = snapshot.get("meter", {})
                if meter:
                    meter_parts = []
                    
                    # Voltage
                    v = meter.get("voltage")
                    if v is not None:
                        try:
                            v_val = float(v)
                            meter_parts.append(f"voltage is {v_val:.1f} V")
                        except ValueError:
                            pass
                    
                    # Current
                    c = meter.get("current")
                    if c is not None:
                        try:
                            c_val = float(c)
                            meter_parts.append(f"current is {c_val:.1f} A")
                        except ValueError:
                            pass
                            
                    # Power
                    p = meter.get("power")
                    if p is not None:
                        try:
                            p_val = float(p)
                            if p_val > 100:  # Value in Watts
                                meter_parts.append(f"power is {p_val / 1000.0:.2f} kW")
                            else:  # Value in kW
                                meter_parts.append(f"power is {p_val:.2f} kW")
                        except ValueError:
                            pass
                            
                    # SoC
                    soc = meter.get("soc")
                    if soc is not None:
                        try:
                            soc_val = float(soc)
                            meter_parts.append(f"State of Charge is {soc_val:.0f}%")
                        except ValueError:
                            pass
                            
                    # Energy
                    e = meter.get("energy")
                    if e is not None:
                        try:
                            e_val = float(e)
                            meter_parts.append(f"energy consumed is {e_val:.2f} kWh")
                        except ValueError:
                            pass
                    
                    if meter_parts:
                        response_parts.append("Live charging metrics show: " + ", ".join(meter_parts) + ".")
            
            response_parts.append(f"Diagnosis: {summary}.")
            response_parts.append(f"Explanation: {interpretation}")
            
            if error_details:
                # Mapped error details from ErrorCode
                if isinstance(error_details, list) and len(error_details) > 0:
                    err_info = error_details[0]
                else:
                    err_info = error_details
                
                if isinstance(err_info, dict):
                    err_code = err_info.get("code") or err_info.get("error_code")
                    err_desc = err_info.get("description") or err_info.get("name")
                    err_res = err_info.get("resolution") or err_info.get("remedy") or err_info.get("detail")
                    if err_code and err_code != "NoError":
                        response_parts.append(f"The active error code is {err_code}, described as: {err_desc}.")
                        if err_res:
                            response_parts.append(f"Vendor recommended solution: {err_res}")
            
            if next_steps:
                response_parts.append("Here are the recommended steps to resolve this:")
                for idx, step in enumerate(next_steps, 1):
                    response_parts.append(f"{idx}. {step}")
            else:
                response_parts.append("Please instruct the customer to re-plug the connector and verify if their vehicle starts charging. If the issue persists, a manual reset may be required.")
            
            # Log this troubleshooting attempt
            try:
                rect_text = ", ".join(next_steps[:3]) if next_steps else "Guidance provided"
                asyncio.create_task(log_transaction(
                    charger_identity=identity,
                    charger_name=name,
                    user_name=self.lead_name or "Customer",
                    phone=self.phone_number or "unknown",
                    start_time=datetime.now().isoformat(),
                    energy_kwh="0",
                    amount="0",
                    call_reason=issue_summary or summary or "Diagnostics run",
                    rectification_used=rect_text,
                    status="diagnosed"
                ))
            except Exception as dbe:
                logger.warning(f"Failed to log troubleshooting transaction: {dbe}")

            spoken_text = " ".join(response_parts)
            return spoken_text
            
        except Exception as e:
            logger.error(f"Error in troubleshoot_charger: {e}")
            return f"I encountered an error while trying to diagnose the charger: {str(e)}"

    @llm.function_tool
    async def get_charging_session_details(self, charger_identifier: str) -> str:
        """Get live charging session metrics for an EV charger, including state of charge (SoC), power, energy consumed, current (amperes), and voltage. charger_identifier: ID or Name."""
        print(f"[*] TOOL CALL: get_charging_session_details('{charger_identifier}')")
        if not _EV_TOOLS_AVAILABLE:
            return "EV charging features are currently offline."
        
        try:
            loop = asyncio.get_event_loop()
            
            # Resolve the charger
            resolved = await loop.run_in_executor(None, resolve_charger, charger_identifier)
            print(f"[*] Resolved charger for metrics: {resolved}")
            
            if resolved["status"] == "not_found":
                return f"I couldn't find a charger matching '{charger_identifier}'. Could you please verify the name?"
            
            if resolved["status"] == "multiple":
                options = ", ".join([o["label"] for o in resolved["options"]])
                return f"I found multiple chargers. Did you mean: {options}?"
            
            identity = resolved["charger"]["identity"]
            
            # Dynamically import troubleshooter helpers
            import sys
            sys.path.append(os.path.join(os.path.dirname(__file__), "data"))
            import importlib
            
            try:
                troubleshoot_mod = importlib.import_module("data.troubleshoot")
            except ImportError:
                troubleshoot_mod = importlib.import_module("troubleshoot")
                
            fetch_logs_tiered = getattr(troubleshoot_mod, "fetch_logs_tiered")
            extract_latest_snapshot = getattr(troubleshoot_mod, "extract_latest_snapshot")
            
            # Fetch details and raw logs
            details = await loop.run_in_executor(None, fetch_chargepoint_details, identity)
            raw_logs = await loop.run_in_executor(None, fetch_logs_tiered, identity)
            
            if not details:
                return "I resolved the charger but could not retrieve its configurations."
                
            snapshot = extract_latest_snapshot(raw_logs, details)
            print(f"[*] Session Details Snapshot: {snapshot}")
            
            status = snapshot.get("status", {}).get("value") or details.get("status", "Unknown")
            meter = snapshot.get("meter", {})
            
            soc = meter.get("soc")
            voltage = meter.get("voltage")
            current = meter.get("current")
            power = meter.get("power")
            energy = meter.get("energy")
            
            response_parts = []
            name = details.get("chargerName", charger_identifier)
            
            response_parts.append(f"Here are the live charging session details for {name}.")
            
            # Format and normalize values
            soc_str = f"{soc}%" if soc is not None else "Not available"
            
            if voltage is not None:
                try:
                    volts = float(voltage)
                    volt_str = f"{volts:.1f} Volts"
                except ValueError:
                    volt_str = f"{voltage} V"
            else:
                volt_str = "Not available"
                
            if current is not None:
                try:
                    amps = float(current)
                    amp_str = f"{amps:.1f} Amperes"
                except ValueError:
                    amp_str = f"{current} A"
            else:
                amp_str = "Not available"
                
            if power is not None:
                try:
                    pwatts = float(power)
                    if pwatts > 1000:
                        pwatts_kw = pwatts / 1000.0
                        power_str = f"{pwatts_kw:.2f} Kilowatts"
                    else:
                        power_str = f"{pwatts:.1f} Watts"
                except ValueError:
                    power_str = f"{power} kW"
            else:
                power_str = "Not available"
                
            if energy is not None:
                try:
                    ewatts = float(energy)
                    # Energy is usually represented in Wh or kWh in OCPP meter values. Let's describe it.
                    if ewatts > 1000:
                        ewatts_kwh = ewatts / 1000.0
                        energy_str = f"{ewatts_kwh:.2f} Kilowatt-hours"
                    else:
                        energy_str = f"{ewatts:.1f} Watt-hours"
                except ValueError:
                    energy_str = f"{energy} kWh"
            else:
                energy_str = "Not available"
                
            response_parts.append(f"Current Charger Status: {status}.")
            response_parts.append(f"State of Charge (SoC): {soc_str}.")
            response_parts.append(f"Power delivery: {power_str}.")
            response_parts.append(f"Energy consumed in this session: {energy_str}.")
            response_parts.append(f"Voltage: {volt_str}.")
            response_parts.append(f"Current draw: {amp_str}.")
            
            spoken_text = " ".join(response_parts)
            return spoken_text
            
        except Exception as e:
            logger.error(f"Error in get_charging_session_details: {e}")
            return f"I encountered an error while trying to fetch the charging session details: {str(e)}"
