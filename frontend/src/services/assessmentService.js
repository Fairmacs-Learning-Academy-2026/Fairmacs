// Assessment Service
// Handles quiz/assessment-related API calls

import {
  API_BASE_URL,
  getAuthHeaders,
  handleUnauthorized,
} from '../utils/apiConfig';

export const assessmentService = {
  // Get assessment by course ID
  getAssessmentByCourse: async (courseId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/assessments/course/${courseId}`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch assessment');
      }

      return await response.json();
    } catch (error) {
      console.error('Get assessment error:', error);
      return null;
    }
  },

  // Submit assessment attempt
  submitAssessment: async (assessmentId, answers) => {
    try {
      const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ answers }),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return { success: false, error: 'Unauthorized' };
      }

      if (!response.ok) {
        throw new Error('Failed to submit assessment');
      }

      return await response.json();
    } catch (error) {
      console.error('Submit assessment error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get assessment attempts for user
  getUserAttempts: async (userId, assessmentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/attempts/user/${userId}`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return [];
      }

      if (!response.ok) {
        throw new Error('Failed to fetch attempts');
      }

      return await response.json();
    } catch (error) {
      console.error('Get attempts error:', error);
      return [];
    }
  },

  // Create assessment (Trainer/HR only)
  createAssessment: async (assessmentData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/assessments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(assessmentData),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return { success: false, error: 'Unauthorized' };
      }

      if (!response.ok) {
        throw new Error('Failed to create assessment');
      }

      return await response.json();
    } catch (error) {
      console.error('Create assessment error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update assessment (Trainer/HR only)
  updateAssessment: async (assessmentId, assessmentData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(assessmentData),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return { success: false, error: 'Unauthorized' };
      }

      if (!response.ok) {
        throw new Error('Failed to update assessment');
      }

      return await response.json();
    } catch (error) {
      console.error('Update assessment error:', error);
      return { success: false, error: error.message };
    }
  }
};
