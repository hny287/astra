# Frontpage Redesign — Carbon + Charts + Content Quality Spec

**Date:** 2026-05-16
**Status:** Draft
**Scope:** Rework the landing page (`src/app/page.tsx` + `src/components/landing/`) to use IBM Carbon design tokens/typography, add @carbon/charts, and improve content quality

## Problem

The current landing page implementation has three issues:
1. **Wrong design language** — Uses a custom dark theme (`landingTokens`) instead of the project's established IBM Carbon design system (`--ibm-*` CSS variables, `ibm-*` typography classes, 0px radius, IBM Plex Sans)
2. **No data visualizations** — Text-only stat counters, no charts or graphs to make data compelling
3. **Subpar content** — Generic descriptions, weak data points, unconvincing messaging. The product is powerful but the page doesn't convey that.

## Design Changes

### 1. Design Language: IBM Carbon

Replace all `landingTokens` references with `--ibm-*` CSS custom properties and `ibm-*` typography classes.

**Token mapping (current → Carbon):**

| Current (landingTokens) | Carbon Replacement | CSS Variable |
|---|---|---|
| `bgCanvas` (#0a0a0a) | `var(--ibm-canvas)` | Light: #ffffff, Dark: #161616 |
| `bgSurface1` (#161616) | `var(--ibm-surface-1)` | Light: #f4f4f4, Dark: #252525 |
| `bgSurface2` (#1c1c1c) | `var(--ibm-surface-2)` | Light: #e0e0e0, Dark: #393939 |
| `inkPrimary` (#f4f4f4) | `var(--ibm-ink)` | Light: #161616, Dark: #f4f4f4 |
| `inkSecondary` (#a8a8a8) | `var(--ibm-ink-muted)` | Light: #525252, Dark: #a8a8a8 |
| `inkMuted` (#6f6f6f) | `var(--ibm-ink-subtle)` | Light: #8c8c8c, Dark: #6f6f6f |
| `accentPrimary` (#0f62fe) | `var(--ibm-primary)` | #0f62fe (both themes) |
| `accentCritical` (#da1e28) | `var(--ibm-semantic-error)` | #da1e28 |
| `accentHigh` (#f57c00) | `var(--ibm-semantic-warning)` | #b28600 light / #f1c21b dark |
| `accentMedium` (#f1c21b) | `var(--ibm-semantic-warning)` | context-dependent |
| `accentLow` (#24a148) | `var(--ibm-semantic-success)` | #198038 light / #24a148 dark |
| `borderSubtle` (#393939) | `var(--ibm-hairline)` | Light: #e0e0e0, Dark: #393939 |
| `borderMedium` (#525252) | `var(--ibm-hairline-strong)` | Light: #161616, Dark: #525252 |

**Typography:** Replace inline `fontSize`/`fontWeight` with `ibm-*` classes:
- Headlines: `className="ibm-display-md"` or `ibm-headline`
- Section titles: `className="ibm-card-title"`
- Body: `className="ibm-body"` or `ibm-body-lg`
- Labels: `className="ibm-label"`
- Captions: `className="ibm-caption"`
- Eyebrows: `className="ibm-eyebrow"`

**Border radius:** All elements use 0px radius (already set globally via `--radius-*: 0`).

**Theme support:** The landing page uses `[data-theme="dark"]` to switch to dark mode. All `--ibm-*` variables already have dark mode overrides in `globals.css`. The landing page should respect the user's theme preference — **not** force dark mode.

### 2. Charts: @carbon/charts

Install `@carbon/charts` and `@carbon/charts-react` for data visualizations.

**Charts to add (4 total):**

**a) Severity Distribution (Donut chart)**
- In the "What it finds" section or "Outcomes & KPIs" section
- Shows: CRITICAL 12%, HIGH 28%, MEDIUM 38%, LOW 18%, INFO 4%
- Carbon colors: `--ibm-semantic-error` (CRITICAL), `--ibm-semantic-warning` (HIGH), `--ibm-primary` (MEDIUM), `var(--ibm-ink-subtle)` (LOW/INFO)
- Center label: "1,247 findings"

**b) Category Breakdown (Horizontal bar chart)**
- In the "What it finds" section
- Shows: SAST 34%, SCA 22%, Secrets 18%, IaC 14%, Business Logic 8%, Cloud 4%
- Each bar uses the category's accent color

**c) Remediation Time Comparison (Grouped bar chart)**
- In the "AI Advantage" section
- Two groups: "Without AI" vs "With Astra AI"
- Bars: Time to triage (45min → 8min), Time to fix (4hrs → 40min), Time to verify (2hrs → 15min)
- Clearly shows the AI speedup

**d) False Positive Rate (Simple bar chart)**
- In the "Outcomes & KPIs" section
- Shows: Raw scanner output 62% false positive rate vs. Astra AI-enriched 8% false positive rate
- Dramatic visual contrast

### 3. Content Quality Improvements

**Every section needs stronger, more specific content.** The current content is generic and unconvincing. Below are the improvements per section.

**Section 1: Hero**
- BEFORE: "Find vulnerabilities before they find you"
- AFTER: "Stop shipping vulnerabilities. Start shipping confidence."
- Stat bar: "92% fewer false positives", "73% faster remediation", "4.5min avg time to first finding"
- Animated walkthrough: Show an actual finding appearing with AI explanation expanding — make it feel real, not staged

**Section 2: Interactive Demo**
- The toggle is good, but the content needs to be more specific and dramatic
- Raw side: Show the actual CVE JSON, the vague description, the "you figure it out" implication
- Enriched side: Show the plain-language explanation, the code diff fix, the exploitability score bar, the OWASP/CWE mapping, and the business impact callout
- Add a severity donut chart below the demo showing the distribution of finding types

**Section 3: AI Advantage**
- Keep the before/after, but add the remediation time comparison chart
- Differentiators need punchier copy:
  - BEFORE: "Finds authorization flaws (IDOR, BOLA, BFLA) that pattern-matching scanners miss"
  - AFTER: "49% of critical bug bounties are authorization flaws. SAST can't find them. We can."

**Section 4: What it finds**
- Add the category breakdown horizontal bar chart
- Each category card should have a specific, real example — not "SQL injection in auth/login.ts:47" but something that feels like a real finding
- Add severity distribution donut chart

**Section 5: Works with your stack**
- Add language/tool icons (not just text tags) for visual interest
- Group by category with clear visual separation

**Section 6: Full platform coverage**
- Tier badges should use Carbon Tag components with appropriate colors
- Each module card should have a mini stat or capability count (e.g., "6 scanners", "43 frameworks", "3 cloud providers")

**Section 7-8: Cloud/Network/SBOM sections**
- Add specific numbers: "43 compliance frameworks", "15,000+ CVEs tracked", "200+ misconfiguration rules"
- Make each panel feel substantial, not just bullet points

**Section 9: Feature Breakdown**
- Add the false positive rate bar chart
- Each feature should have a one-line stat or proof point, not just a description
- Example: "AI Deep Scan" → "Per-file analysis with 96% accuracy on OWASP benchmark"

**Section 10: Bring Your Own Model**
- Show a visual pipeline diagram where stages connect to model choices
- Add stat: "Configure per-stage — use a fast model for discovery, a powerful model for deep analysis"

**Section 11: RBAC & Enterprise**
- Add an access control matrix visual (role × permission grid)
- Make the 4 columns feel like a spec sheet, not marketing copy

**Section 12: Competition**
- Add a feature comparison table (Astra vs. Snyk vs. Semgrep vs. CodeRabbit)
- Rows: Business logic detection, Cross-file reasoning, AI-aware SAST, Transparent pricing, All-in-one platform
- Check marks and X marks — visual, not narrative

**Section 13: Outcomes & KPIs**
- Replace stat counters with the 4 charts described above
- Pricing tiers need real value propositions per feature, not just feature lists
- Free tier should feel generous enough to start, Pro should feel like the obvious upgrade

**Section 14: CTA + Footer**
- Add a final stat or proof point: "Trusted by 500+ security teams" or similar social proof

### 4. Theme Support

The landing page must respect the user's theme preference:
- If the user has dark mode selected (via ThemeProvider), use the dark theme
- If light mode, use the light theme
- The page reads `[data-theme]` from the document root, which the existing ThemeProvider manages
- All `--ibm-*` variables automatically switch themes

### 5. Component Changes

**Delete:** `src/components/landing/landingStyles.ts` (replaced by `--ibm-*` tokens)

**Modify:** All 14 section components — replace `landingTokens.*` with `var(--ibm-*)`, replace inline font styles with `ibm-*` classes, add charts

**Add:**
- `src/components/landing/landingCharts.tsx` — Chart components using @carbon/charts
- `src/components/landing/landingData.ts` — Rewrite all content for quality

**Keep:**
- `src/components/landing/landingAnimations.ts` — useVisible and useCountUp hooks still needed
- `src/components/landing/demoData.ts` — rewrite content for quality
- `src/app/page.tsx` — keep the shell, update styles to use Carbon tokens
- All 14 section component file names — keep the same structure, rewrite content and styling

### 6. Package Installations

```bash
npm install @carbon/charts @carbon/charts-react d3
```

Note: `@carbon/charts` depends on D3.js for rendering.

## Out of Scope

- No changes to the authenticated app UI
- No changes to API routes or database schema
- No new landing page sections — same 14 sections, better content and styling
- No SEO optimization (separate task)
- No A/B testing or analytics integration