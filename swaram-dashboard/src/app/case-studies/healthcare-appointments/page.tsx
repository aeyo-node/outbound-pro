"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, HeartPulse, Clock, FileText, Phone } from "lucide-react";

export default function HealthcareCaseStudyPage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main className="pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 text-xs text-gray-400">
          <span className="text-[#FFD166] font-semibold uppercase tracking-widest text-[10px]">Case Study</span> · Healthcare Appointments
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          65% appointments booked via AI.<br /><span className="text-gradient">Zero missed calls.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          How a major clinic chain in Kozhikode automated their patient scheduling and follow-ups in fluent Malayalam, completely eliminating reception hold times.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
          <div className="glass-card p-6 border-[#FFD166]/20 bg-[#FFD166]/5">
            <div className="text-3xl font-bold text-gradient mb-1">65%</div>
            <div className="text-sm text-gray-400">Of all appointments handled purely by AI</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">89%</div>
            <div className="text-sm text-gray-400">CSAT score for AI interactions</div>
          </div>
          <div className="glass-card p-6">
            <div className="text-3xl font-bold text-white mb-1">Zero</div>
            <div className="text-sm text-gray-400">Hold time during peak hours</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="glass-card p-8 md:p-12 space-y-10">
          
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <Phone className="w-6 h-6 text-gray-500" /> The Challenge
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              A busy multi-specialty clinic in Kozhikode was losing patients due to long hold times. Their front desk staff were overwhelmed trying to manage walk-ins while simultaneously answering calls for appointment bookings, rescheduling, and general queries.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <HeartPulse className="w-6 h-6 text-[#FFD166]" /> The Swaram Solution
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              The clinic deployed Swaram AI as their primary Level 1 phone receptionist. Integrated with their custom Hospital Management System (HMS), Swaram instantly answers every incoming call in natural Malayalam or English.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 my-6 font-mono text-sm text-gray-300">
              <div className="mb-2"><span className="text-[#FFD166]">Swaram AI:</span> "Namaskaram, this is [Clinic Name]. How can I help you today?"</div>
              <div className="mb-2"><span className="text-blue-400">Patient:</span> "I need an appointment with Dr. Suresh for tomorrow evening."</div>
              <div><span className="text-[#FFD166]">Swaram AI:</span> "Dr. Suresh is available tomorrow at 5:00 PM and 6:30 PM. Which slot works better for you?"</div>
            </div>
            <p className="text-gray-300 leading-relaxed">
              If the patient asks a complex medical question, Swaram politely transfers the call to a nurse. Otherwise, it completes the booking and sends a confirmation SMS instantly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" /> The Results
            </h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Within 30 days, the clinic saw a dramatic improvement in patient satisfaction and staff efficiency. Front desk personnel were freed to focus entirely on in-person care.
            </p>
          </section>

        </div>
      </div>

      <div className="max-w-3xl mx-auto text-center mt-20">
        <h2 className="text-3xl font-bold mb-4">Upgrade your clinic's front desk</h2>
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/solutions/healthcare" className="cta-btn-outline">View Healthcare Solutions <ArrowRight className="w-4 h-4" /></Link>
          <Link href="/contact" className="cta-btn">Book a Demo</Link>
        </div>
      </div>
    </main>
  );
}
