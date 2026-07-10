"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Headset, Mic } from "lucide-react";

const FEATURED = [
  {
    sector: "NBFC",
    vertical: "Collections",
    type: "B2B",
    headline: "38% higher EMI recovery. Zero compliance violations.",
    tagline: "From 48% recovery to 86% — automated, compliant, in Malayalam and Hindi.",
    metrics: [
      { val: "38%", lbl: "higher recovery rate" },
      { val: "₹180", lbl: "cost per recovery" },
      { val: "5L+", lbl: "calls/month" },
    ],
    location: "Mid-size NBFC · Thrissur, Kerala",
    href: "/case-studies/nbfc-emi-collections",
  },
  {
    sector: "EdTech",
    vertical: "Telesales",
    type: "B2C",
    headline: "4× lead conversion. In the languages students actually speak.",
    tagline: "Malayalam, Tamil, Hindi — Swaram qualified more leads in one week than 40 callers did in a month.",
    metrics: [
      { val: "4×", lbl: "lead conversion" },
      { val: "₹220", lbl: "cost per SQL" },
      { val: "8,000", lbl: "calls in one day" },
    ],
    location: "Online Education Platform · Kochi, Kerala",
    href: "/case-studies/edtech-telesales",
  },
];

const CASE_STUDIES = [
  {
    sector: "Healthcare",
    vertical: "Appointment Booking",
    type: "B2C",
    headline: "65% of appointments booked via AI. Zero missed calls.",
    metrics: [{ val: "65%", lbl: "queries automated" }, { val: "89", lbl: "CSAT score" }],
    location: "Kozhikode, Kerala",
    tags: ["Healthcare", "Malayalam"],
    href: "/case-studies/healthcare-appointments",
  },
  {
    sector: "Insurance",
    vertical: "Renewals",
    type: "B2C",
    headline: "3.1× renewal rate on motor policies. At ₹8 per call.",
    metrics: [{ val: "3.1×", lbl: "renewal conversion" }, { val: "₹8", lbl: "cost per call" }],
    location: "Kochi, Kerala",
    tags: ["Insurance", "IRDAI"],
    href: "/case-studies/insurance-renewals",
  },
  {
    sector: "Real Estate",
    vertical: "Site Visit Booking",
    type: "B2C",
    headline: "6× more site visit bookings from the same lead pool.",
    metrics: [{ val: "6×", lbl: "site visits booked" }, { val: "<3 min", lbl: "lead response time" }],
    location: "Thrissur, Kerala",
    tags: ["Real Estate", "Lead Qualification"],
    href: "/case-studies/real-estate-site-visits",
  },
  {
    sector: "Logistics",
    vertical: "Delivery Support",
    type: "B2B2C",
    headline: "NDR resolution rate jumped from 28% to 68%.",
    metrics: [{ val: "68%", lbl: "NDR resolution rate" }, { val: "₹4", lbl: "cost per call" }],
    location: "Ernakulam, Kerala",
    tags: ["Logistics", "NDR"],
    href: "/case-studies/logistics-delivery",
  },
  {
    sector: "Auto Dealership",
    vertical: "Test Drive & Service",
    type: "B2C",
    headline: "85% test drive show-up rate. Service reminders fully automated.",
    metrics: [{ val: "85%", lbl: "show-up rate" }, { val: "40%", lbl: "more service bookings" }],
    location: "Kozhikode, Kerala",
    tags: ["Auto", "Follow-up"],
    href: "/case-studies/vehicle-dealership",
  },
  {
    sector: "Finance",
    vertical: "Gold Loan Collections",
    type: "B2C",
    headline: "Gold loan renewal rate doubled in 90 days.",
    metrics: [{ val: "2×", lbl: "renewal rate" }, { val: "₹120", lbl: "cost per renewal" }],
    location: "Thrissur, Kerala",
    tags: ["Finance", "Gold Loan"],
    href: "/case-studies/gold-loan-collections",
  },
  {
    sector: "Training Centre",
    vertical: "Admissions",
    type: "B2C",
    headline: "5× inquiry-to-admission conversion with AI follow-ups.",
    metrics: [{ val: "5×", lbl: "conversion rate" }, { val: "200+", lbl: "daily automated calls" }],
    location: "Calicut, Kerala",
    tags: ["EdTech", "Admissions"],
    href: "/case-studies/training-admissions",
  },
];

const TYPE_COLORS: Record<string, string> = {
  B2B: "bg-blue-500/20 text-blue-400",
  B2C: "bg-green-500/20 text-green-400",
  "B2B2C": "bg-purple-500/20 text-purple-400",
};

export default function CaseStudiesPage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main>
      

      <div className="pt-28 pb-20 px-6">
        {/* Hero */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 text-xs text-gray-400">
            real deployments · real India
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Voice AI that works<br /><span className="text-gradient">where India works.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            From Thrissur NBFCs to Kochi EdTech platforms — real results from Indian businesses
            that deployed Swaram across collections, telesales, support, and more.
          </p>
          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-10">
            {[
              { val: "25+", lbl: "Indian businesses" },
              { val: "6 sectors", lbl: "Finance, EdTech, Auto..." },
              { val: "50 lakh+", lbl: "calls handled" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-gradient">{s.val}</div>
                <div className="text-xs text-gray-500 mt-1">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Cards */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6 mb-16">
          {FEATURED.map((cs, i) => (
            <Link key={i} href={cs.href}
              className="glass-card p-8 block group hover:no-underline relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFD166]/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-medium text-gray-400">{cs.sector} · {cs.vertical}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[cs.type]}`}>{cs.type}</span>
                </div>
                <h2 className="text-xl font-bold mb-2 group-hover:text-[#FFD166] transition-colors">{cs.headline}</h2>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">{cs.tagline}</p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {cs.metrics.map((m, mi) => (
                    <div key={mi}>
                      <div className="text-2xl font-bold text-gradient">{m.val}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{m.lbl}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{cs.location}</span>
                  <span className="text-sm text-[#FFD166] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">read story <ArrowRight className="w-3 h-3" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* All Case Studies Grid */}
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">all case studies</span>
            <div className="flex gap-2">
              {Object.entries(TYPE_COLORS).map(([type, cls]) => (
                <span key={type} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{type}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-20">
            {CASE_STUDIES.map((cs, i) => (
              <Link key={i} href={cs.href}
                className="glass-card p-6 block group hover:no-underline">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs font-medium text-gray-500">{cs.sector}</span>
                    <div className="text-[10px] text-gray-600">{cs.vertical}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[cs.type]}`}>{cs.type}</span>
                </div>
                <h3 className="text-sm font-semibold mb-4 leading-relaxed group-hover:text-[#FFD166] transition-colors">{cs.headline}</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {cs.metrics.map((m, mi) => (
                    <div key={mi}>
                      <div className="text-xl font-bold text-gradient">{m.val}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{m.lbl}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-600">{cs.location}</span>
                  <div className="flex gap-1.5">
                    {cs.tags.map(tag => (
                      <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-500">{tag}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-10 md:p-14 relative overflow-hidden glow-accent">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFD166]/5 to-transparent" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3">
                  Build your own<br /><span className="text-gradient">success story.</span>
                </h2>
                <p className="text-gray-400 max-w-lg">Swaram deploys in days, not months. No dev team required. Go live with your first AI voice campaign today.</p>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <Link href="#usecases" className="cta-btn"><Mic className="w-4 h-4" /> Try Live Demo</Link>
                  <Link href="/contact" className="cta-btn-outline">Talk to Sales <ArrowRight className="w-4 h-4" /></Link>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 shrink-0">
                {[
                  { val: "<7 days", lbl: "avg. time to first live call" },
                  { val: "₹2,999/mo", lbl: "starting price" },
                  { val: "100%", lbl: "TRAI-compliant from day one" },
                ].map((s, i) => (
                  <div key={i} className="text-right">
                    <div className="text-2xl font-bold text-gradient">{s.val}</div>
                    <div className="text-xs text-gray-500">{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </main>
  );
}
