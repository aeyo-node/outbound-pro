"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, Truck, MapPin, AlertCircle, Mic } from "lucide-react";

export default function LogisticsPage() {
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
            <Truck className="w-3.5 h-3.5 text-[#FFD166]" /> Logistics & Supply Chain
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Resolve NDRs.<br /><span className="text-gradient">Reduce your RTOs.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Automate last-mile communication. Call customers instantly when a delivery fails to get alternate addresses or reschedule delivery attempts.
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
              <AlertCircle className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-[#FFD166]">NDR Resolution</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Immediately call customers upon a Non-Delivery Report. Find out if the address was wrong or if they were simply unavailable.</p>
          </Link>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <MapPin className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Address Verification</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Pre-emptively confirm incomplete addresses via a quick automated call before dispatching the shipment.</p>
          </div>
          <div className="glass-card p-8 group">
            <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center mb-6">
              <Truck className="w-6 h-6 text-[#FFD166]" />
            </div>
            <h3 className="text-xl font-bold mb-3">Delivery Scheduling</h3>
            <p className="text-gray-400 text-sm leading-relaxed">For large shipments (furniture, appliances), automate the delivery time slot booking with the customer.</p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Fix your last-mile leaks</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram today and drastically reduce your logistics costs.</p>
          <div className="flex justify-center gap-4">
            <Link href="/roi-calculator" className="cta-btn-outline">Calculate ROI <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
