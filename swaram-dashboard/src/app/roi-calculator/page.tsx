"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Headset, ArrowRight, TrendingUp, Clock, DollarSign, Users, Zap, Phone } from "lucide-react";

const INDUSTRIES = [
  { id: "collections", label: "EMI Collections", efficiencyBoost: 0.45, humanCostMult: 1.2 },
  { id: "telesales", label: "Telesales / Lead Qualification", efficiencyBoost: 0.38, humanCostMult: 1.1 },
  { id: "support", label: "Customer Support", efficiencyBoost: 0.55, humanCostMult: 1.0 },
  { id: "appointments", label: "Appointment Scheduling", efficiencyBoost: 0.60, humanCostMult: 0.9 },
  { id: "reminders", label: "Payment Reminders", efficiencyBoost: 0.65, humanCostMult: 1.1 },
];

const PLANS = [
  { name: "ആരംഭം", nameEn: "Aarambham", price: 2999, minsIncluded: 500, overageRate: 4, maxCalls: 1000 },
  { name: "വികാസം", nameEn: "Vikaasam", price: 8999, minsIncluded: 2000, overageRate: 3, maxCalls: 10000 },
  { name: "സമൃദ്ധി", nameEn: "Samruddhi", price: 25000, minsIncluded: 10000, overageRate: 1.5, maxCalls: Infinity },
];

function formatINR(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

export default function ROICalculatorPage() {
  const [callVolume, setCallVolume] = useState(2000);
  const [avgDuration, setAvgDuration] = useState(3);
  const [humanCostPerCall, setHumanCostPerCall] = useState(85);
  const [industry, setIndustry] = useState("collections");

  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  const results = useMemo(() => {
    const ind = INDUSTRIES.find(i => i.id === industry)!;
    
    // Human cost
    const humanMonthlyCost = callVolume * humanCostPerCall * ind.humanCostMult;
    
    // Swaram cost
    const totalMinutes = callVolume * avgDuration;
    const plan = PLANS.find(p => callVolume <= p.maxCalls) ?? PLANS[2];
    const overageMinutes = Math.max(0, totalMinutes - plan.minsIncluded);
    const aiMonthlyCost = plan.price + (overageMinutes * plan.overageRate);
    
    // Savings
    const monthlySavings = humanMonthlyCost - aiMonthlyCost;
    const annualSavings = monthlySavings * 12;
    const roi = (monthlySavings / aiMonthlyCost) * 100;
    const paybackDays = Math.max(0, (aiMonthlyCost / (humanMonthlyCost / 30)));
    const humanAgentsNeeded = Math.ceil(callVolume / 150); // ~150 calls/agent/month
    
    return {
      humanMonthlyCost,
      aiMonthlyCost,
      monthlySavings,
      annualSavings,
      roi,
      paybackDays,
      humanAgentsNeeded,
      plan,
      efficiencyBoost: ind.efficiencyBoost,
    };
  }, [callVolume, avgDuration, humanCostPerCall, industry]);

  return (
    <main>
      

      <div className="pt-28 pb-20 px-6">
        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6">
            <TrendingUp className="w-3.5 h-3.5 text-[#FFD166]" />
            <span className="text-xs text-gray-400">ROI Calculator · Real estimates</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5">
            Calculate your <span className="text-gradient">Swaram ROI</span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Enter your current call volume and costs. See exactly how much you'll save
            switching to Swaram AI voice agents — in under 30 seconds.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Calculator Inputs */}
          <div className="space-y-6">
            <div className="glass-card p-8">
              <h2 className="text-xl font-bold mb-6">Your current setup</h2>
              
              {/* Industry */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Industry / Use Case</label>
                <div className="grid grid-cols-1 gap-2">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind.id}
                      onClick={() => setIndustry(ind.id)}
                      className={`px-4 py-3 rounded-xl text-sm text-left transition-all ${
                        industry === ind.id
                          ? "bg-[#FFD166]/15 border border-[#FFD166]/40 text-white"
                          : "bg-white/3 border border-white/8 text-gray-400 hover:border-white/15"
                      }`}
                    >
                      {ind.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Volume */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly call volume: <span className="text-[#FFD166]">{callVolume.toLocaleString()} calls</span>
                </label>
                <input
                  type="range"
                  min={500}
                  max={50000}
                  step={500}
                  value={callVolume}
                  onChange={e => setCallVolume(Number(e.target.value))}
                  className="w-full accent-[#FFD166]"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>500</span><span>50,000</span>
                </div>
              </div>

              {/* Avg Duration */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Avg call duration: <span className="text-[#FFD166]">{avgDuration} minutes</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={avgDuration}
                  onChange={e => setAvgDuration(Number(e.target.value))}
                  className="w-full accent-[#FFD166]"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>1 min</span><span>10 min</span>
                </div>
              </div>

              {/* Human Cost */}
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current cost per call (human agent): <span className="text-[#FFD166]">₹{humanCostPerCall}</span>
                </label>
                <input
                  type="range"
                  min={20}
                  max={300}
                  step={5}
                  value={humanCostPerCall}
                  onChange={e => setHumanCostPerCall(Number(e.target.value))}
                  className="w-full accent-[#FFD166]"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>₹20</span><span>₹300</span>
                </div>
              </div>
              <p className="text-xs text-gray-600">Includes salary, overhead, training, and attrition costs</p>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="glass-card p-8 glow-accent relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFD166]/5 to-transparent" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <Zap className="w-5 h-5 text-[#FFD166]" />
                  <h2 className="text-xl font-bold">Your ROI with Swaram</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="text-xs text-gray-500 mb-1">Human agents needed</div>
                    <div className="text-2xl font-bold text-white">{results.humanAgentsNeeded}</div>
                  </div>
                  <div className="bg-[#FFD166]/10 rounded-xl p-4 border border-[#FFD166]/20">
                    <div className="text-xs text-gray-400 mb-1">With Swaram</div>
                    <div className="text-2xl font-bold text-[#FFD166]">1 AI</div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/3">
                    <span className="text-sm text-gray-400 flex items-center gap-2"><Users className="w-4 h-4" /> Human cost/month</span>
                    <span className="font-semibold">{formatINR(results.humanMonthlyCost)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-[#FFD166]/8 border border-[#FFD166]/15">
                    <span className="text-sm text-gray-300 flex items-center gap-2"><Phone className="w-4 h-4 text-[#FFD166]" /> Swaram cost/month <span className="text-[10px] text-gray-500">({results.plan.name} plan)</span></span>
                    <span className="font-semibold text-[#FFD166]">{formatINR(results.aiMonthlyCost)}</span>
                  </div>
                </div>

                <div className="border-t border-white/8 pt-5 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monthly savings</span>
                    <span className="text-xl font-bold text-gradient">{formatINR(results.monthlySavings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Annual savings</span>
                    <span className="text-2xl font-bold text-gradient">{formatINR(results.annualSavings)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ROI</span>
                    <span className="text-xl font-bold text-green-400">{results.roi > 0 ? `+${Math.round(results.roi)}%` : "0%"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Efficiency gain</span>
                    <span className="text-[#FFD166] font-semibold">+{Math.round(results.efficiencyBoost * 100)}% output</span>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-[#FFD166]/8 border border-[#FFD166]/15 text-center">
                  <div className="text-xs text-gray-400 mb-1">Recommended plan</div>
                  <div className="text-xl font-bold text-[#FFD166]">{results.plan.name}</div>
                  <div className="text-xs text-gray-500">{results.plan.nameEn} · ₹{results.plan.price.toLocaleString()}/mo</div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold mb-3 text-gray-300">Assumptions</h3>
              <ul className="space-y-1.5 text-xs text-gray-600">
                <li>· Human agent handles ~150 calls/month (including breaks, training, attrition)</li>
                <li>· AI handles 10,000+ concurrent calls, no breaks, no attrition</li>
                <li>· Cost includes Indian PSTN — no separate telephony account needed</li>
                <li>· Efficiency boost is conservative (real deployments show higher gains)</li>
                <li>· These are estimates — actual savings depend on your specific setup</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Link href="/pricing" className="flex-1 cta-btn-outline justify-center text-center !py-3">See Plans</Link>
              <Link href="/contact" className="flex-1 cta-btn justify-center text-center !py-3"><TrendingUp className="w-4 h-4" /> Book ROI Analysis</Link>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="max-w-4xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-center mb-10">What our customers <span className="text-gradient">actually saved</span></h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { co: "NBFC, Thrissur", saved: "₹48L/year", calls: "5L calls/month", quote: "Our EMI recovery jumped 38% and we cut our collections team by 60%." },
              { co: "EdTech, Kochi", saved: "₹22L/year", calls: "8,000 calls/day", quote: "Swaram qualified more leads in one week than our 40-person team did in a month." },
              { co: "Clinic Chain, Kozhikode", saved: "₹14L/year", calls: "3,000 appts/month", quote: "65% of appointments now booked via AI with zero missed calls. CSAT went from 72 to 89." },
            ].map((t, i) => (
              <div key={i} className="glass-card p-6">
                <p className="text-sm text-gray-300 italic leading-relaxed mb-4">"{t.quote}"</p>
                <div className="text-xs text-gray-500">{t.co}</div>
                <div className="text-lg font-bold text-gradient mt-1">{t.saved} saved</div>
                <div className="text-xs text-gray-600">{t.calls}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      
    </main>
  );
}
