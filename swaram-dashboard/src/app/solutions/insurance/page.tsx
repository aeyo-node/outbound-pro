"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, ShieldCheck, Phone, RefreshCcw, Mic } from "lucide-react";

export default function InsurancePage() {
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
            <ShieldCheck className="w-3.5 h-3.5 text-[#FFD166]" /> Insurance
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Boost policy renewals.<br /><span className="text-gradient">Automate claim updates.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Drive higher retention rates with proactive voice outreach in regional languages for motor, health, and life insurance renewals.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link href="#demo" className="cta-btn"><Mic className="w-4 h-4" /> Try Live Demo</Link>
            <Link href="/contact" className="cta-btn-outline">Talk to Sales <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        {/* Use Cases Grid */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <RefreshCcw className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Policy Renewals</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Call policyholders 30 days before expiration. Swaram handles objections, explains benefits, and sends direct renewal links.</p>
          </div>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Phone className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Lead Qualification</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Pre-qualify new insurance inquiries for pre-existing conditions and budget before connecting them to licensed agents.</p>
          </div>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Claim Status Updates</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Reduce inbound call volume by automatically calling customers to update them on their claim approval status or missing documents.</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Ready to automate your insurance operations?</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram today and drastically lower your customer acquisition and retention costs.</p>
          <div className="flex justify-center gap-4">
            <Link href="/roi-calculator" className="cta-btn-outline">Calculate ROI <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
