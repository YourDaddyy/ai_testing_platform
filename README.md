# AI Log Analysis Platform

An AI-powered log analysis tool designed for distributed microservice architectures. Search logs across multiple servers via SSH by transaction ID/Keywords, then get a full AI diagnosis of what happened across the entire request chain.

## 🚀 Features

- **Multi-source Log Aggregation** — Fetch logs from multiple distributed nodes (App, Database, API Gateway, Auth, etc.) via SSH in parallel.
- **Decoupled Search & Analysis** — Search logs first to preview your trace; trigger LLM analysis separately when ready.
- **High-value Log Purification** — Built-in heuristic noise filter that strips generic TRACE noise, deduplicates repeated payloads via content fingerprinting, and surfaces only meaningful signals (errors, SQL, XML/JSON payloads).
- **Realtime Filter Toggle** — Switch between purified and raw log views instantly without re-fetching over SSH.
- **AI Diagnosis** — Full end-to-end chain analysis using any OpenAI or Anthropic compatible API (Claude, GPT, DeepSeek, local LLMs); identifies bottlenecks, logic conflicts, and plots Mermaid diagrams.
- **Log Jump Links** — AI report references `[Log #N]` inline; click to auto-scroll and highlight the exact log entry in your viewport.
- **Customizable Execution Pipelines** — Each service type uses its own bash search command (e.g. `grep`, `find`) dynamically defined in the Configuration UI.
- **Legacy System Support** — Native GBK/UTF-8 encoding support. Log files are seamlessly decoded on the Node.js side via `iconv-lite`.
- **Remote Batch Control** — Execute operational commands or scripts across multiple registered hosts simultaneously.

## 🛠️ Quick Start

### Development
```bash
npm install
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000).

### Production
```bash
npm run build
npm start
```

## ⚙️ Configuration

- **Hosts & Services**: Add your server nodes, SSH credentials, and log paths directly in the Web UI (Settings -> Environments).
- **AI Integration**: Configure your LLM endpoint (API Key, Model Name, Base URL) in the Web UI. No hardcoded `.env` variables are needed.

*Note: All settings are safely stored server-side in a local `config.json` file to prevent frontend exposure.*

## 🗂️ Project Structure

```text
src/
  app/          # Next.js App Router (home, ai, config, remote-control)
  app/api/      # API Routes (proxy, ssh-exec, log-fetcher)
  components/   # Shared UI components (Tailwind + Radix)
  lib/          # Core utilities (Purification rules, Formatters)
  store/        # Zustand global state (Persisted via LocalStorage & config.json)
```

## 💻 Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, Radix UI, Zustand, Lucide
- **Backend**: Node.js, node-ssh, iconv-lite
- **AI Engine**: Standard OpenAI/Anthropic Messages REST API (SSE streaming support)

---
*Built to bring order, clarity, and AI-driven insights to distributed server logs.*
