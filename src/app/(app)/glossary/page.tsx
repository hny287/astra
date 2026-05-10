'use client';

import { useState } from 'react';
import { FILE_TREE, FileEntry } from '@/lib/file-tree';

const BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  exp: { bg: 'rgba(15,98,220,0.08)', text: '#0f62fe', border: 'rgba(15,98,220,0.25)' },
  db: { bg: 'rgba(200,148,0,0.08)', text: '#c89400', border: 'rgba(200,148,0,0.25)' },
  api: { bg: 'rgba(34,161,92,0.08)', text: '#22a15c', border: 'rgba(34,161,92,0.25)' },
  auth: { bg: 'rgba(200,50,50,0.08)', text: '#c83232', border: 'rgba(200,50,50,0.25)' },
};

function Badge({ label, type }: { label: string; type: 'exp' | 'db' | 'api' | 'auth' }) {
  const c = BADGE_COLORS[type];
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '2px 7px', border: `1px solid ${c.border}`, background: c.bg, color: c.text,
    }}>
      {label}
    </span>
  );
}

function TreeItem({ entry, depth = 0 }: { entry: FileEntry; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const isDir = entry.type === 'dir';
  const name = entry.path.split('/').filter(Boolean).pop() || entry.path;
  const hasChildren = isDir && entry.children && entry.children.length > 0;
  const hasDetail = !isDir && entry.purpose;

  const badges: { label: string; type: 'exp' | 'db' | 'api' | 'auth' }[] = [];
  if (entry.exports?.length) badges.push({ label: `${entry.exports.length} exports`, type: 'exp' });
  if (entry.dbTables?.length) badges.push({ label: `${entry.dbTables.length} db`, type: 'db' });
  if (entry.apiCalls?.length) badges.push({ label: `${entry.apiCalls.length} api`, type: 'api' });

  return (
    <div>
      {/* Row header */}
      <button
        onClick={() => hasChildren || hasDetail ? setOpen(!open) : undefined}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0,
          width: '100%',
          padding: `${depth === 0 ? 10 : 6}px 16px 6px ${16 + depth * 24}px`,
          background: open
            ? (isDir ? 'var(--ibm-surface-1)' : 'var(--ibm-canvas)')
            : 'transparent',
          border: 'none',
          borderBottom: depth === 0 ? '1px solid var(--ibm-hairline)' : 'none',
          borderLeft: open ? '3px solid var(--ibm-primary)' : '3px solid transparent',
          cursor: (hasChildren || hasDetail) ? 'pointer' : 'default',
          textAlign: 'left',
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'var(--ibm-surface-1)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Chevron */}
        <span style={{
          width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 8, color: (hasChildren || hasDetail) ? 'var(--ibm-ink-muted)' : 'transparent',
          transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          ▶
        </span>

        {/* Directory / file icon */}
        <span style={{
          width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: isDir ? 13 : 10, paddingTop: 2,
          color: isDir ? 'var(--ibm-ink-muted)' : 'var(--ibm-primary)',
        }}>
          {isDir ? '▾' : '─'}
        </span>

        {/* Name */}
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: isDir ? 14 : 13,
          fontWeight: isDir ? 600 : 400,
          color: isDir ? 'var(--ibm-ink)' : 'var(--ibm-primary)',
          letterSpacing: '0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          paddingTop: 1,
        }}>
          {name}
        </span>

        {/* Inline badges */}
        {badges.length > 0 && (
          <span style={{ display: 'inline-flex', gap: 6, marginLeft: 12, flexShrink: 0, paddingTop: 3 }}>
            {badges.map((b, i) => <Badge key={i} label={b.label} type={b.type} />)}
          </span>
        )}
      </button>

      {/* Expanded content — folder description */}
      {open && isDir && entry.purpose && (
        <div style={{
          marginLeft: 16 + depth * 24 + 40,
          marginRight: 16,
          marginTop: 4,
          marginBottom: 8,
          padding: '12px 16px',
          background: 'var(--ibm-blue-10)',
          borderLeft: '3px solid var(--ibm-primary)',
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--ibm-ink)',
          fontFamily: "'IBM Plex Sans', sans-serif",
          letterSpacing: '0.16px',
        }}>
          {entry.purpose}
        </div>
      )}

      {/* Expanded content — file detail */}
      {open && !isDir && entry.purpose && (
        <div style={{
          marginLeft: 16 + (depth + 1) * 24 + 16,
          marginRight: 16,
          marginTop: 4,
          marginBottom: 8,
          padding: '14px 18px',
          background: 'var(--ibm-surface-1)',
          border: '1px solid var(--ibm-hairline)',
          fontSize: 13,
          lineHeight: 1.65,
          color: 'var(--ibm-ink)',
          fontFamily: "'IBM Plex Sans', sans-serif",
          letterSpacing: '0.16px',
        }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65 }}>
            {entry.purpose}
          </p>
          {entry.exports && entry.exports.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ibm-ink-muted)' }}>
                Exports
              </span>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {entry.exports.map(e => (
                  <code key={e} style={{
                    fontSize: 11, padding: '2px 8px', background: 'rgba(15,98,220,0.06)',
                    border: '1px solid rgba(15,98,220,0.15)', color: 'var(--ibm-primary)',
                    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.01em',
                  }}>{e}</code>
                ))}
              </div>
            </div>
          )}
          {entry.dbTables && entry.dbTables.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ibm-ink-muted)' }}>
                Database tables
              </span>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {entry.dbTables.map(t => (
                  <code key={t} style={{
                    fontSize: 11, padding: '2px 8px', background: 'rgba(200,148,0,0.06)',
                    border: '1px solid rgba(200,148,0,0.15)', color: '#c89400',
                    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.01em',
                  }}>{t}</code>
                ))}
              </div>
            </div>
          )}
          {entry.apiCalls && entry.apiCalls.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ibm-ink-muted)' }}>
                API endpoints
              </span>
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {entry.apiCalls.map(a => (
                  <code key={a} style={{
                    fontSize: 11, padding: '2px 8px', background: 'rgba(34,161,92,0.06)',
                    border: '1px solid rgba(34,161,92,0.15)', color: '#22a15c',
                    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.01em',
                  }}>{a}</code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Children */}
      {open && isDir && entry.children?.map(child => (
        <TreeItem key={child.path} entry={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function GlossaryPage() {
  const [filter, setFilter] = useState('');

  const filteredTree = filter.trim()
    ? filterTree(FILE_TREE, filter.toLowerCase())
    : FILE_TREE;

  const totalFiles = countFiles(FILE_TREE);
  const totalDirs = countDirs(FILE_TREE);

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 400,
          letterSpacing: '0.16px', color: 'var(--ibm-primary)', marginBottom: 8,
          textTransform: 'uppercase',
        }}>
          File Glossary
        </p>
        <h1 style={{
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 42, fontWeight: 300,
          color: 'var(--ibm-ink)', lineHeight: 1.2, letterSpacing: '-0.01em', marginBottom: 12,
        }}>
          Source map
        </h1>
        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 18, fontWeight: 400,
          lineHeight: 1.5, letterSpacing: '0.16px', color: 'var(--ibm-ink-muted)', maxWidth: 720,
        }}>
          Every file and folder in{' '}
          <code style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, background: 'var(--ibm-surface-1)',
            padding: '2px 6px', border: '1px solid var(--ibm-hairline)',
          }}>
            astra-app/src/
          </code>
          {' '}— click to expand. {totalFiles} files across {totalDirs} directories.
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files and folders by name or description..."
            style={{
              width: '100%', padding: '11px 16px 11px 36px',
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, letterSpacing: '0.16px',
              background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)',
              borderBottom: filter ? '2px solid var(--ibm-primary)' : '1px solid var(--ibm-hairline)',
              color: 'var(--ibm-ink)', outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--ibm-primary)'; }}
            onBlur={(e) => { if (!filter) e.currentTarget.style.borderBottomColor = 'var(--ibm-hairline)'; }}
          />
          <span style={{
            position: 'absolute', left: 12, top: 12, fontSize: 14, color: 'var(--ibm-ink-subtle)',
            pointerEvents: 'none',
          }}>
            ⌕
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ibm-ink-subtle)', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px' }}>
            <span style={{ width: 8, height: 8, background: 'rgba(15,98,220,0.12)', border: '1px solid rgba(15,98,220,0.25)' }} />
            exports
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ibm-ink-subtle)', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px' }}>
            <span style={{ width: 8, height: 8, background: 'rgba(200,148,0,0.12)', border: '1px solid rgba(200,148,0,0.25)' }} />
            db tables
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ibm-ink-subtle)', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px' }}>
            <span style={{ width: 8, height: 8, background: 'rgba(34,161,92,0.12)', border: '1px solid rgba(34,161,92,0.25)' }} />
            api routes
          </span>
        </div>
      </div>

      {/* Tree container */}
      <div style={{
        border: '1px solid var(--ibm-hairline)',
        background: 'var(--ibm-canvas)',
        maxHeight: 'calc(100vh - 280px)',
        overflowY: 'auto',
      }}>
        {filteredTree.length === 0 ? (
          <div style={{
            padding: 64, textAlign: 'center',
            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14,
            color: 'var(--ibm-ink-subtle)', letterSpacing: '0.16px',
          }}>
            No files match &ldquo;{filter}&rdquo;
          </div>
        ) : (
          filteredTree.map(entry => (
            <TreeItem key={entry.path} entry={entry} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}

function filterTree(entries: FileEntry[], query: string): FileEntry[] {
  const result: FileEntry[] = [];
  for (const entry of entries) {
    const name = entry.path.toLowerCase();
    const purpose = (entry.purpose || '').toLowerCase();
    if (name.includes(query) || purpose.includes(query)) {
      result.push(entry);
    } else if (entry.type === 'dir' && entry.children) {
      const filteredChildren = filterTree(entry.children, query);
      if (filteredChildren.length > 0) {
        result.push({ ...entry, children: filteredChildren });
      }
    }
  }
  return result;
}

function countFiles(entries: FileEntry[]): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.type === 'file') count++;
    if (entry.children) count += countFiles(entry.children);
  }
  return count;
}

function countDirs(entries: FileEntry[]): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.type === 'dir') count++;
    if (entry.children) count += countDirs(entry.children);
  }
  return count;
}