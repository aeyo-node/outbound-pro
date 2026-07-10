"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, Building2, MapPin, Search, Calendar, Mic } from "lucide-react";

export default function RealEstatePage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main>
      

      <div className="pt-28 pb-20 px-6">
        {/* Hero */}
        <div className="max-w-5xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 text-xs text-gray-400">
            <Building2 className="w-3.5 h-3.5 text-[#FFD166]" /> Real Estate
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Qualify property leads.<br /><span className="text-gradient">Book more site visits.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Call every Facebook or MagicBricks lead within seconds. Swaram filters window shoppers and books site visits for your sales team automatically.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link href="#demo" className="cta-btn"><Mic className="w-4 h-4" /> Try Live Demo</Link>
            <Link href="/contact" className="cta-btn-outline">Talk to Sales <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        {/* Use Cases Grid */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
          <Link href="/solutions/sales-lead-qualification" className="glass-card p-8 group hover:border-[#FFD166]/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Search className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-[#FFD166]">Lead Qualification</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Qualify incoming property inquiries for budget, location preference (e.g. 2BHK vs 3BHK), and purchasing timeline instantly.</p>
          </Link>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Site Visit Scheduling</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Once a lead is qualified, Swaram checks your sales team's calendar and books a physical or virtual site visit on the spot.</p>
          </div>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <MapPin className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Launch Announcements</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Run massive outbound voice campaigns to your existing CRM database to announce new project launches or special offers.</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Start booking more site visits</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram today and let AI qualify your property leads.</p>
          <div className="flex justify-center gap-4">
            <Link href="/roi-calculator" className="cta-btn-outline">Calculate ROI <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
