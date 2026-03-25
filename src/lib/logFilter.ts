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
  index?: number;
}

export function filterHighValueLogs(logs: LogEntry[]): LogEntry[] {
  // Regex patterns for high-value detection
  const sqlPattern = /(select\s+.*?\s+from|insert\s+into|update\s+.*?\s+set|delete\s+from|call\s+.*?\()/i;
  const payloadPattern = /(<\?xml|\{"|request(:|\s+body)|response(:|\s+body)|recv msg|send msg|endpoint|uri:|url:|"req"|"resp")/i;
  const errorPattern = /(exception|timeout|error|failed|rejected|异常|错误|失败|\s+at\s+[\w\.]+\(|caused by:|trace:)/i;
  // Common specific markers in traditional Java logs (Spring, Tomcat, TongWeb)
  const tracingPattern = /(\[DispatcherServlet\]|Mapped to|Controller|Handler|Service|SQL:)/i;

  const seenFingerprints = new Set<string>();

  return logs.filter((log) => {
    // Rule 1: Always keep ERROR or WARN logs unconditionally
    if (log.level === "ERROR" || log.level === "WARN") return true;

    // Decorative noise filtering (run before positive matching)
    if (/(=====|解析交易报文开始|交易报文解析结束)/.test(log.raw)) return false;

    // Rule 2: Exception/Stack trace strings
    if (errorPattern.test(log.raw)) return true;

    let matched = false;
    let fingerprint = "";

    // Rule 3 & 4: SQL Statements & Payloads
    // Extract the core string ignoring timestamp/thread prefix
    const sqlMatch = log.raw.match(sqlPattern);
    const xmlJsonMatch = log.raw.match(/(<\?xml.*|\{.*\})/i);

    if (sqlMatch) {
      matched = true;
      // Use everything from the SQL keyword onwards as the fingerprint, stripping whitespaces
      fingerprint = log.raw.substring(log.raw.indexOf(sqlMatch[0])).replace(/\s+/g, "").replace(/['"\?:]/g, "");
    } else if (xmlJsonMatch) {
      matched = true;
      // Use the raw object/xml string as fingerprint
      fingerprint = xmlJsonMatch[0].replace(/\s+/g, "");
    } else if (payloadPattern.test(log.raw)) {
      matched = true;
      // Just fallback to right half of the line
      fingerprint = log.raw.substring(log.raw.length / 2).replace(/\s+/g, "");
    } else if (tracingPattern.test(log.raw)) {
      matched = true;
    }

    if (!matched) return false;

    // Deduplication check
    if (fingerprint) {
      if (seenFingerprints.has(fingerprint)) {
        return false; // Skip exact duplicate payload/SQL
      }
      seenFingerprints.add(fingerprint);
    }

    return true;
  });
}
