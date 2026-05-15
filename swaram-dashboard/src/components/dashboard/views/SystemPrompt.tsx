"use client";

import React, { useEffect, useState } from "react";
import { TerminalSquare, Save, RotateCcw, Loader2 } from "lucide-react";

const API = "/api";

export function SystemPrompt() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadPrompt = async () => {
    try {
      const res = await fetch(`${API}/prompt`);
      const data = await res.json();
      setPrompt(data.prompt || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompt();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`${API}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt })
      });
      
      if (!res.ok) throw new Error("Failed to save prompt");
      setMessage("Global system prompt saved successfully.");
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-medium text-white mb-2">Global System Prompt</h2>
        <p className="text-gray-400 text-sm">Define the core instructions and constraints for the Swaram AI agent. This applies to all calls unless overridden by a specific Agent Profile.</p>
      </div>

      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col h-[65vh]">
        
        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm mb-6 border ${
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
            onClick={loadPrompt}
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
        />

        <div className="pt-6 mt-4 border-t border-white/10 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-3 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? "Saving..." : "Save Prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}
