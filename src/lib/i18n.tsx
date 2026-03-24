"use client";

import React, { createContext, useContext, useState } from "react";

export type Lang = "zh" | "en";

const translations = {
  zh: {
    // Navigation
    nav_http: "HTTP 请求工具",
    nav_logs: "全局日志聚合",
    nav_ai: "AI 链路分析",
    nav_remote: "服务管理中心",
    nav_config: "配置管理",
    // Header
    header_env_active: "当前环境",
    // HTTP Tool
    http_send: "发送",
    http_save: "保存",
    http_history: "历史记录",
    http_body: "请求体",
    http_headers: "请求头",
    http_request_name: "请求名称",
    http_request_name_ph: "例：CS_NGModifyGroupProductCloud",
    http_format: "格式化",
    http_add_header: "添加请求头",
    http_no_headers: "暂无请求头，点击\"添加请求头\"新增",
    http_response_empty: "发送请求后，响应将显示在此处",
    http_sending: "发送中...",
    // Log page
    log_title: "全局日志聚合",
    log_query_key: "查询关键字",
    log_query_key_ph: "输入流水号或接口名 (如: CS_NGModifyGroupProductCloud)",
    log_select_sources: "选择日志来源",
    log_env: "环境",
    log_env_test: "测试环境",
    log_env_stage: "预发布环境",
    log_search: "查询日志",
    log_searching: "查询中...",
    log_timeline: "日志时间线",
    log_total: "共",
    log_entries: "条日志",
    log_search_summary: "聚合查询结果",
    log_services_monitored: "个服务正在运行",
    log_records_found: "条记录已发现",
    log_node_activity: "服务节点活动",
    log_connected: "已连接",
    log_ready_to_aggregate: "准备聚合核心日志流",
    log_identity: "流水号",
    // Config
    config_title: "配置管理",
    config_env_name: "环境名称",
    config_hosts: "主机配置",
    config_save: "保存配置",
    config_add_env: "新增环境",
    config_ai_key: "AI API Key",
    config_ai_model: "AI 模型",
  },
  en: {
    // Navigation
    nav_http: "HTTP Request Tool",
    nav_logs: "Global Log Aggregation",
    nav_ai: "AI Trace Analysis",
    nav_remote: "Service Control",
    nav_config: "Configuration",
    // Header
    header_env_active: "Active Env",
    // HTTP Tool
    http_send: "Send",
    http_save: "Save",
    http_history: "History",
    http_body: "Body",
    http_headers: "Headers",
    http_request_name: "Request Name",
    http_request_name_ph: "e.g. CS_NGModifyGroupProductCloud",
    http_format: "Format",
    http_add_header: "Add Header",
    http_no_headers: 'No headers. Click "Add Header" to add one.',
    http_response_empty: "Send a request to see the response here",
    http_sending: "Sending...",
    // Log page
    log_title: "Global Log Aggregation",
    log_query_key: "Query Keyword",
    log_query_key_ph: "Enter trace ID or interface name (e.g. CS_NGModifyGroupProductCloud)",
    log_select_sources: "Select Log Sources",
    log_env: "Environment",
    log_env_test: "Test",
    log_env_stage: "Stage",
    log_search: "Query Logs",
    log_searching: "Querying...",
    log_timeline: "Log Timeline",
    log_total: "Total",
    log_entries: "entries",
    log_search_summary: "Aggregated Results",
    log_services_monitored: "SERVICES MONITORED",
    log_records_found: "RECORDS FOUND",
    log_node_activity: "Service Interface Activity",
    log_connected: "CONNECTED",
    log_ready_to_aggregate: "READY TO AGGREGATE CORE LOG STREAMS",
    log_identity: "IDENTITY",
    // Config
    config_title: "Configuration",
    config_env_name: "Environment Name",
    config_hosts: "Host Configuration",
    config_save: "Save Config",
    config_add_env: "Add Environment",
    config_ai_key: "AI API Key",
    config_ai_model: "AI Model",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["zh"];

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "zh",
  setLang: () => {},
  t: (key) => key,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");
  const t = (key: TranslationKey): string => translations[lang][key] as string;
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
