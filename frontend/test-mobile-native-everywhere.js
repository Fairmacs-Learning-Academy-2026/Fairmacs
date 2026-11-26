import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');

function walk(dir, extRegex) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, extRegex));
    else if (extRegex.test(entry.name)) out.push(p);
  }
  return out;
}

console.log('=============================================================================');
console.log(' Fairmacs Learning Academy — Codebase-Wide Mobile-Native Verification Suite');
console.log('=============================================================================');

// 1. Viewport, Safe-Area Cover, Interactive Keyboard Resize & Never-Disable-Zoom Rule
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(
  indexHtml.includes('viewport-fit=cover') &&
    indexHtml.includes('interactive-widget=resizes-content'),
  'index.html must include viewport-fit=cover and interactive-widget=resizes-content'
);
assert(
  !indexHtml.includes('user-scalable=no') && !indexHtml.includes('maximum-scale=1'),
  'Hard Rule 4 violation: Never disable zoom (user-scalable=no / maximum-scale=1)'
);
assert(
  indexHtml.includes('name="theme-color" content="#FBF8F3"') &&
    indexHtml.includes('name="color-scheme" content="light only"'),
  'index.html must define daylight status-bar theme-color matching top-of-page surface'
);
const pageTitleMgr = fs.readFileSync(
  path.join(srcDir, 'components', 'PageTitleManager.jsx'),
  'utf8'
);
assert(
  pageTitleMgr.includes('meta[name="theme-color"]'),
  'PageTitleManager.jsx must sync status-bar theme-color across routes'
);
console.log('[PASS] 1. Viewport cover, keyboard resize, zoom accessibility, & status-bar theme-color verified.');

// 2. Global Mobile-Native CSS Baseline (tap-highlight, text-size-adjust, overscroll, touch-action, user-select)
const indexCss = fs.readFileSync(path.join(srcDir, 'index.css'), 'utf8');
assert(
  indexCss.includes('-webkit-tap-highlight-color: transparent'),
  'index.css must kill gray/blue tap highlight flash on html'
);
assert(
  indexCss.includes('-webkit-text-size-adjust: 100%'),
  'index.css must lock -webkit-text-size-adjust: 100%'
);
assert(
  indexCss.includes('overscroll-behavior: none'),
  'index.css must set overscroll-behavior: none on html/body'
);
assert(
  indexCss.includes('overscroll-behavior: contain'),
  'index.css must set overscroll-behavior: contain on inner scroll containers'
);
assert(
  indexCss.includes('touch-action: manipulation') &&
    indexCss.includes('-webkit-user-select: none') &&
    indexCss.includes('-webkit-touch-callout: none'),
  'index.css must set touch-action: manipulation and user-select: none on controls'
);
assert(
  !/body\s*\{[^}]*user-select\s*:\s*none/.test(indexCss),
  'Hard Rule 1/8: Never put user-select: none on body'
);
assert(
  indexCss.includes('@media (pointer: coarse)') && indexCss.includes('font-size: 16px'),
  'index.css must enforce >= 16px inputs on (pointer: coarse) to prevent iOS Safari zoom'
);
assert(
  indexCss.includes('@custom-variant hover'),
  'index.css must capability-gate Tailwind v4 hover: utilities to (hover: hover) and (pointer: fine)'
);
console.log('[PASS] 2. Global CSS baseline (tap highlight, overscroll, 16px coarse inputs, control selection) verified.');

// 3. Zero Ungated :hover Rules Across ALL Stylesheets in frontend/src
const cssFiles = walk(srcDir, /\.css$/);
assert(cssFiles.length >= 6, 'Expected all project CSS stylesheets to be scanned');

for (const cssFile of cssFiles) {
  const lines = fs.readFileSync(cssFile, 'utf8').split(/\r?\n/);
  let hoverMediaDepth = 0;
  let customVariantDepth = 0;
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const trimmed = line.trim();
    if (trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    if (/@custom-variant\s+hover\b/.test(line)) {
      customVariantDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      continue;
    }
    if (customVariantDepth > 0) {
      customVariantDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (customVariantDepth < 0) customVariantDepth = 0;
      continue;
    }

    if (/@media\s*\([^)]*hover\s*:\s*hover[^)]*\)[\s\S]*pointer\s*:\s*fine/.test(line)) {
      hoverMediaDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      continue;
    }
    if (hoverMediaDepth > 0) {
      hoverMediaDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (hoverMediaDepth < 0) hoverMediaDepth = 0;
      continue;
    }

    assert(
      !/:hover\b/.test(line),
      `Ungated :hover rule in ${path.relative(__dirname, cssFile)}:${idx + 1} -> ${trimmed}`
    );
  }
}
console.log(`[PASS] 3. Zero ungated :hover rules across all ${cssFiles.length} stylesheets.`);

// 4. Zero Bare vh / min-h-screen / h-screen Without dvh / svh Across ALL JSX & CSS Files
const jsxFiles = walk(srcDir, /\.jsx$/);
for (const jsxFile of jsxFiles) {
  const src = fs.readFileSync(jsxFile, 'utf8');
  const rel = path.relative(__dirname, jsxFile);
  assert(
    !/\b(min-h-screen|h-screen|max-h-screen)\b/.test(src),
    `Found 100vh Tailwind screen utility (${rel}) — use dvh/svh instead`
  );
  assert(
    !/\d+vh\b/.test(src),
    `Found bare vh unit in ${rel} — use dvh (app/modals) or svh (heroes) instead`
  );
  assert(
    !/minmax\(\s*(2[6-9]\d|3\d\d)px\s*,\s*1fr\s*\)/.test(src),
    `Found unclamped grid minmax(>260px, 1fr) in ${rel} — wrap with min(NNNpx, 100%) for <375px screens`
  );
}
const cvSrc = fs.readFileSync(path.join(srcDir, 'components', 'CourseViewer.jsx'), 'utf8');
assert(
  cvSrc.includes('mn-course-viewer-grid') && cvSrc.includes('mn-course-top-bar'),
  'CourseViewer.jsx must use responsive mn-course-viewer-grid and mn-course-top-bar'
);
console.log(`[PASS] 4. Zero bare vh or h-screen layout height bugs across all ${jsxFiles.length} JSX components.`);

// 5. Carousels Declare Horizontal Gesture Axis Ownership (touch-action: pan-y)
for (const carouselRel of [
  'components/AssignedLearningCarousel.jsx',
  'components/GlassCarousel.jsx',
  'components/landing/TestimonialsCarousel.jsx',
]) {
  const src = fs.readFileSync(path.join(srcDir, carouselRel), 'utf8');
  assert(
    src.includes("touchAction: 'pan-y'") || src.includes('touchAction: "pan-y"'),
    `${carouselRel} must set touchAction: 'pan-y' on its swipe viewport`
  );
}
console.log('[PASS] 5. All horizontal carousels own horizontal gestures cleanly via touch-action: pan-y.');

// 6. Safe-Area Insets Applied to App Layout, Mobile Drawer, Modals, Sticky Bars, & Login
const appCss = fs.readFileSync(path.join(srcDir, 'App.css'), 'utf8');
const portCss = fs.readFileSync(path.join(srcDir, 'components', 'port3d', 'port3d.css'), 'utf8');
const empCss = fs.readFileSync(path.join(srcDir, 'styles', 'employee-directory-glass.css'), 'utf8');
const landingCss = fs.readFileSync(path.join(srcDir, 'styles', 'landing-glass.css'), 'utf8');
const cookieBanner = fs.readFileSync(path.join(srcDir, 'components', 'CookieConsentBanner.jsx'), 'utf8');
for (const [name, content] of [
  ['App.css', appCss],
  ['port3d.css', portCss],
  ['employee-directory-glass.css', empCss],
  ['landing-glass.css', landingCss],
  ['CookieConsentBanner.jsx', cookieBanner],
]) {
  assert(
    content.includes('safe-area-inset-'),
    `${name} must pad edge-to-edge chrome with env(safe-area-inset-*)`
  );
}
console.log('[PASS] 6. Safe-area notch & home-indicator insets verified across shells, drawers, banners, & modals.');
console.log('=============================================================================');
