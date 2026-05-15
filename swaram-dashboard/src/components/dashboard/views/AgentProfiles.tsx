"use client";

import React, { useEffect, useState } from "react";
import { UserSquare2, Plus, Star, Trash2, Edit2, Bot, X, Loader2, Save } from "lucide-react";

const API = "/api";

export function AgentProfiles() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    voice: "Aoede",
    model: "models/gemini-2.0-flash-exp",
    system_prompt: "",
    enabled_tools: "[]",
    is_default: false
  });

  const fetchProfiles = async () => {
    try {
      const res = await fetch(`${API}/profiles`);
      const data = await res.json();
      if (Array.isArray(data)) setProfiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleOpenCreate = () => {
    setEditingProfile(null);
    setFormData({
      name: "",
      voice: "Aoede",
      model: "models/gemini-2.0-flash-exp",
      system_prompt: "",
      enabled_tools: "[]",
      is_default: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingProfile(p);
    setFormData({
      name: p.name,
      voice: p.voice,
      model: p.model,
      system_prompt: p.system_prompt || "",
      enabled_tools: p.enabled_tools || "[]",
      is_default: !!p.is_default
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingProfile ? `${API}/profiles/${editingProfile.id}` : `${API}/profiles`;
      const method = editingProfile ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProfile ? formData : formData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchProfiles();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agent profile?")) return;
    try {
      await fetch(`${API}/profiles/${id}`, { method: "DELETE" });
      fetchProfiles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch(`${API}/profiles/${id}/default`, { method: "POST" });
      fetchProfiles();
    } catch (err) {
      console.error(err);
    }
  };

  const loadDemoData = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/init_demo_data`);
      fetchProfiles();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-medium text-white mb-2">Agent Profiles</h2>
          <p className="text-gray-400 text-sm">Configure multiple AI personalities, voices, and capabilities.</p>
        </div>
        <div className="flex gap-3">
          {profiles.length === 0 && !loading && (
            <button 
              onClick={loadDemoData}
              className="bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 px-6 rounded-xl border border-white/10 transition-all text-sm"
            >
              Load Demo Profiles
            </button>
          )}
          <button 
            onClick={handleOpenCreate}
            className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" /> Create Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
             <div className="w-6 h-6 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-[#1C1C1E] border border-white/10 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 mx-auto">
              <UserSquare2 className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-400">No agent profiles found.</p>
          </div>
        ) : profiles.map((p, i) => (
          <div key={i} className={`bg-[#1C1C1E] border rounded-2xl p-6 relative group transition-colors ${p.is_default ? "border-[#FFD166]/50" : "border-white/10 hover:border-white/20"}`}>
            {p.is_default && (
              <div className="absolute top-0 right-0 bg-[#FFD166] text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 fill-black" /> Default
              </div>
            )}
            
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${p.is_default ? "bg-[#FFD166]/20" : "bg-white/5"}`}>
                <Bot className={`w-6 h-6 ${p.is_default ? "text-[#FFD166]" : "text-gray-400"}`} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">{p.name}</h3>
                <p className="text-xs text-gray-400 capitalize">{p.voice} Voice • {p.model.split('/')[1] || p.model}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6 h-20 overflow-hidden">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">System Prompt</p>
                <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
                  {p.system_prompt || "Uses default global system prompt."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
              {!p.is_default && (
                <button 
                  onClick={() => handleSetDefault(p.id)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Make Default
                </button>
              )}
              <button 
                onClick={() => handleOpenEdit(p)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
              <button 
                onClick={() => handleDelete(p.id)}
                className="w-10 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-medium text-white">{editingProfile ? "Edit Profile" : "Create Agent Profile"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Agent Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Sales Assistant"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Voice</label>
                  <select 
                    value={formData.voice}
                    onChange={e => setFormData({...formData, voice: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                  >
                    <option value="Aoede">Aoede</option>
                    <option value="Charon">Charon</option>
                    <option value="Fenrir">Fenrir</option>
                    <option value="Kore">Kore</option>
                    <option value="Puck">Puck</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">AI Model</label>
                <input 
                  type="text" 
                  value={formData.model}
                  onChange={e => setFormData({...formData, model: e.target.value})}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">System Prompt (Optional)</label>
                <textarea 
                  rows={6}
                  value={formData.system_prompt}
                  onChange={e => setFormData({...formData, system_prompt: e.target.value})}
                  placeholder="Override global system prompt for this agent..."
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50 resize-none text-sm leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="is_default"
                  checked={formData.is_default}
                  onChange={e => setFormData({...formData, is_default: e.target.checked})}
                  className="w-4 h-4 accent-[#FFD166]"
                />
                <label htmlFor="is_default" className="text-sm text-gray-300">Set as default agent profile</label>
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
                  {saving ? "Saving..." : editingProfile ? "Update Profile" : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
