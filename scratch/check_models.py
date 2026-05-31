import os
import httpx
from dotenv import load_dotenv

load_dotenv(".env")
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("No GOOGLE_API_KEY found.")
    exit(1)

print(f"Checking models for key: {api_key[:5]}...")

url = f"https://generativelanguage.googleapis.com/v1alpha/models?key={api_key}"
resp = httpx.get(url)
if resp.status_code != 200:
    print(f"Error: {resp.status_code} {resp.text}")
    exit(1)

data = resp.json()
supported_models = []
all_gemini_2_models = []

for model in data.get("models", []):
    name = model.get("name", "")
    if "gemini-2.0" in name:
        all_gemini_2_models.append(name)
        
    methods = model.get("supportedGenerationMethods", [])
    if "bidiGenerateContent" in methods:
        supported_models.append(name)

print("Models supporting bidiGenerateContent (Realtime Voice):")
if supported_models:
    for m in supported_models:
        print(" - " + m)
else:
    print(" (None found)")

print("\nAvailable Gemini 2.0 models on this API key:")
for m in all_gemini_2_models:
    print(" - " + m)
