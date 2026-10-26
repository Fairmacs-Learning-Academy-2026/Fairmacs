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
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse(response) {
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

function unwrap(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    return payload.data;
  }

  return payload;
}

function getErrorMessage(payload, fallback) {
  if (payload && typeof payload === 'object') {
    return payload.message || payload.error || fallback;
  }

  return fallback;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        payload,
        `Request failed (${response.status})`
      )
    );
  }

  return unwrap(payload);
}

export const enrollmentService = {
  // ---------------------------------------------------------
  // EMPLOYEE SELF-ENROLLMENT
  // ---------------------------------------------------------
  enrollInCourse: async (input = {}) => {
    const { courseId, courseCode } =
      input !== null && typeof input === 'object'
        ? input
        : { courseId: input, courseCode: null };

    if (!courseId && !courseCode) {
      throw new Error('Course ID or course code is required.');
    }

    return request(`${API_BASE_URL}/enrollments`, {
      method: 'POST',
      body: JSON.stringify({
        courseId: courseId || null,
        courseCode: courseCode || null,
      }),
    });
  },

  // ---------------------------------------------------------
  // CURRENT USER ENROLLMENTS
  // ---------------------------------------------------------
  getUserEnrollments: async () => {
    const data = await request(`${API_BASE_URL}/enrollments/me`, {
      method: 'GET',
    });

    return Array.isArray(data) ? data : [];
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
    return request(
      `${API_BASE_URL}/progress/${enrollmentId}/${lessonId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          completionPercent,
          watchedSeconds,
          lastPositionSeconds,
        }),
      }
    );
  },

  // ---------------------------------------------------------
  // GET ALL LESSON PROGRESS FOR AN ENROLLMENT
  // ---------------------------------------------------------
  getEnrollmentProgress: async (enrollmentId) => {
    const data = await request(
      `${API_BASE_URL}/progress/${enrollmentId}`,
      { method: 'GET' }
    );

    return Array.isArray(data) ? data : [];
  },

  // ---------------------------------------------------------
  // GET SINGLE LESSON PROGRESS
  // ---------------------------------------------------------
  getLessonProgress: async (enrollmentId, lessonId) => {
    return request(
      `${API_BASE_URL}/progress/${enrollmentId}/${lessonId}`,
      { method: 'GET' }
    );
  },

  // ---------------------------------------------------------
  // COMPLETE COURSE / GENERATE CERTIFICATE
  // ---------------------------------------------------------
  // NOTE:
  // The current backend exposes certificate generation through
  // POST /api/certificates/generate. Do not change this to a
  // different endpoint unless the backend controller changes.
  // ---------------------------------------------------------
  completeCourse: async ({
    enrollmentId,
    courseId,
    courseCode,
    score,
  } = {}) => {
    if (!enrollmentId && !courseId && !courseCode) {
      throw new Error(
        'Enrollment ID, course ID, or course code is required.'
      );
    }

    return request(`${API_BASE_URL}/certificates/generate`, {
      method: 'POST',
      body: JSON.stringify({
        enrollmentId: enrollmentId || null,
        courseId: courseId || null,
        courseCode: courseCode || null,
        score,
      }),
    });
  },

  // ---------------------------------------------------------
  // VERIFY CERTIFICATE
  // ---------------------------------------------------------
  verifyCertificate: async (certificateId) => {
    if (!certificateId) {
      throw new Error('Certificate ID is required.');
    }

    return request(
      `${API_BASE_URL}/certificates/verify/${encodeURIComponent(
        certificateId
      )}`,
      { method: 'GET' }
    );
  },

  // ---------------------------------------------------------
  // GET USER CERTIFICATES
  // ---------------------------------------------------------
  getUserCertificates: async (userId) => {
    if (!userId) {
      throw new Error('User ID is required.');
    }

    const data = await request(
      `${API_BASE_URL}/certificates/user/${encodeURIComponent(userId)}`,
      { method: 'GET' }
    );

    return Array.isArray(data) ? data : [];
  },


  // ---------------------------------------------------------
// HR: ASSIGN COURSE TO DEPARTMENT
// ---------------------------------------------------------
  assignCourseToDepartment: async ({
    department,
    courseId,
    courseCode,
    dueDate,
    trainingType = 'MANDATORY',
  } = {}) => {
    if (!department) {
      throw new Error('Department is required.');
    }

    if (!courseId && !courseCode) {
      throw new Error('Course ID or course code is required.');
    }

      return request(
      `${API_BASE_URL}/enrollments/assign-department`,
        {
        method: 'POST',
        body: JSON.stringify({
          department,
          courseId: courseId || null,
          courseCode: courseCode || null,
          dueDate: dueDate || null,
          trainingType,
        }),
      }
    );
  },
  // ---------------------------------------------------------
  // GET RECENT CERTIFICATES
  // ---------------------------------------------------------
  getRecentCertificates: async (limit = 10) => {
    const safeLimit = Math.max(1, Number(limit) || 10);

    const data = await request(
      `${API_BASE_URL}/certificates/recent?limit=${safeLimit}`,
      { method: 'GET' }
    );

    return Array.isArray(data) ? data : [];
  },
};
