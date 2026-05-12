"""
Test script to diagnose ChargeMOD connectivity issues.
Tests both MCP SSE endpoint and direct backend API.
"""
import os
import sys
import json
import time
import requests
from dotenv import load_dotenv

# Load env
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=env_path)

# Add api-call to path
api_call_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "api-call")
sys.path.insert(0, api_call_path)

print("=" * 60)
print("TEST 1: MCP SSE Endpoint Connectivity")
print("=" * 60)

MCP_URL = "https://mcpserver.cs-api.chargemod.com/sse"
MCP_USER = "myuser"
MCP_PASS = "cmod2019"

try:
    print(f"[MCP] Connecting to {MCP_URL} ...")
    resp = requests.get(MCP_URL, auth=(MCP_USER, MCP_PASS), timeout=10, stream=True)
    print(f"[MCP] HTTP Status: {resp.status_code}")
    print(f"[MCP] Headers: {dict(resp.headers)}")
    
    # Read first few lines of SSE stream
    lines_read = 0
    session_url = None
    for line in resp.iter_lines(decode_unicode=True):
        if line:
            print(f"[MCP] SSE Line: {line}")
            if line.startswith("data: "):
                url_part = line[6:].strip()
                if url_part.startswith("/"):
                    base = MCP_URL.replace("/sse", "")
                    session_url = base + url_part
                else:
                    session_url = url_part
                print(f"[MCP] Session URL extracted: {session_url}")
        lines_read += 1
        if lines_read > 5:
            break
    
    if session_url:
        print(f"\n[MCP] Testing tool call via session URL: {session_url}")
        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": "remote_start_charger",
                "arguments": {
                    "charger_identity": "test",
                    "customer_mobile": "9999999999"
                }
            },
            "id": int(time.time())
        }
        tool_resp = requests.post(session_url, json=payload, auth=(MCP_USER, MCP_PASS), timeout=15)
        print(f"[MCP] Tool response status: {tool_resp.status_code}")
        print(f"[MCP] Tool response body: {tool_resp.text[:500]}")
    
    resp.close()
    
except requests.exceptions.Timeout:
    print("[MCP] TIMEOUT - Server did not respond within 10s")
except requests.exceptions.ConnectionError as e:
    print(f"[MCP] CONNECTION ERROR: {e}")
except Exception as e:
    print(f"[MCP] ERROR: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
print("TEST 2: Direct Backend - Auth Token")
print("=" * 60)

USER_EMAIL = os.getenv("USER_EMAIL")
USER_PASSWORD = os.getenv("USER_PASSWORD")
BASE_LS = os.getenv("BASE_LS")
BASE_TTS = os.getenv("BASE_TTS")

print(f"[AUTH] Email: {USER_EMAIL}")
print(f"[AUTH] BASE_LS: {BASE_LS}")
print(f"[AUTH] BASE_TTS: {BASE_TTS}")

try:
    from auth_key import get_auth_token, invalidate_token
    # Force fresh token
    invalidate_token()
    token = get_auth_token(force_refresh=True)
    if token:
        print(f"[AUTH] SUCCESS - Token: {token[:30]}...")
    else:
        print("[AUTH] FAILED - No token returned")
        sys.exit(1)
except Exception as e:
    print(f"[AUTH] ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("TEST 3: Direct Backend - Charger List/Resolve")
print("=" * 60)

try:
    from chargepoints import resolve_charger, fetch_chargepoint_details
    
    # Try resolving a charger - use a known test identifier
    test_ids = ["CMOD", "chargemod"]
    for tid in test_ids:
        print(f"\n[CHARGER] Resolving '{tid}'...")
        result = resolve_charger(tid)
        print(f"[CHARGER] Result status: {result.get('status')}")
        if result.get('status') == 'resolved':
            identity = result['charger']['identity']
            print(f"[CHARGER] Resolved to identity: {identity}")
            print(f"[CHARGER] Charger name: {result['charger'].get('chargerName')}")
            
            # Fetch details
            print(f"\n[CHARGER] Fetching details for {identity}...")
            details = fetch_chargepoint_details(identity)
            if details:
                print(f"[CHARGER] Name: {details.get('chargerName')}")
                evses = details.get('evses', [])
                for evse in evses:
                    print(f"[CHARGER] Connector {evse.get('connectorId')}: {evse.get('connectorStatus', evse.get('status', 'Unknown'))}")
            else:
                print("[CHARGER] Failed to fetch details")
            break
        elif result.get('status') == 'multiple':
            print(f"[CHARGER] Multiple matches found:")
            for opt in result.get('options', []):
                print(f"  - {opt.get('label')} (identity: {opt.get('identity')})")
        elif result.get('status') == 'not_found':
            print(f"[CHARGER] Not found: {result.get('message')}")
        
except Exception as e:
    print(f"[CHARGER] ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TEST 4: Direct Backend - Customer & Wallet")
print("=" * 60)

try:
    from RemoteStart import get_customer_info, get_wallet_balance
    
    # Test with a sample mobile
    test_mobile = "9999999999"
    print(f"[WALLET] Looking up customer: {test_mobile}")
    customer, err = get_customer_info(test_mobile)
    if err:
        print(f"[WALLET] Customer lookup error: {err}")
    else:
        print(f"[WALLET] Customer found: {customer}")
        balance, err = get_wallet_balance(customer["userId"])
        if err:
            print(f"[WALLET] Balance error: {err}")
        else:
            print(f"[WALLET] Balance: Rs. {balance}")
except Exception as e:
    print(f"[WALLET] ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("ALL TESTS COMPLETE")
print("=" * 60)
