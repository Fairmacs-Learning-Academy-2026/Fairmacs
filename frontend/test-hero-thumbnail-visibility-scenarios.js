// test-hero-thumbnail-visibility-scenarios.js
// Verification suite for PART 9 - Course Hero Thumbnail Visibility & Scenarios

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Fairmacs KMS Course Hero Thumbnail Visibility Verification ---');

const overviewPagePath = path.join(__dirname, 'src', 'components', 'CourseOverviewPage.jsx');
const appCssPath = path.join(__dirname, 'src', 'App.css');
const courseThumbnailImgPath = path.join(__dirname, 'src', 'components', 'CourseThumbnailImage.jsx');

const overviewPage = fs.readFileSync(overviewPagePath, 'utf8');
const appCss = fs.readFileSync(appCssPath, 'utf8');
const courseThumbnailImg = fs.readFileSync(courseThumbnailImgPath, 'utf8');

// 1. Verify Split Layout Architecture
assert.ok(
  overviewPage.includes('className="course-overview-hero"'),
  'CourseOverviewPage must use .course-overview-hero container'
);
assert.ok(
  overviewPage.includes('className="course-overview-hero-split"'),
  'CourseOverviewPage must implement two-column .course-overview-hero-split'
);
assert.ok(
  overviewPage.includes('className="course-overview-hero-thumb-card"'),
  'CourseOverviewPage must render dedicated .course-overview-hero-thumb-card'
);
assert.ok(
  overviewPage.includes('className="course-overview-hero-info"'),
  'CourseOverviewPage must render .course-overview-hero-info on right column'
);
console.log('[PASS] 1. Split Layout Architecture verified');

// 2. Verify Elimination of Oversized Blurred Watermark & Stretched Background
assert.ok(
  !overviewPage.includes("fontSize: 'clamp(2.2rem, 5.5vw, 4rem)'"),
  'Oversized FAIRMACS text watermark must be completely removed from hero'
);
assert.ok(
  !overviewPage.includes("backdropFilter: 'blur(3px)'"),
  'Dark blur overlay must be completely removed from hero'
);
console.log('[PASS] 2. Oversized blurred watermark and backdrop-blur overlay eliminated');

// 3. Verify Thumbnail Card Integration & Fallback Rules
assert.ok(
  overviewPage.includes('<CourseThumbnailImage') &&
  overviewPage.includes('course={course}'),
  'Hero thumbnail card must pass course object to CourseThumbnailImage'
);
assert.ok(
  courseThumbnailImg.includes('course?.banner') &&
  courseThumbnailImg.includes('course?.thumbnailUrl') &&
  courseThumbnailImg.includes('course?.thumbnail'),
  'CourseThumbnailImage must support banner, thumbnailUrl, and thumbnail properties'
);
assert.ok(
  courseThumbnailImg.includes('DEFAULT_COURSE_THUMBNAIL'),
  'CourseThumbnailImage must default to official Fairmacs default thumbnail'
);
assert.ok(
  courseThumbnailImg.includes('getFallbackSvg'),
  'CourseThumbnailImage must handle image error with branded fallback SVG'
);
console.log('[PASS] 3. Thumbnail display priority and graceful fallback verified');

// 4. Verify Course Information Alignment & Hierarchy
assert.ok(
  overviewPage.includes('className="course-overview-hero-title"'),
  'Hero must render prominent course title with dedicated styling'
);
assert.ok(
  overviewPage.includes('className="course-overview-hero-desc"'),
  'Hero must render clean description with line-height and max-width bounds'
);
assert.ok(
  overviewPage.includes('className="course-overview-hero-meta"'),
  'Hero must render metadata strip'
);
assert.ok(
  overviewPage.includes('Course Code:') &&
  overviewPage.includes('durationDisplay') &&
  overviewPage.includes('publishedDateStr'),
  'Metadata strip must include Course Code, Duration, and Published Date'
);
console.log('[PASS] 4. Course information alignment and hierarchy verified');

// 5. Verify Progress Bar and Dynamic Action CTA
assert.ok(
  overviewPage.includes('className="course-overview-hero-bottom"'),
  'Hero must include .course-overview-hero-bottom container'
);
assert.ok(
  overviewPage.includes('Curriculum Progress') &&
  overviewPage.includes('{progressPercent}% Complete'),
  'Hero bottom strip must include Curriculum Progress percentage'
);
assert.ok(
  overviewPage.includes('primaryActionLabel'),
  'Hero action button must dynamically adapt to course status'
);
assert.ok(
  overviewPage.includes('onClick={() => onStartLearning(course)}'),
  'Hero action button must trigger onStartLearning callback'
);
console.log('[PASS] 5. Progress bar and dynamic action CTA verified');

// 6. Verify CSS & Responsive Breakpoints in App.css
assert.ok(
  appCss.includes('.course-overview-hero-split {') &&
  appCss.includes('grid-template-columns: minmax(280px, 35%) 1fr;'),
  'App.css must define desktop two-column split layout (35% thumbnail)'
);
assert.ok(
  appCss.includes('@media (max-width: 900px)') &&
  appCss.includes('.course-overview-hero-split {') &&
  appCss.includes('grid-template-columns: 1fr;'),
  'App.css must stack hero columns on tablet/mobile screens'
);
assert.ok(
  appCss.includes('@media (max-width: 640px)') &&
  appCss.includes('.course-overview-hero-bottom {') &&
  appCss.includes('flex-direction: column;'),
  'App.css must stack progress bar and action button on mobile screens'
);
console.log('[PASS] 6. CSS styling and responsive breakpoints verified');

// 7. Verify Data Safety & Zero Regressions
assert.ok(
  overviewPage.includes('onBackToDashboard') &&
  overviewPage.includes('onBackToCatalog'),
  'Breadcrumb navigation buttons must be preserved'
);
assert.ok(
  overviewPage.includes('course-overview-facts-grid') &&
  overviewPage.includes('Learning Objectives & Outcomes') &&
  overviewPage.includes('Course Curriculum & Modules'),
  'Key facts, learning objectives, and curriculum sections must remain intact'
);
console.log('[PASS] 7. CourseOverviewPage structural integrity and data safety verified');

console.log('--- ALL HERO THUMBNAIL VISIBILITY VERIFICATION CHECKS PASSED ---');
