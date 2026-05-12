import sys
import json
import httpx
from typing import Optional, Dict, Any, List
from livekit import agents
from livekit.agents import llm
from db import (
    log_error, log_call, insert_appointment, check_slot, 
    get_next_available, get_calls_by_phone, get_appointments_by_phone,
    add_contact_memory, get_contact_memory, compress_contact_memory
)

logger = logging.getLogger("appointment-tools")

# Add api-call directory to path for EV tool imports
_api_call_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "api-call")
if _api_call_path not in sys.path:
    sys.path.append(_api_call_path)

try:
    from chargepoints import resolve_charger, fetch_chargepoint_details
    from RemoteStart import get_wallet_balance as _get_wallet_balance, remote_start_with_otp, remote_stop, get_customer_info
    _EV_TOOLS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"EV tools logic not found or incomplete: {e}")
    _EV_TOOLS_AVAILABLE = False




async def _log(msg: str, detail: str = "", level: str = "info") -> None:
    try:
        await log_error("agent", msg, detail, level)
    except Exception:
        pass


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

    def __init__(self, ctx: agents.JobContext, phone_number: Optional[str] = None, lead_name: Optional[str] = None):
        self.ctx = ctx
        self.phone_number = phone_number
        self.lead_name = lead_name
        self._call_start_time = time.time()
        self._sip_domain = os.getenv("VOBIZ_SIP_DOMAIN", "")
        self.recording_url: Optional[str] = None
        self._call_logged = False
        self.mcp = MCPClient(
            endpoint="https://mcpserver.cs-api.chargemod.com/sse",
            username="myuser",
            password="cmod2019"
        )
        super().__init__(tools=[])

    def build_tool_list(self, enabled: list) -> list:
        """Return tool methods filtered by the enabled list. Empty list = all enabled."""
        all_methods = [
            self.check_availability, self.book_appointment, self.end_call,
            self.transfer_to_human, self.send_sms_confirmation, self.lookup_contact,
            self.remember_details, self.book_calcom, self.cancel_calcom,
            self.check_charger_status, self.check_wallet_balance,
            self.start_charging, self.stop_charging,
            self.remote_start_charger, self.remote_stop_charger,
        ]
        if not enabled:
            return all_methods
        name_map = {m.__name__: m for m in all_methods}
        return [name_map[n] for n in enabled if n in name_map]

    @llm.function_tool
    async def check_charger_status(self, charger_identifier: str) -> str:
        """
        Check the real-time status of an EV charger (e.g. Available, Charging, Finishing, Out of Order).
        charger_identifier: Name, ID, or Location of the charger (e.g. 'Lulu Mall', 'Kochi Metro').
        """
        print(f"[*] TOOL CALL: check_charger_status('{charger_identifier}')")
        if not _EV_TOOLS_AVAILABLE:
            return "EV charging features are currently offline."
        
        try:
            loop = asyncio.get_event_loop()
            resolved = await loop.run_in_executor(None, resolve_charger, charger_identifier)
            print(f"[*] Resolved charger: {resolved}")
            
            if resolved["status"] == "not_found":
                return f"I couldn't find a charger matching '{charger_identifier}'. Could you please double check the name?"
            
            if resolved["status"] == "multiple":
                options = ", ".join([o["label"] for o in resolved["options"]])
                return f"I found multiple chargers. Did you mean: {options}?"
            
            identity = resolved["charger"]["identity"]
            details = await loop.run_in_executor(None, fetch_chargepoint_details, identity)
            
            if not details:
                return "I found the charger but couldn't retrieve its live status. Please try again in a moment."
            
            evses = details.get("evses", [])
            status_summary = []
            for evse in evses:
                status = evse.get("connectorStatus", evse.get("status", "Unknown"))
                conn_id = evse.get("connectorId", "?")
                status_summary.append(f"Connector {conn_id} is {status}")
            
            name = details.get("chargerName", charger_identifier)
            result = f"Status for {name}: " + ". ".join(status_summary)
            print(f"[*] Tool result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in check_charger_status: {e}")
            return "I encountered a technical error while checking the charger status."

    @llm.function_tool
    async def check_wallet_balance(self) -> str:
        """
        Check the current wallet balance for the user.
        Uses the caller's phone number to identify the account.
        """
        print(f"[*] TOOL CALL: check_wallet_balance() for {self.phone_number}")
        if not _EV_TOOLS_AVAILABLE:
            return "Wallet features are currently offline."
        
        if not self.phone_number:
            return "I don't have your phone number to check your wallet balance. Could you please provide it?"
        
        try:
            loop = asyncio.get_event_loop()
            # First find customer ID
            customer, err = await loop.run_in_executor(None, get_customer_info, self.phone_number)
            if err or not customer:
                print(f"[*] Customer not found for {self.phone_number}. Error: {err}")
                return f"I couldn't find a chargeMOD account linked to {self.phone_number}."
            
            balance, err = await loop.run_in_executor(None, _get_wallet_balance, customer["userId"])
            if err:
                print(f"[*] Balance fetch failed for {customer['userId']}. Error: {err}")
                return "I couldn't retrieve your balance right now. Please try again later."
            
            result = f"Your current wallet balance is Rs. {balance}."
            print(f"[*] Tool result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in check_wallet_balance: {e}")
            return "I encountered an error while checking your balance."

    @llm.function_tool
    async def start_charging(self, charger_identifier: str) -> str:
        """
        Start a remote charging session on a specific charger.
        charger_identifier: Name, ID, or Location of the charger.
        Note: This tool uses the caller's phone number for authentication.
        """
        print(f"[*] TOOL CALL: start_charging('{charger_identifier}') for {self.phone_number}")
        if not _EV_TOOLS_AVAILABLE:
            return "Remote charging control is currently offline."
        
        if not self.phone_number:
            return "I need your phone number to start the charging session. Could you please provide it?"
        
        try:
            loop = asyncio.get_event_loop()
            # Identify customer
            customer, err = await loop.run_in_executor(None, get_customer_info, self.phone_number)
            if err or not customer:
                print(f"[*] Customer not found for {self.phone_number}. Error: {err}")
                return f"I couldn't find a chargeMOD account linked to {self.phone_number}."
            
            # Start charging (using BYPASS for OTP as per production plan for voice agents)
            print(f"[*] Attempting remote start for {charger_identifier} (User: {customer['userId']})")
            result = await loop.run_in_executor(None, remote_start_with_otp, charger_identifier, customer, "BYPASS")
            print(f"[*] API result: {result}")
            
            if result.get("status") == "success":
                return f"Done! Charging session has been started successfully. Your remaining balance is Rs. {result.get('balance')}."
            
            if result.get("status") == "failed":
                reason = result.get("reason", "")
                if reason == "insufficient_balance":
                    return result.get("message")
                return f"I couldn't start the charging session. Reason: {result.get('message', 'Unknown error')}"
            
            if result.get("status") == "not_found":
                return f"I couldn't find the charger '{charger_identifier}'."
                
            return "I couldn't complete the request. Please ensure your vehicle is plugged in and try again."
            
        except Exception as e:
            logger.error(f"Error in start_charging: {e}")
            return "I encountered an error while attempting to start the charging session."

    @llm.function_tool
    async def stop_charging(self, charger_identifier: str) -> str:
        """
        Stop an active remote charging session on a specific charger.
        charger_identifier: Name, ID, or Location of the charger.
        """
        if not _EV_TOOLS_AVAILABLE:
            return "Remote charging control is currently offline."
        
        if not self.phone_number:
            return "I need your phone number to verify the active session. Could you please provide it?"
            
        try:
            loop = asyncio.get_event_loop()
            # Stop charging (using the caller's phone number for confirmation)
            result = await loop.run_in_executor(None, remote_stop, charger_identifier, self.phone_number)
            
            if result.get("status") == "success":
                return result.get("message", "Charging stopped successfully.")
            
            if result.get("status") == "no_active_session":
                return result.get("message")
                
            if result.get("status") == "mobile_mismatch":
                return "I found an active session, but the mobile number doesn't match your account. Only the person who started the session can stop it."
            
            return f"I couldn't stop the charging session. {result.get('message', '')}"
            
        except Exception as e:
            logger.error(f"Error in stop_charging: {e}")
            return "I encountered an error while attempting to stop the charging session."

    @llm.function_tool
    async def check_availability(self, date: str, time: str) -> str:
        """
        Check whether a date/time slot is available for booking.
        Call this BEFORE attempting to book whenever the lead proposes a date/time.
        date format: YYYY-MM-DD  |  time format: HH:MM (24-hour)
        Returns 'available' or 'unavailable: next available slot is <slot>'.
        """
        try:
            if await check_slot(date, time):
                return "available"
            next_slot = await get_next_available(date, time)
            return f"unavailable: next available slot is {next_slot}"
        except Exception as exc:
            return "Unable to check availability right now — please suggest a date and I will confirm."

    @llm.function_tool
    async def book_appointment(self, name: str, phone: str, date: str, time: str, service: str) -> str:
        """
        Book an appointment after the lead has verbally confirmed date, time, and service.
        Call ONLY after the lead confirms all details.
        name: lead's exact full name (Ask them for it if you don't know it!)
        phone: lead's exact phone number with country code (Ask them for it if you don't know it!)
        date: YYYY-MM-DD | time: HH:MM | service: type
        """
        try:
            booking_id = await insert_appointment(name, phone, date, time, service)
            return f"Confirmed! Booking ID: {booking_id}. See you on {date} at {time} for {service}."
        except Exception as exc:
            return "Technical issue saving the booking. Our team will confirm shortly."

    @llm.function_tool
    async def end_call(self, outcome: str, lead_temperature: str, summary: str, reason: str = "") -> str:
        """
        End the call and log the outcome. ALWAYS call this before the call ends.
        outcome: 'booked' | 'not_interested' | 'wrong_number' | 'voicemail' | 'no_answer' | 'callback_requested'
        lead_temperature: 'HOT' (very interested/booked) | 'WARM' (interested, callback later) | 'COLD' (not interested)
        summary: highly detailed summary of the conversation, objections, and next steps for human agents.
        reason: brief description
        """
        duration = int(time.time() - self._call_start_time)
        notes = f"[{lead_temperature.upper()}] {summary}"
        try:
            await log_call(
                phone_number=self.phone_number or "unknown",
                lead_name=self.lead_name, outcome=outcome, reason=reason,
                duration_seconds=duration, recording_url=self.recording_url,
                notes=notes
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
        """
        Transfer the call to a human agent via SIP REFER.
        Call when lead requests a human, is angry, or has a complex issue.
        reason: why you're transferring
        """
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
        """
        Look up a contact's full history. Call at the START of every call before engaging.
        phone: the lead's phone number with country code
        Returns call history, appointments, and remembered details.
        """
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
        """
        Store a key insight about this lead for future calls.
        Use whenever you learn something useful: preferences, objections, timing, family info.
        Examples: "Prefers morning calls", "Has 2 kids, interested in family plan", "Callback in 2 weeks"
        insight: the detail to remember
        """
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
    async def book_calcom(self, name: str, email: str, date: str, start_time: str, notes: str = "") -> str:
        """
        Book in Cal.com calendar after book_appointment succeeds.
        name: full name | email: lead's email | date: YYYY-MM-DD | start_time: HH:MM | notes: optional
        """
        api_key = os.getenv("CALCOM_API_KEY", "")
        event_type_id = os.getenv("CALCOM_EVENT_TYPE_ID", "")
        timezone = os.getenv("CALCOM_TIMEZONE", "Asia/Kolkata")
        if not api_key or not event_type_id:
            return "Cal.com not configured — skipping. Add CALCOM_API_KEY and CALCOM_EVENT_TYPE_ID."
        try:
            from datetime import datetime as _dt
            start_dt = _dt.strptime(f"{date} {start_time}", "%Y-%m-%d %H:%M")
            start_iso = start_dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")
            import httpx
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://api.cal.com/v1/bookings",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "eventTypeId": int(event_type_id), "start": start_iso, "timeZone": timezone,
                        "responses": {"name": name, "email": email, "notes": notes},
                        "metadata": {"source": "OutboundAI"}, "language": "en",
                    },
                )
            data = resp.json()
            if resp.status_code not in (200, 201):
                raise ValueError(data.get("message") or str(data))
            uid = data.get("uid", "")
            return f"Cal.com booked. UID: {uid}"
        except Exception as exc:
            return f"Cal.com booking failed: {exc}"

    @llm.function_tool
    async def cancel_calcom(self, booking_uid: str, reason: str = "") -> str:
        """
        Cancel a Cal.com booking by UID.
        booking_uid: from book_calcom | reason: optional
        """
        api_key = os.getenv("CALCOM_API_KEY", "")
        if not api_key:
            return "Cal.com not configured."
        try:
            import httpx
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.delete(
                    f"https://api.cal.com/v1/bookings/{booking_uid}",
                    headers={"Authorization": f"Bearer {api_key}"},
                    params={"reason": reason} if reason else {},
                )
            if resp.status_code not in (200, 204):
                raise ValueError(f"HTTP {resp.status_code}")
            return f"Cancelled Cal.com booking {booking_uid}."
        except Exception as exc:
            return f"Cancellation failed: {exc}"

    @llm.function_tool
    async def remote_start_charger(
        self, 
        charger_identity: str, 
        customer_mobile: str,
        connector_id: Optional[str] = None,
        otp_method: Optional[str] = None,
        otp_code: Optional[str] = None
    ) -> str:
        """
        Initiates a remote start sequence via the ChargeMOD MCP server.
        This is a multi-step process. If the server asks for a connector, OTP method, or OTP code,
        relay the message to the user and call this tool again with the additional parameters.
        
        charger_identity: The charger ID or location name (e.g. CMOD123)
        customer_mobile: 10-digit mobile number of the user.
        connector_id: The Gun/Connector ID (if known).
        otp_method: The chosen OTP delivery method ('sms' or 'whatsapp').
        otp_code: The 4-digit OTP code provided by the user.
        """
        print(f"[*] MCP TOOL CALL: remote_start_charger('{charger_identity}', '{customer_mobile}')")
        
        args = {
            "charger_identity": charger_identity,
            "customer_mobile": customer_mobile
        }
        if connector_id: args["connector_id"] = connector_id
        if otp_method: args["otp_method"] = otp_method
        if otp_code: args["otp_code"] = otp_code
        
        result = await self.mcp.call_tool("remote_start_charger", args)
        
        status = result.get("status")
        message = result.get("message", "")
        
        if status == "success":
            return f"Success! {message}"
        elif status == "need_connector":
            buttons = result.get("buttons", [])
            opts = ", ".join([f"{b.get('label')} (ID: {b.get('value')})" for b in buttons])
            return f"STATUS: need_connector. MESSAGE: {message}. OPTIONS: {opts}. Please ask the user which connector they want to use."
        elif status == "need_otp_method":
            return f"STATUS: need_otp_method. MESSAGE: {message}. Please ask the user if they prefer SMS or WhatsApp."
        elif status == "otp_sent":
            return f"STATUS: otp_sent. MESSAGE: {message}. Please ask the user for the 4-digit OTP code."
        else:
            return f"Error: {message}"

    @llm.function_tool
    async def remote_stop_charger(
        self, 
        charger_identity: str,
        confirmed_mobile: Optional[str] = None
    ) -> str:
        """
        Initiates a remote stop sequence via the ChargeMOD MCP server.
        The server will check the active session and might ask to verify the mobile number.
        
        charger_identity: The charger ID or location name (e.g. CMOD123)
        confirmed_mobile: The 10-digit mobile number confirmed by the user.
        """
        print(f"[*] MCP TOOL CALL: remote_stop_charger('{charger_identity}')")
        
        args = {"charger_identity": charger_identity}
        if confirmed_mobile: args["confirmed_mobile"] = confirmed_mobile
        
        result = await self.mcp.call_tool("remote_stop_charger", args)
        
        status = result.get("status")
        message = result.get("message", "")
        
        if status == "success":
            return f"Success! {message}"
        elif status == "verify_mobile":
            return f"STATUS: verify_mobile. MESSAGE: {message}. Please ask the user to confirm their mobile number before proceeding."
        else:
            return f"Error: {message}"
