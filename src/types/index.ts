// Core types for the HTTP tool and request history

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface HttpHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface HttpRequest {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: HttpHeader[];
  body: string;
  encoding: "UTF-8" | "GBK";
  createdAt: string;
  updatedAt: string;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number; // ms
  size: number; // bytes
}

// Environments / host config types

export interface HostConfig {
  bssp: string;
  sac: string;
  cmc: string;
  container: string;
  te: string;
  oracle: string;
}

export interface Environment {
  id: string;
  name: string;
  color: string; // e.g. "green", "blue", "orange"
  hosts: HostConfig;
}

export interface AppConfig {
  environments: Environment[];
  activeEnvId: string;
  aiApiKey: string;
  aiModel: string;
}

// Log types

export interface LogEntry {
  id: string;
  timestamp: string;
  source: keyof HostConfig; // which host this log came from
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
  raw: string;
}

export interface LogQueryParams {
  txId?: string;
  interfaceName?: string;
  sources: (keyof HostConfig)[];
  env: "test" | "stage";
  startTime?: string;
  endTime?: string;
}

// AI analysis types

export interface CallChainNode {
  node: string;
  action: string;
  status: "ok" | "error" | "warn";
  duration?: string;
  detail?: string;
}

export interface ErrorInfo {
  code: string;
  message: string;
  location: string;
  stack?: string;
}

export interface AiAnalysisResult {
  call_chain: CallChainNode[];
  errors: ErrorInfo[];
  root_cause: string;
  summary: string;
}
