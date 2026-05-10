import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { getGithubBranches } from '@/lib/github';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const owner = request.nextUrl.searchParams.get('owner');
  const repo = request.nextUrl.searchParams.get('repo');
  if (!owner || !repo) return NextResponse.json({ error: 'owner and repo required' }, { status: 400 });

  const userId = (session.user as any).id;
  const profile = await prisma.githubProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: 'GitHub not linked' }, { status: 400 });

  const accessToken = decrypt(profile.accessToken);
  const branches = await getGithubBranches(accessToken, owner, repo);
  return NextResponse.json({ branches });
}