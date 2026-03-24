"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, AlertTriangle, Info, Bug, Copy, ChevronDown, ChevronRight, Search, Activity, WrapText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

// Theme-aware level configs — light colors for light mode, dark colors for dark/midnight
const LEVEL_CONFIG = {
  ERROR: {
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800",
    rawBg: "bg-red-100 dark:bg-black/30",
  },
  WARN: {
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-yellow-400",
    bg: "border-amber-300 bg-amber-50 dark:bg-yellow-950/40 dark:border-yellow-800",
    rawBg: "bg-amber-100 dark:bg-black/30",
  },
  INFO: {
    icon: Info,
    color: "text-blue-600 dark:text-sky-400",
    bg: "border-blue-200 bg-blue-50 dark:bg-sky-950/30 dark:border-sky-900",
    rawBg: "bg-blue-100 dark:bg-black/30",
  },
  DEBUG: {
    icon: Bug,
    color: "text-gray-500 dark:text-gray-400",
    bg: "border-gray-200 bg-gray-50 dark:bg-gray-900/30 dark:border-gray-800",
    rawBg: "bg-gray-100 dark:bg-black/30",
  },
};

// Theme-aware source badge colors
const SOURCE_COLORS: Record<string, string> = {
  bssp:      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
  sac:       "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700",
  cmc:       "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700",
  container: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-700",
  te:        "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-700",
  bop:       "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700",
};

// Patterns to extract transaction ID from XML/response body.
// Priority: accept_id first, then tx_id, then other identifiers.
function extractTxId(xmlBody: string): string | null {
  if (!xmlBody) return null;
  // 1. accept_id — highest priority (the field user wants to query logs by)
  const acceptMatch = /<accept_id[^>]*>\s*([^<\s]+)\s*<\/accept_id>/i.exec(xmlBody);
  if (acceptMatch?.[1]?.trim()) return acceptMatch[1].trim();

  // 2. tx_id / txId / transId / bssp_log / TRANS_CODE — fallback flow serial
  const txPatterns = [
    /<(?:tx_id|txId|transId|bssp_log|TRANS_CODE|ORDER_ID|SERIAL_NO|tx_serial_no)[^>]*>\s*([^<\s]+)\s*<\//i,
    /txId=([A-Za-z0-9_-]+)/i,
    /tx_id=([A-Za-z0-9_-]+)/i,
    /accept_id=([A-Za-z0-9_-]+)/i,
  ];
  for (const p of txPatterns) {
    const m = p.exec(xmlBody);
    if (m?.[1]?.trim()) return m[1].trim();
  }

  return null;
}

function FileGroup({ fileName, logs, defaultExpanded, wordWrap }: { fileName: string; logs: LogEntry[]; defaultExpanded?: boolean; wordWrap: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  
  return (
    <div className="border rounded mb-2 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm border-zinc-200 dark:border-zinc-800">
      <div 
        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors select-none group"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1">
          {expanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
          <span className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">
            {fileName}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-none font-mono py-0 h-5 px-1.5 text-[10px]">
            {logs.length} 条
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              const content = logs.map(l => l.raw).join('\n');
              navigator.clipboard.writeText(content);
              toast.success(`已复制 ${fileName} 的日志`);
            }}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-2 bg-zinc-50/50 dark:bg-black/20 overflow-x-auto overflow-y-hidden custom-scrollbar">
          <div className={cn(
            "font-mono text-[11px] leading-relaxed font-normal tabular-nums min-w-fit",
            wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"
          )}>
            {logs.map((entry, idx) => {
              const cfg = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.INFO;
              return (
                <div key={entry.id} className="flex gap-3 py-0.5 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/30 px-1 rounded transition-colors group">
                  <span className="text-zinc-400 select-none min-w-[24px] text-right">{idx + 1}</span>
                  <span className={`font-bold ${cfg.color} min-w-[36px]`}>{entry.level.padEnd(5)}</span>
                  <span className="text-zinc-800 dark:text-zinc-300">{entry.raw}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { HostCredentials } from "@/store/useConfigStore";

export interface InlineLogsTabProps {
  source: string;
  sourceLabel: string;
  requestBody?: string;
  responseBody?: string;
  hostConfigs?: HostCredentials[];
  /** When set to a non-empty string, automatically triggers a log fetch */
  autoQueryKey?: string;
  hideControls?: boolean;
  hideEmpty?: boolean;
}

const DEMO_LOGS: LogEntry[] = [
  {
    id: "d1", timestamp: new Date(Date.now() - 6000).toISOString(),
    source: "bssp", sourceLabel: "BSSP", level: "INFO",
    message: "[CS_NGModifyGroupProductCloud] Request received",
    raw: "2024-03-16 10:00:01.123 INFO [CS_NGModifyGroupProductCloud] Request received\n  src_sys_code=CRM\n  operator=user001",
  },
  {
    id: "d2", timestamp: new Date(Date.now() - 5500).toISOString(),
    source: "bssp", sourceLabel: "BSSP", level: "INFO",
    message: "Calling downstream SAC service: url=http://10.47.213.26:8080/sac",
    raw: "2024-03-16 10:00:01.456 INFO  Calling downstream SAC service: url=http://10.47.213.26:8080/sac",
  },
  {
    id: "d3", timestamp: new Date(Date.now() - 4000).toISOString(),
    source: "sac", sourceLabel: "SAC", level: "WARN",
    message: "DB connection pool 80% utilised, query may be slow",
    raw: "2024-03-16 10:00:02.100 WARN  DB connection pool 80% utilised\n  pool_size=20, used=16",
  },
  {
    id: "d4", timestamp: new Date(Date.now() - 3000).toISOString(),
    source: "bssp", sourceLabel: "BSSP", level: "ERROR",
    message: "CMC response error: ORA-00001, rolling back transaction",
    raw: "2024-03-16 10:00:02.800 ERROR CMC response error: ORA-00001, rolling back transaction",
  },
];

import { useLogStore } from "@/store/useLogStore";

const EMPTY_LOGS: LogEntry[] = [];

export function InlineLogsTab({
  source,
  sourceLabel,
  requestBody = "",
  responseBody = "",
  hostConfigs,
  autoQueryKey,
  hideControls = false,
  hideEmpty = false,
}: InlineLogsTabProps) {
  const setStoreLogs = useLogStore((state) => state.setLogs);
  const logs = useLogStore((state) => state.getLogsBySource(source));
  
  const queried = useLogStore((state) => state.queriedBySource[source] || false);
  const txId = useLogStore((state) => state.txIdBySource[source] || "");
  const errorMsg = useLogStore((state) => state.errorMsgBySource[source] || "");
  const serverErrors = useLogStore((state) => state.getServerErrorsBySource(source));
  
  const setQueried = useLogStore((state) => state.setQueried);
  const setTxId = useLogStore((state) => state.setTxId);
  const setErrorMsg = useLogStore((state) => state.setErrorMsg);
  const lastProcessedKey = useLogStore((state) => state.lastProcessedAutoQueryKeyBySource[source] || "");
  const setLastProcessedKey = useLogStore((state) => state.setLastProcessedAutoQueryKey);

  const [loading, setLoading] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  const autoTxId = extractTxId(responseBody) || extractTxId(requestBody) || "";

  const fetchLogs = useCallback(async (key?: string) => {
    const queryKey = (key ?? txId ?? autoTxId).trim();
    if (!queryKey) {
      toast.error("无法提取流水号，请手动输入后查询");
      return;
    }
    setLoading(true);
    setQueried(source, true);
    setErrorMsg(source, "");
    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryKey,
          sources: [source],
          env: "test",
          hosts: { [source]: hostConfigs },
        }),
      });
      const data = await res.json();
      if (data.error) {
        setStoreLogs(source, [], []);
        setErrorMsg(source, data.error);
      } else {
        setStoreLogs(source, data.logs || [], data.errors || []);
        if (!data.logs?.length && !data.errors?.length) {
          setErrorMsg(source, "未找到匹配的日志");
        }
      }
    } catch (err: any) {
      setStoreLogs(source, []);
      setErrorMsg(source, err.message || "请求日志失败");
    } finally {
      setLoading(false);
    }
  }, [source, hostConfigs, txId, autoTxId, setStoreLogs, setQueried, setErrorMsg]);

  // Track whether the user has manually edited the field since the last auto-fill.
  // If they have, do NOT overwrite with the next autoQueryKey.
  const userEditedRef = useRef(false);

  const handleTxIdChange = useCallback((value: string) => {
    userEditedRef.current = true;
    setTxId(source, value);
  }, [source, setTxId]);

  // Auto-fill and auto-fetch logic when a new request finishes
  useEffect(() => {
    if (autoQueryKey && autoQueryKey.trim()) {
      // If we've already handled THIS specific autoQueryKey instance physically, skip
      if (lastProcessedKey === autoQueryKey) return;
      
      // Safety: If logs are already present and they match the current txId, it's likely a remount/hydration case
      const cleanKey = autoQueryKey.split("__")[0];
      if (logs.length > 0 && txId === cleanKey) {
        // Sync the lastProcessedKey and abort
        setLastProcessedKey(source, autoQueryKey);
        return;
      }
      
      // Reset the edited flag — a new request provides a fresh key
      userEditedRef.current = false;
      setTxId(source, cleanKey);
      
      if (cleanKey) {
        setLastProcessedKey(source, autoQueryKey);
        fetchLogs(cleanKey);
      }
    }
  }, [autoQueryKey, source, setTxId, fetchLogs, lastProcessedKey, setLastProcessedKey, logs.length, txId]);

  // Group logs by fileName
  const groupedLogs = logs.reduce((acc, log) => {
    const key = log.fileName || "unknown_file";
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {} as Record<string, LogEntry[]>);

  const levelCounts = logs.reduce(
    (acc, l) => ({ ...acc, [l.level]: (acc[l.level] || 0) + 1 }),
    {} as Record<string, number>
  );

  if (hideEmpty && queried && logs.length === 0) return null;

  return (
    <div className="flex flex-col h-full gap-2 pt-1 font-sans">
      {/* Query bar */}
      {!hideControls && (
        <div className="flex items-center gap-2 shrink-0">
          <input
            className="flex-1 h-7 px-2 text-xs font-mono rounded border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={autoTxId ? `自动提取: ${autoTxId}` : "输入流水号或接口名..."}
            value={txId}
            onChange={(e) => handleTxIdChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
          />
          <Button
            size="sm"
            disabled={loading}
            onClick={() => fetchLogs()}
            className="h-7 px-2 text-xs gap-1"
          >
            <Search className="w-3 h-3" />
            {loading ? "Searching..." : "查询"}
          </Button>
        </div>
      )}

      {/* Stats bar */}
      {(!hideControls && queried && !loading) && (
        <div className="flex items-center gap-2 text-xs shrink-0 flex-wrap">
          <span className="text-muted-foreground">
            共 <span className="font-bold text-foreground">{logs.length}</span> 条
          </span>
          {Object.entries(levelCounts).map(([lv, cnt]) => {
            const cfg = LEVEL_CONFIG[lv as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG.INFO;
            return (
              <span key={lv} className={`font-bold ${cfg.color}`}>{lv}: {cnt}</span>
            );
          })}
          {errorMsg && (
            <span className="text-red-500 text-[10px] flex items-center gap-1 font-bold">
              <AlertCircle className="w-3 h-3" /> {errorMsg}
            </span>
          )}
          {serverErrors.map((msg, idx) => (
            <span key={idx} className="text-amber-600 dark:text-yellow-400 text-[10px] flex items-center gap-1 font-medium bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10">
              <AlertTriangle className="w-3 h-3" /> {msg}
            </span>
          ))}
          <div className="flex-1" />
          {logs.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-[10px] gap-1",
                  wordWrap ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setWordWrap(!wordWrap)}
              >
                <WrapText className="w-3 h-3" />
                {wordWrap ? "自动换行: 开" : "自动换行: 关"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1 hover:bg-muted"
                onClick={() => {
                  const allRaw = logs.map(l => l.raw).join("\n");
                  navigator.clipboard.writeText(allRaw);
                  toast.success("已复制全部日志");
                }}
              >
                <Copy className="w-3 h-3" />
                复制全部
              </Button>
            </>
          )}
        </div>
      )}

      {/* Grouped Log Content */}
      <ScrollArea className="flex-1 min-h-0 p-1">
        {!queried && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60 py-12">
            <p className="text-xs text-center font-mono">
              {autoTxId
                ? `Ready to fetch: ${autoTxId}`
                : "Enter ID and click search..."}
            </p>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}
        {!loading && queried && (
          <div className="space-y-1">
            {Object.keys(groupedLogs).length > 0 ? (
              Object.entries(groupedLogs).map(([fileName, fileLogs], idx) => (
                <FileGroup 
                  key={fileName} 
                  fileName={fileName} 
                  logs={fileLogs} 
                  defaultExpanded={idx === 0 || fileLogs.length < 5} 
                  wordWrap={wordWrap}
                />
              ))
            ) : (
              !errorMsg && <div className="text-muted-foreground italic text-center py-8 text-xs">No logs found matching the ID.</div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
