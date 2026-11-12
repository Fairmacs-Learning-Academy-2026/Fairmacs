// Employee Service
// Handles employee-related API calls

import {
  API_BASE_URL,
  getAuthHeaders,
  handleUnauthorized,
} from '../utils/apiConfig';

export const employeeService = {
  // Get all employees
  getAllEmployees: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return [];
      }

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      return await response.json();
    } catch (error) {
      console.error('Get employees error:', error);
      return [];
    }
  },

  // Get employee by ID
  getEmployeeById: async (employeeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch employee');
      }

      return await response.json();
    } catch (error) {
      console.error('Get employee error:', error);
      return null;
    }
  },

  // Get employees by department
  getEmployeesByDepartment: async (department) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/department/${department}`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return [];
      }

      if (!response.ok) {
        throw new Error('Failed to fetch department employees');
      }

      return await response.json();
    } catch (error) {
      console.error('Get department employees error:', error);
      return [];
    }
  },

  // Create employee (HR only)
  createEmployee: async (employeeData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(employeeData),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return { success: false, error: 'Unauthorized' };
      }

      if (!response.ok) {
        throw new Error('Failed to create employee');
      }

      return await response.json();
    } catch (error) {
      console.error('Create employee error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update employee (HR only)
  updateEmployee: async (employeeId, employeeData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(employeeData),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return { success: false, error: 'Unauthorized' };
      }

      if (!response.ok) {
        throw new Error('Failed to update employee');
      }

      return await response.json();
    } catch (error) {
      console.error('Update employee error:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete employee (HR only)
  deleteEmployee: async (employeeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.status === 401) {
        handleUnauthorized(true);
        return { success: false, error: 'Unauthorized' };
      }

      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }

      return { success: true };
    } catch (error) {
      console.error('Delete employee error:', error);
      return { success: false, error: error.message };
    }
  }
};
