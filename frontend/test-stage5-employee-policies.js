// test-stage5-employee-policies.js
// Verification suite for Stage 5: Employee My Profile Policies & Agreements Integration

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

console.log('\n--- Fairmacs KMS Stage 5: Employee My Profile Policies & Agreements Verification ---\n');

// 1. EmployeePoliciesSection.jsx existence and API integration
const empSectionPath = path.join(__dirname, 'src', 'components', 'policies', 'employee', 'EmployeePoliciesSection.jsx');
assert(fs.existsSync(empSectionPath), 'EmployeePoliciesSection.jsx exists');
const empSectionCode = fs.readFileSync(empSectionPath, 'utf8');

assert(empSectionCode.includes('id="policies"'), 'EmployeePoliciesSection renders section with id="policies"');
assert(empSectionCode.includes('policyService.getMyAssignments'), 'EmployeePoliciesSection fetches real assignments via policyService.getMyAssignments');
assert(empSectionCode.includes('policyService.getMyAcknowledgements'), 'EmployeePoliciesSection fetches acknowledgement history via policyService.getMyAcknowledgements');
assert(empSectionCode.includes('policyService.getEmployeeCategories'), 'EmployeePoliciesSection fetches categories via policyService.getEmployeeCategories');
assert(empSectionCode.includes('PolicyPdfViewerModal'), 'EmployeePoliciesSection reuses PolicyPdfViewerModal for authenticated PDF streaming');

// 2. Filters, search, overdue guard, and Stage 6 boundary
['ALL', 'PENDING', 'ACKNOWLEDGED', 'MANDATORY', 'OPTIONAL', 'OVERDUE'].forEach((f) => {
  assert(empSectionCode.includes(`'${f}'`), `EmployeePoliciesSection includes filter: ${f}`);
});
assert(empSectionCode.includes('selectedCategory'), 'EmployeePoliciesSection includes category filter');
assert(empSectionCode.includes('searchTerm'), 'EmployeePoliciesSection includes search input');
assert(empSectionCode.includes('Boolean(a.dueDate)'), 'EmployeePoliciesSection ensures Open-ended policies (no dueDate) are never marked Overdue');
assert(
  empSectionCode.includes('Review &amp; Acknowledge') || empSectionCode.includes('Review & Acknowledge') || (empSectionCode.includes('Acknowledge (Stage 6)') && empSectionCode.includes('disabled')),
  'EmployeePoliciesSection provides formal acknowledgement action'
);

// 3. ProfilePage.jsx integration & My Documents removal
const profilePath = path.join(__dirname, 'src', 'components', 'ProfilePage.jsx');
const profileCode = fs.readFileSync(profilePath, 'utf8');

assert(profileCode.includes('<EmployeePoliciesSection'), 'ProfilePage renders <EmployeePoliciesSection />');
assert(profileCode.includes("activeHash === '#policies'"), 'ProfilePage handles #policies hash navigation and browser refresh');
assert(profileCode.includes("getElementById('policies')"), 'ProfilePage scrolls #policies section into view');
assert(!profileCode.includes('id="my-documents"'), 'ProfilePage personal My Documents section remains removed');
assert(!profileCode.includes('DOCUMENT_CATEGORIES'), 'ProfilePage personal DOCUMENT_CATEGORIES remain removed');

['profile-header', 'personal-info', 'emergency-contacts', 'employment-info', 'learning-development', 'employment-timeline'].forEach((secId) => {
  assert(profileCode.includes(`id="${secId}"`), `ProfilePage preserves existing section: ${secId}`);
});

// 4. Notification deep-link resolution
const notifServicePath = path.join(__dirname, 'src', 'services', 'notificationService.js');
const notifServiceCode = fs.readFileSync(notifServicePath, 'utf8');
assert(notifServiceCode.includes("'/profile#policies'"), 'notificationService resolves policy notifications to /profile#policies');
assert(notifServiceCode.includes("case 'POLICY_OVERDUE':"), 'notificationService handles POLICY_OVERDUE notification type');
assert(notifServiceCode.includes("case 'POLICY_ASSIGNED':"), 'notificationService handles POLICY_ASSIGNED notification type');

// 5. policyService.js employee methods
const policyServicePath = path.join(__dirname, 'src', 'services', 'policyService.js');
const policyServiceCode = fs.readFileSync(policyServicePath, 'utf8');
assert(policyServiceCode.includes('getMyAssignments'), 'policyService exports getMyAssignments');
assert(policyServiceCode.includes('getMyAcknowledgements'), 'policyService exports getMyAcknowledgements');
assert(policyServiceCode.includes('getEmployeeCategories'), 'policyService exports getEmployeeCategories');

// 6. Backend Stage 5 endpoints & notification URL
const backendRoot = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms');
const empCtrlCode = fs.readFileSync(path.join(backendRoot, 'controller', 'PolicyEmployeeController.java'), 'utf8');
assert(empCtrlCode.includes('@GetMapping("/my-assignments")'), 'PolicyEmployeeController exposes GET /api/policies/my-assignments');
assert(empCtrlCode.includes('@GetMapping("/my-acknowledgements")'), 'PolicyEmployeeController exposes GET /api/policies/my-acknowledgements');

const svcImplCode = fs.readFileSync(path.join(backendRoot, 'service', 'PolicyServiceImpl.java'), 'utf8');
assert(!svcImplCode.includes('"/employee/policies"'), 'PolicyServiceImpl no longer routes reminder notifications to /employee/policies');
assert(svcImplCode.includes('"/profile#policies"'), 'PolicyServiceImpl routes employee policy notifications to /profile#policies');

console.log(`\n=======================================================`);
console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log(`=======================================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
