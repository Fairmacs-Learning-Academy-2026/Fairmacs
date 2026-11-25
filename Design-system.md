# Fairmacs KMS — Design System & UI Specification

**Version:** 2.1.0  
**Target Platform:** Web (Desktop First, Tablet & Mobile Responsive)  
**Core Technologies:** React 19, Tailwind CSS, Lucide React, Canvas Confetti, OpenPDF, PDF.js  
**Typography:** Inter (Google Fonts)

---

## 📑 Table of Contents
1. [Design Philosophy & Core Pillars](#1-design-philosophy--core-pillars)
2. [Color Palette & Semantic Tokens](#2-color-palette--semantic-tokens)
3. [Typography Scale & Hierarchies](#3-typography-scale--hierarchies)
4. [Elevation, Surfaces & Glassmorphism](#4-elevation-surfaces--glassmorphism)
5. [Proximity-Hover Intelligent Liquid Glass Sidebar](#5-proximity-hover-intelligent-liquid-glass-sidebar)
6. [Editorial Learning Operations Dashboard Direction](#6-editorial-learning-operations-dashboard-direction)
7. [Universal Assigned Learning Carousel](#7-universal-assigned-learning-carousel)
8. [Learning & Compliance Calendar Specification](#8-learning--compliance-calendar-specification)
9. [Dynamic PDF Watermark Visual Standards](#9-dynamic-pdf-watermark-visual-standards)
10. [Core UI Component Library](#10-core-ui-component-library)
11. [Accessibility (a11y) & Contrast Standards](#11-accessibility-a11y--contrast-standards)

---

## 1. Design Philosophy & Core Pillars

The Fairmacs KMS design system is tailored for an enterprise freight forwarding, shipping, and supply-chain corporation. The interface emphasizes:

- **Calm, Editorial Enterprise Tone:** Replaces generic "AI-dashboard" templates with calm, high-density workspaces. Avoids oversized gradients, decorative blobs, bouncing counters, and fake trend arrows.
- **Precision Data Hierarchy:** Uses white surfaces with subtle 1px slate borders (`#E2E8F0`), soft shadows, and deep navy text (`#0F172A`) over a pale blue-gray canvas (`#F8FAFC`).
- **Targeted Glassmorphism:** Glassmorphism is used purposefully for modals, tooltips, and floating navigation overlays—never as a blurry default for standard data tables or metric cards.
- **Responsive & Touch-Resilient:** Seamlessly adapts from 4K and ultrawide displays down to compact mobile viewports, providing touch-friendly tap targets ($\ge 44\text{px}$) and hidden scrollbars where appropriate.

---

## 2. Color Palette & Semantic Tokens

### 2.1 Brand & Neutral Tokens

| Token Name | Hex Code | Purpose & Context |
|:---|:---|:---|
| `--primary-navy` | `#0F172A` | Primary typography, high-contrast headings, active icons |
| `--secondary-navy` | `#1E293B` | Secondary headers, active sub-tabs, hover states |
| `--sidebar-dark` | `#0B1F38` | Deep maritime navy base for navigation |
| `--bg-canvas` | `#F8FAFC` | Global application backdrop (slate 50) |
| `--card-surface` | `#FFFFFF` | Crisp white cards, data tables, and form containers |
| `--border-subtle` | `#E2E8F0` | Card borders, dividers, table cell lines |
| `--text-muted` | `#64748B` | Helper text, metadata, timestamps, table column headers |

### 2.2 Accent & Interactive Tokens

| Token Name | Hex Code | Purpose & Usage |
|:---|:---|:---|
| `--accent-blue` | `#0284C7` | Primary action buttons, active navigation markers |
| `--accent-blue-hover` | `#0369A1` | Hover state for primary buttons |
| `--accent-cyan` | `#06B6D4` | Accent highlight, progress track end-caps, badges |
| `Brand Gradient` | `linear-gradient(135deg, #0284C7, #06B6D4)` | High-impact badges, primary submit buttons |

### 2.3 Semantic Status Palette

| State | Background | Border | Text | Example Usage |
|:---|:---|:---|:---|:---|
| **Target Met / Completed** | `#F0FDF4` | `#BBF7D0` | `#16A34A` | Completed course, Passing quiz ($\ge 80\%$), Compliance $\ge 90\%$ |
| **In Progress / Info** | `#EFF6FF` | `#BFDBFE` | `#0F6CBD` | Active learning, Ongoing live session, Progress $50\text{--}89\%$ |
| **Needs Focus / Warning** | `#FEF2F2` | `#FECACA` | `#DC2626` | Progress $<50\%$, Approaching due date, Action required |
| **Neutral / Unassigned** | `#F1F5F9` | `#CBD5E1` | `#64748B` | No courses assigned, Open-ended policy without due date |

---

## 3. Typography Scale & Hierarchies

The font family across all components is **Inter**, configured with weights `300, 400, 500, 600, 700, 800`.

```css
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

### Type Scale Specification

| Level | Size | Weight | Line Height | Usage |
|:---|:---|:---|:---|:---|
| **Display Header** | `1.75rem` (28px) | 800 (ExtraBold) | 1.2 | Workspace titles (*HR Overview*, *Team Training*) |
| **Section Header** | `1.25rem` (20px) | 700 (Bold) | 1.3 | Panel titles (*Departmental Training Analytics*) |
| **Card Header** | `1.05rem` (16.8px) | 600 (SemiBold) | 1.4 | Metric card headers, course card titles |
| **Body (Default)** | `0.90rem` (14.4px) | 400 (Regular) | 1.5 | Paragraphs, descriptions, table body text |
| **Body Small** | `0.80rem` (12.8px) | 500 (Medium) | 1.4 | Metadata, instructor names, durations |
| **Caption / Label** | `0.72rem` (11.5px) | 700 (Bold) | 1.3 | Uppercase form labels, table column headers |
| **Micro-Badge** | `0.65rem` (10.4px) | 700 (Bold) | 1.0 | Status pills (*Target Met*, *In Progress*) |

---

## 4. Elevation, Surfaces & Glassmorphism

### 4.1 Surface Shadows
- `--shadow-card`: `0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)` — Clean data surface.
- `--shadow-hover`: `0 4px 14px rgba(15, 23, 42, 0.08)` — Interactive card elevation.
- `--shadow-modal`: `0 20px 40px -15px rgba(15, 23, 42, 0.25)` — Floating dialogs and drilldowns.

### 4.2 Liquid Glass Specification (Modals & Overlays)
```css
background: rgba(255, 255, 255, 0.88);
backdrop-filter: blur(20px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.65);
box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
```

---

## 5. Proximity-Hover Intelligent Liquid Glass Sidebar

The navigation sidebar redefines spatial efficiency on web desktops:

1. **Auto-Hiding Rail:** In default state, the sidebar collapses into a slim 16px ambient edge indicator.
2. **Proximity Trigger:** Detects cursor proximity within an 8–16px threshold from the left viewport edge to smoothly expand the dock.
3. **Body-Mounted Portal Tooltips:** Floating hover labels mount to `document.body` via `createPortal`, completely eliminating clipping from parent overflows.
4. **Semantic Hover Motion:** Each navigation icon triggers a role-appropriate micro-interaction (e.g. slight bounce for notifications, smooth rotation for settings).
5. **Direct Navigation Architecture:** Replaces monolithic tab states with 9 dedicated clean URLs for HR operations (`/hr/overview`, `/hr/courses`, `/hr/employees`, etc.).

---

## 6. Editorial Learning Operations Dashboard Direction

### 6.1 Layout Anatomy
- **Header Strip:** Time-based greeting, contextual operational subtitle, and primary action buttons.
- **KPI Summary Strip:** Compact, carefully aligned metric cards with purposeful labels and micro status tags.
- **Primary Working Area:** High-density, actionable tables (e.g. Manager Team Report, HR Department Analytics) rather than a wall of decorative graphs.
- **Drilldown Portals:** Glassmorphic detail drawers that lock body scroll and dismiss on `Escape`.

---

## 7. Universal Assigned Learning Carousel

### 7.1 Visual & Responsive Rules
- **Course Card Layout:** Modern 16:9 banner preview with fallback brand asset, course ID badge, title, duration pill, and progress meter.
- **Empty State:** Restrained ice-blue glass panel with clear guidance when zero courses are assigned.
- **Single Card Centering:** Centers single-item carousels without stretching or blank gaps.
- **Reduced Motion:** Fully honors `@media (prefers-reduced-motion: reduce)` by disabling sliding transitions and switching to instant step pagination.

---

## 8. Learning & Compliance Calendar Specification

### 8.1 Multi-View Architecture
- **Month View:** 7-column calendar grid displaying up to 3 events per day with overflow badges (`+N more`).
- **Week View:** Hourly or daytime time-column view for live training workshops.
- **Agenda View:** Compact chronologically sorted list view optimized for mobile and quick skimming.

### 8.2 Event Category Tagging
- **Live Sessions:** Fairmacs Blue (`#0F6CBD` on `#EFF6FF`).
- **Course Deadlines:** Indigo / Purple (`#4F46E5` on `#EEF2FF`).
- **Policy Acknowledgements:** Amber (`#D97706` on `#FFFBEB`).
- **Assessments / Quizzes:** Emerald (`#16A34A` on `#F0FDF4`).

---

## 9. Dynamic PDF Watermark Visual Standards

To guarantee intellectual property security without degrading document readability:

- **Watermark Text Template:**  
  `PROPERTY OF FAIRMACS SHIPPING & LOGISTICS — CONFIDENTIAL — <EMPLOYEE_NAME> — <TIMESTAMP>`
- **Rotation Angle:** Exactly `-35.0` degrees across the page diagonal.
- **Font & Sizing:** Clean sans-serif (Helvetica / Inter), scaled between `10pt` and `14pt` based on page dimensions.
- **Opacity:** Restrained `12%` opacity (`rgba(15, 23, 42, 0.12)`) ensuring underlying text and tables remain 100% legible.
- **Non-Clipping Geometry:** Boundary math calculates diagonal extent against page width/height, guaranteeing zero character clipping on Letter, A4, portrait, or landscape orientations.

---

## 10. Core UI Component Library

### 10.1 Action Buttons
- **Primary:** Background `#0284C7`, text `#FFFFFF`, radius `8px`, weight `650`, box-shadow `0 2px 4px rgba(2, 132, 199, 0.25)`.
- **Secondary:** Background `#F1F5F9`, border `1px solid #E2E8F0`, text `#334155`.
- **Destructive:** Background `#FEF2F2`, border `1px solid #FECACA`, text `#DC2626`.

### 10.2 Progress Tracks
- Height: `6px` or `8px`, border-radius `9999px`.
- Track background: `#E2E8F0` (light gray).
- Fill gradient: Matches status threshold (`#16A34A` for $\ge 90\%$, `#0F6CBD` for $50\text{--}89\%$, `#DC2626` for $<50\%$).

---

## 11. Accessibility (a11y) & Contrast Standards

1. **WCAG AAA Contrast:** Navy body text (`#0F172A`) against canvas (`#FFFFFF`) exceeds **16:1**.
2. **Visible Focus Rings:** All buttons, interactive rows, and form controls exhibit a `2px` focus outline with a `2px` offset.
3. **Screen Reader Semantic Roles:** Modals enforce `role="dialog"`, `aria-modal="true"`, and label references via `aria-labelledby`.
4. **Keyboard Trap Prevention:** Modal dialogs intercept `Tab` navigation to circulate focus within the active overlay until dismissed.
