"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, ShieldCheck, BarChart3, Clock, DollarSign, Mic } from "lucide-react";

export default function NBFCCaseStudyPage() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main>
      

      <div className="pt-28 pb-20 px-6">
        {/* Hero */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-6 text-xs text-gray-400">
            <span className="text-[#FFD166] font-semibold uppercase tracking-widest text-[10px]">Case Study</span> · NBFC EMI Collections
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            38% higher EMI recovery.<br /><span className="text-gradient">Zero compliance violations.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            How a mid-sized NBFC in Kerala replaced their outsourced calling agencies with Swaram AI to automate 0-30 day EMI reminders in Malayalam and Hindi.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
            <div className="glass-card p-6 border-[#FFD166]/20 bg-[#FFD166]/5">
              <div className="text-3xl font-bold text-gradient mb-1">38%</div>
              <div className="text-sm text-gray-400">Increase in 0-30 day bucket recovery</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-white mb-1">₹180</div>
              <div className="text-sm text-gray-400">Avg. cost per successful recovery</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-white mb-1">100%</div>
              <div className="text-sm text-gray-400">RBI Fair Practices Code compliant</div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-3xl mx-auto">
          <div className="glass-card p-8 md:p-12 space-y-10">
            
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-gray-500" /> The Challenge
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                An established Non-Banking Financial Company (NBFC) specializing in two-wheeler and gold loans was facing massive operational costs outsourcing their early-bucket (0-30 day) EMI collections to third-party call centers.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span><strong>Compliance Risks:</strong> Outsourced agents occasionally used aggressive language or called outside RBI-permitted hours, risking heavy regulatory fines.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span><strong>Low Penetration:</strong> Human agents could only dial so many numbers a day, leaving thousands of accounts uncontacted in the crucial first 5 days post-due-date.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span><strong>High Costs:</strong> Paying per-seat to BPOs for early bucket reminders was severely eating into the margins of small-ticket loans.</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-[#FFD166]" /> The Swaram Solution
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                They integrated Swaram AI's automated call center software directly with their Core Banking System (CBS) via our secure REST API. Swaram now handles 100% of the D+1 to D+15 collections outreach.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                Swaram's voice agents call borrowers in <strong>Malayalam or Hindi</strong> depending on their registered region. The AI uses empathetic, polite language designed specifically to adhere to the RBI Fair Practices Code.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 my-6 font-mono text-sm text-gray-300">
                <div className="mb-2"><span className="text-[#FFD166]">Swaram AI:</span> "Namaskaram, this is a courtesy call regarding your two-wheeler loan ending in 4321. We noticed the EMI of ₹2,500 due on the 5th has not been received yet. Are you facing any issues making the payment?"</div>
                <div className="mb-2"><span className="text-blue-400">Borrower:</span> "Oh, I forgot. I will pay it by tomorrow evening."</div>
                <div><span className="text-[#FFD166]">Swaram AI:</span> "Thank you for confirming. I have noted that you will pay by tomorrow evening. Would you like me to send a Razorpay payment link via SMS right now?"</div>
              </div>
              <p className="text-gray-300 leading-relaxed">
                Swaram logs the Promise To Pay (PTP) date automatically. If the user agrees, it fires a webhook to instantly send a payment link via WhatsApp. Swaram strictly enforces calling windows (no calls before 9 AM or after 9 PM).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-green-400" /> The Results
              </h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                By switching from human BPOs to Swaram AI for early buckets, the NBFC saw a massive improvement in both recovery rates and operational compliance.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-white">100% Account Coverage</span>
                  </div>
                  <p className="text-xs text-gray-400">All defaulted accounts are contacted on D+1. Swaram scales infinitely to dial 5 Lakh+ accounts in a day if needed.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-white">Zero Compliance Breaches</span>
                  </div>
                  <p className="text-xs text-gray-400">Every call is polite, recorded, transcribed, and made strictly within RBI permitted hours.</p>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Want to automate your collections?</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram's AI voice agents for EMI recovery today.</p>
          <div className="flex justify-center gap-4">
            <Link href="/solutions/collections-emi" className="cta-btn-outline">View Use Case <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
