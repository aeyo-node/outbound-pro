import React, { useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, VoiceAssistantControlBar, useVoiceAssistant } from "@livekit/components-react";
import "@livekit/components-styles";
import { Mic, Loader2 } from "lucide-react";

export function TestAgentWidget({ agentId }: { agentId: string }) {
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [active, setActive] = useState(false);

  const startTest = async () => {
    if (!agentId) {
      alert("Please save the agent profile first before testing.");
      return;
    }
    setConnecting(true);
    try {
      const roomName = `test_agent_${agentId}_${Date.now()}`;
      
      // Hit our new API endpoint to get a token to join the room
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomName, participant_name: "Tester" })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to get token");
      
      let lkUrl = data.url;
      if (lkUrl.includes("livekit:7880")) {
        lkUrl = `ws://${window.location.hostname}:7880`;
      }
      
      setToken(data.token);
      setUrl(lkUrl);
      
      // Dispatch the agent to the room
      await fetch("/api/agent/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomName, agent_profile_id: agentId })
      });

      setActive(true);
    } catch (err: any) {
      alert("Error starting test: " + err.message);
    } finally {
      setConnecting(false);
    }
  };

  const onDisconnected = () => {
    setActive(false);
    setToken("");
  };

  if (!active) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#0A0A0A] rounded-2xl border border-white/10 h-full min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-[#FFD166]/10 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,209,102,0.15)]">
          <Mic className="w-8 h-8 text-[#FFD166]" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Test your agent</h3>
        <p className="text-sm text-gray-500 text-center mb-8 max-w-[250px]">
          Run a live call to test your agent's voice, prompt, and functions.
        </p>
        <button 
          onClick={startTest}
          disabled={connecting}
          className="bg-[#FFD166] hover:bg-[#FFD166]/90 text-black font-semibold py-3 px-8 rounded-full flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
          {connecting ? "Connecting..." : "Start Test"}
        </button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token}
      serverUrl={url}
      connect={true}
      onDisconnected={onDisconnected}
      className="flex flex-col h-full min-h-[400px] bg-[#0A0A0A] rounded-2xl border border-white/10 p-6"
    >
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <AgentVisualizer />
        <button 
          onClick={() => setActive(false)}
          className="absolute top-0 right-0 text-gray-500 hover:text-white text-xs"
        >
          End Call
        </button>
      </div>
      
      <div className="mt-8 border-t border-white/10 pt-4 flex justify-center">
        <VoiceAssistantControlBar />
      </div>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function AgentVisualizer() {
  const { state } = useVoiceAssistant();
  
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
        state === "speaking" ? "bg-[#FFD166]/20 scale-110 shadow-[0_0_50px_rgba(255,209,102,0.4)]" : 
        state === "listening" ? "bg-green-500/20 scale-100 shadow-[0_0_30px_rgba(34,197,94,0.3)]" :
        "bg-white/5 scale-95"
      }`}>
        <Mic className={`w-12 h-12 transition-colors ${state === "speaking" ? "text-[#FFD166]" : state === "listening" ? "text-green-500" : "text-gray-500"}`} />
      </div>
      <p className="text-sm font-medium text-gray-400 capitalize bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
        {state === "speaking" ? "Agent is speaking..." : state === "listening" ? "Listening to you..." : "Connecting..."}
      </p>
    </div>
  );
}
