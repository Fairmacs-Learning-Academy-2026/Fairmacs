import React, { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './motionHooks';

/**
 * Global cursor caustic light (~420px radial soft-light glow) trailing pointer via rAF spring.
 * Zero React re-renders per mouse move; disabled on touch devices and prefers-reduced-motion.
 */
export default function CursorLight() {
  const reduced = usePrefersReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  const lightRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFinePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reduced || !finePointer || typeof window === 'undefined') return undefined;

    let x = -300;
    let y = -300;
    let tx = -300;
    let ty = -300;
    let rafId = 0;

    const tick = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      if (lightRef.current) {
        lightRef.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      }
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    const onMove = (e) => {
      tx = e.clientX - 210;
      ty = e.clientY - 210;
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reduced, finePointer]);

  if (reduced || !finePointer) return null;

  return (
    <div
      ref={lightRef}
      aria-hidden="true"
      style={{
        width: 420,
        height: 420,
        transform: 'translate3d(-420px, -420px, 0)',
        background:
          'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(191,227,255,0.38) 38%, transparent 72%)',
        mixBlendMode: 'soft-light',
      }}
      className="pointer-events-none fixed top-0 left-0 z-20 rounded-full"
    />
  );
}
