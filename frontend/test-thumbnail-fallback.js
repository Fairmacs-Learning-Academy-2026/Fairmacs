import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

import {
  DEFAULT_COURSE_THUMBNAIL,
  DEFAULT_THUMBNAIL_WORKDRIVE_URL,
  getCourseBanner,
  isDefaultThumbnail,
  handleBannerError,
} from './src/utils/courseBanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('--- Fairmacs LMS Thumbnail Fallback Verification ---');

// 1. Verify physical default thumbnail asset exists in public folder
const publicThumbnailPath = path.join(__dirname, 'public', 'fairmacs-default-thumbnail.png');
assert(fs.existsSync(publicThumbnailPath), 'Public default thumbnail image must exist on disk');
const stats = fs.statSync(publicThumbnailPath);
assert(stats.size > 10000, `Thumbnail image must be valid high-res PNG (found ${stats.size} bytes)`);
console.log(`[PASS] Default thumbnail asset verified on disk (${stats.size} bytes).`);

// 2. Custom thumbnail scenario
const customCourse = {
  id: 'CRS-001',
  title: 'Custom Course',
  banner: 'https://cdn.fairmacs.com/custom-banner.png'
};
assert.strictEqual(
  getCourseBanner(customCourse),
  'https://cdn.fairmacs.com/custom-banner.png',
  'Course with custom thumbnail must retain custom URL'
);
assert.strictEqual(
  isDefaultThumbnail(customCourse),
  false,
  'Course with custom thumbnail must not be flagged as default'
);
console.log('[PASS] Custom thumbnail preserved and displayed accurately.');

// 3. Missing thumbnail scenarios (null, undefined, empty, missing property)
const missingScenarios = [
  { id: 'CRS-002', title: 'No Banner Property' },
  { id: 'CRS-003', title: 'Null Banner', banner: null },
  { id: 'CRS-004', title: 'Empty String Banner', banner: '' },
  { id: 'CRS-005', title: 'Whitespace Banner', banner: '   ' },
  { id: 'CRS-006', title: 'Null thumbnailUrl', thumbnailUrl: null },
  null,
  undefined
];

for (const scenario of missingScenarios) {
  const result = getCourseBanner(scenario);
  assert.strictEqual(
    result,
    DEFAULT_COURSE_THUMBNAIL,
    `Missing thumbnail course must return DEFAULT_COURSE_THUMBNAIL (${JSON.stringify(scenario)})`
  );
  assert.strictEqual(
    isDefaultThumbnail(scenario),
    true,
    `Missing thumbnail course must be flagged as default (${JSON.stringify(scenario)})`
  );
}
console.log(`[PASS] All ${missingScenarios.length} missing thumbnail scenarios fall back to default Fairmacs logo.`);

// 4. WorkDrive default URL scenario
const workdriveDefaultCourse = {
  id: 'CRS-007',
  title: 'WorkDrive Default Link',
  banner: DEFAULT_THUMBNAIL_WORKDRIVE_URL
};
assert.strictEqual(
  getCourseBanner(workdriveDefaultCourse),
  DEFAULT_COURSE_THUMBNAIL,
  'Course using official WorkDrive URL must resolve to default Fairmacs logo asset'
);
assert.strictEqual(
  isDefaultThumbnail(workdriveDefaultCourse),
  true,
  'Course using official WorkDrive URL must be flagged as default'
);
console.log('[PASS] Official WorkDrive URL https://workdrive.zoho.com/file/uxhlk57c56d1fba87474680a8259345370bb6 mapped to default asset.');

// 5. WorkDrive custom file ID scenario (proxied through backend to stream direct bytes)
const workdriveCustomCourse = {
  id: 'CRS-008',
  title: 'WorkDrive Custom Link',
  banner: 'https://workdrive.zoho.com/file/abc123customfileid'
};
const resolvedWorkdriveCustom = getCourseBanner(workdriveCustomCourse);
assert(
  resolvedWorkdriveCustom.includes('/api/courses/thumbnails/workdrive/abc123customfileid'),
  `Custom WorkDrive file must route via backend proxy to stream bytes without HTML redirect. Got: ${resolvedWorkdriveCustom}`
);
console.log('[PASS] Custom WorkDrive links routed via backend proxy stream.');

// 6. Broken / Unavailable image error handler scenario (onError simulation)
const brokenImgMock = {
  src: 'https://broken.domain.com/missing-image.png',
  dataset: {},
  style: { objectFit: 'cover' },
  onerror: () => {}
};
const mockEvent = { currentTarget: brokenImgMock };

handleBannerError(mockEvent, customCourse);
assert.strictEqual(
  brokenImgMock.src,
  DEFAULT_COURSE_THUMBNAIL,
  'handleBannerError must switch image src to DEFAULT_COURSE_THUMBNAIL'
);
assert.strictEqual(
  brokenImgMock.style.objectFit,
  'contain',
  'handleBannerError must adjust objectFit to contain for no distortion'
);
assert.strictEqual(
  brokenImgMock.style.backgroundColor,
  '#ffffff',
  'handleBannerError must set clean white background for default logo'
);
console.log('[PASS] Broken custom thumbnail onError handler falls back cleanly with contain object-fit.');

// 7. Verify infinite loop prevention on repeated error
handleBannerError(mockEvent, customCourse);
assert.strictEqual(
  brokenImgMock.onerror,
  null,
  'Repeated error must clear onerror handler to avoid infinite loop'
);
console.log('[PASS] Infinite loop prevention verified.');

console.log('--- ALL FRONTEND THUMBNAIL FALLBACK TESTS PASSED ---');
