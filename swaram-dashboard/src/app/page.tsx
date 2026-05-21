"use client";

import React, { useState, useEffect } from "react";
import { Phone, ArrowRight, Mic, BarChart3, Users, Zap, Shield, Clock, ChevronRight, Headset, Play, Building2, Car, Heart, GraduationCap, Landmark } from "lucide-react";

const API_BASE = "";  // Use proxy from next.config.ts

const ANIMATED_LANGUAGES = [
  "Swaram",  // Malayalam
  "Voice",   // English
  "आवाज़",   // Hindi
  "குரல்",    // Tamil
  "స్వരം",    // Telugu
  "ಧ್ವನಿ",    // Kannada
  "आवाज",    // Marathi
  "અવાજ",    // Gujarati
  "কণ্ঠ",    // Bengali
  "ਆਵਾਜ਼",   // Punjabi
  "ସ୍ୱਰ",     // Odia
  "آواز"     // Urdu
];

const LANGUAGES = [
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "hi", name: "Hindi", native: "हिंदी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "en", name: "English", native: "English" }
];

const USE_CASES = [
  { icon: Building2, title: "Real Estate", service: "Real Estate", desc: "Automate property inquiries, site visit bookings, and customer follow-ups in fluent local languages.", items: ["Site Visit Bookings", "Property Inquiries", "Pricing & Availability", "Broker Follow-up Calls"] },
  { icon: Heart, title: "Clinics", service: "Clinics", desc: "Manage patient appointments, reminders, and clinic details with an empathetic multilingual AI receptionist.", items: ["Doctor Appointment Booking", "Clinic Timing Queries", "Vaccination Reminders", "Feedback Collection"] },
  { icon: Car, title: "Vehicle Dealerships", service: "Vehicle Dealerships", desc: "Schedule test drives, service bookings, and insurance reminders seamlessly with outbound calling.", items: ["Test Drive Scheduling", "Car Service Appointments", "Insurance Renewals", "Post-Service Feedback"] },
  { icon: Shield, title: "Insurance", service: "Insurance", desc: "Automate policy renewals, premium payment reminders, and claim status updates in the customer's native tongue.", items: ["Policy Renewal Calls", "Payment Reminders", "Claim Status Inquiries", "Policy Info Details"] },
  { icon: Users, title: "Consultancies", service: "Consultancies", desc: "Qualify leads for study abroad, job placements, or visa consultancies with automated multi-lingual voice calls.", items: ["Visa Consultation Bookings", "Study Abroad Inquiries", "Job Placement Follow-ups", "Document Verification Alerts"] },
  { icon: GraduationCap, title: "Training Centres", service: "Training Centres", desc: "Handle student course inquiries, batch timings, admission updates, and fee reminders automatically.", items: ["Course Admission Inquiries", "Batch Schedule Updates", "Fee Payment Reminders", "Student Attendance Alerts"] },
  { icon: Landmark, title: "Finance / Loans", service: "Finance / Loans", desc: "Automate loan eligibility checks, gold loan renewals, and gold/personal loan EMI collections.", items: ["EMI Payment Reminders", "Gold Loan Renewals", "Loan Eligibility Checks", "Interest Payment Alerts"] },
  { icon: Zap, title: "Home Services", service: "Home Services", desc: "Book AC servicing, appliance repairs, plumbing, and electrician service visits hands-free.", items: ["AC Service Bookings", "Plumber/Electrician Scheduling", "Service Technician Dispatch", "Quality Feedback Surveys"] },
];

const STATS = [
  { value: "80%", label: "Reduction in Operational Costs" },
  { value: "10K+", label: "Concurrent Calls Handled" },
  { value: "60%", label: "Increase in CSAT Scores" },
  { value: "<30s", label: "Go Live Setup Time" },
];

/* ─── Animated Language Cycler ─────────────────────────────── */
function AnimatedLang() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % ANIMATED_LANGUAGES.length);
        setFade(true);
      }, 400);
    }, 2200);
    return () => clearInterval(interval);
  }, []);
  return (
    <span
      className="text-gradient inline-block transition-all"
      style={{
        opacity: fade ? 1 : 0,
        transform: fade ? "translateY(0)" : "translateY(8px)",
        transitionDuration: "350ms",
      }}
    >
      {ANIMATED_LANGUAGES[idx]}
    </span>
  );
}

/* ─── Call Dispatcher (shared by Use Cases) ── */
async function dispatchCall(phone: string, serviceType: string): Promise<{ ok: boolean; msg: string }> {
  const formatted = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
  if (formatted.length < 12) return { ok: false, msg: "Please enter a valid 10-digit Indian phone number" };
  try {
    const res = await fetch(`${API_BASE}/api/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: formatted,
        lead_name: "Website Visitor",
        business_name: "Swaram AI",
        service_type: serviceType,
      }),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, msg: `Call dispatched! Our ${serviceType} agent is calling ${formatted} now.` };
    return { ok: false, msg: data.detail || "Failed to dispatch call" };
  } catch {
    return { ok: false, msg: "Network error. Please try again." };
  }
}

/* ─── Navbar ───────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/5" : ""}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headset className="w-6 h-6 text-[#FFD166]" />
          <span className="text-xl font-semibold tracking-tight">swaram</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
          <a href="#usecases" className="text-sm text-gray-400 hover:text-white transition-colors">Use Cases</a>
          <a href="#languages" className="text-sm text-gray-400 hover:text-white transition-colors">Languages</a>
        </div>
        <a href="/login" className="cta-btn text-sm !py-2.5 !px-5">
          Dashboard <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </nav>
  );
}

/* ─── Hero ─────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#FFD166]/5 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#FFD166]/3 rounded-full blur-[100px] animate-float delay-300" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8 animate-fade-up">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-gray-400">AI Voice Agents — Live in Production</span>
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mb-6 animate-fade-up delay-100">
          <AnimatedLang /> <span className="text-white">that speaks<br />for you</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-fade-up delay-200 leading-relaxed">
          Enterprise-grade AI voice agents speaking fluently in 12 Indian languages. 
          Automate 10,000+ concurrent calls. Zero wait time. Human-like conversations.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up delay-300">
          <a href="#usecases" className="cta-btn text-base">
            <Mic className="w-5 h-5" /> Try Live Demo
          </a>
          <a href="/login" className="cta-btn-outline text-base">
            Open Dashboard <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 animate-fade-up delay-500">
          {STATS.map((s, i) => (
            <div key={i} className="glass-card p-5 text-center">
              <div className="text-3xl font-bold text-gradient mb-1">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─────────────────────────────────────────────── */
function FeaturesSection() {
  const features = [
    { icon: Landmark, title: "12 Indian Languages Outbound Calls", desc: "Speak directly to your target audience. Our voice agents are trained in natural dialects and phone etiquette across 12 major Indian languages." },
    { icon: Zap, title: "Powered by Swaram AI", desc: "Swaram's proprietary STT, TTS, and LLM engine for natural, context-aware conversations that handle open-ended queries." },
    { icon: BarChart3, title: "Real-Time Analytics", desc: "Live dashboard with call outcomes, duration tracking, booking rates, and campaign performance metrics." },
    { icon: Users, title: "Campaign Automation", desc: "Bulk outbound campaigns with scheduling, contact management, and per-call delay configuration." },
    { icon: Shield, title: "Enterprise Security", desc: "Secure data layer, encrypted credentials, and SIP trunk integration with enterprise-grade telephony." },
    { icon: Clock, title: "24/7 Availability", desc: "Zero wait time. Handle 10,000+ concurrent calls simultaneously. Every customer gets an instant response." },
  ];

  return (
    <section id="features" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Built for <span className="text-gradient">Indian enterprises</span></h2>
          <p className="text-gray-500 max-w-xl mx-auto">Everything you need to automate voice interactions at scale — no infrastructure, no coding required.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="glass-card p-8 group">
              <div className="w-12 h-12 rounded-2xl bg-[#FFD166]/10 flex items-center justify-center mb-5 group-hover:bg-[#FFD166]/20 transition-colors">
                <f.icon className="w-6 h-6 text-[#FFD166]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


/* ─── Use Cases (with per-industry call button) ────────────── */
function UseCasesSection() {
  const [active, setActive] = useState(0);
  const [phone, setPhone] = useState("");
  const [callState, setCallState] = useState<"idle" | "calling" | "connected">("idle");
  const [callMsg, setCallMsg] = useState("");

  const handleIndustryCall = async () => {
    setCallState("calling");
    setCallMsg("Connecting to " + USE_CASES[active].title + " agent...");
    const result = await dispatchCall(phone, USE_CASES[active].service);
    if (result.ok) {
      setCallState("connected");
      setCallMsg(result.msg);
      setTimeout(() => { setCallState("idle"); setCallMsg(""); }, 30000);
    } else {
      setCallState("idle");
      setCallMsg(result.msg);
    }
  };

  return (
    <section id="usecases" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Built for <span className="text-gradient">every industry</span></h2>
          <p className="text-gray-500 max-w-xl mx-auto">Pre-trained agents ready for your domain. Go live in under 30 minutes.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {USE_CASES.map((uc, i) => (
            <button key={i} onClick={() => { setActive(i); setCallState("idle"); setCallMsg(""); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${active === i ? "bg-[#FFD166] text-black" : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"}`}>
              <uc.icon className="w-4 h-4" /> {uc.title}
            </button>
          ))}
        </div>

        <div className="glass-card p-10 md:p-12">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
                {React.createElement(USE_CASES[active].icon, { className: "w-7 h-7 text-[#FFD166]" })}
              </div>
              <h3 className="text-2xl font-bold mb-3">{USE_CASES[active].title}</h3>
              <p className="text-gray-400 leading-relaxed mb-6">{USE_CASES[active].desc}</p>

              {/* Per-industry call button */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 focus-within:border-[#FFD166]/40 transition-colors">
                    <span className="text-gray-500 text-xs">+91</span>
                    <input type="tel" placeholder="Your phone number" value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-transparent outline-none text-white placeholder-gray-400 flex-1 text-sm"
                      maxLength={10} />
                  </div>
                  <button onClick={handleIndustryCall} disabled={callState === "calling"}
                    className={`cta-btn !py-2.5 text-sm ${callState === "calling" ? "opacity-60 cursor-wait" : ""}`}>
                    {callState === "calling" ? (
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <><Phone className="w-4 h-4" /> Try {USE_CASES[active].title}</>
                    )}
                  </button>
                </div>
                {callMsg && (
                  <p className={`text-xs ${callState === "connected" ? "text-green-400" : "text-red-400"}`}>{callMsg}</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {USE_CASES[active].items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] group hover:border-[#FFD166]/20 transition-all">
                  <div className="w-8 h-8 rounded-full bg-[#FFD166]/10 flex items-center justify-center flex-shrink-0">
                    <Play className="w-3.5 h-3.5 text-[#FFD166]" />
                  </div>
                  <span className="text-sm font-medium">{item}</span>
                  <ChevronRight className="w-4 h-4 text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ──────────────────────────────────────────────────── */
function CTASection() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="glass-card p-12 md:p-16 glow-accent relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFD166]/5 to-transparent" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to automate<br /><span className="text-gradient">your voice operations?</span></h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-8">Join enterprises across India using Swaram to handle thousands of calls daily in every language.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#usecases" className="cta-btn text-base"><Mic className="w-5 h-5" /> Try Live Demo</a>
              <a href="/login" className="cta-btn-outline text-base">Access Dashboard <ArrowRight className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ───────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Headset className="w-5 h-5 text-[#FFD166]" />
          <span className="font-semibold text-lg">swaram</span>
          <span className="text-xs text-gray-600 ml-2">സ്വരം</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#usecases" className="hover:text-white transition-colors">Industries</a>
          <a href="/login" className="hover:text-white transition-colors">Dashboard</a>
        </div>
        <p className="text-xs text-gray-600">© 2026 Swaram AI. All rights reserved.</p>
      </div>
    </footer>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function LandingPage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <UseCasesSection />
      <CTASection />
      <Footer />
    </main>
  );
}
