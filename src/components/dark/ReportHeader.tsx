'use client';

interface ReportHeaderProps {
  scanId: string;
  repoUrl: string;
  branch: string;
  status: string;
  createdAt: string;
  onRescan: () => void;
  rescanLoading: boolean;
}

const STATUS_DOT: Record<string, string> = {
  COMPLETED: 'var(--ibm-semantic-success)',
  FAILED: 'var(--ibm-semantic-error)',
  RUNNING: 'var(--ibm-primary)',
};

export default function ReportHeader({
  scanId,
  repoUrl,
  branch,
  status,
  createdAt,
  onRescan,
  rescanLoading,
}: ReportHeaderProps) {
  const dotColor = STATUS_DOT[status] ?? 'var(--ibm-ink-subtle)';

  return (
    <header
      style={{
        background: 'var(--ibm-surface-1)',
        borderBottom: '1px solid var(--ibm-hairline)',
        padding: '24px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span
          style={{
            fontSize: 32,
            fontWeight: 300,
            lineHeight: 1.25,
            color: 'var(--ibm-ink)',
            wordBreak: 'break-all',
          }}
        >
          {repoUrl}
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>
            {branch}
          </span>
          <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>
            |
          </span>
          <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>
            {createdAt}
          </span>
          <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>
            |
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.16px',
              color: dotColor,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: dotColor,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {status}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <a
          href={`/scans/${scanId}`}
          className="ibm-body-sm"
          style={{ color: 'var(--ibm-primary)', textDecoration: 'none' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none';
          }}
        >
          Back to scan
        </a>
        <button
          onClick={onRescan}
          disabled={rescanLoading}
          style={{
            background: rescanLoading ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)',
            color: 'var(--ibm-on-primary)',
            border: 'none',
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.16px',
            cursor: rescanLoading ? 'not-allowed' : 'pointer',
            lineHeight: 1.29,
          }}
        >
          {rescanLoading ? 'Scanning\u2026' : 'Rescan'}
        </button>
      </div>
    </header>
  );
}