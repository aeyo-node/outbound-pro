"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, ShoppingBag, ShoppingCart, RefreshCcw, Mic } from "lucide-react";

export default function D2CEcommercePage() {
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
            <ShoppingBag className="w-3.5 h-3.5 text-[#FFD166]" /> D2C & E-commerce
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Confirm COD orders.<br /><span className="text-gradient">Recover abandoned carts.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Protect your margins with automated voice AI that confirms Cash-on-Delivery orders, wins back carts, and integrates directly with Shopify.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link href="#demo" className="cta-btn"><Mic className="w-4 h-4" /> Try Live Demo</Link>
            <Link href="/contact" className="cta-btn-outline">Talk to Sales <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>

        {/* Use Cases Grid */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
          <Link href="/solutions/ecommerce-cod-rto" className="glass-card p-8 group hover:border-[#FFD166]/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <ShoppingCart className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-[#FFD166]">COD Confirmation</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Automatically call high-risk COD orders to confirm intent and prevent costly Return to Origin (RTO) incidents.</p>
          </Link>
          <Link href="/solutions/revenue-recovery" className="glass-card p-8 group hover:border-[#FFD166]/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <RefreshCcw className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-[#FFD166]">Abandoned Cart Recovery</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Trigger an immediate outbound call for high-value abandoned carts to offer assistance and close the sale.</p>
          </Link>
          <Link href="/solutions/customer-support" className="glass-card p-8 group hover:border-[#FFD166]/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Headset className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-[#FFD166]">Where is my order? (WISMO)</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Deflect support volume by letting Swaram AI handle order tracking requests naturally over the phone 24/7.</p>
          </Link>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Integrates deeply with Shopify & WooCommerce</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram today to scale your D2C brand's communication.</p>
          <div className="flex justify-center gap-4">
            <Link href="/integrations" className="cta-btn-outline">View Integrations <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
