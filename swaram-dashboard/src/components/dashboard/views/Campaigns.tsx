"use client";

import React, { useEffect, useState } from "react";
import { Plus, Play, Pause, Trash2, Search, Calendar, Users, PhoneOutgoing, X, Loader2, Save, Megaphone, Upload, Download, FileText } from "lucide-react";

const API = "/api";

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // CSV upload states
  const [uploadMode, setUploadMode] = useState<"manual" | "csv">("manual");
  const [csvContacts, setCsvContacts] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvError, setCsvError] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    schedule_type: "once",
    schedule_time: "09:00",
    agent_profile_id: "",
    contacts_raw: ""
  });

  const fetchData = async () => {
    try {
      const [campRes, profRes] = await Promise.all([
        fetch(`${API}/campaigns`),
        fetch(`${API}/profiles`)
      ]);
      const campData = await campRes.json();
      const profData = await profRes.json();
      
      if (Array.isArray(campData)) setCampaigns(campData);
      if (Array.isArray(profData)) {
        setProfiles(profData);
        if (profData.length > 0 && !formData.agent_profile_id) {
          const def = profData.find(p => p.is_default) || profData[0];
          setFormData(prev => ({ ...prev, agent_profile_id: def.id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const [selectedCampaignLogs, setSelectedCampaignLogs] = useState<any[] | null>(null);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);

  const fetchCampaignLogs = async (campaign: any) => {
    setSelectedCampaign(campaign);
    setSelectedCampaignLogs(null);
    setIsLogsModalOpen(true);
    try {
      const res = await fetch(`${API}/campaigns/${campaign.id}/logs`);
      if (res.ok) {
        setSelectedCampaignLogs(await res.json());
      } else {
        setSelectedCampaignLogs([]);
      }
    } catch (err) {
      console.error(err);
      setSelectedCampaignLogs([]);
    }
  };

  const downloadExampleCsv = () => {
    const csvContent = "business name,phone number,industry,place,lead name\n" +
                       "Apex Web Agency,+919876543210,Web Design,Ernakulam,Rahul\n" +
                       "Swaram Clinics,+918765432109,Healthcare,Kochi,Priya\n" +
                       "Lubi Manufacturing,+917654321098,Real Estate,Thrissur,Arjun";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "leads_example.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFileName(file.name);
    setCsvError("");
    setCsvContacts([]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setCsvError("Empty file");
        return;
      }
      
      try {
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length < 2) {
          setCsvError("CSV must have a header row and at least one contact row.");
          return;
        }
        
        // Parse headers — support both comma and tab separated
        const rawHeader = lines[0];
        const delimiter = rawHeader.includes('\t') ? '\t' : ',';
        const headers = rawHeader.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        
        // Smart CSV row splitter — handles quoted values with commas inside
        const splitRow = (line: string): string[] => {
          if (delimiter === '\t') return line.split('\t').map(v => v.trim().replace(/^["']|["']$/g, ''));
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let ci = 0; ci < line.length; ci++) {
            const ch = line[ci];
            if (ch === '"') {
              inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
              result.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += ch;
            }
          }
          result.push(current.trim().replace(/^"|"$/g, ''));
          return result;
        };

        const findIndex = (names: string[]) => 
          headers.findIndex(h => names.some(name => h === name || h.replace(/\s+/g, '_') === name.replace(/\s+/g, '_') || h.replace(/\s+/g, '') === name.replace(/\s+/g, '')));
        
        const phoneIdx = findIndex(['phone number', 'phone_number', 'phone', 'mobile', 'contact', 'contact number']);
        const businessIdx = findIndex(['business name', 'business_name', 'business', 'company', 'company name']);
        const industryIdx = findIndex(['industry', 'service_type', 'service', 'sector', 'category', 'type']);
        const placeIdx = findIndex(['place', 'city', 'location', 'address', 'area', 'town', 'region', 'district']);
        const nameIdx = findIndex(['name', 'lead_name', 'contact_name', 'lead name', 'contact name', 'full name', 'fullname']);
        
        if (phoneIdx === -1) {
          setCsvError("Could not find a phone column. Expected header: 'phone number', 'phone', or 'mobile'.");
          return;
        }
        
        const parsed: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const row = splitRow(lines[i]);
          const phoneVal = row[phoneIdx] || '';
          const businessVal = businessIdx !== -1 ? (row[businessIdx] || '') : '';
          const industryVal = industryIdx !== -1 ? (row[industryIdx] || '') : '';
          const placeVal = placeIdx !== -1 ? (row[placeIdx] || '') : '';
          const nameVal = nameIdx !== -1 ? (row[nameIdx] || '') : '';
          
          if (phoneVal) {
            let cleanedPhone = phoneVal.replace(/[\s\-\(\)]/g, '');
            if (/^\d{10}$/.test(cleanedPhone)) {
              cleanedPhone = "+91" + cleanedPhone;
            } else if (/^\d{12}$/.test(cleanedPhone) && cleanedPhone.startsWith("91")) {
              cleanedPhone = "+" + cleanedPhone;
            } else if (!cleanedPhone.startsWith("+") && cleanedPhone.length > 0) {
              cleanedPhone = "+" + cleanedPhone;
            }
            
            parsed.push({
              phone: cleanedPhone,
              business_name: businessVal || "our company",
              industry: industryVal || "",
              place: placeVal || "",
              lead_name: nameVal || "there"
            });
          }
        }
        
        if (parsed.length === 0) {
          setCsvError("No valid contacts with phone numbers found.");
        } else {
          setCsvContacts(parsed);
        }
      } catch (err) {
        setCsvError("Error parsing CSV: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let contacts = [];
    if (uploadMode === "csv") {
      if (csvContacts.length === 0) {
        alert("Please upload a valid CSV first.");
        return;
      }
      contacts = csvContacts;
    } else {
      contacts = formData.contacts_raw
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => ({ phone: line }));
    }
    
    if (contacts.length === 0) {
      alert("Contacts list cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          contacts
        })
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          name: "",
          schedule_type: "once",
          schedule_time: "09:00",
          agent_profile_id: profiles.find(p => p.is_default)?.id || profiles[0]?.id || "",
          contacts_raw: ""
        });
        setCsvContacts([]);
        setCsvFileName("");
        setUploadMode("manual");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      const res = await fetch(`${API}/campaigns/${id}/run`, { method: "POST" });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to trigger campaign run.");
      }
    } catch (err) {
      console.error(err);
      alert("Error starting campaign: " + err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this campaign?`)) return;
    try {
      await fetch(`${API}/campaigns/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const loadDemoData = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/init_demo_data`);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-medium text-white mb-2">Campaigns</h2>
          <p className="text-gray-400 text-sm">Manage and schedule automated outbound calling campaigns.</p>
        </div>
        <div className="flex gap-3">
          {campaigns.length === 0 && !loading && (
            <button 
              onClick={loadDemoData}
              className="bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 px-6 rounded-xl border border-white/10 transition-all text-sm"
            >
              Load Demo Campaigns
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" /> Create Campaign
          </button>
        </div>
      </div>

      <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2 bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search campaigns..." 
              className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Schedule</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
                      Loading campaigns...
                    </div>
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <Megaphone className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm">No campaigns found. Create one to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : campaigns.map((c, i) => {
                let total = c.total_contacts || 0;
                try {
                   if (total === 0 && c.contacts_json) {
                     total = JSON.parse(c.contacts_json).length;
                   }
                } catch(e) {}
                
                const completed = c.total_dispatched || 0;
                const progress = total > 0 ? (completed / total) * 100 : 0;
                
                return (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FFD166]/10 flex items-center justify-center border border-[#FFD166]/20">
                          <PhoneOutgoing className="w-4 h-4 text-[#FFD166]" />
                        </div>
                        <span className="text-sm font-medium text-white">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        c.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                        c.status === "completed" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        c.status === "paused" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                        "bg-gray-500/10 text-gray-400 border-gray-500/20"
                      }`}>
                        {c.status || "idle"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden w-24">
                          <div className="h-full bg-[#FFD166] rounded-full" style={{width: `${progress}%`}} />
                        </div>
                        <span className="text-xs text-gray-400">{completed}/{total}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {c.schedule_time || "Immediate"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.status === "active" && (
                          <button onClick={() => handleRunNow(c.id)} className="p-2 hover:bg-green-500/10 rounded-lg text-gray-400 hover:text-green-400 transition-colors" title="Run Now">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => fetchCampaignLogs(c)} className="p-2 hover:bg-blue-500/10 rounded-lg text-gray-400 hover:text-blue-400 transition-colors" title="View Details">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs Modal */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#2C2C2E]/50">
              <div>
                <h3 className="text-xl font-medium text-white">Campaign Details: {selectedCampaign?.name}</h3>
                <p className="text-sm text-gray-400">Total Dispatched: {selectedCampaign?.total_dispatched}</p>
              </div>
              <button onClick={() => setIsLogsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {!selectedCampaignLogs ? (
                <div className="text-center text-gray-400 py-10">Loading logs...</div>
              ) : selectedCampaignLogs.length === 0 ? (
                <div className="text-center text-gray-400 py-10">No calls have been logged for this campaign yet.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="text-sm font-medium text-gray-400 border-b border-white/10">
                    <tr>
                      <th className="pb-3 font-medium">Phone</th>
                      <th className="pb-3 font-medium">Outcome</th>
                      <th className="pb-3 font-medium">Duration</th>
                      <th className="pb-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-white/5">
                    {selectedCampaignLogs.map((log, idx) => (
                      <tr key={idx}>
                        <td className="py-3 text-white">{log.phone_number}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            log.outcome === "completed" || log.outcome === "booked" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                          }`}>
                            {log.outcome}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400">{log.duration_seconds}s</td>
                        <td className="py-3 text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-medium text-white">Create New Campaign</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Campaign Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Sales Followup"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Agent Profile</label>
                  <select 
                    required
                    value={formData.agent_profile_id}
                    onChange={e => setFormData({...formData, agent_profile_id: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.voice})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Schedule Type</label>
                  <select 
                    value={formData.schedule_type}
                    onChange={e => setFormData({...formData, schedule_type: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                  >
                    <option value="once">Run Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Run Time</label>
                  <input 
                    type="time" 
                    value={formData.schedule_time}
                    onChange={e => setFormData({...formData, schedule_time: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-400">Add Contacts</label>
                  <div className="flex bg-[#0A0A0A] p-0.5 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setUploadMode("manual")}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                        uploadMode === "manual" ? "bg-[#FFD166] text-black" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Paste Numbers
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("csv")}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                        uploadMode === "csv" ? "bg-[#FFD166] text-black" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Upload CSV
                    </button>
                  </div>
                </div>

                {uploadMode === "manual" ? (
                  <textarea 
                    required={uploadMode === "manual"}
                    rows={6}
                    value={formData.contacts_raw}
                    onChange={e => setFormData({...formData, contacts_raw: e.target.value})}
                    placeholder="+919876543210&#10;+918765432109"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50 resize-none text-sm font-mono"
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-center bg-[#0A0A0A] border border-dashed border-white/10 rounded-xl p-5">
                      <div className="flex-1 flex items-center gap-3">
                        <Upload className="w-8 h-8 text-gray-500 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {csvFileName || "Upload contacts CSV file"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {csvContacts.length > 0 ? `${csvContacts.length} valid contacts loaded` : "Accepts columns: business name, phone number, industry, place, lead name"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={downloadExampleCsv}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white font-medium py-2 px-4 rounded-xl border border-white/10 text-xs transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Template
                        </button>
                        <label className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-2 px-4 rounded-xl text-xs cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Select File
                          <input 
                            type="file"
                            accept=".csv"
                            onChange={handleCsvUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {csvError && (
                      <p className="text-xs text-red-400 font-medium">❌ {csvError}</p>
                    )}

                    {csvContacts.length > 0 && (
                      <div className="border border-white/5 rounded-xl bg-white/[0.01] overflow-hidden">
                        <p className="px-4 py-2 border-b border-white/5 text-xs font-semibold text-gray-400 uppercase bg-white/[0.02]">
                          Preview (First 3 rows)
                        </p>
                        <div className="overflow-x-auto max-h-[140px]">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-4 py-2 text-gray-400 font-medium">Business Name</th>
                                <th className="px-4 py-2 text-gray-400 font-medium">Phone</th>
                                <th className="px-4 py-2 text-gray-400 font-medium">Industry</th>
                                <th className="px-4 py-2 text-gray-400 font-medium">Place</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-gray-300">
                              {csvContacts.slice(0, 3).map((item, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.01]">
                                  <td className="px-4 py-2 truncate max-w-[150px]">{item.business_name}</td>
                                  <td className="px-4 py-2 font-mono">{item.phone}</td>
                                  <td className="px-4 py-2 truncate max-w-[120px]">{item.industry}</td>
                                  <td className="px-4 py-2 truncate max-w-[120px]">{item.place}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-medium transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-2.5 px-8 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? "Creating..." : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
