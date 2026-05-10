import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { getGithubRepos } from '@/lib/github';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const profile = await prisma.githubProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: 'GitHub not linked' }, { status: 400 });

  const accessToken = decrypt(profile.accessToken);
  const repos = await getGithubRepos(accessToken);
  return NextResponse.json({ repos });
}