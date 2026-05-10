import type { ScanConfig } from "../lib/config";

const PROVIDER_NAMES: Record<string, string> = {
  "cloud-ollama": "Cloud Ollama",
  "hosted-ollama": "Hosted Ollama",
  openai: "OpenAI",
  anthropic: "Anthropic",
  bedrock: "AWS Bedrock",
  "azure-ai-foundry": "Azure AI Foundry",
  langgraph: "LangGraph Connectors",
};

interface ProviderListModel {
  id: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  contextWindow: number;
  supportsThinking: boolean;
  maxThinkingTokens: number;
}

interface ProviderListing {
  id: string;
  name: string;
  models: ProviderListModel[];
}

export function listProviders(config: ScanConfig): ProviderListing[] {
  return Object.entries(config.providers).map(([id, providerConfig]) => ({
    id,
    name: PROVIDER_NAMES[id] ?? id,
    models: Object.entries(providerConfig.models).map(([modelId, modelConfig]) => ({
      id: modelId,
      inputTokenLimit: modelConfig.inputTokenLimit,
      outputTokenLimit: modelConfig.outputTokenLimit,
      contextWindow: modelConfig.contextWindow,
      supportsThinking: modelConfig.supportsThinking,
      maxThinkingTokens: modelConfig.maxThinkingTokens ?? 0,
    })),
  }));
}