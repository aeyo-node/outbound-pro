import React, { useEffect, useState } from "react";
import { Search, Bell, Menu, Zap, Crown, Building2, LogOut } from "lucide-react";

export function TopHeader() {
  const [user, setUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("swaram_token");
    if (token) {
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data && data.user) {
            setUser(data.user);
            setTenant(data.tenant);
            if (data.subscription && data.subscription.billing_plans) {
              setPlan(data.subscription.billing_plans);
            } else if (data.plans && data.tenant) {
              const p = data.plans.find((x: any) => x.id === data.tenant.plan_id);
              if (p) setPlan(p);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  const callsUsed = tenant?.calls_used || 0;
  const callsLimit = plan?.calls_limit || 0;
  const isUnlimited = callsLimit === -1;

  let PlanIcon = Zap;
  let planColor = "#60a5fa"; // starter
  if (plan?.id === "growth") { PlanIcon = Crown; planColor = "#FFD166"; }
  if (plan?.id === "enterprise") { PlanIcon = Building2; planColor = "#a78bfa"; }

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
        
        {/* Balance Display */}
        {plan && (
          <div className="hidden lg:flex items-center gap-3 bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-2">
            <div className="flex items-center gap-2 pr-3 border-r border-white/10">
              <PlanIcon className="w-4 h-4" style={{ color: planColor }} />
              <span className="text-xs font-semibold capitalize" style={{ color: planColor }}>{plan.name}</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-4 mb-1">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Calls Used / Limit</span>
                <span className="text-xs font-medium text-white">
                  {callsUsed.toLocaleString()} / {isUnlimited ? "∞" : callsLimit.toLocaleString()}
                </span>
              </div>
              {!isUnlimited && (
                <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all" 
                    style={{ 
                      width: `${Math.min((callsUsed / callsLimit) * 100, 100)}%`,
                      backgroundColor: (callsUsed / callsLimit) > 0.9 ? "#ef4444" : planColor
                    }} 
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          {/* <span className="absolute top-0 right-0 w-2 h-2 bg-[#FFD166] rounded-full border-2 border-[#0A0A0A]" /> */}
        </button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-white leading-tight">{user?.name || "Admin"}</p>
            <p className="text-xs text-gray-500">{user?.email || "admin@swaram.io"}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD166] to-[#FF9F1C] flex items-center justify-center text-black font-bold text-lg uppercase">
            {(user?.name || user?.email || "S").charAt(0)}
          </div>
          <button 
            onClick={() => {
              fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("swaram_token")}` } });
              localStorage.clear();
              window.location.href = "/login";
            }}
            className="ml-2 text-gray-500 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
