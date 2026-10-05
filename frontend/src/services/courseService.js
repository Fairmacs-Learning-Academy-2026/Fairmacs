// Course Service
// Handles course-related API calls

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8080/api';

const TOKEN_KEY = 'fairmacs_token';
const USER_KEY = 'fairmacs_user';


// ============================================================
// GET CURRENT AUTH TOKEN
// ============================================================

const getToken = () => {
  return localStorage.getItem(TOKEN_KEY) || '';
};


// ============================================================
// CLEAR AUTHENTICATION
// ============================================================

const forceLogout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  // Remove legacy authentication keys
  localStorage.removeItem('fairmacs_lms_token');
  localStorage.removeItem('fairmacs_lms_user');

  window.location.href = '/login';
};


// ============================================================
// AUTH HEADERS
// ============================================================

const getAuthHeaders = () => {
  const token = getToken();

  return {
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};


// ============================================================
// COURSE SERVICE
// ============================================================

export const courseService = {

  // ==========================================================
  // GET ALL COURSES
  // ==========================================================

  getAllCourses: async () => {
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

      return await response.json();

    } catch (error) {
      console.error(
        'Get courses error:',
        error
      );

      return [];
    }
  },


  // ==========================================================
  // GET EMPLOYEE LEARNING DASHBOARD
  // ==========================================================

  getLearningDashboard: async () => {

    const token = getToken();

    if (!token) {
      console.error(
        'Learning dashboard request blocked: no authentication token.'
      );

      return null;
    }

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

      return await response.json();

    } catch (error) {

      console.error(
        'Get learning dashboard error:',
        error
      );

      return null;
    }
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

        throw new Error(
          `Failed to delete course (${response.status})`
        );
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
};


export default courseService;