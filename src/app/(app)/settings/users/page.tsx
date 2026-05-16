'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLE_COLORS: Record<string, { border: string; text: string }> = {
  ADMIN: { border: 'var(--ibm-primary)', text: 'var(--ibm-primary)' },
  ANALYST: { border: 'var(--ibm-semantic-success)', text: 'var(--ibm-semantic-success)' },
  VIEWER: { border: 'var(--ibm-ink-subtle)', text: 'var(--ibm-ink-muted)' },
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  // Reset password modal state
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAddError(data.error || 'Failed to create user');
      } else {
        setShowAdd(false);
        setName('');
        setEmail('');
        setPassword('');
        setRole('VIEWER');
        fetchUsers();
      }
    } catch { setAddError('Failed to create user'); }
    setAdding(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    await fetch(`/api/v1/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user?')) return;
    await fetch(`/api/v1/users/${userId}`, { method: 'DELETE' });
    fetchUsers();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !resetPw) return;
    setResetError('');
    setResetSuccess(false);
    if (resetPw.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    setResetSaving(true);
    try {
      const res = await fetch(`/api/v1/users/${resetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPw }),
      });
      if (!res.ok) {
        const data = await res.json();
        setResetError(data.error || 'Failed to reset password');
      } else {
        setResetSuccess(true);
        setResetPw('');
        setTimeout(() => {
          setResetUser(null);
          setResetSuccess(false);
        }, 1500);
      }
    } catch {
      setResetError('Failed to reset password');
    }
    setResetSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)',
    borderBottom: '2px solid var(--ibm-hairline)', padding: '8px 12px', fontSize: '14px',
    fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ibm-ink)', outline: 'none',
  };

  if (loading) return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="ibm-headline" style={{ color: 'var(--ibm-ink)' }}>User Management</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          background: 'var(--ibm-primary)', color: 'var(--ibm-on-primary)', border: 'none',
          padding: '10px 16px', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif",
          fontWeight: 600, letterSpacing: '0.16px', cursor: 'pointer',
        }}>
          {showAdd ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showAdd && (
        <div style={{ padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
          <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
                onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
              />
            </div>
            <div>
              <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
                onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
              />
            </div>
            <div>
              <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
                onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
              />
              <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginTop: 4, display: 'block' }}>Minimum 8 characters</span>
            </div>
            <div>
              <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} style={{
                ...inputStyle, appearance: 'none', WebkitAppearance: 'none',
              }}>
                <option value="VIEWER">Viewer</option>
                <option value="ANALYST">Analyst</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            {addError && <p className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-error)' }}>{addError}</p>}
            <button type="submit" disabled={adding} style={{
              background: adding ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)', color: adding ? 'var(--ibm-ink-subtle)' : 'var(--ibm-on-primary)',
              border: 'none', padding: '10px 16px', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif",
              fontWeight: 600, letterSpacing: '0.16px', cursor: adding ? 'not-allowed' : 'pointer',
            }}>
              {adding ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      <div style={{ border: '1px solid var(--ibm-hairline)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 140px', padding: '10px 16px', background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>Name</span>
          <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>Email</span>
          <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>Role</span>
          <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', textAlign: 'right' }}>Actions</span>
        </div>
        {users.length === 0 ? (
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)', padding: 16 }}>No users yet.</p>
        ) : users.map(u => {
          const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.VIEWER;
          return (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 140px', padding: '10px 16px', alignItems: 'center', borderBottom: '1px solid var(--ibm-hairline)' }}>
              <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)' }}>{u.name}</span>
              <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>{u.email}</span>
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                style={{
                  fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
                  padding: '2px 8px', borderLeft: `3px solid ${rc.border}`, color: rc.text,
                  background: 'transparent', border: 'none',
                  fontFamily: "'IBM Plex Sans', sans-serif", cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="VIEWER">Viewer</option>
                <option value="ANALYST">Analyst</option>
                <option value="ADMIN">Admin</option>
              </select>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { setResetUser(u); setResetPw(''); setResetError(''); setResetSuccess(false); }} style={{
                  background: 'transparent', border: 'none', color: 'var(--ibm-primary)',
                  fontSize: '12px', fontFamily: "'IBM Plex Sans', sans-serif", cursor: 'pointer',
                }}>Reset PW</button>
                <button onClick={() => handleDelete(u.id)} style={{
                  background: 'transparent', border: 'none', color: 'var(--ibm-semantic-error)',
                  fontSize: '12px', fontFamily: "'IBM Plex Sans', sans-serif", cursor: 'pointer',
                }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset Password Modal */}
      {resetUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setResetUser(null); } }}>
          <div style={{ background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', width: 400, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 4 }}>
              Reset Password
            </h3>
            <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 24 }}>
              Set a new password for <strong>{resetUser.name}</strong> ({resetUser.email})
            </p>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>New Password</label>
                <input type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} required minLength={8} style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
                />
                <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginTop: 4, display: 'block' }}>Minimum 8 characters</span>
              </div>
              {resetError && <p className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-error)' }}>{resetError}</p>}
              {resetSuccess && <p className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-success)' }}>Password reset successfully.</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setResetUser(null)} style={{
                  background: 'var(--ibm-surface-1)', color: 'var(--ibm-ink)', border: '1px solid var(--ibm-hairline)',
                  padding: '8px 16px', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif", cursor: 'pointer',
                }}>Cancel</button>
                <button type="submit" disabled={resetSaving} style={{
                  background: resetSaving ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)', color: resetSaving ? 'var(--ibm-ink-subtle)' : 'var(--ibm-on-primary)',
                  border: 'none', padding: '8px 16px', fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 600, cursor: resetSaving ? 'not-allowed' : 'pointer',
                }}>
                  {resetSaving ? 'Saving...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}