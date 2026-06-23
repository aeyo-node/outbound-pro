import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv(r"c:\Users\chris\Documents\outbound-pro\.env", override=True)
import sys
sys.path.append(r"c:\Users\chris\Documents\outbound-pro")

import asyncio
from db import get_setting

async def run():
    api_key = await get_setting("GOOGLE_API_KEY", "")
    if not api_key:
        api_key = os.getenv("GOOGLE_API_KEY")
    
    print("Using API Key:", api_key[:10] + "...")
    genai.configure(api_key=api_key)
    print("\n--- AVAILABLE MODELS ---")
    try:
        for m in genai.list_models():
            if "generateContent" in m.supported_generation_methods:
                print(m.name)
    except Exception as e:
        print("Error listing models:", e)

if __name__ == "__main__":
    asyncio.run(run())
