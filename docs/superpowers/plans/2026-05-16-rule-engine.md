# Rule Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified rule engine that supports security, compliance, SLA, and business logic rules — injectable into all AI prompts (deep-scan, cross-file, chat) with severity-prioritized token budgets, and enforceable during scan pipeline.

**Architecture:** Extend the existing `UserRule` Prisma model with rule types (SECURITY/COMPLIANCE/SLA/BUSINESS_LOGIC), scoping (GLOBAL/PROJECT), Semgrep-inspired matching, and SLA fields. Create a unified `loadRulesForContext()` loader that gathers active DB rules + confirmed BusinessLogicRules + filesystem patterns/guidelines, deduplicates, prioritizes by severity, and returns a formatted string for AI prompt injection. Update all 3 AI prompt injection points. Add SLA enforcement to persist node. Extend the existing `/rules` page UI.

**Tech Stack:** Prisma (PostgreSQL), Next.js App Router, IBM Carbon Components (inline styles), TypeScript

---

## File Structure

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Add RuleType, RuleScope, RuleStatus enums; extend UserRule; add slaDeadline to Finding |
| `prisma/seed.ts` | Update 5 builtin rules with `type`; add 3 new demo rules (SLA, compliance, business logic) |
| `src/rules/loader.ts` | Add `loadRulesForContext()` and `formatRuleForPrompt()` |
| `src/rules/formatter.ts` | NEW — rule-to-prompt formatting (per-type formatters) |
| `src/scan/nodes/deep-scan.ts` | Call `loadRulesForContext()`, pass rulesText to prompt |
| `src/scan/nodes/cross-file.ts` | Call `loadRulesForContext()`, pass rulesText to prompt |
| `src/scan/prompts/deep-scan.ts` | Add `rulesText` param to `buildDeepScanPrompt()` and `buildCrossFilePrompt()` |
| `src/lib/ai-chat.ts` | Call `loadRulesForContext()` in `sendChatMessage()`, append to system prompt |
| `src/lib/config.ts` | Add `rulesTokenBudget` to nodeConfigSchema, `chatRulesTokenBudget` to chatConfigSchema |
| `src/scan/nodes/persist.ts` | SLA enforcement: check SLA rules, set `slaDeadline` on matching findings |
| `src/app/api/v1/user-rules/route.ts` | Accept new fields in POST, add filter params to GET |
| `src/app/api/v1/user-rules/[id]/route.ts` | Accept new fields in PATCH |
| `src/app/(app)/rules/page.tsx` | Extend form/edit UI with new fields (type, scope, languages, SLA, etc.) |
| `src/lib/changelog.ts` | Version entry |

---

### Task 1: Prisma Schema — Enums and Extended UserRule

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums to schema.prisma**

Add these 3 enums before the `UserRule` model (after `RuleStatus` if it exists, or after `ItemStatus`):

```prisma
enum RuleType {
  SECURITY
  COMPLIANCE
  SLA
  BUSINESS_LOGIC
}

enum RuleScope {
  GLOBAL
  PROJECT
}

enum RuleScopeStatus {
  ACTIVE
  DRAFT
  DEPRECATED
}
```

Note: Using `RuleScopeStatus` to avoid collision with the existing `RuleStatus` enum used by `BusinessLogicRule` (which has `CANDIDATE`, `CONFIRMED`, `REJECTED`).

- [ ] **Step 2: Extend the UserRule model**

Replace the existing `UserRule` model in `prisma/schema.prisma` with:

```prisma
model UserRule {
  id             String         @id @default(cuid())
  name           String
  description    String         @default("")
  ruleText       String

  // Type & scope
  type           RuleType       @default(SECURITY)
  scope          RuleScope      @default(GLOBAL)
  repoUrl        String?

  // Matching & filtering
  severity       String         @default("MEDIUM")
  category       String         @default("SAST")
  languages      String[]       @default([])
  paths          String[]       @default([])
  excludePaths   String[]       @default([])
  matchPattern   String?

  // SLA-specific
  slaSeverity    String?
  slaHours       Int?
  slaAction      String?

  // Metadata
  cwe            String[]       @default([])
  owasp          String[]      @default([])
  priority       Int            @default(0)
  fixSuggestion  String?
  references     String[]       @default([])
  tags           String[]       @default([])
  codeRule       String?
  source         String         @default("manual")

  // Status & lifecycle
  isActive       Boolean        @default(true)
  status         RuleScopeStatus @default(ACTIVE)
  isBuiltin      Boolean        @default(false)
  enabledAt      DateTime?
  lastUsedAt     DateTime?

  // Relationships
  userId         String?
  scanId         String?
  user           User?          @relation(fields: [userId], references: [id], onDelete: SetNull)
  scan           Scan?          @relation(fields: [scanId], references: [id], onDelete: Cascade)

  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@index([scanId])
  @@index([isActive])
  @@index([scope])
  @@index([category])
  @@index([severity])
  @@index([priority])
  @@index([type])
}
```

- [ ] **Step 3: Add `slaDeadline` to Finding model**

Add `slaDeadline DateTime?` to the `Finding` model in `prisma/schema.prisma`, after the `cvssVector` field:

```prisma
  slaDeadline    DateTime?      // When the SLA for this finding expires
```

- [ ] **Step 4: Add `rules` relation to User model**

Find the `User` model and add:

```prisma
  rules          UserRule[]
```

- [ ] **Step 5: Run migration**

```bash
npx prisma migrate dev --name add_rule_engine
```

Expected: Migration creates `RuleType`, `RuleScope`, `RuleScopeStatus` enums; alters `UserRule` table with all new columns; adds `slaDeadline` to `Finding`; no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: extend UserRule model with rule types, scoping, SLA, matching fields"
```

---

### Task 2: Seed — Update Builtin Rules + Add Demo Rules

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Update the 5 existing builtin rules with `type`**

In `prisma/seed.ts`, find the `BUILTIN_RULES` array and add `type` to each rule:

```typescript
const BUILTIN_RULES = [
  {
    name: 'No hardcoded secrets',
    description: 'Flag any hardcoded API keys, passwords, tokens, or credentials in source files.',
    ruleText: 'Report any string literals that appear to be API keys, passwords, connection strings, or authentication tokens. Look for patterns like "password =", "api_key =", "secret =", connection string formats, and bearer token assignments.',
    type: 'SECURITY',
    severity: 'CRITICAL',
    category: 'SECRETS',
    cwe: ['CWE-798'],
    scope: 'GLOBAL',
    priority: 10,
  },
  {
    name: 'SQL injection risk',
    description: 'Detect unsanitized user input concatenated into SQL queries.',
    ruleText: 'Identify database queries that concatenate user-controlled input directly without parameterization or prepared statements. Flag string formatting, concatenation, or template literal usage in SQL context.',
    type: 'SECURITY',
    severity: 'CRITICAL',
    category: 'SAST',
    cwe: ['CWE-89'],
    scope: 'GLOBAL',
    priority: 10,
  },
  {
    name: 'Missing authentication check',
    description: 'Flag API endpoints or routes that process sensitive operations without verifying authentication.',
    ruleText: 'Look for request handlers, route definitions, or API endpoints that perform privileged actions (data mutation, admin operations, user management) without a visible auth check, session validation, or middleware guard.',
    type: 'SECURITY',
    severity: 'HIGH',
    category: 'BUSINESS_LOGIC',
    cwe: ['CWE-306'],
    scope: 'GLOBAL',
    priority: 8,
  },
  {
    name: 'Insecure direct object reference',
    description: 'Detect cases where user-supplied IDs access objects without ownership verification.',
    ruleText: 'Flag code that uses a user-supplied identifier (from URL params, query string, or request body) to look up a database record without verifying the requesting user owns or has permission to access that record.',
    type: 'SECURITY',
    severity: 'HIGH',
    category: 'SAST',
    cwe: ['CWE-639'],
    scope: 'GLOBAL',
    priority: 7,
  },
  {
    name: 'Sensitive data in logs',
    description: 'Detect PII, credentials, or sensitive values being written to logs.',
    ruleText: 'Identify logging statements (console.log, logger.info, print, etc.) that include sensitive fields such as passwords, tokens, credit card numbers, SSNs, email addresses, or any field labeled as private or confidential.',
    type: 'COMPLIANCE',
    severity: 'MEDIUM',
    category: 'DATA_FLOW',
    cwe: ['CWE-532'],
    scope: 'GLOBAL',
    priority: 5,
    tags: ['gdpr', 'logging', 'pii'],
  },
];
```

- [ ] **Step 2: Add 3 new demo rules after BUILTIN_RULES**

```typescript
const EXTRA_RULES = [
  {
    name: 'Critical SLA: 4-hour response',
    description: 'CRITICAL severity findings must be triaged within 4 hours. Escalate to security lead on breach.',
    ruleText: 'CRITICAL findings must be triaged within 4 hours. Escalate to security lead on breach.',
    type: 'SLA',
    severity: 'CRITICAL',
    category: 'SAST',
    scope: 'GLOBAL',
    priority: 10,
    slaSeverity: 'CRITICAL',
    slaHours: 4,
    slaAction: 'ESCALATE',
    tags: ['sla', 'critical-response'],
  },
  {
    name: 'PII encryption at rest',
    description: 'All personally identifiable information must be encrypted at rest. Check for unencrypted columns storing names, emails, SSNs, or financial data.',
    ruleText: 'All personally identifiable information (PII) must be encrypted at rest. Check for unencrypted database columns storing names, emails, SSNs, or financial data. Flag any model or schema that stores PII in plaintext.',
    type: 'COMPLIANCE',
    severity: 'HIGH',
    category: 'DATA_FLOW',
    scope: 'GLOBAL',
    priority: 7,
    cwe: ['CWE-312'],
    owasp: ['A02:2021'],
    tags: ['gdpr', 'soc2', 'pii', 'encryption'],
    fixSuggestion: 'Use AES-256-GCM or similar encryption for PII columns. Consider column-level encryption or application-level encryption before storage.',
  },
  {
    name: 'Payment flow integrity',
    description: 'All payment processing must go through a dedicated PaymentService. Check for price manipulation, race conditions, and missing idempotency keys.',
    ruleText: 'All payment processing must go through a dedicated PaymentService or equivalent abstraction. Direct database access from payment routes is a violation. Check for: (1) price manipulation via client-side price parameters, (2) race conditions in checkout flows, (3) missing idempotency keys on payment endpoints, (4) bypassing payment gateway validation.',
    type: 'BUSINESS_LOGIC',
    severity: 'HIGH',
    category: 'BUSINESS_LOGIC',
    scope: 'GLOBAL',
    priority: 8,
    paths: ['**/payment/**', '**/checkout/**', '**/order/**', '**/stripe/**'],
    tags: ['payments', 'business-logic', 'fraud'],
  },
];
```

- [ ] **Step 3: Update the seed loop to handle new fields**

Find the seed loop (around line 461) and update it to iterate over both arrays and include the new fields:

```typescript
const ALL_RULES = [...BUILTIN_RULES, ...EXTRA_RULES];

for (const rule of ALL_RULES) {
  const existing = await prisma.userRule.findFirst({
    where: { name: rule.name, isBuiltin: true },
  });
  if (!existing) {
    await prisma.userRule.create({
      data: { ...rule, isBuiltin: true, isActive: true },
    });
  } else {
    // Update existing builtin rules with new fields
    await prisma.userRule.update({
      where: { id: existing.id },
      data: {
        type: rule.type,
        scope: rule.scope ?? 'GLOBAL',
        priority: rule.priority ?? 0,
        tags: rule.tags ?? [],
        owasp: rule.owasp ?? [],
        paths: rule.paths ?? [],
        fixSuggestion: rule.fixSuggestion,
        slaSeverity: rule.slaSeverity,
        slaHours: rule.slaHours,
        slaAction: rule.slaAction,
      },
    });
  }
}

console.log(`  ✓ Rules: ${ALL_RULES.map(r => r.name).join(' · ')}`);
```

- [ ] **Step 4: Run seed**

```bash
npx prisma db seed
```

Expected: 8 rules created/updated (5 security + 1 SLA + 1 compliance + 1 business logic), no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add rule types, SLA, compliance, business logic to seed rules"
```

---

### Task 3: Rule Formatter — `src/rules/formatter.ts`

**Files:**
- Create: `src/rules/formatter.ts`

- [ ] **Step 1: Create the rule formatter module**

```typescript
// src/rules/formatter.ts
// Formats rules for AI prompt injection. Each rule type has its own section header.

import type { UserRule } from '@/generated/prisma';

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

const TYPE_LABEL: Record<string, string> = {
  SECURITY: 'Security Rules',
  COMPLIANCE: 'Compliance Requirements',
  SLA: 'SLA Policies',
  BUSINESS_LOGIC: 'Business Logic Rules',
};

export interface RulesContext {
  rulesText: string;
  rulesCount: number;
  tokenEstimate: number;
  sources: {
    userRules: number;
    businessRules: number;
    patterns: number;
    guidelines: number;
  };
}

interface FormattableRule {
  name: string;
  type: string;
  severity: string;
  category: string;
  ruleText: string;
  languages: string[];
  paths: string[];
  matchPattern?: string | null;
  cwe: string[];
  owasp: string[];
  fixSuggestion?: string | null;
  slaSeverity?: string | null;
  slaHours?: number | null;
  slaAction?: string | null;
  scope: string;
  priority: number;
}

export function formatRuleForPrompt(rule: FormattableRule): string {
  const lines: string[] = [];

  lines.push(`Rule: ${rule.name} (${rule.type}, ${rule.severity} severity, ${rule.category} category)`);

  if (rule.matchPattern) {
    lines.push(`Pattern: ${rule.matchPattern}`);
  }

  if (rule.languages.length > 0) {
    lines.push(`Languages: ${rule.languages.join(', ')}`);
  }

  if (rule.paths.length > 0) {
    lines.push(`Paths: ${rule.paths.join(', ')}`);
  }

  lines.push(`Instruction: ${rule.ruleText}`);

  if (rule.cwe.length > 0) {
    lines.push(`CWE: ${rule.cwe.join(', ')}`);
  }

  if (rule.owasp.length > 0) {
    lines.push(`OWASP: ${rule.owasp.join(', ')}`);
  }

  if (rule.fixSuggestion) {
    lines.push(`Fix: ${rule.fixSuggestion}`);
  }

  // SLA-specific formatting
  if (rule.type === 'SLA' && rule.slaSeverity && rule.slaHours) {
    lines.push(`SLA: ${rule.slaSeverity} findings must be addressed within ${rule.slaHours} hours. Action on breach: ${rule.slaAction || 'NOTIFY'}`);
  }

  return lines.join('\n');
}

export function formatRulesForPrompt(
  userRules: FormattableRule[],
  businessRuleTexts: string[],
  patternTexts: string[],
  guidelineTexts: string[],
  tokenBudget: number = 2000,
): RulesContext {
  // Group rules by type
  const rulesByType: Record<string, FormattableRule[]> = {};
  for (const rule of userRules) {
    const type = rule.type || 'SECURITY';
    if (!rulesByType[type]) rulesByType[type] = [];
    rulesByType[type].push(rule);
  }

  // Sort each group by severity then priority
  for (const type of Object.keys(rulesByType)) {
    rulesByType[type].sort((a, b) => {
      const sevA = SEVERITY_ORDER[a.severity] ?? 99;
      const sevB = SEVERITY_ORDER[b.severity] ?? 99;
      if (sevA !== sevB) return sevA - sevB;
      return b.priority - a.priority;
    });
  }

  // Build sections in type order
  const typeOrder = ['SECURITY', 'COMPLIANCE', 'SLA', 'BUSINESS_LOGIC'];
  const sections: string[] = [];

  for (const type of typeOrder) {
    const rules = rulesByType[type];
    if (!rules || rules.length === 0) continue;

    const label = TYPE_LABEL[type] || `${type} Rules`;
    const formatted = rules.map(formatRuleForPrompt).join('\n\n');
    sections.push(`## ${label}\n\n${formatted}`);
  }

  // Business logic rules from AI inference
  if (businessRuleTexts.length > 0) {
    sections.push(`## Confirmed Business Logic Rules\n\n${businessRuleTexts.join('\n\n')}`);
  }

  // Filesystem patterns
  if (patternTexts.length > 0) {
    sections.push(`## Known Vulnerability Patterns\n\n${patternTexts.join('\n')}`);
  }

  // Filesystem guidelines
  if (guidelineTexts.length > 0) {
    sections.push(`## Security Guidelines\n\n${guidelineTexts.join('\n\n')}`);
  }

  const fullText = sections.join('\n\n');

  // Enforce token budget (rough estimate: ~4 chars per token)
  const maxChars = tokenBudget * 4;
  const truncated = fullText.length > maxChars
    ? fullText.slice(0, maxChars) + '\n\n[... additional rules truncated due to token budget]'
    : fullText;

  return {
    rulesText: truncated,
    rulesCount: userRules.length + businessRuleTexts.length,
    tokenEstimate: Math.ceil(truncated.length / 4),
    sources: {
      userRules: userRules.length,
      businessRules: businessRuleTexts.length,
      patterns: patternTexts.length,
      guidelines: guidelineTexts.length,
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/rules/formatter.ts
git commit -m "feat: add rule formatter module for AI prompt injection"
```

---

### Task 4: Unified Rule Loader — `loadRulesForContext()` in `src/rules/loader.ts`

**Files:**
- Modify: `src/rules/loader.ts`

- [ ] **Step 1: Add `loadRulesForContext()` to loader.ts**

Add this function after the existing `loadPrompts()` function. Import `formatRulesForPrompt` from `./formatter`:

```typescript
import { formatRulesForPrompt, type RulesContext } from './formatter';
import { prisma } from '@/lib/db';

export async function loadRulesForContext(options: {
  scanId?: string;
  repoUrl?: string;
  languages?: string[];
  tokenBudget?: number;
}): Promise<RulesContext> {
  const tokenBudget = options.tokenBudget ?? 2000;

  // 1. Load active UserRules (global + project-scoped)
  const where: Record<string, unknown> = {
    isActive: true,
    status: 'ACTIVE',
  };

  // Global rules always apply
  const globalRules = await prisma.userRule.findMany({
    where: { ...where, scope: 'GLOBAL' },
    orderBy: [{ severity: 'asc' }, { priority: 'desc' }],
  });

  // Project-scoped rules matching repoUrl
  let projectRules: typeof globalRules = [];
  if (options.repoUrl) {
    // Normalize: strip trailing slash for comparison
    const normalizedUrl = options.repoUrl.replace(/\/+$/, '');
    projectRules = await prisma.userRule.findMany({
      where: {
        ...where,
        scope: 'PROJECT',
        repoUrl: { in: [normalizedUrl, normalizedUrl + '/'] },
      },
      orderBy: [{ severity: 'asc' }, { priority: 'desc' }],
    });
  }

  // Deduplicate by id (in case global and project overlap)
  const seenIds = new Set<string>();
  const allRules = [...globalRules, ...projectRules].filter(rule => {
    if (seenIds.has(rule.id)) return false;
    seenIds.add(rule.id);
    return true;
  });

  // 2. Filter by language overlap
  const scanLanguages = new Set(options.languages ?? []);
  const filteredRules = scanLanguages.size > 0
    ? allRules.filter(rule => rule.languages.length === 0 || rule.languages.some(l => scanLanguages.has(l)))
    : allRules;

  // 3. Load confirmed BusinessLogicRules for this scan
  let businessRuleTexts: string[] = [];
  if (options.scanId) {
    const bizRules = await prisma.businessLogicRule.findMany({
      where: { scanId: options.scanId, status: 'CONFIRMED' },
      select: { ruleText: true, confidence: true, violationDescription: true, evidenceFiles: true },
    });
    businessRuleTexts = bizRules.map(r => {
      let text = r.ruleText;
      if (r.violationDescription) text += `\nViolation: ${r.violationDescription}`;
      if (r.evidenceFiles.length > 0) text += `\nEvidence: ${r.evidenceFiles.join(', ')}`;
      return text;
    });
  }

  // 4. Load filesystem patterns and guidelines
  const rulesDir = path.join(process.cwd(), 'src/rules');
  let knowledgeBase: { patterns: string[]; guidelines: string[]; prompts: { deepScan: string; businessLogic: string; enrichment: string } };
  try {
    knowledgeBase = await loadKnowledgeBase(rulesDir);
  } catch {
    knowledgeBase = { patterns: [], guidelines: [], prompts: { deepScan: '', businessLogic: '', enrichment: '' } };
  }

  // 5. Format and return
  return formatRulesForPrompt(
    filteredRules.map(r => ({
      name: r.name,
      type: r.type,
      severity: r.severity,
      category: r.category,
      ruleText: r.ruleText,
      languages: r.languages,
      paths: r.paths,
      matchPattern: r.matchPattern,
      cwe: r.cwe,
      owasp: r.owasp,
      fixSuggestion: r.fixSuggestion,
      slaSeverity: r.slaSeverity,
      slaHours: r.slaHours,
      slaAction: r.slaAction,
      scope: r.scope,
      priority: r.priority,
    })),
    businessRuleTexts,
    knowledgeBase.patterns,
    knowledgeBase.guidelines,
    tokenBudget,
  );
}
```

Note: `loadKnowledgeBase` is already defined in this file, so we can call it directly. `path` is already imported.

- [ ] **Step 2: Commit**

```bash
git add src/rules/loader.ts
git commit -m "feat: add loadRulesForContext() unified rule loader"
```

---

### Task 5: Config — Add `rulesTokenBudget` to Schema

**Files:**
- Modify: `src/lib/config.ts`

- [ ] **Step 1: Add `rulesTokenBudget` to `nodeConfigSchema`**

In `src/lib/config.ts`, find the `nodeConfigSchema` and add after the `concurrency` field:

```typescript
  rulesTokenBudget: z.number().min(500).max(8000).default(2000),
```

- [ ] **Step 2: Add `chatRulesTokenBudget` to `chatConfigSchema`**

In `src/lib/config.ts`, find the `chatConfigSchema` and add after the `systemPrompt` field:

```typescript
  rulesTokenBudget: z.number().min(500).max(4000).default(1500),
```

- [ ] **Step 3: Verify build**

```bash
cd /root/astra && npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/config.ts
git commit -m "feat: add rulesTokenBudget to node and chat config schemas"
```

---

### Task 6: Inject Rules into Deep-Scan AI Prompt

**Files:**
- Modify: `src/scan/prompts/deep-scan.ts`
- Modify: `src/scan/nodes/deep-scan.ts`

- [ ] **Step 1: Update `buildDeepScanPrompt()` signature**

In `src/scan/prompts/deep-scan.ts`, find the `buildDeepScanPrompt` function (around line 171) and add `rulesText` parameter:

```typescript
export function buildDeepScanPrompt(scanDepth: string, knowledgeContext: string, rulesText?: string, basePrompt?: string): string {
  const prompt = basePrompt ?? DEFAULT_DEEP_SCAN_PROMPT;
  const depthDesc = DEPTH_DESCRIPTIONS[scanDepth] ?? DEPTH_DESCRIPTIONS.standard;
  const knowledgeSection = knowledgeContext.trim()
    ? `\n\nKnown vulnerability patterns and security rules:\n${knowledgeContext}`
    : '';

  const depthAdditions = scanDepth === 'deep' || scanDepth === 'exhaustive'
    ? '\n\nAdditional checks for deep/exhaustive mode:\n- Race conditions and concurrency issues\n- Insecure defaults and deprecated APIs\n- Complex data flow vulnerabilities'
    : '';

  const rulesSection = rulesText?.trim()
    ? `\n\n## Applicable Rules and Policies\n\nYou MUST check for and enforce these rules during your analysis. Treat each rule as a mandatory check:\n\n${rulesText}`
    : '';

  return `${depthDesc}\n\n${prompt}${depthAdditions}${knowledgeSection}${rulesSection}`;
}
```

- [ ] **Step 2: Update `buildCrossFilePrompt()` signature**

In the same file, find `buildCrossFilePrompt` (around line 185) and add `rulesText` parameter:

```typescript
export function buildCrossFilePrompt(scanDepth: string, knowledgeContext: string, rulesText?: string, basePrompt?: string): string {
  const prompt = basePrompt ?? DEFAULT_CROSS_FILE_PROMPT;
  const depthNote = scanDepth === 'deep' || scanDepth === 'exhaustive'
    ? '\n\nSince this is a deep/exhaustive scan, also consider: race conditions across components, distributed system vulnerabilities, subtle trust boundary violations, and complex multi-step attack chains.'
    : '';

  const knowledgeSection = knowledgeContext.trim()
    ? `\n\nKnown vulnerability patterns and security rules:\n${knowledgeContext}`
    : '';

  const rulesSection = rulesText?.trim()
    ? `\n\n## Applicable Rules and Policies\n\nYou MUST check for and enforce these rules during your analysis. Treat each rule as a mandatory check:\n\n${rulesText}`
    : '';

  return `${prompt}${depthNote}${knowledgeSection}${rulesSection}`;
}
```

- [ ] **Step 3: Call `loadRulesForContext()` in deep-scan.ts**

In `src/scan/nodes/deep-scan.ts`, add the import at the top:

```typescript
import { loadRulesForContext } from '../../rules/loader';
```

Find the `deepScanNode` function (around line 188). After the `knowledgeBase` loading (around line 192-196), add:

```typescript
  const rulesContext = await loadRulesForContext({
    scanId: state.scanId,
    repoUrl: state.repoUrl,
    languages: state.repoIntel?.languages?.map(l => l.language),
    tokenBudget: nodeConfig.rulesTokenBudget ?? 2000,
  });
```

Then find the `systemPrompt` construction (around line 199-202) and add `rulesContext.rulesText`:

```typescript
  const systemPrompt = dbPrompts.deepScan || knowledgeBase.prompts.deepScan || buildDeepScanPrompt(
    nodeConfig.scanDepth,
    knowledgeBase.patterns.join('\n'),
    rulesContext.rulesText,
  );
```

- [ ] **Step 4: Verify build**

```bash
cd /root/astra && npm run build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/scan/prompts/deep-scan.ts src/scan/nodes/deep-scan.ts
git commit -m "feat: inject rules into deep-scan AI prompt via loadRulesForContext"
```

---

### Task 7: Inject Rules into Cross-File AI Prompt

**Files:**
- Modify: `src/scan/nodes/cross-file.ts`

- [ ] **Step 1: Call `loadRulesForContext()` in cross-file.ts**

Add import at the top:

```typescript
import { loadRulesForContext } from '../../rules/loader';
```

In `crossFileNode()` (around line 201), after the `knowledgeBase` loading (around line 206-210), add:

```typescript
  const rulesContext = await loadRulesForContext({
    scanId: state.scanId,
    repoUrl: state.repoUrl,
    languages: state.repoIntel?.languages?.map(l => l.language),
    tokenBudget: nodeConfig.rulesTokenBudget ?? 2000,
  });
```

Then find the `systemPrompt` construction (around line 213-216) and add `rulesContext.rulesText`:

```typescript
  const systemPrompt = dbPrompts.crossFile || knowledgeBase.prompts.businessLogic || buildCrossFilePrompt(
    nodeConfig.scanDepth,
    knowledgeBase.patterns.join('\n'),
    rulesContext.rulesText,
  );
```

- [ ] **Step 2: Verify build**

```bash
cd /root/astra && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/scan/nodes/cross-file.ts
git commit -m "feat: inject rules into cross-file AI prompt via loadRulesForContext"
```

---

### Task 8: Inject Rules into Chat AI Prompt

**Files:**
- Modify: `src/lib/ai-chat.ts`

- [ ] **Step 1: Import `loadRulesForContext`**

Add at the top of `src/lib/ai-chat.ts`, after the existing imports:

```typescript
import { loadRulesForContext } from '../rules/loader';
```

- [ ] **Step 2: Load rules in `sendChatMessage()` and append to system prompt**

In `sendChatMessage()` (around line 199), find where `systemPrompt` is constructed (around line 274):

```typescript
  const systemPrompt = buildSystemPrompt(chatConfig, dbPrompts.chat, context, scanContext);
```

After this line, add:

```typescript
  // Inject applicable rules into chat context
  const rulesContext = await loadRulesForContext({
    scanId: context?.scanId,
    repoUrl: scanContext?.repoUrl,
    tokenBudget: chatConfig.rulesTokenBudget ?? 1500,
  });
  const finalSystemPrompt = rulesContext.rulesText
    ? `${systemPrompt}\n\n${rulesContext.rulesText}`
    : systemPrompt;
```

Then replace the usage of `systemPrompt` in the `AIRequest` (around line 281):

```typescript
  const request: AIRequest = {
    system: finalSystemPrompt,   // Changed from systemPrompt
    prompt: userMessage,
    messages,
    // ... rest unchanged
  };
```

- [ ] **Step 3: Verify build**

```bash
cd /root/astra && npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai-chat.ts
git commit -m "feat: inject rules into chat AI prompt via loadRulesForContext"
```

---

### Task 9: SLA Enforcement in Persist Node

**Files:**
- Modify: `src/scan/nodes/persist.ts`

- [ ] **Step 1: Add SLA enforcement logic after task creation**

In `src/scan/nodes/persist.ts`, add import at the top:

```typescript
import { prisma } from '@/lib/db';
```

(This import already exists.) Then add a new import:

```typescript
import { loadRulesForContext } from '../../rules/loader';
```

After the task creation loop (around line 32), add SLA enforcement:

```typescript
    // SLA enforcement: check SLA-type rules and set deadlines on matching findings
    const slaRules = await prisma.userRule.findMany({
      where: { type: 'SLA', isActive: true },
    });

    if (slaRules.length > 0) {
      for (const rule of slaRules) {
        if (!rule.slaSeverity || !rule.slaHours) continue;
        const matchingFindings = findings.filter(f => f.severity.toUpperCase() === rule.slaSeverity.toUpperCase());
        for (const finding of matchingFindings) {
          try {
            await prisma.finding.update({
              where: { id: finding.id },
              data: {
                slaDeadline: new Date(Date.now() + rule.slaHours! * 60 * 60 * 1000),
              },
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`SLA deadline update failed for finding ${finding.id}: ${msg}`);
          }
        }
      }
    }
```

- [ ] **Step 2: Verify build**

```bash
cd /root/astra && npm run build 2>&1 | tail -20
```

- [ ] **Step 3: Commit**

```bash
git add src/scan/nodes/persist.ts
git commit -m "feat: SLA enforcement in persist node — set slaDeadline on matching findings"
```

---

### Task 10: Extend UserRule API Routes

**Files:**
- Modify: `src/app/api/v1/user-rules/route.ts`
- Modify: `src/app/api/v1/user-rules/[id]/route.ts`

- [ ] **Step 1: Update POST endpoint to accept new fields**

In `src/app/api/v1/user-rules/route.ts`, replace the POST handler's body destructuring and create:

```typescript
export async function POST(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const {
    name, description, ruleText, severity, category, cwe,
    type, scope, repoUrl, languages, paths, excludePaths, matchPattern,
    owasp, priority, fixSuggestion, references, tags, codeRule,
    slaSeverity, slaHours, slaAction, source,
  } = body;

  if (!name || !ruleText) {
    return NextResponse.json({ error: 'name and ruleText are required' }, { status: 400 });
  }

  // If scanId provided, verify the scan exists
  const { scanId } = body;
  if (scanId) {
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }
  }

  const rule = await prisma.userRule.create({
    data: {
      name,
      description: description ?? '',
      ruleText,
      severity: severity ?? 'MEDIUM',
      category: category ?? 'SAST',
      cwe: cwe ?? [],
      type: type ?? 'SECURITY',
      scope: scope ?? 'GLOBAL',
      repoUrl: repoUrl ?? null,
      languages: languages ?? [],
      paths: paths ?? [],
      excludePaths: excludePaths ?? [],
      matchPattern: matchPattern ?? null,
      owasp: owasp ?? [],
      priority: priority ?? 0,
      fixSuggestion: fixSuggestion ?? null,
      references: references ?? [],
      tags: tags ?? [],
      codeRule: codeRule ?? null,
      slaSeverity: slaSeverity ?? null,
      slaHours: slaHours ?? null,
      slaAction: slaAction ?? null,
      source: source ?? 'manual',
      scanId: scanId ?? null,
      userId,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
```

- [ ] **Step 2: Update GET endpoint to support filtering by new fields**

In the same file, update the GET handler to add `type`, `scope`, `status`, `tags` filter params:

```typescript
export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;
  const { searchParams } = request.nextUrl;
  const scanId = searchParams.get('scanId') ?? undefined;
  const active = searchParams.get('active');
  const global = searchParams.get('global');
  const type = searchParams.get('type') ?? undefined;
  const scope = searchParams.get('scope') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const where: Record<string, unknown> = {};
  if (scanId) where.scanId = scanId;
  if (active === 'true') where.isActive = true;
  if (active === 'false') where.isActive = false;
  if (global === 'true') where.scanId = null;
  if (global === 'false') where.scanId = { not: null };
  if (type) where.type = type;
  if (scope) where.scope = scope;
  if (status) where.status = status;

  const rules = await prisma.userRule.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ rules });
}
```

- [ ] **Step 3: Update PATCH endpoint to accept new fields**

In `src/app/api/v1/user-rules/[id]/route.ts`, replace the PATCH handler's data object with all new fields:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const rule = await prisma.userRule.findUnique({ where: { id } });
  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  const updated = await prisma.userRule.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.ruleText !== undefined ? { ruleText: body.ruleText } : {}),
      ...(body.severity !== undefined ? { severity: body.severity } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.cwe !== undefined ? { cwe: body.cwe } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.scope !== undefined ? { scope: body.scope } : {}),
      ...(body.repoUrl !== undefined ? { repoUrl: body.repoUrl } : {}),
      ...(body.languages !== undefined ? { languages: body.languages } : {}),
      ...(body.paths !== undefined ? { paths: body.paths } : {}),
      ...(body.excludePaths !== undefined ? { excludePaths: body.excludePaths } : {}),
      ...(body.matchPattern !== undefined ? { matchPattern: body.matchPattern } : {}),
      ...(body.owasp !== undefined ? { owasp: body.owasp } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.fixSuggestion !== undefined ? { fixSuggestion: body.fixSuggestion } : {}),
      ...(body.references !== undefined ? { references: body.references } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.codeRule !== undefined ? { codeRule: body.codeRule } : {}),
      ...(body.slaSeverity !== undefined ? { slaSeverity: body.slaSeverity } : {}),
      ...(body.slaHours !== undefined ? { slaHours: body.slaHours } : {}),
      ...(body.slaAction !== undefined ? { slaAction: body.slaAction } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive, enabledAt: body.isActive ? new Date() : rule.enabledAt } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 4: Verify build**

```bash
cd /root/astra && npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/user-rules/route.ts src/app/api/v1/user-rules/[id]/route.ts
git commit -m "feat: extend user-rules API with rule types, scoping, SLA, and filtering"
```

---

### Task 11: Extend Rules Page UI

**Files:**
- Modify: `src/app/(app)/rules/page.tsx`

- [ ] **Step 1: Update the UserRule interface**

In `src/app/(app)/rules/page.tsx`, replace the `UserRule` interface with:

```typescript
interface UserRule {
  id: string;
  name: string;
  description: string;
  ruleText: string;
  severity: string;
  category: string;
  cwe: string[];
  isActive: boolean;
  isBuiltin: boolean;
  scanId: string | null;
  createdAt: string;
  updatedAt: string;
  // New fields
  type: string;
  scope: string;
  repoUrl: string | null;
  languages: string[];
  paths: string[];
  excludePaths: string[];
  matchPattern: string | null;
  owasp: string[];
  priority: number;
  fixSuggestion: string | null;
  references: string[];
  tags: string[];
  codeRule: string | null;
  source: string;
  slaSeverity: string | null;
  slaHours: number | null;
  slaAction: string | null;
  status: string;
}
```

- [ ] **Step 2: Add type badge helper and update AddRuleForm**

After the `SEVERITY_STYLES` constant, add a type badge helper:

```typescript
const TYPE_STYLES: Record<string, { color: string; bg: string }> = {
  SECURITY: { color: 'var(--ibm-semantic-error)', bg: 'rgba(218,30,40,0.08)' },
  COMPLIANCE: { color: 'var(--ibm-primary)', bg: 'rgba(15,98,254,0.08)' },
  SLA: { color: 'var(--ibm-semantic-warning)', bg: 'rgba(241,194,27,0.08)' },
  BUSINESS_LOGIC: { color: 'var(--ibm-semantic-success)', bg: 'rgba(36,161,72,0.08)' },
};

const TYPE_LABELS: Record<string, string> = {
  SECURITY: 'Security',
  COMPLIANCE: 'Compliance',
  SLA: 'SLA',
  BUSINESS_LOGIC: 'Biz Logic',
};
```

Update `AddRuleForm` to include type, scope, OWASP, languages, tags, priority, and SLA fields. Add a conditional SLA section that appears when `type === 'SLA'`:

```typescript
function AddRuleForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleText, setRuleText] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [category, setCategory] = useState('SAST');
  const [cweInput, setCweInput] = useState('');
  const [type, setType] = useState('SECURITY');
  const [scope, setScope] = useState('GLOBAL');
  const [owaspInput, setOwaspInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [priority, setPriority] = useState(0);
  // SLA fields
  const [slaSeverity, setSlaSeverity] = useState('CRITICAL');
  const [slaHours, setSlaHours] = useState(4);
  const [slaAction, setSlaAction] = useState('ESCALATE');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ruleText.trim()) return;
    setSubmitting(true);
    const cwe = cweInput.split(',').map(s => s.trim()).filter(Boolean);
    const owasp = owaspInput.split(',').map(s => s.trim()).filter(Boolean);
    const languages = languagesInput.split(',').map(s => s.trim()).filter(Boolean);
    const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/v1/user-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, ruleText, severity, category, cwe,
          type, scope, owasp, languages, tags, priority,
          ...(type === 'SLA' ? { slaSeverity, slaHours, slaAction } : {}),
        }),
      });
      if (res.ok) onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(22,22,22,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div style={{ background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', width: 640, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="ibm-subhead" style={{ color: 'var(--ibm-ink)' }}>Add rule</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ibm-ink-muted)', fontSize: 18, cursor: 'pointer', padding: 4 }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Name</label>
            <input style={INPUT_STYLE} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Description</label>
            <input style={INPUT_STYLE} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Type</label>
              <select style={SELECT_STYLE} value={type} onChange={e => setType(e.target.value)}>
                {['SECURITY', 'COMPLIANCE', 'SLA', 'BUSINESS_LOGIC'].map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Severity</label>
              <select style={SELECT_STYLE} value={severity} onChange={e => setSeverity(e.target.value)}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Category</label>
              <select style={SELECT_STYLE} value={category} onChange={e => setCategory(e.target.value)}>
                {['SAST', 'SCA', 'SECRETS', 'IAC', 'DATA_FLOW', 'BUSINESS_LOGIC'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Scope</label>
              <select style={SELECT_STYLE} value={scope} onChange={e => setScope(e.target.value)}>
                <option value="GLOBAL">Global</option>
                <option value="PROJECT">Project</option>
              </select>
            </div>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Priority</label>
              <input style={INPUT_STYLE} type="number" value={priority} onChange={e => setPriority(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Rule text</label>
            <textarea style={{ ...INPUT_STYLE, minHeight: 120, resize: 'vertical' }} value={ruleText} onChange={e => setRuleText(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>CWE IDs (comma-separated)</label>
              <input style={INPUT_STYLE} value={cweInput} onChange={e => setCweInput(e.target.value)} placeholder="e.g. CWE-79, CWE-89" />
            </div>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>OWASP (comma-separated)</label>
              <input style={INPUT_STYLE} value={owaspInput} onChange={e => setOwaspInput(e.target.value)} placeholder="e.g. A03:2021, A07:2021" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Languages (comma-separated)</label>
              <input style={INPUT_STYLE} value={languagesInput} onChange={e => setLanguagesInput(e.target.value)} placeholder="e.g. typescript, python" />
            </div>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Tags (comma-separated)</label>
              <input style={INPUT_STYLE} value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. gdpr, pii, payments" />
            </div>
          </div>
          {type === 'SLA' && (
            <div style={{ background: 'var(--ibm-surface-1)', padding: 16, border: '1px solid var(--ibm-hairline)' }}>
              <p className="ibm-label" style={{ color: 'var(--ibm-semantic-warning)', marginBottom: 12 }}>SLA Configuration</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>SLA Severity</label>
                  <select style={SELECT_STYLE} value={slaSeverity} onChange={e => setSlaSeverity(e.target.value)}>
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Hours</label>
                  <input style={INPUT_STYLE} type="number" value={slaHours} onChange={e => setSlaHours(parseInt(e.target.value) || 0)} min={1} />
                </div>
                <div>
                  <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Action on breach</label>
                  <select style={SELECT_STYLE} value={slaAction} onChange={e => setSlaAction(e.target.value)}>
                    <option value="ESCALATE">Escalate</option>
                    <option value="NOTIFY">Notify</option>
                    <option value="AUTO_CLOSE">Auto-close</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: '12px 16px', fontSize: '14px', color: 'var(--ibm-ink)', cursor: 'pointer', letterSpacing: '0.16px' }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ background: 'var(--ibm-primary)', color: 'var(--ibm-on-primary)', border: 'none', padding: '12px 16px', fontSize: '14px', fontWeight: 400, letterSpacing: '0.16px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>Add rule</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update `GlobalRulesTab` to show type badge**

In the `GlobalRulesTab` component, inside the rule row rendering (where `SeverityTag` is shown), add a type badge after the severity tag:

```typescript
{/* Add after the SeverityTag */}
{(() => {
  const ts = TYPE_STYLES[rule.type] ?? TYPE_STYLES.SECURITY;
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
      padding: '2px 8px', background: ts.bg, color: ts.color,
    }}>
      {TYPE_LABELS[rule.type] ?? rule.type}
    </span>
  );
})()}
```

- [ ] **Step 4: Update the `fetchUserRules` call to include new fields**

The API already returns all fields from the Prisma model, so no change needed in the fetch. But update the `GlobalRulesTab` expanded view to show `type`, `scope`, `tags`, `languages`, and SLA info where applicable.

In the expanded section (inside `{isExpanded && !isEditing && (...)`), add after the CWE display:

```typescript
{/* Type and Scope */}
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
  <div>
    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Type</p>
    <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)' }}>{TYPE_LABELS[rule.type] ?? rule.type}</p>
  </div>
  <div>
    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Scope</p>
    <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)' }}>{rule.scope}{rule.scope === 'PROJECT' && rule.repoUrl ? ` (${rule.repoUrl})` : ''}</p>
  </div>
</div>
{/* Languages */}
{rule.languages && rule.languages.length > 0 && (
  <div>
    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Languages</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {rule.languages.map((l, i) => (
        <span key={i} style={{ padding: '4px 8px', background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>{l}</span>
      ))}
    </div>
  </div>
)}
{/* Tags */}
{rule.tags && rule.tags.length > 0 && (
  <div>
    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Tags</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {rule.tags.map((t, i) => (
        <span key={i} style={{ padding: '4px 8px', background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>{t}</span>
      ))}
    </div>
  </div>
)}
{/* SLA info */}
{rule.type === 'SLA' && rule.slaSeverity && rule.slaHours && (
  <div style={{ background: 'rgba(241,194,27,0.08)', padding: 12, borderLeft: '3px solid var(--ibm-semantic-warning)' }}>
    <p className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-warning)' }}>
      SLA: {rule.slaSeverity} findings must be addressed within {rule.slaHours} hours. Action: {rule.slaAction}
    </p>
  </div>
)}
```

- [ ] **Step 5: Verify build**

```bash
cd /root/astra && npm run build 2>&1 | tail -20
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/rules/page.tsx
git commit -m "feat: extend rules page UI with type badges, SLA fields, languages, tags, scope"
```

---

### Task 12: Changelog and CLAUDE.md Update

**Files:**
- Modify: `src/lib/changelog.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add changelog entry**

In `src/lib/changelog.ts`, add a new entry at the top of the `entries` array:

```typescript
{
  version: '2.25.0',
  date: '2026-05-16',
  title: 'Rule Engine: security, compliance, SLA, and business logic rules',
  description: 'Extended UserRule model with 4 rule types (SECURITY, COMPLIANCE, SLA, BUSINESS_LOGIC), project scoping, language/path filtering, Semgrep-inspired match patterns, SLA enforcement fields, and lifecycle status. Unified rule loader (loadRulesForContext) injects active rules + confirmed business logic rules + filesystem patterns/guidelines into deep-scan, cross-file, and chat AI prompts with severity-prioritized token budgets. Rules page UI updated with type badges, SLA configuration, languages, tags, and scope. Persist node sets SLA deadlines on matching findings.',
},
```

- [ ] **Step 2: Update CLAUDE.md Known Issues**

In `CLAUDE.md`, find the "Known Issues & Pending Work" section. Remove the old bullet about rules not being wired (if it existed) and add no new items — this task completes the wiring.

- [ ] **Step 3: Update CLAUDE.md Changelog**

In the Changelog table at the top, add:

```markdown
| 2026-05-16 | v2.25.0: **Rule Engine** — Extended UserRule with 4 types (SECURITY/COMPLIANCE/SLA/BUSINESS_LOGIC), project scoping, language filtering, SLA enforcement; unified rule loader injects into deep-scan, cross-file, chat; token budget; Rules page UI with type badges and SLA config |
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/changelog.ts CLAUDE.md
git commit -m "chore: add v2.25.0 changelog and update CLAUDE.md"
```

---

### Task 13: Integration Test — Full Scan with Rules

**Files:**
- No new files — manual testing

- [ ] **Step 1: Run the application**

```bash
cd /root/astra && npm run dev
```

- [ ] **Step 2: Verify rules appear in AI prompts**

Trigger a scan and check the deep-scan and cross-file logs. Confirm that the system prompt includes:
- `## Security Rules` section with the 5 builtin security rules
- `## Compliance Requirements` section with the PII encryption rule
- `## SLA Policies` section with the 4-hour critical SLA
- `## Business Logic Rules` section with the payment flow rule
- `## Known Vulnerability Patterns` section with filesystem patterns
- `## Security Guidelines` section with filesystem guidelines

- [ ] **Step 3: Verify rules appear in chat**

Open the AI chat and send a message. Check the system prompt includes the rules section.

- [ ] **Step 4: Verify Rules page**

Navigate to `/rules`. Confirm:
- Global Rules tab shows 8 rules (5 security + 1 SLA + 1 compliance + 1 business logic)
- Each rule has type badge, severity tag, and scope indicator
- Clicking "Add rule" shows the extended form with Type, Scope, Priority, Languages, Tags, SLA fields
- Setting Type to "SLA" shows the SLA Configuration section

- [ ] **Step 5: Verify SLA enforcement**

After a scan completes, check if CRITICAL findings have `slaDeadline` set in the database:

```bash
cd /root/astra && npx prisma db execute --stdin <<< "SELECT id, severity, \"slaDeadline\" FROM \"Finding\" WHERE severity = 'CRITICAL' LIMIT 5;"
```

Expected: CRITICAL findings have `slaDeadline` set to 4 hours after creation.

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Extended UserRule schema with all fields (Section 1.2)
- ✅ RuleType, RuleScope, RuleScopeStatus enums (Section 1.1)
- ✅ Finding.slaDeadline (Section 4.2)
- ✅ Unified rule loader loadRulesForContext (Section 2)
- ✅ Rule formatter (Section 3 — Task 3)
- ✅ Deep-scan injection (Section 3.1 — Task 6)
- ✅ Cross-file injection (Section 3.2 — Task 7)
- ✅ Chat injection (Section 3.3 — Task 8)
- ✅ SLA enforcement (Section 4 — Task 9)
- ✅ API changes (Section 6 — Task 10)
- ✅ Rules page UI (Section 5 — Task 11)
- ✅ Config integration (Section 7 — Task 5)
- ✅ Seed updates (Section 8 — Task 2)
- ✅ Changelog (Section 10 — Task 12)

**2. Placeholder scan:** No TBD, TODO, or "fill in details" found. All code blocks contain complete implementation.

**3. Type consistency:** `loadRulesForContext()` returns `RulesContext` which matches `formatRulesForPrompt()` return type. `rulesText` string is consistently passed as 3rd arg to `buildDeepScanPrompt()` and `buildCrossFilePrompt()`. `slaDeadline` field is `DateTime?` in Prisma schema and `Date` in persist logic.