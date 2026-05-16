# Swaram AI Local Run Script for Windows
Write-Host "🚀 Starting Swaram AI Platform..." -ForegroundColor Cyan

# Ensure we are in the root directory
$RootPath = Get-Location

# 1. Start FastAPI Backend
Write-Host "🌐 Starting FastAPI backend on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath'; . .\venv\Scripts\Activate.ps1; uvicorn server:app --port 8000" -WindowStyle Normal

# 2. Start Next.js Dashboard
Write-Host "🎨 Starting Next.js dashboard on port 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\swaram-dashboard'; npm run dev" -WindowStyle Normal

# 3. Start LiveKit Agent Worker
Write-Host "🤖 Starting LiveKit AI agent worker..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath'; . .\venv\Scripts\Activate.ps1; python agent.py start" -WindowStyle Normal

Write-Host "`n✅ All services starting in separate windows!" -ForegroundColor Cyan
Write-Host "   → Dashboard: http://localhost:3000"
Write-Host "   → Backend:   http://localhost:8000"
Write-Host "`nYou can close the individual windows to stop the services."
