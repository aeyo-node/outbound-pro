import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    try:
        from livekit.plugins.google import MultimodalAgent
        model = "models/gemini-3.1-flash-live-preview"
        agent = MultimodalAgent(model=model, api_key=os.getenv("GOOGLE_API_KEY"))
        print(f"Successfully initialized agent with {model}")
    except Exception as e:
        print(f"Error initializing agent: {e}")

if __name__ == "__main__":
    asyncio.run(main())
