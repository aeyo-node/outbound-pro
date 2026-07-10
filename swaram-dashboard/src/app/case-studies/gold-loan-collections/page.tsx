"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Landmark, IndianRupee, ShieldCheck } from "lucide-react";

export default function GoldLoanCaseStudyPage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main className="pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 text-xs text-gray-400">
          <span className="text-[#FFD166] font-semibold uppercase tracking-widest text-[10px]">Case Study</span> · Gold Loan Collections
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          Gold loan renewals doubled.<br /><span className="text-gradient">In just 90 days.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          How a Thrissur-based finance company eliminated the risk of NPA by proactively calling customers in Malayalam to renew their gold loans before expiry.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
          <div className="glass-card p-6 border-[#FFD166]/20 bg-[#FFD166]/5">
            <div className="text-3xl font-bold text-gradient mb-1">2x</div>
            <div className="text-sm text-gray-400">Increase in renewal rate</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">₹120</div>
            <div className="text-sm text-gray-400">Cost per successful renewal</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">Zero</div>
            <div className="text-sm text-gray-400">Accidental NPAs due to missed communication</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto text-center mt-20">
        <h2 className="text-3xl font-bold mb-4">Secure your loan portfolio</h2>
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/solutions/collections-emi" className="cta-btn-outline">View Collections Solutions <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/contact" className="cta-btn">Book a Demo</Link>
        </div>
      </div>
    </main>
  );
}
