"use client";

import React, { useEffect, useState } from "react";
import { PhoneIncoming, Search, Clock, AlignLeft, X, Trash2, Download } from "lucide-react";
import { ClientFilter } from "../ClientFilter";

const API = "/api";

export function IncomingCalls() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [tenant, setTenant] = useState("");
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const rowsPerPage = 20;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSuperadmin(localStorage.getItem("swaram_role") === "superadmin");
    }
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterOutcome, filterDate, tenant]);

  const fetchCalls = async () => {
    try {
      const token = localStorage.getItem("swaram_token") || "";
      let url = `${API}/incoming_calls`;
      if (tenant) url += `?tenant_id=${tenant}`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
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
  }, [tenant]);

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

  const handleToggleAll = (filtered: any[]) => {
    const filteredIds = filtered.map(c => c.id).filter(Boolean);
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleExportCSV = () => {
    if (filteredCalls.length === 0) return;
    const headers = ["Phone", "Status", "Outcome", "Duration (s)", "Date", "Recording"];
    const csvContent = [
      headers.join(","),
      ...filteredCalls.map(c => [
        c.phone_number || "",
        c.status || "",
        c.outcome || "",
        c.duration_seconds || "",
        c.timestamp || "",
        c.recording_url || ""
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `incoming_calls_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleDeleteIndividual = async (id: string) => {
    if (!confirm("Are you sure you want to delete this incoming call log?")) return;
    try {
      const res = await fetch(`${API}/incoming_calls/delete-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] })
      });
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

  const filteredCalls = calls.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (c.phone_number || "").toLowerCase().includes(q);
    const matchOutcome = filterOutcome === "all" ? true : (c.outcome || "unknown").toLowerCase() === filterOutcome.toLowerCase();
    const matchDate = filterDate === "" ? true : (c.timestamp || "").startsWith(filterDate);
    return matchSearch && matchOutcome && matchDate;
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

      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/[0.02]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
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

            <ClientFilter value={tenant} onChange={setTenant} />
            <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)} className="bg-[#0A0A0A] border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#FFD166]/50">
              <option value="all">All Outcomes</option>
              <option value="booked">Booked</option>
              <option value="failed">Failed</option>
              <option value="unknown">Unknown</option>
            </select>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-[#0A0A0A] border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#FFD166]/50" />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteBulk}
                className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-semibold transition-all animate-in zoom-in duration-200"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedIds.length})
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
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
                {isSuperadmin && <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>}
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Outcome</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Recording</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 text-sm">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
                      Loading calls...
                    </div>
                  </td>
                </tr>
              ) : currentCalls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <PhoneIncoming className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm">No incoming calls found.</p>
                    </div>
                  </td>
                </tr>
              ) : currentCalls.map((c, i) => {
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
                    {isSuperadmin && (
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {c.tenants?.name || "System"}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-white">{c.phone_number}</span>
                        {tempBadge}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        c.status === "completed" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        c.status === "received" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                        c.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {c.status || "received"}
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
                      <span className="text-xs text-gray-400">{formatTimestamp(c.timestamp)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {c.recording_url ? (
                        <div className="flex items-center gap-2">
                          <audio controls src={c.recording_url} className="h-8 w-40" preload="none" />
                          <a href={c.recording_url} download target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white p-1" title="Download">
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {c.notes ? (
                          <button
                            onClick={() => setSelectedNote(c.notes)}
                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="View Notes / Transcript"
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

      {/* Notes / Transcript Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <AlignLeft className="w-5 h-5 text-[#FFD166]" />
                Call Notes
              </h3>
              <button onClick={() => setSelectedNote(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto grow space-y-4 text-sm text-gray-300">
              {selectedNote.split(/(?=^# )/m).map((section, idx) => {
                if (!section.trim()) return null;
                const isHeader = section.startsWith("# ");
                const lines = section.split("\n");
                if (isHeader && lines[0].includes("Raw Call Transcript")) {
                  return (
                    <details key={idx} className="mt-4 border border-white/10 rounded-lg p-3">
                      <summary className="cursor-pointer font-semibold text-gray-400 select-none">
                        View Raw Transcript
                      </summary>
                      <div className="mt-3 pt-3 border-t border-white/10 whitespace-pre-wrap text-gray-500 font-mono text-xs">
                        {lines.slice(1).join("\n")}
                      </div>
                    </details>
                  );
                }
                if (isHeader) {
                  return (
                    <div key={idx} className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                      <h4 className="text-[#FFD166] font-semibold text-base mb-2">
                        {lines[0].replace("# ", "")}
                      </h4>
                      <div className="whitespace-pre-wrap">
                        {lines.slice(1).join("\n").trim()}
                      </div>
                    </div>
                  );
                }
                return <div key={idx} className="whitespace-pre-wrap">{section}</div>;
              })}
            </div>
            <div className="p-5 border-t border-white/10 bg-white/[0.02] flex justify-end shrink-0">
              <button
                onClick={() => setSelectedNote(null)}
                className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-2 px-6 rounded-xl text-sm transition-all shadow-lg"
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
