/**
 * Fairmacs KMS — Standardized API Configuration & Authentication Utilities
 *
 * Centralizes:
 * 1. Base URL resolution supporting local dev (Vite proxy / localhost:8080) and production (/api).
 * 2. Uniform authentication header creation (Bearer JWT).
 * 3. Safe token retrieval and clean logout / session expiration handling.
 */

export const TOKEN_KEY = 'fairmacs_token';
export const USER_KEY = 'fairmacs_user';
export const LEGACY_TOKEN_KEY = 'fairmacs_lms_token';
export const LEGACY_USER_KEY = 'fairmacs_lms_user';

/**
 * Returns the standardized API base URL.
 * Prefers VITE_API_BASE_URL env variable if present.
 * In production builds without explicit env, defaults safely to '/api' (relative reverse-proxy path).
 * In development, falls back to 'http://localhost:8080/api' or relative '/api'.
 */
export function getApiBaseUrl() {
  const envUrl = typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  const isProd = typeof import.meta !== 'undefined' && import.meta?.env?.PROD;
  if (isProd) {
    return 'https://fairmacs-lms-api.onrender.com/api';
  }

  return 'http://localhost:8080/api';
}

export const API_BASE_URL = getApiBaseUrl();

/**
 * Retrieves the current authentication JWT token from localStorage.
 */
export function getAuthToken() {
  if (typeof localStorage === 'undefined') return '';
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY) ||
    ''
  );
}

/**
 * Generates standardized headers with Authorization Bearer token.
 */
export function getAuthHeaders(customHeaders = {}) {
  const token = getAuthToken();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };
}

/**
 * Clears all authentication tokens and user information on logout or 401 session expiration.
 */
export function clearAuthTokens() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

/**
 * Handles 401 Unauthorized by clearing stale tokens and optionally redirecting to login.
 */
export function handleUnauthorized(redirect = true) {
  clearAuthTokens();
  if (redirect && typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

/**
 * Drop-in replacement for fetch() for calls to the backend API.
 * If the server answers 401 (expired / invalid token) the stale session is cleared
 * and the user is sent to the login page, instead of every screen showing "Request failed (401)".
 */
export async function authFetch(input, init) {
  const response = await fetch(input, init);
  if (response.status === 401) {
    handleUnauthorized(true);
  }
  return response;
}
