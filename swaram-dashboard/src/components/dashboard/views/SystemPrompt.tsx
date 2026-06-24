"use client";

import React, { useEffect, useState } from "react";
import { TerminalSquare, Save, RotateCcw, Loader2, Volume2, BookOpen, ChevronDown } from "lucide-react";

const API = "/api";

// Gemini Live voices — https://cloud.google.com/text-to-speech/docs/voices
const VOICES = [
  { value: "Aoede",    label: "Aoede — Warm & expressive (Female)" },
  { value: "Charon",  label: "Charon — Deep & calm (Male)" },
  { value: "Fenrir",  label: "Fenrir — Confident & clear (Male)" },
  { value: "Kore",    label: "Kore — Friendly & natural (Female)" },
  { value: "Puck",    label: "Puck — Bright & energetic (Male)" },
  { value: "Leda",    label: "Leda — Soft & professional (Female)" },
  { value: "Orus",    label: "Orus — Authoritative (Male)" },
  { value: "Zephyr",  label: "Zephyr — Smooth & modern (Neutral)" },
];

export function SystemPrompt() {
  const [prompt, setPrompt] = useState("");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [voice, setVoice] = useState("Aoede");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [kbExpanded, setKbExpanded] = useState(false);

  const loadData = async () => {
    try {
      const [promptRes, settingsRes] = await Promise.all([
        fetch(`${API}/prompt`),
        fetch(`${API}/settings`),
      ]);
      const promptData = await promptRes.json();
      const settingsData = await settingsRes.json();

      setPrompt(promptData.prompt || "");
      // API returns { KEY: { value: "...", configured: bool } } shape
      setVoice(settingsData.GEMINI_TTS_VOICE?.value || "Aoede");
      setKnowledgeBase(settingsData.KNOWLEDGE_BASE?.value || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      // Save prompt
      const promptRes = await fetch(`${API}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      if (!promptRes.ok) throw new Error("Failed to save prompt");

      // Save voice + knowledge base as settings
      const settingsRes = await fetch(`${API}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            GEMINI_TTS_VOICE: voice,
            KNOWLEDGE_BASE: knowledgeBase,
          }
        })
      });
      if (!settingsRes.ok) throw new Error("Failed to save settings");

      setMessage("Settings saved successfully.");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const handleReset = async () => {
    await loadData();
    setMessage("Reset to saved values.");
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-white mb-2">Global System Prompt</h2>
        <p className="text-gray-400 text-sm">Define the core instructions for the Swaram AI agent. Changes apply to all future calls.</p>
      </div>

      <div className="space-y-6">
        {/* ── Voice Selector ─────────────────────────────────── */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-4">
            <Volume2 className="w-4 h-4 text-[#FFD166]" />
            Agent Voice
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {VOICES.map(v => (
              <button
                key={v.value}
                onClick={() => setVoice(v.value)}
                disabled={loading}
                className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                  voice === v.value
                    ? "border-[#FFD166]/60 bg-[#FFD166]/5 shadow-[0_0_12px_rgba(255,209,102,0.1)]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                {voice === v.value && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FFD166] shadow-[0_0_6px_rgba(255,209,102,0.8)]" />
                )}
                <span className={`text-sm font-semibold mb-1 ${voice === v.value ? "text-[#FFD166]" : "text-white"}`}>
                  {v.value}
                </span>
                <span className="text-xs text-gray-500 leading-snug">
                  {v.label.split(" — ")[1]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Knowledge Base ─────────────────────────────────── */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden">
          <button
            onClick={() => setKbExpanded(!kbExpanded)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#FFD166]" />
              <span className="text-sm font-medium text-gray-300">Knowledge Base</span>
              {knowledgeBase && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFD166]/10 text-[#FFD166] border border-[#FFD166]/20">
                  {knowledgeBase.split("\n").filter(Boolean).length} lines
                </span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${kbExpanded ? "rotate-180" : ""}`} />
          </button>

          {kbExpanded && (
            <div className="px-6 pb-6 border-t border-white/5">
              <p className="text-xs text-gray-500 mt-4 mb-3">
                Add FAQs, product details, pricing, or any information the agent should know.
                This is automatically appended to the system prompt at the end.
              </p>
              <textarea
                value={knowledgeBase}
                onChange={(e) => setKnowledgeBase(e.target.value)}
                disabled={loading}
                placeholder={"Q: What are your working hours?\nA: We are open Monday to Saturday, 9am to 6pm.\n\nQ: What services do you offer?\nA: ..."}
                rows={10}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-white text-sm font-mono leading-relaxed focus:outline-none focus:border-[#FFD166]/50 transition-colors resize-y custom-scrollbar"
              />
            </div>
          )}
        </div>

        {/* ── Core System Prompt ─────────────────────────────── */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 flex flex-col" style={{ minHeight: "420px" }}>
          {message && (
            <div className={`px-4 py-3 rounded-xl text-sm mb-5 border ${
              message.includes("Error") ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"
            }`}>
              {message}
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <TerminalSquare className="w-4 h-4 text-[#FFD166]" /> Core Instructions
            </label>
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            placeholder="Enter system prompt here..."
            className="flex-1 w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-6 text-white text-sm font-mono leading-relaxed focus:outline-none focus:border-[#FFD166]/50 transition-colors resize-none custom-scrollbar"
            style={{ minHeight: "280px" }}
          />

          <div className="pt-6 mt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Saving..." : "Save All Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
