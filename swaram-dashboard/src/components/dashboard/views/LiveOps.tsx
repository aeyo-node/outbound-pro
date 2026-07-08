import React, { useEffect, useState } from "react";
import { Mic, Phone, Loader2, Activity, Headset, Shield } from "lucide-react";
import { LiveKitRoom, RoomAudioRenderer, VoiceAssistantControlBar } from "@livekit/components-react";
import "@livekit/components-styles";

export function LiveOps() {
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bargeRoom, setBargeRoom] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/livekit/rooms");
      const data = await res.json();
      if (Array.isArray(data.rooms)) {
        setActiveRooms(data.rooms);
      }
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const int = setInterval(fetchRooms, 5000); // Poll every 5 seconds
    return () => clearInterval(int);
  }, []);

  const handleBargeIn = async (roomName: string) => {
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomName, participant_name: "Admin (Barge-in)" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to generate token");
      
      let lkUrl = data.url;
      if (lkUrl.includes("livekit:7880")) {
        lkUrl = `ws://${window.location.hostname}:7880`;
      }
      
      setToken(data.token);
      setUrl(lkUrl);
      setBargeRoom(roomName);
    } catch (err: any) {
      alert("Error joining room: " + err.message);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-medium text-white mb-2 flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#FFD166]" /> Live Monitoring
          </h2>
          <p className="text-gray-400 text-sm">Monitor active calls in real-time and barge in to assist the AI agent.</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={fetchRooms}
             className="bg-white/5 hover:bg-white/10 text-white py-2 px-4 rounded-xl border border-white/10 text-sm flex items-center gap-2"
           >
             Refresh
           </button>
        </div>
      </div>

      {bargeRoom ? (
        <div className="bg-[#1C1C1E] border border-[#FFD166]/50 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(255,209,102,0.1)] p-6 mb-8 flex flex-col h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <h3 className="text-xl font-bold text-white">Barged into Call</h3>
              <span className="text-sm text-gray-400 border border-white/10 bg-white/5 px-2 py-1 rounded-md">{bargeRoom}</span>
            </div>
            <button 
              onClick={() => { setBargeRoom(null); setToken(""); }}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm font-semibold border border-red-500/20"
            >
              End Barge-in
            </button>
          </div>

          <div className="flex-1 bg-[#0A0A0A] rounded-xl border border-white/10 p-6 flex flex-col relative overflow-hidden">
            <LiveKitRoom
              video={false}
              audio={true}
              token={token}
              serverUrl={url}
              connect={true}
              className="flex flex-col flex-1"
            >
              <div className="flex-1 flex items-center justify-center">
                 <div className="text-center">
                    <Mic className="w-16 h-16 text-[#FFD166] mx-auto mb-4 animate-pulse opacity-50" />
                    <p className="text-gray-400">You are connected to the call.</p>
                    <p className="text-xs text-gray-500 mt-2">Unmute your microphone below to speak to the lead.</p>
                 </div>
              </div>
              <div className="flex justify-center mt-auto border-t border-white/10 pt-4">
                 <VoiceAssistantControlBar />
              </div>
              <RoomAudioRenderer />
            </LiveKitRoom>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
               <Loader2 className="w-8 h-8 animate-spin text-[#FFD166]" />
            </div>
          ) : activeRooms.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-[#1C1C1E] border border-white/10 rounded-2xl">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 mx-auto">
                <Phone className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Active Calls</h3>
              <p className="text-sm text-gray-400">There are currently no active calls to monitor.</p>
            </div>
          ) : (
            activeRooms.map((room, i) => (
              <div key={i} className="bg-[#1C1C1E] border border-white/10 hover:border-white/20 rounded-2xl p-6 relative group transition-colors">
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full border border-green-500/20 text-[10px] font-bold tracking-wide uppercase">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Live
                </div>
                
                <div className="flex items-start gap-4 mb-6 pr-16">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5">
                    <Shield className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white truncate max-w-[180px]">{room.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">{room.num_participants} Participants</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6 border-t border-white/10 pt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="text-gray-300">Live</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Created</span>
                    <span className="text-gray-300">
                      {new Date(room.creation_time * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => handleBargeIn(room.name)}
                  className="w-full py-2.5 bg-[#FFD166]/10 hover:bg-[#FFD166]/20 text-[#FFD166] font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 border border-[#FFD166]/20"
                >
                  <Headset className="w-4 h-4" /> Barge In
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
