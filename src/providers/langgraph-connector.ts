import type { AIProvider, AIRequest, AIResponse, ModelInfo } from "./base";

export class LangGraphConnectorProvider implements AIProvider {
  readonly id = "langgraph";

  async send(_request: AIRequest): Promise<AIResponse> {
    throw new Error("LangGraph Connectors provider not yet implemented");
  }

  estimateTokens(_text: string): number {
    return 0;
  }

  getModelInfo(): ModelInfo {
    return {
      id: "langgraph",
      inputTokenLimit: 0,
      outputTokenLimit: 0,
      contextWindow: 0,
      supportsSystemPrompt: false,
      supportsThinking: false,
      maxThinkingTokens: 0,
    };
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    return { connected: false, latencyMs: 0, error: "LangGraph Connectors provider not yet implemented" };
  }
}