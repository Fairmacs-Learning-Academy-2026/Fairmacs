const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

function getAuthToken() {
  return (
    localStorage.getItem('fairmacs_token') ||
    localStorage.getItem('fairmacs_lms_token')
  );
}

function authHeaders() {
  const token = getAuthToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeParseJson(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractData(payload, fallback = null) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload ?? fallback;
}

export const enrollmentService = {
  // ---------------------------------------------------------
  // ENROLL IN COURSE
  // ---------------------------------------------------------
  enrollInCourse: async (courseId) => {
    const response = await fetch(`${API_BASE_URL}/enrollments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        courseId,
      }),
    });

    const payload = await safeParseJson(response);

    if (!response.ok) {
      throw new Error(
        payload?.message || 'Failed to enroll in course'
      );
    }

    return extractData(payload, { success: true });
  },

  // ---------------------------------------------------------
  // GET CURRENT USER ENROLLMENTS
  // ---------------------------------------------------------
  getUserEnrollments: async () => {
    const response = await fetch(`${API_BASE_URL}/enrollments/me`, {
      method: 'GET',
      headers: authHeaders(),
    });

    const payload = await safeParseJson(response);

    if (!response.ok) {
      throw new Error(
        payload?.message || 'Failed to fetch enrollments'
      );
    }

    return extractData(payload, []);
  },

  // ---------------------------------------------------------
  // UPDATE LESSON PROGRESS
  // ---------------------------------------------------------
  updateLessonProgress: async (
    enrollmentId,
    lessonId,
    completionPercent = 0,
    watchedSeconds = 0,
    lastPositionSeconds = 0
  ) => {
    const response = await fetch(
      `${API_BASE_URL}/progress/${enrollmentId}/${lessonId}`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          completionPercent,
          watchedSeconds,
          lastPositionSeconds,
        }),
      }
    );

    const payload = await safeParseJson(response);

    if (!response.ok) {
      throw new Error(
        payload?.message || 'Failed to update lesson progress'
      );
    }

    return extractData(payload, { success: true });
  },

  // ---------------------------------------------------------
  // GET ALL LESSON PROGRESS FOR AN ENROLLMENT
  // ---------------------------------------------------------
  getEnrollmentProgress: async (enrollmentId) => {
    const response = await fetch(
      `${API_BASE_URL}/progress/${enrollmentId}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const payload = await safeParseJson(response);

    if (!response.ok) {
      throw new Error(
        payload?.message || 'Failed to fetch course progress'
      );
    }

    return extractData(payload, []);
  },

  // ---------------------------------------------------------
  // GET SINGLE LESSON PROGRESS
  // ---------------------------------------------------------
  getLessonProgress: async (enrollmentId, lessonId) => {
    const response = await fetch(
      `${API_BASE_URL}/progress/${enrollmentId}/${lessonId}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const payload = await safeParseJson(response);

    if (!response.ok) {
      throw new Error(
        payload?.message || 'Failed to fetch lesson progress'
      );
    }

    return extractData(payload, null);
  },

  // ---------------------------------------------------------
  // COMPLETE COURSE / GENERATE CERTIFICATE
  // ---------------------------------------------------------
  completeCourse: async ({
    enrollmentId,
    courseId,
    courseCode,
    score,
  }) => {
    const response = await fetch(
      `${API_BASE_URL}/certificates/generate`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          enrollmentId,
          courseId,
          courseCode,
          score,
        }),
      }
    );

    const payload = await safeParseJson(response);

    if (!response.ok) {
      throw new Error(
        payload?.message || 'Failed to complete course'
      );
    }

    return extractData(payload, null);
  },

  // ---------------------------------------------------------
  // VERIFY CERTIFICATE
  // ---------------------------------------------------------
  verifyCertificate: async (certificateId) => {
    const response = await fetch(
      `${API_BASE_URL}/certificates/verify/${certificateId}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const payload = await safeParseJson(response);

    if (!response.ok) {
      throw new Error(
        payload?.message || 'Failed to verify certificate'
      );
    }

    return extractData(payload, null);
  },

  // ---------------------------------------------------------
  // GET USER CERTIFICATES
  // ---------------------------------------------------------
  getUserCertificates: async (userId) => {
    const response = await fetch(
      `${API_BASE_URL}/certificates/user/${userId}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const payload = await safeParseJson(response);

    if (!response.ok) {
      throw new Error(
        payload?.message || 'Failed to fetch certificates'
      );
    }

    return extractData(payload, []);
  },

  // ---------------------------------------------------------
  // GET RECENT CERTIFICATES
  // ---------------------------------------------------------
  getRecentCertificates: async (limit = 10) => {
    const response = await fetch(
      `${API_BASE_URL}/certificates/recent?limit=${limit}`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    );

    const payload = await safeParseJson(response);

    if (!response.ok) {
      throw new Error(
        payload?.message || 'Failed to fetch recent certificates'
      );
    }

    return extractData(payload, []);
  },
};