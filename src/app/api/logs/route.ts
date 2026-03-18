import { NextRequest, NextResponse } from "next/server";
import { NodeSSH } from "node-ssh";
import iconv from "iconv-lite";
import { SERVICE_LOG_CONFIGS } from "@/lib/serviceLogConfigs";

interface HostConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  logPaths: string[];
  label?: string;
  encoding?: string;
  grepTemplate?: string;
}

function getHostConfigs(source: string, envHosts: Record<string, any>): HostConfig[] {
  const key = source.toLowerCase();
  const overrides = envHosts?.[key];
  if (!Array.isArray(overrides)) return [];

  const svc = SERVICE_LOG_CONFIGS[key];

  return overrides
    .filter(o => o.sshHost)
    .map(o => ({
      host: o.sshHost,
      port: Number(o.sshPort) || 22,
      username: o.sshUsername || "root",
      password: o.sshPassword || "",
      logPaths: svc?.logPaths ?? [],
      label: o.label,
      encoding: svc?.encoding ?? "utf8",
      grepTemplate: svc?.grepTemplate,
    }));
}

async function runGrep(ssh: NodeSSH, cmd: string, encoding: string): Promise<string[]> {
  const chunks: Buffer[] = [];
  try {
    await ssh.exec(cmd, [], { onStdout: (chunk: Buffer) => chunks.push(chunk) });
  } catch {
    const res = await ssh.execCommand(cmd);
    if (res.stdout) chunks.push(Buffer.from(res.stdout));
  }
  const text = iconv.decode(Buffer.concat(chunks), encoding);
  return text.split("\n").filter(Boolean);
}

async function sshGrep(cfg: HostConfig, queryKey: string): Promise<string[]> {
  const ssh = new NodeSSH();
  if (!cfg.host) return [];

  await ssh.connect({
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    password: cfg.password,
    readyTimeout: 10000,
    hostVerifier: () => true,
  });

  const encoding = cfg.encoding?.toLowerCase() === "gbk" ? "gbk" : "utf8";
  const escaped = queryKey.replace(/"/g, '\\"');

  try {
    // Custom command takes priority
    if (cfg.grepTemplate) {
      const cmd = cfg.grepTemplate.replace("{KEY}", escaped);
      return await runGrep(ssh, cmd, encoding);
    }

    const lines: string[] = [];

    for (const logPath of cfg.logPaths) {
      let cmd = "";

      if (logPath.includes("*")) {
        cmd = `grep -aH "${escaped}" ${logPath} 2>/dev/null | tail -2000`;
      } else {
        const check = await ssh.execCommand(
          `if [ -d "${logPath}" ]; then echo dir; elif [ -f "${logPath}" ]; then echo file; else echo none; fi`,
          { execOptions: { pty: false } }
        );
        const type = check.stdout.trim();
        if (type === "none") continue;
        if (type === "dir") {
          cmd = `find "${logPath}" -maxdepth 1 -type f 2>/dev/null | xargs -r grep -aH "${escaped}" 2>/dev/null | tail -2000`;
        } else {
          cmd = `grep -aH "${escaped}" "${logPath}" 2>/dev/null | tail -2000`;
        }
      }

      lines.push(...await runGrep(ssh, cmd, encoding));
    }

    return lines;
  } finally {
    ssh.dispose();
  }
}

export interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  sourceLabel: string;
  hostLabel?: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
  raw: string;
  fileName?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  bssp: "BSSP",
  sac: "SAC",
  cmc: "CMC",
  te: "TE",
  bop: "BOP",
};

const LOG_PATTERN = /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.,]\d{1,3})[\s\[\]]+(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)[\s\]]+(.+)/i;
// TE text log: "PID: 1261824 TIME: 2026/03/18 13:42:44.961.780 LEVEL: 4 MSG: ..."
const TE_LOG_PATTERN = /TIME:\s*(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)\.\d+\s+LEVEL:\s*(\d+)\s+MSG:\s*([\s\S]+)/i;

function parseTETimestamp(ts: string): string {
  const m = ts.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\.(\d+)/);
  if (!m) return new Date().toISOString();
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.${m[7].substring(0, 3)}`).toISOString();
}

function parseTELevel(level: string): "INFO" | "WARN" | "ERROR" | "DEBUG" {
  const n = parseInt(level);
  if (n <= 2) return "ERROR";
  if (n === 3) return "WARN";
  if (n >= 5) return "DEBUG";
  return "INFO";
}

function parseLine(raw: string, source: string, hostLabel: string | undefined, idx: number, fileName?: string): LogEntry {
  if (source === "te") {
    const teM = raw.match(TE_LOG_PATTERN);
    if (teM) {
      return {
        id: `${source}_${hostLabel || "node"}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: parseTETimestamp(teM[1]),
        source,
        sourceLabel: SOURCE_LABELS[source] || source.toUpperCase(),
        hostLabel,
        level: parseTELevel(teM[2]),
        message: teM[3].trim(),
        raw,
        fileName,
      };
    }
  }
  const m = raw.match(LOG_PATTERN);
  return {
    id: `${source}_${hostLabel || "node"}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: m?.[1] ? new Date(m[1].replace(",", ".")).toISOString() : new Date().toISOString(),
    source,
    sourceLabel: SOURCE_LABELS[source] || source.toUpperCase(),
    hostLabel,
    level: normalizeLevel(m?.[2]),
    message: m?.[3]?.trim() ?? raw.trim(),
    raw,
    fileName,
  };
}

function normalizeLevel(level?: string): "INFO" | "WARN" | "ERROR" | "DEBUG" {
  if (!level) return "INFO";
  const l = level.toUpperCase();
  if (l === "FATAL" || l === "ERROR" || l === "ERR") return "ERROR";
  if (l === "WARN" || l === "WARNING") return "WARN";
  if (l === "DEBUG" || l === "TRACE") return "DEBUG";
  return "INFO";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { queryKey, sources = [], hosts = {} } = body;

    if (!queryKey || sources.length === 0) {
      return NextResponse.json({ error: "queryKey and sources are required" }, { status: 400 });
    }

    const results: LogEntry[] = [];
    const errors: string[] = [];

    const queryPromises = sources.flatMap((source: string) => {
      const configs = getHostConfigs(source, hosts);
      if (!configs.length) {
        errors.push(`未配置来源: ${source}`);
        return [];
      }
      return configs.map(async (cfg) => {
        try {
          const rawLines = await sshGrep(cfg, queryKey);
          if (!rawLines.length) {
            errors.push(`${SOURCE_LABELS[source] || source} [${cfg.label || cfg.host}]: 暂无匹配到流水号的日志`);
            return;
          }
          rawLines.forEach((raw, i) => {
            let fileName = "unknown";
            let content = raw;
            const colon = raw.indexOf(":");
            if (colon > 0) {
              const pre = raw.substring(0, colon);
              if (pre.includes("/") || pre.includes(".")) {
                fileName = pre.split("/").pop() || pre;
                content = raw.substring(colon + 1);
              }
            }
            results.push(parseLine(content, source, cfg.label, i, fileName));
          });
        } catch (err: any) {
          errors.push(`${SOURCE_LABELS[source] || source} [${cfg.label || cfg.host}]: 连接失败 — ${err.message}`);
        }
      });
    });

    await Promise.allSettled(queryPromises);

    const sorted = results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return NextResponse.json({ logs: sorted, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
