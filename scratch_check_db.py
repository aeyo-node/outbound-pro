import asyncio
import os
import json
from db import get_all_agent_profiles, get_all_campaigns

async def main():
    print("PROFILES:")
    profiles = await get_all_agent_profiles()
    for p in profiles:
        print(f"ID: {p['id']}, Name: {p['name']}, SystemPrompt length: {len(p.get('system_prompt') or '')}")
        print(f"Content: {p.get('system_prompt')[:100] if p.get('system_prompt') else 'None'}")
    
    print("\nCAMPAIGNS:")
    campaigns = await get_all_campaigns()
    for c in campaigns:
        print(f"ID: {c['id']}, Name: {c['name']}, ProfileID: {c.get('agent_profile_id')}")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(main())
