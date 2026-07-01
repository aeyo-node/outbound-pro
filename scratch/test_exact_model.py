import os, httpx
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-native-audio-latest:bidiGenerateContent?key={api_key}"
try:
    with httpx.Client(http2=False) as client:
        resp = client.post(url, json={})
        print(f"Status: {resp.status_code}")
except Exception as e:
    print(f"Error: {e}")
