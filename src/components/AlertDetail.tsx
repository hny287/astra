'use client';

import { useState, useEffect, useCallback } from 'react';
import SeverityBadge from './SeverityBadge';
import CvssScore from './CvssScore';
import { useAiChat } from './AiChatProvider';
import { useAppData } from './AppDataProvider';

type ItemStatus = 'OPEN' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'FALSE_POSITIVE' | 'ACCEPTED_RISK' | 'BLOCKED' | 'CANCELLED';

interface Comment {
  id: string;
  text: string;
  userId: string;
  user?: { name: string } | null;
  createdAt: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  userId: string;
  user?: { name: string } | null;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TaskSummary {
  id: string;
  title: string;
  status: string;
  severity: string;
  type: string;
}

interface FindingDetail {
  id: string;
  title: string;
  severity: string;
  status: ItemStatus;
  description: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  exploitationScenario: string | null;
  remediation: string;
  cwe: string[];
  owasp: string[];
  exploitScore: number | null;
  cvssScore: number | null;
  cvssVector: string | null;
  confidence: number;
  assignedToId: string | null;
  category: string;
  scanner: string;
  scanId: string;
  comments: Comment[];
  history: HistoryEntry[];
  task: TaskSummary | null;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  OPEN: { color: 'var(--ibm-semantic-error)', label: 'Open' },
  IN_PROGRESS: { color: 'var(--ibm-blue-50)', label: 'In Progress' },
  IN_REVIEW: { color: 'var(--ibm-semantic-warning)', label: 'In Review' },
  COMPLETED: { color: 'var(--ibm-semantic-success)', label: 'Completed' },
  FALSE_POSITIVE: { color: 'var(--ibm-ink-subtle)', label: 'False Positive' },
  ACCEPTED_RISK: { color: 'var(--ibm-primary)', label: 'Accept Risk' },
  BLOCKED: { color: 'var(--ibm-semantic-error)', label: 'Blocked' },
  CANCELLED: { color: 'var(--ibm-ink-subtle)', label: 'Cancelled' },
};

interface AlertDetailProps {
  findingId: string;
  onClose: () => void;
}

export default function AlertDetail({ findingId, onClose }: AlertDetailProps) {
  const { users } = useAppData();
  const [finding, setFinding] = useState<FindingDetail | null>(null);
  const [commentText, setCommentText] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [rescanResult, setRescanResult] = useState<string | null>(null);
  const { openChat } = useAiChat();

  const fetchFinding = useCallback(async () => {
    const res = await fetch(`/api/v1/findings/${findingId}`);
    if (res.ok) {
      const data = await res.json();
      setFinding(data);
    }
  }, [findingId]);

  useEffect(() => {
    fetchFinding();
  }, [fetchFinding]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const changeStatus = async (status: ItemStatus) => {
    setChangingStatus(status);
    await fetch(`/api/v1/findings/${findingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await fetchFinding();
    setChangingStatus(null);
  };

  const assignTo = async (userId: string) => {
    setAssigning(userId);
    await fetch(`/api/v1/findings/${findingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedToId: userId || null }),
    });
    await fetchFinding();
    setAssigning(null);
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    await fetch(`/api/v1/findings/${findingId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: commentText }),
    });
    setCommentText('');
    await fetchFinding();
  };

  const createTask = async () => {
    setCreatingTask(true);
    try {
      const res = await fetch(`/api/v1/findings/${findingId}/task`, { method: 'POST' });
      if (res.ok) {
        await fetchFinding();
      }
    } catch {}
    setCreatingTask(false);
  };

  const rescanFile = async () => {
    if (!finding) return;
    setRescanning(true);
    setRescanResult(null);
    try {
      const res = await fetch(`/api/v1/findings/${findingId}/rescan`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRescanResult(`Rescan started — viewing progress...`);
        // Navigate to scan detail pipeline tab to show rescan progress
        setTimeout(() => {
          window.location.href = `/scans/${data.scanId}?tab=nodes`;
        }, 1500);
      } else {
        setRescanResult(`Error: ${data.error || 'Rescan failed'}`);
      }
    } catch (err) {
      setRescanResult(`Error: ${err instanceof Error ? err.message : 'Rescan failed'}`);
    }
    setRescanning(false);
  };

  if (!finding) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
        <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
        <div style={{ width: 560, background: 'var(--ibm-canvas)', borderLeft: '1px solid var(--ibm-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[finding.status] ?? STATUS_CONFIG.OPEN;
  const assignedUser = users.find(u => u.id === finding.assignedToId);

  const ACTION_BUTTONS: { status: ItemStatus; label: string; accent: string }[] = [
    { status: 'IN_PROGRESS', label: 'Start', accent: 'var(--ibm-blue-50)' },
    { status: 'IN_REVIEW', label: 'In Review', accent: 'var(--ibm-semantic-warning)' },
    { status: 'COMPLETED', label: 'Resolve', accent: 'var(--ibm-semantic-success)' },
    { status: 'FALSE_POSITIVE', label: 'False Positive', accent: 'var(--ibm-ink-subtle)' },
    { status: 'ACCEPTED_RISK', label: 'Accept Risk', accent: 'var(--ibm-semantic-warning)' },
  ];

  const formatAction = (action: string) => {
    if (action === 'STATUS_CHANGE') return 'Status changed';
    if (action === 'ASSIGNMENT') return 'Assigned';
    if (action === 'COMMENT') return 'Comment added';
    return action;
  };

  const btnBase: React.CSSProperties = {
    background: 'var(--ibm-surface-1)',
    border: '1px solid var(--ibm-hairline)',
    padding: '6px 12px',
    fontSize: '13px',
    fontFamily: "'IBM Plex Sans', sans-serif",
    letterSpacing: '0.16px',
    cursor: 'pointer',
    color: 'var(--ibm-ink)',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{
        width: 560, background: 'var(--ibm-canvas)', borderLeft: '1px solid var(--ibm-hairline)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideInRight 0.2s ease-out',
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ibm-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SeverityBadge severity={finding.severity} />
            <span style={{
              borderLeft: `3px solid ${statusCfg.color}`, paddingLeft: 8,
              fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px',
              color: statusCfg.color, textTransform: 'uppercase',
            }}>
              {statusCfg.label}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ibm-ink-muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>
            &times;
          </button>
        </div>

        <div style={{ padding: '0 20px', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <h2 className="ibm-headline" style={{ color: 'var(--ibm-ink)', margin: '16px 0 8px' }}>{finding.title}</h2>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>{finding.file}:{finding.lineStart}</p>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--ibm-hairline)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {ACTION_BUTTONS.map(btn => (
            <button
              key={btn.status}
              disabled={changingStatus === btn.status}
              onClick={() => changeStatus(btn.status)}
              style={{
                ...btnBase,
                borderLeft: `3px solid ${btn.accent}`,
                opacity: changingStatus === btn.status ? 0.5 : 1,
              }}
            >
              {btn.label}
            </button>
          ))}
          <button
            onClick={() => openChat({ findingId: finding.id, findingTitle: finding.title })}
            style={{
              ...btnBase,
              borderLeft: '3px solid var(--ibm-primary)',
              background: 'var(--ibm-surface-2)',
            }}
          >
            AI Assist
          </button>
          <button
            onClick={rescanFile}
            disabled={rescanning}
            style={{
              ...btnBase,
              borderLeft: '3px solid var(--ibm-blue-50)',
              opacity: rescanning ? 0.5 : 1,
            }}
          >
            {rescanning ? 'Rescanning...' : 'Rescan File'}
          </button>
          {rescanResult && (
            <span className="ibm-caption" style={{ color: rescanResult.startsWith('Error') ? 'var(--ibm-semantic-error)' : 'var(--ibm-semantic-success)' }}>
              {rescanResult}
            </span>
          )}
        </div>

        {/* Linked Task */}
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--ibm-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>Task:</span>
          {finding.task ? (
            <a href={`/tasks?expand=${finding.task.id}`} style={{ color: 'var(--ibm-primary)', fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {finding.task.title}
              <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--ibm-surface-1)', padding: '1px 6px', border: '1px solid var(--ibm-hairline)' }}>{finding.task.status}</span>
              <span style={{ marginLeft: 4, fontSize: 11, background: 'var(--ibm-surface-1)', padding: '1px 6px', border: '1px solid var(--ibm-hairline)' }}>{finding.task.severity}</span>
            </a>
          ) : (
            <button
              onClick={createTask}
              disabled={creatingTask}
              style={{
                ...btnBase,
                borderLeft: '3px solid var(--ibm-semantic-warning)',
                opacity: creatingTask ? 0.5 : 1,
                fontSize: 12,
                padding: '4px 10px',
              }}
            >
              {creatingTask ? 'Creating...' : '+ Create Task'}
            </button>
          )}
        </div>

        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--ibm-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>Assigned to:</span>
          <select
            value={finding.assignedToId ?? ''}
            onChange={e => assignTo(e.target.value)}
            disabled={!!assigning}
            style={{
              background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)',
              borderBottom: '2px solid var(--ibm-primary)', padding: '4px 8px', fontSize: '13px',
              fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px', color: 'var(--ibm-ink)',
              cursor: 'pointer', appearance: 'none',
            }}
          >
            <option value="">Unassigned</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {finding.description && (
            <div style={{ marginBottom: 20 }}>
              <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Description</p>
              <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{finding.description}</p>
            </div>
          )}

          {finding.codeSnippet && (
            <div style={{ marginBottom: 20 }}>
              <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Code snippet</p>
              <pre style={{ padding: 16, background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', overflow: 'auto', maxHeight: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', lineHeight: 1.5 }}>{finding.codeSnippet}</pre>
            </div>
          )}

          {finding.exploitationScenario && (
            <div style={{ marginBottom: 20, borderLeft: '3px solid var(--ibm-semantic-error)', paddingLeft: 12 }}>
              <p className="ibm-label" style={{ color: 'var(--ibm-semantic-error)', marginBottom: 4 }}>Proof of Concept</p>
              <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{finding.exploitationScenario}</p>
            </div>
          )}

          {finding.remediation && (
            <div style={{ marginBottom: 20, borderLeft: '3px solid var(--ibm-semantic-success)', paddingLeft: 12 }}>
              <p className="ibm-label" style={{ color: 'var(--ibm-semantic-success)', marginBottom: 4 }}>Remediation</p>
              <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{finding.remediation}</p>
            </div>
          )}

          {(finding.cwe.length > 0 || finding.owasp.length > 0) && (
            <div style={{ marginBottom: 20 }}>
              <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>References</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {finding.cwe.map(c => (
                  <a key={c} href={`https://cwe.mitre.org/data/definitions/${c.replace('CWE-', '')}.html`} target="_blank" rel="noopener noreferrer" style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', color: 'var(--ibm-primary)', padding: '2px 8px', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace", textDecoration: 'none', letterSpacing: '0.16px' }}>
                    {c}
                  </a>
                ))}
                {finding.owasp.map(o => (
                  <a key={o} href={`https://owasp.org/www-project-top-ten/${o}`} target="_blank" rel="noopener noreferrer" style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', color: 'var(--ibm-primary)', padding: '2px 8px', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace", textDecoration: 'none', letterSpacing: '0.16px' }}>
                    {o}
                  </a>
                ))}
              </div>
            </div>
          )}

          {finding.exploitScore != null && (
            <div style={{ marginBottom: 20 }}>
              <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Exploit Score</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 8, background: 'var(--ibm-surface-2)' }}>
                  <div style={{
                    width: `${Math.min(finding.exploitScore / 10, 1) * 100}%`,
                    height: '100%',
                    background: finding.exploitScore >= 8 ? 'var(--ibm-semantic-error)' : finding.exploitScore >= 5 ? 'var(--ibm-semantic-warning)' : 'var(--ibm-semantic-success)',
                  }} />
                </div>
                <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Mono', monospace", minWidth: 28 }}>{finding.exploitScore.toFixed(1)}</span>
              </div>
            </div>
          )}

          {'cvssScore' in finding && finding.cvssScore != null && (
            <CvssScore score={finding.cvssScore as number} vector={finding.cvssVector} />
          )}

          <div style={{ marginBottom: 20 }}>
            <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Confidence</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 8, background: 'var(--ibm-surface-2)' }}>
                <div style={{ width: `${finding.confidence * 100}%`, height: '100%', background: 'var(--ibm-primary)' }} />
              </div>
              <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Mono', monospace", minWidth: 36 }}>{(finding.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 8 }}>Comments</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
                style={{
                  flex: 1, background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)',
                  borderBottom: '2px solid var(--ibm-primary)', padding: '8px 12px', fontSize: '13px',
                  fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px', color: 'var(--ibm-ink)', outline: 'none',
                }}
              />
              <button
                onClick={addComment}
                disabled={!commentText.trim()}
                style={{
                  ...btnBase, background: 'var(--ibm-primary)', color: '#ffffff',
                  opacity: commentText.trim() ? 1 : 0.5, borderLeft: 'none',
                }}
              >
                Add comment
              </button>
            </div>
            {finding.comments.length === 0 && (
              <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>No comments yet.</p>
            )}
            {finding.comments.map(c => (
              <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--ibm-hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>{c.user?.name ?? c.userId}</span>
                  <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{c.text}</p>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 20 }}>
            <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 8 }}>History</p>
            {(finding.history ?? []).length === 0 && (
              <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>No history.</p>
            )}
            {(finding.history ?? []).map(h => (
              <div key={h.id} style={{ padding: '6px 0', borderLeft: '2px solid var(--ibm-hairline)', marginLeft: 8, paddingLeft: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="ibm-label" style={{ color: 'var(--ibm-ink)' }}>{formatAction(h.action)}</span>
                  <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{new Date(h.createdAt).toLocaleString()}</span>
                </div>
                {(h.oldValue || h.newValue) && (
                  <p className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginTop: 2 }}>
                    {h.oldValue && <span>{h.oldValue}</span>}
                    {h.oldValue && h.newValue && <span> → </span>}
                    {h.newValue && <span style={{ fontWeight: 600 }}>{h.newValue}</span>}
                  </p>
                )}
                <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>by {h.user?.name ?? h.userId}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}