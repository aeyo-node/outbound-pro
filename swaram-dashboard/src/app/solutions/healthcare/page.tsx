"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, HeartPulse, CalendarCheck, FileText, Clock, Mic } from "lucide-react";

export default function HealthcarePage() {
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
            <HeartPulse className="w-3.5 h-3.5 text-[#FFD166]" /> Healthcare & Clinics
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Better patient experience.<br /><span className="text-gradient">Zero missed calls.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Automate patient appointment bookings, send pre-visit instructions, and manage post-care follow-ups using empathetic voice AI in regional languages.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link href="#demo" className="cta-btn"><Mic className="w-4 h-4" /> Try Live Demo</Link>
            <Link href="/contact" className="cta-btn-outline">Talk to Sales <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        {/* Use Cases Grid */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
          <Link href="/solutions/appointment-scheduling" className="glass-card p-8 group hover:border-[#FFD166]/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <CalendarCheck className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-[#FFD166]">Appointment Scheduling</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Syncs directly with your clinic's calendar. Patients can book, reschedule, or cancel 24/7 without waiting on hold.</p>
          </Link>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Clock className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">No-Show Prevention</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Automatically call patients 24 hours prior to confirm attendance, drastically reducing costly no-shows.</p>
          </div>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <FileText className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Pre-visit Instructions</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Ensure patients arrive prepared (e.g. fasting for blood tests) via automated voice reminders in their native language.</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Upgrade your clinic's front desk</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram today and see the impact on patient satisfaction.</p>
          <div className="flex justify-center gap-4">
            <Link href="/roi-calculator" className="cta-btn-outline">Calculate ROI <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
