import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    from supabase import create_async_client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    db = await create_async_client(url, key)
    
    # List ALL profiles fully
    print("=== ALL AGENT PROFILES ===")
    result = await db.table("agent_profiles").select("*").execute()
    for p in (result.data or []):
        print(f"\nID: {p['id']}")
        print(f"  Name: {p.get('name')}")
        print(f"  Voice: {p.get('voice')}")
        print(f"  Model: {p.get('model')}")
        print(f"  Is Default: {p.get('is_default')}")
        wm = p.get('welcome_message') or ''
        print(f"  Welcome Message: {wm[:100]}")
        sp = p.get('system_prompt') or ''
        print(f"  System Prompt (first 100): {sp[:100]}")
    
    # Fix Philip's model to use the working one
    print("\n\n=== UPDATING PROFILE MODELS ===")
    dead_models = ["gemini-2.0-flash-exp", "gemini-3.1-flash-live-preview", "models/gemini-2.0-flash-exp", "models/gemini-3.1-flash-live-preview"]
    result2 = await db.table("agent_profiles").select("id, name, model").execute()
    for p in (result2.data or []):
        if p.get("model") in dead_models:
            print(f"  Fixing profile '{p['name']}': {p['model']} -> gemini-2.5-flash-native-audio-latest")
            await db.table("agent_profiles").update({"model": "gemini-2.5-flash-native-audio-latest"}).eq("id", p["id"]).execute()
        else:
            print(f"  Profile '{p['name']}' model OK: {p.get('model')}")
    
    # List all campaigns
    print("\n\n=== ALL CAMPAIGNS ===")
    result3 = await db.table("campaigns").select("id, name, agent_profile_id, status").execute()
    for c in (result3.data or []):
        print(f"\nCampaign: {c.get('name')} [{c.get('status')}]")
        print(f"  Profile ID: {c.get('agent_profile_id')}")
    
    print("\nDone!")

if __name__ == "__main__":
    asyncio.run(main())
