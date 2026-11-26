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

console.log('\n--- Fairmacs KMS Stage 6: Secure PDF Viewer & Formal Acknowledgement Verification ---\n');

// 1. PolicyPdfViewerModal.jsx verification
const modalPath = path.join(__dirname, 'src', 'components', 'policies', 'PolicyPdfViewerModal.jsx');
assert(fs.existsSync(modalPath), 'PolicyPdfViewerModal.jsx exists');
const modalCode = fs.readFileSync(modalPath, 'utf8');

// PDF.js engine integration
assert(modalCode.includes("import * as pdfjsLib from 'pdfjs-dist'"), 'PolicyPdfViewerModal imports pdfjs-dist');
assert(modalCode.includes('pdfWorkerUrl'), 'PolicyPdfViewerModal imports pdf.worker');
assert(modalCode.includes('pdfjsLib.GlobalWorkerOptions.workerSrc'), 'PolicyPdfViewerModal configures GlobalWorkerOptions');
assert(modalCode.includes('pdfjsLib.getDocument'), 'PolicyPdfViewerModal loads PDF data using pdfjsLib.getDocument');

// Multi-page, zoom, and fallback
assert(modalCode.includes('numPages'), 'PolicyPdfViewerModal supports multi-page detection');
assert(modalCode.includes('handleZoomIn'), 'PolicyPdfViewerModal provides Zoom In action');
assert(modalCode.includes('handleZoomOut'), 'PolicyPdfViewerModal provides Zoom Out action');
assert(modalCode.includes('handleResetZoom'), 'PolicyPdfViewerModal provides Reset Zoom action');
assert(modalCode.includes('useIframeFallback'), 'PolicyPdfViewerModal provides fallback rendering when canvas unavailable');
assert(modalCode.includes('window.URL.revokeObjectURL'), 'PolicyPdfViewerModal revokes object URLs on cleanup');

// Authenticated Per-Page Watermark Overlay
assert(modalCode.includes('useAuth'), 'PolicyPdfViewerModal uses authenticated AuthContext');
assert(modalCode.includes('watermarkString') || modalCode.includes('CONFIDENTIAL'), 'PolicyPdfViewerModal constructs confidential watermark');
assert(modalCode.includes('employeeName') && modalCode.includes('employeeId'), 'Watermark contains authenticated employee name and employee ID');
assert(modalCode.includes('Fairmacs Learning Academy'), 'Watermark contains Fairmacs Learning Academy branding');
assert(modalCode.includes('pointer-events-none'), 'Watermark overlay has pointer-events-none so it does not block navigation');
assert(modalCode.includes('select-none'), 'Watermark overlay has select-none to prevent selection interference');
assert(modalCode.includes('policy-pdf-page-watermark'), 'Watermark is implemented as a per-page overlay attached to each rendered page');
assert(modalCode.includes('pageCanvasBox.appendChild(watermarkOverlay)'), 'Watermark overlay is appended directly to each individual page canvas container');
assert(modalCode.includes('mixBlendMode') || modalCode.includes('multiply'), 'Watermark uses multiply blend mode for clean visibility over document text');
assert(modalCode.includes('overflow: \'hidden\'') || modalCode.includes('overflow: "hidden"'), 'Page canvas box contains watermark strictly within page edges');
assert(modalCode.includes('createPortal'), 'PolicyPdfViewerModal uses React createPortal to mount to document.body');
assert(modalCode.includes('z-[99999]'), 'PolicyPdfViewerModal uses top-tier stacking order z-[99999] above global navigation header');

// Fixed Header & Independent Scrolling Layout (Header / Content Alignment)
assert(modalCode.includes('relative z-30') && modalCode.includes('shrink-0'), 'Modal header is fixed at top with high stacking context');
assert(modalCode.includes('min-h-0') && modalCode.includes('flex-1'), 'Scrollable viewer content area uses flex-1 min-h-0 for precise height calculation');
assert(modalCode.includes('overflow-y-auto'), 'Viewer content area is independently scrollable');
assert(modalCode.includes('h-[92vh]') || modalCode.includes('h-[95vh]'), 'Modal container constrained to viewport height');

// Checkbox and Explicit Acknowledgement
assert(
  modalCode.includes('I confirm that I have read and understood this policy/agreement and acknowledge its contents.'),
  'PolicyPdfViewerModal contains explicit confirmation checkbox wording'
);
assert(modalCode.includes('const [confirmed, setConfirmed] = useState(false)'), 'Acknowledgement checkbox is unchecked by default');
assert(modalCode.includes('disabled={!confirmed || submittingAck}'), 'Accept & Continue button is disabled until checkbox is checked');
assert(modalCode.includes('handleAcknowledge'), 'PolicyPdfViewerModal implements handleAcknowledge submission');
assert(modalCode.includes('policyService.acknowledgePolicy'), 'PolicyPdfViewerModal calls policyService.acknowledgePolicy');
assert(modalCode.includes('submittingAck'), 'PolicyPdfViewerModal tracks submitting loading state to prevent double submission');
assert(modalCode.includes('onAcknowledged'), 'PolicyPdfViewerModal triggers onAcknowledged callback upon successful acceptance');

// Download Restriction Enforcement
assert(modalCode.includes('allowDownload'), 'PolicyPdfViewerModal respects allowDownload prop');
assert(modalCode.includes('if (!allowDownload) return;'), 'Download action is blocked when allowDownload is false');

// 2. policyService.js verification
const servicePath = path.join(__dirname, 'src', 'services', 'policyService.js');
const serviceCode = fs.readFileSync(servicePath, 'utf8');

assert(serviceCode.includes('acknowledgePolicy(assignmentId'), 'policyService exports acknowledgePolicy method');
assert(serviceCode.includes("method: 'POST'"), 'acknowledgePolicy sends HTTP POST request');
assert(serviceCode.includes('confirmed: true'), 'acknowledgePolicy passes confirmed: true in request payload');
assert(serviceCode.includes('fetchPdfBlob(versionId)'), 'policyService exports fetchPdfBlob for in-app viewing');
assert(serviceCode.includes('handleUnauthorized(true)'), 'fetchPdfBlob handles session expiration (401)');
assert(serviceCode.includes('downloadPdf(versionId'), 'policyService exports downloadPdf');

// 3. EmployeePoliciesSection.jsx integration
const empSectionPath = path.join(__dirname, 'src', 'components', 'policies', 'employee', 'EmployeePoliciesSection.jsx');
const empSectionCode = fs.readFileSync(empSectionPath, 'utf8');

assert(empSectionCode.includes('<PolicyPdfViewerModal'), 'EmployeePoliciesSection renders PolicyPdfViewerModal');
assert(empSectionCode.includes('assignmentId={pdfModal.assignmentId}'), 'Passes assignmentId to PolicyPdfViewerModal');
assert(empSectionCode.includes('onAcknowledged={handleAcknowledgementSuccess}'), 'Passes onAcknowledged handler to PolicyPdfViewerModal');
assert(
  empSectionCode.includes('Review &amp; Acknowledge') || empSectionCode.includes('Review & Acknowledge'),
  'Provides active Review & Acknowledge button for pending policies'
);
assert(empSectionCode.includes('handleAcknowledgementSuccess'), 'Implements handleAcknowledgementSuccess handler');
assert(empSectionCode.includes("complianceStatus: 'ACKNOWLEDGED'"), 'Updates local assignment state to ACKNOWLEDGED immediately');
assert(empSectionCode.includes('loadEmployeePolicies'), 'Re-syncs employee policies from backend after acknowledgement');

// 4. Backend PolicyServiceImpl.java verification
const backendServicePath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'PolicyServiceImpl.java');
const backendServiceCode = fs.readFileSync(backendServicePath, 'utf8');

assert(backendServiceCode.includes('acknowledgePolicy('), 'PolicyServiceImpl implements acknowledgePolicy');
assert(backendServiceCode.includes('Cannot acknowledge another employee\'s assignment'), 'Backend blocks cross-employee acknowledgement with 403');
assert(backendServiceCode.includes('Policy document is not published or has been archived'), 'Backend blocks acknowledgement of unpublished or archived policies');
assert(backendServiceCode.includes('Inactive or terminated employee cannot acknowledge policy'), 'Backend blocks inactive or terminated employee acknowledgement');
assert(backendServiceCode.includes('Explicit confirmation is required to acknowledge this policy'), 'Backend verifies explicit confirmation flag');
assert(backendServiceCode.includes('acknowledgementRepo.findByPolicyVersionIdAndEmployeeUserId'), 'Backend enforces idempotent duplicate prevention');
assert(backendServiceCode.includes('ack.setAcceptedAt(LocalDateTime.now())'), 'Backend uses server-generated timestamps');
assert(backendServiceCode.includes('ack.setDocumentSha256Hash'), 'Backend preserves document SHA-256 hash');
assert(backendServiceCode.includes('"POLICY_ACKNOWLEDGED"'), 'Backend logs POLICY_ACKNOWLEDGED audit trail');
assert(backendServiceCode.includes('verifyUserAccessToVersion('), 'Backend enforces document viewing access control');

// 5. Policy Modals Positioning, Portal, and Alignment Standards Verification
const createModalPath = path.join(__dirname, 'src', 'components', 'policies', 'PolicyCreateModal.jsx');
assert(fs.existsSync(createModalPath), 'PolicyCreateModal.jsx exists');
const createModalCode = fs.readFileSync(createModalPath, 'utf8');

assert(createModalCode.includes('createPortal'), 'PolicyCreateModal uses React createPortal to mount to document.body');
assert(createModalCode.includes('z-[99999]'), 'PolicyCreateModal uses z-[99999] top-tier stacking order above global header');
assert(createModalCode.includes('bg-slate-900') && createModalCode.includes('text-white'), 'PolicyCreateModal header uses dark navy background');
assert(createModalCode.includes('sm:grid-cols-2'), 'PolicyCreateModal places Category and Owning Department in balanced 2-column grid');
assert(createModalCode.includes('border-dashed'), 'PolicyCreateModal PDF upload section uses full-width dashed upload dropzone');
assert(createModalCode.includes('bg-slate-50') || createModalCode.includes('bg-slate-900/60'), 'PolicyCreateModal footer uses light background');
assert(createModalCode.includes('Cancel') && createModalCode.includes('Save Draft') && createModalCode.includes('Upload'), 'PolicyCreateModal footer aligns Cancel to left, Save Draft & Upload to right');
assert(createModalCode.includes('min-h-0') && createModalCode.includes('overflow-y-auto'), 'PolicyCreateModal form content scrolls independently with fixed header/footer');

const publishModalPath = path.join(__dirname, 'src', 'components', 'policies', 'PolicyPublishModal.jsx');
const publishModalCode = fs.readFileSync(publishModalPath, 'utf8');
assert(publishModalCode.includes('createPortal'), 'PolicyPublishModal uses React createPortal to mount to document.body');
assert(publishModalCode.includes('z-[99999]'), 'PolicyPublishModal uses z-[99999] top-tier stacking order above global header');

const historyModalPath = path.join(__dirname, 'src', 'components', 'policies', 'PolicyVersionHistoryModal.jsx');
const historyModalCode = fs.readFileSync(historyModalPath, 'utf8');
assert(historyModalCode.includes('createPortal'), 'PolicyVersionHistoryModal uses React createPortal to mount to document.body');
assert(historyModalCode.includes('z-[99999]'), 'PolicyVersionHistoryModal uses z-[99999] top-tier stacking order above global header');

const mgrSubmitModalPath = path.join(__dirname, 'src', 'components', 'policies', 'manager', 'PolicyManagerSubmitModal.jsx');
const mgrSubmitModalCode = fs.readFileSync(mgrSubmitModalPath, 'utf8');
assert(mgrSubmitModalCode.includes('createPortal'), 'PolicyManagerSubmitModal uses React createPortal to mount to document.body');
assert(mgrSubmitModalCode.includes('z-[99999]'), 'PolicyManagerSubmitModal uses z-[99999] top-tier stacking order above global header');

const approvalTabPath = path.join(__dirname, 'src', 'components', 'policies', 'PolicyApprovalTab.jsx');
const approvalTabCode = fs.readFileSync(approvalTabPath, 'utf8');
assert(approvalTabCode.includes('createPortal'), 'PolicyApprovalTab decision modal uses React createPortal to mount to document.body');
assert(approvalTabCode.includes('z-[99999]'), 'PolicyApprovalTab decision modal uses z-[99999] top-tier stacking order above global header');

console.log('\n=======================================================');
console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('=======================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
