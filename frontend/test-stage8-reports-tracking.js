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

console.log('\n=============================================================================');
console.log(' Fairmacs KMS Stage 8: Acknowledgement Reports & Tracking Verification Suite');
console.log('=============================================================================\n');

// =============================================================================
// PART 1: API Integration & Service Endpoint Coverage
// =============================================================================
console.log('--- Part 1: API Integration & Service Methods Coverage ---');

const serviceSrc = fs.readFileSync(path.join(__dirname, 'src', 'services', 'policyService.js'), 'utf-8');

// HR Reporting Methods Verification
assert(serviceSrc.includes('async getReportsOverview('), 'policyService implements getReportsOverview()');
assert(serviceSrc.includes('async getDepartmentReports('), 'policyService implements getDepartmentReports()');
assert(serviceSrc.includes('async getDocumentReports('), 'policyService implements getDocumentReports()');
assert(serviceSrc.includes('async getEmployeeReports('), 'policyService implements getEmployeeReports()');
assert(serviceSrc.includes('async getEmployeeHistory('), 'policyService implements getEmployeeHistory()');
assert(serviceSrc.includes('async exportComplianceExcel('), 'policyService implements exportComplianceExcel()');

// Manager Reporting Methods Verification
assert(serviceSrc.includes('async getManagerDepartmentReports('), 'policyService implements getManagerDepartmentReports()');
assert(serviceSrc.includes('async getManagerDocumentReports('), 'policyService implements getManagerDocumentReports()');
assert(serviceSrc.includes('async getManagerEmployeeReports('), 'policyService implements getManagerEmployeeReports()');
assert(serviceSrc.includes('async getManagerEmployeeHistory('), 'policyService implements getManagerEmployeeHistory()');
assert(serviceSrc.includes('async exportManagerComplianceExcel('), 'policyService implements exportManagerComplianceExcel()');

// Endpoint URL bindings
assert(serviceSrc.includes("hrRequest('/reports/overview')"), 'getReportsOverview binds to /hr/policies/reports/overview');
assert(serviceSrc.includes("hrRequest(`/reports/departments"), 'getDepartmentReports binds to /hr/policies/reports/departments');
assert(serviceSrc.includes("hrRequest(`/reports/documents"), 'getDocumentReports binds to /hr/policies/reports/documents');
assert(serviceSrc.includes("hrRequest(`/reports/employees"), 'getEmployeeReports binds to /hr/policies/reports/employees');
assert(serviceSrc.includes("hrRequest(`/reports/employees/${employeeId}/history`)"), 'getEmployeeHistory binds to /hr/policies/reports/employees/{id}/history');
assert(serviceSrc.includes("${HR_POLICY_BASE}/reports/export"), 'exportComplianceExcel calls HR export endpoint');

assert(serviceSrc.includes("managerRequest(`/reports/departments"), 'getManagerDepartmentReports binds to /manager/policies/reports/departments');
assert(serviceSrc.includes("managerRequest(`/reports/documents"), 'getManagerDocumentReports binds to /manager/policies/reports/documents');
assert(serviceSrc.includes("managerRequest(`/reports/employees"), 'getManagerEmployeeReports binds to /manager/policies/reports/employees');
assert(serviceSrc.includes("managerRequest(`/reports/employees/${employeeId}/history`)"), 'getManagerEmployeeHistory binds to /manager/policies/reports/employees/{id}/history');
assert(serviceSrc.includes("${MANAGER_POLICY_BASE}/reports/export"), 'exportManagerComplianceExcel calls Manager export endpoint');

// Verify Blob Response and Excel Filename Handling
assert(serviceSrc.includes("policy_compliance_report_") && serviceSrc.includes(".xlsx"), 'HR export downloads .xlsx file with proper naming');
assert(serviceSrc.includes("department_compliance_report_") && serviceSrc.includes(".xlsx"), 'Manager export downloads .xlsx file with proper naming');

// =============================================================================
// PART 2: HR Dashboard Structure & 4-Section Architecture
// =============================================================================
console.log('\n--- Part 2: HR Dashboard 4-Section Architecture ---');
const hrTabSrc = fs.readFileSync(path.join(__dirname, 'src', 'components', 'policies', 'PolicyReportsTab.jsx'), 'utf-8');

// Section A: Overview Metrics
assert(hrTabSrc.includes('Section A: Organisation Overview Metrics'), 'PolicyReportsTab renders Section A (KPI Overview)');
assert(hrTabSrc.includes('totalActiveEmployees'), 'Section A displays Total Active Staff from API');
assert(hrTabSrc.includes('totalPublished'), 'Section A displays Published Docs count from API');
assert(hrTabSrc.includes('mandatoryCompliancePercentage'), 'Section A displays Mandatory Compliance Rate from API');
assert(hrTabSrc.includes('optionalCompliancePercentage'), 'Section A displays Optional Acknowledgement Rate from API');
assert(hrTabSrc.includes('totalPending'), 'Section A displays Total Pending Actions from API');
assert(hrTabSrc.includes('totalOverdue'), 'Section A displays Total Overdue Deadlines from API');

// Section B: Department Compliance
assert(hrTabSrc.includes('Section B: Department-Wise Compliance Breakdown'), 'PolicyReportsTab renders Section B (Department Breakdown)');
assert(hrTabSrc.includes('totalEligibleEmployees'), 'Department table displays eligible employees');
assert(hrTabSrc.includes('compliancePercentage'), 'Department table displays department compliance rate');

// Section C: Document Performance
assert(hrTabSrc.includes('Section C: Document Compliance Performance'), 'PolicyReportsTab renders Section C (Document Performance)');
assert(hrTabSrc.includes('currentVersionNumber'), 'Document table displays version number');
assert(hrTabSrc.includes('docCategoryFilter'), 'Document table supports category filtering');
assert(hrTabSrc.includes('docTypeFilter'), 'Document table supports mandatory/optional filtering');

// Section D: Employee Compliance Matrix
assert(hrTabSrc.includes('Section D: Employee Compliance Matrix & Audit Drill-Down'), 'PolicyReportsTab renders Section D (Employee Matrix)');
assert(hrTabSrc.includes('empSearch'), 'Employee matrix supports search query');
assert(hrTabSrc.includes('empDeptFilter'), 'Employee matrix supports department filtering');
assert(hrTabSrc.includes('empStatusFilter'), 'Employee matrix supports compliance status filtering');
assert(hrTabSrc.includes('paginatedEmployees'), 'Employee matrix supports pagination');
assert(hrTabSrc.includes('View History'), 'Employee matrix contains View History action');
assert(hrTabSrc.includes('<PolicyEmployeeHistoryModal'), 'PolicyReportsTab integrates PolicyEmployeeHistoryModal');

// =============================================================================
// PART 3: Manager Dashboard Scoping & Hierarchy Isolation
// =============================================================================
console.log('\n--- Part 3: Manager Dashboard Scoping & Isolation ---');
const mgrTabSrc = fs.readFileSync(path.join(__dirname, 'src', 'components', 'policies', 'manager', 'PolicyManagerReportsTab.jsx'), 'utf-8');

assert(mgrTabSrc.includes('policyService.getManagerDepartmentReports'), 'Manager dashboard calls getManagerDepartmentReports');
assert(mgrTabSrc.includes('policyService.getManagerDocumentReports'), 'Manager dashboard calls getManagerDocumentReports');
assert(mgrTabSrc.includes('policyService.getManagerEmployeeReports'), 'Manager dashboard calls getManagerEmployeeReports');
assert(mgrTabSrc.includes('policyService.getManagerOverview'), 'Manager dashboard calls getManagerOverview');
assert(!mgrTabSrc.includes('getReportsOverview'), 'Manager dashboard strictly avoids HR organisation-wide overview API');
assert(!mgrTabSrc.includes('exportComplianceExcel('), 'Manager dashboard strictly avoids HR export API');
assert(mgrTabSrc.includes('exportManagerComplianceExcel'), 'Manager dashboard uses exportManagerComplianceExcel');
assert(mgrTabSrc.includes('isManager={true}'), 'Manager dashboard passes isManager={true} to history modal');

// =============================================================================
// PART 4: Employee Acknowledgement History Modal Architecture & Governance
// =============================================================================
console.log('\n--- Part 4: Employee History Modal & Governance Labels ---');
const modalSrc = fs.readFileSync(path.join(__dirname, 'src', 'components', 'policies', 'PolicyEmployeeHistoryModal.jsx'), 'utf-8');

assert(modalSrc.includes('createPortal('), 'History modal uses React createPortal');
assert(modalSrc.includes('document.body'), 'History modal targets document.body directly');
assert(modalSrc.includes('z-[99999]'), 'History modal enforces z-[99999] top-tier stacking order');
assert(modalSrc.includes('Explicitly Acknowledged'), 'Modal uses compliant label "Explicitly Acknowledged"');
assert(modalSrc.includes('Derived Compliance'), 'Modal uses compliant label "Derived Compliance"');
assert(modalSrc.includes('Pending Acknowledgement'), 'Modal uses compliant label "Pending Acknowledgement"');
assert(modalSrc.includes('Overdue Acknowledgement'), 'Modal uses compliant label "Overdue Acknowledgement"');
assert(!modalSrc.includes('Digital Signature') && !modalSrc.includes('digital signature'), 'Modal strictly avoids misleading "Digital Signature" label');
assert(modalSrc.includes('checksumSha256') || modalSrc.includes('SHA-256'), 'Modal displays cryptographic SHA-256 checksum');
assert(modalSrc.includes('derivedFromVersionNumber'), 'Modal tracks predecessor version for derived compliance');
assert(modalSrc.includes('isManager') && modalSrc.includes('getManagerEmployeeHistory') && modalSrc.includes('getEmployeeHistory'), 'Modal switches API call between HR and Manager based on role');

// =============================================================================
// SUMMARY REPORT
// =============================================================================
console.log('\n=============================================================================');
console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('=============================================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
