# Fairmacs Learning Academy — Bright Glassmorphic Homepage Guide

## 1. How to Run & Verify Locally

```powershell
cd r:\lms\frontend
npm run dev        # Starts Vite dev server at http://localhost:5173
npm run lint       # Runs Oxlint static analysis
npm test           # Runs all 23 LMS regression suites
node test-bright-glassmorphic-landing.js   # Verifies daylight-only & skill constraints
npm run build      # Builds production bundle into frontend/dist
```

---

## 2. Where to Edit Copy & Toggle Sections (Single File)

All landing page text, tracks, interactive playground drills, outcome counters, FAQs, contact details, and section toggles live in **one pure JavaScript file**:

- **`frontend/src/content/site.js`** (`SITE_CONTENT`)

### Feature Flags (`SITE_CONTENT.flags`)
- `showDivisionsMarquee` (`true`) — Marquee of Fairmacs' 10 operational divisions.
- `showExternalPartnersMarquee` (`false`) — Keep `false` until official partner logos are approved.
- `showLearningFormats` (`true`) — Shows the 3 training cadence cards (*Day-One Foundation*, *Role Mastery Cohort*, *Compliance & Leadership*).
- `showSampleTestimonials` (`true`) — Shows illustrative internal quotes clearly badged as sample preview until replaced.

---

## 3. Design Tokens & Glass System Location

- **Tokens & Glass Utilities:** `frontend/src/styles/landing-glass.css`
  - Surfaces: `--bg-base: #FBF8F3` (warm alabaster), `--bg-pearl: #F4F1EC` (pearl), `color-scheme: light only;`
  - Ink: `--ink: #1F2328`, `--ink-soft: #4A5058` (>= 7:1 contrast)
  - Mesh Washes: `--accent-sky: #BFE3FF`, `--accent-peach: #FFD9C7`, `--accent-mint: #CFF3E3`, `--accent-lilac: #E4DAFF`
  - Brand Accent: `--brand: #0B5CAB` (6.72:1 contrast with white)
  - Glass Utilities: `.glass`, `.glass--strong`, `.glass-pill` (`22px` blur desktop, `14px` under `640px`)
- **Motion Hooks & Spring Primitives:** `frontend/src/components/landing/motionHooks.js` & `frontend/src/components/landing/motionPrimitives.jsx`
- **Enquiry Form Validation:** `frontend/src/utils/enquiryValidation.js`

---

## 4. Items Ready for Your Final Real Data in `src/content/site.js`

1. **`SITE_CONTENT.testimonials`** — Currently contains 3 `[SAMPLE — REPLACE]` quotes; swap in verified employee/manager quotes when ready.
2. **`SITE_CONTENT.playgroundChallenges`** — Currently contains 12 realistic freight/docs/pricing/compliance micro-drills flagged `[SAMPLE CHALLENGE]`; edit or add Fairmacs-specific quiz questions anytime.
3. **`SITE_CONTENT.contact.phone` / `whatsappUrl` / `linkedinUrl`** — Optional fields; populate if you want a reception phone number, WhatsApp button, or LinkedIn link shown in the footer.
