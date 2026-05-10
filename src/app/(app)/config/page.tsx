'use client';

import ConfigEditor from '@/components/ConfigEditor';

export default function ConfigPage() {
  return (
    <div style={{ maxWidth: 1152, margin: '0 auto' }}>
      <h1 className="ibm-display-md" style={{ color: 'var(--ibm-ink)', marginBottom: 8 }}>
        Configuration
      </h1>
      <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 32 }}>
        Manage scan presets and AI provider settings.
      </p>
      <ConfigEditor />
    </div>
  );
}