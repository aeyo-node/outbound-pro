"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, Phone, TrendingUp, Filter, CheckCircle, Mic, Users, Target } from "lucide-react";

export default function SalesLeadQualificationPage() {
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
            <Phone className="w-3.5 h-3.5 text-[#FFD166]" /> Sales & Lead Qualification
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Scale your outbound.<br /><span className="text-gradient">Qualify leads in seconds.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Stop wasting your best closers on cold outreach. Swaram AI calls your raw leads, asks qualifying questions, and hands only the hot prospects to your sales team.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link href="#demo" className="cta-btn"><Mic className="w-4 h-4" /> Hear a Sales Demo</Link>
            <Link href="/contact" className="cta-btn-outline">Talk to Sales <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        {/* Benefits */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <TrendingUp className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant Response</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Call leads within seconds of form submission. The faster you call, the higher the conversion. Swaram dials instantly, 24/7.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Filter className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">BANT Qualification</h3>
            <p className="text-gray-400 text-sm leading-relaxed">The AI assesses Budget, Authority, Need, and Timeline through natural conversation, updating your CRM in real-time.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Target className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Live Call Transfers</h3>
            <p className="text-gray-400 text-sm leading-relaxed">When a lead is hot and ready to talk pricing or close, Swaram transfers the call directly to your available sales executives.</p>
          </div>
        </div>

        {/* ROI / Stats Section */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="glass-card p-10 md:p-14 glow-accent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFD166]/10 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-4">Supercharge your sales pipeline</h2>
                <p className="text-gray-400 mb-6">Our EdTech and Real Estate clients have seen massive boosts in their SQLs (Sales Qualified Leads) while reducing their top-of-funnel telesales costs.</p>
                <div className="space-y-3">
                  {["Increase lead-to-opportunity conversion by up to 4x", "Call 10,000 leads concurrently in multiple regional languages", "Seamless syncing with Salesforce, LeadSquared, and HubSpot"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#FFD166] shrink-0" />
                      <span className="text-sm text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 w-full md:w-auto">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">4x</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">More SQLs</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">&lt;10s</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Lead Response</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">70%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Cost Reduction</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">24/7</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Dialing</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Start qualifying on autopilot</h2>
          <p className="text-gray-400 mb-8">Book a demo to see how Swaram can qualify your leads and book meetings directly into your sales team's calendar.</p>
          <div className="flex justify-center gap-4">
            <Link href="/roi-calculator" className="cta-btn-outline">Calculate Savings <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
