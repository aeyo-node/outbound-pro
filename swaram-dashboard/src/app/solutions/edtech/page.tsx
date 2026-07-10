"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, GraduationCap, Users, BookOpen, Mic } from "lucide-react";

export default function EdTechPage() {
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
            <GraduationCap className="w-3.5 h-3.5 text-[#FFD166]" /> EdTech
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Scale your admissions.<br /><span className="text-gradient">Without scaling your team.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Call student leads instantly, qualify their intent, and seamlessly transfer high-value prospects to your career counselors.
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
              <Users className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-[#FFD166]">Student Lead Qualification</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Respond to Facebook and Google ad leads in under 30 seconds. Qualify for budget and course interest automatically.</p>
          </Link>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <BookOpen className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Webinar Reminders</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Dramatically increase masterclass and webinar show-up rates with a friendly voice reminder 2 hours before the event.</p>
          </div>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Headset className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Fee Follow-ups</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Automate polite fee reminders for enrolled students, sending payment links directly via SMS if requested.</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Empower your admissions team</h2>
          <p className="text-gray-400 mb-8">See how our EdTech clients achieved 4x higher lead conversions.</p>
          <div className="flex justify-center gap-4">
            <Link href="/case-studies/edtech-telesales" className="cta-btn-outline">Read Case Study <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
