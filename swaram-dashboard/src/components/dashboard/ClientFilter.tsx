"use client";
import React, { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

export function ClientFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSuperadmin(localStorage.getItem("swaram_role") === "superadmin");
    }
  }, []);

  useEffect(() => {
    if (isSuperadmin) {
      const load = async () => {
        try {
          const token = localStorage.getItem("swaram_token") || "";
          const res = await fetch("/api/admin/tenants", {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          const json = await res.json();
          if (Array.isArray(json)) {
            setTenants(json.filter(t => t.id !== "system"));
          }
        } catch (e) {
          console.error("Failed to load tenants", e);
        }
      };
      load();
    }
  }, [isSuperadmin]);

  if (!isSuperadmin) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
        <Building2 className="w-4 h-4 text-gray-400" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-xs text-white outline-none w-32"
        >
          <option value="" className="text-black">All Clients</option>
          {tenants.map(t => (
            <option key={t.id} value={t.id} className="text-black">{t.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
