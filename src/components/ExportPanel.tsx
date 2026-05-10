'use client';

import { DOWNLOAD_PREFIX } from '@/lib/branding';

interface ExportPanelProps {
  scanId: string;
}

const extensions: Record<string, string> = {
  json: '.json',
  csv: '.csv',
  sarif: '.sarif.json',
  html: '.html',
  markdown: '.md',
};

const buttonStyle: React.CSSProperties = {
  background: 'var(--ibm-canvas)',
  border: '1px solid var(--ibm-hairline)',
  borderBottom: '2px solid var(--ibm-primary)',
  padding: '12px 16px',
  fontSize: '14px',
  fontFamily: "'IBM Plex Sans', sans-serif",
  letterSpacing: '0.16px',
  color: 'var(--ibm-ink)',
  cursor: 'pointer',
  borderRadius: 0,
};

export default function ExportPanel({ scanId }: ExportPanelProps) {
  const handleExport = async (format: string) => {
    try {
      const res = await fetch(`/api/v1/scans/${scanId}/export?format=${format}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${DOWNLOAD_PREFIX}-${scanId}${extensions[format]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div>
      <p className="ibm-eyebrow" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 12 }}>
        Export
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => handleExport('json')} style={buttonStyle}>JSON</button>
        <button onClick={() => handleExport('csv')} style={buttonStyle}>CSV</button>
        <button onClick={() => handleExport('sarif')} style={buttonStyle}>SARIF</button>
        <button onClick={() => handleExport('html')} style={buttonStyle}>HTML</button>
        <button onClick={() => handleExport('markdown')} style={buttonStyle}>Markdown</button>
      </div>
    </div>
  );
}