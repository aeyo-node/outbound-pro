"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell, CartesianGrid
} from "recharts";
import {
  Phone, Clock, TrendingUp, Target, Mic, CheckCircle2,
  XCircle, PhoneMissed, BarChart3, Activity, RefreshCw
} from "lucide-react";

const API = "/api";
const ACCENT = "#FFD166";
const PIE_COLORS = ["#FFD166", "#4ade80", "#f87171", "#60a5fa", "#a78bfa", "#94a3b8"];

function KpiCard({ icon: Icon, label, value, sub, color = ACCENT }: any) {
  return (
    <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-light text-white">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("swaram_token") || "";
      const res = await fetch(`${API}/analytics?days=${days}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Analytics fetch error", e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="w-6 h-6 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin mr-3" />
      Loading analytics...
    </div>
  );

  if (!data) return <div className="text-gray-500 text-center py-20">Failed to load analytics</div>;

  const fmtTime = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const outcomePie = Object.entries(data.outcomes || {}).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value
  })).filter((d: any) => d.value > 0);

  const hourlyPeak = [...(data.hourly_distribution || [])].sort((a: any, b: any) => b.calls - a.calls)[0];

  const agentRows = (data.agent_performance || []).slice(0, 6);
  const campaignRows = (data.campaign_performance || []).slice(0, 5);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Analytics</h2>
          <p className="text-sm text-gray-400">Deep insights into your calling performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="bg-white/5 border border-white/10 text-white text-xs rounded-xl px-3 py-2 outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load} className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={Phone} label="Total Calls" value={fmtNum(data.total_calls)} sub={`${days}d period`} />
        <KpiCard icon={CheckCircle2} label="Connected" value={fmtNum(data.connected_calls)} sub={`${data.connect_rate_percent}% rate`} color="#4ade80" />
        <KpiCard icon={PhoneMissed} label="No Answer" value={fmtNum(data.no_answer)} color="#f87171" />
        <KpiCard icon={Target} label="Booked" value={fmtNum(data.booked)} sub={`${data.booking_rate_percent}% rate`} color="#a78bfa" />
        <KpiCard icon={Clock} label="Avg Duration" value={fmtTime(data.avg_duration_seconds)} sub="per call" color="#60a5fa" />
        <KpiCard icon={Mic} label="Total Minutes" value={fmtNum(data.total_minutes)} sub="voice minutes" color="#fb923c" />
      </div>

      {/* Charts Row 1: Timeline + Outcomes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Call Volume Timeline */}
        <div className="lg:col-span-2 bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-medium mb-1">Call Volume</h3>
          <p className="text-xs text-gray-400 mb-5">Daily calls over the last {days} days</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.timeline || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
                interval={Math.floor((data.timeline?.length || 1) / 6)}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6b7280" }} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "#1C1C1E", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                labelFormatter={(v: string) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              />
              <Line type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Outcome Donut */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-medium mb-1">Outcomes</h3>
          <p className="text-xs text-gray-400 mb-4">Distribution of results</p>
          {outcomePie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={outcomePie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" stroke="none">
                    {outcomePie.map((_: any, i: number) => (
                      <PieCell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: "#1C1C1E", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {outcomePie.slice(0, 5).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-gray-300 capitalize">{item.name}</span>
                    </div>
                    <span className="text-xs font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-10">No data yet</p>
          )}
        </div>
      </div>

      {/* Charts Row 2: Hourly Heatmap + Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Hourly Distribution */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white font-medium">Best Calling Hours</h3>
              <p className="text-xs text-gray-400">Calls by hour of day</p>
            </div>
            {hourlyPeak && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Peak hour</p>
                <p className="text-sm font-medium text-[#FFD166]">
                  {hourlyPeak.hour}:00–{hourlyPeak.hour + 1}:00
                </p>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.hourly_distribution || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#6b7280" }}
                tickFormatter={(v: number) => v % 4 === 0 ? `${v}h` : ""} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#6b7280" }} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "#1C1C1E", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                labelFormatter={(v: number) => `${v}:00 – ${v + 1}:00`}
              />
              <Bar dataKey="calls" radius={[3, 3, 0, 0]} barSize={12}>
                {(data.hourly_distribution || []).map((_: any, i: number) => (
                  <Cell key={i} fill={_ === hourlyPeak ? ACCENT : "rgba(255,255,255,0.12)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Performance */}
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-medium mb-1">Agent Performance</h3>
          <p className="text-xs text-gray-400 mb-4">Calls & booking rate per agent</p>
          {agentRows.length > 0 ? (
            <div className="space-y-3">
              {agentRows.map((agent: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs text-gray-400 shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs text-white font-medium truncate">
                        {agent.agent_id === "default" ? "Default Agent" : `Agent ${agent.agent_id.slice(0, 8)}`}
                      </p>
                      <span className="text-xs text-[#4ade80] ml-2 shrink-0">{agent.booking_rate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full">
                      <div className="h-full rounded-full bg-[#FFD166]" style={{ width: `${Math.min(agent.booking_rate, 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right shrink-0">{agent.calls}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-10">No agent data yet</p>
          )}
        </div>
      </div>

      {/* Campaign Performance Table */}
      {campaignRows.length > 0 && (
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-medium mb-1">Campaign Performance</h3>
          <p className="text-xs text-gray-400 mb-4">Calls, connections and bookings per campaign</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-white/5">
                  <th className="text-left pb-3 font-medium">Campaign</th>
                  <th className="text-right pb-3 font-medium">Calls</th>
                  <th className="text-right pb-3 font-medium">Connected</th>
                  <th className="text-right pb-3 font-medium">Booked</th>
                  <th className="text-right pb-3 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {campaignRows.map((c: any, i: number) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 text-gray-300 font-medium">
                      {c.campaign_id === "manual" ? "Manual Calls" : `Campaign ${c.campaign_id.slice(0, 8)}`}
                    </td>
                    <td className="py-3 text-right text-white">{c.calls}</td>
                    <td className="py-3 text-right text-green-400">{c.connected}</td>
                    <td className="py-3 text-right text-[#FFD166]">{c.booked}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        c.booking_rate >= 10 ? "bg-green-500/10 text-green-400" : "bg-white/5 text-gray-400"
                      }`}>{c.booking_rate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Locations */}
      {(data.top_locations || []).length > 0 && (
        <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-medium mb-4">Top Locations</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.top_locations.slice(0, 10).map((loc: any, i: number) => (
              <div key={i} className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                <p className="text-xs text-gray-300 truncate">{loc.name}</p>
                <p className="text-lg font-light text-white mt-1">{loc.calls}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
