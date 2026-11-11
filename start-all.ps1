Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "             Starting CivicPulse Full Stack                " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot

Write-Host "[1/2] Starting Backend API on http://localhost:4000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\CivicPulse\backend'; Write-Host '=== CivicPulse Backend API (:4000) ===' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Frontend App on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\CivicPulse'; Write-Host '=== CivicPulse Frontend UI (:5173) ===' -ForegroundColor Cyan; npm run dev"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:4000" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
