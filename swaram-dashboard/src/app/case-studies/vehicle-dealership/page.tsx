"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Car, Settings, CheckCircle } from "lucide-react";

export default function VehicleDealershipCaseStudyPage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main className="pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 text-xs text-gray-400">
          <span className="text-[#FFD166] font-semibold uppercase tracking-widest text-[10px]">Case Study</span> · Auto Dealership
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          85% test drive show-up rate.<br /><span className="text-gradient">Service fully automated.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          How a major Kozhikode car dealership chain automated their service reminders and test drive confirmations, resulting in packed service bays and higher showroom footfall.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
          <div className="glass-card p-6 border-[#FFD166]/20 bg-[#FFD166]/5">
            <div className="text-3xl font-bold text-gradient mb-1">85%</div>
            <div className="text-sm text-gray-400">Test drive show-up rate</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">40%</div>
            <div className="text-sm text-gray-400">Increase in service bookings</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">100%</div>
            <div className="text-sm text-gray-400">Post-service CSAT calls automated</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto text-center mt-20">
        <h2 className="text-3xl font-bold mb-4">Rev up your dealership's CRM</h2>
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/solutions/feedback-csat" className="cta-btn-outline">View CSAT Solutions <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/contact" className="cta-btn">Book a Demo</Link>
        </div>
      </div>
    </main>
  );
}
