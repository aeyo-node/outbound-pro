"use client";

import React, { useEffect, useState } from "react";
import { Check, Zap, Crown, Building2, CreditCard, Calendar, X, Loader2 } from "lucide-react";

const API = "/api";

const PLAN_ICONS: Record<string, any> = { starter: Zap, growth: Crown, enterprise: Building2 };
const PLAN_COLORS: Record<string, string> = { starter: "#60a5fa", growth: "#FFD166", enterprise: "#a78bfa" };

export default function BillingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<any>(null);
  const [paySuccess, setPaySuccess] = useState(false);
  const [cardNum, setCardNum] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("swaram_token") || "" : "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    const init = async () => {
      const [plansRes, subRes, histRes] = await Promise.all([
        fetch(`${API}/billing/plans`).then(r => r.json()).catch(() => []),
        fetch(`${API}/billing/subscription`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API}/billing/history`, { headers }).then(r => r.json()).catch(() => []),
      ]);
      setPlans(plansRes);
      setSubscription(subRes && subRes.id ? subRes : null);
      setHistory(histRes || []);
      setLoading(false);
    };
    init();
  }, []);

  const handleUpgrade = (plan: any) => {
    setPayModal(plan);
    setPaySuccess(false);
    setCardNum(""); setCardName(""); setCardExp(""); setCardCvv("");
  };

  const handlePayConfirm = async () => {
    if (!payModal) return;
    setSubscribing(payModal.id);
    try {
      const res = await fetch(`${API}/billing/subscribe`, {
        method: "POST",
        headers,
        body: JSON.stringify({ plan_id: payModal.id, payment_ref: `SIM-${Date.now()}`, amount_paid: payModal.price_inr }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubscription(data.subscription);
        setPaySuccess(true);
        // Refresh history
        const h = await fetch(`${API}/billing/history`, { headers }).then(r => r.json()).catch(() => []);
        setHistory(h);
        setTimeout(() => { setPayModal(null); setPaySuccess(false); }, 2000);
      }
    } finally {
      setSubscribing(null);
    }
  };

  const currentPlanId = subscription?.plan_id || "none";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[#FFD166]" />
    </div>
  );

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-semibold text-white">Billing & Plans</h2>
        <p className="text-sm text-gray-400 mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current Plan Banner */}
      {subscription && (
        <div className="bg-gradient-to-br from-[#FFD166]/10 to-[#FFD166]/5 border border-[#FFD166]/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Current Plan</p>
            <h3 className="text-xl font-semibold text-white capitalize">{subscription.billing_plans?.name || subscription.plan_id}</h3>
            <p className="text-sm text-gray-400 mt-1">
              ₹{subscription.billing_plans?.price_inr?.toLocaleString("en-IN")}/month ·{" "}
              Expires {new Date(subscription.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-green-400">Active</span>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-4">Choose a Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan: any) => {
            const Icon = PLAN_ICONS[plan.id] || Zap;
            const color = PLAN_COLORS[plan.id] || "#FFD166";
            const isCurrent = plan.id === currentPlanId;
            const features: Record<string, any> = plan.features || {};

            return (
              <div key={plan.id} className={`relative bg-[#1C1C1E] border rounded-2xl p-6 flex flex-col transition-all ${
                isCurrent ? "border-[#FFD166]/40 shadow-[0_0_30px_rgba(255,209,102,0.08)]" : "border-white/10 hover:border-white/20"
              }`}>
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFD166] text-black text-[10px] font-bold px-3 py-1 rounded-full">
                    CURRENT
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white capitalize">{plan.name}</h4>
                    <p className="text-xs text-gray-500">per month</p>
                  </div>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-light text-white">₹{plan.price_inr.toLocaleString("en-IN")}</span>
                </div>

                <div className="space-y-2 flex-1 mb-6">
                  <FeatureRow ok label={`${plan.calls_limit === -1 ? "Unlimited" : plan.calls_limit.toLocaleString()} calls/month`} />
                  <FeatureRow ok label={`${plan.agents_limit === -1 ? "Unlimited" : plan.agents_limit} agent profile${plan.agents_limit !== 1 ? "s" : ""}`} />
                  <FeatureRow ok={features.campaigns} label="Outbound campaigns" />
                  <FeatureRow ok={features.crm} label="CRM & Leads" />
                  <FeatureRow ok={features.recordings} label="Call recordings" />
                  <FeatureRow ok={features.live_monitoring} label="Live monitoring" />
                  <FeatureRow ok={features.custom_sip} label="Custom SIP/Twilio" />
                  <FeatureRow ok={features.api_access} label="API access" />
                  <FeatureRow ok label={`Analytics: ${features.analytics}`} />
                  <FeatureRow ok label={`${features.support} support`} />
                </div>

                <button
                  onClick={() => !isCurrent && handleUpgrade(plan)}
                  disabled={isCurrent}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
                    isCurrent
                      ? "bg-white/5 text-gray-500 cursor-default"
                      : "text-black hover:opacity-90"
                  }`}
                  style={!isCurrent ? { backgroundColor: color } : {}}
                >
                  {isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History */}
      {history.length > 0 && (
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" /> Payment History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-white/5">
                  <th className="text-left pb-3 font-medium">Plan</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                  <th className="text-left pb-3 font-medium">Amount</th>
                  <th className="text-left pb-3 font-medium">Ref</th>
                  <th className="text-left pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {history.map((h: any, i: number) => (
                  <tr key={i}>
                    <td className="py-3 text-white capitalize">{h.billing_plans?.name || h.plan_id}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        h.status === "active" ? "bg-green-500/10 text-green-400" :
                        h.status === "cancelled" ? "bg-red-500/10 text-red-400" :
                        "bg-white/5 text-gray-400"
                      }`}>{h.status}</span>
                    </td>
                    <td className="py-3 text-gray-300">₹{(h.amount_paid || 0).toLocaleString("en-IN")}</td>
                    <td className="py-3 text-gray-500 text-xs">{h.payment_ref || "—"}</td>
                    <td className="py-3 text-gray-500 text-xs">{new Date(h.created_at).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setPayModal(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            {paySuccess ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Subscription Activated!</h3>
                <p className="text-sm text-gray-400">You are now on the <span className="text-white capitalize">{payModal.name}</span> plan.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="w-5 h-5 text-[#FFD166]" />
                  <div>
                    <h3 className="font-semibold text-white">Upgrade to {payModal.name}</h3>
                    <p className="text-xs text-gray-400">₹{payModal.price_inr.toLocaleString("en-IN")}/month</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Card Number</label>
                    <input
                      value={cardNum} onChange={e => setCardNum(e.target.value.replace(/\D/g, "").slice(0, 16))}
                      placeholder="4242 4242 4242 4242"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FFD166]/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Name on Card</label>
                    <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="John Doe"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FFD166]/40" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">Expiry</label>
                      <input value={cardExp} onChange={e => setCardExp(e.target.value)} placeholder="MM/YY"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FFD166]/40" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-widest mb-1 block">CVV</label>
                      <input value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="•••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#FFD166]/40" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600">This is a simulated payment — no real charge will be made. Stripe integration coming soon.</p>
                  <button
                    onClick={handlePayConfirm}
                    disabled={subscribing === payModal.id}
                    className="w-full py-3 rounded-xl text-sm font-semibold bg-[#FFD166] text-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {subscribing === payModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Pay ₹{payModal.price_inr.toLocaleString("en-IN")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureRow({ ok, label }: { ok: boolean | string; label: string }) {
  const isOk = ok === true || (typeof ok === "string" && ok !== "false" && ok !== "");
  return (
    <div className="flex items-center gap-2">
      {isOk
        ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
        : <X className="w-3.5 h-3.5 text-gray-600 shrink-0" />}
      <span className={`text-xs ${isOk ? "text-gray-300" : "text-gray-600"}`}>{label}</span>
    </div>
  );
}
