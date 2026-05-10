'use client';

import Link from 'next/link';
import { APP_NAME } from '@/lib/branding';

const SETTINGS_SECTIONS = [
  {
    href: '/settings/profile',
    title: 'Profile',
    description: 'View your account details, role, and manage your personal information.',
  },
  {
    href: '/settings/github',
    title: 'GitHub',
    description: `Link your GitHub account to scan repositories directly from ${APP_NAME}.`,
  },
  {
    href: '/settings/users',
    title: 'User management',
    description: 'Create, edit, and manage team members and their roles. Admin only.',
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="ibm-display-md" style={{ color: 'var(--ibm-ink)', marginBottom: 8 }}>Settings</h1>
      <p className="ibm-body-lg" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 48 }}>
        Manage your account, integrations, and team.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 0 }}>
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            style={{
              display: 'block',
              padding: 32,
              background: 'var(--ibm-canvas)',
              border: '1px solid var(--ibm-hairline)',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ibm-surface-1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ibm-canvas)'; }}
          >
            <h2 className="ibm-card-title" style={{ color: 'var(--ibm-ink)', marginBottom: 8 }}>{section.title}</h2>
            <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', lineHeight: 1.5 }}>{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}