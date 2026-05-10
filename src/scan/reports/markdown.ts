import type { ReportData } from './types';

type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

const SEVERITY_ORDER: SeverityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

function cweLink(cwe: string): string {
  const num = cwe.replace(/^CWE[-_ ]*/i, '');
  return `[CWE-${num}](https://cwe.mitre.org/data/definitions/${num}.html)`;
}

function severityEmoji(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return '🔴';
    case 'HIGH': return '🟠';
    case 'MEDIUM': return '🟡';
    case 'LOW': return '🟢';
    case 'INFO': return '🔵';
    default: return '⚪';
  }
}

export function generateReportMarkdown(data: ReportData): string {
  const { scan, findings, businessRules } = data;

  const totalFindings = findings.length;
  const criticalHigh = severityCount(findings, 'CRITICAL') + severityCount(findings, 'HIGH');

  const severityLines = SEVERITY_ORDER.map((s) => {
    const count = severityCount(findings, s);
    return `| ${s} | ${count} |`;
  }).join('\n');

  const categoryMap = new Map<string, number>();
  for (const f of findings) {
    categoryMap.set(f.category, (categoryMap.get(f.category) || 0) + 1);
  }
  const categories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `- **${cat}**: ${count}`)
    .join('\n');

  const fileGroups = new Map<string, ReportData['findings']>();
  for (const f of findings) {
    const existing = fileGroups.get(f.file) || [];
    existing.push(f);
    fileGroups.set(f.file, existing);
  }

  const sortedFiles = Array.from(fileGroups.keys()).sort();

  const findingsByFile = sortedFiles
    .map((file) => {
      const fileFindings = fileGroups.get(file)!.sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.severity.toUpperCase() as SeverityLevel) -
          SEVERITY_ORDER.indexOf(b.severity.toUpperCase() as SeverityLevel)
      );
      const items = fileFindings
        .map((f) => {
          const cweStr = f.cwe.length > 0 ? f.cwe.map(cweLink).join(', ') : '';
          const owaspStr = f.owasp.length > 0 ? f.owasp.join(', ') : '';
          const lines =
            f.lineStart === f.lineEnd ? `L${f.lineStart}` : `L${f.lineStart}-L${f.lineEnd}`;
          let body = `- **[${f.severity.toUpperCase()}] ${f.title}** (${lines})`;
          if (cweStr) body += `\n  - CWE: ${cweStr}`;
          if (owaspStr) body += `\n  - OWASP: ${owaspStr}`;
          return body;
        })
        .join('\n');
      return `### \`${file}\`\n${items}`;
    })
    .join('\n\n');

  const sortedFindings = [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity.toUpperCase() as SeverityLevel) -
      SEVERITY_ORDER.indexOf(b.severity.toUpperCase() as SeverityLevel)
  );

  const findingDetails = sortedFindings
    .map((f, i) => {
      const lines =
        f.lineStart === f.lineEnd ? `${f.lineStart}` : `${f.lineStart}-${f.lineEnd}`;
      const cweStr = f.cwe.length > 0 ? f.cwe.map(cweLink).join(', ') : '';
      const owaspStr = f.owasp.length > 0 ? f.owasp.join(', ') : '';

      let section = `### ${i + 1}. [${f.severity.toUpperCase()}] ${f.title}`;
      section += `\n**File:** \`${f.file}:${lines}\` · **Category:** ${f.category} · **Scanner:** ${f.scanner}`;

      if (f.codeSnippet) {
        section += `\n\n**Code:**\n\`\`\`${f.language || ''}\n${f.codeSnippet}\n\`\`\``;
      }

      if (f.aiExplanation) {
        section += `\n\n**AI Explanation:** ${f.aiExplanation}`;
      }

      if (f.exploitationScenario) {
        section += `\n\n**Proof of Concept:** ${f.exploitationScenario}`;
      }

      const cweOwasp: string[] = [];
      if (cweStr) cweOwasp.push(cweStr);
      if (owaspStr) cweOwasp.push(owaspStr);
      if (cweOwasp.length > 0) {
        section += `\n\n**CWE/OWASP:** ${cweOwasp.join(', ')}`;
      }

      if (f.remediation) {
        section += `\n\n**Remediation:** ${f.remediation}`;
      }

      if (f.aiFix) {
        section += `\n\n**AI-Suggested Fix:**\n\`\`\`${f.language || ''}\n${f.aiFix}\n\`\`\``;
      }

      section += `\n\n**Exploit Score:** ${f.exploitScore.toFixed(1)}/10 · **Confidence:** ${Math.round(f.confidence * 100)}%`;

      return section;
    })
    .join('\n\n---\n\n');

  const rulesTable = businessRules.length > 0
    ? `| Rule | Confidence | Evidence Files | Status | Violation |\n|---|---|---|---|---|\n${businessRules
        .map(
          (r) =>
            `| ${r.ruleText} | ${Math.round(r.confidence * 100)}% | ${r.evidenceFiles.join(', ') || '—'} | ${r.status} | ${r.violationDescription || '—'} |`
        )
        .join('\n')}`
    : 'No business logic rules detected.';

  return `# Astra Security Report

**Target:** ${scan.repoUrl} · \`${scan.branch}\` · ${formatDate(scan.createdAt)}
**Duration:** ${formatDuration(scan.durationSeconds)} · **Tokens:** ${scan.totalInputTokens.toLocaleString()} in / ${scan.totalOutputTokens.toLocaleString()} out

## Executive Summary

**Total Findings:** ${totalFindings}${criticalHigh > 0 ? ` · **Critical+High:** ${criticalHigh} 🔴` : ''}

| Severity | Count |
|---|---|
${severityLines}

### Category Breakdown
${categories || 'None'}

## Findings by File
${findingsByFile || 'No findings detected.'}

## Finding Details
${findingDetails || 'No findings detected.'}

## Business Logic Rules
${rulesTable}

---
*Generated by Astra Security Scanner · ${formatDate(new Date().toISOString())}*
`;
}