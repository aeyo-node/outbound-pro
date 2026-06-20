"use client";

import React, { useEffect, useState } from "react";
import { PhoneIncoming, Search, Clock, Trash2 } from "lucide-react";

const API = "/api";

export function IncomingCalls() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const fetchCalls = async () => {
    try {
      const res = await fetch(`${API}/incoming_calls`);
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

  const handleDeleteBulk = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected incoming calls?`)) return;
    try {
      const res = await fetch(`${API}/incoming_calls/delete-bulk`, {
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

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleAll = (filtered: any[]) => {
    const filteredIds = filtered.map(c => c.id).filter(Boolean);
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const filteredCalls = calls.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.phone_number || "").toLowerCase().includes(q) ||
      (c.status || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredCalls.length / rowsPerPage));
  const currentCalls = filteredCalls.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-medium text-white mb-2">Incoming Calls</h2>
          <p className="text-gray-400 text-sm">Monitor inbound calls received by the AI voice agent.</p>
        </div>
      </div>

      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2 bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search phone numbers..." 
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
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
                      Loading calls...
                    </div>
                  </td>
                </tr>
              ) : currentCalls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <PhoneIncoming className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm">No incoming calls found.</p>
                    </div>
                  </td>
                </tr>
              ) : currentCalls.map((c, i) => {
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
                      <span className="text-sm font-medium text-white">{c.phone_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        c.status === "received" ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                        c.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {c.status || "received"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock className="w-4 h-4" />
                        {c.duration_seconds || 0}s
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs text-gray-400">{formatTimestamp(c.timestamp)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-black/20">
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredCalls.length)} of {filteredCalls.length} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-sm disabled:opacity-50 hover:bg-white/10 transition-colors"
              >
                Previous
              </button>
              <div className="text-sm font-medium px-2">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-sm disabled:opacity-50 hover:bg-white/10 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
