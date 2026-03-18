@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

:: ── Load .env.local ──────────────────────────────────────────────────────────
set CHROME_PATH=
if exist ".env.local" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
        set "line=%%A"
        if "!line:~0,11!"=="CHROME_PATH" set "CHROME_PATH=%%B"
    )
)

:: ── Check Node.js ────────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js (v18+) first.
    pause & exit /b 1
)

:: ── Install + Build (skip if already built) ──────────────────────────────────
if exist ".next\standalone\server.js" (
    echo [INFO] Existing build found, skipping install and build.
) else (
    echo [1/2] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 ( echo [ERROR] Dependency installation failed. & pause & exit /b 1 )

    echo [2/2] Building application...
    call npm run build
    if %errorlevel% neq 0 ( echo [ERROR] Build failed. & pause & exit /b 1 )
)

:: ── Start server in background ───────────────────────────────────────────────
echo.
echo [INFO] Starting server...
start /b cmd /c "npm run start > server.log 2>&1"

:: ── Wait until localhost:3000 is ready ───────────────────────────────────────
echo [INFO] Waiting for server to be ready...
:wait
timeout /t 1 /nobreak >nul
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 goto :wait

:: ── Open browser ─────────────────────────────────────────────────────────────
echo.
echo ==========================================
echo  Application is running
echo  http://localhost:3000
echo ==========================================
echo.

if not "!CHROME_PATH!"=="" (
    if exist "!CHROME_PATH!" (
        start "" "!CHROME_PATH!" http://localhost:3000
        goto :done
    )
)
:: Try chrome in PATH, fallback to default browser
where chrome >nul 2>&1
if %errorlevel% equ 0 (
    start "" chrome http://localhost:3000
) else (
    start http://localhost:3000
)

:done
echo [INFO] Server is running. Close this window to stop.
pause
