"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Truck, MapPin, CheckCircle, Package } from "lucide-react";

export default function LogisticsCaseStudyPage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main className="pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 text-xs text-gray-400">
          <span className="text-[#FFD166] font-semibold uppercase tracking-widest text-[10px]">Case Study</span> · Logistics Delivery
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          NDR resolution jumped to 68%.<br /><span className="text-gradient">Saving thousands in RTO.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          How an Ernakulam-based 3PL provider used Swaram AI to instantly contact customers upon a failed delivery attempt, recovering packages that would have otherwise been returned to origin.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
          <div className="glass-card p-6 border-[#FFD166]/20 bg-[#FFD166]/5">
            <div className="text-3xl font-bold text-gradient mb-1">68%</div>
            <div className="text-sm text-gray-400">NDR resolution rate (up from 28%)</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">₹4</div>
            <div className="text-sm text-gray-400">Cost per NDR call</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">-40%</div>
            <div className="text-sm text-gray-400">Reduction in RTO logistics cost</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto text-center mt-20">
        <h2 className="text-3xl font-bold mb-4">Fix your last-mile logistics leaks</h2>
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/solutions/logistics" className="cta-btn-outline">View Logistics Solutions <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/contact" className="cta-btn">Book a Demo</Link>
        </div>
      </div>
    </main>
  );
}
