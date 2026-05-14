import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { sendChatMessage } from '@/lib/ai-chat';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id: findingId } = await params;
  const messages = await prisma.aiConversation.findMany({
    where: { findingId },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { id: findingId } = await params;
  const body = await request.json();
  const { content, provider: providerOverride, model: modelOverride } = body;
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const userMsg = await prisma.aiConversation.create({
    data: { findingId, role: 'user', content, userId },
  });

  const finding = await prisma.finding.findUnique({ where: { id: findingId } });
  if (!finding) return NextResponse.json({ error: 'finding not found' }, { status: 404 });

  // Load conversation history from DB
  const history = await prisma.aiConversation.findMany({
    where: { findingId, id: { not: userMsg.id } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  const conversationHistory = history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  let aiText: string;
  try {
    const result = await sendChatMessage(content, {
      scanId: finding.scanId ?? undefined,
      findingId,
      userId,
      conversationHistory,
      modelOverride: providerOverride && modelOverride ? { provider: providerOverride, model: modelOverride } : undefined,
      finding: {
        title: finding.title,
        severity: finding.severity,
        file: finding.file,
        lineStart: finding.lineStart,
        lineEnd: finding.lineEnd,
        category: finding.category,
        confidence: finding.confidence,
        status: finding.status,
        cwe: finding.cwe,
        owasp: finding.owasp,
        exploitationScenario: finding.exploitationScenario,
        remediation: finding.remediation,
        description: finding.description,
        aiExplanation: finding.aiExplanation,
        aiFix: finding.aiFix,
        exploitScore: finding.exploitScore,
        cvssScore: finding.cvssScore,
        codeSnippet: finding.codeSnippet,
      },
    });
    aiText = result.text || 'I was unable to generate a response. Please try again.';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    aiText = `I encountered an error: ${message}. Please check your AI configuration in Settings → Configuration.`;
  }

  const aiMsg = await prisma.aiConversation.create({
    data: { findingId, role: 'assistant', content: aiText },
  });

  return NextResponse.json({ messages: [userMsg, aiMsg] });
}