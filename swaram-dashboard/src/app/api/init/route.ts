import { NextResponse } from "next/server";

export async function GET() {
  const SUPABASE_URL = "https://stpifofxuhgbjoqsnbpi.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0cGlmb2Z4dWhnYmpvcXNuYnBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI1MzQ0NywiZXhwIjoyMDkzODI5NDQ3fQ.JUSgOdA-OwlzaxkgiFBOdav8s8IJTywQzSrztRGUmhI";

  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
  };

  const INDUSTRY_PROMPTS = {
    "Banking & Finance": "You are a professional AI banking assistant for Swaram Finance. You help with EMI collections, loan status, fraud alerts, and account balances. Keep responses concise, professional, and secure. Speak in the user's preferred language.",
    "Automobile": "You are an AI assistant for Swaram Motors. You help customers book test drives, schedule service appointments, and handle insurance renewals. Be polite, enthusiastic, and helpful.",
    "Healthcare": "You are a caring AI medical receptionist for Swaram Health. You help patients book appointments, send lab result notifications, and manage prescription refills. Be empathetic, clear, and prioritize patient privacy.",
    "EdTech": "You are a helpful AI counselor for Swaram Education. You assist students with course enrollment, class reminders, and fee payments. Be encouraging and informative.",
    "Retail & E-commerce": "You are a friendly AI shopping assistant for Swaram Retail. You help customers track orders, process returns, and discover promotional offers. Be upbeat and customer-focused.",
    "Logistics": "You are an efficient AI logistics coordinator for Swaram Deliveries. You provide real-time delivery updates, schedule pickups, and collect feedback. Be precise and clear.",
    "Travel & Hospitality": "You are a welcoming AI concierge for Swaram Travels. You assist with booking confirmations, itinerary updates, and check-in reminders. Be hospitable and helpful.",
    "Government": "You are a formal AI citizen service representative for Swaram Civic Services. You inform citizens about schemes, schedule appointments, and collect feedback. Be respectful and clear."
  };

  const demo_leads = [
    { name: "Ananya Sharma", phone: "+919876543210", email: "ananya.s@example.com" },
    { name: "Rahul Verma", phone: "+918765432109", email: "rahul.v@example.com" },
    { name: "Sneha Krishnan", phone: "+917654321098", email: "sneha.k@example.com" },
    { name: "Vikram Singh", phone: "+916543210987", email: "vikram.s@example.com" },
    { name: "Priya Patel", phone: "+915432109876", email: "priya.p@example.com" }
  ];

  try {
    let profilesInserted = 0;
    let leadsInserted = 0;

    // 1. Insert Agent Profiles
    for (const [name, prompt] of Object.entries(INDUSTRY_PROMPTS)) {
      // check if exists
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/agent_profiles?name=eq.${encodeURIComponent(name)}`, { headers });
      const checkData = await checkRes.json();
      
      if (checkData.length === 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/agent_profiles`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: crypto.randomUUID(),
            name: name,
            voice: "Aoede",
            model: "gemini-2.0-flash-exp",
            system_prompt: prompt,
            enabled_tools: "[]",
            is_default: false,
            created_at: new Date().toISOString()
          })
        });
        profilesInserted++;
      }
    }

    // 2. Insert Leads
    for (const lead of demo_leads) {
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/contacts?phone=eq.${encodeURIComponent(lead.phone)}`, { headers });
      const checkData = await checkRes.json();

      if (checkData.length === 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/contacts`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: crypto.randomUUID(),
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            created_at: new Date().toISOString()
          })
        });
        leadsInserted++;
      }
    }

    return NextResponse.json({ success: true, profilesInserted, leadsInserted });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
