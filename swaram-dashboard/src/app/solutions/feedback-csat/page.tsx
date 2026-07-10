"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, Star, Heart, MessageCircle, CheckCircle, Mic } from "lucide-react";

export default function FeedbackCSATPage() {
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
            <Star className="w-3.5 h-3.5 text-[#FFD166]" /> Feedback & CSAT
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Capture real feedback.<br /><span className="text-gradient">No boring forms.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Replace low-conversion email surveys with interactive AI voice calls. Swaram gathers nuanced feedback, NPS scores, and identifies unhappy customers instantly.
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
              <Star className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Higher Response Rates</h3>
            <p className="text-gray-400 text-sm leading-relaxed">People ignore emails but answer phone calls. Achieve up to 45% completion rates compared to the 2-5% industry average for text surveys.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <MessageCircle className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Qualitative Insights</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Don't just get a rating out of 5. Swaram asks open-ended follow-up questions to understand the "why" behind the score.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Heart className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Detractor Escalation</h3>
            <p className="text-gray-400 text-sm leading-relaxed">If a customer gives a poor rating or expresses frustration, Swaram instantly alerts your retention team or transfers the call live.</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Start listening to your customers</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram CSAT today and unlock deep insights into your customer experience.</p>
          <div className="flex justify-center gap-4">
            <Link href="/roi-calculator" className="cta-btn-outline">Calculate ROI <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
