// Report Service
// Handles analytics, reports, and audit logs

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const reportService = {
  // Get HR dashboard metrics
  getHRMetrics: async () => {
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/reports/hr-metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch HR metrics');
      }

      return await response.json();
    } catch (error) {
      console.error('Get HR metrics error:', error);
      return null;
    }
  },

  // Get department analytics
  getDepartmentAnalytics: async (department) => {
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/reports/department/${department}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch department analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Get department analytics error:', error);
      return null;
    }
  },

  // Get audit logs
  getAuditLogs: async (limit = 50, offset = 0) => {
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/reports/audit-logs?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      return await response.json();
    } catch (error) {
      console.error('Get audit logs error:', error);
      return [];
    }
  },

  // Get completion report
  getCompletionReport: async (filters = {}) => {
    const token = localStorage.getItem('fairmacs_token');
    const queryParams = new URLSearchParams(filters).toString();
    
    try {
      const response = await fetch(`${API_BASE_URL}/reports/completion?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch completion report');
      }

      return await response.json();
    } catch (error) {
      console.error('Get completion report error:', error);
      return [];
    }
  },

  // Export report to PDF/Excel
  exportReport: async (reportType, format = 'pdf') => {
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/reports/export?type=${reportType}&format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Export report error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get overdue training report
  getOverdueReport: async () => {
    const token = localStorage.getItem('fairmacs_token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/reports/overdue`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch overdue report');
      }

      return await response.json();
    } catch (error) {
      console.error('Get overdue report error:', error);
      return [];
    }
  }
};
