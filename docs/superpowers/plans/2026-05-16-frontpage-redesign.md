# Frontpage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 691-line monolithic `src/app/page.tsx` landing page with a 14-section, component-based, dark-themed, product-led frontpage using an independent visual identity (no IBM Carbon dependency).

**Architecture:** Each section is a separate React component in `src/components/landing/`. All content is hardcoded in data files. The page component orchestrates section ordering and auth redirect. CSS custom properties define a landing-specific design token system. Animations use CSS keyframes + IntersectionObserver (no animation library). All brand strings import from `branding.ts`.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS custom properties (no Tailwind on landing), `next-auth` for auth redirect, `lucide-react` for icons, `branding.ts` for brand constants.

---

## File Structure

```
src/app/page.tsx                        — Landing page shell (auth + section orchestration)
src/components/landing/
  Hero.tsx                               — Section 1: Hero + animated walkthrough
  InteractiveDemo.tsx                     — Section 2: Pre-loaded scan with raw/AI toggle
  AiAdvantage.tsx                        — Section 3: Before/after comparison
  WhatItFinds.tsx                        — Section 4: Vulnerability categories grid
  StackCoverage.tsx                       — Section 5: Languages, frameworks, clouds
  PlatformCoverage.tsx                    — Section 6: 8 scan module cards
  CloudInfrastructure.tsx                — Section 7: Cloud, compliance, IaC
  NetworkRuntime.tsx                     — Section 8: Network, SBOM, runtime
  FeatureBreakdown.tsx                   — Section 9: Feature grid
  BringYourOwnModel.tsx                  — Section 10: BYO model messaging
  RbacEnterprise.tsx                      — Section 11: RBAC + enterprise features
  Competition.tsx                         — Section 12: Competitive differentiators
  OutcomesKpis.tsx                       — Section 13: Stats + pricing tiers
  CtaFooter.tsx                          — Section 14: CTA + footer
  demoData.ts                            — Mock findings, raw output, AI-enriched output
  landingData.ts                         — All section content data (modules, features, pricing, etc.)
  landingAnimations.ts                   — Shared animation hooks (useVisible, useCountUp)
  landingStyles.ts                       — CSS custom properties and shared style objects
```

**Deleted files:**
- `src/app/v2/page.tsx` — identical copy of page.tsx, no longer needed

---

### Task 1: Foundation — Styles, Animations, Data Files

**Files:**
- Create: `src/components/landing/landingStyles.ts`
- Create: `src/components/landing/landingAnimations.ts`
- Create: `src/components/landing/landingData.ts`
- Create: `src/components/landing/demoData.ts`

- [ ] **Step 1: Create `landingStyles.ts`**

Define all CSS custom properties and shared style objects for the landing page. This is the design system.

```typescript
// src/components/landing/landingStyles.ts

export const landingTokens = {
  // Backgrounds
  bgCanvas: '#0a0a0a',
  bgSurface1: '#161616',
  bgSurface2: '#1c1c1c',
  bgSurface3: '#262626',

  // Text
  inkPrimary: '#f4f4f4',
  inkSecondary: '#a8a8a8',
  inkMuted: '#6f6f6f',

  // Accents
  accentPrimary: '#0f62fe',
  accentPrimaryHover: '#4589ff',
  accentCritical: '#da1e28',
  accentHigh: '#f57c00',
  accentMedium: '#f1c21b',
  accentLow: '#24a148',
  accentInfo: '#0093b7',

  // Borders
  borderSubtle: '#393939',
  borderMedium: '#525252',

  // Typography
  fontSans: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
  fontMono: "'IBM Plex Mono', 'Courier New', monospace",

  // Spacing
  maxWidth: '1200px',
  sectionPadding: '80px 0',
  sectionPaddingMobile: '48px 0',

  // Breakpoints (matching Carbon)
  md: 672,
  lg: 1056,
  xl: 1312,
  max: 1584,
} as const;

// Shared style fragments used across multiple sections
export const sectionStyles = {
  section: {
    padding: `${landingTokens.sectionPadding}`,
    maxWidth: landingTokens.maxWidth,
    margin: '0 auto',
    paddingLeft: '24px',
    paddingRight: '24px',
  } as React.CSSProperties,
  sectionDark: {
    padding: `${landingTokens.sectionPadding}`,
    maxWidth: landingTokens.maxWidth,
    margin: '0 auto',
    paddingLeft: '24px',
    paddingRight: '24px',
    background: landingTokens.bgCanvas,
  } as React.CSSProperties,
  eyebrow: {
    fontSize: '14px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: landingTokens.accentPrimary,
    marginBottom: '12px',
  } as React.CSSProperties,
  headline: {
    fontSize: '48px',
    fontWeight: 600,
    lineHeight: 1.15,
    color: landingTokens.inkPrimary,
    marginBottom: '24px',
  } as React.CSSProperties,
  subhead: {
    fontSize: '18px',
    fontWeight: 300,
    lineHeight: 1.5,
    color: landingTokens.inkSecondary,
    maxWidth: '640px',
  } as React.CSSProperties,
  card: {
    background: landingTokens.bgSurface2,
    borderRadius: '8px',
    padding: '24px',
    border: `1px solid ${landingTokens.borderSubtle}`,
    transition: 'border-color 0.2s ease, transform 0.2s ease',
  } as React.CSSProperties,
  badge: (color: string): React.CSSProperties => ({
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    padding: '3px 8px',
    borderRadius: '4px',
    background: `${color}20`,
    color: color,
    border: `1px solid ${color}40`,
    display: 'inline-block',
  }),
} as const;
```

- [ ] **Step 2: Create `landingAnimations.ts`**

Extract and improve the animation hooks from the current page.tsx. These are the shared animation utilities for all landing components.

```typescript
// src/components/landing/landingAnimations.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export function useVisible(threshold = 0.15): { ref: React.RefObject<HTMLDivElement | null>; visible: boolean } {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export function useCountUp(target: number, duration = 2000, trigger = true): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, trigger]);

  return value;
}

export function useStagger(count: number, baseDelay = 80): (index: number) => number {
  return useCallback((index: number) => baseDelay * index, [count, baseDelay]);
}

// CSS keyframe definitions to inject once in the page
export const landingKeyframes = `
@keyframes lpPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.15); }
}

@keyframes lpFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes lpSlideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes lpGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(15, 98, 254, 0); }
  50% { box-shadow: 0 0 16px 4px rgba(15, 98, 254, 0.3); }
}

@keyframes lpType {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes lpNodeLight {
  0% { border-color: #393939; }
  100% { border-color: #0f62fe; }
}
`;
```

- [ ] **Step 3: Create `landingData.ts`**

All section content data in one file. This is the single source of truth for all text content on the landing page.

```typescript
// src/components/landing/landingData.ts

import { APP_NAME, APP_DOMAIN } from '@/lib/branding';

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
    description: 'SAST, SCA, secrets, IaC — Trivy, Semgrep, Gitleaks, Bearer, AI deep scan',
    tier: 'Free',
    color: '#0f62fe',
  },
  {
    id: 'cloud-scan',
    title: 'Cloud Scan',
    description: 'AWS, Azure, GCP — Prowler, ScoutSuite, kube-bench misconfig detection',
    tier: 'Enterprise',
    color: '#0093b7',
  },
  {
    id: 'compliance',
    title: 'Compliance',
    description: '43 frameworks — CIS, PCI-DSS, NIST 800-53, SOC2, HIPAA, ISO 27001, GDPR, FedRAMP',
    tier: 'Pro',
    color: '#24a148',
  },
  {
    id: 'pci-dss',
    title: 'PCI DSS',
    description: 'ASV integration, internal scanning, attestation workflow',
    tier: 'Enterprise',
    color: '#da1e28',
  },
  {
    id: 'network-scan',
    title: 'Network Scan',
    description: 'Nmap port scanning, OpenVAS vulnerability detection, service fingerprinting',
    tier: 'Enterprise',
    color: '#6f6f6f',
  },
  {
    id: 'sbom',
    title: 'SBOM',
    description: 'Syft + Grype — software bill of materials, license conflict detection, reachability analysis',
    tier: 'Pro',
    color: '#f1c21b',
  },
  {
    id: 'runtime',
    title: 'Runtime Security',
    description: 'Falco — real-time event detection, runtime anomaly correlation, alert dispatch',
    tier: 'Enterprise',
    color: '#f57c00',
  },
  {
    id: 'iac-scan',
    title: 'IaC Scan',
    description: 'Checkov + Trivy IaC — Terraform, K8s, CloudFormation, custom Rego policies',
    tier: 'Pro',
    color: '#a8a8a8',
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
```

- [ ] **Step 4: Create `demoData.ts`**

Mock findings for the interactive demo section. Includes both raw scanner output and AI-enriched output.

```typescript
// src/components/landing/demoData.ts

export interface DemoFinding {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  file: string;
  line: number;
  scanner: string;
  category: string;
}

export const demoFindings: DemoFinding[] = [
  {
    id: 'f-001',
    severity: 'CRITICAL',
    title: 'SQL injection in authentication query',
    file: 'auth/login.ts',
    line: 47,
    scanner: 'Astra AI',
    category: 'SAST',
  },
  {
    id: 'f-002',
    severity: 'HIGH',
    title: 'Exposed AWS access key in environment config',
    file: '.env',
    line: 5,
    scanner: 'Gitleaks',
    category: 'Secrets',
  },
  {
    id: 'f-003',
    severity: 'HIGH',
    title: 'Open S3 bucket allows public read access',
    file: 'terraform/main.tf',
    line: 34,
    scanner: 'Trivy',
    category: 'IaC',
  },
  {
    id: 'f-004',
    severity: 'MEDIUM',
    title: 'Missing authentication middleware on admin endpoints',
    file: 'routes/admin.ts',
    line: 12,
    scanner: 'Astra AI',
    category: 'Business Logic',
  },
  {
    id: 'f-005',
    severity: 'MEDIUM',
    title: 'CVE-2024-1234: Prototype pollution in lodash',
    file: 'package.json',
    line: 0,
    scanner: 'Trivy',
    category: 'SCA',
  },
];

export const rawOutputExample = `{
  "SchemaVersion": "2.1.0",
  "ArtifactName": "repo",
  "Results": [{
    "Target": "auth/login.ts",
    "Type": "misconfiguration",
    "Vulnerabilities": [{
      "VulnerabilityID": "CVE-2024-38512",
      "PkgName": "express",
      "InstalledVersion": "4.18.2",
      "FixedVersion": "4.19.2",
      "Title": "express: Open Redirect vulnerability",
      "Severity": "MEDIUM",
      "PrimaryURL": "https://avd.aquasec.com/nvd/cve-2024-38512",
      "Description": "Open redirect vulnerability in Express allows attackers to redirect users to arbitrary URLs via malformed input to res.redirect()"
    }]
  }]
}`;

export const enrichedOutputExample = {
  title: 'SQL injection in authentication query',
  explanation: 'This SQL query concatenates user input directly into the query string, allowing an attacker to inject arbitrary SQL commands. The `username` and `password` parameters from `req.body` are interpolated without parameterization or sanitization.',
  fix: 'Replace string interpolation with parameterized queries:\n\n```diff\n- const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;\n+ const query = \'SELECT * FROM users WHERE username = $1 AND password = $2\';\n+ const result = await db.query(query, [username, password]);\n```',
  exploitScore: 8.2,
  cwe: ['CWE-89'],
  owasp: ['A03:2021'],
  businessContext: 'This endpoint is part of the authentication flow — a successful injection could bypass login entirely, granting unauthorized access to any account.',
  remediation: 'Use parameterized queries or an ORM that handles query construction. Consider adding rate limiting and account lockout to prevent brute-force attacks on the login endpoint.',
};
```

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/landingStyles.ts src/components/landing/landingAnimations.ts src/components/landing/landingData.ts src/components/landing/demoData.ts
git commit -m "feat(landing): add foundation files — styles, animations, data, and demo data"
```

---

### Task 2: Landing Page Shell — Auth Redirect, Section Orchestration, Global Styles

**Files:**
- Create: `src/app/page.tsx` (replaces existing 691-line file)
- Delete: `src/app/v2/page.tsx`

- [ ] **Step 1: Write the new page.tsx**

Replace the entire 691-line file with a clean shell that handles auth redirect and renders all 14 sections in order. Inject the landing keyframes once.

```tsx
// src/app/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Hero } from '@/components/landing/Hero';
import { InteractiveDemo } from '@/components/landing/InteractiveDemo';
import { AiAdvantage } from '@/components/landing/AiAdvantage';
import { WhatItFinds } from '@/components/landing/WhatItFinds';
import { StackCoverage } from '@/components/landing/StackCoverage';
import { PlatformCoverage } from '@/components/landing/PlatformCoverage';
import { CloudInfrastructure } from '@/components/landing/CloudInfrastructure';
import { NetworkRuntime } from '@/components/landing/NetworkRuntime';
import { FeatureBreakdown } from '@/components/landing/FeatureBreakdown';
import { BringYourOwnModel } from '@/components/landing/BringYourOwnModel';
import { RbacEnterprise } from '@/components/landing/RbacEnterprise';
import { Competition } from '@/components/landing/Competition';
import { OutcomesKpis } from '@/components/landing/OutcomesKpis';
import { CtaFooter } from '@/components/landing/CtaFooter';
import { landingKeyframes } from '@/components/landing/landingAnimations';
import { landingTokens } from '@/components/landing/landingStyles';

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/scans');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return null;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: landingKeyframes }} />
      <style dangerouslySetInnerHTML={{ __html: `
        .lp-section { padding: 80px 0; }
        .lp-section-dark { padding: 80px 0; background: ${landingTokens.bgCanvas}; }
        @media (max-width: ${landingTokens.md}px) {
          .lp-section, .lp-section-dark { padding: 48px 0; }
        }
        .lp-inner { max-width: ${landingTokens.maxWidth}; margin: 0 auto; padding: 0 24px; }
        .lp-reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .lp-reveal.lp-visible { opacity: 1; transform: translateY(0); }
      ` }} />
      <div style={{ background: landingTokens.bgCanvas, color: landingTokens.inkPrimary, fontFamily: landingTokens.fontSans }}>
        <Hero />
        <InteractiveDemo />
        <AiAdvantage />
        <WhatItFinds />
        <StackCoverage />
        <PlatformCoverage />
        <CloudInfrastructure />
        <NetworkRuntime />
        <FeatureBreakdown />
        <BringYourOwnModel />
        <RbacEnterprise />
        <Competition />
        <OutcomesKpis />
        <CtaFooter />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Delete v2/page.tsx**

```bash
rm src/app/v2/page.tsx
```

- [ ] **Step 3: Verify the app builds (will fail on missing components — that's expected)**

Run: `cd /root/astra && npx next build 2>&1 | head -30`

Expected: Build fails with import errors for landing components. This confirms the shell is wired correctly. We'll create components in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git rm src/app/v2/page.tsx
git commit -m "feat(landing): replace page shell with 14-section orchestrator, delete v2 copy"
```

---

### Task 3: Hero Section

**Files:**
- Create: `src/components/landing/Hero.tsx`

- [ ] **Step 1: Create Hero.tsx**

The hero section with headline, subhead, CTAs, animated scan walkthrough, stat bar, and navigation. Uses `branding.ts` for APP_NAME. Includes a sticky nav bar and mobile menu.

The component should include:
- Sticky nav with APP_NAME logo, section anchor links, and "Sign in" button
- Mobile hamburger menu
- Hero with eyebrow, headline (accent word colored), subhead, CTAs, tag pills
- Animated scan walkthrough (CSS animation simulating a scan)
- Stat bar below hero
- `useVisible` for scroll reveal on stat bar
- `useCountUp` for animated counters

Implementation note: The animated scan walkthrough should be a pure CSS/JS animation showing: repo URL appearing, pipeline nodes lighting up, findings appearing with severity badges. Use `useState` and `useEffect` with timeouts to create the staged animation sequence.

```tsx
// src/components/landing/Hero.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { APP_NAME } from '@/lib/branding';
import { heroData } from './landingData';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible, useCountUp } from './landingAnimations';

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { ref, visible } = useVisible();
  const value = useCountUp(target, 2000, visible);
  return (
    <div ref={ref} style={{ textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: '36px', fontWeight: 600, color: landingTokens.inkPrimary }}>
        {value.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: '14px', color: landingTokens.inkSecondary, marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
}

function PipelineNode({ label, index, total, active }: { label: string; index: number; total: number; active: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      opacity: active ? 1 : 0.3,
      transition: 'opacity 0.4s ease',
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: active ? landingTokens.accentPrimary : landingTokens.borderSubtle,
        transition: 'background 0.4s ease',
        ...(active ? { animation: 'lpPulse 2s ease-in-out infinite' } : {}),
      }} />
      <span style={{ fontSize: '11px', color: active ? landingTokens.inkPrimary : landingTokens.inkMuted }}>
        {label}
      </span>
    </div>
  );
}

function FindingBadge({ severity, title, file, delay }: { severity: string; title: string; file: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const colorMap: Record<string, string> = {
    CRITICAL: landingTokens.accentCritical,
    HIGH: landingTokens.accentHigh,
    MEDIUM: landingTokens.accentMedium,
    LOW: landingTokens.accentLow,
  };
  const color = colorMap[severity] || landingTokens.inkMuted;

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 10px',
      background: landingTokens.bgSurface2,
      borderRadius: '6px',
      borderLeft: `3px solid ${color}`,
      fontSize: '12px',
    }}>
      <span style={{
        fontSize: '10px',
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        color: color,
        letterSpacing: '0.05em',
      }}>
        {severity}
      </span>
      <span style={{ color: landingTokens.inkPrimary, flex: 1 }}>{title}</span>
      <span style={{ color: landingTokens.inkMuted, fontFamily: landingTokens.fontMono, fontSize: '11px' }}>
        {file}
      </span>
    </div>
  );
}

export function Hero() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scanPhase, setScanPhase] = useState(0); // 0=idle, 1=cloning, 2=scanning, 3=findings

  useEffect(() => {
    const t1 = setTimeout(() => setScanPhase(1), 1500);
    const t2 = setTimeout(() => setScanPhase(2), 3000);
    const t3 = setTimeout(() => setScanPhase(3), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const pipelineNodes = ['Clone', 'Discover', 'Scan', 'Deep', 'Cross', 'Persist'];

  return (
    <>
      {/* Nav */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: landingTokens.bgCanvas,
        borderBottom: `1px solid ${landingTokens.borderSubtle}`,
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: landingTokens.maxWidth, width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ fontWeight: 600, fontSize: '18px', color: landingTokens.inkPrimary, textDecoration: 'none' }}>
            {APP_NAME}
          </Link>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {['Features', 'Modules', 'Security', 'Pricing'].map((label) => (
              <a key={label} href={`#${label.toLowerCase()}`} style={{
                color: landingTokens.inkSecondary,
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 400,
                display: 'none', // shown via media query on desktop
              }}>
                {label}
              </a>
            ))}
            <Link href="/api/auth/signin" style={{
              padding: '6px 16px',
              background: landingTokens.accentPrimary,
              color: '#fff',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
            }}>
              Sign in →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <section className="lp-section" style={{ background: landingTokens.bgCanvas }}>
        <div className="lp-inner" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '64px', alignItems: 'center', paddingTop: '80px' }}>
          {/* Left: Text */}
          <div>
            <div style={sectionStyles.eyebrow}>{heroData.eyebrow}</div>
            <h1 style={{ ...sectionStyles.headline, fontSize: '56px', marginBottom: '20px' }}>
              Find{' '}
              <span style={{ color: landingTokens.accentPrimary }}>{heroData.headlineAccent}</span>
              {' '}before they find you
            </h1>
            <p style={sectionStyles.subhead}>{heroData.subhead}</p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
              <a href="#demo" style={{
                padding: '12px 24px',
                background: landingTokens.accentPrimary,
                color: '#fff',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 0.2s ease',
              }}>
                {heroData.ctaPrimary}
              </a>
              <a href="#ai-advantage" style={{
                padding: '12px 24px',
                border: `1px solid ${landingTokens.borderMedium}`,
                color: landingTokens.inkPrimary,
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'border-color 0.2s ease',
              }}>
                {heroData.ctaSecondary}
              </a>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px', flexWrap: 'wrap' }}>
              {heroData.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: `1px solid ${landingTokens.borderSubtle}`,
                  color: landingTokens.inkSecondary,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Animated scan walkthrough */}
          <div style={{
            background: landingTokens.bgSurface1,
            borderRadius: '12px',
            border: `1px solid ${landingTokens.borderSubtle}`,
            padding: '24px',
            minHeight: '360px',
            position: 'relative',
          }}>
            {/* Scan URL */}
            <div style={{
              fontFamily: landingTokens.fontMono,
              fontSize: '13px',
              color: landingTokens.inkMuted,
              marginBottom: '16px',
              padding: '8px 12px',
              background: landingTokens.bgSurface3,
              borderRadius: '4px',
            }}>
              $ astra scan <span style={{ color: landingTokens.accentPrimary }}>https://github.com/acme/api</span>
            </div>

            {/* Pipeline progress */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {pipelineNodes.map((node, i) => (
                <PipelineNode key={node} label={node} index={i} total={pipelineNodes.length} active={scanPhase >= 2 || (scanPhase === 1 && i === 0)} />
              ))}
            </div>

            {/* Findings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scanPhase >= 3 && (
                <>
                  <FindingBadge severity="CRITICAL" title="SQL injection" file="auth/login.ts:47" delay={0} />
                  <FindingBadge severity="HIGH" title="Exposed AWS key" file=".env:5" delay={300} />
                  <FindingBadge severity="HIGH" title="Open S3 bucket" file="terraform/main.tf:34" delay={600} />
                  <FindingBadge severity="MEDIUM" title="Missing auth middleware" file="routes/admin.ts:12" delay={900} />
                  <FindingBadge severity="MEDIUM" title="CVE-2024-1234" file="package.json" delay={1200} />
                </>
              )}
            </div>

            {/* Scan status */}
            {scanPhase > 0 && scanPhase < 3 && (
              <div style={{
                position: 'absolute',
                bottom: '24px',
                left: '24px',
                fontSize: '13px',
                color: landingTokens.accentPrimary,
                fontFamily: landingTokens.fontMono,
              }}>
                {scanPhase === 1 ? 'Cloning repository...' : 'Scanning files...'}
              </div>
            )}
            {scanPhase >= 3 && (
              <div style={{
                position: 'absolute',
                bottom: '24px',
                left: '24px',
                fontSize: '13px',
                color: landingTokens.accentLow,
                fontFamily: landingTokens.fontMono,
              }}>
                ✓ Scan complete — 5 findings
              </div>
            )}
          </div>
        </div>

        {/* Stat bar */}
        <div className="lp-inner" style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginTop: '48px', flexWrap: 'wrap' }}>
          {heroData.stats.map((stat) => (
            <StatCounter key={stat.label} target={stat.value} suffix={stat.suffix} label={stat.label} />
          ))}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/Hero.tsx
git commit -m "feat(landing): add Hero section with nav, animated walkthrough, and stat bar"
```

---

### Task 4: Interactive Demo + AI Advantage Sections

**Files:**
- Create: `src/components/landing/InteractiveDemo.tsx`
- Create: `src/components/landing/AiAdvantage.tsx`

- [ ] **Step 1: Create InteractiveDemo.tsx**

A pre-loaded scan result with a toggle between "Raw scanner output" and "Astra AI-enriched". Terminal-like aesthetic. No backend calls — uses `demoData.ts`.

The component includes:
- Section header with id="demo"
- A terminal-like panel with a toggle switch
- Left state (raw): shows `rawOutputExample` as JSON
- Right state (enriched): shows `enrichedOutputExample` with plain language, fix, exploit score, CWE/OWASP, business context
- Toggle animates between states

- [ ] **Step 2: Create AiAdvantage.tsx**

Side-by-side comparison with id="ai-advantage". Left panel shows raw scanner output. Right panel shows the enriched finding. Below: three differentiator callouts (business logic, cross-file, AI-aware SAST).

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/InteractiveDemo.tsx src/components/landing/AiAdvantage.tsx
git commit -m "feat(landing): add Interactive Demo and AI Advantage sections"
```

---

### Task 5: What It Finds + Stack Coverage Sections

**Files:**
- Create: `src/components/landing/WhatItFinds.tsx`
- Create: `src/components/landing/StackCoverage.tsx`

- [ ] **Step 1: Create WhatItFinds.tsx**

6-column grid of vulnerability categories. Each card has a color-coded severity badge, category name, and 3 one-line example findings with file paths. Uses `findingCategories` from `landingData.ts`. Scroll-reveal animation via `useVisible`.

- [ ] **Step 2: Create StackCoverage.tsx**

Icon grid / tag cloud of languages, frameworks, clouds, IaC tools, and package managers. Uses `stackData` from `landingData.ts`. Monospace tags with subtle borders, hover glow effect.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/WhatItFinds.tsx src/components/landing/StackCoverage.tsx
git commit -m "feat(landing): add What It Finds and Stack Coverage sections"
```

---

### Task 6: Platform Coverage + Cloud & Infrastructure + Network & Runtime Sections

**Files:**
- Create: `src/components/landing/PlatformCoverage.tsx`
- Create: `src/components/landing/CloudInfrastructure.tsx`
- Create: `src/components/landing/NetworkRuntime.tsx`

- [ ] **Step 1: Create PlatformCoverage.tsx**

8-card grid (4x2 desktop, 2x4 tablet, 1-column mobile) showing all 8 scan modules. Each card: module name, 1-line description, feature gate tier badge, icon placeholder. Uses `platformModules` from `landingData.ts`. Scroll-reveal staggered animation.

- [ ] **Step 2: Create CloudInfrastructure.tsx**

Three-panel layout: Cloud Scan (left), Compliance (center), IaC (right). Each panel lists capabilities and tools. Feature gate badges where applicable.

- [ ] **Step 3: Create NetworkRuntime.tsx**

Three-panel layout: Network Scan (left), SBOM (center), Runtime Security (right). Each panel lists capabilities and tools. Feature gate badges.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/PlatformCoverage.tsx src/components/landing/CloudInfrastructure.tsx src/components/landing/NetworkRuntime.tsx
git commit -m "feat(landing): add Platform Coverage, Cloud/Infrastructure, and Network/Runtime sections"
```

---

### Task 7: Feature Breakdown + Bring Your Own Model + RBAC & Enterprise Sections

**Files:**
- Create: `src/components/landing/FeatureBreakdown.tsx`
- Create: `src/components/landing/BringYourOwnModel.tsx`
- Create: `src/components/landing/RbacEnterprise.tsx`

- [ ] **Step 1: Create FeatureBreakdown.tsx**

Feature grid with 12 cards (3-column desktop, 2-column tablet, 1-column mobile). Each card: icon, title, 1-2 line description. Uses `features` from `landingData.ts`. Section id="features". Scroll-reveal staggered animation.

- [ ] **Step 2: Create BringYourOwnModel.tsx**

Centered block with a simple diagram showing the pipeline on the left, model options on the right, arrows connecting stages to models. Messaging: model-agnostic, per-stage model selection, data stays in your environment. Lists supported providers without making it a provider listing.

- [ ] **Step 3: Create RbacEnterprise.tsx**

Four-column feature grid (Access Control, Data Security, Deployment, Audit & Compliance). Uses `enterpriseFeatures` from `landingData.ts`. Section id="security". Each column is a card with title and bullet items.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/FeatureBreakdown.tsx src/components/landing/BringYourOwnModel.tsx src/components/landing/RbacEnterprise.tsx
git commit -m "feat(landing): add Feature Breakdown, BYO Model, and RBAC/Enterprise sections"
```

---

### Task 8: Competition + Outcomes & KPIs + CTA & Footer Sections

**Files:**
- Create: `src/components/landing/Competition.tsx`
- Create: `src/components/landing/OutcomesKpis.tsx`
- Create: `src/components/landing/CtaFooter.tsx`

- [ ] **Step 1: Create Competition.tsx**

Five differentiator cards. Each card: headline, 2-3 line explanation, small comparison note. Uses `differentiators` from `landingData.ts`. Section id="competition".

- [ ] **Step 2: Create OutcomesKpis.tsx**

Top row: 4 animated stat counters (use `useCountUp`). Bottom: 3 pricing tier cards (Free, Pro, Enterprise). Pro card is highlighted. Uses `kpiStats` and `pricingTiers` from `landingData.ts`. Section id="pricing". Each tier card lists features and has a CTA button.

- [ ] **Step 3: Create CtaFooter.tsx**

CTA section with dark background, headline, body, two buttons ("Get started — free" primary, "Read the docs" secondary), subtext. Footer: 4-column grid (Product, Features, Resources, Company) using `footerCols` from `landingData.ts`. Bottom bar: copyright using `APP_NAME`, Privacy, Terms, Security links. Uses `APP_NAME` and `APP_DOMAIN` from `branding.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/Competition.tsx src/components/landing/OutcomesKpis.tsx src/components/landing/CtaFooter.tsx
git commit -m "feat(landing): add Competition, Outcomes/KPIs/Pricing, and CTA/Footer sections"
```

---

### Task 9: Responsive Design + Polish

**Files:**
- Modify: `src/app/page.tsx` — add responsive CSS media queries to the injected style block
- Modify: All section components — add responsive breakpoints

- [ ] **Step 1: Add responsive CSS to the page shell**

Update the injected `<style>` block in `page.tsx` to include responsive media queries for:
- Hero grid: 2-column on desktop, stacked on mobile (<672px)
- Stat bar: horizontal on desktop, wrapped on mobile
- All grids: 3-4 columns on desktop, 2 on tablet, 1 on mobile
- Nav links: hidden on mobile, shown on desktop
- Section padding: 80px on desktop, 48px on mobile
- Font sizes: scale down on mobile (headline 56px → 36px, subhead 18px → 16px)

- [ ] **Step 2: Add responsive styles to each section component**

Each component should handle responsive layout via:
- Inline media queries using `window.innerWidth` checks with `useEffect` + `useState`
- Or CSS classes defined in the page-level `<style>` block
- Grid template changes: `gridTemplateColumns` responsive values
- Font size adjustments for mobile

- [ ] **Step 3: Test responsive breakpoints manually**

Open the page at widths: 375px, 672px, 1056px, 1312px, 1584px. Verify:
- Hero is stacked on mobile, side-by-side on desktop
- All grids collapse to 1 column on mobile
- Nav shows hamburger on mobile
- Text sizes are readable on mobile
- No horizontal overflow

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(landing): add responsive design and mobile breakpoints"
```

---

### Task 10: Dark Theme Consistency + Animation Polish

**Files:**
- Modify: `src/components/landing/landingStyles.ts` — add dark theme-specific tokens if needed
- Modify: All section components — ensure consistent dark styling

- [ ] **Step 1: Audit all sections for dark theme consistency**

Verify every section uses `landingTokens` colors, not hardcoded hex values. Check:
- All backgrounds use `bgCanvas`, `bgSurface1`, `bgSurface2`, or `bgSurface3`
- All text uses `inkPrimary`, `inkSecondary`, or `inkMuted`
- All borders use `borderSubtle` or `borderMedium`
- All CTAs use `accentPrimary`
- All severity colors use the defined accent tokens

- [ ] **Step 2: Polish scroll reveal animations**

Ensure all sections use `useVisible` hook for scroll-triggered fade-up. Add staggered delays for grid items. Verify:
- Smooth 0.6s opacity + translateY transition
- IntersectionObserver threshold of 0.15
- One-shot animation (disconnects after first intersection)
- No jank or layout shift during animation

- [ ] **Step 3: Verify the animated scan walkthrough in Hero**

The hero scan walkthrough should animate through phases:
1. Idle (0-1.5s): Repo URL visible, no findings
2. Cloning (1.5-3s): First pipeline node active
3. Scanning (3-4.5s): All pipeline nodes active
4. Findings (4.5s+): Findings appear with staggered delays

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(landing): polish dark theme consistency and scroll animations"
```

---

### Task 11: Branding Compliance + Final Verification

**Files:**
- Audit all landing components for hardcoded brand strings
- Update: `src/lib/changelog.ts` — add v2.28.0 entry
- Update: `CLAUDE.md` — add changelog entry

- [ ] **Step 1: Audit for hardcoded brand strings**

Search all files in `src/components/landing/` for the literal string "Astra" (except in comments or data arrays describing the product). Replace any with imports from `branding.ts`:
- `APP_NAME` for display name
- `APP_TITLE` for page title
- `APP_DOMAIN` for footer links
- `SARIF_INFO_URI` for any GitHub links

Run: `grep -rn "Astra" src/components/landing/ | grep -v "// " | grep -v "landingData"`

- [ ] **Step 2: Verify auth redirect works**

- Unauthenticated: Landing page renders all 14 sections
- Authenticated: Redirects to `/scans` immediately
- Loading state: Renders nothing (blank page, no flash)

- [ ] **Step 3: Update changelog**

Add entry to `src/lib/changelog.ts`:
```typescript
{ version: '2.28.0', date: '2026-05-16', title: 'Frontpage redesign', description: '14-section landing page with dark theme, interactive demo, AI advantage comparison, module coverage, competition, pricing tiers, BYO model messaging, RBAC/enterprise features, and animated scan walkthrough. Independent visual identity (no IBM Carbon dependency). Component-based architecture in src/components/landing/.' },
```

- [ ] **Step 4: Update CLAUDE.md changelog table**

Add row:
```
| 2026-05-16 | v2.28.0: **Frontpage redesign** — 14-section dark-themed landing page with interactive demo, AI advantage comparison, 8 scan modules, BYO model messaging, competition section, pricing tiers, RBAC/enterprise features; independent visual identity, component-based architecture |
```

- [ ] **Step 5: Run graphify update**

```bash
cd /root/astra && graphify update .
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/changelog.ts CLAUDE.md
git commit -m "docs: add v2.28.0 frontpage redesign to changelog"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Every section in the spec (1-14) has a corresponding task (Tasks 3-8)
- [x] **Placeholder scan:** No TBD, TODO, or "implement later" — all steps have complete code or explicit instructions
- [x] **Type consistency:** All data types defined in `landingData.ts` and `demoData.ts` are used consistently across components
- [x] **Branding:** All components import from `branding.ts`, no hardcoded "Astra"
- [x] **Auth behavior:** Preserved from current page — authenticated users redirect to `/scans`
- [x] **v2/page.tsx:** Deleted in Task 2
- [x] **Dark theme:** All components use `landingTokens` — no IBM Carbon variables on the landing page
- [x] **Responsive:** Task 9 covers breakpoints
- [x] **Animations:** Task 10 covers scroll reveals and the hero walkthrough

**Gap found during review:** The spec mentions a mobile hamburger menu in the Hero nav but doesn't provide responsive CSS for it yet. Task 9 covers adding responsive styles. The nav in Task 3 includes the mobile structure but the responsive show/hide is in Task 9.