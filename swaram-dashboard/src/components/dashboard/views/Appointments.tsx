"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays, Search, Clock, Trash2, X, AlertCircle } from "lucide-react";

const API = "/api";

export function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API}/appointments`);
      const data = await res.json();
      if (Array.isArray(data)) setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await fetch(`${API}/appointments/${id}/cancel`, { method: "POST" });
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteIndividual = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this appointment record?")) return;
    try {
      const res = await fetch(`${API}/appointments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedIds(prev => prev.filter(x => x !== id));
        fetchAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBulk = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected appointments?`)) return;
    try {
      const res = await fetch(`${API}/appointments/delete-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchAppointments();
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
    const filteredIds = filtered.map(a => a.id).filter(Boolean);
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("en-US", { weekday: 'short', month: 'short', day: 'numeric', hour: "2-digit", minute: "2-digit" });
  };

  const filteredAppointments = appointments.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      (a.client_name || "").toLowerCase().includes(q) ||
      (a.client_phone || "").toLowerCase().includes(q) ||
      (a.business_name || "").toLowerCase().includes(q) ||
      (a.industry || "").toLowerCase().includes(q) ||
      (a.place || "").toLowerCase().includes(q) ||
      (a.service || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / rowsPerPage));
  const currentAppointments = filteredAppointments.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-medium text-white mb-2">Demo Booked</h2>
          <p className="text-gray-400 text-sm">Review website and app product demos scheduled by the AI agent.</p>
        </div>
      </div>

      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-2 bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search demos, clients, places..." 
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
                    checked={filteredAppointments.length > 0 && filteredAppointments.every(a => selectedIds.includes(a.id))}
                    onChange={() => handleToggleAll(filteredAppointments)}
                    className="rounded border-white/20 bg-white/5 text-[#FFD166] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client Info</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Business</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Industry</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Place</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">WhatsApp</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Booked On</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-gray-500 text-sm">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
                      Loading demos...
                    </div>
                  </td>
                </tr>
              ) : currentAppointments.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <CalendarDays className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm">No demos booked.</p>
                    </div>
                  </td>
                </tr>
              ) : currentAppointments.map((a, i) => {
                const isSelected = selectedIds.includes(a.id);
                return (
                  <tr key={a.id || i} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? "bg-[#FFD166]/5" : ""}`}>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(a.id)}
                        className="rounded border-white/20 bg-white/5 text-[#FFD166] focus:ring-0 focus:ring-offset-0 cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FFD166]/10 flex items-center justify-center border border-[#FFD166]/20">
                          <Clock className="w-4 h-4 text-[#FFD166]" />
                        </div>
                        <span className="text-sm font-medium text-white">{formatTimestamp(a.appointment_time)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{a.client_name || "Unknown"}</span>
                        <span className="text-[11px] text-gray-500">{a.client_phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {a.business_name || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {a.industry || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {a.place || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {a.whatsapp_number || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      <div className="max-w-[200px] truncate" title={a.service || "—"}>
                        {a.service || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        a.status === "scheduled" ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        {a.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-400">{formatTimestamp(a.created_at)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {a.status === "scheduled" && (
                          <button 
                            onClick={() => handleCancel(a.id)} 
                            className="p-1.5 bg-white/5 hover:bg-orange-500/20 rounded-lg text-gray-400 hover:text-orange-400 transition-colors" 
                            title="Cancel Appointment"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteIndividual(a.id)} 
                          className="p-1.5 bg-white/5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors" 
                          title="Delete Permanently"
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
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredAppointments.length)} of {filteredAppointments.length} entries
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
