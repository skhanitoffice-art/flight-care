@echo off
:: ========================================================================
:: Flight Care - EPSON L3250 Tamper-Proof Counter Lock Installer
:: Installs the permanent silent hardware lock guard on the Counter PC.
:: Once installed, the printer is controlled ONLY by the website dashboard.
:: Works on all Windows 10/11 machines natively (no Python required).
:: ========================================================================

title Flight Care - EPSON L3250 Hardware Guard Installer
color 0B
echo.
echo ========================================================================
echo   FLIGHT CARE - EPSON EcoTank L3250 HARDWARE GUARD INSTALLER
echo   Hazrat Shahjalal International Airport (HSIA), Dhaka, Bangladesh
echo ========================================================================
echo.

:: Check for Administrator Privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Administrator permission required.
    echo [*] Elevating to Administrator...
    powershell -Command "Start-Process '%~0' -Verb RunAs"
    exit /b
)

set SCRIPT_DIR=%~dp0
if exist "%SCRIPT_DIR%run_epson_guard_hidden.vbs" (
    set VBS_PATH=%SCRIPT_DIR%run_epson_guard_hidden.vbs
) else if exist "%SCRIPT_DIR%scripts\run_epson_guard_hidden.vbs" (
    set VBS_PATH=%SCRIPT_DIR%scripts\run_epson_guard_hidden.vbs
) else (
    echo [ERROR] run_epson_guard_hidden.vbs not found!
    pause
    exit /b
)

echo [*] Target Guard Script: %VBS_PATH%
echo [*] Registering Windows Scheduled Task 'FlightCare_EpsonGuard'...

:: Remove old task if exists
schtasks /Delete /TN "FlightCare_EpsonGuard" /F >nul 2>&1

:: Create permanent highest-privilege task that runs invisibly at logon
schtasks /Create /TN "FlightCare_EpsonGuard" /TR "wscript.exe \"%VBS_PATH%\"" /SC ONLOGON /RL HIGHEST /F

if %errorLevel% equ 0 (
    echo [OK] Windows Scheduled Task successfully created.
    echo [*] Starting Hardware Guard in background now...
    schtasks /Run /TN "FlightCare_EpsonGuard" >nul 2>&1
    wscript.exe "%VBS_PATH%"
    echo.
    echo ========================================================================
    echo   [SUCCESS] EPSON L3250 হার্ডওয়্যার গার্ড সফলভাবে ইনস্টল ও সক্রিয়!
    echo ========================================================================
    echo   1. পিসি রিস্টার্ট করলেও এটি স্বয়ংক্রিয়ভাবে ব্যাকগ্রাউন্ডে চালু থাকবে।
    echo   2. কোনো উইন্ডো ওপেন থাকবে না (কাউন্টার স্টাফ বন্ধ করতে পারবে না)।
    echo   3. ওয়েবসাইট থেকে ম্যানেজার লক করলে বাইরের কোনো ফাইলও প্রিন্ট হবে না!
    echo   4. কেউ উইন্ডোজ থেকে প্রিন্টার রিজিউম করতে চাইলেও সিস্টেম সাথে সাথে
    echo      তা ব্লক ও বাতিল করে দেবে।
    echo   5. প্রিন্ট করার জন্য ওয়েবসাইটের ড্যাশবোর্ড থেকে অনুমোদিত টোকেন বা
    echo      ম্যানেজারের অনুমোদন নেওয়া বাধ্যতামূলক।
    echo ========================================================================
) else (
    echo [ERROR] Failed to register task. Please run this .bat as Administrator.
)

echo.
pause
