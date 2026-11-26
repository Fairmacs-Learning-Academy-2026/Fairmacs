import React, { useEffect, useRef, useState } from 'react';
import {
  ease,
  easeOutQuint,
  useElementInView,
  usePrefersReducedMotion,
} from './motionHooks';

/**
 * Viewport Section Reveal (y: 24 -> 0, opacity: 0 -> 1, blur: 8px -> 0px).
 * Honors prefers-reduced-motion with immediate complete visibility.
 */
export function Reveal({ children, className = '', delay = 0, y = 24 }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const inView = useElementInView(ref, { once: true, rootMargin: '-12% 0px' });

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translate3d(0, 0, 0)' : `translate3d(0, ${y}px, 0)`,
        filter: inView ? 'blur(0px)' : 'blur(8px)',
        transition: `opacity 620ms ${ease.out} ${delay}s, transform 620ms ${ease.out} ${delay}s, filter 620ms ${ease.out} ${delay}s`,
        willChange: inView ? 'auto' : 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Magnetic CTA Button (120px pointer radius, up to 10px spring pull, 40% inner label depth, pulse ring).
 */
export function MagneticButton({
  children,
  className = '',
  variant = 'primary',
  pulseRing = false,
  onClick,
  type = 'button',
  ...rest
}) {
  const reduced = usePrefersReducedMotion();
  const btnRef = useRef(null);
  const labelRef = useRef(null);
  const physicsRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    rafId: 0,
  });

  useEffect(() => {
    const state = physicsRef.current;
    return () => {
      if (state.rafId) cancelAnimationFrame(state.rafId);
    };
  }, []);

  const startSpringLoop = () => {
    const s = physicsRef.current;
    if (s.rafId) return;

    const tick = () => {
      const ax = (s.tx - s.x) * 0.22;
      const ay = (s.ty - s.y) * 0.22;
      s.vx = (s.vx + ax) * 0.72;
      s.vy = (s.vy + ay) * 0.72;
      s.x += s.vx;
      s.y += s.vy;

      if (btnRef.current) {
        btnRef.current.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;
      }
      if (labelRef.current) {
        labelRef.current.style.transform = `translate3d(${(s.x * 0.4).toFixed(2)}px, ${(s.y * 0.4).toFixed(2)}px, 0)`;
      }

      if (
        Math.abs(s.tx - s.x) > 0.05 ||
        Math.abs(s.ty - s.y) > 0.05 ||
        Math.abs(s.vx) > 0.05 ||
        Math.abs(s.vy) > 0.05
      ) {
        s.rafId = requestAnimationFrame(tick);
      } else {
        s.x = s.tx;
        s.y = s.ty;
        if (btnRef.current) {
          btnRef.current.style.transform =
            s.x === 0 && s.y === 0
              ? ''
              : `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;
        }
        if (labelRef.current) {
          labelRef.current.style.transform =
            s.x === 0 && s.y === 0
              ? ''
              : `translate3d(${(s.x * 0.4).toFixed(2)}px, ${(s.y * 0.4).toFixed(2)}px, 0)`;
        }
        s.rafId = 0;
      }
    };

    s.rafId = requestAnimationFrame(tick);
  };

  const handlePointerMove = (e) => {
    if (reduced || e.pointerType !== 'mouse' || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < 120) {
      const pull = (1 - dist / 120) * 10;
      const angle = Math.atan2(dy, dx);
      physicsRef.current.tx = Math.cos(angle) * pull;
      physicsRef.current.ty = Math.sin(angle) * pull;
      startSpringLoop();
    }
  };

  const handlePointerLeave = () => {
    physicsRef.current.tx = 0;
    physicsRef.current.ty = 0;
    startSpringLoop();
  };

  const baseClass = variant === 'primary' ? 'fla-btn-primary' : 'fla-btn-secondary';

  return (
    <button
      ref={btnRef}
      type={type}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative ${baseClass} ${className}`.trim()}
      {...rest}
    >
      {pulseRing && !reduced && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full border border-[#0B5CAB]/35 animate-ping"
          style={{ animationDuration: '2.8s' }}
        />
      )}
      <span ref={labelRef} className="inline-flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}

/**
 * Tilt + Specular Glare Glass Card (perspective 1000px, max +/- 7deg, --mx/--my radial glare).
 */
export function TiltGlassCard({
  children,
  className = '',
  strong = false,
  onClick,
  role,
  tabIndex,
  ariaLabel,
  onKeyDown,
}) {
  const reduced = usePrefersReducedMotion();
  const cardRef = useRef(null);
  const tiltRef = useRef({
    rx: 0,
    ry: 0,
    vrx: 0,
    vry: 0,
    trx: 0,
    try: 0,
    rafId: 0,
  });

  useEffect(() => {
    const t = tiltRef.current;
    return () => {
      if (t.rafId) cancelAnimationFrame(t.rafId);
    };
  }, []);

  const runTiltSpring = () => {
    const t = tiltRef.current;
    if (t.rafId) return;

    const step = () => {
      const arx = (t.trx - t.rx) * 0.14;
      const ary = (t.try - t.ry) * 0.14;
      t.vrx = (t.vrx + arx) * 0.78;
      t.vry = (t.vry + ary) * 0.78;
      t.rx += t.vrx;
      t.ry += t.vry;

      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1000px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`;
      }

      if (
        Math.abs(t.trx - t.rx) > 0.04 ||
        Math.abs(t.try - t.ry) > 0.04 ||
        Math.abs(t.vrx) > 0.04 ||
        Math.abs(t.vry) > 0.04
      ) {
        t.rafId = requestAnimationFrame(step);
      } else {
        t.rx = t.trx;
        t.ry = t.try;
        if (cardRef.current) {
          cardRef.current.style.transform =
            t.rx === 0 && t.ry === 0
              ? ''
              : `perspective(1000px) rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`;
        }
        t.rafId = 0;
      }
    };

    t.rafId = requestAnimationFrame(step);
  };

  const handlePointerMove = (e) => {
    if (reduced || e.pointerType !== 'mouse' || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    tiltRef.current.try = (relX - 0.5) * 14;
    tiltRef.current.trx = (0.5 - relY) * 14;

    cardRef.current.style.setProperty('--mx', `${(relX * 100).toFixed(1)}%`);
    cardRef.current.style.setProperty('--my', `${(relY * 100).toFixed(1)}%`);
    cardRef.current.style.setProperty('--glare-opacity', '1');
    runTiltSpring();
  };

  const handlePointerLeave = () => {
    tiltRef.current.trx = 0;
    tiltRef.current.try = 0;
    if (cardRef.current) {
      cardRef.current.style.setProperty('--glare-opacity', '0');
    }
    runTiltSpring();
  };

  return (
    <div
      ref={cardRef}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`glass fla-tilt-card ${strong ? 'glass--strong' : ''} ${className}`.trim()}
    >
      <div className="fla-tilt-glare" aria-hidden="true" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

/**
 * Animated Tabular Counter triggered on first viewport entry.
 */
export function AnimatedCounter({ value, suffix = '', prefix = '', className = '' }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const inView = useElementInView(ref, { once: true, rootMargin: '-10% 0px' });
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return undefined;

    let rafId = 0;
    const durationMs = 1350;
    const start = performance.now();

    const step = (now) => {
      const elapsed = Math.min(1, (now - start) / durationMs);
      const eased = easeOutQuint(elapsed);
      setAnimatedValue(Math.round(eased * value));
      if (elapsed < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [inView, value, reduced]);

  const shown = reduced ? value : inView ? animatedValue : 0;

  return (
    <span ref={ref} className={`fla-tabular ${className}`.trim()}>
      {prefix}
      {shown}
      {suffix}
    </span>
  );
}
