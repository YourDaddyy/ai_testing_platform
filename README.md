# CRM AI Platform

An AI-powered log analysis tool for distributed CRM systems. Search logs across multiple servers by transaction ID, then get a full AI diagnosis of what went wrong.

## Teammate Setup

1. Unzip the distribution package
2. Copy `.env.example` → `.env.local` and fill in your `ANTHROPIC_API_KEY`
3. Double-click `scripts/runtime/start-app.bat` — Chrome opens automatically in ~5 seconds

> No build step needed. The package includes a pre-built server.

---

## Features

- **Multi-source log aggregation** — Fetch logs from BSSP, SAC, CMC, TE, BOP via SSH, all nodes searched in parallel
- **AI diagnosis** — Full end-to-end chain analysis using Claude; identifies bottlenecks, logic conflicts, and error nodes
- **GBK encoding support** — Log files decoded on the Node.js side via iconv-lite; no server-side conversion needed
- **Per-service grep patterns** — Each service type (BSSP, TE, etc.) uses its own search command defined in `serviceLogConfigs.ts`; shared across all environments automatically
- **File grouping** — Results grouped by source file in collapsible accordion view
- **Shared config** — Settings stored server-side in `config.json`; consistent across all browsers and team members on the same machine
- **Response formatting** — Auto-detects and pretty-prints JSON/XML payloads

## Quick Start (Development)

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
ANTHROPIC_API_KEY=your_key_here
CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

## Production (Windows)

**Start:**

```powershell
./scripts/runtime/start-app.bat
```

**Stop:**

```powershell
./scripts/runtime/stop.bat
```

**Package for distribution:**

```powershell
./scripts/build/pack.bat
```

## Production (Linux / Mac)

```bash
chmod +x scripts/runtime/start-app.sh
./scripts/runtime/start-app.sh
```

## Adding or Changing Log Search Patterns

Log paths and grep commands are defined per service type in `src/lib/serviceLogConfigs.ts`. Changes here apply to **all environments** (test, regression, etc.) automatically — no UI config needed.

```ts
// Example: change the TE grep pattern
te: {
  encoding: "gbk",
  grepTemplate: `find /bosslog1/applog/bm -maxdepth 2 -name "BM_TE_SERVICE*" | xargs -r grep -aH "{KEY}" | tail -2000`,
},
```

To add a new environment or server node, edit `src/lib/defaultEnvironments.ts` — only SSH connection info (host, port, username, password) belongs there.

## Project Structure

```text
src/            # Next.js pages, API routes, and logic
scripts/        # Management scripts
  runtime/      # Start/Stop app and docker
  build/        # Packaging and deployment
docker/         # Dockerfile, compose, and environment configs
public/         # Static assets
config.json     # Persisted environment & host configurations
```

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, Radix UI, Lucide React
- **State**: Zustand (server-side persistence via `config.json`)
- **AI**: Claude API (SSE streaming)
- **Backend**: Node.js, node-ssh, iconv-lite (GBK encoding support)
- **Editor**: Monaco Editor

---

Developed for UniDev CRM Log Analysis.
