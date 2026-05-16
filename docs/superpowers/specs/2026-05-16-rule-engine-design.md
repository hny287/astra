# Astra Rule Engine — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a unified rule engine that supports security, compliance, SLA, and business logic rules — injectable into all AI prompts (deep-scan, cross-file, chat) and enforceable during scan pipeline.

**Architecture:** Extend the existing `UserRule` model with rule types, scoping, Semgrep-inspired matching, SLA fields, and lifecycle status. Create a unified `loadRulesForContext()` function that gathers rules from DB, filesystem, and confirmed BusinessLogicRules, then injects them into all 3 AI prompt points with a severity-prioritized token budget. Build a `/rules` page with form + code editor tabs.

**Tech Stack:** Prisma (PostgreSQL), Next.js App Router, IBM Carbon Components, existing rules/parser.ts

---

## 1. Data Model

### 1.1 New Enums

Add to `prisma/schema.prisma`:

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

enum RuleStatus {
  ACTIVE
  DRAFT
  DEPRECATED
}
```

### 1.2 Extended UserRule Model

Replace the existing `UserRule` model with:

```prisma
model UserRule {
  id             String     @id @default(cuid())
  name           String
  description    String     @default("")
  ruleText       String

  // Type & scope
  type           RuleType   @default(SECURITY)
  scope          RuleScope  @default(GLOBAL)
  repoUrl        String?                // For PROJECT scope — matches Scan.repoUrl

  // Matching & filtering
  severity       String     @default("MEDIUM")   // CRITICAL | HIGH | MEDIUM | LOW | INFO
  category       String     @default("SAST")     // SAST | SCA | SECRETS | IAC | DATA_FLOW | BUSINESS_LOGIC
  languages      String[]   @default([])          // Target languages. Empty = all.
  paths          String[]   @default([])          // Glob inclusion patterns. Empty = all paths.
  excludePaths   String[]   @default([])          // Glob exclusion patterns.
  matchPattern   String?                           // Semgrep-inspired pattern or regex

  // SLA-specific
  slaSeverity    String?                           // Which finding severity this SLA applies to
  slaHours       Int?                              // Hours until SLA breach
  slaAction      String?                           // ESCALATE | NOTIFY | AUTO_CLOSE

  // Metadata
  cwe            String[]   @default([])
  owasp          String[]   @default([])
  priority       Int        @default(0)           // Higher = more important, token budget ordering
  fixSuggestion  String?
  references     String[]   @default([])
  tags           String[]   @default([])
  codeRule       String?                           // Raw code/text representation for code editor tab
  source         String     @default("manual")    // manual | code | imported | ai_inferred

  // Status & lifecycle
  isActive       Boolean    @default(true)
  status         RuleStatus @default(ACTIVE)
  isBuiltin      Boolean    @default(false)
  enabledAt      DateTime?
  lastUsedAt     DateTime?

  // Relationships
  userId         String?
  scanId         String?
  user           User?      @relation(fields: [userId], references: [id], onDelete: SetNull)
  scan           Scan?      @relation(fields: [scanId], references: [id], onDelete: Cascade)

  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  @@index([scanId])
  @@index([isActive])
  @@index([scope])
  @@index([category])
  @@index([severity])
  @@index([priority])
  @@index([type])
}
```

### 1.3 User Model Update

Add the relation to `User`:

```prisma
model User {
  // ... existing fields ...
  rules  UserRule[]
}
```

### 1.4 BusinessLogicRule — No Schema Change

The existing `BusinessLogicRule` model stays as-is. The rule loader queries `CONFIRMED` BusinessLogicRules separately.

---

## 2. Unified Rule Loader

### 2.1 File: `src/rules/loader.ts` (modify)

Add a new `loadRulesForContext()` function alongside the existing `loadKnowledgeBase()`:

```typescript
export interface RulesContext {
  rulesText: string;       // Formatted string for AI prompt injection
  rulesCount: number;      // Total rules loaded
  tokenEstimate: number;   // Rough token estimate
  sources: {
    userRules: number;
    businessRules: number;
    patterns: number;
    guidelines: number;
  };
}

export async function loadRulesForContext(options: {
  scanId?: string;
  repoUrl?: string;
  languages?: string[];       // Languages found in the scan target
  tokenBudget?: number;       // Max tokens for rules section (default 2000)
}): Promise<RulesContext>
```

Logic:
1. Query `UserRule` where `isActive = true` AND `status = ACTIVE` AND (`scope = GLOBAL` OR (`scope = PROJECT` AND `repoUrl` matches the scan's repoUrl — exact match on normalized URL: strip trailing slash, compare host+path))
2. Filter by `languages` overlap (empty `languages` = match all)
3. Query `BusinessLogicRule` where `status = CONFIRMED` AND `scanId = options.scanId` (if provided)
4. Load filesystem `patterns/` and `guidelines/` via existing `loadKnowledgeBase()`
5. Format each source into sections:
   - `## Active Security Rules` — UserRules where type=SECURITY
   - `## Compliance Requirements` — UserRules where type=COMPLIANCE
   - `## SLA Policies` — UserRules where type=SLA
   - `## Business Logic Rules` — UserRules where type=BUSINESS_LOGIC + confirmed BusinessLogicRules
   - `## Known Vulnerability Patterns` — filesystem patterns
   - `## Security Guidelines` — filesystem guidelines
6. Sort rules by severity (CRITICAL > HIGH > MEDIUM > LOW > INFO), then priority (descending)
7. Enforce token budget: estimate ~4 chars/token, truncate from bottom if over budget
8. Return formatted string + metadata

### 2.2 Rule Formatting

Each rule is formatted for AI consumption as:

```
Rule: [name] (type, severity, category)
Pattern: [matchPattern if present]
Languages: [languages if present]
Paths: [paths if present]
Instruction: [ruleText]
CWE: [cwe] | OWASP: [owasp]
Fix: [fixSuggestion if present]
```

SLA rules additionally include:
```
SLA: [slaSeverity] findings must be addressed within [slaHours] hours. Action on breach: [slaAction]
```

---

## 3. AI Prompt Injection

### 3.1 Deep-Scan (`src/scan/nodes/deep-scan.ts`)

In `deepScanNode()`, replace:
```typescript
const knowledgeBase = await loadKnowledgeBase(...)
const systemPrompt = dbPrompts.deepScan || knowledgeBase.prompts.deepScan || buildDeepScanPrompt(
  nodeConfig.scanDepth,
  knowledgeBase.patterns.join('\n')
);
```

With:
```typescript
const knowledgeBase = await loadKnowledgeBase(...)
const rulesContext = await loadRulesForContext({
  scanId: state.scanId,
  repoUrl: state.repoUrl,
  languages: state.repoIntel?.languages?.map(l => l.language),
  tokenBudget: nodeConfig.rulesTokenBudget ?? 2000,
});
const systemPrompt = dbPrompts.deepScan || knowledgeBase.prompts.deepScan || buildDeepScanPrompt(
  nodeConfig.scanDepth,
  knowledgeBase.patterns.join('\n'),
  rulesContext.rulesText  // NEW parameter
);
```

### 3.2 Cross-File (`src/scan/nodes/cross-file.ts`)

Same pattern — call `loadRulesForContext()` and pass `rulesContext.rulesText` to `buildCrossFilePrompt()`.

### 3.3 Chat (`src/lib/ai-chat.ts`)

In `sendChatMessage()`, after building the system prompt, append rules:

```typescript
const rulesContext = await loadRulesForContext({
  scanId: context?.scanId,
  repoUrl: scanContext?.repoUrl,
  tokenBudget: chatConfig.rulesTokenBudget ?? 1500,
});
if (rulesContext.rulesText) {
  systemPrompt += `\n\n${rulesContext.rulesText}`;
}
```

### 3.4 Prompt Builder Updates (`src/scan/prompts/deep-scan.ts`)

Add `rulesText` parameter to `buildDeepScanPrompt()` and `buildCrossFilePrompt()`:

```typescript
export function buildDeepScanPrompt(
  scanDepth: string,
  knowledgeContext: string,
  rulesText?: string,  // NEW
  basePrompt?: string,
): string {
  // ... existing logic ...
  const rulesSection = rulesText?.trim()
    ? `\n\n## Applicable Rules and Policies\n\nYou MUST check for and enforce these rules during your analysis:\n\n${rulesText}`
    : '';
  return `${depthDesc}\n\n${prompt}${depthAdditions}${knowledgeSection}${rulesSection}`;
}
```

Same for `buildCrossFilePrompt()`.

---

## 4. SLA Enforcement

### 4.1 Persist Node (`src/scan/nodes/persist.ts`)

After findings are persisted, check for SLA-type rules:

1. Load `UserRule` where `type = SLA` AND `isActive = true`
2. For each finding whose severity matches an SLA rule's `slaSeverity`:
   - Calculate `slaDeadline = finding.createdAt + slaHours hours`
   - Set `finding.slaDeadline = slaDeadline` (new field on Finding model)
   - If `slaAction = NOTIFY`, create an alert/notification
   - If `slaAction = ESCALATE`, create an alert + assign to admin

### 4.2 Finding Model Update

Add to `Finding` model:
```prisma
model Finding {
  // ... existing fields ...
  slaDeadline  DateTime?   // When the SLA for this finding expires
}
```

---

## 5. Rule UI — `/rules` Page

### 5.1 Page Structure

Route: `src/app/(app)/rules/page.tsx`

Two tabs (reusing existing tab pattern from Knowledge page):
- **Global Rules** — UserRules where `scope = GLOBAL` or no filter
- **AI-Inferred Rules** — BusinessLogicRules (existing `/api/v1/rules` endpoint)

### 5.2 Create/Edit Modal

IBM Carbon Modal with two tabs:
- **Form tab** — Structured fields:
  - Name, Type (SECURITY/COMPLIANCE/SLA/BUSINESS_LOGIC), Severity, Category
  - Scope (GLOBAL/PROJECT), Repo URL (if PROJECT)
  - Languages (multi-select), Paths, Exclude Paths
  - Match Pattern, CWE, OWASP
  - Priority, Fix Suggestion, References, Tags
  - SLA fields (conditionally shown when Type = SLA): SLA Severity, SLA Hours, SLA Action
  - Rule Text (textarea, the natural language instruction)
- **Code tab** — Raw text editor with syntax highlighting for `codeRule`

### 5.3 Rule Cards

Each rule shown as a Carbon tile/card with:
- Name, type badge, severity tag, scope badge
- Active/Draft/Deprecated status toggle
- Language icons, category tag
- Expand to see full ruleText
- Actions: Edit, Duplicate, Toggle Active, Delete (admin only)

---

## 6. API Changes

### 6.1 Extend UserRule CRUD (`src/app/api/v1/user-rules/route.ts`)

POST: Accept all new fields (`type`, `scope`, `repoUrl`, `languages`, `paths`, `excludePaths`, `matchPattern`, `slaSeverity`, `slaHours`, `slaAction`, `owasp`, `priority`, `fixSuggestion`, `references`, `tags`, `codeRule`, `source`, `status`, `userId`)

GET: Add query params for filtering — `type`, `scope`, `category`, `severity`, `status`, `tags`

### 6.2 Extend UserRule PATCH (`src/app/api/v1/user-rules/[id]/route.ts`)

PATCH: Accept all new fields as updatable

### 6.3 New Endpoint: Rule Token Budget

`GET /api/v1/rules/budget?scanId=...&repoUrl=...` — Returns how many tokens the rules section would consume, for UI preview before scan starts.

---

## 7. Config Integration

Add to `src/lib/config.ts` scan config schema:

```typescript
rulesTokenBudget: z.number().min(500).max(8000).default(2000),  // per-node token budget for rules
chatRulesTokenBudget: z.number().min(500).max(4000).default(1500),  // chat-specific
```

These appear in the Pipeline page config editor under each node and in chat config.

---

## 8. Seed Updates (`prisma/seed.ts`)

Update the 5 builtin rules to include the new `type` field:

```typescript
const BUILTIN_RULES = [
  {
    name: 'No hardcoded secrets',
    type: 'SECURITY',
    severity: 'CRITICAL',
    category: 'SECRETS',
    cwe: ['CWE-798'],
    // ... rest unchanged
  },
  {
    name: 'SQL injection risk',
    type: 'SECURITY',
    severity: 'CRITICAL',
    category: 'SAST',
    cwe: ['CWE-89'],
    // ...
  },
  {
    name: 'Missing authentication check',
    type: 'SECURITY',
    severity: 'HIGH',
    category: 'BUSINESS_LOGIC',
    cwe: ['CWE-306'],
    // ...
  },
  {
    name: 'Insecure direct object reference',
    type: 'SECURITY',
    severity: 'HIGH',
    category: 'SAST',
    cwe: ['CWE-639'],
    // ...
  },
  {
    name: 'Sensitive data in logs',
    type: 'COMPLIANCE',
    severity: 'MEDIUM',
    category: 'DATA_FLOW',
    cwe: ['CWE-532'],
    // ...
  },
];
```

Add 3 new builtin rules demonstrating each type:

```typescript
// SLA rule
{
  name: 'Critical SLA: 4-hour response',
  type: 'SLA',
  severity: 'CRITICAL',
  category: 'SAST',
  slaSeverity: 'CRITICAL',
  slaHours: 4,
  slaAction: 'ESCALATE',
  ruleText: 'CRITICAL findings must be triaged within 4 hours. Escalate to security lead on breach.',
  scope: 'GLOBAL',
},
// Compliance rule
{
  name: 'PII encryption at rest',
  type: 'COMPLIANCE',
  severity: 'HIGH',
  category: 'DATA_FLOW',
  ruleText: 'All personally identifiable information (PII) must be encrypted at rest. Check for unencrypted database columns storing names, emails, SSNs, or financial data.',
  tags: ['gdpr', 'soc2', 'pii'],
  scope: 'GLOBAL',
},
// Business logic rule
{
  name: 'Payment flow integrity',
  type: 'BUSINESS_LOGIC',
  severity: 'HIGH',
  category: 'BUSINESS_LOGIC',
  ruleText: 'All payment processing must go through a dedicated PaymentService. Direct database access from payment routes is a violation. Check for price manipulation, race conditions in checkout, and missing idempotency keys.',
  paths: ['**/payment/**', '**/checkout/**', '**/order/**'],
  scope: 'GLOBAL',
},
```

---

## 9. Files to Create/Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `RuleType`, `RuleScope`, `RuleStatus` enums; extend `UserRule` model; add `slaDeadline` to `Finding`; add `rules` relation to `User` |
| `prisma/seed.ts` | Update builtin rules with `type`; add SLA, compliance, business logic demo rules |
| `prisma/migrations/` | New migration for schema changes |
| `src/rules/loader.ts` | Add `loadRulesForContext()` function |
| `src/rules/formatter.ts` | NEW — rule-to-prompt formatting functions |
| `src/scan/nodes/deep-scan.ts` | Call `loadRulesForContext()`, pass to prompt builder |
| `src/scan/nodes/cross-file.ts` | Call `loadRulesForContext()`, pass to prompt builder |
| `src/scan/prompts/deep-scan.ts` | Add `rulesText` param to `buildDeepScanPrompt()` and `buildCrossFilePrompt()` |
| `src/lib/ai-chat.ts` | Call `loadRulesForContext()` in `sendChatMessage()`, append to system prompt |
| `src/lib/config.ts` | Add `rulesTokenBudget` and `chatRulesTokenBudget` to config schema |
| `src/scan/nodes/persist.ts` | SLA enforcement logic |
| `src/app/api/v1/user-rules/route.ts` | Accept new fields in POST, add filter params to GET |
| `src/app/api/v1/user-rules/[id]/route.ts` | Accept new fields in PATCH |
| `src/app/api/v1/rules/budget/route.ts` | NEW — token budget preview endpoint |
| `src/app/(app)/rules/page.tsx` | NEW — Rules page with Global + AI-Inferred tabs |
| `src/components/RuleEditor.tsx` | NEW — Create/edit modal with form + code tabs |
| `src/components/RuleCard.tsx` | NEW — Rule display card component |
| `src/lib/changelog.ts` | Version entry |

---

## 10. Verification

1. `npx prisma migrate dev --name add_rule_engine` — migration applies cleanly
2. `npx prisma db seed` — 8 builtin rules seeded (5 security + 1 SLA + 1 compliance + 1 business logic)
3. `npm run build` — no TypeScript errors
4. Create a rule via `POST /api/v1/user-rules` with all new fields
5. Start a scan — verify rules appear in deep-scan system prompt logs
6. Chat — verify rules appear in chat system prompt
7. Rules page renders at `/rules` with Global and AI-Inferred tabs
8. Rule editor modal creates/edits rules with form and code tabs
9. SLA rule: CRITICAL finding gets `slaDeadline` set during persist
10. Token budget: rules section stays under configured limit