import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    try:
        from google import genai
        from google.genai import types
        
        client = genai.Client(http_options={'api_version': 'v1alpha'})
        model = "gemini-2.0-flash-exp"
        print(f"Testing {model}...")
        async with client.aio.live.connect(model=model) as session:
            print("Connected successfully!")
            
        model2 = "gemini-2.0-flash"
        print(f"Testing {model2}...")
        async with client.aio.live.connect(model=model2) as session:
            print("Connected successfully to", model2)

        model3 = "gemini-3.1-flash-live-preview"
        print(f"Testing {model3}...")
        async with client.aio.live.connect(model=model3) as session:
            print("Connected successfully to", model3)
            
    except Exception as e:
        print(f"Error initializing agent: {e}")

if __name__ == "__main__":
    asyncio.run(main())
