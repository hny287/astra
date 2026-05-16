'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { APP_NAME, APP_TITLE } from '@/lib/branding';
import ThemeToggle from './ThemeToggle';
import AiChatProvider, { useAiChat } from './AiChatProvider';
import AppDataProvider from './AppDataProvider';
import { ReactNode } from 'react';

const NAV_LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: '/scans', label: 'Scans' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/observability', label: 'Observability' },
  { href: '/config', label: 'Configuration' },
  { href: '/rules', label: 'Rules' },
  { href: '/knowledge', label: 'Knowledge' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AiChatProvider>
      <AppDataProvider>
        <AppShellInner>{children}</AppShellInner>
      </AppDataProvider>
    </AiChatProvider>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/scans' && pathname === '/') return false;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Utility bar */}
      <div style={{
        background: 'var(--ibm-surface-1)',
        borderBottom: '1px solid var(--ibm-hairline)',
        height: 32,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
      }}>
        <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>
          {APP_NAME} v2.0
        </span>
        <span style={{ margin: '0 12px', color: 'var(--ibm-hairline)' }}>|</span>
        <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>
          AI-native code security
        </span>
      </div>

      {/* Top nav */}
      <nav style={{
        background: 'var(--ibm-canvas)',
        borderBottom: '1px solid var(--ibm-hairline)',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: 1584,
          margin: '0 auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <Link
              href="/scans"
              style={{
                color: 'var(--ibm-ink)',
                textDecoration: 'none',
                fontWeight: 300,
                fontSize: 22,
                letterSpacing: '-0.01em',
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              {APP_NAME}
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {NAV_LINKS.map((link) => (
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ibm-body-sm"
                    style={{
                      color: 'var(--ibm-ink-muted)',
                      textDecoration: 'none',
                      padding: '12px 16px',
                      borderBottom: '2px solid transparent',
                      fontWeight: 400,
                    }}
                  >
                    {link.label}
                  </a>
                ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="ibm-body-sm"
                  style={{
                    color: isActive(link.href) ? 'var(--ibm-primary)' : 'var(--ibm-ink-muted)',
                    textDecoration: 'none',
                    padding: '12px 16px',
                    borderBottom: isActive(link.href) ? '2px solid var(--ibm-primary)' : '2px solid transparent',
                    fontWeight: isActive(link.href) ? 600 : 400,
                  }}
                >
                  {link.label}
                </Link>
                )
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThemeToggle />
            {session?.user ? (
              <UserMenu />
            ) : (
              <Link
                href="/auth/signin"
                style={{
                  background: 'var(--ibm-primary)',
                  color: 'var(--ibm-on-primary)',
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 400,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  letterSpacing: '0.16px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ background: 'var(--ibm-canvas)' }}>
        <div style={{ maxWidth: 1584, margin: '0 auto', width: '100%', padding: '32px 32px 64px' }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: 'var(--ibm-footer-bg)',
        padding: '48px 32px',
      }}>
        <div style={{
          maxWidth: 1584,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span className="ibm-body-sm" style={{ color: 'var(--ibm-footer-ink)' }}>
            {APP_TITLE}
          </span>
          <span className="ibm-caption" style={{ color: 'var(--ibm-footer-ink-subtle)' }}>
            AI-native code security analysis
          </span>
        </div>
      </footer>
    </div>
  );
}

function UserMenu() {
  const { data: session } = useSession();
  const name = session?.user?.name || 'User';
  const initials = name.charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Link
        href="/settings"
        className="ibm-body-sm"
        style={{
          color: 'var(--ibm-ink-muted)',
          textDecoration: 'none',
          padding: '8px 12px',
        }}
      >
        Settings
      </Link>
      <div style={{
        width: 28,
        height: 28,
        background: 'var(--ibm-primary)',
        color: 'var(--ibm-on-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.16px',
      }}>
        {initials}
      </div>
      <button
        onClick={() => signOut()}
        style={{
          background: 'transparent',
          border: '1px solid var(--ibm-hairline)',
          padding: '4px 12px',
          fontSize: 12,
          fontFamily: "'IBM Plex Sans', sans-serif",
          letterSpacing: '0.16px',
          color: 'var(--ibm-ink-muted)',
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>
    </div>
  );
}