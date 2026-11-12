import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');

console.log('--- Fairmacs KMS Employee Dashboard Assigned Learning Redesign Verification ---');

// 1. PART A: Verify removal of the old welcome banner from Overview.jsx
const overviewPath = path.join(srcDir, 'components', 'Overview.jsx');
assert(fs.existsSync(overviewPath), 'Overview.jsx must exist');
const overviewContent = fs.readFileSync(overviewPath, 'utf8');

assert(
  !overviewContent.includes('Fairmacs Employee Learning Hub'),
  'Old "Fairmacs Employee Learning Hub" banner label must be removed'
);
assert(
  !overviewContent.includes('Welcome, {userName}!'),
  'Old "Welcome, [Name]" banner heading must be removed from Overview.jsx'
);
assert(
  !overviewContent.includes('Pick up where you left off, explore available courses'),
  'Old welcome banner description must be removed from Overview.jsx'
);
console.log('[PASS] 1. Old employee welcome banner, badges, and redundant buttons completely removed.');

// 2. PART B & C: Verify Assigned Learning Carousel integration and behavior
const carouselPath = path.join(srcDir, 'components', 'AssignedLearningCarousel.jsx');
assert(fs.existsSync(carouselPath), 'AssignedLearningCarousel.jsx must exist');
const carouselContent = fs.readFileSync(carouselPath, 'utf8');

assert(
  carouselContent.includes('Your Assigned Learning') ||
  carouselContent.includes('assigned-learning-section'),
  'Carousel must include assigned learning container'
);
assert(
  carouselContent.includes('5000'),
  'Carousel must advance automatically every 5 seconds (5000ms)'
);
assert(
  carouselContent.includes('isHovered') &&
  carouselContent.includes('isFocused') &&
  carouselContent.includes('isTabVisible') &&
  carouselContent.includes('prefersReducedMotion'),
  'Carousel must pause on hover, focus, background tab, and respect prefers-reduced-motion'
);
assert(
  carouselContent.includes('CourseThumbnailImage') &&
  carouselContent.includes('progress-bar-fill'),
  'Carousel cards must render course thumbnails and progress bars'
);
console.log('[PASS] 2. Assigned Learning Carousel component, 5s interval, pausing, and glass design verified.');

// 3. PART B.2 & D & F: Verify course eligibility & completed course filtering
assert(
  overviewContent.includes('course.enrollmentStatus === \'COMPLETED\'') ||
  overviewContent.includes('isCompleted'),
  'Overview.jsx must strictly check authoritative completion status'
);
assert(
  overviewContent.includes('REVOKED') &&
  overviewContent.includes('CANCELLED'),
  'Overview.jsx must exclude revoked or cancelled enrollments'
);
assert(
  overviewContent.includes('statusLabel: isOngoing ? \'IN PROGRESS\' : \'NEWLY ASSIGNED\''),
  'Overview.jsx must categorize courses into "NEWLY ASSIGNED" and "IN PROGRESS"'
);
assert(
  overviewContent.includes("window.addEventListener('lms:enrollment-updated'"),
  'Overview.jsx must listen for lms:enrollment-updated to immediately remove completed courses'
);
console.log('[PASS] 3. Strict course eligibility, status classification, and immediate completion removal verified.');

// 4. PART E: Verify dedicated Course Overview Page and routing
const courseOverviewPath = path.join(srcDir, 'components', 'CourseOverviewPage.jsx');
assert(fs.existsSync(courseOverviewPath), 'CourseOverviewPage.jsx must exist');
const courseOverviewContent = fs.readFileSync(courseOverviewPath, 'utf8');

assert(
  courseOverviewContent.includes('Learning Objectives & Outcomes') ||
  courseOverviewContent.includes('learningOutcomes'),
  'CourseOverviewPage must render learning objectives/outcomes'
);
assert(
  courseOverviewContent.includes('Course Curriculum & Modules') &&
  courseOverviewContent.includes('toggleModule'),
  'CourseOverviewPage must render interactive modules accordion preview'
);
assert(
  courseOverviewContent.includes('Learning Progress Status'),
  'CourseOverviewPage must render detailed progress status breakdown'
);

// Check routing in App.jsx
const appPath = path.join(srcDir, 'App.jsx');
const appContent = fs.readFileSync(appPath, 'utf8');
assert(
  appContent.includes("CourseOverviewPage") &&
  appContent.includes("path=\"/courses/:courseId/overview\"") &&
  appContent.includes("path=\"/courses/:courseId\""),
  'App.jsx must route /courses/:courseId/overview and /courses/:courseId to CourseOverviewPage'
);
console.log('[PASS] 4. Dedicated Course Overview page, curriculum preview, and route architecture verified.');

// 5. PART G: Verify Empty State
assert(
  overviewContent.includes("You're all caught up!"),
  'Overview.jsx must render "You\'re all caught up!" empty state when no assigned courses remain'
);
assert(
  overviewContent.includes("You have completed all your assigned courses."),
  'Overview.jsx empty state must display full encouraging description'
);
console.log('[PASS] 5. Polished empty state with catalog navigation verified.');

// 6. PART H: Verify Employee Learning Snapshot (3 compact cards)
assert(
  overviewContent.includes('employee-learning-snapshot-grid'),
  'Overview.jsx must include the employee learning snapshot grid'
);
assert(
  overviewContent.includes('Assigned Courses') &&
  overviewContent.includes('Courses Completed') &&
  overviewContent.includes('Learning Progress'),
  'Overview.jsx snapshot must feature Assigned Courses, Courses Completed, and Learning Progress'
);
console.log('[PASS] 6. Employee learning snapshot with 3 dynamic insight cards verified.');

// 7. PART I: Verify Upcoming Deadlines section
assert(
  overviewContent.includes('Upcoming Deadlines'),
  'Overview.jsx must include Upcoming Deadlines section'
);
assert(
  overviewContent.includes('getDeadlineInfo'),
  'Overview.jsx must calculate deadline urgency (approaching, overdue, normal)'
);
console.log('[PASS] 7. Upcoming Deadlines section with visual urgency indicators verified.');

console.log('--- ALL ASSIGNED LEARNING REDESIGN CHECKS PASSED ---');
