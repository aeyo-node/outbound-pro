import React from "react";
import { Search, Bell, Menu } from "lucide-react";

export function TopHeader() {
  return (
    <header className="h-20 border-b border-white/5 bg-[#0A0A0A]/50 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6 md:px-10">
      <div className="flex items-center gap-4 flex-1">
        <button className="md:hidden text-gray-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
        <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 w-full max-w-md focus-within:border-[#FFD166]/40 transition-colors">
          <Search className="w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search leads, calls, or transactions..." 
            className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 w-full"
          />
          <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
            <span>⌘</span><span>K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-[#FFD166] rounded-full border-2 border-[#0A0A0A]" />
        </button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-white leading-tight">Admin</p>
            <p className="text-xs text-gray-500">admin@swaram.io</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD166] to-[#FF9F1C] flex items-center justify-center text-black font-bold text-lg">
            S
          </div>
        </div>
      </div>
    </header>
  );
}
