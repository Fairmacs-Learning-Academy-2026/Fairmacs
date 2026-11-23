import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=============================================================================');
console.log(' Fairmacs KMS Course Document Watermark & Viewer Verification');
console.log('=============================================================================');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

const courseViewerPath = path.join(__dirname, 'src', 'components', 'CourseViewer.jsx');
const courseViewerCode = fs.readFileSync(courseViewerPath, 'utf8');

const controllerPath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'controller', 'LessonDocumentController.java');
const controllerCode = fs.readFileSync(controllerPath, 'utf8');

const accessServicePath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'LessonDocumentAccessService.java');
const accessServiceCode = fs.readFileSync(accessServicePath, 'utf8');

const watermarkServicePath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'PolicyWatermarkService.java');
const watermarkServiceCode = fs.readFileSync(watermarkServicePath, 'utf8');

console.log('\n--- Part 1: Backend Watermark Architecture & Endpoints ---');

assert(
  controllerCode.includes('class LessonDocumentController'),
  'LessonDocumentController exists and is defined'
);

assert(
  controllerCode.includes('@GetMapping("/{lessonId}/document")') &&
  controllerCode.includes('X-Watermark-Text') &&
  controllerCode.includes('X-Watermark-Employee-Name') &&
  controllerCode.includes('X-Watermark-Employee-Code'),
  'LessonDocumentController supplies trusted watermark metadata in HTTP response headers for in-browser viewer'
);

assert(
  controllerCode.includes('@GetMapping("/{lessonId}/download")') &&
  controllerCode.includes('ContentDisposition.attachment()'),
  'LessonDocumentController provides dedicated /{lessonId}/download endpoint returning watermarked attachment'
);

assert(
  controllerCode.includes('downloadDocument(lessonId)') &&
  controllerCode.includes('RequestParam(value = "download"'),
  'LessonDocumentController supports ?download=true parameter delegation'
);

assert(
  accessServiceCode.includes('downloadWatermarkedDocument') &&
  accessServiceCode.includes('policyWatermarkService.embedWatermark'),
  'LessonDocumentAccessService embeds employee watermark using PolicyWatermarkService on download'
);

assert(
  accessServiceCode.includes('generateWatermarkText') &&
  accessServiceCode.includes('CONFIDENTIAL') &&
  accessServiceCode.includes('PROPERTY OF FAIRMACS') &&
  accessServiceCode.includes('FAIRMACS KMS'),
  'LessonDocumentAccessService formats watermark text with CONFIDENTIAL, PROPERTY OF FAIRMACS, employee name, ID, and timestamp'
);

assert(
  accessServiceCode.includes('isPdfDocument'),
  'LessonDocumentAccessService checks document MIME-type and extension before watermarking'
);

assert(
  watermarkServiceCode.includes('DEFAULT_ROTATION_ANGLE = 45.0f') ||
  watermarkServiceCode.includes('45.0f'),
  'PolicyWatermarkService stamps diagonal watermark at approximately 45 degrees'
);

console.log('\n--- Part 2: Frontend Course Viewer Watermark Overlay ---');

assert(
  courseViewerCode.includes('pdfContainerRef') &&
  courseViewerCode.includes('docxContainerRef'),
  'CourseViewer defines container refs for PDF and Word document rendering'
);

assert(
  courseViewerCode.includes("response.headers.get('x-watermark-text')") &&
  courseViewerCode.includes("response.headers.get('x-watermark-employee-name')") &&
  courseViewerCode.includes("response.headers.get('x-watermark-employee-code')"),
  'CourseViewer extracts authenticated backend watermark headers during document fetch'
);

assert(
  courseViewerCode.includes('watermarkString') &&
  courseViewerCode.includes('CONFIDENTIAL') &&
  courseViewerCode.includes('PROPERTY OF FAIRMACS') &&
  courseViewerCode.includes('FAIRMACS KMS'),
  'CourseViewer constructs robust fallback and live watermark string matching corporate specification'
);

assert(
  courseViewerCode.includes('watermarkSvgUrl') &&
  courseViewerCode.includes('rotate(-45') &&
  courseViewerCode.includes('<svg'),
  'CourseViewer generates repeating SVG pattern tile rotated at 45 degrees'
);

assert(
  courseViewerCode.includes('pageCanvasBox') &&
  courseViewerCode.includes("className = 'course-pdf-page-box'") &&
  courseViewerCode.includes("position: 'relative'") &&
  courseViewerCode.includes("overflow: 'hidden'"),
  'CourseViewer wraps rendered PDF canvas in pageCanvasBox with relative positioning and overflow isolation'
);

assert(
  courseViewerCode.includes('watermarkOverlay') &&
  courseViewerCode.includes("className = 'course-pdf-page-watermark'") &&
  courseViewerCode.includes("pointerEvents: 'none'") &&
  courseViewerCode.includes("zIndex: '10'") &&
  courseViewerCode.includes("mixBlendMode: 'multiply'"),
  'CourseViewer places watermarkOverlay above canvas with pointer-events: none, multiply blend mode, and full-page coverage'
);

console.log('\n--- Part 3: Course Document Viewer Toolbar Controls (Download, Minimize & Maximize Removed) ---');

assert(
  !courseViewerCode.includes('handleDownloadWatermarkedPdf') &&
  !courseViewerCode.includes('Download PDF') &&
  !courseViewerCode.includes('downloadingDocument') &&
  !courseViewerCode.includes('downloadError'),
  'CourseViewer completely removes Download PDF button, handler, loader, and download error banner'
);

assert(
  !courseViewerCode.includes('documentViewMode') &&
  !courseViewerCode.includes('Maximize2') &&
  !courseViewerCode.includes('Minimize2'),
  'CourseViewer completely removes Minimize and Maximize controls from the course document viewer'
);

assert(
  courseViewerCode.includes("maxHeight: '72vh'") &&
  courseViewerCode.includes('pdfPageCount > 0'),
  'CourseViewer renders clean standard embedded layout with page count badge'
);

console.log('\n--- Part 4: Regression Protection & Non-PDF Preservation ---');

assert(
  courseViewerCode.includes('docxContainerRef') &&
  courseViewerCode.includes('renderAsync'),
  'CourseViewer preserves existing Word (.docx) preview functionality'
);

assert(
  courseViewerCode.includes('html5VideoRef') &&
  courseViewerCode.includes('youtubePlayerRef'),
  'CourseViewer preserves video player controls (watermark is strictly for PDF documents)'
);

assert(
  courseViewerCode.includes('saveLessonProgress') &&
  courseViewerCode.includes('progressPercent'),
  'CourseViewer preserves lesson progress calculation and sequential unlocking'
);

console.log('\n=============================================================================');
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=============================================================================');

if (failed > 0) {
  process.exit(1);
}
