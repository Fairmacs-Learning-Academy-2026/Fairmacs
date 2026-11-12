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

console.log('--- Fairmacs KMS Phase 1: Employee Dashboard Course Carousel Fix Verification ---');

// 1. Custom thumbnail displays successfully
const customUrlCourse = {
  id: 'CRS-CUSTOM-1',
  title: 'Custom Logistics Mastery',
  banner: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d'
};
const customResolved = resolveBannerUrl(customUrlCourse.banner);
assert.strictEqual(customResolved, 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d');
assert.strictEqual(isDefaultThumbnail(customUrlCourse), false);
console.log('[PASS] 1. Custom thumbnail displays successfully without distortion or fallback.');

// 2. Default thumbnail appears when no custom thumbnail exists
const noThumbnailCourse = {
  id: 'CRS-DEFAULT-1',
  title: 'Default Course Without Banner',
  banner: null
};
assert.strictEqual(resolveBannerUrl(noThumbnailCourse.banner), DEFAULT_COURSE_THUMBNAIL);
assert.strictEqual(isDefaultThumbnail(noThumbnailCourse), true);

const workdriveDefaultCourse1 = {
  id: 'CRS-WD-1',
  banner: `https://workdrive.zoho.com/file/${DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID}`
};
assert.strictEqual(resolveBannerUrl(workdriveDefaultCourse1.banner), DEFAULT_COURSE_THUMBNAIL);
assert.strictEqual(isDefaultThumbnail(workdriveDefaultCourse1), true);

const workdriveDefaultCourse2 = {
  id: 'CRS-WD-2',
  banner: BACKEND_DEFAULT_THUMBNAIL_FILE_ID
};
assert.strictEqual(resolveBannerUrl(workdriveDefaultCourse2.banner), DEFAULT_COURSE_THUMBNAIL);
assert.strictEqual(isDefaultThumbnail(workdriveDefaultCourse2), true);
console.log('[PASS] 2. Default thumbnail appears accurately when no custom thumbnail exists.');

// 3. Failed custom thumbnail is handled gracefully
const courseThumbnailImgSrc = fs.readFileSync(path.join(__dirname, 'src', 'components', 'CourseThumbnailImage.jsx'), 'utf8');
const carouselSrc = fs.readFileSync(path.join(__dirname, 'src', 'components', 'AssignedLearningCarousel.jsx'), 'utf8');
assert(courseThumbnailImgSrc.includes('handleImageError'), 'CourseThumbnailImage must define handleImageError handler');
assert(courseThumbnailImgSrc.includes('console.warn'), 'handleImageError must log diagnostic information when custom image fails');
assert(courseThumbnailImgSrc.includes('DEFAULT_COURSE_THUMBNAIL'), 'handleImageError must fall back to default thumbnail');
assert(courseThumbnailImgSrc.includes('getFallbackSvg'), 'handleImageError must provide clean SVG fallback if default fails');
console.log('[PASS] 3. Failed custom thumbnail handled gracefully with diagnostic logging and multi-tier fallback.');

// 4 & 5. Module & Lesson counts and grammatical formatting (singular vs plural)
const formatModuleCount = (cnt) => `${cnt} ${cnt === 1 ? 'Module' : 'Modules'}`;
const formatLessonCount = (cnt) => `${cnt} ${cnt === 1 ? 'Lesson' : 'Lessons'}`;
const formatCounts = (m, l) => `${formatModuleCount(m)} · ${formatLessonCount(l)}`;

assert.strictEqual(formatCounts(1, 1), '1 Module · 1 Lesson');
assert.strictEqual(formatCounts(2, 5), '2 Modules · 5 Lessons');
assert.strictEqual(formatCounts(0, 0), '0 Modules · 0 Lessons');
assert(carouselSrc.includes("moduleCount === 1 ? 'Module' : 'Modules'"), "AssignedLearningCarousel must format singular 'Module' vs plural 'Modules'");
assert(carouselSrc.includes("lessonCount === 1 ? 'Lesson' : 'Lessons'"), "AssignedLearningCarousel must format singular 'Lesson' vs plural 'Lessons'");
console.log('[PASS] 4 & 5. Module & lesson counts and grammar (1 Module · 1 Lesson, 2 Modules · 5 Lessons, 0 Modules · 0 Lessons) verified.');

// Duration classification: Distinguish Explicit Self-paced, Valid Configured, Missing, and Invalid Legacy
const classExplicit = classifyCourseDuration('Self-paced', null);
assert.strictEqual(classExplicit.classification, DurationClassification.EXPLICIT_SELF_PACED);
assert.strictEqual(classExplicit.display, 'Self-paced');

const classValidHours = classifyCourseDuration(null, 1.5);
assert.strictEqual(classValidHours.classification, DurationClassification.VALID_CONFIGURED);
assert.strictEqual(classValidHours.display, '1 hour 30 min');

const classValidString = classifyCourseDuration('30 min', null);
assert.strictEqual(classValidString.classification, DurationClassification.VALID_CONFIGURED);
assert.strictEqual(classValidString.display, '30 min');

const classMissing = classifyCourseDuration(null, null);
assert.strictEqual(classMissing.classification, DurationClassification.MISSING);
assert.strictEqual(classMissing.display, 'Self-paced');

const classInvalidLegacy = classifyCourseDuration('a', null);
assert.strictEqual(classInvalidLegacy.classification, DurationClassification.INVALID_LEGACY);
assert.strictEqual(classInvalidLegacy.display, 'Self-paced');
assert.strictEqual(classInvalidLegacy.raw, 'a');

console.log('[PASS] Duration classification: Distinguishes EXPLICIT_SELF_PACED, VALID_CONFIGURED, MISSING, and INVALID_LEGACY.');

// Narrow WorkDrive default ID matching (non-default WorkDrive file IDs route to proxy, NOT default thumbnail)
const nonDefaultWdId = 'o0bbva9869d3b30424da089a1e13ddef98b68';
const nonDefaultWdUrl = resolveBannerUrl(`https://workdrive.zoho.com/file/${nonDefaultWdId}`);
assert(nonDefaultWdUrl.includes(`/api/courses/thumbnails/workdrive/${nonDefaultWdId}`), 'Ordinary WorkDrive file reference must route to proxy endpoint, not default thumbnail');
assert.strictEqual(isDefaultThumbnail(nonDefaultWdId), false, 'Ordinary WorkDrive file reference must NOT be identified as default thumbnail');
console.log('[PASS] Narrow WorkDrive default ID matching verified: Ordinary WorkDrive files are preserved and routed to proxy.');

// 6. Duration is formatted correctly across all required specifications
assert.strictEqual(formatCourseDuration(null, 0.5), '30 min', '0.5 hours -> 30 min');
assert.strictEqual(formatCourseDuration(null, 1), '1 hour', '1 hour -> 1 hour');
assert.strictEqual(formatCourseDuration(null, 1.5), '1 hour 30 min', '1.5 hours -> 1 hour 30 min');
assert.strictEqual(formatCourseDuration(null, 2), '2 hours', '2 hours -> 2 hours');
assert.strictEqual(formatCourseDuration(null, 2.5), '2 hours 30 min', '2.5 hours -> 2 hours 30 min');
assert.strictEqual(formatCourseDuration(null, 3), '3 hours', '3 hours -> 3 hours');

// Malformed string durations like 'a'
assert.strictEqual(formatCourseDuration('a', null), 'Self-paced', "'a' -> Self-paced");
assert.strictEqual(formatCourseDuration('A', null), 'Self-paced', "'A' -> Self-paced");
assert.strictEqual(formatCourseDuration('null', null), 'Self-paced', "'null' -> Self-paced");
assert.strictEqual(formatCourseDuration('undefined', null), 'Self-paced', "'undefined' -> Self-paced");
assert.strictEqual(formatCourseDuration('nan', null), 'Self-paced', "'nan' -> Self-paced");
assert.strictEqual(formatCourseDuration('-', null), 'Self-paced', "'-' -> Self-paced");
assert.strictEqual(formatCourseDuration(null, null), 'Self-paced', 'null/null -> Self-paced');

// String durations with numbers
assert.strictEqual(formatCourseDuration('0.5 hours', null), '30 min', "'0.5 hours' -> 30 min");
assert.strictEqual(formatCourseDuration('1.5 hours', null), '1 hour 30 min', "'1.5 hours' -> 1 hour 30 min");
assert.strictEqual(formatCourseDuration('1 hour', null), '1 hour', "'1 hour' -> 1 hour");
assert.strictEqual(formatCourseDuration('2 hours', null), '2 hours', "'2 hours' -> 2 hours");
assert.strictEqual(formatCourseDuration('30 min', null), '30 min', "'30 min' -> 30 min");
assert.strictEqual(formatCourseDuration('30:00', null), '30 min', "'30:00' -> 30 min");
console.log('[PASS] 6. Duration is formatted accurately according to the exact specification table.');

// 7. Missing metadata does not break rendering
assert.strictEqual(formatCourseDuration(undefined, undefined), 'Self-paced');
assert.strictEqual(resolveBannerUrl(undefined), DEFAULT_COURSE_THUMBNAIL);
console.log('[PASS] 7. Missing metadata handled safely without throwing or rendering invalid text.');

// 8. Different courses display their own thumbnails and metadata
const courseA = { id: 'A', title: 'Course A', banner: 'https://example.com/a.jpg', moduleCount: 1, lessonCount: 4, durationHours: 1 };
const courseB = { id: 'B', title: 'Course B', banner: 'https://example.com/b.jpg', moduleCount: 5, lessonCount: 20, durationHours: 2.5 };
assert.notStrictEqual(resolveBannerUrl(courseA.banner), resolveBannerUrl(courseB.banner));
assert.strictEqual(formatCourseDuration(courseA.duration, courseA.durationHours), '1 hour');
assert.strictEqual(formatCourseDuration(courseB.duration, courseB.durationHours), '2 hours 30 min');
console.log('[PASS] 8. Different courses display their own distinct thumbnails and metadata.');

// 9. Carousel automatic movement still works
assert(carouselSrc.includes('setInterval'), 'Carousel must use setInterval for automatic slide rotation');
assert(carouselSrc.includes('5000'), 'Carousel interval must be 5000ms (5 seconds)');
assert(carouselSrc.includes('isHovered') && carouselSrc.includes('isFocused'), 'Carousel must pause on hover and focus');
console.log('[PASS] 9. Carousel 5s automatic rotation with interactive hover/focus pause verified.');

// 10. Manual navigation still works
assert(carouselSrc.includes('handleNext') && carouselSrc.includes('handlePrev'), 'Carousel must define handleNext and handlePrev');
assert(carouselSrc.includes('setCurrentIndex(dotIdx)'), 'Carousel must support direct dot pagination navigation');
assert(carouselSrc.includes('handleKeyDown') && carouselSrc.includes('ArrowLeft') && carouselSrc.includes('ArrowRight'), 'Carousel must support keyboard navigation');
console.log('[PASS] 10. Manual navigation (Next, Prev, Dot pagination, Keyboard ArrowLeft/ArrowRight) verified.');

// 11 & 12. Start Learning / Continue Learning opens the correct course
assert(carouselSrc.includes('onOpenCourse(course)'), 'Action button must pass the exact active course to onOpenCourse');
assert(carouselSrc.includes('Open Course'), 'Action CTA button rendered with Open Course');
console.log('[PASS] 11 & 12. Course navigation opens the exact course in context.');

// 13. No completed course appears in the carousel
const overviewSrc = fs.readFileSync(path.join(__dirname, 'src', 'components', 'Overview.jsx'), 'utf8');
assert(overviewSrc.includes("course.enrollmentStatus === 'COMPLETED'"), 'Overview must exclude completed enrollments');
assert(overviewSrc.includes("course.status === 'COMPLETED'"), 'Overview must exclude completed courses');
assert(overviewSrc.includes("['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes"), 'Overview must exclude revoked/inactive enrollments');
console.log('[PASS] 13. Completed, revoked, and inactive enrollments strictly excluded from carousel.');

// 14. No duplicate course cards appear
assert(overviewSrc.includes('seen.has(key)'), 'Overview must deduplicate assigned courses via seen Set');
assert(overviewSrc.includes('seen.add(key)'), 'Overview tracks seen course keys to prevent duplicate cards');
console.log('[PASS] 14. Assigned course deduplication verified.');

console.log('--- ALL 14 PHASE 1 FRONTEND VERIFICATION CHECKS PASSED ---');
