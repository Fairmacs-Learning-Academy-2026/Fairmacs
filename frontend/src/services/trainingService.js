// Training Service
// Handles training assignments and calendar events

import {
  API_BASE_URL,
  getAuthHeaders,
  handleUnauthorized,
} from '../utils/apiConfig';

export const trainingService = {
  // Assign training to target (employee, department, role, or all)
  assignTraining: async (assignmentData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/training/assignments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(assignmentData),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return { success: false, error: 'Unauthorized' };
      }

      if (!response.ok) {
        throw new Error('Failed to assign training');
      }

      return await response.json();
    } catch (error) {
      console.error('Assign training error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get training assignments for user
  getUserAssignments: async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/training/assignments/user/${userId}`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return [];
      }

      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }

      return await response.json();
    } catch (error) {
      console.error('Get assignments error:', error);
      return [];
    }
  },

  // Get all training assignments (HR/Manager)
  getAllAssignments: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/training/assignments`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return [];
      }

      if (!response.ok) {
        throw new Error('Failed to fetch all assignments');
      }

      return await response.json();
    } catch (error) {
      console.error('Get all assignments error:', error);
      return [];
    }
  },

  // Create calendar event
  createCalendarEvent: async (eventData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/training/calendar`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(eventData),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return { success: false, error: 'Unauthorized' };
      }

      if (!response.ok) {
        throw new Error('Failed to create calendar event');
      }

      return await response.json();
    } catch (error) {
      console.error('Create calendar event error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get calendar events
  getCalendarEvents: async (month, year) => {
    try {
      const response = await fetch(`${API_BASE_URL}/training/calendar?month=${month}&year=${year}`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return [];
      }

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      return await response.json();
    } catch (error) {
      console.error('Get calendar events error:', error);
      return [];
    }
  },

  // Delete training assignment (HR only)
  deleteAssignment: async (assignmentId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/training/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return { success: false, error: 'Unauthorized' };
      }

      if (!response.ok) {
        throw new Error('Failed to delete assignment');
      }

      return { success: true };
    } catch (error) {
      console.error('Delete assignment error:', error);
      return { success: false, error: error.message };
    }
  }
};
