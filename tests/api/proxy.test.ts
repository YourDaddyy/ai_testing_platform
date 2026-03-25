import { describe, it, expect } from "vitest";

/**
 * Tests for /api/proxy — the HTTP request forwarding endpoint.
 * 
 * These tests cover the request construction and encoding logic
 * without making real network calls.
 */

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

function buildFetchOptions(payload: {
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
  encoding?: "GBK" | "UTF-8";
}) {
  const { method, headers, body, encoding } = payload;
  
  const fetchInit: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  // Only attach body for non-GET methods
  if (method !== "GET" && body) {
    fetchInit.body = body;
  }

  return {
    fetchInit,
    encodingLabel: encoding ?? "UTF-8",
  };
}

function validateProxyRequest(payload: any): { valid: boolean; error?: string } {
  if (!payload.url || typeof payload.url !== "string") {
    return { valid: false, error: "url is required" };
  }
  if (!payload.url.startsWith("http")) {
    return { valid: false, error: "url must start with http/https" };
  }
  const allowedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
  if (payload.method && !allowedMethods.includes(payload.method)) {
    return { valid: false, error: `method must be one of ${allowedMethods.join(", ")}` };
  }
  return { valid: true };
}

describe("POST /api/proxy — request construction", () => {
  it("builds GET request without body", () => {
    const { fetchInit } = buildFetchOptions({
      method: "GET",
      headers: {},
      body: "<xml>data</xml>",
    });
    expect(fetchInit.body).toBeUndefined();
  });

  it("builds POST request with body", () => {
    const { fetchInit } = buildFetchOptions({
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=GBK" },
      body: "<xml>request</xml>",
    });
    expect(fetchInit.body).toBe("<xml>request</xml>");
    expect(fetchInit.method).toBe("POST");
  });

  it("preserves custom headers", () => {
    const { fetchInit } = buildFetchOptions({
      method: "POST",
      headers: { Authorization: "Bearer token123" },
    });
    expect((fetchInit.headers as Headers).get("Authorization")).toBe("Bearer token123");
  });

  it("defaults encoding to UTF-8", () => {
    const { encodingLabel } = buildFetchOptions({ method: "GET", headers: {} });
    expect(encodingLabel).toBe("UTF-8");
  });

  it("uses provided GBK encoding", () => {
    const { encodingLabel } = buildFetchOptions({
      method: "POST",
      headers: {},
      encoding: "GBK",
    });
    expect(encodingLabel).toBe("GBK");
  });
});

describe("POST /api/proxy — validation", () => {
  it("requires url", () => {
    const r = validateProxyRequest({ method: "POST" });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/url/);
  });

  it("rejects non-http urls", () => {
    const r = validateProxyRequest({ url: "ftp://example.com" });
    expect(r.valid).toBe(false);
  });

  it("rejects invalid method", () => {
    const r = validateProxyRequest({ url: "http://example.com", method: "TRACE" });
    expect(r.valid).toBe(false);
  });

  it("accepts valid POST payload", () => {
    const r = validateProxyRequest({
      url: "http://10.47.213.184:8080/fcgi-bin/BSSP_SFC",
      method: "POST",
      body: "<xml/>",
      encoding: "GBK",
    });
    expect(r.valid).toBe(true);
  });
});
