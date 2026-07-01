import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    try:
        from livekit.plugins import google
        # Try to initialize the Realtime/Multimodal agent
        model = "models/gemini-3.1-flash-live-preview"
        agent = google.beta.RealtimeAgent(model=model, api_key=os.getenv("GOOGLE_API_KEY"))
        print(f"Successfully initialized agent with {model}")
    except Exception as e:
        print(f"Error initializing agent: {e}")

if __name__ == "__main__":
    asyncio.run(main())
