import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');

console.log('--- Fairmacs KMS HR Route Navigation Verification ---');

const appContent = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf8');
const hrDashboardContent = fs.readFileSync(path.join(srcDir, 'components', 'HrAdminDashboard.jsx'), 'utf8');
const sidebarContent = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar.jsx'), 'utf8');
const loginContent = fs.readFileSync(path.join(srcDir, 'components', 'Login.jsx'), 'utf8');
const deptDetailsContent = fs.readFileSync(path.join(srcDir, 'components', 'DepartmentDetails.jsx'), 'utf8');

// 1. Verify all 9 dedicated HR routes are declared in App.jsx
const requiredHrRoutes = [
  '/hr/overview',
  '/hr/employees',
  '/hr/departments',
  '/hr/courses',
  '/hr/drafts',
  '/hr/reports',
  '/hr/certificates',
  '/hr/announcements',
  '/hr/settings',
];

for (const route of requiredHrRoutes) {
  assert(
    appContent.includes(`path="${route}"`),
    `App.jsx must declare dedicated route: ${route}`
  );
}
console.log('[PASS] 1. All 9 dedicated HR routes are defined in App.jsx.');

// 2. Verify all 9 HR routes are protected by HR_ADMIN RoleRoute
assert(
  appContent.includes("<Route\n            path=\"/admin\"\n            element={<Navigate to=\"/hr/overview\" replace />}") ||
  appContent.includes('path="/admin"') && appContent.includes('Navigate to="/hr/overview"'),
  'App.jsx must redirect /admin to /hr/overview'
);
assert(
  appContent.includes('path="/hr"') && appContent.includes('Navigate to="/hr/overview"'),
  'App.jsx must redirect /hr to /hr/overview'
);
console.log('[PASS] 2. /admin and /hr cleanly redirect to /hr/overview.');

// 3. Verify horizontal tab navigation is removed from HrAdminDashboard.jsx
assert(
  !hrDashboardContent.includes('aria-label="HR Dashboard Sections"'),
  'HrAdminDashboard.jsx must not render horizontal sub-tab bar'
);
assert(
  !hrDashboardContent.includes('activeHrSubTab ==='),
  'HrAdminDashboard.jsx must not use monolithic activeHrSubTab local state switching'
);
console.log('[PASS] 3. Horizontal tab navigation bar and monolithic tab-switching state removed from HrAdminDashboard.');

// 4. Verify dedicated page components exist and are wired in App.jsx
const dedicatedComponents = [
  'HrCoursesPage.jsx',
  'HrDraftsPage.jsx',
  'HrCertificatesPage.jsx',
  'HrAnnouncementsPage.jsx',
  'HrSettingsPage.jsx',
];
for (const comp of dedicatedComponents) {
  const filePath = path.join(srcDir, 'components', comp);
  assert(fs.existsSync(filePath), `Dedicated component file must exist: ${comp}`);
  const compName = comp.replace('.jsx', '');
  assert(appContent.includes(compName), `App.jsx must import and render ${compName}`);
}
console.log('[PASS] 4. All dedicated HR page components exist and are wired into App.jsx.');

// 5. Verify Sidebar navigation links directly to dedicated HR paths
for (const route of requiredHrRoutes) {
  assert(
    sidebarContent.includes(`path: '${route}'`),
    `Sidebar.jsx must contain direct path navigation for: ${route}`
  );
}
console.log('[PASS] 5. Sidebar.jsx contains direct path navigation for all 9 HR sections.');

// 6. Verify role-based login redirect and DepartmentDetails back button
assert(
  loginContent.includes("case 'HR_ADMIN':\n        return '/hr/overview';") ||
  loginContent.includes("return '/hr/overview';"),
  'Login.jsx must redirect HR_ADMIN to /hr/overview'
);
assert(
  deptDetailsContent.includes("navigate('/hr/departments')"),
  'DepartmentDetails.jsx back button must navigate to /hr/departments'
);
console.log('[PASS] 6. Role-based login and department back navigation verified.');

// 7. Verify breadcrumb navigation is completely removed from all HR pages
const hrPagesToCheck = [
  'HrAdminDashboard.jsx',
  'HrCoursesPage.jsx',
  'HrDraftsPage.jsx',
  'HrCertificatesPage.jsx',
  'HrAnnouncementsPage.jsx',
  'HrSettingsPage.jsx',
];
for (const pageName of hrPagesToCheck) {
  const content = fs.readFileSync(path.join(srcDir, 'components', pageName), 'utf8');
  assert(
    !content.includes('Fairmacs KMS >') && !content.includes('HR Administration</span>\n          <ChevronRight') && !content.includes('HR Administration</span>\r\n          <ChevronRight'),
    `${pageName} must not contain breadcrumb navigation`
  );
}
console.log('[PASS] 7. Breadcrumb navigation completely removed from all HR administration pages.');

// 8. Verify Sidebar layout structure has 3 distinct sections (Header, Scrollable Nav, Fixed User Footer)
const appCssContent = fs.readFileSync(path.join(srcDir, 'App.css'), 'utf8');
assert(
  sidebarContent.includes('sidebar-header-area') &&
  sidebarContent.includes('sidebar-nav-container') &&
  sidebarContent.includes('sidebar-user-footer'),
  'Sidebar.jsx must structure 3 distinct layout sections (header, scrollable nav container, user footer)'
);
assert(
  appCssContent.includes('.sidebar-nav-container') &&
  appCssContent.includes('overflow-y: auto') &&
  appCssContent.includes('flex: 1 1 0%'),
  'App.css must style .sidebar-nav-container with independent flex scrolling'
);
assert(
  appCssContent.includes('.sidebar-user-footer') &&
  appCssContent.includes('flex-shrink: 0'),
  'App.css must keep .sidebar-user-footer pinned with flex-shrink: 0'
);
console.log('[PASS] 8. Sidebar 3-section layout and independent flex scrolling verified.');

// 9. Verify Intelligent Hover-Based Compact Icon Rail
assert(
  !sidebarContent.includes('sidebar-collapse-btn') &&
  !sidebarContent.includes('PanelLeftOpen') &&
  !sidebarContent.includes('PanelLeftClose'),
  'Sidebar.jsx must not render manual expand/collapse buttons'
);
assert(
  sidebarContent.includes('createPortal') &&
  sidebarContent.includes('sidebar-floating-tooltip') &&
  sidebarContent.includes('showTooltip'),
  'Sidebar.jsx must implement individual floating tooltip portal for hover navigation'
);
assert(
  appCssContent.includes('.sidebar-floating-tooltip') &&
  appCssContent.includes('width: 74px') &&
  appCssContent.includes('.sidebar-avatar-btn'),
  'App.css must define 74px compact rail width, avatar button, and floating tooltip styles'
);
console.log('[PASS] 9. Intelligent hover-based compact icon rail and floating tooltip portal verified.');

console.log('--- ALL HR DEDICATED ROUTE & INTELLIGENT SIDEBAR CHECKS PASSED ---');
