import { NextRequest, NextResponse } from "next/server";
import { NodeSSH } from "node-ssh";
import iconv from "iconv-lite";

interface HostConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  logPaths: string[];
  label?: string;
  encoding?: string;
}

function getHostConfigs(source: string, envHosts: Record<string, any>): HostConfig[] {
  const key = source.toLowerCase();
  const overrides = envHosts?.[key];

  if (Array.isArray(overrides)) {
    return overrides
      .filter(o => o.sshHost) // skip nodes with no SSH host
      .map(o => ({
        host: o.sshHost,
        port: Number(o.sshPort) || 22,          // handle both string & number
        username: o.sshUsername || "root",
        password: o.sshPassword || "",
        logPaths: (o.sshLogPaths || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => s && s !== "~" && s !== ""), // skip '~' and empty
        label: o.label,
        encoding: o.encoding,
      }));
  }

  return [];
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

  try {
    const lines: string[] = [];
    const escaped = queryKey.replace(/"/g, '\\"');

    if (cfg.logPaths.length === 0) {
      // Auto-discover: find files in common directories that contain the key
      const findCmd = `grep -rl "${escaped}" /bosslog1 /home /opt /var/log 2>/dev/null | head -5`;
      const found = await ssh.execCommand(findCmd, { execOptions: { pty: false } });
      if (found.stdout.trim()) {
        cfg.logPaths = found.stdout.trim().split("\n").filter(Boolean);
      }
    }

    for (const logPath of cfg.logPaths) {
      let grepCmd = "";

      if (logPath.includes("*")) {
        // Wildcard path – expand directly with shell glob
        grepCmd = `grep -h "${escaped}" ${logPath} 2>/dev/null | tail -500`;
      } else {
        // Check path type
        const check = await ssh.execCommand(
          `if [ -d "${logPath}" ]; then echo dir; elif [ -f "${logPath}" ]; then echo file; else echo none; fi`,
          { execOptions: { pty: false } }
        );
        const pathType = check.stdout.trim();
        if (pathType === "none") continue;

        if (pathType === "dir") {
          // 容错与稳定性优先：先恢复到一个兼容性更好的搜索命令。
          // 增加到 2880 分钟（48小时）覆盖范围，使用 find 代替 ls 避免大文件列表排序。
          grepCmd = `find "${logPath}" -maxdepth 1 -type f -mmin -2880 2>/dev/null | xargs grep -H "${escaped}" 2>/dev/null | tail -500`;
        } else {
          // 单个文件模式也加上 -H，统一返回格式
          grepCmd = `grep -H "${escaped}" "${logPath}" 2>/dev/null | tail -500`;
        }
      }

      if (!grepCmd) continue;

      // Execute grep and capture raw buffer to handle GBK correctly
      const chunks: Buffer[] = [];
      try {
        await ssh.exec(grepCmd, [], {
          onStdout: (chunk: Buffer) => chunks.push(chunk),
        });
      } catch (execErr) {
        console.warn(`Grep failed on ${cfg.host}:`, execErr);
        // Fallback to execCommand if exec fails
        const res = await ssh.execCommand(grepCmd);
        if (res.stdout) chunks.push(Buffer.from(res.stdout));
      }

      const finalBuffer = Buffer.concat(chunks);
      const encoding = cfg.encoding?.toLowerCase() === 'gbk' ? 'gbk' : 'utf8';
      const stdOutStr = iconv.decode(finalBuffer, encoding);
      
      const foundLines = stdOutStr.split("\n").filter(Boolean);
      if (foundLines.length > 0) {
        lines.push(...foundLines);
      }
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

function parseLine(raw: string, source: string, hostLabel: string | undefined, idx: number, fileName?: string): LogEntry {
  const m = raw.match(LOG_PATTERN);
  const level = normalizeLevel(m?.[2]);
  const message = m?.[3]?.trim() ?? raw.trim();
  const timestamp = m?.[1]
    ? new Date(m[1].replace(",", ".")).toISOString()
    : new Date().toISOString();

  return {
    id: `${source}_${hostLabel || "node"}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp,
    source,
    sourceLabel: SOURCE_LABELS[source] || source.toUpperCase(),
    hostLabel,
    level,
    message,
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

      if (!configs || configs.length === 0) {
        errors.push(`未配置来源: ${source}`);
        return [];
      }

      return configs.map(async (cfg) => {
        try {
          const rawLines = await sshGrep(cfg, queryKey);
          if (rawLines.length > 0) {
            results.push(...rawLines.map((raw, i) => {
              // Parse "filename:content" from grep output
              let fileName = "unknown";
              let content = raw;
              
              const firstColon = raw.indexOf(':');
              if (firstColon > 0) {
                const potentialFile = raw.substring(0, firstColon);
                // Heuristic: paths usually contain / or . for extensions
                if (potentialFile.includes('/') || potentialFile.includes('.')) {
                  fileName = potentialFile.split('/').pop() || potentialFile;
                  content = raw.substring(firstColon + 1);
                }
              }
              return parseLine(content, source, cfg.label, i, fileName);
            }));
          } else {
            errors.push(`${SOURCE_LABELS[source] || source} [${cfg.label || cfg.host}]: 暂无匹配到流水号的日志`);
          }
        } catch (err: any) {
          errors.push(`${SOURCE_LABELS[source] || source} [${cfg.label || cfg.host}]: 连接失败 — ${err.message}`);
        }
      });
    });

    await Promise.allSettled(queryPromises);

    const sorted = results.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return NextResponse.json({ logs: sorted, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
