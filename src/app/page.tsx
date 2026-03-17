"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { HttpHeader, HttpRequest, HttpResponse } from "@/types";
import { HeadersEditor } from "@/components/http-tool/HeadersEditor";
import { BodyEditor } from "@/components/http-tool/BodyEditor";
import { ResponseViewer } from "@/components/http-tool/ResponseViewer";
import { RequestHistory } from "@/components/http-tool/RequestHistory";
import { InlineLogsTab } from "@/components/http-tool/InlineLogsTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Save, History, Sparkles } from "lucide-react";
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
import { useHttpStore } from "@/store/useHttpStore";
import { useConfigStore } from "@/store/useConfigStore";

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

// Extract accept_id first, then fall back to tx_id and other fields
function extractTxIdFromXml(xml: string): string | null {
  if (!xml) return null;
  // 1. accept_id — highest priority
  const acceptMatch = /<accept_id[^>]*>\s*([^<\s]+)\s*<\/accept_id>/i.exec(xml);
  if (acceptMatch?.[1]?.trim()) return acceptMatch[1].trim();

  // 2. tx_id / txId / transId / bssp_log / TRANS_CODE — fallback
  const txPatterns = [
    /<(?:tx_id|txId|transId|bssp_log|TRANS_CODE|ORDER_ID|SERIAL_NO|tx_serial_no)[^>]*>\s*([^<\s]+)\s*<\//i,
    /txId=([A-Za-z0-9_-]+)/i,
    /tx_id=([A-Za-z0-9_-]+)/i,
    /accept_id=([A-Za-z0-9_-]+)/i,
  ];
  for (const p of txPatterns) {
    const m = p.exec(xml);
    if (m?.[1]?.trim()) return m[1].trim();
  }
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


  // If URL is empty on mount, initialize it with the current environment's BSSP host (first node)
  useEffect(() => {
    if (!url && activeEnv?.hosts?.bssp?.[0]?.url) {
      setUrl(`${activeEnv.hosts.bssp[0].url}/fcgi-bin/BSSP_SFC`);
    }
  }, [url, setUrl, activeEnv]);

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
      if (!res.ok && data.error) {
        toast.error(`Proxy error: ${data.error}`);
        setError(data.error);
        return;
      }
      setResponse(data as HttpResponse);

      // Auto-trigger log queries using tx_id extracted from response, fallback to request
      const txId = extractTxIdFromXml(data.body || "") || extractTxIdFromXml(body);
      if (txId) {
        setAutoLogQueryKey(`${txId}__${Date.now()}`);
      }
    } catch (err: unknown) {
      const msg = (err as Error).message;
      toast.error(`Request failed: ${msg}`);
      setError(msg);
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

          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter request URL..."
            className="flex-1 font-mono text-sm"
            onKeyDown={(e) => e.key === "Enter" && sendRequest()}
          />

          <Button onClick={sendRequest} disabled={isLoading} className="gap-2 shrink-0">
            <Send className="h-4 w-4" />
            发送
          </Button>

          <Button variant="outline" onClick={handleSave} size="icon" title="Save Request">
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
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden" autoSaveId="http-tool-layout">

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
                ["response", "响应体"] as const,
                ["resp-headers", "响应头"] as const,
                ["bssp-log", "BSSP日志"] as const,
                ["sac-log", "SAC日志"] as const,
                ["te-log", "TE日志"] as const,
                ["bop-log", "BOP日志"] as const,
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
                  {(key === "bssp-log" || key === "sac-log" || key === "te-log" || key === "bop-log") && autoLogQueryKey && (
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
                  onClick={() => router.push("/ai")}
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

            {/* BOP日志 — stays mounted */}
            <div className={`flex-1 overflow-hidden px-3 pb-3 pt-1 ${rightTab !== "bop-log" ? "hidden" : ""}`}>
              <InlineLogsTab
                source="bop"
                sourceLabel="BOP"
                requestBody={body}
                responseBody={response?.body}
                hostConfigs={activeEnv?.hosts?.bop}
                autoQueryKey={autoLogQueryKey}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
