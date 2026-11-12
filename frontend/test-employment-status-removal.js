import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('FAIRMACS KMS — REMOVAL OF EMPLOYMENT STATUS WORKFLOW VERIFICATION');
console.log('================================================================');

// 1. Inspect ProfilePage.jsx
console.log('\n[1/5] Verifying ProfilePage.jsx Complete Removal of Status Workflow UI...');
const profilePagePath = path.join(__dirname, 'src', 'components', 'ProfilePage.jsx');
assert(fs.existsSync(profilePagePath), 'ProfilePage.jsx must exist');
const profileContent = fs.readFileSync(profilePagePath, 'utf8');

// Section checks
assert(!profileContent.includes('id="employment-status"'), 'id="employment-status" section must be removed');
assert(!profileContent.includes('Employment Status & Approval Workflow'), 'Section heading must be removed');
assert(!profileContent.includes('Request Status Change'), 'Request Status Change button must be removed');
assert(!profileContent.includes('HR Status Override'), 'HR Status Override button must be removed from ProfilePage');
assert(!profileContent.includes('Status Transition History'), 'Status Transition History table must be removed from ProfilePage');
assert(!profileContent.includes('statusWorkflow'), 'statusWorkflow references must be removed from ProfilePage');
assert(!profileContent.includes('showStatusRequestModal'), 'showStatusRequestModal state must be removed');
assert(!profileContent.includes('showDirectStatusModal'), 'showDirectStatusModal state must be removed');
assert(!profileContent.includes('handleSubmitStatusRequest'), 'handleSubmitStatusRequest handler must be removed');
assert(!profileContent.includes('handleManagerReview'), 'handleManagerReview handler must be removed');
assert(!profileContent.includes('handleHrDecision'), 'handleHrDecision handler must be removed');
assert(!profileContent.includes('handleDirectStatusChange'), 'handleDirectStatusChange handler must be removed');

// Sub-nav check
assert(!profileContent.includes("id: 'employment-status'"), "employment-status sub-nav item must be removed");
assert(!profileContent.includes("label: 'Status & Approval'"), "Status & Approval sub-nav label must be removed");

console.log('  ✓ Verified absence of section heading, buttons, tables, modals, and handlers in ProfilePage.');

// 2. Profile Header & Employment Info Preservation
console.log('\n[2/5] Verifying Official Employee Status Record Preservation in Profile...');
assert(profileContent.includes('profile?.employmentStatus') || profileContent.includes('statusColors'), 'Must preserve official employment status badge');
assert(profileContent.includes('id="profile-header"'), 'Profile Header section preserved');
assert(profileContent.includes('id="personal-info"'), 'Personal Information section preserved');
assert(profileContent.includes('id="emergency-contacts"'), 'Emergency Contacts section preserved');
assert(profileContent.includes('id="employment-info"'), 'Employment Information section preserved');
assert(profileContent.includes('id="my-documents"'), 'My Documents section preserved');
assert(profileContent.includes('id="learning-development"'), 'Learning & Development section preserved');
assert(profileContent.includes('id="employment-timeline"'), 'Employment Timeline section preserved');
assert(!profileContent.includes('id="account-security"'), 'Account & Security section removed');
assert(!profileContent.includes('id="preferences"'), 'Preferences section removed');
assert(!profileContent.includes('aria-label="Profile Sections"'), 'Sticky sub-nav bar removed');
console.log('  ✓ Verified 7 official profile sections and absence of sub-nav, account-security, and preferences.');

// 3. Dedicated HR/Admin Employee Management Verification
console.log('\n[3/5] Verifying Dedicated HR/Admin Employee Status Management Capabilities...');
const employeeMgmtPath = path.join(__dirname, 'src', 'components', 'EmployeeManagement.jsx');
assert(fs.existsSync(employeeMgmtPath), 'EmployeeManagement.jsx must exist');
const employeeMgmtContent = fs.readFileSync(employeeMgmtPath, 'utf8');

// Verify all 4 status options
assert(employeeMgmtContent.includes('ACTIVE'), 'Must support ACTIVE status');
assert(employeeMgmtContent.includes('ON_LEAVE'), 'Must support ON_LEAVE status');
assert(employeeMgmtContent.includes('INACTIVE'), 'Must support INACTIVE status');
assert(employeeMgmtContent.includes('TERMINATED'), 'Must support TERMINATED status');

// Verify mandatory reason prompting
assert(employeeMgmtContent.includes('handleStatusChange'), 'handleStatusChange function must exist');
assert(employeeMgmtContent.includes('reason') || employeeMgmtContent.includes('prompt'), 'handleStatusChange must require mandatory reason');
console.log('  ✓ Verified HR/Admin status management with ACTIVE, ON_LEAVE, INACTIVE, and TERMINATED plus mandatory reason.');

// 4. API Services & Auth Context
console.log('\n[4/5] Verifying Service & Context Signatures for Status Management...');
const hrServicePath = path.join(__dirname, 'src', 'services', 'hrAdminService.js');
const hrServiceContent = fs.readFileSync(hrServicePath, 'utf8');
assert(hrServiceContent.includes('changeEmployeeStatus(employeeId, status, reason'), 'hrAdminService must accept status and reason');

const authContextPath = path.join(__dirname, 'src', 'context', 'AuthContext.jsx');
const authContextContent = fs.readFileSync(authContextPath, 'utf8');
assert(authContextContent.includes('changeEmployeeStatus = async (empId, newStatus, reason'), 'AuthContext must forward reason');
console.log('  ✓ Verified frontend services and AuthContext forward mandatory status reason.');

// 5. Backend Status Management & Audit History
console.log('\n[5/5] Verifying Backend Auditing and Controller Support...');
const hrControllerPath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'controller', 'HrAdminController.java');
const hrControllerContent = fs.readFileSync(hrControllerPath, 'utf8');
assert(hrControllerContent.includes('/employees/{employeeId}/status'), 'HrAdminController must handle /employees/{employeeId}/status');
assert(hrControllerContent.includes('/employees/{employeeId}/status-history'), 'HrAdminController must provide status history endpoint');

const hrAdminServicePath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'HrAdminService.java');
const hrAdminServiceContent = fs.readFileSync(hrAdminServicePath, 'utf8');
assert(hrAdminServiceContent.includes('statusHistoryRepository'), 'HrAdminService must integrate with EmploymentStatusHistoryRepository');
assert(hrAdminServiceContent.includes('EmploymentStatusHistory'), 'HrAdminService must create EmploymentStatusHistory audit records');
console.log('  ✓ Verified backend auditable status transitions and history endpoints.');

console.log('\n================================================================');
console.log('ALL EMPLOYMENT STATUS WORKFLOW REMOVAL CHECKS PASSED (5/5)');
console.log('================================================================');
