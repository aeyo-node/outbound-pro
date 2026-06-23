import asyncio
from db import get_all_logs

async def main():
    logs = await get_all_logs(limit=20)
    for row in logs:
        if "Recording start failed" in str(row) or "Recording" in str(row) or "S3" in str(row) or "egress" in str(row):
            print(f"[{row.get('created_at')}] {row.get('level')} | {row.get('message')} | {row.get('details')}")

if __name__ == "__main__":
    asyncio.run(main())
