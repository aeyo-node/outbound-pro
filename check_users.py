import asyncio
from dotenv import load_dotenv
load_dotenv()
from db import _adb
async def main():
    db = await _adb()
    users = (await db.table('users').select('*').execute()).data
    print("USERS:")
    for u in users:
        print(u.get('email'), u.get('role'), u.get('tenant_id'))
    print("TENANTS:")
    tenants = (await db.table('tenants').select('*').execute()).data
    for t in tenants:
        print(t.get('id'), t.get('name'))
asyncio.run(main())
