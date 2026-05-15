'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ScanProgress from '@/components/ScanProgress';
import DashboardMetrics from '@/components/DashboardMetrics';
import FileExplorer from '@/components/FileExplorer';
import FilterableFindingsTable from '@/components/FilterableFindingsTable';
import BusinessLogicPanel from '@/components/BusinessLogicPanel';
import NodeOutputInspector from '@/components/NodeOutputInspector';
import ExportPanel from '@/components/ExportPanel';
import MermaidDiagram from '@/components/MermaidDiagram';
import ScanChat from '@/components/ScanChat';
import AiCallTable from '@/components/AiCallTable';

interface Finding {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  file: string;
  lineStart: number;
  lineEnd: number;
  title: string;
  scanner: string;
  category: string;
  confidence: number;
  aiExplanation: string | null;
  aiFix: string | null;
  codeSnippet: string;
  exploitationScenario: string | null;
  exploitScore: number | null;
  cvssScore: number | null;
  cvssVector: string | null;
  cwe: string[];
  owasp: string[];
  remediation: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'FALSE_POSITIVE' | 'ACCEPTED_RISK' | 'BLOCKED' | 'CANCELLED';
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  task: { id: string; title: string; status: string; severity: string } | null;
}

interface BusinessLogicRule {
  id: string;
  ruleText: string;
  confidence: number;
  evidenceFiles: string[];
  status: 'CANDIDATE' | 'CONFIRMED' | 'REJECTED';
  violationDescription: string | null;
}

interface NodeOutput {
  id: string;
  node: string;
  modelUsed: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  durationMs: number;
  error: string | null;
  nodeConfig: Record<string, unknown>;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
}

interface ScanData {
  id: string;
  repoUrl: string;
  branch: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  durationSeconds: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  findings: Finding[];
  businessRules: BusinessLogicRule[];
  nodeOutputs: NodeOutput[];
  repoIntel: {
    commitCount: number;
    contributorCount: number;
    branchCount: number;
    recentCommits: { hash: string; author: string; date: string; message: string }[];
    topContributors: { name: string; email: string; commitCount: number }[];
    hotspotFiles: { path: string; changeCount: number }[];
    languages: { language: string; fileCount: number; percentage: number }[];
    dependencies: { name: string; version: string; type: string }[];
  } | null;
  architectureDiagram: string | null;
  toolFindingsCount: number;
}

const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
  PENDING: { dot: 'var(--ibm-semantic-warning)', text: 'var(--ibm-semantic-warning)' },
  RUNNING: { dot: 'var(--ibm-primary)', text: 'var(--ibm-primary)' },
  COMPLETED: { dot: 'var(--ibm-semantic-success)', text: 'var(--ibm-semantic-success)' },
  FAILED: { dot: 'var(--ibm-semantic-error)', text: 'var(--ibm-semantic-error)' },
};

type Tab = 'overview' | 'findings' | 'files' | 'architecture' | 'rules' | 'nodes' | 'chat' | 'logs';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m ${s}s`;
}

export default function ScanDetailPage() {
  const params = useParams();
  const scanId = params.id as string;
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialTab = (searchParams?.get('tab') ?? 'overview') as Tab;
  const [scan, setScan] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(['overview', 'findings', 'files', 'architecture', 'rules', 'nodes', 'chat', 'logs'].includes(initialTab) ? initialTab : 'overview');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const fetchScan = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/scans/${scanId}`);
      if (res.ok) {
        const data = await res.json();
        setScan(data);
      }
    } catch {}
    setLoading(false);
  }, [scanId]);

  useEffect(() => {
    fetchScan();
  }, [fetchScan]);

  useEffect(() => {
    if (!scan || (scan.status !== 'PENDING' && scan.status !== 'RUNNING')) return;
    const start = new Date(scan.createdAt).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scan]);

  if (loading) return <p className="ibm-body" style={{ color: 'var(--ibm-ink-subtle)', padding: 64 }}>Loading...</p>;
  if (!scan) return <p className="ibm-body" style={{ color: 'var(--ibm-ink-subtle)', padding: 64 }}>Scan not found.</p>;

  const isRunning = scan.status === 'PENDING' || scan.status === 'RUNNING';
  const isCompleted = scan.status === 'COMPLETED';
  const sc = STATUS_COLORS[scan.status] ?? STATUS_COLORS.PENDING;
  const displayDuration = isRunning ? elapsedSeconds : scan.durationSeconds;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'findings', label: 'Alerts', count: scan.findings.length },
    { id: 'files', label: 'Files' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'rules', label: 'Rules', count: scan.businessRules.length },
    { id: 'nodes', label: 'Pipeline' },
    { id: 'chat' as Tab, label: 'Chat' },
    { id: 'logs' as Tab, label: 'AI Calls' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link href="/" className="ibm-caption" style={{ color: 'var(--ibm-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span>&#8592;</span> All scans
        </Link>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
            <h1 className="ibm-headline" style={{ color: 'var(--ibm-ink)' }}>Scan detail</h1>
          </div>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>
            {scan.repoUrl.replace('https://github.com/', '')} &middot; {scan.branch} &middot; {new Date(scan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {displayDuration != null && (
              <> &middot; <span style={{ fontVariantNumeric: 'tabular-nums' }}>{isRunning ? 'Elapsed ' : ''}{formatDuration(displayDuration)}</span></>
            )}
          </p>
        </div>
      {isCompleted && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ExportPanel scanId={scanId} />
          <a
            href={`/scans/${scanId}/report`}
            style={{
              background: 'var(--ibm-inverse-canvas)', color: 'var(--ibm-inverse-ink)',
              fontSize: '14px', fontWeight: 400, letterSpacing: '0.16px',
              padding: '12px 16px', border: 'none', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            View report
          </a>
        </div>
      )}
      </div>

      {!isRunning && (scan.status === 'FAILED' || scan.status === 'PENDING') && (
        <div style={{ marginBottom: 32, padding: 16, background: 'var(--ibm-red-10)', borderLeft: '3px solid var(--ibm-semantic-error)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="ibm-body-emphasis" style={{ color: 'var(--ibm-semantic-error)' }}>Scan {scan.status.toLowerCase()}</span>
            <button
              onClick={async () => {
                const res = await fetch(`/api/v1/scans/${scanId}/resume`, { method: 'POST' });
                if (res.ok) fetchScan();
                else { const d = await res.json(); alert(d.error || 'Resume failed'); }
              }}
              style={{ background: 'var(--ibm-primary)', color: '#ffffff', fontSize: '14px', padding: '12px 16px', border: 'none', cursor: 'pointer', letterSpacing: '0.16px' }}
            >
              Resume scan
            </button>
          </div>
        </div>
      )}
      {isRunning && (
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={async () => {
              if (!confirm('Cancel this scan? It will be marked as FAILED.')) return;
              const res = await fetch(`/api/v1/scans/${scanId}/cancel`, { method: 'POST' });
              if (res.ok) fetchScan();
            }}
            style={{ background: 'var(--ibm-canvas)', color: 'var(--ibm-semantic-error)', fontSize: '14px', padding: '12px 16px', border: '1px solid var(--ibm-semantic-error)', cursor: 'pointer', letterSpacing: '0.16px' }}
          >
            Cancel scan
          </button>
        </div>
      )}
      {isCompleted && (
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={async () => {
              const res = await fetch('/api/v1/scans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl: scan.repoUrl, branch: scan.branch }),
              });
              if (res.ok) {
                const data = await res.json();
                window.location.href = `/scans/${data.scanId}`;
              }
            }}
            style={{ background: 'var(--ibm-primary)', color: '#ffffff', fontSize: '14px', padding: '12px 16px', border: 'none', cursor: 'pointer', letterSpacing: '0.16px' }}
          >
            Rescan
          </button>
        </div>
      )}

      <div style={{ borderBottom: '2px solid var(--ibm-hairline)', marginBottom: 32, display: 'flex' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px', fontSize: '14px', fontWeight: activeTab === tab.id ? 600 : 400,
              letterSpacing: '0.16px', lineHeight: 1.29, border: 'none', cursor: 'pointer',
              background: 'transparent', color: activeTab === tab.id ? 'var(--ibm-ink)' : 'var(--ibm-ink-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--ibm-primary)' : '2px solid transparent',
              marginBottom: '-2px', fontFamily: "'IBM Plex Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {tab.label}
            {tab.count != null && (
              <span style={{
                fontSize: '12px', padding: '1px 6px', background: activeTab === tab.id ? 'var(--ibm-primary)' : 'var(--ibm-surface-2)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--ibm-ink-muted)',
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
            <p className="ibm-eyebrow" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>Pipeline</p>
            <ScanProgress scanId={scanId} initialStatus={scan.status} onComplete={fetchScan} onFailed={fetchScan} />
          </div>
          {isCompleted && (
            <DashboardMetrics
              findings={scan.findings}
              totalTokens={{ input: scan.totalInputTokens, output: scan.totalOutputTokens, thinking: 0 }}
              durationSeconds={scan.durationSeconds}
            />
          )}
        </div>
      )}

      {activeTab === 'findings' && (
        <FilterableFindingsTable findings={scan.findings} onRefresh={fetchScan} />
      )}

      {activeTab === 'files' && (
        <div style={{ border: '1px solid var(--ibm-hairline)' }}>
          <FileExplorer findings={scan.findings.map(f => ({ file: f.file, severity: f.severity, title: f.title, lineStart: f.lineStart }))} />
        </div>
      )}

      {activeTab === 'architecture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Repo Intel */}
          {scan.repoIntel && (
            <div style={{ padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
              <p className="ibm-eyebrow" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>Repository Intelligence</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div>
                  <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4 }}>Commits</div>
                  <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{scan.repoIntel.commitCount}</div>
                </div>
                <div>
                  <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4 }}>Contributors</div>
                  <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{scan.repoIntel.contributorCount}</div>
                </div>
                <div>
                  <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4 }}>Branches</div>
                  <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{scan.repoIntel.branchCount}</div>
                </div>
                <div>
                  <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4 }}>Tool Findings</div>
                  <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{scan.toolFindingsCount}</div>
                </div>
              </div>
              {/* Code Structure (from codegraph) */}
              {(scan.repoIntel as any)?.codeIntel && (
                <div style={{ marginTop: 16, padding: 16, background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)' }}>
                  <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>Code Structure</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    <div>
                      <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 2 }}>Analyzed Files</div>
                      <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{(scan.repoIntel as any).codeIntel.files?.length ?? 0}</div>
                    </div>
                    <div>
                      <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 2 }}>Import Edges</div>
                      <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{(scan.repoIntel as any).codeIntel.imports?.length ?? 0}</div>
                    </div>
                    <div>
                      <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 2 }}>API Routes</div>
                      <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{(scan.repoIntel as any).codeIntel.apiRoutes?.length ?? 0}</div>
                    </div>
                    <div>
                      <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 2 }}>Data Models</div>
                      <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{(scan.repoIntel as any).codeIntel.dataModels?.length ?? 0}</div>
                    </div>
                    <div>
                      <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 2 }}>Entry Points</div>
                      <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{(scan.repoIntel as any).codeIntel.entryPoints?.length ?? 0}</div>
                    </div>
                    <div>
                      <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 2 }}>Dead Exports</div>
                      <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{(scan.repoIntel as any).codeIntel.deadExports?.length ?? 0}</div>
                    </div>
                  </div>
                  {((scan.repoIntel as any).codeIntel.apiRoutes?.length > 0) && (
                    <div style={{ marginTop: 12 }}>
                      <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4 }}>API Routes</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(scan.repoIntel as any).codeIntel.apiRoutes.slice(0, 20).map((r: any, i: number) => (
                          <span key={i} style={{ padding: '2px 8px', background: 'var(--ibm-surface-2)', fontSize: 12, borderRadius: 2 }}>
                            {r.method} {r.path}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {((scan.repoIntel as any).codeIntel.dataModels?.length > 0) && (
                    <div style={{ marginTop: 12 }}>
                      <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4 }}>Data Models</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(scan.repoIntel as any).codeIntel.dataModels.slice(0, 15).map((m: any, i: number) => (
                          <span key={i} style={{ padding: '2px 8px', background: 'var(--ibm-surface-2)', fontSize: 12, borderRadius: 2 }}>
                            {m.name} ({m.fields?.length ?? '?'} fields)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {scan.repoIntel.languages.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>Languages</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {scan.repoIntel.languages.map(l => (
                      <span key={l.language} style={{ padding: '4px 12px', background: 'var(--ibm-surface-2)', fontSize: 13, borderRadius: 2 }}>
                        {l.language} <span style={{ color: 'var(--ibm-ink-muted)' }}>{l.percentage}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {scan.repoIntel.topContributors.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>Top Contributors</div>
                  {scan.repoIntel.topContributors.slice(0, 5).map(c => (
                    <div key={c.email} className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', marginBottom: 4 }}>
                      {c.name} <span style={{ color: 'var(--ibm-ink-muted)' }}>({c.commitCount} commits)</span>
                    </div>
                  ))}
                </div>
              )}
              {scan.repoIntel.hotspotFiles.length > 0 && (
                <div>
                  <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>Hotspot Files</div>
                  {scan.repoIntel.hotspotFiles.slice(0, 10).map(h => (
                    <div key={h.path} className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', marginBottom: 4 }}>
                      {h.path} <span style={{ color: 'var(--ibm-ink-muted)' }}>({h.changeCount} changes)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Architecture Diagram */}
          {(() => {
            const diagram = scan.architectureDiagram || (scan.nodeOutputs?.find(n => n.node === 'git_diagram')?.outputJson as any)?.diagram;
            return diagram ? (
              <div style={{ padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
                <p className="ibm-eyebrow" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>Architecture Diagram</p>
                <MermaidDiagram chart={diagram} />
              </div>
            ) : (
              <div style={{ padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
                <p className="ibm-body" style={{ color: 'var(--ibm-ink-muted)' }}>No architecture diagram available. Run a scan to generate one.</p>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === 'rules' && (
        <BusinessLogicPanel rules={scan.businessRules} onStatusChange={fetchScan} />
      )}

      {activeTab === 'nodes' && (
        <NodeOutputInspector outputs={scan.nodeOutputs} scanId={scanId} onRerun={fetchScan} />
      )}

      {activeTab === 'chat' && (
        <ScanChat scanId={scanId} />
      )}

      {activeTab === 'logs' && (
        <AiCallTable scanId={scan.id} />
      )}
    </div>
  );
}