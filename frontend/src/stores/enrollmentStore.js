import { create } from 'zustand';

import { enrollmentService } from '../services/enrollmentService';
import { notifyEnrollmentUpdated } from '../utils/enrollmentSync';

function normalizeCertificate(cert) {
  if (!cert) return null;

  return {
    id: cert.certificateId,
    certificateId: cert.certificateId,
    userId: cert.userId,
    employeeId: cert.employeeId,
    userName: cert.userName,
    department: cert.department,
    designation: cert.designation,
    courseId: cert.courseId,
    courseTitle: cert.courseTitle,
    courseCategory: cert.courseCategory,
    score: cert.score,
    pdfUrl: cert.pdfUrl,
    issuedAt: cert.issuedAt,
    issuedDate: cert.issuedAt
      ? new Date(cert.issuedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '',
  };
}

function upsertEnrollment(enrollments, course) {
  if (!course) return enrollments;

  const key = course.enrollmentDbId || course.dbId || course.id;
  const index = enrollments.findIndex(
    (item) =>
      (item.enrollmentDbId || item.dbId || item.id) === key
  );

  if (index === -1) {
    return [...enrollments, course];
  }

  const next = [...enrollments];
  next[index] = { ...next[index], ...course };
  return next;
}

export const useEnrollmentStore = create((set, get) => ({
  // Backend is the single source of truth.
  enrollments: [],

  certificates: [],
  recentCertificates: [],

  verifiedCertificate: null,
  verifiedCertificateError: null,

  isLoading: false,
  error: null,

  // ---------------------------------------------------------
  // LOAD CURRENT USER ENROLLMENTS
  // ---------------------------------------------------------
  fetchEnrollments: async () => {
    set({ isLoading: true, error: null });

    try {
      const enrollments =
        await enrollmentService.getUserEnrollments();

      set({
        enrollments,
        isLoading: false,
      });

      return enrollments;
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Unable to load enrollments.',
      });

      throw error;
    }
  },

  setEnrollments: (enrollments) =>
    set({
      enrollments: Array.isArray(enrollments)
        ? enrollments
        : [],
    }),

  // ---------------------------------------------------------
  // ENROLL IN COURSE
  // ---------------------------------------------------------
  enrollInCourse: async ({ courseId, courseCode } = {}) => {
    set({ isLoading: true, error: null });

    try {
      const enrolledCourse =
        await enrollmentService.enrollInCourse({
          courseId,
          courseCode,
        });

      set((state) => ({
        enrollments: upsertEnrollment(
          state.enrollments,
          enrolledCourse
        ),
        isLoading: false,
      }));

      notifyEnrollmentUpdated({ source: 'enroll-course', courseId, courseCode });

      return enrolledCourse;
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Unable to enroll in course.',
      });

      throw error;
    }
  },

  // ---------------------------------------------------------
  // LOCAL COMPATIBILITY HELPERS
  // ---------------------------------------------------------
  // These no longer create fake backend records. They only
  // update already-loaded backend data in the client cache.
  updateProgress: (userId, courseId, progressData) => {
    set((state) => ({
      enrollments: state.enrollments.map((course) =>
        course.id === courseId || course.dbId === courseId
          ? { ...course, ...progressData }
          : course
      ),
    }));
  },

  completeLesson: (userId, courseId, lessonId) => {
    set((state) => ({
      enrollments: state.enrollments.map((course) =>
        course.id === courseId || course.dbId === courseId
          ? {
              ...course,
              progressPercent: Math.min(
                100,
                Number(course.progressPercent || 0)
              ),
            }
          : course
      ),
    }));
  },

  // ---------------------------------------------------------
  // COMPLETE COURSE / GENERATE CERTIFICATE
  // ---------------------------------------------------------
  completeCourse: async (
    userId,
    courseId,
    score,
    { enrollmentId, courseCode } = {}
  ) => {
    set({
      isLoading: true,
      verifiedCertificateError: null,
    });

    try {
      const cert =
        await enrollmentService.completeCourse({
          enrollmentId,
          courseId,
          courseCode,
          score,
        });

      const normalized = normalizeCertificate(cert);

      if (!normalized) {
        throw new Error(
          'Course completion succeeded but no certificate was returned.'
        );
      }

      set((state) => ({
        certificates: [
          ...state.certificates.filter(
            (item) =>
              item.certificateId !==
              normalized.certificateId
          ),
          normalized,
        ],
        enrollments: state.enrollments.map((course) =>
          (course.enrollmentDbId === enrollmentId ||
            course.dbId === courseId ||
            course.id === courseCode ||
            course.id === courseId)
            ? {
                ...course,
                enrollmentStatus: 'COMPLETED',
                progressPercent: 100,
              }
            : course
        ),
        isLoading: false,
      }));

      notifyEnrollmentUpdated({ source: 'complete-course', courseId, courseCode });

      return {
        success: true,
        certificate: normalized,
      };
    } catch (error) {
      const message =
        error.message ||
        'Unable to complete course.';

      set({
        isLoading: false,
        verifiedCertificateError: message,
      });

      return {
        success: false,
        error: message,
      };
    }
  },

  // ---------------------------------------------------------
  // VERIFY CERTIFICATE
  // ---------------------------------------------------------
  verifyCertificate: async (certificateId) => {
    set({
      isLoading: true,
      verifiedCertificateError: null,
      verifiedCertificate: null,
    });

    try {
      const cert =
        await enrollmentService.verifyCertificate(
          certificateId
        );

      const normalized = normalizeCertificate(cert);

      set({
        verifiedCertificate: normalized,
        isLoading: false,
      });

      return {
        success: true,
        certificate: normalized,
      };
    } catch (error) {
      const message =
        error.message || 'Certificate verification failed.';

      set({
        verifiedCertificateError: message,
        isLoading: false,
      });

      return {
        success: false,
        error: message,
      };
    }
  },

  clearVerifiedCertificate: () =>
    set({
      verifiedCertificate: null,
      verifiedCertificateError: null,
    }),

  // ---------------------------------------------------------
  // CERTIFICATES
  // ---------------------------------------------------------
  fetchUserCertificates: async (userId) => {
    const certificates =
      await enrollmentService.getUserCertificates(userId);

    const normalized = certificates
      .map(normalizeCertificate)
      .filter(Boolean);

    set({ certificates: normalized });
    return normalized;
  },

  fetchRecentCertificates: async (limit = 5) => {
    const certificates =
      await enrollmentService.getRecentCertificates(limit);

    const normalized = certificates
      .map(normalizeCertificate)
      .filter(Boolean);

    set({ recentCertificates: normalized });
    return normalized;
  },

  // ---------------------------------------------------------
  // COMPATIBILITY / SELECTORS
  // ---------------------------------------------------------
  getUserProgress: () => {
    return get().enrollments;
  },

  getCourseProgress: (userId, courseId) => {
    return get().enrollments.find(
      (course) =>
        course.id === courseId ||
        course.dbId === courseId
    );
  },

  getUserCertificates: (userId) =>
    get().certificates,

  getCompletionRate: () => {
    const enrollments = get().enrollments;

    if (!enrollments.length) return 0;

    const completed = enrollments.filter(
      (course) =>
        String(course.enrollmentStatus || '').toUpperCase() ===
        'COMPLETED'
    ).length;

    return Math.round(
      (completed / enrollments.length) * 100
    );
  },
}));
