"use client";

import { useState, useEffect } from "react";
import { useConfigStore, ServiceScript, Environment } from "@/store/useConfigStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Terminal, 
  Play, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Cpu, 
  Server,
  Cloud,
  ChevronRight,
  RefreshCw,
  Search,
  Plus,
  Edit2,
  Trash2,
  Settings,
  XCircle,
  Square
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RemoteControlPage() {
  const { 
    environments, 
    activeEnvId, 
    isLoaded,
    loadConfig,
    addServiceScript,
    updateServiceScript,
    deleteServiceScript,
    remoteControlState,
    setRemoteControlState
  } = useConfigStore();
  
  const [selectedEnvId, setSelectedEnvId] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>(""); 
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [scriptParams, setScriptParams] = useState<string[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<Record<string, {
    loading: boolean;
    success?: boolean;
    output?: string;
    error?: string;
    exitCode?: number;
  }>>({});
  
  // Management State
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [newScript, setNewScript] = useState({
    label: "",
    path: "",
    description: "",
    serviceType: "general",
    params: ""
  });

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Effect 1: Initial state loading from store
  useEffect(() => {
    if (isLoaded) {
      if (remoteControlState.lastEnvId) {
        setSelectedEnvId(remoteControlState.lastEnvId);
      } else if (activeEnvId && !selectedEnvId) {
        setSelectedEnvId(activeEnvId);
      }
      
      if (remoteControlState.lastServiceGroup) {
        setSelectedService(remoteControlState.lastServiceGroup);
      }
      if (remoteControlState.lastScriptId) {
        setSelectedScriptId(remoteControlState.lastScriptId);
      }
      if (remoteControlState.lastParams?.length) {
        setScriptParams(remoteControlState.lastParams);
      }
    }
    // Only run this once when the config is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Effect 2: Persist selections whenever they change (with a guard to avoid initial loop)
  useEffect(() => {
    if (isLoaded && selectedEnvId) {
      setRemoteControlState({
        lastEnvId: selectedEnvId,
        lastServiceGroup: selectedService,
        lastScriptId: selectedScriptId,
        lastParams: scriptParams
      });
    }
  }, [selectedEnvId, selectedService, selectedScriptId, scriptParams, setRemoteControlState, isLoaded]);

  const selectedEnv = environments.find(e => e.id === (selectedEnvId || activeEnvId));
  
  // Available services for the selector
  const availableServices = selectedEnv ? Object.keys(selectedEnv.hosts) : [];

  const selectedNodes = selectedEnv && selectedService 
    ? (selectedEnv.hosts[selectedService] || []) 
    : [];

  const selectedScript = selectedEnv?.scripts?.find(s => s.id === selectedScriptId);

  useEffect(() => {
    if (selectedScript) {
      setScriptParams(selectedScript.defaultParams || []);
    }
  }, [selectedScript]);

  const handleExecute = async () => {
    if (!selectedNodes.length || !selectedScript) {
      toast.error("请先选择目标服务和脚本");
      return;
    }

    setIsExecuting(true);
    setExecutionResults({});
    const controller = new AbortController();
    setAbortController(controller);

    // Create initial state for all nodes
    const initialResults: any = {};
    selectedNodes.forEach((node, idx) => {
      initialResults[`${node.sshHost}-${idx}`] = { loading: true };
    });
    setExecutionResults(initialResults);

    // Execute concurrently
    const promises = selectedNodes.map(async (node, idx) => {
      const nodeKey = `${node.sshHost}-${idx}`;
      try {
        const response = await fetch("/api/remote-exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            host: node.sshHost,
            port: node.sshPort || 22,
            username: node.sshUsername,
            password: node.sshPassword || "",
            scriptPath: selectedScript.path,
            args: scriptParams,
            usePipedInputs: true
          })
        });

        const data = await response.json();
        setExecutionResults(prev => ({
          ...prev,
          [nodeKey]: {
            loading: false,
            success: data.success,
            output: data.output,
            error: data.error || data.errorOutput,
            exitCode: data.exitCode,
            label: node.label || node.sshHost
          }
        }));
      } catch (err: any) {
        setExecutionResults(prev => ({
          ...prev,
          [nodeKey]: {
            loading: false,
            success: false,
            error: err.message,
            label: node.label || node.sshHost
          }
        }));
      }
    });

    try {
      await Promise.all(promises);
      if (!controller.signal.aborted) {
        toast.success("批量执行完毕");
      }
    } catch (e) {
      // Handle overall promise failure if any (though each map handle its own errors)
    } finally {
      setIsExecuting(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsExecuting(false);
      // Update loading states to stopped
      setExecutionResults(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (next[k].loading) {
            next[k] = { ...next[k], loading: false, error: "已手动停止执行" };
          }
        });
        return next;
      });
      toast.info("已停止后续执行任务");
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

      {/* Sidebar: Control Panel */}
      <div className="w-80 border-r bg-card/40 p-4 flex flex-col gap-6 relative z-10 shrink-0">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            服务管理中心
          </h2>
          <p className="text-xs text-muted-foreground italic">远程脚本执行与服务状态控制</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Select value={selectedEnvId} onValueChange={(v) => { setSelectedEnvId(v || ""); setSelectedService(""); }}>
              <SelectTrigger className="w-full bg-background/50 border-primary/20 hover:border-primary/50 transition-colors">
                <SelectValue placeholder="选择操作环境">
                  {selectedEnv?.name || "选择操作环境"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {environments.map(env => (
                  <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Server className="h-3 w-3" /> 目标操作服务组
            </label>
            <Select 
              value={selectedService} 
              onValueChange={(v) => setSelectedService(v || "")}
              disabled={!availableServices.length}
            >
              <SelectTrigger className="w-full bg-background/50 border-primary/20 hover:border-primary/50 transition-colors">
                <SelectValue placeholder={availableServices.length ? "选择服务类别" : "该环境无节点配置"} />
              </SelectTrigger>
              <SelectContent>
                {availableServices.map(service => (
                  <SelectItem key={service} value={service}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium uppercase">{service}</span>
                      <Badge variant="secondary" className="text-[9px] px-1 h-3.5 ml-1">
                        {(selectedEnv?.hosts[service]?.length || 0)} 节点
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-4 pr-1 scrollbar-thin">
          <div className="flex items-center justify-between sticky top-0 bg-card/40 backdrop-blur-sm py-1 z-10">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Play className="h-3 w-3" /> 可执行管理脚本
            </label>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => {
                setEditingScriptId(null);
                setNewScript({ label: "", path: "", description: "", serviceType: "general", params: "" });
                setIsScriptModalOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {selectedEnv?.scripts?.length ? (
            <div className="space-y-2">
              {selectedEnv.scripts.map(script => (
                <div 
                  key={script.id}
                  onClick={() => setSelectedScriptId(script.id)}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all duration-200 group relative overflow-hidden",
                    selectedScriptId === script.id 
                      ? "bg-primary/10 border-primary shadow-sm" 
                      : "bg-background/40 hover:bg-background/80 border-muted hover:border-primary/30"
                  )}
                >
                  {selectedScriptId === script.id && (
                    <div className="absolute right-2 top-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    </div>
                  )}
                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      "p-1.5 rounded-md transition-colors",
                      selectedScriptId === script.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                    )}>
                      <Terminal className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold truncate leading-tight">{script.label}</h4>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[150px] font-mono opacity-70">
                        {script.path}
                      </p>
                    </div>
                  </div>
                  
                  <div className="absolute right-2 bottom-2 flex gap-1 transform translate-y-8 group-hover:translate-y-0 transition-transform duration-200">
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-primary bg-background/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingScriptId(script.id);
                        setNewScript({
                          label: script.label,
                          path: script.path,
                          description: script.description || "",
                          serviceType: script.serviceType || "general",
                          params: script.defaultParams?.join(", ") || ""
                        });
                        setIsScriptModalOpen(true);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-destructive bg-background/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("确定删除该脚本项目？")) {
                          deleteServiceScript(selectedEnvId || activeEnvId!, script.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 opacity-40 grayscale">
              <RefreshCw className="h-8 w-8 mb-2 animate-spin-slow rotate-12" />
              <p className="text-[10px] text-center px-4">该环境未配置脚本，请先前往“配置”页面添加。</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Execution Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Header Header Header iNet Content */}
        <div className="h-16 border-b bg-card/20 backdrop-blur-md flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm font-bold">远程批量执行终端</h3>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <Server className="h-2.5 w-2.5" /> {selectedService ? `${selectedService.toUpperCase()} (${selectedNodes.length} 节点)` : "未选择节点"}
                 </span>
                 <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/40" />
                 <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <Terminal className="h-2.5 w-2.5" /> {selectedScript?.label || "未选择脚本"}
                 </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isExecuting && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleStop}
                className="text-destructive border-destructive/20 hover:bg-destructive/10 animate-pulse"
              >
                <Square className="h-4 w-4 mr-2 fill-destructive" />
                停止执行
              </Button>
            )}
            
            <Button 
              disabled={!selectedScript || isExecuting} 
              onClick={handleExecute}
              className={cn(
                "shadow-lg transition-all active:scale-95 px-6",
                isExecuting ? "bg-secondary text-secondary-foreground" : "bg-primary hover:bg-primary/90"
              )}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在执行...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  立即运行
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Console & Options */}
        <div className="flex-1 flex overflow-hidden p-6 gap-6 bg-muted/20">
          {/* Left: Params & Config */}
          <div className="w-80 space-y-6 shrink-0 animate-in fade-in slide-in-from-left-4 duration-500">
             <Card className="shadow-sm border-primary/10 bg-card/80">
               <CardHeader className="p-4 border-b">
                 <CardTitle className="text-xs font-bold flex items-center gap-2">
                    <Search className="h-3 w-3 text-primary" /> 执行参数配置
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-4 space-y-4">
                  {selectedScript ? (
                    <>
                      <div className="space-y-4">
                        {selectedScript.defaultParams?.map((p, idx) => (
                           <div key={idx} className="space-y-1.5">
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase opacity-70">
                                参数 {idx + 1}
                              </label>
                              <div className="flex items-center gap-2">
                                <Input 
                                  value={scriptParams[idx] || ""}
                                  onChange={e => {
                                     const newParams = [...scriptParams];
                                     newParams[idx] = e.target.value;
                                     setScriptParams(newParams);
                                  }}
                                  className="h-8 text-xs bg-background/50 border-muted focus:border-primary/50 transition-colors flex-1"
                                  placeholder={`输入参数 ${idx + 1}...`}
                                />
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => {
                                    const newParams = scriptParams.filter((_, i) => i !== idx);
                                    setScriptParams(newParams);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                           </div>
                        ))}
                        
                        {(!selectedScript.defaultParams || selectedScript.defaultParams.length === 0) && (
                          <div className="text-center py-4 opacity-40">
                             <p className="text-[10px]">该脚本无需预设参数</p>
                          </div>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full h-7 text-[10px] border-dashed"
                          onClick={() => setScriptParams(prev => [...prev, ""])}
                        >
                          <Plus className="h-3 w-3 mr-1" /> 追加临时参数
                        </Button>
                      </div>

                      <div className="pt-4 border-t border-dashed space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                           <span className="text-muted-foreground">命令预览:</span>
                        </div>
                        <div className="p-2 bg-black/5 rounded font-mono text-[9px] break-all border overflow-hidden text-muted-foreground">
                           {`./${selectedScript.path.split('/').pop()} ${scriptParams.join(' ')}`}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 opacity-30">
                       <p className="text-[10px]">请先从左侧选择脚本</p>
                    </div>
                  )}
               </CardContent>
             </Card>

             <Card className="bg-primary/5 border-primary/20 shadow-none">
                <CardContent className="p-4 space-y-3">
                   <div className="flex items-center gap-2 text-primary font-bold text-xs">
                      <AlertCircle className="h-3.5 w-3.5" /> 执行说明
                   </div>
                   <p className="text-[10px] text-muted-foreground">
                      该功能将对所选服务组下的<b>所有节点</b>发起并行 SSH 连接。
                   </p>
                   <ul className="text-[10px] space-y-1.5 text-muted-foreground list-disc pl-3">
                      <li>脚本将依次自动填入下方配置的参数作为交互输入。</li>
                      <li>脚本执行超时时间为 30 秒。</li>
                   </ul>
                </CardContent>
             </Card>
          </div>

          {/* Right: Output Output Output Output iNet Console */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Badge variant="outline" className="bg-card text-[10px] font-mono border-primary/30 text-primary px-2">CONSOLE</Badge>
                   {Object.keys(executionResults).length > 0 && (
                     <Badge 
                       variant="outline"
                       className="text-[10px] bg-primary/5 text-primary border-primary/20"
                     >
                        批量执行状态: {isExecuting ? "正在运行" : "已完成"}
                     </Badge>
                   )}
                </div>
                <Button 
                   variant="ghost" 
                   size="sm" 
                   className="h-7 text-[10px] text-muted-foreground"
                   onClick={() => setExecutionResults({})}
                >
                   清除屏幕
                </Button>
             </div>

             <div className="flex-1 bg-zinc-950 rounded-xl border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
                {/* Window buttons */}
                <div className="h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-1.5 shrink-0">
                   <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                   <div className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
                   <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
                </div>
                
                <div className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed selection:bg-primary/30 space-y-6">
                   {Object.entries(executionResults).map(([nodeKey, res]) => (
                     <div key={nodeKey} className="border-l-2 border-white/10 pl-4 py-1">
                        <div className="flex items-center gap-3 mb-2">
                           <Badge variant="outline" className="text-[9px] border-white/20 text-white/60">
                              {/* @ts-ignore */}
                              {res.label || nodeKey}
                           </Badge>
                           {res.loading ? (
                             <span className="text-primary animate-pulse flex items-center gap-1.5">
                                <Loader2 className="h-3 w-3 animate-spin" /> 执行中...
                             </span>
                           ) : res.success ? (
                             <span className="text-green-500 flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3" /> 成功
                             </span>
                           ) : (
                             <span className="text-destructive flex items-center gap-1.5">
                                <AlertCircle className="h-3 w-3" /> 失败 (Code: {res.exitCode})
                             </span>
                           )}
                        </div>

                        {res.error && (
                           <div className="text-destructive py-1 mb-2 opacity-80">
                              Error: {res.error}
                           </div>
                        )}

                        {res.output && (
                           <div className="text-zinc-400 whitespace-pre-wrap bg-white/5 p-2 rounded text-[10px]">
                              {res.output}
                           </div>
                        )}
                     </div>
                   ))}

                   {!isExecuting && Object.keys(executionResults).length === 0 && (
                     <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 pointer-events-none">
                        <Terminal className="h-16 w-16 mb-4" />
                        <p className="text-sm font-bold tracking-widest">READY FOR BATCH EXECUTION</p>
                        <p className="text-[10px] mt-1 italic tracking-tight">WAITING FOR COMMAND INVOCATION...</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Script Management Modal */}
      <Dialog open={isScriptModalOpen} onOpenChange={setIsScriptModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              {editingScriptId ? "修改管理脚本" : "新增管理脚本"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">脚本名称</label>
              <Input 
                value={newScript.label}
                onChange={e => setNewScript(prev => ({ ...prev, label: e.target.value }))}
                placeholder="例: 重启 BSSP" 
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">物理路径</label>
              <Input 
                value={newScript.path}
                onChange={e => setNewScript(prev => ({ ...prev, path: e.target.value }))}
                placeholder="/home/bssp/restart.sh"
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">默认交互输入 (逗号分隔)</label>
              <Input 
                value={newScript.params}
                onChange={e => setNewScript(prev => ({ ...prev, params: e.target.value }))}
                placeholder="all_linux_23, 1"
              />
              <p className="text-[10px] text-muted-foreground italic">按顺序自动填入脚本提示的参数。</p>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">适用服务组 (Key)</label>
              <Select 
                value={newScript.serviceType} 
                onValueChange={v => setNewScript(prev => ({ ...prev, serviceType: v || "general" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">通用 (General)</SelectItem>
                  {availableServices.map(s => (
                    <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsScriptModalOpen(false)}>取消</Button>
            <Button onClick={() => {
              if (!newScript.label || !newScript.path) {
                toast.error("名称和路径不能为空");
                return;
              }
              const scriptData = {
                label: newScript.label,
                path: newScript.path,
                description: newScript.description,
                serviceType: newScript.serviceType,
                defaultParams: newScript.params ? newScript.params.split(",").map(p => p.trim()) : []
              };
              
              if (editingScriptId) {
                updateServiceScript(selectedEnvId || activeEnvId!, editingScriptId, scriptData);
                toast.success("修改成功");
              } else {
                addServiceScript(selectedEnvId || activeEnvId!, scriptData);
                toast.success("添加成功");
              }
              setIsScriptModalOpen(false);
            }}>
              {editingScriptId ? "保存修改" : "确认添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
