# Frontpage Redesign — Design Spec

**Date:** 2026-05-16
**Status:** Draft
**Scope:** Replace `src/app/page.tsx` (LandingPageV2) with a new frontpage

## Problem

The current frontpage has four issues:
1. **Messaging is off** — Shows pipeline internals (9 node names, scanner cards) instead of outcomes (what Astra finds, what users get)
2. **Visual design is weak** — 691-line self-contained component with all inline styles, no component reuse, IBM Carbon constraints on a marketing surface
3. **Missing features** — No coverage of cloud scan, compliance, SBOM, network, runtime, IaC modules, RBAC, multitenancy, competitive positioning, or pricing
4. **Too much wrong content** — Pipeline nodes and scanner names are implementation details; visitors care about outcomes, not architecture

## Design Principles

- **Outcomes over internals** — Show what Astra finds and what users get, not how the pipeline works
- **Dark, technical, product-led** — Dark canvas, real product output, credibility through demonstration
- **Independent visual identity** — The frontpage is a marketing surface, not an internal app. It has its own design language separate from IBM Carbon
- **Bring your own model** — Model-agnostic messaging, not provider listing
- **Full product vision** — Present all 8 scan modules, enterprise features, competitive advantages, and pricing as features of the platform

## Visual Direction

- **Dark mode default** — Deep black/charcoal background (#0a0a0a to #161616), crisp white and light gray text
- **Accent colors** — IBM blue (#0f62fe) as primary CTA, severity colors (red #da1e28, orange #f57c00, yellow #f1c21b, green #24a148) for findings
- **Typography** — Clean geometric sans-serif (IBM Plex Sans or Inter), oversized hero headlines, lightweight body text
- **Spacing** — Generous whitespace between sections, content max-width ~1200px, centered
- **Animations** — Scroll-triggered fade-up reveals, severity badge pulses, pipeline node sequence animations, finding appearance animations
- **Component isolation** — Frontpage components live in `src/components/landing/` and are NOT shared with the authenticated app

## Page Sections (14)

### Section 1: Hero

**Layout:** Two-column (60/40 split on desktop, stacked on mobile)

**Left:**
- Eyebrow: "AI-native security scanning" (sentence case, muted color)
- Headline: "Find vulnerabilities before they find you" (large, bold, "vulnerabilities" in accent color)
- Subhead: "SAST, SCA, secrets, IaC, cloud, network, and business logic — one pipeline, AI-enriched findings, code never leaves your environment."
- CTAs:
  - **"Try a scan"** — primary button, scrolls to demo section
  - **"See how it works"** — secondary button, scrolls to AI Advantage section
- Tag pills: SAST, SCA, Secrets, IaC, Cloud, Network, Business Logic, Compliance

**Right:**
- Animated scan walkthrough — CSS/JS animated frames showing:
  1. Repo URL being entered
  2. Pipeline nodes lighting up in sequence (brief, abstract)
  3. Findings appearing with severity badges (CRITICAL, HIGH, MEDIUM)
  4. One finding expanding to show AI explanation
- Pure client-side animation, no backend dependency

**Below hero:** Stat bar with 3-4 metrics:
- "45,000+ vulnerabilities detected"
- "8 scan modules"
- "100% code stays in your environment"

### Section 2: Interactive Demo — "See it in action"

**Layout:** Full-width dark panel with terminal-like aesthetic

**Content:**
- A pre-loaded scan result showing 4-5 findings from a sample repo
- Each finding shows: severity badge, title, file path, line number
- **Toggle switch:** "Raw scanner output" ↔ "Astra AI-enriched"
  - Raw side: dense JSON, CVE ID, file path, minimal context
  - Astra side: plain-language explanation, specific fix suggestion, exploitability score, CWE/OWASP mapping, business logic context
- The toggle is the key moment — it demonstrates the AI value proposition instantly

**Data:** Hardcoded mock findings in a `demoData.ts` file. No backend calls. Findings should be realistic (e.g., SQL injection in `auth/login.ts`, leaked AWS key in `.env`, insecure TLS config in `terraform/main.tf`).

### Section 3: AI Advantage — "The AI difference"

**Layout:** Side-by-side comparison panels

**Left panel ("What scanners give you"):**
- Screenshot/mockup of raw Trivy output: JSON blob with CVE ID, package, version, vague description
- Label: "Raw scanner output"

**Right panel ("What Astra gives you"):**
- Same finding, enriched:
  - Plain-language explanation ("This SQL query concatenates user input directly into the query string, allowing an attacker to inject arbitrary SQL commands.")
  - Specific fix with code diff
  - Exploitability score: 8.2/10
  - CWE-89, OWASP A03:2021
  - Business logic context: "This endpoint is part of the authentication flow — a successful injection could bypass login entirely."
- Label: "AI-enriched finding"

**Below:** Three differentiator callouts:
1. **Business logic detection** — Finds authorization flaws (IDOR, BOLA, BFLA) that pattern-matching scanners miss
2. **Cross-file reasoning** — Connects data flows across files to find vulnerabilities that only exist across module boundaries
3. **AI-aware SAST** — Tunes detection for AI-generated code patterns ("vibe-coded" vulnerabilities)

### Section 4: What it finds — "Vulnerabilities that matter"

**Layout:** 6-column grid on desktop, 2-column on tablet, 1-column on mobile

**Each card:**
- Category icon/badge (color-coded by severity)
- Category name
- 3-4 one-line example findings with file paths

**Categories:**

| Category | Examples |
|----------|----------|
| Code vulnerabilities (SAST) | SQL injection in `auth/login.ts:47`, XSS in `components/Comment.tsx:112`, Path traversal in `api/files.ts:23` |
| Dependency risks (SCA) | CVE-2024-1234 in `lodash@4.17.21`, Outdated `express@4.18.2`, Known exploit in `jsonwebtoken@9.0.0` |
| Secrets & credentials | AWS access key in `.env:5`, GitHub token in `config/defaults.ts:12`, Private key in `certs/server.key` |
| Infrastructure misconfigs (IaC) | Open S3 bucket in `terraform/main.tf:34`, Permissive IAM role in `terraform/iam.tf:89`, Insecure TLS in `helm/values.yaml:7` |
| Business logic flaws | Missing auth middleware on `/api/admin/*`, Privilege escalation via `/api/users/:id/role`, Broken access control on `/api/orders/:id` |
| Cloud misconfigs | Public S3 bucket (AWS), Open network security group (Azure), Overly permissive IAM (GCP) |

### Section 5: Works with your stack — "Scans everything you use"

**Layout:** Icon grid / tag cloud on dark background

**Rows:**

- **Languages:** JavaScript, TypeScript, Python, Go, Java, Rust, C, C++, Ruby, PHP, C#, Kotlin, Swift, Dart, Scala, Shell
- **Frameworks:** React, Next.js, Vue, Angular, Express, Django, Flask, FastAPI, Spring Boot, Rails, Laravel, Gin, Fiber
- **Cloud providers:** AWS, Azure, GCP
- **IaC tools:** Terraform, Kubernetes, CloudFormation, Helm, Ansible, Pulumi
- **Package managers:** npm, pip, go mod, Maven, Cargo, NuGet, Composer, Gems

**Visual:** Monospace tags or small icon+label cards, muted borders, hover reveals a subtle glow.

### Section 6: Full platform coverage — "One platform, every attack surface"

**Layout:** Visual module grid — 8 cards in a 4x2 (desktop) or 2x4 (tablet) grid

**Each card:**

| Module | Icon | Short description |
|--------|------|-------------------|
| Code Scan | Code icon | SAST, SCA, secrets, IaC — Trivy, Semgrep, Gitleaks, Bearer, AI deep scan |
| Cloud Scan | Cloud icon | AWS, Azure, GCP — Prowler, ScoutSuite, kube-bench misconfig detection |
| Compliance | Shield icon | 43 frameworks — CIS, PCI-DSS, NIST 800-53, SOC2, HIPAA, ISO 27001, GDPR, FedRAMP |
| PCI DSS | Lock icon | ASV integration, internal scanning, attestation workflow |
| Network Scan | Network icon | Nmap port scanning, OpenVAS vulnerability detection, service fingerprinting |
| SBOM | Package icon | Syft + Grype — software bill of materials, license conflict detection, reachability analysis |
| Runtime Security | Activity icon | Falco — real-time event detection, runtime anomaly correlation, alert dispatch |
| IaC Scan | Infrastructure icon | Checkov + Trivy IaC — Terraform, K8s, CloudFormation, custom Rego policies |

**Each card shows:** module name, 1-line description, feature gate badge (e.g., "Pro" or "Enterprise"), and the primary tools/categories.

### Section 7: Cloud & Infrastructure — "Secure your cloud footprint"

**Layout:** Three-panel layout

**Left panel — Cloud Scan:**
- AWS, Azure, GCP misconfig detection
- Prowler (43 compliance frameworks), ScoutSuite (multi-cloud audit), kube-bench (K8s hardening)
- Feature gate badge: "Enterprise"

**Center panel — Compliance:**
- Framework mapping: CIS, PCI-DSS, NIST 800-53, SOC2, HIPAA, ISO 27001, GDPR, FedRAMP
- Auto-mapping from findings to compliance controls
- Audit-ready reports

**Right panel — IaC:**
- Terraform, Kubernetes, CloudFormation, Helm
- Misconfig detection before deployment
- Custom Rego policies
- Feature gate badge: "Pro"

### Section 8: Network & Runtime — "Beyond code"

**Layout:** Three-panel layout

**Left panel — Network Scan:**
- Nmap (port scanning, service detection)
- OpenVAS (vulnerability scanning)
- Network target management

**Center panel — SBOM:**
- Syft (software bill of materials)
- Grype (vulnerability matching)
- License conflict detection
- Reachability analysis
- Feature gate badge: "Pro" (generate) / "Enterprise" (full)

**Right panel — Runtime:**
- Falco agent deployment
- Real-time event collection
- Anomaly correlation and alert dispatch
- Feature gate badge: "Enterprise"

### Section 9: Feature Breakdown — "Built for security teams"

**Layout:** Feature grid, 2-3 columns, each feature as a card with icon + title + 1-2 line description

**Features:**

| Feature | Description |
|---------|-------------|
| AI Deep Scan | Per-file vulnerability analysis with AI enrichment |
| AI Cross-File | Cross-file business logic reasoning and authorization flaw detection |
| AI Chat | Multi-provider conversational AI assistant for findings context |
| Alert Triage | Severity-based alert management with SLA enforcement |
| Task Management | Link findings to tasks, assign, track remediation progress |
| AI Observability | Token usage, latency, cost tracking per AI call |
| Pipeline Visibility | 9-node scan pipeline with real-time progress and per-node status |
| Streaming Chat | Real-time AI responses via SSE (design approved) |
| SARIF Export | Industry-standard finding output for CI/CD integration |
| GitHub Integration | PR comments, finding linking, repository scanning |
| On-demand Rescan | Per-file and full rescan capabilities |
| Project Scoping | Organize scans by project with per-project configuration |

### Section 10: Bring Your Own Model — "Your data, your model, your choice"

**Layout:** Single centered block with visual connector diagram

**Messaging:**
- Astra is model-agnostic — configure any OpenAI-compatible endpoint
- Per-pipeline-stage model selection (use a fast model for discovery, a powerful model for deep scan)
- Supported: OpenAI, Anthropic, Ollama (local or cloud), AWS Bedrock, Azure AI Foundry, LangGraph, any OpenAI-compatible API
- Data never leaves your environment — models run where you choose

**Visual:** A simple diagram showing the pipeline on the left, model options on the right, with arrows connecting stages to models. Not a provider listing — a "configure your own" message.

### Section 11: RBAC & Enterprise — "Enterprise-grade from day one"

**Layout:** Four-column feature grid

| Column | Features |
|--------|----------|
| **Access Control** | 5 built-in roles (Admin, SecOps, Engineer, Viewer, Custom), 40+ granular permissions, project-scoped access, API key scopes |
| **Data Security** | AES-256-GCM encryption at rest, TLS 1.3 in transit, source code never leaves your environment, PostgreSQL row-level security per org |
| **Deployment** | SaaS, self-hosted, or hybrid — your choice. Air-gapped support for self-hosted. VPC deployment for cloud. |
| **Audit & Compliance** | Structured JSON audit logging, 7-year retention, SOC2, ISO 27001, HIPAA, GDPR compliance mapping, SLA enforcement (4h CRITICAL, 24h HIGH, 72h MEDIUM, 7d LOW) |

### Section 12: Competition — "Why Astra"

**Layout:** Comparison table / visual differentiation

**Key differentiators (not a feature checklist — narrative positioning):**

1. **Business-logic detection that others miss** — 49% of critical bug-bounty findings are IDOR/BOLA/BFLA. Pattern-matching scanners can't find these. Astra's hybrid deterministic+LLM engine does.
2. **Unified platform, not point tools** — AI SAST + reachability SCA + secrets + IaC + cloud + network + SBOM + runtime + compliance in one product. Replace 4-6 separate tools.
3. **Transparent pricing** — No enterprise sales calls under $2K/month. Self-serve Free/Pro/Enterprise tiers. No pricing cliff at 11 developers.
4. **AI-generated code awareness** — Astra tags AI-generated files during analysis and applies detection patterns tuned for "vibe-coded" vulnerabilities.
5. **Cross-repo reasoning** — Multi-repo and cross-service data flow analysis. No one else does this at production scale.

**Visual:** Each differentiator is a card with a headline, 2-3 line explanation, and a small comparison note (e.g., "Snyk: SCA only. Semgrep: pattern-matching only. Astra: hybrid deterministic+LLM").

### Section 13: Outcomes & KPIs — "Measurable impact"

**Layout:** Stat cards row + pricing tiers below

**Stat cards (top row):**
- "92% fewer false positives with AI enrichment"
- "73% faster remediation with AI-generated fixes"
- "45 min average time to first finding"
- "8 attack surfaces covered in one platform"

**Pricing tiers (below):**

| | Free | Pro | Enterprise |
|---|---|---|---|
| Code scan | 3 scanners, no AI | All + AI | All + AI + custom rules |
| Cloud scan | — | AWS only | AWS + Azure + GCP |
| Compliance | — | CIS only | All 43 frameworks |
| Network scan | — | — | Full |
| SBOM | — | Generate only | Full (license + vuln) |
| Runtime | — | — | Full |
| IaC scan | — | Terraform + K8s | All IaC + custom policies |
| AI chat | — | 100 msg/mo | Unlimited |
| RBAC | Viewer only | 3 roles | Custom roles + permissions |
| Projects | 1 | 10 | Unlimited |
| Pricing | $0 | ~$20/dev/mo | ~$80/dev/mo |
| CTA | "Get started" | "Start free trial" | "Contact sales" |

Note: Pricing is approximate/illustrative on the landing page. Actual pricing TBD.

### Section 14: CTA + Footer

**CTA section:**
- Dark background (#0a0a0a)
- Headline: "Start finding vulnerabilities today"
- Body: "One pipeline. Every attack surface. AI-enriched findings that tell you what's wrong and how to fix it."
- Two buttons:
  - **"Get started — free"** (primary, large)
  - **"Read the docs"** (secondary, outline)
- Subtext: "No credit card. No agent to install."

**Footer:**
- Logo + one-line tagline
- 4 columns: Product, Features, Resources, Company
- Bottom bar: copyright, Privacy, Terms, Security links
- Minimal, dark, no mega-footer

## Technical Implementation

### File Structure
```
src/app/page.tsx                  — Landing page (replaces current 691-line file)
src/components/landing/          — New directory for all landing page components
  Hero.tsx                        — Section 1
  InteractiveDemo.tsx             — Section 2
  AiAdvantage.tsx                 — Section 3
  WhatItFinds.tsx                 — Section 4
  StackCoverage.tsx               — Section 5
  PlatformCoverage.tsx             — Section 6
  CloudInfrastructure.tsx          — Section 7
  NetworkRuntime.tsx               — Section 8
  FeatureBreakdown.tsx             — Section 9
  BringYourOwnModel.tsx            — Section 10
  RbacEnterprise.tsx               — Section 11
  Competition.tsx                  — Section 12
  OutcomesKpis.tsx                 — Section 13
  CtaFooter.tsx                    — Section 14
  demoData.ts                      — Hardcoded mock findings for demo
  animations.ts                    — Shared animation utilities (scroll reveal, count-up, pulse)
```

### Design System (Landing-specific)
- CSS custom properties for landing colors, spacing, typography
- No dependency on IBM Carbon for the landing page
- Dark mode by default (no theme toggle on landing page)
- Responsive breakpoints: 672px, 1056px, 1312px, 1584px (matching IBM Carbon grid)
- Animations: CSS keyframes + IntersectionObserver for scroll reveals
- All components are `'use client'` — the landing page is interactive

### Auth Behavior
- Unauthenticated users see the landing page
- Authenticated users redirect to `/scans` (preserved from current behavior)
- No change to auth logic

### Data Sources
- Mock findings data in `demoData.ts` — realistic but hardcoded
- Module/feature/pricing data in component files — no API calls
- Competitive comparison data hardcoded — no external references

### Branding
- All brand strings use `branding.ts` imports (APP_NAME, APP_TITLE, APP_DOMAIN, etc.)
- No hardcoded "Astra" anywhere
- APP_DOMAIN used for footer links

## Out of Scope
- Streaming chat implementation (separate spec)
- Authenticated app UI changes
- API routes
- Database schema changes
- Dark mode toggle (landing page is dark-only)
- Internationalization
- SEO optimization (separate task)
- Analytics/tracking integration