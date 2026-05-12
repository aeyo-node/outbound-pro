# ChargeMOD Voice Agent Integration Guide

Welcome to the ChargeMOD Voice Agent integration! 

We are using the **Model Context Protocol (MCP)** to expose our backend remote control logic securely. 
You will be connecting your Voice Agent LLM to our server via an **SSE (Server-Sent Events) endpoint**.

---

## 1. Connection Details
- **Protocol:** MCP (Model Context Protocol)
- **Transport:** HTTP SSE (Server-Sent Events)
- **Endpoint URL:** `https://mcpserver.cs-api.chargemod.com/sse`
- **Authentication:** HTTP Basic Authentication is required.
  - **Username:** `myuser`
  - **Password:** `cmod2019`
  
*Note: If your platform natively supports MCP endpoints, you usually only need to provide the Endpoint URL and Basic Auth credentials. The platform will automatically connect to `/sse`, receive the tool definitions, and send tool execution requests back to `/messages`.*

---

## 2. Voice Agent System Prompt
Please add the following instructions to your Voice Agent's System Prompt (or "Persona") so it knows exactly how to handle the responses from our backend.

> ### ChargeMOD Remote Control Flow
> You have access to two tools: `remote_start_charger` and `remote_stop_charger`.
> These tools are highly conversational. When you call a tool, the server will return a JSON object containing a `status` and a `message`. **You must closely follow the instructions based on the status.**
> 
> **When starting a session (`remote_start_charger`):**
> - If the user does not provide both a charger location/ID and their phone number, ask for them before calling the tool.
> - If the response `status` is **`need_connector`**, read the `message` to the user and ask them which gun/connector they want to use based on the `buttons` array provided in the response. Call the tool again with the `connector_id` parameter included.
> - If the response `status` is **`need_otp_method`**, read the `message` to the user and ask if they prefer SMS or WhatsApp. Call the tool again with the `otp_method` parameter.
> - If the response `status` is **`otp_sent`**, inform the user the OTP was sent and ask them to read the 4-digit code to you. Call the tool again with the `otp_code` parameter.
> - Once the `status` is **`success`**, inform the user the session is starting.
> 
> **When stopping a session (`remote_stop_charger`):**
> - If the response `status` is **`verify_mobile`**, ask the user to confirm the mobile number provided in the prompt before you call the tool again with the `confirmed_mobile` parameter.

---

## 3. Manual Tool Schemas (If required by your platform)

If your platform (e.g. Vapi, Retell, OpenAI Custom Tools) does not natively ingest MCP schemas and requires you to paste the JSON manually, here are the exact schemas for the two tools:

### Tool 1: `remote_start_charger`
```json
{
  "name": "remote_start_charger",
  "description": "Initiates a remote start sequence. This is a multi-step process. Pass the parameters you know. The server will return a 'status' like 'need_connector', 'need_otp_method', or 'otp_sent'. Always relay these prompts to the user and call this tool again with the newly gathered parameters.",
  "parameters": {
    "type": "object",
    "properties": {
      "charger_identity": {
        "type": "string",
        "description": "The charger ID or location name (e.g. CMOD123)"
      },
      "customer_mobile": {
        "type": "string",
        "description": "10-digit mobile number of the user."
      },
      "connector_id": {
        "type": "string",
        "description": "The Gun/Connector ID. Pass if known."
      },
      "otp_method": {
        "type": "string",
        "enum": ["sms", "whatsapp", "both", "skip"],
        "description": "The chosen OTP delivery method."
      },
      "otp_code": {
        "type": "string",
        "description": "The 4-digit OTP code provided by the user."
      }
    },
    "required": ["charger_identity", "customer_mobile"]
  }
}
```

### Tool 2: `remote_stop_charger`
```json
{
  "name": "remote_stop_charger",
  "description": "Initiates a remote stop sequence. The server will check the active session and return a 'status' of 'verify_mobile'. Ask the user to confirm the returned mobile number before calling this tool again with confirmed_mobile.",
  "parameters": {
    "type": "object",
    "properties": {
      "charger_identity": {
        "type": "string",
        "description": "The charger ID or location name (e.g. CMOD123)"
      },
      "confirmed_mobile": {
        "type": "string",
        "description": "The 10-digit mobile number confirmed by the user, or '0000000000' for a force stop."
      }
    },
    "required": ["charger_identity"]
  }
}
```
