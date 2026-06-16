"use client";

import React, { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Cell as PieCell
} from "recharts";
import { CheckCircle2, Phone, PhoneIncoming, Zap, IndianRupee, Activity, ArrowUpRight, Clock } from "lucide-react";

const API = "/api";

interface OverviewProps {
  setActiveTab?: (tab: any) => void;
}

export function Overview({ setActiveTab }: OverviewProps) {
  const [stats, setStats] = useState<any>(null);
  const [demos, setDemos] = useState<any[]>([]);
  const [incomingCalls, setIncomingCalls] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, demoRes, icRes] = await Promise.all([
          fetch(`${API}/stats`).then(r => r.json()).catch(() => null),
          fetch(`${API}/appointments?limit=5`).then(r => r.json()).catch(() => []),
          fetch(`${API}/incoming_calls?limit=5`).then(r => r.json()).catch(() => []),
        ]);
        if (statsRes) setStats(statsRes);
        if (Array.isArray(demoRes)) setDemos(demoRes);
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
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="w-6 h-6 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin mr-3" />
        Loading overview...
      </div>
    );
  }

  // Data Formatting
  const barData = (stats.timeline || []).slice(-7).map((t: any) => ({
    name: new Date(t.date).toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
    calls: t.count
  }));

  const pieData = Object.keys(stats.outcomes || {}).map(key => ({
    name: key.replace(/_/g, " "),
    value: stats.outcomes[key]
  })).filter(item => item.value > 0);

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

  const bookingRate = stats.total_calls ? Math.round((stats.booked / stats.total_calls) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Calls */}
        <div className="bg-gradient-to-br from-[#1C1C1E] to-[#0A0A0A] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[#FFD166]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">Total Calls</p>
              <h3 className="text-4xl font-light text-white">{stats.total_calls}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#4ade80] bg-[#4ade80]/10 w-fit px-2 py-1 rounded-md relative z-10">
            <Activity className="w-3 h-3" /> Live Tracking
          </div>
        </div>

        {/* Card 2: Demo Booked */}
        <div onClick={() => setActiveTab?.("appointments")} className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 relative overflow-hidden group cursor-pointer hover:border-[#FFD166]/30 transition-colors">
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">Demo Booked</p>
              <h3 className="text-4xl font-light text-white">{stats.booked}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 relative z-10">Successfully booked</p>
        </div>

        {/* Card 3: Booking Rate */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">Booking Rate</p>
              <h3 className="text-4xl font-light text-white">{bookingRate}%</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10">
              <Zap className="w-5 h-5 text-[#FFD166]" />
            </div>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-3 relative z-10">
            <div className="h-full bg-[#FFD166] rounded-full" style={{ width: `${bookingRate}%` }} />
          </div>
        </div>

        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
           <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
           <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">Avg Duration</p>
              <h3 className="text-4xl font-light text-white">{formatTime(stats.avg_duration_seconds || 0)}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white border border-white/10">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-500 relative z-10">Average call time</p>
        </div>

      </div>

      {/* Middle Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Call Volume Bar Chart */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 col-span-1 xl:col-span-2 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-white font-medium text-lg">Call Volume</h3>
              <p className="text-xs text-gray-400">Last 7 days activity</p>
            </div>
            <select className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <RechartsTooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                  contentStyle={{ backgroundColor: '#1C1C1E', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'}} 
                  itemStyle={{color: '#FFD166'}}
                />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} dy={10} />
                <Bar dataKey="calls" radius={[6, 6, 6, 6]} barSize={40}>
                  {barData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === barData.length - 1 ? "#FFD166" : "#333333"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Call Outcomes Donut Chart */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-white font-medium text-lg">Call Outcomes</h3>
              <p className="text-xs text-gray-400">Distribution of results</p>
            </div>
          </div>
          <div className="flex-1 relative w-full min-h-[200px] flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <PieCell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1C1C1E', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff'}} 
                    itemStyle={{color: '#fff'}}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-500">No outcome data available</p>
            )}
            {pieData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-light text-white">{stats.total_calls}</span>
                <span className="text-[10px] text-gray-500 uppercase">Total</span>
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="mt-4 space-y-2 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: PIE_COLORS[i % PIE_COLORS.length]}} />
                  <span className="text-xs text-gray-300 capitalize truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="text-xs font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Grid: Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Demos Booked */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-medium text-lg">Recent Demos Booked</h3>
            <button onClick={() => setActiveTab?.("appointments")} className="text-xs text-[#FFD166] hover:underline">View All</button>
          </div>
          <div className="space-y-1">
            {demos.length === 0 ? (
              <div className="text-center py-10 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                <p className="text-sm text-gray-500">No recent demos booked</p>
              </div>
            ) : demos.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-3 px-4 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFD166]/10 flex items-center justify-center border border-[#FFD166]/20">
                    <CheckCircle2 className="w-4 h-4 text-[#FFD166]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{d.client_name || "Unknown Lead"}</p>
                    <p className="text-[11px] text-gray-400">
                      {d.service || "Free Demo"} • {d.client_phone} {d.whatsapp_number ? `• WA: ${d.whatsapp_number}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    d.status === "scheduled" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {d.status || "booked"}
                  </span>
                  <p className="text-[11px] text-gray-500 mt-1">{formatTimestamp(d.appointment_time)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incoming Calls */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-white font-medium text-lg">Incoming Calls</h3>
            <button onClick={() => setActiveTab?.("incoming")} className="text-xs text-[#FFD166] hover:underline">View All</button>
          </div>
          <div className="space-y-1">
            {incomingCalls.length === 0 ? (
               <div className="text-center py-10 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                 <p className="text-sm text-gray-500">No incoming calls</p>
               </div>
            ) : incomingCalls.map((call: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-3 px-4 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <PhoneIncoming className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{call.phone_number || "Unknown"}</p>
                    <p className="text-[11px] text-gray-400">{call.status || "received"} • {call.duration_seconds || 0}s</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    call.status === "received" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  }`}>
                    {call.status || "received"}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{formatTimestamp(call.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
