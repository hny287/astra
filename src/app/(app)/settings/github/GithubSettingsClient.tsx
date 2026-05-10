'use client';

import { useState } from 'react';
import GitHubLinkPrompt from '@/components/GitHubLinkPrompt';

interface GithubProfile {
  username: string;
  avatarUrl: string | null;
}

interface GithubSettingsClientProps {
  githubProfile: GithubProfile | null;
  initialRepoCount: number;
}

export default function GithubSettingsClient({ githubProfile: initialProfile, initialRepoCount }: GithubSettingsClientProps) {
  const [githubProfile, setGithubProfile] = useState<GithubProfile | null>(initialProfile);
  const [repoCount, setRepoCount] = useState(initialRepoCount);
  const [unlinking, setUnlinking] = useState(false);

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await fetch('/api/v1/github/unlink', { method: 'DELETE' });
      setGithubProfile(null);
      setRepoCount(0);
    } finally {
      setUnlinking(false);
    }
  };

  const handleLinked = async () => {
    const res = await fetch('/api/v1/github/repos');
    if (res.ok) {
      const data = await res.json();
      setRepoCount(data.repos?.length ?? 0);
      setGithubProfile({ username: 'Linked', avatarUrl: null });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {githubProfile ? (
        <div style={{ padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
          <p className="ibm-eyebrow" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>Connected Account</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            {githubProfile.avatarUrl && (
              <img
                src={githubProfile.avatarUrl}
                alt={githubProfile.username}
                style={{ width: 48, height: 48, borderRadius: '50%' }}
              />
            )}
            <div>
              <p className="ibm-body" style={{ color: 'var(--ibm-ink)' }}>{githubProfile.username}</p>
              <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>
                {repoCount} repos accessible
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={unlinking}
            style={{
              background: unlinking ? 'var(--ibm-surface-2)' : 'var(--ibm-surface-1)',
              color: 'var(--ibm-semantic-error)',
              border: '1px solid var(--ibm-hairline)',
              padding: '10px 16px',
              fontSize: '14px',
              fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
              cursor: unlinking ? 'not-allowed' : 'pointer',
            }}
          >
            {unlinking ? 'Unlinking...' : 'Unlink GitHub'}
          </button>
        </div>
      ) : (
        <GitHubLinkPrompt onLinked={handleLinked} />
      )}
    </div>
  );
}