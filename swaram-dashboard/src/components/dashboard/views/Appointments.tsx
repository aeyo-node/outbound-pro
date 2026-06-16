"use client";

import React, { useEffect, useState } from "react";
import { CalendarDays, Search, Clock, Trash2, User } from "lucide-react";

const API = "/api";

export function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleCancel = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await fetch(`${API}/appointments/${id}/cancel`, { method: "POST" });
      fetchAppointments();
    } catch (err) {
      console.error(err);
    }
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("en-US", { weekday: 'short', month: 'short', day: 'numeric', hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-medium text-white mb-2">Demo Booked</h2>
          <p className="text-gray-400 text-sm">Review website and app product demos scheduled by the AI agent.</p>
        </div>
      </div>

      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2 bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search demos..." 
              className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client Info</th>
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
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
                      Loading demos...
                    </div>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <CalendarDays className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm">No demos booked.</p>
                    </div>
                  </td>
                </tr>
              ) : appointments.map((a, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
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
                    {a.status === "scheduled" && (
                      <button onClick={() => handleCancel(a.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors" title="Cancel Demo">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
