#!/bin/bash

cd "$(dirname "$0")/.."
echo "[1/3] Checking environment..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js (v18+) first."
    exit 1
fi

echo "[2/3] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Dependency installation failed."
    exit 1
fi

echo "[3/3] Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Build failed."
    exit 1
fi

echo ""
echo "=========================================="
echo "[SUCCESS] Application is starting..."
echo "Access at: http://localhost:3000"
echo "=========================================="
echo ""

npm run start
