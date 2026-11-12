import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');

console.log('--- Fairmacs KMS Roadmap Smoke & Cleanup Verification ---');

function getAllSourceFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllSourceFiles(fullPath, fileList);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = getAllSourceFiles(srcDir);

// 1. Verify zero hardcoded http://localhost:8080 URLs without VITE_API_BASE_URL
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('http://localhost:8080') && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
      assert(
        content.includes('VITE_API_BASE_URL'),
        `Hardcoded localhost URL without VITE_API_BASE_URL found in ${path.relative(srcDir, file)}:${i + 1}`
      );
    }
  }
}
console.log('[PASS] 1. All API base URLs across frontend/src use import.meta.env.VITE_API_BASE_URL.');

// 2. Verify unused mock data and dead Zustand stores are removed
const removedFiles = [
  path.join(srcDir, 'data', 'mockData.js'),
  path.join(srcDir, 'components', 'EmployeeDashboard.jsx'),
  path.join(srcDir, 'stores', 'authStore.js'),
  path.join(srcDir, 'stores', 'courseStore.js'),
  path.join(srcDir, 'stores', 'notificationStore.js'),
  path.join(srcDir, 'stores', 'index.js')
];
for (const deadFile of removedFiles) {
  assert(!fs.existsSync(deadFile), `Unused file should be removed: ${deadFile}`);
}
console.log('[PASS] 2. Unused mockData.js, EmployeeDashboard.jsx, and dead Zustand stores are removed.');

// 3. Verify EmployeeManagement.jsx and hrAdminService.js support Excel template download & import
const hrAdminServiceContent = fs.readFileSync(path.join(srcDir, 'services', 'hrAdminService.js'), 'utf8');
assert(
  hrAdminServiceContent.includes('downloadImportTemplate') &&
    hrAdminServiceContent.includes('/employees/import-template'),
  'hrAdminService.js must expose downloadImportTemplate() calling /employees/import-template'
);

const employeeMgmtContent = fs.readFileSync(path.join(srcDir, 'components', 'EmployeeManagement.jsx'), 'utf8');
assert(
  employeeMgmtContent.includes('Download Template') &&
    employeeMgmtContent.includes('downloadImportTemplate'),
  'EmployeeManagement.jsx must render Download Template button wired to downloadImportTemplate()'
);
console.log('[PASS] 3. EmployeeManagement.jsx and hrAdminService.js support Excel import template download.');

// 4. Verify PasswordModal forced password change flow & Header unread notification badge sync
const passwordModalContent = fs.readFileSync(path.join(srcDir, 'components', 'PasswordModal.jsx'), 'utf8');
const appContent = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf8');
assert(
  passwordModalContent.includes('changePassword') &&
    passwordModalContent.includes('forceChange') &&
    appContent.includes('mustChangePassword'),
  'PasswordModal.jsx and App.jsx must enforce mustChangePassword / forceChange and call changePassword'
);

const headerContent = fs.readFileSync(path.join(srcDir, 'components', 'Header.jsx'), 'utf8');
assert(
  headerContent.includes('notificationService.getUnreadCount()') &&
    headerContent.includes('fairmacs:notifications-updated'),
  'Header.jsx must fetch server unread count and listen for fairmacs:notifications-updated sync events'
);
console.log('[PASS] 4. Forced password change modal and Header unread count synchronization verified.');

// 5. Verify backend controllers have zero @CrossOrigin annotations and ZohoWorkDriveController is renamed
const backendMainDir = path.join(__dirname, '..', 'backend', 'src', 'main', 'java');
for (const file of fs.readdirSync(path.join(backendMainDir, 'com', 'fairmacs', 'lms', 'controller'))) {
  const fullControllerPath = path.join(backendMainDir, 'com', 'fairmacs', 'lms', 'controller', file);
  const content = fs.readFileSync(fullControllerPath, 'utf8');
  assert(
    !content.includes('@CrossOrigin'),
    `Redundant @CrossOrigin annotation found in ${file}`
  );
}
const zohoDir = path.join(backendMainDir, 'com', 'fairmacs', 'lms', 'integration', 'zoho');
assert(
  fs.existsSync(path.join(zohoDir, 'ZohoWorkDriveController.java')) &&
    !fs.existsSync(path.join(zohoDir, 'ZohoWorkDriveTestController.java')),
  'ZohoWorkDriveTestController.java must be renamed to ZohoWorkDriveController.java'
);
console.log('[PASS] 5. Zero redundant @CrossOrigin annotations on backend controllers and ZohoWorkDriveController verified.');

// 6. Verify Upcoming Live Sessions & Recent Learner Activity dashboard integration
const trainerDashboardContent = fs.readFileSync(
  path.join(srcDir, 'components', 'TrainerDashboard.jsx'),
  'utf8'
);
assert(
  !trainerDashboardContent.includes('Live session data is not connected yet.'),
  'TrainerDashboard.jsx must not contain disconnected live session placeholder text'
);
assert(
  !trainerDashboardContent.includes('Learner activity data is not connected yet.'),
  'TrainerDashboard.jsx must not contain disconnected learner activity placeholder text'
);
assert(
  trainerDashboardContent.includes('courseService.getUpcomingLiveSessions') &&
    trainerDashboardContent.includes('courseService.getRecentLearnerActivity') &&
    trainerDashboardContent.includes('No upcoming live sessions.') &&
    trainerDashboardContent.includes('No recent learner activity.') &&
    trainerDashboardContent.includes('sessionsError') &&
    trainerDashboardContent.includes('activityError') &&
    trainerDashboardContent.includes('Join Session'),
  'TrainerDashboard.jsx must connect Upcoming Live Sessions and Recent Learner Activity with loading, empty, error, and populated states'
);

const courseServiceContent = fs.readFileSync(
  path.join(srcDir, 'services', 'courseService.js'),
  'utf8'
);
assert(
  courseServiceContent.includes('getUpcomingLiveSessions') &&
    courseServiceContent.includes('/training-calendar/upcoming') &&
    courseServiceContent.includes('getRecentLearnerActivity') &&
    courseServiceContent.includes('/activity/recent'),
  'courseService.js must expose getUpcomingLiveSessions and getRecentLearnerActivity connected to backend endpoints'
);
console.log('[PASS] 6. Upcoming Live Sessions & Recent Learner Activity dashboard integration verified.');

// 7. Verify Trainer Course Analytics alignment with HR Course Reports
const reportsViewContent = fs.readFileSync(
  path.join(srcDir, 'components', 'ReportsView.jsx'),
  'utf8'
);
assert(
  reportsViewContent.includes("const isTrainer = role.includes('TRAINER');") &&
    reportsViewContent.includes('const isAnalyticsRole = isHR || isTrainer;') &&
    reportsViewContent.includes('/trainer/reports') &&
    reportsViewContent.includes('Course Analytics & Reports'),
  'ReportsView.jsx must align Trainer Course Analytics with HR Training Reports and include shared Course Analytics & Reports'
);
assert(
  trainerDashboardContent.includes('Course Analytics Overview') &&
    trainerDashboardContent.includes('Course Analytics & Performance Breakdown'),
  'TrainerDashboard.jsx must include the aligned Course Analytics & Performance Breakdown section'
);
console.log('[PASS] 7. Trainer Course Analytics alignment with HR Reports verified.');

// 8. Verify Create Course Modal immediate opening and reference data caching
const courseBuilderModalContent = fs.readFileSync(
  path.join(srcDir, 'components', 'CourseBuilderModal.jsx'),
  'utf8'
);
assert(
  courseBuilderModalContent.includes('export function preloadCourseBuilderReferenceData') &&
    courseBuilderModalContent.includes('getOrFetchDepartments') &&
    courseBuilderModalContent.includes('getOrFetchEmployees') &&
    courseBuilderModalContent.includes('React.lazy(() => import(\'./BulkQuizImportModal\'))') &&
    courseBuilderModalContent.includes('loadingDepartments') &&
    courseBuilderModalContent.includes('loadingEmployees') &&
    !courseBuilderModalContent.includes('const [loadingLookups, setLoadingLookups]'),
  'CourseBuilderModal.jsx must implement reference data caching, decoupled department/employee loading, and lazy BulkQuizImportModal'
);
const hrDashboardContent = fs.readFileSync(
  path.join(srcDir, 'components', 'HrAdminDashboard.jsx'),
  'utf8'
);
assert(
  hrDashboardContent.includes('preloadCourseBuilderReferenceData') &&
    trainerDashboardContent.includes('preloadCourseBuilderReferenceData'),
  'Dashboards must preload CourseBuilderModal reference data for instantaneous opening'
);
console.log('[PASS] 8. Create Course Modal immediate opening and reference data caching verified.');

console.log('--- ALL 8 ROADMAP & DASHBOARD SMOKE CHECKS PASSED ---');
