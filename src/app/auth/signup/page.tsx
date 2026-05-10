'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { APP_NAME } from '@/lib/branding';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError('Account created but sign-in failed. Please sign in manually.');
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('An unexpected error occurred');
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    fontFamily: "'IBM Plex Sans', sans-serif" as const,
    letterSpacing: '0.16px',
    background: 'var(--ibm-surface-1)',
    border: '1px solid var(--ibm-hairline)',
    borderBottom: '2px solid var(--ibm-hairline)',
    color: 'var(--ibm-ink)',
    outline: 'none',
    borderRadius: 0,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ibm-canvas)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '48px 32px' }}>
        <h1 className="ibm-display-md" style={{ fontWeight: 300, margin: 0, marginBottom: 8, color: 'var(--ibm-ink)' }}>
          {APP_NAME}
        </h1>
        <p className="ibm-subhead" style={{ margin: 0, marginBottom: 32, color: 'var(--ibm-ink-muted)' }}>
          Create your account
        </p>

        {error && (
          <div style={{ background: 'var(--ibm-red-10)', border: '1px solid var(--ibm-semantic-error)', padding: '12px 16px', marginBottom: 16 }}>
            <span className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-error)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderBottom = '2px solid var(--ibm-primary)'; }}
              onBlur={(e) => { e.target.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderBottom = '2px solid var(--ibm-primary)'; }}
              onBlur={(e) => { e.target.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderBottom = '2px solid var(--ibm-primary)'; }}
              onBlur={(e) => { e.target.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
            />
            <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginTop: 4, display: 'block' }}>Minimum 8 characters</span>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderBottom = '2px solid var(--ibm-primary)'; }}
              onBlur={(e) => { e.target.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: 14,
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.16px',
              background: loading ? 'var(--ibm-primary-pressed)' : 'var(--ibm-primary)',
              color: 'var(--ibm-on-primary)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              borderRadius: 0,
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: 'center' }} className="ibm-body-sm">
          <span style={{ color: 'var(--ibm-ink-muted)' }}>Already have an account? </span>
          <a href="/auth/signin" style={{ color: 'var(--ibm-primary)', textDecoration: 'none' }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}