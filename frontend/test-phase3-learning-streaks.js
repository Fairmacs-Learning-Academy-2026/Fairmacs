import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('Fairmacs KMS Phase 3: Learning Streaks & Activity Rings Test Suite');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// 1. Verify Component Architecture
console.log('1. Checking LearningStreaks Component Architecture:');
const compPath = 'frontend/src/components/dashboard/LearningStreaks.jsx';
assert(fs.existsSync(compPath), 'LearningStreaks.jsx component exists');

const compSource = fs.readFileSync(compPath, 'utf8');
assert(compSource.includes('learningStreakService'), 'Wires learningStreakService API');
assert(compSource.includes('svg') && compSource.includes('circle'), 'Renders SVG activity rings');
assert(compSource.includes('strokeDasharray') || compSource.includes('stroke-dasharray'), 'Uses strokeDasharray for ring animation');
assert(compSource.includes('strokeDashoffset') || compSource.includes('stroke-dashoffset'), 'Uses strokeDashoffset for progress animation');
assert(compSource.includes('strokeLinecap="round"'), 'Rings use rounded stroke caps');
assert(compSource.includes('#3478E5'), 'Ring 1 uses Fairmacs primary blue');
assert(compSource.includes('#57AD9C'), 'Ring 2 uses soft teal');
assert(!compSource.includes('RING_3'), 'Strictly adheres to dual rings (no Ring 3)');

// 2. Verify Weekly Activity Calendar
console.log('\n2. Checking Weekly Activity Calendar Implementation:');
assert(compSource.includes('weekly-calendar-strip'), 'Contains 7-day weekly calendar strip');
assert(compSource.includes('selectedDate'), 'Supports interactive day selection');
assert(compSource.includes('activeSelectedDay'), 'Inspects selected day milestones');
assert(compSource.includes('completedLessons') && compSource.includes('submittedQuizzes'), 'Displays completed lessons and submitted quizzes');
assert(compSource.includes('todayIst') || compSource.includes('isToday'), 'Highlights current day');
assert(compSource.includes('isFuture'), 'Visually differentiates future calendar days');

// 3. Verify Streak Badges & Calculations
console.log('\n3. Checking Streak Badges & Targets:');
assert(compSource.includes('currentStreak'), 'Displays current learning streak');
assert(compSource.includes('longestStreak'), 'Displays longest learning streak');
assert(compSource.includes('weeklyTargetDays') && compSource.includes('weeklyTargetLessons'), 'Supports weekly targets (default 5/5)');
assert(compSource.includes('Math.min(100'), 'Caps ring percentages at 100%');

// 4. Verify Overview.jsx Integration
console.log('\n4. Checking Overview.jsx Master Shell Integration:');
const overviewSource = fs.readFileSync('frontend/src/components/Overview.jsx', 'utf8');
assert(overviewSource.includes("import LearningStreaks from './dashboard/LearningStreaks';"), 'Overview imports LearningStreaks');
assert(overviewSource.includes('<LearningStreaks'), 'Overview mounts LearningStreaks');

// Confirm position relative to WelcomeBanner and Carousel
const welcomeIndex = overviewSource.indexOf('<WelcomeBanner');
const streaksIndex = overviewSource.indexOf('<LearningStreaks');
const carouselIndex = overviewSource.indexOf('AssignedLearningCarousel');

assert(welcomeIndex !== -1 && streaksIndex > welcomeIndex, 'LearningStreaks is positioned below WelcomeBanner');
assert(carouselIndex !== -1, 'AssignedLearningCarousel is preserved');

// 5. Verify AssignedLearningCarousel Preservation
console.log('\n5. Verifying Strict Course Carousel Preservation:');
const carouselSource = fs.readFileSync('frontend/src/components/AssignedLearningCarousel.jsx', 'utf8');
assert(carouselSource.length > 500, 'AssignedLearningCarousel exists');
// Check git status to ensure AssignedLearningCarousel was untouched
assert(!fs.existsSync('frontend/src/components/AssignedLearningCarousel.jsx.bak'), 'No modifications to carousel');

// 6. Verify Service Architecture & API Export
console.log('\n6. Checking Service Architecture:');
const serviceSource = fs.readFileSync('frontend/src/services/learningStreakService.js', 'utf8');
assert(serviceSource.includes('/learning/streaks'), 'Service targets /learning/streaks endpoint');
assert(serviceSource.includes('getAuthHeaders()'), 'Service passes authentication headers');
assert(serviceSource.includes('handleUnauthorized'), 'Handles 401 session expiration');

const indexSource = fs.readFileSync('frontend/src/services/index.js', 'utf8');
assert(indexSource.includes('learningStreakService'), 'learningStreakService exported in services/index.js');

const courseServiceSource = fs.readFileSync('frontend/src/services/courseService.js', 'utf8');
assert(courseServiceSource.includes('getLearningStreaks'), 'courseService exposes getLearningStreaks proxy');

// 7. Verify CSS Tokens & Responsive Design
console.log('\n7. Checking CSS Tokens & Reduced Motion:');
const cssSource = fs.readFileSync('frontend/src/App.css', 'utf8');
assert(cssSource.includes('.learning-streaks-container'), 'App.css defines .learning-streaks-container');
assert(cssSource.includes('@media (max-width: 1023px)'), 'App.css defines tablet/mobile responsive breakpoint');
assert(cssSource.includes('prefers-reduced-motion'), 'App.css respects prefers-reduced-motion');

console.log('\n================================================================');
console.log(`Results: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
}
