"use client";
import Link from "next/link";
import { Headset } from "lucide-react";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/login")) {
    return null;
  }
  
  return (
    <footer className="border-t border-white/5 py-16 px-6 mt-auto">
      <div className="max-w-7xl mx-auto">
        {/* Top CTA Bar */}
        <div className="glass-card p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-lg font-semibold">Put Swaram on your phone lines.</p>
            <p className="text-sm text-gray-400 mt-1">Book a 30-minute walkthrough or try the live demo now.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/app" className="cta-btn !py-2.5 !px-6 !text-sm">Book a Demo</Link>
            <Link href="/login" className="cta-btn-outline !py-2.5 !px-6 !text-sm">Sign in</Link>
          </div>
        </div>

        {/* Footer Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#FFD166]/15 flex items-center justify-center">
                <Headset className="w-3.5 h-3.5 text-[#FFD166]" />
              </div>
              <span className="font-bold">swaram</span>
              <span className="text-xs text-gray-600">സ്വരം</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed max-w-[200px]">AI voice agents for Indian businesses. 12 languages. Zero wait time.</p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-4">Use Cases</p>
            <ul className="space-y-2.5">
              {[
                ["Automated Support", "/solutions/customer-support"],
                ["Intelligent Routing", "/solutions/sales-lead-qualification"],
                ["Smart Debt Recovery", "/solutions/collections-emi"],
                ["Calendar Automation", "/solutions/appointment-scheduling"],
                ["Voice Analytics", "/solutions/feedback-csat"],
                ["Automated Interviews", "/solutions/recruitment-screening"],
                ["RTO Prevention", "/solutions/ecommerce-cod-rto"],
              ].map(([label, href]) => (
                <li key={href}><Link href={href} className="text-xs text-gray-500 hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-4">Industries</p>
            <ul className="space-y-2.5">
              {[
                ["Banking & Finance", "/solutions/bfsi"],
                ["Insurance Carriers", "/solutions/insurance"],
                ["Clinics & Hospitals", "/solutions/healthcare"],
                ["Property & Real Estate", "/solutions/real-estate"],
                ["Education Platforms", "/solutions/edtech"],
                ["Supply Chain", "/solutions/logistics"],
                ["Retail & E-commerce", "/solutions/d2c-ecommerce"],
              ].map(([label, href]) => (
                <li key={href}><Link href={href} className="text-xs text-gray-500 hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-4">Resources</p>
            <ul className="space-y-2.5">
              {[
                ["Case Studies", "/case-studies"],
                ["ROI Calculator", "/roi-calculator"],
                ["FAQ", "/faq"],
                ["Integrations", "/integrations"],
                ["Pricing", "/pricing"],
                ["Dashboard", "/login"],
              ].map(([label, href]) => (
                <li key={href}><Link href={href} className="text-xs text-gray-500 hover:text-white transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-700">© 2026 Swaram AI. All rights reserved. · Kerala, India</p>
          <div className="flex gap-4 text-xs text-gray-600">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
