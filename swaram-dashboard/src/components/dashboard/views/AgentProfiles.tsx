"use client";

import React, { useEffect, useState } from "react";
import { Plus, Loader2, Save, Bot, Star } from "lucide-react";
import { TestAgentWidget } from "../TestAgentWidget";

const API = "/api";


export function AgentProfiles() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("functions");
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    voice: "Aoede",
    model: "models/gemini-2.0-flash-exp",
    system_prompt: "",
    welcome_message: "",
    enabled_tools: "[]",
    is_default: false,
    place: "",
    speech_settings: {
      fillers: false,
      laugh: false,
      speed: 1.0,
      custom_instructions: ""
    }
  });

  const fetchProfiles = async () => {
    try {
      const res = await fetch(`${API}/profiles`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProfiles(data);
        if (data.length > 0 && !editingProfile) {
          handleSelectProfile(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSelectProfile = (p: any) => {
    setEditingProfile(p);
    
    let parsedSpeech = { fillers: false, laugh: false, speed: 1.0, custom_instructions: "" };
    try {
      if (p.speech_settings) parsedSpeech = JSON.parse(p.speech_settings);
    } catch (e) {}
    
    setFormData({
      name: p.name,
      voice: p.voice,
      model: p.model,
      system_prompt: p.system_prompt || "",
      welcome_message: p.welcome_message || "",
      enabled_tools: p.enabled_tools || "[]",
      is_default: !!p.is_default,
      place: p.place || "",
      speech_settings: parsedSpeech
    });
  };

  const handleCreateNew = () => {
    setEditingProfile(null);
    setFormData({
      name: "New Agent",
      voice: "Aoede",
      model: "models/gemini-2.0-flash-exp",
      system_prompt: "",
      welcome_message: "",
      enabled_tools: "[]",
      is_default: false,
      place: "",
      speech_settings: { fillers: false, laugh: false, speed: 1.0, custom_instructions: "" }
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const url = editingProfile ? `${API}/profiles/${editingProfile.id}` : `${API}/profiles`;
      const method = editingProfile ? "PUT" : "POST";
      
      const payload = {
        ...formData,
        speech_settings: JSON.stringify(formData.speech_settings)
      };
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const saved = await res.json();
        await fetchProfiles();
        if (!editingProfile && saved.id) {
          handleSelectProfile(saved);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#FFD166]" /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-medium text-white mb-1">Agent Builder</h2>
          <p className="text-gray-400 text-sm">Configure AI personalities and test them live.</p>
        </div>
        <div className="flex gap-4">
          <select 
            className="bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[#FFD166]/50"
            value={editingProfile?.id || ""}
            onChange={(e) => {
              const p = profiles.find(x => x.id === e.target.value);
              if (p) handleSelectProfile(p);
            }}
          >
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name} {p.is_default ? '(Default)' : ''}</option>)}
          </select>
          <button 
            onClick={handleCreateNew}
            className="bg-white/5 hover:bg-white/10 text-white py-2 px-4 rounded-xl border border-white/10 flex items-center gap-2 transition-all text-sm"
          >
            <Plus className="w-4 h-4" /> New Profile
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-2 px-6 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* LEFT COLUMN: Prompts & Identity */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/5">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Identity & Prompts</h3>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase">Agent Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase">Welcome Message</label>
              <textarea 
                rows={3}
                value={formData.welcome_message}
                onChange={e => setFormData({...formData, welcome_message: e.target.value})}
                placeholder="Hi, this is Alex calling from Swaram AI. How can I help you today?"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 resize-none text-sm leading-relaxed"
              />
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-xs font-medium text-gray-400 uppercase">System Prompt</label>
              <textarea 
                rows={12}
                value={formData.system_prompt}
                onChange={e => setFormData({...formData, system_prompt: e.target.value})}
                placeholder="You are an expert sales assistant..."
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 resize-none text-sm leading-relaxed h-full"
              />
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Settings & Functions */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
          <div className="flex border-b border-white/10 bg-white/5">
            <button 
              onClick={() => setActiveTab("functions")}
              className={`flex-1 py-4 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === "functions" ? "text-[#FFD166] border-b-2 border-[#FFD166]" : "text-gray-400 hover:text-white"}`}
            >
              Functions
            </button>
            <button 
              onClick={() => setActiveTab("speech")}
              className={`flex-1 py-4 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === "speech" ? "text-[#FFD166] border-b-2 border-[#FFD166]" : "text-gray-400 hover:text-white"}`}
            >
              Speech & Voice
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === "functions" && (
              <div className="space-y-6">
                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-white">Book Appointment</h4>
                    <input type="checkbox" checked={formData.enabled_tools.includes("book_appointment")} onChange={() => {}} className="accent-[#FFD166]" />
                  </div>
                  <p className="text-xs text-gray-500">Allows the agent to schedule meetings in Google Calendar.</p>
                </div>
                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-white">Transfer Call</h4>
                    <input type="checkbox" checked={formData.enabled_tools.includes("transfer_call")} onChange={() => {}} className="accent-[#FFD166]" />
                  </div>
                  <p className="text-xs text-gray-500">Allows the agent to route the call to a human representative.</p>
                </div>
              </div>
            )}
            
            {activeTab === "speech" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Voice Selection</label>
                  <select 
                    value={formData.voice}
                    onChange={e => setFormData({...formData, voice: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50 text-sm"
                  >
                    <option value="Aoede">Aoede</option>
                    <option value="Charon">Charon</option>
                    <option value="Fenrir">Fenrir</option>
                    <option value="Kore">Kore</option>
                    <option value="Puck">Puck</option>
                  </select>
                </div>
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <h4 className="text-sm font-medium text-white">Human-like Behavior</h4>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.speech_settings.fillers}
                      onChange={e => setFormData({...formData, speech_settings: {...formData.speech_settings, fillers: e.target.checked}})}
                      className="accent-[#FFD166] w-4 h-4"
                    />
                    <div>
                      <div className="text-sm text-white">Filler Words</div>
                      <div className="text-xs text-gray-500">Agent will say "um", "uh", "ah" while thinking.</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.speech_settings.laugh}
                      onChange={e => setFormData({...formData, speech_settings: {...formData.speech_settings, laugh: e.target.checked}})}
                      className="accent-[#FFD166] w-4 h-4"
                    />
                    <div>
                      <div className="text-sm text-white">Laughing & Chuckling</div>
                      <div className="text-xs text-gray-500">Agent will subtly laugh at appropriate moments.</div>
                    </div>
                  </label>
                </div>
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <label className="text-xs font-medium text-gray-400 uppercase">Custom Speech Instructions</label>
                  <input 
                    type="text" 
                    value={formData.speech_settings.custom_instructions}
                    onChange={e => setFormData({...formData, speech_settings: {...formData.speech_settings, custom_instructions: e.target.value}})}
                    placeholder="e.g. Speak slowly and clearly. Always sound energetic."
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Test Agent (LiveKit Component) */}
        <div className="h-full">
           <TestAgentWidget agentId={editingProfile?.id || ""} />
        </div>
      </div>
    </div>
  );
}
