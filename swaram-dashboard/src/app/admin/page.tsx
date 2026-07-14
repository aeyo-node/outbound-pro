"use client";

import React, { useEffect, useState } from "react";
import {
  Users, Phone, IndianRupee, TrendingUp, Plus, Edit2, Crown,
  Shield, AlertCircle, Activity, LogOut, BarChart3, Search, X, Loader2, Check, Eye
} from "lucide-react";

const API = "/api";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("swaram_token") || "" : "";
}

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "#FFD166" }: any) {
  return (
    <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 flex flex-col gap-3 hover:border-white/20 transition-colors">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-light text-white">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Create Client Modal ────────────────────────────────────────────────────────
function CreateClientModal({ plans, onClose, onCreated }: any) {
  const [form, setForm] = useState({ name: "", email: "", admin_name: "", admin_password: "", plan_id: "starter" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/admin/tenants`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create client");
      setSuccess(data);
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        {success ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Client Created!</h3>
            <p className="text-sm text-gray-400 mb-1"><span className="text-white">{success.tenant?.name}</span> has been onboarded.</p>
            <p className="text-xs text-gray-600">Login: {success.user?.email}</p>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-white mb-5 flex items-center gap-2"><Plus className="w-4 h-4 text-[#FFD166]" /> Create New Client</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Company Name *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Acme Corp" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD166]/40" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Plan</label>
                  <select value={form.plan_id} onChange={e => setForm({ ...form, plan_id: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD166]/40">
                    {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name} — ₹{p.price_inr}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Admin Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="admin@client.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD166]/40" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Admin Name</label>
                  <input value={form.admin_name} onChange={e => setForm({ ...form, admin_name: e.target.value })}
                    placeholder="John Doe" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD166]/40" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Password *</label>
                  <input required type="password" value={form.admin_password} onChange={e => setForm({ ...form, admin_password: e.target.value })}
                    placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD166]/40" />
                </div>
              </div>
              {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-[#FFD166] text-black rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} Create Client
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Client Detail Drawer ───────────────────────────────────────────────────────
function ClientDetailDrawer({ tenant, plans, onClose, onUpdated }: any) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [editPlan, setEditPlan] = useState(tenant.plan_id);
  const [editStatus, setEditStatus] = useState(tenant.status);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/admin/tenants/${tenant.id}/stats?days=30`, { headers: authHeaders() })
      .then(r => r.json()).then(setAnalytics).catch(() => null);
  }, [tenant.id]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`${API}/admin/tenants/${tenant.id}`, {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ plan_id: editPlan, status: editStatus }),
    });
    if (editPlan !== tenant.plan_id) {
      await fetch(`${API}/admin/tenants/${tenant.id}/grant-plan`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ plan_id: editPlan }),
      });
    }
    setSaving(false);
    onUpdated();
    onClose();
  };

  const stats = analytics?.analytics;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0A0A0A] border-l border-white/10 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-white">{tenant.name}</h3>
            <p className="text-xs text-gray-500">{tenant.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Stats */}
        {stats ? (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: "Total Calls", value: stats.total_calls, color: "#FFD166" },
              { label: "Booked", value: stats.booked, color: "#4ade80" },
              { label: "Avg Duration", value: `${Math.round(stats.avg_duration_seconds)}s`, color: "#60a5fa" },
              { label: "Connect Rate", value: `${stats.connect_rate_percent}%`, color: "#a78bfa" },
            ].map((s, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-lg font-light mt-1" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading stats...</div>
        )}

        {/* Controls */}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Plan</label>
            <select value={editPlan} onChange={e => setEditPlan(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
              {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name} — ₹{p.price_inr}/mo</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="trial">Trial</option>
            </select>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 bg-[#FFD166] text-black rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Page ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [overview, setOverview] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const role = localStorage.getItem("swaram_role");
    if (!token || role !== "superadmin") {
      window.location.href = "/login";
      return;
    }
    document.body.className = "dashboard-body bg-[#0A0A0A] text-white";
    load();
    return () => { document.body.className = ""; };
  }, []);

  const load = async () => {
    setLoading(true);
    const [ov, pl] = await Promise.all([
      fetch(`${API}/admin/overview`, { headers: authHeaders() }).then(r => r.json()).catch(() => null),
      fetch(`${API}/billing/plans`).then(r => r.json()).catch(() => []),
    ]);
    setOverview(ov);
    setPlans(pl);
    setLoading(false);
  };

  const handleLogout = () => {
    fetch("/api/auth/logout", { method: "POST", headers: authHeaders() });
    localStorage.clear();
    window.location.href = "/login";
  };

  const filteredTenants = (overview?.tenants || []).filter((t: any) =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  const PLAN_COLORS: Record<string, string> = { starter: "#60a5fa", growth: "#FFD166", enterprise: "#a78bfa" };

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#FFD166] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
      {/* Top Bar */}
      <header className="border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FFD166] to-[#FF9F1C] flex items-center justify-center">
            <Shield className="w-4 h-4 text-black" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">Swaram Super Admin</h1>
            <p className="text-[10px] text-gray-500">Platform Control Center</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/app" className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
            My Dashboard
          </a>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-400/20 transition-colors">
            <LogOut className="w-3 h-3" /> Logout
          </button>
        </div>
      </header>

      <main className="px-8 py-8 max-w-[1400px] mx-auto space-y-8">

        {/* Platform KPIs */}
        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">Platform Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={Users} label="Total Clients" value={overview?.total_tenants ?? 0} />
            <StatCard icon={Activity} label="Active Clients" value={overview?.active_tenants ?? 0} color="#4ade80" />
            <StatCard icon={Phone} label="Total Calls" value={(overview?.total_calls_platform ?? 0).toLocaleString()} color="#60a5fa" />
            <StatCard icon={TrendingUp} label="Total Booked" value={overview?.total_booked_platform ?? 0} color="#a78bfa" />
            <StatCard icon={IndianRupee} label="MRR" value={`₹${(overview?.mrr_inr ?? 0).toLocaleString("en-IN")}`} color="#FFD166" />
            <StatCard icon={BarChart3} label="Calls Today" value={overview?.calls_today ?? 0} color="#fb923c" />
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-medium text-white">Clients</h3>
              <p className="text-xs text-gray-400">{filteredTenants.length} total</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border border-white/10 rounded-xl px-3 py-2">
                <Search className="w-3.5 h-3.5 text-gray-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
                  className="bg-transparent text-sm text-white outline-none w-40 placeholder-gray-600" />
              </div>
              <button onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#FFD166] text-black rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity">
                <Plus className="w-3.5 h-3.5" /> New Client
              </button>
            </div>
          </div>

          {filteredTenants.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
              <Users className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No clients yet. Create your first client.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-white/5">
                    <th className="text-left pb-3 font-medium">Client</th>
                    <th className="text-left pb-3 font-medium">Plan</th>
                    <th className="text-left pb-3 font-medium">Status</th>
                    <th className="text-left pb-3 font-medium">Calls Used</th>
                    <th className="text-left pb-3 font-medium">Joined</th>
                    <th className="text-left pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredTenants.map((t: any) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3">
                        <p className="font-medium text-white">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.email}</p>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize"
                          style={{ color: PLAN_COLORS[t.plan_id] || "#fff", borderColor: `${PLAN_COLORS[t.plan_id] || "#fff"}30`, backgroundColor: `${PLAN_COLORS[t.plan_id] || "#fff"}10` }}>
                          {t.plan_id}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          t.status === "active" ? "bg-green-500/10 text-green-400" :
                          t.status === "suspended" ? "bg-red-500/10 text-red-400" :
                          "bg-yellow-500/10 text-yellow-400"
                        }`}>{t.status}</span>
                      </td>
                      <td className="py-3 text-gray-400">{(t.calls_used || 0).toLocaleString()}</td>
                      <td className="py-3 text-gray-500 text-xs">{new Date(t.created_at).toLocaleDateString("en-IN")}</td>
                      <td className="py-3">
                        <button onClick={() => setSelectedTenant(t)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showCreate && <CreateClientModal plans={plans} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
      {selectedTenant && <ClientDetailDrawer tenant={selectedTenant} plans={plans} onClose={() => setSelectedTenant(null)} onUpdated={load} />}
    </div>
  );
}
