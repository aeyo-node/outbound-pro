"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, Building2, BarChart3, Shield, Briefcase, Mic } from "lucide-react";

export default function BFSIPage() {
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
            <Building2 className="w-3.5 h-3.5 text-[#FFD166]" /> Banking & Financial Services (BFSI)
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Secure voice AI.<br /><span className="text-gradient">For Indian finance.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Automate collections, loan lead qualification, and KYC verifications with a highly secure, RBI-compliant voice agent that speaks 12 regional languages.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link href="#demo" className="cta-btn"><Mic className="w-4 h-4" /> Try Live Demo</Link>
            <Link href="/contact" className="cta-btn-outline">Talk to Sales <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        {/* Use Cases Grid */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
          <Link href="/solutions/collections-emi" className="glass-card p-8 group hover:border-[#FFD166]/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-[#FFD166]">EMI Collections</h3>
            <p className="text-gray-400 text-sm leading-relaxed">0-30 day bucket recovery. Polite, compliant, and automated follow-ups with instant payment links.</p>
          </Link>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Briefcase className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Loan Qualification</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Call leads instantly to verify salary, CIBIL score requirements, and loan purpose before assigning a human agent.</p>
          </div>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Fraud & KYC Verification</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Automated calls to verify address details, confirm recent large transactions, and prevent fraudulent applications.</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Built for compliance and scale</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram in your financial institution and modernize your customer contact strategy.</p>
          <div className="flex justify-center gap-4">
            <Link href="/case-studies/nbfc-emi-collections" className="cta-btn-outline">Read Case Study <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
