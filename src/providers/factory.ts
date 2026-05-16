import type { ScanConfig } from "../lib/config";
import type { AIProvider, ModelInfo } from "./base";
import { CloudOllamaProvider } from "./cloud-ollama";
import { HostedOllamaProvider } from "./hosted-ollama";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { BedrockProvider } from "./bedrock";
import { AzureAIFoundryProvider } from "./azure-ai-foundry";
import { LangGraphConnectorProvider } from "./langgraph-connector";

interface ProviderCreateConfig {
  providerId: string;
  providerConfig: {
    baseURL?: string;
    apiKeyEnv?: string;
    models: Record<string, {
      inputTokenLimit: number;
      outputTokenLimit: number;
      contextWindow: number;
      temperature: number;
      supportsThinking: boolean;
      maxThinkingTokens?: number;
    }>;
  };
  modelId: string;
  modelConfig: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}

export function createProvider(config: ProviderCreateConfig): AIProvider {
  const { providerId, providerConfig, modelId, modelConfig } = config;
  const modelInfo = {
    inputTokenLimit: modelConfig.inputTokenLimit,
    outputTokenLimit: modelConfig.outputTokenLimit,
    contextWindow: modelConfig.contextWindow,
    temperature: modelConfig.temperature,
    supportsThinking: modelConfig.supportsThinking,
    maxThinkingTokens: modelConfig.maxThinkingTokens,
  };

  switch (providerId) {
    case "cloud-ollama":
      return new CloudOllamaProvider({
        baseURL: providerConfig.baseURL ?? "https://api.ohmyllama.com",
        model: modelId,
        apiKeyEnv: providerConfig.apiKeyEnv ?? "OLLAMA_API_KEY",
        modelInfo,
      });

    case "hosted-ollama":
      return new HostedOllamaProvider({
        baseURL: providerConfig.baseURL,
        model: modelId,
        apiKeyEnv: providerConfig.apiKeyEnv,
        modelInfo,
      });

    case "openai":
      return new OpenAIProvider({
        apiKeyEnv: providerConfig.apiKeyEnv ?? "OPENAI_API_KEY",
        model: modelId,
        modelInfo,
      });

    case "anthropic":
      return new AnthropicProvider({
        apiKeyEnv: providerConfig.apiKeyEnv ?? "ANTHROPIC_API_KEY",
        model: modelId,
        modelInfo,
      });

    case "bedrock":
      return new BedrockProvider();

    case "azure-ai-foundry":
      return new AzureAIFoundryProvider();

    case "langgraph":
      return new LangGraphConnectorProvider();

    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

export function createProviderForNode(
  nodeName: "discover" | "deepScan" | "crossFile" | "toolScan",
  config: ScanConfig
): AIProvider {
  const nodeConfig = config.scan.nodes[nodeName];
  const providerConfig = config.providers[nodeConfig.provider];
  if (!providerConfig) {
    throw new Error(`Provider "${nodeConfig.provider}" not found in config`);
  }
  const modelConfig = providerConfig.models[nodeConfig.model];
  if (!modelConfig) {
    throw new Error(`Model "${nodeConfig.model}" not found in provider "${nodeConfig.provider}"`);
  }

  return createProvider({
    providerId: nodeConfig.provider,
    providerConfig,
    modelId: nodeConfig.model,
    modelConfig: {
      inputTokenLimit: modelConfig.inputTokenLimit,
      outputTokenLimit: modelConfig.outputTokenLimit,
      contextWindow: modelConfig.contextWindow,
      temperature: modelConfig.temperature,
      supportsThinking: modelConfig.supportsThinking,
      maxThinkingTokens: modelConfig.maxThinkingTokens ?? 0,
    },
  });
}