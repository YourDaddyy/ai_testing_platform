"use client";

import { useState } from "react";
import { useConfigStore, Environment } from "@/store/useConfigStore";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Copy, Download, Edit2, Eye, EyeOff, Loader2, Plus, Save, Terminal, Trash2, Upload, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MERGED_HOSTS } from "@/lib/mergedHosts";

export default function ConfigPage() {
  const {
    environments,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    deleteServiceKey,
    renameServiceKey,
    aiApiKey,
    setAiApiKey,
    aiModel,
    setAiModel,
    aiBaseUrl,
    setAiBaseUrl,
    activeEnvId,
    setActiveEnvId,
    resetToDefaults,
    importEnvironments,
    addServiceScript,
    updateServiceScript,
    deleteServiceScript
  } = useConfigStore();

  const [activeTab, setActiveTab] = useState<"envs" | "ai">("envs");
  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    environments[0]?.id || ""
  );
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [testingNodes, setTestingNodes] = useState<Record<string, boolean>>({});
  const [newServiceName, setNewServiceName] = useState("");
  const [editingServiceKey, setEditingServiceKey] = useState<string | null>(null);
  const [editServiceValue, setEditServiceValue] = useState("");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editNodeValue, setEditNodeValue] = useState("");
  const [showAiApiKey, setShowAiApiKey] = useState(false);


  const selectedEnv = environments.find((e) => e.id === selectedEnvId);

  const handleAddEnv = () => {
    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      name: "新环境",
      hosts: {
        bssp: [{ sshHost: "10.47.213.184", label: "BSSP" }],
        sac: [{ sshHost: "10.47.213.26", label: "SAC" }],
        te: [{ sshHost: "10.46.180.92", label: "TE" }],
      },
    };
    addEnvironment(newEnv);
    setSelectedEnvId(newEnv.id);
  };

  const handleDuplicateEnv = (envToCopy: Environment) => {
    const newEnv: Environment = {
      ...envToCopy,
      id: `env-${Date.now()}`,
      name: `${envToCopy.name} (副本)`,
    };
    addEnvironment(newEnv);
    setSelectedEnvId(newEnv.id);
  };

  const handleDeleteEnv = (id: string) => {
    if (environments.length <= 1) {
      toast.error("必须保留至少一个环境");
      return;
    }
    deleteEnvironment(id);
    if (selectedEnvId === id) {
      setSelectedEnvId(environments.find((e) => e.id !== id)?.id || "");
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(environments, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'crm_ai_config.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("配置已导出");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          importEnvironments(json);
          toast.success("配置导入成功");
          if (json.length > 0) setSelectedEnvId(json[0].id);
        } else {
          toast.error("格式错误: 应为数组");
        }
      } catch (err) {
        toast.error("导入失败: 解析 JSON 出错");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleTestSsh = async (node: any, envId: string, hostKey: string, nodeIdx: number) => {
    const testKey = `${envId}-${hostKey}-${nodeIdx}`;
    if (!node.sshHost || !node.sshUsername) {
      toast.error("请先填写 SSH 主机 IP 和用户名");
      return;
    }

    setTestingNodes(prev => ({ ...prev, [testKey]: true }));
    try {
      const res = await fetch("/api/test-ssh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: node.sshHost,
          port: node.sshPort || 22,
          username: node.sshUsername,
          password: node.sshPassword || "",
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`连接测试成功: ${node.label || node.sshHost}`);
      } else {
        toast.error(`连接测试失败: ${data.error || "未知原因"}`);
      }
    } catch (err: any) {
      toast.error(`连接测试出错: ${err.message}`);
    } finally {
      setTestingNodes(prev => ({ ...prev, [testKey]: false }));
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8 relative z-10 w-full">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">系统中心配置</h1>
            <p className="text-muted-foreground mt-2">管理工作环境、SSH 节点以及 AI 核心参数</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 mb-8 border-b pb-4">
            <button
              onClick={() => setActiveTab("envs")}
              className={cn(
                "text-sm font-semibold pb-2 px-1 transition-all relative",
                activeTab === "envs" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              工作环境与节点
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={cn(
                "text-sm font-semibold pb-2 px-1 transition-all relative",
                activeTab === "ai" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              AI 核心配置
            </button>
          </div>

          {activeTab === "envs" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-foreground">环境与主机管理</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  管理多套测试、预发布环境。在这里设置的 URL 会全局应用于 HTTP 测试工具。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                
                {/* Environment List */}
                <Card className="md:col-span-1 shadow-sm/50 border-muted">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">环境列表</CardTitle>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddEnv}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 space-y-1">
                    {environments.map((env) => (
                      <div
                        key={env.id}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md text-sm cursor-pointer transition-all group/env-item relative mb-0.5",
                          selectedEnvId === env.id
                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setSelectedEnvId(env.id)}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 leading-none pt-0.5">
                          <span className="truncate">{env.name}</span>
                          {activeEnvId === env.id && (
                            <Badge 
                              variant={selectedEnvId === env.id ? "outline" : "secondary"} 
                              className={cn(
                                "text-[10px] px-1 h-3.5",
                                selectedEnvId === env.id && "bg-primary-foreground/20 text-primary-foreground border-transparent"
                              )}
                            >
                              默认
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-5 w-5 opacity-0 group-hover/env-item:opacity-100 transition-opacity shrink-0 ml-1",
                            selectedEnvId === env.id ? "text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" : "text-destructive hover:bg-destructive/10 hover:text-destructive"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEnv(env.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Env Editor */}
                <div className="md:col-span-3 space-y-4">
                  {selectedEnv ? (
                    <Card className="shadow-md border-muted/60 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none" />
                      
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">编辑环境配置</CardTitle>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 h-8"
                              onClick={handleExport}
                            >
                              <Download className="h-4 w-4" />
                              导出
                            </Button>
                            <div className="relative">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 h-8"
                                onClick={() => document.getElementById('import-input')?.click()}
                              >
                                <Upload className="h-4 w-4" />
                                导入
                              </Button>
                              <input
                                id="import-input"
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleImport}
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="bg-destructive/10 hover:bg-destructive/20 text-destructive h-8 border-destructive/20"
                              onClick={() => {
                                if (confirm("确定要恢复系统默认配置吗？这将重置所有环境设置。")) {
                                  resetToDefaults();
                                  // Sync local ID with store's new default ID
                                  const firstEnv = useConfigStore.getState().environments[0];
                                  if (firstEnv) setSelectedEnvId(firstEnv.id);
                                  toast.success("已恢复默认配置");
                                }
                              }}
                            >
                              恢复默认
                            </Button>
                            <Button
                              size="sm"
                              className="gap-2 h-8"
                              onClick={handleAddEnv}
                            >
                              <Plus className="h-4 w-4" />
                              新建环境
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => handleDuplicateEnv(selectedEnv)}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1.5" /> 复制
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            环境名称
                          </label>
                          <Input
                            value={selectedEnv.name}
                            onChange={(e) =>
                              updateEnvironment(selectedEnv.id, { name: e.target.value })
                            }
                            className="font-medium bg-background/50"
                          />
                        </div>

                        <div className="space-y-6 pt-2">
                          <div className="flex items-center justify-between border-b pb-2 gap-4">
                            <h4 className="text-sm font-semibold shrink-0">主机节点与 SSH 配置</h4>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="text-[10px] font-normal text-muted-foreground uppercase hidden md:inline">支持多节点并行聚合</span>
                              <Input
                                value={newServiceName}
                                onChange={(e) => setNewServiceName(e.target.value)}
                                placeholder="新服务名, 如 oracle"
                                className="h-6 text-xs w-28 font-mono"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && newServiceName.trim()) {
                                    const key = newServiceName.trim().toLowerCase().replace(/\s+/g, "_");
                                    updateEnvironment(selectedEnv.id, { hosts: { ...selectedEnv.hosts, [key]: [] } });
                                    setNewServiceName("");
                                  }
                                }}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px] gap-1 border-dashed hover:bg-primary/5 hover:text-primary"
                                onClick={() => {
                                  if (!newServiceName.trim()) return;
                                  const key = newServiceName.trim().toLowerCase().replace(/\s+/g, "_");
                                  updateEnvironment(selectedEnv.id, { hosts: { ...selectedEnv.hosts, [key]: [] } });
                                  setNewServiceName("");
                                }}
                              >
                                <Plus className="h-3 w-3" /> 添加服务
                              </Button>
                            </div>
                          </div>

                          {Object.keys(selectedEnv.hosts).map((hostKey) => {
                            const nodes = selectedEnv.hosts[hostKey] || [];
                            
                            return (
                              <div key={hostKey} className="border rounded-lg bg-card overflow-hidden shadow-sm">
                                <div className="px-4 py-2 bg-muted/30 border-b flex items-center justify-between group/service-head">
                                  <div className="flex items-center gap-2">
                                    {editingServiceKey === hostKey ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          value={editServiceValue}
                                          onChange={(e) => setEditServiceValue(e.target.value)}
                                          onBlur={() => {
                                            if (editServiceValue && editServiceValue !== hostKey) {
                                              renameServiceKey(selectedEnv.id, hostKey, editServiceValue);
                                            }
                                            setEditingServiceKey(null);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              if (editServiceValue && editServiceValue !== hostKey) {
                                                renameServiceKey(selectedEnv.id, hostKey, editServiceValue);
                                              }
                                              setEditingServiceKey(null);
                                            }
                                            if (e.key === "Escape") setEditingServiceKey(null);
                                          }}
                                          autoFocus
                                          className="h-6 py-0 px-2 text-xs font-semibold w-32 font-mono"
                                        />
                                        <span className="text-xs font-semibold text-muted-foreground">服务</span>
                                      </div>
                                    ) : (
                                      <h5 
                                        className="text-sm font-semibold capitalize text-foreground flex items-center gap-2 cursor-pointer hover:text-primary transition-colors pr-8 relative"
                                        onClick={() => {
                                          setEditingServiceKey(hostKey);
                                          setEditServiceValue(hostKey);
                                        }}
                                      >
                                        {hostKey} 服务
                                        <Edit2 className="h-3 w-3 opacity-0 group-hover/service-head:opacity-100 transition-opacity absolute right-0" />
                                      </h5>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 px-2 text-[10px] gap-1 border-dashed hover:bg-primary/5 hover:text-primary transition-colors"
                                      onClick={() => {
                                        const newNodes = [...nodes, { label: `Node-${nodes.length + 1}`, url: "", sshHost: "", sshUsername: "" }];
                                        const newNodeId = `${hostKey}-${nodes.length}`;
                                        setExpandedNodes(prev => [...prev, newNodeId]);
                                        updateEnvironment(selectedEnv.id, {
                                          hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                        });
                                      }}
                                    >
                                      <Plus className="h-3 w-3" /> 添加节点
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover/service-head:opacity-100 transition-opacity"
                                      onClick={() => {
                                        if (confirm(`确定删除 ${hostKey.toUpperCase()} 服务类别？这将清除该服务的所有节点配置。`)) {
                                          deleteServiceKey(selectedEnv.id, hostKey);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  {nodes.map((node, nodeIdx) => {
                                    const nodeId = `${hostKey}-${nodeIdx}`;
                                    const isExpanded = expandedNodes.includes(nodeId);
                                    
                                    return (
                                      <div key={nodeIdx} className={cn(
                                        "relative border rounded-lg transition-all duration-200 overflow-hidden",
                                        isExpanded ? "bg-background/80 shadow-sm border-primary/20" : "bg-background/40 hover:bg-background/60 border-muted/50"
                                      )}>
                                        {/* Collapsible Header */}
                                        <div 
                                          className="flex items-center justify-between p-3 cursor-pointer select-none group/node-head"
                                          onClick={() => {
                                            setExpandedNodes(prev => 
                                              prev.includes(nodeId) 
                                                ? prev.filter(id => id !== nodeId) 
                                                : [...prev, nodeId]
                                            );
                                          }}
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className={cn(
                                              "p-1 rounded-sm transition-transform duration-200",
                                              isExpanded ? "rotate-180 text-primary" : "text-muted-foreground"
                                            )}>
                                              <ChevronDown className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                              {editingNodeId === nodeId ? (
                                                <Input
                                                  value={editNodeValue}
                                                  onChange={(e) => setEditNodeValue(e.target.value)}
                                                  onBlur={() => {
                                                    const newNodes = [...nodes];
                                                    newNodes[nodeIdx] = { ...node, label: editNodeValue };
                                                    updateEnvironment(selectedEnv.id, {
                                                      hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                                    });
                                                    setEditingNodeId(null);
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                      const newNodes = [...nodes];
                                                      newNodes[nodeIdx] = { ...node, label: editNodeValue };
                                                      updateEnvironment(selectedEnv.id, {
                                                        hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                                      });
                                                      setEditingNodeId(null);
                                                    }
                                                    if (e.key === "Escape") setEditingNodeId(null);
                                                  }}
                                                  autoFocus
                                                  className="h-6 py-0 px-2 text-xs font-semibold w-32 border-primary/50 focus:ring-1 focus:ring-primary"
                                                />
                                              ) : (
                                                <span 
                                                  className="text-sm font-semibold hover:text-primary transition-colors cursor-text"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingNodeId(nodeId);
                                                    setEditNodeValue(node.label || "");
                                                  }}
                                                >
                                                  {node.label || "未命名节点"}
                                                </span>
                                              )}
                                              {node.sshHost && (
                                                <Badge variant="secondary" className="text-[10px] py-0 h-4 font-mono font-normal opacity-70">
                                                  {node.sshHost}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              disabled={testingNodes[`${selectedEnv.id}-${hostKey}-${nodeIdx}`]}
                                              className="h-7 px-2 text-[10px] gap-1.5 border-dashed hover:border-primary hover:text-primary transition-all"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleTestSsh(node, selectedEnv.id, hostKey, nodeIdx);
                                              }}
                                            >
                                              {testingNodes[`${selectedEnv.id}-${hostKey}-${nodeIdx}`] ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <Zap className="h-3 w-3" />
                                              )}
                                              测试连接
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/node-head:opacity-100 transition-opacity"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const newNodes = nodes.filter((_, i) => i !== nodeIdx);
                                                updateEnvironment(selectedEnv.id, {
                                                  hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                                });
                                              }}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </div>

                                        {/* Collapsible Body */}
                                        <div className={cn(
                                          "transition-all duration-300 ease-in-out",
                                          isExpanded ? "max-h-[1000px] opacity-100 border-t border-dashed" : "max-h-0 opacity-0 pointer-events-none"
                                        )}>
                                          <div className="p-4 space-y-4">

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1 border-t border-dashed mt-2">
                                              <div className="space-y-1.5">
                                                <label className="text-[10px] font-medium uppercase text-muted-foreground">SSH 目标 IP</label>
                                                <Input
                                                  value={node.sshHost || ""}
                                                  placeholder="10.x.x.x"
                                                  onChange={(e) => {
                                                    const newNodes = [...nodes];
                                                    newNodes[nodeIdx] = { ...node, sshHost: e.target.value };
                                                    updateEnvironment(selectedEnv.id, {
                                                      hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                                    });
                                                  }}
                                                  className="font-mono text-xs h-8 bg-background/50 focus:bg-background transition-colors"
                                                />
                                              </div>
                                              <div className="space-y-1.5">
                                                <label className="text-[10px] font-medium uppercase text-muted-foreground">SSH 端口</label>
                                                <Input
                                                  type="number"
                                                  value={node.sshPort || 22}
                                                  placeholder="22"
                                                  onChange={(e) => {
                                                    const newNodes = [...nodes];
                                                    newNodes[nodeIdx] = { ...node, sshPort: parseInt(e.target.value) || 22 };
                                                    updateEnvironment(selectedEnv.id, {
                                                      hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                                    });
                                                  }}
                                                  className="font-mono text-xs h-8 bg-background/50 focus:bg-background transition-colors"
                                                />
                                              </div>
                                              <div className="space-y-1.5">
                                                <label className="text-[10px] font-medium uppercase text-muted-foreground">SSH 用户</label>
                                                <div className="flex gap-2">
                                                  <Input
                                                    value={node.sshUsername || ""}
                                                    placeholder="root"
                                                    onChange={(e) => {
                                                      const newNodes = [...nodes];
                                                      newNodes[nodeIdx] = { ...node, sshUsername: e.target.value };
                                                      updateEnvironment(selectedEnv.id, {
                                                        hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                                      });
                                                    }}
                                                    className="font-mono text-xs h-8 bg-background/50 focus:bg-background transition-colors flex-1"
                                                  />
                                                  
                                                  <Popover>
                                                    <PopoverTrigger
                                                      className={cn(
                                                        buttonVariants({ variant: "outline", size: "sm" }),
                                                        "w-[32px] h-8 px-0 bg-muted/50 border-dashed"
                                                      )}
                                                      title="快捷导入配置"
                                                    >
                                                      <Search className="h-3 w-3 opacity-50" />
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0" align="end">
                                                      <Command filter={(value, search) => {
                                                        if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                                                        return 0;
                                                      }}>
                                                        <CommandInput placeholder="搜索主机名或 IP..." className="h-8 text-xs" />
                                                        <CommandList className="max-h-[300px]">
                                                          <CommandEmpty className="py-2 px-4 text-xs">未找到匹配主机</CommandEmpty>
                                                          {Object.entries(MERGED_HOSTS).map(([category, categoryHosts]) => (
                                                            <CommandGroup key={category} heading={category} className="text-[10px] text-muted-foreground">
                                                              {categoryHosts.map((h, i) => (
                                                                <CommandItem
                                                                  key={`${category}-${i}`}
                                                                  value={`${h.name} ${h.host} ${h.user}`}
                                                                  onSelect={() => {
                                                                    const newNodes = [...nodes];
                                                                    newNodes[nodeIdx] = {
                                                                      ...node,
                                                                      sshHost: h.host,
                                                                      sshPort: h.port || 22,
                                                                      sshUsername: h.user || "",
                                                                      sshPassword: h.pass || node.sshPassword,
                                                                    };
                                                                    updateEnvironment(selectedEnv.id, {
                                                                      hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                                                    });
                                                                  }}
                                                                  className="text-xs flex flex-col items-start gap-0.5 py-1.5 cursor-pointer"
                                                                >
                                                                  <span className="font-medium text-foreground">{h.name}</span>
                                                                  <span className="text-[10px] text-muted-foreground font-mono">{h.host}:{h.port || 22} ({h.user})</span>
                                                                </CommandItem>
                                                              ))}
                                                            </CommandGroup>
                                                          ))}
                                                        </CommandList>
                                                      </Command>
                                                    </PopoverContent>
                                                  </Popover>
                                                </div>
                                              </div>
                                              <div className="space-y-1.5">
                                                <label className="text-[10px] font-medium uppercase text-muted-foreground">SSH 密码 (选填)</label>
                                                <Input
                                                  type="password"
                                                  value={node.sshPassword || ""}
                                                  placeholder="******"
                                                  onChange={(e) => {
                                                    const newNodes = [...nodes];
                                                    newNodes[nodeIdx] = { ...node, sshPassword: e.target.value };
                                                    updateEnvironment(selectedEnv.id, {
                                                      hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                                    });
                                                  }}
                                                  className="font-mono text-xs h-8 bg-background/50 focus:bg-background transition-colors"
                                                />
                                              </div>
                                            </div>

                                            {/* Log Paths */}
                                            <div className="pt-3 border-t border-dashed mt-3">
                                              <div className="flex items-center justify-between mb-2">
                                                <label className="text-[10px] font-medium uppercase text-muted-foreground">
                                                  日志路径 <span className="normal-case font-normal opacity-60">(覆盖默认路径)</span>
                                                </label>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-5 px-2 text-[10px] gap-1 border-dashed"
                                                  onClick={() => {
                                                    const newNodes = [...nodes];
                                                    newNodes[nodeIdx] = {
                                                      ...node,
                                                      logPaths: [...(node.logPaths || []), ""],
                                                    };
                                                    updateEnvironment(selectedEnv.id, {
                                                      hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                                    });
                                                  }}
                                                >
                                                  <Plus className="h-3 w-3" /> 添加路径
                                                </Button>
                                              </div>
                                              <div className="space-y-1.5">
                                                {(node.logPaths || []).length === 0 ? (
                                                  <p className="text-[10px] text-muted-foreground italic">
                                                    未设置自定义路径，将使用服务默认路径
                                                  </p>
                                                ) : (
                                                  (node.logPaths || []).map((logPath, pathIdx) => (
                                                    <div key={pathIdx} className="flex gap-1.5 items-center">
                                                      <Input
                                                        value={logPath}
                                                        onChange={(e) => {
                                                          const newNodes = [...nodes];
                                                          const paths = [...(newNodes[nodeIdx].logPaths || [])];
                                                          paths[pathIdx] = e.target.value;
                                                          newNodes[nodeIdx] = { ...newNodes[nodeIdx], logPaths: paths };
                                                          updateEnvironment(selectedEnv.id, {
                                                            hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                                          });
                                                        }}
                                                        placeholder="/path/to/log/file.log 或 /dir/log*"
                                                        className="flex-1 font-mono text-xs h-7 bg-background/50"
                                                      />
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                          const newNodes = [...nodes];
                                                          const paths = (newNodes[nodeIdx].logPaths || []).filter((_, i) => i !== pathIdx);
                                                          newNodes[nodeIdx] = { ...newNodes[nodeIdx], logPaths: paths };
                                                          updateEnvironment(selectedEnv.id, {
                                                            hosts: { ...selectedEnv.hosts, [hostKey]: newNodes }
                                                          });
                                                        }}
                                                      >
                                                        <Trash2 className="h-3 w-3" />
                                                      </Button>
                                                    </div>
                                                  ))
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium border border-blue-500/20 flex items-start gap-2">
                          <Save className="h-4 w-4 shrink-0 mt-0.5" />
                          <p>
                            系统会自动保存配置。在顶部导航栏切换环境后，HTTP 工具发送请求时会自动读取对应环境的主机地址。
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-muted text-muted-foreground bg-muted/10">
                      请选择或新建一个环境
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-foreground">AI 深度分析配置</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  配置用于智能日志分析的大语言模型接口。支持官方 Claude 或 OpenAI 兼容格式 (如 GLM-5)。
                </p>
              </div>

              <Card className="shadow-md border-muted/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none" />
                <CardHeader>
                  <CardTitle>模型接口设置</CardTitle>
                  <CardDescription>配置大模型接口以支持全链路日志分析。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      API Base URL
                    </label>
                    <Input
                      placeholder="https://api.anthropic.com/v1/messages"
                      value={aiBaseUrl}
                      onChange={(e) => setAiBaseUrl(e.target.value)}
                      className="font-mono bg-background/50"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Anthropic 官方地址或本地、第三方提供的 OpenAI 兼容接口地址。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      API Key / Auth Token
                    </label>
                    <div className="relative group/key">
                      <Input
                        type={showAiApiKey ? "text" : "password"}
                        placeholder="sk-..."
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        className="font-mono bg-background/50 pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowAiApiKey(!showAiApiKey)}
                        title={showAiApiKey ? "隐藏密钥" : "显示密钥"}
                      >
                        {showAiApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      如果填入 `no-key` 将不发送 Authorization 头。密钥仅保存在本地。
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      模型引擎 (Model)
                    </label>
                    <Input
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="font-mono bg-background/50"
                      placeholder="claude-3-5-sonnet-20241022 或 glm-5"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      根据 Base URL 对应的服务提供商填入具体的模型标识符。
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
