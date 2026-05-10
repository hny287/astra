'use client';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      style={{
        background: 'transparent',
        border: '1px solid var(--ibm-hairline)',
        borderBottom: '2px solid var(--ibm-primary)',
        padding: '4px 12px',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.32px',
        textTransform: 'uppercase',
        color: 'var(--ibm-ink-muted)',
        cursor: 'pointer',
        fontFamily: "'IBM Plex Sans', sans-serif",
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {theme === 'dark' ? '☀ Light' : '☾ Dark'}
    </button>
  );
}