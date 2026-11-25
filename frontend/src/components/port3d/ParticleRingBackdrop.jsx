import React, { useRef, useEffect } from 'react';

/**
 * PARTICLE_CONFIG
 * Organic scattered multi-color dash field (no concentric ring).
 */
export const PARTICLE_CONFIG = {
  // Density & Viewport Scaling
  desktopAreaPerParticle: 1550, // lower = denser, higher = airier
  mobileAreaPerParticle: 2300,
  minParticles: 320,
  maxParticles: 1500,
  mobileBreakpoint: 768,

  // Dash Dimensions
  dashLengthMin: 3.2,
  dashLengthMax: 7.5,
  dashWidthMin: 1.4,
  dashWidthMax: 2.3,

  // Card Attenuation (keeps login card text crisp)
  cardMargin: 24.0,
  cardAlphaMultiplier: 0.45,

  // Organic Ambient Drift
  driftAmplitude: 6.0,
  driftSpeed: 0.65,

  // Cursor Scatter / Repulsion Physics
  repulsionRadius: 155.0,
  repulsionStrength: 1.65,
  springStiffness: 0.032,
  damping: 0.89,

  maxDpr: 2.0
};

// Restrained multi-hue palette matching the reference video + bright UI
const PARTICLE_PALETTE = [
  '#3B82F6', // vibrant sky blue
  '#60A5FA', // soft blue
  '#4A628A', // deep slate blue
  '#7AB2D3', // airy cyan-blue
  '#F59E0B', // warm amber gold
  '#EAB308', // bright gold
  '#F43F5E', // coral rose accent
  '#A855F7', // subtle violet accent
  '#94A3B8'  // soft slate gray
];

export default function ParticleRingBackdrop() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;

    let animFrameId = null;
    let isDisposed = false;
    let isPageHidden = document.hidden;
    let lastTime = performance.now();
    let simTime = 0;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, PARTICLE_CONFIG.maxDpr);

    // Pointer state
    let pointerX = -9999;
    let pointerY = -9999;
    let isPointerActive = false;

    // Login card bounds cache
    let cardRect = null;
    const updateCardBounds = () => {
      const cardEl = document.querySelector('.fairmacs-port3d-liquid-glass-card');
      if (cardEl) {
        const r = cardEl.getBoundingClientRect();
        cardRect = {
          left: r.left - PARTICLE_CONFIG.cardMargin,
          top: r.top - PARTICLE_CONFIG.cardMargin,
          right: r.right + PARTICLE_CONFIG.cardMargin,
          bottom: r.bottom + PARTICLE_CONFIG.cardMargin
        };
      } else {
        cardRect = null;
      }
    };

    // Organic scattered particles (no polar rings)
    let particles = [];
    const buildParticleField = () => {
      const isMobile = width < PARTICLE_CONFIG.mobileBreakpoint;
      const areaPerParticle = isMobile
        ? PARTICLE_CONFIG.mobileAreaPerParticle
        : PARTICLE_CONFIG.desktopAreaPerParticle;

      const count = Math.min(
        PARTICLE_CONFIG.maxParticles,
        Math.max(PARTICLE_CONFIG.minParticles, Math.floor((width * height) / areaPerParticle))
      );

      // Jittered grid sampling so particles look organic without awkward clumping
      const aspect = width / Math.max(1, height);
      const cols = Math.max(1, Math.round(Math.sqrt(count * aspect)));
      const rows = Math.max(1, Math.ceil(count / cols));
      const cellW = width / cols;
      const cellH = height / rows;

      const list = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (list.length >= count) break;

          const baseX = (c + 0.15 + Math.random() * 0.7) * cellW;
          const baseY = (r + 0.15 + Math.random() * 0.7) * cellH;
          const color =
            PARTICLE_PALETTE[Math.floor(Math.random() * PARTICLE_PALETTE.length)];

          list.push({
            baseX,
            baseY,
            x: baseX,
            y: baseY,
            vx: 0,
            vy: 0,
            angle: Math.random() * Math.PI * 2,
            spinSpeed: (Math.random() - 0.5) * 0.35,
            length:
              PARTICLE_CONFIG.dashLengthMin +
              Math.random() * (PARTICLE_CONFIG.dashLengthMax - PARTICLE_CONFIG.dashLengthMin),
            width:
              PARTICLE_CONFIG.dashWidthMin +
              Math.random() * (PARTICLE_CONFIG.dashWidthMax - PARTICLE_CONFIG.dashWidthMin),
            alpha: 0.55 + Math.random() * 0.35,
            color,
            phase: Math.random() * Math.PI * 2
          });
        }
      }

      particles = list;
    };

    const renderFrame = (t, dtFactor) => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';

      const maxR = PARTICLE_CONFIG.repulsionRadius;
      const maxRSq = maxR * maxR;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Gentle organic float around anchor point
        const driftX = reducedMotion
          ? 0
          : Math.cos(t * PARTICLE_CONFIG.driftSpeed + p.phase) * PARTICLE_CONFIG.driftAmplitude;
        const driftY = reducedMotion
          ? 0
          : Math.sin(t * PARTICLE_CONFIG.driftSpeed * 0.85 + p.phase * 1.3) *
            PARTICLE_CONFIG.driftAmplitude;

        const targetX = p.baseX + driftX;
        const targetY = p.baseY + driftY;

        // Cursor repulsion
        if (isPointerActive && !reducedMotion) {
          const dx = p.x - pointerX;
          const dy = p.y - pointerY;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxRSq && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const falloff = 1.0 - dist / maxR;
            const push = falloff * falloff * PARTICLE_CONFIG.repulsionStrength * dtFactor;

            p.vx += (dx / dist) * push;
            p.vy += (dy / dist) * push;
          }
        }

        // Spring return + velocity damping
        if (!reducedMotion) {
          p.vx += (targetX - p.x) * PARTICLE_CONFIG.springStiffness * dtFactor;
          p.vy += (targetY - p.y) * PARTICLE_CONFIG.springStiffness * dtFactor;

          const damp = Math.pow(PARTICLE_CONFIG.damping, dtFactor);
          p.vx *= damp;
          p.vy *= damp;

          p.x += p.vx * dtFactor;
          p.y += p.vy * dtFactor;
        } else {
          p.x = p.baseX;
          p.y = p.baseY;
        }

        // Subtle softening behind the login card so text stays crisp
        const isOverCard =
          cardRect &&
          p.x >= cardRect.left &&
          p.x <= cardRect.right &&
          p.y >= cardRect.top &&
          p.y <= cardRect.bottom;

        const finalAlpha = isOverCard
          ? p.alpha * PARTICLE_CONFIG.cardAlphaMultiplier
          : p.alpha;

        // Align dash smoothly with velocity when pushed, otherwise gently drift angle
        const speed = Math.hypot(p.vx, p.vy);
        const angle =
          speed > 0.25
            ? Math.atan2(p.vy, p.vx)
            : p.angle + (reducedMotion ? 0 : Math.sin(t * 0.5 + p.phase) * 0.25);

        const halfLen = p.length * 0.5;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        ctx.strokeStyle = p.color;
        ctx.globalAlpha = finalAlpha;
        ctx.lineWidth = p.width;

        ctx.beginPath();
        ctx.moveTo(p.x - cosA * halfLen, p.y - sinA * halfLen);
        ctx.lineTo(p.x + cosA * halfLen, p.y + sinA * halfLen);
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
    };

    const handleResize = () => {
      if (isDisposed) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, PARTICLE_CONFIG.maxDpr);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);

      updateCardBounds();
      buildParticleField();

      if (reducedMotion) {
        renderFrame(0, 1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const onMotionChange = (e) => {
      reducedMotion = e.matches;
      if (reducedMotion) renderFrame(0, 1);
    };
    motionQuery.addEventListener('change', onMotionChange);

    const onPointerMove = (e) => {
      const hasTouch = e.touches && e.touches.length > 0;
      const clientX = hasTouch ? e.touches[0].clientX : e.clientX;
      const clientY = hasTouch ? e.touches[0].clientY : e.clientY;
      if (typeof clientX !== 'number' || typeof clientY !== 'number') return;

      pointerX = clientX;
      pointerY = clientY;
      isPointerActive = true;
    };

    const onPointerLeave = () => {
      isPointerActive = false;
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchstart', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave);

    const onVisibilityChange = () => {
      isPageHidden = document.hidden;
      if (!isPageHidden) {
        lastTime = performance.now();
        updateCardBounds();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const loop = (now) => {
      if (isDisposed) return;
      animFrameId = requestAnimationFrame(loop);

      if (isPageHidden) {
        lastTime = now;
        return;
      }

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(0.064, Math.max(0.001, rawDt));
      simTime += dt;

      const dtFactor = Math.min(dt, 0.1) * 60.0;
      renderFrame(simTime, dtFactor);
    };

    if (!reducedMotion) {
      animFrameId = requestAnimationFrame(loop);
    }

    return () => {
      isDisposed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchstart', onPointerMove);
      document.removeEventListener('mouseleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
        display: 'block'
      }}
      aria-hidden="true"
    />
  );
}