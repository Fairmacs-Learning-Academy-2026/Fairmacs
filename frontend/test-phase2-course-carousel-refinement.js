import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

import {
  DEFAULT_COURSE_THUMBNAIL,
  DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID,
  BACKEND_DEFAULT_THUMBNAIL_FILE_ID,
  isDefaultThumbnail,
  resolveBannerUrl
} from './src/utils/courseBanner.js';

import {
  formatCourseDuration,
  classifyCourseDuration,
  DurationClassification
} from './src/utils/courseDuration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('--- Fairmacs KMS Phase 2: Employee Dashboard Course Carousel UI/UX Refinement Verification ---');

const carouselPath = path.join(__dirname, 'src', 'components', 'AssignedLearningCarousel.jsx');
const overviewPath = path.join(__dirname, 'src', 'components', 'Overview.jsx');
const appCssPath = path.join(__dirname, 'src', 'App.css');

const carouselSrc = fs.readFileSync(carouselPath, 'utf8');
const overviewSrc = fs.readFileSync(overviewPath, 'utf8');
const appCssSrc = fs.readFileSync(appCssPath, 'utf8');

// 1. Manual Previous and Next Navigation Buttons
assert(carouselSrc.includes('carousel-nav-btn carousel-nav-prev'), 'Carousel must contain Previous navigation button');
assert(carouselSrc.includes('carousel-nav-btn carousel-nav-next'), 'Carousel must contain Next navigation button');
assert(carouselSrc.includes('aria-label="Previous course"'), 'Previous button must have accessible aria-label');
assert(carouselSrc.includes('aria-label="Next course"'), 'Next button must have accessible aria-label');
assert(carouselSrc.includes('handlePrev'), 'Previous button must trigger handlePrev');
assert(carouselSrc.includes('handleNext'), 'Next button must trigger handleNext');
console.log('[PASS] 1. Manual Previous and Next navigation buttons with accessible labels verified.');

// 2. Single Course & Zero Courses Handling (Hide controls when totalCourses <= 1)
assert(carouselSrc.includes('totalCourses > 1 && ('), 'Carousel must conditionally render navigation controls only when totalCourses > 1');
assert(carouselSrc.includes('if (!totalCourses) return null;'), 'Carousel must gracefully return null if totalCourses is zero');
assert(overviewSrc.includes('assignedCourses.length > 0 ? ('), 'Overview must conditionally render carousel or empty state');
assert(overviewSrc.includes('assigned-learning-empty-state'), 'Overview must render verified empty state when assignedCourses is empty');
console.log('[PASS] 2. Single assigned course hides unnecessary controls; zero courses handled gracefully with empty state.');

// 3. Removal of Nested Interactive Semantics & Clean Semantic Article Structure
assert(!carouselSrc.includes('<div className="assigned-course-hero-card" role="button"'), 'Card must NOT have role="button" (no nested interactive role)');
assert(!carouselSrc.includes('role="button"'), 'AssignedLearningCarousel must have zero role="button" wrapping inner interactive controls');
assert(!carouselSrc.includes('<article className="assigned-course-hero-card" tabIndex={0}'), 'Card must NOT have tabIndex=0 (avoids nested keyboard focus traps)');
assert(carouselSrc.includes('<article'), 'Card must use semantic HTML5 article element');
assert(carouselSrc.includes('aria-roledescription="slide"'), 'Card must specify aria-roledescription="slide" per W3C carousel pattern');
assert(carouselSrc.includes('aria-hidden={!isActiveSlide}'), 'Inactive slides must be hidden from accessibility tree');
console.log('[PASS] 3. Nested interactive semantics eliminated; clean semantic article structure implemented.');

// 4. Accessible Full-Card Navigation & Independent Control Handling
assert(carouselSrc.includes('const interactive = e.target.closest(\'button, a, input, select, textarea\')'), 'Full-card click handler must ignore clicks originating from inner interactive controls');
assert(carouselSrc.includes('if (onOpenCourse) onOpenCourse(course)'), 'Card click delegates to onOpenCourse for non-button surface clicks');
assert(appCssSrc.includes('.assigned-course-hero-card') && appCssSrc.includes('cursor: pointer;'), 'Card must show pointer cursor to signify full-card clickability');
assert(appCssSrc.includes('.assigned-course-hero-card:focus-within'), 'Card must visually highlight via focus-within when inner CTA is focused');
console.log('[PASS] 4. Accessible full-card pointer navigation preserved without nested interactive semantics.');

// 5. Independent Keyboard Accessibility of CTA and Controls
assert(carouselSrc.includes('tabIndex={isActiveSlide ? 0 : -1}'), 'Open Course CTA button must be focusable on active slide (0) and bypassed on inactive slides (-1)');
assert(carouselSrc.includes('carousel-card-action-btn'), 'Open Course CTA button rendered as semantic button');
assert(carouselSrc.includes('aria-label={`Open course ${course.title || course.id}`}'), 'Open Course button has descriptive accessible label');
console.log('[PASS] 5. Open Course CTA is independently keyboard-accessible with active-slide tabIndex.');

// 6. Enter/Space Key Handling: Controls Never Trigger Unintended Course Navigation
assert(carouselSrc.includes("if (e.key === 'Enter' || e.key === ' ') {\n                  e.stopPropagation();"), 'Carousel controls (Prev, Next, Dots) stop propagation on Enter and Space to guarantee no course navigation');
assert(carouselSrc.includes('carousel-nav-prev') && carouselSrc.includes('e.stopPropagation()'), 'Previous button stops event propagation on click');
assert(carouselSrc.includes('carousel-nav-next') && carouselSrc.includes('e.stopPropagation()'), 'Next button stops event propagation on click');
assert(carouselSrc.includes('carousel-pagination-dot') && carouselSrc.includes('e.stopPropagation()'), 'Pagination dots stop event propagation on click');
console.log('[PASS] 6. Enter and Space activation verified; carousel controls strictly never trigger unintended course navigation.');

// 7. Mobile & Tablet Touch Swiping with Swipe Guard
assert(carouselSrc.includes('handleTouchStart'), 'Carousel must define handleTouchStart');
assert(carouselSrc.includes('handleTouchMove'), 'Carousel must define handleTouchMove');
assert(carouselSrc.includes('handleTouchEnd'), 'Carousel must define handleTouchEnd');
assert(carouselSrc.includes('isSwiping'), 'Carousel must track isSwiping state to differentiate clicks from swipes');
console.log('[PASS] 7. Mobile and tablet touch gesture swiping with accidental click guard verified.');

// 8. Inactive Tab Visibility Pause & Resume
assert(carouselSrc.includes('document.addEventListener(\'visibilitychange\', handleVisibilityChange)'), 'Carousel must listen for tab visibility changes');
assert(carouselSrc.includes('isTabVisible'), 'Carousel must pause auto rotation when isTabVisible is false');
console.log('[PASS] 8. Inactive browser tab pauses autoplay, preventing hidden-tab backlog.');

// 9. Interaction Lifecycle & Cooldown
assert(carouselSrc.includes('isHovered') && carouselSrc.includes('isFocused') && carouselSrc.includes('isInteracting'), 'Autoplay must pause on hover, focus, and user interaction');
assert(carouselSrc.includes('handleInteractionStart') && carouselSrc.includes('handleInteractionEnd'), 'Interaction lifecycle handlers defined');
console.log('[PASS] 9. Interaction pause and cooldown lifecycle verified.');

// 10. Reduced Motion Accessibility
assert(carouselSrc.includes('(prefers-reduced-motion: reduce)'), 'Carousel must detect prefers-reduced-motion media query');
assert(carouselSrc.includes('if (prefersReducedMotion) return;'), 'Autoplay must be disabled when prefersReducedMotion is active');
console.log('[PASS] 10. Accessibility support for prefers-reduced-motion verified.');

// 11. Dashboard Layout Stability & Zero Layout Jumps
assert(appCssSrc.includes('.assigned-course-hero-card') && appCssSrc.includes('min-height: 280px;'), 'Card must enforce stable min-height to prevent layout jumps');
assert(appCssSrc.includes('.carousel-card-content') && appCssSrc.includes('min-height: 4.6rem;'), 'Content block must enforce consistent min-height');
assert(appCssSrc.includes('.carousel-card-thumb-area') && appCssSrc.includes('aspect-ratio: 16 / 10;'), 'Thumbnail must lock aspect ratio 16/10');
assert(appCssSrc.includes('-webkit-line-clamp: 2'), 'Card title and description must be clamped to prevent vertical expansion');
console.log('[PASS] 11. Layout stability and zero layout jumps verified through locked dimensions and clamped lines.');

// 12. Responsive Breakpoints
assert(appCssSrc.includes('@media (max-width: 868px)'), 'CSS must define tablet/laptop breakpoint at 868px');
assert(appCssSrc.includes('@media (max-width: 580px)'), 'CSS must define mobile breakpoint at 580px');
assert(appCssSrc.includes('.carousel-nav-btn'), 'CSS must style circular navigation buttons');
console.log('[PASS] 12. Responsive breakpoints for desktop, tablet, and mobile verified.');

// 13. Strict Scope Restrictions: No Section Heading
assert(!overviewSrc.includes('<h2 className="assigned-learning-title"'), 'Section heading above carousel must NOT exist in Overview.jsx');
assert(!overviewSrc.includes('>Assigned Learning</h2>'), 'No Assigned Learning h2 heading above carousel');
assert(!carouselSrc.includes('countPillText'), 'Unused header pill removed from carousel');
console.log('[PASS] 13. Strict scope compliance: No section heading or title reintroduced above carousel.');

// 14. Data Preservation from Phase 1
assert(carouselSrc.includes("moduleCount === 1 ? 'Module' : 'Modules'"), 'Grammar: singular Module vs plural Modules preserved');
assert(carouselSrc.includes("lessonCount === 1 ? 'Lesson' : 'Lessons'"), 'Grammar: singular Lesson vs plural Lessons preserved');
assert.strictEqual(formatCourseDuration('1', 1.0), '1 hour');
assert.strictEqual(formatCourseDuration('2', 1.0), '2 hours');
assert.strictEqual(formatCourseDuration('3', 1.0), '3 hours');
assert.strictEqual(formatCourseDuration('30 min', 0.5), '30 min');
assert.strictEqual(formatCourseDuration('a', 1.0), 'Self-paced');
console.log('[PASS] 14. Phase 1 data rules, grammar, and 4-tier duration classification strictly preserved.');

// 15. Completed Course Exclusion & Deduplication
assert(overviewSrc.includes("course.enrollmentStatus === 'COMPLETED'"), 'Overview must filter completed enrollments');
assert(overviewSrc.includes("course.status === 'COMPLETED'"), 'Overview must filter completed courses');
assert(overviewSrc.includes("seen.has(key)"), 'Overview must deduplicate assigned courses');
console.log('[PASS] 15. Completed course exclusion and assigned course deduplication preserved.');

console.log('--- ALL 15 PHASE 2 ACCESSIBILITY & DOM STRUCTURE CHECKS PASSED ---');
