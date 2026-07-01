import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    from supabase import create_async_client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    db = await create_async_client(url, key)
    
    # List all profiles
    print("=== ALL AGENT PROFILES ===")
    result = await db.table("agent_profiles").select("*").execute()
    for p in (result.data or []):
        print(f"\nID: {p['id']}")
        print(f"  Name: {p.get('name')}")
        print(f"  Voice: {p.get('voice')}")
        print(f"  Model: {p.get('model')}")
        print(f"  Is Default: {p.get('is_default')}")
        print(f"  Welcome Message: {p.get('welcome_message', '')[:80]}")
        print(f"  System Prompt: {str(p.get('system_prompt', ''))[:80]}")
    
    # List all campaigns with their profile_id
    print("\n\n=== ALL CAMPAIGNS ===")
    result = await db.table("campaigns").select("id, name, agent_profile_id, status, system_prompt").execute()
    for c in (result.data or []):
        print(f"\nCampaign: {c.get('name')} ({c['id']})")
        print(f"  Status: {c.get('status')}")
        print(f"  Profile ID: {c.get('agent_profile_id')}")
        print(f"  System Prompt: {str(c.get('system_prompt', ''))[:80]}")

if __name__ == "__main__":
    asyncio.run(main())
