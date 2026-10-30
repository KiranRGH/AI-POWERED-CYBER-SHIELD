@echo off
title CyberShield AI - Full-Stack Launcher
color 0b
echo =====================================================================
echo       CYBERSHIELD AI - LAUNCHING FRONTEND & BACKEND SIMULTANEOUSLY
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "CyberShield AI - Backend API (:8000)" cmd /k "cd backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Vite Frontend on http://localhost:3000 ...
start "CyberShield AI - Frontend UI (:3000)" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0 --port 3000"

echo.
echo =====================================================================
echo   BOTH SERVICES ARE LAUNCHED IN DEDICATED CONSOLES!
echo   - Web Application: http://localhost:3000
echo   - Backend REST API: http://localhost:8000
echo   - Swagger API Docs: http://localhost:8000/docs
echo =====================================================================
echo.
echo Launching default web browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:3000
exit
