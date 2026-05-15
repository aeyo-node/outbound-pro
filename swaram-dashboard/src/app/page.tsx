"use client";

import React, { useState, useEffect } from "react";
import { Phone, ArrowRight, Mic, BarChart3, Users, Zap, Shield, Clock, ChevronRight, Headset, Play, Volume2, Building2, Car, Heart, GraduationCap, Truck, Landmark, ShoppingBag, Plane, Globe } from "lucide-react";

const API_BASE = "";  // Use proxy from next.config.ts

const ANIMATED_LANGUAGES = [
  "മലയാളം", "हिन्दी", "ಕನ್ನಡ", "తెలుగు", "मराठी",
  "தமிழ்", "বাংলা", "ગુજરાતી", "English", "ਪੰਜਾਬੀ"
];

const LANGUAGES = [
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "en", name: "English", native: "English" },
];

const USE_CASES = [
  { icon: Landmark, title: "Banking & Finance", service: "Banking & Finance", desc: "EMI collections, loan inquiries, fraud alerts, balance checks, and lead qualification — all automated.", items: ["EMI Collection Calls", "Loan Status Updates", "Fraud Alert Verification", "Account Balance Inquiry"] },
  { icon: Car, title: "Automobile", service: "Automobile", desc: "Test drive bookings, service reminders, insurance renewals, and roadside assistance handling.", items: ["Test Drive Scheduling", "Service Appointment Booking", "Insurance & Warranty Calls", "Post-Service Feedback"] },
  { icon: Heart, title: "Healthcare", service: "Healthcare", desc: "Appointment booking, prescription refills, lab result updates, and post-treatment follow-ups.", items: ["Appointment Reminders", "Lab Report Notifications", "Prescription Refill Alerts", "Patient Follow-up Calls"] },
  { icon: GraduationCap, title: "EdTech", service: "EdTech", desc: "Course enrollment, class reminders, student query resolution, and counselor routing.", items: ["Enrollment Assistance", "Class Schedule Reminders", "Fee Payment Reminders", "Lead Qualification"] },
  { icon: ShoppingBag, title: "Retail & E-commerce", service: "Retail & E-commerce", desc: "Order tracking, return processing, promotional offers, and personalized shopping assistance.", items: ["Order Status Updates", "Return & Refund Processing", "Promotional Campaigns", "Customer Support"] },
  { icon: Truck, title: "Logistics", service: "Logistics", desc: "Delivery updates, pickup scheduling, driver coordination, and customer notification at scale.", items: ["Delivery Notifications", "Pickup Scheduling", "Real-time Tracking Calls", "Feedback Collection"] },
  { icon: Plane, title: "Travel & Hospitality", service: "Travel & Hospitality", desc: "Booking confirmations, itinerary updates, check-in reminders, and multilingual guest support.", items: ["Booking Confirmations", "Flight/Hotel Updates", "Cancellation Handling", "Guest Support"] },
  { icon: Building2, title: "Government", service: "Government", desc: "Citizen notifications, appointment scheduling, survey collection, and public service updates.", items: ["Citizen Notifications", "Scheme Awareness Calls", "Appointment Scheduling", "Survey & Feedback"] },
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

/* ─── Waveform Visualizer ──────────────────────────────────── */
function WaveformVisualizer({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="waveform-bar" style={{
          animationDelay: `${i * 0.08}s`,
          opacity: active ? 1 : 0.2,
          height: active ? undefined : "4px",
        }} />
      ))}
    </div>
  );
}

/* ─── Call Dispatcher (shared by Voice section + Use Cases) ── */
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
          <a href="#voice" className="text-sm text-gray-400 hover:text-white transition-colors">Voice Experience</a>
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
          Swaram that speaks<br />
          <AnimatedLang /> <span className="text-white">for you</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-fade-up delay-200 leading-relaxed">
          Enterprise-grade AI voice agents fluent in Malayalam, Hindi, Kannada, Telugu, Marathi, and more. 
          Automate 10,000+ concurrent calls. Zero wait time. Human-like conversations.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up delay-300">
          <a href="#voice" className="cta-btn text-base">
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
    { icon: Globe, title: "10+ Indian Languages", desc: "Auto-switch languages mid-call. Malayalam, Hindi, Kannada, Telugu, Marathi — your agent adapts instantly." },
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

/* ─── Voice Experience (main demo) ─────────────────────────── */
function VoiceExperienceSection() {
  const [phone, setPhone] = useState("");
  const [selectedLang, setSelectedLang] = useState("ml");
  const [callState, setCallState] = useState<"idle" | "calling" | "connected">("idle");
  const [callStatus, setCallStatus] = useState("");

  const handleCall = async () => {
    setCallState("calling");
    setCallStatus("Initiating call...");
    const result = await dispatchCall(phone, "Voice AI Demo");
    if (result.ok) {
      setCallState("connected");
      setCallStatus(result.msg);
      setTimeout(() => { setCallState("idle"); setCallStatus(""); }, 30000);
    } else {
      setCallState("idle");
      setCallStatus(result.msg);
    }
  };

  return (
    <section id="voice" className="py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFD166]/[0.02] to-transparent" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Experience <span className="text-gradient">Swaram Live</span></h2>
          <p className="text-gray-500 max-w-xl mx-auto">Enter your phone number. Pick a language. Our AI agent calls you in seconds.</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="glass-card p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFD166] to-[#FF9F1C] flex items-center justify-center">
                  <Headset className="w-8 h-8 text-black" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-green-400 border-2 border-[#0A0A0A]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Susanna</h3>
                <p className="text-sm text-gray-500">Swaram AI Voice Agent • Online</p>
              </div>
            </div>

            <WaveformVisualizer active={callState === "connected"} />

            <div className="mt-6 mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Select Language</p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button key={lang.code} onClick={() => setSelectedLang(lang.code)}
                    className={`lang-pill ${selectedLang === lang.code ? "active" : ""}`}>
                    {lang.native}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-3 focus-within:border-[#FFD166]/40 transition-colors">
                <span className="text-gray-500 text-sm">+91</span>
                <input type="tel" placeholder="Enter your phone number" value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-transparent outline-none text-white placeholder-gray-400 flex-1 text-sm"
                  maxLength={10} />
              </div>
              <button onClick={handleCall} disabled={callState === "calling"}
                className={`cta-btn !rounded-full !px-6 ${callState === "calling" ? "opacity-60 cursor-wait" : ""}`}>
                {callState === "calling" ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : callState === "connected" ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <Phone className="w-5 h-5" />
                )}
              </button>
            </div>

            {callStatus && (
              <p className={`text-sm mt-4 ${callState === "connected" ? "text-green-400" : "text-red-400"}`}>
                {callStatus}
              </p>
            )}
          </div>
          <p className="text-center text-xs text-gray-600">
            By clicking call, you agree to receive a demo call from our AI agent. Standard call charges may apply.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Languages ────────────────────────────────────────────── */
function LanguagesSection() {
  return (
    <section id="languages" className="py-32 px-6">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Every language. <span className="text-gradient">Every dialect.</span></h2>
        <p className="text-gray-500 max-w-xl mx-auto mb-16">Real-time language switching mid-call. Your customers speak naturally — our agent follows.</p>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
          {LANGUAGES.map((lang) => (
            <div key={lang.code} className="glass-card p-6 flex flex-col items-center gap-3 group">
              <span className="text-2xl font-bold text-gradient">{lang.native.charAt(0)}</span>
              <div>
                <p className="text-sm font-medium">{lang.name}</p>
                <p className="text-xs text-gray-600">{lang.native}</p>
              </div>
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
              <a href="#voice" className="cta-btn text-base"><Mic className="w-5 h-5" /> Try Live Demo</a>
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
          <a href="#voice" className="hover:text-white transition-colors">Demo</a>
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
      <VoiceExperienceSection />
      <LanguagesSection />
      <UseCasesSection />
      <CTASection />
      <Footer />
    </main>
  );
}
