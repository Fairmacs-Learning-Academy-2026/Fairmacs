// Assessment Service
// Handles quiz/assessment-related API calls

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const assessmentService = {
  // Get assessment by course ID
  getAssessmentByCourse: async (courseId) => {
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/assessments/course/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/attempts/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(assessmentData),
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(assessmentData),
      });

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
