"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { useConfigStore } from "@/store/useConfigStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  ServerIcon,
  ChevronDown,
  ChevronRight,
  Copy,
  Activity,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

interface LogEntry {
  id: string;
  timestamp: string;
  source: string;
  sourceLabel: string;
  hostLabel?: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
  raw: string;
}

const ALL_SOURCES = [
  { key: "bssp", label: "BSSP" },
  { key: "sac", label: "SAC" },
  { key: "bop", label: "BOP" },
  { key: "cmc", label: "CMC" },
  { key: "container", label: "容器云 / Container" },
  { key: "te", label: "TE" },
] as const;

const LEVEL_CONFIG = {
  ERROR: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-950/40 border-red-800" },
  WARN: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-950/40 border-yellow-800" },
  INFO: { icon: Info, color: "text-sky-400", bg: "bg-sky-950/30 border-sky-900" },
  DEBUG: { icon: Bug, color: "text-gray-400", bg: "bg-gray-900/30 border-gray-800" },
};

const SOURCE_COLORS: Record<string, string> = {
  bssp: "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20",
  sac: "bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20",
  bop: "bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20",
  cmc: "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
  container: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
  te: "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20",
};

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.INFO;
  const Icon = cfg.icon;

  const copyRaw = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(entry.raw);
    toast.success("Copied to clipboard");
  };

  return (
    <div
      className={`border rounded-md mb-1.5 cursor-pointer transition-all ${cfg.bg} hover:brightness-110`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
        <span className="text-xs text-muted-foreground font-mono shrink-0 w-[160px]">
          {new Date(entry.timestamp).toLocaleTimeString("zh-CN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 })}
        </span>
        <Badge className={`text-[10px] shrink-0 border ${SOURCE_COLORS[entry.source] || ""}`}>
          {entry.sourceLabel}
        </Badge>
        {entry.hostLabel && (
          <Badge variant="outline" className="text-[10px] shrink-0 font-mono border-muted-foreground/30 opacity-70">
            {entry.hostLabel}
          </Badge>
        )}
        <span className={`text-xs font-bold w-12 shrink-0 ${cfg.color}`}>{entry.level}</span>
        <span className="text-xs font-mono flex-1 truncate">{entry.message}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={copyRaw} className="p-0.5 rounded hover:bg-muted" title="Copy raw">
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t px-3 py-2 bg-black/30">
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">{entry.raw}</pre>
        </div>
      )}
    </div>
  );
}

// Hardcoded mock hosts — in real use this would come from the config store
const MOCK_DEMO_LOGS: LogEntry[] = [
  { id: "1", timestamp: new Date(Date.now() - 5000).toISOString(), source: "bssp", sourceLabel: "BSSP", level: "INFO", message: "[CS_NGModifyGroupProductCloud] Request received, txId=TEST20240316001", raw: "2024-03-16 10:00:01.123 INFO  [CS_NGModifyGroupProductCloud] Request received, txId=TEST20240316001\n  src_sys_code=CRM\n  operator=user001" },
  { id: "2", timestamp: new Date(Date.now() - 4500).toISOString(), source: "bssp", sourceLabel: "BSSP", level: "INFO", message: "Calling downstream SAC service: url=http://10.47.213.26:8080/sac", raw: "2024-03-16 10:00:01.456 INFO  Calling downstream SAC service: url=http://10.47.213.26:8080/sac" },
  { id: "3", timestamp: new Date(Date.now() - 4000).toISOString(), source: "sac", sourceLabel: "SAC", level: "INFO", message: "SAC received request, forwarding to subscription module", raw: "2024-03-16 10:00:01.900 INFO  SAC received request, forwarding to subscription module" },
  { id: "4", timestamp: new Date(Date.now() - 3500).toISOString(), source: "cmc", sourceLabel: "CMC", level: "WARN", message: "DB connection pool 80% utilised, query may be slow", raw: "2024-03-16 10:00:02.100 WARN  DB connection pool 80% utilised, query may be slow\n  pool_size=20, used=16" },
  { id: "5", timestamp: new Date(Date.now() - 3000).toISOString(), source: "cmc", sourceLabel: "CMC", level: "ERROR", message: "ORA-00001: unique constraint violated on CCS_ND.SUBS_GROUP_INFO", raw: "2024-03-16 10:00:02.345 ERROR ORA-00001: unique constraint violated on CCS_ND.SUBS_GROUP_INFO\n  SQL: INSERT INTO SUBS_GROUP_INFO...\n  at oracle.jdbc.driver.T4CTTIoer11.processError(T4CTTIoer11.java:630)" },
  { id: "6", timestamp: new Date(Date.now() - 2000).toISOString(), source: "bssp", sourceLabel: "BSSP", level: "ERROR", message: "CMC response error: ORA-00001, rolling back transaction txId=TEST20240316001", raw: "2024-03-16 10:00:02.800 ERROR CMC response error: ORA-00001, rolling back transaction txId=TEST20240316001" },
  { id: "7", timestamp: new Date(Date.now() - 1000).toISOString(), source: "bssp", sourceLabel: "BSSP", level: "INFO", message: "Response returned to CRM: result_code=9999, result_msg=系统异常", raw: "2024-03-16 10:00:03.100 INFO  Response returned to CRM: result_code=9999, result_msg=系统异常" },
];

export default function LogsPage() {
  const { t } = useLang();
  const { environments } = useConfigStore();
  const [queryKey, setQueryKey] = useState("");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(["bssp", "sac", "cmc"])
  );
  
  // Use config store environments instead of hardcoded test/stage
  const [selectedEnvId, setSelectedEnvId] = useState<string>(environments[0]?.id || "");
  const activeEnv = environments.find(e => e.id === selectedEnvId) || environments[0];
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);

  const toggleSource = (key: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSearch = async () => {
    if (!queryKey.trim()) {
      toast.error("请输入查询关键字");
      return;
    }
    if (selectedSources.size === 0) {
      toast.error("请至少选择一个日志来源");
      return;
    }

    setIsLoading(true);
    setHasQueried(true);

    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryKey: queryKey.trim(),
          sources: Array.from(selectedSources),
          env: activeEnv?.name || "test",
          hosts: activeEnv?.hosts || {},
        }),
      });

      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
        setLogs([]);
        setErrors([data.error]);
      } else {
        setLogs(data.logs || []);
        setErrors(data.errors || []);
      }
    } catch (err: any) {
      setLogs([]);
      setErrors([err.message || "无法连接到日志服务"]);
    } finally {
      setIsLoading(false);
    }
  };

  const levelCounts = logs.reduce(
    (acc, l) => ({ ...acc, [l.level]: (acc[l.level] || 0) + 1 }),
    {} as Record<string, number>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel: Query controls */}
      <div className="w-72 shrink-0 border-r flex flex-col bg-card/30 overflow-auto">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-base mb-1">{t("log_title")}</h2>
          <p className="text-xs text-muted-foreground">按流水号或接口名查询各主机日志</p>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {/* Query Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("log_query_key")}</label>
            <Input
              value={queryKey}
              onChange={(e) => setQueryKey(e.target.value)}
              placeholder={t("log_query_key_ph")}
              className="text-sm h-9"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          {/* Environment */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("log_env")}</label>
            <Select value={selectedEnvId} onValueChange={(v) => v && setSelectedEnvId(v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {environments.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">{t("log_select_sources")}</label>
            <div className="flex flex-col gap-1">
              {ALL_SOURCES.map(({ key, label }) => (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 transition-all border",
                    selectedSources.has(key) 
                      ? "bg-primary/10 border-primary/30 text-primary" 
                      : "bg-transparent border-transparent hover:bg-muted text-muted-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedSources.has(key)}
                    onChange={() => toggleSource(key)}
                    className="sr-only" /* Hide original checkbox for custom UI */
                  />
                  <div className={cn(
                    "h-3 w-3 rounded-full border border-current flex items-center justify-center transition-all",
                    selectedSources.has(key) ? "bg-primary" : "bg-transparent"
                  )}>
                    {selectedSources.has(key) && <Check className="h-2 w-2 text-primary-foreground" />}
                  </div>
                  <span className="text-xs font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Link 
              href={`/ai?txId=${encodeURIComponent(queryKey)}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-7 px-2 text-xs gap-1 opacity-80 hover:opacity-100 border-primary/30 text-primary"
              )}
              title="跳转到 AI 深度分析"
            >
              <Activity className="w-3 h-3" />
              AI 分析
            </Link>
            <Button
              size="sm"
              disabled={isLoading}
              onClick={() => handleSearch()}
              className="h-7 px-2 text-xs gap-1 flex-1"
            >
              <Search className="w-3 h-3" />
              {isLoading ? "Searching..." : "查询"}
            </Button>
          </div>
        </div>
      </div>

      {/* Right panel: Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats bar */}
        {hasQueried && !isLoading && (
          <div className="flex items-center gap-3 px-4 py-2 border-b bg-card/20 shrink-0 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">
              {t("log_total")} <span className="text-foreground font-bold">{logs.length}</span> {t("log_entries")}
            </span>
            <Separator orientation="vertical" className="h-4" />
            {Object.entries(levelCounts).map(([level, count]) => {
              const cfg = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG.INFO;
              return (
                <span key={level} className={`text-xs font-bold ${cfg.color}`}>
                  {level}: {count}
                </span>
              );
            })}
            {errors.length > 0 && (
              <>
                <Separator orientation="vertical" className="h-4" />
                {errors.map((e, i) => (
                  <span key={i} className="text-xs text-yellow-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {e}
                  </span>
                ))}
              </>
            )}
            <div className="ml-auto">
               <Link href={`/ai?txId=${encodeURIComponent(queryKey)}`}>
                <Button size="xs" variant="outline" className="gap-1 border-primary/30 text-primary hover:bg-primary/10">
                  <Activity className="h-3 w-3" />
                  AI 全链路分析
                </Button>
               </Link>
            </div>
          </div>
        )}

        {/* Log timeline */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-sm text-muted-foreground">{t("log_searching")}</span>
              </div>
            )}

            {!isLoading && !hasQueried && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <ServerIcon className="h-12 w-12 opacity-20" />
                <p className="text-sm">{t("log_no_result")}</p>
              </div>
            )}

            {!isLoading && hasQueried && logs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                <Info className="h-10 w-10 opacity-20" />
                <p className="text-sm">No logs found for this query.</p>
              </div>
            )}

            {!isLoading && logs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  {t("log_timeline")}
                </p>
                {logs.map((entry) => (
                  <LogEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
