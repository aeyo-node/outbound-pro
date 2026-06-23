"use client";

import React, { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, Key, Globe, Database, Loader2, Eye, EyeOff } from "lucide-react";

const API = "/api";

export function Settings() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetch(`${API}/settings`)
      .then(r => r.json())
      .then(data => {
        const flatSettings: any = {};
        for (const key in data) {
          flatSettings[key] = data[key]?.value || "";
        }
        setSettings(flatSettings);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`${API}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings })
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setMessage("Settings saved successfully.");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="w-6 h-6 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin mr-3" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-white mb-2">Platform Settings</h2>
        <p className="text-gray-400 text-sm">Configure API keys, integrations, and environment variables.</p>
      </div>

      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 md:p-8">
        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm mb-6 border ${
            message.includes("Error") ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* LiveKit Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Globe className="w-5 h-5 text-[#FFD166]" /> LiveKit Configuration
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">LiveKit WebSocket URL</label>
                <input 
                  type="text" 
                  name="LIVEKIT_URL"
                  value={settings.LIVEKIT_URL || ""}
                  onChange={handleChange}
                  placeholder="wss://your-project.livekit.cloud"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">LiveKit API Key</label>
                  <div className="relative">
                    <input 
                      type={showSecrets.LIVEKIT_API_KEY ? "text" : "password"} 
                      name="LIVEKIT_API_KEY"
                      value={settings.LIVEKIT_API_KEY || ""}
                      onChange={handleChange}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors pr-12"
                    />
                    <button 
                      type="button"
                      onClick={() => toggleSecret('LIVEKIT_API_KEY')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showSecrets.LIVEKIT_API_KEY ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">LiveKit API Secret</label>
                  <div className="relative">
                    <input 
                      type={showSecrets.LIVEKIT_API_SECRET ? "text" : "password"} 
                      name="LIVEKIT_API_SECRET"
                      value={settings.LIVEKIT_API_SECRET || ""}
                      onChange={handleChange}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors pr-12"
                    />
                    <button 
                      type="button"
                      onClick={() => toggleSecret('LIVEKIT_API_SECRET')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showSecrets.LIVEKIT_API_SECRET ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supabase Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Database className="w-5 h-5 text-[#FFD166]" /> Database Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Supabase URL</label>
                <input 
                  type="text" 
                  name="SUPABASE_URL"
                  value={settings.SUPABASE_URL || ""}
                  onChange={handleChange}
                  placeholder="https://xyz.supabase.co"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Supabase Service Role Key</label>
                <div className="relative">
                  <input 
                    type={showSecrets.SUPABASE_KEY ? "text" : "password"} 
                    name="SUPABASE_KEY"
                    value={settings.SUPABASE_KEY || ""}
                    onChange={handleChange}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors pr-12"
                  />
                  <button 
                    type="button"
                    onClick={() => toggleSecret('SUPABASE_KEY')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showSecrets.SUPABASE_KEY ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Gemini Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Key className="w-5 h-5 text-[#FFD166]" /> Google Gemini AI
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Google API Key</label>
                <div className="relative">
                  <input 
                    type={showSecrets.GOOGLE_API_KEY ? "text" : "password"} 
                    name="GOOGLE_API_KEY"
                    value={settings.GOOGLE_API_KEY || ""}
                    onChange={handleChange}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors pr-12"
                  />
                  <button 
                    type="button"
                    onClick={() => toggleSecret('GOOGLE_API_KEY')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showSecrets.GOOGLE_API_KEY ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Gemini Model</label>
                <input 
                  type="text" 
                  name="GEMINI_MODEL"
                  value={settings.GEMINI_MODEL || "models/gemini-2.0-flash-exp"}
                  onChange={handleChange}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* OpenRouter Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Key className="w-5 h-5 text-[#FFD166]" /> OpenRouter AI (For Call Summaries)
            </h3>
            <p className="text-xs text-gray-500">If Key 1 fails (rate limit / out of credits), it automatically falls back to Key 2, then Key 3, then Key 4.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "OPENROUTER_API_KEY", label: "Key 1 (Primary)" },
                { name: "OPENROUTER_API_KEY_2", label: "Key 2 (Fallback)" },
                { name: "OPENROUTER_API_KEY_3", label: "Key 3 (Fallback)" },
                { name: "OPENROUTER_API_KEY_4", label: "Key 4 (Fallback)" },
              ].map((k) => (
                <div className="space-y-2" key={k.name}>
                  <label className="text-sm font-medium text-gray-400">{k.label}</label>
                  <div className="relative">
                    <input 
                      type={(showSecrets as any)[k.name] ? "text" : "password"} 
                      name={k.name}
                      value={(settings as any)[k.name] || ""}
                      onChange={handleChange}
                      placeholder="sk-or-v1-..."
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors pr-12"
                    />
                    <button 
                      type="button"
                      onClick={() => toggleSecret(k.name as any)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {(showSecrets as any)[k.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Twilio Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Key className="w-5 h-5 text-[#FFD166]" /> Telephony (Twilio / Vobiz)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Account SID</label>
                <input 
                  type="text" 
                  name="TWILIO_ACCOUNT_SID"
                  value={settings.TWILIO_ACCOUNT_SID || ""}
                  onChange={handleChange}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Auth Token</label>
                <div className="relative">
                  <input 
                    type={showSecrets.TWILIO_AUTH_TOKEN ? "text" : "password"} 
                    name="TWILIO_AUTH_TOKEN"
                    value={settings.TWILIO_AUTH_TOKEN || ""}
                    onChange={handleChange}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors pr-12"
                  />
                  <button 
                    type="button"
                    onClick={() => toggleSecret('TWILIO_AUTH_TOKEN')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showSecrets.TWILIO_AUTH_TOKEN ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Outbound Caller ID (Phone Number)</label>
                <input 
                  type="text" 
                  name="TWILIO_PHONE_NUMBER"
                  value={settings.TWILIO_PHONE_NUMBER || ""}
                  onChange={handleChange}
                  placeholder="+1234567890"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Max Concurrent Calls (Batch Size)</label>
                <input 
                  type="number" 
                  min="1"
                  max="100"
                  name="MAX_CONCURRENT_CALLS"
                  value={settings.MAX_CONCURRENT_CALLS || "2"}
                  onChange={handleChange}
                  placeholder="2"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-1">Limits simultaneous SIP calls to prevent carrier rejection.</p>
              </div>
            </div>
          </div>

          {/* AWS S3 Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-white/10 pb-2">
              <Database className="w-5 h-5 text-[#FFD166]" /> AWS S3 Storage (Call Recordings)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">AWS / S3 Access Key ID</label>
                <input 
                  type="text" 
                  name="S3_ACCESS_KEY_ID"
                  value={settings.S3_ACCESS_KEY_ID || ""}
                  onChange={handleChange}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">AWS / S3 Secret Access Key</label>
                <div className="relative">
                  <input 
                    type={showSecrets.S3_SECRET_ACCESS_KEY ? "text" : "password"} 
                    name="S3_SECRET_ACCESS_KEY"
                    value={settings.S3_SECRET_ACCESS_KEY || ""}
                    onChange={handleChange}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors pr-12"
                  />
                  <button 
                    type="button"
                    onClick={() => toggleSecret('S3_SECRET_ACCESS_KEY')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showSecrets.S3_SECRET_ACCESS_KEY ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">S3 Bucket Name</label>
                <input 
                  type="text" 
                  name="S3_BUCKET"
                  value={settings.S3_BUCKET || ""}
                  onChange={handleChange}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">S3 Region (e.g. us-east-1)</label>
                <input 
                  type="text" 
                  name="S3_REGION"
                  value={settings.S3_REGION || ""}
                  onChange={handleChange}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFD166]/50 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
