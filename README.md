# CRM AI Platform

An AI-powered log analysis tool for distributed CRM systems. Search logs across multiple servers by transaction ID, then get a full AI diagnosis of what happened across the full request chain.

## Teammate Setup

1. Unzip the distribution package
2. Copy `.env.example` → `.env.local` (no API keys needed in `.env` — configure in the UI)
3. Double-click `scripts/runtime/start-app.bat` — Chrome opens automatically in ~5 seconds

> No build step needed. The package includes a pre-built server.

---

## Features

- **Multi-source log aggregation** — Fetch logs from BSSP, SAC, CMC, TE, BOP via SSH in parallel
- **Decoupled search & analysis** — Search logs first to preview; trigger AI analysis separately when ready
- **High-value log purification** — Built-in noise filter that strips DEBUG/TRACE noise, deduplicates repeated payloads via content fingerprinting, and surfaces only meaningful signals (errors, SQL, XML/JSON payloads, key request/response lines)
- **Realtime filter toggle** — Switch between purified and raw log views instantly without re-fetching
- **AI diagnosis** — Full end-to-end chain analysis using any OpenAI-compatible API (GLM, Claude, GPT, etc.); identifies bottlenecks, logic conflicts, and error nodes with log references
- **Log jump links** — AI report references `[Log #N]` inline; click to scroll and highlight the exact log entry
- **GBK encoding support** — Log files decoded on the Node.js side via `iconv-lite`; no server-side conversion needed
- **Per-service grep patterns** — Each service type uses its own search command defined in the Config UI
- **Shared config** — Settings stored server-side in `config.json`; consistent across all browsers on the same machine
- **Response formatting** — Auto-detects and pretty-prints JSON/XML payloads
- **Remote batch control** — Execute commands across multiple hosts simultaneously

## Quick Start (Development)

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## AI Configuration

AI settings (API Key, Model, Base URL) are configured **in the UI** under the Config → AI tab. No environment variables needed. Supports any OpenAI-compatible endpoint.

## Environment Variables

Copy `.env.example` to `.env.local`. The only required variable is:

```env
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

Log paths and grep commands are configured per service type in the **Config UI** under the service types section. Each service type stores its own `grepTemplate` and `encoding`. Changes apply to all environments automatically.

To add a new environment or server node, use the Config UI to add hosts and assign them to an environment.

## Project Structure

```text
src/
  app/          # Next.js pages (home, ai, config, logs, remote-control)
  app/api/      # API routes (ai, config, logs, proxy, remote-exec)
  components/   # Shared UI components
  lib/          # Utilities (logFilter, logProcessor, i18n, etc.)
  store/        # Zustand stores (ai, config, http, log)
scripts/
  runtime/      # Start/Stop scripts
  build/        # Packaging and deployment
docker/         # Dockerfile, compose, and environment configs
data/           # Merged host configs (generated)
config.json     # Persisted environment & host configurations
```

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, Radix UI, Lucide React
- **State**: Zustand (with localStorage persistence)
- **AI**: Any OpenAI-compatible API (SSE streaming)
- **Backend**: Node.js, node-ssh, iconv-lite (GBK encoding support)

---

Developed for UniDev CRM Log Analysis.
