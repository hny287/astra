type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

const SEVERITY_STYLES: Record<Severity, { color: string; border: string }> = {
  CRITICAL: { color: 'var(--ibm-semantic-error)', border: 'var(--ibm-red-50)' },
  HIGH: { color: 'var(--ibm-semantic-error)', border: 'var(--ibm-semantic-warning)' },
  MEDIUM: { color: 'var(--ibm-semantic-warning)', border: 'var(--ibm-yellow-50)' },
  LOW: { color: 'var(--ibm-semantic-success)', border: 'var(--ibm-green-40)' },
  INFO: { color: 'var(--ibm-primary)', border: 'var(--ibm-blue-50)' },
};

interface SeverityBadgeProps {
  severity: string;
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const s = (severity as Severity) in SEVERITY_STYLES ? (severity as Severity) : 'INFO';
  const style = SEVERITY_STYLES[s];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.32px',
        textTransform: 'uppercase',
        lineHeight: 1.33,
        padding: '2px 8px',
        borderLeft: `3px solid ${style.border}`,
        color: style.color,
        background: 'transparent',
      }}
    >
      {s}
    </span>
  );
}