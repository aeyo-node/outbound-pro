import React from "react";
import { 
  LayoutDashboard, PhoneCall, Megaphone, Users, PhoneOutgoing, 
  PhoneIncoming, CalendarDays, UserSquare2, TerminalSquare, 
  Settings, LogOut, Headset, BarChart3, CreditCard, Shield
} from "lucide-react";
import { useBranding } from "@/lib/BrandingContext";

export type TabId = 
  "overview" | "single_call" | "campaigns" | "crm" | "outbound" | 
  "incoming" | "ev_transactions" | "appointments" | "agent_profiles" | 
  "live_ops" | "system_prompt" | "settings" | "analytics";

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { brand, palette } = useBranding();

  const menuItems: { id: TabId; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "single_call", label: "Single Call", icon: PhoneCall },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "crm", label: "CRM / Leads", icon: Users },
    { id: "outbound", label: "Outbound Calls", icon: PhoneOutgoing },
    { id: "incoming", label: "Incoming Calls", icon: PhoneIncoming },
    { id: "appointments", label: "Demo Booked", icon: CalendarDays },
    { id: "live_ops", label: "Live Monitoring", icon: Headset, badge: "LIVE" },
    { id: "agent_profiles", label: "Agent Profiles", icon: UserSquare2 },
  ];

  const generalItems: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "system_prompt", label: "System Prompt", icon: TerminalSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem("swaram_auth");
    window.location.href = "/login";
  };

  const accent = palette.accent;
  const accentRgb = palette.accentRgb;

  return (
    <aside className="w-64 h-screen bg-[#0A0A0A] border-r border-white/5 flex flex-col fixed left-0 top-0 overflow-y-auto hidden md:flex">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 shrink-0">
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt={brand.brandName}
            className="w-8 h-8 rounded-xl object-cover"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
          >
            <Headset className="w-4 h-4 text-black" />
          </div>
        )}
        <span className="text-xl font-bold tracking-tight text-white">{brand.brandName || "Swaram"}</span>
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
                      ? "font-medium"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                  style={isActive ? {
                    backgroundColor: `rgba(${accentRgb},0.10)`,
                    color: accent,
                  } : undefined}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className="w-5 h-5"
                      style={{ color: isActive ? accent : undefined }}
                    />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.badge && isActive && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `rgba(${accentRgb},0.2)`, color: accent }}
                    >
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
                      ? "font-medium"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                  style={isActive ? {
                    backgroundColor: `rgba(${accentRgb},0.10)`,
                    color: accent,
                  } : undefined}
                >
                  <item.icon
                    className="w-5 h-5"
                    style={{ color: isActive ? accent : undefined }}
                  />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all mt-4"
            >
              <LogOut className="w-5 h-5 text-gray-500" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom card */}
      <div className="p-4 shrink-0 space-y-2">
        {/* Admin link for superadmin */}
        {typeof window !== "undefined" && localStorage.getItem("swaram_role") === "superadmin" && (
          <a href="/admin"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Shield className="w-4 h-4 text-[#a78bfa]" />
            <span className="text-sm">Super Admin</span>
          </a>
        )}
        {/* Billing */}
        <a href="/billing"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-400 hover:text-[#FFD166] hover:bg-[#FFD166]/5 transition-all"
        >
          <CreditCard className="w-4 h-4" />
          <span className="text-sm">Billing & Plans</span>
        </a>
        <div className="bg-gradient-to-br from-[#1C1C1E] to-[#0A0A0A] border border-white/10 rounded-2xl p-4 relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-24 h-24 rounded-full blur-xl"
            style={{ backgroundColor: `rgba(${accentRgb},0.10)` }}
          />
          <div className="relative z-10">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Headset className="w-4 h-4" style={{ color: accent }} />
            </div>
            <h4 className="text-white text-sm font-semibold mb-1">{brand.brandName || "Swaram"} Agent</h4>
            <p className="text-xs text-gray-400 mb-4">Enterprise Voice AI</p>
            <a
              href="/"
              className="block w-full py-2 text-xs font-medium text-center rounded-lg transition-colors"
              style={{
                backgroundColor: `rgba(${accentRgb},0.10)`,
                color: accent,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = `rgba(${accentRgb},0.20)`)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = `rgba(${accentRgb},0.10)`)}
            >
              View Website
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
