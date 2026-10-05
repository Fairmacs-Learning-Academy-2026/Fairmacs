// Notification Service
// Handles notification-related API calls

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8080/api';

const TOKEN_KEY = 'fairmacs_token';
const USER_KEY = 'fairmacs_user';


// ============================================================
// GET AUTH TOKEN
// ============================================================

const getToken = () => {
  return localStorage.getItem(TOKEN_KEY) || '';
};


// ============================================================
// AUTH HEADERS
// ============================================================

const getAuthHeaders = () => {
  const token = getToken();

  return {
    'Content-Type': 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};


// ============================================================
// HANDLE AUTH FAILURE
// ============================================================

const handleAuthFailure = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  localStorage.removeItem('fairmacs_lms_token');
  localStorage.removeItem('fairmacs_lms_user');

  window.location.href = '/login';
};


// ============================================================
// NOTIFICATION SERVICE
// ============================================================

export const notificationService = {

  // ==========================================================
  // GET ALL NOTIFICATIONS
  // ==========================================================

  getNotifications: async () => {
    const response = await fetch(
      `${API_BASE_URL}/notifications`,
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


  // ==========================================================
  // GET UNREAD NOTIFICATIONS
  // ==========================================================

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


  // ==========================================================
  // GET UNREAD COUNT
  // ==========================================================

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

    return await response.json();
  },


  // ==========================================================
  // MARK ONE NOTIFICATION AS READ
  // ==========================================================

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


  // ==========================================================
  // MARK ALL NOTIFICATIONS AS READ
  // ==========================================================

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
};