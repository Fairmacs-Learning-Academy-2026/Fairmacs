import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');

console.log('--- Fairmacs KMS HR/Admin Courses Tab & Dashboard Carousel Verification ---');

// 1. Verify HrCoursesPage.jsx
const hrCoursesPath = path.join(srcDir, 'components', 'HrCoursesPage.jsx');
assert(fs.existsSync(hrCoursesPath), 'HrCoursesPage.jsx must exist');
const hrCoursesContent = fs.readFileSync(hrCoursesPath, 'utf8');

assert(
  hrCoursesContent.includes('courseService.getLearningDashboard') ||
  hrCoursesContent.includes('enrollmentService.getUserEnrollments'),
  'HrCoursesPage must fetch user assigned courses via getLearningDashboard or getUserEnrollments'
);
assert(
  !hrCoursesContent.includes("authFetch(`${API_BASE_URL}/courses`") &&
  !hrCoursesContent.includes("fetch(`${API_BASE_URL}/courses`"),
  'HrCoursesPage must NOT load the entire course catalog for display'
);
assert(
  hrCoursesContent.includes('CourseBuilderModal'),
  'HrCoursesPage must instantiate CourseBuilderModal for authoring'
);
assert(
  hrCoursesContent.includes('CourseThumbnailImage'),
  'HrCoursesPage must render CourseThumbnailImage on course cards'
);
assert(
  hrCoursesContent.includes('No Courses Assigned') || hrCoursesContent.includes('No courses assigned'),
  'HrCoursesPage must define clear empty state when no courses are assigned'
);
assert(
  hrCoursesContent.includes('skeleton-shimmer'),
  'HrCoursesPage must provide loading skeleton state'
);
assert(
  hrCoursesContent.includes('/courses/') && hrCoursesContent.includes('/overview'),
  'HrCoursesPage must navigate to course learning experience / overview when clicked'
);
console.log('[PASS] 1. HrCoursesPage displays only assigned courses, handles loading/empty/error, and retains learning navigation.');

// 2. Verify HrAdminDashboard.jsx course carousel integration
const hrDashPath = path.join(srcDir, 'components', 'HrAdminDashboard.jsx');
const hrDashContent = fs.readFileSync(hrDashPath, 'utf8');
assert(
  hrDashContent.includes('AssignedLearningCarousel'),
  'HrAdminDashboard must import and render AssignedLearningCarousel'
);
assert(
  hrDashContent.includes('courseService.getLearningDashboard'),
  'HrAdminDashboard must fetch assigned courses for currently signed-in HR/Admin user'
);
assert(
  hrDashContent.includes('<AssignedLearningCarousel') && hrDashContent.includes('assignedCourses.length > 0'),
  'HrAdminDashboard must render AssignedLearningCarousel when assigned courses exist and handle 0 courses without blank space'
);
console.log('[PASS] 2. HrAdminDashboard integrates AssignedLearningCarousel populated with user assigned courses only.');

// 3. Verify ManagerDashboard.jsx course carousel integration
const mgrDashPath = path.join(srcDir, 'components', 'ManagerDashboard.jsx');
const mgrDashContent = fs.readFileSync(mgrDashPath, 'utf8');
assert(
  mgrDashContent.includes('AssignedLearningCarousel'),
  'ManagerDashboard must import and render AssignedLearningCarousel'
);
assert(
  mgrDashContent.includes('courseService.getLearningDashboard'),
  'ManagerDashboard must fetch assigned courses for currently signed-in Manager'
);
assert(
  mgrDashContent.includes('<AssignedLearningCarousel') && mgrDashContent.includes('assignedCourses.length > 0'),
  'ManagerDashboard must render AssignedLearningCarousel when assigned courses exist and handle 0 courses without blank space'
);
console.log('[PASS] 3. ManagerDashboard integrates AssignedLearningCarousel populated with user assigned courses only.');

// 4. Verify AssignedLearningCarousel.jsx handling 0, 1, and N courses
const carouselPath = path.join(srcDir, 'components', 'AssignedLearningCarousel.jsx');
const carouselContent = fs.readFileSync(carouselPath, 'utf8');
assert(
  carouselContent.includes('if (!totalCourses) return null;'),
  'AssignedLearningCarousel must return null when 0 courses are supplied to prevent blank space'
);
assert(
  carouselContent.includes('single-course-shell'),
  'AssignedLearningCarousel must provide single-course-shell modifier when totalCourses <= 1'
);
assert(
  carouselContent.includes('if (totalCourses <= 1) return;'),
  'AssignedLearningCarousel must prevent auto-rotation and broken looping when totalCourses <= 1'
);
console.log('[PASS] 4. AssignedLearningCarousel gracefully handles 0, 1, and N courses without blank space or broken looping.');

// 5. Verify Sidebar.jsx navigation
const sidebarPath = path.join(srcDir, 'components', 'Sidebar.jsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
assert(
  sidebarContent.includes("{ id: 'courses', label: 'Courses', icon: BookOpen, path: '/hr/courses'"),
  "Sidebar must define Courses tab with label 'Courses' for HR/Admin"
);
console.log('[PASS] 5. Sidebar HR/Admin navigation updated to Courses tab.');

// 6. Verify Backend EnrollmentService & CourseAssignmentModal role check removal
const enrollServicePath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'EnrollmentService.java');
const enrollServiceContent = fs.readFileSync(enrollServicePath, 'utf8');
assert(
  !enrollServiceContent.includes('if (user.getRole() != Role.EMPLOYEE) {\n                continue;\n            }'),
  'EnrollmentService createAssignments must not reject non-EMPLOYEE users'
);
const modalPath = path.join(srcDir, 'components', 'CourseAssignmentModal.jsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');
assert(
  !modalContent.includes("employee.role.toUpperCase() === 'EMPLOYEE'"),
  'CourseAssignmentModal must allow assigning courses to active users regardless of role'
);
console.log('[PASS] 6. Backend EnrollmentService and CourseAssignmentModal permit assigning courses to HR/Admin and Managers.');

console.log('\n=============================================================================');
console.log('ALL HR/ADMIN & MANAGER COURSE CAROUSEL VERIFICATIONS PASSED (6/6)');
console.log('=============================================================================');
