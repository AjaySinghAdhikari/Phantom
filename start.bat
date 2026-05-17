@echo off
echo Starting Phantom Services...

start "Phantom Proxy (Port 8080)" cmd /k "cd backend && uvicorn proxy:app --port 8080 --reload"
start "Phantom API (Port 8000)" cmd /k "cd backend && uvicorn main:app --port 8000 --reload"
start "Phantom Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo 🚀 Phantom is running in separate windows!
