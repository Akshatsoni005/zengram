@echo off
title ZenGram - Distraction Free Instagram
echo ========================================================
echo   ZenGram: Distraction-Free Instagram for Aspirants
echo   (No Feed ^| No Endless Reels ^| Direct DMs ^& Saved Posts)
echo ========================================================
echo.

cd /d "%~dp0"

where electron >nul 2>nul
if %errorlevel% == 0 (
    echo Launching with Global Electron...
    start electron desktop\main.js
    goto done
)

if exist "desktop\node_modules\.bin\electron.cmd" (
    echo Launching with Local Electron...
    start desktop\node_modules\.bin\electron.cmd desktop\main.js
    goto done
)

where node >nul 2>nul
if %errorlevel% == 0 (
    echo Launching via Node CLI runner...
    node bin\zengram.js
    goto done
)

echo Launching native Windows standalone app mode (Microsoft Edge)...
start msedge --app=https://www.instagram.com/direct/inbox/ --window-size=1100,800

:done
exit /b 0
