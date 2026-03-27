import { LogEntry } from "@/types";

/**
 * @fileoverview Log Data Formatter
 * @responsibility Defines HOW log lines are parsed, colorized, grouped, and rendered.
 *                 It does not drop data, only transforms strings into structural nodes.
 */

/**
 * Log Cleaning Engine
 * Optimizes complex CRM logs for AI analysis by removing noise and highlighting critical segments.
 */

// Critical keywords that indicate a high-signal log entry
const CRITICAL_KEYWORDS = [
  "TIMEOUT", "EXCEPTION", "ERROR", "FATAL", "FAILED", "FAIL", "REJECT", 
  "REFUSED", "ORA-", "SAP", "CONFLICT", "INVALID", "CRITICAL", "ABORT"
];

// Noise keywords that are usually redundant polling or heartbeat logs
const NOISE_KEYWORDS = [
  "POLLING", "HEARTBEAT", "KEEPALIVE", "CHECKING CONNECTION", "STATUS CHECK", 
  "HEALTH CHECK", "METRICS", "PING", "PONG"
];

/**
 * Masks variables in a log message to help identify duplicate templates.
 * E.g., "User 12345 logged in" -> "User {VAR} logged in"
 */
function maskVariables(message: string): string {
  if (!message) return "";
  
  return message
    // Mask hex IDs and UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "{UUID}")
    .replace(/0x[0-9a-f]+/gi, "{HEX}")
    // Mask long IDs (likely entity IDs)
    .replace(/\b\d{10,}\b/g, "{ID}")
    // Mask IP addresses
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "{IP}")
    // Mask ISO dates and times
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.,]\d{1,3}Z?/g, "{TIME}")
    // Mask purely numerical tokens
    .replace(/\b\d+\b/g, "{N}");
}

/**
 * Determines the priority level of a log entry.
 * L1: Error (Max)
 * L2: Critical Keyword (High)
 * L3: standard (Med)
 * L4: Noise/Heartbeat (Low)
 */
function getPriority(entry: LogEntry): number {
  const msg = (entry.message || "").toUpperCase();
  const level = (entry.level || "").toUpperCase();
  
  if (level === "ERROR" || level === "FATAL" || msg.includes("ERROR") || msg.includes("FAIL")) return 1;
  
  if (CRITICAL_KEYWORDS.some(k => msg.includes(k))) return 2;
  
  if (NOISE_KEYWORDS.some(k => msg.includes(k))) return 4;
  
  return 3;
}

/**
 * Deduplicates consecutive logs that have the same semantic signal.
 */
function deduplicateLogs(entries: LogEntry[]): { entry: LogEntry; count: number }[] {
  if (!entries.length) return [];
  
  const results: { entry: LogEntry; count: number }[] = [];
  let currentGroup: { entry: LogEntry; count: number } | null = null;
  let lastSignature = "";
  
  for (const entry of entries) {
    const masked = maskVariables(entry.message);
    const signature = `${entry.source}_${entry.level}_${masked}`;
    
    if (currentGroup && signature === lastSignature) {
      currentGroup.count++;
    } else {
      currentGroup = { entry, count: 1 };
      results.push(currentGroup);
      lastSignature = signature;
    }
  }
  
  return results;
}

/**
 * Processes a flat list of logs and returns a cleaned, prioritized context string for AI.
 * Each line is prefixed with its ORIGINAL absolute index [#N] for linkage with the frontend timeline.
 */
export function buildAILogContext(logs: LogEntry[]): string {
  if (!logs || logs.length === 0) return "（未获取到日志）";
  
  // 1. Initial deduplication
  const deduped = deduplicateLogs(logs);
  
  // 2. Identify windows of interest (L1 or L2 logs)
  const indicesToKeep = new Set<number>();
  const WINDOW_BEFORE = 10;
  const WINDOW_AFTER = 5;
  
  deduped.forEach((group, idx) => {
    const priority = getPriority(group.entry);
    if (priority <= 2) {
      // Keep this error/warning and its surrounding window
      for (let i = Math.max(0, idx - WINDOW_BEFORE); i <= Math.min(deduped.length - 1, idx + WINDOW_AFTER); i++) {
        indicesToKeep.add(i);
      }
    }
  });

  // 3. Assemble the context string
  const lines: string[] = [];
  let lastShownIndex = -1;
  let originalLogPointer = 0; // Tracks the 1-based original index

  deduped.forEach((group, i) => {
    // Each group covers one or more original logs. 
    // We'll use the 1-based index of the first log in this group as the anchor.
    const firstOriginalIdx = originalLogPointer + 1;
    const shouldShow = indicesToKeep.has(i) || getPriority(group.entry) <= 2;
    
    if (shouldShow) {
      if (lastShownIndex !== -1 && i > lastShownIndex + 1) {
        lines.push(`\n[... ${i - lastShownIndex - 1} 条无关/低信号日志已省略 ...]\n`);
      }
      
      const countSuffix = group.count > 1 ? ` (重复出现 ${group.count} 次)` : "";
      const sourcePrefix = `[${group.entry.sourceLabel || group.entry.source.toUpperCase()}]`;
      const indexPrefix = `[#${firstOriginalIdx}]`;
      
      lines.push(`${indexPrefix} ${sourcePrefix} [${group.entry.level}] ${group.entry.timestamp ? new Date(group.entry.timestamp).toLocaleTimeString() : ""} ${group.entry.message}${countSuffix}`);
      lastShownIndex = i;
    }
    originalLogPointer += group.count;
  });
  
  // If we have NO lines (no errors found), fall back to showing sampling
  if (lines.length === 0) {
    const format = (g: typeof deduped[0], startIdx: number) => {
      const sourcePrefix = `[${g.entry.sourceLabel || g.entry.source.toUpperCase()}]`;
      return `[#${startIdx + 1}] ${sourcePrefix} [${g.entry.level}] ${g.entry.message}${g.count > 1 ? ` (x${g.count})` : ""}`;
    };
    
    let runningPointer = 0;
    deduped.slice(0, 20).forEach((g) => {
      lines.push(format(g, runningPointer));
      runningPointer += g.count;
    });
    
    if (deduped.length > 40) {
      lines.push("\n[... 中间大部分标准日志已省略 ...]\n");
      // Fast forward pointer
      for (let j = 20; j < deduped.length - 20; j++) runningPointer += deduped[j].count;
    }
    
    deduped.slice(-20).forEach((g) => {
      lines.push(format(g, runningPointer));
      runningPointer += g.count;
    });
  }

  return lines.join("\n");
}
