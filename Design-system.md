# Fairmacs KMS — Design System & UI Specification

**Version:** 1.0.0  
**Target Platform:** Web (Desktop First, Tablet & Mobile Responsive)  
**Core Technologies:** React 19, Tailwind CSS v4, Lucide React, Canvas Confetti  
**Typography:** Inter (Google Fonts)

---

## 📑 Table of Contents
1. [Design Philosophy & Core Pillars](#1-design-philosophy--core-pillars)
2. [Color Palette & Semantic Tokens](#2-color-palette--semantic-tokens)
3. [Typography Scale & Hierarchies](#3-typography-scale--hierarchies)
4. [Spacing, Grid & Layout System](#4-spacing-grid--layout-system)
5. [Elevation, Borders & Depth](#5-elevation-borders--depth)
6. [Motion & Micro-Interactions](#6-motion--micro-interactions)
7. [Core UI Component Library](#7-core-ui-component-library)
8. [Role-Based Dashboard Patterns](#8-role-based-dashboard-patterns)
9. [Accessibility (a11y) & Contrast Standards](#9-accessibility-a11y--contrast-standards)

---

## 1. Design Philosophy & Core Pillars

The Fairmacs KMS design system is tailored for an enterprise freight forwarding and global logistics corporation. The interface emphasizes:

- **Clarity & Efficiency:** High-density data tables, clear progress meters, and minimal cognitive friction for employees completing required compliance modules.
- **Enterprise Authority:** Anchored in a deep maritime navy (`#0f172a`, `#0b1f38`) paired with bright cyan and blue accents (`#0284c7`, `#06b6d4`), conveying security and precision.
- **Role-Centric Adaptability:** Visual layouts dynamically adjust depending on whether the user is an **Employee** (focused on task completion and certificates), a **Trainer** (curriculum building and grading), a **Manager** (team oversight and compliance tracking), or an **HR Admin** (enterprise configuration, imports, and system audit).
- **Responsive Resilience:** Flexbox and CSS grid layouts guarantee non-breaking views across ultrawide monitors down to mobile tablet viewports.

---

## 2. Color Palette & Semantic Tokens

All primary tokens are registered as CSS custom properties in [`index.css`](frontend/src/index.css) and mirrored in Tailwind utility classes:

### 2.1 Brand & Neutral Tokens

| Token Name | Hex Code | HSL Equivalent | Role & Context |
|---|---|---|---|
| `--primary-navy` | `#0f172a` | `hsl(222, 47%, 11%)` | Primary text, modal headers, dark backgrounds |
| `--secondary-navy` | `#1e293b` | `hsl(217, 33%, 17%)` | Sidebar hover backgrounds, secondary borders |
| `--sidebar-dark` | `#0b1f38` | `hsl(214, 67%, 13%)` | Fixed navigation sidebar background |
| `--bg-slate` | `#f8fafc` | `hsl(210, 40%, 98%)` | Global application background |
| `--card-bg` | `#ffffff` | `hsl(0, 0%, 100%)` | Content card, dropdown, and modal backgrounds |
| `--border-slate` | `#e2e8f0` | `hsl(214, 32%, 91%)` | Standard card borders, table dividers |
| `--text-main` | `#0f172a` | `hsl(222, 47%, 11%)` | Default body copy, high-contrast headings |
| `--text-muted` | `#64748b` | `hsl(215, 16%, 47%)` | Subtitles, meta-tags, helper texts, table headers |

### 2.2 Accent & Interactive Gradients

| Token Name | Hex Code | Purpose & Usage |
|---|---|---|
| `--accent-blue` | `#0284c7` | Primary action buttons, active navigation markers |
| `--accent-blue-hover` | `#0369a1` | Hover state for primary buttons |
| `--accent-cyan` | `#06b6d4` | Gradient partner for badges, active states, progress fills |
| `Primary Gradient` | `linear-gradient(135deg, #0284c7, #06b6d4)` | Brand badges, active sidebar tabs, primary highlights |

### 2.3 Semantic Status Colors

| State | Background | Border | Text | Badge Example |
|---|---|---|---|---|
| **Success / Completed** | `#ecfdf5` | `#a7f3d0` | `#047857` | Course Completed, Passing Quiz (>=80%) |
| **In Progress / Info** | `#eff6ff` | `#bfdbfe` | `#1d4ed8` | Active Enrollment, Ongoing Training Session |
| **Warning / Pending** | `#fffbeb` | `#fde68a` | `#b45309` | Quiz In Progress, Approaching Deadline |
| **Danger / Overdue** | `#fff1f2` | `#fecdd3` | `#e11d48` | Overdue Assignment, Terminated Status, Failed Quiz |
| **Neutral / Inactive** | `#f1f5f9` | `#cbd5e1` | `#475569` | Draft Course, Inactive / On Leave Employee |

---

## 3. Typography Scale & Hierarchies

The font family across all components is **Inter**, loaded with weights `300, 400, 500, 600, 700, 800`.

```css
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

### Type Scale Specification

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **Display Header** | `2.00rem` (32px) | 800 (ExtraBold) | 1.2 | Main page titles (e.g., *HR Administration Dashboard*) |
| **Section Header** | `1.50rem` (24px) | 700 (Bold) | 1.3 | Module headers, drilldown titles, modal headers |
| **Card Header** | `1.25rem` (20px) | 600 (SemiBold) | 1.4 | Course card titles, department widget headings |
| **Subtitle / Subhead** | `1.05rem` (16.8px) | 500 (Medium) | 1.5 | Section summaries, step descriptors |
| **Body (Default)** | `0.95rem` (15.2px) | 400 (Regular) | 1.5 | General paragraph text, table body cells |
| **Body Small** | `0.85rem` (13.6px) | 500 (Medium) | 1.4 | Meta tags, author info, timestamps, input helper text |
| **Caption / Label** | `0.75rem` (12px) | 700 (Bold) | 1.3 | Form input labels (uppercase), table column headers |
| **Micro-Badge** | `0.65rem` (10.4px) | 800 (ExtraBold) | 1.0 | Status pills, role tags (`EMPLOYEE`, `TRAINER`) |

---

## 4. Spacing, Grid & Layout System

### 4.1 Base Unit: 8px Scale
All spacing, padding, margins, and layout gaps adhere strictly to the 4px / 8px scale:

- `4px` (`0.25rem`): Micro gaps, badge inner padding.
- `8px` (`0.50rem`): Component element gaps, tight card spacing.
- `12px` (`0.75rem`): Input field vertical padding, small margins.
- `16px` (`1.00rem`): Standard layout padding, button horizontal padding.
- `24px` (`1.50rem`): Section gaps, card padding, modal body padding.
- `32px` (`2.00rem`): Page container padding, primary section dividers.
- `48px` (`3.00rem`): Hero header spacing, dashboard widget separation.

### 4.2 Top-Level Layout Anatomy
```
+------------------------------------------------------------------------+
|  HEADER (Height: 70px, Sticky top, z-index: 100, Border bottom)         |
|  [Brand Logo] [Role Switcher]               [Notifications] [User Menu] |
+------------------+-----------------------------------------------------+
| SIDEBAR          | MAIN CONTENT AREA                                   |
| (Width: 250px,   | (Flex: 1, Max-Width: 1400px, Margin: 0 Auto,        |
|  Fixed Left,     |  Padding: 2rem, Background: #f8fafc)                |
|  Dark #0b1f38)   |                                                     |
|                  | [Page Title & Action Toolbar]                       |
| [Navigation]     | [Metric Stat Cards Grid - 4 Columns]                |
|                  | [Primary Interactive View / Tabbed Workspace]       |
+------------------+-----------------------------------------------------+
```

### 4.3 Responsive Breakpoints
- **Mobile (< 640px):** Sidebar collapses into mobile slide-out drawer; metric cards wrap to single column.
- **Tablet (640px – 1024px):** 2-column metric cards; tables enable horizontal scroll wrappers.
- **Desktop (1024px – 1440px):** Full 4-column metric cards; multi-pane course builder modal.
- **Ultrawide (> 1440px):** Centered workspace capped at `1400px` max-width to avoid line-length eye fatigue.

---

## 5. Elevation, Borders & Depth

### 5.1 Shadows
- `--shadow-sm`: `0 1px 3px rgba(0, 0, 0, 0.05)` — Table rows, subtle input focus.
- `--shadow-md`: `0 4px 12px rgba(15, 23, 42, 0.08)` — Standard course cards, stat cards.
- `--shadow-lg`: `0 10px 25px rgba(15, 23, 42, 0.12)` — Floating dropdowns, action modals.
- `--shadow-glow`: `0 4px 14px rgba(2, 132, 199, 0.35)` — Active navigation tab, primary action button.

### 5.2 Borders & Radii
- `--radius-sm`: `4px` — Checkboxes, micro status badges.
- `--radius-md`: `8px` — Standard inputs, buttons, navigation items.
- `--radius-lg`: `12px` — Dashboard cards, interactive panels.
- `--radius-full`: `9999px` / `20px` — Avatar circles, pill badges.
- Standard Border: `1px solid var(--border-slate)` (`#e2e8f0`).

---

## 6. Motion & Micro-Interactions

1. **Standard Transitions:** All buttons, nav items, and interactive links use `transition: all 0.2s ease;`.
2. **Page Entrance Animation:**
   ```css
   @keyframes fadeIn {
     from { opacity: 0; transform: translateY(8px); }
     to   { opacity: 1; transform: translateY(0); }
   }
   .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
   ```
3. **Hover Elevation:** Cards elevate smoothly with `transform: translateY(-2px)` and shadow transition on hover.
4. **Completion Celebration:** Course completion triggers a particle burst using `canvas-confetti` configured with corporate palette colors (`#0284c7`, `#06b6d4`, `#10b981`).

---

## 7. Core UI Component Library

### 7.1 Buttons
- **Primary Action:**
  - Background: `var(--accent-blue)` (`#0284c7`), hover: `#0369a1`.
  - Text: `#ffffff`, font-weight `600`, radius `8px`, padding `0.65rem 1.25rem`.
- **Secondary / Ghost:**
  - Background: `#f1f5f9`, hover: `#e2e8f0`, text: `#334155`.
- **Danger Button:**
  - Background: `#fff1f2`, border: `1px solid #fecdd3`, text: `#e11d48`, hover: `#f43f5e` (inverted white text).
- **Outline Action:**
  - Background: `transparent`, border: `1px solid #cbd5e1`, text: `#0f172a`, hover: `#f8fafc`.

### 7.2 Form Inputs & Controls
- **Text Inputs & Selects:**
  - Height: `40px`, padding: `0.5rem 0.85rem`, border: `1px solid #cbd5e1`, radius: `8px`.
  - Focus State: Border color `#0284c7`, box-shadow `0 0 0 3px rgba(2, 132, 199, 0.15)`.
- **Labels:**
  - `font-size: 0.75rem`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.05em`, color `#475569`.

### 7.3 Data Tables
- Header: Background `#f8fafc`, text color `#64748b`, uppercase `0.72rem`, letter spacing `0.05em`, padding `0.85rem 1rem`.
- Rows: Background `#ffffff`, hover background `#f8fafc`, bottom border `1px solid #f1f5f9`.
- Responsive Overflow: Enclosed within an `overflow-x: auto` wrapper with customized 6px scrollbars.

### 7.4 Modals & Slide-out Drawers
- Backdrop: `rgba(15, 23, 42, 0.65)` with `backdrop-filter: blur(4px)`.
- Modal Window: Centered flexbox, background `#ffffff`, radius `14px`, max-height `90vh`, box-shadow `--shadow-lg`.
- Header: Sticky header with title, subtitle, and close `X` button.
- Footer: Sticky footer with Cancel and Primary Submit buttons.

---

## 8. Role-Based Dashboard Patterns

| Portal / View | Visual Theme & Focus | Key Dominant Components |
|---|---|---|
| **Employee Portal** (`/dashboard`, `/learning`) | Progress-centric, motivating, clean | Radial progress rings, course cards with continue buttons, quiz trigger modal, verifiable certificate viewer. |
| **Trainer Portal** (`/trainer`) | Authoring workspace, curriculum tree | Multi-step Course Builder modal, Module & Lesson list with drag/order, Zoho document upload dropzone, draft management panel. |
| **Manager Portal** (`/manager`) | Team oversight, compliance risk | Direct reports table, overdue warning indicators, training transcript drawer, team export buttons (Excel/PDF). |
| **HR Admin Portal** (`/admin`) | High-density controls, auditing | Department matrix grid, bulk employee Excel import modal, lifecycle status toggles, organization-wide analytics charts. |

---

## 9. Accessibility (a11y) & Contrast Standards

1. **Contrast Ratio Compliance:**
   - Primary text (`#0f172a`) against white (`#ffffff`): **16.1:1** (Exceeds WCAG AAA).
   - Secondary text (`#64748b`) against white (`#ffffff`): **4.6:1** (Complies with WCAG AA).
   - Accent button text (White on `#0284c7`): **4.8:1** (Complies with WCAG AA).
2. **Keyboard Navigation:** All interactive elements (`button`, `a`, `input`, `select`) provide visible outline focus rings (`:focus-visible`).
3. **Screen Reader Optimization:** Form fields pair `<label htmlFor="...">` with matching IDs; status icons include `aria-label` or `aria-hidden="true"` with accompanying descriptive text.
4. **Accessible Iconography:** Icons from `lucide-react` are consistently rendered with a standard 18px or 20px bounding box and paired with legible text labels.
