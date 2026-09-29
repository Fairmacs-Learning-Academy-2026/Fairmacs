// Employee Service
// Handles employee-related API calls

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const employeeService = {
  // Get all employees
  getAllEmployees: async () => {
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/employees/department/${department}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(employeeData),
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(employeeData),
      });

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
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
