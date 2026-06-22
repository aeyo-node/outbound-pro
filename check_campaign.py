import asyncio
from db import get_campaign

async def main():
    campaign_id = "53e89fed-9a48-42df-9446-c52fd7bfd739"
    campaign = await get_campaign(campaign_id)
    print("Campaign:", campaign)

if __name__ == "__main__":
    asyncio.run(main())
