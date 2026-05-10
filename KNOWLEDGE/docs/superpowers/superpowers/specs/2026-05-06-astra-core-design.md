# Astra-Core — AI-Native Code Scanner Design Specification

**Date:** 2026-05-06
**Status:** Approved (brainstorm phase complete)
**Project:** astra-core — standalone AI-powered security scanning engine

---

## 1. Overview

Astra-core is an AI-native code scanning engine that leverages large language models to analyze entire codebases for vulnerabilities, insecure patterns, and business logic flaws. It operates with the expertise of a senior security engineer with 20+ years of experience, informed by a configurable knowledge base of security guidelines, vulnerability patterns, and custom rules.

**AI is the only scanner.** There is no separate regex engine or pattern matcher. Rules, guidelines, and patterns are knowledge that feeds the AI — not separate scanning engines. The AI reads code, understands context, and produces findings.

### Key Principles

- AI-native: every scanning decision flows through AI understanding
- Knowledge-driven: rules/guidelines/patterns feed AI context, not executed as separate scanners
- Cumulative prompts: start with a base prompt, stack rules from the knowledge base
- Multi-provider: Ollama (local + cloud), OpenAI, Anthropic Claude, Google Gemini
- CLI-first: `astra scan ./my-repo`, server mode later
- Configurable: everything tunable via `astra.config.json`

---

## 2. Architecture

### 2.1 Pipeline Architecture

Astra-core uses a sequential pipeline architecture. Each scan flows through ordered stages:

```
CLI input → Config → Load Knowledge → Source Resolution → AI Discovery → Deep Scan → Cross-File → Aggregate → Output
```

### 2.2 Directory Structure

```
astra-core/
├── src/
│   ├── index.ts                  ← CLI entry point
│   ├── orchestrator.ts           ← Pipeline coordinator
│   ├── config.ts                 ← Config loader + Zod validator
│   ├── discover.ts              ← AI-guided repo discovery
│   ├── tokenizer.ts              ← Token counting + budget allocation
│   ├── source.ts                 ← Source resolver (local/git/cloud)
│   │
│   ├── layers/
│   │   ├── deep-scan.ts          ← Per-file AI analysis
│   │   └── cross-file.ts         ← Cross-file reasoning
│   │
│   ├── ai/
│   │   ├── provider.ts           ← Provider interface
│   │   ├── ollama.ts             ← Ollama provider (local + cloud)
│   │   ├── openai.ts             ← OpenAI provider
│   │   ├── anthropic.ts          ← Anthropic Claude provider
│   │   ├── gemini.ts             ← Google Gemini provider
│   │   └── prompt-builder.ts     ← Assembles prompts from knowledge
│   │
│   ├── findings/
│   │   ├── types.ts              ← UnifiedFinding + BusinessLogicRule types
│   │   ├── normalizer.ts         ← Severity normalization, category mapping
│   │   ├── dedup.ts              ← SHA-256 dedup fingerprinting
│   │   └── aggregator.ts         ← Merge findings from all layers
│   │
│   ├── output/
│   │   ├── json.ts               ← JSON formatter
│   │   ├── table.ts              ← Pretty terminal table
│   │   ├── html.ts               ← HTML report generator
│   │   └── sarif.ts              ← SARIF output
│   │
│   └── rules/
│       ├── loader.ts             ← Loads patterns/guidelines/prompts into AI context
│       └── parser.ts             ← Parses .astra rule files + JSON into AI context strings
│
├── rules/                        ← Knowledge base (shipped with astra-core)
│   ├── patterns/
│   │   ├── injections.json       ← SQL injection, XSS, command injection
│   │   ├── secrets.json          ← Hardcoded keys, tokens, passwords
│   │   ├── auth.json             ← Insecure JWT, weak hashing, missing auth
│   │   └── misconfig.json        ← CORS, CSP, insecure headers
│   │
│   ├── guidelines/
│   │   ├── secure-coding.md      ← General secure coding principles
│   │   ├── owasp-top10.md        ← OWASP Top 10 reference
│   │   ├── business-logic.md     ← Business logic flaw patterns
│   │   └── language/
│   │       ├── javascript.md
│   │       ├── python.md
│   │       ├── go.md
│   │       └── typescript.md
│   │
│   └── prompts/
│       ├── deep-scan.md          ← Per-file analysis prompt template
│       ├── business-logic.md     ← Cross-file reasoning prompt template
│       └── enrichment.md         ← Finding enrichment prompt template
│
├── astra.config.json             ← Default config (overridable per project)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── Dockerfile                    ← Future Docker distribution
```

---

## 3. Scan Input Sources

Every scan starts by resolving the code source to a local directory on disk. Three input modes:

### 3.1 Local Directory

```bash
$ astra scan ./my-project
$ astra scan /home/user/code/app
```

- No auth needed
- Instant access — files already on disk
- Use case: local dev, CI/CD volume mounts

### 3.2 Git Repo URL

```bash
$ astra scan https://github.com/org/repo
$ astra scan git@github.com:org/repo.git
$ astra scan https://gitlab.com/org/repo
```

- Clones the repo to a temp directory (`/tmp/astra-scan-xxxx/`)
- Supports HTTPS and SSH (uses system git credentials)
- Supports `--branch` flag for non-default branches
- Use case: quick scans, CI pipelines, one-off audits

### 3.3 Cloud Repository (API) — Planned for post-PoC

```bash
$ astra scan github:org/repo
$ astra scan gitlab:org/repo
```

- Fetches files via GitHub/GitLab API instead of git clone
- Requires configured credentials (PAT, OAuth, App token)
- Avoids full clone — fetches only relevant files
- Use case: SaaS dashboards, webhook-triggered scans, rate-limited environments

### 3.4 Source Resolver

The `source.ts` module auto-detects the input type:

| Input Pattern | Detection | Action |
|---|---|---|
| `./path`, `/abs/path` | Starts with `./`, `/`, or exists as directory | Use directly |
| `https://`, `git@` | Matches git URL patterns | Clone to `/tmp/astra-scan-xxxx/` |
| `github:`, `gitlab:` | Prefix matching | Fetch via API (post-PoC) |

### 3.5 Cloud Auth Config

```json
{
  "sources": {
    "github": {
      "tokenEnv": "GITHUB_TOKEN",
      "apiUrl": "https://api.github.com"
    },
    "gitlab": {
      "tokenEnv": "GITLAB_TOKEN",
      "apiUrl": "https://gitlab.com/api/v4"
    }
  }
}
```

---

## 4. Pipeline Stages

### 4.1 Load Config

Parse `astra.config.json` + merge CLI flags. Validate with Zod. Resolve provider, model, token limits, output format. CLI flags override config file values.

### 4.2 Load Knowledge Base

Read all files from the `rules/` directory — pattern definitions, security guidelines, OWASP references, language-specific guides, and prompt templates. Also load any user-defined custom rules and guidelines. All become the AI's knowledge context.

| Source | Purpose |
|---|---|
| `rules/patterns/` | Known vulnerability patterns — fed as reference context to AI, NOT executed as regex |
| `rules/guidelines/` | Secure coding principles, OWASP Top 10, language-specific security guides |
| `rules/prompts/` | System prompt templates. Base instructions defining the AI's role |
| Custom rules | User-defined `.astra` rule files + extra guidelines. Stacked on top of built-in knowledge |

### 4.3 Source Resolution

Auto-detect input type and resolve to a local directory on disk. See Section 3.

### 4.4 AI-Guided Repo Discovery

Replaces a traditional file walker. Instead of hardcoded skip patterns, the AI reads the repo structure and decides what matters.

**Pass 1 — Structure scan:** Send the directory tree (file paths only, no content) to AI. AI identifies entry points, auth modules, business logic, config files, and what to skip. Returns a prioritized file list.

**Pass 2 — Token budget allocation:** Based on the AI's priority ranking and the model's token limits from config, allocate context budget. High-priority files get full analysis. Low-priority files may get lighter treatment or be skipped entirely.

| Field | Value |
|---|---|
| Input | Directory tree (paths only, no content) |
| AI prompt | "Given this repo structure, identify the most security-relevant files. Rank by: entry points, auth/perm logic, business logic, data handling, config/secrets." |
| Output | `PrioritizedFileList` — ordered list with priority tiers (P0-P4) and skip list |
| Token cost | Small — directory trees are compact. ~1-2K tokens for most repos |

**Priority tiers:**

| Tier | Files | Examples |
|---|---|---|
| P0 | Entry points | `routes/`, `api/`, `controllers/`, `server.ts`, `app.ts`, `main.go` |
| P1 | Auth & security | `auth/`, `middleware/`, `*auth*`, `*jwt*`, `*permission*` |
| P2 | Business logic | `services/`, `models/`, `*payment*`, `*user*`, `*order*` |
| P3 | Config & data | `migrations/`, `schema.*`, `config.*`, `docker-compose.*` |
| P4 | Other code | `utils/`, `helpers/`, `types/`, `constants/` |

### 4.5 Deep Scan (Per-File AI Analysis)

Each prioritized file is sent to the AI with the full knowledge base (guidelines + patterns as reference) plus the system prompt. The AI acts as a senior security engineer reviewing the code.

| Field | Value |
|---|---|
| Input | File content + system prompt (role + guidelines + patterns + custom rules) |
| Process | Batch files by `scan.batchSize` → send to AI → parse structured response → extract `findings[]` + `file_summary` |
| Output | `UnifiedFinding[]` (scanner: "ai-deep-scan") + `FileSummary[]` for cross-file pass |
| AI role | "You are reviewing this code with 20+ years of cybersecurity and development expertise. Consider the guidelines and known patterns. Find vulnerabilities, anti-patterns, insecure code, missing validations." |

**Context management:**
- Small files (< 8KB default): sent whole to AI
- Large files (> 8KB): chunked by function/class boundaries, each chunk gets file header context (imports, types)
- Token budget calculated from model's `inputTokenLimit - systemPromptTokens - outputTokenLimit`
- ~4 chars per token for code estimation

### 4.6 Cross-File Analysis (Business Logic + Architecture)

Aggregates all `FileSummary[]` into a single codebase map. AI reasons across files to find cross-cutting security flaws that cannot be seen from a single file.

| Field | Value |
|---|---|
| Input | All `FileSummary[]` + guidelines + rules |
| Finds | Missing auth middleware, privilege escalation, broken access control, data flow violations, insecure architecture patterns |
| Output | `UnifiedFinding[]` (scanner: "business-logic") + `BusinessLogicRule[]` (status: CANDIDATE) |
| Token cost | Single large context call. Higher than per-file but only one call. |

### 4.7 Aggregate + Output

**Normalize:** All findings get consistent severity levels, CWE/OWASP mappings.

**Dedup:** SHA-256 fingerprint on `scanner + ruleId + file + lineStart`. Duplicate findings across deep scan and cross-file passes are merged — highest severity wins.

**Output:** Formatted per config — JSON, table, HTML report, or SARIF.

---

## 5. AI Provider System

### 5.1 Provider Interface

Every AI provider implements the same interface:

```typescript
interface AIProvider {
  id: string  // "ollama" | "openai" | "anthropic" | "gemini"
  send(request: AIRequest): Promise<AIResponse>
  estimateTokens(text: string): number
  getModelInfo(): ModelInfo
}

interface AIRequest {
  system: string
  prompt: string
  maxOutputTokens?: number
}

interface AIResponse {
  text: string
  inputTokens: number
  outputTokens: number
  durationMs: number
}

interface ModelInfo {
  id: string
  inputTokenLimit: number
  outputTokenLimit: number
  contextWindow: number
  supportsSystemPrompt: boolean
}
```

### 5.2 Supported Providers

| Provider | SDK / Method | Env Key | Privacy |
|---|---|---|---|
| Ollama | HTTP client to `/api/generate` | `OLLAMA_API_KEY` (optional) | Air-gapped capable |
| OpenAI | `openai` npm package | `OPENAI_API_KEY` | Cloud |
| Anthropic | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY` | Cloud |
| Gemini | `@google/generative-ai` | `GEMINI_API_KEY` | Cloud |

### 5.3 Prompt Assembly

The `prompt-builder.ts` assembles prompts cumulatively from the knowledge base:

1. **Role definition** ← `rules/prompts/deep-scan.md` (base prompt, e.g., "You are a senior security engineer with 20+ years experience...")
2. **Security guidelines** ← `rules/guidelines/secure-coding.md`, `owasp-top10.md`, `language/{lang}.md`
3. **Known vulnerability patterns** ← `rules/patterns/*.json` (as reference text, NOT executed)
4. **Custom rules** ← `rules/patterns/custom/*.astra`, `rules/guidelines/custom/*.md`, config-specified paths
5. **Output format instruction** ← "Return findings as JSON array with fields: title, severity, category, file, line..."

Custom rules and user guidelines are stacked on top of built-in knowledge — every rule mentioned keeps adding to the system's understanding.

---

## 6. Configuration

### 6.1 astra.config.json

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
        },
        "gpt-4.1": {
          "inputTokenLimit": 1047576,
          "outputTokenLimit": 32768,
          "contextWindow": 1047576,
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
    "model": "deepseek-coder",
    "layers": {
      "deepScan": true,
      "crossFile": true
    },
    "severity": ["CRITICAL", "HIGH", "MEDIUM"],
    "ignore": [
      "node_modules/**",
      "dist/**",
      "*.min.js",
      "*.lock"
    ],
    "maxFileBytes": 8192,
    "batchSize": 5
  },

  "rules": {
    "customPatterns": "./custom-rules/",
    "guidelines": "./security-guides.md"
  },

  "sources": {
    "github": {
      "tokenEnv": "GITHUB_TOKEN",
      "apiUrl": "https://api.github.com"
    },
    "gitlab": {
      "tokenEnv": "GITLAB_TOKEN",
      "apiUrl": "https://gitlab.com/api/v4"
    }
  },

  "output": {
    "format": ["json", "table"],
    "path": "./astra-results/"
  }
}
```

### 6.2 CLI Flags (override config)

```
$ astra scan <target> [options]

Options:
  --provider     ollama|openai|anthropic|gemini   (default: from config)
  --model        Model name                       (default: from config)
  --output       json|table|html|sarif            (default: from config)
  --severity     CRITICAL,HIGH,MEDIUM,LOW,INFO   (filter by severity)
  --config       Path to astra.config.json        (default: ./astra.config.json)
  --branch       Git branch to scan              (default: main)
  --rules        Additional rules directory       (stacked on top of built-in)
  --no-deep      Skip deep scan pass
  --no-cross     Skip cross-file analysis pass
  --verbose      Show progress details, token usage
  --help         Show help
```

---

## 7. Findings Schema

### 7.1 UnifiedFinding

```typescript
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
type Category = 'SAST' | 'SCA' | 'SECRETS' | 'IAC' | 'DATA_FLOW' | 'BUSINESS_LOGIC';

interface UnifiedFinding {
  fingerprint: string;        // SHA-256(scanner + ruleId + file + lineStart)
  scanner: string;            // "ai-deep-scan" | "business-logic"
  ruleId: string;             // AI-generated or pattern-referenced ID
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  file: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  language: string;
  cwe: string[];              // e.g., ['CWE-89']
  owasp: string[];            // e.g., ['A03:2021']
  aiExplanation: string;      // Plain-English risk explanation
  aiFix: string;              // Concrete code fix snippet
  exploitScore: number;        // 0-10
  confidence: number;          // 0.0-1.0 — AI's confidence in this finding
  remediation: string;
  raw: string;                // Raw AI response JSON
}
```

### 7.2 BusinessLogicRule

```typescript
interface BusinessLogicRule {
  ruleText: string;            // Natural language rule description
  confidence: number;          // 0.0-1.0
  evidenceFiles: string[];     // Files that support this rule
  status: 'CANDIDATE' | 'CONFIRMED' | 'REJECTED';
  violationDescription: string | null;
}
```

### 7.3 FileSummary (internal — passed between layers)

```typescript
interface FileSummary {
  path: string;
  language: string;
  purpose: string;             // AI-described purpose of this file
  exports: string[];           // Key exports/functions
  dependencies: string[];      // Files this module depends on
  riskAreas: string[];         // Areas of concern identified
  summary: string;             // Concise AI summary for cross-file context
}
```

---

## 8. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 22 + TypeScript | User choice. Strong AI SDK ecosystem. |
| CLI | Commander.js | Lightweight, well-maintained, TypeScript-first. |
| Config validation | Zod | Type-safe config validation with good DX. |
| AI — Ollama | HTTP client (`fetch`) | Ollama's native REST API. |
| AI — OpenAI | `openai` npm package | Official SDK. |
| AI — Anthropic | `@anthropic-ai/sdk` | Official SDK. |
| AI — Gemini | `@google/generative-ai` | Official SDK. |
| Terminal output | cli-table3 + chalk | Pretty tables with severity coloring. |
| HTML reports | Template strings | Zero dependency, fast generation. |
| SARIF | JSON conforming to SARIF schema | GitHub Code Scanning standard. |
| Testing | Vitest | Fast, ESM-native, great TypeScript. |
| Build | tsup | Fast bundler for Node.js CLIs. |

---

## 9. Custom Rule Language (.astra)

Users can write custom rules in `.astra` files. These are parsed and fed into AI context as additional knowledge.

### 9.1 Example

```
rule NO_EVAL {
  severity: HIGH
  category: SAST
  cwe: CWE-95
  match: /eval\s*\(/ in javascript,typescript
  message: "eval() usage detected — risk of code injection"
}

rule NO_INLINE_STYLES {
  severity: MEDIUM
  category: SAST
  match: /dangerouslySetInnerHTML/ in typescript
  message: "React dangerouslySetInnerHTML — XSS risk"
}
```

### 9.2 Rule Syntax

```
rule <RULE_ID> {
  severity: CRITICAL | HIGH | MEDIUM | LOW | INFO
  category: SAST | SCA | SECRETS | IAC | DATA_FLOW | BUSINESS_LOGIC
  cwe: CWE-XXX                    (optional)
  owasp: AXX:YYYY                (optional)
  match: /<pattern>/ in <lang1>,<lang2>   (optional — for reference only)
  message: "<description>"
}
```

Rules in `.astra` files are **not executed as regex**. They are parsed and included in the AI's system prompt as additional knowledge. The match pattern serves as a reference for the AI — it tells the AI what pattern to watch for, but the AI uses its own understanding to find it.

---

## 10. Output Formats

### 10.1 JSON

Structured JSON output — easy to parse, pipe, integrate with other tools.

```json
{
  "scanId": "sha256-hash",
  "target": "./my-repo",
  "provider": "ollama",
  "model": "deepseek-coder",
  "timestamp": "2026-05-06T12:00:00Z",
  "durationSeconds": 42,
  "filesScanned": 23,
  "tokensUsed": { "input": 50000, "output": 8000 },
  "findings": [...],
  "rules": [...]
}
```

### 10.2 Table

Colored terminal output with severity-colored rows.

### 10.3 HTML

Self-contained HTML report — shareable, no server needed. Carbon Design System styled.

### 10.4 SARIF

Standard format for GitHub Code Scanning, Azure DevOps, and other security tooling integrations.

---

## 11. Error Handling

- AI provider errors: retry with exponential backoff (3 attempts), then skip file and report
- Invalid config: fail fast with clear Zod validation error message
- Git clone failures: report URL + error, suggest SSH vs HTTPS
- Token limit exceeded: chunk file, continue with smaller pieces
- No AI provider configured: fail with clear message — "astra-core requires an AI provider. Set OLLAMA_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY."
- Partial failures: always produce output. Failed files listed in `errors[]` alongside `findings[]`.

---

## 12. PoC Scope

### In scope (PoC)

- CLI tool: `astra scan <target>`
- Local directory + git URL input
- AI-guided repo discovery
- Deep scan (per-file AI analysis)
- Cross-file analysis
- All 4 AI providers (Ollama, OpenAI, Anthropic, Gemini)
- JSON + table output formats
- `astra.config.json` with Zod validation
- Knowledge base: built-in rules/guidelines/prompts
- Custom `.astra` rule support
- Token counting + budget management
- Dedup + normalization

### Post-PoC (planned, not yet built)

- Server mode (HTTP API for dashboard)
- HTML report output
- SARIF output
- Cloud repo API input (github:org/repo, gitlab:org/repo)
- Docker image distribution
- WebSocket progress streaming
- Business logic rule confirmation UI

---

## 13. Design Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Pipeline | Simple, testable, easy to add/remove stages. Can evolve to plugin/event-driven later. |
| AI as scanner | Yes, no regex engine | User requirement: AI-native tool. Patterns feed AI context, not executed separately. |
| AI-guided discovery | Yes, replaces file walker | AI decides what matters based on repo structure, not hardcoded regex. |
| Language | TypeScript / Node.js | User choice. |
| Config | Zod + JSON | Type-safe validation, good developer experience. |
| Token limits | Per-model in config | Different models have very different limits. Must be configurable. |
| Custom rules | `.astra` rule language | Human-readable, easy to extend, parsed into AI context. |
| Cumulative prompts | Yes | Base prompt + built-in rules + custom rules all stack. Every rule adds to AI understanding. |
| No local model pulling | Cloud API first | User explicitly requested cloud models via API key, not local pulling. |