@echo off
echo ===================================================
echo   Flight Care - Quasar / Capacitor Android Builder
echo ===================================================
echo.

echo [1/4] Building Web Application Distribution (dist)...
call npx expo export -p web --output-dir dist
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build export failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [2/4] Syncing Web Assets to Android Platform...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [NOTE] Capacitor CLI sync completed or needs installation (npm install @capacitor/cli @capacitor/core @capacitor/android).
)

echo.
echo [3/4] Ready to Compile Android APK!
echo You can run 'npx cap open android' to open in Android Studio and build the APK,
echo or run 'cd android && gradlew assembleDebug' for direct APK compilation.
echo.
echo [4/4] Completed!
pause

