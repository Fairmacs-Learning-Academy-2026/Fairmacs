// test-stage4-manager-policies.js
// Verification suite for Stage 4: Manager Department Policies & Agreements Management Module

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failedCount++;
  }
}

console.log('\n--- Fairmacs KMS Stage 4: Manager Policies & Agreements Verification ---\n');

// 1. Verify component files exist
const components = [
  'PolicyManagerManagement.jsx',
  'PolicyManagerOverviewTab.jsx',
  'PolicyManagerDocumentsTab.jsx',
  'PolicyManagerSubmissionsTab.jsx',
  'PolicyManagerReportsTab.jsx',
  'PolicyManagerPendingTab.jsx',
  'PolicyManagerSubmitModal.jsx',
];

const managerDir = path.join(__dirname, 'src', 'components', 'policies', 'manager');
components.forEach((comp) => {
  const filePath = path.join(managerDir, comp);
  assert(fs.existsSync(filePath), `Manager component exists: ${comp}`);
});

// 2. Verify PolicyPdfViewerModal exists and honors allowDownload
const pdfModalPath = path.join(__dirname, 'src', 'components', 'policies', 'PolicyPdfViewerModal.jsx');
assert(fs.existsSync(pdfModalPath), 'PolicyPdfViewerModal exists');
const pdfModalCode = fs.readFileSync(pdfModalPath, 'utf8');
assert(pdfModalCode.includes('allowDownload &&'), 'PolicyPdfViewerModal honors allowDownload prop before rendering download action');

// 3. Verify policyService.js manager methods
const servicePath = path.join(__dirname, 'src', 'services', 'policyService.js');
assert(fs.existsSync(servicePath), 'policyService.js exists');
const serviceCode = fs.readFileSync(servicePath, 'utf8');
const expectedMethods = [
  'getManagerOverview',
  'getManagerDepartments',
  'getManagerPolicies',
  'submitManagerPolicy',
  'getManagerSubmissions',
  'getManagerReports',
  'exportManagerReportsExcel',
  'sendManagerReminder',
  'fetchPdfBlob',
  'downloadPdf',
];
expectedMethods.forEach((method) => {
  assert(serviceCode.includes(method), `policyService.${method} is defined and exported`);
});

// 4. Verify Sidebar.jsx has Manager Policies navigation strictly for MANAGER
const sidebarPath = path.join(__dirname, 'src', 'components', 'Sidebar.jsx');
const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
assert(sidebarCode.includes("id: 'managerPolicies'"), "Sidebar includes 'managerPolicies' nav item");
assert(sidebarCode.includes("path: '/manager/policies'"), "Sidebar links to '/manager/policies'");
assert(sidebarCode.includes("label: 'Policies & Agreements'"), "Sidebar label is 'Policies & Agreements'");

// Extract MANAGER vs HR_ADMIN/SUPER_ADMIN vs TRAINER vs default sections in Sidebar.jsx
const managerSection = sidebarCode.split("case 'MANAGER':")[1]?.split("case 'HR_ADMIN':")[0] || '';
const hrSection = sidebarCode.split("case 'HR_ADMIN':")[1]?.split("default:")[0] || '';
const trainerSection = sidebarCode.split("case 'TRAINER':")[1]?.split("case 'MANAGER':")[0] || '';
const employeeSection = sidebarCode.split("default:")[1]?.split("};")[0] || '';

assert(managerSection.includes("'/manager/policies'") && !managerSection.includes("'/hr/policies'"), "Sidebar MANAGER role displays '/manager/policies' and hides '/hr/policies'");
assert(hrSection.includes("'/hr/policies'") && !hrSection.includes("'/manager/policies'"), "Sidebar HR_ADMIN & SUPER_ADMIN roles display '/hr/policies' and hide '/manager/policies'");
assert(!trainerSection.includes("'/manager/policies'") && !trainerSection.includes("'/hr/policies'"), "Sidebar TRAINER role hides both '/manager/policies' and '/hr/policies'");
assert(!employeeSection.includes("'/manager/policies'") && !employeeSection.includes("'/hr/policies'"), "Sidebar EMPLOYEE role hides both '/manager/policies' and '/hr/policies'");

// 5. Verify App.jsx routes and strict role guards
const appPath = path.join(__dirname, 'src', 'App.jsx');
const appCode = fs.readFileSync(appPath, 'utf8');
assert(appCode.includes("managerPolicies: '/manager/policies'"), "App.jsx maps managerPolicies tab to '/manager/policies'");
assert(appCode.includes("'/manager/policies': 'managerPolicies'"), "App.jsx maps '/manager/policies' to managerPolicies tab");
assert(appCode.includes("PolicyManagerManagement"), "App.jsx imports and renders PolicyManagerManagement");

const managerRouteBlock = appCode.split('path="/manager/policies"')[1]?.split('/>')[0] || '';
assert(managerRouteBlock.includes("allowedRoles={['MANAGER']}"), "App.jsx Route guards '/manager/policies' strictly for ['MANAGER'] only");
assert(!managerRouteBlock.includes('HR_ADMIN') && !managerRouteBlock.includes('SUPER_ADMIN'), "App.jsx Route for '/manager/policies' excludes HR_ADMIN and SUPER_ADMIN");

const managerRenderBlock = appCode.split("location.pathname === '/manager/policies'")[1]?.split('return <PolicyManagerManagement />;')[0] || '';
assert(managerRenderBlock.includes("!== 'MANAGER'") && !managerRenderBlock.includes('HR_ADMIN'), "App.jsx direct URL renderContent() guard for '/manager/policies' restricts strictly to 'MANAGER'");

const hrRouteBlock = appCode.split('path="/hr/policies"')[1]?.split('/>')[0] || '';
assert(hrRouteBlock.includes("allowedRoles={['HR_ADMIN', 'SUPER_ADMIN']}"), "App.jsx Route preserves '/hr/policies' for ['HR_ADMIN', 'SUPER_ADMIN']");

// 6. Verify Backend SecurityConfig, PolicyManagerController, PolicyHrController, and PolicyServiceImpl
const backendRoot = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms');
const secConfigCode = fs.readFileSync(path.join(backendRoot, 'security', 'SecurityConfig.java'), 'utf8');
assert(secConfigCode.includes('.requestMatchers("/api/manager/policies", "/api/manager/policies/**").hasRole("MANAGER")'), 'SecurityConfig restricts /api/manager/policies/** strictly to hasRole("MANAGER")');
assert(secConfigCode.includes('.requestMatchers("/api/hr/**").hasAnyRole("HR_ADMIN", "SUPER_ADMIN")'), 'SecurityConfig preserves /api/hr/** for HR_ADMIN and SUPER_ADMIN');

const mgrCtrlCode = fs.readFileSync(path.join(backendRoot, 'controller', 'PolicyManagerController.java'), 'utf8');
assert(mgrCtrlCode.includes('@PreAuthorize("hasRole(\'MANAGER\')")'), 'PolicyManagerController enforces @PreAuthorize("hasRole(\'MANAGER\')")');
assert(!mgrCtrlCode.includes("hasAnyRole('MANAGER', 'HR_ADMIN'"), 'PolicyManagerController removes HR_ADMIN and SUPER_ADMIN from @PreAuthorize');
assert(mgrCtrlCode.includes('!"MANAGER".equalsIgnoreCase(role)'), 'PolicyManagerController enforces runtime MANAGER role check');

const hrCtrlCode = fs.readFileSync(path.join(backendRoot, 'controller', 'PolicyHrController.java'), 'utf8');
assert(hrCtrlCode.includes('@PreAuthorize("hasAnyRole(\'HR_ADMIN\', \'SUPER_ADMIN\')")'), 'PolicyHrController preserves @PreAuthorize("hasAnyRole(\'HR_ADMIN\', \'SUPER_ADMIN\')")');

const serviceImplCode = fs.readFileSync(path.join(backendRoot, 'service', 'PolicyServiceImpl.java'), 'utf8');
assert(serviceImplCode.includes('requireManagerRole(manager)'), 'PolicyServiceImpl enforces service-level requireManagerRole(manager)');
assert(serviceImplCode.includes('user.getRole() != Role.MANAGER'), 'PolicyServiceImpl requireManagerRole checks user.getRole() != Role.MANAGER');

// 7. Verify PolicyManagerSubmitModal restricts file types and enforces 25MB limit
const submitModalPath = path.join(managerDir, 'PolicyManagerSubmitModal.jsx');
const submitModalCode = fs.readFileSync(submitModalPath, 'utf8');
assert(submitModalCode.includes('25 * 1024 * 1024'), 'Submit modal validates 25MB maximum PDF file size limit');
assert(submitModalCode.includes('application/pdf'), 'Submit modal enforces PDF format restriction');
assert(submitModalCode.includes('submitManagerPolicy'), 'Submit modal connects to policyService.submitManagerPolicy');

// 8. Verify PolicyManagerReportsTab supports dual views and Excel export
const reportsPath = path.join(managerDir, 'PolicyManagerReportsTab.jsx');
const reportsCode = fs.readFileSync(reportsPath, 'utf8');
assert(reportsCode.includes("viewMode === 'employee'"), 'Reports tab implements Employee-wise perspective');
assert(reportsCode.includes("viewMode === 'document'"), 'Reports tab implements Document-wise perspective');
assert(reportsCode.includes('exportManagerReportsExcel'), 'Reports tab calls policyService.exportManagerReportsExcel');
assert(reportsCode.includes('exportCsvFallback'), 'Reports tab provides graceful client-side CSV export fallback');

// 9. Verify PolicyManagerPendingTab supports in-app reminder notifications
const pendingPath = path.join(managerDir, 'PolicyManagerPendingTab.jsx');
const pendingCode = fs.readFileSync(pendingPath, 'utf8');
assert(pendingCode.includes('sendManagerReminder'), 'Pending tab triggers policyService.sendManagerReminder');
assert(pendingCode.includes('remindedIds'), 'Pending tab manages in-session disabled state for sent reminders');

console.log(`\n=======================================================`);
console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log(`=======================================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
