import asyncio
import os
from dotenv import load_dotenv

load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")

from supabase import create_client
client = create_client(supabase_url, supabase_key)
result = client.table("settings").select("key, value").execute()

for row in result.data:
    if "S3" in row["key"] or "AWS" in row["key"]:
        val = row["value"]
        print(f"KEY: {row['key']}, LEN: {len(val) if val else 0}")
