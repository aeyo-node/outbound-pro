import asyncio
from db import get_all_calls, get_contacts
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    calls = await get_all_calls(1, 10, 'all')
    print("Calls:", len(calls))
    contacts = await get_contacts('all')
    print("Contacts:", len(contacts))

asyncio.run(main())
