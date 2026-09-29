import { create } from 'zustand';
import { MOCK_USER_PROGRESS } from '../data/mockData';
import { enrollmentService } from '../services/enrollmentService';

export const useEnrollmentStore = create((set, get) => ({
  // State
  enrollments: MOCK_USER_PROGRESS,
  certificates: [],
  recentCertificates: [],
  verifiedCertificate: null,
  verifiedCertificateError: null,
  isLoading: false,

  // Actions
  setEnrollments: (enrollments) => set({ enrollments }),

  enrollInCourse: (userId, courseId) => {
    set((state) => ({
      enrollments: {
        ...state.enrollments,
        [userId]: {
          ...state.enrollments[userId],
          [courseId]: {
            status: 'NOT STARTED',
            progressPercent: 0,
            completedLessons: [],
            lastAccessed: new Date().toISOString().split('T')[0]
          }
        }
      }
    }));
  },

  updateProgress: (userId, courseId, progressData) => {
    set((state) => ({
      enrollments: {
        ...state.enrollments,
        [userId]: {
          ...state.enrollments[userId],
          [courseId]: {
            ...state.enrollments[userId]?.[courseId],
            ...progressData
          }
        }
      }
    }));
  },

  completeLesson: (userId, courseId, lessonId) => {
    set((state) => {
      const userEnrollment = state.enrollments[userId]?.[courseId] || {};
      const completedLessons = userEnrollment.completedLessons || [];
      const newCompletedLessons = completedLessons.includes(lessonId) 
        ? completedLessons 
        : [...completedLessons, lessonId];
      
      return {
        enrollments: {
          ...state.enrollments,
          [userId]: {
            ...state.enrollments[userId],
            [courseId]: {
              ...userEnrollment,
              completedLessons: newCompletedLessons,
              status: 'IN PROGRESS',
              lastAccessed: new Date().toISOString().split('T')[0]
            }
          }
        }
      };
    });
  },

  completeCourse: async (userId, courseId, score, { enrollmentId } = {}) => {
    set({ isLoading: true, verifiedCertificateError: null });
    try {
      const result = await enrollmentService.completeCourse({ enrollmentId, courseId, score });
      if (result && !result.error && result.certificateId) {
        const cert = result;
        const certId = cert.certificateId;
        const formattedIssueDate = cert.issuedAt
          ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

        set((state) => ({
          enrollments: {
            ...state.enrollments,
            [userId]: {
              ...state.enrollments[userId],
              [courseId]: {
                status: 'Completed',
                progressPercent: 100,
                score,
                certId,
                completedDate: new Date().toISOString().split('T')[0]
              }
            }
          },
          certificates: [
            ...state.certificates.filter(c => c.id !== certId),
            {
              id: certId,
              certificateId: certId,
              userId,
              courseId,
              issuedDate: formattedIssueDate,
              score,
              courseTitle: cert.courseTitle,
              userName: cert.userName,
              employeeId: cert.employeeId,
              department: cert.department,
              designation: cert.designation,
              courseCategory: cert.courseCategory,
              issuedAt: cert.issuedAt
            }
          ]
        }));
        set({ isLoading: false });
        return {
          success: true,
          certificate: {
            courseTitle: cert.courseTitle,
            score,
            certId,
            issueDate: formattedIssueDate,
            userName: cert.userName,
            employeeId: cert.employeeId,
            department: cert.department,
            designation: cert.designation
          }
        };
      }

      const fallbackCertId = `FM-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallbackDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      set((state) => ({
        enrollments: {
          ...state.enrollments,
          [userId]: {
            ...state.enrollments[userId],
            [courseId]: {
              status: 'Completed',
              progressPercent: 100,
              score,
              certId: fallbackCertId,
              completedDate: new Date().toISOString().split('T')[0]
            }
          }
        },
        certificates: [
          ...state.certificates,
          {
            id: fallbackCertId,
            userId,
            courseId,
            issuedDate: fallbackDate,
            score
          }
        ],
        isLoading: false
      }));
      return {
        success: true,
        fallback: true,
        certificate: {
          courseTitle: null,
          score,
          certId: fallbackCertId,
          issueDate: fallbackDate
        }
      };
    } catch (error) {
      console.error('completeCourse store error:', error);
      const fallbackCertId = `FM-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallbackDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      set((state) => ({
        isLoading: false,
        verifiedCertificateError: error.message || 'Backend unavailable, using local certificate'
      }));
      return {
        success: true,
        fallback: true,
        certificate: {
          courseTitle: null,
          score,
          certId: fallbackCertId,
          issueDate: fallbackDate
        }
      };
    }
  },

  verifyCertificate: async (certificateId) => {
    set({ isLoading: true, verifiedCertificateError: null, verifiedCertificate: null });
    try {
      const result = await enrollmentService.verifyCertificate(certificateId);
      if (result.success && result.certificate) {
        const cert = result.certificate;
        const formatted = cert.issuedAt
          ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
          : '';
        const normalized = {
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
          issuedDate: formatted
        };
        set({ verifiedCertificate: normalized, isLoading: false });
        return { success: true, certificate: normalized };
      }
      set({ verifiedCertificateError: result.error || 'Certificate not found', isLoading: false });
      return { success: false, error: result.error };
    } catch (error) {
      console.error('verifyCertificate store error:', error);
      const msg = error.message || 'Verification error';
      set({ verifiedCertificateError: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  clearVerifiedCertificate: () => set({ verifiedCertificate: null, verifiedCertificateError: null }),

  fetchUserCertificates: async (userId) => {
    try {
      const certs = await enrollmentService.getUserCertificates(userId);
      if (Array.isArray(certs) && certs.length) {
        const normalized = certs.map((cert) => ({
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
            ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : ''
        }));
        set({ certificates: normalized });
        return normalized;
      }
      return get().certificates;
    } catch (error) {
      console.error('fetchUserCertificates store error:', error);
      return get().certificates;
    }
  },

  fetchRecentCertificates: async (limit = 5) => {
    try {
      const certs = await enrollmentService.getRecentCertificates(limit);
      if (Array.isArray(certs) && certs.length) {
        const normalized = certs.map((cert) => ({
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
          issuedAt: cert.issuedAt,
          issuedDate: cert.issuedAt
            ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : ''
        }));
        set({ recentCertificates: normalized });
        return normalized;
      }
      return [];
    } catch (error) {
      console.error('fetchRecentCertificates store error:', error);
      return [];
    }
  },

  // Computed
  getUserProgress: (userId) => {
    return get().enrollments[userId] || {};
  },

  getCourseProgress: (userId, courseId) => {
    return get().enrollments[userId]?.[courseId];
  },

  getUserCertificates: (userId) => {
    const all = get().certificates;
    if (!userId) return all;
    return all.filter(cert => cert.userId === userId || cert.id);
  },

  getCompletionRate: (userId) => {
    const userEnrollments = get().enrollments[userId] || {};
    const totalCourses = Object.keys(userEnrollments).length;
    const completedCourses = Object.values(userEnrollments).filter(e => e.status === 'Completed' || e.status === 'COMPLETED').length;
    return totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;
  }
}));
