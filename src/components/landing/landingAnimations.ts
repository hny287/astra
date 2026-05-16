// src/components/landing/landingAnimations.ts
// Shared animation hooks and CSS keyframes for the landing page.
// IntersectionObserver-based scroll reveal, counter animation, stagger delays.

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export function useVisible(threshold = 0.15): { ref: React.RefObject<HTMLDivElement | null>; visible: boolean } {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export function useCountUp(target: number, duration = 2000, trigger = true): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, trigger]);

  return value;
}

export function useStagger(count: number, baseDelay = 80): (index: number) => number {
  return useCallback((index: number) => baseDelay * index, [count, baseDelay]);
}

// CSS keyframe definitions to inject once in the page
export const landingKeyframes = `
@keyframes lpPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.15); }
}

@keyframes lpFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes lpSlideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes lpGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(15, 98, 254, 0); }
  50% { box-shadow: 0 0 16px 4px rgba(15, 98, 254, 0.3); }
}

@keyframes lpType {
  from { width: 0; }
  to { width: 100%; }
}

@keyframes lpNodeLight {
  0% { border-color: #393939; }
  100% { border-color: #0f62fe; }
}
`;