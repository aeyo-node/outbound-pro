"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Headset, ArrowRight, ChevronDown, X, Menu, Phone, BarChart3, MessageSquare, Users, Calendar, Star, Truck, ShoppingCart, Building2, Shield, Heart, Home, GraduationCap, Package, Mic } from "lucide-react";

const USE_CASES = [
  { label: "Automated Support Center", href: "/solutions/customer-support", icon: MessageSquare },
  { label: "Intelligent Lead Routing", href: "/solutions/sales-lead-qualification", icon: Phone },
  { label: "Smart Debt Recovery", href: "/solutions/collections-emi", icon: BarChart3 },
  { label: "Calendar Automation", href: "/solutions/appointment-scheduling", icon: Calendar },
  { label: "Voice-Driven Analytics", href: "/solutions/feedback-csat", icon: Star },
  { label: "Automated HR Interviews", href: "/solutions/recruitment-screening", icon: Users },
  { label: "RTO Prevention", href: "/solutions/ecommerce-cod-rto", icon: ShoppingCart },
];

const INDUSTRIES = [
  { label: "Banking & Finance", href: "/solutions/bfsi", icon: Building2 },
  { label: "Insurance Carriers", href: "/solutions/insurance", icon: Shield },
  { label: "Clinics & Hospitals", href: "/solutions/healthcare", icon: Heart },
  { label: "Property & Real Estate", href: "/solutions/real-estate", icon: Home },
  { label: "Education Platforms", href: "/solutions/edtech", icon: GraduationCap },
  { label: "Supply Chain & Delivery", href: "/solutions/logistics", icon: Truck },
  { label: "Retail & E-commerce", href: "/solutions/d2c-ecommerce", icon: Package },
];

const RESOURCES = [
  { label: "Case Studies", href: "/case-studies" },
  { label: "ROI Calculator", href: "/roi-calculator" },
  { label: "FAQ", href: "/faq" },
  { label: "Integrations", href: "/integrations" },
];

import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSolutions, setMobileSolutions] = useState(false);
  const [mobileIndustries, setMobileIndustries] = useState(false);
  const [mobileResources, setMobileResources] = useState(false);
  
  const solutionsRef = useRef<HTMLDivElement>(null);
  const industriesRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (solutionsRef.current && !solutionsRef.current.contains(e.target as Node)) setSolutionsOpen(false);
      if (industriesRef.current && !industriesRef.current.contains(e.target as Node)) setIndustriesOpen(false);
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) setResourcesOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (pathname.startsWith("/app") || pathname.startsWith("/login") || pathname.startsWith("/admin") || pathname.startsWith("/billing")) {
    return null;
  }

  const closeAll = () => {
    setSolutionsOpen(false);
    setIndustriesOpen(false);
    setResourcesOpen(false);
  }

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-black/85 backdrop-blur-xl border-b border-white/8" : ""
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[#FFD166]/15 flex items-center justify-center">
              <Headset className="w-4 h-4 text-[#FFD166]" />
            </div>
            <span className="text-lg font-bold tracking-tight">swaram</span>
            <span className="text-xs text-gray-600 hidden sm:inline">സ്വരം</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            <Link href="/" className="px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">Home</Link>

            {/* Solutions Dropdown */}
            <div ref={solutionsRef} className="relative">
              <button
                onClick={() => { setSolutionsOpen(!solutionsOpen); setIndustriesOpen(false); setResourcesOpen(false); }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                Solutions <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${solutionsOpen ? "rotate-180" : ""}`} />
              </button>
              {solutionsOpen && (
                <div className="absolute top-full left-0 mt-2 w-[280px] bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-4 animate-fade-up">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-3 ml-2">Use Cases</p>
                  <div className="space-y-0.5">
                    {USE_CASES.map(uc => (
                      <Link key={uc.href} href={uc.href} onClick={closeAll}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-all group">
                        <uc.icon className="w-4 h-4 text-[#FFD166] opacity-70 group-hover:opacity-100" />
                        {uc.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Industries Dropdown */}
            <div ref={industriesRef} className="relative">
              <button
                onClick={() => { setIndustriesOpen(!industriesOpen); setSolutionsOpen(false); setResourcesOpen(false); }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                Industries <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${industriesOpen ? "rotate-180" : ""}`} />
              </button>
              {industriesOpen && (
                <div className="absolute top-full left-0 mt-2 w-[280px] bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-4 animate-fade-up">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-3 ml-2">Industries</p>
                  <div className="space-y-0.5">
                    {INDUSTRIES.map(ind => (
                      <Link key={ind.href} href={ind.href} onClick={closeAll}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-all group">
                        <ind.icon className="w-4 h-4 text-[#FFD166] opacity-70 group-hover:opacity-100" />
                        {ind.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link href="/pricing" className="px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">Pricing</Link>

            {/* Resources Dropdown */}
            <div ref={resourcesRef} className="relative">
              <button
                onClick={() => { setResourcesOpen(!resourcesOpen); setSolutionsOpen(false); setIndustriesOpen(false); }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                Resources <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${resourcesOpen ? "rotate-180" : ""}`} />
              </button>
              {resourcesOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 animate-fade-up">
                  {RESOURCES.map(r => (
                    <Link key={r.href} href={r.href} onClick={closeAll}
                      className="block px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                      {r.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2">Sign in</Link>
            <Link href="/app" className="cta-btn !text-sm !py-2.5 !px-5">
              <Mic className="w-4 h-4" /> Try Demo
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-80 max-w-full bg-[#0D0D0D] border-l border-white/10 overflow-y-auto pt-20 pb-8 px-6">
            <div className="space-y-1">
              <Link href="/" onClick={() => setMobileOpen(false)} className="block px-3 py-3 text-sm text-gray-300 hover:text-white rounded-xl hover:bg-white/5">Home</Link>
              
              <button onClick={() => setMobileSolutions(!mobileSolutions)}
                className="w-full flex items-center justify-between px-3 py-3 text-sm text-gray-300 hover:text-white rounded-xl hover:bg-white/5">
                Solutions <ChevronDown className={`w-4 h-4 transition-transform ${mobileSolutions ? "rotate-180" : ""}`} />
              </button>
              {mobileSolutions && (
                <div className="ml-4 pl-4 border-l border-white/10 space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-gray-600 pt-2 pb-1">Use Cases</p>
                  {USE_CASES.map(uc => (
                    <Link key={uc.href} href={uc.href} onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5">{uc.label}</Link>
                  ))}
                </div>
              )}
              
              <button onClick={() => setMobileIndustries(!mobileIndustries)}
                className="w-full flex items-center justify-between px-3 py-3 text-sm text-gray-300 hover:text-white rounded-xl hover:bg-white/5">
                Industries <ChevronDown className={`w-4 h-4 transition-transform ${mobileIndustries ? "rotate-180" : ""}`} />
              </button>
              {mobileIndustries && (
                <div className="ml-4 pl-4 border-l border-white/10 space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-gray-600 pt-2 pb-1">Industries</p>
                  {INDUSTRIES.map(ind => (
                    <Link key={ind.href} href={ind.href} onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5">{ind.label}</Link>
                  ))}
                </div>
              )}

              <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block px-3 py-3 text-sm text-gray-300 hover:text-white rounded-xl hover:bg-white/5">Pricing</Link>
              
              <button onClick={() => setMobileResources(!mobileResources)}
                className="w-full flex items-center justify-between px-3 py-3 text-sm text-gray-300 hover:text-white rounded-xl hover:bg-white/5">
                Resources <ChevronDown className={`w-4 h-4 transition-transform ${mobileResources ? "rotate-180" : ""}`} />
              </button>
              {mobileResources && (
                <div className="ml-4 pl-4 border-l border-white/10 space-y-1">
                  {RESOURCES.map(r => (
                    <Link key={r.href} href={r.href} onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-white/5">{r.label}</Link>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 space-y-3">
              <Link href="/login" onClick={() => setMobileOpen(false)}
                className="cta-btn-outline w-full text-center justify-center">Sign in</Link>
              <Link href="/app" onClick={() => setMobileOpen(false)}
                className="cta-btn w-full text-center justify-center"><Mic className="w-4 h-4" /> Try Demo</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
