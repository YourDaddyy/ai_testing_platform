"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useConfigStore } from "@/store/useConfigStore";
import { useLogStore } from "@/store/useLogStore";
import { useHttpStore } from "@/store/useHttpStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  BrainCircuit, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2,
  ListRestart,
  ArrowLeft
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

function AiPageContent() {
  const searchParams = useSearchParams();
  const txIdParam = searchParams.get("txId") || "";
  
  const logsBySource = useLogStore((s) => s.logsBySource);
  const { body: requestBody, response } = useHttpStore();
  
  const [txId, setTxId] = useState(txIdParam);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [displayLogs, setDisplayLogs] = useState<any[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "analyzing" | "error">("idle");
  const { environments } = useConfigStore();
  const activeEnv = environments[0]; // Default to first env for simplicity in trace

  const runAnalysis = async (forceRefetch = false) => {
    // If we have logs in store and not forcing refetch, use them
    const existingLogs = Object.values(logsBySource).flat();
    
    if (existingLogs.length > 0 && !forceRefetch) {
      setDisplayLogs(existingLogs);
      performAiAnalysis(existingLogs);
      return;
    }

    if (!txId.trim()) return;
    
    setStatus("loading");
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
      setDisplayLogs(fetchedLogs);
      
      if (fetchedLogs.length === 0) {
        setStatus("error");
        setAnalysisText("未找到该流水号的相关日志，请确认流水号是否正确。");
        return;
      }
      performAiAnalysis(fetchedLogs);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setAnalysisText("加载日志失败: " + err.message);
    }
  };

  const performAiAnalysis = async (targetLogs: any[]) => {
    setStatus("analyzing");
    setAnalysisText("");
    try {
      const aiRes = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestBody: requestBody || "", 
          responseBody: response?.body || "",
          logs: logsBySource && Object.keys(logsBySource).length > 0 ? logsBySource : { merged: targetLogs },
          userQuestion: "请对该业务流水进行完整的全链路追踪分析，指出性能瓶颈、逻辑冲突或潜在的错误节点。",
        }),
      });

      if (!aiRes.ok || !aiRes.body) throw new Error("AI analysis failed");

      const reader = aiRes.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        // SSE format: data: "text"
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const content = JSON.parse(data);
              setAnalysisText((prev) => prev + content);
            } catch (e) {
              // Not JSON, just append
              setAnalysisText((prev) => prev + data);
            }
          }
        }
      }
      setStatus("idle");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setAnalysisText("分析过程中出现错误: " + err.message);
    }
  };

  useEffect(() => {
    // If we have logs in the store, auto-trigger analysis on mount
    const existingLogs = Object.values(logsBySource).flat();
    if (existingLogs.length > 0) {
      runAnalysis();
    } else if (txIdParam) {
      runAnalysis();
    }
  }, []); // Only on mount

  return (
    <div className="flex flex-col h-full gap-4 p-6 overflow-hidden bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BrainCircuit className="h-6 w-6 text-primary" />
              AI 智能全链路追踪分析
            </h1>
            <p className="text-xs text-muted-foreground">根据业务流水号自动聚合全链路日志并进行深度下钻分析</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20">
            {activeEnv?.name || "Default Env"}
          </Badge>
          <Button 
            onClick={() => runAnalysis(true)} 
            disabled={status === "loading" || status === "analyzing"}
            className="gap-2 shadow-lg shadow-primary/20"
          >
            <Activity className="h-4 w-4" />
            {status === "idle" ? "开始深度分析" : "分析中..."}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-0">
        {/* Left: Input & Log Summary */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <Card className="shrink-0 border-primary/10 bg-card/50">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold tracking-tight">分析对象</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">业务流水号 / Transaction ID</label>
                  <input
                    className="w-full bg-accent/20 border-accent/30 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background transition-all"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    placeholder="输入需要分析的流水号..."
                    onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-md bg-muted/40 border flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">日志条数</span>
                    <span className="text-lg font-bold">{displayLogs.length}</span>
                  </div>
                  <div className="p-2 rounded-md bg-muted/40 border flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">异常统计</span>
                    <span className="text-lg font-bold text-red-500">
                      {displayLogs.filter(l => l.level === "ERROR").length}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col overflow-hidden border-primary/10 bg-card/50">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold tracking-tight">多维日志时间轴</CardTitle>
              <Badge variant="secondary" className="text-[10px] font-mono">Real-time Data</Badge>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden px-0 pb-0">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-3 pt-2">
                  {displayLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-2">
                      <ListRestart className="h-10 w-10" />
                      <p className="text-xs">等待数据加载...</p>
                    </div>
                  ) : (
                    displayLogs.map((log, i) => (
                      <div key={log.id || i} className="group relative pl-5 border-l border-muted-foreground/20 pb-4 last:pb-0">
                        <div className={`absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background ring-2 ${
                          log.level === 'ERROR' ? 'bg-red-500 ring-red-500/20' : 
                          log.level === 'WARN' ? 'bg-yellow-500 ring-yellow-500/20' : 
                          'bg-primary ring-primary/20'
                        }`} />
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "N/A"}
                            </span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1 uppercase scale-90 origin-left">
                              {log.sourceLabel || log.fileName || "LOG"}
                            </Badge>
                          </div>
                          <p className="text-[11px] leading-relaxed break-all opacity-80 group-hover:opacity-100 transition-opacity">
                            {log.content || log.message}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: AI Analysis Window */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden border-primary/20 shadow-xl shadow-primary/5 bg-gradient-to-br from-background via-background to-primary/5">
          <CardHeader className="py-4 px-6 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <CardTitle className="text-base font-bold tracking-tight">AI 诊断报告 (AI Diagnostic Report)</CardTitle>
            </div>
            {status === "analyzing" && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                </div>
                <span className="text-[10px] font-bold text-primary uppercase">Thinking...</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 relative">
            {status === "loading" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 z-20 backdrop-blur-[2px]">
                <div className="relative">
                  <Activity className="h-12 w-12 text-primary animate-[pulse_1s_infinite]" />
                  <BrainCircuit className="absolute inset-0 h-10 w-10 text-primary/40 blur-sm animate-pulse" />
                </div>
                <p className="mt-4 text-sm font-medium animate-pulse">正在整理全链路日志数据...</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-8 prose prose-sm dark:prose-invert max-w-none">
                  {analysisText ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {analysisText}
                    </ReactMarkdown>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 opacity-20 text-center gap-4">
                      <Activity className="h-16 w-16" />
                      <div>
                        <p className="text-xl font-bold uppercase tracking-[0.2em]">Ready For Analysis</p>
                        <p className="text-sm mt-1">输入流水号并点击上面按钮开始全自动诊断</p>
                      </div>
                    </div>
                  )}
                  {status === "analyzing" && (
                    <div className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
                  )}
                </div>
              </ScrollArea>
            )}
            
            {status === "error" && (
              <div className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-red-950/20 border border-red-500/50 rounded-lg text-red-500 text-xs animate-in slide-in-from-bottom-4">
                <AlertCircle className="h-4 w-4" />
                <span>分析失败，请重试</span>
              </div>
            )}
            
            {status === "idle" && analysisText && (
              <div className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-green-950/20 border border-green-500/50 rounded-lg text-green-500 text-xs shadow-2xl animate-in fade-in zoom-in duration-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>诊断已完成，建议根据报告排查相关节点</span>
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
