"use client";

import React, { useEffect, useState } from "react";
import { Sidebar, TabId } from "@/components/dashboard/Sidebar";
import { TopHeader } from "@/components/dashboard/TopHeader";
import { Overview } from "@/components/dashboard/views/Overview";

import { SingleCall } from "@/components/dashboard/views/SingleCall";
import { Campaigns } from "@/components/dashboard/views/Campaigns";
import { CRMLeads } from "@/components/dashboard/views/CRMLeads";
import { OutboundCalls } from "@/components/dashboard/views/OutboundCalls";
import { IncomingCalls } from "@/components/dashboard/views/IncomingCalls";
import { EVTransactions } from "@/components/dashboard/views/EVTransactions";
import { Appointments } from "@/components/dashboard/views/Appointments";
import { AgentProfiles } from "@/components/dashboard/views/AgentProfiles";
import { EVStations } from "@/components/dashboard/views/EVStations";
import { SystemPrompt } from "@/components/dashboard/views/SystemPrompt";
import { Settings } from "@/components/dashboard/views/Settings";

export default function AppDashboard() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    document.body.className = "dashboard-body bg-[#0A0A0A] text-white";
    const auth = localStorage.getItem("swaram_auth");
    if (auth === "true") {
      setAuthed(true);
    } else {
      window.location.href = "/login";
    }
    setChecking(false);
    return () => { document.body.className = ""; };
  }, []);

  if (checking || !authed) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
      </div>
    );
  }

  const renderView = () => {
    switch (activeTab) {
      case "overview": return <Overview />;
      case "single_call": return <SingleCall />;
      case "campaigns": return <Campaigns />;
      case "crm": return <CRMLeads />;
      case "outbound": return <OutboundCalls />;
      case "incoming": return <IncomingCalls />;
      case "ev_transactions": return <EVTransactions />;
      case "appointments": return <Appointments />;
      case "agent_profiles": return <AgentProfiles />;
      case "live_ops": return <EVStations />;
      case "system_prompt": return <SystemPrompt />;
      case "settings": return <Settings />;
      default:
        return (
          <div className="p-10 flex flex-col items-center justify-center min-h-[60vh] text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
            <h2 className="text-2xl font-light text-gray-300 mb-2">Coming Soon</h2>
            <p className="text-gray-500">The {activeTab} view is currently being implemented.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0A0A0A] font-sans selection:bg-[#FFD166]/30">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col md:ml-64 min-w-0">
        <TopHeader />
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-10">
          <div className="max-w-[1600px] mx-auto w-full">
            {renderView()}
          </div>
        </div>
      </main>
    </div>
  );
}
