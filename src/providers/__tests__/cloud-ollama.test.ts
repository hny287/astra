import { describe, it, expect } from "vitest";
import { CloudOllamaProvider } from "../cloud-ollama";

describe("CloudOllamaProvider", () => {
  const provider = new CloudOllamaProvider({
    baseURL: "https://api.ohmyllama.com",
    model: "glm-5.1:cloud",
    apiKeyEnv: "OLLAMA_API_KEY",
    modelInfo: {
      inputTokenLimit: 131072,
      outputTokenLimit: 8192,
      contextWindow: 131072,
      temperature: 0.2,
      supportsThinking: true,
      maxThinkingTokens: 16384,
    },
  });

  it("has id 'cloud-ollama'", () => {
    expect(provider.id).toBe("cloud-ollama");
  });

  it("getModelInfo returns correct values", () => {
    const info = provider.getModelInfo();
    expect(info.id).toBe("glm-5.1:cloud");
    expect(info.inputTokenLimit).toBe(131072);
    expect(info.outputTokenLimit).toBe(8192);
    expect(info.contextWindow).toBe(131072);
    expect(info.supportsThinking).toBe(true);
    expect(info.maxThinkingTokens).toBe(16384);
    expect(info.supportsSystemPrompt).toBe(true);
  });

  it("estimateTokens returns chars/4 rounded up", () => {
    expect(provider.estimateTokens("")).toBe(0);
    expect(provider.estimateTokens("a")).toBe(1);
    expect(provider.estimateTokens("abcd")).toBe(1);
    expect(provider.estimateTokens("abcde")).toBe(2);
    expect(provider.estimateTokens("Hello, world!")).toBe(4);
  });
});