'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/* ─── Landing section components ──────────────────────────── */
import Hero from '@/components/landing/Hero';
import InteractiveDemo from '@/components/landing/InteractiveDemo';
import AiAdvantage from '@/components/landing/AiAdvantage';
import WhatItFinds from '@/components/landing/WhatItFinds';
import StackCoverage from '@/components/landing/StackCoverage';
import PlatformCoverage from '@/components/landing/PlatformCoverage';
import CloudInfrastructure from '@/components/landing/CloudInfrastructure';
import NetworkRuntime from '@/components/landing/NetworkRuntime';
import FeatureBreakdown from '@/components/landing/FeatureBreakdown';
import BringYourOwnModel from '@/components/landing/BringYourOwnModel';
import RbacEnterprise from '@/components/landing/RbacEnterprise';
import Competition from '@/components/landing/Competition';
import OutcomesKpis from '@/components/landing/OutcomesKpis';
import CtaFooter from '@/components/landing/CtaFooter';

/* ─── Shared animation keyframes ─────────────────────────── */
import { landingKeyframes } from '@/components/landing/landingAnimations';

/* ─── Landing page base styles (Carbon tokens) ────────────── */
const landingPageStyles = `
  .lp-section {
    padding: 96px 24px;
    max-width: 1200px;
    margin: 0 auto;
    padding-left: 24px;
    padding-right: 24px;
  }
  .lp-section-dark {
    padding: 96px 24px;
    max-width: 1200px;
    margin: 0 auto;
    padding-left: 24px;
    padding-right: 24px;
    background: var(--ibm-canvas);
  }
  .lp-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding-left: 24px;
    padding-right: 24px;
  }
  .lp-reveal {
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .lp-visible {
    opacity: 1;
    transform: translateY(0);
  }
  @media (max-width: 671px) {
    .lp-section, .lp-section-dark {
      padding-top: 48px;
      padding-bottom: 48px;
      padding-left: 16px;
      padding-right: 16px;
    }
    .lp-inner {
      padding-left: 16px;
      padding-right: 16px;
    }
  }
`;

export default function LandingPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/scans');
  }, [status, router]);

  if (status === 'loading') return null;
  if (status === 'authenticated') return null;

  return (
    <div
      style={{
        background: 'var(--ibm-canvas)',
        minHeight: '100vh',
        color: 'var(--ibm-ink)',
        overflowX: 'hidden',
      }}
    >
      <style>{landingKeyframes}</style>
      <style>{landingPageStyles}</style>

      <Hero />
      <InteractiveDemo />
      <AiAdvantage />
      <WhatItFinds />
      <StackCoverage />
      <PlatformCoverage />
      <CloudInfrastructure />
      <NetworkRuntime />
      <FeatureBreakdown />
      <BringYourOwnModel />
      <RbacEnterprise />
      <Competition />
      <OutcomesKpis />
      <CtaFooter />
    </div>
  );
}