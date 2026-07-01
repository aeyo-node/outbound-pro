import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    try:
        from google import genai
        from google.genai import types
        
        client = genai.Client(http_options={'api_version': 'v1alpha'})
        
        models = [
            "gemini-2.0-flash",
            "gemini-2.0-flash-exp",
            "gemini-3.1-flash-live-preview",
            "models/gemini-3.1-flash-live-preview",
            "gemini-2.5-flash",
            "gemini-2.5-flash-native-audio-latest"
        ]
        
        for model in models:
            print(f"Testing {model}...")
            try:
                async with client.aio.live.connect(model=model) as session:
                    print(f"  -> SUCCESS! {model} connected.")
            except Exception as e:
                print(f"  -> FAILED: {str(e)[:150]}")
            
    except Exception as e:
        print(f"Error initializing agent: {e}")

if __name__ == "__main__":
    asyncio.run(main())
