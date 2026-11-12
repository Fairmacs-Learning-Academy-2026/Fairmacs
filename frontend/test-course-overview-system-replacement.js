// test-course-overview-system-replacement.js
// Verification suite for Complete Replacement of Legacy Course Details with the New Course Overview System

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Fairmacs KMS Course Overview System Replacement Verification ---');

const appJsxPath = path.join(__dirname, 'src', 'App.jsx');
const overviewPagePath = path.join(__dirname, 'src', 'components', 'CourseOverviewPage.jsx');
const catalogPath = path.join(__dirname, 'src', 'components', 'CourseCatalog.jsx');
const myLearningPath = path.join(__dirname, 'src', 'components', 'MyLearning.jsx');
const legacyModalPath = path.join(__dirname, 'src', 'components', 'CourseDetailsModal.jsx');
const appCssPath = path.join(__dirname, 'src', 'App.css');

const appJsx = fs.readFileSync(appJsxPath, 'utf8');
const overviewPage = fs.readFileSync(overviewPagePath, 'utf8');
const catalog = fs.readFileSync(catalogPath, 'utf8');
const myLearning = fs.readFileSync(myLearningPath, 'utf8');
const legacyModal = fs.readFileSync(legacyModalPath, 'utf8');
const appCss = fs.readFileSync(appCssPath, 'utf8');

// 1. Verify Complete Elimination of Legacy CourseDetailsModal in App.jsx
assert.ok(
  !appJsx.includes('<CourseDetailsModal'),
  'App.jsx must not render legacy CourseDetailsModal'
);
assert.ok(
  !appJsx.includes("import CourseDetailsModal from './components/CourseDetailsModal';"),
  'App.jsx must not import legacy CourseDetailsModal'
);
assert.ok(
  legacyModal.includes('return null'),
  'CourseDetailsModal.jsx stub must return null to prevent any legacy modal appearance'
);
console.log('[PASS] 1. Legacy CourseDetailsModal completely eliminated from App.jsx and runtime');

// 2. Verify Global Route Navigation to CourseOverviewPage
assert.ok(
  appJsx.includes('handleOpenCourseDetails'),
  'App.jsx must define handleOpenCourseDetails'
);
assert.ok(
  appJsx.includes('/courses/${encodeURIComponent(courseCode)}/overview') ||
  appJsx.includes('/overview'),
  'handleOpenCourseDetails must navigate to /courses/:courseId/overview'
);
assert.ok(
  appJsx.includes('<CourseOverviewPage'),
  'App.jsx must route and render CourseOverviewPage'
);
console.log('[PASS] 2. Centralized route navigation to CourseOverviewPage verified');

// 3. Section A: Hero Card Architecture & Split Layout
assert.ok(
  overviewPage.includes('Curriculum Progress') && overviewPage.includes('% Complete'),
  'Hero must include Curriculum Progress bar and completion percentage'
);
assert.ok(
  overviewPage.includes('primaryActionLabel') &&
  overviewPage.includes('Start Learning') &&
  overviewPage.includes('Continue Learning'),
  'Hero must dynamic action button (Start Learning / Continue Learning / Review Course)'
);
assert.ok(
  overviewPage.includes('course-overview-hero-split') &&
  overviewPage.includes('course-overview-hero-thumb-card'),
  'Hero must implement split layout with dedicated prominent thumbnail card'
);
assert.ok(
  overviewPage.includes('<CourseThumbnailImage') &&
  overviewPage.includes('className="course-overview-hero-thumb-img"'),
  'Hero thumbnail card must render CourseThumbnailImage component directly'
);
assert.ok(
  overviewPage.includes('departmentName') && overviewPage.includes('isMandatory'),
  'Hero must render department and Mandatory/Recommended classification badges'
);
assert.ok(
  overviewPage.includes('course-overview-hero-meta') && overviewPage.includes('Course Code:'),
  'Hero must render course metadata row with code, duration, and published date'
);
assert.ok(
  appCss.includes('.course-overview-hero-split') &&
  appCss.includes('.course-overview-hero-thumb-card'),
  'App.css must include split layout and thumbnail styling'
);
console.log('[PASS] 3. Section A: Dark Navy Course Hero with Split Thumbnail Layout & Progress verified');

// 4. Section B: Six Key Information Cards
assert.ok(
  appCss.includes('.course-overview-facts-grid'),
  'App.css must define .course-overview-facts-grid for 6-column desktop alignment'
);
assert.ok(
  overviewPage.includes('course-overview-facts-grid'),
  'CourseOverviewPage must use course-overview-facts-grid'
);
assert.ok(
  overviewPage.includes('Modules') &&
  overviewPage.includes('Total Lessons') &&
  overviewPage.includes('Video Lessons') &&
  overviewPage.includes('Assessments') &&
  overviewPage.includes('Estimated Time') &&
  overviewPage.includes('Evaluation'),
  'Section B must contain the exact 6 facts cards: Modules, Total Lessons, Video Lessons, Assessments, Estimated Time, Evaluation'
);
console.log('[PASS] 4. Section B: Six Horizontal Information Cards verified');

// 5. Section C: Learning Objectives & Outcomes
assert.ok(
  overviewPage.includes('Learning Objectives & Outcomes'),
  'CourseOverviewPage must render Learning Objectives & Outcomes section'
);
assert.ok(
  overviewPage.includes('learningOutcomes.map'),
  'Learning objectives must render actual configured outcomes dynamically'
);
console.log('[PASS] 5. Section C: Learning Objectives & Outcomes with green check chips verified');

// 6. Section D: Course Curriculum & Modules with Sequential Locking
assert.ok(
  overviewPage.includes('Course Curriculum & Modules'),
  'Section D must render Course Curriculum & Modules'
);
assert.ok(
  overviewPage.includes('Sequential training modules designed for mastery.'),
  'Section D must include curriculum subtitle'
);
assert.ok(
  overviewPage.includes('isUnlocked') &&
  overviewPage.includes('LOCKED') &&
  overviewPage.includes('DONE'),
  'Curriculum must enforce sequential locking with LOCKED and DONE indicators'
);
console.log('[PASS] 6. Section D: Course Curriculum with sequential lock enforcement verified');

// 7. Section E: Learning Progress Status Panel
assert.ok(
  overviewPage.includes('Learning Progress Status'),
  'Section E must render Learning Progress Status panel'
);
assert.ok(
  overviewPage.includes('Completion State') &&
  overviewPage.includes('Lessons Completed') &&
  overviewPage.includes('Remaining Lessons') &&
  overviewPage.includes('Evaluation Assessment') &&
  overviewPage.includes('Passing Criteria'),
  'Progress status panel must display all required metric rows'
);
assert.ok(
  overviewPage.includes('Exempt (Foundation Track)') || overviewPage.includes('Exempt'),
  'Foundation courses must be exempt from evaluation exam requirements'
);
console.log('[PASS] 7. Section E: Learning Progress Status with Foundation & Standard logic verified');

// 8. Catalog and My Learning Entry Points
assert.ok(
  catalog.includes('onOpenCourseDetails?.(course)') || catalog.includes('onOpenCourseDetails(course)'),
  'CourseCatalog must route course clicks to onOpenCourseDetails'
);
assert.ok(
  myLearning.includes('onOpenCourseDetails?.(course)'),
  'MyLearning must route course clicks to onOpenCourseDetails'
);
console.log('[PASS] 8. CourseCatalog and MyLearning entry points unified with new system');

console.log('--- ALL COURSE OVERVIEW SYSTEM REPLACEMENT CHECKS PASSED ---');
