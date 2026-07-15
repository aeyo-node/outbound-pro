import asyncio
from dotenv import load_dotenv
load_dotenv()
from db import _adb, get_analytics
async def main():
    try:
        res = await get_analytics(tenant_id="system", days=30)
        print("SUCCESS:", res['total_calls'], res['total_calls_ever'])
    except Exception as e:
        print("ERROR:", e)
asyncio.run(main())
