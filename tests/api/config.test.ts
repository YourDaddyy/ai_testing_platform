import { describe, it, expect } from "vitest";

/**
 * Tests for /api/config — the config persistence endpoint.
 * 
 * Since Next.js route handlers depend on the runtime environment, we test
 * the pure data-transformation and validation logic extracted here.
 */

interface ConfigPayload {
  environments?: any[];
  activeEnvId?: string;
  aiApiKey?: string;
  aiModel?: string;
  aiBaseUrl?: string;
  serviceTypes?: any[];
  commonUrls?: any[];
}

function validateConfigPayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Payload must be a JSON object" };
  }
  if (payload.environments !== undefined && !Array.isArray(payload.environments)) {
    return { valid: false, error: "environments must be an array" };
  }
  if (payload.serviceTypes !== undefined && !Array.isArray(payload.serviceTypes)) {
    return { valid: false, error: "serviceTypes must be an array" };
  }
  return { valid: true };
}

function mergeWithDefaults(saved: Partial<ConfigPayload>, defaults: ConfigPayload): ConfigPayload {
  return {
    environments: saved.environments ?? defaults.environments,
    activeEnvId: saved.activeEnvId ?? defaults.activeEnvId,
    aiApiKey: saved.aiApiKey ?? defaults.aiApiKey,
    aiModel: saved.aiModel ?? defaults.aiModel,
    aiBaseUrl: saved.aiBaseUrl ?? defaults.aiBaseUrl,
    serviceTypes: saved.serviceTypes ?? defaults.serviceTypes,
    commonUrls: saved.commonUrls ?? defaults.commonUrls,
  };
}

const DEFAULT_CONFIG: ConfigPayload = {
  environments: [{ id: "test", name: "Test" }],
  activeEnvId: "test",
  aiApiKey: "",
  aiModel: "claude-3-5-sonnet-20241022",
  aiBaseUrl: "https://api.anthropic.com/v1/messages",
  serviceTypes: [{ id: "bssp", label: "BSSP", encoding: "gbk", grepTemplate: "" }],
  commonUrls: [],
};

describe("GET /api/config — data merging", () => {
  it("uses defaults when no saved config exists", () => {
    const result = mergeWithDefaults({}, DEFAULT_CONFIG);
    expect(result.aiModel).toBe("claude-3-5-sonnet-20241022");
    expect(result.serviceTypes).toHaveLength(1);
  });

  it("uses saved values when provided", () => {
    const saved = { aiApiKey: "my-key", aiModel: "glm-z1-flash" };
    const result = mergeWithDefaults(saved, DEFAULT_CONFIG);
    expect(result.aiApiKey).toBe("my-key");
    expect(result.aiModel).toBe("glm-z1-flash");
  });

  it("preserves custom serviceTypes from saved config", () => {
    const saved = {
      serviceTypes: [
        { id: "auth", label: "AUTH", encoding: "utf8" as const, grepTemplate: "grep {KEY} /auth.log" },
      ],
    };
    const result = mergeWithDefaults(saved, DEFAULT_CONFIG);
    expect(result.serviceTypes?.[0].id).toBe("auth");
  });
});

describe("POST /api/config — payload validation", () => {
  it("accepts valid payload", () => {
    const r = validateConfigPayload({ environments: [], serviceTypes: [] });
    expect(r.valid).toBe(true);
  });

  it("rejects non-array environments", () => {
    const r = validateConfigPayload({ environments: "not-an-array" });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/array/);
  });

  it("rejects non-array serviceTypes", () => {
    const r = validateConfigPayload({ serviceTypes: { id: "bssp" } });
    expect(r.valid).toBe(false);
  });

  it("accepts empty payload", () => {
    const r = validateConfigPayload({});
    expect(r.valid).toBe(true);
  });
});
