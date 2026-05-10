import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { sendChatMessage } from '@/lib/ai-chat';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { limit, offset } = parsePagination(request, 50);

  const [messages, total] = await Promise.all([
    prisma.aiConversation.findMany({
      where: { userId, scanId: null, findingId: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.aiConversation.count({ where: { userId, scanId: null, findingId: null } }),
  ]);

  return NextResponse.json({ messages, total, limit, offset });
}

export async function POST(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { content, provider: providerOverride, model: modelOverride } = body;
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

  const userMsg = await prisma.aiConversation.create({
    data: { userId, role: 'user', content },
  });

  // Load conversation history from DB
  const history = await prisma.aiConversation.findMany({
    where: { userId, scanId: null, findingId: null, id: { not: userMsg.id } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  const conversationHistory = history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  let aiText: string;
  try {
    const result = await sendChatMessage(content, {
      userId,
      conversationHistory,
      modelOverride: providerOverride && modelOverride ? { provider: providerOverride, model: modelOverride } : undefined,
    });
    aiText = result.text || 'I was unable to generate a response. Please try again.';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    aiText = `I encountered an error processing your request: ${message}. Please try again or check your AI configuration in Settings → Configuration.`;
  }

  const aiMsg = await prisma.aiConversation.create({
    data: { userId, role: 'assistant', content: aiText },
  });

  return NextResponse.json({ messages: [userMsg, aiMsg] });
}