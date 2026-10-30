Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "      CYBERSHIELD AI - LAUNCHING FRONTEND & BACKEND SIMULTANEOUSLY" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 1. Launch FastAPI Backend
Write-Host "[1/2] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ScriptDir\backend'; .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# 2. Launch Vite Frontend
Write-Host "[2/2] Launching Vite Frontend on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ScriptDir\frontend'; npm run dev -- --host 0.0.0.0 --port 3000"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Both services launched successfully!" -ForegroundColor Yellow
Write-Host "  - Frontend UI:  http://localhost:3000" -ForegroundColor White
Write-Host "  - Backend API:  http://localhost:8000" -ForegroundColor White
Write-Host "  - Swagger Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Cyan

Start-Sleep -Seconds 3
Write-Host "Opening web browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"
