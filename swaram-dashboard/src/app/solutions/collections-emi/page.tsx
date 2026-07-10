"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, BarChart3, Shield, CheckCircle, Mic, DollarSign, Activity } from "lucide-react";

export default function CollectionsEMIPage() {
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
            <BarChart3 className="w-3.5 h-3.5 text-[#FFD166]" /> Collections & EMI
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Recover more EMIs.<br /><span className="text-gradient">Zero compliance risks.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Automate 0-30 day bucket EMI reminders with RBI-compliant voice AI. Swaram talks to your customers politely in their native language and sends payment links mid-call.
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
              <Shield className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">100% Compliant</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Strict adherence to RBI Fair Practices Code. Calls are only made during allowed windows, with fully logged transcripts and recordings.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <DollarSign className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant Payment Links</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Swaram negotiates the PTP (Promise To Pay) and instantly triggers Razorpay or Cashfree payment links via SMS or WhatsApp.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Activity className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">High Penetration</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Human agents get tired. Swaram flawlessly executes your dialing strategy, calling tens of thousands of accounts in a single day.</p>
          </div>
        </div>

        {/* ROI / Stats Section */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="glass-card p-10 md:p-14 glow-accent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFD166]/10 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-4">A game changer for NBFCs</h2>
                <p className="text-gray-400 mb-6">Significantly boost your early-bucket recovery rates while slashing agency outsourcing costs.</p>
                <div className="space-y-3">
                  {["38% increase in EMI recovery for 0-30 day buckets", "Complete PTP tracking and automated follow-ups", "Native regional dialects (Malayalam, Tamil, Hindi, etc.)"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#FFD166] shrink-0" />
                      <span className="text-sm text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 w-full md:w-auto">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">38%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Higher Recovery</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">100%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Compliance</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">₹120</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Cost/Recovery</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">12</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Languages</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to automate collections?</h2>
          <p className="text-gray-400 mb-8">Reduce your NPA ratios and save on collection costs with Swaram's intelligent voice agents.</p>
          <div className="flex justify-center gap-4">
            <Link href="/case-studies/nbfc-emi-collections" className="cta-btn-outline">Read Case Study <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
