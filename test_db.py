import asyncio
from db import get_all_calls, get_contacts
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    try:
        print("Fetching calls...")
        calls = await get_all_calls(1, 10, 'all')
        print(f"Calls: {len(calls)}")
    except Exception as e:
        print(f"Call error: {type(e).__name__}: {str(e)}")

    try:
        print("Fetching contacts...")
        contacts = await get_contacts('all')
        print(f"Contacts: {len(contacts)}")
    except Exception as e:
        print(f"Contact error: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())
