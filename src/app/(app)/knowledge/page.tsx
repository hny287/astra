'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { APP_NAME } from '@/lib/branding';

interface DocEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DocEntry[];
}

type Section = 'changelog' | 'roadmap' | 'docs' | 'specs' | 'plans' | 'how-to';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'changelog', label: 'Changelog' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'docs', label: 'Docs' },
  { key: 'specs', label: 'Specs' },
  { key: 'plans', label: 'Plans' },
  { key: 'how-to', label: 'How-to' },
];

function DocTree({ entries, onSelect, depth = 0 }: { entries: DocEntry[]; onSelect: (path: string) => void; depth?: number }) {
  return (
    <ul style={{ margin: 0, padding: `0 0 0 ${depth * 16}px`, listStyle: 'none' }}>
      {entries.map(e => (
        <li key={e.path} style={{ marginBottom: 2 }}>
          {e.type === 'directory' ? (
            <details open={depth < 1} style={{ margin: 0 }}>
              <summary style={{
                cursor: 'pointer', padding: '6px 8px', fontSize: 13, fontWeight: 600,
                color: 'var(--ibm-ink)', letterSpacing: '0.16px', fontFamily: "'IBM Plex Sans', sans-serif",
                listStyle: 'none',
              }}>
              <span style={{ marginRight: 6, fontFamily: 'monospace', color: 'var(--ibm-ink-subtle)' }}>&#9654;</span>
                {e.name}
              </summary>
              <DocTree entries={e.children || []} onSelect={onSelect} depth={depth + 1} />
            </details>
          ) : (
            <button
              onClick={() => onSelect(e.path)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'transparent',
                border: 'none', padding: '6px 8px', cursor: 'pointer', fontSize: 13,
                fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ibm-ink-muted)',
                letterSpacing: '0.16px', borderRadius: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--ibm-surface-1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {e.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function KnowledgePage() {
  const [section, setSection] = useState<Section>('changelog');
  const [tree, setTree] = useState<DocEntry[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // For changelog, use the compiled module instead of API
  const [changelogData, setChangelogData] = useState<any[]>([]);

  useEffect(() => {
    if (section === 'changelog') {
      import('@/lib/changelog').then(m => setChangelogData(m.default));
    }
  }, [section]);

  const loadSection = useCallback(async (s: Section) => {
    if (s === 'changelog') return;
    setLoading(true);
    setSelectedFile(null);
    try {
      if (s === 'roadmap') {
        const res = await fetch('/api/v1/knowledge?section=roadmap');
        const data = await res.json();
        setContent(data.content || '');
        setTree([]);
      } else {
        const res = await fetch(`/api/v1/knowledge?section=${s}`);
        const data = await res.json();
        setTree(data.tree || []);
        setContent('');
      }
    } catch {
      setContent('Failed to load.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSection(section); }, [section, loadSection]);

  const loadFile = useCallback(async (filePath: string) => {
    setLoading(true);
    setSelectedFile(filePath);
    try {
      const res = await fetch(`/api/v1/knowledge?section=${section}&path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      setContent(data.content || '');
    } catch {
      setContent('Failed to load file.');
    }
    setLoading(false);
  }, [section]);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>
          Knowledge
        </p>
        <h1 className="ibm-display-md" style={{ color: 'var(--ibm-ink)', marginBottom: 8 }}>
          {APP_NAME} knowledge base
        </h1>
        <p className="ibm-body-lg" style={{ color: 'var(--ibm-ink-muted)' }}>
          Changelog, roadmap, documentation, specs, and plans — all in one place.
        </p>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--ibm-hairline)', marginBottom: 32 }}>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            style={{
              padding: '10px 20px', border: 'none', borderBottom: section === s.key ? '2px solid var(--ibm-primary)' : '2px solid transparent',
              background: 'transparent', cursor: 'pointer', fontSize: 14,
              fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: section === s.key ? 600 : 400,
              color: section === s.key ? 'var(--ibm-primary)' : 'var(--ibm-ink-muted)',
              letterSpacing: '0.16px',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {section === 'changelog' ? (
        <ChangelogSection entries={changelogData} />
      ) : section === 'roadmap' ? (
        <MarkdownSection content={content} loading={loading} />
      ) : section === 'specs' ? (
        <FileBrowserSection
          tree={tree}
          content={content}
          loading={loading}
          selectedFile={selectedFile}
          onSelect={loadFile}
          sectionLabel={SECTIONS.find(s => s.key === section)?.label || ''}
          linkCard={{ href: '/unified-spec.html', title: 'Unified Platform Spec v5.0', description: '16-section interactive spec with Mermaid DFDs, pipeline graph, taxonomy, and competitive analysis' }}
        />
      ) : (
        <FileBrowserSection
          tree={tree}
          content={content}
          loading={loading}
          selectedFile={selectedFile}
          onSelect={loadFile}
          sectionLabel={SECTIONS.find(s => s.key === section)?.label || ''}
        />
      )}
    </div>
  );
}

function ChangelogSection({ entries }: { entries: any[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {entries.map((entry, i) => (
        <div key={entry.version} style={{
          borderLeft: i === 0 ? '3px solid var(--ibm-primary)' : '1px solid var(--ibm-hairline)',
          background: i === 0 ? 'var(--ibm-blue-10)' : 'var(--ibm-canvas)',
          padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 500, color: i === 0 ? 'var(--ibm-primary)' : 'var(--ibm-ink)' }}>
              v{entry.version}
            </span>
            {i === 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', padding: '2px 8px', background: 'var(--ibm-primary)', color: 'var(--ibm-on-primary)' }}>
                Latest
              </span>
            )}
            <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>
              {new Date(entry.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ibm-ink)', marginBottom: 4, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {entry.title}
          </h3>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            {entry.description}
          </p>
          {entry.categories?.map((cat: any, ci: number) => (
            <div key={ci} style={{ marginBottom: ci < entry.categories.length - 1 ? 12 : 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', padding: '2px 8px', borderLeft: '3px solid var(--ibm-primary)', color: 'var(--ibm-primary)' }}>
                {cat.label}
              </span>
              <ul style={{ margin: '8px 0 0', padding: '0 0 0 20px', listStyle: 'none' }}>
                {cat.items?.map((item: string, ii: number) => (
                  <li key={ii} className="ibm-body-sm" style={{ marginBottom: 4, color: 'var(--ibm-ink)', lineHeight: 1.5, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: -14, top: 8, width: 4, height: 4, background: 'var(--ibm-primary)', display: 'inline-block' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MarkdownSection({ content, loading }: { content: string; loading: boolean }) {
  if (loading) return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading...</p>;
  return (
    <div>
      <div style={{
        background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', padding: 32,
        fontSize: 14, lineHeight: 1.6, fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ibm-ink)',
      }} className="knowledge-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}

function FileBrowserSection({ tree, content, loading, selectedFile, onSelect, sectionLabel, linkCard }: {
  tree: DocEntry[]; content: string; loading: boolean; selectedFile: string | null;
  onSelect: (path: string) => void; sectionLabel: string;
  linkCard?: { href: string; title: string; description: string };
}) {
  return (
    <div style={{ display: 'flex', gap: 24 }}>
      {/* Sidebar */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--ibm-hairline)', paddingRight: 24, maxHeight: '80vh', overflowY: 'auto' }}>
        {linkCard && (
          <a
            href={linkCard.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', padding: '12px 16px', marginBottom: 16,
              background: 'var(--ibm-blue-10)', borderLeft: '3px solid var(--ibm-primary)',
              textDecoration: 'none', borderRadius: 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ibm-primary)', fontFamily: "'IBM Plex Sans', sans-serif" }}>{linkCard.title}</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ibm-ink-muted)', marginTop: 4, fontFamily: "'IBM Plex Sans', sans-serif" }}>{linkCard.description}</span>
          </a>
        )}
        <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>
          {sectionLabel}
        </p>
        {tree.length === 0 && !loading && (
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>No documents yet.</p>
        )}
        <DocTree entries={tree} onSelect={onSelect} />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {selectedFile && (
          <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginBottom: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
            {selectedFile}
          </p>
        )}
        {loading ? (
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading...</p>
        ) : content ? (
          <div style={{
            background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', padding: 32,
            fontSize: 14, lineHeight: 1.6, fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ibm-ink)',
          }} className="knowledge-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Select a document from the sidebar.</p>
        )}
      </div>
    </div>
  );
}