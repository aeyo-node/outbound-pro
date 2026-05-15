"use client";

import React, { useState } from "react";
import { 
  Zap, BatteryCharging, Search, Info, CheckCircle2, XCircle, 
  AlertCircle, Phone, Fingerprint, RefreshCcw, ArrowRight, IndianRupee
} from "lucide-react";

const API = "/api";

export function EVStations() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [details, setDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<any>(null);
  
  // Wallet lookup state
  const [walletPhone, setWalletPhone] = useState("");
  const [walletData, setWalletData] = useState<any>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query) return;
    setSearching(true);
    setDetails(null);
    setResults(null);
    try {
      const res = await fetch(`${API}/ev/stations/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      if (data.status === "resolved") {
        fetchDetails(data.charger.identity);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const fetchDetails = async (identity: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API}/ev/stations/${identity}`);
      const data = await res.json();
      setDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const lookupWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletPhone) return;
    setLoadingWallet(true);
    try {
      const res = await fetch(`${API}/ev/wallet/${walletPhone}`);
      const data = await res.json();
      setWalletData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const triggerAction = async (payload: any) => {
    setActionLoading(true);
    setActionStatus(null);
    try {
      const res = await fetch(`${API}/ev/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setActionStatus(data);
      
      // Refresh details if successful
      if (data.status === "success") {
        setTimeout(() => fetchDetails(payload.charger_identity), 2000);
      }
    } catch (err) {
      console.error(err);
      setActionStatus({ error: "Technical failure triggering action." });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "available": return "text-green-400";
      case "preparing": return "text-blue-400";
      case "charging": return "text-[#FFD166]";
      case "finishing": return "text-orange-400";
      case "unavailable": return "text-red-400";
      case "faulted": return "text-red-500";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Live Operations</h2>
          <p className="text-gray-400 text-sm">Monitor live charger status and manage active sessions.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => window.location.reload()} 
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Search & Wallet */}
        <div className="space-y-6">
          {/* Station Search */}
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-[#FFD166]" />
              Find Station
            </h3>
            <form onSubmit={handleSearch} className="relative mb-4">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or ID (e.g. PTC Arcade)"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD166]/50"
              />
              <button 
                type="submit"
                disabled={searching}
                className="absolute right-2 top-2 p-1.5 rounded-lg bg-[#FFD166] text-black hover:bg-[#FFD166]/90 transition-colors disabled:opacity-50"
              >
                {searching ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {results && results.status === "multiple" && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-xs text-gray-400 mb-2">Multiple matches found:</p>
                {results.options.map((opt: any) => (
                  <button 
                    key={opt.identity}
                    onClick={() => {
                      setQuery(opt.label);
                      fetchDetails(opt.identity);
                    }}
                    className="w-full text-left p-3 rounded-lg bg-white/5 border border-white/5 hover:border-[#FFD166]/30 transition-all text-sm group"
                  >
                    <div className="text-white font-medium group-hover:text-[#FFD166]">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.identity}</div>
                  </button>
                ))}
              </div>
            )}
            
            {results && results.status === "not_found" && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                No station found matching your search.
              </div>
            )}
          </div>

          {/* Wallet Lookup */}
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FFD166]" />
              Wallet Lookup
            </h3>
            <form onSubmit={lookupWallet} className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={walletPhone}
                onChange={(e) => setWalletPhone(e.target.value)}
                placeholder="Phone (10 digits)"
                className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FFD166]/50"
              />
              <button 
                type="submit"
                disabled={loadingWallet}
                className="px-4 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {loadingWallet ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </form>

            {walletData && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">User</span>
                  <span className="text-sm text-white font-medium">{walletData.user?.userName || "Unknown"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Balance</span>
                  <span className="text-lg text-[#FFD166] font-bold flex items-center gap-1">
                    <IndianRupee className="w-4 h-4" />
                    {walletData.balance?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Station Details & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {!details && !loadingDetails ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <BatteryCharging className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-medium text-gray-400 mb-2">No Station Selected</h3>
              <p className="text-gray-500 max-w-xs">Search for a chargepoint on the left to see live status and control options.</p>
            </div>
          ) : loadingDetails ? (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-[#1C1C1E] border border-white/10 rounded-3xl">
              <div className="w-12 h-12 border-4 border-white/10 border-t-[#FFD166] rounded-full animate-spin mb-4" />
              <p className="text-gray-400">Fetching live status...</p>
            </div>
          ) : (
            <div className="bg-[#1C1C1E] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              {/* Station Header */}
              <div className="p-8 border-b border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#FFD166] uppercase tracking-wider mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FFD166] animate-pulse" />
                      Live Status
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-1">{details.chargerName}</h1>
                    <p className="text-gray-400 text-sm flex items-center gap-2">
                      <Fingerprint className="w-3.5 h-3.5" />
                      {details.identity} • {details.locationName || "No location info"}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 min-w-[120px]">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Protocol</p>
                      <p className="text-white font-medium">{details.chargePointConnectionProtocol || "OCPP 1.6"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Connectors Grid */}
              <div className="p-8">
                <h3 className="text-white font-semibold mb-6">Connectors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {details.evses?.map((evse: any) => {
                    const status = evse.connectorStatus || evse.status;
                    const isBusy = status?.toLowerCase() === "charging";
                    return (
                      <div 
                        key={evse.connectorId}
                        className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${getStatusColor(status)} group-hover:scale-110 transition-transform`}>
                              <BatteryCharging className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Gun {evse.connectorId}</p>
                              <p className="text-sm text-white font-bold">{evse.physicalReference || `Connector ${evse.connectorId}`}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-white/5 border border-white/5 ${getStatusColor(status)}`}>
                            {status?.toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-2 mb-6">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Max Power</span>
                            <span className="text-gray-300">{evse.maxOutputPower || 0} kW</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Type</span>
                            <span className="text-gray-300">{evse.connectors?.[0]?.name || "CCS2"}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {isBusy ? (
                            <button 
                              onClick={() => triggerAction({
                                action: "stop",
                                charger_identity: details.identity
                              })}
                              className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              STOP SESSION
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => {
                                  const phone = prompt("Enter customer mobile number (10 digits):");
                                  if (phone) {
                                    triggerAction({
                                      action: "start",
                                      charger_identity: details.identity,
                                      customer_mobile: phone,
                                      connector_id: evse.connectorId,
                                      otp_method: "skip"
                                    });
                                  }
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-[#FFD166]/10 border border-[#FFD166]/20 text-[#FFD166] text-xs font-bold hover:bg-[#FFD166] hover:text-black transition-all flex items-center justify-center gap-2"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                REMOTE START
                              </button>
                              <button 
                                onClick={() => triggerAction({
                                  action: "tariff",
                                  charger_identity: details.identity,
                                  connector_id: evse.connectorId
                                })}
                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
                                title="View Tariff"
                              >
                                <IndianRupee className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tariff Display */}
                {actionStatus && actionStatus.action === "tariff" && (
                  <div className="mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/10 animate-in fade-in zoom-in-95 duration-300">
                    <h4 className="text-[#FFD166] text-sm font-bold mb-4 flex items-center gap-2">
                      <IndianRupee className="w-4 h-4" />
                      Tariff Details
                    </h4>
                    <p className="text-sm text-gray-300 mb-6">{actionStatus.message}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {actionStatus.tariff_data?.[0] && Object.entries(actionStatus.tariff_data[0]).map(([key, val]: any) => (
                        <div key={key} className="bg-[#0A0A0A] p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">{key}</p>
                          <p className="text-sm text-white font-medium">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Feedback Overlay */}
                {actionLoading && (
                  <div className="mt-8 p-4 rounded-2xl bg-[#FFD166]/10 border border-[#FFD166]/20 flex items-center gap-3">
                    <RefreshCcw className="w-5 h-5 text-[#FFD166] animate-spin" />
                    <span className="text-sm text-[#FFD166] font-medium">Processing command with ChargeMOD server...</span>
                  </div>
                )}

                {actionStatus && (
                  <div className={`mt-8 p-6 rounded-2xl border flex flex-col gap-4 ${
                    actionStatus.status === "success" 
                      ? "bg-green-500/10 border-green-500/20 text-green-400" 
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    <div className="flex items-start gap-3">
                      {actionStatus.status === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                      <div>
                        <p className="font-bold text-sm mb-1">{actionStatus.status === "success" ? "COMMAND SENT" : "COMMAND FAILED"}</p>
                        <p className="text-sm opacity-90">{actionStatus.message || actionStatus.error}</p>
                      </div>
                    </div>
                    
                    {actionStatus.status === "need_otp_method" && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {actionStatus.buttons.map((btn: any, i: number) => (
                          <button 
                            key={i}
                            onClick={() => triggerAction({ ...btn.params, action: btn.action })}
                            className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-xs hover:bg-white/20"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
