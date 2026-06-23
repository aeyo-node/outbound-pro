import re

with open(r'c:\Users\chris\Documents\outbound-pro\swaram-dashboard\src\components\dashboard\views\OutboundCalls.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states
content = content.replace('const [searchQuery, setSearchQuery] = useState("");', '''const [searchQuery, setSearchQuery] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");''')

# 2. Add export function
export_func = '''  const handleExportCSV = () => {
    if (filteredCalls.length === 0) return;
    const headers = ["Phone", "Lead Name", "Business", "Industry", "Place", "Status", "Outcome", "Duration (s)", "Date"];
    const csvContent = [
      headers.join(","),
      ...filteredCalls.map(c => [
        c.phone_number || "",
        c.lead_name || "",
        c.business_name || "",
        c.industry || "",
        c.place || "",
        c.status || "",
        c.outcome || "",
        c.duration_seconds || "",
        c.timestamp || c.created_at || ""
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ].join("\\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `outbound_calls_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };
'''
content = content.replace('const handleToggleSelect = (id: string) => {', export_func + '\n  const handleToggleSelect = (id: string) => {')

# 3. Update filter logic
old_filter = '''  const filteredCalls = calls.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.phone_number || "").toLowerCase().includes(q) ||
      (c.lead_name || "").toLowerCase().includes(q) ||
      (c.business_name || "").toLowerCase().includes(q) ||
      (c.industry || "").toLowerCase().includes(q) ||
      (c.place || "").toLowerCase().includes(q)
    );
  });'''
new_filter = '''  const filteredCalls = calls.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchSearch = (
      (c.phone_number || "").toLowerCase().includes(q) ||
      (c.lead_name || "").toLowerCase().includes(q) ||
      (c.business_name || "").toLowerCase().includes(q) ||
      (c.industry || "").toLowerCase().includes(q) ||
      (c.place || "").toLowerCase().includes(q)
    );
    
    const matchOutcome = filterOutcome === "all" ? true : (c.outcome || "unknown").toLowerCase() === filterOutcome.toLowerCase();
    
    let temp = "UNRATED";
    if (c.notes) {
      if (c.notes.includes("[HOT]")) temp = "HOT";
      else if (c.notes.includes("[WARM]")) temp = "WARM";
      else if (c.notes.includes("[COLD]")) temp = "COLD";
    }
    const matchStatus = filterStatus === "all" ? true : temp.toLowerCase() === filterStatus.toLowerCase();
    
    const matchDate = filterDate === "" ? true : (c.timestamp || c.created_at || "").startsWith(filterDate);
    
    return matchSearch && matchOutcome && matchStatus && matchDate;
  });'''
content = content.replace(old_filter, new_filter)

# 4. Add UI elements
ui_search = '''          <div className="flex items-center gap-2 bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search phone numbers, leads, places..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-white placeholder-gray-500 w-full"
            />
          </div>'''

ui_filters = ui_search + '''
          <div className="flex gap-2">
            <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)} className="bg-[#0A0A0A] border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#FFD166]/50">
              <option value="all">All Outcomes</option>
              <option value="booked">Booked</option>
              <option value="failed">Failed</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-[#0A0A0A] border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#FFD166]/50">
              <option value="all">All Ratings</option>
              <option value="hot">HOT</option>
              <option value="warm">WARM</option>
              <option value="cold">COLD</option>
              <option value="unrated">Unrated</option>
            </select>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-[#0A0A0A] border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#FFD166]/50" />
          </div>'''
content = content.replace(ui_search, ui_filters)

# 4b. Add export button
export_btn = '''<button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            >
              <Download className="w-4 h-4" />
              Export
            </button>'''

content = content.replace('{selectedIds.length > 0 && (', export_btn + '\n          {selectedIds.length > 0 && (')

# 5. Redesign Notes Modal
old_modal = '''      {/* Notes Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Call Notes</h3>
              <button onClick={() => setSelectedNote(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedNote}</p>
            </div>
            <div className="p-5 border-t border-white/10 bg-white/[0.02] flex justify-end">
              <button 
                onClick={() => setSelectedNote(null)}
                className="bg-white/5 hover:bg-white/10 text-white font-medium py-2 px-6 rounded-xl text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}'''

new_modal = '''      {/* Notes Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <AlignLeft className="w-5 h-5 text-[#FFD166]" />
                Call Notes
              </h3>
              <button onClick={() => setSelectedNote(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto grow space-y-4 text-sm text-gray-300">
              {selectedNote.split(/(?=^# )/m).map((section, idx) => {
                if (!section.trim()) return null;
                const isHeader = section.startsWith("# ");
                const lines = section.split("\\n");
                if (isHeader && lines[0].includes("Raw Call Transcript")) {
                  return (
                    <details key={idx} className="mt-4 border border-white/10 rounded-lg p-3">
                      <summary className="cursor-pointer font-semibold text-gray-400 select-none">
                        View Raw Transcript
                      </summary>
                      <div className="mt-3 pt-3 border-t border-white/10 whitespace-pre-wrap text-gray-500 font-mono text-xs">
                        {lines.slice(1).join("\\n")}
                      </div>
                    </details>
                  );
                }
                if (isHeader) {
                  return (
                    <div key={idx} className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
                      <h4 className="text-[#FFD166] font-semibold text-base mb-2">
                        {lines[0].replace("# ", "")}
                      </h4>
                      <div className="whitespace-pre-wrap">
                        {lines.slice(1).join("\\n").trim()}
                      </div>
                    </div>
                  );
                }
                return <div key={idx} className="whitespace-pre-wrap">{section}</div>;
              })}
            </div>
            <div className="p-5 border-t border-white/10 bg-white/[0.02] flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedNote(null)}
                className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-2 px-6 rounded-xl text-sm transition-all shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}'''

content = content.replace(old_modal, new_modal)

with open(r'c:\Users\chris\Documents\outbound-pro\swaram-dashboard\src\components\dashboard\views\OutboundCalls.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch successful!")
