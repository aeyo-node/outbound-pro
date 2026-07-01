import os, httpx, json
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

models = [
    "models/gemini-3.1-flash-live-preview",
    "gemini-3.1-flash-live-preview",
    "models/gemini-2.5-flash",
    "gemini-2.5-flash"
]

print("Testing models for BidiGenerateContent (Gemini Live/Realtime)...")

for model in models:
    print(f"\n--- Testing {model} ---")
    url = f"https://generativelanguage.googleapis.com/v1beta/{model}:bidiGenerateContent?key={api_key}"
    try:
        with httpx.Client(http2=False) as client:
            resp = client.post(url, json={})
            print(f"Status: {resp.status_code}")
            if resp.status_code == 404:
                print("Result: NOT FOUND (1008 crash equivalent)")
            elif resp.status_code in [400, 426]:
                # 400 or 426 Upgrade Required implies the endpoint EXISTS and expects websocket
                print("Result: EXISTS (likely works with websocket)")
            else:
                print(f"Result: {resp.text[:100]}")
    except Exception as e:
        print(f"Error: {e}")
