"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Shield, ShieldCheck, CheckCircle, DollarSign, TrendingUp } from "lucide-react";

export default function InsuranceCaseStudyPage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main className="pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 text-xs text-gray-400">
          <span className="text-[#FFD166] font-semibold uppercase tracking-widest text-[10px]">Case Study</span> · Insurance Renewals
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          3.1x renewal rate.<br /><span className="text-gradient">At just ₹8 per call.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          How a Kochi-based motor insurance brokerage automated policy renewal reminders and increased retention without expanding their BPO team.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
          <div className="glass-card p-6 border-[#FFD166]/20 bg-[#FFD166]/5">
            <div className="text-3xl font-bold text-gradient mb-1">3.1x</div>
            <div className="text-sm text-gray-400">Increase in renewal conversion</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">₹8</div>
            <div className="text-sm text-gray-400">Average cost per connected call</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">10,000+</div>
            <div className="text-sm text-gray-400">Automated reminders sent monthly</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="glass-card p-8 md:p-12 space-y-10">
          
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-gray-500" /> The Challenge
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              An insurance brokerage was losing existing customers to competitors because their human agents couldn't call everyone 30 days prior to policy expiry. SMS and email reminders had a mere 3% click-through rate, leading to severe portfolio leakage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-[#FFD166]" /> The Swaram Solution
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Integrated with their Zoho CRM, Swaram now automatically calls policyholders exactly 30, 15, and 3 days before their motor insurance expires.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 my-6 font-mono text-sm text-gray-300">
              <div className="mb-2"><span className="text-[#FFD166]">Swaram AI:</span> "Hello, this is calling from [Broker]. Your Hyundai i20 insurance expires next week. Do you want to renew it with the same coverage for ₹12,000?"</div>
              <div className="mb-2"><span className="text-blue-400">Customer:</span> "Yes, send me the link."</div>
              <div><span className="text-[#FFD166]">Swaram AI:</span> "Great, I have sent the Razorpay link to your WhatsApp. Please let me know once you have paid so I can issue the policy document."</div>
            </div>
            <p className="text-gray-300 leading-relaxed">
              For customers demanding discounts or policy changes, Swaram smoothly transfers the call to a specialized human retention agent, ensuring high-value cases are never lost.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-green-400" /> The Results
            </h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              The brokerage achieved 100% account coverage for renewals at a fraction of their previous BPO cost, driving up retention and customer lifetime value.
            </p>
          </section>

        </div>
      </div>

      <div className="max-w-3xl mx-auto text-center mt-20">
        <h2 className="text-3xl font-bold mb-4">Automate your policy renewals</h2>
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/solutions/insurance" className="cta-btn-outline">View Insurance Solutions <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/contact" className="cta-btn">Book a Demo</Link>
        </div>
      </div>
    </main>
  );
}
