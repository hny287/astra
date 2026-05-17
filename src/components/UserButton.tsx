'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function UserButton() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!session?.user) return null;

  const { name, email } = session.user;
  const role = (session.user as any).role;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: '1px solid var(--ibm-hairline)',
          borderBottom: '2px solid var(--ibm-primary)',
          padding: '4px 12px',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        <div style={{
          width: 24,
          height: 24,
          background: 'var(--ibm-primary)',
          color: 'var(--ibm-on-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.16px',
          borderRadius: 0,
        }}>
          {name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>{name}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          marginTop: 4,
          background: 'var(--ibm-canvas)',
          border: '1px solid var(--ibm-hairline)',
          minWidth: 200,
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--ibm-hairline)' }}>
            <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{name}</div>
            <div className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginTop: 2 }}>{email}</div>
            <div className="ibm-caption" style={{ color: 'var(--ibm-primary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.32px' }}>{role}</div>
          </div>
          <a
            href="/settings"
            className="ibm-body-sm"
            style={{ display: 'block', padding: '8px 16px', color: 'var(--ibm-ink-muted)', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--ibm-surface-1)'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
          >
            Settings
          </a>
          <button
            onClick={() => signOut({ callbackUrl: window.location.origin })}
            className="ibm-body-sm"
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 16px',
              color: 'var(--ibm-semantic-error)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--ibm-surface-1)'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}