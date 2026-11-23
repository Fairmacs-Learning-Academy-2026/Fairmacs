import React, { useRef, useEffect } from 'react';

/**
 * PARTICLE_CONFIG
 * Master configuration object for the 2D Canvas Particle Ring Backdrop.
 * All tunable visual, distribution, motion, and performance parameters.
 */
export const PARTICLE_CONFIG = {
  // Counts & Responsiveness
  dotCount: 900,
  dashCountDesktop: 1800,
  dashCountMobile: 900,
  mobileBreakpoint: 768,

  // Ring Geometry & Distribution
  baseRadiusRatio: 0.46, // R0 = 0.46 * viewportHeight
  radiusSpreadRatio: 0.20, // Spread sigma = 0.20 * R0
  radiusPulseAmplitude: 0.03, // +/- 3% breathing pulse
  radiusPulsePeriod: 8.0, // seconds for one R0 pulse cycle

  // Dash Appearance
  dashLengthMin: 5.0, // px for distant dashes
  dashLengthMax: 9.0, // px at bell peak R0
  dashWidthMin: 1.8,
  dashWidthMax: 2.4,
  dashBaseAlphaMin: 0.22,
  dashBaseAlphaMax: 0.95,

  // Far Scattered Dots
  dotColor: '#C5CAD3',
  dotSizeMin: 1.0,
  dotSizeMax: 1.6,
  dotAlphaMin: 0.35,
  dotAlphaMax: 0.70,

  // Calm Zone & Card Protection
  innerRadiusRatio: 0.30, // Inside 0.3 * R0 multiply alpha by 0.25
  cardMargin: 28, // px margin around the login card rectangle
  calmAlphaMultiplier: 0.25,

  // Pointer Tracking & Spring Physics
  springStiffness: 0.025,
  springDamping: 0.88,
  pointerOffsetClampX: 0.55, // Clamp offset from center to 0.55 * viewport width
  pointerOffsetClampY: 0.55, // Clamp offset from center to 0.55 * viewport height
  idleReturnTimeout: 1.5, // seconds before returning to screen center
  idleReturnDuration: 2.0, // seconds to ease back to center

  // Dynamic Waves & Rotation
  waveAmplitude: 7.0, // px wave radial displacement
  waveFrequency: 0.7, // time frequency (0.7 * t)
  waveSpatialFreq: 0.02, // spatial frequency (0.02 * r)
  ringRotationSpeed: 0.015, // rad/s slow ring rotation
  colorWheelPeriod: 70.0, // seconds for one full 360-degree color revolution

  // Pointer Repulsion
  repulsionRadius: 110.0, // px repulsion influence radius
  repulsionMaxPush: 22.0, // px maximum push distance

  // Performance Batching
  colorSteps: 24, // 24 color buckets around 360 degrees
  alphaSteps: 4, // 4 alpha buckets (0.25, 0.5, 0.75, 1.0)
  maxDpr: 2.0,

  // Color Stops (Clockwise from right: 0° is +X, 60° is bottom, etc.)
  colorStops: [
    { deg: 0, color: '#FAB005' },
    { deg: 60, color: '#3B5BDB' },
    { deg: 120, color: '#5B4BDB' },
    { deg: 180, color: '#8E3FD1' },
    { deg: 240, color: '#D6336C' },
    { deg: 300, color: '#E8590C' },
    { deg: 360, color: '#FAB005' }
  ]
};

// =============================================================================
// COLOR UTILITIES & BUCKET PRECOMPUTATION
// =============================================================================
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const PARSED_COLOR_STOPS = PARTICLE_CONFIG.colorStops.map(s => ({
  deg: s.deg,
  rgb: hexToRgb(s.color)
}));

function interpolateRgbAtDeg(deg) {
  let normalized = deg % 360;
  if (normalized < 0) normalized += 360;

  for (let i = 0; i < PARSED_COLOR_STOPS.length - 1; i++) {
    const s1 = PARSED_COLOR_STOPS[i];
    const s2 = PARSED_COLOR_STOPS[i + 1];
    if (normalized >= s1.deg && normalized <= s2.deg) {
      const span = s2.deg - s1.deg || 1;
      const t = (normalized - s1.deg) / span;
      return [
        Math.round(s1.rgb[0] + (s2.rgb[0] - s1.rgb[0]) * t),
        Math.round(s1.rgb[1] + (s2.rgb[1] - s1.rgb[1]) * t),
        Math.round(s1.rgb[2] + (s2.rgb[2] - s1.rgb[2]) * t)
      ];
    }
  }
  return PARSED_COLOR_STOPS[0].rgb;
}

// 24 precomputed RGB color buckets
const BUCKET_RGB = Array.from({ length: PARTICLE_CONFIG.colorSteps }, (_, b) => {
  const centerDeg = (b + 0.5) * (360 / PARTICLE_CONFIG.colorSteps);
  return interpolateRgbAtDeg(centerDeg);
});

// Precomputed strokeStyle strings for 24 colors x 4 alpha levels
const ALPHA_LEVELS = [0.22, 0.45, 0.70, 0.95];
const BUCKET_STROKE_STYLES = Array.from({ length: PARTICLE_CONFIG.colorSteps }, (_, c) => {
  const [r, g, b] = BUCKET_RGB[c];
  return ALPHA_LEVELS.map(a => `rgba(${r},${g},${b},${a})`);
});

// Gaussian random generator (Box-Muller)
function randomGaussian() {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

export default function ParticleRingBackdrop() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Check prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;
    const onMotionChange = (e) => {
      reducedMotion = e.matches;
      if (reducedMotion) renderFrame(0, 0);
    };
    motionQuery.addEventListener('change', onMotionChange);

    let animFrameId = null;
    let isDisposed = false;
    let isPageHidden = document.hidden;
    let lastTime = performance.now();
    let simTime = 0;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, PARTICLE_CONFIG.maxDpr);

    // Center physics state
    let currentCenterX = width / 2;
    let currentCenterY = height / 2;
    let targetCenterX = width / 2;
    let targetCenterY = height / 2;
    let centerVx = 0;
    let centerVy = 0;

    // Pointer state
    let pointerX = -9999;
    let pointerY = -9999;
    let isPointerActive = false;
    let lastPointerTime = performance.now();

    // Card boundary cache
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
    updateCardBounds();

    // Create Far Scattered Dots
    const dots = Array.from({ length: PARTICLE_CONFIG.dotCount }, () => ({
      normX: Math.random(),
      normY: Math.random(),
      size: PARTICLE_CONFIG.dotSizeMin + Math.random() * (PARTICLE_CONFIG.dotSizeMax - PARTICLE_CONFIG.dotSizeMin),
      alpha: PARTICLE_CONFIG.dotAlphaMin + Math.random() * (PARTICLE_CONFIG.dotAlphaMax - PARTICLE_CONFIG.dotAlphaMin),
      phase: Math.random() * Math.PI * 2
    }));

    // Create Ring Dashes
    const isMobile = width < PARTICLE_CONFIG.mobileBreakpoint;
    const totalDashes = isMobile ? PARTICLE_CONFIG.dashCountMobile : PARTICLE_CONFIG.dashCountDesktop;

    const dashes = [];
    for (let i = 0; i < totalDashes; i++) {
      // Uniform angle distribution with jitter
      const angle = (i / totalDashes) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI * 2 / totalDashes) * 0.9;
      // Bell curve Gaussian offset: sigma = 0.20
      const gaussian = randomGaussian() * PARTICLE_CONFIG.radiusSpreadRatio;
      const phase = Math.random() * Math.PI * 2;

      dashes.push({
        angle,
        gaussian,
        phase
      });
    }

    // Pre-allocated Coordinate Buffers for 24 colors x 4 alpha = 96 buckets
    const TOTAL_BUCKETS = PARTICLE_CONFIG.colorSteps * PARTICLE_CONFIG.alphaSteps;
    const bucketLengths = new Int32Array(TOTAL_BUCKETS);
    const bucketCoords = Array.from({ length: TOTAL_BUCKETS }, () => new Float32Array(totalDashes * 4));

    // Resize Handler
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

      if (reducedMotion) {
        currentCenterX = width / 2;
        currentCenterY = height / 2;
        targetCenterX = width / 2;
        targetCenterY = height / 2;
        renderFrame(0, 0);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Pointer Listeners
    const onPointerMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      pointerX = clientX;
      pointerY = clientY;
      isPointerActive = true;
      lastPointerTime = performance.now();

      // Clamp offset from screen center to 0.55 * viewport width/height
      const screenCenterX = width / 2;
      const screenCenterY = height / 2;
      const rawOffsetX = clientX - screenCenterX;
      const rawOffsetY = clientY - screenCenterY;

      const maxOffsetX = PARTICLE_CONFIG.pointerOffsetClampX * width;
      const maxOffsetY = PARTICLE_CONFIG.pointerOffsetClampY * height;

      const clampedOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, rawOffsetX));
      const clampedOffsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, rawOffsetY));

      targetCenterX = screenCenterX + clampedOffsetX;
      targetCenterY = screenCenterY + clampedOffsetY;
    };

    const onPointerLeave = () => {
      isPointerActive = false;
      targetCenterX = width / 2;
      targetCenterY = height / 2;
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchstart', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave);

    // Page Visibility
    const onVisibilityChange = () => {
      isPageHidden = document.hidden;
      if (!isPageHidden) {
        lastTime = performance.now();
        updateCardBounds();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Core Frame Render Function
    const renderFrame = (t, dt) => {
      ctx.clearRect(0, 0, width, height);

      const R0 = height * PARTICLE_CONFIG.baseRadiusRatio;
      const innerCalmR = R0 * PARTICLE_CONFIG.innerRadiusRatio;

      // 1. Draw Far Scattered Dots
      ctx.fillStyle = PARTICLE_CONFIG.dotColor;
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const px = dot.normX * width + (reducedMotion ? 0 : Math.sin(t * 0.15 + dot.phase) * 1.2);
        const py = dot.normY * height + (reducedMotion ? 0 : Math.cos(t * 0.15 + dot.phase) * 1.2);

        // Dim far dots inside card bounds as well
        let alpha = dot.alpha;
        if (cardRect && px >= cardRect.left && px <= cardRect.right && py >= cardRect.top && py <= cardRect.bottom) {
          alpha *= PARTICLE_CONFIG.calmAlphaMultiplier;
        }

        ctx.globalAlpha = alpha;
        ctx.fillRect(px, py, dot.size, dot.size);
      }
      ctx.globalAlpha = 1.0;

      // 2. Clear Bucket Buffers
      bucketLengths.fill(0);

      // 3. Compute Breathing, Rotation & Radius Pulse
      const rPulseFactor = reducedMotion ? 1.0 : (1.0 + PARTICLE_CONFIG.radiusPulseAmplitude * Math.sin((Math.PI * 2 / PARTICLE_CONFIG.radiusPulsePeriod) * t));
      const currentR0 = R0 * rPulseFactor;
      const ringRotation = reducedMotion ? 0.0 : (PARTICLE_CONFIG.ringRotationSpeed * t);
      const colorRotation = reducedMotion ? 0.0 : ((t / PARTICLE_CONFIG.colorWheelPeriod) * Math.PI * 2);

      const center = { x: currentCenterX, y: currentCenterY };

      // 4. Position Each Dash & Populate Bucket Arrays
      for (let i = 0; i < dashes.length; i++) {
        const d = dashes[i];

        // Base radius from bell curve
        const baseR = currentR0 * (1.0 + d.gaussian);

        // Radial wave breathing
        const wave = reducedMotion ? 0.0 : (PARTICLE_CONFIG.waveAmplitude * Math.sin(PARTICLE_CONFIG.waveFrequency * t - PARTICLE_CONFIG.waveSpatialFreq * baseR + d.phase));
        const r = Math.max(8, baseR + wave);

        // Current angular position with ring rotation
        const currentAngle = d.angle + ringRotation;
        const dirCos = Math.cos(currentAngle);
        const dirSin = Math.sin(currentAngle);

        let px = center.x + r * dirCos;
        let py = center.y + r * dirSin;

        // Pointer Repulsion
        if (isPointerActive && !reducedMotion) {
          const pdx = px - pointerX;
          const pdy = py - pointerY;
          const pDist = Math.hypot(pdx, pdy);
          if (pDist < PARTICLE_CONFIG.repulsionRadius && pDist > 0.001) {
            const normDist = pDist / PARTICLE_CONFIG.repulsionRadius;
            const falloff = 1.0 - normDist;
            const smoothFalloff = falloff * falloff * (3.0 - 2.0 * falloff);
            const push = PARTICLE_CONFIG.repulsionMaxPush * smoothFalloff;
            px += (pdx / pDist) * push;
            py += (pdy / pDist) * push;
          }
        }

        // Outward radial direction from current center
        const radialDx = px - center.x;
        const radialDy = py - center.y;
        const radialDist = Math.hypot(radialDx, radialDy) || 1.0;
        const normDirX = radialDx / radialDist;
        const normDirY = radialDy / radialDist;

        // Bell factor based on distance from current R0
        const distFromR0 = Math.abs(r - currentR0) / (PARTICLE_CONFIG.radiusSpreadRatio * currentR0);
        const bell = Math.exp(-0.5 * distFromR0 * distFromR0);

        // Dashes far from R0 become shorter, smaller and fainter
        const length = PARTICLE_CONFIG.dashLengthMin + (PARTICLE_CONFIG.dashLengthMax - PARTICLE_CONFIG.dashLengthMin) * bell;
        let alpha = PARTICLE_CONFIG.dashBaseAlphaMin + (PARTICLE_CONFIG.dashBaseAlphaMax - PARTICLE_CONFIG.dashBaseAlphaMin) * bell;

        // Card & Inner Calm Zone attenuation (multiply by 0.25)
        const isInsideInnerR = radialDist < innerCalmR;
        const isInsideCard = cardRect && (px >= cardRect.left && px <= cardRect.right && py >= cardRect.top && py <= cardRect.bottom);
        if (isInsideInnerR || isInsideCard) {
          alpha *= PARTICLE_CONFIG.calmAlphaMultiplier;
        }

        // Color by angle relative to rotating color wheel
        let angleRelColor = (currentAngle - colorRotation) % (Math.PI * 2);
        if (angleRelColor < 0) angleRelColor += Math.PI * 2;
        const colorBucket = Math.floor((angleRelColor / (Math.PI * 2)) * PARTICLE_CONFIG.colorSteps) % PARTICLE_CONFIG.colorSteps;

        // Quantize alpha into 4 steps
        const alphaBucket = Math.min(PARTICLE_CONFIG.alphaSteps - 1, Math.max(0, Math.floor(alpha * PARTICLE_CONFIG.alphaSteps)));

        // Combine into 1D bucket index
        const bucketIndex = colorBucket * PARTICLE_CONFIG.alphaSteps + alphaBucket;

        // Calculate segment endpoints
        const halfLen = length * 0.5;
        const x1 = px - normDirX * halfLen;
        const y1 = py - normDirY * halfLen;
        const x2 = px + normDirX * halfLen;
        const y2 = py + normDirY * halfLen;

        const offset = bucketLengths[bucketIndex];
        const coords = bucketCoords[bucketIndex];
        coords[offset] = x1;
        coords[offset + 1] = y1;
        coords[offset + 2] = x2;
        coords[offset + 3] = y2;
        bucketLengths[bucketIndex] = offset + 4;
      }

      // 5. Batch Stroke Each Bucket
      ctx.lineWidth = 2.1;
      ctx.lineCap = 'round';

      for (let b = 0; b < TOTAL_BUCKETS; b++) {
        const len = bucketLengths[b];
        if (len === 0) continue;

        const cIdx = Math.floor(b / PARTICLE_CONFIG.alphaSteps);
        const aIdx = b % PARTICLE_CONFIG.alphaSteps;
        ctx.strokeStyle = BUCKET_STROKE_STYLES[cIdx][aIdx];

        ctx.beginPath();
        const coords = bucketCoords[b];
        for (let i = 0; i < len; i += 4) {
          ctx.moveTo(coords[i], coords[i + 1]);
          ctx.lineTo(coords[i + 2], coords[i + 3]);
        }
        ctx.stroke();
      }
    };

    // Animation Loop with Delta Time
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

      // Check idle return to center
      const idleTime = (now - lastPointerTime) / 1000;
      if (idleTime > PARTICLE_CONFIG.idleReturnTimeout) {
        targetCenterX = width / 2;
        targetCenterY = height / 2;
      }

      // Spring physics toward target center
      const dt60 = Math.min(dt, 0.1) * 60;
      const forceX = (targetCenterX - currentCenterX) * PARTICLE_CONFIG.springStiffness;
      const forceY = (targetCenterY - currentCenterY) * PARTICLE_CONFIG.springStiffness;
      centerVx = (centerVx + forceX * dt60) * Math.pow(PARTICLE_CONFIG.springDamping, dt60);
      centerVy = (centerVy + forceY * dt60) * Math.pow(PARTICLE_CONFIG.springDamping, dt60);
      currentCenterX += centerVx * dt60;
      currentCenterY += centerVy * dt60;

      renderFrame(simTime, dt);
    };

    if (reducedMotion) {
      renderFrame(0, 0);
    } else {
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
