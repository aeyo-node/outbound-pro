"use client";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Heart, Car, Shield, Users, GraduationCap, Landmark, Zap, MessageSquare, Phone, BarChart3, Calendar, Star, ShoppingCart, Truck, Package, ShieldCheck } from "lucide-react";

const USE_CASES = [
  { label: "Swaram Revenue Rescue", href: "/solutions/revenue-recovery", icon: Zap },
  { label: "Intelligent Lead Routing", href: "/solutions/sales-lead-qualification", icon: Phone },
  { label: "Automated Support Center", href: "/solutions/customer-support", icon: MessageSquare },
  { label: "Smart Debt Recovery", href: "/solutions/collections-emi", icon: BarChart3 },
  { label: "Calendar Automation", href: "/solutions/appointment-scheduling", icon: Calendar },
  { label: "Voice-Driven Analytics", href: "/solutions/feedback-csat", icon: Star },
  { label: "Automated HR Interviews", href: "/solutions/recruitment-screening", icon: Users },
  { label: "Order & RTO Prevention", href: "/solutions/ecommerce-cod-rto", icon: ShoppingCart },
];

const INDUSTRIES = [
  { label: "Banking & Finance", href: "/solutions/bfsi", icon: Landmark },
  { label: "Insurance Carriers", href: "/solutions/insurance", icon: ShieldCheck },
  { label: "Clinics & Hospitals", href: "/solutions/healthcare", icon: Heart },
  { label: "Property & Real Estate", href: "/solutions/real-estate", icon: Building2 },
  { label: "Education Platforms", href: "/solutions/edtech", icon: GraduationCap },
  { label: "Supply Chain & Delivery", href: "/solutions/logistics", icon: Truck },
  { label: "Retail & E-commerce", href: "/solutions/d2c-ecommerce", icon: Package },
];

export default function SolutionsHubPage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main className="pt-28 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 text-xs text-gray-400">
            Solutions Directory
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            AI voice agents for<br /><span className="text-gradient">every workflow.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Explore how Swaram transforms customer communication across different industries and use cases.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16">
          {/* Use Cases */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Zap className="w-6 h-6 text-[#FFD166]" /> Top Use Cases
            </h2>
            <div className="grid gap-4">
              {USE_CASES.map((uc, i) => (
                <Link key={i} href={uc.href} className="glass-card p-5 group flex items-center justify-between hover:border-[#FFD166]/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#FFD166]/10 transition-colors">
                      <uc.icon className="w-5 h-5 text-gray-400 group-hover:text-[#FFD166]" />
                    </div>
                    <span className="font-semibold text-white group-hover:text-[#FFD166] transition-colors">{uc.label}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 group-hover:text-[#FFD166] transition-all" />
                </Link>
              ))}
            </div>
          </div>

          {/* Industries */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Building2 className="w-6 h-6 text-[#FFD166]" /> Industries We Serve
            </h2>
            <div className="grid gap-4">
              {INDUSTRIES.map((ind, i) => (
                <Link key={i} href={ind.href} className="glass-card p-5 group flex items-center justify-between hover:border-[#FFD166]/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[#FFD166]/10 transition-colors">
                      <ind.icon className="w-5 h-5 text-gray-400 group-hover:text-[#FFD166]" />
                    </div>
                    <span className="font-semibold text-white group-hover:text-[#FFD166] transition-colors">{ind.label}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 group-hover:text-[#FFD166] transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 max-w-4xl mx-auto">
          <div className="glass-card p-12 text-center glow-accent relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-[#FFD166]/5 to-transparent" />
             <div className="relative z-10">
               <h3 className="text-3xl font-bold mb-4">Don't see your use case?</h3>
               <p className="text-gray-400 mb-8">Swaram's API can be integrated into any custom workflow. Talk to our engineers to build a tailored solution.</p>
               <Link href="/contact" className="cta-btn-outline">Contact Engineering <ArrowRight className="w-4 h-4" /></Link>
             </div>
          </div>
        </div>

      </div>
    </main>
  );
}
