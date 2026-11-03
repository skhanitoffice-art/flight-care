@echo off
:: ========================================================================
:: Flight Care - EPSON L3250 Hardware Guard Uninstaller
:: ========================================================================

title Flight Care - Uninstall EPSON L3250 Guard
color 0C
echo.
echo ========================================================================
echo   FLIGHT CARE - UNINSTALL EPSON L3250 HARDWARE GUARD
echo ========================================================================
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Administrator permission required. Elevating...
    powershell -Command "Start-Process '%~0' -Verb RunAs"
    exit /b
)

echo [*] Removing Windows Scheduled Task 'FlightCare_EpsonGuard'...
schtasks /Delete /TN "FlightCare_EpsonGuard" /F >nul 2>&1

echo [*] Resuming any paused Epson printers...
powershell -NoProfile -Command "Get-Printer | Where-Object { $_.Name -like '*EPSON*' -or $_.Name -like '*L3250*' } | ForEach-Object { rundll32 printui.dll,PrintUIEntry /Xs /n $_.Name status resumed }" >nul 2>&1

echo.
echo [OK] EPSON L3250 Hardware Guard has been successfully uninstalled.
echo.
pause
