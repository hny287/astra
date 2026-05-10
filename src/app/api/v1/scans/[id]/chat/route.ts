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

  const { id: scanId } = await params;
  const messages = await prisma.aiConversation.findMany({
    where: { scanId },
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

  const { id: scanId } = await params;
  const body = await request.json();
  const { content, provider: providerOverride, model: modelOverride } = body;
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const userMsg = await prisma.aiConversation.create({
    data: { scanId, role: 'user', content, userId },
  });

  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  const findingCount = await prisma.finding.count({ where: { scanId } });
  const repoInfo = scan ? `${scan.repoUrl} (${scan.branch})` : 'Unknown repository';

  // Load conversation history from DB
  const history = await prisma.aiConversation.findMany({
    where: { scanId, id: { not: userMsg.id } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  const conversationHistory = history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  let aiText: string;
  try {
    const result = await sendChatMessage(content, {
      scanId,
      userId,
      conversationHistory,
      modelOverride: providerOverride && modelOverride ? { provider: providerOverride, model: modelOverride } : undefined,
      finding: {
        title: `Scan: ${repoInfo}`,
        severity: 'INFO',
        file: 'N/A',
        lineStart: 0,
        lineEnd: 0,
        category: 'SCAN',
        confidence: 1,
        status: scan?.status ?? 'UNKNOWN',
        cwe: [],
        owasp: [],
        exploitationScenario: null,
        remediation: '',
        description: `Security scan of ${repoInfo}. Status: ${scan?.status ?? 'unknown'}. ${findingCount} findings.`,
      },
    });
    aiText = result.text || 'I was unable to generate a response. Please try again.';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    aiText = `I encountered an error: ${message}. Please check your AI configuration.`;
  }

  const aiMsg = await prisma.aiConversation.create({
    data: { scanId, role: 'assistant', content: aiText },
  });

  return NextResponse.json({ messages: [userMsg, aiMsg] });
}