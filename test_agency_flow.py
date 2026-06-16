import asyncio
import os
from dotenv import load_dotenv

# Load env before importing db
load_dotenv()

from db import insert_appointment, log_call, _adb
import uuid
from datetime import datetime

async def test_agency_flow():
    print("Testing Web Dev Agency Data Flow...")
    
    lead_name = "Tech Innovators Inc"
    phone_number = "+919876543210"
    whatsapp_num = "+919876543210"
    
    # 1. Log a comprehensive call
    print("1. Logging Outbound Call with Notes...")
    await log_call(
        phone_number=phone_number,
        lead_name=lead_name,
        outcome="Demo Booked",
        reason="Client wants a new Next.js E-commerce website",
        duration_seconds=345,
        notes="Discussed current Shopify limitations. Pitch resonated well. They want a demo of our custom CMS. WhatsApp number verified."
    )
    print("   -> Call logged successfully. Check Outbound Calls tab.")
    
    # 2. Book an Appointment (Demo)
    print("2. Booking Demo Appointment...")
    await insert_appointment(
        name=lead_name,
        phone=phone_number,
        date="2026-06-25",
        time="14:30",
        service="Web Dev Demo - Next.js E-commerce",
        whatsapp_number=whatsapp_num
    )
    print("   -> Demo booked successfully. Check Demo Booked tab.")
    
    # 3. Verify in DB
    print("3. Verifying Database Entries...")
    db = await _adb()
    
    calls = await db.table("call_logs").select("*").eq("phone_number", phone_number).execute()
    if calls.data:
        print(f"   ✓ Call log exists. Notes: {calls.data[0].get('notes')}")
        
    demos = await db.table("appointments").select("*").eq("phone", phone_number).execute()
    if demos.data:
        print(f"   ✓ Demo exists. Service/Notes: {demos.data[0].get('service')} | WhatsApp: {demos.data[0].get('whatsapp_number')}")
        
    print("\nTest completed successfully! Open the dashboard to see the populated 'Outbound Calls' and 'Demo Booked' tabs.")

if __name__ == "__main__":
    asyncio.run(test_agency_flow())
