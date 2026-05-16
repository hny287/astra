'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { APP_NAME } from '@/lib/branding';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible } from './landingAnimations';
import { footerCols } from './landingData';

// ─── Mobile breakpoint hook ────────────────────────────────────────
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < landingTokens.md);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// ─── Component ──────────────────────────────────────────────────────
export default function CtaFooter() {
  const { ref: ctaRef, visible: ctaVisible } = useVisible(0.1);
  const isMobile = useIsMobile();

  return (
    <>
      {/* ─── CTA Section ─────────────────────────────────────────── */}
      <section
        ref={ctaRef}
        style={{
          background: landingTokens.bgCanvas,
          padding: isMobile ? '64px 24px' : '96px 24px',
          textAlign: 'center',
          opacity: ctaVisible ? 1 : 0,
          transform: ctaVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}
      >
        <div style={{ maxWidth: landingTokens.maxWidth, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: isMobile ? '32px' : '48px',
              fontWeight: 600,
              lineHeight: 1.15,
              color: landingTokens.inkPrimary,
              marginBottom: '20px',
              fontFamily: landingTokens.fontSans,
            }}
          >
            Start finding vulnerabilities today
          </h2>
          <p
            style={{
              fontSize: '18px',
              fontWeight: 300,
              lineHeight: 1.5,
              color: landingTokens.inkSecondary,
              maxWidth: '560px',
              marginLeft: 'auto',
              marginRight: 'auto',
              marginBottom: '32px',
              fontFamily: landingTokens.fontSans,
            }}
          >
            One pipeline. Every attack surface. AI-enriched findings that tell
            you what&apos;s wrong and how to fix it.
          </p>

          {/* CTA buttons */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: '16px',
            }}
          >
            <a
              href="/api/auth/signin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: landingTokens.fontSans,
                background: landingTokens.accentPrimary,
                color: '#ffffff',
                borderRadius: '4px',
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  landingTokens.accentPrimaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  landingTokens.accentPrimary;
              }}
            >
              Get started — free
            </a>
            <a
              href="/knowledge?tab=docs"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: landingTokens.fontSans,
                background: 'transparent',
                color: landingTokens.inkPrimary,
                borderRadius: '4px',
                textDecoration: 'none',
                border: `1px solid ${landingTokens.borderMedium}`,
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  landingTokens.inkPrimary;
                e.currentTarget.style.background = `${landingTokens.inkPrimary}08`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  landingTokens.borderMedium;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Read the docs
            </a>
          </div>

          {/* Subtext */}
          <p
            style={{
              fontSize: '13px',
              fontWeight: 300,
              color: landingTokens.inkMuted,
              fontFamily: landingTokens.fontSans,
            }}
          >
            No credit card. No agent to install.
          </p>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer
        style={{
          background: landingTokens.bgSurface1,
          borderTop: `1px solid ${landingTokens.borderSubtle}`,
          padding: isMobile ? '48px 24px 32px' : '64px 24px 32px',
        }}
      >
        <div style={{ maxWidth: landingTokens.maxWidth, margin: '0 auto' }}>
          {/* Logo + tagline */}
          <div style={{ marginBottom: '40px' }}>
            <Link
              href="/"
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: landingTokens.inkPrimary,
                textDecoration: 'none',
                fontFamily: landingTokens.fontSans,
                letterSpacing: '-0.02em',
              }}
            >
              {APP_NAME}
            </Link>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 300,
                color: landingTokens.inkMuted,
                marginTop: '8px',
                fontFamily: landingTokens.fontSans,
              }}
            >
              AI-native security scanning for every attack surface
            </p>
          </div>

          {/* 4-column grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? '1fr 1fr'
                : 'repeat(4, 1fr)',
              gap: isMobile ? '32px' : '0',
              marginBottom: '48px',
            }}
          >
            {footerCols.map((col) => (
              <div key={col.title}>
                <h4
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                    color: landingTokens.inkSecondary,
                    marginBottom: '16px',
                    fontFamily: landingTokens.fontSans,
                  }}
                >
                  {col.title}
                </h4>
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        style={{
                          fontSize: '14px',
                          fontWeight: 300,
                          color: landingTokens.inkMuted,
                          textDecoration: 'none',
                          fontFamily: landingTokens.fontSans,
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color =
                            landingTokens.inkPrimary;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color =
                            landingTokens.inkMuted;
                        }}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div
            style={{
              borderTop: `1px solid ${landingTokens.borderSubtle}`,
              paddingTop: '24px',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'center' : 'center',
              gap: isMobile ? '12px' : '0',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                fontWeight: 300,
                color: landingTokens.inkMuted,
                fontFamily: landingTokens.fontSans,
                margin: 0,
              }}
            >
              &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '16px',
              }}
            >
              {['Privacy', 'Terms', 'Security'].map((label) => (
                <a
                  key={label}
                  href="#"
                  style={{
                    fontSize: '12px',
                    fontWeight: 300,
                    color: landingTokens.inkMuted,
                    textDecoration: 'none',
                    fontFamily: landingTokens.fontSans,
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = landingTokens.inkPrimary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = landingTokens.inkMuted;
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}