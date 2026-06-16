"use client";

import React, { useEffect, useState } from "react";
import { Users, Search, Mail, Phone, CalendarDays, Plus, X, Loader2, Save, PhoneOutgoing, Info, Clock, AlignLeft } from "lucide-react";

const API = "/api";

export function CRMLeads() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Details Modal State
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [leadLogs, setLeadLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    business_name: "",
    industry: "",
    place: ""
  });

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API}/contacts`);
      const data = await res.json();
      if (Array.isArray(data)) setContacts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: "", phone: "", email: "", business_name: "", industry: "", place: "" });
        fetchContacts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (lead: any) => {
    setSelectedLead(lead);
    setLoadingLogs(true);
    try {
      // Encode phone number for the URL
      const encodedPhone = encodeURIComponent(lead.phone);
      const res = await fetch(`${API}/calls/phone/${encodedPhone}`);
      const data = await res.json();
      setLeadLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadDemoData = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/init_demo_data`);
      fetchContacts();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-medium text-white mb-2">CRM / Leads</h2>
          <p className="text-gray-400 text-sm">Manage your contacts and leads extracted from voice interactions.</p>
        </div>
        <div className="flex gap-3">
          {contacts.length === 0 && !loading && (
            <button 
              onClick={loadDemoData}
              className="bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 px-6 rounded-xl border border-white/10 transition-all text-sm"
            >
              Load Demo Leads
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" /> Add Lead
          </button>
        </div>
      </div>

      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2 bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search leads by name or phone..." 
              className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Business</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Industry</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Place</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lead Source</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Added On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500 text-sm">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
                      Loading leads...
                    </div>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm">No leads captured yet.</p>
                    </div>
                  </td>
                </tr>
              ) : contacts.map((c, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-medium text-xs">
                        {c.name ? c.name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <span className="text-sm font-medium text-white">{c.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Phone className="w-3 h-3 text-gray-500" />
                      {c.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Mail className="w-3 h-3 text-gray-500" />
                      {c.email || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {c.business_name || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {c.industry || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {c.place || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-white/5 text-gray-300 border-white/10">
                      Voice Agent
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <CalendarDays className="w-3 h-3" />
                      {formatTimestamp(c.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openDetails(c)}
                        className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
                        title="View Details & Notes"
                      >
                        <Info className="w-4 h-4" />
                        <span className="text-xs font-medium">Details</span>
                      </button>
                      <button 
                        onClick={async () => {
                          const res = await fetch(`${API}/call`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ phone: c.phone, lead_name: c.name })
                          });
                          if (res.ok) alert("Call initiated!");
                        }}
                        className="p-2 bg-[#FFD166]/10 hover:bg-[#FFD166]/20 text-[#FFD166] rounded-lg transition-colors"
                        title="Call Lead"
                      >
                        <PhoneOutgoing className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-xl font-medium text-white">{selectedLead.name || "Unknown"}</h3>
                <p className="text-sm text-gray-400">{selectedLead.phone}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Profile Details */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email Address</p>
                  <p className="text-sm text-gray-300">{selectedLead.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Added On</p>
                  <p className="text-sm text-gray-300">{formatTimestamp(selectedLead.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Business Name</p>
                  <p className="text-sm text-gray-300">{selectedLead.business_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Industry</p>
                  <p className="text-sm text-gray-300">{selectedLead.industry || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Place / Location</p>
                  <p className="text-sm text-gray-300">{selectedLead.place || "—"}</p>
                </div>
              </div>

              {/* Call History & Notes */}
              <div>
                <h4 className="text-sm font-medium text-white border-b border-white/10 pb-2 mb-4">Call History & Notes</h4>
                {loadingLogs ? (
                  <div className="flex justify-center items-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  </div>
                ) : leadLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4 bg-white/[0.02] rounded-xl border border-white/5">
                    No call logs found for this lead.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {leadLogs.map((log, idx) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3 hover:bg-white/[0.04] transition-colors">
                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              log.outcome === "completed" || log.outcome === "booked" ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                              log.outcome === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              "bg-gray-500/10 text-gray-400 border-gray-500/20"
                            }`}>
                              {(log.outcome || "unknown").replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {log.duration_seconds || 0}s
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(log.timestamp || log.created_at)}
                          </span>
                        </div>
                        
                        {log.notes ? (
                          <div className="pt-1">
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5 flex items-center gap-1.5">
                              <AlignLeft className="w-3.5 h-3.5" /> Call Notes
                            </p>
                            <p className="text-sm text-gray-300 leading-relaxed bg-[#0A0A0A] p-3 rounded-lg border border-white/5">
                              {log.notes}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 italic">No notes recorded for this call.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-white/10 flex justify-end">
              <button 
                onClick={() => setSelectedLead(null)}
                className="bg-white/5 hover:bg-white/10 text-white font-medium py-2 px-6 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-medium text-white">Add New Lead</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Phone Number</label>
                <input 
                  required
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="+919876543210"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Email Address (Optional)</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="john@example.com"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Business Name (Optional)</label>
                <input 
                  type="text" 
                  value={formData.business_name}
                  onChange={e => setFormData({...formData, business_name: e.target.value})}
                  placeholder="ACME Corp"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Industry (Optional)</label>
                <input 
                  type="text" 
                  value={formData.industry}
                  onChange={e => setFormData({...formData, industry: e.target.value})}
                  placeholder="Real Estate"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Place / Location (Optional)</label>
                <input 
                  type="text" 
                  value={formData.place}
                  onChange={e => setFormData({...formData, place: e.target.value})}
                  placeholder="Ernakulam"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                />
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-medium transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-2.5 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? "Adding..." : "Add Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
