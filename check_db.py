import asyncio, os, sys
sys.path.append('c:/Users/chris/Documents/outbound-pro')
from dotenv import load_dotenv
load_dotenv()
from db import get_errors, get_all_calls, init_db, _adb

init_db()

async def main():
    errs = await get_errors(10)
    print('ERRORS:', errs)
    calls = await get_all_calls(1, 10)
    print('CALLS:', calls)
    db = await _adb()
    raw = await db.table("call_logs").select("*").limit(5).execute()
    print('RAW CALLS:', raw.data)

asyncio.run(main())
