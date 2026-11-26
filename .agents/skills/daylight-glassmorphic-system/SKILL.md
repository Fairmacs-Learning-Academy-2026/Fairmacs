---
name: daylight-glassmorphic-system
description: Bright, airy, daylight glassmorphic design system with zero dark themes anywhere. Use for all visual work in the app and landing page: tokens, glass surfaces, typography, layout, forms, tables, modals, sidebars, accessibility. Triggers on "theme", "glass", "palette", "card", "sidebar", "modal", "dashboard", "color".
---

# Daylight Glassmorphic System

## Hard prohibitions (build fails if violated)
- NO dark mode anywhere: no `dark:` variants, no `prefers-color-scheme: dark`, no theme toggle, no `class="dark"`, no `next-themes` dark option. Remove any existing dark-mode code paths from the **UI layer only**.
- NO black or near-black surfaces (nothing darker than `#F1EEE8` as a background). No dark cards, tooltips, modals, code blocks, toasts or footers.
- NO neon-on-black, no heavy dark gradients.
- Set `color-scheme: light only;` on `:root` and `<meta name="color-scheme" content="light">`.
- Text may be charcoal; surfaces may not.

## Tokens (CSS variables, mirrored in the Tailwind theme)
```css
:root {
  color-scheme: light only;
  --bg-base: #FBF8F3;          /* warm alabaster */
  --bg-pearl: #F4F1EC;
  --ink: #1A1D24;              /* charcoal, AAA on base */
  --ink-soft: #444A55;         /* body text, >= 7:1 on base */
  --ink-mute: #6A7280;         /* secondary, >= 4.5:1 on glass */
  --brand: /* ONE saturated accent from the app's existing brand color; white-on-brand >= 4.5:1 */;
  --aurora-sky: #CFE6FF;
  --aurora-peach: #FFDCCB;
  --aurora-mint: #D3F3E5;
  --aurora-lilac: #E6DCFF;
  --ok: #1E8E5A; --warn: #B7691A; --danger: #C2362F;   /* all pass 4.5:1 on white */

  --glass-fill: rgba(255,255,255,0.58);
  --glass-fill-strong: rgba(255,255,255,0.78);
  --glass-edge: rgba(255,255,255,0.85);
  --glass-blur: 20px;          /* 16 to 24 range; 14 under 640px */
  --glass-shadow:
    0 1px 1px rgba(26,29,36,0.04),
    0 8px 24px rgba(26,29,36,0.06),
    0 24px 56px rgba(110,130,175,0.14);
  --radius-lg: 24px; --radius-md: 16px; --radius-sm: 12px; --radius-pill: 999px;
}
```
Use `--ink-mute` only for secondary text. Never put light-grey text on glass.

## Glass utilities
```css
.glass {
  background: var(--glass-fill);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border: 1px solid var(--glass-edge);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow), inset 1px 1px 0 rgba(255,255,255,0.9);  /* specular top/left */
}
.glass--strong { background: var(--glass-fill-strong); }
.glass--input  { background: rgba(255,255,255,0.7); border-radius: var(--radius-sm); }
@supports not (backdrop-filter: blur(1px)) { .glass { background: rgba(255,255,255,0.9); } }
@media (max-width: 640px) { :root { --glass-blur: 14px; } }
```
Glass reads as glass only over colour. Every page and layout MUST sit on the **Aurora layer**: a fixed, `aria-hidden`, `pointer-events:none` background with 4 to 5 blurred blobs (sky, peach, mint, lilac at 45 to 60% opacity, `filter: blur(80px)`) over `--bg-base`, plus a 3% SVG noise overlay.

## Component mapping (apply to every internal view)
| Element | Treatment |
|---|---|
| Navbar / topbar | `.glass--strong`, sticky, floating with 12px inset margin |
| Sidebar | `.glass`, rounded, active item = solid white pill + soft shadow |
| Cards / data panels | `.glass`, radius 24 |
| Tables | Glass container, transparent rows, hairline `rgba(26,29,36,0.06)` dividers, row hover = white at 70% |
| Modals / drawers / popovers | `.glass--strong`, dimmed backdrop is `rgba(251,248,243,0.6)` + blur, never black scrim |
| Inputs / selects | `.glass--input`, 2px brand focus ring with white offset |
| Buttons | Primary = solid `--brand` + white text. Secondary = glass pill. No dark buttons. |
| Toasts | Glass pill with a status-coloured icon. No dark toasts. |
| Charts | Pastel fills on glass; lines in `--brand`, grid lines at 6% charcoal |
| Status badges | Tinted pastel fill + dark readable text |
| Skeletons | Pearl shimmer (white to `#F1EEE8`), never grey-dark |

## Typography
- One characterful display face (e.g. Bricolage Grotesque, Fraunces, Instrument Serif) for headings plus one clean body face (Figtree, Inter, Geist). Max 2 families, 3 weights. Load with the framework's font tooling.
- Fluid headings via `clamp()`, tight tracking (-0.02 to -0.03em), body 14 to 16px, line length < 75ch.
- Tabular numerals for tables and metrics.
- Avoid ALL-CAPS labels and single-word-accent headlines.

## Accessibility (non-negotiable)
- Body text >= 7:1, secondary >= 4.5:1, measured against the *worst-case* backdrop (the darkest aurora area under the glass).
- Visible `:focus-visible` rings on every control; full keyboard operability.
- Targets >= 44px on touch.
- Don't rely on colour alone for status; pair with icon or text.
- `prefers-reduced-motion` honoured everywhere.

## Verification
- [ ] `grep -rE "dark:|prefers-color-scheme: *dark|class=\"dark\"|next-themes"` returns nothing in UI code
- [ ] No computed background darker than `#F1EEE8` on any route, modal, toast or tooltip
- [ ] Contrast checked on every glass surface at 375, 768 and 1440px
- [ ] Lighthouse accessibility >= 95