// Authentication Service
// Handles login, logout, token management, and user authentication

import {
  API_BASE_URL,
  TOKEN_KEY,
  USER_KEY,
  getAuthToken,
  clearAuthTokens,
  handleUnauthorized,
} from '../utils/apiConfig';

async function safeParseJson(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn(
      'Response was not valid JSON:',
      text.slice(0, 200)
    );

    return null;
  }
}

export const authService = {

  /*
   * LOGIN
   *
   * Authentication is performed strictly by the Spring Boot backend.
   * There is NO mock/fallback login.
   */
  login: async (loginId, password) => {
    try {
      const cleanLoginId = String(loginId || '').trim();

      if (!cleanLoginId) {
        return {
          success: false,
          error: 'Employee ID or Email is required.'
        };
      }

      if (!password) {
        return {
          success: false,
          error: 'Password is required.'
        };
      }

      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            loginId: cleanLoginId,
            password
          })
        }
      );

      const envelope = await safeParseJson(response);

      if (!response.ok || !envelope || !envelope.success) {
        let message = envelope?.message;

        if (!message) {
          if (response.status === 401) {
            message = 'Invalid Employee ID / Email or Password.';
          } else if (response.status === 403) {
            message = 'Access denied. Please contact HR Admin.';
          } else if (response.status >= 500) {
            message = 'Authentication server error. Please try again.';
          } else {
            message = `Login failed (HTTP ${response.status}).`;
          }
        }

        return {
          success: false,
          error: message
        };
      }

      const payload = envelope.data || {};
      const token = payload.token;

      const user = {
        ...payload,
        mustChangePassword: Boolean(payload.mustChangePassword)
      };

      if (!token) {
        console.error('Backend login succeeded but no JWT was returned.');
        return {
          success: false,
          error: 'Authentication succeeded but no access token was returned.'
        };
      }

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      localStorage.removeItem('fairmacs_lms_token');
      localStorage.removeItem('fairmacs_lms_user');

      return {
        success: true,
        user,
        token
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Unable to connect to the authentication server.'
      };
    }
  },

  /*
   * LOGOUT
   */
  logout: () => {
    clearAuthTokens();
  },

  /*
   * GET CURRENT USER (/api/auth/me)
   */
  getCurrentUser: async () => {
    const token = getAuthToken();

    if (!token) {
      return null;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/me`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized(false);
        }
        return null;
      }

      const envelope = await safeParseJson(response);
      return envelope?.data || envelope?.user || envelope || null;

    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  /*
   * CHECK AUTHENTICATION
   */
  isAuthenticated: () => {
    return Boolean(getAuthToken());
  },

  /*
   * GET AUTH TOKEN
   */
  getToken: () => {
    return getAuthToken();
  },

  /*
   * REFRESH TOKEN
   */
  refreshToken: async () => {
    const token = getAuthToken();

    if (!token) {
      return null;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/refresh`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        handleUnauthorized(false);
        return null;
      }

      const envelope = await safeParseJson(response);
      const newToken = envelope?.data?.token || envelope?.token;

      if (!newToken) {
        handleUnauthorized(false);
        return null;
      }

      localStorage.setItem(TOKEN_KEY, newToken);
      return newToken;

    } catch (error) {
      console.error('Token refresh error:', error);
      handleUnauthorized(false);
      return null;
    }
  },

  /*
   * CHANGE PASSWORD
   *
   * Verifies currentPassword and updates to newPassword in a single
   * authenticated request, rotating the active JWT on success.
   */
  changePassword: async (currentPassword, newPassword) => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      return {
        success: false,
        error: 'You are not authenticated.'
      };
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            currentPassword,
            newPassword
          })
        }
      );

      const envelope = await safeParseJson(response);

      if (!response.ok || !envelope?.success) {
        return {
          success: false,
          error: envelope?.message || `Password change failed (HTTP ${response.status}).`
        };
      }

      if (envelope.data?.token) {
        localStorage.setItem(TOKEN_KEY, envelope.data.token);
      }

      return envelope;

    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: error.message || 'Unable to change password.'
      };
    }
  }
};

export default authService;
