'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ScanProgressProps {
  scanId: string;
  initialStatus?: string;
  onComplete?: () => void;
  onFailed?: () => void;
}

interface JobInfo {
  id: string;
  node: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  attempts: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface LogEntry {
  id: string;
  level: string;
  source: string;
  message: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

type NodePhase = 'pending' | 'running' | 'completed' | 'failed';

const NODE_PIPELINE = [
  { id: 'clone', label: 'Clone', source: 'clone' },
  { id: 'discover', label: 'Discover', source: 'discover' },
  { id: 'deep_scan', label: 'Deep Scan', source: 'deep_scan' },
  { id: 'cross_file', label: 'Cross-File', source: 'cross_file' },
  { id: 'aggregate', label: 'Aggregate', source: 'aggregate' },
  { id: 'persist', label: 'Persist', source: 'persist' },
] as const;

const LEVEL_STYLES: Record<string, { color: string; prefix: string }> = {
  debug: { color: '#8c8c8c', prefix: 'DBG' },
  info: { color: '#0f62fe', prefix: 'INF' },
  success: { color: '#198038', prefix: 'OK ' },
  warn: { color: '#b28600', prefix: 'WRN' },
  error: { color: '#da1e28', prefix: 'ERR' },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function ScanProgress({ scanId, initialStatus, onComplete, onFailed }: ScanProgressProps) {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [logsBySource, setLogsBySource] = useState<Record<string, LogEntry[]>>({});
  const [scanStatus, setScanStatus] = useState(initialStatus ?? 'PENDING');
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState<number | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const logsEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      await fetch(`/api/v1/scans/${scanId}/cancel`, { method: 'POST' });
      setScanStatus('FAILED');
    } catch {}
  }, [scanId]);

  const handleResume = useCallback(async () => {
    setResuming(true);
    try {
      const res = await fetch(`/api/v1/scans/${scanId}/resume`, { method: 'POST' });
      if (res.ok) {
        setScanStatus('RUNNING');
        setResuming(false);
      }
    } catch {}
  }, [scanId]);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/scans/${scanId}/progress`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs ?? []);
        setScanStatus(data.scanStatus ?? scanStatus);
        if (data.totalElapsed) setTotalElapsed(data.totalElapsed);
        if (data.logsBySource) setLogsBySource(data.logsBySource);
      }
    } catch {}
  }, [scanId, scanStatus]);

  useEffect(() => {
    const isTerminal = scanStatus === 'COMPLETED' || scanStatus === 'FAILED';
    if (isTerminal) {
      fetchProgress();
      onComplete?.();
      if (scanStatus === 'FAILED') onFailed?.();
      return;
    }

    fetchProgress();
    const interval = setInterval(fetchProgress, 2000);
    return () => clearInterval(interval);
  }, [scanId, scanStatus, fetchProgress, onComplete, onFailed]);

  useEffect(() => {
    const runningNode = jobs.find(j => j.status === 'RUNNING')?.node;
    if (runningNode) {
      setExpandedNodes(prev => {
        if (prev.has(runningNode)) return prev;
        const next = new Set(prev);
        next.add(runningNode);
        return next;
      });
    }
  }, [jobs]);

  const getJobForNode = (nodeId: string): JobInfo | undefined => {
    return jobs.find(j => j.node === nodeId);
  };

  const getNodePhase = (nodeId: string): NodePhase => {
    const job = getJobForNode(nodeId);
    if (!job) return 'pending';
    switch (job.status) {
      case 'RUNNING': return 'running';
      case 'COMPLETED': return 'completed';
      case 'FAILED': return 'failed';
      default: return 'pending';
    }
  };

  const getNodeLogs = (source: string): LogEntry[] => {
    return logsBySource[source] ?? [];
  };

  const completedCount = jobs.filter(j => j.status === 'COMPLETED').length;
  const progress = Math.round((completedCount / NODE_PIPELINE.length) * 100);

  const formatElapsed = (ms: number): string => {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  function getPhaseIcon(phase: NodePhase) {
    switch (phase) {
      case 'completed':
        return (
          <span style={{
            width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--ibm-semantic-success)', color: '#ffffff', fontSize: '12px', fontWeight: 600,
          }}>&#10003;</span>
        );
      case 'running':
        return (
          <span style={{
            width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--ibm-primary)', color: 'var(--ibm-primary)', fontSize: '12px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}></span>
        );
      case 'failed':
        return (
          <span style={{
            width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--ibm-semantic-error)', color: '#ffffff', fontSize: '12px', fontWeight: 600,
          }}>&#10007;</span>
        );
      default:
        return (
          <span style={{
            width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--ibm-ink-subtle)',
          }}></span>
        );
    }
  }

  function getPhaseColor(phase: NodePhase) {
    switch (phase) {
      case 'completed': return 'var(--ibm-semantic-success)';
      case 'running': return 'var(--ibm-primary)';
      case 'failed': return 'var(--ibm-semantic-error)';
      default: return 'var(--ibm-ink-subtle)';
    }
  }

  if (scanStatus === 'FAILED') {
    const failedJobs = jobs.filter(j => j.status === 'FAILED');
    return (
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-2" style={{ color: 'var(--ibm-semantic-error)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ibm-semantic-error)', display: 'inline-block' }} />
          <span className="ibm-body-sm" style={{ fontWeight: 600 }}>Scan Failed</span>
          <button
            onClick={handleResume}
            disabled={resuming}
            style={{
              marginLeft: 8,
              background: 'var(--ibm-surface-1)',
              border: '1px solid var(--ibm-hairline)',
              color: 'var(--ibm-ink)',
              fontSize: '14px',
              padding: '8px 16px',
              cursor: resuming ? 'not-allowed' : 'pointer',
            }}
          >
            {resuming ? 'Resuming...' : 'Resume'}
          </button>
        </div>
        {NODE_PIPELINE.map((node) => {
          const phase = getNodePhase(node.id);
          if (phase === 'pending') return null;
          const nodeLogs = getNodeLogs(node.source);
          const job = getJobForNode(node.id);
          const isExpanded = expandedNodes.has(node.id);

          return (
            <div key={node.id}>
              <div
                className="flex items-center gap-3 py-2 pl-4 cursor-pointer"
                style={{ borderLeft: `2px solid ${getPhaseColor(phase)}` }}
                onClick={() => toggleNode(node.id)}
              >
                {getPhaseIcon(phase)}
                <span className="ibm-body-sm" style={{ color: getPhaseColor(phase) }}>{node.label}</span>
                {job?.error && (
                  <span className="ibm-caption truncate max-w-64" style={{ color: 'var(--ibm-semantic-error)', opacity: 0.8 }}>{job.error}</span>
                )}
                {nodeLogs.length > 0 && (
                  <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{nodeLogs.length} log{nodeLogs.length !== 1 ? 's' : ''}</span>
                )}
                <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginLeft: 'auto' }}>
                  {isExpanded ? '\u25BC' : '\u25B6'}
                </span>
              </div>
              {isExpanded && nodeLogs.length > 0 && (
                <div className="ml-12 mb-2 p-2 overflow-y-auto" style={{
                  background: 'var(--ibm-surface-1)',
                  border: '1px solid var(--ibm-hairline)',
                  maxHeight: 200,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px',
                  lineHeight: '1.5',
                }}>
                  {nodeLogs.map((entry) => {
                    const style = LEVEL_STYLES[entry.level] ?? { color: '#161616', prefix: 'LOG' };
                    return (
                      <div key={entry.id} className="flex gap-2">
                        <span style={{ color: 'var(--ibm-ink-subtle)' }} className="shrink-0 tabular-nums">{formatTime(entry.createdAt)}</span>
                        <span style={{ color: style.color }} className="shrink-0 w-8 font-semibold">{style.prefix}</span>
                        <span style={{ color: style.color }} className="flex-1">{entry.message}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (scanStatus === 'COMPLETED') {
    return (
      <div className="space-y-1 py-2">
        <div className="flex items-center gap-3 mb-3" style={{ color: 'var(--ibm-semantic-success)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ibm-semantic-success)', display: 'inline-block' }} />
          <span className="ibm-body-sm" style={{ fontWeight: 600 }}>Scan Complete</span>
          {totalElapsed != null && (
            <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink-muted)' }}>
              {formatElapsed(totalElapsed)}
            </span>
          )}
        </div>
        {NODE_PIPELINE.map((node) => {
          const phase = getNodePhase(node.id);
          if (phase === 'pending') return null;
          const nodeLogs = getNodeLogs(node.source);
          const job = getJobForNode(node.id);
          const isExpanded = expandedNodes.has(node.id);
          const duration = job?.startedAt && job?.completedAt
            ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
            : null;

          return (
            <div key={node.id}>
              <div
                className="flex items-center gap-3 py-1.5 pl-4 cursor-pointer"
                style={{ borderLeft: `2px solid ${getPhaseColor(phase)}` }}
                onClick={() => toggleNode(node.id)}
              >
                {getPhaseIcon(phase)}
                <span className="ibm-body-sm" style={{ color: getPhaseColor(phase) }}>{node.label}</span>
                {duration != null && (
                  <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink-subtle)' }}>{formatElapsed(duration)}</span>
                )}
                {nodeLogs.length > 0 && (
                  <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{nodeLogs.length} log{nodeLogs.length !== 1 ? 's' : ''}</span>
                )}
                <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginLeft: 'auto' }}>
                  {isExpanded ? '\u25BC' : '\u25B6'}
                </span>
              </div>
              {isExpanded && nodeLogs.length > 0 && (
                <div className="ml-12 mb-2 p-2 overflow-y-auto" style={{
                  background: 'var(--ibm-surface-1)',
                  border: '1px solid var(--ibm-hairline)',
                  maxHeight: 200,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px',
                  lineHeight: '1.5',
                }}>
                  {nodeLogs.map((entry) => {
                    const style = LEVEL_STYLES[entry.level] ?? { color: '#161616', prefix: 'LOG' };
                    return (
                      <div key={entry.id} className="flex gap-2">
                        <span style={{ color: 'var(--ibm-ink-subtle)' }} className="shrink-0 tabular-nums">{formatTime(entry.createdAt)}</span>
                        <span style={{ color: style.color }} className="shrink-0 w-8 font-semibold">{style.prefix}</span>
                        <span style={{ color: style.color }} className="flex-1">{entry.message}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (scanStatus === 'PENDING' && jobs.length === 0) {
    return (
      <div className="space-y-3 py-2">
        <div className="flex items-center gap-2" style={{ color: 'var(--ibm-ink-muted)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--ibm-ink-subtle)', display: 'inline-block' }} />
          <span className="ibm-body-sm">Queued</span>
          <button
            onClick={handleResume}
            disabled={resuming}
            style={{
              marginLeft: 8,
              background: 'var(--ibm-primary)',
              color: '#ffffff',
              fontSize: '14px',
              padding: '12px 16px',
              cursor: resuming ? 'not-allowed' : 'pointer',
            }}
          >
            {resuming ? 'Starting...' : 'Start'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 py-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div style={{
            width: 192, height: 8, background: 'var(--ibm-hairline)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'var(--ibm-primary)', transition: 'width 0.5s', width: `${progress}%`,
            }} />
          </div>
          <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink-muted)' }}>{progress}%</span>
        </div>
        <div className="flex items-center gap-3">
          {totalElapsed != null && (
            <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink-muted)' }}>
              {formatElapsed(totalElapsed)}
            </span>
          )}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{
              background: 'var(--ibm-semantic-error)',
              color: '#ffffff',
              fontSize: '14px',
              padding: '12px 16px',
              cursor: cancelling ? 'not-allowed' : 'pointer',
            }}
          >
            {cancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-0">
        {NODE_PIPELINE.map((node) => {
          const phase = getNodePhase(node.id);
          const job = getJobForNode(node.id);
          const nodeLogs = getNodeLogs(node.source);
          const isExpanded = expandedNodes.has(node.id);
          const duration = job?.startedAt && job?.completedAt
            ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
            : null;

          return (
            <div key={node.id}>
              <div
                className="flex items-center gap-3 py-1.5 pl-4 cursor-pointer"
                style={{ borderLeft: `2px solid ${getPhaseColor(phase)}` }}
                onClick={() => toggleNode(node.id)}
              >
                {getPhaseIcon(phase)}
                <span className="ibm-body-sm" style={{ color: getPhaseColor(phase) }}>
                  {node.label}
                </span>
                {phase === 'running' && (
                  <span className="ibm-caption" style={{ color: 'var(--ibm-primary)', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                    running...
                  </span>
                )}
                {duration != null && (
                  <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink-subtle)' }}>{formatElapsed(duration)}</span>
                )}
                {nodeLogs.length > 0 && (
                  <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{nodeLogs.length} log{nodeLogs.length !== 1 ? 's' : ''}</span>
                )}
                {job?.error && (
                  <span className="ibm-caption truncate max-w-48" style={{ color: 'var(--ibm-semantic-error)', opacity: 0.7 }}>{job.error}</span>
                )}
                <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginLeft: 'auto' }}>
                  {isExpanded ? '\u25BC' : '\u25B6'}
                </span>
              </div>
              {isExpanded && nodeLogs.length > 0 && (
                <div className="ml-12 mb-2 p-2 overflow-y-auto" style={{
                  background: 'var(--ibm-surface-1)',
                  border: '1px solid var(--ibm-hairline)',
                  maxHeight: 240,
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '12px',
                  lineHeight: '1.5',
                }}>
                  {nodeLogs.map((entry) => {
                    const style = LEVEL_STYLES[entry.level] ?? { color: '#161616', prefix: 'LOG' };
                    return (
                      <div key={entry.id} className="flex gap-2">
                        <span style={{ color: 'var(--ibm-ink-subtle)' }} className="shrink-0 tabular-nums">{formatTime(entry.createdAt)}</span>
                        <span style={{ color: style.color }} className="shrink-0 w-8 font-semibold">{style.prefix}</span>
                        <span style={{ color: style.color }} className="flex-1">{entry.message}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}