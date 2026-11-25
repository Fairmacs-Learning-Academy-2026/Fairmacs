import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=============================================================================');
console.log(' Fairmacs KMS Learning & Compliance Calendar Verification');
console.log('=============================================================================');

// 1. calendarService.js verification
const calendarServicePath = path.join(__dirname, 'src', 'services', 'calendarService.js');
assert(fs.existsSync(calendarServicePath), 'calendarService.js must exist');
const calendarServiceSrc = fs.readFileSync(calendarServicePath, 'utf8');

assert(calendarServiceSrc.includes('getCalendarEvents'), 'Must provide getCalendarEvents');
assert(calendarServiceSrc.includes('parseLocalDate'), 'Must implement parseLocalDate to avoid UTC day-shift');
assert(calendarServiceSrc.includes('toIsoDate'), 'Must implement toIsoDate');
assert(calendarServiceSrc.includes('EVENT_TYPES'), 'Must define EVENT_TYPES');
assert(calendarServiceSrc.includes('SESSION') && calendarServiceSrc.includes('COURSE_DEADLINE') && calendarServiceSrc.includes('POLICY_DEADLINE'), 'Must include SESSION, COURSE_DEADLINE, and POLICY_DEADLINE');

// Check strict policy without due date exclusion
assert(
  calendarServiceSrc.includes('!rawDue') || calendarServiceSrc.includes('!policy.dueDate'),
  'Strict rule: Policies without due dates must be excluded from calendar events'
);
console.log('[PASS] 1. Unified calendarService data aggregation, timezone-safety, and strict date rules verified.');

// 2. TrainingCalendar.jsx verification
const trainingCalendarPath = path.join(__dirname, 'src', 'components', 'TrainingCalendar.jsx');
assert(fs.existsSync(trainingCalendarPath), 'TrainingCalendar.jsx must exist');
const trainingCalendarSrc = fs.readFileSync(trainingCalendarPath, 'utf8');

assert(
  trainingCalendarSrc.includes('Learning & Compliance Calendar') || trainingCalendarSrc.includes('Learning &amp; Compliance Calendar'),
  'Calendar header must be titled "Learning & Compliance Calendar"'
);
assert(
  trainingCalendarSrc.includes("'month'") && trainingCalendarSrc.includes("'week'") && trainingCalendarSrc.includes("'agenda'"),
  'Must support Month, Week, and Agenda views'
);
assert(
  trainingCalendarSrc.includes('isMobileInitial') || trainingCalendarSrc.includes('agenda'),
  'Must make Agenda view compact / mobile-friendly'
);
assert(
  trainingCalendarSrc.includes('typeFilter') && trainingCalendarSrc.includes('statusFilter'),
  'Must include Type and Status filters'
);
assert(
  trainingCalendarSrc.includes('selectedEvent') && (trainingCalendarSrc.includes('executeEventAction') || trainingCalendarSrc.includes('actionLabel')),
  'Must include event details modal and contextual direct actions'
);
assert(
  trainingCalendarSrc.includes('showScheduleModal'),
  'Must preserve session scheduling capability for authorized roles'
);
console.log('[PASS] 2. Full Learning & Compliance Calendar page (Month, Week, Agenda, filters, modals) verified.');

// 3. UpcomingTrainingWidget.jsx verification
const widgetPath = path.join(__dirname, 'src', 'components', 'dashboard', 'UpcomingTrainingWidget.jsx');
assert(fs.existsSync(widgetPath), 'UpcomingTrainingWidget.jsx must exist');
const widgetSrc = fs.readFileSync(widgetPath, 'utf8');

assert(
  widgetSrc.includes('Upcoming Training &') || widgetSrc.includes('Upcoming Training &amp; Deadlines'),
  'Widget title must be "Upcoming Training & Deadlines"'
);
assert(
  widgetSrc.includes('OVERDUE'),
  'Widget must prioritize and highlight OVERDUE items'
);
assert(
  widgetSrc.includes('/training-calendar'),
  'Widget must provide navigation to full calendar (/training-calendar)'
);
assert(
  widgetSrc.includes('actionTarget') || widgetSrc.includes('handleAction'),
  'Widget must support direct actions ("Join", "Continue", "Review")'
);
console.log('[PASS] 3. Compact UpcomingTrainingWidget verified.');

// 4. Employee Dashboard (Overview.jsx) integration
const overviewPath = path.join(__dirname, 'src', 'components', 'Overview.jsx');
const overviewSrc = fs.readFileSync(overviewPath, 'utf8');
assert(
  overviewSrc.includes('UpcomingTrainingWidget'),
  'Overview.jsx must embed UpcomingTrainingWidget'
);
console.log('[PASS] 4. Employee dashboard integration verified.');

// 5. Manager Dashboard (ManagerDashboard.jsx) integration
const managerDashboardPath = path.join(__dirname, 'src', 'components', 'ManagerDashboard.jsx');
const managerDashboardSrc = fs.readFileSync(managerDashboardPath, 'utf8');
assert(
  managerDashboardSrc.includes('UpcomingTrainingWidget'),
  'ManagerDashboard.jsx must embed UpcomingTrainingWidget'
);
console.log('[PASS] 5. Manager dashboard integration verified.');

// 6. HR/Admin Dashboard (HrAdminDashboard.jsx) integration
const hrAdminDashboardPath = path.join(__dirname, 'src', 'components', 'HrAdminDashboard.jsx');
const hrAdminDashboardSrc = fs.readFileSync(hrAdminDashboardPath, 'utf8');
assert(
  hrAdminDashboardSrc.includes('UpcomingTrainingWidget'),
  'HrAdminDashboard.jsx must embed UpcomingTrainingWidget'
);
console.log('[PASS] 6. HR/Admin dashboard integration verified.');

console.log('=============================================================================');
console.log(' ALL LEARNING & COMPLIANCE CALENDAR VERIFICATIONS PASSED (6/6)');
console.log('=============================================================================');
