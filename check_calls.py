import asyncio
from dotenv import load_dotenv
load_dotenv()
from db import _adb
async def main():
    db = await _adb()
    calls = (await db.table('call_logs').select('tenant_id').limit(10).execute()).data
    print("CALL TENANTS:", calls)
    system_calls = (await db.table('call_logs').select('id', count='exact').eq('tenant_id', 'system').execute()).count
    client_calls = (await db.table('call_logs').select('id', count='exact').eq('tenant_id', '9a935105-38fc-4bc4-93b1-1eeab825168d').execute()).count
    null_calls = (await db.table('call_logs').select('id', count='exact').is_('tenant_id', 'null').execute()).count
    print(f"system: {system_calls}, client: {client_calls}, null: {null_calls}")
asyncio.run(main())
