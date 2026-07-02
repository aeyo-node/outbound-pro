import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("No GOOGLE_API_KEY found.")
    exit(1)

client = genai.Client(api_key=api_key)
print("Listing models from google-genai SDK:")
try:
    for model in client.models.list():
        if "bidiGenerateContent" in getattr(model, "supported_actions", []):
            print(f"Model: {model.name} (supports bidiGenerateContent)")
        elif "gemini" in model.name:
            print(f"Model: {model.name} (actions: {getattr(model, 'supported_actions', [])})")
except Exception as e:
    print(f"Error: {e}")
