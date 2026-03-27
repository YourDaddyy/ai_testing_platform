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

/**
 * @fileoverview Log Data Purifier
 * @responsibility Determines WHICH log lines are valuable and retained. Filters out noise, 
 *                 deduplicates repeated payloads, and slices log boundaries.
 */

export function filterHighValueLogs(logs: LogEntry[]): LogEntry[] {
  // Regex patterns for high-value detection
  const sqlPattern = /(select\s+.*?\s+from|insert\s+into|update\s+.*?\s+set|delete\s+from|call\s+.*?\()/i;
  const payloadPattern = /(<\?xml|\{"|request(:|\s+body)|response(:|\s+body)|recv msg|send msg|endpoint|uri:|url:|"req"|"resp")/i;
  const errorPattern = /(exception|timeout|error|failed|rejected|异常|错误|失败|\s+at\s+[\w\.]+\(|caused by:|\btrace:)/i; // Use \b to avoid matching the TRACE log level prefix
  // Common specific markers in traditional Java logs (Spring, Tomcat, TongWeb)
  const tracingPattern = /(\[DispatcherServlet\]|Mapped to|Controller|Handler|Service|SQL:)/i;

  // Framework internal noise blacklist (BSSP/SAC/CRT specific execution traces)
  const frameworkInternalBlacklist = [
    "getVariable",
    "ReleaseSem",
    "dequeue",
    "getTableMeta",
    "SetRunInfo",
    "Select Completed",
    "eval from",
    "eval withfrom",
    "AssignElement",
    "BodyElement",
    "InvokeElement",
    "Session::",
    "ProcInfoMgr",
    "MDatabaseProxy::",
    "IDictDefMemMgr",
    "IBusinessMemMgr",
    "IServiceMemMgr",
    "IHostMemMgr",
    "MdbDict.cpp",
    "IProcessMemMgr",
    "SfcRunner.cpp:703", // loggerLevel verbose
    "FuzzyPlugin.cpp:143", // fuzzy debug
    "NLCommon.cpp:193",
    "SAXVarHandler.cpp", // repetitive cdata logging
    "BsspDataformatPlugin.cpp", // redundant payload logging
  ];

  // Specific high-frequency but low-value patterns to suppress
  const contentNoisePatterns = [
    /cdata dencoding=/i,
    /模糊化(后的)?应答报文/i,
    /after_fuzzy_response/i,
    /\[DbUtilsOpe\]query execute:.*res_params_tab.*执行结果码 \[0\]/i,
    /\[DbUtilsOpe\]query execute:.*res_params_tab.*结果码 \[0\]/i, // Catch variations
  ];

  const seenFingerprints = new Set<string>();

  return logs.filter((log) => {
    // Rule 1: Always keep ERROR or WARN logs unconditionally
    if (log.level === "ERROR" || log.level === "WARN") return true;

    // Rule 1.b: Aggressive framework noise filtering
    if (frameworkInternalBlacklist.some(term => log.raw.includes(term))) return false;
    
    // Rule 1.c: Suppress content noise patterns
    if (contentNoisePatterns.some(pattern => pattern.test(log.raw))) return false;

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
