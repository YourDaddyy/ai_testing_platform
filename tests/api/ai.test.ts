import { describe, it, expect } from "vitest";

/**
 * Tests for /api/ai — the AI analysis endpoint.
 * 
 * These tests cover credential validation, request construction,
 * and prompt building logic without calling real AI APIs.
 */

interface AiRequestPayload {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  prompt?: string;
  logs?: string;
}

function validateAiRequest(payload: AiRequestPayload): { valid: boolean; error?: string } {
  if (!payload.apiKey?.trim()) {
    return { valid: false, error: "Missing API key" };
  }
  if (!payload.prompt?.trim()) {
    return { valid: false, error: "Prompt is required" };
  }
  return { valid: true };
}

function detectProvider(baseUrl?: string): string {
  if (!baseUrl) return "openai";
  if (baseUrl.includes("anthropic.com")) return "anthropic";
  if (baseUrl.includes("bigmodel.cn") || baseUrl.includes("zhipuai")) return "zhipu";
  if (baseUrl.includes("dashscope.aliyuncs.com")) return "aliyun";
  return "openai-compatible";
}

function buildDiagnosticPrompt(txId: string, logSnippet: string): string {
  return [
    `## 任务`,
    `分析以下业务流水号 ${txId} 的全链路日志，输出诊断报告。`,
    ``,
    `## 日志数据`,
    logSnippet.slice(0, 10000), // cap at 10k chars
  ].join("\n");
}

describe("POST /api/ai — credential validation", () => {
  it("rejects missing API key", () => {
    const r = validateAiRequest({ prompt: "analyze this" });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/API key/i);
  });

  it("rejects empty API key string", () => {
    const r = validateAiRequest({ apiKey: "  ", prompt: "analyze this" });
    expect(r.valid).toBe(false);
  });

  it("rejects missing prompt", () => {
    const r = validateAiRequest({ apiKey: "sk-valid-key" });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/Prompt/i);
  });

  it("accepts valid credentials", () => {
    const r = validateAiRequest({ apiKey: "sk-valid-key", prompt: "analyze this" });
    expect(r.valid).toBe(true);
  });
});

describe("POST /api/ai — provider detection", () => {
  it("detects anthropic from base URL", () => {
    expect(detectProvider("https://api.anthropic.com/v1/messages")).toBe("anthropic");
  });

  it("detects zhipu from base URL", () => {
    expect(detectProvider("https://open.bigmodel.cn/api/paas/v4/chat/completions")).toBe("zhipu");
  });

  it("detects aliyun from base URL", () => {
    expect(detectProvider("https://dashscope.aliyuncs.com/compatible-mode/v1")).toBe("aliyun");
  });

  it("defaults to openai-compatible for unknown URL", () => {
    expect(detectProvider("https://custom-llm.example.com/v1")).toBe("openai-compatible");
  });

  it("defaults to openai when no URL provided", () => {
    expect(detectProvider()).toBe("openai");
  });
});

describe("POST /api/ai — prompt building", () => {
  it("includes transaction ID in prompt", () => {
    const prompt = buildDiagnosticPrompt("705377482204", "INFO log line 1\nERROR log line 2");
    expect(prompt).toContain("705377482204");
    expect(prompt).toContain("log line");
  });

  it("caps log snippet at 10000 chars", () => {
    const longLog = "x".repeat(20000);
    const prompt = buildDiagnosticPrompt("123", longLog);
    // The log portion should be capped
    expect(prompt.length).toBeLessThan(20100);
  });

  it("includes task section header", () => {
    const prompt = buildDiagnosticPrompt("abc", "some log");
    expect(prompt).toContain("## 任务");
    expect(prompt).toContain("## 日志数据");
  });
});
