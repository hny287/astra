'use client';

import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  level: string;
  source: string;
  message: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

interface LiveLogProps {
  scanId: string;
  isRunning: boolean;
}

const LEVEL_STYLES: Record<string, { color: string; prefix: string }> = {
  debug: { color: '#8c8c8c', prefix: 'DBG' },
  info: { color: '#0f62fe', prefix: 'INF' },
  success: { color: '#198038', prefix: 'OK ' },
  warn: { color: '#b28600', prefix: 'WRN' },
  error: { color: '#da1e28', prefix: 'ERR' },
};

export default function LiveLog({ scanId, isRunning }: LiveLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const lastIdRef = useRef<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const fetchLogs = async () => {
      try {
        const params = new URLSearchParams();
        if (lastIdRef.current) params.set('after', lastIdRef.current);
        params.set('limit', '100');
        const res = await fetch(`/api/v1/scans/${scanId}/logs?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (data.logs && data.logs.length > 0) {
            setLogs(prev => [...prev, ...data.logs]);
            lastIdRef.current = data.logs[data.logs.length - 1].id;
          }
        }
      } catch {}
    };

    fetchLogs();
    if (isRunning) {
      interval = setInterval(fetchLogs, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanId, isRunning]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>
          Live Log
        </h2>
        {isRunning && (
          <span className="ibm-caption" style={{ color: 'var(--ibm-primary)' }}>
            streaming...
          </span>
        )}
      </div>
      <div
        ref={logContainerRef}
        className="h-80 overflow-y-auto p-3"
        style={{
          background: 'var(--ibm-surface-1)',
          border: '1px solid var(--ibm-hairline)',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '13px',
          lineHeight: '1.6',
        }}
      >
        {logs.length === 0 && isRunning && (
          <div style={{ color: 'var(--ibm-ink-subtle)' }}>Waiting for logs...</div>
        )}
        {logs.map((entry) => {
          const style = LEVEL_STYLES[entry.level] ?? { color: '#161616', prefix: 'LOG' };
          const time = new Date(entry.createdAt).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          return (
            <div key={entry.id} className="flex gap-2">
              <span style={{ color: 'var(--ibm-ink-subtle)' }} className="shrink-0 tabular-nums">{time}</span>
              <span style={{ color: style.color }} className="shrink-0 w-8 font-semibold">{style.prefix}</span>
              <span style={{ color: 'var(--ibm-primary)', opacity: 0.7 }} className="shrink-0 w-20 truncate">{entry.source}</span>
              <span style={{ color: style.color }} className="flex-1">{entry.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}