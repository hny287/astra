'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  githubProfile: { username: string; avatarUrl: string | null } | null;
}

export default function ProfileSettingsClient() {
  const { data: session } = useSession();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (!currentPw || !newPw || !confirmPw) {
      setPwError('All fields are required.');
      return;
    }
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch('/api/v1/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || 'Failed to change password');
      } else {
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        setPwSuccess(true);
      }
    } catch {
      setPwError('Failed to change password');
    }
    setPwSaving(false);
  };

  if (loading) return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading...</p>;
  if (!user) return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Not signed in.</p>;

  const roleLabels: Record<string, string> = { ADMIN: 'Administrator', ANALYST: 'Analyst', VIEWER: 'Viewer' };

  const handleUnlinkGithub = async () => {
    await fetch('/api/v1/github/unlink', { method: 'DELETE' });
    fetchUser();
  };

  const handleLinkedGithub = async () => { fetchUser(); };

  const fieldStyle: React.CSSProperties = {
    padding: '12px 0',
    borderBottom: '1px solid var(--ibm-hairline)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)',
    borderBottom: '2px solid var(--ibm-hairline)', padding: '8px 12px', fontSize: '14px',
    fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ibm-ink)', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>Account</p>
        <div style={fieldStyle}>
          <span className="ibm-label" style={{ color: 'var(--ibm-ink)' }}>Name</span>
          <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)' }}>{user.name}</span>
        </div>
        <div style={fieldStyle}>
          <span className="ibm-label" style={{ color: 'var(--ibm-ink)' }}>Email</span>
          <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)' }}>{user.email}</span>
        </div>
        <div style={fieldStyle}>
          <span className="ibm-label" style={{ color: 'var(--ibm-ink)' }}>Role</span>
          <span style={{
            fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
            padding: '2px 8px', borderLeft: user.role === 'ADMIN' ? '3px solid var(--ibm-primary)' : user.role === 'ANALYST' ? '3px solid var(--ibm-semantic-success)' : '3px solid var(--ibm-ink-subtle)',
            color: user.role === 'ADMIN' ? 'var(--ibm-primary)' : user.role === 'ANALYST' ? 'var(--ibm-semantic-success)' : 'var(--ibm-ink-muted)',
          }}>
            {roleLabels[user.role] || user.role}
          </span>
        </div>
      </div>

      {/* Change Password */}
      <div style={{ padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>Change Password</p>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
          <div>
            <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>Current Password</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
              onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
            />
          </div>
          <div>
            <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>New Password</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
              onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
            />
            <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginTop: 4, display: 'block' }}>Minimum 8 characters</span>
          </div>
          <div>
            <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>Confirm New Password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
              onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
            />
          </div>
          {pwError && <p className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-error)' }}>{pwError}</p>}
          {pwSuccess && <p className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-success)' }}>Password changed successfully.</p>}
          <button type="submit" disabled={pwSaving} style={{
            background: pwSaving ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)', color: pwSaving ? 'var(--ibm-ink-subtle)' : 'var(--ibm-on-primary)',
            border: 'none', padding: '10px 16px', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 600, letterSpacing: '0.16px', cursor: pwSaving ? 'not-allowed' : 'pointer',
          }}>
            {pwSaving ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>

      <div style={{ padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>GitHub</p>
        {user.githubProfile ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {user.githubProfile.avatarUrl && (
                <img src={user.githubProfile.avatarUrl} alt={user.githubProfile.username} style={{ width: 32, height: 32, borderRadius: '50%' }} />
              )}
              <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)' }}>{user.githubProfile.username}</span>
            </div>
            <button type="button" onClick={handleUnlinkGithub} style={{
              background: 'var(--ibm-surface-1)', color: 'var(--ibm-semantic-error)', border: '1px solid var(--ibm-hairline)',
              padding: '8px 16px', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif", cursor: 'pointer',
            }}>Unlink</button>
          </div>
        ) : (
          <GitHubLinkPromptInline onLinked={handleLinkedGithub} />
        )}
      </div>
    </div>
  );
}

function GitHubLinkPromptInline({ onLinked }: { onLinked: () => void }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLink = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/github/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to link GitHub');
      } else {
        onLinked();
      }
    } catch { setError('Failed to link GitHub'); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>
        Link your GitHub account to scan repos directly. You&apos;ll need a Personal Access Token with <code>repo</code> scope.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxx"
          style={{
            flex: 1, background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)',
            borderBottom: '2px solid var(--ibm-hairline)', padding: '8px 12px', fontSize: '14px',
            fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ibm-ink)', outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
          onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
        />
        <button type="button" onClick={handleLink} disabled={loading || !token.trim()} style={{
          background: loading || !token.trim() ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)',
          color: loading || !token.trim() ? 'var(--ibm-ink-subtle)' : 'var(--ibm-on-primary)',
          border: 'none', padding: '8px 16px', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif",
          cursor: loading || !token.trim() ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'Linking...' : 'Link GitHub'}
        </button>
      </div>
      {error && <p className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-error)' }}>{error}</p>}
    </div>
  );
}