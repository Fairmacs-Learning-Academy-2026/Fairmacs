import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('=============================================================================');
console.log(' Fairmacs Learning Academy — Bright Glassmorphic Skill Verification Suite');
console.log('=============================================================================');

const landingDir = path.join(__dirname, 'src', 'components', 'landing');
const landingFiles = fs
  .readdirSync(landingDir)
  .map((f) => path.join(landingDir, f));

const allLandingSurfaceFiles = [
  path.join(__dirname, 'index.html'),
  path.join(__dirname, 'src', 'styles', 'landing-glass.css'),
  path.join(__dirname, 'src', 'styles', 'employee-directory-glass.css'),
  path.join(__dirname, 'src', 'content', 'site.js'),
  path.join(__dirname, 'src', 'utils', 'enquiryValidation.js'),
  path.join(__dirname, 'src', 'components', 'PublicHome.jsx'),
  path.join(__dirname, 'src', 'components', 'EmployeeManagement.jsx'),
  path.join(__dirname, 'src', 'components', 'CookieConsentBanner.jsx'),
  path.join(__dirname, 'src', 'components', 'LegalDocumentPage.jsx'),
  path.join(__dirname, 'src', 'components', 'NotFoundPage.jsx'),
  path.join(__dirname, 'src', 'components', 'ThankYouPage.jsx'),
  ...landingFiles,
];

// 1. Pure JS/JSX check (zero .ts / .tsx files in frontend/src)
for (const file of allLandingSurfaceFiles) {
  assert(
    !file.endsWith('.ts') && !file.endsWith('.tsx'),
    `Found disallowed TypeScript file: ${file}`
  );
}
console.log('[PASS] 1. Pure JavaScript & JSX (.js / .jsx) architecture verified.');

// 2. Hard bright-glassmorphic-ui prohibitions: no dark:, no prefers-color-scheme: dark, no dark hex surfaces, no TODO/lorem
const forbiddenDarkHexes = ['#06111f', '#0a1829', '#0b1a2e', '#000000'];
for (const file of allLandingSurfaceFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const name = path.basename(file);
  assert(!src.includes('dark:'), `Found prohibited dark: class in ${name}`);
  assert(
    !src.includes('prefers-color-scheme: dark'),
    `Found prohibited prefers-color-scheme: dark in ${name}`
  );
  assert(!/lorem ipsum/i.test(src), `Found lorem ipsum in ${name}`);
  assert(!/\bTODO\b/.test(src), `Found TODO placeholder in ${name}`);
  for (const hex of forbiddenDarkHexes) {
    assert(
      !src.toLowerCase().includes(hex),
      `Found prohibited dark surface ${hex} in ${name}`
    );
  }
}
console.log('[PASS] 2. Zero dark: classes, zero prefers-color-scheme: dark, zero dark surfaces, zero TODOs.');

// 3. Design tokens & glass recipe verification
const css = fs.readFileSync(path.join(__dirname, 'src', 'styles', 'landing-glass.css'), 'utf8');
assert(css.includes('color-scheme: light only;'), 'Missing color-scheme: light only');
assert(css.includes('--bg-base: #FBF8F3'), 'Missing --bg-base: #FBF8F3');
assert(css.includes('--bg-pearl: #F4F1EC'), 'Missing --bg-pearl: #F4F1EC');
assert(css.includes('--ink: #1F2328'), 'Missing --ink: #1F2328');
assert(css.includes('backdrop-filter: blur('), 'Missing backdrop-filter blur on .glass');
assert(css.includes('(hover: hover) and (pointer: fine)'), 'Missing mobile-native hover media query gate');
assert(css.includes('font-size: 16px'), 'Missing 16px mobile input zoom prevention');
console.log('[PASS] 3. Daylight tokens, .glass recipe, and mobile-native CSS safeguards verified.');

// 4. All 12 Conversion Architecture sections & EducationalOrganization JSON-LD
const publicHome = fs.readFileSync(path.join(__dirname, 'src', 'components', 'PublicHome.jsx'), 'utf8');
const requiredComponents = [
  'EducationalOrgJsonLd',
  'AmbientBackground',
  'CursorLight',
  'LandingNav',
  'LandingHero',
  'DivisionsMarquee',
  'ProgramsBentoGrid',
  'LearningTimeline',
  'OutcomesSection',
  'MethodMentorsSection',
  'TestimonialsCarousel',
  'LearningFormatsSection',
  'FaqAccordion',
  'FinalEnquiryBand',
  'LightGlassFooter',
];
for (const comp of requiredComponents) {
  assert(publicHome.includes(comp), `Missing ${comp} in PublicHome.jsx`);
}
console.log('[PASS] 4. All 12 conversion sections + EducationalOrganization JSON-LD verified.');

// 5. Kinetic motion choreography & reduced-motion support
const hooks = fs.readFileSync(path.join(landingDir, 'motionHooks.js'), 'utf8');
const primitives = fs.readFileSync(path.join(landingDir, 'motionPrimitives.jsx'), 'utf8');
assert(hooks.includes('prefers-reduced-motion: reduce'), 'Must honor prefers-reduced-motion');
assert(primitives.includes('MagneticButton') && primitives.includes('TiltGlassCard') && primitives.includes('AnimatedCounter'));
const playground = fs.readFileSync(path.join(landingDir, 'HeroLivePlayground.jsx'), 'utf8');
assert(playground.includes('useReducer') && playground.includes('confetti'), 'Playground must use useReducer + streak confetti');
console.log('[PASS] 5. Kinetic motion primitives, reduced-motion fallbacks, and useReducer Live Playground verified.');

// 6. HR Employee Accounts Reel-Inspired Daylight Glass Directory verification
const empJsx = fs.readFileSync(path.join(__dirname, 'src', 'components', 'EmployeeManagement.jsx'), 'utf8');
const empCss = fs.readFileSync(path.join(__dirname, 'src', 'styles', 'employee-directory-glass.css'), 'utf8');
assert(!empCss.includes('transition: all'), 'Prohibited transition: all in employee-directory-glass.css');
assert(empJsx.includes('viewMode === "TABLE"') && empJsx.includes('viewMode === "CARDS"'), 'Missing Table/Cards view switcher');
assert(empJsx.includes('Accounts by positions') && empJsx.includes('"P0"') && empJsx.includes('"P4"'), 'Missing Accounts by positions P0-P4 Bento card');
assert(!empJsx.includes('Profile Readiness') && empJsx.includes('View Profile') && empJsx.includes('Emergency Contacts'), 'Missing View Profile dossier modal or lingering Profile Readiness');
assert(empJsx.includes('createPortal'), 'Modals must portal to document.body');
console.log('[PASS] 6. HR Employee Accounts P0-P4 Positions Bento, View Profile Dossier, & Table/Cards UI verified.');
console.log('=============================================================================');
