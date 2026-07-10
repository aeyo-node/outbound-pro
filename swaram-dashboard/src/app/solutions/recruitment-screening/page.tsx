"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, Users, ClipboardCheck, Clock, CheckCircle, Mic } from "lucide-react";

export default function RecruitmentScreeningPage() {
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
            <Users className="w-3.5 h-3.5 text-[#FFD166]" /> Recruitment Screening
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Screen 1000s of candidates.<br /><span className="text-gradient">In minutes, not weeks.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Automate the first-round HR screening call. Swaram AI conducts conversational interviews, evaluates communication skills, checks basic requirements, and shortlists candidates automatically.
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
              <ClipboardCheck className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Consistent Evaluation</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Every candidate gets asked the exact same questions without recruiter fatigue or bias, ensuring a completely level playing field.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Clock className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Drastic Time Savings</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Stop having your HR team spend 80% of their day dialing candidates who don't answer or don't meet basic requirements.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Communication Check</h3>
            <p className="text-gray-400 text-sm leading-relaxed">By evaluating the actual voice conversation, Swaram provides an automated assessment of the candidate's spoken language fluency.</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Transform your hiring funnel</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram Screening today and help your HR team focus on closing top talent.</p>
          <div className="flex justify-center gap-4">
            <Link href="/roi-calculator" className="cta-btn-outline">Calculate ROI <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
