import asyncio
from dotenv import load_dotenv
load_dotenv()
from db import _adb
async def main():
    db = await _adb()
    cols = (await db.table('call_logs').select('*').limit(1).execute()).data
    if cols:
        print("COLUMNS:", cols[0].keys())
asyncio.run(main())
