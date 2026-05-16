// src/components/landing/landingData.ts
// All section content data for the landing page.
// Single source of truth for all text content.

import { APP_NAME, APP_DOMAIN } from '@/lib/branding';

// ─── Hero ───────────────────────────────────────────────
export const heroData = {
  eyebrow: 'AI-native security scanning',
  headline: 'Stop shipping vulnerabilities. Start shipping confidence.',
  headlineAccent: 'vulnerabilities',
  subhead: 'SAST, SCA, secrets, IaC, cloud, network, and business logic — one pipeline, AI-enriched findings, code never leaves your environment.',
  ctaPrimary: 'Try a scan',
  ctaSecondary: 'See how it works',
  tags: ['SAST', 'SCA', 'Secrets', 'IaC', 'Cloud', 'Network', 'Business Logic', 'Compliance'],
  stats: [
    { value: 45000, suffix: '+', label: 'Vulnerabilities detected' },
    { value: 8, suffix: '', label: 'Scan modules' },
    { value: 100, suffix: '%', label: 'Code stays in your environment' },
  ],
};

// ─── What It Finds ───────────────────────────────────────
export const findingCategories = [
  {
    id: 'sast',
    title: 'Code vulnerabilities',
    tag: 'SAST',
    color: '#da1e28',
    examples: [
      'SQL injection in auth/login.ts:47',
      'XSS in components/Comment.tsx:112',
      'Path traversal in api/files.ts:23',
    ],
  },
  {
    id: 'sca',
    title: 'Dependency risks',
    tag: 'SCA',
    color: '#f57c00',
    examples: [
      'CVE-2024-1234 in lodash@4.17.21',
      'Outdated express@4.18.2',
      'Known exploit in jsonwebtoken@9.0.0',
    ],
  },
  {
    id: 'secrets',
    title: 'Secrets & credentials',
    tag: 'Secrets',
    color: '#da1e28',
    examples: [
      'AWS access key in .env:5',
      'GitHub token in config/defaults.ts:12',
      'Private key in certs/server.key',
    ],
  },
  {
    id: 'iac',
    title: 'Infrastructure misconfigs',
    tag: 'IaC',
    color: '#f1c21b',
    examples: [
      'Open S3 bucket in terraform/main.tf:34',
      'Permissive IAM role in terraform/iam.tf:89',
      'Insecure TLS in helm/values.yaml:7',
    ],
  },
  {
    id: 'business-logic',
    title: 'Business logic flaws',
    tag: 'Business Logic',
    color: '#da1e28',
    examples: [
      'Missing auth middleware on /api/admin/*',
      'Privilege escalation via /api/users/:id/role',
      'Broken access control on /api/orders/:id',
    ],
  },
  {
    id: 'cloud',
    title: 'Cloud misconfigs',
    tag: 'Cloud',
    color: '#f57c00',
    examples: [
      'Public S3 bucket (AWS)',
      'Open network security group (Azure)',
      'Overly permissive IAM (GCP)',
    ],
  },
];

// ─── Stack Coverage ──────────────────────────────────────
export const stackData = {
  languages: ['JavaScript', 'TypeScript', 'Python', 'Go', 'Java', 'Rust', 'C', 'C++', 'Ruby', 'PHP', 'C#', 'Kotlin', 'Swift', 'Dart', 'Scala', 'Shell'],
  frameworks: ['React', 'Next.js', 'Vue', 'Angular', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Rails', 'Laravel', 'Gin', 'Fiber'],
  clouds: ['AWS', 'Azure', 'GCP'],
  iac: ['Terraform', 'Kubernetes', 'CloudFormation', 'Helm', 'Ansible', 'Pulumi'],
  packages: ['npm', 'pip', 'go mod', 'Maven', 'Cargo', 'NuGet', 'Composer', 'Gems'],
};

// ─── Platform Coverage (8 modules) ───────────────────────
export const platformModules = [
  {
    id: 'code-scan',
    title: 'Code Scan',
    description: '6 scanners + AI deep scan — Trivy, Semgrep, Gitleaks, Bearer, Checkov, Bandit. SAST, SCA, secrets, IaC in one pass.',
    tier: 'Free',
    color: '#0f62fe',
  },
  {
    id: 'cloud-scan',
    title: 'Cloud Scan',
    description: 'AWS, Azure, GCP — Prowler, ScoutSuite, kube-bench. 2,500+ cloud misconfig checks across 3 providers.',
    tier: 'Enterprise',
    color: '#0093b7',
  },
  {
    id: 'compliance',
    title: 'Compliance',
    description: '43 frameworks — CIS, PCI-DSS, NIST 800-53, SOC2, HIPAA, ISO 27001, GDPR, FedRAMP. Auto-map findings to controls.',
    tier: 'Pro',
    color: '#24a148',
  },
  {
    id: 'pci-dss',
    title: 'PCI DSS',
    description: 'ASV integration (Qualys, Rapid7, Tenable), internal scanning, attestation workflow, 12-requirement compliance mapping.',
    tier: 'Enterprise',
    color: '#da1e28',
  },
  {
    id: 'network-scan',
    title: 'Network Scan',
    description: 'Nmap port scanning, OpenVAS vulnerability detection, service fingerprinting. 65,535-port coverage per target.',
    tier: 'Enterprise',
    color: '#6f6f6f',
  },
  {
    id: 'sbom',
    title: 'SBOM',
    description: 'Syft + Grype — software bill of materials, license conflict detection, reachability analysis. 350+ package ecosystems.',
    tier: 'Pro',
    color: '#f1c21b',
  },
  {
    id: 'runtime',
    title: 'Runtime Security',
    description: 'Falco — real-time event detection, runtime anomaly correlation, alert dispatch. 100+ default detection rules.',
    tier: 'Enterprise',
    color: '#f57c00',
  },
  {
    id: 'iac-scan',
    title: 'IaC Scan',
    description: 'Checkov + Trivy IaC — Terraform, K8s, CloudFormation, Helm, custom Rego policies. 1,000+ built-in policies.',
    tier: 'Pro',
    color: '#a8a8a8',
  },
];

// ─── Feature Breakdown ──────────────────────────────────
export const features = [
  { id: 'deep-scan', title: 'AI Deep Scan', description: 'Per-file vulnerability analysis with AI enrichment — 92% fewer false positives than raw scanner output' },
  { id: 'cross-file', title: 'AI Cross-File', description: 'Cross-file business logic reasoning — catches IDOR, BOLA, and privilege escalation that pattern matchers miss' },
  { id: 'ai-chat', title: 'AI Chat', description: 'Multi-provider conversational AI — Ollama, OpenAI, Anthropic, Bedrock, Azure. Context-aware finding triage' },
  { id: 'alert-triage', title: 'Alert Triage', description: 'Severity-based alert management with SLA enforcement — 4h CRITICAL, 24h HIGH, auto-escalation' },
  { id: 'task-mgmt', title: 'Task Management', description: 'Link findings to tasks, assign, track remediation progress with bidirectional status sync' },
  { id: 'observability', title: 'AI Observability', description: 'Token usage, latency, cost tracking per AI call — full request/response logging' },
  { id: 'pipeline', title: 'Pipeline Visibility', description: '9-node scan pipeline with real-time progress, per-node status, and interactive DAG visualization' },
  { id: 'streaming', title: 'Streaming Chat', description: 'Real-time AI responses via server-sent events — no waiting for full completions' },
  { id: 'sarif', title: 'SARIF Export', description: 'Industry-standard finding output for CI/CD integration — GitHub, GitLab, Azure DevOps compatible' },
  { id: 'github', title: 'GitHub Integration', description: 'PR comments, finding linking, repository scanning — automated security gates on every pull request' },
  { id: 'rescan', title: 'On-demand Rescan', description: 'Per-file and full rescan capabilities — verify fixes without re-running the entire pipeline' },
  { id: 'projects', title: 'Project Scoping', description: 'Organize scans by project with per-project configuration, rule sets, and AI provider selection' },
];

// ─── Competition ─────────────────────────────────────────
export const differentiators = [
  {
    id: 'business-logic',
    title: 'Business-logic detection that others miss',
    description: `49% of critical bug-bounty findings are IDOR, BOLA, BFLA — authorization flaws that pattern-matching scanners cannot detect. ${APP_NAME}'s hybrid deterministic+LLM engine reasons across files and services to find them.`,
    comparison: `Snyk: SCA only. Semgrep: pattern-matching only. ${APP_NAME}: hybrid deterministic+LLM with cross-file reasoning.`,
  },
  {
    id: 'unified',
    title: 'Unified platform, not point tools',
    description: '8 scan modules — SAST, SCA, secrets, IaC, cloud, network, SBOM, runtime — plus 43 compliance frameworks in one product. Replace 4-6 separate tools, one dashboard, one set of findings.',
    comparison: `Most teams run Snyk + Semgrep + Gitleaks + a compliance tool. ${APP_NAME} replaces all of them and adds business-logic detection.`,
  },
  {
    id: 'pricing',
    title: 'Transparent pricing',
    description: 'No enterprise sales calls under $2K/month. Self-serve Free/Pro/Enterprise tiers. No pricing cliff at 11 developers — Pro is ~$20/dev/mo with full AI.',
    comparison: `Snyk jumps from $25 to $105/dev at 11 seats. ${APP_NAME} stays predictable — Pro is ~$20/dev/mo with all scanners + AI.`,
  },
  {
    id: 'ai-aware',
    title: 'AI-generated code awareness',
    description: `${APP_NAME} tags AI-generated files during analysis and applies detection patterns tuned for vibe-coded vulnerabilities — hallucinated imports, copy-paste drift, and pattern-only "fixes" that don't address root cause.`,
    comparison: 'Other scanners treat AI-generated code the same as human-written code. They miss AI-specific vulnerability patterns.',
  },
  {
    id: 'cross-repo',
    title: 'Cross-repo reasoning',
    description: 'Multi-repo and cross-service data flow analysis. Maps authorization boundaries, API contract violations, and trust relationships between microservices.',
    comparison: `CodeRabbit launched limited multi-repo in March 2026. ${APP_NAME} targets cross-service graph analysis with data-flow-aware AI.`,
  },
];

// ─── Outcomes & KPIs ─────────────────────────────────────
export const kpiStats = [
  { value: 92, suffix: '%', label: 'fewer false positives with AI enrichment' },
  { value: 73, suffix: '%', label: 'faster remediation with AI-generated fixes' },
  { value: 45, suffix: ' min', label: 'average time to first finding' },
  { value: 8, suffix: '', label: 'attack surfaces covered in one platform' },
];

export const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    cta: 'Get started',
    features: [
      '3 scanners, no AI',
      '1 project',
      'Viewer-only RBAC',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '~$20',
    period: '/dev/mo',
    cta: 'Start free trial',
    features: [
      'All 6 scanners + AI',
      '10 projects',
      '3 roles',
      'AWS cloud scan',
      'CIS compliance',
      '100 AI chat messages/mo',
      'SBOM generation',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '~$80',
    period: '/dev/mo',
    cta: 'Contact sales',
    features: [
      'All + custom rules',
      'Unlimited projects',
      'Custom roles + permissions',
      'AWS + Azure + GCP',
      'All 43 compliance frameworks',
      'Unlimited AI chat',
      'Full SBOM + license scanning',
      'Network + Runtime + PCI DSS',
    ],
  },
];

// ─── RBAC & Enterprise ──────────────────────────────────
export const enterpriseFeatures = {
  access: {
    title: 'Access Control',
    items: [
      '5 built-in roles (Admin, SecOps, Engineer, Viewer, Custom)',
      '40+ granular permissions',
      'Project-scoped access',
      'API key scopes',
    ],
  },
  security: {
    title: 'Data Security',
    items: [
      'AES-256-GCM encryption at rest',
      'TLS 1.3 in transit',
      'Source code never leaves your environment',
      'PostgreSQL row-level security per org',
    ],
  },
  deployment: {
    title: 'Deployment',
    items: [
      'SaaS, self-hosted, or hybrid',
      'Air-gapped support for self-hosted',
      'VPC deployment for cloud',
      'Docker Compose for quick start',
    ],
  },
  audit: {
    title: 'Audit & Compliance',
    items: [
      'Structured JSON audit logging',
      '7-year retention',
      'SLA enforcement (4h CRITICAL, 24h HIGH)',
      'SOC2, ISO 27001, HIPAA, GDPR mapping',
    ],
  },
};

// ─── Footer ──────────────────────────────────────────────
export const footerCols = [
  {
    title: 'Product',
    links: [
      { label: 'Code Scan', href: '/#code-scan' },
      { label: 'Cloud Scan', href: '/#cloud-scan' },
      { label: 'Compliance', href: '/#compliance' },
      { label: 'SBOM', href: '/#sbom' },
    ],
  },
  {
    title: 'Features',
    links: [
      { label: 'AI Deep Scan', href: '/#features' },
      { label: 'AI Chat', href: '/#features' },
      { label: 'Alert Triage', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/knowledge?tab=docs' },
      { label: 'Changelog', href: '/knowledge?tab=changelog' },
      { label: 'API Reference', href: '/knowledge?tab=docs' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Security', href: '#' },
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  },
];