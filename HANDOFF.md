# PROJECT HANDOFF: OutboundAI Production Stability

## 🚀 Deployment Overview
- **Infrastructure:** AWS EC2 (Ubuntu).
- **Architecture:** Dockerized FastAPI Backend + LiveKit Python Agent.
- **SIP Provider:** Vobiz (SIP Trunk).
- **AI Model:** Gemini 2.0 Flash Exp (Google Realtime Native Audio).
- **Database:** Supabase (PostgreSQL + Realtime).

## 🛠 Features Implemented & Working
1. **Batch Campaigns:**
   - CSV file upload support with auto-header detection.
   - Smart CSV parsing (handles files with or without headers).
   - "Sample CSV" download button for users.
2. **Dashboard UI:**
   - Indian Standard Time (IST) formatting for all timestamps.
   - **System Logs Tab:** Live feed from `/data/app.log` color-coded by level.
   - Real-time stats and outcome charts.
3. **AI Intelligence:**
   - **Auto-Summaries:** AI writes a detailed conversation summary to the dashboard "Notes" column.
   - **Lead Labeling:** AI categorizes leads as `[HOT]`, `[WARM]`, or `[COLD]` inside the notes.
   - **Data Accuracy:** AI is instructed to strictly verify name and number before calling `book_appointment`.
4. **Call Logging:**
   - Failsafe logging captures disconnects even if the user hangs up abruptly.

## 🔑 Key Files
- `server.py`: FastAPI dashboard backend & API.
- `agent.py`: LiveKit voice worker logic.
- `tools.py`: AI capabilities (Booking, SMS, Cal.com, Summaries).
- `prompts.py`: Master system instructions & multilingual logic.
- `ui/index.html`: Dashboard frontend.
- `docker-compose.yml`: Deployment configuration (mounts `/data` for persistent logs/db).

## ⚠️ Important for New Session
1. **Always use `--build`:** When updating code, remind the user to run `sudo docker compose up -d --build` on the server, not just `restart`.
2. **Browser Cache:** Remind the user to use **Hard Refresh** (Ctrl+Shift+R) if UI changes don't appear.
3. **Windows Environment:** The user's Windows machine lacks `powershell` in PATH, so run git commands via standard `cmd` or have the user do it.
