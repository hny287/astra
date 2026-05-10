import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canWrite } from '@/lib/rbac';
import { sendChatMessage } from '@/lib/ai-chat';

export async function POST(request: NextRequest) {
  const { error, role } = await requireAuth();
  if (error) return error;
  if (!canWrite(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const findings = await prisma.finding.findMany({
    where: {
      severity: { in: ['HIGH', 'CRITICAL'] },
      status: 'OPEN',
      task: { is: null },
    },
    include: { scan: { select: { repoUrl: true, branch: true } } },
  });

  if (findings.length === 0) {
    return NextResponse.json({ suggestions: [], message: 'No untriaged high/critical findings found' });
  }

  const summary = findings.map((f, i) => {
    const parts = [
      `${i + 1}. [${f.severity}] ${f.title}`,
      `   File: ${f.file}:${f.lineStart}-${f.lineEnd}`,
      `   Category: ${f.category}`,
    ];
    if (f.cwe.length > 0) parts.push(`   CWE: ${f.cwe.join(', ')}`);
    if (f.owasp.length > 0) parts.push(`   OWASP: ${f.owasp.join(', ')}`);
    if (f.description) parts.push(`   Description: ${f.description.substring(0, 200)}`);
    if (f.remediation) parts.push(`   Remediation: ${f.remediation.substring(0, 200)}`);
    parts.push(`   Repo: ${f.scan?.repoUrl ?? 'unknown'} (${f.scan?.branch ?? 'main'})`);
    return parts.join('\n');
  }).join('\n\n');

  const systemPrompt = 'You are a security task management assistant. Analyze the following security findings and suggest task groupings for remediation and triage. For each suggested task, provide: a concise title, the type (FINDING_TRIAGE, REMEDIATION, or MANUAL_REVIEW), the priority (CRITICAL, HIGH, MEDIUM, or LOW), which finding numbers it covers, and a brief description of what should be done. Group related findings together when possible. Respond in JSON format as an array of task suggestions.';

  try {
    const response = await sendChatMessage(summary, { finding: undefined as any });
    return NextResponse.json({ suggestions: response.text, findingsCount: findings.length, inputTokens: response.inputTokens, outputTokens: response.outputTokens });
  } catch (err: any) {
    return NextResponse.json({ error: 'AI suggestion failed', details: err.message }, { status: 500 });
  }
}