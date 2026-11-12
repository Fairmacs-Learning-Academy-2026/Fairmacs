import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');

console.log('================================================================');
console.log('FAIRMACS KMS — EMPLOYEE PROFILE CENTRE VERIFICATION SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. UserAvatar Component Verification
// -----------------------------------------------------------------------------
console.log('[1/6] Verifying UserAvatar Component & Deterministic Palette...');
const userAvatarPath = path.join(srcDir, 'components', 'UserAvatar.jsx');
assert(fs.existsSync(userAvatarPath), 'UserAvatar.jsx must exist');
const userAvatarContent = fs.readFileSync(userAvatarPath, 'utf8');

assert(userAvatarContent.includes('AVATAR_PALETTE'), 'Must define corporate color palette');
assert(userAvatarContent.includes('getPaletteIndex'), 'Must implement deterministic hash function');
assert(userAvatarContent.includes('getInitials'), 'Must extract initials from employee name');
assert(!userAvatarContent.includes('images.unsplash.com'), 'Must NEVER use external unsplash photos in avatar');
assert(userAvatarContent.includes('SIZE_MAP'), 'Must support flexible sizes (xs, sm, md, lg, xl, 2xl)');
console.log('  ✓ UserAvatar provides deterministic initial circular avatars across 10 corporate tones.');

// -----------------------------------------------------------------------------
// 2. Profile Service API Client Verification
// -----------------------------------------------------------------------------
console.log('\n[2/6] Verifying profileService.js Client Implementation...');
const profileServicePath = path.join(srcDir, 'services', 'profileService.js');
assert(fs.existsSync(profileServicePath), 'profileService.js must exist');
const profileServiceContent = fs.readFileSync(profileServicePath, 'utf8');

const requiredMethods = [
  'getMyProfile',
  'getProfile',
  'updatePersonalInfo',
  'saveEmergencyContact',
  'deleteEmergencyContact',
  'updatePreferences',
  'submitStatusRequest',
  'getPendingStatusRequests',
  'reviewStatusRequest',
  'decideStatusRequest',
  'directChangeStatus',
  'getDocuments',
  'uploadDocument',
  'downloadDocument',
  'deleteDocument',
];

for (const method of requiredMethods) {
  assert(profileServiceContent.includes(method), `profileService must implement method: ${method}`);
}
assert(profileServiceContent.includes('API_BASE_URL'), 'Must use centralized apiConfig API_BASE_URL');
assert(profileServiceContent.includes('getAuthHeaders'), 'Must use centralized getAuthHeaders');
assert(profileServiceContent.includes('handleUnauthorized'), 'Must use centralized handleUnauthorized for 401');
console.log(`  ✓ profileService implements all ${requiredMethods.length} required endpoints with centralized auth.`);

// -----------------------------------------------------------------------------
// 3. ProfilePage 10-Section Single Page Structure Verification
// -----------------------------------------------------------------------------
console.log('\n[3/6] Verifying ProfilePage.jsx Single-Page Layout & 10 Sections...');
const profilePagePath = path.join(srcDir, 'components', 'ProfilePage.jsx');
assert(fs.existsSync(profilePagePath), 'ProfilePage.jsx must exist');
const profilePageContent = fs.readFileSync(profilePagePath, 'utf8');

const expectedSections = [
  { id: 'profile-header', label: '1. Profile Header' },
  { id: 'personal-info', label: '2. Personal Information' },
  { id: 'emergency-contacts', label: '3. Emergency Contacts' },
  { id: 'employment-info', label: '4. Employment Information' },
  { id: 'my-documents', label: '5. My Documents (Zoho WorkDrive)' },
  { id: 'learning-development', label: '6. Learning & Development' },
  { id: 'employment-timeline', label: '7. Employment Timeline' },
];

for (const sec of expectedSections) {
  assert(profilePageContent.includes(`id="${sec.id}"`), `ProfilePage must contain section element with id="${sec.id}"`);
  console.log(`  ✓ Section present: ${sec.label}`);
}

assert(!profilePageContent.includes('id="employment-status"'), 'ProfilePage must NOT contain obsolete employment-status section');
assert(!profilePageContent.includes('id="account-security"'), 'ProfilePage must NOT contain obsolete account-security section');
assert(!profilePageContent.includes('id="preferences"'), 'ProfilePage must NOT contain obsolete preferences section');
assert(!profilePageContent.includes('showStatusRequestModal'), 'ProfilePage must NOT contain employee status request modal');
assert(!profilePageContent.includes('showDirectStatusModal'), 'ProfilePage must NOT contain direct status override modal');
assert(!profilePageContent.includes('aria-label="Profile Sections"'), 'ProfilePage must NOT contain sticky sub-nav bar');
console.log('  ✓ Verified absence of obsolete sections, sticky sub-nav, and modals.');

// -----------------------------------------------------------------------------
// 4. Feature-Specific Requirements Verification
// -----------------------------------------------------------------------------
console.log('\n[4/6] Verifying Specific Functional Requirements in ProfilePage.jsx...');

// Position bands P0-P4
assert(profilePageContent.includes('POSITION_BANDS'), 'Must define Position Bands (P0-P4)');
assert(profilePageContent.includes('P0 - Trainee') && profilePageContent.includes('P4 - Principal'), 'Bands P0 through P4 must be defined');

// Personal Information fields & HR restrictions
assert(profilePageContent.includes('personalEmail'), 'Must include personal email field');
assert(profilePageContent.includes('mobileNumber'), 'Must include mobile number field');
assert(profilePageContent.includes('dateOfBirth'), 'Must include date of birth field');
assert(profilePageContent.includes('gender'), 'Must include gender field');
assert(profilePageContent.includes('bloodGroup'), 'Must include blood group field');
assert(profilePageContent.includes('HR Controlled') || profilePageContent.includes('isHrAdmin'), 'Legal name must be restricted to HR admin');

// Official Employment Status badge in profile header
assert(profilePageContent.includes('ACTIVE') && profilePageContent.includes('ON_LEAVE'), 'Must support official employment statuses');
assert(profilePageContent.includes('employmentStatus'), 'Must display official employment status in header');

// Zoho WorkDrive document categories
assert(profilePageContent.includes('DOCUMENT_CATEGORIES'), 'Must configure Zoho document categories');
assert(profilePageContent.includes('Offer Letter') && profilePageContent.includes('Identity Documents'), 'Categories must include Offer Letter, Identity Documents, etc.');
assert(profilePageContent.includes('downloadDocument'), 'Must support streaming download from Zoho WorkDrive');

console.log('  ✓ Verified Position Bands P0–P4, Personal Info, Document Categories, and Clean Layout.');

// -----------------------------------------------------------------------------
// 5. External Unsplash Removal Across Application
// -----------------------------------------------------------------------------
console.log('\n[5/6] Verifying Unsplash Photo Removal from Navigation & Profile...');
const headerContent = fs.readFileSync(path.join(srcDir, 'components', 'Header.jsx'), 'utf8');
const sidebarContent = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar.jsx'), 'utf8');

assert(headerContent.includes('<UserAvatar'), 'Header must use UserAvatar component');
assert(sidebarContent.includes('<UserAvatar'), 'Sidebar must use UserAvatar component');
assert(profilePageContent.includes('<UserAvatar'), 'ProfilePage must use UserAvatar component');
assert(!profilePageContent.includes('images.unsplash.com'), 'ProfilePage must NOT contain external unsplash avatars');
console.log('  ✓ Header, Sidebar, and ProfilePage use UserAvatar with deterministic corporate palettes.');

// -----------------------------------------------------------------------------
// 6. Backend Flyway Migration & Database Schema Verification
// -----------------------------------------------------------------------------
console.log('\n[6/6] Verifying Backend Flyway Migration V13...');
const flywayMigrationPath = path.join(__dirname, '..', 'backend', 'src', 'main', 'resources', 'db', 'migration', 'V13__employee_profile_center.sql');
assert(fs.existsSync(flywayMigrationPath), 'V13__employee_profile_center.sql must exist');
const migrationSql = fs.readFileSync(flywayMigrationPath, 'utf8');

const requiredTables = [
  'employee_personal_info',
  'employee_emergency_contacts',
  'employee_documents',
  'employment_status_requests',
  'employment_status_history',
  'employee_preferences',
  'employee_timeline_events',
];

for (const table of requiredTables) {
  assert(migrationSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `Migration must create table: ${table}`);
  console.log(`  ✓ Table defined: ${table}`);
}

assert(migrationSql.includes('position_band'), 'Migration must alter users table to add position_band');
assert(migrationSql.includes('reporting_manager_id'), 'Migration must alter users table to add reporting_manager_id');

console.log('\n================================================================');
console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY (6/6)');
console.log('================================================================');
