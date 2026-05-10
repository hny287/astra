import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateReportHtml } from '@/scan/reports/html';
import { generateReportMarkdown } from '@/scan/reports/markdown';
import type { ReportData } from '@/scan/reports/types';
import { requireAuth, requireScanOwnership } from '@/lib/rbac';
import { DOWNLOAD_PREFIX, SARIF_TOOL_NAME, SARIF_INFO_URI } from '@/lib/branding';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const ownershipError = await requireScanOwnership(id, userId!, role!);
  if (ownershipError) return ownershipError;
  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  const findings = await prisma.finding.findMany({ where: { scanId: id } });
  const rules = await prisma.businessLogicRule.findMany({ where: { scanId: id } });

  const url = new URL(request.url);
  const format = url.searchParams.get('format') ?? 'json';

  const reportData: ReportData = {
    scan: {
      id: scan.id,
      repoUrl: scan.repoUrl,
      branch: scan.branch,
      status: scan.status,
      createdAt: scan.createdAt.toISOString(),
      durationSeconds: scan.durationSeconds,
      totalInputTokens: scan.totalInputTokens,
      totalOutputTokens: scan.totalOutputTokens,
    },
    findings: findings.map(f => ({
      id: f.id,
      status: f.status,
      assignedToId: f.assignedToId,
      title: f.title,
      severity: f.severity,
      category: f.category,
      file: f.file,
      lineStart: f.lineStart,
      lineEnd: f.lineEnd,
      codeSnippet: f.codeSnippet,
      aiExplanation: f.aiExplanation,
      aiFix: f.aiFix,
      exploitationScenario: f.exploitationScenario,
      cwe: f.cwe,
      owasp: f.owasp,
      exploitScore: f.exploitScore ?? 5,
      confidence: f.confidence,
      description: f.description,
      remediation: f.remediation,
      scanner: f.scanner,
      language: f.language,
    })),
    businessRules: rules.map(r => ({
      ruleText: r.ruleText,
      confidence: r.confidence,
      evidenceFiles: r.evidenceFiles,
      status: r.status,
      violationDescription: r.violationDescription,
    })),
  };

  if (format === 'csv') {
    const header = 'severity,category,scanner,ruleId,title,file,lineStart,lineEnd,confidence,exploitationScenario,cwe,owasp,status,assignedToId\n';
    const rows = findings.map(f =>
      `"${f.severity}","${f.category}","${f.scanner}","${f.ruleId}","${(f.title || '').replace(/"/g, '""')}","${f.file}",${f.lineStart},${f.lineEnd},${f.confidence},"${(f.exploitationScenario || '').replace(/"/g, '""')}","${f.cwe.join(';')}","${f.owasp.join(';')}","${f.status}","${f.assignedToId ?? ''}"`
    ).join('\n');
    return new NextResponse(header + rows, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${DOWNLOAD_PREFIX}-${id}.csv"` },
    });
  }

  if (format === 'markdown') {
    const md = generateReportMarkdown(reportData);
    return new NextResponse(md, {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="${DOWNLOAD_PREFIX}-${id}.md"` },
    });
  }

  if (format === 'html') {
    const html = generateReportHtml(reportData);
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename="${DOWNLOAD_PREFIX}-${id}.html"` },
    });
  }

  if (format === 'sarif') {
    const sarif = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [{
        tool: {
          driver: {
            name: SARIF_TOOL_NAME,
            version: '1.0.0',
            informationUri: SARIF_INFO_URI,
            rules: findings.map(f => ({
              id: f.ruleId,
              shortDescription: { text: f.title },
              properties: { category: f.category, severity: f.severity },
            })),
          },
        },
        results: findings.map(f => ({
          ruleId: f.ruleId,
          level: f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'error' : f.severity === 'MEDIUM' ? 'warning' : 'note',
          message: { text: f.aiExplanation || f.description || f.title },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: f.file },
              region: { startLine: f.lineStart, endLine: f.lineEnd || f.lineStart },
            },
          }],
          properties: { confidence: f.confidence, exploitScore: f.exploitScore, exploitationScenario: f.exploitationScenario, cwe: f.cwe, owasp: f.owasp, status: f.status, assignedToId: f.assignedToId },
        })),
      }],
    };
    return NextResponse.json(sarif, {
      headers: { 'Content-Disposition': `attachment; filename="${DOWNLOAD_PREFIX}-${id}.sarif.json"` },
    });
  }

  return NextResponse.json(reportData);
}