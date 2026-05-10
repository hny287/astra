import { z } from "zod";
import { SCAN_CONFIG_FILENAME, SCAN_CONFIG_DB_KEY, DEFAULT_SYSTEM_PROMPT } from './branding';

export const nodeConfigSchema = z.object({
  provider: z.enum([
    "cloud-ollama",
    "hosted-ollama",
    "openai",
    "anthropic",
    "bedrock",
    "azure-ai-foundry",
    "langgraph",
  ]),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.2),
  thinkingDepth: z
    .enum(["none", "low", "medium", "high", "max"])
    .default("medium"),
  thinkingBudget: z.number().nullable().default(null),
  topP: z.number().min(0).max(1).default(0.9),
  topK: z.number().nullable().default(null),
  frequencyPenalty: z.number().min(0).max(2).default(0),
  presencePenalty: z.number().min(0).max(2).default(0),
  stopSequences: z.array(z.string()).default([]),
  scanDepth: z
    .enum(["quick", "standard", "deep", "exhaustive"])
    .default("standard"),
  maxFileBytes: z.number().positive().default(51200),
  maxOutputTokens: z.number().positive().default(4096),
  contextWindowOverride: z.number().nullable().default(null),
  instructions: z.string().default(""),
  tools: z.array(z.string()).default([]),
  knowledge: z.array(z.string()).default([]),
  maxRetries: z.number().min(0).max(5).default(3),
  retryBackoffMs: z.number().positive().default(2000),
  timeoutMs: z.number().positive().default(120000),
  concurrency: z.number().positive().optional(),
});

export const chatConfigSchema = z.object({
  provider: z.enum([
    "cloud-ollama",
    "hosted-ollama",
    "openai",
    "anthropic",
    "bedrock",
    "azure-ai-foundry",
    "langgraph",
  ]),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.3),
  thinkingDepth: z.enum(["none", "low", "medium", "high", "max"]).default("low"),
  thinkingBudget: z.number().nullable().default(null),
  topP: z.number().min(0).max(1).default(0.9),
  topK: z.number().nullable().default(null),
  frequencyPenalty: z.number().min(0).max(2).default(0),
  presencePenalty: z.number().min(0).max(2).default(0),
  stopSequences: z.array(z.string()).default([]),
  maxOutputTokens: z.number().positive().default(2048),
  maxRetries: z.number().min(0).max(5).default(2),
  retryBackoffMs: z.number().positive().default(1000),
  timeoutMs: z.number().positive().default(30000),
  systemPrompt: z.string().default(DEFAULT_SYSTEM_PROMPT),
});

export const providerModelSchema = z.object({
  inputTokenLimit: z.number().positive(),
  outputTokenLimit: z.number().positive(),
  contextWindow: z.number().positive(),
  temperature: z.number().min(0).max(2).default(0.2),
  supportsThinking: z.boolean().default(false),
  maxThinkingTokens: z.number().optional(),
});

export const providerSchema = z.object({
  baseURL: z.string().optional(),
  apiKeyEnv: z.string().optional(),
  models: z.record(z.string(), providerModelSchema),
});

export const scanSchema = z.object({
  nodes: z.object({
    discover: nodeConfigSchema,
    deepScan: nodeConfigSchema,
    crossFile: nodeConfigSchema,
  }),
  severity: z.array(z.string()).default([
    "CRITICAL",
    "HIGH",
    "MEDIUM",
    "LOW",
    "INFO",
  ]),
  ignore: z.array(z.string()).default([]),
});

export const configSchema = z.object({
  providers: z.record(z.string(), providerSchema),
  scan: scanSchema,
  chat: chatConfigSchema.optional(),
});

export type ScanConfig = z.infer<typeof configSchema>;
export type NodeConfig = z.infer<typeof nodeConfigSchema>;
export type ChatConfig = z.infer<typeof chatConfigSchema>;

export const SCAN_DEPTH_OUTPUT_TOKENS: Record<string, number> = {
  quick: 500,
  standard: 2048,
  deep: 4096,
  exhaustive: 8192,
};

export const THINKING_DEPTH_BUDGET: Record<string, number> = {
  none: 0,
  low: 1024,
  medium: 2048,
  high: 4096,
  max: 8192,
};

export function loadConfig(path: string): ScanConfig {
  const fs = require("fs");
  const raw = fs.readFileSync(path, "utf-8");
  return configSchema.parse(JSON.parse(raw));
}

const CONFIG_DB_KEY_CONST = SCAN_CONFIG_DB_KEY;

export async function loadConfigFromDb(): Promise<ScanConfig> {
  const { prisma } = await import("@/lib/db");
  const row = await prisma.config.findUnique({ where: { key: CONFIG_DB_KEY_CONST } });
  if (!row) {
    // Fall back to file on first boot before config has been saved to DB
    const fs = require("fs");
    const path = require("path");
    const filePath = path.join(process.cwd(), SCAN_CONFIG_FILENAME);
    const raw = fs.readFileSync(filePath, "utf-8");
    const config = configSchema.parse(JSON.parse(raw));
    // Seed the DB so subsequent reads are DB-backed
    await prisma.config.create({ data: { key: CONFIG_DB_KEY_CONST, value: config as any } });
    return config;
  }
  return configSchema.parse(row.value);
}

export async function saveConfigToDb(config: ScanConfig): Promise<void> {
  const { prisma } = await import("@/lib/db");
  await prisma.config.upsert({
    where: { key: CONFIG_DB_KEY_CONST },
    update: { value: config as any },
    create: { key: CONFIG_DB_KEY_CONST, value: config as any },
  });
}

type PartialNodeOverrides = Partial<z.infer<typeof nodeConfigSchema>>;

export function mergeNodeOverrides(
  base: ScanConfig,
  overrides: {
    discover?: PartialNodeOverrides;
    deepScan?: PartialNodeOverrides;
    crossFile?: PartialNodeOverrides;
  }
): ScanConfig {
  return {
    ...base,
    scan: {
      ...base.scan,
      nodes: {
        discover: { ...base.scan.nodes.discover, ...overrides.discover },
        deepScan: { ...base.scan.nodes.deepScan, ...overrides.deepScan },
        crossFile: { ...base.scan.nodes.crossFile, ...overrides.crossFile },
      },
    },
  };
}

const PROMPT_DB_PREFIX = 'prompts.';

export async function loadPromptFromDb(key: string, defaultPrompt: string): Promise<string> {
  const { prisma } = await import("@/lib/db");
  try {
    const row = await prisma.config.findUnique({ where: { key: `${PROMPT_DB_PREFIX}${key}` } });
    if (row && typeof row.value === 'string' && (row.value as string).trim()) {
      return row.value as string;
    }
  } catch {}
  return defaultPrompt;
}

export async function savePromptToDb(key: string, prompt: string): Promise<void> {
  const { prisma } = await import("@/lib/db");
  await prisma.config.upsert({
    where: { key: `${PROMPT_DB_PREFIX}${key}` },
    update: { value: prompt as any },
    create: { key: `${PROMPT_DB_PREFIX}${key}`, value: prompt as any },
  });
}

export async function listPromptsFromDb(): Promise<Record<string, string>> {
  const { prisma } = await import("@/lib/db");
  const rows = await prisma.config.findMany({
    where: { key: { startsWith: PROMPT_DB_PREFIX } },
  });
  const result: Record<string, string> = {};
  for (const row of rows) {
    const key = (row.key as string).slice(PROMPT_DB_PREFIX.length);
    if (typeof row.value === 'string') result[key] = row.value as string;
  }
  return result;
}