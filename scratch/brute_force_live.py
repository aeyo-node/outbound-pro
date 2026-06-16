import os
import httpx
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

print("Checking ALL models for bidiGenerateContent support...")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
resp = httpx.get(url, timeout=15)
if resp.status_code != 200:
    print(f"Failed to fetch models: {resp.text}")
    exit(1)

models = resp.json().get("models", [])
found_live = False

for m in models:
    name = m["name"]
    methods = m.get("supportedGenerationMethods", [])
    if "bidiGenerateContent" in methods:
        print(f"✅ FOUND NATIVE LIVE MODEL: {name}")
        found_live = True

if not found_live:
    print("❌ NO MODELS SUPPORT bidiGenerateContent on this API key.")
