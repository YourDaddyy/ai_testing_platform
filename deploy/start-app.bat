@echo off
setlocal enabledelayedexpansion

cd ..
echo [1/3] Checking environment...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js (v18+) first.
    pause
    exit /b 1
)

echo [2/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
)

echo [3/3] Building application...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo [SUCCESS] Application is starting...
echo Access at: http://localhost:3000
echo ==========================================
echo.

call npm run start
pause
