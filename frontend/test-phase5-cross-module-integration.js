import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_COURSE_THUMBNAIL,
  DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID,
  BACKEND_DEFAULT_THUMBNAIL_FILE_ID,
  isDefaultThumbnail,
  resolveBannerUrl,
  getFallbackSvg
} from './src/utils/courseBanner.js';

import {
  classifyCourseDuration,
  formatCourseDuration,
  DurationClassification
} from './src/utils/courseDuration.js';

import {
  getApiBaseUrl,
  getAuthToken,
  getAuthHeaders,
  clearAuthTokens,
  TOKEN_KEY
} from './src/utils/apiConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');

console.log('--- Fairmacs KMS Phase 5: Cross-Module Integration & Technical Consistency Verification ---');

// =========================================================================
// 1. Thumbnail Logic Consolidation Verification
// =========================================================================

// A. Official Fairmacs default thumbnail asset exists
const defaultThumbPath = path.join(__dirname, 'public', 'fairmacs-default-thumbnail.png');
assert(fs.existsSync(defaultThumbPath), 'Default Fairmacs thumbnail PNG must exist in public folder');
const thumbStats = fs.statSync(defaultThumbPath);
assert(thumbStats.size > 10000, `Default thumbnail must be valid high-res PNG (got ${thumbStats.size} bytes)`);

// B. Custom uploaded thumbnail preservation
const customUrl = 'https://cdn.fairmacs.com/thumbnails/safety-training.jpg';
assert.strictEqual(resolveBannerUrl(customUrl), customUrl, 'Custom uploaded URL must be preserved');
assert.strictEqual(isDefaultThumbnail(customUrl), false, 'Custom thumbnail must not be flagged as default');

// C. WorkDrive default file IDs resolve to official default thumbnail
const wdDefaultUrl = `https://workdrive.zoho.com/file/${DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID}`;
assert.strictEqual(resolveBannerUrl(wdDefaultUrl), DEFAULT_COURSE_THUMBNAIL, 'WorkDrive default link must resolve to official default');
assert.strictEqual(isDefaultThumbnail(wdDefaultUrl), true, 'WorkDrive default link must be flagged as default');

// D. Backend WorkDrive default file ID also resolves to default
const backendWdDefaultUrl = `https://workdrive.zoho.com/file/${BACKEND_DEFAULT_THUMBNAIL_FILE_ID}`;
assert.strictEqual(resolveBannerUrl(backendWdDefaultUrl), DEFAULT_COURSE_THUMBNAIL, 'Backend WorkDrive default link must resolve to default');

// E. Custom WorkDrive file IDs route through secure backend proxy (not direct HTML link)
const customWdId = 'xyz987customworkdrivefileid12345';
const resolvedCustomWd = resolveBannerUrl(`https://workdrive.zoho.com/file/${customWdId}`);
assert(resolvedCustomWd.includes(`/api/courses/thumbnails/workdrive/${customWdId}`), 'Custom WorkDrive file must route via proxy stream');
assert.strictEqual(isDefaultThumbnail(customWdId), false, 'Custom WorkDrive file must not be flagged as default');

// F. Storage UUIDs route through backend thumbnail endpoint
const storageUuid = '3c8005d3-7353-42fa-9931-32c98a8598de';
const resolvedUuid = resolveBannerUrl(storageUuid);
assert(resolvedUuid.includes(`/api/courses/thumbnails/${storageUuid}`), 'UUID storage ID must route via proxy endpoint');

// G. Fallback SVG generation for offline/broken states
const fallbackSvg = getFallbackSvg({ id: 'OP004', title: 'Operational Excellence', department: 'Operations' });
assert(fallbackSvg.startsWith('data:image/svg+xml'), 'Fallback must generate valid SVG data URI');
assert(fallbackSvg.includes('Operational%20Excellence'), 'Fallback SVG must encode course title');

console.log('[PASS] 1. Thumbnail Logic Consolidation: Custom, default, WorkDrive proxy, and SVG fallback verified.');

// =========================================================================
// 2. Course Duration Logic Consolidation & 4-Tier Classification Verification
// =========================================================================

// A. Explicit Self-paced
assert.strictEqual(classifyCourseDuration('Self-paced').classification, DurationClassification.EXPLICIT_SELF_PACED);
assert.strictEqual(formatCourseDuration('Self-paced'), 'Self-paced');

// B. Valid configured duration with accurate grammar
assert.strictEqual(formatCourseDuration(null, 0.5), '30 min', '0.5h -> 30 min');
assert.strictEqual(formatCourseDuration(null, 1.0), '1 hour', '1.0h -> 1 hour (singular)');
assert.strictEqual(formatCourseDuration(null, 1.5), '1 hour 30 min', '1.5h -> 1 hour 30 min');
assert.strictEqual(formatCourseDuration(null, 2.0), '2 hours', '2.0h -> 2 hours (plural)');
assert.strictEqual(formatCourseDuration(null, 3.0), '3 hours', '3.0h -> 3 hours (plural)');
assert.strictEqual(formatCourseDuration('10 min'), '10 min', '10 min string preserved');
assert.strictEqual(formatCourseDuration('01:30'), '2 min', 'MM:SS formatted properly');

// C. Missing duration
assert.strictEqual(classifyCourseDuration(null, null).classification, DurationClassification.MISSING);
assert.strictEqual(formatCourseDuration(null, null), 'Self-paced');
assert.strictEqual(formatCourseDuration('', null), 'Self-paced');

// D. Invalid legacy duration
assert.strictEqual(classifyCourseDuration('a', 1.0).classification, DurationClassification.INVALID_LEGACY);
assert.strictEqual(formatCourseDuration('a', 1.0), 'Self-paced');
assert.strictEqual(formatCourseDuration('null'), 'Self-paced');

console.log('[PASS] 2. Course Duration Consolidation: 4-tier classification and singular/plural grammar verified.');

// =========================================================================
// 3. API Configuration & Authentication Standardization Verification
// =========================================================================

// A. apiConfig module exports
assert(typeof getApiBaseUrl === 'function', 'getApiBaseUrl must be exported');
assert(typeof getAuthToken === 'function', 'getAuthToken must be exported');
assert(typeof getAuthHeaders === 'function', 'getAuthHeaders must be exported');
assert(typeof clearAuthTokens === 'function', 'clearAuthTokens must be exported');

// B. Base URL resolution
const resolvedApiBase = getApiBaseUrl();
assert(typeof resolvedApiBase === 'string' && resolvedApiBase.length > 0, 'getApiBaseUrl must return valid string');
assert(!resolvedApiBase.endsWith('/'), 'API base URL must not have trailing slash');

// C. Auth headers creation
const mockToken = 'mock-jwt-token-xyz';
globalThis.localStorage = {
  store: { [TOKEN_KEY]: mockToken },
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = v; },
  removeItem(k) { delete this.store[k]; }
};

const headers = getAuthHeaders();
assert.strictEqual(headers.Authorization, `Bearer ${mockToken}`, 'getAuthHeaders must inject Bearer JWT');
assert.strictEqual(headers.Accept, 'application/json', 'getAuthHeaders must include Accept header');

clearAuthTokens();
assert.strictEqual(getAuthToken(), '', 'clearAuthTokens must wipe stored tokens');

// D. Verify all frontend services adopt apiConfig.js
const servicesToCheck = [
  'courseService.js',
  'enrollmentService.js',
  'authService.js',
  'quizService.js',
  'assessmentService.js',
  'employeeService.js',
  'hrAdminService.js',
  'notificationService.js',
  'reportService.js',
  'trainingService.js',
  'zohoService.js'
];
for (const serviceName of servicesToCheck) {
  const servicePath = path.join(srcDir, 'services', serviceName);
  assert(fs.existsSync(servicePath), `Service file must exist: ${serviceName}`);
  const serviceSrc = fs.readFileSync(servicePath, 'utf8');
  assert(
    serviceSrc.includes('../utils/apiConfig'),
    `Service ${serviceName} must import from ../utils/apiConfig`
  );
  assert(
    serviceSrc.includes('handleUnauthorized'),
    `Service ${serviceName} must integrate handleUnauthorized for session expiry`
  );
}

console.log('[PASS] 3. API Configuration & Auth Standardization verified across all 11 frontend services.');

// =========================================================================
// 4. Course Summary vs Detail DTO Mapping Consistency Verification
// =========================================================================

const courseMapperPath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'CourseMapper.java');
const courseDtoPath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'dto', 'CourseDTO.java');

assert(fs.existsSync(courseMapperPath), 'CourseMapper.java must exist');
assert(fs.existsSync(courseDtoPath), 'CourseDTO.java must exist');

const courseMapperSrc = fs.readFileSync(courseMapperPath, 'utf8');
const courseDtoSrc = fs.readFileSync(courseDtoPath, 'utf8');

// Verify 15 essential fields are mapped consistently
const requiredFields = [
  'dbId',
  'id',
  'title',
  'description',
  'learningOutcomes',
  'department',
  'departmentAssignments',
  'assignmentType',
  'dueDate',
  'banner',
  'duration',
  'durationHours',
  'moduleCount',
  'lessonCount',
  'progressPercent'
];

for (const field of requiredFields) {
  assert(
    courseDtoSrc.includes(field),
    `CourseDTO must declare field: ${field}`
  );
  assert(
    courseMapperSrc.includes(field) || courseMapperSrc.includes(`set${field.charAt(0).toUpperCase() + field.slice(1)}`),
    `CourseMapper must map field: ${field}`
  );
}

// Verify toDetail reconciles counts and invokes toSummary
assert(/toSummary\s*\(\s*course\s*,\s*enrollment\s*,\s*assignmentType\s*\)/.test(courseMapperSrc), 'toDetail must inherit from toSummary');
assert(courseMapperSrc.includes('dto.setModuleCount(dto.getModules().size())'), 'toDetail must reconcile moduleCount');

console.log('[PASS] 4. Course Summary vs Detail DTO consistency: All 15 metadata fields verified.');

// =========================================================================
// 5. Removed Features & Dead Code Audit Verification
// =========================================================================

const appJsxPath = path.join(srcDir, 'App.jsx');
const sidebarPath = path.join(srcDir, 'components', 'Sidebar.jsx');

const appJsx = fs.readFileSync(appJsxPath, 'utf8');
const sidebar = fs.readFileSync(sidebarPath, 'utf8');

// A. Progress Hub preserved completely
assert(appJsx.includes("'/progress': 'mylearning'"), 'App.jsx must route /progress to mylearning');
assert(sidebar.includes("label: 'Progress Hub'"), 'Sidebar must render Progress Hub nav item');
assert(sidebar.includes("path: '/progress'"), 'Sidebar Progress Hub must point to /progress');

// B. Learning Paths removed from active navigation and routes
assert(!appJsx.includes("import LearningPaths from"), 'App.jsx must not import removed LearningPaths component');
assert(!appJsx.includes("path=\"/learning-paths\""), 'App.jsx must not route /learning-paths');
assert(!sidebar.includes("Learning Paths"), 'Sidebar must not contain Learning Paths navigation');

// C. Legacy CourseDetailsModal replaced across all pages
assert(!appJsx.includes("<CourseDetailsModal"), 'App.jsx must not render legacy CourseDetailsModal');
assert(appJsx.includes("<CourseOverviewPage"), 'App.jsx must render modern CourseOverviewPage');

console.log('[PASS] 5. Dead Code Audit: Progress Hub preserved, Learning Paths and old modal eliminated.');

// =========================================================================
// 6. Zoho WorkDrive Integration & Access Control Verification
// =========================================================================

const accessServicePath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'LessonDocumentAccessService.java');
const docControllerPath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'controller', 'LessonDocumentController.java');

assert(fs.existsSync(accessServicePath), 'LessonDocumentAccessService.java must exist');
assert(fs.existsSync(docControllerPath), 'LessonDocumentController.java must exist');

const accessServiceSrc = fs.readFileSync(accessServicePath, 'utf8');
const docControllerSrc = fs.readFileSync(docControllerPath, 'utf8');

// Verify secure document streaming pipeline
assert(accessServiceSrc.includes('downloadService.download(lesson.getWorkdriveFileId())'), 'Document stream must delegate to ZohoWorkDriveDownloadService');
assert(accessServiceSrc.includes('isLessonUnlocked'), 'Document access must verify sequential lesson locking');
assert(accessServiceSrc.includes('EnrollmentStatus.REVOKED'), 'Document access must reject revoked enrollments');
assert(docControllerSrc.includes('@PreAuthorize("isAuthenticated()")'), 'LessonDocumentController must enforce authentication');

console.log('[PASS] 6. Zoho WorkDrive Integration & Document Access Control verified.');

// =========================================================================
// 7. Assigned Course Lifecycle & Filtering Verification
// =========================================================================

const overviewPath = path.join(srcDir, 'components', 'Overview.jsx');
const carouselPath = path.join(srcDir, 'components', 'AssignedLearningCarousel.jsx');

const overviewSrc = fs.readFileSync(overviewPath, 'utf8');
const carouselSrc = fs.readFileSync(carouselPath, 'utf8');

// A. Strict status filtering in Overview.jsx
assert(/isCompleted\s*=\s*course\.enrollmentStatus === 'COMPLETED'\s*\|\|\s*course\.status === 'COMPLETED'/.test(overviewSrc), 'Overview must exclude completed courses');
assert(overviewSrc.includes("['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE']"), 'Overview must exclude revoked/cancelled/withdrawn/inactive enrollments');

// B. Deduplication and distinct keys
assert(overviewSrc.includes('const seen = new Set()'), 'Overview must deduplicate assigned courses');

// C. UI accessibility preserved
assert(carouselSrc.includes('<article'), 'Carousel card must use semantic <article>');
assert(carouselSrc.includes('<section'), 'Carousel container must use semantic <section>');
assert(carouselSrc.includes('aria-label="Your Assigned Learning Carousel"'), 'Carousel must have accessible aria-label');
assert(carouselSrc.includes('aria-roledescription="carousel"'), 'Carousel must declare aria-roledescription="carousel"');

console.log('[PASS] 7. Assigned Course Lifecycle & Carousel Accessibility verified.');

// =========================================================================
// 8. Cross-Tab Synchronization Bus Verification
// =========================================================================

const enrollmentSyncPath = path.join(srcDir, 'utils', 'enrollmentSync.js');
assert(fs.existsSync(enrollmentSyncPath), 'enrollmentSync.js must exist');

const syncSrc = fs.readFileSync(enrollmentSyncPath, 'utf8');
assert(syncSrc.includes('BroadcastChannel'), 'Sync bus must support BroadcastChannel for instant cross-tab sync');
assert(syncSrc.includes("addEventListener('storage'"), 'Sync bus must support StorageEvent fallback');
assert(syncSrc.includes("addEventListener('focus'"), 'Sync bus must revalidate on window focus');
assert(syncSrc.includes("visibilitychange"), 'Sync bus must revalidate on visibilitychange');

console.log('[PASS] 8. Multi-tier cross-tab and visibility synchronization bus verified.');

console.log('\n========================================================================');
console.log('ALL 8 PHASE 5 INTEGRATION & TECHNICAL CONSISTENCY CHECKS PASSED (8/8)');
console.log('========================================================================\n');
