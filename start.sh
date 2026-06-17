#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "🚀 Starting Swaram AI Platform..."

if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# Ensure knowledge base directory exists on the persisted volume
mkdir -p /data/agent_docs 2>/dev/null || mkdir -p data/agent_docs

echo "📋 Configuration:"
echo "   LiveKit:   ${LIVEKIT_URL}"
echo "   Supabase:  ${SUPABASE_URL}"
echo "   Voice:     ${GEMINI_TTS_VOICE:-Aoede}"

# Next.js proxy target — inside Docker both run in same container
export BACKEND_URL="http://localhost:8000"

echo ""
echo "🌐 Starting FastAPI backend on port 8000..."
uvicorn server:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!

echo "🎨 Starting Next.js dashboard on port 3000..."
cd swaram-dashboard
npx next start -p 3000 &
NEXT_PID=$!
cd ..

sleep 2

echo "🤖 Starting LiveKit AI agent worker..."
python agent.py start &
AGENT_PID=$!

echo ""
echo "✅ All services running:"
echo "   → Dashboard:  http://localhost:3000"
echo "   → Backend:    http://localhost:8000"
echo "   → Agent:      LiveKit worker active"
echo ""

# Keep the container alive and monitor processes
while true; do
  kill -0 $SERVER_PID 2>/dev/null || { echo "❌ Backend died. Exiting."; exit 1; }
  kill -0 $NEXT_PID 2>/dev/null || { echo "❌ Dashboard died. Exiting."; exit 1; }
  kill -0 $AGENT_PID 2>/dev/null || { echo "❌ Agent died. Exiting."; exit 1; }
  sleep 5
done
