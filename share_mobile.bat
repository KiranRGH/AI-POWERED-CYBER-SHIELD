@echo off
title CyberShield AI - Smartphone Public Access Tunnel
color 0a
echo =====================================================================
echo    CYBERSHIELD AI - CREATING SECURE HTTPS LINK FOR SMARTPHONES
echo =====================================================================
echo.
cd /d "%~dp0"

echo [1/2] Checking if servers are active...
echo Starting Backend API and Frontend if not running...
start "CyberShield AI - Backend" /min cmd /c "cd backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
start "CyberShield AI - Frontend" /min cmd /c "cd frontend && npm run dev -- --host 0.0.0.0 --port 3000"

echo.
echo [2/2] Generating public HTTPS tunnel for mobile access...
echo Note: Mobile browsers require HTTPS for camera and fingerprint biometrics.
echo.
echo Running localtunnel to expose port 3000 to the internet...
echo ---------------------------------------------------------------------
echo Copy and open the HTTPS URL below on your smartphone!
echo ---------------------------------------------------------------------
echo.
npx --yes localtunnel --port 3000
pause
