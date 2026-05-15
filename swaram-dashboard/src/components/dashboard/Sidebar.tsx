import React from "react";
import { 
  LayoutDashboard, PhoneCall, Megaphone, Users, PhoneOutgoing, 
  PhoneIncoming, Zap, CalendarDays, UserSquare2, TerminalSquare, 
  Settings, LogOut, Headset
} from "lucide-react";

export type TabId = 
  "overview" | "single_call" | "campaigns" | "crm" | "outbound" | 
  "incoming" | "ev_transactions" | "appointments" | "agent_profiles" | 
  "live_ops" | "system_prompt" | "settings";

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems: { id: TabId; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "single_call", label: "Single Call", icon: PhoneCall },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "crm", label: "CRM / Leads", icon: Users },
    { id: "outbound", label: "Outbound Calls", icon: PhoneOutgoing },
    { id: "incoming", label: "Incoming Calls", icon: PhoneIncoming },
    { id: "ev_transactions", label: "EV Transactions", icon: Zap },
    { id: "appointments", label: "Appointments", icon: CalendarDays },
    { id: "agent_profiles", label: "Agent Profiles", icon: UserSquare2 },
    { id: "live_ops", label: "Live Operations", icon: Zap },
  ];

  const generalItems: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "system_prompt", label: "System Prompt", icon: TerminalSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem("swaram_auth");
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 h-screen bg-[#0A0A0A] border-r border-white/5 flex flex-col fixed left-0 top-0 overflow-y-auto hidden md:flex">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FFD166] to-[#FF9F1C] flex items-center justify-center">
          <Headset className="w-4 h-4 text-black" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">Swaram</span>
      </div>

      <div className="px-4 pb-6 flex-1 flex flex-col gap-8">
        {/* Menu Section */}
        <div>
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Menu</p>
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                    isActive 
                      ? "bg-[#FFD166]/10 text-[#FFD166] font-medium" 
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${isActive ? "text-[#FFD166]" : "text-gray-500"}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.badge && isActive && (
                    <span className="bg-[#FFD166]/20 text-[#FFD166] text-[10px] px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* General Section */}
        <div>
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">General</p>
          <div className="space-y-1">
            {generalItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive 
                      ? "bg-[#FFD166]/10 text-[#FFD166] font-medium" 
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "text-[#FFD166]" : "text-gray-500"}`} />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all mt-4"
            >
              <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-400" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile App Promo (matching design) */}
      <div className="p-4 shrink-0">
        <div className="bg-gradient-to-br from-[#1C1C1E] to-[#0A0A0A] border border-white/10 rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFD166]/10 rounded-full blur-xl" />
          <div className="relative z-10">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Headset className="w-4 h-4 text-[#FFD166]" />
            </div>
            <h4 className="text-white text-sm font-semibold mb-1">Swaram Agent</h4>
            <p className="text-xs text-gray-400 mb-4">Enterprise Voice AI</p>
            <a href="/" className="block w-full py-2 bg-[#FFD166]/10 hover:bg-[#FFD166]/20 text-[#FFD166] text-xs font-medium text-center rounded-lg transition-colors">
              View Website
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
