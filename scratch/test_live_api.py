"""
Quick diagnostic: Does this API key support the Gemini Live (Realtime) API?
"""
import os, httpx, json
from dotenv import load_dotenv

load_dotenv(".env")
api_key = os.getenv("GOOGLE_API_KEY")
print(f"API Key: {api_key[:12]}...")

# ── Test 1: Basic text generation (proves key is valid) ──────────────────────
print("\n=== TEST 1: Basic text generation (gemini-2.0-flash) ===")
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
resp = httpx.post(url, json={"contents": [{"parts": [{"text": "Say hello in one word"}]}]}, timeout=15)
print(f"  Status: {resp.status_code}")
if resp.status_code == 200:
    text = resp.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    print(f"  Response: {text[:100]}")
    print("  ✅ API key works for regular text generation")
else:
    print(f"  ❌ FAILED: {resp.text[:200]}")

# ── Test 2: List ALL models supporting bidiGenerateContent ───────────────────
print("\n=== TEST 2: Models supporting bidiGenerateContent (Live API) ===")
for api_ver in ["v1alpha", "v1beta"]:
    url = f"https://generativelanguage.googleapis.com/{api_ver}/models?key={api_key}"
    resp = httpx.get(url, timeout=15)
    if resp.status_code != 200:
        print(f"  [{api_ver}] Error: {resp.status_code}")
        continue
    models = resp.json().get("models", [])
    live_models = [m["name"] for m in models if "bidiGenerateContent" in m.get("supportedGenerationMethods", [])]
    if live_models:
        print(f"  [{api_ver}] ✅ Found {len(live_models)} Live models:")
        for m in live_models:
            print(f"      - {m}")
    else:
        print(f"  [{api_ver}] ❌ No models support bidiGenerateContent")

# ── Test 3: Try known Live model names directly ──────────────────────────────
print("\n=== TEST 3: Brute-force test known Live model names ===")
candidates = [
    "gemini-2.0-flash-live-001",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash",
    "gemini-2.5-flash-preview-native-audio-dialog",
    "gemini-2.5-flash-native-audio-preview",
    "gemini-2.0-flash-live",
    "gemini-live-2.0-flash",
]
for model in candidates:
    for api_ver in ["v1alpha", "v1beta"]:
        url = f"https://generativelanguage.googleapis.com/{api_ver}/models/{model}?key={api_key}"
        resp = httpx.get(url, timeout=10)
        if resp.status_code == 200:
            methods = resp.json().get("supportedGenerationMethods", [])
            has_bidi = "bidiGenerateContent" in methods
            print(f"  [{api_ver}] {model}: EXISTS, bidiGenerateContent={'✅ YES' if has_bidi else '❌ NO'}")
        else:
            pass  # skip 404s silently

# ── Test 4: List ALL available models (to find the 3.x models) ───────────────
print("\n=== TEST 4: ALL AVAILABLE MODELS ===")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
resp = httpx.get(url, timeout=15)
if resp.status_code == 200:
    all_models = [m["name"] for m in resp.json().get("models", [])]
    # Filter to only show flash or pro models to reduce spam
    relevant_models = [m for m in all_models if "flash" in m or "pro" in m]
    for m in relevant_models:
        print(f"  - {m}")
else:
    print("Failed to fetch models list")

print("\n=== DONE ===")
