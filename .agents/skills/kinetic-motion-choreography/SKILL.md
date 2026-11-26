---
name: kinetic-motion-choreography
description: Defines motion language, animation choreography, and micro-interactions using Framer Motion (motion/react) and optional GSAP ScrollTrigger. Use for hero reveals, scroll parallax, magnetic buttons, tilt/glare cards, cursor-following light, and ambient floating blobs.
---

# Kinetic Motion Choreography

## Principles
- The page must never feel static: something ambient is always moving subtly, and every interactive element responds.
- Motion is purposeful: guide attention, reveal hierarchy, confirm interaction. Nothing gratuitous.
- Only animate `transform` and `opacity` (plus `filter` sparingly). Never animate `width/height/top/left`.
- Respect `prefers-reduced-motion`: wrap in `useReducedMotion()`, fall back to simple fades, disable parallax, tilt, magnetism, and blob drift.

## Motion tokens
```ts
export const ease = { out: [0.22, 1, 0.36, 1], inOut: [0.65, 0, 0.35, 1] } as const;
export const spring = { soft: { type: "spring", stiffness: 120, damping: 18 },
                        snappy: { type: "spring", stiffness: 300, damping: 24 } };
export const dur = { micro: 0.18, base: 0.5, reveal: 0.9 };
```

## Required patterns (each must exist in the build)

1. **Staggered kinetic headline.** Split H1 into words (and lines) with `motion.span`, `overflow-hidden` mask wrapper, each word rising from `y: 110%` with 60ms stagger, `ease.out`, 0.9s. Highlight one word with an animated gradient underline drawn via `pathLength`.

2. **Ambient breathing blobs.** 4 to 5 blobs on infinite `animate` loops (x/y drift 30 to 60px, scale 1 to 1.12, 14 to 26s, `repeatType: "mirror"`, different durations so they never sync).

3. **Scroll-linked parallax.** `useScroll` + `useTransform` so the hero mockup, floating chips, and blobs move at different depths (0.1x, 0.3x, 0.6x). Add `useSpring` smoothing.

4. **Magnetic CTA.** Button tracks pointer within 120px radius, translating up to 10px with `spring.snappy`, returning on leave. Inner label moves 40% of the button offset for depth. Include a soft pulsing glow ring.

5. **Tilt + glare glass cards.** On pointer move: `rotateX/rotateY` max 8deg (perspective 1000px), plus a radial-gradient white specular highlight following the cursor inside the card (CSS vars `--mx`, `--my`). Reset with `spring.soft`.

6. **Cursor caustic light.** One global fixed layer: a soft radial light (rgba white to transparent, ~420px, `mix-blend-mode: soft-light`) trailing the cursor with spring lag. Glass cards also compute a local refraction highlight. Disable on touch devices.

7. **Section reveals.** `whileInView` with `viewport={{ once: true, margin: "-12%" }}`, children staggered 80ms, y: 24 to 0, opacity 0 to 1, blur 8px to 0.

8. **Animated counters.** Numbers count up on first view using `animate()` with `ease.out`, tabular-nums.

9. **Marquee.** Infinite, pausable-on-hover logo/testimonial marquee with edge fade masks.

10. **Page-load choreography.** Order: background washes, nav slides down, headline words, subcopy, CTAs, hero playground and floating chips (staggered spring pop-in). Total under 1.6s.

## Performance rules
- `will-change: transform` only on actively animating layers; remove after.
- Cap simultaneous infinite animations (< 8). Pause offscreen blobs with `useInView`.
- Pointer handlers use `useMotionValue` (no React re-renders per mouse move).
- Keep CLS = 0 and INP < 200ms.

## Verification checklist
- [ ] Reduced-motion mode tested and still looks complete
- [ ] 60fps in Chrome performance panel on hero scroll
- [ ] No layout shift during reveals