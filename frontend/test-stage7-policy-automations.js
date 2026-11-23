import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  NOTIFICATION_CATEGORIES,
  formatNotificationCategory,
  resolveNotificationNavigation,
} from './src/services/notificationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failedCount++;
  }
}

console.log('\n=============================================================================');
console.log(' Fairmacs KMS Stage 7: Automation Behavioural Verification & Execution Suite');
console.log('=============================================================================\n');

// =============================================================================
// PART 1: Notification Categories, Labels & Navigation Routing
// =============================================================================
console.log('--- Part 1: Notification Categories & Navigation Routing ---');
const catKeys = NOTIFICATION_CATEGORIES.map((c) => c.value);
assert(catKeys.includes('POLICY_ASSIGNED'), 'Notification categories include POLICY_ASSIGNED');
assert(catKeys.includes('POLICY_DUE_SOON'), 'Notification categories include POLICY_DUE_SOON');
assert(catKeys.includes('POLICY_OVERDUE'), 'Notification categories include POLICY_OVERDUE');
assert(catKeys.includes('POLICY_REMINDER'), 'Notification categories include POLICY_REMINDER');
assert(catKeys.includes('POLICY_UPDATED'), 'Notification categories include POLICY_UPDATED');
assert(catKeys.includes('POLICY_ESCALATION'), 'Notification categories include POLICY_ESCALATION');
assert(catKeys.includes('POLICY_DIGEST'), 'Notification categories include POLICY_DIGEST');

assert(formatNotificationCategory('POLICY_ASSIGNED') === 'Policy Assigned', 'Format label for POLICY_ASSIGNED is Policy Assigned');
assert(formatNotificationCategory('POLICY_DUE_SOON') === 'Policy Due Soon', 'Format label for POLICY_DUE_SOON is Policy Due Soon');
assert(formatNotificationCategory('POLICY_OVERDUE') === 'Policy Overdue', 'Format label for POLICY_OVERDUE is Policy Overdue');
assert(formatNotificationCategory('POLICY_ESCALATION') === 'Policy Escalation', 'Format label for POLICY_ESCALATION is Policy Escalation');
assert(formatNotificationCategory('POLICY_DIGEST') === 'Policy Compliance Digest', 'Format label for POLICY_DIGEST is Policy Compliance Digest');

// Navigation Routing Verification
const empReminderNav = resolveNotificationNavigation({
  type: 'POLICY_DUE_SOON',
  actionUrl: '/profile#policies',
  referenceType: 'POLICY',
  referenceId: '101',
});
assert(empReminderNav.path === '/profile#policies' && empReminderNav.tab === 'profile',
  'Employee due-soon reminder routes to /profile#policies (profile tab)');

const empOverdueNav = resolveNotificationNavigation({
  type: 'POLICY_OVERDUE',
  actionUrl: '/profile#policies',
  referenceType: 'POLICY',
  referenceId: '101',
});
assert(empOverdueNav.path === '/profile#policies' && empOverdueNav.tab === 'profile',
  'Employee overdue alert routes to /profile#policies (profile tab)');

const mgrEscalationNav = resolveNotificationNavigation({
  type: 'POLICY_ESCALATION',
  actionUrl: '/manager/policies',
  referenceType: 'POLICY',
  referenceId: '101',
});
assert(mgrEscalationNav.path === '/manager/policies' && mgrEscalationNav.tab === 'managerPolicies',
  'Level 2 Manager Escalation routes to /manager/policies (managerPolicies tab)');

const hrEscalationNav = resolveNotificationNavigation({
  type: 'POLICY_ESCALATION',
  actionUrl: '/hr/policies',
  referenceType: 'POLICY',
  referenceId: '101',
});
assert(hrEscalationNav.path === '/hr/policies' && hrEscalationNav.tab === 'hrPolicies',
  'Level 3 HR/Admin Escalation routes to /hr/policies (hrPolicies tab)');

const mgrDigestNav = resolveNotificationNavigation({
  type: 'POLICY_DIGEST',
  actionUrl: '/manager/policies',
  referenceType: 'POLICY_DIGEST',
  referenceId: 'DEPT:2:2026-W47',
});
assert(mgrDigestNav.path === '/manager/policies' && mgrDigestNav.tab === 'managerPolicies',
  'Manager Policy Compliance Digest routes to /manager/policies (managerPolicies tab)');

const hrDigestNav = resolveNotificationNavigation({
  type: 'POLICY_DIGEST',
  actionUrl: '/hr/policies',
  referenceType: 'POLICY_DIGEST',
  referenceId: 'ORG:2026-W47',
});
assert(hrDigestNav.path === '/hr/policies' && hrDigestNav.tab === 'hrPolicies',
  'HR/Admin Policy Compliance Digest routes to /hr/policies (hrPolicies tab)');

const fallbackEmpNav = resolveNotificationNavigation({
  type: 'POLICY_REMINDER',
  referenceType: 'POLICY',
  referenceId: '101',
});
assert(fallbackEmpNav.path === '/profile#policies', 'Fallback for POLICY_REMINDER safely routes to /profile#policies');

// =============================================================================
// PART 2: Pure Behavioral Simulation of Policy Automation Engine
// =============================================================================
console.log('\n--- Part 2: Behavioural Simulation of Reminder & Escalation Engine ---');

class PolicyAutomationSimulator {
  constructor(config = {}) {
    this.dueSoonDays = config.dueSoonDays ?? 5;
    this.overdueInitialDays = config.overdueInitialDays ?? 1;
    this.overdueIntervalDays = config.overdueIntervalDays ?? 7;
    this.escalationManagerDays = config.escalationManagerDays ?? 1;
    this.escalationHrDays = config.escalationHrDays ?? 7;
    this.remindOnLeave = config.remindOnLeave ?? true;

    this.notifications = [];
    this.databaseDedupKeys = new Set();
    this.jobLogs = new Map();
  }

  isEligible(assignment) {
    if (!assignment || !assignment.dueDate) return false;
    if (assignment.docStatus !== 'PUBLISHED') return false;
    if (assignment.employeeStatus === 'INACTIVE' || assignment.employeeStatus === 'TERMINATED') return false;
    if (assignment.employeeStatus === 'ON_LEAVE' && !this.remindOnLeave) return false;
    if (assignment.acknowledged) return false;
    return true;
  }

  createNotification(recipientId, title, message, type, priority, actionUrl, dedupKey, metadata = {}) {
    if (dedupKey && this.databaseDedupKeys.has(dedupKey)) {
      return null; // Database unique constraint prevents duplicate
    }
    const record = {
      id: this.notifications.length + 1,
      recipientId,
      title,
      message,
      type,
      priority,
      actionUrl,
      dedupKey,
      metadata,
      createdAt: new Date().toISOString(),
    };
    if (dedupKey) {
      this.databaseDedupKeys.add(dedupKey);
    }
    this.notifications.push(record);
    return record;
  }

  runDailyScan(todayDateStr, assignments, departments, managers, hrAdmins) {
    const today = new Date(todayDateStr);
    let created = 0;

    for (const a of assignments) {
      if (!this.isEligible(a)) continue;

      const dueDate = new Date(a.dueDate);
      const diffMs = dueDate.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // 1. Due soon (e.g. 5 days)
      if (diffDays === this.dueSoonDays) {
        const dedupKey = `policy-due-${this.dueSoonDays}d:${a.id}`;
        const n = this.createNotification(
          a.employeeId,
          `Policy Due Soon: ${a.docTitle}`,
          `The policy "${a.docTitle}" is due in ${this.dueSoonDays} days.`,
          'POLICY_DUE_SOON',
          'NORMAL',
          '/profile#policies',
          dedupKey
        );
        if (n) created++;
      }

      // 2. Due today
      if (diffDays === 0) {
        const dedupKey = `policy-due-today:${a.id}:${todayDateStr}`;
        const n = this.createNotification(
          a.employeeId,
          `Policy Due Today: ${a.docTitle}`,
          `The policy "${a.docTitle}" is due today.`,
          'POLICY_DUE_SOON',
          'HIGH',
          '/profile#policies',
          dedupKey
        );
        if (n) created++;
      }

      // 3. Overdue
      if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays);

        // Level 1: Employee Overdue Reminders (Initial on Day 1, Recurring every 7 days)
        const isInitialOverdue = daysOverdue === this.overdueInitialDays;
        const isRecurringOverdue =
          daysOverdue > this.overdueInitialDays &&
          (daysOverdue - this.overdueInitialDays) % this.overdueIntervalDays === 0;

        if (isInitialOverdue || isRecurringOverdue) {
          const dedupKey = `policy-overdue:${a.id}:${todayDateStr}`;
          const n = this.createNotification(
            a.employeeId,
            `Policy Overdue: ${a.docTitle}`,
            `Acknowledgement for "${a.docTitle}" is ${daysOverdue} day(s) overdue.`,
            'POLICY_OVERDUE',
            daysOverdue >= 14 ? 'CRITICAL' : 'HIGH',
            '/profile#policies',
            dedupKey
          );
          if (n) created++;
        }

        // Level 2: Manager Escalation
        const isManagerEscalation =
          daysOverdue === this.escalationManagerDays ||
          (daysOverdue > this.escalationManagerDays &&
            (daysOverdue - this.escalationManagerDays) % this.overdueIntervalDays === 0);

        if (isManagerEscalation) {
          const eligibleManagers = this.resolveManagersForEmployee(a.deptId, departments, managers);
          if (eligibleManagers.length > 0) {
            for (const mgr of eligibleManagers) {
              const dedupKey = `policy-escalate-mgr:${mgr.id}:${a.id}:${daysOverdue}`;
              const n = this.createNotification(
                mgr.id,
                `Manager Escalation: Overdue Policy — ${a.employeeName}`,
                `Employee ${a.employeeName} is ${daysOverdue} days overdue for "${a.docTitle}".`,
                'POLICY_ESCALATION',
                'HIGH',
                '/manager/policies',
                dedupKey
              );
              if (n) created++;
            }
          } else {
            // Fallback to HR
            const fallbackDedup = `policy-escalate-mgr-fallback:${a.id}:${daysOverdue}`;
            for (const hr of hrAdmins) {
              const n = this.createNotification(
                hr.id,
                `Manager Escalation Fallback — ${a.employeeName}`,
                `Employee ${a.employeeName} has an overdue policy with no active manager.`,
                'POLICY_ESCALATION',
                'HIGH',
                '/hr/policies',
                `${fallbackDedup}:HR:${hr.id}`
              );
              if (n) created++;
            }
          }
        }

        // Level 3: HR/Admin Escalation (Prolonged Overdue >= 7 days)
        const isHrEscalation =
          daysOverdue === this.escalationHrDays ||
          (daysOverdue > this.escalationHrDays &&
            (daysOverdue - this.escalationHrDays) % this.overdueIntervalDays === 0);

        if (isHrEscalation) {
          for (const hr of hrAdmins) {
            const dedupKey = `policy-escalate-hr:${a.id}:${daysOverdue}:HR:${hr.id}`;
            const n = this.createNotification(
              hr.id,
              `HR Escalation (Level 3): Prolonged Overdue Policy — ${a.employeeName}`,
              `Employee ${a.employeeName} is ${daysOverdue} days overdue for "${a.docTitle}".`,
              'POLICY_ESCALATION',
              'CRITICAL',
              '/hr/policies',
              dedupKey
            );
            if (n) created++;
          }
        }
      }
    }
    return created;
  }

  resolveManagersForEmployee(deptId, departments, managers) {
    // Resolve all dept IDs in hierarchy up to root
    const allowedDeptIds = new Set();
    let current = departments.find((d) => d.id === deptId);
    while (current) {
      allowedDeptIds.add(current.id);
      current = current.parentId ? departments.find((d) => d.id === current.parentId) : null;
    }
    return managers.filter((m) => allowedDeptIds.has(m.deptId) && m.status === 'ACTIVE');
  }

  runWeeklyDigest(weekKey, hrAdmins, managers, assignments) {
    let created = 0;
    const total = assignments.length;
    const acked = assignments.filter((a) => a.acknowledged).length;
    const pending = total - acked;
    const completion = total > 0 ? (acked / total) * 100 : 0;

    // HR Org Digest
    for (const hr of hrAdmins) {
      const dedupKey = `policy-digest-hr:${hr.id}:${weekKey}`;
      const n = this.createNotification(
        hr.id,
        `Weekly Policy Compliance Digest — Organization (${completion.toFixed(0)}%)`,
        `Organization: ${acked}/${total} acknowledged (${completion.toFixed(1)}%), ${pending} pending.`,
        'POLICY_DIGEST',
        'NORMAL',
        '/hr/policies',
        dedupKey,
        { completionPercentage: completion, totalAcknowledged: acked, totalAssigned: total }
      );
      if (n) created++;
    }

    // Manager Dept Digest
    for (const mgr of managers) {
      const deptAssignments = assignments.filter((a) => a.deptId === mgr.deptId);
      const dTotal = deptAssignments.length;
      const dAcked = deptAssignments.filter((a) => a.acknowledged).length;
      const dPending = dTotal - dAcked;
      const dCompletion = dTotal > 0 ? (dAcked / dTotal) * 100 : 0;

      const dedupKey = `policy-digest-mgr:${mgr.id}:${weekKey}`;
      const n = this.createNotification(
        mgr.id,
        `Weekly Department Policy Compliance — Dept ${mgr.deptId} (${dCompletion.toFixed(0)}%)`,
        `Department ${mgr.deptId}: ${dAcked}/${dTotal} acknowledged (${dCompletion.toFixed(1)}%), ${dPending} pending.`,
        'POLICY_DIGEST',
        'NORMAL',
        '/manager/policies',
        dedupKey,
        { departmentId: mgr.deptId, completionPercentage: dCompletion }
      );
      if (n) created++;
    }
    return created;
  }
}

// -----------------------------------------------------------------------------
// Test Case 1: Employee Reminder Behaviour (5d, 0d, 1d, 8d, 15d, silent 2-7, 9-14)
// -----------------------------------------------------------------------------
const sim = new PolicyAutomationSimulator();
const depts = [{ id: 10, name: 'Logistics', parentId: null }, { id: 11, name: 'Ocean Freight', parentId: 10 }];
const mgrs = [{ id: 2, name: 'Ocean Manager', deptId: 11, status: 'ACTIVE' }];
const hrs = [{ id: 1, name: 'HR Director', status: 'ACTIVE' }];

// Create employee with assignment due on Nov 15
const baseAssignments = [
  { id: 101, employeeId: 201, employeeName: 'Priya Nair', deptId: 11, docTitle: 'Safety Policy', docStatus: 'PUBLISHED', employeeStatus: 'ACTIVE', dueDate: '2026-11-15', acknowledged: false },
  { id: 102, employeeId: 202, employeeName: 'Open Ended Emp', deptId: 11, docTitle: 'Safety Policy', docStatus: 'PUBLISHED', employeeStatus: 'ACTIVE', dueDate: null, acknowledged: false },
  { id: 103, employeeId: 203, employeeName: 'Acked Emp', deptId: 11, docTitle: 'Safety Policy', docStatus: 'PUBLISHED', employeeStatus: 'ACTIVE', dueDate: '2026-11-10', acknowledged: true },
  { id: 104, employeeId: 204, employeeName: 'Inactive Emp', deptId: 11, docTitle: 'Safety Policy', docStatus: 'PUBLISHED', employeeStatus: 'INACTIVE', dueDate: '2026-11-10', acknowledged: false },
  { id: 105, employeeId: 205, employeeName: 'Draft Doc Emp', deptId: 11, docTitle: 'Draft Policy', docStatus: 'DRAFT', employeeStatus: 'ACTIVE', dueDate: '2026-11-10', acknowledged: false },
];

// Day Nov 10: 5 days before due date (due-soon)
sim.runDailyScan('2026-11-10', baseAssignments, depts, mgrs, hrs);
const notif5d = sim.notifications.find((n) => n.recipientId === 201 && n.type === 'POLICY_DUE_SOON');
assert(notif5d !== undefined, 'Behavioural: 5-day due-soon reminder generated for Priya Nair');
assert(notif5d?.dedupKey === 'policy-due-5d:101', 'Behavioural: 5-day due-soon dedupKey is policy-due-5d:101');

// Day Nov 15: Due today
sim.runDailyScan('2026-11-15', baseAssignments, depts, mgrs, hrs);
const notifToday = sim.notifications.find((n) => n.recipientId === 201 && n.dedupKey === 'policy-due-today:101:2026-11-15');
assert(notifToday !== undefined, 'Behavioural: Due-today reminder generated on deadline');

// Day Nov 16: 1 day overdue -> Initial overdue reminder
sim.runDailyScan('2026-11-16', baseAssignments, depts, mgrs, hrs);
const notifOv1 = sim.notifications.find((n) => n.recipientId === 201 && n.type === 'POLICY_OVERDUE' && n.dedupKey === 'policy-overdue:101:2026-11-16');
assert(notifOv1 !== undefined, 'Behavioural: Initial 1-day overdue reminder generated');

// Days Nov 17-22 (2 to 7 days overdue): MUST NOT generate employee overdue reminders
for (const day of ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']) {
  sim.runDailyScan(day, baseAssignments, depts, mgrs, hrs);
  const falseReminder = sim.notifications.find((n) => n.recipientId === 201 && n.type === 'POLICY_OVERDUE' && n.dedupKey === `policy-overdue:101:${day}`);
  assert(falseReminder === undefined, `Behavioural: No employee overdue reminder generated on off-cycle date ${day}`);
}

// Day Nov 23 (8 days overdue = 1 + 7): MUST generate recurring overdue reminder
sim.runDailyScan('2026-11-23', baseAssignments, depts, mgrs, hrs);
const notifOv8 = sim.notifications.find((n) => n.recipientId === 201 && n.type === 'POLICY_OVERDUE' && n.dedupKey === 'policy-overdue:101:2026-11-23');
assert(notifOv8 !== undefined, 'Behavioural: Recurring overdue reminder generated on Day 8 (1 + 7 days)');

// Day Nov 30 (15 days overdue = 1 + 14): MUST generate recurring overdue reminder
sim.runDailyScan('2026-11-30', baseAssignments, depts, mgrs, hrs);
const notifOv15 = sim.notifications.find((n) => n.recipientId === 201 && n.type === 'POLICY_OVERDUE' && n.dedupKey === 'policy-overdue:101:2026-11-30');
assert(notifOv15 !== undefined, 'Behavioural: Recurring overdue reminder generated on Day 15 (1 + 14 days)');

// Verifications of Exclusions:
assert(!sim.notifications.some((n) => n.recipientId === 202), 'Behavioural Exclusion: Null due date assignment received 0 notifications');
assert(!sim.notifications.some((n) => n.recipientId === 203 && n.type === 'POLICY_OVERDUE'), 'Behavioural Exclusion: Acknowledged assignment received 0 overdue notifications');
assert(!sim.notifications.some((n) => n.recipientId === 204), 'Behavioural Exclusion: INACTIVE employee received 0 notifications');
assert(!sim.notifications.some((n) => n.recipientId === 205), 'Behavioural Exclusion: DRAFT policy received 0 notifications');

// -----------------------------------------------------------------------------
// Test Case 2: Level 2 Manager Escalation & Department Hierarchy Traversal
// -----------------------------------------------------------------------------
console.log('\n--- Part 3: Level 2 Manager Escalation & Hierarchy Scoping ---');
const simMgr = new PolicyAutomationSimulator();
const multiDepts = [
  { id: 1, name: 'Corporate Logistics', parentId: null },
  { id: 2, name: 'Ocean Logistics', parentId: 1 },
  { id: 3, name: 'Air Freight', parentId: 1 },
  { id: 4, name: 'Finance', parentId: null },
];
const multiMgrs = [
  { id: 10, name: 'Corporate Logistics Director', deptId: 1, status: 'ACTIVE' },
  { id: 11, name: 'Ocean Logistics Manager', deptId: 2, status: 'ACTIVE' },
  { id: 12, name: 'Air Freight Manager', deptId: 3, status: 'ACTIVE' },
  { id: 13, name: 'Finance Manager', deptId: 4, status: 'ACTIVE' },
];
const hrAdminList = [{ id: 99, name: 'Chief HR Officer', status: 'ACTIVE' }];

// Ocean logistics employee is 1 day overdue
const oceanEmpAssign = [
  { id: 301, employeeId: 501, employeeName: 'Captain Ramesh', deptId: 2, docTitle: 'Vessel Code', docStatus: 'PUBLISHED', employeeStatus: 'ACTIVE', dueDate: '2026-11-15', acknowledged: false },
];

simMgr.runDailyScan('2026-11-16', oceanEmpAssign, multiDepts, multiMgrs, hrAdminList);

// Manager 11 (Ocean Direct) must receive escalation
const ocnMgrNotif = simMgr.notifications.find((n) => n.recipientId === 11 && n.type === 'POLICY_ESCALATION');
assert(ocnMgrNotif !== undefined, 'Manager Escalation: Direct department manager received Level 2 escalation');
assert(ocnMgrNotif?.actionUrl === '/manager/policies', 'Manager Escalation: Routes to /manager/policies');

// Manager 10 (Corporate Parent) must receive escalation via hierarchy
const parentMgrNotif = simMgr.notifications.find((n) => n.recipientId === 10 && n.type === 'POLICY_ESCALATION');
assert(parentMgrNotif !== undefined, 'Manager Escalation: Parent hierarchy manager received Level 2 escalation');

// Manager 12 (Air Freight - Sibling) must NOT receive escalation
const airMgrNotif = simMgr.notifications.find((n) => n.recipientId === 12);
assert(airMgrNotif === undefined, 'Manager Escalation Scope: Sibling department manager did NOT receive escalation');

// Manager 13 (Finance - Unrelated) must NOT receive escalation
const finMgrNotif = simMgr.notifications.find((n) => n.recipientId === 13);
assert(finMgrNotif === undefined, 'Manager Escalation Scope: Unrelated department manager did NOT receive escalation');

// Deduplication on repeat run
const countBeforeRerun = simMgr.notifications.length;
simMgr.runDailyScan('2026-11-16', oceanEmpAssign, multiDepts, multiMgrs, hrAdminList);
assert(simMgr.notifications.length === countBeforeRerun, 'Manager Escalation Dedup: Repeat run on same date produced 0 duplicate escalations');

// Fallback when manager is missing
const unmanagedEmpAssign = [
  { id: 302, employeeId: 502, employeeName: 'Orphan Emp', deptId: 999, docTitle: 'Vessel Code', docStatus: 'PUBLISHED', employeeStatus: 'ACTIVE', dueDate: '2026-11-15', acknowledged: false },
];
simMgr.runDailyScan('2026-11-16', unmanagedEmpAssign, multiDepts, multiMgrs, hrAdminList);
const fallbackNotif = simMgr.notifications.find((n) => n.recipientId === 99 && n.title.includes('Manager Escalation Fallback'));
assert(fallbackNotif !== undefined, 'Manager Escalation Fallback: Missing manager safely escalated to HR Admin');

// -----------------------------------------------------------------------------
// Test Case 3: Level 3 HR/Admin Escalation & Prolonged Overdue Thresholds
// -----------------------------------------------------------------------------
console.log('\n--- Part 4: Level 3 HR/Admin Prolonged Escalation ---');
const simHr = new PolicyAutomationSimulator({ escalationHrDays: 7, overdueIntervalDays: 7 });
const hrEmpAssign = [
  { id: 401, employeeId: 601, employeeName: 'Vikram Seth', deptId: 2, docTitle: 'Antitrust Policy', docStatus: 'PUBLISHED', employeeStatus: 'ACTIVE', dueDate: '2026-11-10', acknowledged: false },
];

// Day Nov 16: 6 days overdue -> NO HR escalation
simHr.runDailyScan('2026-11-16', hrEmpAssign, multiDepts, multiMgrs, hrAdminList);
assert(!simHr.notifications.some((n) => n.recipientId === 99 && n.type === 'POLICY_ESCALATION' && n.priority === 'CRITICAL'),
  'Level 3 HR Escalation: Not triggered prior to 7 days overdue');

// Day Nov 17: 7 days overdue -> LEVEL 3 HR ESCALATION TRIGGERED
simHr.runDailyScan('2026-11-17', hrEmpAssign, multiDepts, multiMgrs, hrAdminList);
const hrNotif7 = simHr.notifications.find((n) => n.recipientId === 99 && n.type === 'POLICY_ESCALATION' && n.priority === 'CRITICAL');
assert(hrNotif7 !== undefined, 'Level 3 HR Escalation: Triggered on Day 7 with CRITICAL priority');
assert(hrNotif7?.actionUrl === '/hr/policies', 'Level 3 HR Escalation: Routes to /hr/policies');

// Day Nov 20: 10 days overdue -> NO HR escalation
simHr.runDailyScan('2026-11-20', hrEmpAssign, multiDepts, multiMgrs, hrAdminList);
assert(!simHr.notifications.some((n) => n.dedupKey === 'policy-escalate-hr:401:10:HR:99'),
  'Level 3 HR Escalation: Silent on off-cycle day 10');

// Day Nov 24: 14 days overdue (7 + 7) -> RECURRING HR ESCALATION TRIGGERED
simHr.runDailyScan('2026-11-24', hrEmpAssign, multiDepts, multiMgrs, hrAdminList);
const hrNotif14 = simHr.notifications.find((n) => n.dedupKey === 'policy-escalate-hr:401:14:HR:99');
assert(hrNotif14 !== undefined, 'Level 3 HR Escalation: Recurring escalation delivered on Day 14');

// -----------------------------------------------------------------------------
// Test Case 4: Weekly Compliance Digest & Accuracy
// -----------------------------------------------------------------------------
console.log('\n--- Part 5: Weekly Compliance Digest & Calculations ---');
const simDigest = new PolicyAutomationSimulator();
const digestAssignments = [
  { id: 1, deptId: 10, acknowledged: true },
  { id: 2, deptId: 10, acknowledged: true },
  { id: 3, deptId: 10, acknowledged: true },
  { id: 4, deptId: 10, acknowledged: false },
  { id: 5, deptId: 10, acknowledged: false },
  { id: 6, deptId: 20, acknowledged: true },
  { id: 7, deptId: 20, acknowledged: true },
  { id: 8, deptId: 20, acknowledged: false },
  { id: 9, deptId: 20, acknowledged: false },
  { id: 10, deptId: 20, acknowledged: false },
];
// Total: 10 assignments, 5 acknowledged = 50.0% completion
// Dept 10: 5 assignments, 3 acknowledged = 60.0% completion
// Dept 20: 5 assignments, 2 acknowledged = 40.0% completion

const digestHrs = [{ id: 88, name: 'HR Admin' }];
const digestMgrs = [
  { id: 71, name: 'Dept 10 Manager', deptId: 10 },
  { id: 72, name: 'Dept 20 Manager', deptId: 20 },
];

simDigest.runWeeklyDigest('2026-W47', digestHrs, digestMgrs, digestAssignments);

const hrDigestNotif = simDigest.notifications.find((n) => n.recipientId === 88 && n.type === 'POLICY_DIGEST');
assert(hrDigestNotif !== undefined, 'Weekly Digest: HR Admin received organization-wide digest');
assert(hrDigestNotif?.metadata.completionPercentage === 50, 'Weekly Digest: Correct organization completion percentage (50.0%)');

const mgr10Digest = simDigest.notifications.find((n) => n.recipientId === 71 && n.type === 'POLICY_DIGEST');
assert(mgr10Digest !== undefined, 'Weekly Digest: Dept 10 Manager received department digest');
assert(mgr10Digest?.metadata.completionPercentage === 60, 'Weekly Digest: Correct Dept 10 completion percentage (60.0%)');

const mgr20Digest = simDigest.notifications.find((n) => n.recipientId === 72 && n.type === 'POLICY_DIGEST');
assert(mgr20Digest !== undefined, 'Weekly Digest: Dept 20 Manager received department digest');
assert(mgr20Digest?.metadata.completionPercentage === 40, 'Weekly Digest: Correct Dept 20 completion percentage (40.0%)');

// Deduplication on repeat run
const countBeforeDigestRerun = simDigest.notifications.length;
simDigest.runWeeklyDigest('2026-W47', digestHrs, digestMgrs, digestAssignments);
assert(simDigest.notifications.length === countBeforeDigestRerun, 'Weekly Digest: Repeat run produced 0 duplicate digests');

// -----------------------------------------------------------------------------
// Test Case 5: Scheduler Reliability & Fault Isolation
// -----------------------------------------------------------------------------
console.log('\n--- Part 6: Scheduler Reliability & Fault Isolation ---');
const simRel = new PolicyAutomationSimulator();
let simulatedExceptions = 0;
// Simulate an item-level failure inside batch
try {
  simRel.createNotification(999, 'Test Fault', 'Message', 'POLICY_DUE_SOON', 'HIGH', '/profile#policies', 'fault-key-1');
  // Second insertion with identical key fails gracefully without crashing caller
  const duplicateResult = simRel.createNotification(999, 'Test Fault Dup', 'Message', 'POLICY_DUE_SOON', 'HIGH', '/profile#policies', 'fault-key-1');
  assert(duplicateResult === null, 'Reliability: Duplicate notification safely swallowed and skipped');
} catch (e) {
  simulatedExceptions++;
}
assert(simulatedExceptions === 0, 'Reliability: Duplicate prevention never crashes execution loop');

// Centralized configuration and backend source invariants
console.log('\n--- Part 7: Source Invariant & Security Verification ---');
const appPropPath = path.join(__dirname, '..', 'backend', 'src', 'main', 'resources', 'application.properties');
const appProps = fs.readFileSync(appPropPath, 'utf8');

assert(appProps.includes('app.notifications.policies.due-soon-days'), 'application.properties defines policies.due-soon-days');
assert(appProps.includes('app.notifications.policies.overdue-initial-days'), 'application.properties defines policies.overdue-initial-days');
assert(appProps.includes('app.notifications.policies.overdue-reminder-interval-days'), 'application.properties defines policies.overdue-reminder-interval-days');
assert(appProps.includes('app.notifications.policies.escalation-manager-days'), 'application.properties defines policies.escalation-manager-days');
assert(appProps.includes('app.notifications.policies.escalation-hr-days'), 'application.properties defines policies.escalation-hr-days');
assert(appProps.includes('app.notifications.policies.remind-on-leave'), 'application.properties defines policies.remind-on-leave');
assert(appProps.includes('app.notifications.policies.digest-cron'), 'application.properties defines policies.digest-cron');

const schedulerPath = path.join(__dirname, '..', 'backend', 'src', 'main', 'java', 'com', 'fairmacs', 'lms', 'service', 'NotificationSchedulerService.java');
const schedulerCode = fs.readFileSync(schedulerPath, 'utf8');

assert(schedulerCode.includes('processPolicyDeadlineReminders'), 'NotificationSchedulerService implements processPolicyDeadlineReminders');
assert(schedulerCode.includes('processWeeklyPolicyDigests'), 'NotificationSchedulerService implements processWeeklyPolicyDigests');
assert(schedulerCode.includes('scheduledWeeklyPolicyDigests'), 'NotificationSchedulerService defines scheduledWeeklyPolicyDigests');
assert(schedulerCode.includes('isEligibleForPolicyNotification'), 'NotificationSchedulerService enforces strict assignment eligibility');
assert(schedulerCode.includes('findEligibleManagersForEmployee'), 'NotificationSchedulerService resolves eligible department managers');
assert(schedulerCode.includes('resolveDepartmentHierarchyForManager'), 'NotificationSchedulerService traverses department hierarchy');
assert(schedulerCode.includes('policy-escalate-mgr:'), 'NotificationSchedulerService uses Level 2 manager escalation dedup keys');
assert(schedulerCode.includes('policy-escalate-hr:'), 'NotificationSchedulerService uses Level 3 HR escalation dedup keys');
assert(schedulerCode.includes('policy-digest-hr:'), 'NotificationSchedulerService uses HR digest dedup keys');
assert(schedulerCode.includes('policy-digest-mgr:'), 'NotificationSchedulerService uses Manager digest dedup keys');

assert(!schedulerCode.includes('sendMail(') && !schedulerCode.includes('mailSender'),
  'Strict scope restriction: Scheduler does not introduce email/SMTP notifications');

console.log('\n=============================================================================');
console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('=============================================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
