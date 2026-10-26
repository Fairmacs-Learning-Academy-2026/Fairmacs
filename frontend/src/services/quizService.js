// Quiz Service
// Server-authoritative quiz start / submit API calls.

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const TOKEN_KEY = 'fairmacs_token';
const USER_KEY = 'fairmacs_user';

const getToken = () => {
  return localStorage.getItem(TOKEN_KEY) || '';
};

const forceLogout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  // Remove legacy authentication keys.
  localStorage.removeItem('fairmacs_lms_token');
  localStorage.removeItem('fairmacs_lms_user');

  window.location.href = '/login';
};

const getAuthHeaders = () => {
  const token = getToken();

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const readError = async (response, fallback) => {
  try {
    const data = await response.json();

    return (
      data?.message ||
      data?.error ||
      data?.detail ||
      fallback
    );
  } catch {
    return fallback;
  }
};

export const quizService = {
  startQuiz: async (quizId) => {
    if (!quizId) {
      throw new Error('Quiz ID is missing.');
    }

    const response = await fetch(
      `${API_BASE_URL}/quizzes/${quizId}/start`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      forceLogout();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(
        await readError(
          response,
          `Unable to start quiz (${response.status}).`
        )
      );
    }

    return await response.json();
  },

  getUnlockStatus: async (quizId) => {
    if (!quizId) {
      throw new Error('Quiz ID is required.');
    }

    const response = await fetch(
      `${API_BASE_URL}/quizzes/${quizId}/unlock-status`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (response.status === 401) {
      forceLogout();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(
        await readError(
          response,
          `Unable to check quiz status (${response.status}).`
        )
      );
    }

    return await response.json();
  },

  submitQuiz: async (
    attemptId,
    answers,
    timeTakenSeconds
  ) => {
    if (!attemptId) {
      throw new Error('Quiz attempt ID is missing.');
    }

    const response = await fetch(
      `${API_BASE_URL}/quizzes/submit`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          attemptId,
          answers,
          timeTakenSeconds,
        }),
      }
    );

    if (response.status === 401) {
      forceLogout();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      throw new Error(
        await readError(
          response,
          `Unable to submit quiz (${response.status}).`
        )
      );
    }

    return await response.json();
  },
};

export default quizService;
