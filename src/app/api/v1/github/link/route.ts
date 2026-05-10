import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { accessToken } = await request.json();
  if (!accessToken) return NextResponse.json({ error: 'accessToken required' }, { status: 400 });

  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `token ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) return NextResponse.json({ error: 'Invalid GitHub token' }, { status: 401 });
  const ghUser = await res.json();

  const userId = (session.user as any).id;

  const encryptedToken = encrypt(accessToken);

  const profile = await prisma.githubProfile.upsert({
    where: { userId },
    update: { githubId: ghUser.id, username: ghUser.login, accessToken: encryptedToken, avatarUrl: ghUser.avatar_url },
    create: { userId, githubId: ghUser.id, username: ghUser.login, accessToken: encryptedToken, avatarUrl: ghUser.avatar_url },
  });

  return NextResponse.json({ profile: { username: profile.username, avatarUrl: profile.avatarUrl } });
}