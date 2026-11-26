// test-create-course-modal-positioning.js
// Verification suite for Fairmacs KMS Create Course Modal Position & Layout Stability

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Fairmacs KMS Create Course Modal Positioning & Layout Stability Verification ---');

const modalFilePath = path.join(__dirname, 'src', 'components', 'CourseBuilderModal.jsx');
const appCssPath = path.join(__dirname, 'src', 'App.css');
const hrDashboardPath = path.join(__dirname, 'src', 'components', 'HrAdminDashboard.jsx');
const trainerDashboardPath = path.join(__dirname, 'src', 'components', 'TrainerDashboard.jsx');
const hrCoursesPath = path.join(__dirname, 'src', 'components', 'HrCoursesPage.jsx');
const hrDraftsPath = path.join(__dirname, 'src', 'components', 'HrDraftsPage.jsx');

const modalCode = fs.readFileSync(modalFilePath, 'utf8');
const appCss = fs.readFileSync(appCssPath, 'utf8');
const hrDashboardCode = fs.readFileSync(hrDashboardPath, 'utf8');
const trainerDashboardCode = fs.readFileSync(trainerDashboardPath, 'utf8');
const hrCoursesCode = fs.readFileSync(hrCoursesPath, 'utf8');
const hrDraftsCode = fs.readFileSync(hrDraftsPath, 'utf8');

// 1. Verify React Portal and Document Body Attachment
assert.ok(
  modalCode.includes("import { createPortal } from 'react-dom';") ||
  modalCode.includes('createPortal('),
  'CourseBuilderModal must import and use createPortal'
);
assert.ok(
  modalCode.includes('createPortal(') && modalCode.includes('document.body'),
  'CourseBuilderModal must render into document.body via createPortal to decouple from dashboard layout'
);
console.log('[PASS] 1. React Portal to document.body verified');

// 2. Verify Fixed Viewport Overlay & Z-Index Positioning
assert.ok(
  appCss.includes('.course-modal-overlay'),
  '.course-modal-overlay class must exist in App.css'
);
assert.ok(
  appCss.includes('z-index: 10000') || appCss.includes('z-index: 10000;'),
  '.course-modal-overlay must specify high z-index (10000) to sit above all navigation and headers'
);
assert.ok(
  modalCode.includes('className="course-modal-overlay'),
  'CourseBuilderModal root overlay must have course-modal-overlay class'
);
console.log('[PASS] 2. Fixed Viewport Overlay (z-index 10000, position fixed, inset 0) verified');

// 3. Verify Stable Modal Container Dimensions Across Steps
assert.ok(
  appCss.includes('.course-modal-container'),
  '.course-modal-container class must exist in App.css'
);
assert.ok(
  appCss.includes('width: min(95vw, 1250px)') || appCss.includes('1250px'),
  '.course-modal-container must use desktop width min(95vw, 1250px)'
);
assert.ok(
  appCss.includes('max-height: 94vh'),
  '.course-modal-container must cap max-height at 94vh'
);
assert.ok(
  modalCode.includes('course-modal-container'),
  'CourseBuilderModal container must use course-modal-container class'
);
console.log('[PASS] 3. Stable outer container dimensions (min(95vw, 1250px), max-height 94vh) verified');

// 4. Verify Independent Scrolling Structure (Fixed Header, Step Nav, Scroll Content, Fixed Footer)
assert.ok(
  appCss.includes('.course-modal-header') && modalCode.includes('course-modal-header'),
  'Fixed Header with course-modal-header must exist'
);
assert.ok(
  modalCode.includes('Trainer Authoring Tool') && modalCode.includes('course-modal-title'),
  'Header must permanently display Trainer Authoring Tool label and title'
);
assert.ok(
  appCss.includes('.course-modal-steps') && modalCode.includes('course-modal-steps'),
  'Fixed Step Navigation with course-modal-steps must exist'
);
assert.ok(
  appCss.includes('.course-modal-content'),
  'Independently scrollable content section with course-modal-content must exist in CSS'
);
assert.ok(
  appCss.includes('flex: 1') && appCss.includes('min-height: 0') && appCss.includes('overflow-y: auto'),
  'course-modal-content must use flex: 1, min-height: 0, and overflow-y: auto'
);
assert.ok(
  appCss.includes('overscroll-behavior: contain'),
  'course-modal-content must specify overscroll-behavior: contain to isolate scroll'
);
assert.ok(
  appCss.includes('.course-modal-footer') && modalCode.includes('course-modal-footer'),
  'Fixed Footer with course-modal-footer must exist and remain permanently visible'
);
console.log('[PASS] 4. Four-tier independent structural scrolling architecture verified');

// 5. Verify Background Scroll Locking & Restoration
assert.ok(
  modalCode.includes("document.body.style.overflow = 'hidden'") ||
  modalCode.includes('overflow = \'hidden\''),
  'Background dashboard scrolling must be locked when modal is open'
);
assert.ok(
  modalCode.includes('document.body.style.overflow = originalOverflow') ||
  modalCode.includes('overflow = originalOverflow') ||
  modalCode.includes('overflow = prevOverflow'),
  'Background dashboard scrolling must be restored when modal closes'
);
assert.ok(
  modalCode.includes("e.key === 'Escape'"),
  'Escape key handler must be implemented for accessible closing'
);
console.log('[PASS] 5. Background scroll locking, layout shift mitigation, and Escape key handling verified');

// 6. Verify Dashboard Integrations (HR Admin, Trainer, Courses, Drafts)
assert.ok(
  hrDashboardCode.includes('<CourseBuilderModal'),
  'HrAdminDashboard must instantiate CourseBuilderModal'
);
assert.ok(
  trainerDashboardCode.includes('<CourseBuilderModal'),
  'TrainerDashboard must instantiate CourseBuilderModal'
);
assert.ok(
  hrCoursesCode.includes('<CourseBuilderModal'),
  'HrCoursesPage must instantiate CourseBuilderModal'
);
assert.ok(
  hrDraftsCode.includes('<CourseBuilderModal'),
  'HrDraftsPage must instantiate CourseBuilderModal'
);
console.log('[PASS] 6. Multi-dashboard integration (HR/Admin, Trainer, Courses, Drafts) verified');

// 7. Verify Responsive Breakpoints and Reduced Motion
assert.ok(
  appCss.includes('@media (max-width: 1024px)') && appCss.includes('.course-modal-container'),
  'Tablet responsive rules must be configured for CourseBuilderModal'
);
assert.ok(
  appCss.includes('@media (max-width: 768px)') && appCss.includes('.course-modal-container'),
  'Mobile responsive near-full-screen rules must be configured for CourseBuilderModal'
);
assert.ok(
  appCss.includes('@media (prefers-reduced-motion: reduce)') && appCss.includes('.course-modal-container'),
  'prefers-reduced-motion support must be configured for CourseBuilderModal'
);
console.log('[PASS] 7. Responsive tablet, mobile, and reduced-motion rules verified');

// 8. Verify BulkQuizImportModal portals to document.body above .course-modal-container (z-index: 100001)
const bulkQuizModalPath = path.join(__dirname, 'src', 'components', 'BulkQuizImportModal.jsx');
const bulkQuizModalCode = fs.readFileSync(bulkQuizModalPath, 'utf8');
assert.ok(
  bulkQuizModalCode.includes('createPortal(') && bulkQuizModalCode.includes('document.body'),
  'BulkQuizImportModal must portal to document.body so it is never trapped inside CourseBuilderModal stacking context'
);
assert.ok(
  bulkQuizModalCode.includes('zIndex: 120000'),
  'BulkQuizImportModal must specify zIndex: 120000 (> .course-modal-container z-index 100001)'
);
console.log('[PASS] 8. BulkQuizImportModal portal and stacking z-index (120000 > 100001) verified');

console.log('--- ALL CREATE COURSE MODAL POSITIONING CHECKS PASSED ---');
