'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { APP_NAME } from '@/lib/branding';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError('Invalid email or password');
    } else {
      window.location.href = '/scans';
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ibm-canvas)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '48px 32px' }}>
        <h1 className="ibm-display-lg" style={{ fontWeight: 300, margin: 0, marginBottom: 8, color: 'var(--ibm-ink)' }}>
          {APP_NAME}
        </h1>
        <p className="ibm-subhead" style={{ margin: 0, marginBottom: 32, color: 'var(--ibm-ink-muted)' }}>
          Sign in to your account
        </p>

        {error && (
          <div style={{ background: 'var(--ibm-red-10)', border: '1px solid var(--ibm-semantic-error)', padding: '12px 16px', marginBottom: 16 }}>
            <span className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-error)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 14,
                fontFamily: "'IBM Plex Sans', sans-serif",
                letterSpacing: '0.16px',
                background: 'var(--ibm-surface-1)',
                border: '1px solid var(--ibm-hairline)',
                borderBottom: '2px solid var(--ibm-hairline)',
                color: 'var(--ibm-ink)',
                outline: 'none',
                borderRadius: 0,
              }}
              onFocus={(e) => { e.target.style.borderBottom = '2px solid var(--ibm-primary)'; }}
              onBlur={(e) => { e.target.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="ibm-label" style={{ display: 'block', marginBottom: 6, color: 'var(--ibm-ink-muted)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 14,
                fontFamily: "'IBM Plex Sans', sans-serif",
                letterSpacing: '0.16px',
                background: 'var(--ibm-surface-1)',
                border: '1px solid var(--ibm-hairline)',
                borderBottom: '2px solid var(--ibm-hairline)',
                color: 'var(--ibm-ink)',
                outline: 'none',
                borderRadius: 0,
              }}
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}