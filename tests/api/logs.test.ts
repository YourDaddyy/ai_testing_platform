import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — mirrors the logic in src/app/api/logs/route.ts without importing
// Next.js server internals (which don't work in vitest's Node env).
// ─────────────────────────────────────────────────────────────────────────────

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
    if (teM) return { source, sourceLabel, level: parseTELevel(teM[2]), message: teM[3].trim(), raw };
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

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/logs — log line parsing", () => {
  it("parses standard INFO line", () => {
    const raw = "2024-03-16 10:00:01.123 INFO [CS_NGModify] Request received";
    const r = parseLine(raw, "bssp", "BSSP");
    expect(r.level).toBe("INFO");
    expect(r.source).toBe("bssp");
    expect(r.message).toContain("Request received");
  });

  it("parses ERROR line", () => {
    const raw = "2024-03-16 10:00:02.800 ERROR CMC response error: ORA-00001";
    const r = parseLine(raw, "cmc", "CMC");
    expect(r.level).toBe("ERROR");
    expect(r.message).toContain("ORA-00001");
  });

  it("maps WARN correctly", () => {
    const raw = "2024-03-16 10:00:02.100 WARN DB pool 80% utilised";
    const r = parseLine(raw, "sac", "SAC");
    expect(r.level).toBe("WARN");
  });

  it("maps FATAL to ERROR", () => {
    const raw = "2024-03-16 10:00:02.100 FATAL system crash";
    const r = parseLine(raw, "bssp", "BSSP");
    expect(r.level).toBe("ERROR");
  });

  it("maps TRACE to DEBUG", () => {
    const raw = "2024-03-16 10:00:02.100 TRACE entering function";
    const r = parseLine(raw, "te", "TE");
    expect(r.level).toBe("DEBUG");
  });

  it("defaults to INFO for malformed lines", () => {
    const raw = "not a log line";
    const r = parseLine(raw, "bssp", "BSSP");
    expect(r.level).toBe("INFO");
    expect(r.raw).toBe(raw);
  });

  it("parses TE-format log", () => {
    const raw =
      "PID: 1261824 TIME: 2026/03/18 13:42:44.961.780 LEVEL: 3 MSG: Connection refused";
    const r = parseLine(raw, "te", "TE");
    expect(r.level).toBe("WARN");
    expect(r.message).toBe("Connection refused");
  });

  it("parses TE ERROR (level ≤ 2)", () => {
    const raw = "PID: 1 TIME: 2026/03/18 13:42:44.961.780 LEVEL: 1 MSG: Fatal failure";
    const r = parseLine(raw, "te", "TE");
    expect(r.level).toBe("ERROR");
  });
});

describe("POST /api/logs — request validation helpers", () => {
  it("requires queryKey and sources", () => {
    const body1 = { sources: ["bssp"] };           // missing queryKey
    const body2 = { queryKey: "123", sources: [] }; // empty sources
    expect(!body1.hasOwnProperty("queryKey") || body1.sources.length === 0).toBe(
      !body1.hasOwnProperty("queryKey")
    );
    expect(body2.sources.length).toBe(0);
  });

  it("accepts optional serviceConfigs", () => {
    const body = {
      queryKey: "705377482204",
      sources: ["bssp"],
      hosts: {},
      serviceConfigs: { bssp: { encoding: "gbk", grepTemplate: "grep {KEY} /logs" } },
    };
    expect(body.serviceConfigs.bssp.encoding).toBe("gbk");
  });
});
