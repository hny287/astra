// src/components/landing/landingLayout.ts
// Shared layout constants, hooks, and helpers for the landing page.
// Light IBM Carbon design system — white/gray alternating sections.

import { useState, useEffect } from 'react';

// ─── Layout ────────────────────────────────────────────────────────
export const MAX_WIDTH = 1200;
export const BREAKPOINTS = {
  mobile: 672,
  tablet: 1056,
  desktop: 1312,
  max: 1584,
} as const;

export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 80,
} as const;

export const TRANSITION = '0.3s cubic-bezier(0, 0, 0.38, 0.9)';

// ─── Light Carbon Color System ─────────────────────────────────────
export const colors = {
  // Backgrounds
  bg:            '#ffffff',
  bgAlt:         '#f4f4f4',
  // Surfaces
  surface:       '#ffffff',
  surfaceAlt:   '#f4f4f4',
  surfaceHover:  '#e8e8e8',
  surfaceElevated: '#ffffff',
  // Borders
  border:        '#e0e0e0',
  borderLight:   '#f0f0f0',
  borderHover:   '#c6c6c6',
  borderStrong:  '#c6c6c6',
  // Text
  text:          '#161616',
  textSecondary: '#525252',
  textMuted:     '#a8a8a8',
  // Accent (IBM Blue 60)
  accent:        '#0f62fe',
  accentHover:   '#0043ce',
  accentDim:     '#d0e2ff',
  accentBorder:  '#a6c8ff',
  // Semantic
  success:       '#198038',
  successDim:    '#defbe6',
  warning:       '#d0a019',
  warningDim:    '#fddc69',
  error:         '#da1e28',
  errorDim:      '#fff1f1',
  info:          '#0093b7',
  cyan:          '#0072c3',
  cyanDim:       '#d0e2ff',
  purple:        '#6929c4',
  purpleDim:     '#e8daff',
  // Footer (dark inverse)
  footerBg:      '#161616',
  footerText:   '#c6c6c6',
  footerTextHover: '#ffffff',
  gradientStart: '#0f62fe',
  gradientEnd:   '#6929c4',
} as const;

// ─── Breakpoint Hook ──────────────────────────────────────────────
export function useBreakpoint(): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
} {
  const [state, setState] = useState({ isMobile: false, isTablet: false, isDesktop: true });

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setState({
        isMobile: w < BREAKPOINTS.mobile,
        isTablet: w >= BREAKPOINTS.mobile && w < BREAKPOINTS.tablet,
        isDesktop: w >= BREAKPOINTS.tablet,
      });
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return state;
}

// ─── Section Styles ───────────────────────────────────────────────
export function sectionInner(isMobile: boolean): React.CSSProperties {
  return {
    maxWidth: MAX_WIDTH,
    margin: '0 auto',
    paddingLeft: isMobile ? '20px' : '24px',
    paddingRight: isMobile ? '20px' : '24px',
  };
}

// ─── Badge Style Helper ───────────────────────────────────────────
export function badgeStyle(color: string, variant: 'filled' | 'outline' = 'outline'): React.CSSProperties {
  const isAccent = color === colors.accent || color === '#0f62fe';
  const base: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    padding: '3px 10px',
    borderRadius: '2px',
    display: 'inline-flex',
    alignItems: 'center',
  };

  if (variant === 'filled') {
    return { ...base, background: color, color: '#fff' };
  }

  const dimBg = color + '18';
  const dimBorder = color + '40';
  return { ...base, background: dimBg, color, border: `1px solid ${dimBorder}` };
}

// ─── Tier Color Helper ───────────────────────────────────────────
export function tierColor(tier: string | null): string {
  switch (tier) {
    case 'Enterprise': return colors.error;
    case 'Pro': return colors.warning;
    case 'Pro/Enterprise': return colors.warning;
    case 'Free': return colors.success;
    default: return colors.textMuted;
  }
}

// ─── Severity Color Mapping ───────────────────────────────────────
export const severityColor: Record<string, string> = {
  CRITICAL: colors.error,
  HIGH: colors.warning,
  MEDIUM: '#8a6f00',
  LOW: colors.success,
  INFO: colors.cyan,
};

// ─── Reusable Style Fragments ─────────────────────────────────────
export const eyebrow: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: colors.accent,
  marginBottom: '16px',
  textAlign: 'center',
};

export const sectionTitle: React.CSSProperties = {
  fontSize: '42px',
  fontWeight: 300,
  color: colors.text,
  lineHeight: 1.15,
  textAlign: 'center',
  marginBottom: '16px',
  letterSpacing: '-0.01em',
};

export const sectionSubtitle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 400,
  color: colors.textSecondary,
  lineHeight: 1.6,
  textAlign: 'center',
  maxWidth: '640px',
  marginLeft: 'auto',
  marginRight: 'auto',
  marginBottom: '48px',
};