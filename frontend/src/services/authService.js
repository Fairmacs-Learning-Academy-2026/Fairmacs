// Authentication Service
// Handles login, logout, token management, and user authentication

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8080/api';

const TOKEN_KEY = 'fairmacs_token';
const USER_KEY = 'fairmacs_user';

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
   * Authentication is performed only by
   * Spring Boot + MySQL.
   *
   * There is NO mock/fallback login.
   */
  login: async (loginId, password) => {

    try {

      const cleanLoginId =
        String(loginId || '').trim();

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

      const response =
        await fetch(
          `${API_BASE_URL}/auth/login`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              'Accept':
                'application/json'
            },

            body: JSON.stringify({
              loginId: cleanLoginId,
              password
            })
          }
        );

      const envelope =
        await safeParseJson(response);

      if (
        !response.ok ||
        !envelope ||
        !envelope.success
      ) {

        let message =
          envelope?.message;

        if (!message) {

          if (response.status === 401) {
            message =
              'Invalid Employee ID / Email or Password.';
          } else if (response.status === 403) {
            message =
              'Access denied. Please contact HR Admin.';
          } else if (response.status >= 500) {
            message =
              'Authentication server error. Please try again.';
          } else {
            message =
              `Login failed (HTTP ${response.status}).`;
          }
        }

        return {
          success: false,
          error: message
        };
      }

      const payload =
        envelope.data || {};

      const token =
        payload.token;

      /*
       * LoginResponse itself is the user object.
       */
      const user = {
        ...payload
      };

      /*
       * A successful login MUST contain
       * a real JWT.
       */
      if (!token) {

        console.error(
          'Backend login succeeded but no JWT was returned.'
        );

        return {
          success: false,
          error:
            'Authentication succeeded but no access token was returned.'
        };
      }

      /*
       * Store only the canonical authentication
       * keys.
       */
      localStorage.setItem(
        TOKEN_KEY,
        token
      );

      localStorage.setItem(
        USER_KEY,
        JSON.stringify(user)
      );

      /*
       * Remove legacy authentication keys.
       */
      localStorage.removeItem(
        'fairmacs_lms_token'
      );

      localStorage.removeItem(
        'fairmacs_lms_user'
      );

      return {
        success: true,
        user,
        token
      };

    } catch (error) {

      console.error(
        'Login error:',
        error
      );

      return {
        success: false,
        error:
          error.message ||
          'Unable to connect to the authentication server.'
      };
    }
  },


  /*
   * LOGOUT
   */
  logout: () => {

    localStorage.removeItem(
      TOKEN_KEY
    );

    localStorage.removeItem(
      USER_KEY
    );

    /*
     * Remove legacy authentication data too.
     */
    localStorage.removeItem(
      'fairmacs_lms_token'
    );

    localStorage.removeItem(
      'fairmacs_lms_user'
    );
  },


  /*
   * GET CURRENT USER
   *
   * This method is kept for compatibility
   * with the rest of the application.
   */
  getCurrentUser: async () => {

    const token =
      localStorage.getItem(
        TOKEN_KEY
      );

    if (!token) {
      return null;
    }

    try {

      const response =
        await fetch(
          `${API_BASE_URL}/auth/me`,
          {
            headers: {
              'Authorization':
                `Bearer ${token}`,

              'Accept':
                'application/json'
            }
          }
        );

      if (!response.ok) {

        /*
         * Invalid/expired token.
         */
        if (
          response.status === 401 ||
          response.status === 403
        ) {

          authService.logout();
        }

        return null;
      }

      const envelope =
        await safeParseJson(response);

      return (
        envelope?.data ||
        envelope?.user ||
        envelope ||
        null
      );

    } catch (error) {

      console.error(
        'Get current user error:',
        error
      );

      return null;
    }
  },


  /*
   * CHECK AUTHENTICATION
   *
   * Only the real JWT counts.
   */
  isAuthenticated: () => {

    return Boolean(
      localStorage.getItem(
        TOKEN_KEY
      )
    );
  },


  /*
   * GET AUTH TOKEN
   */
  getToken: () => {

    return (
      localStorage.getItem(
        TOKEN_KEY
      ) || ''
    );
  },


  /*
   * REFRESH TOKEN
   *
   * Kept for compatibility.
   */
  refreshToken: async () => {

    const token =
      localStorage.getItem(
        TOKEN_KEY
      );

    if (!token) {
      return null;
    }

    try {

      const response =
        await fetch(
          `${API_BASE_URL}/auth/refresh`,
          {
            method: 'POST',

            headers: {
              'Authorization':
                `Bearer ${token}`,

              'Accept':
                'application/json'
            }
          }
        );

      if (!response.ok) {

        authService.logout();

        return null;
      }

      const envelope =
        await safeParseJson(response);

      const newToken =
        envelope?.data?.token ||
        envelope?.token;

      if (!newToken) {

        authService.logout();

        return null;
      }

      localStorage.setItem(
        TOKEN_KEY,
        newToken
      );

      return newToken;

    } catch (error) {

      console.error(
        'Token refresh error:',
        error
      );

      authService.logout();

      return null;
    }
  },


  /*
   * VERIFY CURRENT PASSWORD
   *
   * This only verifies the current password.
   * It does NOT change the password.
   */
  verifyCurrentPassword: async (
    currentPassword
  ) => {

    const token =
      localStorage.getItem(
        TOKEN_KEY
      );

    if (!token) {

      return {
        success: false,
        error:
          'You are not authenticated.'
      };
    }

    try {

      const response =
        await fetch(
          `${API_BASE_URL}/auth/verify-current-password`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              'Authorization':
                `Bearer ${token}`,

              'Accept':
                'application/json'
            },

            body: JSON.stringify({
              currentPassword
            })
          }
        );

      const envelope =
        await safeParseJson(response);

      if (
        !response.ok ||
        !envelope?.success
      ) {

        return {
          success: false,
          error:
            envelope?.message ||
            `Password verification failed (HTTP ${response.status}).`
        };
      }

      return {
        success: true,
        valid:
          envelope.data === true,
        message:
          envelope.message
      };

    } catch (error) {

      console.error(
        'Current password verification error:',
        error
      );

      return {
        success: false,
        error:
          error.message ||
          'Unable to verify current password.'
      };
    }
  },


  /*
   * CHANGE PASSWORD
   *
   * This API actually changes the password.
   */
  changePassword: async (
    currentPassword,
    newPassword
  ) => {

    const token =
      localStorage.getItem(
        TOKEN_KEY
      );

    if (!token) {

      return {
        success: false,
        error:
          'You are not authenticated.'
      };
    }

    try {

      const response =
        await fetch(
          `${API_BASE_URL}/auth/change-password`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              'Authorization':
                `Bearer ${token}`,

              'Accept':
                'application/json'
            },

            body: JSON.stringify({
              currentPassword,
              newPassword
            })
          }
        );

      const envelope =
        await safeParseJson(response);

      if (
        !response.ok ||
        !envelope?.success
      ) {

        return {
          success: false,
          error:
            envelope?.message ||
            `Password change failed (HTTP ${response.status}).`
        };
      }

      return envelope;

    } catch (error) {

      console.error(
        'Change password error:',
        error
      );

      return {
        success: false,
        error:
          error.message ||
          'Unable to change password.'
      };
    }
  }
};

export default authService;