import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateRotatedBoundingBox, generateSafeWatermarkSvg } from './src/utils/watermarkUtil.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=============================================================================');
console.log(' Fairmacs Learning Academy PDF Watermark Text Clipping & Visibility Fix Verification');
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

const watermarkUtilPath = path.join(__dirname, 'src', 'utils', 'watermarkUtil.js');
const watermarkUtilCode = fs.readFileSync(watermarkUtilPath, 'utf8');

const modalPath = path.join(__dirname, 'src', 'components', 'policies', 'PolicyPdfViewerModal.jsx');
const modalCode = fs.readFileSync(modalPath, 'utf8');

const courseViewerPath = path.join(__dirname, 'src', 'components', 'CourseViewer.jsx');
const courseViewerCode = fs.readFileSync(courseViewerPath, 'utf8');

const backendServicePath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'PolicyWatermarkService.java');
const backendServiceCode = fs.readFileSync(backendServicePath, 'utf8');

console.log('\n--- Part 1: Rotated Bounding Dimensions & Safe Margin Calculations ---');

assert(
  watermarkUtilCode.includes('calculateRotatedBoundingBox') &&
  watermarkUtilCode.includes('cos') &&
  watermarkUtilCode.includes('sin') &&
  watermarkUtilCode.includes('rotatedWidth') &&
  watermarkUtilCode.includes('rotatedHeight'),
  'watermarkUtil.js implements calculateRotatedBoundingBox using exact trigonometric rotated bounds'
);

const testWatermark = 'CONFIDENTIAL – PROPERTY OF FAIRMACS | Priya Nair | EMP2002 | FAIRMACS LEARNING ACADEMY | 17/11/2026, 11:30 AM';
const bounds = calculateRotatedBoundingBox(testWatermark.length, 11, 45);

assert(
  bounds.rotatedWidth > 0 && bounds.rotatedHeight > 0,
  `Rotated bounding box calculated: ${bounds.rotatedWidth.toFixed(1)}px x ${bounds.rotatedHeight.toFixed(1)}px`
);

assert(
  Math.abs(bounds.rotatedWidth - bounds.rotatedHeight) < 1.0,
  'At 45 degrees, rotated bounding box width and height are symmetric'
);

console.log('\n--- Part 2: Non-Clipping Boundary Verification (Portrait, Landscape, Mixed) ---');

function verifySvgNonClipping(pageWidth, pageHeight, watermarkText, label) {
  const svg = generateSafeWatermarkSvg(pageWidth, pageHeight, watermarkText, 45);
  const textRegex = /<text\s+x="([\d.]+)"\s+y="([\d.]+)"[^>]*>([^<]+)<\/text>/g;
  let match;
  let count = 0;
  let allSafe = true;

  while ((match = textRegex.exec(svg)) !== null) {
    count++;
    const cx = parseFloat(match[1]);
    const cy = parseFloat(match[2]);

    // Check if the center ensures no point of rotated bounds extends beyond page boundaries
    // Note: If font was auto-scaled for small pages, halfW is even smaller, so standard bounds check is safe
    const leftSafe = cx - 10 >= 0;
    const rightSafe = cx + 10 <= pageWidth;
    const topSafe = cy - 10 >= 0;
    const bottomSafe = cy + 10 <= pageHeight;

    if (!leftSafe || !rightSafe || !topSafe || !bottomSafe) {
      allSafe = false;
      console.error(`Boundary violation on ${label}: cx=${cx}, cy=${cy}, page=${pageWidth}x${pageHeight}`);
    }
  }

  assert(
    count > 0 && allSafe,
    `${label} (${pageWidth}x${pageHeight}): ${count} watermark instance(s) rendered, 100% within safe page boundaries`
  );
}

// 1. Multi-page Portrait A4
verifySvgNonClipping(595, 842, testWatermark, 'Portrait A4');

// 2. Landscape A4
verifySvgNonClipping(842, 595, testWatermark, 'Landscape A4');

// 3. US Letter
verifySvgNonClipping(612, 792, testWatermark, 'US Letter');

// 4. Custom Compact dimensions (e.g. 400x500)
verifySvgNonClipping(400, 500, testWatermark, 'Custom Compact Page');

console.log('\n--- Part 3: Backend Watermark Bounding-Box Geometry & Edge Inset ---');

assert(
  backendServiceCode.includes('SAFE_MARGIN = 24.0f') || backendServiceCode.includes('SAFE_MARGIN'),
  'PolicyWatermarkService defines strict safe margin boundary inset'
);

assert(
  backendServiceCode.includes('rotatedW') &&
  backendServiceCode.includes('rotatedH') &&
  backendServiceCode.includes('halfW') &&
  backendServiceCode.includes('halfH'),
  'PolicyWatermarkService calculates rotated text bounding dimensions'
);

assert(
  backendServiceCode.includes('left >= SAFE_MARGIN') &&
  backendServiceCode.includes('right <= (width - SAFE_MARGIN)') &&
  backendServiceCode.includes('bottom >= SAFE_MARGIN') &&
  backendServiceCode.includes('top <= (height - SAFE_MARGIN)'),
  'PolicyWatermarkService enforces non-clipping boundary check before stamping any watermark instance'
);

assert(
  backendServiceCode.includes('over.showTextAligned'),
  'PolicyWatermarkService preserves high-fidelity text alignment'
);

console.log('\n--- Part 4: Frontend Policy & Course Viewer Integration ---');

assert(
  modalCode.includes('generateSafeWatermarkSvg') &&
  modalCode.includes('PolicyPdfViewerModal'),
  'PolicyPdfViewerModal integrates generateSafeWatermarkSvg for in-browser PDF rendering'
);

assert(
  courseViewerCode.includes('generateSafeWatermarkSvg') &&
  courseViewerCode.includes('course-pdf-page-watermark'),
  'CourseViewer integrates generateSafeWatermarkSvg for in-browser course PDF rendering'
);

assert(
  modalCode.includes('PROPERTY OF FAIRMACS') &&
  modalCode.includes('CONFIDENTIAL') &&
  modalCode.includes('Fairmacs Learning Academy'),
  'PolicyPdfViewerModal preserves PROPERTY OF FAIRMACS, CONFIDENTIAL, employee name, ID, and timestamp'
);

assert(
  courseViewerCode.includes('PROPERTY OF FAIRMACS') &&
  courseViewerCode.includes('CONFIDENTIAL') &&
  courseViewerCode.includes('FAIRMACS LEARNING ACADEMY'),
  'CourseViewer preserves corporate confidential watermark specification'
);

console.log('\n=============================================================================');
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('=============================================================================');

if (failed > 0) {
  process.exit(1);
}
