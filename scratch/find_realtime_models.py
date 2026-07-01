import os, httpx
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

print("Models supporting bidiGenerateContent:")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
try:
    with httpx.Client(http2=False) as client:
        resp = client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            for model in data.get("models", []):
                methods = model.get("supportedGenerationMethods", [])
                if "bidiGenerateContent" in methods:
                    print(f"Model: {model.get('name')}")
except Exception as e:
    print(f"Error: {e}")
