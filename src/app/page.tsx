'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { APP_NAME } from '@/lib/branding';
import { useVisible, useCountUp } from '@/components/landing/landingAnimations';
import { useBreakpoint } from '@/components/landing/landingLayout';
import { findingCategories, stackData, platformModules, features, enterpriseFeatures, footerCols } from '@/components/landing/landingData';
import { demoFindings, rawOutputExample, enrichedOutputExample } from '@/components/landing/demoData';

// ─── IBM Carbon Design Tokens ────────────────────────────────────
// Following Carbon's strict spec: 0px radius, IBM Plex Sans weight-300 display,
// #0f62fe as the ONLY accent, canvas/surface-1 alternation, no shadows.
const c = {
  // Surfaces
  canvas:      '#ffffff',
  surface1:    '#f4f4f4',
  // Ink (text)
  ink:         '#161616',
  ink2:        '#525252',
  ink3:        '#8c8c8c',
  // Accent — IBM Blue 60 (the only chromatic accent in the system)
  blue:        '#0f62fe',
  blue60:      '#0043ce',
  blue80:      '#002d9c',
  blueDim:     '#d0e2ff',
  blueBorder:  '#a6c8ff',
  // Borders
  hair:        '#e0e0e0',
  hairStrong:  '#c6c6c6',
  // Semantic
  red:         '#da1e28',
  redDim:      '#fff1f1',
  redBorder:   '#ffd7d9',
  green:       '#24a148',
  greenDim:    '#defbe6',
  greenBorder: '#a7f0ba',
  yellow:      '#f1c21b',
  yellowDim:   '#fdf4d8',
  cyan:        '#0072c3',
  // Footer
  footerBg:    '#161616',
  footerText:  '#c6c6c6',
  footerDim:   '#6f6f6f',
};

// ─── Severity → color map ─────────────────────────────────────────
const sevColor: Record<string, string> = {
  CRITICAL: c.red, HIGH: '#b45309', MEDIUM: c.cyan, LOW: c.green,
};
const sevBg: Record<string, string> = {
  CRITICAL: c.redDim, HIGH: '#fef9ec', MEDIUM: c.blueDim, LOW: c.greenDim,
};
const sevBorder: Record<string, string> = {
  CRITICAL: c.redBorder, HIGH: c.yellow, MEDIUM: c.blueBorder, LOW: c.greenBorder,
};
const tierColor = (t: string | null): string =>
  t === 'Enterprise' ? c.red : (t === 'Pro' || t?.includes('Pro')) ? c.yellow : c.green;

// ─── Shared style factories (Carbon spec) ─────────────────────────
const badge = (color: string): React.CSSProperties => ({
  fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
  padding: '3px 10px', display: 'inline-flex', alignItems: 'center',
  background: color + '1a', color, border: `1px solid ${color}44`,
  borderRadius: 0,
});

// Container / section helpers
const wrap = (m: boolean): React.CSSProperties => ({
  maxWidth: 1200, margin: '0 auto', paddingLeft: m ? 20 : 24, paddingRight: m ? 20 : 24,
});
const sectionPad = (m: boolean): React.CSSProperties => ({
  width: '100%', padding: m ? '64px 0' : '96px 0',
});
const sectionPadSm = (m: boolean): React.CSSProperties => ({
  width: '100%', padding: m ? '48px 0' : '72px 0',
});

// Carbon type ramp
// Eyebrow: sentence case, 14px weight-400 (NOT all-caps — Carbon spec)
const eyebrow: React.CSSProperties = {
  fontSize: 14, fontWeight: 400, letterSpacing: '0.16px',
  color: c.blue, marginBottom: 16,
};
// Section h2: weight-300 is the IBM Plex Sans brand signature for display sizes
const sectionH2 = (m: boolean): React.CSSProperties => ({
  fontSize: m ? 28 : 42, fontWeight: 300, color: c.ink, lineHeight: 1.18,
  textAlign: 'center', marginBottom: 16, letterSpacing: 0,
});
const sectionSub: React.CSSProperties = {
  fontSize: 18, fontWeight: 400, color: c.ink2, lineHeight: 1.6,
  textAlign: 'center', maxWidth: 540, marginLeft: 'auto', marginRight: 'auto',
  marginBottom: 52, letterSpacing: '0.16px',
};

// ─── Local data overrides ─────────────────────────────────────────
const compRows = [
  { feature: 'Business logic detection',              astra: true, snyk: false, semgrep: false, coderabbit: false },
  { feature: 'Cross-file reasoning',                  astra: true, snyk: false, semgrep: false, coderabbit: true  },
  { feature: 'AI-enriched findings with working fixes', astra: true, snyk: false, semgrep: false, coderabbit: true  },
  { feature: 'Source code stays on-prem',             astra: true, snyk: false, semgrep: false, coderabbit: false },
  { feature: 'Exploit scoring per finding',           astra: true, snyk: false, semgrep: false, coderabbit: false },
  { feature: 'All attack surfaces in one platform',   astra: true, snyk: false, semgrep: false, coderabbit: false },
  { feature: 'Bring your own AI model',               astra: true, snyk: false, semgrep: false, coderabbit: false },
] as const;

const compCols = [
  { key: 'astra',      label: APP_NAME },
  { key: 'snyk',       label: 'Snyk'       },
  { key: 'semgrep',    label: 'Semgrep'    },
  { key: 'coderabbit', label: 'CodeRabbit' },
] as const;

const byoModels = [
  { label: 'GPT-4o',          provider: 'OpenAI',                   color: c.green  },
  { label: 'Claude 3.7',      provider: 'Anthropic',                color: c.blue   },
  { label: 'Llama 3',         provider: 'Ollama (fully air-gapped)', color: c.yellow },
  { label: 'Mistral',         provider: 'AWS Bedrock',              color: c.cyan   },
  { label: 'Custom endpoint', provider: 'Any OpenAI-compatible API', color: c.ink3  },
];

// ─── Main Page ────────────────────────────────────────────────────
export default function LandingPage() {
  const { status } = useSession();
  const router     = useRouter();
  const { isMobile: m } = useBreakpoint();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/scans');
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') return null;

  return (
    <div style={{ background: c.canvas, minHeight: '100vh', color: c.ink }}>
      <Nav m={m} />
      <HeroSection m={m} />
      <PainSection m={m} />
      <DemoSection m={m} />
      <HowItWorksSection m={m} />
      <ModulesSection m={m} />
      <PrivacySection m={m} />
      <StackSection m={m} />
      <EnterpriseSection m={m} />
      <ByoSection m={m} />
      <CompetitionSection m={m} />
      <CtaFooterSection m={m} />
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────
function Nav({ m }: { m: boolean }) {
  const [open, setOpen] = useState(false);
  const links = [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Modules',      href: '#modules'       },
    { label: 'Security',     href: '#security'      },
    { label: 'Compare',      href: '#comparison'    },
  ];
  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, height: 48,
        background: c.canvas, borderBottom: `1px solid ${c.hair}`,
      }}>
        <div style={{ ...wrap(m), height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontSize: 16, fontWeight: 600, color: c.ink, textDecoration: 'none' }}>
            {APP_NAME}
          </Link>
          {!m && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              {links.map(l => (
                <a key={l.href} href={l.href} style={{ fontSize: 14, fontWeight: 400, color: c.ink2, textDecoration: 'none', letterSpacing: '0.16px' }}>
                  {l.label}
                </a>
              ))}
              <Link href="/auth/signin" style={{ fontSize: 14, fontWeight: 600, color: c.blue, textDecoration: 'none', letterSpacing: '0.16px' }}>
                Sign in →
              </Link>
            </div>
          )}
          {m && (
            <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: c.ink }}>
              <svg width="20" height="14" viewBox="0 0 20 14"><rect width="20" height="2" rx="0" fill="currentColor"/><rect y="6" width="20" height="2" rx="0" fill="currentColor"/><rect y="12" width="20" height="2" rx="0" fill="currentColor"/></svg>
            </button>
          )}
        </div>
      </nav>
      {m && open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: c.canvas, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }} onClick={() => setOpen(false)}>
          {links.map(l => <a key={l.href} href={l.href} onClick={() => setOpen(false)} style={{ fontSize: 22, fontWeight: 300, color: c.ink2, textDecoration: 'none' }}>{l.label}</a>)}
          <Link href="/auth/signin" onClick={() => setOpen(false)} style={{ fontSize: 22, fontWeight: 600, color: c.blue, textDecoration: 'none' }}>Sign in →</Link>
        </div>
      )}
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────
function HeroSection({ m }: { m: boolean }) {
  const { ref, visible } = useVisible(0.1);
  const s0 = useCountUp(7,  1400, visible);
  const s1 = useCountUp(43, 1800, visible);
  const s2 = useCountUp(0,  500,  visible);

  return (
    <section ref={ref} style={{ ...sectionPad(m), background: c.canvas, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: '0.45s ease' }}>
      <div style={wrap(m)}>
        <div style={{ display: 'flex', flexDirection: m ? 'column' : 'row', gap: m ? 40 : 64, alignItems: m ? 'flex-start' : 'center' }}>
          {/* Left copy */}
          <div style={{ flex: m ? undefined : '1 1 55%', maxWidth: m ? undefined : 580 }}>
            <p style={eyebrow}>AI-native application security</p>
            <h1 style={{ fontSize: m ? 36 : 72, fontWeight: 300, color: c.ink, lineHeight: 1.08, letterSpacing: '-0.5px', marginBottom: 24, maxWidth: 580 }}>
              Your scanners give you alerts.{' '}
              <span style={{ color: c.blue }}>{APP_NAME} tells you what to fix.</span>
            </h1>
            <p style={{ fontSize: 18, fontWeight: 400, color: c.ink2, lineHeight: 1.6, marginBottom: 36, maxWidth: 480, letterSpacing: '0.16px' }}>
              Seven battle-tested scanners. AI that reasons across your entire codebase. Every finding enriched with a working fix, an exploit score, and the business context your team actually needs — not just another alert queue.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 32 }}>
              <a href="#how-it-works" style={{ display: 'inline-flex', alignItems: 'center', padding: '13px 20px', fontSize: 14, fontWeight: 400, background: c.blue, color: '#fff', textDecoration: 'none', letterSpacing: '0.16px', borderRadius: 0 }}>
                Scan your first repo free →
              </a>
              <a href="#demo" style={{ display: 'inline-flex', alignItems: 'center', padding: '13px 20px', fontSize: 14, fontWeight: 400, background: c.ink, color: '#fff', textDecoration: 'none', letterSpacing: '0.16px', borderRadius: 0 }}>
                See it in action
              </a>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['No agent to install', 'Source code stays on-prem', '8 security modules', 'Bring your own model'].map(tag => (
                <span key={tag} style={badge(c.blue)}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Terminal */}
          <div style={{ flex: m ? undefined : '1 1 45%', minWidth: 0 }}>
            <Terminal m={m} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr 1fr 1fr' : 'repeat(3, 1fr)', gap: m ? 20 : 32, marginTop: m ? 48 : 64, paddingTop: m ? 40 : 56, borderTop: `1px solid ${c.hair}` }}>
          {[
            { val: s0, suffix: '+', label: 'Bundled security scanners' },
            { val: s1, suffix: '+', label: 'Compliance frameworks out of the box' },
            { val: s2, suffix: '',  label: 'Lines of source code ever leave your environment' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: m ? 40 : 56, fontWeight: 300, color: c.ink, lineHeight: 1.05 }}>
                {stat.val}<span style={{ fontSize: m ? 28 : 36, color: c.blue }}>{stat.suffix}</span>
              </div>
              <div style={{ fontSize: 14, color: c.ink2, marginTop: 8, lineHeight: 1.4, letterSpacing: '0.16px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Terminal ─────────────────────────────────────────────────────
function Terminal({ m }: { m: boolean }) {
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [shown, setShown]   = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cycle = () => {
      setPhase('idle'); setShown(0);
      timer.current = setTimeout(() => {
        setPhase('scanning');
        timer.current = setTimeout(() => {
          setPhase('done');
          let n = 0;
          const stagger = () => {
            if (n < demoFindings.length) { n++; setShown(n); timer.current = setTimeout(stagger, 380); }
            else { timer.current = setTimeout(cycle, 5000); }
          };
          stagger();
        }, 2200);
      }, 500);
    };
    cycle();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);

  const pipeSteps = ['clone', 'discover', 'scan', 'deep', 'cross', 'persist'];
  const activeSteps = phase === 'idle' ? 0 : phase === 'done' ? 6 : 3;
  const statusText = phase === 'idle' ? 'Initialising…' : phase === 'scanning' ? 'Scanning…' : `✓ ${demoFindings.length} findings — 1 critical`;

  return (
    <div style={{ background: '#13131f', border: `1px solid ${c.hair}`, borderRadius: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #2d2d3e', background: '#0e0e1a' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
      </div>
      <div style={{ padding: m ? 16 : 20, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, lineHeight: 1.7, color: '#9090a8' }}>
        <div style={{ marginBottom: 14 }}>
          <span style={{ color: c.blue }}>$</span>{' '}
          <span style={{ color: '#eee' }}>astra scan github.com/acme/payments-api</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {pipeSteps.map((step, i) => {
            const active = i < activeSteps;
            return (
              <span key={step} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 0, background: active ? '#0f62fe18' : '#1e1e2e', color: active ? '#4c8ffb' : '#555', border: `1px solid ${active ? '#0f62fe44' : '#2d2d3e'}`, transition: 'all 0.2s' }}>
                {step}
              </span>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 200 }}>
          {demoFindings.slice(0, shown).map((f, i) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#0d0d18', border: '1px solid #1e1e2e', animation: 'lpFadeUp 0.3s ease both', animationDelay: `${i * 50}ms` }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 0, background: sevBg[f.severity] || '#f4f4f4', color: sevColor[f.severity] || c.ink3, border: `1px solid ${sevBorder[f.severity] || c.hair}`, flexShrink: 0 }}>
                {f.severity}
              </span>
              <span style={{ color: '#eee', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
              <span style={{ fontSize: 11, color: '#555', flexShrink: 0 }}>{f.file}:{f.line}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #1e1e2e', fontSize: 12, color: phase === 'done' ? '#28c840' : '#444' }}>
          {statusText}
        </div>
      </div>
    </div>
  );
}

// ─── Pain ─────────────────────────────────────────────────────────
function PainSection({ m }: { m: boolean }) {
  const { ref, visible } = useVisible(0.1);
  return (
    <section ref={ref} style={{ ...sectionPad(m), background: c.surface1, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: '0.45s ease' }}>
      <div style={wrap(m)}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 52px' }}>
          <p style={eyebrow}>Why another scanner?</p>
          <h2 style={sectionH2(m)}>Scanners don&apos;t get breached.<br />Misunderstood findings do.</h2>
          <p style={{ ...sectionSub, marginBottom: 0 }}>
            You&apos;re probably already running Semgrep, Trivy, or Snyk. Here&apos;s what they&apos;re not giving you.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : 'repeat(3, 1fr)', gap: 20, minWidth: 0 }}>
          {[
            {
              accent: c.red,
              title: 'The false positive trap',
              body: 'Semgrep fires on 400 issues. Devs push back on all 400. Eventually nobody fixes anything — including the three that actually matter.',
              code: 'Severity: MEDIUM — possible SQL injection\nFile: src/db/queries.js:142\n\n[ no context, no fix, no exploit score ]',
              codeColor: c.ink3,
            },
            {
              accent: c.red,
              title: 'No context means no action',
              body: "CVE-2024-38512. Severity: CRITICAL. CVSS: 9.1. But is this route even reachable? Does your auth middleware protect it? The scanner won't say.",
              code: 'VulnerabilityID: CVE-2024-38512\nPkgName: express@4.18.2\n\n[ no path to fix, no business impact ]',
              codeColor: c.ink3,
            },
            {
              accent: c.blue,
              title: 'Business logic is invisible to pattern matchers',
              body: `Your payment flow has a race condition. Your auth has a privilege escalation vector. Regex scanners are blind to both. ${APP_NAME} isn't.`,
              code: '✓ Cross-file reasoning: auth bypass detected\n✓ Business logic flaw: order total manipulation\n✓ Exploit score: 8.4/10 — fix this first',
              codeColor: c.green,
            },
          ].map((card, i) => (
            <div key={i} style={{ border: `1px solid ${c.hair}`, borderLeft: `4px solid ${card.accent}`, padding: 28, background: c.canvas, minWidth: 0, overflow: 'hidden' }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: c.ink, marginBottom: 10 }}>{card.title}</h3>
              <p style={{ fontSize: 15, color: c.ink2, lineHeight: 1.6, letterSpacing: '0.16px' }}>{card.body}</p>
              <pre style={{ marginTop: 16, padding: 12, background: i === 2 ? '#f0fdf4' : c.surface1, border: `1px solid ${i === 2 ? c.greenBorder : c.hair}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.7, color: card.codeColor, borderRadius: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'hidden', maxWidth: '100%' }}>
                <code>{card.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Demo ─────────────────────────────────────────────────────────
function DemoSection({ m }: { m: boolean }) {
  const { ref, visible } = useVisible(0.1);
  const lines    = rawOutputExample.split('\n');
  const fixLines = enrichedOutputExample.fix.split('\n');

  return (
    <section id="demo" ref={ref} style={{ ...sectionPad(m), background: c.canvas, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: '0.45s ease' }}>
      <div style={wrap(m)}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 52px' }}>
          <p style={eyebrow}>Before and after</p>
          <h2 style={sectionH2(m)}>What context actually looks like</h2>
          <p style={{ ...sectionSub, marginBottom: 0 }}>
            Side-by-side: what your current scanner gives you versus what {APP_NAME} delivers.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: 24, minWidth: 0 }}>
          {/* Raw */}
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.ink3 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: c.ink3, letterSpacing: '0.05em' }}>Raw scanner output</span>
            </div>
            <pre style={{ margin: 0, padding: 20, background: '#13131f', border: `1px solid ${c.hair}`, borderRadius: 0, overflow: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.8, color: '#777', maxHeight: 460, maxWidth: '100%', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
              <code>
                {lines.map((line, i) => (
                  <div key={i}>
                    <span style={{ display: 'inline-block', width: 32, textAlign: 'right', paddingRight: 14, color: '#444', userSelect: 'none' }}>{i + 1}</span>
                    {line}
                  </div>
                ))}
              </code>
            </pre>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${c.hair}`, fontSize: 13, color: c.ink3, letterSpacing: '0.16px' }}>
              No context. No fix. No business impact. Good luck triaging.
            </div>
          </div>

          {/* Enriched */}
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.blue }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: c.blue, letterSpacing: '0.05em' }}>{APP_NAME} AI-enriched finding</span>
            </div>
            <div style={{ background: c.canvas, border: `1px solid ${c.blueBorder}`, padding: 24, borderRadius: 0, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.blue }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: c.ink }}>{enrichedOutputExample.title}</h3>
                <span style={{ ...badge(c.red), flexShrink: 0 }}>Critical</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: c.ink2, marginBottom: 16, letterSpacing: '0.16px' }}>{enrichedOutputExample.explanation}</p>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.green, marginBottom: 8, letterSpacing: '0.05em' }}>Suggested fix</div>
                <pre style={{ margin: 0, padding: 12, background: c.surface1, borderRadius: 0, border: `1px solid ${c.hair}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.7, overflow: 'auto', maxWidth: '100%', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  <code>
                    {fixLines.map((line, i) => {
                      let color = c.ink2;
                      if (line.startsWith('+')) color = c.green;
                      if (line.startsWith('-')) color = c.red;
                      const cleaned = line.replace(/^```diff?/, '').replace(/^```/, '');
                      return cleaned ? <div key={i} style={{ color }}>{cleaned}</div> : null;
                    })}
                  </code>
                </pre>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: c.ink2, letterSpacing: '0.05em' }}>Exploit score</span>
                <div style={{ flex: 1, height: 5, background: c.surface1, borderRadius: 0, overflow: 'hidden' }}>
                  <div style={{ width: `${(enrichedOutputExample.exploitScore / 10) * 100}%`, height: '100%', background: enrichedOutputExample.exploitScore >= 7 ? c.red : c.yellow }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{enrichedOutputExample.exploitScore}/10</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {enrichedOutputExample.cwe.map(cw => <span key={cw} style={badge(c.blue)}>{cw}</span>)}
                {enrichedOutputExample.owasp.map(o => <span key={o} style={badge(c.yellow)}>{o}</span>)}
              </div>
              <div style={{ background: c.blueDim, borderLeft: `3px solid ${c.blue}`, padding: 14, borderRadius: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.blue, marginBottom: 5, letterSpacing: '0.05em' }}>Business impact</div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: c.blue60, margin: 0, letterSpacing: '0.16px' }}>{enrichedOutputExample.businessContext}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────
function HowItWorksSection({ m }: { m: boolean }) {
  const { ref, visible } = useVisible(0.1);
  const steps = [
    {
      num: '01',
      title: 'Connect your repo',
      body: `Point ${APP_NAME} at any GitHub, GitLab, or Bitbucket repo — or drop a single docker run into your CI pipeline. Takes two minutes. No tokens, no agent installs.`,
      code: '$ astra scan github.com/acme/api\n→ cloning… detecting stack…',
      items: [] as string[],
    },
    {
      num: '02',
      title: 'Seven scanners, then AI',
      body: 'Semgrep, Trivy, Gitleaks, Checkov, Bearer CI, Bandit, and your custom plugins run in parallel. Then AI reasons across files — catching what patterns miss.',
      code: null as string | null,
      items: ['SAST, secrets, SCA, IaC — in parallel', 'AI cross-file reasoning and business logic', 'Source code never leaves your environment'],
    },
    {
      num: '03',
      title: 'Fix what matters first',
      body: 'A prioritized findings list — with working fixes, exploit scores, CWE and OWASP mappings. Review in the dashboard or push straight to Jira.',
      code: null as string | null,
      items: ['Jira, Slack, PagerDuty integrations', 'Fail CI on critical findings automatically', 'Policy-based SLA and triage enforcement'],
    },
  ];

  return (
    <section id="how-it-works" ref={ref} style={{ ...sectionPad(m), background: c.surface1, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: '0.45s ease' }}>
      <div style={wrap(m)}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 52px' }}>
          <p style={eyebrow}>How it works</p>
          <h2 style={sectionH2(m)}>Set up in minutes.<br />Findings before your next standup.</h2>
          <p style={{ ...sectionSub, marginBottom: 0 }}>
            No agents, no configuration files, no week-long onboarding. Point {APP_NAME} at a repo and get enriched findings in hours.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: m ? 'column' : 'row', border: `1px solid ${c.hair}` }}>
          {steps.map((step, i) => (
            <div key={i} style={{ flex: 1, padding: 36, borderRight: (!m && i < 2) ? `1px solid ${c.hair}` : undefined, borderBottom: (m && i < 2) ? `1px solid ${c.hair}` : undefined }}>
              <div style={{ fontSize: m ? 40 : 52, fontWeight: 300, color: c.blue, lineHeight: 1, marginBottom: 16 }}>{step.num}</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: c.ink, marginBottom: 12 }}>{step.title}</h3>
              <p style={{ fontSize: 15, color: c.ink2, lineHeight: 1.6, marginBottom: step.code || step.items.length ? 16 : 0, letterSpacing: '0.16px' }}>{step.body}</p>
              {step.code && (
                <pre style={{ margin: 0, padding: 14, background: '#13131f', borderRadius: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, lineHeight: 1.7, color: '#9090a8' }}>
                  <code>{step.code.split('\n').map((line, j) => <div key={j}><span style={{ color: j === 0 ? c.blue : '#444' }}>{j === 0 ? '$' : '→'}</span> {line.replace(/^\$\s*/, '').replace(/^→\s*/, '')}</div>)}</code>
                </pre>
              )}
              {step.items.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {step.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: c.ink2, letterSpacing: '0.16px' }}>
                      <span style={{ width: 6, height: 6, background: i === 2 ? c.green : c.blue, flexShrink: 0 }} />
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Modules ──────────────────────────────────────────────────────
function ModulesSection({ m }: { m: boolean }) {
  const { ref, visible } = useVisible(0.1);
  return (
    <section id="modules" ref={ref} style={{ ...sectionPad(m), background: c.canvas, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: '0.45s ease' }}>
      <div style={wrap(m)}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 52px' }}>
          <p style={eyebrow}>One platform, every attack surface</p>
          <h2 style={sectionH2(m)}>Eight modules. One control plane.</h2>
          <p style={{ ...sectionSub, marginBottom: 0 }}>
            Replace four different tools with one unified security platform. Every module shares the same finding format, dashboard, and integrations.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : 'repeat(4, 1fr)', gap: 0, border: `1px solid ${c.hair}` }}>
          {platformModules.map((mod, i) => {
            const col = i % 4, row = Math.floor(i / 4);
            return (
              <div key={mod.id} style={{ padding: 24, borderRight: (!m && col < 3) ? `1px solid ${c.hair}` : undefined, borderBottom: row < 1 ? `1px solid ${c.hair}` : undefined, borderLeft: `3px solid ${mod.color}`, background: c.canvas }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: c.ink }}>{mod.title}</h3>
                  <span style={{ ...badge(tierColor(mod.tier)), marginLeft: 8, flexShrink: 0 }}>{mod.tier}</span>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: c.ink2, letterSpacing: '0.16px' }}>{mod.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Privacy ──────────────────────────────────────────────────────
function PrivacySection({ m }: { m: boolean }) {
  const { ref, visible } = useVisible(0.1);
  return (
    <section ref={ref} style={{ ...sectionPad(m), background: c.surface1, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: '0.45s ease' }}>
      <div style={wrap(m)}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <div style={{ borderLeft: `4px solid ${c.blue}`, padding: m ? '28px 24px' : '36px 40px', background: c.canvas }}>
            <p style={{ ...eyebrow, textAlign: 'left' }}>The one thing most security vendors skip</p>
            <h2 style={{ fontSize: m ? 28 : 42, fontWeight: 300, color: c.ink, lineHeight: 1.18, marginBottom: 20, textAlign: 'left' }}>
              Your source code never leaves your environment.<br />Not once.
            </h2>
            <p style={{ fontSize: 18, fontWeight: 400, color: c.ink2, lineHeight: 1.6, maxWidth: 640, marginBottom: 32, letterSpacing: '0.16px' }}>
              {APP_NAME}&apos;s data plane — the container that actually reads and analyses your code — runs inside your own CI environment. Only normalized JSON findings are ever transmitted to the control plane. Your intellectual property stays where it belongs.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : 'repeat(3, 1fr)', gap: 0, border: `1px solid ${c.hairStrong}`, marginBottom: 32 }}>
              {[
                { title: 'What stays on-prem', body: 'All source code, all AI inference, all raw scanner output, all secrets and tokens' },
                { title: `What travels to ${APP_NAME}`, body: 'Normalized findings only — file path, line number, severity, fix suggestion' },
                { title: 'AI model options', body: 'Air-gapped Ollama, AWS Bedrock, Azure OpenAI, Anthropic Claude, or any OpenAI-compatible endpoint' },
              ].map((item, i) => (
                <div key={i} style={{ padding: 20, borderRight: (!m && i < 2) ? `1px solid ${c.hairStrong}` : undefined, borderBottom: (m && i < 2) ? `1px solid ${c.hairStrong}` : undefined }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.ink, marginBottom: 6, letterSpacing: '0.16px' }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: c.ink2, lineHeight: 1.5, letterSpacing: '0.16px' }}>{item.body}</div>
                </div>
              ))}
            </div>
            <a href="#" style={{ display: 'inline-flex', alignItems: 'center', padding: '13px 20px', fontSize: 14, fontWeight: 400, background: c.blue, color: '#fff', textDecoration: 'none', letterSpacing: '0.16px', borderRadius: 0 }}>
              Read the security architecture →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stack ────────────────────────────────────────────────────────
function StackSection({ m }: { m: boolean }) {
  const { ref, visible } = useVisible(0.1);
  const rows = [
    { label: 'Languages',        items: stackData.languages  },
    { label: 'Frameworks',       items: stackData.frameworks },
    { label: 'Cloud providers',  items: stackData.clouds     },
    { label: 'IaC tools',        items: stackData.iac        },
    { label: 'Package managers', items: stackData.packages   },
  ] as const;
  return (
    <section ref={ref} style={{ ...sectionPad(m), background: c.canvas, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: '0.45s ease' }}>
      <div style={wrap(m)}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 52px' }}>
          <p style={eyebrow}>Works with your stack</p>
          <h2 style={sectionH2(m)}>Scans everything you build with.</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {rows.map(row => (
            <div key={row.label} style={{ display: 'flex', flexDirection: m ? 'column' : 'row', gap: m ? 10 : 20, alignItems: m ? 'flex-start' : 'baseline' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: c.ink3, minWidth: m ? undefined : 160, flexShrink: 0, letterSpacing: '0.16px' }}>{row.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {row.items.map(item => (
                  <span key={item} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: '6px 14px', borderRadius: 0, border: `1px solid ${c.hair}`, color: c.ink2, background: c.surface1 }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Enterprise ───────────────────────────────────────────────────
function EnterpriseSection({ m }: { m: boolean }) {
  const { ref, visible } = useVisible(0.1);
  const keys = ['access', 'security', 'deployment', 'audit'] as const;
  const colorMap: Record<string, string> = { access: c.blue, security: c.red, deployment: c.green, audit: c.yellow };

  return (
    <section id="security" ref={ref} style={{ ...sectionPad(m), background: c.surface1, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: '0.45s ease' }}>
      <div style={wrap(m)}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 52px' }}>
          <p style={eyebrow}>Enterprise-ready from day one</p>
          <h2 style={sectionH2(m)}>SSO, RBAC, and audit logs — included.</h2>
          <p style={{ ...sectionSub, marginBottom: 0 }}>
            Everything your security and procurement teams ask for. Not locked behind an enterprise tier — included in every plan.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : 'repeat(4, 1fr)', gap: 20 }}>
          {keys.map(key => {
            const cat   = enterpriseFeatures[key];
            const color = colorMap[key];
            return (
              <div key={key} style={{ background: c.canvas, border: `1px solid ${c.hair}`, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, background: color + '1a', border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 12, height: 12, background: color }} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: c.ink }}>{cat.title}</h3>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cat.items.map(item => (
                    <li key={item} style={{ fontSize: 13, color: c.ink2, paddingLeft: 16, position: 'relative', lineHeight: 1.5, letterSpacing: '0.16px' }}>
                      <span style={{ position: 'absolute', left: 0, top: 7, width: 5, height: 5, borderRadius: '50%', background: color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── BYO Model ────────────────────────────────────────────────────
function ByoSection({ m }: { m: boolean }) {
  const { ref, visible } = useVisible(0.1);
  return (
    <section ref={ref} style={{ ...sectionPadSm(m), background: c.canvas, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: '0.45s ease' }}>
      <div style={wrap(m)}>
        <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr' : '1fr 1fr', gap: m ? 40 : 64, alignItems: 'center' }}>
          <div>
            <p style={{ ...eyebrow, textAlign: 'left' }}>Bring your own model</p>
            <h2 style={{ ...sectionH2(m), textAlign: 'left', marginBottom: 20 }}>Your data. Your model. Your choice.</h2>
            <p style={{ fontSize: 18, fontWeight: 400, color: c.ink2, lineHeight: 1.6, marginBottom: 28, letterSpacing: '0.16px' }}>
              {APP_NAME} is model-agnostic. Configure any OpenAI-compatible endpoint and assign different models to different pipeline stages — discovery, deep scan, cross-file reasoning, or the chat assistant.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { color: c.blue,  text: 'OpenAI, Anthropic, AWS Bedrock, Azure AI — or any custom endpoint' },
                { color: c.cyan,  text: 'Fully air-gapped with Ollama — Llama 3, Mistral, CodeLlama' },
                { color: c.green, text: 'Per-stage model config — lightweight for discovery, powerful for analysis' },
              ].map((pt, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: pt.color, fontSize: 10, marginTop: 5, flexShrink: 0 }}>◆</span>
                  <p style={{ fontSize: 15, color: c.ink2, margin: 0, lineHeight: 1.6, letterSpacing: '0.16px' }}>{pt.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: c.ink3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>Supported providers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {byoModels.map(model => (
                <div key={model.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: `1px solid ${c.hair}`, background: c.surface1, borderRadius: 0 }}>
                  <div style={{ width: 10, height: 10, background: model.color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: c.ink }}>{model.label}</div>
                    <div style={{ fontSize: 12, color: c.ink3, letterSpacing: '0.16px' }}>{model.provider}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Competition ──────────────────────────────────────────────────
function CompetitionSection({ m }: { m: boolean }) {
  const { ref, visible } = useVisible(0.1);
  return (
    <section id="comparison" ref={ref} style={{ ...sectionPad(m), background: c.surface1, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: '0.45s ease' }}>
      <div style={wrap(m)}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 52px' }}>
          <p style={eyebrow}>Why {APP_NAME}</p>
          <h2 style={sectionH2(m)}>Built for what pattern matchers miss.</h2>
          <p style={{ ...sectionSub, marginBottom: 0 }}>
            Hybrid deterministic and AI analysis. One platform, every attack surface. Findings that tell you what to do — not just what&apos;s wrong.
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: m ? 540 : 'auto' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '14px 16px', borderBottom: `2px solid ${c.ink}`, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: c.ink3 }}>
                  Capability
                </th>
                {compCols.map(col => (
                  <th key={col.key} style={{ textAlign: 'center', padding: '14px 16px', borderBottom: `2px solid ${c.ink}`, fontSize: 14, fontWeight: col.key === 'astra' ? 600 : 400, color: col.key === 'astra' ? c.blue : c.ink2, minWidth: m ? 80 : 120 }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compRows.map(row => (
                <tr key={row.feature}>
                  <td style={{ padding: '14px 16px', borderBottom: `1px solid ${c.hair}`, color: c.ink, letterSpacing: '0.16px' }}>{row.feature}</td>
                  {compCols.map(col => {
                    const val    = row[col.key as keyof typeof row] as boolean;
                    const isSelf = col.key === 'astra';
                    return (
                      <td key={col.key} style={{ textAlign: 'center', padding: '14px 16px', borderBottom: `1px solid ${c.hair}` }}>
                        <span style={{ fontSize: 18, color: val ? (isSelf ? c.blue : c.green) : c.ink3 }}>{val ? '✓' : '✗'}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── CTA + Footer ─────────────────────────────────────────────────
function CtaFooterSection({ m }: { m: boolean }) {
  return (
    <>
      {/* CTA Banner */}
      <section style={{ background: c.blue, padding: m ? '64px 0' : '96px 0', textAlign: 'center' }}>
        <div style={wrap(m)}>
          <h2 style={{ fontSize: m ? 32 : 56, fontWeight: 300, color: '#fff', marginBottom: 20, lineHeight: 1.12, letterSpacing: '-0.4px' }}>
            Stop triaging. Start fixing.
          </h2>
          <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.82)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.5, letterSpacing: '0.16px' }}>
            One scan. Every attack surface. Findings that tell you what to do — not just what went wrong.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <a href="/auth/signin" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 28px', fontSize: 14, fontWeight: 600, background: '#fff', color: c.blue, textDecoration: 'none', borderRadius: 0, letterSpacing: '0.16px' }}>
              Scan free now →
            </a>
            <a href="/knowledge?tab=docs" style={{ display: 'inline-flex', alignItems: 'center', padding: '14px 28px', fontSize: 14, fontWeight: 400, background: 'transparent', color: '#fff', textDecoration: 'none', borderRadius: 0, letterSpacing: '0.16px', border: '1px solid rgba(255,255,255,0.4)' }}>
              Read the docs
            </a>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.16px' }}>
            Free forever for open-source repos. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: c.footerBg, borderTop: '1px solid #2d2d3e', padding: m ? '48px 0 32px' : '64px 0 32px' }}>
        <div style={wrap(m)}>
          <div style={{ marginBottom: 40 }}>
            <Link href="/" style={{ fontSize: 20, fontWeight: 600, color: '#fff', textDecoration: 'none' }}>{APP_NAME}</Link>
            <p style={{ fontSize: 14, color: c.footerDim, marginTop: 8, letterSpacing: '0.16px' }}>AI-native security scanning for every attack surface</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: m ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 32, marginBottom: 48 }}>
            {footerCols.map(col => (
              <div key={col.title}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 16, letterSpacing: '0.16px' }}>{col.title}</h4>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map(link => (
                    <li key={link.label}>
                      <a href={link.href} style={{ fontSize: 14, color: c.footerDim, textDecoration: 'none', letterSpacing: '0.16px' }}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #2d2d3e', paddingTop: 24, display: 'flex', flexDirection: m ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: m ? 12 : 0 }}>
            <p style={{ fontSize: 12, color: c.footerDim, margin: 0, letterSpacing: '0.16px' }}>
              &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Privacy', 'Terms', 'Security'].map(label => (
                <a key={label} href="#" style={{ fontSize: 12, color: c.footerDim, textDecoration: 'none', letterSpacing: '0.16px' }}>{label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}