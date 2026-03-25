import { describe, it, expect } from "vitest";

// Self-contained copy of the log line parsing logic
// Mirrors src/app/api/logs/route.ts — keep in sync when updating the parser.

const LOG_PATTERN =
  /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.,]\d{1,3})[\s\[\]]+(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)[\s\]]+(.+)/i;

const TE_LOG_PATTERN =
  /TIME:\s*(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)\.\d+\s+LEVEL:\s*(\d+)\s+MSG:\s*([\s\S]+)/i;

function normalizeLevel(level?: string): "INFO" | "WARN" | "ERROR" | "DEBUG" {
  if (!level) return "INFO";
  const l = level.toUpperCase();
  if (l === "FATAL" || l === "ERROR" || l === "ERR") return "ERROR";
  if (l === "WARN" || l === "WARNING") return "WARN";
  if (l === "DEBUG" || l === "TRACE") return "DEBUG";
  return "INFO";
}

function parseTELevel(level: string): "INFO" | "WARN" | "ERROR" | "DEBUG" {
  const n = parseInt(level);
  if (n <= 2) return "ERROR";
  if (n === 3) return "WARN";
  if (n >= 5) return "DEBUG";
  return "INFO";
}

function parseLine(raw: string, source: string, sourceLabel: string) {
  if (source === "te") {
    const teM = raw.match(TE_LOG_PATTERN);
    if (teM) {
      return {
        source,
        sourceLabel,
        level: parseTELevel(teM[2]),
        message: teM[3].trim(),
        raw,
      };
    }
  }
  const m = raw.match(LOG_PATTERN);
  return {
    source,
    sourceLabel,
    level: normalizeLevel(m?.[2]),
    message: m?.[3]?.trim() ?? raw.trim(),
    raw,
  };
}

describe("logProcessor — standard log parsing", () => {
  it("parses a standard INFO log line", () => {
    const raw = "2024-03-16 10:00:01.123 INFO [CS_NGModify] Request received";
    const result = parseLine(raw, "bssp", "BSSP");
    expect(result.level).toBe("INFO");
    expect(result.source).toBe("bssp");
    expect(result.sourceLabel).toBe("BSSP");
  });

  it("parses an ERROR log line", () => {
    const raw = "2024-03-16 10:00:02.800 ERROR CMC response error: ORA-00001";
    const result = parseLine(raw, "bssp", "BSSP");
    expect(result.level).toBe("ERROR");
    expect(result.message).toContain("ORA-00001");
  });

  it("maps TRACE to DEBUG", () => {
    const raw = "2024-03-16 10:00:01.123 TRACE Some trace log";
    const result = parseLine(raw, "bssp", "BSSP");
    expect(result.level).toBe("DEBUG");
  });

  it("handles malformed log lines gracefully", () => {
    const raw = "this is not a log line at all";
    const result = parseLine(raw, "bssp", "BSSP");
    expect(result.raw).toBe(raw);
    expect(result.level).toBe("INFO");
  });

  it("maps FATAL to ERROR", () => {
    const raw = "2024-03-16 10:00:02.100 FATAL system crash";
    const result = parseLine(raw, "sac", "SAC");
    expect(result.level).toBe("ERROR");
  });
});

describe("logProcessor — TE-format log parsing", () => {
  it("parses TE WARN log (LEVEL 3)", () => {
    const raw = "PID: 1261824 TIME: 2026/03/18 13:42:44.961.780 LEVEL: 3 MSG: Connection refused";
    const result = parseLine(raw, "te", "TE");
    expect(result.level).toBe("WARN");
    expect(result.message).toBe("Connection refused");
  });

  it("parses TE ERROR log (LEVEL ≤ 2)", () => {
    const raw = "PID: 1 TIME: 2026/03/18 13:42:44.961.780 LEVEL: 1 MSG: Fatal failure";
    const result = parseLine(raw, "te", "TE");
    expect(result.level).toBe("ERROR");
  });

  it("parses TE DEBUG log (LEVEL ≥ 5)", () => {
    const raw = "PID: 100 TIME: 2026/03/18 13:42:44.961.780 LEVEL: 5 MSG: Verbose trace";
    const result = parseLine(raw, "te", "TE");
    expect(result.level).toBe("DEBUG");
  });
});
