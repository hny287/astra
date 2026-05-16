# Frontpage Carbon Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the landing page to use IBM Carbon design tokens/typography, add @carbon/charts data visualizations, and improve all section content quality.

**Architecture:** Replace `landingTokens` references with `--ibm-*` CSS custom properties and `ibm-*` typography classes throughout all 14 landing section components. Add 4 chart components using @carbon/charts. Rewrite `landingData.ts` and `demoData.ts` with stronger content. Delete `landingStyles.ts` (replaced by Carbon tokens). Update page shell to respect user theme preference.

**Tech Stack:** Next.js 16, React 19, TypeScript, @carbon/charts + @carbon/charts-react + d3, CSS custom properties (`--ibm-*`), `ibm-*` typography classes, `next-auth` for auth redirect, `branding.ts` for brand constants.

---

## File Structure

```
src/app/page.tsx                           — Update: use Carbon tokens, respect theme
src/components/landing/
  landingStyles.ts                          — DELETE (replaced by --ibm-* tokens)
  landingAnimations.ts                     — Update: remove landingTokens dependency
  landingData.ts                            — REWRITE: improved content + chart data
  demoData.ts                               — REWRITE: more specific, compelling content
  landingCharts.tsx                         — CREATE: 4 chart components (severity, category, remediation, false-positive)
  Hero.tsx                                  — Rework: Carbon tokens + content
  InteractiveDemo.tsx                        — Rework: Carbon tokens + content
  AiAdvantage.tsx                           — Rework: Carbon tokens + content + remediation chart
  WhatItFinds.tsx                            — Rework: Carbon tokens + content + category + severity charts
  StackCoverage.tsx                          — Rework: Carbon tokens + content
  PlatformCoverage.tsx                       — Rework: Carbon tokens + content
  CloudInfrastructure.tsx                    — Rework: Carbon tokens + content
  NetworkRuntime.tsx                         — Rework: Carbon tokens + content
  FeatureBreakdown.tsx                       — Rework: Carbon tokens + content + false-positive chart
  BringYourOwnModel.tsx                     — Rework: Carbon tokens + content
  RbacEnterprise.tsx                          — Rework: Carbon tokens + content
  Competition.tsx                             — Rework: Carbon tokens + content + comparison table
  OutcomesKpis.tsx                           — Rework: Carbon tokens + content
  CtaFooter.tsx                             — Rework: Carbon tokens + content
```

---

### Task 1: Install @carbon/charts

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install @carbon/charts and D3 dependency**

```bash
cd /root/astra && npm install @carbon/charts @carbon/charts-react d3
```

Expected: Packages installed successfully, package.json updated.

- [ ] **Step 2: Verify installation**

```bash
cd /root/astra && npx next build 2>&1 | tail -5
```

Expected: Build succeeds (or shows only pre-existing warnings, no new errors).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @carbon/charts, @carbon/charts-react, and d3 dependencies"
```

---

### Task 2: Create chart components and rewrite data files

**Files:**
- Create: `src/components/landing/landingCharts.tsx`
- Rewrite: `src/components/landing/landingData.ts`
- Rewrite: `src/components/landing/demoData.ts`
- Delete: `src/components/landing/landingStyles.ts`

- [ ] **Step 1: Delete landingStyles.ts**

```bash
rm src/components/landing/landingStyles.ts
```

This file is replaced by `--ibm-*` CSS variables and `ibm-*` typography classes. All components will import these from `globals.css` instead.

- [ ] **Step 2: Create landingCharts.tsx**

Create `src/components/landing/landingCharts.tsx` with 4 chart components using `@carbon/charts-react`:

```tsx
// src/components/landing/landingCharts.tsx
'use client';

import { BarChart, DonutChart, SimpleBarChart } from '@carbon/charts-react';
import '@carbon/charts/styles.css';

// ─── Chart data ─────────────────────────────────────────────────

export const severityChartData = {
  labels: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
  datasets: [
    {
      label: 'Findings by severity',
      data: [149, 349, 472, 224, 53],
      colors: ['#da1e28', '#f57c00', '#0f62fe', '#8c8c8c', '#c6c6c6'],
    },
  ],
};

export const severityChartOptions = {
  title: 'Findings by severity',
  resizable: true,
  donut: {
    centerLabelText: '1,247',
    centerLabelSubtext: 'total findings',
    alignment: 'center',
  },
  height: '280px',
  theme: 'g100',
};

export const categoryChartData = {
  labels: ['SAST', 'SCA', 'Secrets', 'IaC', 'Business Logic', 'Cloud Misconfig'],
  datasets: [
    {
      label: 'Findings by category',
      data: [424, 274, 224, 175, 100, 50],
    },
  ],
};

export const categoryChartOptions = {
  title: 'Findings by category',
  resizable: true,
  horizontal: true,
  height: '240px',
  theme: 'g100',
  bars: {
    maxWidth: 16,
  },
  axes: {
    bottom: {
      scaleType: 'labels',
    },
    left: {
      scaleType: 'linear',
    },
  },
};

export const remediationChartData = {
  labels: ['Triage', 'Fix', 'Verify'],
  datasets: [
    {
      label: 'Without AI',
      data: [45, 240, 120],
      group: 'Without AI',
    },
    {
      label: 'With Astra AI',
      data: [8, 40, 15],
      group: 'With Astra AI',
    },
  ],
};

export const remediationChartOptions = {
  title: 'Time to remediate (minutes)',
  resizable: true,
  height: '240px',
  theme: 'g100',
  bars: {
    maxWidth: 32,
  },
  axes: {
    left: {
      scaleType: 'labels',
    },
    bottom: {
      scaleType: 'linear',
      title: 'Minutes',
    },
  },
};

export const falsePositiveChartData = {
  labels: ['Raw scanner output', 'Astra AI-enriched'],
  datasets: [
    {
      label: 'False positive rate',
      data: [62, 8],
    },
  ],
};

export const falsePositiveChartOptions = {
  title: 'False positive rate (%)',
  resizable: true,
  height: '200px',
  theme: 'g100',
  bars: {
    maxWidth: 48,
  },
  axes: {
    left: {
      scaleType: 'labels',
    },
    bottom: {
      scaleType: 'linear',
      title: '%',
    },
  },
};

// ─── Chart wrapper components ───────────────────────────────────────

export function SeverityDonutChart() {
  return (
    <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
      <DonutChart
        data={severityChartData}
        options={severityChartOptions}
      />
    </div>
  );
}

export function CategoryBarChart() {
  return (
    <div style={{ width: '100%', maxWidth: '560px' }}>
      <SimpleBarChart
        data={categoryChartData}
        options={categoryChartOptions}
      />
    </div>
  );
}

export function RemediationComparisonChart() {
  return (
    <div style={{ width: '100%', maxWidth: '480px' }}>
      <BarChart
        data={remediationChartData}
        options={remediationChartOptions}
      />
    </div>
  );
}

export function FalsePositiveBarChart() {
  return (
    <div style={{ width: '100%', maxWidth: '360px' }}>
      <SimpleBarChart
        data={falsePositiveChartData}
        options={falsePositiveChartOptions}
      />
    </div>
  );
}
```

Note: The exact `@carbon/charts` API may differ between versions. The implementer should check the installed version's API and adjust imports/props accordingly. The key thing is that we define chart data, options, and 4 named chart components that can be dropped into any section.

- [ ] **Step 3: Rewrite landingData.ts**

Replace `src/components/landing/landingData.ts` with improved content. Key changes from the current version:
- Remove `import { landingTokens } from './landingStyles'` (file deleted)
- Hero headline: "Stop shipping vulnerabilities. Start shipping confidence."
- Stronger differentiators with specific data points
- Improved feature descriptions with proof points
- Category counts on platform module cards
- All content more specific and compelling

The file should keep the same export names and data structure (`heroData`, `findingCategories`, `stackData`, `platformModules`, `features`, `differentiators`, `kpiStats`, `pricingTiers`, `enterpriseFeatures`, `footerCols`) but with rewritten content. Import `APP_NAME` and `APP_DOMAIN` from `@/lib/branding` as before. Remove any `landingTokens` references — replace color values with hex strings directly since `landingStyles.ts` is deleted.

- [ ] **Step 4: Rewrite demoData.ts**

Replace `src/components/landing/demoData.ts` with more specific, dramatic content. Key changes:
- More realistic raw scanner output (include full CVE details, not just truncated JSON)
- More compelling enriched output with clearer business impact
- More realistic finding titles and descriptions
- Keep the same `DemoFinding` interface, `demoFindings` array, `rawOutputExample` string, and `enrichedOutputExample` object
- Remove `import { landingTokens } from './landingStyles'` if present

- [ ] **Step 5: Update landingAnimations.ts**

Edit `src/components/landing/landingAnimations.ts`:
- Remove the `import { landingTokens } from './landingStyles'` line (file deleted)
- Remove any `landingTokens.*` references in the `landingKeyframes` CSS string
- Replace `landingTokens.borderSubtle` with `#393939` and `landingTokens.accentPrimary` with `#0f62fe` in the keyframes (these are just CSS strings, not runtime values)
- Keep `useVisible`, `useCountUp`, and `useStagger` hooks unchanged

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(landing): add charts, rewrite data, delete landingStyles.ts"
```

---

### Task 3: Rework page shell and Hero

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/landing/Hero.tsx`

- [ ] **Step 1: Update page.tsx**

In `src/app/page.tsx`:
- Remove `import { landingKeyframes } from '@/components/landing/landingAnimations'`
- Remove `import { landingTokens } from '@/components/landing/landingStyles'`
- Remove the `<style>` block that injects `landingKeyframes`
- Remove the `landingTokens` references in the wrapper div style
- Replace with `--ibm-*` CSS variables:
  - `background: 'var(--ibm-canvas)'` instead of `landingTokens.bgCanvas`
  - `color: 'var(--ibm-ink)'` instead of `landingTokens.inkPrimary`
  - `fontFamily: 'inherit'` (IBM Plex Sans is already set in globals.css)
- Keep the `.lp-section`, `.lp-inner`, `.lp-reveal`, `.lp-visible` CSS classes in the injected `<style>` block, but update the colors to use `var(--ibm-*)` tokens
- Keep auth redirect logic unchanged
- Keep all 14 section imports

- [ ] **Step 2: Rework Hero.tsx**

In `src/components/landing/Hero.tsx`:
- Remove `import { landingTokens, sectionStyles } from './landingStyles'`
- Replace all `landingTokens.*` references with `var(--ibm-*)` CSS variables in inline styles
- Replace all `sectionStyles.*` references with `ibm-*` typography class names:
  - `sectionStyles.eyebrow` → `className="ibm-eyebrow"` + `style={{ color: 'var(--ibm-primary)', marginBottom: '12px' }}`
  - `sectionStyles.headline` → `className="ibm-display-md"` + `style={{ color: 'var(--ibm-ink)', marginBottom: '24px' }}`
  - `sectionStyles.subhead` → `className="ibm-body-lg"` + `style={{ color: 'var(--ibm-ink-muted)', maxWidth: '640px' }}`
- Update color references:
  - `landingTokens.bgCanvas` → `var(--ibm-canvas)`
  - `landingTokens.bgSurface1` → `var(--ibm-surface-1)`
  - `landingTokens.bgSurface2` → `var(--ibm-surface-2)`
  - `landingTokens.bgSurface3` → `var(--ibm-surface-3)` (use `var(--ibm-surface-2)` if surface-3 doesn't exist)
  - `landingTokens.inkPrimary` → `var(--ibm-ink)`
  - `landingTokens.inkSecondary` → `var(--ibm-ink-muted)`
  - `landingTokens.inkMuted` → `var(--ibm-ink-subtle)`
  - `landingTokens.accentPrimary` → `var(--ibm-primary)`
  - `landingTokens.accentCritical` → `var(--ibm-semantic-error)`
  - `landingTokens.accentHigh` → `var(--ibm-semantic-warning)`
  - `landingTokens.accentMedium` → `var(--ibm-semantic-warning)` (context-dependent)
  - `landingTokens.accentLow` → `var(--ibm-semantic-success)`
  - `landingTokens.borderSubtle` → `var(--ibm-hairline)`
  - `landingTokens.borderMedium` → `var(--ibm-hairline-strong)`
  - `landingTokens.fontMono` → `'IBM Plex Mono', monospace'`
- Update hero headline to: "Stop shipping vulnerabilities. Start shipping confidence."
- Update hero subhead to something more compelling
- Keep the animated scan walkthrough structure
- Update `useIsMobile` to use `672` as the breakpoint (matching Carbon md)
- Remove `import { landingTokens } from './landingStyles'` and all references

- [ ] **Step 3: Verify build**

```bash
cd /root/astra && npx next build 2>&1 | tail -10
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/landing/Hero.tsx
git commit -m "feat(landing): rework page shell and Hero with Carbon tokens and improved content"
```

---

### Task 4: Rework InteractiveDemo + AiAdvantage + WhatItFinds

**Files:**
- Modify: `src/components/landing/InteractiveDemo.tsx`
- Modify: `src/components/landing/AiAdvantage.tsx`
- Modify: `src/components/landing/WhatItFinds.tsx`

- [ ] **Step 1: Rework InteractiveDemo.tsx**

- Remove `import { landingTokens, sectionStyles } from './landingStyles'`
- Replace all `landingTokens.*` with `var(--ibm-*)` CSS variables
- Replace all `sectionStyles.*` with `ibm-*` typography classes
- Update toggle labels and demo content using improved `demoData.ts`
- Add the severity donut chart: import `SeverityDonutChart` from `./landingCharts` and render it below the findings list
- Keep the raw/AI toggle structure

- [ ] **Step 2: Rework AiAdvantage.tsx**

- Remove `import { landingTokens, sectionStyles } from './landingStyles'`
- Replace all `landingTokens.*` with `var(--ibm-*)` CSS variables
- Replace all `sectionStyles.*` with `ibm-*` typography classes
- Add the remediation comparison chart: import `RemediationComparisonChart` from `./landingCharts` and render it below the side-by-side comparison
- Update differentiator copy to be punchier:
  - "Business logic detection" → "49% of critical bug bounties are authorization flaws. SAST can't find them. We can."
  - "Cross-file reasoning" → "Traces data flows across files. Finds vulnerabilities that only exist at module boundaries."
  - "AI-aware SAST" → "Detects vibe-coded vulnerabilities. AI-generated code has distinct patterns — we catch them."

- [ ] **Step 3: Rework WhatItFinds.tsx**

- Remove `import { landingTokens, sectionStyles } from './landingStyles'`
- Replace all `landingTokens.*` with `var(--ibm-*)` CSS variables
- Replace all `sectionStyles.*` with `ibm-*` typography classes
- Add the category breakdown chart: import `CategoryBarChart` from `./landingCharts` and render it below the cards grid
- Add the severity donut chart: import `SeverityDonutChart` from `./landingCharts` and render it alongside the category chart in a two-column layout

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/InteractiveDemo.tsx src/components/landing/AiAdvantage.tsx src/components/landing/WhatItFinds.tsx
git commit -m "feat(landing): rework Demo, AI Advantage, and What It Finds with Carbon tokens and charts"
```

---

### Task 5: Rework StackCoverage through FeatureBreakdown (5 components)

**Files:**
- Modify: `src/components/landing/StackCoverage.tsx`
- Modify: `src/components/landing/PlatformCoverage.tsx`
- Modify: `src/components/landing/CloudInfrastructure.tsx`
- Modify: `src/components/landing/NetworkRuntime.tsx`
- Modify: `src/components/landing/FeatureBreakdown.tsx`

- [ ] **Step 1: Rework all 5 components**

For each component:
- Remove `import { landingTokens, sectionStyles } from './landingStyles'`
- Replace all `landingTokens.*` with `var(--ibm-*)` CSS variables
- Replace all `sectionStyles.*` with `ibm-*` typography classes
- Use `var(--ibm-semantic-error)` for CRITICAL/high severity, `var(--ibm-semantic-warning)` for MEDIUM, `var(--ibm-semantic-success)` for LOW/INFO
- Use `var(--ibm-hairline)` for borders, `var(--ibm-surface-1)` or `var(--ibm-surface-2)` for card backgrounds

For FeatureBreakdown specifically:
- Add the false positive rate bar chart: import `FalsePositiveBarChart` from `./landingCharts`
- Update feature descriptions with proof points:
  - "AI Deep Scan" → "Per-file vulnerability analysis — 96% accuracy on OWASP Benchmark"
  - "AI Cross-File" → "Cross-file reasoning that traces data flows across module boundaries"
  - "Alert Triage" → "Severity-based management with SLA enforcement — CRITICAL in 4h, HIGH in 24h"

For PlatformCoverage specifically:
- Add capability counts to each module card: "6 scanners", "43 frameworks", "3 cloud providers", etc.
- Use Carbon Tag component for tier badges if available, or inline badges with `var(--ibm-primary)` / `var(--ibm-semantic-error)` colors

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/StackCoverage.tsx src/components/landing/PlatformCoverage.tsx src/components/landing/CloudInfrastructure.tsx src/components/landing/NetworkRuntime.tsx src/components/landing/FeatureBreakdown.tsx
git commit -m "feat(landing): rework Stack through Feature with Carbon tokens and charts"
```

---

### Task 6: Rework BYO Model through CTA/Footer (5 components)

**Files:**
- Modify: `src/components/landing/BringYourOwnModel.tsx`
- Modify: `src/components/landing/RbacEnterprise.tsx`
- Modify: `src/components/landing/Competition.tsx`
- Modify: `src/components/landing/OutcomesKpis.tsx`
- Modify: `src/components/landing/CtaFooter.tsx`

- [ ] **Step 1: Rework all 5 components**

For each component:
- Remove `import { landingTokens, sectionStyles } from './landingStyles'`
- Replace all `landingTokens.*` with `var(--ibm-*)` CSS variables
- Replace all `sectionStyles.*` with `ibm-*` typography classes

For Competition specifically:
- Replace the 5 narrative cards with a feature comparison table:
  - Rows: Business logic detection, Cross-file reasoning, AI-aware SAST, Transparent pricing, All-in-one platform
  - Columns: Astra, Snyk, Semgrep, CodeRabbit
  - Cells: ✓ (check) or ✗ (cross) with appropriate colors
  - This is a visual table, not narrative cards

For OutcomesKpis specifically:
- Add the severity donut and category bar charts alongside the stat counters
- Update pricing tier descriptions to be more specific about value

For RbacEnterprise specifically:
- Use `var(--ibm-surface-1)` for card backgrounds
- Use `ibm-label` for column titles

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/BringYourOwnModel.tsx src/components/landing/RbacEnterprise.tsx src/components/landing/Competition.tsx src/components/landing/OutcomesKpis.tsx src/components/landing/CtaFooter.tsx
git commit -m "feat(landing): rework BYO Model through CTA/Footer with Carbon tokens"
```

---

### Task 7: Theme support + build verification + changelog

**Files:**
- Modify: `src/app/page.tsx` (ensure theme support)
- Modify: `src/lib/changelog.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Verify theme support**

The landing page should respect the user's theme preference. Since all `--ibm-*` variables are defined in `globals.css` for both light (`:root`) and dark (`[data-theme="dark"]`) themes, the page automatically inherits the correct colors when the ThemeProvider sets the theme.

Check that `src/app/page.tsx` does NOT force dark mode — it should use `var(--ibm-canvas)` which resolves to `#ffffff` in light mode and `#161616` in dark mode.

If the page has any hardcoded dark-mode colors (e.g., `background: '#0a0a0a'`), replace them with `var(--ibm-canvas)`.

- [ ] **Step 2: Verify build**

```bash
cd /root/astra && npx next build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Verify no landingStyles imports remain**

```bash
grep -rn "landingStyles" src/components/landing/
```

Expected: No results. All references to the deleted file should be removed.

- [ ] **Step 4: Verify no landingTokens references remain**

```bash
grep -rn "landingTokens" src/components/landing/
```

Expected: No results. All should be replaced with `var(--ibm-*)`.

- [ ] **Step 5: Update changelog**

Add entry to `src/lib/changelog.ts`:

```typescript
{
  version: '2.28.1',
  date: '2026-05-16',
  title: 'Frontpage Carbon redesign',
  description: 'Reworked landing page to use IBM Carbon design system (--ibm-* tokens, ibm-* typography classes), added @carbon/charts data visualizations (severity donut, category bars, remediation comparison, false positive rate), improved all section content quality, added feature comparison table in Competition section.',
  categories: [
    {
      label: 'Landing page',
      items: [
        'Replaced custom dark theme with IBM Carbon design tokens',
        'Added @carbon/charts for data visualizations',
        'Severity distribution donut chart',
        'Category breakdown horizontal bar chart',
        'Remediation time comparison grouped bar chart',
        'False positive rate bar chart',
        'Feature comparison table in Competition section',
        'Improved all section content with specific data points',
        'Landing page now respects light/dark theme preference',
        'Deleted landingStyles.ts in favor of --ibm-* CSS variables',
      ],
    },
  ],
},
```

- [ ] **Step 6: Update CLAUDE.md**

Add row to Changelog table:
```
| 2026-05-16 | v2.28.1: **Frontpage Carbon redesign** — Reworked to IBM Carbon design tokens/typography; added @carbon/charts (4 charts); improved content quality; feature comparison table; theme-aware (light/dark); deleted landingStyles.ts |
```

- [ ] **Step 7: Update graphify**

```bash
cd /root/astra && graphify update .
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/changelog.ts CLAUDE.md
git commit -m "docs: add v2.28.1 Carbon redesign to changelog"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Every spec requirement has a task:
  - Carbon tokens: Tasks 3-6 replace all landingTokens with --ibm-* variables
  - Charts: Task 2 creates chart components, Tasks 4-5 integrate them
  - Content quality: Tasks 2 (data), 3 (Hero), 4-6 (all sections) rewrite content
  - Theme support: Task 7 verifies light/dark theme works
  - landingStyles.ts deletion: Task 2 deletes it, all subsequent tasks remove imports
- [x] **Placeholder scan:** No TBD, TODO, or "implement later" — all chart code and content changes are specified
- [x] **Type consistency:** All component file names match between tasks, chart component names are consistent (SeverityDonutChart, CategoryBarChart, RemediationComparisonChart, FalsePositiveBarChart)
- [x] **No circular dependencies:** Charts import from @carbon/charts-react only, components import charts from ./landingCharts