"use client";

import { useState, useEffect, Suspense, useRef, Children, isValidElement, default as React } from "react";
import { useSearchParams } from "next/navigation";
import { useConfigStore } from "@/store/useConfigStore";
import { useLogStore } from "@/store/useLogStore";
import { useHttpStore } from "@/store/useHttpStore";
import { useAiStore } from "@/store/useAiStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Activity, 
  BrainCircuit, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2,
  ListRestart,
  ArrowLeft,
  Search,
  Zap,
  ExternalLink,
  Loader2,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import mermaid from "mermaid";
import { cn } from "@/lib/utils";
import { SquareStop } from "lucide-react";

// Initialize Mermaid
if (typeof window !== "undefined") {
  mermaid.initialize({
    startOnLoad: true,
    theme: "neutral",
    securityLevel: "loose",
    fontFamily: "Inter, system-ui, sans-serif",
  });
}

const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [lastValidChart, setLastValidChart] = useState<string | null>(null);

  useEffect(() => {
    const validateAndRender = async () => {
      if (!ref.current || !chart) return;
      
      try {
        // Only attempt to render if the syntax is valid
        await mermaid.parse(chart);
        setLastValidChart(chart);
        
        ref.current.removeAttribute("data-processed");
        const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).substring(2, 11)}`, chart);
        
        // Final check before updating DOM as this is async
        const currentRef = ref.current;
        if (currentRef) {
          currentRef.innerHTML = svg;
        }
      } catch (err) {
        // If syntax is invalid (e.g. during streaming), we either show the last valid one 
        // or just stay in the current state without showing error bombs.
        console.log("Mermaid parsing (expected during stream):", err);
      }
    };

    validateAndRender();
  }, [chart]);

  return <div ref={ref} className="mermaid flex justify-center py-4 bg-muted/10 rounded-lg my-4 overflow-x-auto min-h-[100px] border border-dashed border-primary/10" />;
};

function AiPageContent() {
  const searchParams = useSearchParams();
  const txIdParam = searchParams.get("txId") || "";
  
  const { body: httpRequestBody, response: httpResponse } = useHttpStore();
  const { environments, activeEnvId } = useConfigStore();
  const activeEnv = environments.find(e => e.id === activeEnvId) || environments[0];
  
  // Persistent state from AiStore
  const { 
    analysisText, 
    status, 
    targetTxId, 
    displayLogs,
    setAnalysisText, 
    setStatus, 
    setTargetTxId, 
    setDisplayLogs,
    reset 
  } = useAiStore();
  
  const [txId, setTxId] = useState(targetTxId || txIdParam);
  const [requestBody, setRequestBody] = useState<string | null>(httpRequestBody);
  const [response, setResponse] = useState<any>(httpResponse);
  const [highlightedLogId, setHighlightedLogId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const logsBySource = useLogStore((s) => s.logsBySource);

  // Sync txId when targetTxId changes (e.g. from store or navigation)
  useEffect(() => {
    if (targetTxId && !txId) {
      setTxId(targetTxId);
    }
  }, [targetTxId, txId]);

  // Sync HTTP context if it becomes available later
  useEffect(() => {
    if (httpRequestBody && !requestBody) setRequestBody(httpRequestBody);
    if (httpResponse && !response) setResponse(httpResponse);
  }, [httpRequestBody, httpResponse, requestBody, response]);

  // Function to scroll to specific log
  const scrollToLog = (idOrIndex: string | number) => {
    const finalId = typeof idOrIndex === 'number' ? `log-idx-${idOrIndex}` : idOrIndex;
    const element = document.getElementById(finalId);
    if (element) {
      // Find the nearest radix scroll viewport for precise control
      const viewport = element.closest('[data-radix-scroll-area-viewport]');
      
      if (viewport) {
        // GOLD STANDARD: Calculate precise relative offset
        const parentRect = viewport.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const relativeTop = elementRect.top - parentRect.top + viewport.scrollTop;
        
        viewport.scrollTo({ 
          top: relativeTop - 100, // Leave some buffer at top
          behavior: 'smooth' 
        });
        
        // Brief highlight effect on the target
        setHighlightedLogId(finalId);
        setTimeout(() => setHighlightedLogId(null), 3000);
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Function to fetch logs only (new decouple flow)
  const fetchLogsOnly = async (idToFetch = txId) => {
    if (!idToFetch) {
      toast.error("请输入追踪标识 (ACCEPT ID / TX ID)");
      return;
    }
    
    setStatus("fetching");
    setDisplayLogs([]);
    
    try {
      // Logic from runAnalysis but without AI analysis trigger
      const logRes = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryKey: idToFetch.trim(),
          sources: ["bssp", "sac", "te"],
          env: activeEnv?.name || "test",
          hosts: activeEnv?.hosts || {},
        }),
      });
      
      const logData = await logRes.json();
      const fetchedLogs = logData.logs || [];
      
      const processedLogs = fetchedLogs.map((l: any, i: number) => ({
        ...l,
        index: i + 1,
        id: l.id || `log-${i}-${Date.now()}` // Ensure unique ID
      }));
      setDisplayLogs(processedLogs);
      
      if (fetchedLogs.length > 0) {
        toast.success(`负载成功: ${fetchedLogs.length} 条日志`);
        setStatus("idle"); // Set to idle after fetching logs
      } else {
        toast.error("未查询到相关日志");
        setStatus("error");
        setAnalysisText("未找到该流水号的相关日志，请确认流水号是否正确。");
      }
    } catch (error: any) {
      console.error("Fetch logs failed:", error);
      toast.error("查询日志失败，请稍后重试");
      setStatus("error");
      setAnalysisText("加载日志失败: " + error.message);
    }
  };

  const runAnalysis = async () => {
    if (!txId) {
      toast.error("请输入追踪标识 (ACCEPT ID / TX ID)");
      return;
    }

    setTargetTxId(txId.trim());
    setStatus("fetching");
    setAnalysisText("");
    setDisplayLogs([]);

    try {
      const logRes = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryKey: txId.trim(),
          sources: ["bssp", "sac", "te"],
          env: activeEnv?.name || "test",
          hosts: activeEnv?.hosts || {},
        }),
      });
      
      const logData = await logRes.json();
      const fetchedLogs = logData.logs || [];
      
      const processedLogs = fetchedLogs.map((l: any, i: number) => ({
        ...l,
        index: i + 1,
        id: l.id || `log-${i}-${Date.now()}` // Ensure unique ID
      }));
      setDisplayLogs(processedLogs);
      
      if (fetchedLogs.length === 0) {
        setStatus("error");
        setAnalysisText("未找到该流水号的相关日志，无法进行分析。");
        return;
      }
      
      // Trigger AI Analysis
      performAiAnalysis(processedLogs);
    } catch (err: any) {
      console.error("Deep analysis failed:", err);
      setStatus("error");
      setAnalysisText("深度分析失败，请检查后端服务: " + err.message);
    }
  };

  const stopAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus("stopped");
      toast.info("分析已停止");
    }
  };

  const performAiAnalysis = async (targetLogs: any[]) => {
    setStatus("analyzing");
    setAnalysisText("");
    
    // Create new abort controller
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const aiRes = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          apiKey: useConfigStore.getState().aiApiKey,
          model: useConfigStore.getState().aiModel,
          baseUrl: useConfigStore.getState().aiBaseUrl,
          requestBody: requestBody || "", 
          responseBody: response?.body || "",
          logs: logsBySource && Object.keys(logsBySource).length > 0 ? logsBySource : { merged: targetLogs },
          userQuestion: "请对该业务流水进行完整的全链路追踪分析，指出性能瓶颈、逻辑冲突或潜在的错误节点。请在分析时，涉及到具体日志行的地方，务必使用 [Log #N] 的格式进行引用（例如 [Log #10]），以便系统自动关联跳转。",
        }),
      });

      if (!aiRes.ok || !aiRes.body) throw new Error("AI analysis failed");

      const reader = aiRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process buffer by lines
        const lines = buffer.split("\n");
        // Keep the last partial line in the buffer
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              setStatus("done");
              break;
            }
            
            try {
              const partial = JSON.parse(data);
              const content = partial.choices?.[0]?.delta?.content || partial.content || "";
              if (content) {
                setAnalysisText((prev: string) => prev + content);
              }
            } catch (e) {
              // If it's not valid JSON but starts with data:, it might be raw text
              if (data.startsWith("{") || data.startsWith("[")) {
                // Fragmented JSON
                console.warn("Fragmented or invalid JSON in SSE line:", data);
              } else {
                setAnalysisText((prev: string) => prev + data);
              }
            }
          } else if (!trimmed.startsWith(":") && !trimmed.startsWith("{")) {
            // Some proxies don't use 'data: ' prefix
            setAnalysisText((prev: string) => prev + trimmed);
          }
        }
      }
      setStatus("done");
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Analysis aborted by user');
        return;
      }
      console.error(err);
      setStatus("error");
      setAnalysisText("分析过程中出现错误: " + err.message);
    } finally {
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    // Sync initial txId if param exists but store is empty
    if (txIdParam && !targetTxId) {
      setTargetTxId(txIdParam);
      setTxId(txIdParam);
    }
    
    const existingLogs = Object.values(logsBySource).flat();
    const currentId = txIdParam || targetTxId;
    
    if (existingLogs.length > 0) {
      setDisplayLogs(existingLogs);
      // Only auto-run if we are in idle state or it's a new ID
      if (status === "idle" || (currentId && currentId !== targetTxId)) {
        runAnalysis();
      }
    } else if (currentId) {
      runAnalysis();
    }
  }, [txIdParam, targetTxId]); // Reactive to params

  return (
    <div className="flex flex-col h-screen max-h-screen gap-4 p-6 overflow-hidden bg-background">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-primary/20 hover:bg-primary/5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">AI 智能全链路追踪分析</h1>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">根据业务流水号快速关联全链路日志并进行深度下钻分析</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-muted/30 border border-muted-foreground/10 rounded-full">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase">{activeEnv?.name || "测试环境"}</span>
          </div>
          <Button 
            onClick={() => runAnalysis()} 
            disabled={status === "fetching" || status === "analyzing"}
            className="gap-2 shadow-lg shadow-primary/20 h-10 px-6 font-bold"
          >
            {status === "analyzing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            {(status === "idle" || status === "done" || status === "stopped" || status === "error") ? "开始深度分析" : "分析中..."}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left: Input & Log Summary with ScrollArea */}
        <div className="flex flex-col h-full min-h-0 overflow-hidden border-r pr-4 -mr-4 lg:border-none lg:pr-0 lg:mr-0">
          <ScrollArea className="flex-1 h-full">
            <div className="flex flex-col gap-4 pb-8">
              <Card className="shrink-0 border-primary/10 bg-card/50">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold tracking-tight">分析对象与上下文</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        业务/技术追踪标识 (ACCEPT ID / TX ID)
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1 group">
                          <Input 
                            value={txId}
                            onChange={(e) => setTxId(e.target.value)}
                            placeholder="输入事务 ID..."
                            className="bg-background/50 h-11 pr-10 border-primary/20 focus-visible:ring-primary/30 transition-all font-mono text-sm"
                            onKeyDown={(e) => e.key === "Enter" && fetchLogsOnly()}
                          />
                          {txId && (
                            <button 
                              onClick={() => {
                                setTxId("");
                                reset();
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="default" 
                          onClick={() => fetchLogsOnly()}
                          disabled={status === "fetching" || status === "analyzing"}
                          className="h-11 px-4 border-primary/20 hover:bg-primary/5 text-xs font-semibold shrink-0"
                        >
                          {status === "fetching" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-[9px] text-muted-foreground/60 italic">提示：先点击搜索图标加载日志，确认无误后再点击右上角进行深度分析。</p>
                    </div>

                    {/* Request/Response Context */}
                    <div className="space-y-2">
                      <details className="group border rounded-md bg-muted/20 overflow-hidden">
                        <summary className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-muted/40 transition-colors list-none">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                            <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                            分析请求报文 (Request Body)
                          </span>
                          {requestBody ? <Badge variant="secondary" className="text-[8px] h-4">XML/JSON</Badge> : <span className="text-[10px] opacity-30">无</span>}
                        </summary>
                        <div className="px-3 pb-3 pt-1">
                          <pre className="text-[10px] font-mono bg-background/50 p-2 rounded border overflow-x-auto max-h-[150px] whitespace-pre-wrap break-all opacity-80">
                            {requestBody || "无请求报文"}
                          </pre>
                        </div>
                      </details>

                      <details className="group border rounded-md bg-muted/20 overflow-hidden">
                        <summary className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-muted/40 transition-colors list-none">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                            <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                            分析响应报文 (Response Body)
                          </span>
                          {response?.body ? <Badge variant="secondary" className="text-[8px] h-4">XML/JSON</Badge> : <span className="text-[10px] opacity-30">无</span>}
                        </summary>
                        <div className="px-3 pb-3 pt-1">
                          <pre className="text-[10px] font-mono bg-background/50 p-2 rounded border overflow-x-auto max-h-[150px] whitespace-pre-wrap break-all opacity-80">
                            {response?.body || "无响应报文"}
                          </pre>
                        </div>
                      </details>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-md bg-muted/40 border flex flex-col items-center justify-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">日志条数</span>
                        <span className="text-sm font-bold">{displayLogs.length}</span>
                      </div>
                      <div className="p-2 rounded-md bg-muted/40 border flex flex-col items-center justify-center">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">异常统计</span>
                        <span className="text-sm font-bold text-red-500">
                          {displayLogs.filter(l => l.level === "ERROR").length}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/10 bg-card/50 overflow-hidden">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b pb-2">
                  <CardTitle className="text-sm font-semibold tracking-tight">多维日志时间轴</CardTitle>
                  <Badge variant="secondary" className="text-[9px] font-mono tracking-tighter bg-primary/10 text-primary border-none">Analysis Spine</Badge>
                </CardHeader>
                <CardContent className="px-0 pb-0 pt-0 relative overflow-hidden">
                  <div className="relative py-2 pr-2">
                    {/* Main Axis Line - Bold Black - Precisely at 36px */}
                    <div className="absolute left-[36px] top-0 bottom-0 w-[1.5px] bg-black/90 z-0" />

                    {displayLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-2">
                        <ListRestart className="h-10 w-10" />
                        <p className="text-xs text-center px-4">等待数据加载 (输入 Tx ID 并点击搜索)...</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {displayLogs.map((log, i) => {
                          const logId = `log-idx-${i + 1}`;
                          const isHighlighted = highlightedLogId === logId;

                          return (
                            <div 
                              key={logId}
                              id={logId}
                              className={cn(
                                "relative py-1.5 transition-all duration-300 rounded-md group",
                                isHighlighted ? "bg-primary/5 shadow-[0_0_10px_rgba(var(--primary),0.05)] scale-[1.005] z-10" : "hover:bg-muted/20"
                              )}
                            >
                              {/* Oval Bubble on axis - Centered on 36px axis point */}
                              <div className="absolute left-0 w-[72px] flex items-center justify-center top-1.5 z-10">
                                <div className={cn(
                                  "flex items-center justify-center px-1.5 py-0.5 rounded-full border bg-background shadow-sm min-w-[32px] transition-colors h-[18px]",
                                  isHighlighted ? "border-primary bg-primary text-primary-foreground" : "border-black/20"
                                )}>
                                  <span className="text-[8px] font-bold whitespace-nowrap tracking-tighter leading-none">
                                    #{i + 1}
                                    <span className="mx-0.5 opacity-40 font-normal">|</span>
                                    {log.sourceLabel}
                                  </span>
                                </div>
                              </div>

                              {/* Log Content - Only log text, no metadata first line */}
                              <div className="pl-[80px] pr-4">
                                <div className={cn(
                                  "text-[11px] leading-[1.4] break-words font-medium font-mono transition-colors",
                                  log.level === 'ERROR' ? 'text-red-500/80' : 'text-foreground/75',
                                  isHighlighted ? 'text-foreground' : ''
                                )}>
                                  {log.content || log.message}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        {/* Right: AI Analysis Window */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden border-primary/20 shadow-xl shadow-primary/5 bg-gradient-to-br from-background via-background to-primary/5 min-h-0">
          <CardHeader className="py-4 px-6 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-3 w-3 rounded-full",
                status === "analyzing" ? "bg-primary animate-pulse" : "bg-green-500"
              )} />
              <CardTitle className="text-base font-bold tracking-tight">AI 诊断报告 (AI Diagnostic Report)</CardTitle>
            </div>
            {status === "analyzing" ? (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={stopAnalysis}
                className="h-7 px-3 gap-1.5 text-[10px] font-bold shadow-lg shadow-destructive/20"
              >
                <SquareStop className="h-3 w-3" />
                停止分析
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 relative">
            {status === "fetching" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 z-20 backdrop-blur-[2px]">
                <Activity className="h-12 w-12 text-primary animate-[pulse_1s_infinite]" />
                <p className="mt-4 text-sm font-medium animate-pulse">正在从各节点拉取全链路日志...</p>
              </div>
            ) : (
              <ScrollArea className="h-full w-full">
                <div className="p-8 prose prose-sm dark:prose-invert max-w-none">
                  {analysisText ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-mermaid/.exec(className || "");
                          return !inline && match ? (
                            <Mermaid chart={String(children).replace(/\n$/, "")} />
                          ) : (
                            <code className={cn(className, "bg-muted/50 rounded px-1")} {...props}>
                              {children}
                            </code>
                          );
                        },
                        p: ({ children }) => {
                          const processContent = (content: any): any => {
                            if (typeof content === 'string') {
                              // Enhanced regex for citation formats: [Log #N], [Log N], [N], [#N], 第N行, 日志 #N
                              const citationRegex = /((?:\[(?:Log\s?#?|#|日志\s?#?|第)?\d+\])|(?:日志\s?#?\d+)|(?:第\d+行))/gi;
                              const parts = content.split(citationRegex);
                              
                              return parts.map((part, i) => {
                                const numMatch = part.match(/(\d+)/);
                                const index = numMatch ? parseInt(numMatch[1], 10) : null;
                                
                                if (index && !isNaN(index)) {
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => scrollToLog(index)}
                                      className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded border border-primary/20 bg-primary/5 text-primary text-[10px] font-bold hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shadow-sm active:scale-95 group/pill align-baseline"
                                      title={`跳转到日志 #${index}`}
                                    >
                                      <ExternalLink className="w-2.5 h-2.5 mr-1 opacity-60 group-hover/pill:opacity-100" />
                                      {part}
                                    </button>
                                  );
                                }
                                return part;
                              });
                            }

                            if (React.isValidElement(content)) {
                              return React.cloneElement(content as any, {
                                children: React.Children.map((content.props as any).children, processContent)
                              });
                            }

                            return content;
                          };

                          return <p className="leading-relaxed">{React.Children.map(children, processContent)}</p>;
                        }
                      }}
                    >
                      {analysisText}
                    </ReactMarkdown>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 opacity-20 text-center gap-4">
                      <Activity className="h-16 w-16" />
                      <div>
                        <p className="text-xl font-bold uppercase tracking-[0.2em]">Ready For Analysis</p>
                        <p className="text-sm mt-1">输入流水号通过搜索图标加载日志，并点击右上角按钮开始深度链路诊断</p>
                      </div>
                    </div>
                  )}
                  {status === "analyzing" && (
                    <div className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
                  )}
                </div>
              </ScrollArea>
            )}
            
            {(status === "idle" || status === "done") && analysisText && (
              <div className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/50 rounded-lg text-green-500 text-[10px] font-bold shadow-2xl animate-in fade-in zoom-in duration-500 backdrop-blur-md">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>分析已完成 (Analysis Completed)</span>
              </div>
            )}
            
            {status === "stopped" && (
              <div className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/50 rounded-lg text-yellow-500 text-[10px] font-bold shadow-2xl animate-in fade-in zoom-in duration-500 backdrop-blur-md">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>分析已中断 (Analysis Aborted)</span>
              </div>
            )}
            
            {status === "error" && (
              <div className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-[10px] font-bold shadow-2xl animate-in fade-in zoom-in duration-500 backdrop-blur-md">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>分析过程出错 (Analysis Error)</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AiPage() {
  return (
    <Suspense fallback={<div className="p-10 flex items-center justify-center h-full">Loading...</div>}>
      <AiPageContent />
    </Suspense>
  );
}
