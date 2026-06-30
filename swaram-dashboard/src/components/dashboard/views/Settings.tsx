"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Settings as SettingsIcon, Save, Key, Globe, Database, Loader2, Eye, EyeOff, Palette, ImagePlus, Type, X, ZoomIn, ZoomOut, Check, Headset } from "lucide-react";
import { useBranding, BRAND_PALETTES } from "@/lib/BrandingContext";

const API = "/api";

export function Settings() {
  // ── Branding ──────────────────────────────────────────────────────────────
  const { brand, palette, updateBrand } = useBranding();
  const [logoMode, setLogoMode] = useState<"icon" | "image">(brand.logoUrl ? "image" : "icon");
  const [brandNameInput, setBrandNameInput] = useState(brand.brandName);
  const [brandSaved, setBrandSaved] = useState(false);

  // Crop modal state
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cropImgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const CROP_SIZE = 200; // px — the visible square

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropSrc(ev.target?.result as string);
      setCropScale(1);
      setCropOffset({ x: 0, y: 0 });
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };
  const handleCropMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setCropOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);
  const handleCropMouseUp = () => setIsDragging(false);

  const handleCropConfirm = () => {
    const img = cropImgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d")!;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    // The displayed size of the image at scale 1 within the crop container (200px)
    const displayedScale = CROP_SIZE / Math.max(naturalW, naturalH);
    const renderedW = naturalW * displayedScale * cropScale;
    const renderedH = naturalH * displayedScale * cropScale;
    const drawX = (CROP_SIZE - renderedW) / 2 + cropOffset.x;
    const drawY = (CROP_SIZE - renderedH) / 2 + cropOffset.y;
    ctx.drawImage(img, drawX, drawY, renderedW, renderedH);
    const dataUrl = canvas.toDataURL("image/png");
    updateBrand({ logoUrl: dataUrl });
    setLogoMode("image");
    setCropOpen(false);
  };

  const handleSaveBranding = () => {
    updateBrand({ brandName: brandNameInput });
    setBrandSaved(true);
    setTimeout(() => setBrandSaved(false), 2000);
  };

  // ── API Settings ─────────────────────────────────────────────────────────
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

      {/* ── BRANDING CARD ────────────────────────────────────────────────── */}
      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 md:p-8 mb-6">
        <h3 className="text-lg font-medium text-white flex items-center gap-2 border-b border-white/10 pb-4 mb-6">
          <Palette className="w-5 h-5 text-[var(--accent,#FFD166)]" /> Dashboard Branding
          <span className="ml-2 text-xs text-gray-500 font-normal">Changes are instant — use for client demos</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left — Logo + Name */}
          <div className="space-y-5">
            {/* Logo mode toggle */}
            <div>
              <label className="text-sm font-medium text-gray-400 mb-3 block flex items-center gap-2">
                <ImagePlus className="w-4 h-4" /> Logo
              </label>
              <div className="flex gap-2 mb-4">
                {(["icon","image"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setLogoMode(m)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      logoMode === m
                        ? "border-[var(--accent,#FFD166)]/60 bg-[var(--accent,#FFD166)]/10 text-[var(--accent,#FFD166)]"
                        : "border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    {m === "icon" ? "Default Icon" : "Upload Logo"}
                  </button>
                ))}
              </div>

              {logoMode === "icon" ? (
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, var(--accent,#FFD166), var(--accent,#FFD166)99)` }}>
                    <Headset className="w-7 h-7 text-black" />
                  </div>
                  <p className="text-xs text-gray-500">Using default headset icon.<br/>Switch to "Upload Logo" to use your own.</p>
                  {brand.logoUrl && (
                    <button onClick={() => { updateBrand({ logoUrl: "" }); }} className="text-xs text-red-400 hover:text-red-300 underline">Remove custom logo</button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    {brand.logoUrl
                      ? <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      : <ImagePlus className="w-6 h-6 text-gray-600" />
                    }
                  </div>
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-colors"
                    >
                      {brand.logoUrl ? "Replace Logo" : "Choose Image"}
                    </button>
                    {brand.logoUrl && (
                      <button onClick={() => updateBrand({ logoUrl: "" })} className="ml-2 px-3 py-2 text-xs text-red-400 hover:text-red-300">Remove</button>
                    )}
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG · Will be cropped to square</p>
                  </div>
                </div>
              )}
            </div>

            {/* Brand name */}
            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block flex items-center gap-2">
                <Type className="w-4 h-4" /> Display Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={brandNameInput}
                  onChange={e => setBrandNameInput(e.target.value)}
                  placeholder="Swaram"
                  maxLength={24}
                  className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[var(--accent,#FFD166)]/50 transition-colors text-sm"
                />
                <button
                  onClick={handleSaveBranding}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all"
                  style={{ backgroundColor: brandSaved ? "#10B981" : "var(--accent,#FFD166)", color: "black" }}
                >
                  {brandSaved ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Apply</>}
                </button>
              </div>
            </div>
          </div>

          {/* Right — Colour Palette */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-3 block flex items-center gap-2">
              <Palette className="w-4 h-4" /> Colour Palette
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BRAND_PALETTES.map(p => (
                <button
                  key={p.id}
                  onClick={() => updateBrand({ paletteId: p.id })}
                  title={p.label}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    palette.id === p.id
                      ? "border-white/40 bg-white/5"
                      : "border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full shadow-lg"
                    style={{ backgroundColor: p.accent, boxShadow: palette.id === p.id ? `0 0 12px ${p.accent}80` : undefined }}
                  />
                  <span className="text-[10px] text-gray-400 font-medium">{p.label}</span>
                  {palette.id === p.id && (
                    <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-white/90 flex items-center justify-center">
                      <Check className="w-2 h-2 text-black" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            {/* Live preview strip */}
            <div className="mt-4 p-3 bg-[#0A0A0A] rounded-xl border border-white/5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: palette.accent }}>
                <Headset className="w-3.5 h-3.5 text-black" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-white font-semibold">{brandNameInput || "Swaram"}</div>
                <div className="text-[10px]" style={{ color: palette.accent }}>Enterprise Voice AI</div>
              </div>
              <div className="h-5 w-12 rounded-md text-[9px] flex items-center justify-center font-bold" style={{ backgroundColor: `rgba(${palette.accentRgb},0.15)`, color: palette.accent }}>
                LIVE
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── API SETTINGS CARD ────────────────────────────────────────────── */}
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
                  value={settings.GEMINI_MODEL || "gemini-2.0-flash-exp"}
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
              className="text-black font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--accent,#FFD166)" }}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </div>

      {/* ── CROP MODAL ────────────────────────────────────────────────── */}
      {cropOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Crop Logo</h3>
              <button onClick={() => setCropOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 flex flex-col items-center gap-4">
              <p className="text-xs text-gray-400 text-center">Drag to reposition · Scroll or use buttons to zoom</p>

              {/* Crop viewport */}
              <div
                className="relative overflow-hidden rounded-2xl border-2 border-white/20 cursor-grab active:cursor-grabbing"
                style={{ width: 200, height: 200 }}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={handleCropMouseUp}
                onWheel={e => { e.preventDefault(); setCropScale(s => Math.min(4, Math.max(0.3, s - e.deltaY * 0.002))); }}
              >
                {cropSrc && (
                  <img
                    ref={cropImgRef}
                    src={cropSrc}
                    alt="crop"
                    draggable={false}
                    style={{
                      position: "absolute",
                      maxWidth: "none",
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`,
                      transformOrigin: "center center",
                      userSelect: "none",
                    }}
                  />
                )}
                {/* Corner guides */}
                <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.15)" }} />
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-3">
                <button onClick={() => setCropScale(s => Math.max(0.3, s - 0.1))} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"><ZoomOut className="w-4 h-4" /></button>
                <div className="w-32">
                  <input
                    type="range" min="0.3" max="4" step="0.05"
                    value={cropScale}
                    onChange={e => setCropScale(parseFloat(e.target.value))}
                    className="w-full accent-[var(--accent,#FFD166)]"
                  />
                </div>
                <button onClick={() => setCropScale(s => Math.min(4, s + 0.1))} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"><ZoomIn className="w-4 h-4" /></button>
              </div>

              <div className="flex gap-3 w-full pt-2 border-t border-white/10">
                <button
                  onClick={() => setCropOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropConfirm}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black flex items-center justify-center gap-2 transition-all"
                  style={{ backgroundColor: "var(--accent,#FFD166)" }}
                >
                  <Check className="w-4 h-4" /> Use This Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
