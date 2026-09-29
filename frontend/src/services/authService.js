// Authentication Service
// Handles login, logout, token management, and user authentication

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const TOKEN_KEY = 'fairmacs_token';
const USER_KEY = 'fairmacs_user';

async function safeParseJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn('Response was not valid JSON:', text.slice(0, 200));
    return null;
  }
}

export const authService = {
  // Login user
  login: async (loginId, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ loginId, password }),
      });

      const envelope = await safeParseJson(response);

      if (!response.ok || !envelope || !envelope.success) {
        const msg = envelope?.message || (response.status === 401 ? 'Invalid Employee ID or Password' : `Login failed (HTTP ${response.status})`);
        return { success: false, error: msg };
      }

      const payload = envelope.data || {};
      const token = payload.token || envelope.token;
      const user = payload.user || payload;

      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }

      return { success: true, user, token };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login error - check backend connectivity' };
    }
  },

  // Logout user
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('fairmacs_lms_token');
    localStorage.removeItem('fairmacs_lms_user');
  },

  // Get current user from token
  getCurrentUser: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      return await safeParseJson(response);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem(TOKEN_KEY) || !!localStorage.getItem('fairmacs_lms_token');
  },

  // Get auth token
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('fairmacs_lms_token');
  },

  // Refresh token
  refreshToken: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const envelope = await safeParseJson(response);
      const newToken = envelope?.data?.token || envelope?.token;
      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
      }
      return newToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      authService.logout();
      return null;
    }
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const token = localStorage.getItem(TOKEN_KEY);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const envelope = await safeParseJson(response);
      if (!response.ok || !envelope?.success) {
        const msg = envelope?.message || `Password change failed (HTTP ${response.status})`;
        return { success: false, error: msg };
      }
      return envelope;
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: error.message };
    }
  }
};
