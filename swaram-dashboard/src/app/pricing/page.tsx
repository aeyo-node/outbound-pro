"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, X, ChevronDown, Headset, ArrowRight, Zap, Phone, Shield } from "lucide-react";

const PLANS = [
  {
    name: "ആരംഭം",
    nameEn: "Aarambham",
    tagline: "Beginning",
    price: "₹2,999",
    period: "/mo",
    rate: "500 mins · ₹4/min overage",
    desc: "Perfect for small businesses testing AI voice automation for the first time.",
    badge: null,
    featured: false,
    cta: "Get Started",
    ctaHref: "/login",
    features: [
      "500 minutes included",
      "1 AI voice agent",
      "25 concurrent calls",
      "Malayalam, Hindi & English",
      "Basic analytics dashboard",
      "Email support",
      "Call recordings & transcripts",
      "Voicemail detection",
    ],
  },
  {
    name: "വികാസം",
    nameEn: "Vikaasam",
    tagline: "Growth",
    price: "₹8,999",
    period: "/mo",
    rate: "2,000 mins · ₹3/min overage",
    desc: "For growing teams scaling outbound voice operations across India.",
    badge: "Most Popular",
    featured: true,
    cta: "Start Free",
    ctaHref: "/login",
    features: [
      "2,000 minutes included",
      "10 AI voice agents",
      "100 concurrent calls",
      "All 12 Indian languages",
      "Campaign automation",
      "Custom functions API",
      "CRM integrations",
      "Priority support",
      "Call transfer & IVR flows",
      "Advanced analytics",
    ],
  },
  {
    name: "സമൃദ്ധി",
    nameEn: "Samruddhi",
    tagline: "Enterprise",
    price: "Custom",
    period: "",
    rate: "10,000+ mins · ₹1.5/min",
    desc: "Custom deployments for enterprises, NBFCs, and large contact centres.",
    badge: "Best Value",
    featured: false,
    cta: "Contact Sales",
    ctaHref: "/contact",
    features: [
      "Custom included minutes",
      "Unlimited AI agents",
      "10,000+ concurrent calls",
      "All 12 languages + dialects",
      "Custom SIP/PSTN integration",
      "Private cloud / on-prem option",
      "24/7 dedicated support",
      "Custom SLA & compliance",
      "Agent memory & cross-call context",
      "Dedicated account manager",
    ],
  },
];

const COMPARISON_ROWS = [
  { category: "Capacity", rows: [
    { feature: "AI agents", aarambham: "1", vikaasam: "10", samruddhi: "Unlimited" },
    { feature: "Concurrent calls", aarambham: "25", vikaasam: "100", samruddhi: "10,000+" },
    { feature: "Included minutes", aarambham: "500", vikaasam: "2,000", samruddhi: "Custom" },
    { feature: "Overage rate", aarambham: "₹4/min", vikaasam: "₹3/min", samruddhi: "₹1.5/min" },
  ]},
  { category: "Voice & Language", rows: [
    { feature: "Languages", aarambham: "3 (ML, HI, EN)", vikaasam: "All 12", samruddhi: "All 12 + dialects" },
    { feature: "Voicemail detection", aarambham: true, vikaasam: true, samruddhi: true },
    { feature: "Dialect fine-tuning", aarambham: false, vikaasam: false, samruddhi: true },
  ]},
  { category: "Calls & Campaigns", rows: [
    { feature: "Campaign automation", aarambham: false, vikaasam: true, samruddhi: true },
    { feature: "Call transfer & IVR", aarambham: false, vikaasam: true, samruddhi: true },
    { feature: "Custom functions API", aarambham: false, vikaasam: true, samruddhi: true },
    { feature: "Inbound routing", aarambham: false, vikaasam: false, samruddhi: true },
    { feature: "Agent memory", aarambham: false, vikaasam: false, samruddhi: true },
  ]},
  { category: "Integrations", rows: [
    { feature: "CRM integrations", aarambham: false, vikaasam: true, samruddhi: true },
    { feature: "REST API access", aarambham: false, vikaasam: false, samruddhi: true },
    { feature: "Custom SIP/PSTN", aarambham: false, vikaasam: false, samruddhi: true },
  ]},
  { category: "Analytics & Compliance", rows: [
    { feature: "Analytics dashboard", aarambham: "Basic", vikaasam: "Advanced", samruddhi: "Full + custom" },
    { feature: "Call recordings", aarambham: true, vikaasam: true, samruddhi: true },
    { feature: "Consent logging", aarambham: true, vikaasam: true, samruddhi: true },
    { feature: "2-year recording retention", aarambham: false, vikaasam: false, samruddhi: true },
  ]},
  { category: "Support", rows: [
    { feature: "Support level", aarambham: "Email", vikaasam: "Priority", samruddhi: "24/7 Dedicated" },
    { feature: "Account manager", aarambham: false, vikaasam: false, samruddhi: true },
    { feature: "Custom SLA", aarambham: false, vikaasam: false, samruddhi: true },
  ]},
];

const FAQS = [
  { q: "Is there a free trial?", a: "Yes — start with a demo call on your own number. No credit card required. Our team will walk you through setting up your first campaign." },
  { q: "What counts as a 'minute'?", a: "A minute is billed from call connect to disconnect, rounded up to the nearest minute. Unanswered or voicemail calls under 10 seconds are not billed." },
  { q: "Can I switch plans mid-month?", a: "Yes. Upgrades take effect immediately. Downgrades take effect at the next billing cycle. Unused minutes do not roll over." },
  { q: "Are telephony (PSTN) costs included?", a: "Swaram includes its own telephony for Indian numbers. Unlike some platforms, we don't require you to connect a separate Twilio account — Indian calls are fully covered in your per-minute rate." },
  { q: "Do you have TRAI / DND compliance built in?", a: "Yes. All campaigns run through DND/NCPR scrubbing automatically. Consent logging, calling-window enforcement, and audit trails are included in every plan." },
];

function CheckOrX({ val }: { val: boolean | string }) {
  if (typeof val === "boolean") {
    return val
      ? <span className="text-[#FFD166] font-bold">✓</span>
      : <span className="text-gray-700">—</span>;
  }
  return <span className="text-sm text-gray-300">{val}</span>;
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main>
      

      <div className="pt-28 pb-20 px-6">
        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-16 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6">
            <span className="text-xs text-gray-400">Transparent pricing · INR billing · Cancel anytime</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5">
            Simple, honest{" "}
            <span className="text-gradient">pricing</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            INR-based plans. No hidden fees. No credit card to start.
            <br className="hidden md:block" />
            Indian PSTN included — no external telephony account needed.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm text-gray-500">
            <span>✓ No credit card to start</span>
            <span>✓ Cancel anytime</span>
            <span>✓ DND/NCPR compliant</span>
            <span>✓ TRAI-compliant calling</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                plan.featured
                  ? "bg-[#FFD166]/8 border-2 border-[#FFD166]/40 shadow-[0_0_60px_rgba(255,209,102,0.18)] scale-[1.02]"
                  : "bg-white/3 border border-white/8 hover:border-white/15 hover:shadow-lg"
              }`}
            >
              {plan.badge && (
                <div
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold tracking-wide ${
                    plan.featured
                      ? "bg-[#FFD166] text-black"
                      : "bg-white/10 text-gray-300 border border-white/20"
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <div className="text-2xl font-bold mb-0.5">{plan.name}</div>
                <div className="text-sm text-gray-500 mb-1">
                  {plan.nameEn} · {plan.tagline}
                </div>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className={`text-4xl font-bold ${plan.price === "Custom" ? "text-white" : "text-gradient"}`}>
                    {plan.price}
                  </span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{plan.rate}</div>
                <p className="text-sm text-gray-400 mt-3 leading-relaxed">{plan.desc}</p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.features.map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-[#FFD166] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`flex items-center justify-center gap-2 ${plan.featured ? "cta-btn" : "cta-btn-outline"}`}
              >
                {plan.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-5xl mx-auto mb-20" id="full-comparison">
          <h2 className="text-3xl font-bold text-center mb-10">
            Full <span className="text-gradient">feature comparison</span>
          </h2>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left p-4 text-gray-500 font-medium w-2/5">Feature</th>
                    <th className="p-4 text-center text-gray-300 font-semibold">
                      ആരംഭം
                      <br />
                      <span className="text-xs text-gray-600 font-normal">₹2,999/mo</span>
                    </th>
                    <th className="p-4 text-center font-semibold bg-[#FFD166]/5">
                      <span className="text-[#FFD166]">വികാസം</span>
                      <br />
                      <span className="text-xs text-gray-400 font-normal">₹8,999/mo</span>
                    </th>
                    <th className="p-4 text-center text-gray-300 font-semibold">
                      സമൃദ്ധി
                      <br />
                      <span className="text-xs text-gray-600 font-normal">Custom</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((section, si) => (
                    <>
                      <tr key={`cat-${si}`} className="bg-white/2">
                        <td
                          colSpan={4}
                          className="px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-gray-600"
                        >
                          {section.category}
                        </td>
                      </tr>
                      {section.rows.map((row, ri) => (
                        <tr
                          key={`row-${si}-${ri}`}
                          className="border-t border-white/5 hover:bg-white/2 transition-colors"
                        >
                          <td className="p-4 text-gray-400">{row.feature}</td>
                          <td className="p-4 text-center">
                            <CheckOrX val={row.aarambham} />
                          </td>
                          <td className="p-4 text-center bg-[#FFD166]/3">
                            <CheckOrX val={row.vikaasam} />
                          </td>
                          <td className="p-4 text-center">
                            <CheckOrX val={row.samruddhi} />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                  <tr className="border-t border-white/8">
                    <td className="p-4" />
                    <td className="p-4 text-center">
                      <Link href="/login" className="cta-btn-outline !text-xs !py-2 !px-4">
                        Get Started
                      </Link>
                    </td>
                    <td className="p-4 text-center bg-[#FFD166]/3">
                      <Link href="/login" className="cta-btn !text-xs !py-2 !px-4">
                        Start Free
                      </Link>
                    </td>
                    <td className="p-4 text-center">
                      <Link href="/contact" className="cta-btn-outline !text-xs !py-2 !px-4">
                        Contact Sales
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-center text-xs text-gray-600 mt-4">
            Higher tiers include all features of lower tiers unless noted. All plans include DND scrubbing, consent logging, and TRAI compliance.
          </p>
        </div>

        {/* Volume Pricing */}
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center mb-3">
            Volume <span className="text-gradient">per-minute rates</span>
          </h2>
          <p className="text-center text-gray-400 mb-10">
            The more you call, the less you pay. Overage rates scale with your plan tier.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: "Starter", range: "0 – 500 min", rate: "₹4 / min", color: "border-white/10" },
              { label: "Growth", range: "0 – 2,000 min", rate: "₹3 / min", color: "border-[#FFD166]/30" },
              { label: "Enterprise", range: "10,000+ min", rate: "₹1.5 / min", color: "border-white/10" },
            ].map((tier, i) => (
              <div
                key={i}
                className={`glass-card p-6 text-center border ${tier.color} ${i === 1 ? "bg-[#FFD166]/5" : ""}`}
              >
                <div className={`text-xs font-semibold uppercase tracking-widest mb-2 ${i === 1 ? "text-[#FFD166]" : "text-gray-500"}`}>
                  {tier.label}
                </div>
                <div className="text-3xl font-bold mb-1">{tier.rate}</div>
                <div className="text-xs text-gray-500">{tier.range}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 glass-card p-5 text-sm text-gray-400 leading-relaxed">
            <strong className="text-white">Included minutes</strong> are consumed first each month. Once exhausted, overage rates apply based on your plan. Indian PSTN termination is bundled — no separate carrier account needed. Rates shown are for outbound calls to Indian mobile and landline numbers.
          </div>
        </div>

        {/* Cost Examples */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center mb-3">
            What does <span className="text-gradient">1,000 calls</span> cost?
          </h2>
          <p className="text-center text-gray-400 mb-10">
            Estimates based on 3-minute average call duration in common deployment scenarios.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                scenario: "EMI Collections",
                plan: "Vikaasam",
                calls: "1,000",
                platform: "₹8,999",
                usage: "₹3,000 (1,000 min overage)",
                total: "~₹11,999/mo",
                perCall: "~₹12/call",
                icon: "🏦",
                note: "Replaces 3–5 human agents for routine EMI reminders",
              },
              {
                scenario: "EdTech Telesales",
                plan: "Vikaasam",
                calls: "1,000",
                platform: "₹8,999",
                usage: "₹3,000 (1,000 min overage)",
                total: "~₹11,999/mo",
                perCall: "~₹12/call",
                icon: "🎓",
                note: "Multilingual outreach across 12 states simultaneously",
              },
              {
                scenario: "Enterprise Contact Centre",
                plan: "Samruddhi",
                calls: "10,000+",
                platform: "Custom",
                usage: "₹1.5/min",
                total: "Custom quote",
                perCall: "<₹8/call",
                icon: "🏢",
                note: "10K+ concurrent calls, private cloud, custom SLA",
              },
            ].map((ex, i) => (
              <div key={i} className="glass-card p-6 flex flex-col gap-4">
                <div>
                  <div className="text-2xl mb-2">{ex.icon}</div>
                  <div className="font-semibold">{ex.scenario}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Plan: <span className="text-[#FFD166]">{ex.plan}</span> · {ex.calls} calls/mo
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Platform fee</span>
                    <span>{ex.platform}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Usage</span>
                    <span className="text-right">{ex.usage}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-white/8 pt-2 mt-2">
                    <span>Total/month</span>
                    <span className="text-gradient">{ex.total}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#FFD166]">
                    <span>Per call</span>
                    <span>{ex.perCall}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed border-t border-white/5 pt-3">{ex.note}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-6">
            * Estimates assume 3 min average call duration. Indian PSTN included. Actual costs may vary by use case.
          </p>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center mb-10">
            Pricing <span className="text-gradient">FAQs</span>
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/3 transition-colors"
                >
                  <span className="font-medium text-sm pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass-card p-10 glow-accent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFD166]/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-3">
                Not sure which plan?
                <br />
                <span className="text-gradient">Talk to our team.</span>
              </h2>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                We will analyse your call volume and recommend the most cost-effective
                setup for your business. No commitment required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/roi-calculator" className="cta-btn">
                  <Zap className="w-4 h-4" /> Calculate My ROI
                </Link>
                <Link href="/contact" className="cta-btn-outline">
                  Talk to Sales <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </main>
  );
}
