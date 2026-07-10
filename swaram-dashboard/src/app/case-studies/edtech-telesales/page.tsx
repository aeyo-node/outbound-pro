"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Headset, ArrowRight, CheckCircle, BarChart3, TrendingUp, Users, Mic } from "lucide-react";

export default function EdTechCaseStudyPage() {
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
            <span className="text-[#FFD166] font-semibold uppercase tracking-widest text-[10px]">Case Study</span> · EdTech Telesales
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            4x Lead Conversion.<br /><span className="text-gradient">In the languages students actually speak.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            How a leading Kochi-based EdTech platform used Swaram AI voice agents to automate their top-of-funnel lead qualification, dramatically reducing cost-per-SQL while scaling outreach to 8,000 calls per day.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-left">
            <div className="glass-card p-6 border-[#FFD166]/20 bg-[#FFD166]/5">
              <div className="text-3xl font-bold text-gradient mb-1">4x</div>
              <div className="text-sm text-gray-400">Increase in Sales Qualified Leads (SQL)</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-white mb-1">₹220</div>
              <div className="text-sm text-gray-400">Cost per qualified lead (down 70%)</div>
            </div>
            <div className="glass-card p-6">
              <div className="text-3xl font-bold text-white mb-1">8,000+</div>
              <div className="text-sm text-gray-400">Calls handled per day with zero wait time</div>
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
                The client, an online education platform offering upskilling courses to fresh graduates, was generating thousands of leads daily through Facebook and Instagram ads. However, their 40-person telesales team was struggling to keep up.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span><strong>High Latency:</strong> Leads were being called 24-48 hours after form submission, leading to a massive drop in intent.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span><strong>Language Barrier:</strong> Sales reps struggled to match the linguistic preferences of leads across Kerala, Tamil Nadu, and Karnataka.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span><strong>Wasted Effort:</strong> Human agents spent 80% of their time talking to unqualified leads or dealing with unanswered calls.</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <Mic className="w-6 h-6 text-[#FFD166]" /> The Swaram Solution
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                They deployed Swaram AI to handle all top-of-funnel (Tier 1) outreach. The automated call center software was integrated directly with their LeadSquared CRM via Webhooks.
              </p>
              <p className="text-gray-300 leading-relaxed mb-4">
                Now, when a lead submits a Facebook form, Swaram initiates a phone call within <strong>30 seconds</strong>. The AI voice agent speaks in fluent Malayalam, Tamil, or Hinglish depending on the lead's location, asking 3 key BANT (Budget, Authority, Need, Timeline) qualifying questions.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 my-6 font-mono text-sm text-gray-300">
                <div className="mb-2"><span className="text-[#FFD166]">Swaram AI:</span> "Hi Rahul, this is calling from [EdTech]. I saw you just downloaded our Data Science syllabus. Are you looking to upskill for a job change?"</div>
                <div className="mb-2"><span className="text-blue-400">Lead:</span> "Yes, I'm currently working in IT support but want to move into analytics."</div>
                <div><span className="text-[#FFD166]">Swaram AI:</span> "That's a great career move. We have a batch starting next week. Would you like me to connect you to our career counselor right now to discuss the fees and placement assistance?"</div>
              </div>
              <p className="text-gray-300 leading-relaxed">
                If the lead shows intent, Swaram performs a <strong>warm live-transfer</strong> directly to a human closer. If the lead is unqualified, Swaram politely ends the call and updates the CRM status automatically.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-green-400" /> The Results
              </h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                Within the first week of deployment, Swaram qualified more leads than the 40-person human team did in the entire previous month.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-white">Zero Lead Leakage</span>
                  </div>
                  <p className="text-xs text-gray-400">100% of leads are called within 60 seconds of submission, 24/7.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-white">Higher Conversion</span>
                  </div>
                  <p className="text-xs text-gray-400">Regional dialect matching (e.g. Malayalam) instantly builds trust.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-white">Human Optimization</span>
                  </div>
                  <p className="text-xs text-gray-400">Human closers only talk to pre-qualified, high-intent prospects.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="font-semibold text-white">CRM Automation</span>
                  </div>
                  <p className="text-xs text-gray-400">Zero manual data entry. Call summaries and tags synced instantly.</p>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Bottom CTA */}
        <div className="max-w-3xl mx-auto text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Want these results for your business?</h2>
          <p className="text-gray-400 mb-8">Deploy Swaram's AI voice agents for sales qualification today.</p>
          <div className="flex justify-center gap-4">
            <Link href="/solutions/sales-lead-qualification" className="cta-btn-outline">View Use Case <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/contact" className="cta-btn">Book a Demo</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
