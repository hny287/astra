'use client';

import CHANGELOG, { ChangelogEntry } from '@/lib/changelog';
import { APP_NAME } from '@/lib/branding';

const CATEGORY_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  'New': { border: 'var(--ibm-primary)', bg: 'var(--ibm-blue-10)', text: 'var(--ibm-primary)' },
  'Changed': { border: 'var(--ibm-semantic-warning)', bg: 'var(--ibm-yellow-10)', text: 'var(--ibm-semantic-warning)' },
  'Fixed': { border: 'var(--ibm-semantic-success)', bg: 'var(--ibm-green-10)', text: 'var(--ibm-semantic-success)' },
  'Security Fixes': { border: 'var(--ibm-semantic-error)', bg: 'var(--ibm-red-10)', text: 'var(--ibm-semantic-error)' },
  'Bug Fixes': { border: 'var(--ibm-semantic-error)', bg: 'var(--ibm-red-10)', text: 'var(--ibm-semantic-error)' },
  'Removed': { border: 'var(--ibm-ink-subtle)', bg: 'var(--ibm-surface-1)', text: 'var(--ibm-ink-muted)' },
  'Deprecated': { border: 'var(--ibm-ink-subtle)', bg: 'var(--ibm-surface-1)', text: 'var(--ibm-ink-muted)' },
  'Security': { border: 'var(--ibm-semantic-error)', bg: 'var(--ibm-red-10)', text: 'var(--ibm-semantic-error)' },
  'Performance': { border: 'var(--ibm-semantic-success)', bg: 'var(--ibm-green-10)', text: 'var(--ibm-semantic-success)' },
  'Improved': { border: 'var(--ibm-primary)', bg: 'var(--ibm-blue-10)', text: 'var(--ibm-primary)' },
};

function EntryCard({ entry, isLatest }: { entry: ChangelogEntry; isLatest: boolean }) {
  return (
    <div style={{
      borderLeft: isLatest ? '3px solid var(--ibm-primary)' : '1px solid var(--ibm-hairline)',
      background: isLatest ? 'var(--ibm-blue-10)' : 'var(--ibm-canvas)',
      padding: 32,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 500,
          color: isLatest ? 'var(--ibm-primary)' : 'var(--ibm-ink)', letterSpacing: '0.16px',
        }}>
          v{entry.version}
        </span>
        {isLatest && (
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
            padding: '2px 8px', background: 'var(--ibm-primary)', color: 'var(--ibm-on-primary)',
          }}>
            Latest
          </span>
        )}
        <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>
          {new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <h2 className="ibm-card-title" style={{ color: 'var(--ibm-ink)', marginBottom: 4 }}>
        {entry.title}
      </h2>
      <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 24, lineHeight: 1.5 }}>
        {entry.description}
      </p>

      {entry.categories.map((cat, ci) => {
        const style = CATEGORY_STYLES[cat.label] ?? CATEGORY_STYLES['New'];
        return (
          <div key={ci} style={{ marginBottom: ci < entry.categories.length - 1 ? 20 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
                padding: '2px 8px', borderLeft: `3px solid ${style.border}`, color: style.text,
              }}>
                {cat.label}
              </span>
              <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>
                {cat.items.length} {cat.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 20px', listStyle: 'none' }}>
              {cat.items.map((item, ii) => (
                <li key={ii} style={{ marginBottom: 6, position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: -14, top: 8,
                    width: 4, height: 4, background: style.border, display: 'inline-block',
                  }} />
                  <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 48 }}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>
          Changelog
        </p>
        <h1 className="ibm-display-md" style={{ color: 'var(--ibm-ink)', marginBottom: 8 }}>
          Release history
        </h1>
        <p className="ibm-body-lg" style={{ color: 'var(--ibm-ink-muted)' }}>
          All notable changes to {APP_NAME}, organized by release.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {CHANGELOG.map((entry, i) => (
          <EntryCard key={entry.version} entry={entry} isLatest={i === 0} />
        ))}
      </div>
    </div>
  );
}