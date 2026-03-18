#!/bin/bash
set -e
cd "$(dirname "$0")"

# ── Load .env.local ────────────────────────────────────────────────────────────
CHROME_PATH=""
if [ -f ".env.local" ]; then
    set -a; source .env.local; set +a
fi

# ── Check Node.js ──────────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js (v18+) first."
    exit 1
fi

# ── Install + Build (skip if already built) ────────────────────────────────────
if [ -f ".next/standalone/server.js" ]; then
    echo "[INFO] Existing build found, skipping install and build."
else
    echo "[1/2] Installing dependencies..."
    npm install

    echo "[2/2] Building application..."
    npm run build

    echo "[INFO] Copying static assets to standalone..."
    cp -r .next/static .next/standalone/.next/static
    [ -d public ] && cp -r public .next/standalone/public
fi

# ── Start server in background ─────────────────────────────────────────────────
echo ""
echo "[INFO] Starting server..."
node .next/standalone/server.js &
SERVER_PID=$!

# ── Wait until localhost:3000 is ready ─────────────────────────────────────────
echo "[INFO] Waiting for server to be ready..."
until curl -s http://localhost:3000 > /dev/null 2>&1; do
    sleep 1
done

# ── Open browser ───────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo " Application is running"
echo " http://localhost:3000"
echo "=========================================="
echo ""

open_browser() {
    local url="$1"

    # Use CHROME_PATH from .env.local if set and exists
    if [ -n "$CHROME_PATH" ] && [ -f "$CHROME_PATH" ]; then
        "$CHROME_PATH" "$url" &
        return
    fi

    # Mac
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a "Google Chrome" "$url" 2>/dev/null || open "$url"
        return
    fi

    # Linux
    for cmd in google-chrome chromium-browser chromium xdg-open; do
        if command -v "$cmd" &> /dev/null; then
            "$cmd" "$url" &
            return
        fi
    done

    echo "[INFO] Could not detect browser. Open manually: $url"
}

open_browser "http://localhost:3000"

echo "[INFO] Server is running (PID $SERVER_PID). Press Ctrl+C to stop."
wait $SERVER_PID
