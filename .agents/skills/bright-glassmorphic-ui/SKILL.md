---
name: bright-glassmorphic-ui
description: Enforces a bright, airy, daylight glassmorphic design system with zero dark themes. Use for any UI work: tokens, colors, glass surfaces, typography, spacing, and accessibility. Triggers on "landing page", "glass", "card", "theme", "palette", "hero".
---

# Bright Glassmorphic UI

## Hard prohibitions (fail the build if violated)
- NO dark mode. No `dark:` variants, no `prefers-color-scheme: dark`, no theme toggle.
- NO black or near-black page/section backgrounds (nothing darker than #F4F1EC as a surface).
- NO neon-on-black, no moody gradients, no dark footer. Footer is a pale glass panel.
- NO lorem ipsum, TODO, placeholder images, or stock "Acme" copy.
- Set `color-scheme: light only;` on `:root`.

## Design tokens (define in `globals.css` as CSS variables + Tailwind theme)
```css
:root {
  color-scheme: light only;
  --bg-base: #FBF8F3;        /* warm alabaster */
  --bg-pearl: #F4F1EC;
  --ink: #1F2328;            /* charcoal text, never pure black */
  --ink-soft: #4A5058;       /* body, min 7:1 on --bg-base */
  --accent-sky: #BFE3FF;
  --accent-peach: #FFD9C7;
  --accent-mint: #CFF3E3;
  --accent-lilac: #E4DAFF;
  --brand: /* ONE saturated brand accent derived from the Fairmacs logo, luminance high enough for white-on-brand >= 4.5:1 */;
  --glass-fill: rgba(255,255,255,0.55);
  --glass-fill-strong: rgba(255,255,255,0.72);
  --glass-border: rgba(255,255,255,0.80);
  --glass-shadow:
    0 1px 1px rgba(31,35,40,0.04),
    0 8px 24px rgba(31,35,40,0.06),
    0 24px 64px rgba(120,140,180,0.14);
}
```

## Glass surface recipe (utility class `.glass`)
```css
.glass {
  background: var(--glass-fill);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,0.9);
}
.glass--strong { background: var(--glass-fill-strong); }
@supports not (backdrop-filter: blur(1px)) {
  .glass { background: rgba(255,255,255,0.88); }
}
```
Glass only reads as glass when something colorful sits behind it. Every glass section MUST have a mesh-gradient or blob layer beneath it.

## Background system
- Page base: `--bg-base` with 3 to 5 large blurred radial blobs (sky, peach, mint, lilac) at 40 to 60% opacity, `filter: blur(80px)`, absolutely positioned, `pointer-events: none`, `aria-hidden`.
- Add a subtle SVG noise overlay (opacity 0.03) to prevent banding.
- Alternate section washes (sky to peach to mint) so scrolling feels like moving through daylight.

## Typography
- Display: a characterful variable font (e.g. Fraunces, Instrument Serif, or Bricolage Grotesque) via `next/font`. Body: Inter or Geist. Never default system stack alone.
- Fluid scale with `clamp()`: H1 `clamp(2.75rem, 6vw + 1rem, 6rem)`, tight tracking (-0.03em), line-height 0.98 to 1.05.
- Max 2 families, max 3 weights.

## Layout
- 12-col grid, max-width 1240px, generous vertical rhythm (section padding `clamp(5rem, 10vw, 9rem)`).
- Mobile-first. Glass blur reduced to 14px under 640px for performance.

## Accessibility (non-negotiable)
- Text contrast >= 4.5:1 (body 7:1 preferred) measured against the *worst-case* backdrop.
- Visible focus rings (2px `--brand` + 2px white offset).
- All motion honors `prefers-reduced-motion`.
- Semantic landmarks, one `<h1>`, labelled interactive elements.

## Verification checklist
- [ ] grep finds no `dark:` and no `prefers-color-scheme: dark`
- [ ] No computed background darker than #F4F1EC on any section
- [ ] Lighthouse a11y >= 95
- [ ] Glass looks correct over blobs at 375px, 768px, and 1440px