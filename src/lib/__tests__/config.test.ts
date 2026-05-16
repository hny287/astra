import { describe, it, expect } from "vitest";
import {
  configSchema,
  nodeConfigSchema,
  SCAN_DEPTH_OUTPUT_TOKENS,
  THINKING_DEPTH_BUDGET,
  mergeNodeOverrides,
  type ScanConfig,
} from "../config";

const validNodeConfig = {
  provider: "cloud-ollama",
  model: "glm-5.1:cloud",
  rulesTokenBudget: 2000,
};

const validConfig: ScanConfig = {
  providers: {
    "cloud-ollama": {
      baseURL: "https://api.ohmyllama.com",
      apiKeyEnv: "OLLAMA_API_KEY",
      models: {
        "glm-5.1:cloud": {
          inputTokenLimit: 131072,
          outputTokenLimit: 8192,
          contextWindow: 131072,
          temperature: 0.2,
          supportsThinking: true,
          maxThinkingTokens: 16384,
        },
      },
    },
  },
  scan: {
    nodes: {
      discover: { ...validNodeConfig } as any,
      gitIngest: { ...validNodeConfig } as any,
      gitDiagram: { ...validNodeConfig } as any,
      toolScan: { ...validNodeConfig } as any,
      deepScan: { ...validNodeConfig } as any,
      crossFile: { ...validNodeConfig } as any,
    },
  } as any,
};

describe("nodeConfigSchema", () => {
  it("applies defaults for missing optional fields", () => {
    const result = nodeConfigSchema.parse(validNodeConfig);
    expect(result.temperature).toBe(0.2);
    expect(result.thinkingDepth).toBe("medium");
    expect(result.thinkingBudget).toBeNull();
    expect(result.topP).toBe(0.9);
    expect(result.topK).toBeNull();
    expect(result.frequencyPenalty).toBe(0);
    expect(result.presencePenalty).toBe(0);
    expect(result.stopSequences).toEqual([]);
    expect(result.scanDepth).toBe("standard");
    expect(result.maxFileBytes).toBe(51200);
    expect(result.maxOutputTokens).toBe(4096);
    expect(result.contextWindowOverride).toBeNull();
    expect(result.instructions).toBe("");
    expect(result.tools).toEqual([]);
    expect(result.knowledge).toEqual([]);
    expect(result.maxRetries).toBe(3);
    expect(result.retryBackoffMs).toBe(2000);
    expect(result.timeoutMs).toBe(120000);
    expect(result.concurrency).toBeUndefined();
  });

  it("rejects invalid provider", () => {
    const result = nodeConfigSchema.safeParse({
      ...validNodeConfig,
      provider: "invalid-provider",
    });
    expect(result.success).toBe(false);
  });
});

describe("configSchema", () => {
  it("parses valid config with all fields", () => {
    const result = configSchema.parse(validConfig);
    expect(result.providers["cloud-ollama"].models["glm-5.1:cloud"].inputTokenLimit).toBe(131072);
    expect(result.scan.nodes.discover.provider).toBe("cloud-ollama");
  });

  it("loads the default scan.config.json", () => {
    const fs = require("fs");
    const path = require("path");
    const raw = fs.readFileSync(
      path.resolve(__dirname, "../../../scan.config.json"),
      "utf-8"
    );
    const result = configSchema.parse(JSON.parse(raw));
    expect(result.providers["cloud-ollama"].baseURL).toBe(
      "https://api.ohmyllama.com"
    );
    expect(result.providers["anthropic"].models["claude-sonnet-4-20250514"].maxThinkingTokens).toBe(16000);
    expect(result.scan.nodes.deepScan.concurrency).toBe(5);
  });
});

describe("mergeNodeOverrides", () => {
  it("merges partial overrides per node", () => {
    const merged = mergeNodeOverrides(validConfig, {
      discover: { temperature: 0.5, model: "kimi-k2.6:cloud" },
      crossFile: { timeoutMs: 300000 },
    });
    expect(merged.scan.nodes.discover.temperature).toBe(0.5);
    expect(merged.scan.nodes.discover.model).toBe("kimi-k2.6:cloud");
    expect(merged.scan.nodes.discover.provider).toBe("cloud-ollama");
    expect(merged.scan.nodes.crossFile.timeoutMs).toBe(300000);
    expect(merged.scan.nodes.crossFile.provider).toBe("cloud-ollama");
    expect(merged.scan.nodes.deepScan.model).toBe("glm-5.1:cloud");
  });

  it("returns unchanged base when no overrides provided", () => {
    const merged = mergeNodeOverrides(validConfig, {});
    expect(merged).toEqual(validConfig);
  });
});

describe("SCAN_DEPTH_OUTPUT_TOKENS", () => {
  it("has all scan depth keys", () => {
    expect(Object.keys(SCAN_DEPTH_OUTPUT_TOKENS)).toEqual([
      "quick",
      "standard",
      "deep",
      "exhaustive",
    ]);
    expect(SCAN_DEPTH_OUTPUT_TOKENS.quick).toBe(500);
    expect(SCAN_DEPTH_OUTPUT_TOKENS.standard).toBe(2048);
    expect(SCAN_DEPTH_OUTPUT_TOKENS.deep).toBe(4096);
    expect(SCAN_DEPTH_OUTPUT_TOKENS.exhaustive).toBe(8192);
  });
});

describe("THINKING_DEPTH_BUDGET", () => {
  it("has all thinking depth keys", () => {
    expect(Object.keys(THINKING_DEPTH_BUDGET)).toEqual([
      "none",
      "low",
      "medium",
      "high",
      "max",
    ]);
    expect(THINKING_DEPTH_BUDGET.none).toBe(0);
    expect(THINKING_DEPTH_BUDGET.low).toBe(1024);
    expect(THINKING_DEPTH_BUDGET.medium).toBe(2048);
    expect(THINKING_DEPTH_BUDGET.high).toBe(4096);
    expect(THINKING_DEPTH_BUDGET.max).toBe(8192);
  });
});