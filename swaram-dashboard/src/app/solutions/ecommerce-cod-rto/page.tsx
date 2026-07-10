"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, ShoppingCart, Truck, ShieldAlert, CheckCircle, Mic } from "lucide-react";

export default function EcommerceCODRTOPage() {
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
            <ShoppingCart className="w-3.5 h-3.5 text-[#FFD166]" /> E-commerce COD & RTO
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Confirm COD orders.<br /><span className="text-gradient">Slash your RTO rate.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Automate Cash on Delivery (COD) confirmations, address verifications, and delivery attempt resolutions with voice AI that speaks your customers' language.
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
              <ShoppingCart className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Pre-shipment COD Confirmation</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Call customers instantly after they place a COD order to confirm intent and verify the delivery address before you incur shipping costs.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Truck className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">NDR Management</h3>
            <p className="text-gray-400 text-sm leading-relaxed">When a delivery fails (Non-Delivery Report), Swaram calls the customer immediately to resolve issues like incorrect address or customer unavailability.</p>
          </div>
          <div className="glass-card p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <ShieldAlert className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">RTO Reduction</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Proactive communication significantly reduces Return to Origin (RTO) rates, saving E-commerce and D2C brands massive logistics losses.</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Protect your margins</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram today and stop losing money on fake orders and failed deliveries.</p>
          <div className="flex justify-center gap-4">
            <Link href="/roi-calculator" className="cta-btn-outline">Calculate ROI <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
