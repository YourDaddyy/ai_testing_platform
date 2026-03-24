"use client";

import { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n";
import { useConfigStore } from "@/store/useConfigStore";
import { useLogStore } from "@/store/useLogStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search,
  Activity,
  Check,
  Globe,
  ArrowUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { InlineLogsTab } from "@/components/http-tool/InlineLogsTab";

const ALL_SOURCES = [
  { key: "bssp", label: "BSSP" },
  { key: "sac", label: "SAC" },
  { key: "bop", label: "BOP" },
  { key: "cmc", label: "CMC" },
  { key: "container", label: "容器云 / Container" },
  { key: "te", label: "TE" },
  { key: "cs", label: "CS" },
] as const;

const SOURCE_COLORS: Record<string, string> = {
  bssp: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  sac: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  bop: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  cmc: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  container: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  te: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  cs: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
};

const STORAGE_KEY_SOURCES = "crm-logs-selected-sources";
const STORAGE_KEY_QUERY = "crm-logs-last-query";
const STORAGE_KEY_HAS_QUERIED = "crm-logs-has-queried";

function AggregatedServiceBlock({ 
  source, 
  sourceLabel, 
  autoQueryKey, 
  hostConfigs 
}: { 
  source: string; 
  sourceLabel: string; 
  autoQueryKey: string; 
  hostConfigs: any[] 
}) {
  const { t } = useLang();
  const logs = useLogStore((state) => state.getLogsBySource(source));
  const queried = useLogStore((state) => state.queriedBySource[source] || false);
  
  if (queried && logs.length === 0) return null;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex items-center justify-between border-l-4 border-primary pl-4 py-1">
        <div className="flex flex-col">
          <h2 className="text-sm font-black tracking-[0.2em] uppercase text-foreground leading-tight">
            {sourceLabel}
          </h2>
          <span className="text-[10px] text-muted-foreground opacity-40 uppercase font-mono">
            {logs.length > 0 ? t("log_node_activity") : t("log_connected")}
          </span>
        </div>
        <Badge variant="outline" className={cn("text-[10px] py-0 px-2 h-5 font-bold shadow-sm whitespace-nowrap uppercase", SOURCE_COLORS[source])}>
          {logs.length > 0 ? t("log_records_found") : t("log_connected")}
        </Badge>
      </div>
      
      <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black/40">
        <InlineLogsTab
          source={source}
          sourceLabel={sourceLabel}
          autoQueryKey={autoQueryKey}
          hostConfigs={hostConfigs}
          hideControls={true}
          hideEmpty={true}
        />
      </div>
    </div>
  );
}

export default function LogsPage() {
  const { t } = useLang();
  const { environments, activeEnvId } = useConfigStore();
  const [queryKey, setQueryKey] = useState("");
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [hasQueried, setHasQueried] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // 1. Persistence loading
  useEffect(() => {
    // Selected Sources
    const savedSources = localStorage.getItem(STORAGE_KEY_SOURCES);
    if (savedSources) {
      try {
        const parsed = JSON.parse(savedSources);
        if (Array.isArray(parsed)) setSelectedSources(new Set(parsed));
      } catch (e) { /* silent */ }
    } else {
      setSelectedSources(new Set(["bssp", "sac", "cmc"]));
    }

    // Last Query Key
    const lastQuery = localStorage.getItem(STORAGE_KEY_QUERY);
    if (lastQuery) setQueryKey(lastQuery);

    // Has Queried state
    const lastHasQueried = localStorage.getItem(STORAGE_KEY_HAS_QUERIED);
    if (lastHasQueried === "true") setHasQueried(true);
  }, []);

  // 2. Persistence saving
  useEffect(() => {
    if (selectedSources.size > 0) {
      localStorage.setItem(STORAGE_KEY_SOURCES, JSON.stringify(Array.from(selectedSources)));
    }
  }, [selectedSources]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_QUERY, queryKey);
    localStorage.setItem(STORAGE_KEY_HAS_QUERIED, hasQueried ? "true" : "false");
  }, [queryKey, hasQueried]);

  // Handle environment selection
  const [selectedEnvId, setSelectedEnvId] = useState<string>("");
  
  useEffect(() => {
    // Sync with activeEnvId if it exists OR default to first available
    if (activeEnvId) setSelectedEnvId(activeEnvId);
    else if (environments.length > 0 && !selectedEnvId) setSelectedEnvId(environments[0].id);
  }, [activeEnvId, environments]);

  const activeEnv = environments.find(e => e.id === selectedEnvId) || environments[0];
  
  const [autoQueryKey, setAutoQueryKey] = useState("");

  const toggleSource = (key: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSearch = () => {
    if (!queryKey.trim()) {
      toast.error(t("log_query_key_ph"));
      return;
    }
    if (selectedSources.size === 0) {
      toast.error(t("log_select_sources"));
      return;
    }

    setHasQueried(true);
    setAutoQueryKey(`${queryKey.trim()}__${Date.now()}`);
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollTop(e.currentTarget.scrollTop > 500);
  };

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-[#09090b]">
      {/* Left panel: Query controls */}
      <div className="w-72 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-950/20 overflow-auto">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="font-bold text-lg tracking-tight mb-1">{t("nav_logs")}</h2>
          <p className="text-[11px] text-muted-foreground opacity-70">
            {t("log_ready_to_aggregate")}
          </p>
        </div>

        <div className="flex flex-col gap-6 p-5">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("log_query_key")}</label>
            <Input
              value={queryKey}
              onChange={(e) => setQueryKey(e.target.value)}
              placeholder={t("log_query_key_ph")}
              className="text-sm h-10 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-inner font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("log_env")}</label>
            <Select value={selectedEnvId} onValueChange={(v) => v && setSelectedEnvId(v)}>
              <SelectTrigger className="h-10 text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                {/* Explicitly mapping SelectValue to get the name from the ID */}
                <span className="truncate">{activeEnv?.name || t("log_env")}</span>
              </SelectTrigger>
              <SelectContent>
                {environments.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("log_select_sources")}</label>
            <div className="flex flex-col gap-1.5">
              {ALL_SOURCES.map(({ key, label }) => (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2 transition-all border",
                    selectedSources.has(key) 
                      ? "bg-primary/5 border-primary/40 text-primary shadow-sm ring-1 ring-primary/20" 
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-muted-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedSources.has(key)}
                    onChange={() => toggleSource(key)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "h-3.5 w-3.5 rounded-full border border-current flex items-center justify-center transition-all",
                    selectedSources.has(key) ? "bg-primary" : "bg-transparent"
                  )}>
                    {selectedSources.has(key) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </div>
                  <span className="text-xs font-bold">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleSearch}
            className="h-11 px-4 text-xs font-black uppercase tracking-widest gap-2 w-full shadow-lg active:scale-95 transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Search className="w-4 h-4" />
            {t("log_search")}
          </Button>
        </div>

        <div className="mt-auto p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/30 dark:bg-zinc-900/10">
           <Link href={`/ai?txId=${encodeURIComponent(queryKey)}`} className="block">
             <Button variant="outline" size="sm" className="w-full text-[11px] h-10 gap-2 border-primary/20 text-primary hover:bg-primary/5 rounded-lg font-black uppercase italic tracking-tighter">
               <Activity className="w-4 h-4" />
               {t("nav_ai")}
             </Button>
           </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden bg-background">
        <div 
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto scrollbar-hide snap-y"
        >
          <div className="p-10 min-h-full">
            {!hasQueried ? (
              <div className="flex flex-col items-center justify-center py-48 gap-8 text-muted-foreground/30">
                <Globe className="h-24 w-24 animate-pulse opacity-5 text-primary" />
                <div className="text-center space-y-2">
                  <p className="text-xl font-black text-foreground opacity-10 uppercase tracking-[0.3em] italic">Diagnostic Hub</p>
                  <p className="text-[11px] tracking-[0.2em] font-mono">{t("log_ready_to_aggregate")}</p>
                </div>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto space-y-12">
                <div className="flex items-center justify-between border-b-2 border-zinc-200 dark:border-zinc-800 pb-8">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic text-foreground leading-none">
                      {t("log_search_summary")}
                    </h1>
                    <div className="flex items-center gap-3">
                       <Badge variant="secondary" className="px-2 py-0 h-4 text-[9px] font-black opacity-60 bg-primary/10 text-primary">{t("log_identity")}</Badge>
                       <span className="text-sm text-foreground/70 font-mono font-bold tracking-tight">{queryKey}</span>
                       <Badge variant="secondary" className="px-2 py-0 h-4 text-[9px] font-black opacity-60 bg-muted text-muted-foreground uppercase">{activeEnv?.name}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant="default" className="px-4 py-1.5 bg-primary text-primary-foreground font-black italic rounded-full shadow-lg shadow-primary/20 whitespace-nowrap">
                      {Array.from(selectedSources).length} {t("log_services_monitored")}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-30">Unified Engine 2.5</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-12 pt-4">
                  {Array.from(selectedSources).map(source => {
                    const sourceInfo = ALL_SOURCES.find(s => s.key === source);
                    const hostConfigs = activeEnv?.hosts?.[source as keyof typeof activeEnv.hosts] || [];
                    
                    return (
                      <AggregatedServiceBlock
                        key={source}
                        source={source}
                        sourceLabel={sourceInfo?.label || source}
                        autoQueryKey={autoQueryKey}
                        hostConfigs={hostConfigs as any}
                      />
                    );
                  })}
                </div>
                
                <div className="pt-16 pb-12 flex flex-col items-center gap-4">
                  <div className="h-px w-24 bg-zinc-200 dark:border-zinc-800" />
                  <p className="text-[10px] text-muted-foreground opacity-30 font-mono uppercase tracking-[0.5em]">
                    End of Result Stream
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showScrollTop && (
          <Button
            size="sm"
            variant="secondary"
            className="fixed bottom-10 right-10 h-12 w-12 rounded-full shadow-2xl animate-in fade-in zoom-in slide-in-from-bottom-5 duration-300 z-50 bg-primary border-none text-primary-foreground hover:bg-primary/90 flex items-center justify-center p-0"
            onClick={scrollToTop}
          >
            <ArrowUp className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
}
