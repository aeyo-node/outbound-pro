"use client";

import React, { useEffect, useState } from "react";
import { UserSquare2, Plus, Star, Trash2, Edit2, Bot, X, Loader2, Save, Upload, Link as LinkIcon, FileText } from "lucide-react";

const API = "/api";

export function AgentProfiles() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Document knowledge base states
  const [docsList, setDocsList] = useState<{ documents: any[]; links: any[] }>({ documents: [], links: [] });
  const [fetchingDocs, setFetchingDocs] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDesc, setLinkDesc] = useState("");
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    voice: "Aoede",
    model: "models/gemini-2.0-flash-exp",
    system_prompt: "",
    enabled_tools: "[]",
    is_default: false
  });

  const fetchProfiles = async () => {
    try {
      const res = await fetch(`${API}/profiles`);
      const data = await res.json();
      if (Array.isArray(data)) setProfiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleOpenCreate = () => {
    setEditingProfile(null);
    setFormData({
      name: "",
      voice: "Aoede",
      model: "models/gemini-2.0-flash-exp",
      system_prompt: "",
      enabled_tools: "[]",
      is_default: false
    });
    setIsModalOpen(true);
  };

  const fetchDocs = async (profileId: string) => {
    setFetchingDocs(true);
    try {
      const res = await fetch(`${API}/profiles/${profileId}/documents`);
      const data = await res.json();
      if (data && (Array.isArray(data.documents) || Array.isArray(data.links))) {
        setDocsList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingDocs(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProfile) return;
    
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    
    setFetchingDocs(true);
    try {
      const res = await fetch(`${API}/profiles/${editingProfile.id}/documents`, {
        method: "POST",
        body: uploadForm
      });
      if (res.ok) {
        fetchDocs(editingProfile.id);
      }
    } catch (err) {
      console.error(err);
      setFetchingDocs(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl || !editingProfile) return;
    
    setFetchingDocs(true);
    try {
      const res = await fetch(`${API}/profiles/${editingProfile.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl, description: linkDesc })
      });
      if (res.ok) {
        setLinkUrl("");
        setLinkDesc("");
        fetchDocs(editingProfile.id);
      }
    } catch (err) {
      console.error(err);
      setFetchingDocs(false);
    }
  };

  const handleDeleteDoc = async (filename: string) => {
    if (!editingProfile || !confirm(`Delete file "${filename}"?`)) return;
    
    setFetchingDocs(true);
    try {
      const res = await fetch(`${API}/profiles/${editingProfile.id}/documents/${encodeURIComponent(filename)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchDocs(editingProfile.id);
      }
    } catch (err) {
      console.error(err);
      setFetchingDocs(false);
    }
  };

  const handleDeleteLink = async (url: string) => {
    if (!editingProfile || !confirm(`Remove link "${url}"?`)) return;
    
    setFetchingDocs(true);
    try {
      const res = await fetch(`${API}/profiles/${editingProfile.id}/links?url=${encodeURIComponent(url)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchDocs(editingProfile.id);
      }
    } catch (err) {
      console.error(err);
      setFetchingDocs(false);
    }
  };

  const handleOpenEdit = (p: any) => {
    setEditingProfile(p);
    setFormData({
      name: p.name,
      voice: p.voice,
      model: p.model,
      system_prompt: p.system_prompt || "",
      enabled_tools: p.enabled_tools || "[]",
      is_default: !!p.is_default
    });
    setDocsList({ documents: [], links: [] });
    setLinkUrl("");
    setLinkDesc("");
    fetchDocs(p.id);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingProfile ? `${API}/profiles/${editingProfile.id}` : `${API}/profiles`;
      const method = editingProfile ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProfile ? formData : formData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchProfiles();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agent profile?")) return;
    try {
      await fetch(`${API}/profiles/${id}`, { method: "DELETE" });
      fetchProfiles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await fetch(`${API}/profiles/${id}/default`, { method: "POST" });
      fetchProfiles();
    } catch (err) {
      console.error(err);
    }
  };

  const loadDemoData = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/init_demo_data`);
      fetchProfiles();
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
          <h2 className="text-2xl font-medium text-white mb-2">Agent Profiles</h2>
          <p className="text-gray-400 text-sm">Configure multiple AI personalities, voices, and capabilities.</p>
        </div>
        <div className="flex gap-3">
          {profiles.length === 0 && !loading && (
            <button 
              onClick={loadDemoData}
              className="bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 px-6 rounded-xl border border-white/10 transition-all text-sm"
            >
              Load Demo Profiles
            </button>
          )}
          <button 
            onClick={handleOpenCreate}
            className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" /> Create Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
             <div className="w-6 h-6 border-2 border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-[#1C1C1E] border border-white/10 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 mx-auto">
              <UserSquare2 className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-400">No agent profiles found.</p>
          </div>
        ) : profiles.map((p, i) => (
          <div key={i} className={`bg-[#1C1C1E] border rounded-2xl p-6 relative group transition-colors ${p.is_default ? "border-[#FFD166]/50" : "border-white/10 hover:border-white/20"}`}>
            {p.is_default && (
              <div className="absolute top-0 right-0 bg-[#FFD166] text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 fill-black" /> Default
              </div>
            )}
            
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${p.is_default ? "bg-[#FFD166]/20" : "bg-white/5"}`}>
                <Bot className={`w-6 h-6 ${p.is_default ? "text-[#FFD166]" : "text-gray-400"}`} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">{p.name}</h3>
                <p className="text-xs text-gray-400 capitalize">{p.voice} Voice • {p.model.split('/')[1] || p.model}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6 h-20 overflow-hidden">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">System Prompt</p>
                <p className="text-sm text-gray-300 line-clamp-3 leading-relaxed">
                  {p.system_prompt || "Uses default global system prompt."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
              {!p.is_default && (
                <button 
                  onClick={() => handleSetDefault(p.id)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Make Default
                </button>
              )}
              <button 
                onClick={() => handleOpenEdit(p)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
              <button 
                onClick={() => handleDelete(p.id)}
                className="w-10 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-medium text-white">{editingProfile ? "Edit Profile" : "Create Agent Profile"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Agent Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Sales Assistant"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Voice</label>
                  <select 
                    value={formData.voice}
                    onChange={e => setFormData({...formData, voice: e.target.value})}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                  >
                    <option value="Aoede">Aoede</option>
                    <option value="Charon">Charon</option>
                    <option value="Fenrir">Fenrir</option>
                    <option value="Kore">Kore</option>
                    <option value="Puck">Puck</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">AI Model</label>
                <input 
                  type="text" 
                  value={formData.model}
                  onChange={e => setFormData({...formData, model: e.target.value})}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">System Prompt (Optional)</label>
                <textarea 
                  rows={6}
                  value={formData.system_prompt}
                  onChange={e => setFormData({...formData, system_prompt: e.target.value})}
                  placeholder="Override global system prompt for this agent..."
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD166]/50 resize-none text-sm leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="is_default"
                  checked={formData.is_default}
                  onChange={e => setFormData({...formData, is_default: e.target.checked})}
                  className="w-4 h-4 accent-[#FFD166]"
                />
                <label htmlFor="is_default" className="text-sm text-gray-300">Set as default agent profile</label>
              </div>

              {editingProfile && (
                <div className="pt-6 border-t border-white/10 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">Knowledge Base Resources</h4>
                    <p className="text-xs text-gray-500">Provide reference documentation, links, or context for the voice agent.</p>
                  </div>

                  {/* Document upload and link form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* File Upload */}
                    <div className="border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center bg-[#0A0A0A] text-center space-y-2">
                      <Upload className="w-6 h-6 text-gray-500" />
                      <span className="text-[11px] text-gray-300">Upload Reference Document (PDF/Text)</span>
                      <label className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-1.5 px-3 rounded-lg text-xs cursor-pointer transition-colors">
                        Select File
                        <input 
                          type="file"
                          accept=".pdf,.txt"
                          onChange={handleDocUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Link upload */}
                    <div className="border border-white/10 rounded-xl p-4 bg-[#0A0A0A] flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> Add External / Video Link</span>
                        <input 
                          type="text" 
                          placeholder="https://youtube.com/... or Doc URL" 
                          value={linkUrl}
                          onChange={e => setLinkUrl(e.target.value)}
                          className="w-full bg-[#1C1C1E] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FFD166]/50"
                        />
                        <input 
                          type="text" 
                          placeholder="Link Description (e.g. Tutorial Video)" 
                          value={linkDesc}
                          onChange={e => setLinkDesc(e.target.value)}
                          className="w-full bg-[#1C1C1E] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FFD166]/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="w-full py-1.5 bg-[#FFD166] text-black font-semibold text-xs rounded-lg transition-colors"
                      >
                        Add Link
                      </button>
                    </div>
                  </div>

                  {/* List of uploaded resources */}
                  {fetchingDocs ? (
                    <div className="flex justify-center py-4">
                      <div className="w-4 h-4 border border-white/10 border-t-[#FFD166] rounded-full animate-spin" />
                    </div>
                  ) : (docsList.documents.length > 0 || docsList.links.length > 0) ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded Resources</p>
                      
                      <div className="max-h-[160px] overflow-y-auto space-y-1.5">
                        {docsList.documents.map((doc: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 bg-[#0A0A0A] border border-white/5 rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#FFD166]" />
                              <span className="text-xs text-white truncate max-w-[250px]">{doc.name}</span>
                              <span className="text-[10px] text-gray-500">({(doc.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc.name)}
                              className="p-1.5 hover:bg-red-500/10 rounded text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {docsList.links.map((link: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 bg-[#0A0A0A] border border-white/5 rounded-lg">
                            <div className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4 text-blue-400" />
                              <div className="flex flex-col">
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-white hover:underline truncate max-w-[200px]">{link.url}</a>
                                {link.description && <span className="text-[10px] text-gray-500 truncate max-w-[200px]">{link.description}</span>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteLink(link.url)}
                              className="p-1.5 hover:bg-red-500/10 rounded text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-2">No documents or links uploaded yet.</p>
                  )}
                </div>
              )}

              {!editingProfile && (
                <div className="pt-6 border-t border-white/10">
                  <div className="bg-[#FFD166]/10 border border-[#FFD166]/20 rounded-xl p-4 text-center">
                    <h4 className="text-sm font-semibold text-[#FFD166] mb-1">Knowledge Base Resources</h4>
                    <p className="text-xs text-[#FFD166]/80">You must save the profile first before you can upload documents or add links.</p>
                  </div>
                </div>
              )}

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
                  {saving ? "Saving..." : editingProfile ? "Update Profile" : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
