---
name: kinetic-motion-and-spice
description: Motion language and interactive centerpieces using Framer Motion (motion/react) and optional GSAP. Use for route transitions, kinetic typography, scroll parallax, drifting aurora blobs, magnetic buttons, tilt/glare cards, spring micro-interactions, cursor caustic light, and the landing page hero widget and bento grid. Triggers on "animation", "motion", "hover", "parallax", "transition", "landing page", "hero".
---

# Kinetic Motion and Spice

## Principles
- The site must feel alive and tactile: something ambient always drifts, and every interactive element answers a touch.
- Animate only `transform`, `opacity` and (sparingly) `filter`. Never `width/height/top/left`.
- Motion must never alter logic. Animation wrappers sit **around** existing elements and never intercept or replace handlers.
- Honour `prefers-reduced-motion` via `useReducedMotion()`: fall back to simple fades; disable parallax, tilt, magnetism, blob drift and cursor light.
- Install `framer-motion` (or `motion`) and `lucide-react` only if missing. Match the version style already in `package.json`.

## Motion tokens (`src/lib/motion.ts`)
```ts
export const ease = { out: [0.22, 1, 0.36, 1], inOut: [0.65, 0, 0.35, 1] } as const;
export const spring = {
  soft:   { type: "spring", stiffness: 120, damping: 18 },
  snappy: { type: "spring", stiffness: 320, damping: 24 },
  press:  { type: "spring", stiffness: 500, damping: 30 },
} as const;
export const dur = { micro: 0.18, base: 0.45, reveal: 0.9 };
export const stagger = 0.07;
```

## Whole-app patterns (every view)
1. **Route transitions.** Wrap route content in `AnimatePresence mode="wait"`, keyed by pathname: fade + 12px rise + 6px blur-in, 0.4s `ease.out`. In Next.js App Router, use a client `template.tsx` wrapper. Do not change routing logic.
2. **Aurora drift.** 4 to 5 blobs with infinite mirrored loops (x/y 30 to 60px, scale 1 to 1.12, durations 14 to 26s, all different so they never sync). Pause when the tab is hidden.
3. **Spring micro-interactions.** Buttons: `whileHover={{ y: -1 }}`, `whileTap={{ scale: 0.97 }}` with `spring.press`. Inputs: focus ring scales in. Tabs: sliding active pill via `layoutId`. Modals and drawers: spring scale/slide with blurred backdrop fade. Toasts: spring slide-in. Checkbox/switch: spring thumb.
4. **List and table choreography.** Staggered row entry (`stagger`) on first load only. Layout animation (`layout`) on filter and sort changes. Skeleton to content cross-fade.
5. **Tilt + glare glass cards.** `rotateX/rotateY` up to 6deg (perspective 1000px) driven by `useMotionValue`/`useSpring` (no per-move re-renders), plus a radial white specular highlight following the pointer (`--mx`, `--my`). Reset with `spring.soft`. Use on feature and dashboard cards; **not** on dense tables or forms.
6. **Magnetic CTA.** Pointer within 120px pulls the button up to 10px (inner label moves 40% of that). Primary CTAs only.
7. **Animated counters** on metric cards: `animate()` count-up on first view, tabular numerals.

## Landing page spice (all required, fully working, no stubs)
1. **Kinetic headline.** Words in `overflow-hidden` masks rise from `y:110%`, 60ms stagger, 0.9s `ease.out`. No single-word colour accent trick.
2. **Cursor caustic light.** One fixed layer: a ~420px soft white radial light with `mix-blend-mode: soft-light`, following the cursor with spring lag. Glass panels also show a local refraction sheen using `--mx/--my`. Disabled on touch.
3. **Live-preview hero widget.** An interactive glass widget wired to the app's **real** read-only data where a safe public endpoint or existing hook is available. Otherwise use typed mock data in `src/content/preview.ts`, clearly isolated. It must be interactive (chips, toggles, a progress ring or mini chart animating on change). It must never call write endpoints or change any API.
4. **Morphing bento grid.** Tiles use `layout` + `layoutId` shared-element transitions: hover expands, click opens a detail state, filter chips reorder the tiles with spring physics. Keyboard accessible.
5. **Scroll-linked parallax.** `useScroll` + `useTransform` + `useSpring` so hero mockup, floating chips and blobs move at different depths (0.1x, 0.3x, 0.6x).
6. **Sections reveal** with `whileInView` (`once:true`, `margin:"-12%"`), children staggered 80ms. Use sparingly; don't animate every section the same way.
7. **Load choreography** under 1.6s: aurora, nav, headline words, subcopy, CTAs, widget and chips.

## Performance rules
- `will-change` only on actively animating layers.
- Fewer than 8 concurrent infinite animations; pause offscreen via `useInView`.
- CLS = 0, INP < 200ms, 60fps on scroll.
- Cap `backdrop-filter` layers: no more than 3 nested glass surfaces in the same viewport region.

## Verification
- [ ] Reduced-motion mode renders a complete, usable UI
- [ ] Animation wrappers add no extra network calls and don't swallow click, submit or keyboard events
- [ ] Route transitions don't remount data hooks unnecessarily (no duplicate fetches)
- [ ] 60fps check on the hero scroll and a long table