// Course Service
// Handles course-related API calls

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const getToken = () => {
  return localStorage.getItem('fairmacs_lms_token');
};

export const courseService = {

  // Get all courses
  getAllCourses: async () => {
    const token = getToken();

    try {
      const response = await fetch(`${API_BASE_URL}/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      return await response.json();
    } catch (error) {
      console.error('Get courses error:', error);
      return [];
    }
  },

  // Get employee learning dashboard
  getLearningDashboard: async () => {
    const token = getToken();

    try {
      const response = await fetch(
        `${API_BASE_URL}/learning/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch learning dashboard');
      }

      return await response.json();
    } catch (error) {
      console.error(
        'Get learning dashboard error:',
        error
      );

      return null;
    }
  },

  // Get course by course ID
  getCourseById: async (courseId) => {
    const token = getToken();

    try {
      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch course');
      }

      return await response.json();
    } catch (error) {
      console.error('Get course error:', error);
      return null;
    }
  },

  // Get courses by category
  getCoursesByCategory: async (category) => {
    const token = getToken();

    try {
      const response = await fetch(
        `${API_BASE_URL}/courses?category=${encodeURIComponent(category)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          'Failed to fetch courses by category'
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

  // Search courses
  searchCourses: async (query) => {
    const token = getToken();

    try {
      const response = await fetch(
        `${API_BASE_URL}/courses?search=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search courses');
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

  // Create course (HR/Trainer only)
  createCourse: async (courseData) => {
    const token = getToken();

    try {
      const response = await fetch(
        `${API_BASE_URL}/courses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(courseData),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create course');
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

  // Update course (HR/Trainer only)
  updateCourse: async (courseId, courseData) => {
    const token = getToken();

    try {
      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(courseData),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update course');
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

  // Delete course (HR only)
  deleteCourse: async (courseId) => {
    const token = getToken();

    try {
      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete course');
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