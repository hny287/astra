# Astra-Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build astra-core, an AI-native code scanner that uses LLMs to find vulnerabilities, insecure patterns, and business logic flaws in codebases.

**Architecture:** Sequential pipeline: CLI input → Config → Load Knowledge → Source Resolution → AI Discovery → Deep Scan → Cross-File → Aggregate → Output. AI is the only scanner — rules/guidelines/patterns feed AI context, not executed as regex.

**Tech Stack:** Node.js 22, TypeScript, Commander.js, Zod, Vitest, tsup, cli-table3, chalk, Ollama HTTP client, openai SDK, @anthropic-ai/sdk, @google/generative-ai

---

## File Structure

```
astra-core/
├── src/
│   ├── index.ts                  ← CLI entry point + bin
│   ├── orchestrator.ts           ← Pipeline coordinator
│   ├── config.ts                 ← Config loader + Zod schemas
│   ├── discover.ts               ← AI-guided repo discovery
│   ├── tokenizer.ts              ← Token counting + budget allocation
│   ├── source.ts                 ← Source resolver (local/git)
│   │
│   ├── layers/
│   │   ├── deep-scan.ts          ← Per-file AI analysis
│   │   └── cross-file.ts         ← Cross-file reasoning
│   │
│   ├── ai/
│   │   ├── provider.ts           ← AIProvider interface + types
│   │   ├── ollama.ts             ← Ollama provider
│   │   ├── openai.ts             ← OpenAI provider
│   │   ├── anthropic.ts          ← Anthropic Claude provider
│   │   ├── gemini.ts             ← Google Gemini provider
│   │   └── prompt-builder.ts     ← Assembles prompts from knowledge
│   │
│   ├── findings/
│   │   ├── types.ts              ← UnifiedFinding + BusinessLogicRule + FileSummary
│   │   ├── normalizer.ts         ← Severity normalization + category mapping
│   │   ├── dedup.ts              ← SHA-256 dedup fingerprinting
│   │   └── aggregator.ts         ← Merge findings from all layers
│   │
│   ├── output/
│   │   ├── json.ts               ← JSON formatter
│   │   └── table.ts              ← Pretty terminal table
│   │
│   └── rules/
│       ├── loader.ts             ← Loads patterns/guidelines/prompts into AI context strings
│       └── parser.ts             ← Parses .astra rule files + JSON into context strings
│
├── rules/                        ← Knowledge base (shipped with astra-core)
│   ├── patterns/
│   │   ├── injections.json
│   │   ├── secrets.json
│   │   ├── auth.json
│   │   └── misconfig.json
│   ├── guidelines/
│   │   ├── secure-coding.md
│   │   ├── owasp-top10.md
│   │   ├── business-logic.md
│   │   └── language/
│   │       ├── javascript.md
│   │       ├── python.md
│   │       ├── go.md
│   │       └── typescript.md
│   └── prompts/
│       ├── deep-scan.md
│       ├── business-logic.md
│       └── enrichment.md
│
├── tests/
│   ├── config.test.ts
│   ├── tokenizer.test.ts
│   ├── normalizer.test.ts
│   ├── dedup.test.ts
│   ├── aggregator.test.ts
│   ├── source.test.ts
│   ├── discover.test.ts
│   ├── parser.test.ts
│   ├── loader.test.ts
│   ├── prompt-builder.test.ts
│   ├── deep-scan.test.ts
│   ├── cross-file.test.ts
│   ├── json-output.test.ts
│   └── table-output.test.ts
│
├── astra.config.json
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── tsup.config.ts
```

---

### Task 1: Project Scaffold + Package Configuration

**Files:**
- Create: `astra-core/package.json`
- Create: `astra-core/tsconfig.json`
- Create: `astra-core/vitest.config.ts`
- Create: `astra-core/tsup.config.ts`
- Create: `astra-core/.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "astra-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "astra": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^12.1.0",
    "cli-table3": "^0.6.5",
    "zod": "^3.23.0",
    "openai": "^4.70.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "@google/generative-ai": "^0.21.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "tsup": "^8.0.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  dts: true,
  banner: {
    js: '#!/usr/bin/env node\n',
  },
});
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
astra-results/
```

- [ ] **Step 6: Install dependencies**

Run: `cd /root/astra/astra-core && npm install`
Expected: dependencies installed successfully

- [ ] **Step 7: Commit**

```bash
git add astra-core/
git commit -m "feat(astra-core): scaffold project with package config"
```

---

### Task 2: Findings Types + Normalizer + Dedup

**Files:**
- Create: `astra-core/src/findings/types.ts`
- Create: `astra-core/src/findings/normalizer.ts`
- Create: `astra-core/src/findings/dedup.ts`
- Create: `astra-core/tests/normalizer.test.ts`
- Create: `astra-core/tests/dedup.test.ts`

- [ ] **Step 1: Write failing test for normalizer**

```typescript
import { describe, it, expect } from 'vitest';
import { mapSeverity, mapCategory } from '../src/findings/normalizer.js';

describe('mapSeverity', () => {
  it('maps CRITICAL variants', () => {
    expect(mapSeverity('CRITICAL')).toBe('CRITICAL');
    expect(mapSeverity('CRIT')).toBe('CRITICAL');
  });

  it('maps HIGH variants', () => {
    expect(mapSeverity('HIGH')).toBe('HIGH');
    expect(mapSeverity('ERROR')).toBe('HIGH');
  });

  it('maps MEDIUM variants', () => {
    expect(mapSeverity('MEDIUM')).toBe('MEDIUM');
    expect(mapSeverity('MODERATE')).toBe('MEDIUM');
    expect(mapSeverity('WARN')).toBe('MEDIUM');
    expect(mapSeverity('WARNING')).toBe('MEDIUM');
  });

  it('maps LOW variants', () => {
    expect(mapSeverity('LOW')).toBe('LOW');
    expect(mapSeverity('INFO')).toBe('LOW');
  });

  it('maps unknown to INFO', () => {
    expect(mapSeverity('UNKNOWN')).toBe('INFO');
    expect(mapSeverity('')).toBe('INFO');
  });
});

describe('mapCategory', () => {
  it('maps AI scanner categories', () => {
    expect(mapCategory('ai-deep-scan', 'SAST')).toBe('SAST');
    expect(mapCategory('ai-deep-scan', 'SECRETS')).toBe('SECRETS');
    expect(mapCategory('business-logic', 'BUSINESS_LOGIC')).toBe('BUSINESS_LOGIC');
  });

  it('defaults to SAST for unknown', () => {
    expect(mapCategory('ai-deep-scan', 'unknown')).toBe('SAST');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/normalizer.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create findings/types.ts**

```typescript
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type Category = 'SAST' | 'SCA' | 'SECRETS' | 'IAC' | 'DATA_FLOW' | 'BUSINESS_LOGIC';

export interface UnifiedFinding {
  fingerprint: string;
  scanner: string;
  ruleId: string;
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  file: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  language: string;
  cwe: string[];
  owasp: string[];
  aiExplanation: string;
  aiFix: string;
  exploitScore: number;
  confidence: number;
  remediation: string;
  raw: string;
}

export interface BusinessLogicRule {
  ruleText: string;
  confidence: number;
  evidenceFiles: string[];
  status: 'CANDIDATE' | 'CONFIRMED' | 'REJECTED';
  violationDescription: string | null;
}

export interface FileSummary {
  path: string;
  language: string;
  purpose: string;
  exports: string[];
  dependencies: string[];
  riskAreas: string[];
  summary: string;
}
```

- [ ] **Step 4: Create findings/normalizer.ts**

```typescript
import type { Severity, Category } from './types.js';

export function mapSeverity(raw: string): Severity {
  const upper = raw.toUpperCase();
  if (['CRITICAL', 'CRIT'].includes(upper)) return 'CRITICAL';
  if (['HIGH', 'ERROR'].includes(upper)) return 'HIGH';
  if (['MEDIUM', 'MODERATE', 'WARN', 'WARNING'].includes(upper)) return 'MEDIUM';
  if (['LOW'].includes(upper)) return 'LOW';
  return 'INFO';
}

export function mapCategory(_scanner: string, raw: string): Category {
  const upper = raw.toUpperCase();
  if (['SAST', 'SCA', 'SECRETS', 'IAC', 'DATA_FLOW', 'BUSINESS_LOGIC'].includes(upper)) {
    return upper as Category;
  }
  return 'SAST';
}
```

- [ ] **Step 5: Run normalizer test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/normalizer.test.ts`
Expected: PASS

- [ ] **Step 6: Write failing test for dedup**

```typescript
import { describe, it, expect } from 'vitest';
import { fingerprint } from '../src/findings/dedup.js';

describe('fingerprint', () => {
  it('produces consistent SHA-256 based fingerprints', () => {
    const fp1 = fingerprint('ai-deep-scan', 'SQL-INJECTION', 'src/routes/users.ts', 42);
    const fp2 = fingerprint('ai-deep-scan', 'SQL-INJECTION', 'src/routes/users.ts', 42);
    expect(fp1).toBe(fp2);
  });

  it('produces different fingerprints for different findings', () => {
    const fp1 = fingerprint('ai-deep-scan', 'SQL-INJECTION', 'src/routes/users.ts', 42);
    const fp2 = fingerprint('ai-deep-scan', 'XSS', 'src/routes/users.ts', 10);
    expect(fp1).not.toBe(fp2);
  });

  it('produces different fingerprints for same file different scanner', () => {
    const fp1 = fingerprint('ai-deep-scan', 'RULE-1', 'src/auth.ts', 10);
    const fp2 = fingerprint('business-logic', 'RULE-1', 'src/auth.ts', 10);
    expect(fp1).not.toBe(fp2);
  });

  it('returns 32-char hex string', () => {
    const fp = fingerprint('a', 'b', 'c', 1);
    expect(fp).toMatch(/^[0-9a-f]{32}$/);
  });
});
```

- [ ] **Step 7: Run dedup test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/dedup.test.ts`
Expected: FAIL — module not found

- [ ] **Step 8: Create findings/dedup.ts**

```typescript
import { createHash } from 'crypto';

export function fingerprint(scanner: string, ruleId: string, file: string, lineStart: number): string {
  const hash = createHash('sha256');
  hash.update(`${scanner}:${ruleId}:${file}:${lineStart}`);
  return hash.digest('hex').slice(0, 32);
}

export function isDuplicate(fp: string, existing: Set<string>): boolean {
  return existing.has(fp);
}
```

- [ ] **Step 9: Run dedup test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/dedup.test.ts`
Expected: PASS

- [ ] **Step 10: Run all tests**

Run: `cd /root/astra/astra-core && npx vitest run`
Expected: all tests PASS

- [ ] **Step 11: Commit**

```bash
git add astra-core/src/findings/ astra-core/tests/normalizer.test.ts astra-core/tests/dedup.test.ts
git commit -m "feat(astra-core): add findings types, normalizer, and dedup"
```

---

### Task 3: Aggregator

**Files:**
- Create: `astra-core/src/findings/aggregator.ts`
- Create: `astra-core/tests/aggregator.test.ts`

- [ ] **Step 1: Write failing test for aggregator**

```typescript
import { describe, it, expect } from 'vitest';
import { aggregate } from '../src/findings/aggregator.js';
import type { UnifiedFinding } from '../src/findings/types.js';

describe('aggregate', () => {
  it('merges findings from multiple scanners and deduplicates', () => {
    const findingsA: UnifiedFinding[] = [
      {
        fingerprint: 'fp1',
        scanner: 'ai-deep-scan',
        ruleId: 'SQL-INJECTION',
        title: 'SQL Injection',
        description: 'desc',
        severity: 'HIGH',
        category: 'SAST',
        file: 'users.ts',
        lineStart: 10,
        lineEnd: 10,
        codeSnippet: '',
        language: 'typescript',
        cwe: [],
        owasp: [],
        aiExplanation: '',
        aiFix: '',
        exploitScore: 7,
        confidence: 0.9,
        remediation: '',
        raw: '',
      },
    ];
    const findingsB: UnifiedFinding[] = [
      {
        fingerprint: 'fp1',
        scanner: 'business-logic',
        ruleId: 'SQL-INJECTION',
        title: 'SQL Injection',
        description: 'cross-file desc',
        severity: 'CRITICAL',
        category: 'BUSINESS_LOGIC',
        file: 'users.ts',
        lineStart: 10,
        lineEnd: 10,
        codeSnippet: '',
        language: 'typescript',
        cwe: [],
        owasp: [],
        aiExplanation: '',
        aiFix: '',
        exploitScore: 9,
        confidence: 0.95,
        remediation: '',
        raw: '',
      },
    ];
    const result = aggregate([findingsA, findingsB]);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('CRITICAL');
  });

  it('keeps unique findings separately', () => {
    const findings: UnifiedFinding[] = [
      {
        fingerprint: 'fp1', scanner: 's1', ruleId: 'r1', title: 't1',
        description: '', severity: 'HIGH', category: 'SAST', file: 'a.ts',
        lineStart: 1, lineEnd: 1, codeSnippet: '', language: 'ts',
        cwe: [], owasp: [], aiExplanation: '', aiFix: '', exploitScore: 5,
        confidence: 0.8, remediation: '', raw: '',
      },
      {
        fingerprint: 'fp2', scanner: 's1', ruleId: 'r2', title: 't2',
        description: '', severity: 'MEDIUM', category: 'SAST', file: 'b.ts',
        lineStart: 2, lineEnd: 2, codeSnippet: '', language: 'ts',
        cwe: [], owasp: [], aiExplanation: '', aiFix: '', exploitScore: 3,
        confidence: 0.7, remediation: '', raw: '',
      },
    ];
    const result = aggregate([findings]);
    expect(result).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/aggregator.test.ts`
Expected: FAIL

- [ ] **Step 3: Create findings/aggregator.ts**

```typescript
import type { UnifiedFinding, Severity } from './types.js';

const severityOrder: Record<Severity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

export function aggregate(findingsArrays: UnifiedFinding[][]): UnifiedFinding[] {
  const all = findingsArrays.flat();
  const seen = new Map<string, UnifiedFinding>();

  for (const f of all) {
    const existing = seen.get(f.fingerprint);
    if (!existing) {
      seen.set(f.fingerprint, f);
    } else if (severityOrder[f.severity] > severityOrder[existing.severity]) {
      seen.set(f.fingerprint, f);
    }
  }

  return Array.from(seen.values()).sort((a, b) => {
    return (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/aggregator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add astra-core/src/findings/aggregator.ts astra-core/tests/aggregator.test.ts
git commit -m "feat(astra-core): add findings aggregator with dedup merge"
```

---

### Task 4: Config System (Zod)

**Files:**
- Create: `astra-core/src/config.ts`
- Create: `astra-core/astra.config.json`
- Create: `astra-core/tests/config.test.ts`

- [ ] **Step 1: Write failing test for config**

```typescript
import { describe, it, expect } from 'vitest';
import { loadConfig, configSchema } from '../src/config.js';

describe('configSchema', () => {
  it('parses a valid minimal config', () => {
    const raw = {
      providers: {
        ollama: {
          baseURL: 'http://localhost:11434',
          models: {
            'deepseek-coder': {
              inputTokenLimit: 8192,
              outputTokenLimit: 2048,
              contextWindow: 8192,
              temperature: 0.2,
            },
          },
        },
      },
      scan: {
        provider: 'ollama',
        model: 'deepseek-coder',
      },
    };
    const result = configSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it('rejects config without providers', () => {
    const result = configSchema.safeParse({ scan: { provider: 'ollama' } });
    expect(result.success).toBe(false);
  });

  it('applies defaults for optional fields', () => {
    const raw = {
      providers: {
        ollama: {
          baseURL: 'http://localhost:11434',
          models: {
            llama3: {
              inputTokenLimit: 8192,
              outputTokenLimit: 2048,
              contextWindow: 8192,
              temperature: 0.3,
            },
          },
        },
      },
      scan: {
        provider: 'ollama',
        model: 'llama3',
      },
    };
    const result = configSchema.parse(raw);
    expect(result.scan.layers.deepScan).toBe(true);
    expect(result.scan.layers.crossFile).toBe(true);
    expect(result.scan.batchSize).toBe(5);
  });
});

describe('loadConfig', () => {
  it('loads from astra.config.json', async () => {
    const config = await loadConfig('./astra.config.json');
    expect(config.scan.provider).toBeDefined();
    expect(config.providers).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/config.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/config.ts**

```typescript
import { z } from 'zod';
import fs from 'fs';

const modelSchema = z.object({
  inputTokenLimit: z.number().positive(),
  outputTokenLimit: z.number().positive(),
  contextWindow: z.number().positive(),
  temperature: z.number().min(0).max(2).default(0.2),
});

const providerSchema = z.object({
  baseURL: z.string().optional(),
  apiKeyEnv: z.string().optional(),
  models: z.record(z.string(), modelSchema),
});

const scanSchema = z.object({
  provider: z.string(),
  model: z.string(),
  layers: z.object({
    deepScan: z.boolean().default(true),
    crossFile: z.boolean().default(true),
  }).default({}),
  severity: z.array(z.string()).default(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
  ignore: z.array(z.string()).default(['node_modules/**', 'dist/**', '*.min.js', '*.lock']),
  maxFileBytes: z.number().positive().default(8192),
  batchSize: z.number().positive().default(5),
});

const rulesSchema = z.object({
  customPatterns: z.string().optional(),
  guidelines: z.string().optional(),
});

const sourcesSchema = z.object({
  github: z.object({ tokenEnv: z.string(), apiUrl: z.string() }).optional(),
  gitlab: z.object({ tokenEnv: z.string(), apiUrl: z.string() }).optional(),
});

const outputSchema = z.object({
  format: z.array(z.enum(['json', 'table', 'html', 'sarif'])).default(['json', 'table']),
  path: z.string().default('./astra-results/'),
});

export const configSchema = z.object({
  providers: z.record(z.string(), providerSchema),
  scan: scanSchema,
  rules: rulesSchema.default({}),
  sources: sourcesSchema.default({}),
  output: outputSchema.default({}),
});

export type AstraConfig = z.infer<typeof configSchema>;

export async function loadConfig(configPath: string): Promise<AstraConfig> {
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return configSchema.parse(raw);
}

export function mergeCliOverrides(config: AstraConfig, overrides: Partial<AstraConfig['scan']>): AstraConfig {
  return {
    ...config,
    scan: {
      ...config.scan,
      ...overrides,
    },
  };
}
```

- [ ] **Step 4: Create astra.config.json (default config)**

```json
{
  "providers": {
    "ollama": {
      "baseURL": "http://localhost:11434",
      "apiKeyEnv": "OLLAMA_API_KEY",
      "models": {
        "deepseek-coder": {
          "inputTokenLimit": 8192,
          "outputTokenLimit": 2048,
          "contextWindow": 8192,
          "temperature": 0.2
        },
        "llama3": {
          "inputTokenLimit": 8192,
          "outputTokenLimit": 2048,
          "contextWindow": 8192,
          "temperature": 0.3
        },
        "kimi-k2.6": {
          "inputTokenLimit": 131072,
          "outputTokenLimit": 8192,
          "contextWindow": 131072,
          "temperature": 0.2
        }
      }
    },
    "openai": {
      "apiKeyEnv": "OPENAI_API_KEY",
      "models": {
        "gpt-4o": {
          "inputTokenLimit": 128000,
          "outputTokenLimit": 16384,
          "contextWindow": 128000,
          "temperature": 0.2
        }
      }
    },
    "anthropic": {
      "apiKeyEnv": "ANTHROPIC_API_KEY",
      "models": {
        "claude-sonnet-4-20250514": {
          "inputTokenLimit": 200000,
          "outputTokenLimit": 8192,
          "contextWindow": 200000,
          "temperature": 0.2
        }
      }
    },
    "gemini": {
      "apiKeyEnv": "GEMINI_API_KEY",
      "models": {
        "gemini-2.5-pro": {
          "inputTokenLimit": 1048576,
          "outputTokenLimit": 65536,
          "contextWindow": 1048576,
          "temperature": 0.2
        }
      }
    }
  },
  "scan": {
    "provider": "ollama",
    "model": "deepseek-coder"
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/config.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add astra-core/src/config.ts astra-core/astra.config.json astra-core/tests/config.test.ts
git commit -m "feat(astra-core): add config system with Zod validation"
```

---

### Task 5: Tokenizer

**Files:**
- Create: `astra-core/src/tokenizer.ts`
- Create: `astra-core/tests/tokenizer.test.ts`

- [ ] **Step 1: Write failing test for tokenizer**

```typescript
import { describe, it, expect } from 'vitest';
import { estimateTokens, calculateAvailableTokens } from '../src/tokenizer.js';

describe('estimateTokens', () => {
  it('estimates ~4 chars per token for code', () => {
    const code = 'const x = 42;'; // 13 chars
    const tokens = estimateTokens(code);
    expect(tokens).toBeGreaterThanOrEqual(3);
    expect(tokens).toBeLessThanOrEqual(5);
  });

  it('handles empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('calculateAvailableTokens', () => {
  it('calculates available input tokens from model limits', () => {
    const result = calculateAvailableTokens({
      inputTokenLimit: 8192,
      outputTokenLimit: 2048,
      systemPromptTokens: 500,
    });
    expect(result).toBe(5644);
  });

  it('never returns negative', () => {
    const result = calculateAvailableTokens({
      inputTokenLimit: 1000,
      outputTokenLimit: 800,
      systemPromptTokens: 500,
    });
    expect(result).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/tokenizer.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/tokenizer.ts**

```typescript
const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function calculateAvailableTokens(opts: {
  inputTokenLimit: number;
  outputTokenLimit: number;
  systemPromptTokens: number;
}): number {
  const available = opts.inputTokenLimit - opts.systemPromptTokens - opts.outputTokenLimit;
  return Math.max(0, available);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/tokenizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add astra-core/src/tokenizer.ts astra-core/tests/tokenizer.test.ts
git commit -m "feat(astra-core): add tokenizer for token estimation"
```

---

### Task 6: AI Provider Interface + Ollama Provider

**Files:**
- Create: `astra-core/src/ai/provider.ts`
- Create: `astra-core/src/ai/ollama.ts`

- [ ] **Step 1: Create ai/provider.ts**

```typescript
export interface AIRequest {
  system: string;
  prompt: string;
  maxOutputTokens?: number;
}

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export interface ModelInfo {
  id: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  contextWindow: number;
  supportsSystemPrompt: boolean;
}

export interface AIProvider {
  id: string;
  send(request: AIRequest): Promise<AIResponse>;
  estimateTokens(text: string): number;
  getModelInfo(): ModelInfo;
}
```

- [ ] **Step 2: Create ai/ollama.ts**

```typescript
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from './provider.js';

interface OllamaConfig {
  baseURL: string;
  apiKeyEnv?: string;
  model: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
  };
}

export class OllamaProvider implements AIProvider {
  id = 'ollama';
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  async send(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = this.config.apiKeyEnv ? process.env[this.config.apiKeyEnv] : undefined;
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(`${this.config.baseURL}/api/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        system: request.system,
        prompt: request.prompt,
        stream: false,
        options: {
          temperature: this.config.modelInfo.temperature,
          num_predict: request.maxOutputTokens ?? this.config.modelInfo.outputTokenLimit,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
    }

    const json = await res.json();
    const text = json.response ?? '';
    return {
      text,
      inputTokens: json.prompt_eval_count ?? 0,
      outputTokens: json.eval_count ?? 0,
      durationMs: Date.now() - start,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.config.model,
      inputTokenLimit: this.config.modelInfo.inputTokenLimit,
      outputTokenLimit: this.config.modelInfo.outputTokenLimit,
      contextWindow: this.config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
    };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add astra-core/src/ai/provider.ts astra-core/src/ai/ollama.ts
git commit -m "feat(astra-core): add AI provider interface and Ollama provider"
```

---

### Task 7: OpenAI + Anthropic + Gemini Providers

**Files:**
- Create: `astra-core/src/ai/openai.ts`
- Create: `astra-core/src/ai/anthropic.ts`
- Create: `astra-core/src/ai/gemini.ts`

- [ ] **Step 1: Create ai/openai.ts**

```typescript
import OpenAI from 'openai';
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from './provider.js';

interface OpenAIConfig {
  apiKeyEnv: string;
  model: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
  };
}

export class OpenAIProvider implements AIProvider {
  id = 'openai';
  private client: OpenAI;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) throw new Error(`${config.apiKeyEnv} environment variable not set`);
    this.client = new OpenAI({ apiKey });
    this.config = config;
  }

  async send(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.prompt },
      ],
      max_tokens: request.maxOutputTokens ?? this.config.modelInfo.outputTokenLimit,
      temperature: this.config.modelInfo.temperature,
    });

    const text = response.choices[0]?.message?.content ?? '';
    const usage = response.usage;
    return {
      text,
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
      durationMs: Date.now() - start,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.config.model,
      inputTokenLimit: this.config.modelInfo.inputTokenLimit,
      outputTokenLimit: this.config.modelInfo.outputTokenLimit,
      contextWindow: this.config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
    };
  }
}
```

- [ ] **Step 2: Create ai/anthropic.ts**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from './provider.js';

interface AnthropicConfig {
  apiKeyEnv: string;
  model: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
  };
}

export class AnthropicProvider implements AIProvider {
  id = 'anthropic';
  private client: Anthropic;
  private config: AnthropicConfig;

  constructor(config: AnthropicConfig) {
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) throw new Error(`${config.apiKeyEnv} environment variable not set`);
    this.client = new Anthropic({ apiKey });
    this.config = config;
  }

  async send(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.messages.create({
      model: this.config.model,
      system: request.system,
      messages: [{ role: 'user', content: request.prompt }],
      max_tokens: request.maxOutputTokens ?? this.config.modelInfo.outputTokenLimit,
      temperature: this.config.modelInfo.temperature,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';
    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      durationMs: Date.now() - start,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.config.model,
      inputTokenLimit: this.config.modelInfo.inputTokenLimit,
      outputTokenLimit: this.config.modelInfo.outputTokenLimit,
      contextWindow: this.config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
    };
  }
}
```

- [ ] **Step 3: Create ai/gemini.ts**

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from './provider.js';

interface GeminiConfig {
  apiKeyEnv: string;
  model: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
  };
}

export class GeminiProvider implements AIProvider {
  id = 'gemini';
  private genAI: GoogleGenerativeAI;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) throw new Error(`${config.apiKeyEnv} environment variable not set`);
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.config = config;
  }

  async send(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const model = this.genAI.getGenerativeModel({
      model: this.config.model,
      systemInstruction: request.system,
      generationConfig: {
        maxOutputTokens: request.maxOutputTokens ?? this.config.modelInfo.outputTokenLimit,
        temperature: this.config.modelInfo.temperature,
      },
    });

    const result = await model.generateContent(request.prompt);
    const text = result.response.text();
    const usage = result.response.usageMetadata;
    return {
      text,
      inputTokens: usage?.promptTokenCount ?? 0,
      outputTokens: usage?.candidatesTokenCount ?? 0,
      durationMs: Date.now() - start,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.config.model,
      inputTokenLimit: this.config.modelInfo.inputTokenLimit,
      outputTokenLimit: this.config.modelInfo.outputTokenLimit,
      contextWindow: this.config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
    };
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add astra-core/src/ai/openai.ts astra-core/src/ai/anthropic.ts astra-core/src/ai/gemini.ts
git commit -m "feat(astra-core): add OpenAI, Anthropic, and Gemini providers"
```

---

### Task 8: Rules Loader + Parser

**Files:**
- Create: `astra-core/src/rules/loader.ts`
- Create: `astra-core/src/rules/parser.ts`
- Create: `astra-core/rules/patterns/injections.json`
- Create: `astra-core/rules/patterns/secrets.json`
- Create: `astra-core/rules/patterns/auth.json`
- Create: `astra-core/rules/patterns/misconfig.json`
- Create: `astra-core/rules/guidelines/secure-coding.md`
- Create: `astra-core/rules/guidelines/owasp-top10.md`
- Create: `astra-core/rules/guidelines/business-logic.md`
- Create: `astra-core/rules/guidelines/language/javascript.md`
- Create: `astra-core/rules/guidelines/language/python.md`
- Create: `astra-core/rules/guidelines/language/go.md`
- Create: `astra-core/rules/guidelines/language/typescript.md`
- Create: `astra-core/rules/prompts/deep-scan.md`
- Create: `astra-core/rules/prompts/business-logic.md`
- Create: `astra-core/rules/prompts/enrichment.md`
- Create: `astra-core/tests/loader.test.ts`
- Create: `astra-core/tests/parser.test.ts`

- [ ] **Step 1: Write failing test for parser**

```typescript
import { describe, it, expect } from 'vitest';
import { parseAstraRule } from '../src/rules/parser.js';

describe('parseAstraRule', () => {
  it('parses a valid .astra rule file', () => {
    const content = `rule NO_EVAL {
  severity: HIGH
  category: SAST
  cwe: CWE-95
  match: /eval\\s*\\(/ in javascript,typescript
  message: "eval() usage detected - risk of code injection"
}`;
    const rules = parseAstraRule(content);
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('NO_EVAL');
    expect(rules[0].severity).toBe('HIGH');
    expect(rules[0].category).toBe('SAST');
    expect(rules[0].cwe).toBe('CWE-95');
    expect(rules[0].message).toBe('eval() usage detected - risk of code injection');
  });

  it('parses multiple rules from one file', () => {
    const content = `rule A {
  severity: CRITICAL
  category: SAST
  message: "rule a"
}

rule B {
  severity: LOW
  category: SECRETS
  message: "rule b"
}`;
    const rules = parseAstraRule(content);
    expect(rules).toHaveLength(2);
    expect(rules[0].id).toBe('A');
    expect(rules[1].id).toBe('B');
  });

  it('handles rule without optional fields', () => {
    const content = `rule MINIMAL {
  severity: MEDIUM
  category: IAC
  message: "minimal rule"
}`;
    const rules = parseAstraRule(content);
    expect(rules).toHaveLength(1);
    expect(rules[0].cwe).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/parser.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/rules/parser.ts**

```typescript
export interface ParsedRule {
  id: string;
  severity: string;
  category: string;
  cwe?: string;
  owasp?: string;
  match?: string;
  languages?: string[];
  message: string;
}

export function parseAstraRule(content: string): ParsedRule[] {
  const rules: ParsedRule[] = [];
  const ruleRegex = /rule\s+(\S+)\s*\{([^}]*)\}/gs;

  let match;
  while ((match = ruleRegex.exec(content)) !== null) {
    const id = match[1];
    const body = match[2];
    const rule: ParsedRule = {
      id,
      severity: extractField(body, 'severity') ?? 'MEDIUM',
      category: extractField(body, 'category') ?? 'SAST',
      message: extractQuoted(body, 'message') ?? '',
    };

    const cwe = extractField(body, 'cwe');
    if (cwe) rule.cwe = cwe;

    const owasp = extractField(body, 'owasp');
    if (owasp) rule.owasp = owasp;

    const matchPattern = extractField(body, 'match');
    if (matchPattern) {
      rule.match = matchPattern;
      const inClause = body.match(/in\s+([\w,]+)/);
      if (inClause) rule.languages = inClause[1].split(',').map(s => s.trim());
    }

    rules.push(rule);
  }

  return rules;
}

function extractField(body: string, name: string): string | undefined {
  const regex = new RegExp(`${name}:\\s*(\\S+)`);
  const match = body.match(regex);
  return match ? match[1] : undefined;
}

function extractQuoted(body: string, name: string): string | undefined {
  const regex = new RegExp(`${name}:\\s*"([^"]*)"`);
  const match = body.match(regex);
  return match ? match[1] : undefined;
}

export function ruleToContext(rule: ParsedRule): string {
  let text = `Rule ${rule.id} (${rule.severity} severity, ${rule.category} category): ${rule.message}`;
  if (rule.cwe) text += ` [${rule.cwe}]`;
  if (rule.match) text += ` — Watch for pattern: ${rule.match}`;
  return text;
}
```

- [ ] **Step 4: Run parser test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/parser.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing test for loader**

```typescript
import { describe, it, expect } from 'vitest';
import { loadKnowledgeBase } from '../src/rules/loader.js';
import path from 'path';

describe('loadKnowledgeBase', () => {
  it('loads built-in patterns, guidelines, and prompts', async () => {
    const rulesDir = path.resolve(import.meta.dirname, '../rules');
    const kb = await loadKnowledgeBase(rulesDir);
    expect(kb.patterns.length).toBeGreaterThan(0);
    expect(kb.guidelines.length).toBeGreaterThan(0);
    expect(kb.prompts.deepScan).toBeDefined();
    expect(kb.prompts.businessLogic).toBeDefined();
    expect(kb.prompts.enrichment).toBeDefined();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/loader.test.ts`
Expected: FAIL

- [ ] **Step 7: Create src/rules/loader.ts**

```typescript
import fs from 'fs';
import path from 'path';
import { parseAstraRule, ruleToContext } from './parser.js';

export interface KnowledgeBase {
  patterns: string[];
  guidelines: string[];
  prompts: {
    deepScan: string;
    businessLogic: string;
    enrichment: string;
  };
}

export async function loadKnowledgeBase(rulesDir: string): Promise<KnowledgeBase> {
  const patterns = await loadPatterns(path.join(rulesDir, 'patterns'));
  const guidelines = await loadGuidelines(path.join(rulesDir, 'guidelines'));
  const prompts = await loadPrompts(path.join(rulesDir, 'prompts'));

  return { patterns, guidelines, prompts };
}

async function loadPatterns(dir: string): Promise<string[]> {
  const entries: string[] = [];
  if (!fs.existsSync(dir)) return entries;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith('.astra'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    if (file.endsWith('.astra')) {
      const rules = parseAstraRule(content);
      for (const rule of rules) {
        entries.push(ruleToContext(rule));
      }
    } else {
      try {
        const json = JSON.parse(content);
        if (json.rules && Array.isArray(json.rules)) {
          for (const rule of json.rules) {
            entries.push(
              `Rule ${rule.id ?? 'unknown'} (${rule.severity ?? 'MEDIUM'} severity, ${rule.category ?? 'SAST'} category): ${rule.title ?? rule.message ?? 'Vulnerability pattern'}`
            );
          }
        }
      } catch {
        entries.push(content);
      }
    }
  }
  return entries;
}

async function loadGuidelines(dir: string): Promise<string[]> {
  const entries: string[] = [];
  if (!fs.existsSync(dir)) return entries;

  const walkDir = (currentDir: string) => {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        walkDir(fullPath);
      } else if (item.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        entries.push(content);
      }
    }
  };

  walkDir(dir);
  return entries;
}

async function loadPrompts(dir: string): Promise<KnowledgeBase['prompts']> {
  const readFile = (name: string) => {
    const filePath = path.join(dir, name);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  };

  return {
    deepScan: readFile('deep-scan.md'),
    businessLogic: readFile('business-logic.md'),
    enrichment: readFile('enrichment.md'),
  };
}
```

- [ ] **Step 8: Create all rules/ knowledge base files**

Create `astra-core/rules/patterns/injections.json`:
```json
{
  "rules": [
    {
      "id": "AST-INJ-001",
      "title": "SQL Injection via string concatenation",
      "severity": "CRITICAL",
      "category": "SAST",
      "cwe": "CWE-89",
      "owasp": "A03:2021"
    },
    {
      "id": "AST-INJ-002",
      "title": "Command Injection via unsanitized input",
      "severity": "CRITICAL",
      "category": "SAST",
      "cwe": "CWE-78",
      "owasp": "A03:2021"
    },
    {
      "id": "AST-INJ-003",
      "title": "Cross-Site Scripting (XSS) via DOM manipulation",
      "severity": "HIGH",
      "category": "SAST",
      "cwe": "CWE-79",
      "owasp": "A03:2021"
    },
    {
      "id": "AST-INJ-004",
      "title": "Path Traversal via user-controlled file paths",
      "severity": "HIGH",
      "category": "SAST",
      "cwe": "CWE-22"
    },
    {
      "id": "AST-INJ-005",
      "title": "LDAP Injection via unsanitized input",
      "severity": "HIGH",
      "category": "SAST",
      "cwe": "CWE-90"
    }
  ]
}
```

Create `astra-core/rules/patterns/secrets.json`:
```json
{
  "rules": [
    {
      "id": "AST-SEC-001",
      "title": "Hardcoded API key or secret",
      "severity": "HIGH",
      "category": "SECRETS"
    },
    {
      "id": "AST-SEC-002",
      "title": "Hardcoded password or credential",
      "severity": "CRITICAL",
      "category": "SECRETS"
    },
    {
      "id": "AST-SEC-003",
      "title": "Private key committed to repository",
      "severity": "CRITICAL",
      "category": "SECRETS"
    },
    {
      "id": "AST-SEC-004",
      "title": "AWS/Azure/GCP credential in source code",
      "severity": "CRITICAL",
      "category": "SECRETS"
    }
  ]
}
```

Create `astra-core/rules/patterns/auth.json`:
```json
{
  "rules": [
    {
      "id": "AST-AUTH-001",
      "title": "Insecure JWT - none algorithm allowed",
      "severity": "CRITICAL",
      "category": "SAST",
      "cwe": "CWE-327"
    },
    {
      "id": "AST-AUTH-002",
      "title": "Weak password hashing (MD5, SHA1)",
      "severity": "HIGH",
      "category": "SAST",
      "cwe": "CWE-328"
    },
    {
      "id": "AST-AUTH-003",
      "title": "Missing authentication on sensitive endpoint",
      "severity": "HIGH",
      "category": "SAST",
      "cwe": "CWE-306"
    },
    {
      "id": "AST-AUTH-004",
      "title": "Session fixation vulnerability",
      "severity": "HIGH",
      "category": "SAST",
      "cwe": "CWE-384"
    }
  ]
}
```

Create `astra-core/rules/patterns/misconfig.json`:
```json
{
  "rules": [
    {
      "id": "AST-CFG-001",
      "title": "Overly permissive CORS configuration",
      "severity": "HIGH",
      "category": "IAC"
    },
    {
      "id": "AST-CFG-002",
      "title": "Missing Content-Security-Policy header",
      "severity": "MEDIUM",
      "category": "IAC"
    },
    {
      "id": "AST-CFG-003",
      "title": "Insecure TLS configuration",
      "severity": "HIGH",
      "category": "IAC"
    },
    {
      "id": "AST-CFG-004",
      "title": "Debug mode enabled in production",
      "severity": "HIGH",
      "category": "IAC"
    }
  ]
}
```

Create `astra-core/rules/guidelines/secure-coding.md`:
```markdown
# Secure Coding Principles

- Never trust user input. Validate and sanitize all inputs at the point of entry.
- Use parameterized queries for all database operations. Never concatenate user input into SQL.
- Apply the principle of least privilege to all system components.
- Implement defense in depth — never rely on a single security control.
- Fail securely — default to denial, not to openness.
- Use strong, modern cryptographic primitives. Avoid MD5, SHA1, DES, RC4.
- Keep secrets out of source code. Use environment variables or secret managers.
- Log security events, but never log sensitive data (passwords, tokens, PII).
- Review all third-party dependencies for known vulnerabilities.
- Implement proper error handling — never expose stack traces or internal details to users.
```

Create `astra-core/rules/guidelines/owasp-top10.md`:
```markdown
# OWASP Top 10 (2021) Reference

1. **A01: Broken Access Control** — Unauthorized access to resources or functions.
2. **A02: Cryptographic Failures** — Weak encryption, improper key management.
3. **A03: Injection** — SQL, NoSQL, OS command, LDAP injection flaws.
4. **A04: Insecure Design** — Missing threat modeling, insecure design patterns.
5. **A05: Security Misconfiguration** — Default configs, incomplete setups, open cloud storage.
6. **A06: Vulnerable & Outdated Components** — Known vulnerabilities in dependencies.
7. **A07: Identification & Authentication Failures** — Weak authentication, session management.
8. **A08: Software & Data Integrity Failures** — Unverified updates, insecure CI/CD.
9. **A09: Security Logging & Monitoring Failures** — Insufficient logging, missing detection.
10. **A10: Server-Side Request Forgery** — Unvalidated URL redirects, internal network access.
```

Create `astra-core/rules/guidelines/business-logic.md`:
```markdown
# Business Logic Vulnerability Patterns

- Missing authorization checks on business-critical operations
- Privilege escalation via parameter manipulation
- Bypassing multi-step workflows (e.g., skipping payment)
- Race conditions in financial transactions
- Insecure direct object references (IDOR)
- Missing rate limiting on sensitive operations
- Business rule enforcement only on client side
- Data validation only on frontend, not backend
- Time-of-check to time-of-use (TOCTOU) race conditions
- Improper handling of concurrent resource access
```

Create `astra-core/rules/guidelines/language/javascript.md`:
```markdown
# JavaScript Security Guide

- Avoid `eval()`, `new Function()`, and `setTimeout(string)` — code injection risk
- Use `Object.freeze()` for constants that should not be modified
- Enable strict mode (`"use strict"`) in all modules
- Sanitize all HTML before insertion — avoid `innerHTML`, use `textContent`
- Never store secrets in localStorage or sessionStorage
- Validate all inputs from `window.postMessage` events
- Use `httpOnly`, `secure`, `sameSite` flags on all cookies
- Prefer `const` over `let`, avoid `var`
- Implement Content Security Policy headers
- Use Helmet.js for Express.js security hardening
```

Create `astra-core/rules/guidelines/language/python.md`:
```markdown
# Python Security Guide

- Use parameterized queries with ORMs or `cursor.execute()` with placeholders
- Never use `pickle.loads()` on untrusted data — use `json` or `msgpack`
- Avoid `subprocess` with `shell=True` — use list form instead
- Use `secrets` module for tokens, not `random`
- Validate all Flask/Django request inputs with schemas
- Enable CSRF protection in all form submissions
- Use `python-dotenv` for environment variables, never hardcode
- Keep `DEBUG=False` in production Django settings
- Use `pip-audit` or `safety` to check dependencies
- Apply `bandit` for static security analysis
```

Create `astra-core/rules/guidelines/language/go.md`:
```markdown
# Go Security Guide

- Use `database/sql` with parameterized queries — never `fmt.Sprintf` for SQL
- Avoid `exec.Command` with user-controlled arguments unsanitized
- Use `crypto/rand` for secure random generation, not `math/rand`
- Validate all HTTP inputs with proper parsing
- Set proper CORS headers, avoid `*` origins in production
- Use `context` for timeouts on all external calls
- Implement proper TLS configuration — set `MinVersion: tls.VersionTLS12`
- Never ignore errors — always handle `err` return values
- Use `html/template` not `text/template` for HTML output
- Sanitize all user input before logging
```

Create `astra-core/rules/guidelines/language/typescript.md`:
```markdown
# TypeScript Security Guide

- All of JavaScript's security guidelines apply
- Use strict `tsconfig`: `strict: true`, `noImplicitAny: true`
- Avoid `as any` type assertions — they bypass type safety
- Type all API request/response schemas with Zod or io-ts
- Use branded types for sensitive data (Token, UserId, etc.)
- Never expose internal types in public API boundaries
- Validate runtime types even when TypeScript compiles
- Use `unknown` over `any` for truly unknown values
- Enable `noUncheckedIndexedAccess` for array/object access
- Avoid non-null assertions (`!`) — use proper null checks
```

Create `astra-core/rules/prompts/deep-scan.md`:
```markdown
You are a senior application security engineer with over 20 years of experience in cybersecurity and software development. You are performing a deep security review of a source file.

Analyze this code for:
- Vulnerabilities (injection, XSS, CSRF, SSRF, etc.)
- Insecure patterns (hardcoded secrets, weak crypto, missing validation)
- Business logic flaws visible in this file
- Missing security controls (auth checks, input validation, output encoding)
- Anti-patterns that could lead to security issues

Consider the security guidelines and known vulnerability patterns provided in your context.

For each finding, provide:
- A clear title
- Severity: CRITICAL, HIGH, MEDIUM, LOW, or INFO
- Category: SAST, SCA, SECRETS, IAC, DATA_FLOW, or BUSINESS_LOGIC
- The file path and line number range
- The vulnerable code snippet
- CWE identifier(s) if applicable
- OWASP category if applicable
- A plain-English explanation of the risk
- A concrete code fix
- An exploitability score from 0 to 10
- Your confidence level from 0.0 to 1.0

Also provide a summary of this file's purpose, key exports, dependencies, and any areas of concern.

Return your findings as a JSON object with this structure:
{
  "findings": [{
    "ruleId": "...",
    "title": "...",
    "severity": "HIGH",
    "category": "SAST",
    "file": "...",
    "lineStart": 10,
    "lineEnd": 15,
    "codeSnippet": "...",
    "language": "...",
    "cwe": ["CWE-89"],
    "owasp": ["A03:2021"],
    "aiExplanation": "...",
    "aiFix": "...",
    "exploitScore": 7,
    "confidence": 0.9,
    "remediation": "..."
  }],
  "fileSummary": {
    "path": "...",
    "language": "...",
    "purpose": "...",
    "exports": [...],
    "dependencies": [...],
    "riskAreas": [...],
    "summary": "..."
  }
}

If no vulnerabilities are found, return empty findings array and still provide the fileSummary.
```

Create `astra-core/rules/prompts/business-logic.md`:
```markdown
You are a senior application security architect with over 20 years of experience. You are analyzing a codebase map composed of file summaries to identify cross-file security issues.

Based on these file summaries, identify:
- Missing authentication or authorization between components
- Privilege escalation paths across files
- Broken access control patterns
- Data flow violations (sensitive data flowing to insecure sinks)
- Insecure architecture patterns (trust boundaries, missing middleware)
- Business logic flaws that span multiple files

For each finding:
- Describe the cross-file vulnerability
- List all affected files
- Explain the attack path
- Rate severity and confidence

Return findings as JSON:
{
  "findings": [{
    "ruleId": "...",
    "title": "...",
    "severity": "HIGH",
    "category": "BUSINESS_LOGIC",
    "file": "multiple",
    "lineStart": 0,
    "lineEnd": 0,
    "codeSnippet": "",
    "language": "",
    "cwe": [],
    "owasp": [],
    "aiExplanation": "...",
    "aiFix": "...",
    "exploitScore": 8,
    "confidence": 0.8,
    "remediation": "..."
  }],
  "rules": [{
    "ruleText": "...",
    "confidence": 0.9,
    "evidenceFiles": ["file1.ts", "file2.ts"],
    "violationDescription": "..."
  }]
}
```

Create `astra-core/rules/prompts/enrichment.md`:
```markdown
You are a senior application security engineer. Given this vulnerability finding, provide:
1. A one-sentence plain-English risk explanation
2. A concrete code fix snippet
3. An exploitability score from 0 to 10

Return as JSON: {"explanation": "...", "fix": "...", "score": N}
```

- [ ] **Step 9: Run loader test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/loader.test.ts`
Expected: PASS

- [ ] **Step 10: Run all tests**

Run: `cd /root/astra/astra-core && npx vitest run`
Expected: all tests PASS

- [ ] **Step 11: Commit**

```bash
git add astra-core/src/rules/ astra-core/rules/ astra-core/tests/loader.test.ts astra-core/tests/parser.test.ts
git commit -m "feat(astra-core): add rules loader, parser, and knowledge base"
```

---

### Task 9: Prompt Builder

**Files:**
- Create: `astra-core/src/ai/prompt-builder.ts`
- Create: `astra-core/tests/prompt-builder.test.ts`

- [ ] **Step 1: Write failing test for prompt builder**

```typescript
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../src/ai/prompt-builder.js';
import type { KnowledgeBase } from '../src/rules/loader.js';

describe('buildSystemPrompt', () => {
  it('assembles system prompt from knowledge base', () => {
    const kb: KnowledgeBase = {
      patterns: ['Rule SQL-INJECTION (CRITICAL): SQL injection risk'],
      guidelines: ['Never trust user input.'],
      prompts: {
        deepScan: 'You are a senior security engineer...',
        businessLogic: '',
        enrichment: '',
      },
    };
    const prompt = buildSystemPrompt(kb, 'deepScan');
    expect(prompt).toContain('You are a senior security engineer...');
    expect(prompt).toContain('Never trust user input.');
    expect(prompt).toContain('SQL-INJECTION');
  });

  it('returns correct prompt for different types', () => {
    const kb: KnowledgeBase = {
      patterns: [],
      guidelines: [],
      prompts: {
        deepScan: 'Deep scan prompt',
        businessLogic: 'Business logic prompt',
        enrichment: 'Enrichment prompt',
      },
    };
    expect(buildSystemPrompt(kb, 'deepScan')).toContain('Deep scan prompt');
    expect(buildSystemPrompt(kb, 'businessLogic')).toContain('Business logic prompt');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/prompt-builder.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/ai/prompt-builder.ts**

```typescript
import type { KnowledgeBase } from '../src/rules/loader.js';

export type PromptType = 'deepScan' | 'businessLogic' | 'enrichment';

export function buildSystemPrompt(kb: KnowledgeBase, type: PromptType): string {
  const sections: string[] = [];

  const promptText = kb.prompts[type === 'deepScan' ? 'deepScan' : type === 'businessLogic' ? 'businessLogic' : 'enrichment'];
  if (promptText) sections.push(promptText);

  if (kb.guidelines.length > 0) {
    sections.push('## Security Guidelines\n\n' + kb.guidelines.join('\n\n'));
  }

  if (kb.patterns.length > 0) {
    sections.push('## Known Vulnerability Patterns (reference)\n\n' + kb.patterns.join('\n'));
  }

  sections.push('## Output Format\n\nReturn findings as valid JSON matching the schema described in your prompt instructions. If no vulnerabilities found, return empty findings array.');

  return sections.join('\n\n---\n\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/prompt-builder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add astra-core/src/ai/prompt-builder.ts astra-core/tests/prompt-builder.test.ts
git commit -m "feat(astra-core): add prompt builder that assembles from knowledge base"
```

---

### Task 10: Source Resolver

**Files:**
- Create: `astra-core/src/source.ts`
- Create: `astra-core/tests/source.test.ts`

- [ ] **Step 1: Write failing test for source resolver**

```typescript
import { describe, it, expect } from 'vitest';
import { resolveSource, detectSourceType } from '../src/source.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('detectSourceType', () => {
  it('detects local directory paths', () => {
    expect(detectSourceType('./my-project')).toBe('local');
    expect(detectSourceType('/home/user/code')).toBe('local');
  });

  it('detects git HTTPS URLs', () => {
    expect(detectSourceType('https://github.com/org/repo')).toBe('git');
  });

  it('detects git SSH URLs', () => {
    expect(detectSourceType('git@github.com:org/repo.git')).toBe('git');
  });

  it('detects cloud API prefixes', () => {
    expect(detectSourceType('github:org/repo')).toBe('cloud');
    expect(detectSourceType('gitlab:org/repo')).toBe('cloud');
  });
});

describe('resolveSource', () => {
  it('resolves local directory that exists', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astra-test-'));
    const result = await resolveSource(tmpDir);
    expect(result).toBe(tmpDir);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('throws for local directory that does not exist', async () => {
    await expect(resolveSource('/nonexistent/path/12345')).rejects.toThrow('Directory not found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/source.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/source.ts**

```typescript
import fs from 'fs';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';

export type SourceType = 'local' | 'git' | 'cloud';

export function detectSourceType(target: string): SourceType {
  if (target.startsWith('github:') || target.startsWith('gitlab:')) return 'cloud';
  if (target.startsWith('https://') || target.startsWith('git@') || target.startsWith('ssh://')) return 'git';
  return 'local';
}

export async function resolveSource(target: string, branch?: string): Promise<string> {
  const type = detectSourceType(target);

  switch (type) {
    case 'local':
      return resolveLocal(target);
    case 'git':
      return cloneGitRepo(target, branch);
    case 'cloud':
      throw new Error('Cloud repository API is not yet supported. Use a local path or git URL instead.');
  }
}

function resolveLocal(dirPath: string): string {
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Directory not found: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Path is not a directory: ${resolved}`);
  }
  return resolved;
}

function cloneGitRepo(url: string, branch?: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astra-scan-'));
  const branchFlag = branch ? ` --branch ${branch}` : '';
  try {
    execSync(`git clone --depth 1${branchFlag} ${url} ${tmpDir}`, {
      stdio: 'pipe',
      timeout: 60000,
    });
    return tmpDir;
  } catch (e: any) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw new Error(`Failed to clone repository: ${url}. Error: ${e.message}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/source.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add astra-core/src/source.ts astra-core/tests/source.test.ts
git commit -m "feat(astra-core): add source resolver for local and git targets"
```

---

### Task 11: AI-Guided Repo Discovery

**Files:**
- Create: `astra-core/src/discover.ts`
- Create: `astra-core/tests/discover.test.ts`

- [ ] **Step 1: Write failing test for discover**

```typescript
import { describe, it, expect } from 'vitest';
import { buildDirectoryTree } from '../src/discover.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('buildDirectoryTree', () => {
  it('builds a text tree from a directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astra-discover-'));
    fs.writeFileSync(path.join(tmpDir, 'app.ts'), 'code');
    fs.mkdirSync(path.join(tmpDir, 'routes'));
    fs.writeFileSync(path.join(tmpDir, 'routes', 'index.ts'), 'code');

    const tree = buildDirectoryTree(tmpDir);
    expect(tree).toContain('app.ts');
    expect(tree).toContain('routes/index.ts');

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('skips common ignore directories', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astra-discover-'));
    fs.mkdirSync(path.join(tmpDir, 'node_modules'));
    fs.mkdirSync(path.join(tmpDir, '.git'));
    fs.writeFileSync(path.join(tmpDir, 'app.ts'), 'code');
    fs.writeFileSync(path.join(tmpDir, 'node_modules', 'pkg.js'), 'code');

    const tree = buildDirectoryTree(tmpDir);
    expect(tree).toContain('app.ts');
    expect(tree).not.toContain('pkg.js');

    fs.rmSync(tmpDir, { recursive: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/discover.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/discover.ts**

```typescript
import fs from 'fs';
import path from 'path';
import type { AIProvider } from './ai/provider.js';
import type { AstraConfig } from './config.js';

const DEFAULT_IGNORE = [
  'node_modules', '.git', '.svn', '.hg',
  'dist', 'build', 'out', '__pycache__',
  '.next', '.nuxt', 'coverage', '.cache',
  'vendor', '.tox', '.mypy_cache',
];

export interface PrioritizedFileList {
  files: PrioritizedFile[];
  skipped: string[];
  totalFiles: number;
}

export interface PrioritizedFile {
  path: string;
  priority: number; // 0-4
  language: string;
}

export function buildDirectoryTree(dir: string, ignore: string[] = []): string {
  const allIgnore = [...DEFAULT_IGNORE, ...ignore];
  const entries: string[] = [];

  function walk(currentDir: string, relativeTo: string) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      if (allIgnore.includes(item.name)) continue;
      if (item.name.startsWith('.') && item.name !== '.env') continue;

      const fullPath = path.join(currentDir, item.name);
      const relPath = path.join(relativeTo, item.name);

      if (item.isDirectory()) {
        walk(fullPath, relPath);
      } else if (item.isFile()) {
        entries.push(relPath);
      }
    }
  }

  walk(dir, '');
  return entries.join('\n');
}

export async function discoverFiles(
  dir: string,
  provider: AIProvider,
  config: AstraConfig,
): Promise<PrioritizedFileList> {
  const tree = buildDirectoryTree(dir, config.scan.ignore);
  const allFiles = tree.split('\n').filter(Boolean);
  const modelInfo = provider.getModelInfo();

  if (allFiles.length === 0) {
    return { files: [], skipped: [], totalFiles: 0 };
  }

  const discoveryPrompt = `Given this repository file structure, identify the most security-relevant files and rank them by priority.

Priority tiers:
- P0: Entry points (routes, api, controllers, server.ts, app.ts, main.go, index.ts)
- P1: Auth & security (auth modules, middleware, JWT handling, permissions)
- P2: Business logic (services, models, payment, user, order processing)
- P3: Config & data (migrations, schemas, configs, docker-compose)
- P4: Other code (utils, helpers, types, constants)

Also list files that should be SKIPPED (tests, fixtures, mocks, generated code, lock files).

File structure:
${tree.slice(0, modelInfo.inputTokenLimit - 500)}

Return JSON:
{
  "prioritized": [
    {"path": "relative/path", "priority": 0, "language": "typescript"},
    ...
  ],
  "skipped": ["test/file1.ts", ...]
}`;

  const modelTokens = calculateAvailableTokens(provider, '');
  if (provider.estimateTokens(tree) > modelTokens) {
    return fallbackPrioritize(allFiles);
  }

  try {
    const response = await provider.send({
      system: 'You are a senior security engineer analyzing codebase structure. Be precise and thorough.',
      prompt: discoveryPrompt,
    });

    const parsed = parseDiscoveryResponse(response.text);
    return {
      files: parsed.prioritized,
      skipped: parsed.skipped,
      totalFiles: allFiles.length,
    };
  } catch {
    return fallbackPrioritize(allFiles);
  }
}

function calculateAvailableTokens(provider: AIProvider, _systemPrompt: string): number {
  const modelInfo = provider.getModelInfo();
  return modelInfo.inputTokenLimit - modelInfo.outputTokenLimit - 500;
}

function fallbackPrioritize(files: string[]): PrioritizedFileList {
  const prioritized: PrioritizedFile[] = files.map((f) => {
    const lower = f.toLowerCase();
    let priority = 4;
    if (/(route|api|controller|server|app|main|index)\.(ts|js|py|go)$/.test(lower)) priority = 0;
    else if (/(auth|jwt|middleware|perm|session|token|csrf)/.test(lower)) priority = 1;
    else if (/(service|model|payment|user|order|checkout)/.test(lower)) priority = 2;
    else if (/(config|schema|migration|docker|compose|\.env)/.test(lower)) priority = 3;

    const ext = path.extname(f).slice(1);
    const langMap: Record<string, string> = {
      ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
      py: 'python', go: 'go', rs: 'rust', rb: 'ruby', java: 'java',
    };

    return { path: f, priority, language: langMap[ext] ?? ext };
  });

  return { files: prioritized, skipped: [], totalFiles: files.length };
}

function parseDiscoveryResponse(text: string): { prioritized: PrioritizedFile[]; skipped: string[] } {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { prioritized: [], skipped: [] };

  try {
    const json = JSON.parse(match[0]);
    return {
      prioritized: (json.prioritized ?? []).map((f: any) => ({
        path: f.path ?? '',
        priority: typeof f.priority === 'number' ? f.priority : 4,
        language: f.language ?? '',
      })),
      skipped: json.skipped ?? [],
    };
  } catch {
    return { prioritized: [], skipped: [] };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/discover.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add astra-core/src/discover.ts astra-core/tests/discover.test.ts
git commit -m "feat(astra-core): add AI-guided repo discovery"
```

---

### Task 12: Deep Scan Layer

**Files:**
- Create: `astra-core/src/layers/deep-scan.ts`
- Create: `astra-core/tests/deep-scan.test.ts`

- [ ] **Step 1: Write failing test for deep scan — AI response parsing**

```typescript
import { describe, it, expect } from 'vitest';
import { parseDeepScanResponse } from '../src/layers/deep-scan.js';

describe('parseDeepScanResponse', () => {
  it('parses valid AI response with findings', () => {
    const response = JSON.stringify({
      findings: [{
        ruleId: 'AI-001',
        title: 'SQL Injection',
        severity: 'CRITICAL',
        category: 'SAST',
        file: 'users.ts',
        lineStart: 10,
        lineEnd: 12,
        codeSnippet: 'const q = "SELECT * FROM users WHERE id = " + userId;',
        language: 'typescript',
        cwe: ['CWE-89'],
        owasp: ['A03:2021'],
        aiExplanation: 'User input concatenated into SQL query',
        aiFix: 'Use parameterized query: db.query("SELECT * FROM users WHERE id = $1", [userId])',
        exploitScore: 9,
        confidence: 0.95,
        remediation: 'Use parameterized queries',
      }],
      fileSummary: {
        path: 'users.ts',
        language: 'typescript',
        purpose: 'User database queries',
        exports: ['getUser'],
        dependencies: ['database'],
        riskAreas: ['SQL queries'],
        summary: 'Contains user database query functions with SQL injection risk',
      },
    });

    const result = parseDeepScanResponse(response, 'users.ts');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].severity).toBe('CRITICAL');
    expect(result.fileSummary.purpose).toBe('User database queries');
  });

  it('handles empty findings', () => {
    const response = JSON.stringify({
      findings: [],
      fileSummary: {
        path: 'utils.ts',
        language: 'typescript',
        purpose: 'Utility functions',
        exports: [],
        dependencies: [],
        riskAreas: [],
        summary: 'Safe utility functions',
      },
    });

    const result = parseDeepScanResponse(response, 'utils.ts');
    expect(result.findings).toHaveLength(0);
    expect(result.fileSummary.path).toBe('utils.ts');
  });

  it('handles malformed AI response gracefully', () => {
    const result = parseDeepScanResponse('not json at all', 'test.ts');
    expect(result.findings).toHaveLength(0);
    expect(result.fileSummary.path).toBe('test.ts');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/deep-scan.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/layers/deep-scan.ts**

```typescript
import fs from 'fs';
import path from 'path';
import type { AIProvider } from '../ai/provider.js';
import type { AstraConfig } from '../config.js';
import type { UnifiedFinding, FileSummary } from '../findings/types.js';
import { fingerprint } from '../findings/dedup.js';
import type { KnowledgeBase } from '../rules/loader.js';
import { buildSystemPrompt } from '../ai/prompt-builder.js';
import { estimateTokens, calculateAvailableTokens } from '../tokenizer.js';

export interface DeepScanResult {
  findings: UnifiedFinding[];
  fileSummary: FileSummary;
  errors: string[];
}

export function parseDeepScanResponse(text: string, filePath: string): DeepScanResult {
  const emptySummary: FileSummary = {
    path: filePath,
    language: '',
    purpose: '',
    exports: [],
    dependencies: [],
    riskAreas: [],
    summary: '',
  };

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { findings: [], fileSummary: emptySummary, errors: ['No JSON found in AI response'] };

  try {
    const json = JSON.parse(match[0]);
    const findings: UnifiedFinding[] = (json.findings ?? []).map((f: any) => ({
      fingerprint: fingerprint('ai-deep-scan', f.ruleId ?? 'unknown', filePath, f.lineStart ?? 0),
      scanner: 'ai-deep-scan',
      ruleId: f.ruleId ?? 'unknown',
      title: f.title ?? 'Unknown finding',
      description: f.aiExplanation ?? '',
      severity: f.severity ?? 'INFO',
      category: f.category ?? 'SAST',
      file: filePath,
      lineStart: f.lineStart ?? 0,
      lineEnd: f.lineEnd ?? f.lineStart ?? 0,
      codeSnippet: f.codeSnippet ?? '',
      language: f.language ?? '',
      cwe: f.cwe ?? [],
      owasp: f.owasp ?? [],
      aiExplanation: f.aiExplanation ?? '',
      aiFix: f.aiFix ?? '',
      exploitScore: f.exploitScore ?? 0,
      confidence: f.confidence ?? 0.5,
      remediation: f.remediation ?? '',
      raw: JSON.stringify(f),
    }));

    const fileSummary: FileSummary = json.fileSummary ?? emptySummary;
    fileSummary.path = filePath;

    return { findings, fileSummary, errors: [] };
  } catch (e: any) {
    return { findings: [], fileSummary: emptySummary, errors: [`Failed to parse AI response: ${e.message}`] };
  }
}

export async function runDeepScan(
  dir: string,
  files: { path: string; priority: number }[],
  provider: AIProvider,
  config: AstraConfig,
  knowledgeBase: KnowledgeBase,
): Promise<{ findings: UnifiedFinding[]; summaries: FileSummary[]; errors: string[]; tokensUsed: { input: number; output: number } }> {
  const systemPrompt = buildSystemPrompt(knowledgeBase, 'deepScan');
  const systemPromptTokens = provider.estimateTokens(systemPrompt);
  const modelInfo = provider.getModelInfo();
  const availableTokens = calculateAvailableTokens({
    inputTokenLimit: modelInfo.inputTokenLimit,
    outputTokenLimit: modelInfo.outputTokenLimit,
    systemPromptTokens,
  });

  const allFindings: UnifiedFinding[] = [];
  const allSummaries: FileSummary[] = [];
  const allErrors: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const batchSize = config.scan.batchSize;
  const maxFileBytes = config.scan.maxFileBytes;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    const batchPromises = batch.map(async (file) => {
      const fullPath = path.join(dir, file.path);
      if (!fs.existsSync(fullPath)) return null;

      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.length > maxFileBytes * 2) {
        return { findings: [], fileSummary: { path: file.path, skipped: true } as any, errors: [`File too large: ${file.path}`] };
      }

      const fileTokens = estimateTokens(content);
      if (fileTokens > availableTokens) {
        return { findings: [], fileSummary: { path: file.path, skipped: true } as any, errors: [`File exceeds token budget: ${file.path}`] };
      }

      try {
        const response = await provider.send({
          system: systemPrompt,
          prompt: content,
          maxOutputTokens: modelInfo.outputTokenLimit,
        });
        totalInputTokens += response.inputTokens;
        totalOutputTokens += response.outputTokens;

        return parseDeepScanResponse(response.text, file.path);
      } catch (e: any) {
        return { findings: [], fileSummary: { path: file.path, skipped: true } as any, errors: [`AI error for ${file.path}: ${e.message}`] };
      }
    });

    const results = await Promise.all(batchPromises);
    for (const result of results) {
      if (!result) continue;
      allFindings.push(...(result.findings ?? []));
      if (result.fileSummary && !result.fileSummary.skipped) {
        allSummaries.push(result.fileSummary);
      }
      allErrors.push(...(result.errors ?? []));
    }
  }

  return {
    findings: allFindings,
    summaries: allSummaries,
    errors: allErrors,
    tokensUsed: { input: totalInputTokens, output: totalOutputTokens },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/deep-scan.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add astra-core/src/layers/deep-scan.ts astra-core/tests/deep-scan.test.ts
git commit -m "feat(astra-core): add deep scan layer with AI response parsing"
```

---

### Task 13: Cross-File Analysis Layer

**Files:**
- Create: `astra-core/src/layers/cross-file.ts`
- Create: `astra-core/tests/cross-file.test.ts`

- [ ] **Step 1: Write failing test for cross-file — AI response parsing**

```typescript
import { describe, it, expect } from 'vitest';
import { parseCrossFileResponse } from '../src/layers/cross-file.js';

describe('parseCrossFileResponse', () => {
  it('parses valid cross-file response with findings and rules', () => {
    const response = JSON.stringify({
      findings: [{
        ruleId: 'BL-001',
        title: 'Missing auth middleware on admin routes',
        severity: 'CRITICAL',
        category: 'BUSINESS_LOGIC',
        file: 'multiple',
        lineStart: 0,
        lineEnd: 0,
        codeSnippet: '',
        language: '',
        cwe: ['CWE-306'],
        owasp: ['A01:2021'],
        aiExplanation: 'Admin routes have no authentication middleware',
        aiFix: 'Add auth middleware to /admin/* routes',
        exploitScore: 9,
        confidence: 0.85,
        remediation: 'Implement authentication check',
      }],
      rules: [{
        ruleText: 'All admin endpoints must require authentication',
        confidence: 0.9,
        evidenceFiles: ['routes/admin.ts', 'middleware/auth.ts'],
        violationDescription: 'Admin routes accessible without auth',
      }],
    });

    const result = parseCrossFileResponse(response);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].category).toBe('BUSINESS_LOGIC');
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].status).toBe('CANDIDATE');
  });

  it('handles malformed response', () => {
    const result = parseCrossFileResponse('bad json');
    expect(result.findings).toHaveLength(0);
    expect(result.rules).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/cross-file.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/layers/cross-file.ts**

```typescript
import type { AIProvider } from '../ai/provider.js';
import type { AstraConfig } from './config.js';
import type { UnifiedFinding, BusinessLogicRule, FileSummary } from '../findings/types.js';
import { fingerprint } from '../findings/dedup.js';
import type { KnowledgeBase } from '../rules/loader.js';
import { buildSystemPrompt } from '../ai/prompt-builder.js';

export interface CrossFileResult {
  findings: UnifiedFinding[];
  rules: BusinessLogicRule[];
  errors: string[];
}

export function parseCrossFileResponse(text: string): CrossFileResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { findings: [], rules: [], errors: ['No JSON found in AI response'] };

  try {
    const json = JSON.parse(match[0]);
    const findings: UnifiedFinding[] = (json.findings ?? []).map((f: any) => ({
      fingerprint: fingerprint('business-logic', f.ruleId ?? 'unknown', f.file ?? 'multiple', f.lineStart ?? 0),
      scanner: 'business-logic',
      ruleId: f.ruleId ?? 'unknown',
      title: f.title ?? 'Unknown cross-file issue',
      description: f.aiExplanation ?? '',
      severity: f.severity ?? 'INFO',
      category: f.category ?? 'BUSINESS_LOGIC',
      file: f.file ?? 'multiple',
      lineStart: f.lineStart ?? 0,
      lineEnd: f.lineEnd ?? 0,
      codeSnippet: f.codeSnippet ?? '',
      language: f.language ?? '',
      cwe: f.cwe ?? [],
      owasp: f.owasp ?? [],
      aiExplanation: f.aiExplanation ?? '',
      aiFix: f.aiFix ?? '',
      exploitScore: f.exploitScore ?? 0,
      confidence: f.confidence ?? 0.5,
      remediation: f.remediation ?? '',
      raw: JSON.stringify(f),
    }));

    const rules: BusinessLogicRule[] = (json.rules ?? []).map((r: any) => ({
      ruleText: r.ruleText ?? '',
      confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
      evidenceFiles: Array.isArray(r.evidenceFiles) ? r.evidenceFiles : [],
      status: 'CANDIDATE' as const,
      violationDescription: r.violationDescription ?? null,
    }));

    return { findings, rules, errors: [] };
  } catch (e: any) {
    return { findings: [], rules: [], errors: [`Failed to parse cross-file response: ${e.message}`] };
  }
}

export async function runCrossFileAnalysis(
  summaries: FileSummary[],
  provider: AIProvider,
  config: AstraConfig,
  knowledgeBase: KnowledgeBase,
): Promise<CrossFileResult & { tokensUsed: { input: number; output: number } }> {
  if (summaries.length === 0) {
    return { findings: [], rules: [], errors: [], tokensUsed: { input: 0, output: 0 } };
  }

  const systemPrompt = buildSystemPrompt(knowledgeBase, 'businessLogic');
  const summariesText = summaries
    .map((s) => `--- ${s.path} ---\nPurpose: ${s.purpose}\nExports: ${s.exports.join(', ')}\nDependencies: ${s.dependencies.join(', ')}\nRisk areas: ${s.riskAreas.join(', ')}\nSummary: ${s.summary}`)
    .join('\n\n');

  const prompt = `Here are the file summaries from a codebase scan. Analyze these for cross-file security issues:\n\n${summariesText}`;

  try {
    const response = await provider.send({
      system: systemPrompt,
      prompt,
    });

    const parsed = parseCrossFileResponse(response.text);
    return {
      ...parsed,
      tokensUsed: { input: response.inputTokens, output: response.outputTokens },
    };
  } catch (e: any) {
    return {
      findings: [],
      rules: [],
      errors: [`Cross-file AI error: ${e.message}`],
      tokensUsed: { input: 0, output: 0 },
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/cross-file.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add astra-core/src/layers/cross-file.ts astra-core/tests/cross-file.test.ts
git commit -m "feat(astra-core): add cross-file analysis layer"
```

---

### Task 14: Output Formatters (JSON + Table)

**Files:**
- Create: `astra-core/src/output/json.ts`
- Create: `astra-core/src/output/table.ts`
- Create: `astra-core/tests/json-output.test.ts`
- Create: `astra-core/tests/table-output.test.ts`

- [ ] **Step 1: Write failing test for JSON output**

```typescript
import { describe, it, expect } from 'vitest';
import { formatJsonOutput } from '../src/output/json.js';
import type { UnifiedFinding, BusinessLogicRule } from '../src/findings/types.js';

describe('formatJsonOutput', () => {
  it('produces valid JSON with scan metadata', () => {
    const findings: UnifiedFinding[] = [{
      fingerprint: 'fp1', scanner: 'ai-deep-scan', ruleId: 'r1', title: 'Test finding',
      description: 'desc', severity: 'HIGH', category: 'SAST', file: 'a.ts',
      lineStart: 1, lineEnd: 1, codeSnippet: '', language: 'ts', cwe: [], owasp: [],
      aiExplanation: '', aiFix: '', exploitScore: 5, confidence: 0.8,
      remediation: '', raw: '{}',
    }];
    const rules: BusinessLogicRule[] = [];

    const output = formatJsonOutput({
      target: './test',
      provider: 'ollama',
      model: 'deepseek-coder',
      findings,
      rules,
      filesScanned: 10,
      durationSeconds: 30,
      tokensUsed: { input: 1000, output: 500 },
      errors: [],
    });

    const parsed = JSON.parse(output);
    expect(parsed.target).toBe('./test');
    expect(parsed.findings).toHaveLength(1);
    expect(parsed.scan.timestamp).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /root/astra/astra-core && npx vitest run tests/json-output.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/output/json.ts**

```typescript
import type { UnifiedFinding, BusinessLogicRule } from '../findings/types.js';

export interface JsonOutputOptions {
  target: string;
  provider: string;
  model: string;
  findings: UnifiedFinding[];
  rules: BusinessLogicRule[];
  filesScanned: number;
  durationSeconds: number;
  tokensUsed: { input: number; output: number };
  errors: string[];
}

export function formatJsonOutput(opts: JsonOutputOptions): string {
  return JSON.stringify({
    scan: {
      target: opts.target,
      provider: opts.provider,
      model: opts.model,
      timestamp: new Date().toISOString(),
      durationSeconds: opts.durationSeconds,
      filesScanned: opts.filesScanned,
      tokensUsed: opts.tokensUsed,
      errors: opts.errors,
    },
    findings: opts.findings,
    rules: opts.rules,
  }, null, 2);
}
```

- [ ] **Step 4: Run JSON test to verify it passes**

Run: `cd /root/astra/astra-core && npx vitest run tests/json-output.test.ts`
Expected: PASS

- [ ] **Step 5: Create src/output/table.ts**

```typescript
import Table from 'cli-table3';
import chalk from 'chalk';
import type { UnifiedFinding, BusinessLogicRule, Severity } from '../findings/types.js';

const severityColors: Record<Severity, (s: string) => string> = {
  CRITICAL: (s) => chalk.bgRed.white.bold(s),
  HIGH: (s) => chalk.red.bold(s),
  MEDIUM: (s) => chalk.yellow(s),
  LOW: (s) => chalk.blue(s),
  INFO: (s) => chalk.gray(s),
};

export function formatTableOutput(findings: UnifiedFinding[], rules: BusinessLogicRule[]): string {
  const lines: string[] = [];

  if (findings.length > 0) {
    const table = new Table({
      head: ['Severity', 'Category', 'File', 'Line', 'Title', 'Confidence'],
      colWidths: [12, 16, 30, 8, 40, 10],
      style: { head: [], border: ['gray'], 'padding-left': 1, 'padding-right': 1 },
    });

    for (const f of findings) {
      const colorFn = severityColors[f.severity] ?? ((s: string) => s);
      table.push([
        colorFn(f.severity),
        f.category,
        f.file.slice(0, 28),
        f.lineStart,
        f.title.slice(0, 38),
        f.confidence.toFixed(2),
      ]);
    }

    lines.push(table.toString());
  } else {
    lines.push(chalk.green('No vulnerabilities found.'));
  }

  if (rules.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Business Logic Rules (CANDIDATE — requires human confirmation):'));
    for (const r of rules) {
      lines.push(`  [${r.confidence.toFixed(2)}] ${r.ruleText}`);
      if (r.evidenceFiles.length > 0) {
        lines.push(`         Evidence: ${r.evidenceFiles.join(', ')}`);
      }
    }
  }

  return lines.join('\n');
}
```

- [ ] **Step 6: Commit**

```bash
git add astra-core/src/output/ astra-core/tests/json-output.test.ts
git commit -m "feat(astra-core): add JSON and table output formatters"
```

---

### Task 15: Orchestrator

**Files:**
- Create: `astra-core/src/orchestrator.ts`

- [ ] **Step 1: Create src/orchestrator.ts**

```typescript
import type { AstraConfig } from './config.js';
import type { AIProvider } from './ai/provider.js';
import { resolveSource } from './source.js';
import { discoverFiles } from './discover.js';
import { runDeepScan } from './layers/deep-scan.js';
import { runCrossFileAnalysis } from './layers/cross-file.js';
import { aggregate } from './findings/aggregator.js';
import { loadKnowledgeBase } from './rules/loader.js';

export interface ScanResult {
  findings: import('./findings/types.js').UnifiedFinding[];
  rules: import('./findings/types.js').BusinessLogicRule[];
  filesScanned: number;
  durationSeconds: number;
  tokensUsed: { input: number; output: number };
  errors: string[];
}

export async function runScan(
  target: string,
  provider: AIProvider,
  config: AstraConfig,
  options?: { branch?: string; noDeep?: boolean; noCross?: boolean },
): Promise<ScanResult> {
  const start = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const allErrors: string[] = [];

  const dir = await resolveSource(target, options?.branch);

  const rulesDir = new URL('../rules', import.meta.url).pathname;
  const knowledgeBase = await loadKnowledgeBase(rulesDir);

  const discovered = await discoverFiles(dir, provider, config);
  const filesToScan = discovered.files.filter(
    (f) => f.priority <= 2 || !config.scan.severity.length,
  );

  const allFindings: import('./findings/types.js').UnifiedFinding[][] = [];
  const allRules: import('./findings/types.js').BusinessLogicRule[] = [];
  let summaries: import('./findings/types.js').FileSummary[] = [];

  if (!options?.noDeep && config.scan.layers.deepScan) {
    const deepResult = await runDeepScan(dir, filesToScan, provider, config, knowledgeBase);
    allFindings.push(deepResult.findings);
    summaries = deepResult.summaries;
    allErrors.push(...deepResult.errors);
    totalInputTokens += deepResult.tokensUsed.input;
    totalOutputTokens += deepResult.tokensUsed.output;
  }

  if (!options?.noCross && config.scan.layers.crossFile && summaries.length > 0) {
    const crossResult = await runCrossFileAnalysis(summaries, provider, config, knowledgeBase);
    allFindings.push(crossResult.findings);
    allRules.push(...crossResult.rules);
    allErrors.push(...crossResult.errors);
    totalInputTokens += crossResult.tokensUsed.input;
    totalOutputTokens += crossResult.tokensUsed.output;
  }

  const merged = aggregate(allFindings);

  const severityFilter = new Set(config.scan.severity);
  const filtered = merged.filter((f) => severityFilter.has(f.severity));

  return {
    findings: filtered,
    rules: allRules,
    filesScanned: filesToScan.length,
    durationSeconds: Math.round((Date.now() - start) / 1000),
    tokensUsed: { input: totalInputTokens, output: totalOutputTokens },
    errors: allErrors,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add astra-core/src/orchestrator.ts
git commit -m "feat(astra-core): add orchestrator that coordinates the full pipeline"
```

---

### Task 16: CLI Entry Point

**Files:**
- Create: `astra-core/src/index.ts`

- [ ] **Step 1: Create src/index.ts**

```typescript
import { Command } from 'commander';
import { loadConfig, mergeCliOverrides, type AstraConfig } from './config.js';
import { OllamaProvider } from './ai/ollama.js';
import { OpenAIProvider } from './ai/openai.js';
import { AnthropicProvider } from './ai/anthropic.js';
import { GeminiProvider } from './ai/gemini.js';
import type { AIProvider } from './ai/provider.js';
import { runScan } from './orchestrator.js';
import { formatJsonOutput } from './output/json.js';
import { formatTableOutput } from './output/table.js';
import fs from 'fs';
import path from 'path';

function createProvider(config: AstraConfig): AIProvider {
  const providerName = config.scan.provider;
  const modelName = config.scan.model;
  const providerConfig = config.providers[providerName];
  if (!providerConfig) throw new Error(`Provider "${providerName}" not found in config`);
  const modelConfig = providerConfig.models[modelName];
  if (!modelConfig) throw new Error(`Model "${modelName}" not found in provider "${providerName}"`);

  switch (providerName) {
    case 'ollama':
      return new OllamaProvider({
        baseURL: providerConfig.baseURL ?? 'http://localhost:11434',
        apiKeyEnv: providerConfig.apiKeyEnv,
        model: modelName,
        modelInfo: modelConfig,
      });
    case 'openai':
      return new OpenAIProvider({
        apiKeyEnv: providerConfig.apiKeyEnv ?? 'OPENAI_API_KEY',
        model: modelName,
        modelInfo: modelConfig,
      });
    case 'anthropic':
      return new AnthropicProvider({
        apiKeyEnv: providerConfig.apiKeyEnv ?? 'ANTHROPIC_API_KEY',
        model: modelName,
        modelInfo: modelConfig,
      });
    case 'gemini':
      return new GeminiProvider({
        apiKeyEnv: providerConfig.apiKeyEnv ?? 'GEMINI_API_KEY',
        model: modelName,
        modelInfo: modelConfig,
      });
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

const program = new Command();

program
  .name('astra')
  .description('AI-native code security scanner')
  .version('0.1.0');

program
  .command('scan')
  .description('Scan a codebase for security vulnerabilities')
  .argument('<target>', 'Local path or git URL to scan')
  .option('--provider <provider>', 'AI provider (ollama|openai|anthropic|gemini)')
  .option('--model <model>', 'AI model name')
  .option('--output <format>', 'Output format (json|table)', 'table')
  .option('--severity <levels>', 'Comma-separated severity filter (CRITICAL,HIGH,MEDIUM,LOW,INFO)')
  .option('--config <path>', 'Path to astra.config.json', './astra.config.json')
  .option('--branch <branch>', 'Git branch to scan')
  .option('--rules <path>', 'Additional rules directory')
  .option('--no-deep', 'Skip deep scan pass')
  .option('--no-cross', 'Skip cross-file analysis')
  .option('--verbose', 'Show progress details and token usage')
  .action(async (target: string, opts: any) => {
    try {
      const configPath = fs.existsSync(opts.config) ? opts.config : path.resolve(new URL('../astra.config.json', import.meta.url).pathname, '../astra.config.json');
      let config = await loadConfig(configPath);

      const overrides: any = {};
      if (opts.provider) overrides.provider = opts.provider;
      if (opts.model) overrides.model = opts.model;
      if (opts.severity) overrides.severity = opts.severity.split(',');
      config = mergeCliOverrides(config, overrides);

      const provider = createProvider(config);
      console.log(`Astra Security Scanner`);
      console.log(`Provider: ${config.scan.provider} | Model: ${config.scan.model}`);
      console.log(`Scanning: ${target}`);
      console.log('');

      const result = await runScan(target, provider, config, {
        branch: opts.branch,
        noDeep: opts.noDeep,
        noCross: opts.noCross,
      });

      const outputFormats = opts.output?.split(',') ?? ['table'];
      for (const format of outputFormats) {
        if (format === 'json') {
          const jsonOutput = formatJsonOutput({
            target,
            provider: config.scan.provider,
            model: config.scan.model,
            findings: result.findings,
            rules: result.rules,
            filesScanned: result.filesScanned,
            durationSeconds: result.durationSeconds,
            tokensUsed: result.tokensUsed,
            errors: result.errors,
          });
          console.log(jsonOutput);
        } else if (format === 'table') {
          console.log(formatTableOutput(result.findings, result.rules));
        }
      }

      if (opts.verbose) {
        console.log('');
        console.log(`Files scanned: ${result.filesScanned}`);
        console.log(`Duration: ${result.durationSeconds}s`);
        console.log(`Tokens: ${result.tokensUsed.input} input / ${result.tokensUsed.output} output`);
        if (result.errors.length > 0) {
          console.log(`Errors: ${result.errors.length}`);
          for (const err of result.errors) {
            console.log(`  - ${err}`);
          }
        }
      }

      console.log('');
      console.log(`Found ${result.findings.length} finding(s), ${result.rules.length} business logic rule(s)`);

      if (result.findings.some((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')) {
        process.exit(1);
      }
    } catch (e: any) {
      console.error(`Error: ${e.message}`);
      process.exit(2);
    }
  });

program.parse();
```

- [ ] **Step 2: Build and verify CLI works**

Run: `cd /root/astra/astra-core && npm run build`
Expected: builds successfully

Run: `cd /root/astra/astra-core && node dist/index.js --help`
Expected: shows help text with `scan` command and all options

- [ ] **Step 3: Commit**

```bash
git add astra-core/src/index.ts
git commit -m "feat(astra-core): add CLI entry point with Commander.js"
```

---

### Task 17: Integration Test + Final Verification

**Files:**
- Create: `astra-core/tests/integration.test.ts`

- [ ] **Step 1: Write integration test that exercises the full pipeline with a mock**

```typescript
import { describe, it, expect } from 'vitest';
import { runScan } from '../src/orchestrator.js';
import type { AIProvider, AIResponse, ModelInfo } from '../src/ai/provider.js';
import { configSchema } from '../src/config.js';

class MockProvider implements AIProvider {
  id = 'mock';

  async send(): Promise<AIResponse> {
    return {
      text: JSON.stringify({
        prioritized: [{ path: 'app.ts', priority: 0, language: 'typescript' }],
        skipped: [],
      }),
      inputTokens: 100,
      outputTokens: 50,
      durationMs: 100,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: 'mock-model',
      inputTokenLimit: 100000,
      outputTokenLimit: 10000,
      contextWindow: 100000,
      supportsSystemPrompt: true,
    };
  }
}

describe('full pipeline integration', () => {
  it('runs discovery and returns results', async () => {
    const config = configSchema.parse({
      providers: {
        ollama: {
          baseURL: 'http://localhost:11434',
          models: {
            'test-model': {
              inputTokenLimit: 100000,
              outputTokenLimit: 10000,
              contextWindow: 100000,
              temperature: 0.2,
            },
          },
        },
      },
      scan: {
        provider: 'ollama',
        model: 'test-model',
      },
    });

    const provider = new MockProvider();
    const result = await runScan('.', provider, config, { noDeep: true, noCross: true });
    expect(result).toBeDefined();
    expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `cd /root/astra/astra-core && npx vitest run`
Expected: all tests PASS

- [ ] **Step 3: Run TypeScript type check**

Run: `cd /root/astra/astra-core && npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Build**

Run: `cd /root/astra/astra-core && npm run build`
Expected: builds successfully

- [ ] **Step 5: Commit**

```bash
git add astra-core/tests/integration.test.ts
git commit -m "test(astra-core): add integration test with mock provider"
```

---

## Self-Review

### Spec Coverage

| Spec Section | Tasks |
|---|---|
| 1. Overview | Task 16 (CLI entry) |
| 2. Architecture (Dir structure) | Task 1 |
| 3. Scan Input Sources | Task 10 |
| 4. Pipeline Stages (Config) | Task 4 |
| 4. Pipeline Stages (Knowledge) | Task 8 |
| 4. Pipeline Stages (Source) | Task 10 |
| 4. Pipeline Stages (Discovery) | Task 11 |
| 4. Pipeline Stages (Deep Scan) | Task 12 |
| 4. Pipeline Stages (Cross-File) | Task 13 |
| 4. Pipeline Stages (Aggregate) | Task 3 |
| 5. AI Provider System | Tasks 6, 7 |
| 6. Configuration | Task 4 |
| 7. Findings Schema | Task 2 |
| 8. Tech Stack | Task 1 |
| 9. Custom Rule Language | Task 8 (parser) |
| 10. Output Formats | Task 14 |
| 11. Error Handling | Task 15 (orchestrator) |
| 12. PoC Scope | All tasks |

### Placeholder Scan
No TBDs, TODOs, or vague "implement later" language. All code shown in full.

### Type Consistency
- `UnifiedFinding` defined in Task 2, used consistently in Tasks 3, 12, 13, 14, 15
- `BusinessLogicRule` defined in Task 2, used in Tasks 13, 14, 15
- `FileSummary` defined in Task 2, used in Tasks 12, 13, 15
- `AIProvider` interface defined in Task 6, implemented in Tasks 6, 7, used in Tasks 11, 12, 13, 15
- `AstraConfig` defined in Task 4, used consistently throughout
- `KnowledgeBase` defined in Task 8, used in Tasks 9, 12, 13, 15