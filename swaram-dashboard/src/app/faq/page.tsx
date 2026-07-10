"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Search, Headset, ArrowRight, MessageSquare, DollarSign, Code, Shield, Globe, Zap } from "lucide-react";

const CATEGORIES = [
  { id: "general", label: "General", icon: MessageSquare },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "technical", label: "Technical", icon: Code },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "languages", label: "Languages", icon: Globe },
  { id: "getting-started", label: "Getting Started", icon: Zap },
];

const FAQS: Record<string, { q: string; a: string }[]> = {
  general: [
    { q: "What is Swaram AI?", a: "Swaram AI is an AI voice agent platform built for Indian businesses. We handle outbound and inbound phone calls in 12 Indian languages — from Malayalam and Tamil to Hindi and Punjabi — with human-like, real-time conversations. Businesses use Swaram to automate collections, telesales, appointment bookings, customer support, and more at scale." },
    { q: "How is Swaram different from a chatbot or IVR?", a: "Swaram makes real phone calls — not chat messages. Our AI agents hold natural, open-ended voice conversations, detect emotion, handle objections, and transfer to a live agent when needed. Unlike IVR (press 1 for...), Swaram understands free-form speech and responds intelligently in the customer's native language." },
    { q: "What types of businesses use Swaram?", a: "NBFCs and gold loan companies (EMI collections), clinics and hospitals (appointment booking), vehicle dealerships (test drive scheduling, service reminders), EdTech platforms (lead qualification), real estate firms (site visit booking), logistics companies (NDR resolution), and e-commerce brands (COD confirmation, RTO reduction)." },
    { q: "Can I try Swaram before committing?", a: "Yes. We'll run a demo call to your own mobile number so you can experience the voice agent firsthand. No credit card required. Most teams are impressed within the first 2 minutes." },
    { q: "How quickly can I go live?", a: "Most businesses are live within 7 days. If your script is ready and contacts are uploaded, you can launch your first campaign the same day. Our onboarding team helps you configure and test everything." },
  ],
  pricing: [
    { q: "What does Swaram cost?", a: "We have three plans: ആരംഭം (Aarambham) at ₹2,999/month — perfect for small businesses testing AI voice. വികാസം (Vikaasam) at ₹8,999/month — for growing teams. സമൃദ്ധി (Samruddhi) — custom pricing for enterprises and large contact centres." },
    { q: "Is telephony (phone call cost) included in the price?", a: "Yes — unlike US-based platforms that require you to connect your own Twilio account, Swaram includes Indian PSTN calling in your per-minute rate. You don't pay separately for the phone connection." },
    { q: "What counts as a billable minute?", a: "Minutes are counted from when the call is answered to when it ends, rounded up to the nearest minute. Unanswered calls and voicemails shorter than 10 seconds are not billed." },
    { q: "Can I change my plan mid-month?", a: "Yes. You can upgrade at any time — it takes effect immediately. Downgrades take effect at the next billing cycle. Unused included minutes do not roll over." },
    { q: "Are there any setup fees or contracts?", a: "No setup fees, no long-term contracts, no credit card required to start. Cancel anytime from your dashboard. We earn your business every month." },
  ],
  technical: [
    { q: "Which languages does Swaram support?", a: "Swaram supports 12 Indian languages: Malayalam, Hindi, Tamil, Telugu, Kannada, Marathi, Gujarati, Bengali, Punjabi, Odia, Urdu, and English. One agent can detect and switch between languages automatically based on the customer's response." },
    { q: "How human-like does the voice sound?", a: "Very. Swaram uses emotion-aware text-to-speech with sub-300ms response latency, trained on native Indian dialects. Customers regularly complete full conversations without realizing they're speaking to an AI." },
    { q: "Can Swaram integrate with my CRM or existing systems?", a: "Yes. All plans support webhook notifications. Vikaasam adds CRM integrations (Zoho, Salesforce, GoHighLevel). Samruddhi includes full REST API access, custom CBS integrations, and dedicated engineering support." },
    { q: "What happens if a customer wants to speak to a human?", a: "Swaram supports warm call transfer — the AI can hand off to a live human agent mid-conversation, with the full call context passed along. This is available on Vikaasam and Samruddhi plans." },
    { q: "Can I fully customize the agent's script and behaviour?", a: "Yes. Our no-code Agent Builder lets you configure the script, handle objections, define call outcomes, set retry logic, and connect custom APIs — all from the dashboard. No developer needed for standard configurations." },
  ],
  compliance: [
    { q: "Is Swaram TRAI/DND compliant?", a: "Yes. Every campaign runs through DND/NCPR scrubbing before any call is made. Calling windows are enforced automatically (no calls before 9 AM or after 9 PM). Consent logging and audit trails are built into every plan." },
    { q: "Are calls recorded and is there a transcript?", a: "Yes — call recordings and full transcripts are available on Vikaasam and Samruddhi plans. Recordings are stored securely and accessible from your dashboard. Samruddhi includes 2-year retention for compliance-heavy sectors." },
    { q: "How is customer data protected?", a: "All data is encrypted at rest and in transit. We follow DPDP-era consent design principles — every contact's opt-in status is tracked. We do not sell or share customer data with third parties." },
    { q: "Is Swaram suitable for RBI-regulated collections (NBFCs, banks)?", a: "Yes. Our collections script templates are designed to follow RBI Fair Practices Code guidelines. We maintain call recordings, respect debt collection windows, and avoid prohibited collection practices." },
    { q: "Can Swaram make calls at any hour?", a: "No — and that's a feature. Calling windows are hard-enforced by the system. By default, calls are only placed between 9 AM and 9 PM IST. Enterprise clients can configure custom windows within regulatory limits." },
  ],
  languages: [
    { q: "Can a single Swaram agent speak multiple languages?", a: "Yes. Agents auto-detect the customer's language from the first few words and switch naturally. You can configure primary and fallback languages per campaign." },
    { q: "Do you support regional dialects?", a: "Yes. On the Samruddhi (Enterprise) plan, we support dialect fine-tuning — Malabar-style Malayalam, Chettinad Tamil, Bundelkhandi Hindi, and more. Standard plans use general dialect training which covers 90%+ of customer interactions." },
    { q: "Can I use Hinglish (Hindi + English mix)?", a: "Yes, Hinglish is fully supported and is in fact our best-performing mode for Northern India campaigns. The agent naturally blends Hindi and English as the customer's responses indicate preference." },
    { q: "Can customers switch languages mid-call?", a: "Yes. If a customer starts in Hindi but switches to Malayalam, the agent detects this within 1-2 sentences and follows suit seamlessly. This is especially powerful for bilingual cities like Bengaluru, Mumbai, and Kochi." },
  ],
  "getting-started": [
    { q: "How do I set up my first campaign?", a: "1) Sign up or contact us. 2) Add your contacts via CSV upload. 3) Use the Agent Builder to configure your script and voice. 4) Set your campaign schedule. 5) Launch. Most teams complete this in under 30 minutes with our guided onboarding." },
    { q: "Do I need a developer or technical team?", a: "No. Swaram is designed to be operated by sales, operations, or customer service teams — no coding required. Developers can optionally use our REST API for advanced integrations." },
    { q: "Can I import my existing customer contact list?", a: "Yes. CSV import is available on Vikaasam and Samruddhi plans. We support standard fields and will run DND scrubbing on your list before the first call goes out." },
    { q: "What happens when a call fails or goes to voicemail?", a: "Failed calls are automatically retried at configurable intervals (e.g. 2 hours, 24 hours, 48 hours). Voicemail detection is built in — Swaram can leave a custom voice message or mark the contact for manual follow-up." },
    { q: "What onboarding support is included?", a: "Every plan includes an onboarding call with our team. We'll help you configure your first agent, set up your campaign, and do a test run before going live. Samruddhi clients get a dedicated account manager throughout." },
  ],
};

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState("general");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  const currentFaqs = FAQS[activeCategory] ?? [];
  const filtered = search
    ? Object.values(FAQS).flat().filter(f =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
      )
    : currentFaqs;

  return (
    <main>
      

      <div className="pt-28 pb-20 px-6">
        {/* Hero */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Frequently asked <span className="text-gradient">questions</span>
          </h1>
          <p className="text-gray-400 mb-8">Everything you need to know about Swaram AI voice agents.</p>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={e => { setSearch(e.target.value); setOpenFaq(null); }}
              className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-5 py-3.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#FFD166]/40 transition-colors"
            />
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Category Tabs */}
          {!search && (
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setOpenFaq(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? "bg-[#FFD166] text-black"
                      : "bg-white/5 border border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* FAQs */}
          <div className="space-y-3">
            {search && filtered.length === 0 && (
              <div className="text-center text-gray-500 py-10">No results found for "{search}"</div>
            )}
            {filtered.map((faq, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left group"
                >
                  <span className="font-medium text-sm pr-4 group-hover:text-[#FFD166] transition-colors">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180 text-[#FFD166]" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="glass-card p-8 mt-12 text-center glow-accent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFD166]/5 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
              <p className="text-gray-400 text-sm mb-6">Our team typically responds within 2 hours on business days. Or try the live demo right now.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/contact" className="cta-btn"><MessageSquare className="w-4 h-4" /> Talk to Us</Link>
                <Link href="/roi-calculator" className="cta-btn-outline">Calculate ROI <ArrowRight className="w-4 h-4" /></Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </main>
  );
}
