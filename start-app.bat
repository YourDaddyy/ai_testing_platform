@echo off
cd /d "%~dp0"

echo ==========================================
echo  CRM Platform Launcher
echo ==========================================

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    pause
    exit /b 1
)

if not exist ".next\standalone\server.js" (
    echo [1/2] Installing dependencies...
    call npm install
    echo [2/2] Building...
    call npm run build
    if %errorlevel% neq 0 ( echo [ERROR] Build failed. & pause & exit /b 1 )
    xcopy /e /i /y ".next\static" ".next\standalone\.next\static" >nul
)

echo [INFO] Starting server...
start "CRM Platform Server" /d "%~dp0" node .next\standalone\server.js

echo [INFO] Waiting for server...
:wait
ping -n 2 127.0.0.1 >nul
curl -s --max-time 2 http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 goto :wait

echo [INFO] Opening Chrome...
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" http://localhost:3000
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" http://localhost:3000
) else (
    start "" "http://localhost:3000"
)

echo [INFO] Done. Closing in 3 seconds...
timeout /t 3 /nobreak >nul
