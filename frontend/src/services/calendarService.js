import { API_BASE_URL as SHARED_API_BASE_URL, authFetch, getAuthHeaders } from '../utils/apiConfig';
import { enrollmentService } from './enrollmentService';
import { courseService } from './courseService';
import { policyService } from './policyService';

const API_BASE_URL = SHARED_API_BASE_URL;
let inFlightCalendarEventsPromise = null;

export const EVENT_TYPES = {
  SESSION: 'SESSION',
  COURSE_DEADLINE: 'COURSE_DEADLINE',
  POLICY_DEADLINE: 'POLICY_DEADLINE',
  ASSESSMENT: 'ASSESSMENT',
};

export const EVENT_STATUSES = {
  UPCOMING: 'UPCOMING',
  OVERDUE: 'OVERDUE',
  COMPLETED: 'COMPLETED',
};

export function toIsoDate(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(isoDateStr) {
  if (!isoDateStr) return new Date();
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  return new Date(isoDateStr);
}

export function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateDeadlineInfo(dateStr, isCompleted = false) {
  if (!dateStr) return { status: EVENT_STATUSES.UPCOMING, daysRemaining: 0, deadlineText: '' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dateStr.split('-');
  const eventDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  eventDate.setHours(0, 0, 0, 0);

  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (isCompleted) {
    return {
      status: EVENT_STATUSES.COMPLETED,
      daysRemaining: diffDays,
      deadlineText: 'Completed',
    };
  }

  if (diffDays < 0) {
    return {
      status: EVENT_STATUSES.OVERDUE,
      daysRemaining: diffDays,
      deadlineText: `Overdue by ${Math.abs(diffDays)}d`,
    };
  }

  if (diffDays === 0) {
    return {
      status: EVENT_STATUSES.UPCOMING,
      daysRemaining: 0,
      deadlineText: 'Due today',
    };
  }

  if (diffDays === 1) {
    return {
      status: EVENT_STATUSES.UPCOMING,
      daysRemaining: 1,
      deadlineText: 'Due tomorrow',
    };
  }

  return {
    status: EVENT_STATUSES.UPCOMING,
    daysRemaining: diffDays,
    deadlineText: `Due in ${diffDays}d`,
  };
}

export const calendarService = {
  // Fetch live training sessions from backend
  async getLiveSessions() {
    try {
      const response = await authFetch(`${API_BASE_URL}/training-calendar`, {
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
      });
      if (!response.ok) return [];
      const payload = await response.json();
      const items = Array.isArray(payload)
        ? payload
        : payload.content ?? payload.events ?? payload.sessions ?? payload.data ?? [];
      return Array.isArray(items) ? items : [];
    } catch (err) {
      console.warn('Failed to fetch live sessions:', err);
      return [];
    }
  },

  // Fetch assigned courses with due dates
  async getAssignedCourses() {
    try {
      const cachedDashboard = courseService.getCachedLearningDashboard?.();
      if (cachedDashboard && Array.isArray(cachedDashboard.enrolled)) {
        return cachedDashboard.enrolled;
      }
      const rawList = await enrollmentService.getUserEnrollments();
      return Array.isArray(rawList) ? rawList : [];
    } catch (err) {
      console.warn('Failed to fetch assigned course deadlines:', err);
      return [];
    }
  },

  // Fetch policy assignments with due dates
  async getPolicyAssignments() {
    try {
      const response = await policyService.getMyAssignments('ALL');
      const items = response?.data || response || [];
      return Array.isArray(items) ? items : [];
    } catch (err) {
      console.warn('Failed to fetch policy assignments:', err);
      return [];
    }
  },

  // Unified Calendar Events Normalizer
  async getCalendarEvents() {
    if (inFlightCalendarEventsPromise) {
      return inFlightCalendarEventsPromise;
    }

    const reqPromise = (async () => {
    const todayStr = getTodayIso();

    const [sessionsResult, coursesResult, policiesResult] = await Promise.allSettled([
      this.getLiveSessions(),
      this.getAssignedCourses(),
      this.getPolicyAssignments(),
    ]);

    const sessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value : [];
    const courses = coursesResult.status === 'fulfilled' ? coursesResult.value : [];
    const policies = policiesResult.status === 'fulfilled' ? policiesResult.value : [];

    const unifiedEvents = [];
    const seenEventKeys = new Set();

    // 1. Process Live Training Sessions
    for (const session of sessions) {
      const dateStr = toIsoDate(
        session.date ?? session.sessionDate ?? session.eventDate ?? session.startDate ?? session.scheduledAt
      );
      if (!dateStr) continue;

      const id = String(session.id ?? session.eventId ?? session.sessionId);
      const key = `session-${id}`;
      if (seenEventKeys.has(key)) continue;
      seenEventKeys.add(key);

      const typeRaw = String(session.type ?? session.eventType ?? 'Workshop');
      const isAssessment = typeRaw.toLowerCase().includes('assessment') || typeRaw.toLowerCase().includes('quiz');
      const isPast = dateStr < todayStr;

      let status = EVENT_STATUSES.UPCOMING;
      if (isPast) {
        status = EVENT_STATUSES.COMPLETED;
      }

      const locationStr = String(session.location ?? session.venue ?? session.meetingLink ?? '').trim();
      const hasHttpLink = /^https?:\/\//i.test(locationStr);

      unifiedEvents.push({
        id: key,
        rawId: id,
        title: session.title ?? session.name ?? session.sessionTitle ?? 'Training Session',
        date: dateStr,
        time: session.time ?? session.timeRange ?? session.startTime ?? '',
        type: isAssessment ? EVENT_TYPES.ASSESSMENT : EVENT_TYPES.SESSION,
        typeLabel: isAssessment ? 'Assessment' : typeRaw || 'Live Session',
        status,
        statusLabel: isPast ? 'Past Session' : dateStr === todayStr ? 'Today' : 'Upcoming',
        daysRemaining: calculateDeadlineInfo(dateStr).daysRemaining,
        deadlineText: dateStr === todayStr ? 'Today' : isPast ? 'Past Session' : `In ${calculateDeadlineInfo(dateStr).daysRemaining}d`,
        location: locationStr,
        trainer: session.trainer ?? session.trainerName ?? session.facilitator ?? '',
        department: session.department ?? session.departmentName ?? 'Company-wide',
        targetType: session.targetType ?? 'ALL',
        actionLabel: hasHttpLink ? 'Join Session' : 'View Details',
        actionType: hasHttpLink ? 'external' : 'modal',
        actionTarget: locationStr,
        metadata: {
          sessionType: typeRaw,
          rawSession: session,
        },
      });
    }

    // 2. Process Assigned Course Deadlines
    for (const course of courses) {
      // REQUIREMENT: Only courses with a real stored dueDate!
      const rawDue = course.dueDate ?? course.deadline;
      if (!rawDue) continue;

      const dateStr = toIsoDate(rawDue);
      if (!dateStr) continue;

      const courseCode = String(course.id ?? course.courseId ?? course.courseCode ?? course.dbId ?? '');
      const key = `course-${courseCode}`;
      if (seenEventKeys.has(key)) continue;
      seenEventKeys.add(key);

      const progress = Number(course.progressPercent ?? course.progress ?? 0);
      const normalizedStatus = String(course.enrollmentStatus || course.status || '').toUpperCase();
      const isCompleted = normalizedStatus === 'COMPLETED' || progress >= 100;

      const deadlineInfo = calculateDeadlineInfo(dateStr, isCompleted);
      const isQuizOrAssessment = Boolean(course.quiz || course.hasAssessment);

      unifiedEvents.push({
        id: key,
        rawId: courseCode,
        title: course.title ?? course.courseTitle ?? 'Assigned Course',
        date: dateStr,
        time: '',
        type: isQuizOrAssessment ? EVENT_TYPES.ASSESSMENT : EVENT_TYPES.COURSE_DEADLINE,
        typeLabel: isQuizOrAssessment ? 'Assessment' : 'Course Deadline',
        status: deadlineInfo.status,
        statusLabel: deadlineInfo.status === EVENT_STATUSES.COMPLETED
          ? 'Completed'
          : deadlineInfo.status === EVENT_STATUSES.OVERDUE
          ? 'Overdue'
          : 'Upcoming',
        daysRemaining: deadlineInfo.daysRemaining,
        deadlineText: deadlineInfo.deadlineText,
        progressPercent: progress,
        department: course.department ?? course.owningDepartmentName ?? 'Operations',
        category: course.category ?? course.categoryName ?? 'Training',
        trainingType: String(course.trainingType || course.assignmentType || 'MANDATORY').toUpperCase(),
        actionLabel: isCompleted
          ? 'Review Course'
          : progress > 0
          ? 'Continue Course'
          : 'Start Course',
        actionType: 'navigate',
        actionTarget: courseCode ? `/courses/${encodeURIComponent(courseCode)}/overview` : '/courses',
        metadata: {
          rawCourse: course,
        },
      });
    }

    // 3. Process Policy & SOP Acknowledgement Deadlines
    for (const policy of policies) {
      // REQUIREMENT: Do not create calendar events for policies without due dates.
      // A policy without a due date must not be shown as overdue.
      const rawDue = policy.dueDate;
      if (!rawDue) continue;

      const dateStr = toIsoDate(rawDue);
      if (!dateStr) continue;

      const policyId = String(policy.id ?? policy.policyDocumentId ?? policy.assignmentId ?? '');
      const key = `policy-${policyId}`;
      if (seenEventKeys.has(key)) continue;
      seenEventKeys.add(key);

      const isAcked =
        policy.acknowledgementStatus === 'ACKNOWLEDGED' ||
        policy.acknowledged === true ||
        Boolean(policy.acknowledgedAt);

      const deadlineInfo = calculateDeadlineInfo(dateStr, isAcked);

      unifiedEvents.push({
        id: key,
        rawId: policyId,
        title: policy.title ?? 'Policy Acknowledgement',
        date: dateStr,
        time: '',
        type: EVENT_TYPES.POLICY_DEADLINE,
        typeLabel: 'Policy Deadline',
        status: deadlineInfo.status,
        statusLabel: deadlineInfo.status === EVENT_STATUSES.COMPLETED
          ? 'Acknowledged'
          : deadlineInfo.status === EVENT_STATUSES.OVERDUE
          ? 'Overdue'
          : 'Pending',
        daysRemaining: deadlineInfo.daysRemaining,
        deadlineText: deadlineInfo.deadlineText,
        documentCode: policy.documentCode || '',
        department: policy.owningDepartmentName ?? policy.department ?? 'HR & Compliance',
        mandatory: policy.mandatory !== false,
        actionLabel: isAcked ? 'View Policy' : 'Review Policy',
        actionType: 'navigate',
        actionTarget: '/profile?tab=policies#policies',
        metadata: {
          rawPolicy: policy,
        },
      });
    }

    // Sort events:
    // Overdue events first, then by date ascending, then by time
    unifiedEvents.sort((a, b) => {
      // When filtering for upcoming/overdue lists:
      return a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '');
    });

    return unifiedEvents;
    })();

    inFlightCalendarEventsPromise = reqPromise;
    try {
      return await reqPromise;
    } finally {
      if (inFlightCalendarEventsPromise === reqPromise) {
        inFlightCalendarEventsPromise = null;
      }
    }
  },

  // Schedule a new live session (Management only)
  async scheduleSession(sessionData) {
    const response = await authFetch(`${API_BASE_URL}/training-calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Could not publish session (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`);
    }

    return await response.json();
  },

  // Fetch selectable employees for targeted session scheduling
  async getSelectableEmployees() {
    const response = await authFetch(`${API_BASE_URL}/training-calendar/employees`, {
      headers: {
        ...getAuthHeaders(),
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Could not load employees (${response.status}).`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },
};

export default calendarService;
