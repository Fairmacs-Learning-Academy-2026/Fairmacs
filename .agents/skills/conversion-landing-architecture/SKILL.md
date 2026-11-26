---
name: conversion-landing-architecture
description: Structures a high-converting education-brand home page: section order, honest copy, trust signals, CTAs, SEO, and an interactive hero playground and bento grid. Use when writing page content, information architecture, or conversion elements for Fairmacs Learning Academy.
---

# Conversion Landing Architecture (Fairmacs Learning Academy)

## Copy rules
- Write real, specific, honest copy. No invented statistics, fake testimonials, fake logos, or fake accreditations. If real data is missing, ask the user; otherwise use clearly labelled sample content in a single `content.ts` file so it is trivial to replace.
- One primary CTA per viewport (e.g. "Book a free demo class"), one quieter secondary CTA.
- Headlines state a learner outcome, not a feature.

## Section order
1. **Sticky glass nav**: logo, 4 links, primary CTA. Shrinks and gains blur on scroll.
2. **Hero**: kinetic headline, subcopy, magnetic primary CTA, secondary CTA, trust micro-row. Right side: the **Live Playground** (below).
3. **Social proof strip**: marquee of real partners/results (or hidden if none provided).
4. **Programs bento grid**: interactive tiles with live state transitions (hover expands, click flips to details, tiles filter by age/level).
5. **How learning works**: 3 to 4 step scroll-linked timeline (progress line fills as you scroll).
6. **Outcomes**: animated counters (only real numbers).
7. **Teachers / method**: glass cards with tilt.
8. **Testimonials**: glass carousel with drag, keyboard support.
9. **Pricing or batches** (if provided) as glass tiers, with a highlighted recommended tier.
10. **FAQ**: accessible accordion (animated height via `grid-template-rows` trick).
11. **Final CTA band**: large pastel-gradient glass panel with the form (name, phone/email, interest), validated inline.
12. **Footer**: light glass, sitemap, contact, social, legal.

## Interactive "Spice" components (must be built, no stubs)
- **Hero Live Playground**: a glass "learning widget" where the visitor picks a subject chip (e.g. Math / English / Coding / Exam Prep) and a level; the widget animates a mini lesson card, progress ring, and a generated sample "today's challenge" from a typed local dataset. Includes streak confetti (lightweight canvas, light pastel colors) on a correct answer. State via `useReducer`.
- **Interactive bento grid**: tiles reorder/expand with Framer Motion `layout` + `layoutId` shared-element transitions.
- **Floating glass chips** around the hero mockup (e.g. "Live doubt-solving", "Weekly progress report") bobbing at different phases.

## Tech
- Next.js (App Router, TypeScript), Tailwind CSS, Framer Motion (`motion/react`), Lucide icons, `next/font`, `next/image`.
- Form posts to a typed route handler with validation (zod) and honeypot; returns success state in UI.
- SEO: metadata API, OpenGraph, JSON-LD (`EducationalOrganization`), semantic HTML, sitemap, robots.
- Zero TODOs, zero unused deps, `npm run build` and `npm run lint` must pass.

## Verification checklist
- [ ] Every section from the order above exists and is responsive
- [ ] Playground and bento work with keyboard only
- [ ] Lighthouse: Perf >= 90, A11y >= 95, SEO >= 95
- [ ] No fabricated claims remain