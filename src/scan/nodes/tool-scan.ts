import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { ScanState } from '../state';
import type { UnifiedFinding, Severity, Category } from '../../findings/types';
import { fingerprint } from '../../findings/dedup';
import { upsertFinding } from '../../findings/persist';
import { createProviderForNode } from '../../providers/factory';
import type { AIRequest } from '../../providers/base';
import type { NodeConfig } from '../../lib/config';
import { instrumentedSend } from '@/lib/ai-instrumentation';
import { parseAiJson } from './parse-ai-json';
import { log } from '../log';
import { prisma } from '@/lib/db';

// ── Trivy normalizer ──────────────────────────────────────────────────

interface TrivyReport {
  Results?: TrivyResult[];
}

interface TrivyResult {
  Target: string;
  Type: string;
  Vulnerabilities?: TrivyVuln[];
  Misconfigurations?: TrivyMisconfig[];
  Secrets?: TrivySecret[];
}

interface TrivyVuln {
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion: string;
  Severity: string;
  Title: string;
  Description: string;
  PrimaryURL: string;
  References?: string[];
}

interface TrivyMisconfig {
  ID: string;
  Title: string;
  Severity: string;
  Description: string;
  Resolution: string;
  Filename: string;
  StartLine: number;
  EndLine: number;
}

interface TrivySecret {
  RuleID: string;
  Category: string;
  Severity: string;
  Match: string;
  Filename: string;
  StartLine: number;
  EndLine: number;
}

function normalizeTrivyVuln(v: TrivyVuln, target: string): UnifiedFinding {
  const line = 0;
  const severity = normalizeTrivySeverity(v.Severity);
  return {
    fingerprint: fingerprint('trivy', v.VulnerabilityID, target, line, v.Title),
    scanner: 'trivy',
    ruleId: v.VulnerabilityID,
    title: v.Title || `${v.VulnerabilityID} in ${v.PkgName}`,
    description: v.Description || '',
    severity,
    category: 'SCA',
    file: target,
    lineStart: line,
    lineEnd: line,
    codeSnippet: '',
    language: '',
    cwe: [],
    owasp: [],
    aiExplanation: '',
    aiFix: '',
    exploitationScenario: '',
    exploitScore: severityToScore(severity),
    cvssScore: 0,
    cvssVector: '',
    confidence: 0.7,
    remediation: `Upgrade ${v.PkgName} from ${v.InstalledVersion}`,
    raw: JSON.stringify(v),
  };
}

function normalizeTrivyMisconfig(m: TrivyMisconfig, target: string): UnifiedFinding {
  const severity = normalizeTrivySeverity(m.Severity);
  const file = m.Filename || target;
  return {
    fingerprint: fingerprint('trivy', m.ID, file, m.StartLine, m.Title),
    scanner: 'trivy',
    ruleId: m.ID,
    title: m.Title,
    description: m.Description || '',
    severity,
    category: 'IAC',
    file,
    lineStart: m.StartLine || 0,
    lineEnd: m.EndLine || m.StartLine || 0,
    codeSnippet: '',
    language: '',
    cwe: [],
    owasp: [],
    aiExplanation: '',
    aiFix: '',
    exploitationScenario: '',
    exploitScore: severityToScore(severity),
    cvssScore: 0,
    cvssVector: '',
    confidence: 0.6,
    remediation: m.Resolution || '',
    raw: JSON.stringify(m),
  };
}

function normalizeTrivySecret(s: TrivySecret, target: string): UnifiedFinding {
  const severity = normalizeTrivySeverity(s.Severity) || 'HIGH';
  const file = s.Filename || target;
  return {
    fingerprint: fingerprint('trivy', s.RuleID, file, s.StartLine, s.Category),
    scanner: 'trivy',
    ruleId: s.RuleID,
    title: `Secret detected: ${s.Category}`,
    description: `A secret of type ${s.Category} was detected in ${file}`,
    severity,
    category: 'SECRETS',
    file,
    lineStart: s.StartLine || 0,
    lineEnd: s.EndLine || s.StartLine || 0,
    codeSnippet: '',
    language: '',
    cwe: [],
    owasp: [],
    aiExplanation: '',
    aiFix: '',
    exploitationScenario: '',
    exploitScore: severityToScore(severity),
    cvssScore: 0,
    cvssVector: '',
    confidence: 0.9,
    remediation: 'Rotate the exposed secret immediately and use environment variables or a secret manager.',
    raw: JSON.stringify(s),
  };
}

function normalizeTrivySeverity(s: string): Severity {
  const upper = (s || 'MEDIUM').toUpperCase();
  if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(upper)) return upper as Severity;
  if (upper === 'UNKNOWN') return 'INFO';
  return 'MEDIUM';
}

function parseTrivyOutput(json: string, localDir: string): UnifiedFinding[] {
  const findings: UnifiedFinding[] = [];
  try {
    const report: TrivyReport = JSON.parse(json);
    if (!report.Results) return findings;
    for (const result of report.Results) {
      // Vulnerabilities
      if (result.Vulnerabilities) {
        for (const v of result.Vulnerabilities) {
          findings.push(normalizeTrivyVuln(v, result.Target.replace(localDir + '/', '')));
        }
      }
      // Misconfigurations
      if (result.Misconfigurations) {
        const target = result.Target.replace(localDir + '/', '');
        for (const m of result.Misconfigurations) {
          findings.push(normalizeTrivyMisconfig(m, target));
        }
      }
      // Secrets
      if (result.Secrets) {
        const target = result.Target.replace(localDir + '/', '');
        for (const s of result.Secrets) {
          findings.push(normalizeTrivySecret(s, target));
        }
      }
    }
  } catch (e) {
    // Trivy may produce empty or invalid output
  }
  return findings;
}

// ── Gitleaks normalizer ────────────────────────────────────────────────

interface GitleaksFinding {
  RuleID: string;
  Description: string;
  StartLine: number;
  EndLine: number;
  StartColumn: number;
  EndColumn: number;
  Match: string;
  File: string;
  Commit: string;
  Severity: string;
  Author: string;
  Email: string;
  Date: string;
  Fingerprint: string;
}

function parseGitleaksOutput(json: string, localDir: string): UnifiedFinding[] {
  const findings: UnifiedFinding[] = [];
  try {
    const results: GitleaksFinding[] = JSON.parse(json);
    for (const g of results) {
      const severity = normalizeTrivySeverity(g.Severity) || 'HIGH';
      const file = g.File.replace(localDir + '/', '');
      findings.push({
        fingerprint: fingerprint('gitleaks', g.RuleID, file, g.StartLine, g.Description),
        scanner: 'gitleaks',
        ruleId: g.RuleID,
        title: `Secret detected: ${g.RuleID}`,
        description: g.Description || `A secret matching rule ${g.RuleID} was found`,
        severity,
        category: 'SECRETS',
        file,
        lineStart: g.StartLine || 0,
        lineEnd: g.EndLine || g.StartLine || 0,
        codeSnippet: g.Match || '',
        language: '',
        cwe: [],
        owasp: [],
        aiExplanation: '',
        aiFix: '',
        exploitationScenario: '',
        exploitScore: severityToScore(severity),
        cvssScore: 0,
        cvssVector: '',
        confidence: 0.9,
        remediation: 'Rotate the exposed secret immediately and use environment variables or a secret manager.',
        raw: JSON.stringify(g),
      });
    }
  } catch {
    // Gitleaks may produce empty output
  }
  return findings;
}

function severityToScore(severity: string): number {
  switch (severity) {
    case 'CRITICAL': return 9.0;
    case 'HIGH': return 7.0;
    case 'MEDIUM': return 5.0;
    case 'LOW': return 3.0;
    default: return 1.0;
  }
}

// ── Scanner runners ────────────────────────────────────────────────────

function runCommand(command: string, args: string[], cwd: string, timeoutMs: number): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve) => {
    execFile(command, args, { cwd, maxBuffer: 50 * 1024 * 1024, timeout: timeoutMs }, (err, stdout, stderr) => {
      // Gitleaks exits with code 1 when findings are found — that's success
      resolve({ stdout: stdout || '', exitCode: err ? (err as any).code || 1 : 0 });
    });
  });
}

async function runTrivy(localDir: string): Promise<{ findings: UnifiedFinding[]; error: string | null }> {
  try {
    const tmpFile = path.join(os.tmpdir(), `trivy-${Date.now()}.json`);
    const { stdout, exitCode } = await runCommand(
      'trivy',
      ['fs', '--scanners', 'vuln,misconfig,secret', '--format', 'json', localDir],
      localDir,
      120_000,
    );
    if (!stdout.trim()) {
      return { findings: [], error: 'Trivy produced no output' };
    }
    const findings = parseTrivyOutput(stdout, localDir);
    await log(null as any, 'info', 'tool_scan', `Trivy: ${findings.length} findings (exit ${exitCode})`);
    return { findings, error: null };
  } catch (e) {
    return { findings: [], error: `Trivy failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function runGitleaks(localDir: string): Promise<{ findings: UnifiedFinding[]; error: string | null }> {
  try {
    const tmpFile = path.join(os.tmpdir(), `gitleaks-${Date.now()}.json`);
    // Gitleaks requires --report-path for JSON output
    const { exitCode } = await runCommand(
      'gitleaks',
      ['detect', '--source', localDir, '--report-format', 'json', '--report-path', tmpFile, '-v'],
      localDir,
      60_000,
    );
    // Read the JSON report
    let json: string;
    try {
      json = await fs.readFile(tmpFile, 'utf-8');
    } catch {
      // No report file means no findings
      await log(null as any, 'info', 'tool_scan', 'Gitleaks: 0 findings (no report file)');
      return { findings: [], error: null };
    }
    const findings = parseGitleaksOutput(json, localDir);
    // Clean up temp file
    await fs.unlink(tmpFile).catch(() => {});
    await log(null as any, 'info', 'tool_scan', `Gitleaks: ${findings.length} findings (exit ${exitCode})`);
    return { findings, error: null };
  } catch (e) {
    return { findings: [], error: `Gitleaks failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ── AI Enrichment ────────────────────────────────────────────────────────

const TOOL_ENRICHMENT_PROMPT = `You are a security expert enriching findings from automated scanners (Trivy, Gitleaks). For each finding, provide:
- aiExplanation: A detailed technical explanation of why this is a vulnerability, what attack vectors it enables, and the potential impact.
- aiFix: A specific code fix or configuration change to resolve the issue.
- exploitationScenario: A step-by-step scenario for how an attacker could exploit this.
- exploitScore: A score from 0 to 10 indicating exploitability (0 = theoretical, 10 = trivially exploitable).
- cvssScore: An estimated CVSS v3.1 base score from 0.0 to 10.0.
- cvssVector: A CVSS v3.1 vector string (e.g., CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N).
- confidence: Your confidence in this assessment from 0.0 to 1.0.
- remediation: A clear, actionable remediation step.

Return a JSON object with a "findings" array. Each item must have an "index" matching the original finding index, plus the enrichment fields. Do NOT remove or reject any findings — enhance all of them.`;

async function enrichToolFindings(
  findings: UnifiedFinding[],
  nodeConfig: NodeConfig,
  state: ScanState,
): Promise<UnifiedFinding[]> {
  if (findings.length === 0) return findings;

  const provider = createProviderForNode('toolScan', state.config);

  const findingsContext = findings.map((f, i) => ({
    index: i,
    scanner: f.scanner,
    ruleId: f.ruleId,
    title: f.title,
    description: f.description?.slice(0, 300),
    severity: f.severity,
    category: f.category,
    file: f.file,
    lineStart: f.lineStart,
    lineEnd: f.lineEnd,
    codeSnippet: f.codeSnippet?.slice(0, 200),
    language: f.language,
  }));

  const userPrompt = `Enrich these ${findings.length} scanner findings:\n\n${JSON.stringify(findingsContext, null, 2)}`;

  const request: AIRequest = {
    system: TOOL_ENRICHMENT_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: Math.min(findings.length * 300, 4096),
    temperature: 0.2,
    topP: 0.9,
  };

  try {
    const response = await instrumentedSend(provider, request, {
      scanId: state.scanId,
      jobId: state.currentJobId,
      source: 'pipeline',
      node: 'tool_enrichment',
      nodeConfig: nodeConfig as Record<string, unknown>,
    });

    const parsed = parseAiJson<{ findings?: Array<{
      index: number;
      aiExplanation?: string;
      aiFix?: string;
      exploitationScenario?: string;
      exploitScore?: number;
      cvssScore?: number;
      cvssVector?: string;
      confidence?: number;
      remediation?: string;
    }> }>(response.text);

    if (!parsed?.findings) {
      await log(state.scanId, 'warn', 'tool_scan', 'AI enrichment returned no findings, using original');
      return findings;
    }

    const enrichedIndex = new Map(parsed.findings.map(e => [e.index, e]));
    return findings.map((f, i) => {
      const enrichment = enrichedIndex.get(i);
      if (!enrichment) return f;
      return {
        ...f,
        aiExplanation: enrichment.aiExplanation || f.aiExplanation,
        aiFix: enrichment.aiFix || f.aiFix,
        exploitationScenario: enrichment.exploitationScenario || f.exploitationScenario,
        exploitScore: typeof enrichment.exploitScore === 'number' ? enrichment.exploitScore : f.exploitScore,
        cvssScore: typeof enrichment.cvssScore === 'number' ? enrichment.cvssScore : f.cvssScore,
        cvssVector: enrichment.cvssVector || f.cvssVector,
        confidence: typeof enrichment.confidence === 'number' ? enrichment.confidence : f.confidence,
        remediation: enrichment.remediation || f.remediation,
      };
    });
  } catch (err) {
    await log(state.scanId, 'warn', 'tool_scan', `AI enrichment failed: ${err instanceof Error ? err.message : String(err)}. Using original findings.`);
    return findings;
  }
}

// ── Main node ──────────────────────────────────────────────────────────

export async function toolScanNode(state: ScanState): Promise<Partial<ScanState>> {
  const startTime = Date.now();
  const { localDir } = state;
  if (!localDir) {
    return { toolFindings: [], errors: ['tool_scan: no localDir'] };
  }

  await log(state.scanId, 'info', 'tool_scan', `Starting tool scan of ${localDir}`);

  const errors: string[] = [];
  const allFindings: UnifiedFinding[] = [];

  // Run Trivy
  await log(state.scanId, 'info', 'tool_scan', 'Running Trivy...');
  const trivyResult = await runTrivy(localDir);
  if (trivyResult.error) errors.push(trivyResult.error);
  allFindings.push(...trivyResult.findings);

  // Run Gitleaks
  await log(state.scanId, 'info', 'tool_scan', 'Running Gitleaks...');
  const gitleaksResult = await runGitleaks(localDir);
  if (gitleaksResult.error) errors.push(gitleaksResult.error);
  allFindings.push(...gitleaksResult.findings);

  await log(state.scanId, 'success', 'tool_scan', `Tool scan complete: ${allFindings.length} findings (Trivy: ${trivyResult.findings.length}, Gitleaks: ${gitleaksResult.findings.length})`);

  // Enrich tool findings with AI
  const nodeConfig: NodeConfig = state.config.scan.nodes.toolScan;
  const enrichedFindings = await enrichToolFindings(allFindings, nodeConfig, state);
  if (enrichedFindings !== allFindings) {
    await log(state.scanId, 'info', 'tool_scan', `AI enrichment complete: ${enrichedFindings.length} findings enriched`);
  }

  // Incremental persist: upsert enriched findings to DB immediately
  for (const finding of enrichedFindings) {
    try {
      await upsertFinding(finding, state.scanId);
    } catch (err) {
      errors.push(`Failed to persist tool finding ${finding.fingerprint}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  try {
    await prisma.nodeOutput.create({
      data: {
        scanId: state.scanId,
        node: 'tool_scan',
        modelUsed: 'trivy+gitleaks',
        provider: 'system',
        nodeConfig: { provider: 'system', model: 'trivy+gitleaks' } as any,
        inputJson: { dir: localDir } as any,
        outputJson: {
          totalFindings: allFindings.length,
          trivyFindings: trivyResult.findings.length,
          gitleaksFindings: gitleaksResult.findings.length,
          byCategory: allFindings.reduce((acc, f) => { acc[f.category] = (acc[f.category] || 0) + 1; return acc; }, {} as Record<string, number>),
          bySeverity: allFindings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {} as Record<string, number>),
          topFindings: allFindings.slice(0, 20).map(f => ({ scanner: f.scanner, severity: f.severity, category: f.category, title: f.title, file: f.file, line: f.lineStart })),
        } as any,
        durationMs: Date.now() - startTime,
      },
    });
  } catch {
    errors.push('Failed to save NodeOutput for tool_scan');
  }

  return {
    toolFindings: allFindings,
    errors,
  };
}