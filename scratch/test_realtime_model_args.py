import os
import sys
# Set console encoding to UTF-8
if sys.platform.startswith('win'):
    import sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from livekit.plugins import google
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

print("Initializing RealtimeModel...")
try:
    model = google.realtime.RealtimeModel(
        model="gemini-3.1-flash-live-preview",
        voice="Zephyr",
        api_key=api_key
    )
    print("SUCCESS: Successfully initialized RealtimeModel:", str(model))
    print("Available model attributes:")
    for attr in dir(model):
        if not attr.startswith("_"):
            print(f"  {attr}")
except Exception as e:
    print("FAILED: Failed to initialize RealtimeModel:", str(e))
