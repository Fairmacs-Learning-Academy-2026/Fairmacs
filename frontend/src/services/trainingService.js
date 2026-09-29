// Training Service
// Handles training assignments and calendar events

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const trainingService = {
  // Assign training to target (employee, department, role, or all)
  assignTraining: async (assignmentData) => {
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/training/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(assignmentData),
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/training/assignments/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/training/assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/training/calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/training/calendar?month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/training/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
