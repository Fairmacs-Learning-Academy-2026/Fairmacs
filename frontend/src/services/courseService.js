// Course Service
// Handles course-related API calls

import {
  API_BASE_URL,
  getAuthHeaders,
  getAuthToken,
  handleUnauthorized,
} from '../utils/apiConfig';
import { EVENT_ENROLLMENT_UPDATED } from '../utils/enrollmentSync';

const getToken = () => getAuthToken();
const forceLogout = () => handleUnauthorized(true);

const DASHBOARD_CACHE_TTL_MS = 15000;
let cachedDashboard = null;
let cachedDashboardAt = 0;
let cachedDashboardToken = '';
let inFlightDashboardPromise = null;

let cachedAllCourses = null;
let cachedAllCoursesAt = 0;
let inFlightAllCoursesPromise = null;

export function invalidateCourseServiceCache() {
  cachedDashboard = null;
  cachedDashboardAt = 0;
  inFlightDashboardPromise = null;
  cachedAllCourses = null;
  cachedAllCoursesAt = 0;
  inFlightAllCoursesPromise = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener(EVENT_ENROLLMENT_UPDATED, invalidateCourseServiceCache);
}


// ============================================================
// COURSE SERVICE
// ============================================================

export const courseService = {

  invalidateDashboardCache: invalidateCourseServiceCache,

  getCachedLearningDashboard: () => {
    const token = getToken() || '';
    if (
      cachedDashboard &&
      cachedDashboardToken === token &&
      Date.now() - cachedDashboardAt < DASHBOARD_CACHE_TTL_MS
    ) {
      return cachedDashboard;
    }
    return null;
  },

  // ==========================================================
  // GET ALL COURSES
  // ==========================================================

  getAllCourses: async (options = {}) => {
    const force = Boolean(options?.force);
    const now = Date.now();
    if (!force && cachedAllCourses && now - cachedAllCoursesAt < DASHBOARD_CACHE_TTL_MS) {
      return cachedAllCourses;
    }
    if (!force && inFlightAllCoursesPromise) {
      return inFlightAllCoursesPromise;
    }

    const reqPromise = (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/courses`,
          {
            method: 'GET',
            headers: getAuthHeaders(),
          }
        );

        if (response.status === 401) {
          forceLogout();
          return [];
        }

        if (response.status === 403) {
          console.error(
            'Get courses returned 403 Forbidden.'
          );
          return [];
        }

        if (!response.ok) {
          throw new Error(
            `Failed to fetch courses (${response.status})`
          );
        }

        const data = await response.json();
        cachedAllCourses = data;
        cachedAllCoursesAt = Date.now();
        return data;

      } catch (error) {
        console.error(
          'Get courses error:',
          error
        );

        return [];
      } finally {
        if (inFlightAllCoursesPromise === reqPromise) {
          inFlightAllCoursesPromise = null;
        }
      }
    })();

    inFlightAllCoursesPromise = reqPromise;
    return reqPromise;
  },


  // ==========================================================
  // GET TRAINER INSIGHTS
  // ==========================================================

  getTrainerInsights: async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/trainer/insights`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Get trainer insights error:', error);
      return null;
    }
  },

  // ==========================================================
  // GET UPCOMING LIVE SESSIONS
  // ==========================================================

  getUpcomingLiveSessions: async (limit = 5) => {
    const response = await fetch(
      `${API_BASE_URL}/training-calendar/upcoming?limit=${encodeURIComponent(limit)}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      forceLogout();
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch upcoming live sessions (${response.status})`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  // ==========================================================
  // GET RECENT LEARNER ACTIVITY
  // ==========================================================

  getRecentLearnerActivity: async (limit = 8) => {
    const response = await fetch(
      `${API_BASE_URL}/activity/recent?limit=${encodeURIComponent(limit)}`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      forceLogout();
      return [];
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch recent learner activity (${response.status})`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  // ==========================================================
  // GET EMPLOYEE LEARNING DASHBOARD
  // ==========================================================

  getLearningDashboard: async (options = {}) => {

    const token = getToken();

    if (!token) {
      console.error(
        'Learning dashboard request blocked: no authentication token.'
      );

      return null;
    }

    const force = Boolean(options?.force);
    const now = Date.now();
    if (
      !force &&
      cachedDashboard &&
      cachedDashboardToken === token &&
      now - cachedDashboardAt < DASHBOARD_CACHE_TTL_MS
    ) {
      return cachedDashboard;
    }

    if (!force && inFlightDashboardPromise && cachedDashboardToken === token) {
      return inFlightDashboardPromise;
    }

    cachedDashboardToken = token;
    const reqPromise = (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/learning/dashboard`,
          {
            method: 'GET',

            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );


        // ------------------------------------------------------
        // UNAUTHORIZED
        // ------------------------------------------------------

        if (response.status === 401) {

          console.error(
            'Learning dashboard returned 401 Unauthorized.'
          );

          forceLogout();

          return null;
        }


        // ------------------------------------------------------
        // FORBIDDEN
        // ------------------------------------------------------

        if (response.status === 403) {

          console.error(
            'Learning dashboard returned 403 Forbidden.'
          );

          console.error(
            'The JWT was rejected or the authenticated user does not have permission.'
          );

          return null;
        }


        // ------------------------------------------------------
        // OTHER HTTP ERRORS
        // ------------------------------------------------------

        if (!response.ok) {

          const errorText =
            await response.text();

          console.error(
            'Learning dashboard request failed:',
            response.status,
            errorText
          );

          throw new Error(
            `Failed to fetch learning dashboard (${response.status})`
          );
        }


        // ------------------------------------------------------
        // SUCCESS
        // ------------------------------------------------------

        const data = await response.json();
        cachedDashboard = data;
        cachedDashboardAt = Date.now();
        return data;

      } catch (error) {

        console.error(
          'Get learning dashboard error:',
          error
        );

        return null;
      } finally {
        if (inFlightDashboardPromise === reqPromise) {
          inFlightDashboardPromise = null;
        }
      }
    })();

    inFlightDashboardPromise = reqPromise;
    return reqPromise;
  },


  // ==========================================================
  // GET COURSE BY COURSE ID
  // ==========================================================

  getCourseById: async (courseId) => {

    try {

      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );


      if (response.status === 401) {

        forceLogout();

        return null;
      }


      if (response.status === 403) {

        console.error(
          'Course request returned 403 Forbidden.'
        );

        return null;
      }


      if (!response.ok) {

        throw new Error(
          `Failed to fetch course (${response.status})`
        );
      }


      return await response.json();

    } catch (error) {

      console.error(
        'Get course error:',
        error
      );

      return null;
    }
  },


  // ==========================================================
  // GET COURSES BY CATEGORY
  // ==========================================================

  getCoursesByCategory: async (category) => {

    try {

      const response = await fetch(
        `${API_BASE_URL}/courses?category=${encodeURIComponent(
          category
        )}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );


      if (response.status === 401) {

        forceLogout();

        return [];
      }


      if (response.status === 403) {

        console.error(
          'Courses by category returned 403 Forbidden.'
        );

        return [];
      }


      if (!response.ok) {

        throw new Error(
          `Failed to fetch courses by category (${response.status})`
        );
      }


      return await response.json();

    } catch (error) {

      console.error(
        'Get courses by category error:',
        error
      );

      return [];
    }
  },


  // ==========================================================
  // SEARCH COURSES
  // ==========================================================

  searchCourses: async (query) => {

    try {

      const response = await fetch(
        `${API_BASE_URL}/courses?search=${encodeURIComponent(
          query
        )}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );


      if (response.status === 401) {

        forceLogout();

        return [];
      }


      if (response.status === 403) {

        console.error(
          'Search courses returned 403 Forbidden.'
        );

        return [];
      }


      if (!response.ok) {

        throw new Error(
          `Failed to search courses (${response.status})`
        );
      }


      return await response.json();

    } catch (error) {

      console.error(
        'Search courses error:',
        error
      );

      return [];
    }
  },


  // ==========================================================
  // CREATE COURSE
  // ==========================================================

  createCourse: async (courseData) => {

    try {

      const response = await fetch(
        `${API_BASE_URL}/courses`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },

          body: JSON.stringify(courseData),
        }
      );


      if (response.status === 401) {

        forceLogout();

        return {
          success: false,
          error: 'Session expired.',
        };
      }


      if (response.status === 403) {

        return {
          success: false,
          error: 'You do not have permission to create courses.',
        };
      }


      if (!response.ok) {

        throw new Error(
          `Failed to create course (${response.status})`
        );
      }


      return await response.json();

    } catch (error) {

      console.error(
        'Create course error:',
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  },


  // ==========================================================
  // UPDATE COURSE
  // ==========================================================

  updateCourse: async (
    courseId,
    courseData
  ) => {

    try {

      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },

          body: JSON.stringify(courseData),
        }
      );


      if (response.status === 401) {

        forceLogout();

        return {
          success: false,
          error: 'Session expired.',
        };
      }


      if (response.status === 403) {

        return {
          success: false,
          error: 'You do not have permission to update courses.',
        };
      }


      if (!response.ok) {

        throw new Error(
          `Failed to update course (${response.status})`
        );
      }


      return await response.json();

    } catch (error) {

      console.error(
        'Update course error:',
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  },


  // ==========================================================
  // DELETE COURSE
  // ==========================================================

  deleteCourse: async (courseId) => {

    try {

      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );


      if (response.status === 401) {

        forceLogout();

        return {
          success: false,
          error: 'Session expired.',
        };
      }


      if (response.status === 403) {

        return {
          success: false,
          error: 'You do not have permission to delete courses.',
        };
      }


      if (!response.ok) {
        let errorMsg = `Failed to delete course (${response.status})`;
        try {
          const rawText = await response.text();
          try {
            const errData = JSON.parse(rawText);
            if (errData && errData.message) {
              errorMsg = errData.message;
            } else if (errData && errData.error) {
              errorMsg = errData.error;
            }
          } catch (_) {
            if (rawText && rawText.trim() && !rawText.trim().startsWith('<')) {
              errorMsg = rawText.trim();
            }
          }
        } catch (_) {}

        return {
          success: false,
          error: errorMsg,
        };
      }


      return {
        success: true,
      };

    } catch (error) {

      console.error(
        'Delete course error:',
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }
  },

  assignCourseOwnership: async (courseId, departmentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/ownership`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ departmentId: departmentId ? Number(departmentId) : null }),
      });
      if (response.status === 401) {
        forceLogout();
        return { success: false, error: 'Session expired.' };
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update course ownership (${response.status})`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Assign course ownership error:', error);
      return { success: false, error: error.message };
    }
  },

  updateCourseStatus: async (courseId, active) => {
    try {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/status`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: Boolean(active) }),
      });
      if (response.status === 401) {
        forceLogout();
        return { success: false, error: 'Session expired.' };
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update course status (${response.status})`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Update course status error:', error);
      return { success: false, error: error.message };
    }
  },

  // ==========================================================
  // GET LEARNING STREAKS (PHASE 3)
  // ==========================================================
  getLearningStreaks: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/learning/streaks`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        forceLogout();
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch learning streaks (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching learning streaks:', error);
      throw error;
    }
  },
};


export default courseService;