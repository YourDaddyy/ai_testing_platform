"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HttpHeader, HttpRequest, HttpResponse } from "@/types";
import { HeadersEditor } from "@/components/http-tool/HeadersEditor";
import { BodyEditor } from "@/components/http-tool/BodyEditor";
import { ResponseViewer } from "@/components/http-tool/ResponseViewer";
import { RequestHistory } from "@/components/http-tool/RequestHistory";
import { InlineLogsTab } from "@/components/http-tool/InlineLogsTab";
import { useLogStore } from "@/store/useLogStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getRequestHistory,
  saveRequest,
  generateId,
} from "@/lib/requestHistory";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";
import { useHttpStore } from "@/store/useHttpStore";
import { useConfigStore } from "@/store/useConfigStore";
import { useAiStore } from "@/store/useAiStore";
import { 
  Send, 
  Save, 
  History, 
  Sparkles, 
  ChevronDown, 
  Check, 
  Tag, 
  Plus, 
  Trash2,
  Globe,
  Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

const DEFAULT_XML_BODY = `<?xml version="1.0" encoding="GBK"?>
<Request>
  <Header>
    <TRANS_CODE>CS_XX_XXX</TRANS_CODE>
    <SRC_SYS_CODE>CRM</SRC_SYS_CODE>
  </Header>
  <Body>
  </Body>
</Request>`;

// Prioritize technical tx_id/trace_id over business accept_id for log tracing
function extractTxIdFromXml(xml: string): string | null {
  if (!xml) return null;
  
  // 1. Technical identifiers (tx_id, transId, etc.) — higher signal for BSSP/TE logs
  const txPatterns = [
    /<(?:tx_id|txId|transId|bssp_log|TRANS_CODE|ORDER_ID|SERIAL_NO|tx_serial_no|tx_id_info)[^>]*>\s*([^<\s]+)\s*<\//i,
    /txId[:=]\s*([A-Za-z0-9_-]+)/i,
    /tx_id[:=]\s*([A-Za-z0-9_-]+)/i,
    /transId[:=]\s*([A-Za-z0-9_-]+)/i,
  ];
  
  for (const p of txPatterns) {
    const m = p.exec(xml);
    if (m?.[1]?.trim()) return m[1].trim();
  }

  // 2. Business identifiers (accept_id) — fallback
  const acceptMatch = /<(?:accept_id|acceptId|businessId)[^>]*>\s*([^<\s]+)\s*<\//i.exec(xml);
  if (acceptMatch?.[1]?.trim()) return acceptMatch[1].trim();
  
  const acceptFallbackMatch = /accept_id=([A-Za-z0-9_-]+)/i.exec(xml);
  if (acceptFallbackMatch?.[1]?.trim()) return acceptFallbackMatch[1].trim();

  return null;
}

export default function HttpToolPage() {
  const router = useRouter();
  const { environments, activeEnvId } = useConfigStore();
  const activeEnv = environments.find(e => e.id === activeEnvId) || environments[0];
  
  const {
    url, method, headers, body, encoding, requestName, selectedId, response, isLoading,
    autoLogQueryKey, leftTab, rightTab, history, showHistory,
    setUrl, setMethod, setHeaders, setBody, setEncoding, setRequestName, setSelectedId,
    setResponse, setLoading, setError, setAutoLogQueryKey, setLeftTab, setRightTab,
    setHistory, setShowHistory
  } = useHttpStore();

  const logsBySource = useLogStore((s) => s.logsBySource);

  const { commonUrls, addCommonUrl, removeCommonUrl, updateCommonUrl } = useConfigStore();

  useEffect(() => {
    setHistory(getRequestHistory());
  }, [setHistory]);

  const sendRequest = async () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }
    setLoading(true);
    useHttpStore.getState().clearResponse();
    try {
      const enabledHeaders: Record<string, string> = {};
      headers.filter((h) => h.enabled && h.key).forEach((h) => {
        enabledHeaders[h.key] = h.value;
      });

      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, method, headers: enabledHeaders, body, encoding }),
      });

      const data = await res.json();
      setResponse(data as HttpResponse);
      setRightTab("response");

      if (!res.ok && data.error) {
        toast.error(`Proxy error: ${data.error}`);
        setError(data.error);
        return;
      }

      // Extract high-fidelity technical ID (tx_id) first, fallback to business (accept_id)
      const txId = extractTxIdFromXml(data.body || "") || extractTxIdFromXml(body);
      if (txId) {
        setAutoLogQueryKey(`${txId}__${Date.now()}`);
      }
    } catch (err: unknown) {
      const msg = (err as Error).message;
      setError(msg);
      setResponse({
        status: 500,
        statusText: "Request Failed",
        headers: {},
        body: `Local fetch error: ${msg}`,
        duration: 0,
        size: 0
      });
      setRightTab("response");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const req: HttpRequest = {
      id: selectedId ?? generateId(),
      name: requestName || url,
      url,
      method,
      headers,
      body,
      encoding,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveRequest(req);
    setSelectedId(req.id);
    setHistory(getRequestHistory());
    toast.success("Request saved!");
  };

  const handleSelectHistory = (req: HttpRequest) => {
    setUrl(req.url);
    setMethod(req.method);
    setHeaders(req.headers);
    setBody(req.body);
    setEncoding(req.encoding);
    setRequestName(req.name);
    setSelectedId(req.id);
    setShowHistory(false);
    toast.info(`Loaded: ${req.name}`);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(getRequestHistory());
    if (selectedId === id) setSelectedId(undefined);
  };

  // URL Tag Management logic
  const [isUrlPopoverOpen, setIsUrlPopoverOpen] = useState(false);
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false);
  const [newUrlLabel, setNewUrlLabel] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const currentUrlLabel = commonUrls.find(u => u.url === url)?.label;

  const handleAddUrl = () => {
    if (!newUrlLabel.trim()) {
      toast.error("请输入标签名称");
      return;
    }
    addCommonUrl(newUrlLabel.trim(), url);
    setNewUrlLabel("");
    setIsSavePopoverOpen(false);
    toast.success("URL 已收藏");
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── URL Bar ── */}
        <div className="flex items-center gap-2 p-3 border-b shrink-0 bg-card/40">
          <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
            <SelectTrigger className="w-[110px] font-mono font-bold text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map((m) => (
                <SelectItem key={m} value={m} className="font-mono font-bold">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <InputGroup className="flex-1">
            <Popover open={isUrlPopoverOpen} onOpenChange={setIsUrlPopoverOpen}>
              <PopoverTrigger 
                render={
                  <button className="flex items-center gap-1.5 px-2 hover:bg-muted/50 border-r text-muted-foreground transition-colors group h-full">
                    <div className="flex items-center gap-1.5 max-w-[120px]">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      {currentUrlLabel && (
                        <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] font-bold bg-primary/10 text-primary border-none truncate">
                          {currentUrlLabel}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isUrlPopoverOpen && "rotate-180")} />
                  </button>
                }
              />
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="搜索已保存的 URL..." />
                  <CommandList>
                    <CommandEmpty>未找到匹配的 URL</CommandEmpty>
                    <CommandGroup heading="常用 URL">
                      {commonUrls.map((item) => (
                        <CommandItem
                          key={item.id}
                          onSelect={() => {
                            if (editingId === item.id) return;
                            setUrl(item.url);
                            setIsUrlPopoverOpen(false);
                          }}
                          className="flex items-center justify-between group py-2"
                        >
                          {editingId === item.id ? (
                            <div className="flex flex-col gap-2 w-full p-1" onClick={(e) => e.stopPropagation()}>
                              <Input 
                                value={editLabel} 
                                onChange={(e) => setEditLabel(e.target.value)}
                                placeholder="标签名..."
                                className="h-7 text-xs font-bold"
                                autoFocus
                              />
                              <Input 
                                value={editUrl} 
                                onChange={(e) => setEditUrl(e.target.value)}
                                placeholder="URL..."
                                className="h-7 text-[10px] font-mono"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() => setEditingId(null)}
                                >
                                  取消
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="h-6 px-2 text-[10px] font-bold"
                                  onClick={() => {
                                    updateCommonUrl(item.id, editLabel, editUrl);
                                    setEditingId(null);
                                    toast.success("已更新");
                                  }}
                                >
                                  保存
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs">{item.label}</span>
                                  {url === item.url && <Check className="h-3 w-3 text-primary" />}
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono truncate">{item.url}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(item.id);
                                    setEditLabel(item.label);
                                    setEditUrl(item.url);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCommonUrl(item.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <InputGroupInput
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="输入请求 URL..."
              className="font-mono text-xs py-0 h-8"
              onKeyDown={(e) => e.key === "Enter" && sendRequest()}
            />

            <Popover open={isSavePopoverOpen} onOpenChange={setIsSavePopoverOpen}>
              <PopoverTrigger 
                render={
                  <button className="px-2 hover:bg-muted/50 border-l text-muted-foreground transition-colors group h-full" title="标签化该 URL">
                    <Plus className="h-4 w-4" />
                  </button>
                }
              />
              <PopoverContent className="w-80 p-3">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm leading-none flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5" />
                      标签化当前 URL
                    </h4>
                    <p className="text-xs text-muted-foreground">给这个地址起个名字吧（如：开发、生产）</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="label"
                      placeholder="标签名称..."
                      value={newUrlLabel}
                      onChange={(e) => setNewUrlLabel(e.target.value)}
                      className="h-8 text-xs font-mono"
                      onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                      autoFocus
                    />
                    <Button size="sm" className="h-8 text-xs font-bold" onClick={handleAddUrl}>
                      保存
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </InputGroup>

          <Button onClick={sendRequest} disabled={isLoading} className="gap-2 shrink-0 h-8 font-bold">
            <Send className="h-4 w-4" />
            发送
          </Button>

          <Button variant="outline" onClick={handleSave} size="icon" className="h-8 w-8" title="保存到历史记录">
            <Save className="h-4 w-4" />
          </Button>

          <Sheet open={showHistory} onOpenChange={setShowHistory}>
            <SheetTrigger
              className="h-9 w-9 inline-flex items-center justify-center rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Request History"
            >
              <History className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Request History</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-65px)]">
                <RequestHistory
                  history={history}
                  onSelect={handleSelectHistory}
                  onDelete={handleDeleteHistory}
                  selectedId={selectedId}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* ── Request name ── */}
        <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">接口名称:</span>
          <Input
            value={requestName}
            onChange={(e) => setRequestName(e.target.value)}
            placeholder="e.g. CS_NGModifyGroupProductCloud"
            className="h-7 text-xs flex-1"
          />
        </div>

        {/* ── Main split panels ── */}
        {/* @ts-expect-error shadcn ResizablePanelGroup maps direction to react-resizable-panels but types are out of sync */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden" id="http-tool-layout">

          {/* ── LEFT: Request editor ── */}
          <ResizablePanel defaultSize={50} minSize={25} className="flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-3 pt-2 border-b shrink-0">
              {([["body", "请求体"] as const, ["req-headers", "请求头"] as const]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setLeftTab(key)}
                  className={`text-xs px-3 py-1.5 transition-colors border-b-2 -mb-px ${
                    leftTab === key
                      ? "border-primary text-foreground font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Body — stays mounted */}
            <div className={`flex-1 overflow-hidden px-3 pb-3 pt-2 ${leftTab !== "body" ? "hidden" : ""}`}>
              <BodyEditor />
            </div>

            {/* Headers — stays mounted */}
            <div className={`overflow-auto px-3 pb-3 pt-2 flex-1 ${leftTab !== "req-headers" ? "hidden" : ""}`}>
              <HeadersEditor />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── RIGHT: Response + Log tabs ── */}
          <ResizablePanel defaultSize={50} minSize={25} className="flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-3 pt-2 border-b shrink-0 flex-wrap">
              {([
                ["resp-headers", "响应头"] as const,
                ["response", "响应体"] as const,
                ...([
                  ["bssp-log", "bssp", "BSSP日志"] as const,
                  ["sac-log", "sac", "SAC日志"] as const,
                  ["te-log", "te", "TE日志"] as const,
                  ["cmc-log", "cmc", "容器云日志"] as const,
                  ["cs-log", "cs", "CS日志"] as const,
                ].filter(([_, source]) => (logsBySource[source]?.length || 0) > 0)
                 .map(([key, _, label]) => [key, label] as const))
              ]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setRightTab(key)}
                  className={`text-xs px-3 py-1.5 transition-colors border-b-2 -mb-px flex items-center gap-1 ${
                    rightTab === key
                      ? "border-primary text-foreground font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                  {/* Green dot indicator when logs have been fetched */}
                  {(key.endsWith("-log")) && autoLogQueryKey && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  )}
                </button>
              ))}

              {/* AI Deep Analysis Trigger */}
              <div className="ml-auto pb-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-[11px] gap-1.5 font-bold text-violet-500 hover:text-violet-600 hover:bg-violet-500/10 transition-all group"
                  onClick={() => {
                    if (autoLogQueryKey) {
                      const id = autoLogQueryKey.split("__")[0];
                      useAiStore.getState().setTargetTxId(id);
                      router.push(`/ai?txId=${id}`);
                    } else {
                      router.push("/ai");
                    }
                  }}
                >
                  <Sparkles className="h-3 w-3 transition-transform group-hover:scale-110" />
                  AI 深度全链路分析
                </Button>
              </div>
            </div>

            {/* 响应体 — stays mounted */}
            <div className={`flex-1 overflow-hidden p-3 ${rightTab !== "response" ? "hidden" : ""}`}>
              <ResponseViewer response={response} isLoading={isLoading} />
            </div>

            {/* 响应头 — stays mounted */}
            <div className={`flex-1 overflow-auto p-3 ${rightTab !== "resp-headers" ? "hidden" : ""}`}>
              {response ? (
                <div className="space-y-1">
                  {Object.entries(response.headers).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-xs font-mono border-b pb-1">
                      <span className="text-primary font-semibold min-w-[180px]">{k}</span>
                      <span className="text-muted-foreground break-all">{v as string}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">暂无响应</p>
              )}
            </div>

            {/* BSSP日志 — stays mounted so useEffect fires even when tab not visible */}
            <div className={`flex-1 overflow-hidden px-3 pb-3 pt-1 ${rightTab !== "bssp-log" ? "hidden" : ""}`}>
              <InlineLogsTab
                source="bssp"
                sourceLabel="BSSP"
                requestBody={body}
                responseBody={response?.body}
                hostConfigs={activeEnv?.hosts?.bssp}
                autoQueryKey={autoLogQueryKey}
              />
            </div>

            {/* SAC日志 — stays mounted */}
            <div className={`flex-1 overflow-hidden px-3 pb-3 pt-1 ${rightTab !== "sac-log" ? "hidden" : ""}`}>
              <InlineLogsTab
                source="sac"
                sourceLabel="SAC"
                requestBody={body}
                responseBody={response?.body}
                hostConfigs={activeEnv?.hosts?.sac}
                autoQueryKey={autoLogQueryKey}
              />
            </div>

            {/* TE日志 — stays mounted */}
            <div className={`flex-1 overflow-hidden px-3 pb-3 pt-1 ${rightTab !== "te-log" ? "hidden" : ""}`}>
              <InlineLogsTab
                source="te"
                sourceLabel="TE"
                requestBody={body}
                responseBody={response?.body}
                hostConfigs={activeEnv?.hosts?.te}
                autoQueryKey={autoLogQueryKey}
              />
            </div>

            {/* 容器云日志 — stays mounted */}
            <div className={`flex-1 overflow-hidden px-3 pb-3 pt-1 ${rightTab !== "cmc-log" ? "hidden" : ""}`}>
              <InlineLogsTab
                source="cmc"
                sourceLabel="容器云"
                requestBody={body}
                responseBody={response?.body}
                hostConfigs={activeEnv?.hosts?.cmc}
                autoQueryKey={autoLogQueryKey}
              />
            </div>

            {/* CS日志 — stays mounted */}
            <div className={`flex-1 overflow-hidden px-3 pb-3 pt-1 ${rightTab !== "cs-log" ? "hidden" : ""}`}>
              <InlineLogsTab
                source="cs"
                sourceLabel="CS"
                requestBody={body}
                responseBody={response?.body}
                hostConfigs={activeEnv?.hosts?.cs}
                autoQueryKey={autoLogQueryKey}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
