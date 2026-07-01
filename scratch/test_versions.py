import os, httpx
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

for model in ["models/gemini-2.5-flash-native-audio-latest", "models/gemini-3.1-flash-live-preview"]:
    for version in ["v1", "v1beta", "v1alpha"]:
        url = f"https://generativelanguage.googleapis.com/{version}/{model}:bidiGenerateContent?key={api_key}"
        try:
            with httpx.Client(http2=False) as client:
                resp = client.post(url, json={})
                print(f"Testing {model} on {version}: Status {resp.status_code}")
        except Exception as e:
            print(f"Error: {e}")
