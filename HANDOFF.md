# PROJECT HANDOFF: OutboundAI Production Stability & Intelligence

This document provides a comprehensive overview of the current state of the OutboundAI system, implemented fixes, and technical architecture for any developer or AI assistant picking up the project.

---

## 🚀 Deployment Overview
- **Infrastructure:** AWS EC2 (Ubuntu). **Recommended Instance: t3.medium** (4GB RAM) for low-latency AI performance.
- **Architecture:** Dockerized FastAPI Backend + LiveKit Python Agent (Worker).
- **SIP Provider:** Vobiz (SIP Trunk) via LiveKit SIP.
- **AI Model:** Gemini 2.0 Flash Exp (Native Audio/Multimodal).
- **Database:** Supabase (PostgreSQL + Realtime).
- **Persistent Data:** Logs and local SQLite DB are persisted in `/data` volume.

---

## 🛠 Features Implemented & Working

### 1. Inbound & Outbound Voice Intelligence
- **Multilingual Support:** Native Malayalam, Hindi, and English code-switching. The agent (Mamitha) is instructed to match the lead's language naturally.
- **Auto-Summaries & Labeling:** AI generates a detailed conversation summary and labels leads as `[HOT]`, `[WARM]`, or `[COLD]` upon call termination.
- **Contact History Lookup:** At the start of every call, the AI uses `lookup_contact` to read previous interaction notes, ensuring continuity.
- **Booking & Verification:** Strict verification of Name and Phone Number before calling `book_appointment`.

### 2. Performance & Reliability Fixes
- **Instant Connection (Warm Start):** Configured `num_idle_processes=1` to keep an agent process ready in RAM.
- **20s Delay Fix (IPv4 Patch):** Implemented a network patch in `agent.py` to force IPv4 connections, bypassing the 20-second AWS/Google IPv6 timeout.
- **Force Hangup:** Updated `end_call` tool to explicitly remove SIP participants from the room, ensuring the phone line actually cuts when the AI is done.
- **Per-Call Prompt Refresh:** The agent now pulls the latest "Global Prompt" from the database at the start of **every** call.

### 3. Dashboard Features
- **Batch Campaigns:** CSV upload with automatic header detection and smart parsing.
- **System Logs Tab:** Real-time, color-coded log feed from the server for easy debugging.
- **Interactive UI:** IST timezone formatting, live call stats, and result analytics.

---

## 🔑 Technical Core (Key Files)
- `agent.py`: The heart of the voice logic. Handles SIP events, Gemini Live sessions, and prompt building.
- `tools.py`: AI-callable functions (Booking, SMS, Cal.com, Summaries, Transfer).
- `prompts.py`: Master system instructions. Now uses **Mamitha** as the global identity.
- `server.py`: API endpoints for campaigns, settings, and log streaming.
- `db.py`: Supabase integration layer.
- `ui/index.html`: The production dashboard.

---

## ⚠️ Critical Operational Notes

### 1. Deployment Workflow (CRITICAL)
Always follow this 3-step deployment to ensure code changes actually take effect:
1. **Push from Windows:** `git add -A`, `git commit`, `git push`.
2. **Pull on Server:** `git pull origin main`.
3. **FORCE REBUILD:** `sudo docker compose up -d --build`. 
   *Note: If changes don't appear, use `sudo docker compose build --no-cache` to force a clean slate.*

### 2. Environment Variables
Ensure the following are set in the server's `.env` or Supabase `settings` table:
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `GOOGLE_API_KEY` (Gemini)
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (for SMS)

### 3. Browser & UI
- If the dashboard stats or logs look "stale," perform a **Hard Refresh** (`Ctrl + Shift + R`).
- The **System Prompt** edited in the UI is "Global" and applies to all calls.

---

## 📅 Roadmap / Pending Tasks
- **Inbound Caller ID:** Currently recognizes numbers; could be enhanced to greet repeat callers by name more aggressively.
- **Dashboard Security:** Add a simple login layer to the `/` dashboard.
- **Call Recording UI:** Add a direct link to play recordings from the Call Logs table.
