import type { AIProvider, AIRequest, AIResponse, ModelInfo } from "./base";

export class AzureAIFoundryProvider implements AIProvider {
  readonly id = "azure-ai-foundry";

  async send(_request: AIRequest): Promise<AIResponse> {
    throw new Error("Azure AI Foundry provider not yet implemented");
  }

  estimateTokens(_text: string): number {
    return 0;
  }

  getModelInfo(): ModelInfo {
    return {
      id: "azure-ai-foundry",
      inputTokenLimit: 0,
      outputTokenLimit: 0,
      contextWindow: 0,
      supportsSystemPrompt: false,
      supportsThinking: false,
      maxThinkingTokens: 0,
    };
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    return { connected: false, latencyMs: 0, error: "Azure AI Foundry provider not yet implemented" };
  }
}