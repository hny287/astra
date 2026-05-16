// src/components/landing/landingData.ts
// All section content data for the landing page.
// Single source of truth for all text content.

import { APP_NAME, APP_DOMAIN } from '@/lib/branding';
import { landingTokens } from './landingStyles';

// ─── Hero ───────────────────────────────────────────────
export const heroData = {
  eyebrow: 'AI-native security scanning',
  headline: 'Find vulnerabilities before they find you',
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
    color: landingTokens.accentCritical,
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
    color: landingTokens.accentHigh,
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
    color: landingTokens.accentCritical,
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
    color: landingTokens.accentMedium,
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
    color: landingTokens.accentCritical,
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
    color: landingTokens.accentHigh,
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
    description: 'SAST, SCA, secrets, IaC — Trivy, Semgrep, Gitleaks, Bearer, AI deep scan',
    tier: 'Free',
    color: landingTokens.accentPrimary,
  },
  {
    id: 'cloud-scan',
    title: 'Cloud Scan',
    description: 'AWS, Azure, GCP — Prowler, ScoutSuite, kube-bench misconfig detection',
    tier: 'Enterprise',
    color: landingTokens.accentInfo,
  },
  {
    id: 'compliance',
    title: 'Compliance',
    description: '43 frameworks — CIS, PCI-DSS, NIST 800-53, SOC2, HIPAA, ISO 27001, GDPR, FedRAMP',
    tier: 'Pro',
    color: landingTokens.accentLow,
  },
  {
    id: 'pci-dss',
    title: 'PCI DSS',
    description: 'ASV integration, internal scanning, attestation workflow',
    tier: 'Enterprise',
    color: landingTokens.accentCritical,
  },
  {
    id: 'network-scan',
    title: 'Network Scan',
    description: 'Nmap port scanning, OpenVAS vulnerability detection, service fingerprinting',
    tier: 'Enterprise',
    color: landingTokens.inkMuted,
  },
  {
    id: 'sbom',
    title: 'SBOM',
    description: 'Syft + Grype — software bill of materials, license conflict detection, reachability analysis',
    tier: 'Pro',
    color: landingTokens.accentMedium,
  },
  {
    id: 'runtime',
    title: 'Runtime Security',
    description: 'Falco — real-time event detection, runtime anomaly correlation, alert dispatch',
    tier: 'Enterprise',
    color: landingTokens.accentHigh,
  },
  {
    id: 'iac-scan',
    title: 'IaC Scan',
    description: 'Checkov + Trivy IaC — Terraform, K8s, CloudFormation, custom Rego policies',
    tier: 'Pro',
    color: landingTokens.inkSecondary,
  },
];

// ─── Feature Breakdown ──────────────────────────────────
export const features = [
  { id: 'deep-scan', title: 'AI Deep Scan', description: 'Per-file vulnerability analysis with AI enrichment' },
  { id: 'cross-file', title: 'AI Cross-File', description: 'Cross-file business logic reasoning and authorization flaw detection' },
  { id: 'ai-chat', title: 'AI Chat', description: 'Multi-provider conversational AI assistant for findings context' },
  { id: 'alert-triage', title: 'Alert Triage', description: 'Severity-based alert management with SLA enforcement' },
  { id: 'task-mgmt', title: 'Task Management', description: 'Link findings to tasks, assign, track remediation progress' },
  { id: 'observability', title: 'AI Observability', description: 'Token usage, latency, cost tracking per AI call' },
  { id: 'pipeline', title: 'Pipeline Visibility', description: '9-node scan pipeline with real-time progress and per-node status' },
  { id: 'streaming', title: 'Streaming Chat', description: 'Real-time AI responses via server-sent events' },
  { id: 'sarif', title: 'SARIF Export', description: 'Industry-standard finding output for CI/CD integration' },
  { id: 'github', title: 'GitHub Integration', description: 'PR comments, finding linking, repository scanning' },
  { id: 'rescan', title: 'On-demand Rescan', description: 'Per-file and full rescan capabilities' },
  { id: 'projects', title: 'Project Scoping', description: 'Organize scans by project with per-project configuration' },
];

// ─── Competition ─────────────────────────────────────────
export const differentiators = [
  {
    id: 'business-logic',
    title: 'Business-logic detection that others miss',
    description: '49% of critical bug-bounty findings are IDOR, BOLA, BFLA. Pattern-matching scanners cannot find these. Astra\'s hybrid deterministic+LLM engine does.',
    comparison: 'Snyk: SCA only. Semgrep: pattern-matching only. Astra: hybrid deterministic+LLM.',
  },
  {
    id: 'unified',
    title: 'Unified platform, not point tools',
    description: 'AI SAST + reachability SCA + secrets + IaC + cloud + network + SBOM + runtime + compliance in one product. Replace 4-6 separate tools.',
    comparison: 'Most teams run Snyk + Semgrep + Gitleaks + a compliance tool. Astra replaces all of them.',
  },
  {
    id: 'pricing',
    title: 'Transparent pricing',
    description: 'No enterprise sales calls under $2K/month. Self-serve Free/Pro/Enterprise tiers. No pricing cliff at 11 developers.',
    comparison: 'Snyk jumps from $25 to $105/dev at 11 seats. Astra stays predictable.',
  },
  {
    id: 'ai-aware',
    title: 'AI-generated code awareness',
    description: 'Astra tags AI-generated files during analysis and applies detection patterns tuned for vibe-coded vulnerabilities.',
    comparison: 'Other scanners treat AI-generated code the same as human-written code.',
  },
  {
    id: 'cross-repo',
    title: 'Cross-repo reasoning',
    description: 'Multi-repo and cross-service data flow analysis. No one else does this at production scale.',
    comparison: 'CodeRabbit launched limited multi-repo in March 2026. Astra targets cross-service graph analysis.',
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
      'All scanners + AI',
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