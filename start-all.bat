@echo off
title CivicPulse Project Launcher
echo ============================================================
echo               Starting CivicPulse Full Stack
echo ============================================================
echo.

set ROOT_DIR=%~dp0

echo [1/2] Launching Backend on http://localhost:4000 ...
start "CivicPulse Backend (:4000)" cmd /k "cd /d "%ROOT_DIR%CivicPulse\backend" && npm run dev"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Frontend on http://localhost:5173 ...
start "CivicPulse Frontend (:5173)" cmd /k "cd /d "%ROOT_DIR%CivicPulse" && npm run dev"

echo.
echo ============================================================
echo   Backend:  http://localhost:4000
echo   Frontend: http://localhost:5173
echo.
echo   Press any key to close this launcher (servers will keep running)
echo ============================================================
pause >nul
