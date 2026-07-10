"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, DollarSign, Clock, RefreshCcw, CheckCircle, Mic } from "lucide-react";

export default function RevenueRecoveryPage() {
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
            <RefreshCcw className="w-3.5 h-3.5 text-[#FFD166]" /> Swaram Revenue Recovery
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Recover lost revenue.<br /><span className="text-gradient">On autopilot.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Win back churned customers, failed subscriptions, and abandoned carts with personalized, conversational AI voice agents in 12 regional languages.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link href="#demo" className="cta-btn"><Mic className="w-4 h-4" /> Try Live Demo</Link>
            <Link href="/contact" className="cta-btn-outline">Talk to Sales <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        {/* Benefits */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <DollarSign className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Failed Payment Recovery</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Instantly call customers when their recurring payment fails. Swaram explains the issue and sends a fresh payment link via WhatsApp mid-call.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <RefreshCcw className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Win-back Campaigns</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Re-engage dormant users or churned subscribers with exclusive offers delivered through a natural, friendly voice conversation.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Clock className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Abandoned Cart Calls</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Trigger an immediate outbound call for high-value abandoned carts to offer assistance, answer product queries, and close the sale.</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Stop leaving money on the table</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram Revenue Recovery today and boost your bottom line.</p>
          <div className="flex justify-center gap-4">
            <Link href="/roi-calculator" className="cta-btn-outline">Calculate ROI <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
