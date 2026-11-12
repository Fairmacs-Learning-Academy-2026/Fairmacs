import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Users,
  Star,
  CheckCircle2,
  Calendar,
  Activity,
  Plus,
  RefreshCw,
  Trash2,
  Clock,
  ExternalLink,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { courseService } from '../services/courseService';
import CourseBuilderModal, { preloadCourseBuilderReferenceData } from './CourseBuilderModal';
import CourseAssignmentModal from './CourseAssignmentModal';
import CourseThumbnailImage from './CourseThumbnailImage';

export default function TrainerDashboard({ onSelectCourse }) {
  const { user } = useAuth();
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [courseForAssignment, setCourseForAssignment] = useState(null);
  const [courseList, setCourseList] = useState([]);
  const [trainerInsights, setTrainerInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState('');
  const [recentActivities, setRecentActivities] = useState([]);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [analyticsDeptFilter, setAnalyticsDeptFilter] = useState('ALL');
  const [analyticsDateRange, setAnalyticsDateRange] = useState('ALL');
  const [analyticsSortBy, setAnalyticsSortBy] = useState('COMPLETION_DESC');

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    const courseId = getCourseId(courseToDelete);
    if (!courseId) {
      setDeleteError('Course ID missing.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      const result = await courseService.deleteCourse(courseId);
      if (result && result.success) {
        setCourseToDelete(null);
        await loadCourses();
      } else {
        setDeleteError(result?.error || 'Failed to delete course.');
      }
    } catch (err) {
      setDeleteError(err.message || 'An unexpected error occurred while deleting the course.');
    } finally {
      setIsDeleting(false);
    }
  };


  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    setIsSessionsLoading(true);
    setSessionsError('');
    setIsActivityLoading(true);
    setActivityError('');

    try {
      const [coursesResult, insightsResult, sessionsResult, activityResult] = await Promise.allSettled([
        courseService.getAllCourses(),
        courseService.getTrainerInsights(),
        courseService.getUpcomingLiveSessions(5),
        courseService.getRecentLearnerActivity(8),
      ]);

      if (coursesResult.status === 'fulfilled' && Array.isArray(coursesResult.value)) {
        setCourseList(coursesResult.value);
      } else {
        setLoadError('Unable to load courses. Please try again.');
        setCourseList([]);
      }

      if (insightsResult.status === 'fulfilled' && insightsResult.value) {
        setTrainerInsights(insightsResult.value);
      }

      if (sessionsResult.status === 'fulfilled' && Array.isArray(sessionsResult.value)) {
        setUpcomingSessions(sessionsResult.value);
        setSessionsError('');
      } else {
        setUpcomingSessions([]);
        setSessionsError('Unable to load upcoming live sessions.');
      }

      if (activityResult.status === 'fulfilled' && Array.isArray(activityResult.value)) {
        setRecentActivities(activityResult.value);
        setActivityError('');
      } else if (insightsResult.status === 'fulfilled' && Array.isArray(insightsResult.value?.recentActivity)) {
        setRecentActivities(insightsResult.value.recentActivity);
        setActivityError('');
      } else {
        setRecentActivities([]);
        setActivityError('Unable to load recent learner activity.');
      }
    } catch (error) {
      console.error('Failed to load trainer dashboard data:', error);
      setLoadError('Unable to load courses. Please try again.');
      setCourseList([]);
    } finally {
      setIsLoading(false);
      setIsSessionsLoading(false);
      setIsActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
    preloadCourseBuilderReferenceData();
  }, [loadCourses]);

  const handlePublishedNewCourse = async () => {
    setShowBuilderModal(false);
    await loadCourses();
  };

  const getCourseId = (course) => {
    const id = course?.courseId ?? course?.courseCode ?? course?.id ?? course?.courseDbId ?? course?.dbId;
    return id == null ? '' : String(id).trim();
  };

  const getCourseStatus = (course) => {
    const status = String(course.status ?? '').toUpperCase();
    if (status) return ['AVAILABLE', 'PUBLISHED', 'ACTIVE'].includes(status) ? 'PUBLISHED' : status;
    if ([true, 'true', 1, '1'].includes(course.active) || [true, 'true', 1, '1'].includes(course.isActive) || course.isPublished === true || course.published === true) return 'PUBLISHED';
    if (course.active === false || course.isActive === false) return 'DRAFT';
    return 'UNKNOWN';
  };

  const getStatusStyle = (status) => {
    if (status === 'PUBLISHED' || status === 'ACTIVE') {
      return { background: '#dcfce7', color: '#15803d' };
    }
    if (status === 'DRAFT' || status === 'INACTIVE') {
      return { background: '#f1f5f9', color: '#475569' };
    }
    return { background: '#fef3c7', color: '#92400e' };
  };

  const activeCourseCount = courseList.filter((course) => {
    const status = getCourseStatus(course);
    return status === 'PUBLISHED' || status === 'ACTIVE';
  }).length;

  const formatSessionDate = (dateValue) => {
    if (!dateValue) return 'Date TBA';
    const raw = String(dateValue).trim();
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T00:00:00`)
      : new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatSessionTimeRange = (session) => {
    if (session?.startTime && session?.endTime) {
      return `${session.startTime} – ${session.endTime}`;
    }
    if (session?.startTime) {
      return session.startTime;
    }
    if (session?.time) {
      return session.time;
    }
    return 'Time TBA';
  };

  const formatActivityTimestamp = (timestampValue) => {
    if (!timestampValue) return '';
    const parsed = new Date(timestampValue);
    if (Number.isNaN(parsed.getTime())) {
      return String(timestampValue);
    }
    const datePart = parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timePart = parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${datePart} • ${timePart}`;
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        minWidth: 0,
      }}
    >
      <div
        className="trainer-hero"
        style={{
          background: 'linear-gradient(135deg, rgba(11, 23, 48, 0.95) 0%, rgba(16, 42, 67, 0.92) 50%, rgba(8, 120, 201, 0.88) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '2.25rem 2.5rem',
          borderRadius: 22,
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 20px 48px -10px rgba(11, 23, 48, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          flexWrap: 'wrap',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative radial glow */}
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            bottom: '-40px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.18) 0%, rgba(8, 120, 201, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontSize: '0.74rem',
              color: '#38bdf8',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(56, 189, 248, 0.16)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '0.28rem 0.8rem',
              borderRadius: '20px',
              marginBottom: '0.65rem',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Sparkles size={13} />
            Trainer Portal &amp; Course Builder
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.35rem', letterSpacing: '-0.025em', lineHeight: 1.25 }}>
            Welcome{user?.name ? `, ${user.name}` : ''} (Trainer)
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.92rem', margin: 0, lineHeight: 1.5, maxWidth: '640px' }}>
            Author courses, manage quiz modules, monitor learner completion, and align with enterprise reports.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setShowBuilderModal(true)}
          style={{
            padding: '0.75rem 1.4rem',
            fontSize: '0.92rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
            boxShadow: '0 4px 18px rgba(22, 119, 255, 0.45)',
          }}
        >
          <Plus style={{ width: 18, height: 18 }} /> Create Course Wizard
        </button>
      </div>

      <div className="trainer-stats-grid">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`stat-skel-${idx}`}
              className="skeleton-shimmer"
              style={{
                height: '118px',
                borderRadius: '16px',
                border: '1px solid rgba(226, 232, 240, 0.85)',
              }}
            />
          ))
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                <BookOpen style={{ width: 20, height: 20 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div className="stat-val">{trainerInsights?.publishedCourses ?? activeCourseCount}</div>
                  <span className="trend-pill trend-pill-up">
                    <TrendingUp size={11} /> Published
                  </span>
                </div>
                <div className="stat-label">Published Courses</div>
                {trainerInsights?.draftCourses != null ? (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                    {trainerInsights.draftCourses} draft {trainerInsights.draftCourses === 1 ? 'course' : 'courses'}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Active training catalog
                  </div>
                )}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
                <Users style={{ width: 20, height: 20 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div className="stat-val">{trainerInsights?.activeLearners ?? 0}</div>
                  <span className="trend-pill trend-pill-up">Enrolled</span>
                </div>
                <div className="stat-label">Active Learners</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {trainerInsights?.totalEnrollments ?? 0} total enrollments
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                <CheckCircle2 style={{ width: 20, height: 20 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div className="stat-val">{`${trainerInsights?.completionRate ?? 0}%`}</div>
                  <span className="trend-pill trend-pill-neutral">Target ≥ 75%</span>
                </div>
                <div className="stat-label">Course Completion Rate</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {trainerInsights?.completedEnrollments ?? 0} completed enrollments
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Star style={{ width: 20, height: 20 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div className="stat-val">{`${trainerInsights?.averageScore ?? 0}%`}</div>
                  <span className="trend-pill trend-pill-neutral">Pass ≥ 70%</span>
                </div>
                <div className="stat-label">Average Assessment Score</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Calculated across evaluated quizzes
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="trainer-main-grid">
        <div
          className="glass-panel"
          style={{
            background: 'rgba(255, 255, 255, 0.78)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow: '0 8px 30px rgba(31, 70, 120, 0.06)',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Authored Courses &amp; Catalog Status
            </h2>
          </div>

          {loadError && (
            <div
              role="alert"
              style={{
                padding: '0.8rem 1rem',
                marginBottom: '1rem',
                borderRadius: '8px',
                background: '#fef2f2',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <span>{loadError}</span>
              <button type="button" className="btn-secondary" onClick={loadCourses}>
                Retry
              </button>
            </div>
          )}

          <div className="table-scroll">
            <table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Course ID &amp; Title</th>
                  <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Category</th>
                  <th className="th-right" style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Enrolled</th>
                  <th className="th-center" style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, sIdx) => (
                    <tr key={`course-skel-${sIdx}`}>
                      <td colSpan={5} style={{ padding: '0.75rem 1rem' }}>
                        <div
                          className="skeleton-shimmer"
                          style={{
                            height: '42px',
                            borderRadius: '8px',
                            width: '100%',
                          }}
                        />
                      </td>
                    </tr>
                  ))
                ) : courseList.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      <div style={{ maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <BookOpen size={32} style={{ color: '#94a3b8' }} />
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>No courses found</div>
                        <p style={{ margin: 0, fontSize: '0.84rem' }}>
                          {loadError
                            ? 'Courses could not be loaded. Retry to try again.'
                            : 'No courses were returned by the server. Create a course or refresh the list.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  courseList.map((course, index) => {
                    const courseId = getCourseId(course);
                    const status = getCourseStatus(course);
                    const isPublished = status === 'PUBLISHED' || status === 'ACTIVE';
                    const title = course.title ?? course.courseTitle ?? 'Untitled course';
                    const category = course.category ?? course.categoryName ?? course.categorySlug ?? '—';
                    const duration = course.duration
                      ?? (course.durationHours != null ? `${course.durationHours} hours` : 'Duration not set');
                    const enrolledCount = course.enrolledCount ?? course.enrollmentCount;

                    return (
                      <tr
                        key={courseId ?? `${title}-${index}`}
                        style={{ fontSize: '0.88rem' }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <div
                              style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                flexShrink: 0,
                                border: '1px solid #E2EAF3',
                                background: '#F8FAFC',
                              }}
                            >
                              <CourseThumbnailImage
                                course={course}
                                alt={title}
                                style={{ width: '100%', height: '100%' }}
                              />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{title}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                                ID: <span className="tabular-nums font-semibold">{courseId ?? '—'}</span> • {duration}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '0.22rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(186, 230, 253, 0.8)',
                            }}
                          >
                            {category}
                          </span>
                        </td>
                        <td className="nowrap td-right" style={{ padding: '1rem', fontWeight: 700, color: '#0f172a' }}>
                          {enrolledCount == null ? '—' : `${enrolledCount} Learners`}
                        </td>
                        <td className="td-center" style={{ padding: '1rem' }}>
                          <span
                            className={`badge-status ${isPublished ? 'badge-status-success' : 'badge-status-warning'}`}
                          >
                            <span className="badge-status-dot" />
                            {status === 'UNKNOWN' ? 'Status unavailable' : status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn-primary nowrap"
                              style={{ padding: '0.42rem 0.85rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
                              onClick={() => setCourseForAssignment(course)}
                            >
                              <Users size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                              Manage Assignments
                            </button>

                            <button
                              type="button"
                              className="nowrap"
                              style={{
                                padding: '0.42rem 0.75rem',
                                fontSize: '0.8rem',
                                background: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontWeight: 650,
                                transition: 'all 0.15s ease-in-out',
                              }}
                              onClick={() => {
                                setDeleteError('');
                                setCourseToDelete(course);
                              }}
                              title="Delete Course"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          <div
            className="glass-panel"
            style={{
              background: 'rgba(255, 255, 255, 0.78)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRadius: '16px',
              padding: '1.35rem',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              boxShadow: '0 8px 30px rgba(31, 70, 120, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem', color: '#0f172a', fontWeight: 800, fontSize: '0.98rem' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Calendar style={{ width: 16, height: 16 }} />
              </div>
              Upcoming Live Sessions
            </div>

            {isSessionsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2].map((sKey) => (
                  <div
                    key={`sess-skel-${sKey}`}
                    className="skeleton-shimmer"
                    style={{
                      height: '92px',
                      borderRadius: '12px',
                      border: '1px solid rgba(226, 235, 245, 0.85)',
                    }}
                  />
                ))}
              </div>
            ) : sessionsError ? (
              <div
                role="alert"
                style={{
                  padding: '0.9rem 1rem',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <span>{sessionsError}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={loadCourses}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', flexShrink: 0 }}
                >
                  Retry
                </button>
              </div>
            ) : upcomingSessions.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(248, 250, 252, 0.7)',
                  border: '1px dashed rgba(203, 213, 225, 0.85)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar size={18} />
                </div>
                <div style={{ fontWeight: 750, color: '#1e293b', fontSize: '0.88rem' }}>
                  No upcoming live sessions.
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', maxWidth: '230px' }}>
                  Scheduled live workshops and webinars will appear here.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcomingSessions.map((session, idx) => {
                  const statusLabel = String(session.status || 'UPCOMING').toUpperCase();
                  const isToday = statusLabel === 'TODAY';
                  return (
                    <div
                      key={session.id ?? `${session.title}-${idx}`}
                      className="elevation-hover"
                      style={{
                        padding: '0.95rem 1.1rem',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: '1px solid rgba(226, 235, 245, 0.9)',
                        boxShadow: '0 1px 3px rgba(16, 42, 67, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ fontWeight: 750, color: '#0f172a', fontSize: '0.9rem', lineHeight: 1.35 }}>
                          {session.title || 'Live Session'}
                        </div>
                        <span
                          className={`badge-status ${isToday ? 'badge-status-success' : 'badge-status-info'}`}
                        >
                          <span className={`badge-status-dot ${isToday ? 'pulse' : ''}`} />
                          {statusLabel}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        Trainer: <strong style={{ color: '#0f172a', fontWeight: 650 }}>{session.trainerName || session.trainer || 'TBA'}</strong>
                      </div>

                      <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
                        <Clock size={13} style={{ color: '#0284c7' }} />
                        <span>{formatSessionDate(session.date)}</span>
                        <span>•</span>
                        <span>{formatSessionTimeRange(session)}</span>
                      </div>

                      {session.joinUrl && (
                        <div style={{ marginTop: '0.25rem', paddingTop: '0.35rem', borderTop: '1px dashed rgba(226, 235, 245, 0.9)' }}>
                          <a
                            href={session.joinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.78rem',
                              fontWeight: 750,
                              color: '#0284c7',
                              textDecoration: 'none',
                            }}
                          >
                            <span>Join Session</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="glass-panel"
            style={{
              background: 'rgba(255, 255, 255, 0.78)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRadius: '16px',
              padding: '1.35rem',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              boxShadow: '0 8px 30px rgba(31, 70, 120, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem', color: '#0f172a', fontWeight: 800, fontSize: '0.98rem' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Activity style={{ width: 16, height: 16 }} />
              </div>
              Recent Learner Activity
            </div>

            {isActivityLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2].map((aKey) => (
                  <div
                    key={`act-skel-${aKey}`}
                    className="skeleton-shimmer"
                    style={{
                      height: '84px',
                      borderRadius: '12px',
                      border: '1px solid rgba(226, 235, 245, 0.85)',
                    }}
                  />
                ))}
              </div>
            ) : activityError ? (
              <div
                role="alert"
                style={{
                  padding: '0.9rem 1rem',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <span>{activityError}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={loadCourses}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem', flexShrink: 0 }}
                >
                  Retry
                </button>
              </div>
            ) : recentActivities.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(248, 250, 252, 0.7)',
                  border: '1px dashed rgba(203, 213, 225, 0.85)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Activity size={18} />
                </div>
                <div style={{ fontWeight: 750, color: '#1e293b', fontSize: '0.88rem' }}>
                  No recent learner activity.
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', maxWidth: '230px' }}>
                  Learner quiz attempts and lesson completions will appear here.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentActivities.map((item, idx) => (
                  <div
                    key={item.activityId ?? `${item.employeeName}-${item.timestamp}-${idx}`}
                    className="elevation-hover"
                    style={{
                      padding: '0.9rem 1.05rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.85)',
                      border: '1px solid rgba(226, 235, 245, 0.9)',
                      boxShadow: '0 1px 3px rgba(16, 42, 67, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span className="badge-status-dot pulse" style={{ background: '#16a34a' }} />
                        <span style={{ fontWeight: 750, color: '#0f172a', fontSize: '0.88rem' }}>
                          {item.employeeName || 'Learner'}
                        </span>
                      </div>
                      {item.timestamp && (
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {formatActivityTimestamp(item.timestamp)}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.4 }}>
                      {item.activityDescription || 'Completed learning activity'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: '#0369a1',
                          fontWeight: 700,
                          background: '#e0f2fe',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                        }}
                      >
                        {item.courseTitle || item.courseId || 'Course'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aligned Course Analytics & Reports Section (matching HR Course Reports) */}
      {(() => {
        const rawCourseReports = Array.isArray(trainerInsights?.courseReports)
          ? trainerInsights.courseReports
          : (Array.isArray(trainerInsights?.courseBreakdown) ? trainerInsights.courseBreakdown : []);
        const deptReports = Array.isArray(trainerInsights?.departmentReports)
          ? trainerInsights.departmentReports
          : [];
        const availableDepts = Array.from(
          new Set([
            ...deptReports.map((d) => d.department).filter(Boolean),
            ...rawCourseReports.map((c) => c.department || c.category).filter(Boolean),
          ])
        ).sort((a, b) => String(a).localeCompare(String(b)));

        const nowMs = Date.now();
        const currentYear = new Date().getFullYear();

        const filteredCourseAnalytics = rawCourseReports
          .filter((course) => {
            if (analyticsDeptFilter !== 'ALL') {
              const dept = String(course.department || course.category || '');
              if (dept.toLowerCase() !== analyticsDeptFilter.toLowerCase()) return false;
            }
            if (analyticsDateRange !== 'ALL') {
              const rawDate = course.publishedAt || course.createdAt;
              if (rawDate) {
                const parsed = new Date(rawDate);
                if (!Number.isNaN(parsed.getTime())) {
                  const diffDays = (nowMs - parsed.getTime()) / (1000 * 60 * 60 * 24);
                  if (analyticsDateRange === 'LAST_30_DAYS' && diffDays > 30) return false;
                  if (analyticsDateRange === 'LAST_90_DAYS' && diffDays > 90) return false;
                  if (analyticsDateRange === 'THIS_YEAR' && parsed.getFullYear() !== currentYear) return false;
                }
              }
            }
            if (analyticsSearch.trim()) {
              const q = analyticsSearch.trim().toLowerCase();
              const hay = `${course.title || ''} ${course.courseId || ''} ${course.category || ''} ${course.department || ''}`.toLowerCase();
              if (!hay.includes(q)) return false;
            }
            return true;
          })
          .slice()
          .sort((a, b) => {
            if (analyticsSortBy === 'ENROLLED_DESC') {
              return (Number(b.enrolledCount ?? b.totalAssignments) || 0) - (Number(a.enrolledCount ?? a.totalAssignments) || 0);
            }
            if (analyticsSortBy === 'SCORE_DESC') {
              return (Number(b.averageScore) || 0) - (Number(a.averageScore) || 0);
            }
            if (analyticsSortBy === 'OVERDUE_DESC') {
              return (Number(b.overdueAssignments ?? b.overdueCount) || 0) - (Number(a.overdueAssignments ?? a.overdueCount) || 0);
            }
            if (analyticsSortBy === 'TITLE_ASC') {
              return String(a.title || '').localeCompare(String(b.title || ''));
            }
            return (Number(b.completionRateExact ?? b.completionRate) || 0) - (Number(a.completionRateExact ?? a.completionRate) || 0);
          });

        const totalAssignments = trainerInsights?.totalAssignments ?? trainerInsights?.totalEnrollments ?? 0;
        const completedAssignments = trainerInsights?.completedAssignments ?? trainerInsights?.completedEnrollments ?? 0;
        const inProgressAssignments = trainerInsights?.inProgressAssignments ?? 0;
        const notStartedAssignments = trainerInsights?.notStartedAssignments ?? 0;
        const overdueAssignments = trainerInsights?.overdueAssignments ?? 0;
        const certificatesIssued = trainerInsights?.certificatesIssued ?? 0;
        const averageProgress = Number(trainerInsights?.averageProgress ?? trainerInsights?.completionRate) || 0;
        const mandatoryComplianceRate = Number(trainerInsights?.mandatoryComplianceRate) || 0;
        const averageScore = Number(trainerInsights?.averageScore) || 0;

        return (
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              <div
                className="glass-panel"
                style={{
                  background: 'rgba(255, 255, 255, 0.78)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  borderRadius: '16px',
                  padding: '1.25rem 1.4rem',
                  border: '1px solid rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 8px 30px rgba(31, 70, 120, 0.06)',
                }}
              >
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                  Course Analytics Overview
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                  Authorized course progress, mandatory compliance, and assessment performance.
                </div>

                {[
                  { label: 'Average Training Progress', value: averageProgress, color: '#0284c7' },
                  { label: 'Mandatory Compliance', value: mandatoryComplianceRate, color: '#16a34a' },
                  { label: 'Assessment Performance', value: averageScore, color: '#7c3aed' },
                ].map((metric) => (
                  <div key={metric.label} style={{ marginBottom: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      <span>{metric.label}</span>
                      <span>{metric.value}%</span>
                    </div>
                    <div style={{ height: '7px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, metric.value))}%`,
                          height: '100%',
                          borderRadius: '999px',
                          background: metric.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="glass-panel"
                style={{
                  background: 'rgba(255, 255, 255, 0.78)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  borderRadius: '16px',
                  padding: '1.25rem 1.4rem',
                  border: '1px solid rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 8px 30px rgba(31, 70, 120, 0.06)',
                }}
              >
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', marginBottom: '0.25rem' }}>
                  Assignment & Certification Status
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                  Identical calculation engine aligned with HR Training Reports.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                  {[
                    { label: 'Completed', value: completedAssignments, total: totalAssignments, color: '#16a34a' },
                    { label: 'In Progress', value: inProgressAssignments, total: totalAssignments, color: '#0284c7' },
                    { label: 'Not Started', value: notStartedAssignments, total: totalAssignments, color: '#64748b' },
                    { label: 'Overdue', value: overdueAssignments, total: totalAssignments, color: '#e11d48' },
                    { label: 'Total Assignments', value: totalAssignments, color: '#0f172a' },
                    { label: 'Certificates Issued', value: certificatesIssued, color: '#d97706' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: '0.7rem 0.85rem',
                        borderRadius: '10px',
                        background: 'rgba(248, 250, 252, 0.85)',
                        border: '1px solid rgba(226, 235, 245, 0.9)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>{item.label}</span>
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="glass-panel"
              style={{
                background: 'rgba(255, 255, 255, 0.78)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                borderRadius: '16px',
                padding: '1.25rem 1.4rem',
                border: '1px solid rgba(255, 255, 255, 0.85)',
                boxShadow: '0 8px 30px rgba(31, 70, 120, 0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                    Course Analytics & Performance Breakdown
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Filter, sort, and compare course completion, learner progress, assessment scores, and compliance.
                  </p>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={analyticsSearch}
                    onChange={(e) => setAnalyticsSearch(e.target.value)}
                    placeholder="Search courses..."
                    className="input-modern"
                    style={{ minWidth: '180px' }}
                  />
                  <select
                    value={analyticsDeptFilter}
                    onChange={(e) => setAnalyticsDeptFilter(e.target.value)}
                    className="select-modern"
                  >
                    <option value="ALL">All Categories / Depts</option>
                    {availableDepts.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <select
                    value={analyticsDateRange}
                    onChange={(e) => setAnalyticsDateRange(e.target.value)}
                    className="select-modern"
                  >
                    <option value="ALL">All Time</option>
                    <option value="LAST_30_DAYS">Last 30 Days</option>
                    <option value="LAST_90_DAYS">Last 90 Days</option>
                    <option value="THIS_YEAR">This Year</option>
                  </select>
                  <select
                    value={analyticsSortBy}
                    onChange={(e) => setAnalyticsSortBy(e.target.value)}
                    className="select-modern"
                  >
                    <option value="COMPLETION_DESC">Sort: Completion Rate</option>
                    <option value="ENROLLED_DESC">Sort: Most Enrolled</option>
                    <option value="SCORE_DESC">Sort: Highest Avg Score</option>
                    <option value="OVERDUE_DESC">Sort: Most Overdue</option>
                    <option value="TITLE_ASC">Sort: Title (A–Z)</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '880px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Course</th>
                      <th style={{ textAlign: 'left' }}>Category / Dept</th>
                      <th className="th-right">Enrolled</th>
                      <th className="th-right">Completed</th>
                      <th className="th-right">In Progress</th>
                      <th style={{ textAlign: 'left', minWidth: '130px' }}>Completion Rate</th>
                      <th className="th-right">Avg Progress</th>
                      <th className="th-right">Avg Score</th>
                      <th className="th-right">Mandatory</th>
                      <th className="th-right">Overdue</th>
                      <th className="th-right">Certificates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourseAnalytics.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                          No course analytics match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredCourseAnalytics.map((c) => {
                        const cEnrolled = c.totalAssignments ?? c.enrolledCount ?? 0;
                        const cCompleted = c.completedAssignments ?? c.completedCount ?? 0;
                        const cInProgress = c.inProgressAssignments ?? c.inProgressCount ?? 0;
                        const cRate = Number(c.completionRateExact ?? c.completionRate) || 0;
                        const cProgress = Number(c.averageProgress ?? cRate) || 0;
                        const cScore = Number(c.averageScore) || 0;
                        const cMandatory = c.mandatoryAssignments ?? 0;
                        const cMandatoryDone = c.mandatoryCompleted ?? 0;
                        const cOverdue = c.overdueAssignments ?? c.overdueCount ?? 0;
                        const cCerts = c.certificatesIssued ?? 0;

                        return (
                          <tr key={c.id || c.courseId || c.title}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.86rem' }}>{c.title || 'Untitled Course'}</div>
                              <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '2px' }}>{c.courseId || '—'}</div>
                            </td>
                            <td style={{ fontSize: '0.82rem', color: '#475569' }}>{c.department || c.category || 'General'}</td>
                            <td className="td-right" style={{ fontWeight: 650, color: '#0f172a' }}>{cEnrolled}</td>
                            <td className="td-right" style={{ fontWeight: 750, color: '#16a34a' }}>{cCompleted}</td>
                            <td className="td-right" style={{ fontWeight: 650, color: '#0284c7' }}>{cInProgress}</td>
                            <td style={{ minWidth: '130px' }}>
                              <div style={{ fontSize: '0.76rem', fontWeight: 750, color: '#1e293b', marginBottom: '4px' }}>
                                <span className="tabular-nums">{cRate}%</span>
                              </div>
                              <div style={{ height: '6px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${Math.min(100, Math.max(0, cRate))}%`,
                                    height: '100%',
                                    borderRadius: '999px',
                                    background: cRate >= 100 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : cRate >= 70 ? 'linear-gradient(90deg, #1677FF, #38BDF8)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                                    transition: 'width 0.4s ease',
                                  }}
                                />
                              </div>
                            </td>
                            <td className="td-right" style={{ fontWeight: 650, color: '#334155' }}>{cProgress}%</td>
                            <td className="td-right" style={{ fontWeight: 750, color: '#7c3aed' }}>{cScore}%</td>
                            <td className="td-right" style={{ fontSize: '0.82rem', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{cMandatoryDone} / {cMandatory}</td>
                            <td className="td-right" style={{ fontWeight: 750, color: Number(cOverdue) > 0 ? '#e11d48' : '#64748b' }}>{cOverdue}</td>
                            <td className="td-right" style={{ fontWeight: 750, color: '#d97706' }}>{cCerts}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {showBuilderModal && (
        <CourseBuilderModal
          key="new-course"
          onClose={() => {
            setShowBuilderModal(false);
          }}
          onPublish={async () => {
            setShowBuilderModal(false);
            await loadCourses();
          }}
        />
      )}


      {courseToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !isDeleting && setCourseToDelete(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #fee2e2',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Delete Course
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Are you sure you want to permanently delete{' '}
              <strong style={{ color: '#0f172a' }}>
                {courseToDelete.title ?? courseToDelete.courseTitle ?? 'this course'}
              </strong>{' '}
              ({getCourseId(courseToDelete)})? All modules, lessons, quizzes, and learner progress will be removed.
            </p>

            {deleteError && (
              <div
                role="alert"
                style={{
                  padding: '0.75rem 1rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCourseToDelete(null)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteCourse}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  border: 'none',
                  background: isDeleting ? '#94a3b8' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                }}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Yes, Delete Course
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {courseForAssignment && (
        <CourseAssignmentModal
          course={courseForAssignment}
          onClose={() => setCourseForAssignment(null)}
          onAssigned={async () => {
            setCourseForAssignment(null);
            await loadCourses();
          }}
        />
      )}
    </div>
  );
}
