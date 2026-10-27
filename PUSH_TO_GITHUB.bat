@echo off
title Flight Care - Push to GitHub (skhanitoffice-art)
color 0b
echo =====================================================================
echo       FLIGHT CARE - PUSH TO GITHUB (skhanitoffice-art)
echo =====================================================================
echo.
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%LOCALAPPDATA%\Programs\Git\mingw64\bin;%PATH%"

echo [1/3] Checking Git Status...
git status -s
echo.

echo [2/3] Verifying Remote Repository URL...
git remote -v
echo.

echo [3/3] Pushing main branch to https://github.com/skhanitoffice-art/flight-care...
echo (If a browser window opens, please click 'Sign in with your browser' / 'Authorize')
echo.
git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo =====================================================================
    echo [SUCCESS] Code successfully pushed to GitHub under skhanitoffice-art!
    echo =====================================================================
) else (
    echo =====================================================================
    echo [NOTICE] If authentication failed or requested a token, please use a
    echo GitHub Personal Access Token or sign in via browser.
    echo =====================================================================
)
echo.
pause

