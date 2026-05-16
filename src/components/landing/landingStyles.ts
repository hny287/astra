// src/components/landing/landingStyles.ts
// Design token system and shared style fragments for the landing page.
// Dark theme only. No IBM Carbon dependency.

export const landingTokens = {
  // Backgrounds
  bgCanvas: '#0a0a0a',
  bgSurface1: '#161616',
  bgSurface2: '#1c1c1c',
  bgSurface3: '#262626',

  // Text
  inkPrimary: '#f4f4f4',
  inkSecondary: '#a8a8a8',
  inkMuted: '#6f6f6f',

  // Accents
  accentPrimary: '#0f62fe',
  accentPrimaryHover: '#4589ff',
  accentCritical: '#da1e28',
  accentHigh: '#f57c00',
  accentMedium: '#f1c21b',
  accentLow: '#24a148',
  accentInfo: '#0093b7',

  // Borders
  borderSubtle: '#393939',
  borderMedium: '#525252',

  // Typography
  fontSans: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
  fontMono: "'IBM Plex Mono', 'Courier New', monospace",

  // Spacing
  maxWidth: '1200px',
  sectionPadding: '80px 0',
  sectionPaddingMobile: '48px 0',

  // Breakpoints (matching Carbon)
  md: 672,
  lg: 1056,
  xl: 1312,
  max: 1584,
} as const;

// Shared style fragments used across multiple sections
export const sectionStyles = {
  section: {
    padding: `${landingTokens.sectionPadding}`,
    maxWidth: landingTokens.maxWidth,
    margin: '0 auto',
    paddingLeft: '24px',
    paddingRight: '24px',
  } as React.CSSProperties,
  sectionDark: {
    padding: `${landingTokens.sectionPadding}`,
    maxWidth: landingTokens.maxWidth,
    margin: '0 auto',
    paddingLeft: '24px',
    paddingRight: '24px',
    background: landingTokens.bgCanvas,
  } as React.CSSProperties,
  eyebrow: {
    fontSize: '14px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: landingTokens.accentPrimary,
    marginBottom: '12px',
  } as React.CSSProperties,
  headline: {
    fontSize: '48px',
    fontWeight: 600,
    lineHeight: 1.15,
    color: landingTokens.inkPrimary,
    marginBottom: '24px',
  } as React.CSSProperties,
  subhead: {
    fontSize: '18px',
    fontWeight: 300,
    lineHeight: 1.5,
    color: landingTokens.inkSecondary,
    maxWidth: '640px',
  } as React.CSSProperties,
  card: {
    background: landingTokens.bgSurface2,
    borderRadius: '8px',
    padding: '24px',
    border: `1px solid ${landingTokens.borderSubtle}`,
    transition: 'border-color 0.2s ease, transform 0.2s ease',
  } as React.CSSProperties,
  badge: (color: string): React.CSSProperties => ({
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    padding: '3px 8px',
    borderRadius: '4px',
    background: `${color}20`,
    color: color,
    border: `1px solid ${color}40`,
    display: 'inline-block',
  }),
} as const;