// Notification Service
// Handles notification-related API calls and shared category/navigation helpers

import {
  API_BASE_URL,
  getAuthHeaders,
  handleUnauthorized,
} from '../utils/apiConfig';

const handleAuthFailure = () => handleUnauthorized(true);

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

export const NOTIFICATION_CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'COURSE_ASSIGNED', label: 'Course Assigned' },
  { value: 'COURSE_DUE_SOON', label: 'Deadline Reminders' },
  { value: 'COURSE_OVERDUE', label: 'Overdue Alerts' },
  { value: 'COURSE_COMPLETED', label: 'Course Completed' },
  { value: 'MODULE_COMPLETED', label: 'Module Completed' },
  { value: 'QUIZ_AVAILABLE', label: 'Quiz Available' },
  { value: 'ASSESSMENT_RESULT', label: 'Assessment Passed' },
  { value: 'ASSESSMENT_FAILED', label: 'Assessment Failed' },
  { value: 'RETAKE_AVAILABLE', label: 'Retake Unlocked' },
  { value: 'CERTIFICATE_ISSUED', label: 'Certificate Issued' },
  { value: 'DEADLINE_CHANGED', label: 'Deadline Updated' },
  { value: 'ASSIGNMENT_REVOKED', label: 'Assignment Revoked' },
  { value: 'COURSE_CANCELLED', label: 'Course Cancelled' },
  { value: 'TEAM_COMPLIANCE', label: 'Team Compliance' },
  { value: 'TRAINER_ACTION_REQUIRED', label: 'Trainer Action' },
  { value: 'HR_ADMIN_ALERT', label: 'HR & Admin Alerts' },
  { value: 'SYSTEM_ALERT', label: 'System Alerts' },
  { value: 'GENERAL_ANNOUNCEMENT', label: 'Announcements' },
];

export const NOTIFICATION_PRIORITIES = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
];

export const formatNotificationCategory = (type) => {
  if (!type) return 'General';
  const match = NOTIFICATION_CATEGORIES.find(
    (c) => c.value === String(type).toUpperCase()
  );
  if (match) return match.label;
  return String(type)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Resolves the safe internal LMS route and sidebar tab ID for a notification.
 * Never routes to removed pages such as /learning-paths.
 */
export const resolveNotificationNavigation = (notification) => {
  if (!notification) {
    return { path: '/notifications', tab: 'notifications' };
  }

  const explicitUrl = notification.actionUrl ? String(notification.actionUrl).trim() : '';
  if (explicitUrl && !explicitUrl.includes('learning-paths')) {
    if (explicitUrl.startsWith('/courses/') && explicitUrl.endsWith('/learn')) {
      return { path: explicitUrl, tab: 'courses' };
    }
    if (explicitUrl === '/certificates') return { path: '/certificates', tab: 'certificates' };
    if (explicitUrl === '/progress') return { path: '/progress', tab: 'mylearning' };
    if (explicitUrl === '/manager') return { path: '/manager', tab: 'dashboard' };
    if (explicitUrl === '/hr' || explicitUrl === '/admin' || explicitUrl === '/hr/overview') return { path: '/hr/overview', tab: 'hrOverview' };
    if (explicitUrl === '/trainer') return { path: '/trainer', tab: 'dashboard' };
    if (explicitUrl === '/calendar' || explicitUrl === '/training-calendar') return { path: '/training-calendar', tab: 'calendar' };
    if (explicitUrl === '/courses') return { path: '/courses', tab: 'catalog' };
    if (explicitUrl === '/notifications') return { path: '/notifications', tab: 'notifications' };
  }

  const type = String(notification.type || '').toUpperCase();
  const refType = String(notification.referenceType || '').toUpperCase();
  const refId = notification.referenceId ? String(notification.referenceId).trim() : '';

  switch (type) {
    case 'COURSE_ASSIGNED':
    case 'MODULE_COMPLETED':
    case 'QUIZ_AVAILABLE':
    case 'RETAKE_AVAILABLE':
      if (refId && (refType === 'COURSE_CODE' || refType === 'COURSE')) {
        return { path: `/courses/${refId}/learn`, tab: 'catalog' };
      }
      return { path: '/progress', tab: 'mylearning' };
    case 'CERTIFICATE_ISSUED':
      return { path: '/certificates', tab: 'certificates' };
    case 'COURSE_DUE_SOON':
    case 'COURSE_OVERDUE':
    case 'COURSE_COMPLETED':
    case 'ASSESSMENT_RESULT':
    case 'ASSESSMENT_FAILED':
    case 'DEADLINE_CHANGED':
    case 'ASSIGNMENT_REVOKED':
    case 'COURSE_CANCELLED':
      if (refId && refType === 'COURSE_CODE' && (type === 'COURSE_DUE_SOON' || type === 'COURSE_OVERDUE')) {
        return { path: `/courses/${refId}/learn`, tab: 'catalog' };
      }
      return { path: '/progress', tab: 'mylearning' };
    case 'TEAM_COMPLIANCE':
      return { path: '/manager', tab: 'dashboard' };
    case 'TRAINER_ACTION_REQUIRED':
      return { path: '/trainer', tab: 'dashboard' };
    case 'HR_ADMIN_ALERT':
    case 'SYSTEM_ALERT':
      return { path: '/hr/overview', tab: 'hrOverview' };
    default:
      if (refType === 'TRAINING_SESSION') {
        return { path: '/training-calendar', tab: 'calendar' };
      }
      return { path: '/notifications', tab: 'notifications' };
  }
};

export const notificationService = {
  // GET ALL OR FILTERED NOTIFICATIONS (LIST)
  getNotifications: async (params = {}) => {
    const qs = buildQueryString(params);
    const response = await fetch(
      `${API_BASE_URL}/notifications${qs}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      handleAuthFailure();
      return [];
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch notifications (${response.status})`
      );
    }

    return await response.json();
  },

  // GET PAGINATED NOTIFICATIONS FOR NOTIFICATION CENTRE PAGE
  getNotificationsPage: async (params = {}) => {
    const qs = buildQueryString(params);
    const response = await fetch(
      `${API_BASE_URL}/notifications/page${qs}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      handleAuthFailure();
      return {
        content: [],
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
        unreadCount: 0,
      };
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch paginated notifications (${response.status})`
      );
    }

    return await response.json();
  },

  // GET UNREAD NOTIFICATIONS
  getUnreadNotifications: async () => {
    const response = await fetch(
      `${API_BASE_URL}/notifications/unread`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      handleAuthFailure();
      return [];
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch unread notifications (${response.status})`
      );
    }

    return await response.json();
  },

  // GET UNREAD COUNT
  getUnreadCount: async () => {
    const response = await fetch(
      `${API_BASE_URL}/notifications/unread/count`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      handleAuthFailure();
      return 0;
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch notification count (${response.status})`
      );
    }

    const count = await response.json();
    return Math.max(0, Number(count) || 0);
  },

  // MARK ONE NOTIFICATION AS READ
  markAsRead: async (notificationId) => {
    const response = await fetch(
      `${API_BASE_URL}/notifications/${notificationId}/read`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      handleAuthFailure();
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Failed to mark notification as read (${response.status})`
      );
    }

    return await response.json();
  },

  // MARK ALL NOTIFICATIONS AS READ
  markAllAsRead: async () => {
    const response = await fetch(
      `${API_BASE_URL}/notifications/read-all`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      handleAuthFailure();
      return 0;
    }

    if (!response.ok) {
      throw new Error(
        `Failed to mark all notifications as read (${response.status})`
      );
    }

    return await response.json();
  },

  // HR ADMIN: BROADCAST ANNOUNCEMENT
  broadcastAnnouncement: async (payload) => {
    const response = await fetch(
      `${API_BASE_URL}/notifications/announcements`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload || {}),
      }
    );

    if (response.status === 401) {
      handleAuthFailure();
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to send announcement (${response.status})`);
    }

    return await response.json();
  },

  // HR ADMIN: TRIGGER REMINDER SCAN ON DEMAND
  runReminders: async () => {
    const response = await fetch(
      `${API_BASE_URL}/notifications/admin/run-reminders`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      handleAuthFailure();
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to run deadline reminders (${response.status})`);
    }

    return await response.json();
  },

  // HR ADMIN: TRIGGER COMPLIANCE DIGEST ON DEMAND
  runComplianceDigest: async () => {
    const response = await fetch(
      `${API_BASE_URL}/notifications/admin/run-digest`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      handleAuthFailure();
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to run compliance digest (${response.status})`);
    }

    return await response.json();
  },

  // HR ADMIN: SYSTEM DIAGNOSTICS
  getDiagnostics: async () => {
    const response = await fetch(
      `${API_BASE_URL}/notifications/admin/diagnostics`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      handleAuthFailure();
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to load diagnostics (${response.status})`);
    }

    return await response.json();
  },
};
