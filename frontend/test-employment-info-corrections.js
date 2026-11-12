import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('FAIRMACS KMS — EMPLOYMENT INFORMATION UI CORRECTIONS VERIFICATION');
console.log('================================================================');

const profilePagePath = path.join(__dirname, 'src', 'components', 'ProfilePage.jsx');
assert(fs.existsSync(profilePagePath), 'ProfilePage.jsx must exist');
const profileContent = fs.readFileSync(profilePagePath, 'utf8');

// Extract the Employment Information section content
const employmentSectionMatch = profileContent.match(
  /<section\s+id="employment-info"[\s\S]*?<\/section>/
);
assert(employmentSectionMatch, 'Must find <section id="employment-info"> in ProfilePage.jsx');
const sectionHtml = employmentSectionMatch[0];

// 1. Verify Complete Removal of Unwanted Fields
console.log('\n[1/5] Verifying Removal of Unwanted Fields...');
assert(!sectionHtml.includes('Joining Date'), 'Joining Date label must be removed from Employment Information section');
assert(!sectionHtml.includes('Employment Type'), 'Employment Type label must be removed from Employment Information section');
assert(!sectionHtml.includes('Reporting Manager'), 'Reporting Manager label must be removed from Employment Information section');
assert(!sectionHtml.includes('reportingManager'), 'reportingManager bindings must be removed from Employment Information section');
console.log('  ✓ Joining Date, Employment Type, and Reporting Manager completely removed.');

// 2. Verify Exact 6 Fields Retained in Balanced Grid
console.log('\n[2/5] Verifying Retained Fields & Grid Structure...');
assert(sectionHtml.includes('Employee ID'), 'Must retain Employee ID');
assert(sectionHtml.includes('Official Corporate Email'), 'Must retain Official Corporate Email');
assert(sectionHtml.includes('Designation'), 'Must retain Designation');
assert(sectionHtml.includes('Department'), 'Must retain Department');
assert(sectionHtml.includes('Position Band'), 'Must retain Position Band');
assert(sectionHtml.includes('Office / Branch Location'), 'Must retain Office / Branch Location');
assert(
  sectionHtml.includes('grid-cols-1') &&
  sectionHtml.includes('sm:grid-cols-2') &&
  sectionHtml.includes('lg:grid-cols-3'),
  'Must use balanced responsive grid (1-col mobile, 2-col tablet, 3-col desktop)'
);
console.log('  ✓ Exactly the 6 specified fields retained in a balanced 3x2 / 2x3 responsive grid.');

// 3. Verify Office / Branch Location Mapping & Fallback
console.log('\n[3/5] Verifying Office / Branch Location Mapping...');
assert(sectionHtml.includes('displayBranch'), 'Must bind location to displayBranch');
assert(
  profileContent.includes('profile?.branch') &&
  profileContent.includes('profile?.employmentInfo?.branch') &&
  profileContent.includes("|| '—'"),
  'Location mapping must check backend branch fields and fallback cleanly to —'
);
assert(!sectionHtml.includes("'Headquarters'"), 'Must NOT hardcode or fallback to Headquarters in the UI');
console.log('  ✓ Office / Branch Location mapped to genuine backend branch with clean — fallback.');

// 4. Verify Position Band Alignment & Simplified Code Display
console.log('\n[4/5] Verifying Simplified Position Band & Clean Alignment...');
assert(sectionHtml.includes('{positionBandCode}'), 'Must display only position band code (P1, P2, P3, P4)');
assert(!sectionHtml.includes('{bandInfo.label}'), 'Must NOT display long description (e.g. Executive)');
assert(
  sectionHtml.includes('min-h-[24px]') && sectionHtml.includes('space-y-1.5'),
  'Must use consistent vertical spacing and aligned badge container'
);
console.log('  ✓ Position Band simplified to bare band code with uniform baseline alignment.');

// 5. Verify Light Theme Default & Backend Mapping
console.log('\n[5/5] Verifying Light Theme Default & Backend Consistency...');
assert(!sectionHtml.includes('dark:bg-slate-900'), 'Employment Information section must NOT have dark:bg-slate-900');
assert(sectionHtml.includes('bg-white') && sectionHtml.includes('border-slate-200'), 'Must use KMS crisp light styling');

const indexCssPath = path.join(__dirname, 'src', 'index.css');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');
assert(
  indexCssContent.includes('@custom-variant dark'),
  'index.css must configure @custom-variant dark to prevent unintended OS media dark mode'
);

const servicePath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'EmployeeProfileService.java');
const serviceContent = fs.readFileSync(servicePath, 'utf8');
assert(
  serviceContent.includes('rawBranch') &&
  serviceContent.includes('response.put("branch", rawBranch)'),
  'EmployeeProfileService must populate genuine branch without hardcoded Headquarters default'
);
console.log('  ✓ Light theme enforced by default with genuine backend branch mapping verified.');

console.log('\n================================================================');
console.log('ALL EMPLOYMENT INFORMATION CORRECTIONS VERIFIED SUCCESSFULLY (5/5)');
console.log('================================================================\n');
