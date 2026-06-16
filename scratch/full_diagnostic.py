"""
DEFINITIVE DIAGNOSTIC: Traces the EXACT runtime path of GOOGLE_API_KEY and GEMINI_MODEL
through .env → Supabase settings → os.environ → LiveKit → Gemini Live WebSocket.
"""
import os, json, asyncio
from dotenv import load_dotenv

# Step 0: Load .env exactly as agent.py does
load_dotenv(".env", override=True)

print("=" * 70)
print("STEP 1: API KEY CHAIN")
print("=" * 70)

env_key = os.getenv("GOOGLE_API_KEY", "")
print(f"  .env GOOGLE_API_KEY = {env_key[:15]}...{env_key[-4:]}" if len(env_key) > 19 else f"  .env GOOGLE_API_KEY = {env_key}")

# Now load Supabase settings exactly as agent.py does (load_db_settings_to_env)
supa_url = os.getenv("SUPABASE_URL", "")
supa_key = os.getenv("SUPABASE_SERVICE_KEY", "")
supa_overrides = {}
if supa_url and supa_key:
    try:
        from supabase import create_client
        client = create_client(supa_url, supa_key)
        result = client.table("settings").select("key, value").execute()
        for row in (result.data or []):
            k, v = row.get("key", ""), row.get("value", "")
            if v:
                supa_overrides[k] = v.strip()
                os.environ[k] = v.strip()  # Mimic load_db_settings_to_env
        print(f"\n  Supabase settings loaded: {len(supa_overrides)} keys")
        for k, v in supa_overrides.items():
            if k in ("GOOGLE_API_KEY", "GEMINI_MODEL", "USE_GEMINI_REALTIME", "GEMINI_TTS_VOICE"):
                display = f"{v[:15]}...{v[-4:]}" if len(v) > 19 and "KEY" in k else v
                print(f"    ⚠️  Supabase overrides {k} = {display}")
    except Exception as e:
        print(f"  ❌ Supabase load failed: {e}")
else:
    print("  ⚠️  Supabase not configured")

# Final effective key
final_key = os.getenv("GOOGLE_API_KEY", "")
print(f"\n  FINAL EFFECTIVE GOOGLE_API_KEY = {final_key[:15]}...{final_key[-4:]}" if len(final_key) > 19 else f"\n  FINAL EFFECTIVE GOOGLE_API_KEY = {final_key}")
if env_key != final_key:
    print("  🚨 SUPABASE OVERWROTE THE API KEY!")
else:
    print("  ✅ API key was NOT overridden by Supabase")

print(f"\n  FINAL EFFECTIVE GEMINI_MODEL = {os.getenv('GEMINI_MODEL', '(not set, default: models/gemini-2.0-flash-exp)')}")
print(f"  FINAL EFFECTIVE USE_GEMINI_REALTIME = {os.getenv('USE_GEMINI_REALTIME', '(not set, default: true)')}")

print("\n" + "=" * 70)
print("STEP 2: TEXT GENERATION TEST (proves key works for standard API)")
print("=" * 70)

import httpx

api_key = final_key
# Try multiple models
for model in ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.1-flash-live-preview"]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    try:
        resp = httpx.post(url, json={"contents": [{"parts": [{"text": "Say hello"}]}]}, timeout=15)
        if resp.status_code == 200:
            text = resp.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            print(f"  ✅ {model}: works! Response: {text[:50]}")
        else:
            err = resp.json().get("error", {}).get("message", resp.text[:100])
            print(f"  ❌ {model}: {resp.status_code} - {err[:80]}")
    except Exception as e:
        print(f"  ❌ {model}: {e}")

print("\n" + "=" * 70)
print("STEP 3: BIDI GENERATE CONTENT (Live API) SUPPORT")
print("=" * 70)

live_models_found = []
for api_ver in ["v1alpha", "v1beta"]:
    url = f"https://generativelanguage.googleapis.com/{api_ver}/models?key={api_key}"
    try:
        resp = httpx.get(url, timeout=15)
        if resp.status_code == 200:
            models = resp.json().get("models", [])
            for m in models:
                methods = m.get("supportedGenerationMethods", [])
                if "bidiGenerateContent" in methods:
                    print(f"  ✅ [{api_ver}] {m['name']} supports bidiGenerateContent!")
                    live_models_found.append(m["name"])
        else:
            print(f"  ❌ [{api_ver}] HTTP {resp.status_code}")
    except Exception as e:
        print(f"  ❌ [{api_ver}] {e}")

if not live_models_found:
    print("  ❌ NO MODELS support bidiGenerateContent on this API key")
else:
    print(f"\n  🎯 USE THIS MODEL: {live_models_found[0]}")

print("\n" + "=" * 70)
print("STEP 4: RAW WEBSOCKET CONNECTION TEST")
print("=" * 70)

async def test_websocket():
    """Attempt actual WebSocket connection like LiveKit does."""
    try:
        import websockets
    except ImportError:
        print("  ⚠️  websockets not installed locally, skipping raw WS test")
        return

    # Test with the best candidate model
    test_models = live_models_found if live_models_found else ["gemini-2.5-flash", "gemini-3.1-flash-live-preview"]
    
    for model_name in test_models:
        # Strip "models/" prefix if present
        short_name = model_name.replace("models/", "")
        ws_url = f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={api_key}"
        
        try:
            setup_msg = {
                "setup": {
                    "model": f"models/{short_name}",
                    "generation_config": {
                        "response_modalities": ["TEXT"]
                    }
                }
            }
            async with websockets.connect(ws_url, close_timeout=5) as ws:
                await ws.send(json.dumps(setup_msg))
                response = await asyncio.wait_for(ws.recv(), timeout=10)
                resp_data = json.loads(response)
                if "setupComplete" in resp_data:
                    print(f"  ✅ CONNECTED to {short_name} via WebSocket! Setup complete!")
                    print(f"     Response: {json.dumps(resp_data)[:200]}")
                    await ws.close()
                    return
                else:
                    print(f"  ⚠️  {short_name}: Got response but no setupComplete: {json.dumps(resp_data)[:200]}")
        except Exception as e:
            err_str = str(e)
            if "1008" in err_str:
                if "denied access" in err_str.lower():
                    print(f"  ❌ {short_name}: PROJECT DENIED ACCESS (Google account issue)")
                else:
                    print(f"  ❌ {short_name}: 1008 - {err_str[:150]}")
            else:
                print(f"  ❌ {short_name}: {err_str[:150]}")

asyncio.run(test_websocket())

print("\n" + "=" * 70)
print("STEP 5: ALL AVAILABLE MODELS")
print("=" * 70)

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
try:
    resp = httpx.get(url, timeout=15)
    if resp.status_code == 200:
        all_models = [m["name"] for m in resp.json().get("models", [])]
        relevant = [m for m in all_models if any(x in m for x in ["flash", "pro", "live"])]
        for m in relevant:
            print(f"  - {m}")
    else:
        print(f"  ❌ HTTP {resp.status_code}")
except Exception as e:
    print(f"  ❌ {e}")

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
if live_models_found:
    print(f"  ✅ Your API key SUPPORTS Native Gemini Live!")
    print(f"  🎯 Set gemini_model = \"{live_models_found[0]}\" in agent.py")
else:
    print("  ❌ Your API key does NOT support Native Gemini Live (bidiGenerateContent)")
    print("  💡 Options:")
    print("     1. Generate a NEW API key at https://aistudio.google.com/apikey")
    print("     2. Use Pipeline mode (Deepgram STT + Gemini LLM + Google TTS)")

if "GEMINI_MODEL" in supa_overrides:
    print(f"\n  🚨 WARNING: Supabase is overriding GEMINI_MODEL to: {supa_overrides['GEMINI_MODEL']}")
    print("     This may conflict with the hardcoded value in agent.py!")

if "GOOGLE_API_KEY" in supa_overrides:
    print(f"\n  🚨 WARNING: Supabase is overriding GOOGLE_API_KEY!")
    print("     The key in .env may NOT be the key used at runtime!")

print("\n" + "=" * 70)
