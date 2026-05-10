'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReportHeader from '@/components/dark/ReportHeader';
import ExecutiveSummary from '@/components/dark/ExecutiveSummary';
import ReportFileBrowser from '@/components/dark/ReportFileBrowser';
import ReportFindingDetail from '@/components/dark/ReportFindingDetail';
import { DOWNLOAD_PREFIX } from '@/lib/branding';

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
  exploitationScenario: string | null;
  codeSnippet: string;
  cwe: string[];
  owasp: string[];
  exploitScore: number;
  description: string;
  remediation: string;
  language: string;
}

interface BusinessLogicRule {
  id: string;
  ruleText: string;
  confidence: number;
  evidenceFiles: string[];
  status: 'CANDIDATE' | 'CONFIRMED' | 'REJECTED';
  violationDescription: string | null;
}

interface ScanData {
  id: string;
  repoUrl: string;
  branch: string;
  status: string;
  createdAt: string;
  durationSeconds: number | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  findings: Finding[];
  businessRules: BusinessLogicRule[];
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;
  const [scan, setScan] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rescanLoading, setRescanLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'summary' | 'files' | 'findings'>('summary');

  const fetchScan = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/scans/${scanId}`);
      if (res.ok) setScan(await res.json());
    } catch {}
    setLoading(false);
  }, [scanId]);

  useEffect(() => { fetchScan(); }, [fetchScan]);

  const handleRescan = async () => {
    if (!scan) return;
    setRescanLoading(true);
    try {
      const res = await fetch('/api/v1/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: scan.repoUrl, branch: scan.branch }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/scans/${data.scanId}`);
      }
    } catch {}
    setRescanLoading(false);
  };

  const handleExport = async (format: string) => {
    const res = await fetch(`/api/v1/scans/${scanId}/export?format=${format}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = format === 'sarif' ? 'sarif.json' : format === 'html' ? 'html' : format === 'markdown' ? 'md' : format === 'csv' ? 'csv' : 'json';
    a.download = `${DOWNLOAD_PREFIX}-report.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div style={{ background: 'var(--ibm-canvas)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p className="ibm-body" style={{ color: 'var(--ibm-ink-muted)' }}>Loading report...</p></div>;
  if (!scan) return <div style={{ background: 'var(--ibm-canvas)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p className="ibm-body" style={{ color: 'var(--ibm-ink-muted)' }}>Scan not found.</p></div>;

  const sectionTabs: { id: 'summary' | 'files' | 'findings'; label: string }[] = [
    { id: 'summary', label: 'Executive summary' },
    { id: 'files', label: 'File browser' },
    { id: 'findings', label: 'All findings' },
  ];

  return (
    <div style={{ background: 'var(--ibm-canvas)', minHeight: '100vh', color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif" }}>
      <ReportHeader
        scanId={scan.id}
        repoUrl={scan.repoUrl}
        branch={scan.branch}
        status={scan.status}
        createdAt={scan.createdAt}
        onRescan={handleRescan}
        rescanLoading={rescanLoading}
      />

      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)', borderTop: '1px solid var(--ibm-hairline)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1584, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {sectionTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                style={{
                  padding: '12px 20px', fontSize: '14px', fontWeight: activeSection === tab.id ? 600 : 400,
                  letterSpacing: '0.16px', lineHeight: 1.29, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: activeSection === tab.id ? 'var(--ibm-primary)' : 'var(--ibm-ink-muted)',
                  borderBottom: activeSection === tab.id ? '2px solid var(--ibm-primary)' : '2px solid transparent',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { format: 'html', label: 'HTML' },
              { format: 'markdown', label: 'Markdown' },
              { format: 'csv', label: 'CSV' },
              { format: 'json', label: 'JSON' },
              { format: 'sarif', label: 'SARIF' },
            ].map(btn => (
              <button
                key={btn.format}
                onClick={() => handleExport(btn.format)}
                style={{
                  background: 'transparent', border: '1px solid var(--ibm-hairline)', borderBottom: '2px solid var(--ibm-primary)',
                  padding: '8px 16px', fontSize: '12px', letterSpacing: '0.16px', color: 'var(--ibm-ink)',
                  cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1584, margin: '0 auto', padding: '32px 32px 96px' }}>
        {activeSection === 'summary' && (
          <ExecutiveSummary
            findings={scan.findings}
            totalTokens={{ input: scan.totalInputTokens, output: scan.totalOutputTokens }}
            durationSeconds={scan.durationSeconds}
          />
        )}

        {activeSection === 'files' && (
          <div style={{ border: '1px solid var(--ibm-hairline)' }}>
            <ReportFileBrowser findings={scan.findings.map(f => ({ file: f.file, severity: f.severity, title: f.title, lineStart: f.lineStart }))} />
          </div>
        )}

        {activeSection === 'findings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {scan.findings.map((f, i) => (
              <ReportFindingDetail key={f.id || i} finding={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}