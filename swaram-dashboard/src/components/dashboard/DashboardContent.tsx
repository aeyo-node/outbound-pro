"use client";

import React, { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { Play, Pause, Clock, Activity, CalendarDays, CheckCircle2, ChevronDown, Phone, PhoneIncoming, Zap, IndianRupee, ArrowUpRight } from "lucide-react";

const API = "/api";

export function DashboardContent() {
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [incomingCalls, setIncomingCalls] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, txRes, icRes] = await Promise.all([
          fetch(`${API}/stats`).then(r => r.json()).catch(() => null),
          fetch(`${API}/transactions?limit=10`).then(r => r.json()).catch(() => []),
          fetch(`${API}/incoming_calls?limit=10`).then(r => r.json()).catch(() => []),
        ]);
        if (statsRes) setStats(statsRes);
        if (Array.isArray(txRes)) setTransactions(txRes);
        if (Array.isArray(icRes)) setIncomingCalls(icRes);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div className="p-20 text-center">
        <div className="inline-flex items-center gap-3 text-gray-400">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-[#FFD166] rounded-full animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const barData = (stats.timeline || []).slice(-7).map((t: any) => ({
    name: new Date(t.date).toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
    calls: t.count
  }));

  const pieData = Object.keys(stats.outcomes || {}).map(key => ({
    name: key.replace(/_/g, " "),
    value: stats.outcomes[key]
  }));
  const PIE_COLORS = ["#FFD166", "#4ade80", "#f87171", "#60a5fa", "#94a3b8"];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return m > 0 ? `${m}m ${secs}s` : `${secs}s`;
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="w-full flex flex-col">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h1 className="text-5xl font-light tracking-tight text-gray-900 mb-6">
            Welcome to, <span className="font-normal">swaram</span>
          </h1>
          <div className="flex items-center gap-8 text-xs font-medium text-gray-500">
            <div className="flex items-center gap-3">
              <span>Booked</span>
              <div className="w-20 h-6 bg-gray-200 rounded-full overflow-hidden flex items-center shadow-inner">
                <div className="h-full bg-[#222222] flex items-center px-2 text-white text-[10px]" style={{ width: `${Math.min(stats.booking_rate_percent || 0, 100)}%`, minWidth: "30px" }}>
                  {stats.booking_rate_percent || 0}%
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span>Success</span>
              <div className="w-20 h-6 bg-gray-200 rounded-full overflow-hidden flex items-center shadow-inner">
                <div className="h-full bg-[#FFD166] flex items-center px-2 text-[#222222] text-[10px]" style={{ width: `${stats.total_calls ? Math.round((stats.booked / stats.total_calls) * 100) : 0}%`, minWidth: "30px" }}>
                  {stats.total_calls ? Math.round((stats.booked / stats.total_calls) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-10 border-b border-gray-200/50 pb-2">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Activity className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Total Calls</span>
            </div>
            <span className="text-5xl font-light text-gray-900">{stats.total_calls}</span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <CheckCircle2 className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Appointments</span>
            </div>
            <span className="text-5xl font-light text-gray-900">{stats.booked}</span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <PhoneIncoming className="w-4 h-4" /> <span className="text-xs font-semibold uppercase tracking-wider">Incoming</span>
            </div>
            <span className="text-5xl font-light text-gray-900">{stats.total_incoming || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6">
        {/* Profile Card */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white/60 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-white flex flex-col justify-end min-h-[300px] relative overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 rounded-[2rem]" />
          <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop" alt="Agent" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="relative z-20 flex justify-between items-end">
            <div>
              <h3 className="text-white text-xl font-medium">Susanna</h3>
              <p className="text-white/70 text-sm">AI Voice Agent</p>
            </div>
            <div className="border border-white/30 bg-white/20 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full">Active</div>
          </div>
        </div>

        {/* Call Volume Chart */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-white flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-gray-900 text-lg font-medium">Call Volume</h3>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-3xl font-light text-gray-900">{stats.total_calls}</span>
                <span className="text-xs text-gray-500 mb-1">This week</span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="calls" radius={[10, 10, 10, 10]}>
                  {barData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === barData.length - 1 ? "#FFD166" : "#222222"} />
                  ))}
                </Bar>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} dy={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Avg Duration Dial */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-[#FFFDF8] rounded-[2rem] p-6 shadow-sm border border-white flex flex-col items-center justify-center relative">
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
            <h3 className="text-gray-900 text-lg font-medium">Avg Duration</h3>
          </div>
          <div className="relative w-40 h-40 mt-8 mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F1F1" strokeWidth="6" strokeDasharray="4 4" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#FFD166" strokeWidth="8" strokeDasharray="283" strokeDashoffset="70" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-light text-gray-900 tracking-tight">{formatTime(stats.avg_duration_seconds || 0)}</span>
              <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">Call Time</span>
            </div>
          </div>
          <div className="flex gap-4 w-full mt-auto">
            <button className="flex-1 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-gray-700 hover:bg-gray-50">
              <Play className="w-4 h-4" />
            </button>
            <button className="w-12 h-12 bg-[#222222] rounded-full flex items-center justify-center shadow-md text-white hover:bg-black">
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Booking Rate + Outcomes */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 shadow-sm border border-white flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-900 text-lg font-medium">Booking Rate</h3>
              <span className="text-2xl font-light text-gray-900">{stats.booking_rate_percent || 0}%</span>
            </div>
            <div className="flex gap-2 h-10 mt-auto">
               <div className="bg-[#FFD166] rounded-full h-full flex items-center justify-center text-xs font-medium px-4 text-[#222222]" style={{width: `${Math.max(stats.booking_rate_percent || 0, 10)}%`}}>Rate</div>
               <div className="bg-[#222222] rounded-full h-full flex-1" />
               <div className="bg-gray-400/40 rounded-full w-12 h-full" />
            </div>
          </div>

          <div className="bg-[#222222] rounded-[2rem] p-6 shadow-xl flex-[2] flex flex-col text-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">Call Outcomes</h3>
              <span className="text-xl font-light text-gray-400">{stats.total_calls}</span>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: PIE_COLORS[i % PIE_COLORS.length]}} />
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{item.name}</p>
                      <p className="text-[10px] text-gray-400">{item.value} calls</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Row: Transactions & Incoming Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Transactions */}
        <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 border border-white shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFD166]/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#FFD166]" />
              </div>
              <div>
                <h3 className="text-gray-900 font-medium">EV Transactions</h3>
                <p className="text-xs text-gray-500">Recent charging sessions</p>
              </div>
            </div>
            <span className="text-xs text-gray-400">{transactions.length} records</span>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {transactions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No transactions yet</p>
            ) : transactions.map((tx: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 group hover:bg-gray-50/50 rounded-xl px-3 -mx-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.charger_name || tx.charger_identity || "Charger"}</p>
                    <p className="text-[11px] text-gray-500">{tx.user_name || "User"} • {tx.energy_kwh || 0} kWh</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-0.5"><IndianRupee className="w-3 h-3" />{tx.amount || "0"}</p>
                  <p className="text-[11px] text-gray-500">{formatTimestamp(tx.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incoming Calls */}
        <div className="bg-white/80 backdrop-blur-md rounded-[2rem] p-6 border border-white shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <PhoneIncoming className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-gray-900 font-medium">Incoming Calls</h3>
                <p className="text-xs text-gray-500">Inbound SIP monitor</p>
              </div>
            </div>
            <span className="text-xs text-gray-400">{incomingCalls.length} records</span>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {incomingCalls.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No incoming calls yet</p>
            ) : incomingCalls.map((call: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 group hover:bg-gray-50/50 rounded-xl px-3 -mx-3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{call.phone_number || "Unknown"}</p>
                    <p className="text-[11px] text-gray-500">{call.status || "received"} • {call.duration_seconds || 0}s</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${call.status === "received" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                    {call.status || "received"}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{formatTimestamp(call.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
         <div className="lg:col-span-3 bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-white shadow-sm space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200/50 cursor-pointer hover:opacity-70">
              <span className="text-sm font-medium text-gray-800">Agent Settings</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200/50 cursor-pointer hover:opacity-70">
              <span className="text-sm font-medium text-gray-800">System Logs</span>
              <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
            </div>
            <div className="flex justify-between items-center py-2 cursor-pointer hover:opacity-70">
              <span className="text-sm font-medium text-gray-800">API Keys</span>
              <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
            </div>
         </div>
         
         <div className="lg:col-span-9 bg-white/80 backdrop-blur-md rounded-[2rem] p-6 border border-white shadow-sm flex items-center justify-between">
            <div className="flex items-center text-gray-500">
              <CalendarDays className="w-5 h-5 mr-3" /> 
              <span className="text-sm">Campaign Timeline & Detailed Analytics</span>
            </div>
            <button className="flex items-center gap-2 text-sm text-[#FFD166] font-medium hover:underline">
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
         </div>
      </div>
    </div>
  );
}
