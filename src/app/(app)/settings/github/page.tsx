import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import GithubSettingsClient from './GithubSettingsClient';

export default async function GithubSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const userId = (session.user as any).id;
  const profile = await prisma.githubProfile.findUnique({ where: { userId } });

  let repoCount = 0;
  if (profile) {
    try {
      const { getGithubRepos } = await import('@/lib/github');
      const repos = await getGithubRepos(profile.accessToken);
      repoCount = repos.length;
    } catch {
      repoCount = 0;
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="ibm-headline" style={{ color: 'var(--ibm-ink)', marginBottom: 32 }}>GitHub</h1>
      <GithubSettingsClient
        githubProfile={profile ? { username: profile.username, avatarUrl: profile.avatarUrl } : null}
        initialRepoCount={repoCount}
      />
    </div>
  );
}