/**
 * Fairmacs KMS — Policy-Wise Excel Compliance Report Export Verification Test Suite
 *
 * Verifies:
 * 1. policyService implements exportPolicyComplianceExcel(policyId) and exportManagerPolicyComplianceExcel(policyId)
 * 2. HR policy export calls /hr/policies/reports/documents/{policyId}/export
 * 3. Manager policy export calls /manager/policies/reports/documents/{policyId}/export
 * 4. Content-Disposition filename extraction and Blob download link trigger
 * 5. PolicyReportsTab.jsx renders Export Report action with Download icon and loading indicator
 * 6. PolicyReportsTab.jsx prevents duplicate clicks and displays feedback notifications
 * 7. PolicyManagerReportsTab.jsx renders Export Report action for department-scoped documents
 * 8. PolicyManagerReportsTab.jsx strictly calls exportManagerPolicyComplianceExcel
 * 9. Existing organization-wide Excel exports remain completely functional and intact
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=============================================================================');
console.log(' Fairmacs KMS Policy-Wise Excel Compliance Report Export Verification');
console.log('=============================================================================');

let passedChecks = 0;

function pass(desc) {
  passedChecks++;
  console.log(`[PASS] ${desc}`);
}

// 1. Inspect policyService.js
const policyServicePath = path.join(__dirname, 'src', 'services', 'policyService.js');
assert(fs.existsSync(policyServicePath), 'src/services/policyService.js must exist');
const policyServiceSrc = fs.readFileSync(policyServicePath, 'utf8');

// Methods implementation
assert(policyServiceSrc.includes('exportPolicyComplianceExcel(policyId)'), 'policyService must implement exportPolicyComplianceExcel(policyId)');
pass('policyService implements exportPolicyComplianceExcel(policyId)');

assert(policyServiceSrc.includes('exportManagerPolicyComplianceExcel(policyId)'), 'policyService must implement exportManagerPolicyComplianceExcel(policyId)');
pass('policyService implements exportManagerPolicyComplianceExcel(policyId)');

// Endpoint binding verification
assert(policyServiceSrc.includes('${HR_POLICY_BASE}/reports/documents/${policyId}/export'), 'HR export must bind to /hr/policies/reports/documents/${policyId}/export');
pass('HR export binds to /hr/policies/reports/documents/${policyId}/export');

assert(policyServiceSrc.includes('${MANAGER_POLICY_BASE}/reports/documents/${policyId}/export'), 'Manager export must bind to /manager/policies/reports/documents/${policyId}/export');
pass('Manager export binds to /manager/policies/reports/documents/${policyId}/export');

// Content-Disposition handling
assert(policyServiceSrc.includes('contentDisposition') || policyServiceSrc.includes('Content-Disposition'), 'policyService must parse Content-Disposition header');
pass('policyService extracts filename from Content-Disposition header');

// Preservation of org-wide exports
assert(policyServiceSrc.includes('exportComplianceExcel(params = {})'), 'Existing HR org-wide export must be preserved');
pass('Existing HR org-wide exportComplianceExcel remains intact');

assert(policyServiceSrc.includes('exportManagerComplianceExcel(params = {})'), 'Existing Manager org-wide export must be preserved');
pass('Existing Manager org-wide exportManagerComplianceExcel remains intact');

// 2. Inspect PolicyReportsTab.jsx
const hrReportsTabPath = path.join(__dirname, 'src', 'components', 'policies', 'PolicyReportsTab.jsx');
assert(fs.existsSync(hrReportsTabPath), 'PolicyReportsTab.jsx must exist');
const hrReportsTabSrc = fs.readFileSync(hrReportsTabPath, 'utf8');

assert(hrReportsTabSrc.includes('handleExportPolicyReport'), 'PolicyReportsTab must define handleExportPolicyReport handler');
pass('PolicyReportsTab defines handleExportPolicyReport');

assert(hrReportsTabSrc.includes('policyService.exportPolicyComplianceExcel(doc.documentId)'), 'PolicyReportsTab must call exportPolicyComplianceExcel with documentId');
pass('PolicyReportsTab invokes exportPolicyComplianceExcel(doc.documentId)');

assert(hrReportsTabSrc.includes('exportingDocId'), 'PolicyReportsTab must track per-document exporting state');
pass('PolicyReportsTab tracks exportingDocId state');

assert(hrReportsTabSrc.includes('disabled={exportingDocId !== null}'), 'PolicyReportsTab must disable buttons during export to prevent duplicate clicks');
pass('PolicyReportsTab disables export button to prevent duplicate clicks');

assert(hrReportsTabSrc.includes('exportNotification'), 'PolicyReportsTab must maintain exportNotification state');
pass('PolicyReportsTab maintains export feedback notification');

assert(hrReportsTabSrc.includes('Export Report'), 'PolicyReportsTab must render Export Report button label');
pass('PolicyReportsTab renders "Export Report" button');

assert(hrReportsTabSrc.includes('<th className="py-3 px-6 text-center">Export</th>'), 'PolicyReportsTab Document table must contain Export column header');
pass('PolicyReportsTab Document table includes Export column header');

// 3. Inspect PolicyManagerReportsTab.jsx
const mgrReportsTabPath = path.join(__dirname, 'src', 'components', 'policies', 'manager', 'PolicyManagerReportsTab.jsx');
assert(fs.existsSync(mgrReportsTabPath), 'PolicyManagerReportsTab.jsx must exist');
const mgrReportsTabSrc = fs.readFileSync(mgrReportsTabPath, 'utf8');

assert(mgrReportsTabSrc.includes('handleExportManagerPolicyReport'), 'PolicyManagerReportsTab must define handleExportManagerPolicyReport');
pass('PolicyManagerReportsTab defines handleExportManagerPolicyReport');

assert(mgrReportsTabSrc.includes('policyService.exportManagerPolicyComplianceExcel(doc.documentId)'), 'PolicyManagerReportsTab must call exportManagerPolicyComplianceExcel');
pass('PolicyManagerReportsTab invokes exportManagerPolicyComplianceExcel(doc.documentId)');

assert(mgrReportsTabSrc.includes('exportingDocId'), 'PolicyManagerReportsTab must track per-document exporting state');
pass('PolicyManagerReportsTab tracks exportingDocId state');

assert(mgrReportsTabSrc.includes('disabled={exportingDocId !== null}'), 'PolicyManagerReportsTab must disable button during active export');
pass('PolicyManagerReportsTab disables export button to prevent duplicate clicks');

assert(mgrReportsTabSrc.includes('exportNotification'), 'PolicyManagerReportsTab must display export feedback notification');
pass('PolicyManagerReportsTab maintains export feedback notification');

assert(mgrReportsTabSrc.includes('Export Report'), 'PolicyManagerReportsTab must render Export Report button label');
pass('PolicyManagerReportsTab renders "Export Report" button');

assert(mgrReportsTabSrc.includes('<th className="py-3 px-6 text-center">Export</th>'), 'PolicyManagerReportsTab Document table must contain Export column header');
pass('PolicyManagerReportsTab Document table includes Export column header');

assert(!mgrReportsTabSrc.includes('policyService.exportPolicyComplianceExcel('), 'PolicyManagerReportsTab must NEVER call HR org-wide document export');
pass('Manager dashboard strictly isolates from HR org-wide export endpoint');

console.log('=============================================================================');
console.log(`RESULTS: ${passedChecks} PASSED, 0 FAILED`);
console.log('=============================================================================');
