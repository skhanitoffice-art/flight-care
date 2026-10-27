@echo off
cd /d "%~dp0"
title Flight Care - Android App Builder & Studio Launcher
color 0a
echo =====================================================================
echo           FLIGHT CARE - ANDROID APPLICATION BUILDER
echo                   Package: com.flightcare.app
echo =====================================================================
echo.

echo [1/3] Exporting Optimized Web Distribution (dist)...
call npx expo export -p web --output-dir dist
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web export failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Syncing Distribution Assets to Native Android Platform...
node node_modules\@capacitor\cli\bin\capacitor copy android
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Launching Android Studio for APK Generation...
echo.
set "STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe"
if exist "%STUDIO_PATH%" (
    echo Opening Flight Care in Android Studio...
    start "" "%STUDIO_PATH%" "%CD%\android"
    echo.
    echo =====================================================================
    echo [INSTRUCTIONS TO BUILD APK IN ANDROID STUDIO]:
    echo   1. Android Studio will open the "android" project.
    echo   2. Wait 10-20 seconds for Gradle to index.
    echo   3. Click top menu: "Build" -> "Build Bundle(s) / APK(s)" -> "Build APK(s)"
    echo   4. Once complete, click "locate" in the bottom-right popup to get your
    echo      installable "app-debug.apk" file!
    echo =====================================================================
) else (
    echo Android Studio not found at default location. Opening folder instead:
    explorer.exe "%CD%\android"
)

echo.
pause

