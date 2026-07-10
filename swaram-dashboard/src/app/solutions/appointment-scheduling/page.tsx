"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, CalendarDays, Clock, Zap, CheckCircle, Mic, Users, HeartHandshake } from "lucide-react";

export default function AppointmentSchedulingPage() {
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
            <CalendarDays className="w-3.5 h-3.5 text-[#FFD166]" /> Appointment Scheduling
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Book meetings 24/7.<br /><span className="text-gradient">Zero human intervention.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Let Swaram handle the back-and-forth of scheduling. Connects directly to your calendar to book, reschedule, or cancel appointments through natural voice conversations.
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
              <CalendarDays className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Live Calendar Sync</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Swaram checks your Google Calendar, Calendly, or Cal.com in real-time to offer available slots to callers.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Clock className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Automated Reminders</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Reduce no-shows. Swaram calls patients, clients, or prospects a day before to confirm or reschedule their appointment.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant Booking</h3>
            <p className="text-gray-400 text-sm leading-relaxed">No hold music. Callers speak naturally ("Can I come in tomorrow morning?"), and Swaram books the slot instantly.</p>
          </div>
        </div>

        {/* ROI / Stats Section */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="glass-card p-10 md:p-14 glow-accent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFD166]/10 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-4">Eliminate scheduling friction</h2>
                <p className="text-gray-400 mb-6">Perfect for clinics, salons, real estate viewings, and B2B sales teams. Save your staff hours of phone tag.</p>
                <div className="space-y-3">
                  {["Integrates with Zoho Bookings, Calendly, Google Calendar", "Automatically handles rescheduling requests", "Native language support builds trust"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#FFD166] shrink-0" />
                      <span className="text-sm text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 w-full md:w-auto">
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">40%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Fewer No-shows</div>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">65%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Bookings Automated</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to automate your calendar?</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram today and let AI handle your appointments.</p>
          <div className="flex justify-center gap-4">
            <Link href="/roi-calculator" className="cta-btn-outline">Calculate ROI <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
