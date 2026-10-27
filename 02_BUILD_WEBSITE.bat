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
echo [1/3] Building & Exporting Complete Website...
echo.

node scratch/buildAndExport.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================================
    echo   [ERROR] Website build failed. Please check the logs above.
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
echo 2. Deployment ZIP File    : FlightCare-website.zip
echo.
echo How to Deploy to Hostinger / cPanel:
echo   - Upload "FlightCare-website.zip" to public_html
echo   - Extract the zip file in public_html
echo   - Your website is immediately 100%% LIVE!
echo.
echo ========================================================
echo Press any key to open the folder containing the ZIP file...
pause >nul
explorer.exe /select,"%CD%\FlightCare-website.zip"

