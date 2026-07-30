"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Shield, Lock, FileText, ArrowLeft, Mail, Info, Trash2 } from "lucide-react";

export default function PrivacyPolicy() {
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
            <Shield className="w-6 h-6 text-[#FFD166]" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Privacy <span className="text-gradient">Policy</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">Last updated: July 30, 2026</p>
          </div>
        </div>

        {/* Content card */}
        <div className="glass-card p-8 md:p-12 space-y-8 text-gray-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-[#FFD166]" /> 1. Introduction
            </h2>
            <p>
              Welcome to <strong>swaramAI</strong> (accessible at <code className="text-white/80 bg-white/5 px-1.5 py-0.5 rounded">swaram.workflow-tech.info</code>). We are committed to protecting your personal data and respecting your privacy.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you request a product demo or interact with our AI-powered voice agent and communication platform. 
              <strong> This policy is specifically structured to meet the verification requirements of the Meta developer dashboard for our WhatsApp business messaging integration.</strong>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#FFD166]" /> 2. Information We Collect
            </h2>
            <p>
              We collect information that you voluntarily provide to us when you request a demo, subscribe to our updates, or communicate with us. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contact Information:</strong> Your name, business email address, company name, and phone number (including your WhatsApp-registered phone number).</li>
              <li><strong>Demo Request Details:</strong> Specific preferences or context you provide about your business call automation needs.</li>
              <li><strong>Communication Metadata:</strong> Timestamps, message/call delivery status, and logs generated when our AI system interacts with you (via phone call or WhatsApp message) as part of your requested demo.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#FFD166]" /> 3. How We Use Your Information
            </h2>
            <p>
              We use the collected information for the following specific purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>To Deliver the Demo:</strong> To coordinate, schedule, and run the automated AI voice demo that you requested.</li>
              <li><strong>WhatsApp Notifications & Messaging:</strong> To send WhatsApp messages to customers who have requested a demo. These messages include booking confirmations, reminders, and follow-up details directly related to the requested demo.</li>
              <li><strong>Service Improvement:</strong> To analyze the performance of our AI voice and text models to ensure higher accuracy and conversational flow.</li>
              <li><strong>Compliance and Security:</strong> To verify compliance with local regulations, including DND (Do Not Disturb) scrubbing and TRAI guidelines in India.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#FFD166]" /> 4. WhatsApp Consent and Opt-In Policy
            </h2>
            <p>
              We strictly adhere to Meta's WhatsApp Business Policy. 
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Explicit Opt-in:</strong> We will only send WhatsApp messages to users who have explicitly requested a demo and provided their phone number for this purpose. </li>
              <li><strong>Opt-out Instructions:</strong> Users can opt-out of receiving WhatsApp messages at any time. You can opt out by replying <strong>"STOP"</strong> to any WhatsApp message you receive from us, or by contacting us directly at <a href="mailto:alph.cthomas@gmail.com" className="text-[#FFD166] hover:underline">alph.cthomas@gmail.com</a>. Once opted out, we will immediately cease sending messages to that phone number.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-[#FFD166]" /> 5. User Data Deletion Instructions
            </h2>
            <p>
              In compliance with Meta's developer policies, we provide a clear and easy path for users to request the deletion of their personal data.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
              <p className="font-semibold text-white">How to request data deletion:</p>
              <p>
                If you wish to delete your personal data stored by swaramAI (such as your name, email, phone number, and demo history), please send an email with the subject <strong>"Data Deletion Request"</strong> to:
              </p>
              <p className="text-lg font-bold text-center text-[#FFD166] my-2">
                <a href="mailto:alph.cthomas@gmail.com" className="hover:underline">alph.cthomas@gmail.com</a>
              </p>
              <p>
                Our compliance officer will process your request within <strong>24 to 48 hours</strong>. You will receive a confirmation email once all your personal data has been permanently purged from our active databases and servers.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#FFD166]" /> 6. Data Security and Sharing
            </h2>
            <p>
              We implement industry-standard security measures to encrypt and protect your data both in transit and at rest. We do not sell, rent, or lease your personal information to third parties. We only share information with third-party service providers (like Meta for WhatsApp delivery) strictly as necessary to execute the requested demo services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#FFD166]" /> 7. Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or feedback regarding this Privacy Policy, please contact us at:
            </p>
            <p className="text-white">
              <strong>Swaram AI Support Team</strong><br />
              Email: <a href="mailto:alph.cthomas@gmail.com" className="text-[#FFD166] hover:underline">alph.cthomas@gmail.com</a><br />
              Location: Kerala, India
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
