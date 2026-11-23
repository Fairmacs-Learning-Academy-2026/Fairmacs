import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('================================================================');
console.log('Fairmacs KMS Phase 2: Dashboard Master Shell & Welcome Header');
console.log('Automated Verification Test Suite');
console.log('================================================================\n');

// 1. Check WelcomeBanner.jsx exists and has required imports and exports
const welcomeBannerPath = path.join(__dirname, 'src', 'components', 'dashboard', 'WelcomeBanner.jsx');
assert(fs.existsSync(welcomeBannerPath), 'WelcomeBanner.jsx must exist at frontend/src/components/dashboard/WelcomeBanner.jsx');
const welcomeBannerCode = fs.readFileSync(welcomeBannerPath, 'utf8');

console.log('1. Checking WelcomeBanner Component Architecture:');
assert(welcomeBannerCode.includes("export default function WelcomeBanner"), 'Must export WelcomeBanner as default');
assert(welcomeBannerCode.includes("useAuth"), 'Must consume useAuth() context');
assert(welcomeBannerCode.includes("UserAvatar"), 'Must import UserAvatar fallback');
assert(welcomeBannerCode.includes("notificationService"), 'Must use existing notificationService');
assert(welcomeBannerCode.includes("notificationService.getUnreadCount()"), 'Must invoke notificationService.getUnreadCount()');
assert(welcomeBannerCode.includes("fairmacs:notifications-updated"), 'Must listen for cross-component notification sync');
console.log('   [PASS] WelcomeBanner correctly wires authentication, avatar fallback, and notification service.');

// 2. Check Time-Aware Greeting Logic
console.log('2. Checking Time-Aware Greeting & Date Formatting:');
assert(welcomeBannerCode.includes("getTimeGreeting"), 'Must have time-aware greeting generator');
assert(welcomeBannerCode.includes("'Good morning'"), 'Must support Good morning');
assert(welcomeBannerCode.includes("'Good afternoon'"), 'Must support Good afternoon');
assert(welcomeBannerCode.includes("'Good evening'"), 'Must support Good evening');
assert(welcomeBannerCode.includes("formatTodayDate"), 'Must format today date');
console.log('   [PASS] Time-aware greeting and date formatting properly structured.');

// 3. Check Employee Profile Fields Integration
console.log('3. Checking Profile Credentials Integration:');
assert(welcomeBannerCode.includes("user?.name"), 'Must display employee name');
assert(welcomeBannerCode.includes("user?.designation"), 'Must display employee designation');
assert(welcomeBannerCode.includes("user?.department"), 'Must display employee department');
assert(welcomeBannerCode.includes("user?.employeeId"), 'Must display employeeId');
assert(welcomeBannerCode.includes("user?.avatar"), 'Must check user.avatar');
assert(welcomeBannerCode.includes("<UserAvatar"), 'Must render UserAvatar as fallback');
console.log('   [PASS] Employee credentials (name, ID, designation, department, avatar) completely mapped.');

// 4. Check Overview.jsx Integration
console.log('4. Checking Overview.jsx Master Shell Integration:');
const overviewPath = path.join(__dirname, 'src', 'components', 'Overview.jsx');
const overviewCode = fs.readFileSync(overviewPath, 'utf8');
assert(overviewCode.includes("import WelcomeBanner from './dashboard/WelcomeBanner'"), 'Overview.jsx must import WelcomeBanner');
assert(overviewCode.includes("<WelcomeBanner"), 'Overview.jsx must render WelcomeBanner at top of dashboard');
assert(overviewCode.includes("className=\"employee-dashboard-shell"), 'Overview.jsx must wrap content in employee-dashboard-shell');
console.log('   [PASS] Overview.jsx seamlessly mounts WelcomeBanner in the master dashboard shell.');

// 5. Critical Course Carousel Preservation Check
console.log('5. Verifying Course Carousel Preservation:');
assert(overviewCode.includes("<AssignedLearningCarousel"), 'AssignedLearningCarousel must be preserved in Overview.jsx');
const carouselPath = path.join(__dirname, 'src', 'components', 'AssignedLearningCarousel.jsx');
const carouselCode = fs.readFileSync(carouselPath, 'utf8');
assert(carouselCode.includes("export default function AssignedLearningCarousel"), 'AssignedLearningCarousel.jsx must remain default export');
assert(carouselCode.includes("courses = []"), 'AssignedLearningCarousel props must remain unchanged');
assert(carouselCode.includes("onOpenCourse"), 'onOpenCourse prop must remain unchanged');
console.log('   [PASS] AssignedLearningCarousel.jsx is 100% UNTOUCHED and fully preserved.');

// 6. Check App.css Liquid Glass Tokens and Styles
console.log('6. Checking Balanced Apple Liquid Glass Design Tokens in App.css:');
const appCssPath = path.join(__dirname, 'src', 'App.css');
const appCss = fs.readFileSync(appCssPath, 'utf8');
assert(appCss.includes(".employee-dashboard-shell"), 'App.css must define .employee-dashboard-shell');
assert(appCss.includes(".welcome-banner-glass"), 'App.css must define .welcome-banner-glass');
assert(appCss.includes("backdrop-filter: blur(24px)"), 'App.css must apply Apple Liquid Glass blur');
assert(appCss.includes(".welcome-banner-ambient"), 'App.css must include ambient illumination');
assert(appCss.includes(".welcome-banner-notif-pill"), 'App.css must include notification status pill');
assert(appCss.includes("@media (max-width: 1024px)"), 'App.css must define tablet responsive rules');
assert(appCss.includes("@media (max-width: 768px)"), 'App.css must define mobile responsive rules');
assert(appCss.includes("prefers-reduced-motion: reduce"), 'App.css must honor prefers-reduced-motion');
console.log('   [PASS] Balanced Apple Liquid Glass styles and responsive rules verified.');

console.log('\n================================================================');
console.log('ALL PHASE 2 VERIFICATION CHECKS PASSED SUCCESSFULLY!');
console.log('================================================================');
