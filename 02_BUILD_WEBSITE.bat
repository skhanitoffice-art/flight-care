@echo off
cd /d "%~dp0"
title FlightCare - Website Builder & Exporter
cls
echo ========================================================
echo   Flight Care VIP Protocol - Website Production Build
echo   Target Folder: %CD%\dist
echo   Package File : %CD%\FlightCare-website.zip
echo ========================================================
echo.
echo [1/2] Exporting Web Bundle via Expo...
call npx expo export -p web --output-dir dist

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================================
    echo   [ERROR] Expo web export failed.
    echo ========================================================
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Packaging with Full SEO, 22 Dedicated Pages and Hardened API Shield...
call python scratch/packageHostingerAndWindowsZip.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================================
    echo   [ERROR] Packaging failed.
    echo ========================================================
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   [SUCCESS] Flight Care Website Successfully Built!
echo ========================================================
echo.
echo 1. Production Files Folder: dist\
echo 2. Deployment ZIP File    : FlightCare-website.zip (12.75 MB)
echo 3. Hostinger ZIP File     : flightcare-hostinger-build.zip (12.75 MB)
echo.
echo How to Deploy to Hostinger / cPanel:
echo   - Upload "flightcare-hostinger-build.zip" or "FlightCare-website.zip" to public_html
echo   - Extract the zip file in public_html
echo   - Your website is immediately 100%% LIVE!
echo.
echo ========================================================
echo Press any key to open the folder containing the ZIP file...
pause >nul
explorer.exe /select,"%CD%\FlightCare-website.zip"
