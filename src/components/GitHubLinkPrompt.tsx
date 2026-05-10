'use client';

import { useState } from 'react';

interface GitHubLinkPromptProps {
  onLinked: () => void;
}

export default function GitHubLinkPrompt({ onLinked }: GitHubLinkPromptProps) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--ibm-surface-1)',
    border: '1px solid var(--ibm-hairline)',
    borderBottom: '1px solid var(--ibm-hairline-strong)',
    padding: '11px 16px',
    fontSize: '16px',
    fontWeight: 400,
    letterSpacing: '0.16px',
    lineHeight: 1.5,
    color: 'var(--ibm-ink)',
    outline: 'none',
    fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
  };

  const handleLink = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/github/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to link GitHub');
      }
      setToken('');
      onLinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)' }}>
      <p className="ibm-label" style={{ color: 'var(--ibm-ink)', marginBottom: 12 }}>Link your GitHub account</p>
      <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>
        Connect your GitHub account to scan your repositories directly.
      </p>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="gh-pat" className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', display: 'block', marginBottom: 8 }}>
          Personal Access Token
        </label>
        <input
          id="gh-pat"
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          disabled={loading}
          style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
          onBlur={e => { e.currentTarget.style.borderBottom = '1px solid var(--ibm-hairline-strong)'; }}
        />
      </div>
      <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginBottom: 16 }}>
        Requires the <span style={{ fontWeight: 600, color: 'var(--ibm-ink-muted)' }}>repo</span> scope to access your repositories. Your token is stored securely and used only for API access.
      </p>
      {error && (
        <div style={{ padding: 12, background: 'var(--ibm-red-10)', border: '1px solid var(--ibm-semantic-error)', borderLeft: '3px solid var(--ibm-semantic-error)', marginBottom: 12 }}>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-error)' }}>{error}</p>
        </div>
      )}
      <button
        type="button"
        onClick={handleLink}
        disabled={loading || !token.trim()}
        style={{
          background: loading || !token.trim() ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)',
          color: loading || !token.trim() ? 'var(--ibm-ink-subtle)' : '#ffffff',
          fontSize: '14px',
          fontWeight: 400,
          letterSpacing: '0.16px',
          lineHeight: 1.29,
          padding: '12px 16px',
          border: 'none',
          cursor: loading || !token.trim() ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
          fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        {loading ? 'Linking...' : 'Link GitHub'}
      </button>
    </div>
  );
}