# One-Click Start with Env Config Plan

## Goal
- `.env.example` — safe template to commit, shows all keys with placeholder values
- `.env.local` — real secrets, gitignored (already is)
- `start-app.sh` / `start-app.bat` — reads CHROME_PATH from .env.local, auto-opens browser

---

## Changes

### 1. Add CHROME_PATH to `.env.local`
```env
# Launcher
CHROME_PATH=
# Windows example: C:\Program Files\Google\Chrome\Application\chrome.exe
# Mac example:     /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
# Leave empty to use system default browser
```

### 2. Create `.env.example` (safe to commit)
Same structure as `.env.local` but ALL values replaced with placeholders:
- Passwords → `your_password_here`
- API keys → `your_api_key_here`
- IPs → `your_host_ip`
- CHROME_PATH → empty with comment

### 3. Update `start-app.bat` (Windows)
Logic:
1. Load .env.local — parse CHROME_PATH
2. Check if `.next/standalone/server.js` exists → skip build (fast path)
3. Start `npm run start` in background (`start /b`)
4. Poll `localhost:3000` with `curl` in a loop (1s intervals)
5. Launch browser:
   - If CHROME_PATH set → use it
   - Else try `chrome` in PATH
   - Else fallback to `start http://localhost:3000` (default browser)
6. Keep window open (`pause` so server doesn't die)

### 4. Update `start-app.sh` (Linux/Mac)
Logic:
1. Load .env.local with `set -a; source .env.local; set +a`
2. Check if `.next/standalone/server.js` exists → skip build
3. Start `npm run start &`, capture PID
4. Poll `localhost:3000` with `curl -s` loop
5. Launch browser:
   - If CHROME_PATH set → use it
   - Mac: `open -a "Google Chrome"` → fallback `open`
   - Linux: `google-chrome` → `chromium` → `xdg-open`
6. `wait $SERVER_PID` keeps terminal alive

---

## Checklist
- [ ] Add CHROME_PATH to .env.local
- [ ] Create .env.example with all placeholders (scrub real values)
- [ ] Update start-app.bat
- [ ] Update start-app.sh
