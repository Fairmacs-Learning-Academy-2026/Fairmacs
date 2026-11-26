import React, { useRef } from 'react';
import { useElementInView, usePrefersReducedMotion } from './motionHooks';

const BLOBS = [
  {
    id: 'blob-sky-hero',
    color: 'var(--accent-sky)',
    className: '-top-24 -left-20 h-[440px] w-[440px] sm:h-[560px] sm:w-[560px] opacity-60',
    keyframes: 'flaBlobDrift1 17s ease-in-out infinite alternate',
  },
  {
    id: 'blob-peach-hero',
    color: 'var(--accent-peach)',
    className: 'top-20 -right-24 h-[400px] w-[400px] sm:h-[520px] sm:w-[520px] opacity-55',
    keyframes: 'flaBlobDrift2 21s ease-in-out infinite alternate',
  },
  {
    id: 'blob-mint-mid',
    color: 'var(--accent-mint)',
    className: 'top-[36%] left-[12%] h-[380px] w-[380px] sm:h-[500px] sm:w-[500px] opacity-50',
    keyframes: 'flaBlobDrift3 24s ease-in-out infinite alternate',
  },
  {
    id: 'blob-lilac-mid',
    color: 'var(--accent-lilac)',
    className: 'top-[62%] -right-16 h-[420px] w-[420px] sm:h-[540px] sm:w-[540px] opacity-55',
    keyframes: 'flaBlobDrift4 19s ease-in-out infinite alternate',
  },
  {
    id: 'blob-sky-footer',
    color: 'var(--accent-sky)',
    className: 'bottom-16 left-[8%] h-[360px] w-[360px] sm:h-[480px] sm:w-[480px] opacity-50',
    keyframes: 'flaBlobDrift5 26s ease-in-out infinite alternate',
  },
];

function BreathingBlob({ blob, reduced }) {
  const ref = useRef(null);
  const inView = useElementInView(ref, { once: false, rootMargin: '200px 0px' });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-[80px] ${blob.className}`}
      style={{
        background: `radial-gradient(circle, ${blob.color} 0%, transparent 72%)`,
        animation: reduced ? 'none' : blob.keyframes,
        animationPlayState: inView && !reduced ? 'running' : 'paused',
      }}
    />
  );
}

/**
 * 5 desynchronized breathing daylight blobs + subtle SVG noise anti-banding overlay.
 */
export default function AmbientBackground() {
  const reduced = usePrefersReducedMotion();

  return (
    <>
      <style>{`
        @keyframes flaBlobDrift1 {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(48px, 34px, 0) scale(1.10); }
        }
        @keyframes flaBlobDrift2 {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(-42px, 46px, 0) scale(1.12); }
        }
        @keyframes flaBlobDrift3 {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(38px, -40px, 0) scale(1.09); }
        }
        @keyframes flaBlobDrift4 {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(-50px, -32px, 0) scale(1.11); }
        }
        @keyframes flaBlobDrift5 {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(36px, -36px, 0) scale(1.08); }
        }
      `}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {BLOBS.map((blob) => (
          <BreathingBlob key={blob.id} blob={blob} reduced={reduced} />
        ))}
      </div>
      <div aria-hidden="true" className="fla-noise-overlay" />
    </>
  );
}
