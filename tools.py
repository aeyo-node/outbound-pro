import logging
import asyncio
import time
import os
import sys
import json
import httpx
from typing import Optional, Dict, Any, List
from livekit import agents
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
        """Return tool methods filtered by the enabled list. Force includes remote tools."""
        all_methods = [
            self.check_availability, self.book_appointment, self.end_call,
            self.transfer_to_human, self.send_sms_confirmation, self.lookup_contact,
            self.remember_details, self.book_calcom, self.cancel_calcom,
            self.check_charger_status, self.check_wallet_balance,
            self.start_charging_session, self.stop_charging_session,
            self.troubleshoot_charger,
            self.get_charging_session_details,
        ]
        force_include = [
            "start_charging_session", "stop_charging_session", 
            "check_wallet_balance", "check_charger_status",
            "troubleshoot_charger", "get_charging_session_details"
        ]
        if not enabled:
            return all_methods
        name_map = {m.__name__: m for m in all_methods}
        active = [name_map[n] for n in enabled if n in name_map]
        for f in force_include:
            if f in name_map and name_map[f] not in active:
                active.append(name_map[f])
        return active

    @llm.function_tool
    async def check_charger_status(self, charger_identifier: str) -> str:
        """Check live status of an EV charger. charger_identifier: ID or Name (e.g. CMOD123)."""
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
    async def check_availability(self, date: str, time: str) -> str:
        """Check if date/time slot is available. date: YYYY-MM-DD, time: HH:MM."""
        try:
            if await check_slot(date, time):
                return "available"
            next_slot = await get_next_available(date, time)
            return f"unavailable: next available slot is {next_slot}"
        except Exception as exc:
            return "Unable to check availability right now — please suggest a date and I will confirm."

    @llm.function_tool
    async def book_appointment(self, name: str, phone: str, date: str, time: str, service: str) -> str:
        """Book appointment. name: Full Name, phone: with country code, date: YYYY-MM-DD, time: HH:MM, service: type."""
        try:
            booking_id = await insert_appointment(name, phone, date, time, service)
            return f"Confirmed! Booking ID: {booking_id}. See you on {date} at {time} for {service}."
        except Exception as exc:
            return "Technical issue saving the booking. Our team will confirm shortly."

    @llm.function_tool
    async def end_call(self, outcome: str, lead_temperature: str, summary: str, reason: str = "") -> str:
        """End call. outcome: 'booked'|'not_interested'|'wrong_number'|'no_answer', lead_temperature: 'HOT'|'WARM'|'COLD', summary: details."""
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
                        amount=tx_details.get("amount", "0")
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
        charger_identifier: str,
        issue_summary: Optional[str] = None
    ) -> str:
        """
        Diagnose charging issues and get troubleshooting steps for a charger.
        
        charger_identifier: The name, ID, or location of the charger (e.g., 'PTC Arcade' or 'CB1671').
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
            result = await loop.run_in_executor(
                None,
                lambda: troubleshoot(
                    charger_name=charger_identifier,
                    charger_identity=charger_identifier,
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
            
            c_name = charger_details.get("name") or charger_details.get("chargerName") or charger_identifier
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
                conn_status = snapshot.get("status", {}).get("connector_status") or snapshot.get("status", {}).get("status")
                if conn_status:
                    response_parts.append(f"The charger's current status is reported as {conn_status}.")
            
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
