"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Calendar, MapPin, Phone } from "lucide-react";

export default function RealEstateCaseStudyPage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main className="pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 text-xs text-gray-400">
          <span className="text-[#FFD166] font-semibold uppercase tracking-widest text-[10px]">Case Study</span> · Real Estate
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          6x more site visit bookings.<br /><span className="text-gradient">Under 3 min response time.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          How a leading builder in Thrissur eliminated lead decay and booked more physical site visits using an AI agent to instantly qualify Facebook inquiries.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
          <div className="glass-card p-6 border-[#FFD166]/20 bg-[#FFD166]/5">
            <div className="text-3xl font-bold text-gradient mb-1">6x</div>
            <div className="text-sm text-gray-400">Increase in site visits booked</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">&lt;3 Min</div>
            <div className="text-sm text-gray-400">Lead response time (down from 8 hours)</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">42%</div>
            <div className="text-sm text-gray-400">Reduction in junk leads sent to sales team</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto text-center mt-20">
        <h2 className="text-3xl font-bold mb-4">Start qualifying property leads instantly</h2>
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/solutions/real-estate" className="cta-btn-outline">View Real Estate Solutions <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/contact" className="cta-btn">Book a Demo</Link>
        </div>
      </div>
    </main>
  );
}
