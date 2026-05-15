"use client";

import React from "react";
import { Settings, Bell, User, Headset, LogOut } from "lucide-react";

export function TopNav() {
  const [activeTab, setActiveTab] = React.useState("Dashboard");

  const tabs = [
    "Dashboard",
    "Calls",
    "Campaigns",
    "CRM",
    "Transactions",
    "Settings",
  ];

  const handleLogout = () => {
    localStorage.removeItem("swaram_auth");
    window.location.href = "/login";
  };

  return (
    <div className="flex items-center justify-between bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_4px_30px_rgba(0,0,0,0.02)] rounded-[2rem] px-6 py-4 mb-8">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 border border-gray-200/50 bg-white/50 rounded-full px-5 py-2 shadow-sm hover:bg-white/70 transition-colors">
        <Headset className="w-5 h-5 text-gray-700" />
        <span className="font-semibold text-lg tracking-tight text-gray-900">
          swaram
        </span>
      </a>

      {/* Navigation */}
      <div className="hidden md:flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTab === tab
                ? "bg-[#222222] text-white shadow-md"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-600 bg-white/50 hover:bg-white/80 transition-colors px-4 py-2.5 rounded-full border border-gray-200/50 shadow-sm">
          <Settings className="w-4 h-4" /> Setting
        </button>
        <button className="p-2.5 text-gray-600 bg-white/50 hover:bg-white/80 transition-colors rounded-full border border-gray-200/50 shadow-sm">
          <Bell className="w-4 h-4" />
        </button>
        <button className="p-2.5 text-gray-600 bg-white/50 hover:bg-white/80 transition-colors rounded-full border border-gray-200/50 shadow-sm">
          <User className="w-4 h-4" />
        </button>
        <button onClick={handleLogout} title="Logout" className="p-2.5 text-gray-600 bg-white/50 hover:bg-red-50 hover:text-red-500 transition-colors rounded-full border border-gray-200/50 shadow-sm">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
