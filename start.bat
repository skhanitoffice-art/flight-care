@echo off
cd /d "%~dp0"
title FlightCare Web & App Server - VIP Protocol
color 0B
echo ========================================================
echo   Flight Care VIP Protocol - Localhost Server Launcher
echo   Current Folder: %CD%
echo ========================================================
echo.
echo [1/3] Checking & clearing port 8081...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
echo [OK] Port 8081 is ready.
echo.
echo [2/3] Preparing browser launch (http://localhost:8081)...
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:8081'"
echo.
echo [3/3] Starting Localhost Expo Web Server on http://localhost:8081 ...
echo ========================================================
echo.
if exist "node_modules\.bin\expo.cmd" (
    call node_modules\.bin\expo.cmd start --web --port 8081
) else (
    call npx expo start --web --port 8081
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [RETRY] Attempting with cache clear...
    if exist "node_modules\.bin\expo.cmd" (
        call node_modules\.bin\expo.cmd start --web --clear --port 8081
    ) else (
        call npx expo start --web --clear --port 8081
    )
)

echo.
echo ========================================================
echo Server has stopped. Press any key to close this window.
echo ========================================================
pause
