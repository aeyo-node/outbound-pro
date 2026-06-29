import os
import json
import asyncio
from supabase._async.client import create_client, AsyncClient

SUPABASE_URL = "https://stpifofxuhgbjoqsnbpi.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0cGlmb2Z4dWhnYmpvcXNuYnBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI1MzQ0NywiZXhwIjoyMDkzODI5NDQ3fQ.JUSgOdA-OwlzaxkgiFBOdav8s8IJTywQzSrztRGUmhI"

async def main():
    client: AsyncClient = await create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("--- PROFILES ---")
    res = await client.table("agent_profiles").select("*").execute()
    for p in (res.data or []):
        print(f"Profile: {p['name']} | Prompt length: {len(p.get('system_prompt') or '')}")
        print(f"Content: {p.get('system_prompt')[:100] if p.get('system_prompt') else 'Empty'}")
        
    print("\n--- SETTINGS ---")
    res2 = await client.table("settings").select("*").execute()
    for s in (res2.data or []):
        if s['key'] == 'system_prompt':
            print(f"Global system_prompt: {s['value']}")

if __name__ == "__main__":
    asyncio.run(main())
