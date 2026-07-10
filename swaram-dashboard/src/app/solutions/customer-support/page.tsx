"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, MessageSquare, Clock, Zap, BarChart, CheckCircle, Mic, Users, HeartHandshake } from "lucide-react";

export default function CustomerSupportPage() {
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
            <MessageSquare className="w-3.5 h-3.5 text-[#FFD166]" /> Customer Support
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Zero wait time.<br /><span className="text-gradient">In 12 Indian languages.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Automate Tier-1 customer support. Swaram AI voice agents answer instantly, resolve common queries, and seamlessly escalate complex issues to human agents.
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
              <Clock className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">24/7 Availability</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Never miss a customer call, even on weekends or holidays. Provide instant responses around the clock without scaling your headcount.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <BarChart className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">65% Deflection Rate</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Swaram handles FAQs, order status, booking confirmations, and basic troubleshooting, deflecting up to 65% of volume from human agents.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Smart Escalation</h3>
            <p className="text-gray-400 text-sm leading-relaxed">When a query requires human empathy or complex resolution, Swaram does a warm transfer to a live agent with full context.</p>
          </div>
        </div>

        {/* ROI / Stats Section */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="glass-card p-10 md:p-14 glow-accent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFD166]/10 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-4">Transform your support center</h2>
                <p className="text-gray-400 mb-6">Our clients see dramatic improvements in both operational efficiency and customer satisfaction within the first 30 days of deployment.</p>
                <div className="space-y-3">
                  {["Drop Average Handling Time (AHT) by 40%", "Eliminate queue wait times entirely", "Scale instantly during peak traffic spikes"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#FFD166] shrink-0" />
                      <span className="text-sm text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 w-full md:w-auto">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">&lt;3s</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Wait Time</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">₹12</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Cost per Resolution</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">12</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Languages</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">90%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">CSAT Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="max-w-4xl mx-auto mb-20 text-center">
          <h2 className="text-3xl font-bold mb-10">Built for modern support workflows</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {[
              { title: "CRM Integration", desc: "Native sync with Zendesk, Freshdesk, and Zoho." },
              { title: "Order Status API", desc: "Connects to your DB to fetch live order updates." },
              { title: "Multi-language Switch", desc: "Detects caller language and switches mid-sentence." },
              { title: "Call Transcripts", desc: "Full text transcripts pushed to your ticketing system." },
            ].map((f, i) => (
              <div key={i} className="glass-card p-5 flex items-start gap-4">
                <div className="mt-1"><HeartHandshake className="w-5 h-5 text-[#FFD166]" /></div>
                <div>
                  <h4 className="font-semibold text-white mb-1">{f.title}</h4>
                  <p className="text-xs text-gray-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to upgrade your support?</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram today and see the impact on your wait times immediately.</p>
          <div className="flex justify-center gap-4">
            <Link href="/roi-calculator" className="cta-btn-outline">Calculate ROI <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
