import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# Fetch latest campaign
camps = sb.table("campaigns").select("*").order("created_at", desc=True).limit(1).execute()
if camps.data:
    import json
    c = camps.data[0]
    print(f"Campaign: {c['name']}")
    contacts = json.loads(c["contacts_json"])
    for i, ct in enumerate(contacts):
        print(f" Contact {i}: {ct}")
else:
    print("No campaigns found.")

# Fetch latest call log
calls = sb.table("call_logs").select("*").order("timestamp", desc=True).limit(1).execute()
if calls.data:
    c = calls.data[0]
    print(f"\nLatest call log:")
    print(f" Business: {c.get('business_name')}")
    print(f" Industry: {c.get('industry')}")
    print(f" Place: {c.get('place')}")
else:
    print("No calls found.")
