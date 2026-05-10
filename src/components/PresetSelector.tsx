'use client';

import { useState, useEffect } from 'react';

interface Preset {
  id: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
}

interface PresetSelectorProps {
  onChange: (config: Record<string, unknown> | null) => void;
}

export default function PresetSelector({ onChange }: PresetSelectorProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/v1/presets')
      .then((r) => r.json())
      .then((data) => setPresets(data.presets ?? []))
      .catch(() => {});
  }, []);

  const handleChange = (id: string) => {
    setSelected(id);
    const preset = presets.find((p) => p.id === id);
    onChange(preset?.config ?? null);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          background: 'var(--ibm-surface-1)',
          border: '1px solid var(--ibm-hairline)',
          borderBottom: open ? '2px solid var(--ibm-primary)' : '1px solid var(--ibm-hairline-strong)',
          padding: '11px 16px',
          fontSize: '16px',
          fontWeight: 400,
          letterSpacing: '0.16px',
          color: selected ? 'var(--ibm-ink)' : 'var(--ibm-ink-subtle)',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{selected ? presets.find(p => p.id === selected)?.name : 'No preset'}</span>
        <span style={{ fontSize: 10, color: 'var(--ibm-ink-subtle)' }}>{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', borderTop: 'none',
          maxHeight: 200, overflowY: 'auto',
        }}>
          <div
            onClick={() => { setSelected(''); onChange(null); setOpen(false); }}
            style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--ibm-hairline)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ibm-surface-1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>No preset</span>
          </div>
          {presets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handleChange(preset.id)}
              style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--ibm-hairline)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ibm-surface-1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span className="ibm-body-sm" style={{ color: preset.id === selected ? 'var(--ibm-primary)' : 'var(--ibm-ink)' }}>
                {preset.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}