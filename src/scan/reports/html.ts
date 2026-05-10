import type { ReportData } from './types';

type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

const SEVERITY_ORDER: SeverityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#fa4d56',
  HIGH: '#fa4d56',
  MEDIUM: '#fddc69',
  LOW: '#42be65',
  INFO: '#4589ff',
};

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: '#2c0709',
  HIGH: '#2c0709',
  MEDIUM: '#2c2610',
  LOW: '#0a2918',
  INFO: '#0d1a3a',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return 'N/A';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function severityCount(findings: ReportData['findings'], severity: string): number {
  return findings.filter((f) => f.severity.toUpperCase() === severity).length;
}

function categoryCount(findings: ReportData['findings']): { category: string; count: number }[] {
  const map = new Map<string, number>();
  for (const f of findings) {
    map.set(f.category, (map.get(f.category) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

function groupByFile(findings: ReportData['findings']): Map<string, ReportData['findings']> {
  const map = new Map<string, ReportData['findings']>();
  for (const f of findings) {
    const dir = f.file.includes('/') ? f.file.substring(0, f.file.lastIndexOf('/')) : '.';
    const existing = map.get(dir) || [];
    existing.push(f);
    map.set(dir, existing);
  }
  return map;
}

function renderCodeSnippet(snippet: string, lineStart: number): string {
  const lines = snippet.split('\n');
  const lineNumWidth = String(lineStart + lines.length).length;
  return lines
    .map((line, i) => {
      const num = String(lineStart + i).padStart(lineNumWidth, ' ');
      return `<span class="line-num">${num}</span>  ${escapeHtml(line)}`;
    })
    .join('\n');
}

function renderSeverityBadge(severity: string): string {
  const s = severity.toUpperCase() as SeverityLevel;
  const color = SEVERITY_COLORS[s] || '#a8a8a8';
  const bg = SEVERITY_BG[s] || '#262626';
  return `<span class="severity-badge" style="background:${bg};color:${color};border-color:${color}">${escapeHtml(severity)}</span>`;
}

function renderScoreBar(label: string, value: number, max: number, color: string): string {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return `<div class="score-bar">
  <span class="score-label">${escapeHtml(label)}</span>
  <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
  <span class="score-value">${label === 'Confidence' ? Math.round(value * 100) + '%' : value.toFixed(1)}</span>
</div>`;
}

function renderCweLinks(cwe: string[]): string {
  if (!cwe || cwe.length === 0) return '';
  return cwe
    .map((c) => {
      const num = c.replace(/^CWE[-_ ]*/i, '');
      return `<a href="https://cwe.mitre.org/data/definitions/${num}.html" target="_blank" rel="noopener">CWE-${num}</a>`;
    })
    .join(', ');
}

function renderOwaspLinks(owasp: string[]): string {
  if (!owasp || owasp.length === 0) return '';
  return owasp.join(', ');
}

function renderFindings(findings: ReportData['findings']): string {
  const sorted = [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity.toUpperCase() as SeverityLevel) -
      SEVERITY_ORDER.indexOf(b.severity.toUpperCase() as SeverityLevel)
  );

  return sorted
    .map((f, i) => {
      const sev = f.severity.toUpperCase();
      const sevColor = SEVERITY_COLORS[sev] || '#a8a8a8';
      const codeHtml = f.codeSnippet
        ? renderCodeSnippet(f.codeSnippet, f.lineStart)
        : '';

      const exploitationSection = f.exploitationScenario
        ? `<div class="exploitation">
  <div class="exploitation-title">Proof of Concept</div>
  <p>${escapeHtml(f.exploitationScenario)}</p>
</div>`
        : '';

      const aiSection = f.aiExplanation
        ? `<div class="ai-section">
  <div class="section-label">AI Explanation</div>
  <p>${escapeHtml(f.aiExplanation)}</p>
</div>`
        : '';

      const cweHtml = renderCweLinks(f.cwe);
      const owaspHtml = renderOwaspLinks(f.owasp);
      const cweOwasp =
        cweHtml || owaspHtml
          ? `<div class="cwe-owasp">
  ${cweHtml ? `<span class="tag-group"><span class="tag-label">CWE:</span> ${cweHtml}</span>` : ''}
  ${owaspHtml ? `<span class="tag-group"><span class="tag-label">OWASP:</span> ${owaspHtml}</span>` : ''}
</div>`
          : '';

      const remediationSection = f.remediation
        ? `<div class="remediation">
  <div class="section-label">Remediation</div>
  <p>${escapeHtml(f.remediation)}</p>
</div>`
        : '';

      const fixSection = f.aiFix
        ? `<div class="ai-fix">
  <div class="section-label">AI-Suggested Fix</div>
  <pre><code>${escapeHtml(f.aiFix)}</code></pre>
</div>`
        : '';

      return `<div class="finding-card" style="border-left:4px solid ${sevColor}">
  <div class="finding-header">
    <div class="finding-title-row">
      ${renderSeverityBadge(f.severity)}
      <h3 class="finding-title">${escapeHtml(f.title)}</h3>
    </div>
    <div class="finding-meta">${escapeHtml(f.file)}:${f.lineStart}${f.lineEnd !== f.lineStart ? '-' + f.lineEnd : ''} · ${escapeHtml(f.category)} · ${escapeHtml(f.scanner)}</div>
  </div>
  ${codeHtml ? `<pre class="code-block"><code>${codeHtml}</code></pre>` : ''}
  ${aiSection}
  ${exploitationSection}
  ${cweOwasp}
  ${remediationSection}
  ${fixSection}
  <div class="scores-row">
    ${renderScoreBar('Exploit Score', f.exploitScore, 10, f.exploitScore >= 7 ? SEVERITY_COLORS.CRITICAL : f.exploitScore >= 4 ? SEVERITY_COLORS.MEDIUM : SEVERITY_COLORS.LOW)}
    ${renderScoreBar('Confidence', f.confidence, 1, '#4589ff')}
  </div>
</div>`;
    })
    .join('\n');
}

function renderFileBrowser(findings: ReportData['findings']): string {
  const grouped = groupByFile(findings);
  const sections: string[] = [];

  const sortedDirs = Array.from(grouped.keys()).sort();
  for (const dir of sortedDirs) {
    const dirFindings = grouped.get(dir)!;
    const fileGroups = new Map<string, ReportData['findings']>();
    for (const f of dirFindings) {
      const existing = fileGroups.get(f.file) || [];
      existing.push(f);
      fileGroups.set(f.file, existing);
    }

    const fileEntries = Array.from(fileGroups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, fileFindings]) => {
        const summaryItems = fileFindings
          .sort(
            (a, b) =>
              SEVERITY_ORDER.indexOf(a.severity.toUpperCase() as SeverityLevel) -
              SEVERITY_ORDER.indexOf(b.severity.toUpperCase() as SeverityLevel)
          )
          .map(
            (f) =>
              `<li>${renderSeverityBadge(f.severity)} ${escapeHtml(f.title)} <span class="muted">(L${f.lineStart}${f.lineEnd !== f.lineStart ? '-' + f.lineEnd : ''})</span></li>`
          )
          .join('\n');

        const filename = file.includes('/') ? file.substring(file.lastIndexOf('/') + 1) : file;
        return `<details class="file-details">
  <summary class="file-summary"><span class="file-name">${escapeHtml(filename)}</span> <span class="muted">${escapeHtml(dir)}/</span> <span class="finding-count">${fileFindings.length} finding${fileFindings.length > 1 ? 's' : ''}</span></summary>
  <ul class="finding-list">${summaryItems}</ul>
</details>`;
      })
      .join('\n');

    sections.push(`<div class="directory-group">
  <div class="directory-label">${escapeHtml(dir)}/</div>
  ${fileEntries}
</div>`);
  }

  return sections.join('\n');
}

function renderBusinessRulesTable(rules: ReportData['businessRules']): string {
  if (!rules || rules.length === 0) {
    return '<p class="muted">No business logic rules detected.</p>';
  }

  const rows = rules
    .map(
      (r) => `<tr>
  <td>${escapeHtml(r.ruleText)}</td>
  <td>${Math.round(r.confidence * 100)}%</td>
  <td>${r.evidenceFiles.map((f) => escapeHtml(f)).join(', ') || '—'}</td>
  <td>${escapeHtml(r.status)}</td>
  <td>${r.violationDescription ? escapeHtml(r.violationDescription) : '—'}</td>
</tr>`
    )
    .join('\n');

  return `<table class="rules-table">
<thead>
  <tr>
    <th>Rule</th>
    <th>Confidence</th>
    <th>Evidence Files</th>
    <th>Status</th>
    <th>Violation</th>
  </tr>
</thead>
<tbody>${rows}</tbody>
</table>`;
}

export function generateReportHtml(data: ReportData): string {
  const { scan, findings, businessRules } = data;

  const totalFindings = findings.length;
  const severityBreakdown = SEVERITY_ORDER.map((s) => ({
    severity: s,
    count: severityCount(findings, s),
  }));
  const criticalHigh = severityCount(findings, 'CRITICAL') + severityCount(findings, 'HIGH');
  const categories = categoryCount(findings);
  const maxCount = Math.max(...severityBreakdown.map((s) => s.count), 1);

  const severityBars = severityBreakdown
    .map(
      (s) => `<div class="bar-row">
  <span class="bar-label" style="color:${SEVERITY_COLORS[s.severity]}">${s.severity}</span>
  <div class="bar-track"><div class="bar-fill" style="width:${(s.count / maxCount) * 100}%;background:${SEVERITY_COLORS[s.severity]}"></div></div>
  <span class="bar-count">${s.count}</span>
</div>`
    )
    .join('\n');

  const categoryBars = categories
    .map(
      (c) => `<div class="cat-row">
  <span class="cat-label">${escapeHtml(c.category)}</span>
  <div class="bar-track"><div class="bar-fill-cat" style="width:${(c.count / Math.max(totalFindings, 1)) * 100}%;background:#4589ff"></div></div>
  <span class="bar-count">${c.count}</span>
</div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Astra Security Report — ${escapeHtml(scan.repoUrl)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --canvas: #161616;
  --surface-1: #262626;
  --surface-2: #393939;
  --hairline: #393939;
  --text-primary: #f4f4f4;
  --text-muted: #a8a8a8;
  --accent: #42be65;
  --link: #4589ff;
  --critical: #fa4d56;
  --high: #fa4d56;
  --medium: #fddc69;
  --low: #42be65;
  --info: #4589ff;
  --font-sans: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'IBM Plex Mono', 'Menlo', 'Consolas', monospace;
}

html { font-size: 14px; }

body {
  font-family: var(--font-sans);
  background-color: var(--canvas);
  background-image:
    linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
  background-size: 24px 24px;
  color: var(--text-primary);
  line-height: 1.6;
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }

.muted { color: var(--text-muted); }

h1 { font-weight: 600; font-size: 1.75rem; margin-bottom: 0.25rem; }
h2 { font-weight: 600; font-size: 1.35rem; margin-top: 2.5rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--hairline); }
h3 { font-weight: 400; font-size: 1.1rem; }

.header { margin-bottom: 2rem; }
.header-subtitle { color: var(--text-muted); font-size: 0.95rem; }
.header-subtitle a { color: var(--link); }

.card {
  background: var(--surface-1);
  border: 1px solid var(--hairline);
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.stat-big { font-size: 2.5rem; font-weight: 600; line-height: 1; }
.stat-label { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem; }

.bar-row, .cat-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.4rem; }
.bar-label, .cat-label { width: 70px; font-size: 0.85rem; text-align: right; flex-shrink: 0; font-weight: 600; }
.bar-track { flex: 1; height: 8px; background: var(--surface-2); overflow: hidden; }
.bar-fill, .bar-fill-cat { height: 100%; }
.bar-count { width: 30px; font-size: 0.85rem; text-align: right; }

.critical-high-banner {
  background: #2c0709;
  border: 1px solid var(--critical);
  padding: 1rem;
  margin-bottom: 1rem;
  color: var(--critical);
  font-weight: 600;
}

.finding-card {
  background: var(--surface-1);
  border: 1px solid var(--hairline);
  border-left: 4px solid var(--text-muted);
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.finding-header { margin-bottom: 0.75rem; }
.finding-title-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.finding-title { font-size: 1.05rem; font-weight: 600; }
.finding-meta { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem; }

.severity-badge {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.15rem 0.5rem;
  border: 1px solid;
  display: inline-block;
  border-radius: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.code-block {
  background: var(--surface-2);
  color: var(--text-primary);
  padding: 1rem;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  margin-bottom: 1rem;
  border: 1px solid var(--hairline);
  line-height: 1.5;
}

.line-num { color: var(--text-muted); user-select: none; }

.ai-section, .remediation, .ai-fix { margin-bottom: 0.75rem; }
.section-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
  font-weight: 600;
}

.ai-section p, .remediation p { margin: 0; }

.exploitation {
  border-left: 4px solid var(--critical);
  background: rgba(250, 77, 86, 0.08);
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}
.exploitation-title {
  color: var(--critical);
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}
.exploitation p { margin: 0; }

.cwe-owasp { margin-bottom: 0.75rem; }
.tag-group { margin-right: 1rem; }
.tag-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600; }

.scores-row { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
.score-bar { flex: 1; min-width: 180px; }
.score-label { font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.25rem; }
.score-value { font-family: var(--font-mono); font-size: 0.85rem; font-weight: 500; }

.directory-group { margin-bottom: 1.5rem; }
.directory-label { font-family: var(--font-mono); font-size: 0.9rem; color: var(--accent); margin-bottom: 0.5rem; }

.file-details { margin-bottom: 0.5rem; }
.file-summary {
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  background: var(--surface-1);
  border: 1px solid var(--hairline);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.file-summary::-webkit-details-marker { display: none; }
.file-summary::before { content: '▸'; color: var(--text-muted); flex-shrink: 0; }
details[open] > .file-summary::before { content: '▾'; }
.file-name { font-family: var(--font-mono); font-weight: 500; }
.finding-count { color: var(--text-muted); font-size: 0.85rem; margin-left: auto; }

.finding-list { list-style: none; padding: 0.5rem 0.75rem 0.5rem 1.5rem; margin: 0; }
.finding-list li { padding: 0.25rem 0; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

.rules-table { width: 100%; border-collapse: collapse; }
.rules-table th, .rules-table td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--hairline); font-size: 0.9rem; }
.rules-table th { color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
.rules-table td { vertical-align: top; }

.nav-toc {
  background: var(--surface-1);
  border: 1px solid var(--hairline);
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
}
.nav-toc-title { font-weight: 600; margin-bottom: 0.5rem; }
.nav-toc ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; }
.nav-toc a { color: var(--link); font-size: 0.9rem; }

.footer {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid var(--hairline);
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

@media print {
  body {
    background: #fff !important;
    background-image: none !important;
    color: #000 !important;
    max-width: none !important;
    padding: 0 !important;
    font-size: 12px !important;
  }
  .nav-toc { display: none !important; }
  .card, .finding-card, .file-summary { background: #fff !important; border-color: #ccc !important; }
  .code-block { background: #f5f5f5 !important; color: #000 !important; border-color: #ccc !important; }
  .exploitation { background: #fff5f5 !important; border-color: #c00 !important; }
  .critical-high-banner { background: #fff5f5 !important; color: #c00 !important; border-color: #c00 !important; }
  .severity-badge { border-color: #333 !important; }
  .bar-track { background: #eee !important; }
  h2 { border-color: #ccc !important; }
  .muted { color: #666 !important; }
  a { color: #333 !important; text-decoration: underline !important; }
  .footer { color: #666 !important; border-color: #ccc !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
</style>
</head>
<body>

<div class="nav-toc">
  <div class="nav-toc-title">Table of Contents</div>
  <ul>
    <li><a href="#summary">Executive Summary</a></li>
    <li><a href="#file-browser">File Browser</a></li>
    <li><a href="#findings">Findings</a></li>
    <li><a href="#business-rules">Business Logic Rules</a></li>
  </ul>
</div>

<header class="header">
  <h1>Astra Security Report</h1>
  <div class="header-subtitle">
    <a href="${escapeHtml(scan.repoUrl)}">${escapeHtml(scan.repoUrl)}</a> · <code>${escapeHtml(scan.branch)}</code> · ${formatDate(scan.createdAt)}
  </div>
  <div class="header-subtitle" style="margin-top:0.25rem;">
    Duration: ${formatDuration(scan.durationSeconds)} · Tokens: ${scan.totalInputTokens.toLocaleString()} in / ${scan.totalOutputTokens.toLocaleString()} out
  </div>
</header>

<section id="summary">
<h2>Executive Summary</h2>

<div class="summary-grid">
  <div class="card">
    <div class="stat-big">${totalFindings}</div>
    <div class="stat-label">Total Findings</div>
  </div>
  <div class="card">
    <div class="stat-big" style="color:${criticalHigh > 0 ? 'var(--critical)' : 'var(--accent)'}">${criticalHigh}</div>
    <div class="stat-label">Critical + High</div>
  </div>
</div>

${criticalHigh > 0 ? `<div class="critical-high-banner">${criticalHigh} critical or high severity finding${criticalHigh > 1 ? 's' : ''} require${criticalHigh === 1 ? 's' : ''} immediate attention</div>` : ''}

<div class="card">
  <div class="section-label">Severity Breakdown</div>
  ${severityBars}
</div>

<div class="card">
  <div class="section-label">Category Breakdown</div>
  ${categoryBars}
</div>
</section>

<section id="file-browser">
<h2>File Browser</h2>
${totalFindings > 0 ? renderFileBrowser(findings) : '<p class="muted">No findings to display.</p>'}
</section>

<section id="findings">
<h2>Findings</h2>
${totalFindings > 0 ? renderFindings(findings) : '<p class="muted">No findings detected.</p>'}
</section>

<section id="business-rules">
<h2>Business Logic Rules</h2>
${renderBusinessRulesTable(businessRules)}
</section>

<footer class="footer">
  Generated by Astra Security Scanner · ${formatDate(new Date().toISOString())}
</footer>

</body>
</html>`;
}