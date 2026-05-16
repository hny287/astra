export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  categories: {
    label: string;
    items: string[];
  }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.26.0',
    date: '2026-05-16',
    title: 'Rule Engine: security, compliance, SLA, and business logic rules',
    description: 'Extended UserRule model with 4 rule types (SECURITY, COMPLIANCE, SLA, BUSINESS_LOGIC), project scoping, language/path filtering, Semgrep-inspired match patterns, SLA enforcement fields, and lifecycle status. Unified rule loader (loadRulesForContext) injects active rules + confirmed business logic rules + filesystem patterns/guidelines into deep-scan, cross-file, and chat AI prompts with severity-prioritized token budgets. Rules page UI updated with type badges, SLA configuration, languages, tags, and scope. Persist node sets SLA deadlines on matching findings.',
    categories: [
      { label: 'Added', items: [
        'RuleType enum: SECURITY, COMPLIANCE, SLA, BUSINESS_LOGIC',
        'RuleScope enum: GLOBAL, PROJECT (rules can target specific repos)',
        'RuleScopeStatus enum: ACTIVE, DRAFT, DEPRECATED (lifecycle management)',
        'Extended UserRule model with 20+ new fields: type, scope, repoUrl, languages, paths, excludePaths, matchPattern, owasp, priority, fixSuggestion, references, tags, codeRule, source, slaSeverity, slaHours, slaAction, status, enabledAt, lastUsedAt',
        'slaDeadline field on Finding model — set by SLA enforcement during persist',
        'Rule formatter module (src/rules/formatter.ts) — formats rules for AI prompt injection with type-grouped sections and severity/priority sorting',
        'Unified rule loader loadRulesForContext() — gathers active UserRules, confirmed BusinessLogicRules, filesystem patterns/guidelines, enforces token budget',
        'Rules injected into deep-scan, cross-file, and chat AI prompts',
        'rulesTokenBudget config (2000 for scan nodes, 1500 for chat)',
        'SLA enforcement in persist node — sets slaDeadline on findings matching SLA rules',
        '3 new builtin demo rules: Critical SLA (4hr response), PII encryption at rest, Payment flow integrity',
        'Rules page UI: type badges, scope indicator, language chips, tag chips, SLA configuration section',
        'API filtering: GET /api/v1/user-rules supports type, scope, status query params',
      ]},
      { label: 'Changed', items: [
        'Updated 5 existing builtin rules with type field (4 SECURITY, 1 COMPLIANCE)',
        'buildDeepScanPrompt() and buildCrossFilePrompt() accept rulesText parameter',
        'UserRule API POST/PATCH accept all new fields',
      ]},
    ],
  },
  {
    version: '2.24.0',
    date: '2026-05-15',
    title: 'Parallel deep-scan, incremental persist, and AI-enriched tool findings',
    description: 'Deep-scan now runs all files concurrently (p-limit) instead of sequential batches. Findings appear in the UI as they are discovered (incremental DB upsert per file). Tool findings (Trivy/Gitleaks) are enriched by AI before storage. Persist node refactored to only create tasks and save metadata.',
    categories: [
      { label: 'Added', items: [
        'Parallel deep-scan: p-limit replaces sequential batch loop, all files run concurrently gated by concurrency config',
        'Incremental persist: findings upserted to DB per-file in deep-scan, per-finding in tool-scan, per-finding in cross-file',
        'AI enrichment for tool findings: Trivy and Gitleaks findings sent to AI for aiExplanation, aiFix, exploitScore, cvssVector, remediation',
        'Shared findings/persist.ts helper for incremental upsert across pipeline nodes',
        'Shared findings/normalize.ts for severity and category normalization',
        'toolScan added as AI provider node (uses deepScan config by default)',
        'p-limit dependency for concurrency control',
      ]},
      { label: 'Changed', items: [
        'persist node no longer creates Finding records — only creates Tasks, BusinessRules, and updates scan metadata',
        'deep-scan cancellation check moved from between-batches to per-file (more granular)',
        'queue.ts: added structured logging to all state transitions (enqueue, claim, complete, fail, pipeline start/stop)',
        'worker.ts: added logging for scan PENDING→RUNNING transition, temp dir cleanup, worker start/stop',
      ]},
    ],
  },
  {
    version: '2.23.2',
    date: '2026-05-15',
    title: 'Fix AI JSON parse crash + markdown rendering in chat',
    description: 'AI models can return JSON with invalid Unicode escape sequences that crash JSON.parse(), killing deep_scan. Also, AI chat responses were rendered as plain text — code blocks, lists, and tables were invisible.',
    categories: [
      { label: 'Fixed', items: [
        'deep-scan/cross-file: JSON.parse crash on invalid \\u escape sequences in AI model output',
        'Created shared parseAiJson() utility that sanitizes AI JSON before parsing',
        'AiChatProvider + ScanChat: assistant messages now render markdown via react-markdown + remark-gfm',
      ]},
    ],
  },
  {
    version: '2.23.1',
    date: '2026-05-15',
    title: 'Fix deep-scan crash on findings with undefined file path; show architecture diagram in Pipeline and during in-progress scans',
    description: 'Trivy IAC misconfiguration findings (Dockerfile checks) had no Filename field, producing findings with file=undefined. Deep-scan called f.file.endsWith() on these, crashing every file in the AI analysis batch. Cross-file summary had the same issue. Additionally, the architecture diagram was invisible during in-progress scans (only saved at persist time) and the Pipeline tab showed raw JSON metadata instead of the rendered Mermaid diagram.',
    categories: [
      { label: 'Fixed', items: [
        'deep-scan: f.file.endsWith() crash on undefined file — 0 AI findings produced when Trivy IAC findings had no Filename',
        'tool-scan: normalizeTrivyMisconfig and normalizeTrivySecret now fall back to result.Target when Filename is empty/undefined',
        'cross-file: byFile grouping now handles undefined f.file with fallback key "(unknown)"',
        'deep-scan: imp.to.endsWith() guarded against undefined import target',
      ]},
      { label: 'Improved', items: [
        'Architecture tab reads diagram from NodeOutput as fallback when Scan.architectureDiagram is not yet persisted',
        'Pipeline tab renders Mermaid diagram inline for git_diagram node instead of showing raw JSON metadata',
        'git_diagram NodeOutput now includes the full Mermaid diagram string in outputJson.diagram',
      ]},
    ],
  },
  {
    version: '2.23.0',
    date: '2026-05-14',
    title: 'DeepWiki-style code intelligence via @optave/codegraph',
    description: 'git_ingest now runs @optave/codegraph to build a real AST-derived dependency graph of the scanned repo. The CodeIntel data structure replaces heuristic classification with actual function signatures, import/export graphs, API routes, data models, call chains, and dead export detection. git_diagram now exports a real Mermaid diagram from codegraph instead of path-based heuristics. Deep-scan, cross-file, and AI chat prompts all inject structured CodeIntel context.',
    categories: [
      { label: 'New', items: [
        'CodeIntel data structure — per-file roles, exports, imports, functions, classes; import edges; API routes; data models; entry points; dead exports; call chains',
        'git_ingest runs @optave/codegraph buildGraph() after git CLI commands, extracts structured code intelligence, falls back to git-only on failure',
        'git_diagram uses codegraph exportMermaid() for real dependency diagrams with heuristic fallback',
        'Deep-scan prompt injects per-file CodeIntel context: role, exports, direct dependencies, API routes, security-relevant call chains, data models',
        'Cross-file prompt injects full CodeIntel: file map, import graph, API routes, data models, call chains, dead exports',
        'AI chat injects CodeIntel summary: file count, API routes, data models, dead exports',
        'Architecture tab shows Code Structure card with analyzed files, import edges, API routes, data models, entry points, dead exports',
        '@optave/codegraph dependency (Apache-2.0, 34 languages, tree-sitter)',
      ]},
      { label: 'Improved', items: [
        'RepoIntel extended with codeIntel field containing full CodeIntel structure (stored in existing Scan.repoIntel JSON column — no migration needed)',
        'git_ingest NodeOutput now shows codegraph summary: files, imports, API routes, data models, entry points, dead exports',
        'git_diagram NodeOutput shows diagramSource field: "codegraph" or "heuristic"',
        'Graceful degradation: if codegraph fails or is not installed, the system falls back to git-only intelligence and heuristic diagrams',
      ]},
    ],
  },
  {
    version: '2.22.0',
    date: '2026-05-14',
    title: 'Full pipeline visibility and AI context enrichment',
    description: 'ScanProgress and rerun-node API now show all 9 pipeline nodes (was 6, missing git_ingest, git_diagram, tool_scan). Deep-scan AI prompt now includes repoIntel and architectureDiagram context — same context that cross-file already had. Scan-level AI chat now includes repository intelligence in system prompt.',
    categories: [
      { label: 'Fixed', items: [
        'ScanProgress shows all 9 pipeline nodes — git_ingest, git_diagram, and tool_scan were missing from the UI progress component',
        'Progress bar now computes against 9 nodes instead of 6, reaching 100% only when all nodes complete',
        'rerun-node API accepts git_ingest, git_diagram, and tool_scan — was rejecting these with 400 invalid node',
        'Landing page pipeline visualization includes all 9 nodes with descriptions',
      ]},
      { label: 'Improved', items: [
        'Deep-scan AI prompt now receives repoIntel (commit count, contributors, hotspot files, languages, dependencies) and architectureDiagram as context — matches cross-file behavior',
        'Scan-level AI chat (when scanId is present without findingId) now injects repository intelligence and architecture diagram into system prompt',
        'Rerun-node API maps tool_scan to trivy + gitleaks scanner cleanup for proper re-analysis',
        'git_ingest, git_diagram, and tool_scan nodes now create NodeOutput records — visible in Pipeline tab with summary metrics',
        'Architecture tab renders Mermaid diagram visually instead of raw text (with View Source toggle)',
        'Added mermaid package dependency for client-side diagram rendering',
      ]},
    ],
  },
  {
    version: '2.21.0',
    date: '2026-05-14',
    title: 'Pipeline expansion: git_ingest, git_diagram, tool_scan nodes',
    description: 'Added three new pipeline nodes before deep_scan: git_ingest (repo metadata extraction), git_diagram (Mermaid architecture diagram generation), and tool_scan (Trivy + Gitleaks static analysis). Tool findings feed into deep_scan as AI context. Repo intel and architecture diagram feed into cross_file. Pipeline is now 9 nodes: clone → discover → git_ingest → git_diagram → tool_scan → deep_scan → cross_file → aggregate → persist.',
    categories: [
      { label: 'New', items: [
        'git_ingest node — extracts commit history, contributors, hotspot files, language breakdown, dependencies from cloned repo',
        'git_diagram node — generates Mermaid architecture diagram from repo structure and repo intel',
        'tool_scan node — runs Trivy (SCA/IAC/Secrets) and Gitleaks (Secrets) as subprocesses, normalizes output to UnifiedFinding[]',
        'RepoIntel stored on Scan model (repoIntel JSON column) — contributors, hotspots, languages, dependencies',
        'architectureDiagram stored on Scan model (TEXT column) — Mermaid syntax diagram',
        'toolFindingsCount stored on Scan model (INT column) — quick count for UI',
        'Architecture tab on scan detail page — shows repo intel metrics, contributors, hotspot files, and Mermaid diagram',
        'Tool findings injected into deep_scan per-file AI prompt as "Known findings from static analysis tools"',
        'Repo intel and architecture diagram injected into cross_file AI prompt as context',
        'Fingerprint dedup now includes title to prevent multiple findings per file from being collapsed into one',
      ]},
      { label: 'Improved', items: [
        'Pipeline expanded from 6 to 9 nodes with new pre-AI analysis stages',
        'aggregate node now merges allFindings + crossFileFindings + toolFindings before deduplication',
        'Scan detail page API returns repoIntel, architectureDiagram, and toolFindingsCount',
      ]},
    ],
  },
  {
    version: '2.20.0',
    date: '2026-05-14',
    title: 'Bidirectional field sync between Tasks & Alerts',
    description: 'Expanded Task-Finding sync beyond status and assignment: all rich fields (title, description, severity, codeSnippet, exploitationScenario, remediation, cwe, owasp, exploitScore, cvssScore, cvssVector, confidence, aiExplanation, aiFix, file, lineStart, lineEnd, scanner, ruleId, category, language) now sync bidirectionally between linked Findings and Tasks. TaskDataTable expanded detail now matches AlertDetail. CvssScore component shows CVSS v3.1 vector string with parsed metric breakdown (AV, AC, PR, UI, S, C, I, A). AI pipeline now generates cvssVector alongside cvssScore.',
    categories: [
      { label: 'New', items: [
        'syncFindingFieldsToTask() and syncTaskFieldsToFinding() — bidirectional sync of all rich fields between linked Findings and Tasks',
        'cvssVector field on Finding and Task models — stores the CVSS v3.1 vector string (e.g., CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)',
        'CvssScore component now parses and displays vector metrics (Attack Vector, Attack Complexity, Privileges Required, etc.) in both compact tooltip and full detail view',
        'AI deep-scan and cross-file prompts now request cvssVector alongside cvssScore',
      ]},
      { label: 'Improved', items: [
        'TaskDataTable expanded detail now shows all AlertDetail fields: file location, code snippet, proof of concept, remediation, AI explanation, AI fix, references (CWE/OWASP as clickable links), exploit score bar, full CvssScore component with tooltip, confidence bar — uses task fields first, falls back to linked finding',
        'Task API GET /tasks includes all rich fields from linked finding',
        'CvssScore compact mode: removed "CVSS" text label; tooltips show "CVSS v3.1"',
        'Column headers renamed "CVSS" to "CVSS Score" (100px width) in both tables',
      ]},
      { label: 'Changed', items: [
        'Finding PATCH and persist node now call syncFindingFieldsToTask after updates',
        'Task PATCH calls syncTaskFieldsToFinding when rich fields change',
      ]},
    ],
  },
  {
    version: '2.19.0',
    date: '2026-05-14',
    title: 'Unified Tasks & Alerts',
    description: 'Merged AlertStatus and TaskStatus into a single ItemStatus enum; replaced TaskPriority with Severity; added rich scanner fields to Task model; added cvssScore to Finding and Task; made Finding.scanId nullable for manual alert creation; bidirectional status sync between linked Findings and Tasks.',
    categories: [
      { label: 'Schema', items: [
        'ItemStatus enum replaces AlertStatus and TaskStatus (OPEN, IN_PROGRESS, IN_REVIEW, COMPLETED, FALSE_POSITIVE, ACCEPTED_RISK, BLOCKED, CANCELLED)',
        'Task.priority renamed to Task.severity (reuses Severity enum: CRITICAL, HIGH, MEDIUM, LOW, INFO)',
        'Task model gains rich scanner fields: scanner, ruleId, file, lineStart, lineEnd, codeSnippet, language, category, cwe, owasp, aiExplanation, aiFix, exploitationScenario, exploitScore, cvssScore, confidence, remediation',
        'Finding.cvssScore added (nullable Float)',
        'Finding.scanId made nullable for manually created alerts',
        'Removed @@unique([fingerprint, scanId]) from Finding',
      ]},
      { label: 'API', items: [
        'Tasks API now accepts/returns severity instead of priority',
        'Tasks API supports rich scanner fields on create/update',
        'Findings PATCH syncs status changes to linked Tasks',
        'Tasks PATCH syncs status changes to linked Findings',
        'Batch action changePriority renamed to changeSeverity',
      ]},
      { label: 'UI', items: [
        'Unified status badges across Alerts and Tasks',
        'TaskDataTable shows severity instead of priority',
        'AlertDetail shows unified status actions (Start, In Review, Resolve, False Positive, Accept Risk)',
        'CVSS score bar added to AlertDetail',
      ]},
    ],
  },
  {
    version: '2.17.0',
    date: '2026-05-09',
    title: 'Branding refactor — env-driven product identity',
    description: 'All product identity strings are now configurable via environment variables through a single source of truth (src/lib/branding.ts). Rebranding requires changing only .env values, not code. Key type renames: AstraConfig → ScanConfig, astra.config.json → scan.config.json, parseAstraRule → parseScanRule, .astra → .rule.',
    categories: [
      {
        label: 'New',
        items: [
          'src/lib/branding.ts — central product identity module with 6 env-driven constants (APP_NAME, APP_TITLE, APP_ID, APP_DOMAIN, SARIF_INFO_URI, DEFAULT_SYSTEM_PROMPT) and 6 derived constants (STORAGE_PREFIX, LOG_FILE, LOG_SERVICE, TEMP_DIR_PREFIX, DOWNLOAD_PREFIX, SARIF_TOOL_NAME)',
        ],
      },
      {
        label: 'Changed',
        items: [
          'AstraConfig type renamed to ScanConfig across all files',
          'astra.config.json renamed to scan.config.json on disk',
          'parseAstraRule renamed to parseScanRule, .astra extension → .rule',
          'DB config key "astra.config" → scan.config constant (SCAN_CONFIG_DB_KEY)',
          'All hardcoded brand strings (nav, footer, auth pages, reports, exports, SARIF, AI prompts) now import from branding.ts',
          'Seed emails now use APP_DOMAIN constant instead of hardcoded @astra.dev',
          'localStorage prefix, log filenames, temp directories, download filenames all derived from APP_ID',
        ],
      },
    ],
  },
  {
    version: '1.0',
    date: '2026-05-08',
    title: 'Initial Release',
    description: 'Astra 1.0 ships as a complete AI-native application security platform — SAST, SCA, secret scanning, IaC analysis, AI-enriched findings, multi-provider AI chat, task management, observability, and a full IBM Carbon Design System UI. Everything is production-ready out of the box.',
    categories: [
      {
        label: 'New',
        items: [
          'Scan pipeline — 6-node pipeline: Clone → Discover → Deep Scan → Cross-File → Aggregate → Persist, with event-driven worker and per-node AI configuration',
          'Scanner integrations — Trivy (SCA/IaC/Secrets), Semgrep (SAST), Gitleaks (Secrets), Bearer (Data Flow), AI deep-scan (per-file), AI cross-file (business logic)',
          'AI enrichment — every finding gets severity assessment, exploitation scenario, remediation guidance, exploit score (0–10), and CWE/OWASP mapping',
          'Multi-provider AI — 7 providers: Cloud Ollama, Hosted Ollama, OpenAI, Anthropic, Bedrock (stub), Azure AI Foundry (stub), LangGraph (stub); per-node provider/model overrides',
          'AI Chat — context-aware chat at 3 levels: global, scan, and per-finding; multi-turn memory; DB-backed system prompts; model selector mid-conversation',
          'Alert triage — unified status workflow (OPEN → IN_PROGRESS → IN_REVIEW → COMPLETED / FALSE_POSITIVE / ACCEPTED_RISK / BLOCKED / CANCELLED), assignment, comments, history timeline',
          'Tasks — full task lifecycle: FINDING_TRIAGE / REMEDIATION / MANUAL_REVIEW / MANUAL / AI_GENERATED types, severity levels, unified statuses, batch operations, bidirectional finding links',
          'Observability — every AI call logged with provider, model, tokens, latency, prompt, response; filterable AI Calls table with per-call retry',
          'Security — RBAC (ADMIN/ANALYST/VIEWER), JWT sessions, rate limiting, AES-256-GCM token encryption, per-user scan ownership, audit history on every mutation',
          'GitHub integration — PAT linking, repo/branch selectors, encrypted token storage',
          'Export — JSON, CSV, SARIF, HTML, Markdown formats; executive summary report page',
          'Configuration — DB-backed config (providers, models, pipeline nodes, chat); visual Pipeline editor; prompt editor; presets',
          'Browser data store — localStorage TTL cache for users, preferences, chat config; stale-while-revalidate; zero redundant fetches across navigation',
          'IBM Carbon UI — IBM Plex Sans, 0px border-radius, full dark/light theme with persisted preference, responsive layout',
          'Glossary — interactive file tree with directory descriptions, exports, DB tables, API call documentation',
        ],
      },
      {
        label: 'Security',
        items: [
          'All API routes require authentication — no unauthenticated endpoints except /api/auth/* and /api/v1/health',
          'Role-gated mutations — canWrite() on all state-changing routes, canAdmin() for config and user management',
          'Scan ownership enforced — non-admin users can only read and control their own scans',
          'GitHub tokens encrypted at rest with AES-256-GCM before writing to database',
          'Rate limiting on auth endpoints — 10/min login, 5/min signup',
          'Raw source code never leaves the customer environment — only normalized finding JSON stored',
        ],
      },
    ],
  },
  {
    version: '2.16.0',
    date: '2026-05-08',
    title: 'Homepage v2 redesign — strict IBM Carbon compliance',
    description: 'Replaced the public landing page with a completely rewritten v2 that follows IBM Carbon Design System precisely. Fixed utility bar display, nav link visibility, mobile menu positioning, and section spacing. Hero now uses abstract geometric SVG mesh with soft blue gradient backdrop. Eyebrows are sentence-case 14px. Capabilities grid is 4-up on desktop. All responsive breakpoints (320/672/1056/1312/1584px) and 48px touch targets maintained.',
    categories: [
      {
        label: 'New',
        items: [
          'Abstract geometric hero illustration — SVG grid + nodes + floating cards with soft blue gradient backdrop instead of dark terminal',
          'Strict IBM Carbon eyebrow style — sentence case 14px, not all-caps tracked mono',
          'Capabilities grid is 4-up at desktop (Carbon standard) instead of 3-up',
          'v2 alternate landing page at /v2 for A/B comparison',
        ],
      },
      {
        label: 'Fixed',
        items: [
          'Utility bar now hidden on mobile via display class instead of breaking layout',
          'Nav links use proper conditional display class for tablet/desktop',
          'Mobile menu overlay positioned correctly at top: 48px (nav height)',
          'Section padding follows Carbon spec: 48px/16px mobile, 64px/32px tablet, 80px/32px desktop',
          'Sign-in CTA uses correct inline-flex alignment without breaking layout',
        ],
      },
    ],
  },
  {
    version: '2.15.0',
    date: '2026-05-08',
    title: 'DB schema routing, seed script, and auth fixes',
    description: 'Fixed PrismaPg schema routing so both local and production databases target the correct PostgreSQL schema from DATABASE_URL. Added a comprehensive idempotent seed script. Fixed NextAuth UntrustedHost error for custom domain deployments.',
    categories: [
      {
        label: 'New',
        items: [
          'prisma/seed.ts — idempotent seed: 3 users (admin/analyst/viewer), astra.config, theme preference, 3 builtin presets, 5 builtin security rules',
          'prisma.config.ts — Prisma 7 migrations.seed entry wires npx tsx prisma/seed.ts',
        ],
      },
      {
        label: 'Fixed',
        items: [
          'PrismaPg schema routing — schema parsed from ?schema= in DATABASE_URL and passed as second arg to PrismaPg(config, { schema }); applies to both db.ts and seed.ts',
          'NextAuth trustHost: true — resolves UntrustedHost errors when deployed behind reverse proxy or custom domain',
          'Seed dotenv loading — import dotenv/config ensures DATABASE_URL is available when running npx prisma db seed',
        ],
      },
    ],
  },
  {
    version: '2.14.0',
    date: '2026-05-08',
    title: 'Browser-side data store with localStorage caching',
    description: 'Introduced AppDataProvider and browser-store utility to cache shared API data (users list, preferences, chat config, current user) in localStorage with TTL-based expiry. Components no longer independently fetch the same data on every mount — data loads instantly from cache and revalidates in background.',
    categories: [
      {
        label: 'New',
        items: [
          'lib/browser-store.ts — localStorage utility with namespaced keys and TTL (bsGet/bsSet/bsDel/bsClear)',
          'AppDataProvider — single React context serving users, preferences, chatConfig, currentUser to all components',
        ],
      },
      {
        label: 'Improved',
        items: [
          'ThemeProvider now reads/writes theme preference through AppDataProvider instead of direct API fetch',
          'TaskDataTable and AlertDetail use shared users list from context — no redundant /api/v1/users calls',
          'AiChatProvider reads chat config from context — no redundant /api/v1/chat/config calls',
          'Stale-while-revalidate: cached data served immediately, fresh data fetched in background',
        ],
      },
    ],
  },
  {
    version: '2.13.0',
    date: '2026-05-08',
    title: 'Glossary page redesign with IBM Carbon styling',
    description: 'Completely redesigned the file glossary page with full-width layout, prominent folder-level descriptions, nested accordion tree, and IBM Carbon Design System compliance. Enhanced all directory descriptions in the file tree with comprehensive context.',
    categories: [
      {
        label: 'New',
        items: [
          'Full-width glossary layout — removed maxWidth constraint for spacious tree browsing',
          'Folder-level descriptions shown in blue-accented panels (ibm-blue-10 background + 3px primary left border) when expanded',
          'Nested accordion-in-accordion tree with depth-based indentation (24px per level)',
          'IBM Carbon Design System compliance: 0px border radius, IBM Plex Sans weight 300 for headlines / weight 400 for body, letter-spacing 0.16px, IBM Blue #0f62fe accent, surface hierarchy (canvas → surface-1)',
          'File detail panels with labeled tag groups for exports, database tables, and API endpoints',
          'File and directory count summary in header (e.g., "42 files across 12 directories")',
        ],
      },
      {
        label: 'Changed',
        items: [
          'All directory descriptions in file-tree.ts expanded from one-liners to comprehensive paragraphs explaining purpose, key files, and architecture context',
          'Glossary page no longer constrained to 900px maxWidth — fills available content area',
          'Tree rows use proper button elements for accessibility',
          'Filter search input uses IBM Carbon text-input spec (surface-1 bg, 2px primary underline on focus)',
        ],
      },
    ],
  },
  {
    version: '2.12.0',
    date: '2026-05-08',
    title: 'Model selector in AI chat',
    description: 'All chat panels now show the active model and allow switching mid-conversation without leaving the chat.',
    categories: [
      {
        label: 'New',
        items: [
          'Model selector chip in chat header — shows provider · model, click to open searchable dropdown',
          'Models grouped by provider in the dropdown, filterable by name',
          'Active model highlighted with "Active" badge',
          'Model selection persists for the duration of the chat session',
          'GET /api/v1/chat/config — new endpoint returning current chat model and all available models',
        ],
      },
      {
        label: 'Improved',
        items: [
          'All 3 chat endpoints (global, finding, scan) accept optional provider/model in POST body for per-request model override',
          'sendChatMessage accepts modelOverride — bypasses cache, creates fresh provider instance for that request',
          'Scan-level chat now correctly routed through scanId endpoint (was always using global endpoint)',
        ],
      },
    ],
  },
  {
    version: '2.11.0',
    date: '2026-05-08',
    title: 'Tasks ↔ Alerts integration overhaul',
    description: 'Fixed all data, linking, and interaction issues between the Tasks and Alerts (findings) subsystems.',
    categories: [
      {
        label: 'Bug Fixes',
        items: [
          'Tasks sort (priority/status/etc.) now works — fixed sort param names sent to API (sortField/sortDir → sort/order)',
          'Scan detail findings now include assignedTo user — was always null due to missing join',
          'AlertDetail comments and history now show user display name instead of raw UUID',
          'Rescan state in TaskDataTable is now per-task — shared boolean caused all rows to show loading at once',
          'PATCH /api/v1/tasks/[id] now supports findingId — needed for Link Finding feature',
        ],
      },
      {
        label: 'Improved',
        items: [
          'Alert → Task deep link: task badge in AlertDetail now links to /tasks?expand=<taskId>, auto-opening that task row',
          'Task → Alert deep link: clicking linked finding title in expanded task opens the AlertDetail slide-out panel inline',
          'Scan/repo context in task list rows: repo URL, branch, commit SHA shown as sub-line under title',
          'Scan/repo context in expanded task panel: origin block shows repo, branch, commit, scan date, and View Scan link',
          'AI Assist button in expanded task panel now opens chat with finding context (was a stub)',
          'AI Assist in task overflow menu now opens chat with finding context (was a stub)',
          'Overflow menu Edit now opens pre-filled edit form (was a stub)',
          'Overflow menu Duplicate now creates a copy of the task (was a stub)',
          'Overflow menu Link Finding now shows a modal to paste a finding ID and link it (was a stub)',
        ],
      },
    ],
  },
  {
    version: '2.10.0',
    date: '2026-05-08',
    title: 'File glossary page, GitHub branches fix',
    description: 'Added interactive file glossary page with tree navigation and accordion details. Fixed GitHub branches API not decrypting access token. Added changelog for v2.8-v2.9.',
    categories: [
      {
        label: 'New',
        items: [
          'File Glossary page (/glossary) — interactive file tree with accordion details (purpose, exports, DB tables, API calls, children)',
          'Prompts API added to glossary documentation',
        ],
      },
      {
        label: 'Bug Fixes',
        items: [
          'GitHub branches API now decrypts access token before calling GitHub API (was passing encrypted token)',
        ],
      },
    ],
  },
  {
    version: '2.9.0',
    date: '2026-05-08',
    title: 'Chat memory, DB-backed prompts, and multi-turn AI conversations',
    description: 'Chat now sends conversation history to AI (fixes #17). System prompts load from DB with fallback to defaults (#78). AI providers support multi-turn messages. Prompt editing UI in Configuration page.',
    categories: [
      {
        label: 'New',
        items: [
          'Chat conversation memory — all 3 chat endpoints (global, scan, finding) now load and send conversation history to AI',
          'DB-backed prompt management — system prompts stored in Config table, loaded at runtime with hardcoded fallback',
          'Multi-turn messages — AIRequest now supports messages[] for conversation history in OpenAI, Anthropic, and Ollama providers',
          'Prompts API — GET/PUT/DELETE /api/v1/prompts to read, edit, and reset system prompts',
          'Prompts tab in Configuration page — view, edit, and reset discover/deepScan/crossFile/chat prompts',
        ],
      },
      {
        label: 'Changed',
        items: [
          'AI providers use chat() API for multi-turn (Ollama) and messages[] array (OpenAI/Anthropic) when conversation history present',
          'Deep-scan and cross-file nodes now check DB prompts before knowledge base prompts before hardcoded defaults',
          'buildDiscoverPrompt/buildDeepScanPrompt/buildCrossFilePrompt exported as sync functions with optional basePrompt param',
        ],
      },
    ],
  },
  {
    version: '2.8.0',
    date: '2026-05-08',
    title: 'Auth coverage, file glossary, and middleware fix',
    description: 'Fixed 5 unauthenticated API routes (including PATCH /rules with no auth). Fixed AuthJS redirect loop caused by middleware intercepting /api/auth/*. Added comprehensive file system glossary.',
    categories: [
      {
        label: 'Security Fixes',
        items: [
          'PATCH /api/v1/rules/[id] now requires auth + canWrite role (was completely open)',
          'GET /api/v1/rules now requires auth (was open)',
          'GET /api/v1/scans/[id]/stream now requires auth + scan ownership (was open)',
          'GET /api/v1/findings/[id]/history now requires auth (was open)',
          'GET /api/v1/tasks/[id]/history now requires auth (was open)',
          'Fixed AuthJS ClientFetchError — middleware now allows /api/auth/* (NextAuth internal routes)',
        ],
      },
      {
        label: 'New',
        items: [
          'File system glossary — docs/glossary/astra-app-files.md: complete catalogue of every file in astra-app/src/',
        ],
      },
    ],
  },
  {
    version: '2.7.0',
    date: '2026-05-08',
    title: 'Alert-Task linking, per-file rescan, and AI observability',
    description: 'Each alert now links to its task with bidirectional sync. Per-file rescan re-runs AI deep-scan on a single file. AI call retry from observability dashboard. Empty AI response detection and retry. Explicit enum constraints in prompts.',
    categories: [
      {
        label: 'New',
        items: [
          'Alert-Task linking — each Finding shows its linked Task in AlertDetail panel with "+ Create Task" button',
          'Per-file rescan — POST /api/v1/findings/[id]/rescan re-runs deep_scan on just that file',
          'Rescan File button in AlertDetail — triggers targeted AI analysis of a single file',
          'Task column in Findings table — shows linked task status per finding',
          'AI call retry — POST /api/v1/ai-calls/[id]/retry re-executes a logged AI call with the same parameters',
          'Retry button in AI Calls observability table — re-run any call and see the new response inline',
          'Create Task from Finding — POST /api/v1/findings/[id]/task creates a FINDING_TRIAGE task linked to the finding',
          'Explicit enum constraints in deep-scan and cross-file prompts — severity, category, confidence, exploitScore values strictly enumerated',
        ],
      },
      {
        label: 'Bug Fixes',
        items: [
          'Empty AI response detection — cloud-ollama and hosted-ollama providers now detect empty responses with non-zero output tokens and throw for retry',
          'Deep-scan and cross-file nodes retry on empty AI responses instead of silently producing zero findings',
          'Finding chat now sends full context: aiExplanation, aiFix, exploitScore, codeSnippet',
          'Finding PATCH uses authenticated userId instead of hardcoded "system" for history entries',
        ],
      },
      {
        label: 'Changed',
        items: [
          'Finding GET includes linked task relation in response',
          'Findings list API includes task relation in response',
          'Scan detail API includes task relation for findings',
          'FindingsTable grid layout expanded to include Task column',
          'Deep-scan node supports singleFile parameter for per-file rescan',
          'Chat system prompt includes severity, category, and status enums',
        ],
      },
    ],
  },
  {
    version: '2.5.0',
    date: '2026-05-08',
    title: 'Security hardening and performance improvements',
    description: 'Comprehensive security audit — all API routes now require authentication, middleware bypass fixed, rate limiting on auth endpoints, GitHub tokens encrypted at rest. Performance: event-driven worker, async I/O, temp cleanup, pagination.',
    categories: [
      {
        label: 'Security',
        items: [
          'Middleware bypass fixed — removed blanket /api/* public bypass, only /api/v1/auth/* and /api/v1/health are public',
          'All API routes now require authentication via requireAuth() — config, providers, findings, scans, presets, rules, preferences',
          'ADMIN-only access for config GET/PUT and user-rules DELETE',
          'canWrite() check on scan control routes (cancel, resume, rerun-node) — only ADMIN/ANALYST can control scans',
          'requireScanOwnership() — non-admin users can only access their own scans',
          'Non-admin users see only their own findings (via scan.userId filter)',
          'Presets scoped — non-admin users see built-in + own presets only',
          'Rate limiting on auth endpoints — 10/min for login, 5/min for signup (IP-based)',
          'GitHub access tokens encrypted at rest with AES-256-GCM',
        ],
      },
      {
        label: 'Performance',
        items: [
          'Event-driven worker loop replaces 3-second setInterval polling — processes jobs immediately when available, sleeps when idle',
          'Async I/O in scan nodes — clone, discover, and deep-scan now use fs/promises and child_process.exec (promisified)',
          'Temp directory cleanup on scan failure — worker removes astra-scan-* dirs when scans fail',
          'Chat history pagination — limit/offset with default 50 messages, newest-first ordering',
          'Shared parsePagination() helper across all paginated API routes — clamps limit (1-200) and offset',
        ],
      },
      {
        label: 'Changed',
        items: [
          'requireScanOwnership() helper added to rbac.ts — checks scan.userId against authenticated user',
          'parsePagination() utility added to lib/pagination.ts — shared limit/offset parsing with clamping',
          'rateLimit() utility added to lib/rate-limit.ts — in-memory sliding window rate limiter',
          'encrypt()/decrypt() utilities added to lib/encryption.ts — AES-256-GCM for sensitive data at rest',
          'Preset model now has userId field with User relation (Prisma migration)',
          'processNextJob() returns boolean (hadJob) for worker loop integration',
          'startWorker()/stopWorker() exported from worker.ts for lifecycle management',
        ],
      },
    ],
  },
  {
    version: '2.4.0',
    date: '2026-05-07',
    title: 'Scan lifecycle fixes, manual task creation, table refresh',
    description: 'Critical bug fixes for stuck scans and job processing, manual task creation UI, refresh buttons on all data tables, and scan elapsed time display.',
    categories: [
      {
        label: 'New',
        items: [
          'Manual task creation — "+ New task" button on Tasks page opens a sliding panel with title, description, type, priority, assignee, due date, and optional finding ID',
          'Refresh buttons (⟳) on all data tables — Tasks, AI Calls, Alerts, Findings',
          'Cancel scan button for PENDING/RUNNING scans — fails stuck jobs and marks scan as FAILED',
          'Live elapsed time display on scan detail — running scans show ticking timer, completed scans show static duration',
        ],
      },
      {
        label: 'Fixed',
        items: [
          'Scan stuck at PENDING/RUNNING — worker `processing` mutex was never reset when no jobs were available, blocking all future processing',
          'Worker processes jobs for already-FAILED/COMPLETED scans — now skips and fails stale jobs for terminal scans',
          'markScanCompletedIfNeeded blocked by retried failures — a FAILED job with a subsequent COMPLETED retry for the same node no longer prevents scan completion',
          'Resume endpoint blocked by stale RUNNING jobs — now calls cleanupStuckJobs() before checking for pending/running jobs',
          'AiCallTable JSX typo — unclosed span tag caused rendering errors',
          'Task creation UI unreachable — create modal existed but had no trigger button',
          'Create task API errors silently swallowed — now shows alert on failure',
        ],
      },
    ],
  },
  {
    version: '2.3.0',
    date: '2026-05-07',
    title: 'Observability and Tasks',
    description: 'Complete AI observability with per-call logging, structured logging via Pino, and a cross-scan Tasks screen with Carbon DataTable.',
    categories: [
      {
        label: 'New',
        items: [
          'AI observability layer — every AI provider call is captured with full request/response, tokens, latency, temperature, thinking depth, endpoint, SDK version',
          'AiCallLog model stores raw requests, raw responses, system/user prompts, response text — no truncation',
          'instrumentedSend wrapper captures pipeline, chat, and ad-hoc AI calls with source tracking',
          'Observability page (/observability) with summary cards and filterable/sortable/expandable AI call table',
          'AI Calls tab in scan detail showing per-scan AI call logs grouped by node',
          'AI call API endpoints: /api/v1/ai-calls (list), /api/v1/ai-calls/[id] (detail), /api/v1/ai-calls/stats (aggregated)',
          'Pino structured JSON logger replacing console.log — writes to ./logs/astra.log with rotation',
          'Task model with hybrid types: FINDING_TRIAGE (auto from findings), REMEDIATION, MANUAL_REVIEW, MANUAL, AI_GENERATED',
          'Tasks page (/tasks) with Carbon DataTable — checkbox selection, batch actions, expandable accordion detail, sub-tabs (Details, Actions, Comments)',
          'Task priority badges (CRITICAL/HIGH/MEDIUM/LOW/INFO), status badges, type labels',
          'Batch task operations: reassign, change priority, change status, delete',
          'AI task suggestion endpoint — analyzes open findings and suggests task groupings',
          'Task-finding bidirectional sync — assignment changes propagate between linked tasks and findings',
          'Auto-task creation from HIGH/CRITICAL/MEDIUM findings during scan persist',
          'Pino Edge Runtime fix — logger split into edge-safe stub and node-only module',
          'Scan FAILED race condition fix — persistNode no longer sets status directly, worker guard checks COMPLETED before marking FAILED',
          'durationSeconds now calculated in markScanCompletedIfNeeded',
        ],
      },
      {
        label: 'Changed',
        items: [
          'Navigation: Scans | Tasks | Observability | Configuration | Rules | Changelog',
          'Worker console.log replaced with pino structured logging',
          'Scan detail now has AI Calls tab alongside Overview/Alerts/Files/Rules/Pipeline/Chat',
          'Finding PATCH endpoint syncs assignedToId changes to linked Tasks',
        ],
      },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-05-07',
    title: 'Real AI chat and configurable chat AI',
    description: 'Chat now uses real AI providers instead of hardcoded responses. Chat AI is configurable via Configuration page.',
    categories: [
      {
        label: 'New',
        items: [
          'Real AI-powered chat responses using configured AI provider (Cloud Ollama, OpenAI, Anthropic, etc.)',
          'AI Chat FAB button in bottom-right corner with slide-out chat sidebar',
          'Chat AI configuration tab in Configuration page — provider, model, temperature, thinking, system prompt',
          'Org-level chat API at /api/v1/chat for general security questions',
          'ai-chat.ts service that reads chat config and uses provider factory',
          'Chat context-aware: per-finding chat includes full finding details in system prompt',
        ],
      },
      {
        label: 'Changed',
        items: [
          'All 3 chat routes (org, scan, finding) now call real AI model via sendChatMessage',
          'Config schema extended with chatConfigSchema for AI chat settings',
          'astra.config.json now includes chat section with provider/model/systemPrompt',
          'AI Assist buttons in AlertDetail and FindingsTable now open the global chat sidebar',
          'ConfigEditor redesigned with Carbon-styled tabs including new Chat AI tab',
        ],
      },
    ],
  },
  {
    version: '2.1.0',
    date: '2026-05-07',
    title: 'Security, chat, and export enhancements',
    description: 'Role-based access control, per-finding AI chat, enhanced exports with triage fields.',
    categories: [
      {
        label: 'New',
        items: [
          'Role-based access control (RBAC) — requireAuth helper, canWrite/canAdmin checks, VIEWER blocked from mutating data',
          'Per-finding AI chat API at /api/v1/findings/[id]/chat with context-aware responses',
          'rbac.ts utility module with requireAuth(), requireRole(), canWrite(), canAdmin()',
          'HTML and Markdown export buttons in ExportPanel',
        ],
      },
      {
        label: 'Changed',
        items: [
          'All API routes now use session-based auth instead of hardcoded userId',
          'Comments API uses real session userId instead of "system" placeholder',
          'Scan creation sets userId from authenticated session',
          'GET /api/v1/scans filters by userId for non-ADMIN users',
          'Export API includes triage fields (status, assignedToId) in JSON, CSV, SARIF, and report data',
          'Signup API enforces role restrictions — non-ADMIN users can only create VIEWER',
          'User management APIs (list, patch, delete) restricted to ADMIN only',
          'ExportPanel redesigned with unified Carbon button style and eyebrow label',
        ],
      },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-05-07',
    title: 'Platform redesign',
    description: 'Complete UI overhaul with IBM Carbon Design, authentication, alert triage, and landing page.',
    categories: [
      {
        label: 'New',
        items: [
          'Landing page with product overview, pipeline steps, capabilities, and CTA',
          'Authentication system with NextAuth v5 — email/password credentials, JWT sessions, role-based access (ADMIN/ANALYST/VIEWER)',
          'Sign-in page, admin-only user creation via /settings/users',
          'AppShell layout with utility bar, navigation, theme toggle, and user menu',
          'Alert triage workflow — unified status tracking (OPEN/IN_PROGRESS/IN_REVIEW/COMPLETED/FALSE_POSITIVE/ACCEPTED_RISK/BLOCKED/CANCELLED), assignment, comments, history',
          'AlertDetail slide-out panel with status actions and history timeline',
          'Settings index page with Profile, GitHub, and User Management cards',
          'GitHub integration — PAT linking, repo/branch selectors, connected account display',
          'Per-finding AI chat and scan-level chat with AiConversation model',
          'exploitationScenario field on Finding model with AI-generated exploit details',
          'Dark theme with Carbon g10 tokens, persisted via UserPreference',
        ],
      },
      {
        label: 'Changed',
        items: [
          'UI fully redesigned to IBM Carbon Design System — Plex Sans, 0px border-radius, IBM Blue accent, hairline elevation',
          'Findings renamed to "Alerts" in UI with status badges and severity filters',
          'Scan creation enhanced with AI Instructions, per-node configuration, and custom rules',
          'Report page now theme-aware using CSS custom properties',
          'GitHub API routes now use session-based auth instead of prisma.user.findFirst()',
          'Middleware protects all app routes; only landing page and auth pages are public',
          'Signup removed from public UI — admins create users via /settings/users',
        ],
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-05-05',
    title: 'AI chat and rules engine',
    description: 'Interactive AI chat for scans, custom rules management, and user preferences.',
    categories: [
      {
        label: 'New',
        items: [
          'ScanChat component for per-scan AI conversations',
          'AI chat API endpoint at /api/v1/scans/[id]/chat',
          'UserRules CRUD API and tabbed Rules page (Global + AI-Inferred)',
          'Theme persistence via UserPreference model and /api/v1/preferences endpoint',
          'ThemeToggle button in navigation',
        ],
      },
      {
        label: 'Changed',
        items: [
          'Scan creation accepts instructions, config overrides, and rules array',
          'Enhanced findings table with exploitationScenario, exploitScore, CWE/OWASP badges',
        ],
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-05-03',
    title: 'Reporting and export pipeline',
    description: 'Dark-themed security report and multi-format export.',
    categories: [
      {
        label: 'New',
        items: [
          'Security report page at /scans/[id]/report with ExecutiveSummary, ReportFileBrowser, ReportFindingDetail',
          'Export API supporting JSON, CSV, SARIF, HTML, and Markdown formats',
          'Rescan button on COMPLETED scans',
        ],
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-05-01',
    title: 'Job queue and scan lifecycle',
    description: 'Event-driven worker pipeline for scan processing.',
    categories: [
      {
        label: 'New',
        items: [
          'Job and ScanLog models for persistent job queue',
          'Enqueue/claim/complete/fail pipeline with automatic retries',
          'Scan control APIs: cancel, resume, rerun-node, progress, logs, stream',
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-04-28',
    title: 'AI provider architecture',
    description: 'Seven AI provider backends with per-node configuration.',
    categories: [
      {
        label: 'New',
        items: [
          'Cloud Ollama, Hosted Ollama, OpenAI, Anthropic, Bedrock (stub), Azure AI Foundry (stub), LangGraph (stub)',
          'Per-node AI configuration: provider, model, temperature, thinkingDepth',
          'ConfigEditor for visual pipeline configuration',
        ],
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-04-25',
    title: 'Findings dashboard and file explorer',
    description: 'Interactive findings table with severity filtering and file-level code viewer.',
    categories: [
      {
        label: 'New',
        items: [
          'Findings table with severity filtering, expandable rows, and code snippets',
          'File explorer for browsing scanned repository structure',
          'SeverityBadge component (CRITICAL/HIGH/MEDIUM/LOW/INFO)',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-04-20',
    title: 'Initial release',
    description: 'Core platform with scanning, AI analysis, and dashboard.',
    categories: [
      {
        label: 'New',
        items: [
          'Next.js application scaffold with Prisma ORM and PostgreSQL',
          'LangGraph AI pipeline for multi-stage code analysis',
          'Scan creation, listing, and detail views',
          'Docker Compose for local development',
          '12 API endpoints for scan management',
        ],
      },
    ],
  },
];

export default CHANGELOG;