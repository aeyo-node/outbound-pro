"use client";

import React, { useEffect, useState } from "react";
import { Phone, User, Building2, Briefcase, Bot, TerminalSquare, Send, Loader2 } from "lucide-react";

const API = "/api";

export function SingleCall() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    phone: "",
    lead_name: "",
    business_name: "",
    industry: "",
    place: "",
    agent_profile_id: "",
    system_prompt: ""
  });

  useEffect(() => {
    fetch(`${API}/profiles`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProfiles(data);
          const defaultProfile = data.find(p => p.is_default);
          if (defaultProfile) {
            setFormData(prev => ({ ...prev, agent_profile_id: defaultProfile.id }));
          }
        }
      })
      .catch(err => console.error("Failed to load profiles:", err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!formData.phone.startsWith("+")) {
      setError("Phone number must start with '+' and include country code (e.g., +919876543210)");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API}/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to dispatch call");
      }
      setSuccess(`Call initiated successfully to ${formData.phone}`);
      setFormData(prev => ({ ...prev, phone: "", lead_name: "" })); // Reset some fields
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-white mb-2">Initiate Single Call</h2>
        <p className="text-gray-400 text-sm">Dispatch an AI voice agent to a specific phone number instantly.</p>
      </div>

      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 md:p-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#FFD166]" /> Phone Number *
              </label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+919876543210"
                required
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <User className="w-4 h-4 text-[#FFD166]" /> Lead Name *
              </label>
              <input 
                type="text" 
                name="lead_name"
                value={formData.lead_name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#FFD166]" /> Business Name
              </label>
              <input 
                type="text" 
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                placeholder="Acme Corp"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#FFD166]" /> Industry
              </label>
              <input 
                type="text" 
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="Real Estate Consulting"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#FFD166]" /> Place / Location
              </label>
              <input 
                type="text" 
                name="place"
                value={formData.place}
                onChange={handleChange}
                placeholder="Ernakulam"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#FFD166]" /> Agent Profile
              </label>
              <select 
                name="agent_profile_id"
                value={formData.agent_profile_id}
                onChange={handleChange}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors appearance-none"
              >
                <option value="">Default Backend Logic</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.is_default ? "(Default)" : ""}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <TerminalSquare className="w-4 h-4 text-[#FFD166]" /> System Prompt Override (Optional)
            </label>
            <textarea 
              name="system_prompt"
              value={formData.system_prompt}
              onChange={handleChange}
              placeholder="Leave empty to use the profile's default prompt. Enter custom instructions here if needed."
              rows={4}
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors custom-scrollbar"
            />
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {loading ? "Dispatching..." : "Dispatch Call"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
