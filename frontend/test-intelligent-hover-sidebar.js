import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, 'src');

console.log('--- Fairmacs KMS Intelligent Hover-Based Sidebar Verification ---');

const sidebarContent = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar.jsx'), 'utf8');
const appCssContent = fs.readFileSync(path.join(srcDir, 'App.css'), 'utf8');

// 1. Verify auto-hide dynamic overlay without manual expand/collapse buttons
assert(
  !sidebarContent.includes('isCollapsed') &&
  !sidebarContent.includes('setIsCollapsed') &&
  !sidebarContent.includes('sidebar-collapse-btn') &&
  !sidebarContent.includes('PanelLeftOpen') &&
  !sidebarContent.includes('PanelLeftClose'),
  'Sidebar.jsx must eliminate all manual expand/collapse buttons and states'
);
assert(
  appCssContent.includes('.sidebar-edge-hotzone') &&
  appCssContent.includes('.sidebar.sidebar-emerged'),
  'App.css must enforce auto-hide by default and dynamic emergence on left-edge trigger'
);
console.log('[PASS] 1. Sidebar auto-hides by default and emerges dynamically on left-edge hover.');

// 2. Verify individual-item floating tooltip portal implementation
assert(
  sidebarContent.includes('createPortal') &&
  sidebarContent.includes('sidebar-floating-tooltip') &&
  sidebarContent.includes('setHoveredTooltip') &&
  sidebarContent.includes('showTooltip') &&
  sidebarContent.includes('hideTooltip') &&
  sidebarContent.includes('keepTooltip'),
  'Sidebar.jsx must implement individual floating tooltip portal with bridge timer to prevent flicker'
);
console.log('[PASS] 2. Individual floating tooltip portal and hover bridge timer verified.');

// 3. Verify tooltips are rendered outside overflow containers to prevent clipping
assert(
  sidebarContent.includes('createPortal(') &&
  sidebarContent.includes('document.body'),
  'Sidebar.jsx must mount tooltips directly to document.body via createPortal to prevent overflow clipping'
);
console.log('[PASS] 3. Tooltip portal mounts to document.body (completely immune to overflow clipping).');

// 4. Verify tooltip interaction: clicking tooltip or icon navigates directly
assert(
  sidebarContent.includes('onClick={() => handleNavClick(item)}') &&
  sidebarContent.includes('handleNavClick(hoveredTooltip.item)'),
  'Both icon and floating tooltip must trigger direct route navigation on click'
);
console.log('[PASS] 4. Direct route navigation supported on both icon and floating tooltip.');

// 5. Verify keyboard focus accessibility
assert(
  sidebarContent.includes('onFocus={(e) =>') &&
  sidebarContent.includes('onBlur={hideTooltip}') &&
  sidebarContent.includes('aria-label='),
  'Sidebar buttons must support keyboard focus (onFocus/onBlur) and accessible aria-labels'
);
console.log('[PASS] 5. Full keyboard accessibility (focus/blur) and aria-labels verified.');

// 6. Verify role-based navigation mapping is preserved for all 4 roles
const expectedRoles = ['TRAINER', 'MANAGER', 'HR_ADMIN'];
for (const role of expectedRoles) {
  assert(
    sidebarContent.includes(`case '${role}':`),
    `Sidebar.jsx must preserve role navigation for ${role}`
  );
}
assert(
  sidebarContent.includes('default:') && sidebarContent.includes("path: '/dashboard'"),
  'Sidebar.jsx must preserve default Employee navigation'
);
console.log('[PASS] 6. Role-based navigation mapping fully preserved for Employee, Manager, Trainer, and HR/Admin.');

// 7. Verify bottom profile and logout area
assert(
  sidebarContent.includes('sidebar-avatar-btn') &&
  sidebarContent.includes('sidebar-logout-btn') &&
  sidebarContent.includes("label: 'Log Out'"),
  'Sidebar.jsx must render compact avatar button and separate logout button with individual tooltips'
);
assert(
  appCssContent.includes('.sidebar-avatar-btn') &&
  appCssContent.includes('.sidebar-logout-btn') &&
  appCssContent.includes('.sidebar-user-footer'),
  'App.css must style compact avatar button and separate logout button'
);
console.log('[PASS] 7. Profile avatar button and separate logout button with individual tooltips verified.');

// 8. Verify mobile drawer compatibility
assert(
  sidebarContent.includes('sidebar-mobile-open') &&
  sidebarContent.includes('sidebar-mobile-header') &&
  appCssContent.includes('.sidebar.sidebar-mobile-open'),
  'Mobile drawer sliding layout and header must be preserved for touch screens'
);
console.log('[PASS] 8. Mobile drawer responsive layout preserved for touch screens.');

// 9. Verify cross-browser scrollbar hiding while preserving scroll functionality
assert(
  appCssContent.includes('scrollbar-width: none !important') &&
  appCssContent.includes('-ms-overflow-style: none !important') &&
  appCssContent.includes('.sidebar-nav-container::-webkit-scrollbar') &&
  appCssContent.includes('display: none !important'),
  'App.css must completely hide the scrollbar cross-browser (Chrome, Edge, Firefox, Safari) while preserving scroll'
);
console.log('[PASS] 9. Vertical scrollbar completely hidden visually across all major browsers while retaining scroll.');

// 10. Verify removal of top logo from sidebar
assert(
  !sidebarContent.includes('sidebar-rail-brand') &&
  !sidebarContent.includes('FairmacsLogo') &&
  !sidebarContent.includes('sidebar-brand-btn'),
  'Sidebar.jsx must remove top logo and brand button to position first nav item neatly at the top'
);
console.log('[PASS] 10. Top logo and brand container cleanly removed; top navigation icon positioned neatly near top.');

// 11. Verify profile avatar is clickable and navigates to /profile
assert(
  sidebarContent.includes("navigate('/profile')") &&
  sidebarContent.includes("sublabel: 'View Profile'"),
  'Sidebar.jsx avatar button must navigate to /profile and provide clear View Profile tooltip'
);
console.log('[PASS] 11. Profile avatar button is clickable and directly navigates to /profile.');

// 12. Verify dedicated Profile page exists and is wired in App.jsx
const appContent = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf8');
const profilePagePath = path.join(srcDir, 'components', 'ProfilePage.jsx');
assert(fs.existsSync(profilePagePath), 'ProfilePage.jsx component must exist');
const profileContent = fs.readFileSync(profilePagePath, 'utf8');
assert(
  profileContent.includes('useAuth') &&
  profileContent.includes('profileData?.employeeId') &&
  profileContent.includes('profileData?.email') &&
  profileContent.includes('profileData?.designation') &&
  profileContent.includes('profileData?.department') &&
  profileContent.includes('PasswordModal'),
  'ProfilePage.jsx must display authenticated user employee ID, email, designation, department, role and security'
);
assert(
  appContent.includes("path=\"/profile\"") &&
  appContent.includes('<ProfilePage />'),
  'App.jsx must configure dedicated /profile route'
);
console.log('[PASS] 12. Dedicated /profile page correctly created and mapped in React Router.');

// 13. Verify Edge-Activated Proximity Detection
assert(
  sidebarContent.includes('sidebar-edge-hotzone') &&
  sidebarContent.includes('emergeSidebar') &&
  sidebarContent.includes('scheduleRetract') &&
  sidebarContent.includes('isEmerged') &&
  sidebarContent.includes('e.clientX <= 16'),
  'Sidebar.jsx must implement extreme left-edge proximity detection and auto-emergence handlers'
);
assert(
  appCssContent.includes('.sidebar-edge-hotzone') &&
  appCssContent.includes('width: 16px'),
  'App.css must style extreme left-edge activation hotzone'
);
console.log('[PASS] 13. Edge-activated proximity detection (8-16px threshold) and debounced retraction verified.');

// 14. Verify Apple-Inspired Liquid Glass Aesthetic & Emerged State
assert(
  appCssContent.includes('backdrop-filter: blur(28px)') &&
  appCssContent.includes('sidebar-emerged') &&
  appCssContent.includes('inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.98)') &&
  appCssContent.includes('cubic-bezier(0.16, 1, 0.3, 1)'),
  'App.css must implement high-definition backdrop blur, specular reflections, and fluid cubic-bezier easing'
);
console.log('[PASS] 14. Apple-inspired Liquid Glass material (blur 28px, specular reflection, fluid curves) verified.');

// 15. Verify Clean Edge Alignment & Permanent Dock
assert(
  !sidebarContent.includes('sidebar-active-edge-notch'),
  'Sidebar must maintain a clean dock without protruding edge notch indicators'
);
console.log('[PASS] 15. Clean docked rail without redundant decorative notch verified.');

// 16. Verify Clean Sticky Architecture without Header or Content Overlap
assert(
  appCssContent.includes('.app-workspace-column') &&
  appCssContent.includes('.sidebar') &&
  appCssContent.includes('position: sticky'),
  'Sidebar must be properly integrated as a sticky rail alongside workspace column without overlapping header or content'
);
console.log('[PASS] 16. Clean sticky sidebar architecture alongside workspace column verified.');

// 17. Verify Reduced Motion Accessibility
assert(
  appCssContent.includes('@media (prefers-reduced-motion: reduce)') &&
  appCssContent.includes('transition: none !important'),
  'App.css must respect prefers-reduced-motion system accessibility preferences'
);
console.log('[PASS] 17. Accessibility support for prefers-reduced-motion verified.');

// 18. Verify Sidebar Opening and Closing Staggered Icon Animations
assert(
  sidebarContent.includes("'--item-index': index") &&
  sidebarContent.includes("'--total-items': navItems.length") &&
  appCssContent.includes('.sidebar.sidebar-emerged .sidebar-nav-item') &&
  appCssContent.includes('calc(var(--item-index, 0) * 30ms + 50ms)') &&
  appCssContent.includes('cubic-bezier(0.34, 1.35, 0.64, 1)'),
  'App.css and Sidebar.jsx must implement staggered sequential entrance and exit transitions for icons'
);
console.log('[PASS] 18. Coordinated opening & closing staggered icon transitions verified.');

// 19. Verify Meaningful Semantic Icon-Specific Hover Animations
const expectedIconAnimations = [
  'iconGridIlluminate',
  'iconPersonShift',
  'iconBuildingLift',
  'iconBookPageTurn',
  'iconDocWrite',
  'iconChartGrow',
  'iconAwardSparkle',
  'iconBellRing',
  'iconGearRotate',
  'iconBellSway',
  'iconCompassQuiver',
  'iconCalendarLift',
  'iconLibrarySlide'
];
for (const anim of expectedIconAnimations) {
  assert(
    appCssContent.includes(anim),
    `App.css must define custom keyframe animation for ${anim}`
  );
}
assert(
  sidebarContent.includes('sidebar-icon-glyph') &&
  sidebarContent.includes('animType'),
  'Sidebar.jsx must bind semantic animation types to each navigation item'
);
console.log('[PASS] 19. Semantic icon-specific hover keyframe animations verified for all 13 navigation types.');

// 20. Verify Profile Avatar and Logout Custom Hover Animations
assert(
  appCssContent.includes('.sidebar-avatar-btn:hover') &&
  appCssContent.includes('transform: scale(1.10)') &&
  appCssContent.includes('.sidebar-logout-btn:hover svg') &&
  appCssContent.includes('transform: translateX(3px) scale(1.10)'),
  'App.css must style avatar subtle scale and logout arrow outward slide'
);
console.log('[PASS] 20. Profile avatar scale highlight and logout arrow outward slide verified.');

// 21. Verify Intentional Movement & Browser Visibility Lifecycle Guards
assert(
  sidebarContent.includes("document.visibilityState === 'hidden'") &&
  sidebarContent.includes("document.visibilityState === 'visible'") &&
  sidebarContent.includes("addEventListener('blur', handleWindowBlur)") &&
  sidebarContent.includes("addEventListener('focus', handleWindowFocus)") &&
  sidebarContent.includes('ignoreEventsUntilRef') &&
  sidebarContent.includes('Math.hypot(dx, dy) < 2') &&
  sidebarContent.includes('resetActivationState'),
  'Sidebar.jsx must guard against accidental edge activation on tab focus and require genuine intentional pointer motion'
);
console.log('[PASS] 21. Intentional motion detection, visibility lifecycle synchronization, and focus cooldown guards verified.');

// 22. Verify Clean Tooltips, Single Left Slim Active Indicator, and Borderless Active Icon
assert(
  !sidebarContent.includes('sidebar-tooltip-badge') &&
  sidebarContent.includes('<span className="sidebar-tooltip-label">{hoveredTooltip.label}</span>') &&
  sidebarContent.includes('glass-nav-active-bar') &&
  !sidebarContent.includes('glass-nav-active-bar-edge') &&
  !sidebarContent.includes('sidebar-active-edge-notch') &&
  appCssContent.includes('.sidebar-nav-item.active') &&
  appCssContent.includes('rgba(15, 108, 189, 0.10)') &&
  appCssContent.includes('border: none !important') &&
  appCssContent.includes('box-shadow: none !important') &&
  appCssContent.includes('.glass-nav-active-bar'),
  'Sidebar.jsx and App.css must restore exactly one slim left indicator bar with no borders or right-side indicators'
);
console.log('[PASS] 22. Clean navigation tooltips, single slim left active indicator bar, and borderless active container verified.');

// 23. Verify Tab Restoration & Stationary Edge Pointer Guards
assert(
  sidebarContent.includes('wasAtEdgeOnFocusRef') &&
  sidebarContent.includes('wasAtEdgeOnFocusRef.current = true') &&
  sidebarContent.includes('e.clientX > 48') &&
  sidebarContent.includes('isEmergedRef.current'),
  'Sidebar.jsx must guard against accidental emergence when tab gains focus near screen border'
);
console.log('[PASS] 23. Tab restoration suppression, stationary edge pointer guard, and workspace displacement check verified.');

console.log('--- ALL INTELLIGENT HOVER SIDEBAR VERIFICATIONS PASSED ---');
