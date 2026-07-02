import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("No GOOGLE_API_KEY found.")
    exit(1)

client = genai.Client(api_key=api_key)
print("Testing google-genai chat...")
try:
    chat = client.chats.create(model="gemini-2.5-flash")
    response = chat.send_message("Hello, how are you?")
    print("Chat response:", response.text)
    print("Chat history type:", type(chat.get_history()))
    print("✅ Chat simulation works!")
except Exception as e:
    print("❌ Chat simulation failed:", e)
