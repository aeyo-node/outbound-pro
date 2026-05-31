import os
import asyncio
from db import _adb

async def check_settings():
    db = await _adb()
    res = await db.table("settings").select("*").execute()
    for row in res.data:
        print(f"{row['key']}: {row['value']}")

if __name__ == "__main__":
    asyncio.run(check_settings())
