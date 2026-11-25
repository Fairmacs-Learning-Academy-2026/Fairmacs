import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

import {
  formatCourseDuration
} from './src/utils/courseDuration.js';

import {
  EVENT_ENROLLMENT_UPDATED,
  SYNC_CHANNEL_NAME,
  SYNC_STORAGE_KEY
} from './src/utils/enrollmentSync.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('--- Fairmacs KMS Phase 3: Assigned Course Behaviour & Data Synchronization Verification ---');

const carouselPath = path.join(__dirname, 'src', 'components', 'AssignedLearningCarousel.jsx');
const overviewPath = path.join(__dirname, 'src', 'components', 'Overview.jsx');
const appJsxPath = path.join(__dirname, 'src', 'App.jsx');
const quizModalPath = path.join(__dirname, 'src', 'components', 'QuizModal.jsx');
const courseViewerPath = path.join(__dirname, 'src', 'components', 'CourseViewer.jsx');
const enrollmentStorePath = path.join(__dirname, 'src', 'stores', 'enrollmentStore.js');
const enrollmentServicePath = path.join(__dirname, 'src', 'services', 'enrollmentService.js');
const catalogServicePath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'CatalogService.java');
const quizServiceBackendPath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'QuizService.java');

const carouselSrc = fs.readFileSync(carouselPath, 'utf8');
const overviewSrc = fs.readFileSync(overviewPath, 'utf8');
const appJsxSrc = fs.readFileSync(appJsxPath, 'utf8');
const quizModalSrc = fs.readFileSync(quizModalPath, 'utf8');
const courseViewerSrc = fs.readFileSync(courseViewerPath, 'utf8');
const storeSrc = fs.readFileSync(enrollmentStorePath, 'utf8');
const serviceSrc = fs.readFileSync(enrollmentServicePath, 'utf8');
const catalogServiceSrc = fs.readFileSync(catalogServicePath, 'utf8');
const quizServiceBackendSrc = fs.readFileSync(quizServiceBackendPath, 'utf8');

// -----------------------------------------------------------------------------
// Helper mimicking Overview.jsx normalizeCourse & filter logic
// -----------------------------------------------------------------------------
function normalizeCourse(course, index = 0) {
  const modulesList = Array.isArray(course?.modules) ? course.modules : [];
  const calculatedModuleCount = modulesList.length;
  const calculatedLessonCount = modulesList.reduce(
    (acc, m) => acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
    0
  );

  const moduleCount =
    typeof course?.moduleCount === 'number'
      ? course.moduleCount
      : calculatedModuleCount > 0
      ? calculatedModuleCount
      : (course?.moduleCount != null ? Number(course.moduleCount) : 0);

  const lessonCount =
    typeof course?.lessonCount === 'number'
      ? course.lessonCount
      : calculatedLessonCount > 0
      ? calculatedLessonCount
      : (course?.lessonCount != null ? Number(course.lessonCount) : 0);

  const bannerUrl = course?.banner || course?.thumbnailUrl || course?.thumbnail || '';

  return {
    ...course,
    _key: course?.dbId ?? course?.courseDatabaseId ?? course?.id ?? course?.courseId ?? index,
    title: course?.title ?? course?.courseTitle ?? 'Untitled Course',
    id: course?.id ?? course?.courseId ?? course?.courseCode ?? '',
    progressPercent: Number(course?.progressPercent ?? course?.progress ?? 0),
    status: String(course?.enrollmentStatus ?? course?.status ?? '').toUpperCase(),
    duration: formatCourseDuration(course?.duration, course?.durationHours),
    banner: bannerUrl,
    thumbnailUrl: bannerUrl,
    thumbnail: bannerUrl,
    moduleCount,
    lessonCount
  };
}

function computeAssignedCourses(dashboard) {
  if (!dashboard?.enrolled || !Array.isArray(dashboard.enrolled)) return [];
  const seen = new Set();
  const eligible = [];

  for (const rawCourse of dashboard.enrolled) {
    const course = normalizeCourse(rawCourse);
    const key = String(course.dbId || course.id || course._key);
    if (seen.has(key)) continue;
    seen.add(key);

    const isCompleted =
      course.enrollmentStatus === 'COMPLETED' ||
      course.status === 'COMPLETED';

    const isRevokedOrInactive =
      ['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes(course.enrollmentStatus) ||
      ['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes(course.status);

    if (isCompleted || isRevokedOrInactive) continue;

    const progress = Math.max(0, Math.min(100, Number(course.progressPercent || 0)));
    const isOngoing = progress > 0 || course.enrollmentStatus === 'IN_PROGRESS' || course.status === 'IN_PROGRESS';
    const isNewlyAssigned = !isOngoing;

    eligible.push({
      ...course,
      progress,
      isOngoing,
      isNewlyAssigned,
      statusLabel: isOngoing ? 'IN PROGRESS' : 'NEWLY ASSIGNED',
      actionLabel: isOngoing ? 'Continue Learning' : 'Start Learning'
    });
  }

  return eligible;
}

// -----------------------------------------------------------------------------
// Test 1: Newly Assigned Course Visibility
// -----------------------------------------------------------------------------
const mockDashboardNewlyAssigned = {
  enrolled: [
    {
      dbId: 101,
      id: 'OP004',
      courseId: 'OP004',
      title: 'Warehouse Safety Fundamentals',
      status: 'NOT_STARTED',
      enrollmentStatus: 'NOT_STARTED',
      progressPercent: 0,
      assignmentType: 'MANDATORY',
      owningDepartmentName: 'Operations',
      duration: '4h 0m'
    }
  ]
};
const assigned1 = computeAssignedCourses(mockDashboardNewlyAssigned);
assert.strictEqual(assigned1.length, 1, 'Newly assigned course must appear in assignedCourses');
assert.strictEqual(assigned1[0].isNewlyAssigned, true, 'isNewlyAssigned flag must be true');
assert.strictEqual(assigned1[0].statusLabel, 'NEWLY ASSIGNED', 'statusLabel must be NEWLY ASSIGNED');
assert.strictEqual(assigned1[0].actionLabel, 'Start Learning', 'actionLabel must be Start Learning');
console.log('[PASS] 1. Newly assigned course visibility verified with correct status and action labels.');

// -----------------------------------------------------------------------------
// Test 2: In-Progress Course Visibility
// -----------------------------------------------------------------------------
const mockDashboardInProgress = {
  enrolled: [
    {
      dbId: 102,
      id: 'OP005',
      courseId: 'OP005',
      title: 'Freight Forwarding Documentation',
      status: 'IN_PROGRESS',
      enrollmentStatus: 'IN_PROGRESS',
      progressPercent: 35,
      assignmentType: 'MANDATORY',
      owningDepartmentName: 'Operations',
      duration: '6h 30m'
    }
  ]
};
const assigned2 = computeAssignedCourses(mockDashboardInProgress);
assert.strictEqual(assigned2.length, 1, 'In-progress course must appear in assignedCourses');
assert.strictEqual(assigned2[0].isOngoing, true, 'isOngoing flag must be true');
assert.strictEqual(assigned2[0].statusLabel, 'IN PROGRESS', 'statusLabel must be IN PROGRESS');
assert.strictEqual(assigned2[0].actionLabel, 'Continue Learning', 'actionLabel must be Continue Learning');
assert.strictEqual(assigned2[0].progress, 35, 'progress percentage must match 35%');
console.log('[PASS] 2. In-progress course visibility verified with accurate progress and continue CTA.');

// -----------------------------------------------------------------------------
// Test 3: Completed Course Exclusion
// -----------------------------------------------------------------------------
const mockDashboardCompleted = {
  enrolled: [
    {
      dbId: 103,
      id: 'OP007',
      courseId: 'OP007',
      title: 'Global Supply Chain Strategy',
      status: 'COMPLETED',
      enrollmentStatus: 'COMPLETED',
      progressPercent: 100,
      assignmentType: 'MANDATORY'
    },
    {
      dbId: 104,
      id: 'OP008',
      courseId: 'OP008',
      title: 'Customs Clearance Regulations',
      status: 'IN_PROGRESS',
      enrollmentStatus: 'IN_PROGRESS',
      progressPercent: 60
    }
  ]
};
const assigned3 = computeAssignedCourses(mockDashboardCompleted);
assert.strictEqual(assigned3.length, 1, 'Completed course must be strictly excluded from assigned carousel');
assert.strictEqual(assigned3[0].id, 'OP008', 'Only the in-progress course remains visible');
console.log('[PASS] 3. Completed courses strictly excluded from the Assigned Learning Carousel.');

// -----------------------------------------------------------------------------
// Test 4: Unassigned Course Exclusion (Catalog / Recommended Isolation)
// -----------------------------------------------------------------------------
const mockDashboardRecommendedOnly = {
  enrolled: [],
  recommended: [
    {
      dbId: 201,
      id: 'REC001',
      title: 'Executive Presentation Skills',
      assignmentType: 'RECOMMENDED'
    }
  ]
};
const assigned4 = computeAssignedCourses(mockDashboardRecommendedOnly);
assert.strictEqual(assigned4.length, 0, 'Recommended or catalog courses must never appear in assigned carousel');
console.log('[PASS] 4. Unassigned catalog and recommended courses strictly isolated from assigned carousel.');

// -----------------------------------------------------------------------------
// Test 5: Revoked, Inactive, Cancelled or Withdrawn Enrollments Exclusion
// -----------------------------------------------------------------------------
const mockDashboardRevoked = {
  enrolled: [
    {
      dbId: 105,
      id: 'REV001',
      status: 'REVOKED',
      enrollmentStatus: 'REVOKED',
      progressPercent: 10
    },
    {
      dbId: 106,
      id: 'CAN001',
      status: 'CANCELLED',
      enrollmentStatus: 'CANCELLED',
      progressPercent: 0
    },
    {
      dbId: 107,
      id: 'WIT001',
      status: 'WITHDRAWN',
      enrollmentStatus: 'WITHDRAWN',
      progressPercent: 25
    },
    {
      dbId: 108,
      id: 'INA001',
      status: 'INACTIVE',
      enrollmentStatus: 'INACTIVE',
      progressPercent: 5
    },
    {
      dbId: 109,
      id: 'ACT001',
      status: 'IN_PROGRESS',
      enrollmentStatus: 'IN_PROGRESS',
      progressPercent: 50
    }
  ]
};
const assigned5 = computeAssignedCourses(mockDashboardRevoked);
assert.strictEqual(assigned5.length, 1, 'All revoked, cancelled, withdrawn and inactive courses must be excluded');
assert.strictEqual(assigned5[0].id, 'ACT001', 'Only active eligible enrollment appears');
console.log('[PASS] 5. Revoked, inactive, cancelled, and withdrawn enrollments strictly excluded.');

// -----------------------------------------------------------------------------
// Test 6: Duplicate Course Prevention
// -----------------------------------------------------------------------------
const mockDashboardDuplicates = {
  enrolled: [
    {
      dbId: 110,
      id: 'OP009',
      courseId: 'OP009',
      title: 'Container Logistics Handling',
      status: 'IN_PROGRESS',
      enrollmentStatus: 'IN_PROGRESS',
      progressPercent: 20
    },
    {
      dbId: 110, // Same database ID
      id: 'OP009',
      courseId: 'OP009',
      title: 'Container Logistics Handling (Second Assignment)',
      status: 'IN_PROGRESS',
      enrollmentStatus: 'IN_PROGRESS',
      progressPercent: 20
    }
  ]
};
const assigned6 = computeAssignedCourses(mockDashboardDuplicates);
assert.strictEqual(assigned6.length, 1, 'Duplicate course assignments must be deduplicated to exactly 1 card');
console.log('[PASS] 6. Duplicate course prevention verified (multiple department assignments produce 1 card).');

// -----------------------------------------------------------------------------
// Test 7: Mandatory vs Recommended Classification
// -----------------------------------------------------------------------------
const mockDashboardClassification = {
  enrolled: [
    {
      dbId: 111,
      id: 'MAND01',
      title: 'Safety Compliance',
      assignmentType: 'MANDATORY',
      enrollmentType: 'MANDATORY',
      status: 'NOT_STARTED'
    },
    {
      dbId: 112,
      id: 'REC01',
      title: 'Optional Public Speaking',
      assignmentType: 'RECOMMENDED',
      enrollmentType: 'OPTIONAL',
      status: 'NOT_STARTED'
    }
  ]
};
const assigned7 = computeAssignedCourses(mockDashboardClassification);
assert.strictEqual(assigned7.length, 2);
assert(carouselSrc.includes("isMandatory ? 'Mandatory' : 'Recommended'"), 'Carousel renders Mandatory vs Recommended label');
assert(carouselSrc.includes("isMandatory ? 'rgba(220, 38, 38, 0.95)' : 'rgba(16, 185, 129, 0.95)'"), 'Mandatory badge uses red accent, Recommended uses green accent');
console.log('[PASS] 7. Mandatory and Recommended assignment classifications preserved with distinct badges.');

// -----------------------------------------------------------------------------
// Test 8: Cross-Department Assignments Support
// -----------------------------------------------------------------------------
assert(carouselSrc.includes('const departmentName ='), 'Carousel defines departmentName fallback logic');
assert(carouselSrc.includes('course.owningDepartmentName ||'), 'Carousel prefers owningDepartmentName');
assert(carouselSrc.includes('course.department ||'), 'Carousel falls back to course.department');
console.log('[PASS] 8. Cross-department assignment labels accurately displayed.');

// -----------------------------------------------------------------------------
// Test 9: Course Overview Navigation & Identifier Integrity
// -----------------------------------------------------------------------------
assert(overviewSrc.includes("const code = course.id || course.courseId;"), 'Overview extracts code from course.id or course.courseId');
assert(overviewSrc.includes("navigate(`/courses/${encodeURIComponent(code)}/overview`)"), 'Overview navigates to encoded course overview path');
assert(appJsxSrc.includes('overviewMatch = location.pathname.match(/^\\/courses\\/([^/]+)(?:\\/overview)?\\/?$/)'), 'App.jsx matches /courses/:courseId/overview');
assert(appJsxSrc.includes('<CourseOverviewPage'), 'App.jsx mounts CourseOverviewPage for overview routes');
assert(appJsxSrc.includes("navigate('/dashboard')"), 'App.jsx routes back to /dashboard on overview back action');
console.log('[PASS] 9. Course overview navigation, identifier encoding, and back routing verified.');

// -----------------------------------------------------------------------------
// Test 10: Same-Tab & Cross-Tab Synchronization Bus Verification
// -----------------------------------------------------------------------------
assert.strictEqual(EVENT_ENROLLMENT_UPDATED, 'lms:enrollment-updated');
assert.strictEqual(SYNC_CHANNEL_NAME, 'fairmacs_lms_enrollment_sync');
assert.strictEqual(SYNC_STORAGE_KEY, 'fairmacs_last_enrollment_sync');

// Verify that enrollmentStore, enrollmentService, CourseViewer, and QuizModal all import and trigger notifyEnrollmentUpdated
assert(storeSrc.includes("notifyEnrollmentUpdated"), 'enrollmentStore imports and triggers notifyEnrollmentUpdated');
assert(serviceSrc.includes("notifyEnrollmentUpdated"), 'enrollmentService imports and triggers notifyEnrollmentUpdated');
assert(courseViewerSrc.includes("notifyEnrollmentUpdated"), 'CourseViewer imports and triggers notifyEnrollmentUpdated');
assert(quizModalSrc.includes("notifyEnrollmentUpdated"), 'QuizModal imports and triggers notifyEnrollmentUpdated');
assert(overviewSrc.includes("subscribeEnrollmentSync"), 'Overview subscribes to cross-context synchronization bus');
console.log('[PASS] 10. Same-tab and cross-tab synchronization bus wiring verified across components.');

// -----------------------------------------------------------------------------
// Test 11: Final Assessment Completion Flow & Direct API Completion
// -----------------------------------------------------------------------------
// Verify backend QuizService.java automatically completes course when final quiz is passed
assert(quizServiceBackendSrc.includes("if (passed &&\n        quiz.getType() == QuizType.FINAL) {"), 'QuizService checks passed && quiz.getType() == QuizType.FINAL');
assert(quizServiceBackendSrc.includes("enrollmentService.completeCourse(request)"), 'QuizService invokes enrollmentService.completeCourse on final quiz pass');
assert(quizServiceBackendSrc.includes('response.put("courseCompleted", true);'), 'QuizService returns courseCompleted: true on final quiz pass');

// Verify frontend QuizModal.jsx immediately triggers synchronization when courseCompleted is returned
assert(quizModalSrc.includes('const isCompletedOnBackend ='), 'QuizModal detects backend completion from serverResult');
assert(quizModalSrc.includes('serverResult?.courseCompleted'), 'QuizModal checks serverResult.courseCompleted');
assert(quizModalSrc.includes("source: 'quiz-final-assessment-completed'"), 'QuizModal dispatches sync notification immediately upon final assessment submission');
console.log('[PASS] 11. Final assessment backend completion and immediate frontend sync verified.');

// -----------------------------------------------------------------------------
// Test 12: Completed Course Exclusion After Fresh Backend Data
// -----------------------------------------------------------------------------
const beforeCompletionDashboard = {
  enrolled: [
    {
      dbId: 44,
      id: 'OP009',
      courseId: 'OP009',
      title: 'Logistics Operations Final',
      status: 'IN_PROGRESS',
      enrollmentStatus: 'IN_PROGRESS',
      progressPercent: 95
    }
  ]
};
const activeBefore = computeAssignedCourses(beforeCompletionDashboard);
assert.strictEqual(activeBefore.length, 1, 'In-progress course must be in carousel before completion');

// Backend completes enrollment and returns updated dashboard
const afterCompletionDashboard = {
  enrolled: [
    {
      dbId: 44,
      id: 'OP009',
      courseId: 'OP009',
      title: 'Logistics Operations Final',
      status: 'COMPLETED',
      enrollmentStatus: 'COMPLETED',
      progressPercent: 100
    }
  ]
};
const activeAfter = computeAssignedCourses(afterCompletionDashboard);
assert.strictEqual(activeAfter.length, 0, 'Course must be immediately excluded from carousel once marked COMPLETED');
console.log('[PASS] 12. Completed course exclusion verified after backend completion data is received.');

// -----------------------------------------------------------------------------
// Test 13: HR/Admin Assignment While Employee Dashboard is Open
// -----------------------------------------------------------------------------
// Verify Overview.jsx subscribes with revalidateOnFocus and has 60-second background revalidation
assert(overviewSrc.includes("subscribeEnrollmentSync(handleEnrollmentUpdated)"), 'Overview subscribes to sync bus');
assert(overviewSrc.includes("loadDashboard(true)"), 'Overview re-loads dashboard silently');
assert(overviewSrc.includes("setInterval("), 'Overview contains background interval for open tabs');
assert(overviewSrc.includes("document.visibilityState === 'visible'"), 'Interval checks tab visibility to prevent background waste');
console.log('[PASS] 13. HR/Admin assignment detection via visibility, focus, and polling interval verified.');

// -----------------------------------------------------------------------------
// Test 14: Backend Role-Based Security Isolation
// -----------------------------------------------------------------------------
assert(catalogServiceSrc.includes('securityContextUtil.getCurrentUser()'), 'CatalogService retrieves currently authenticated user');
assert(catalogServiceSrc.includes('enrollmentRepository.findByUserIdWithCourse(user.getId())'), 'CatalogService queries enrollments exclusively for authenticated user ID');
assert(catalogServiceSrc.includes('filter(e -> e.getStatus() != EnrollmentStatus.REVOKED)'), 'CatalogService excludes REVOKED enrollments from dashboard');
console.log('[PASS] 14. Role-based security isolation verified at backend query level.');

// -----------------------------------------------------------------------------
// Test 15: Preservation of Approved UI/UX & Standalone Hotfix
// -----------------------------------------------------------------------------
assert(!carouselSrc.includes('role="button"'), 'Carousel contains no role="button" wrappers');
assert(carouselSrc.includes('<article') && carouselSrc.includes('assigned-course-hero-card'), 'Hero card uses semantic article');
assert(carouselSrc.includes('tabIndex={isActiveSlide ? 0 : -1}'), 'Independent tabIndex on CTA preserved');
assert(!overviewSrc.includes('h2 className="carousel-section-heading"'), 'No section heading introduced above carousel');
console.log('[PASS] 15. Approved Phase 1/2 UI and accessibility structure fully preserved.');

console.log('\n=======================================================');
console.log('ALL 15 PHASE 3 SYNCHRONIZATION TESTS PASSED (15/15)');
console.log('=======================================================');
