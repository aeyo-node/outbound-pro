"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Scale, FileText, ArrowLeft, Mail, AlertTriangle, HelpCircle } from "lucide-react";

export default function TermsAndService() {
  useEffect(() => {
    document.body.className = "landing-body";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Hero header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#FFD166]/10 flex items-center justify-center border border-[#FFD166]/20">
            <Scale className="w-6 h-6 text-[#FFD166]" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Terms of <span className="text-gradient">Service</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">Last updated: July 30, 2026</p>
          </div>
        </div>

        {/* Content card */}
        <div className="glass-card p-8 md:p-12 space-y-8 text-gray-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#FFD166]" /> 1. Acceptance of Terms
            </h2>
            <p>
              By accessing the website <strong>swaram.workflow-tech.info</strong> and using the services provided by <strong>swaramAI</strong> ("we", "us", or "our"), you agree to be bound by these Terms of Service. If you do not agree to all of these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#FFD166]" /> 2. Description of Service
            </h2>
            <p>
              swaramAI provides artificial intelligence-powered voice agent software and automated messaging tools (including WhatsApp Business API integrations) to help businesses automate customer interactions, lead qualification, and support. 
            </p>
            <p>
              We provide demo accounts and automated sample calls/messages to prospective customers who explicitly request a demo through our platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#FFD166]" /> 3. Consent to Communication
            </h2>
            <p>
              By providing your contact details (such as email address, phone number, and WhatsApp number) and submitting a demo request, you explicitly consent to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Receiving automated phone calls from our AI voice agents to demonstrate the capabilities of the platform.</li>
              <li>Receiving automated notifications and messages via WhatsApp and SMS regarding scheduling, configuration, and follow-ups of your requested demo.</li>
            </ul>
            <p>
              Consent can be withdrawn at any time by replying <strong>"STOP"</strong> to our WhatsApp messages, or by emailing <a href="mailto:alph.cthomas@gmail.com" className="text-[#FFD166] hover:underline">alph.cthomas@gmail.com</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#FFD166]" /> 4. User Responsibilities & Acceptable Use
            </h2>
            <p>
              When using our website or requesting a demo, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate, current, and complete information.</li>
              <li>Not impersonate any other individual or entity.</li>
              <li>Not use our AI communication tools to harass, spam, or send fraudulent messages to third parties.</li>
              <li>Comply with all applicable communications regulations, including TRAI guidelines, DND registry restrictions, and local privacy laws in India.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#FFD166]" /> 5. Intellectual Property
            </h2>
            <p>
              All software, AI voice models, text structures, designs, icons, trademarks, and logos associated with swaramAI are the intellectual property of swaramAI or its licensors. You are granted a limited, non-exclusive, non-transferable license to access our platform solely for personal and internal evaluation purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#FFD166]" /> 6. Disclaimer of Warranties & Limitation of Liability
            </h2>
            <p>
              The platform and demos are provided on an "AS IS" and "AS AVAILABLE" basis without warranty of any kind, either express or implied. Under no circumstances shall swaramAI be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#FFD166]" /> 7. Contact Details
            </h2>
            <p>
              If you have any questions or require support regarding these Terms of Service, please contact us at:
            </p>
            <p className="text-white">
              <strong>Swaram AI Support</strong><br />
              Email: <a href="mailto:alph.cthomas@gmail.com" className="text-[#FFD166] hover:underline">alph.cthomas@gmail.com</a><br />
              Location: Kerala, India
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
