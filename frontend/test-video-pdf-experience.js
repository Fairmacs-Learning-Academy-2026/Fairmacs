import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const courseViewerPath = path.join(__dirname, 'src', 'components', 'CourseViewer.jsx');
const source = fs.readFileSync(courseViewerPath, 'utf8');

console.log('Running Phase 5 Step 3 Video & PDF Learning Experience verification...');

// 1. PDF.js toolbar-free canvas viewer verification
assert.ok(
  source.includes("import * as pdfjsLib from 'pdfjs-dist'"),
  'CourseViewer.jsx must import pdfjs-dist for controlled canvas PDF rendering'
);
assert.ok(
  source.includes('pdfjsLib.getDocument({ data: arrayBuffer })'),
  'CourseViewer.jsx must render PDF bytes via pdfjsLib.getDocument'
);
assert.ok(
  source.includes("document.createElement('canvas')"),
  'CourseViewer.jsx must render PDF pages onto <canvas> elements'
);
assert.ok(
  !source.includes('src={documentUrl}'),
  'CourseViewer.jsx must NOT use native browser <iframe src={documentUrl} /> which exposes browser PDF toolbar'
);
assert.ok(
  source.includes('parseFilenameFromHeaders'),
  'CourseViewer.jsx must preserve original uploaded filename from response headers'
);

// 2. Explicit PDF lesson completion verification
assert.ok(
  source.includes('Mark Lesson Complete'),
  'PDF lessons must require clicking Mark Lesson Complete'
);
assert.ok(
  source.includes('const handleDocumentComplete = async () =>'),
  'Document completion handler must only run when explicitly invoked'
);

// 3. Page Visibility API automatic pause & resume + autoplay restriction fallback
assert.ok(
  source.includes("document.addEventListener('visibilitychange', handleVisibilityChange)"),
  'CourseViewer.jsx must register visibilitychange listener for automatic tab-switch pause/resume'
);
assert.ok(
  source.includes("document.removeEventListener('visibilitychange', handleVisibilityChange)"),
  'CourseViewer.jsx must clean up visibilitychange listener on unmount'
);
assert.ok(
  source.includes("document.visibilityState === 'hidden'") &&
    source.includes("document.visibilityState === 'visible'"),
  'CourseViewer.jsx must handle both hidden and visible Page Visibility states'
);
assert.ok(
  source.includes('wasPlayingBeforeHideRef') && source.includes('wasManuallyPausedRef'),
  'CourseViewer.jsx must distinguish active playback from manual pause before tab switch'
);
assert.ok(
  source.includes('Resume Video') && source.includes('handleResumeFromAutoplayBlock'),
  'CourseViewer.jsx must provide a Resume Video fallback button if browser blocks automatic resume'
);

// 4. HTML5 Video Player controls & playback speeds
assert.ok(
  source.includes('const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]'),
  'CourseViewer.jsx must support playback speeds 0.5x to 2x'
);
assert.ok(
  source.includes('handleTogglePlayPause') &&
    source.includes('handleToggleMute') &&
    source.includes('handleVolumeChange') &&
    source.includes('handlePlaybackRateChange') &&
    source.includes('handleToggleFullscreen'),
  'CourseViewer.jsx must implement play/pause, volume, speed, and fullscreen controls'
);

// 5. YouTube Player imperative container & error handling
assert.ok(
  source.includes('ref={youtubeIframeRef}') && source.includes("document.createElement('iframe')"),
  'CourseViewer.jsx must manage YouTube iframe imperatively inside youtubeIframeRef container'
);
assert.ok(
  source.includes('setYoutubeError'),
  'CourseViewer.jsx must surface unavailable-video errors for YouTube lessons'
);

// 6. Elimination of empty locked container and preservation of legitimate locked states
assert.ok(
  !source.includes('#fff7f7'),
  'CourseViewer.jsx must NOT render redundant empty pink locked container (#fff7f7)'
);
assert.ok(
  source.includes('Assessment Locked') && source.includes('Locked · '),
  'CourseViewer.jsx must preserve legitimate quiz and assessment locked indicators'
);

console.log('All 12 Phase 5 Step 3 Video & PDF assertions passed!');
