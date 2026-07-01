import asyncio, os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv()

async def main():
    db = await create_async_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))
    res = await db.table('agent_profiles').select('id, name, system_prompt').execute()
    for p in res.data:
        sp = p.get('system_prompt')
        if sp and "സ്പോർട്സ്" in sp:
            print(f"Found Malayalam Sports in: {p['name']}")

if __name__ == '__main__':
    asyncio.run(main())
