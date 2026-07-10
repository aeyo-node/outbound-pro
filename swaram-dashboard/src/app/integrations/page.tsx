"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, Code, Zap, CheckCircle, Globe, BarChart3, MessageSquare, ShoppingCart, Calendar, Users, CreditCard } from "lucide-react";

const CATEGORIES = [
  {
    id: "crm",
    label: "CRM & Sales",
    icon: Users,
    color: "from-blue-500/20 to-blue-600/5",
    integrations: [
      { name: "Zoho CRM", desc: "Sync contacts, log calls, update deal stages automatically", plan: "Vikaasam+", logo: "Z" },
      { name: "Salesforce", desc: "Full bidirectional sync with Salesforce objects and flows", plan: "Samruddhi", logo: "S" },
      { name: "HubSpot", desc: "Log call outcomes, trigger workflows, update contact properties", plan: "Vikaasam+", logo: "H" },
      { name: "Freshdesk", desc: "Create tickets automatically from call outcomes", plan: "Vikaasam+", logo: "F" },
      { name: "LeadSquared", desc: "India's leading sales CRM — native integration for lead qualification", plan: "Vikaasam+", logo: "L" },
      { name: "GoHighLevel", desc: "Trigger GHL automations based on call outcomes and disposition", plan: "Vikaasam+", logo: "G" },
    ],
  },
  {
    id: "calendar",
    label: "Scheduling",
    icon: Calendar,
    color: "from-purple-500/20 to-purple-600/5",
    integrations: [
      { name: "Cal.com", desc: "Book appointments directly into Cal.com calendars mid-call", plan: "Vikaasam+", logo: "C" },
      { name: "Google Calendar", desc: "Check availability and book slots in real-time during calls", plan: "Vikaasam+", logo: "G" },
      { name: "Calendly", desc: "Book Calendly slots for demos, site visits, or consultations", plan: "Samruddhi", logo: "C" },
      { name: "Zoho Bookings", desc: "Integrate with Zoho Bookings for service appointment scheduling", plan: "Samruddhi", logo: "Z" },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icon: CreditCard,
    color: "from-green-500/20 to-green-600/5",
    integrations: [
      { name: "Razorpay", desc: "Send payment links mid-call, confirm payment status in real-time", plan: "Samruddhi", logo: "R" },
      { name: "PayU", desc: "Trigger payment reminders linked to PayU invoices", plan: "Samruddhi", logo: "P" },
      { name: "CCAvenue", desc: "EMI confirmation and payment status verification calls", plan: "Samruddhi", logo: "C" },
      { name: "Cashfree", desc: "Auto-trigger calls on failed payment events from Cashfree", plan: "Samruddhi", logo: "C" },
    ],
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    icon: ShoppingCart,
    color: "from-orange-500/20 to-orange-600/5",
    integrations: [
      { name: "Shopify", desc: "COD confirmation, cart recovery, and RTO reduction calls", plan: "Vikaasam+", logo: "S" },
      { name: "WooCommerce", desc: "Order confirmation and failed delivery resolution automation", plan: "Vikaasam+", logo: "W" },
      { name: "Unicommerce", desc: "NDR management and delivery exception handling", plan: "Samruddhi", logo: "U" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    color: "from-yellow-500/20 to-yellow-600/5",
    integrations: [
      { name: "Google Analytics", desc: "Track campaign events, call outcomes as GA4 events", plan: "All", logo: "G" },
      { name: "Mixpanel", desc: "Funnel analysis with call touch-point data", plan: "Samruddhi", logo: "M" },
      { name: "Metabase", desc: "Custom dashboards connecting call data to your data warehouse", plan: "Samruddhi", logo: "M" },
    ],
  },
  {
    id: "communication",
    label: "Messaging",
    icon: MessageSquare,
    color: "from-teal-500/20 to-teal-600/5",
    integrations: [
      { name: "WhatsApp Business", desc: "Send follow-up WhatsApp messages after call outcomes", plan: "Vikaasam+", logo: "W" },
      { name: "Slack", desc: "Receive real-time call outcome notifications in Slack channels", plan: "All", logo: "S" },
      { name: "Telegram", desc: "Bot notifications for call events and campaign summaries", plan: "All", logo: "T" },
    ],
  },
];

const PLAN_COLORS: Record<string, string> = {
  "All": "bg-white/10 text-gray-400",
  "Vikaasam+": "bg-[#FFD166]/15 text-[#FFD166]",
  "Samruddhi": "bg-blue-500/15 text-blue-400",
};

export default function IntegrationsPage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main>
      

      <div className="pt-28 pb-20 px-6">
        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6">
            <Zap className="w-3.5 h-3.5 text-[#FFD166]" />
            <span className="text-xs text-gray-400">30+ integrations · REST API · Webhooks</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5">
            Connect Swaram to <span className="text-gradient">your stack</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Swaram plugs into the tools your team already uses. CRMs, calendars, payments, e-commerce —
            no dev team required for standard integrations.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 text-[#FFD166]" /> No-code setup for most integrations
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 text-[#FFD166]" /> REST API for custom workflows
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <CheckCircle className="w-4 h-4 text-[#FFD166]" /> Real-time webhooks on all events
            </div>
          </div>
        </div>

        {/* Plan Legend */}
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-3 mb-12">
          {Object.entries(PLAN_COLORS).map(([plan, cls]) => (
            <span key={plan} className={`text-xs font-medium px-3 py-1 rounded-full ${cls}`}>{plan} plan</span>
          ))}
        </div>

        {/* Integration Categories */}
        <div className="max-w-6xl mx-auto space-y-16 mb-20">
          {CATEGORIES.map((cat, ci) => (
            <div key={ci}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-[#FFD166]/10 flex items-center justify-center">
                  <cat.icon className="w-4.5 h-4.5 text-[#FFD166]" />
                </div>
                <h2 className="text-xl font-bold">{cat.label}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.integrations.map((int, ii) => (
                  <div key={ii} className={`glass-card p-6 bg-gradient-to-br ${cat.color}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sm font-bold text-white border border-white/10">
                        {int.logo}
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${PLAN_COLORS[int.plan]}`}>{int.plan}</span>
                    </div>
                    <h3 className="font-semibold mb-1.5">{int.name}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{int.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* API Section */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="glass-card p-10 md:p-12 glow-accent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFD166]/5 to-transparent" />
            <div className="relative z-10 flex flex-col md:flex-row items-start gap-8">
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-[#FFD166]/15 flex items-center justify-center">
                <Code className="w-7 h-7 text-[#FFD166]" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-widest text-[#FFD166] mb-2">Samruddhi Plan</div>
                <h2 className="text-2xl font-bold mb-3">REST API & Webhooks</h2>
                <p className="text-gray-400 leading-relaxed mb-6">
                  Build custom integrations with Swaram's full REST API. Trigger calls programmatically, 
                  stream call events to your systems in real-time via webhooks, and build custom AI agent 
                  workflows tailored to your business logic.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    "Trigger calls via API",
                    "Real-time event webhooks",
                    "Custom function calls",
                    "Campaign management API",
                    "Contact list API",
                    "Analytics data export",
                    "Agent config API",
                    "Transcript streaming",
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                      <CheckCircle className="w-3.5 h-3.5 text-[#FFD166] shrink-0" />{f}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Link href="/pricing" className="cta-btn !text-sm !py-2.5 !px-5"><Globe className="w-4 h-4" /> View Samruddhi Plan</Link>
                  <Link href="/contact" className="cta-btn-outline !text-sm !py-2.5 !px-5">Request API Docs <ArrowRight className="w-4 h-4" /></Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Integration CTA */}
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-3">Don't see your tool?<br /><span className="text-gradient">We'll build it.</span></h2>
          <p className="text-gray-400 text-sm mb-6">Our team has built custom integrations for CBS (Core Banking Systems), hospital management software, LMS platforms, and more. Reach out and we'll scope it.</p>
          <Link href="/contact" className="cta-btn">Request a Custom Integration <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </div>

      
    </main>
  );
}
