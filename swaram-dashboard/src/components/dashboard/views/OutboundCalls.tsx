"use client";

import React, { useEffect, useState } from "react";
import { PhoneOutgoing, Search, Clock, AlignLeft, X, Trash2 } from "lucide-react";

const API = "/api";

export function OutboundCalls() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCalls = async () => {
    try {
      const res = await fetch(`${API}/calls`);
      const data = await res.json();
      if (Array.isArray(data)) setCalls(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (ts: string) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleAll = (filteredCalls: any[]) => {
    const filteredIds = filteredCalls.map(c => c.id).filter(Boolean);
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleDeleteIndividual = async (id: string) => {
    if (!confirm("Are you sure you want to delete this call log?")) return;
    try {
      const res = await fetch(`${API}/calls/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedIds(prev => prev.filter(x => x !== id));
        fetchCalls();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBulk = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected call logs?`)) return;
    try {
      const res = await fetch(`${API}/calls/delete-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchCalls();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCalls = calls.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.phone_number || "").toLowerCase().includes(q) ||
      (c.lead_name || "").toLowerCase().includes(q) ||
      (c.business_name || "").toLowerCase().includes(q) ||
      (c.industry || "").toLowerCase().includes(q) ||
      (c.place || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-medium text-white mb-2">Outbound Calls</h2>
          <p className="text-gray-400 text-sm">History of all AI agent outbound calls and their outcomes.</p>
        </div>
      </div>

      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-2 bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search phone numbers, leads, places..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 w-full"
            />
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteBulk}
              className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-semibold transition-all animate-in zoom-in duration-200"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredCalls.length > 0 && filteredCalls.every(c => selectedIds.includes(c.id))}
                    onChange={() => handleToggleAll(filteredCalls)}
                    className="rounded border-white/20 bg-white/5 text-[#FFD166] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Business</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Industry</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Place</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Outcome</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-500 text-sm">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
                      Loading calls...
                    </div>
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <PhoneOutgoing className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm">No outbound calls found.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCalls.map((c, i) => {
                let tempBadge = null;
                if (c.notes) {
                  if (c.notes.includes("[HOT]")) tempBadge = <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">HOT</span>;
                  else if (c.notes.includes("[WARM]")) tempBadge = <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">WARM</span>;
                  else if (c.notes.includes("[COLD]")) tempBadge = <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">COLD</span>;
                }
                const isSelected = selectedIds.includes(c.id);
                return (
                  <tr key={c.id || i} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? "bg-[#FFD166]/5" : ""}`}>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(c.id)}
                        className="rounded border-white/20 bg-white/5 text-[#FFD166] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-white">{c.phone_number}</span>
                        {tempBadge}
                      </div>
                      {c.lead_name && c.lead_name !== "there" && <span className="text-xs text-gray-500">{c.lead_name}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300">{c.business_name || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-400">{c.industry || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-400">{c.place || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        c.status === "completed" ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                        c.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {c.status || "initiated"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`text-xs capitalize font-medium ${
                         c.outcome === "booked" ? "text-[#FFD166]" : "text-gray-400"
                       }`}>
                         {(c.outcome || "unknown").replace(/_/g, " ")}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock className="w-3 h-3" />
                        {c.duration_seconds || 0}s
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-400">{formatTimestamp(c.timestamp || c.created_at)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {c.notes ? (
                          <button 
                            onClick={() => setSelectedNote(c.notes)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" 
                            title="View Notes"
                          >
                            <AlignLeft className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-600 mr-2">—</span>
                        )}
                        <button
                          onClick={() => handleDeleteIndividual(c.id)}
                          className="p-1.5 bg-white/5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete Call Log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Call Notes</h3>
              <button onClick={() => setSelectedNote(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedNote}</p>
            </div>
            <div className="p-5 border-t border-white/10 bg-white/[0.02] flex justify-end">
              <button 
                onClick={() => setSelectedNote(null)}
                className="bg-white/5 hover:bg-white/10 text-white font-medium py-2 px-6 rounded-xl text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
