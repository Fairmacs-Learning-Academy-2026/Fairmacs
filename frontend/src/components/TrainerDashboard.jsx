import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { courseService } from '../services/courseService';
import CourseBuilderModal, { preloadCourseBuilderReferenceData } from './CourseBuilderModal';
import CourseAssignmentModal from './CourseAssignmentModal';
import CourseThumbnailImage from './CourseThumbnailImage';

export default function TrainerDashboard({ onSelectCourse }) {
  const navigate = useNavigate();
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

  // Course list search/filter state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState('ALL');

  // Aligned course analytics state
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [analyticsDeptFilter, setAnalyticsDeptFilter] = useState('ALL');
  const [analyticsDateRange, setAnalyticsDateRange] = useState('ALL');
  const [analyticsSortBy, setAnalyticsSortBy] = useState('COMPLETION_DESC');

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

  const activeCourseCount = useMemo(() => {
    return courseList.filter((course) => {
      const status = getCourseStatus(course);
      return status === 'PUBLISHED' || status === 'ACTIVE';
    }).length;
  }, [courseList]);

  const filteredCatalog = useMemo(() => {
    return courseList.filter((c) => {
      const status = getCourseStatus(c);
      if (catalogStatusFilter === 'PUBLISHED' && status !== 'PUBLISHED' && status !== 'ACTIVE') return false;
      if (catalogStatusFilter === 'DRAFT' && status !== 'DRAFT') return false;

      if (catalogSearch.trim()) {
        const query = catalogSearch.trim().toLowerCase();
        const title = String(c.title ?? c.courseTitle ?? '').toLowerCase();
        const code = String(getCourseId(c)).toLowerCase();
        const cat = String(c.category ?? c.categoryName ?? '').toLowerCase();
        if (!title.includes(query) && !code.includes(query) && !cat.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [courseList, catalogSearch, catalogStatusFilter]);

  const formatSessionDate = (dateValue) => {
    if (!dateValue) return 'Date TBA';
    const raw = String(dateValue).trim();
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T00:00:00`)
      : new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }
    return parsed.toLocaleDateString('en-IN', {
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
    const datePart = parsed.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
    const timePart = parsed.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} • ${timePart}`;
  };

  const trainerName = user?.name ? user.name.trim() : 'Trainer';
  const firstName = trainerName.split(/\s+/)[0] || 'Trainer';

  // Aligned course reports calculation
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

  const filteredCourseAnalytics = useMemo(() => {
    return rawCourseReports
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
  }, [rawCourseReports, analyticsDeptFilter, analyticsDateRange, analyticsSearch, analyticsSortBy, nowMs, currentYear]);

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
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        minWidth: 0,
        color: '#0F172A',
      }}
    >
      {/* =========================================================================
          1. HEADER & PRIMARY ACTION
          Clean, editorial enterprise header with prompt "Create Course" action
         ========================================================================= */}
      <header
        className="trainer-hero"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 42, 67, 0.96) 0%, rgba(11, 31, 56, 0.94) 55%, rgba(2, 132, 199, 0.90) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '1.75rem 2rem',
          borderRadius: 20,
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 16px 36px rgba(11, 31, 56, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          flexWrap: 'wrap',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontSize: '0.74rem',
              color: '#7DD3FC',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(2, 132, 199, 0.25)',
              border: '1px solid rgba(125, 211, 252, 0.35)',
              padding: '0.24rem 0.75rem',
              borderRadius: '20px',
              marginBottom: '0.55rem',
            }}
          >
            <GraduationCap size={13} />
            Fairmacs Learning Academy • Trainer Workspace
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.4rem, 2.2vw, 1.85rem)',
              fontWeight: 800,
              margin: '0 0 0.3rem',
              letterSpacing: '-0.025em',
              lineHeight: 1.25,
            }}
          >
            Welcome, {firstName} (Trainer)
          </h1>
          <p
            style={{
              color: '#CBD5E1',
              fontSize: '0.88rem',
              margin: 0,
              lineHeight: 1.5,
              maxWidth: '680px',
            }}
          >
            Author learning curriculums, manage modules and assessments, track learner completion, and coordinate training operations.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <button
            type="button"
            onClick={loadCourses}
            disabled={isLoading}
            title="Refresh dashboard data"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              borderRadius: '10px',
              padding: '0.62rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 650,
              cursor: 'pointer',
              transition: 'background 0.18s ease',
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowBuilderModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.68rem 1.35rem',
              fontSize: '0.88rem',
              fontWeight: 750,
              whiteSpace: 'nowrap',
              borderRadius: '10px',
              background: '#0F6CBD',
              boxShadow: '0 4px 14px rgba(15, 108, 189, 0.35)',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>Create Course</span>
          </button>
        </div>
      </header>

      {/* ERROR BANNER IF LOAD FAILED */}
      {loadError && (
        <div
          role="alert"
          style={{
            padding: '0.9rem 1.15rem',
            borderRadius: '12px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.86rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={17} />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadCourses}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* =========================================================================
          2. PERFORMANCE SUMMARY (EDITORIAL STRIP)
          Differentiated 4-segment operational summary (not oversized identical cards)
         ========================================================================= */}
      <section
        aria-label="Trainer Performance Summary"
        className="trainer-stats-grid"
        style={{ marginTop: 0 }}
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`stat-skel-${idx}`}
              className="skeleton-shimmer"
              style={{
                height: '110px',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
              }}
            />
          ))
        ) : (
          <>
            {/* 1. Published Courses */}
            <div
              className="stat-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '1.2rem 1.35rem',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                boxShadow: '0 4px 18px rgba(31, 70, 120, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 650, color: '#475569' }}>Published Courses</span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#F0F9FF',
                    color: '#0284C7',
                    border: '1px solid #BAE6FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-hidden="true"
                >
                  <BookOpen size={16} />
                </div>
              </div>

              <div style={{ marginTop: '0.35rem' }}>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                  {trainerInsights?.publishedCourses ?? activeCourseCount}
                </div>
              </div>

              <div style={{ marginTop: '0.45rem', fontSize: '0.74rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#16A34A',
                  }}
                />
                <span>
                  {trainerInsights?.draftCourses != null
                    ? `${trainerInsights.draftCourses} draft ${trainerInsights.draftCourses === 1 ? 'course' : 'courses'} in progress`
                    : 'Active training catalog'}
                </span>
              </div>
            </div>

            {/* 2. Active Learners */}
            <div
              className="stat-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '1.2rem 1.35rem',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                boxShadow: '0 4px 18px rgba(31, 70, 120, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 650, color: '#475569' }}>Active Learners</span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#F5F3FF',
                    color: '#7C3AED',
                    border: '1px solid #DDD6FE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-hidden="true"
                >
                  <Users size={16} />
                </div>
              </div>

              <div style={{ marginTop: '0.35rem' }}>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                  {trainerInsights?.activeLearners ?? 0}
                </div>
              </div>

              <div style={{ marginTop: '0.45rem', fontSize: '0.74rem', color: '#64748B' }}>
                {trainerInsights?.totalEnrollments ?? 0} total course enrollments
              </div>
            </div>

            {/* 3. Course Completion Rate */}
            <div
              className="stat-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '1.2rem 1.35rem',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                boxShadow: '0 4px 18px rgba(31, 70, 120, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 650, color: '#475569' }}>Course Completion Rate</span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#F0FDF4',
                    color: '#16A34A',
                    border: '1px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-hidden="true"
                >
                  <CheckCircle2 size={16} />
                </div>
              </div>

              <div style={{ marginTop: '0.35rem' }}>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                  {trainerInsights?.completionRate ?? 0}%
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: '0.45rem' }}>
                <div
                  style={{
                    height: '5px',
                    borderRadius: '999px',
                    background: '#E2E8F0',
                    overflow: 'hidden',
                    marginBottom: '0.3rem',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, trainerInsights?.completionRate ?? 0))}%`,
                      height: '100%',
                      background: '#16A34A',
                      borderRadius: '999px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  {trainerInsights?.completedEnrollments ?? 0} completions • Target ≥ 75%
                </div>
              </div>
            </div>

            {/* 4. Average Assessment Score */}
            <div
              className="stat-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '1.2rem 1.35rem',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                boxShadow: '0 4px 18px rgba(31, 70, 120, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 650, color: '#475569' }}>Assessment Average</span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#FFFBEB',
                    color: '#D97706',
                    border: '1px solid #FDE68A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-hidden="true"
                >
                  <Star size={16} />
                </div>
              </div>

              <div style={{ marginTop: '0.35rem' }}>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                  {trainerInsights?.averageScore ?? 0}%
                </div>
              </div>

              <div style={{ marginTop: '0.45rem', fontSize: '0.74rem', color: '#64748B' }}>
                Across evaluated course quizzes • Pass ≥ 70%
              </div>
            </div>
          </>
        )}
      </section>

      {/* =========================================================================
          3. MAIN OPERATIONS LAYOUT
          Center Left: Authored Courses Catalog & Aligned Course Analytics
          Right: Upcoming Live Sessions & Recent Learner Activity
         ========================================================================= */}
      <div className="trainer-main-grid">
        {/* LEFT COLUMN: Course Catalog & Deep Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          {/* AUTHORED COURSES CATALOG TABLE */}
          <section
            aria-labelledby="authored-courses-heading"
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.4rem 1.5rem',
              border: '1px solid rgba(226, 232, 240, 0.95)',
              boxShadow: '0 4px 20px rgba(31, 70, 120, 0.04)',
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
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div>
                <h2
                  id="authored-courses-heading"
                  style={{ fontSize: '1.05rem', fontWeight: 750, color: '#0F172A', margin: 0 }}
                >
                  Authored Courses &amp; Catalog Status
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Manage course content, view enrollment rosters, and distribute assignments
                </p>
              </div>

              {/* Filters for catalog */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={14}
                    style={{
                      position: 'absolute',
                      left: '0.65rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94A3B8',
                    }}
                  />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search courses..."
                    aria-label="Search authored courses"
                    style={{
                      padding: '0.42rem 0.75rem 0.42rem 2rem',
                      fontSize: '0.8rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#0F172A',
                      outline: 'none',
                      width: '160px',
                    }}
                   enterKeyHint="search" />
                </div>

                <select
                  value={catalogStatusFilter}
                  onChange={(e) => setCatalogStatusFilter(e.target.value)}
                  aria-label="Filter courses by status"
                  style={{
                    padding: '0.42rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    color: '#0F172A',
                    outline: 'none',
                    fontWeight: 500,
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
            </div>

            <div className="table-scroll">
              <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <th style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Course ID &amp; Title
                    </th>
                    <th style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Category
                    </th>
                    <th className="th-right" style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Enrolled
                    </th>
                    <th className="th-center" style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                      Actions
                    </th>
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
                              height: '48px',
                              borderRadius: '8px',
                              width: '100%',
                            }}
                          />
                        </td>
                      </tr>
                    ))
                  ) : filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
                        <div style={{ maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              background: '#F1F5F9',
                              color: '#94A3B8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <BookOpen size={22} />
                          </div>
                          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.92rem' }}>
                            No courses found
                          </div>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                            {courseList.length === 0
                              ? 'No courses were returned by the server. Create your first course to begin.'
                              : 'No courses match the active search or status filter.'}
                          </p>
                          {courseList.length === 0 && (
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => setShowBuilderModal(true)}
                              style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                            >
                              <Plus size={14} /> Create Course
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCatalog.map((course, index) => {
                      const courseId = getCourseId(course);
                      const status = getCourseStatus(course);
                      const isPublished = status === 'PUBLISHED' || status === 'ACTIVE';
                      const title = course.title ?? course.courseTitle ?? 'Untitled course';
                      const category = course.category ?? course.categoryName ?? course.categorySlug ?? 'General';
                      const duration = course.duration
                        ?? (course.durationHours != null ? `${course.durationHours} hours` : 'Self-paced');
                      const enrolledCount = course.enrolledCount ?? course.enrollmentCount;

                      return (
                        <tr
                          key={courseId ?? `${title}-${index}`}
                          style={{
                            fontSize: '0.86rem',
                            borderBottom: '1px solid #F1F5F9',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '0.85rem 0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  width: '44px',
                                  height: '44px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  border: '1px solid #E2E8F0',
                                  background: '#F8FAFC',
                                }}
                              >
                                <CourseThumbnailImage
                                  course={course}
                                  alt={title}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                                  {title}
                                </div>
                                <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: '2px' }}>
                                  ID: <span className="tabular-nums font-semibold" style={{ color: '#0284C7' }}>{courseId || '—'}</span> • {duration}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem 0.9rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                background: '#F0F9FF',
                                color: '#0369A1',
                                fontSize: '0.74rem',
                                fontWeight: 650,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                border: '1px solid #BAE6FD',
                              }}
                            >
                              {category}
                            </span>
                          </td>

                          <td className="nowrap td-right" style={{ padding: '0.85rem 0.9rem', fontWeight: 700, color: '#0F172A' }}>
                            {enrolledCount == null ? '—' : `${enrolledCount} Learners`}
                          </td>

                          <td className="td-center" style={{ padding: '0.85rem 0.9rem' }}>
                            <span
                              className={`badge-status ${isPublished ? 'badge-status-success' : 'badge-status-warning'}`}
                              style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                            >
                              <span className="badge-status-dot" />
                              {status === 'UNKNOWN' ? 'Draft' : status}
                            </span>
                          </td>

                          <td style={{ padding: '0.85rem 0.9rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', justifyContent: 'flex-end', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn-primary nowrap"
                                style={{
                                  padding: '0.38rem 0.75rem',
                                  fontSize: '0.78rem',
                                  background: '#0284C7',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  borderRadius: '6px',
                                }}
                                onClick={() => setCourseForAssignment(course)}
                              >
                                <Users size={13} />
                                <span>Manage Assignments</span>
                              </button>

                              <button
                                type="button"
                                className="nowrap"
                                style={{
                                  padding: '0.38rem 0.65rem',
                                  fontSize: '0.78rem',
                                  background: '#FEF2F2',
                                  color: '#DC2626',
                                  border: '1px solid #FECACA',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  fontWeight: 600,
                                  transition: 'all 0.15s ease-in-out',
                                }}
                                onClick={() => {
                                  setDeleteError('');
                                  setCourseToDelete(course);
                                }}
                                title="Delete Course"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
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
          </section>

          {/* =========================================================================
              COURSE ANALYTICS OVERVIEW & ASSIGNMENT BALANCE
              Aligned calculation engine with HR Training Reports
             ========================================================================= */}
          <section
            aria-labelledby="course-analytics-overview-heading"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Left Card: Course Analytics Overview */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '1.35rem 1.45rem',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                boxShadow: '0 4px 18px rgba(31, 70, 120, 0.04)',
              }}
            >
              <h3
                id="course-analytics-overview-heading"
                style={{ fontWeight: 750, color: '#0F172A', fontSize: '0.98rem', margin: '0 0 0.2rem' }}
              >
                Course Analytics Overview
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 1.1rem' }}>
                Authorized course progress, mandatory compliance, and assessment performance.
              </p>

              {[
                { label: 'Average Training Progress', value: averageProgress, color: '#0284C7' },
                { label: 'Mandatory Compliance', value: mandatoryComplianceRate, color: '#16A34A' },
                { label: 'Assessment Performance', value: averageScore, color: '#7C3AED' },
              ].map((metric) => (
                <div key={metric.label} style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 650, color: '#334155', marginBottom: '0.35rem' }}>
                    <span>{metric.label}</span>
                    <span style={{ color: metric.color, fontWeight: 750 }}>{metric.value}%</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '999px', background: '#F1F5F9', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, metric.value))}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: metric.color,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Right Card: Assignment & Certification Status */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '1.35rem 1.45rem',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                boxShadow: '0 4px 18px rgba(31, 70, 120, 0.04)',
              }}
            >
              <h3 style={{ fontWeight: 750, color: '#0F172A', fontSize: '0.98rem', margin: '0 0 0.2rem' }}>
                Assignment &amp; Certification Status
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 1.1rem' }}>
                Identical calculation engine aligned with HR Training Reports.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.65rem' }}>
                {[
                  { label: 'Completed', value: completedAssignments, color: '#16A34A', bg: '#F0FDF4', border: '#DCFCE7' },
                  { label: 'In Progress', value: inProgressAssignments, color: '#0284C7', bg: '#F0F9FF', border: '#E0F2FE' },
                  { label: 'Not Started', value: notStartedAssignments, color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
                  { label: 'Overdue', value: overdueAssignments, color: '#DC2626', bg: '#FEF2F2', border: '#FEE2E2' },
                  { label: 'Total Assignments', value: totalAssignments, color: '#0F172A', bg: '#F8FAFC', border: '#E2E8F0' },
                  { label: 'Certificates Issued', value: certificatesIssued, color: '#D97706', bg: '#FFFBEB', border: '#FEF3C7' },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: '0.65rem 0.8rem',
                      borderRadius: '10px',
                      background: item.bg,
                      border: `1px solid ${item.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem',
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#475569' }}>{item.label}</span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* =========================================================================
              COURSE ANALYTICS & PERFORMANCE BREAKDOWN (VISUAL CENTER TABLE)
             ========================================================================= */}
          <section
            aria-labelledby="course-breakdown-heading"
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.4rem 1.5rem',
              border: '1px solid rgba(226, 232, 240, 0.95)',
              boxShadow: '0 4px 20px rgba(31, 70, 120, 0.04)',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.85rem',
                marginBottom: '1rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div>
                <h3
                  id="course-breakdown-heading"
                  style={{ margin: 0, fontSize: '1.05rem', fontWeight: 750, color: '#0F172A' }}
                >
                  Course Analytics & Performance Breakdown
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  Filter, sort, and compare course completion, learner progress, assessment scores, and compliance
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem', alignItems: 'center' }}>
                <input
                  type="text"
                  value={analyticsSearch}
                  onChange={(e) => setAnalyticsSearch(e.target.value)}
                  placeholder="Search courses..."
                  aria-label="Search course performance breakdown"
                  style={{
                    padding: '0.42rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    minWidth: '160px',
                    outline: 'none',
                  }}
                 enterKeyHint="search" />

                <select
                  value={analyticsDeptFilter}
                  onChange={(e) => setAnalyticsDeptFilter(e.target.value)}
                  aria-label="Filter by department or category"
                  style={{
                    padding: '0.42rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    outline: 'none',
                  }}
                >
                  <option value="ALL">All Categories / Depts</option>
                  {availableDepts.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                <select
                  value={analyticsDateRange}
                  onChange={(e) => setAnalyticsDateRange(e.target.value)}
                  aria-label="Filter by timeframe"
                  style={{
                    padding: '0.42rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    outline: 'none',
                  }}
                >
                  <option value="ALL">All Time</option>
                  <option value="LAST_30_DAYS">Last 30 Days</option>
                  <option value="LAST_90_DAYS">Last 90 Days</option>
                  <option value="THIS_YEAR">This Year</option>
                </select>

                <select
                  value={analyticsSortBy}
                  onChange={(e) => setAnalyticsSortBy(e.target.value)}
                  aria-label="Sort performance metrics"
                  style={{
                    padding: '0.42rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#F8FAFC',
                    outline: 'none',
                    fontWeight: 600,
                  }}
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
              <table className="data-table" style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Course</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category / Dept</th>
                    <th className="th-right" style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Enrolled</th>
                    <th className="th-right" style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Completed</th>
                    <th className="th-right" style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>In Progress</th>
                    <th style={{ textAlign: 'left', minWidth: '130px', padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Completion Rate</th>
                    <th className="th-right" style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Progress</th>
                    <th className="th-right" style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Score</th>
                    <th className="th-right" style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mandatory</th>
                    <th className="th-right" style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Overdue</th>
                    <th className="th-right" style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Certificates</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourseAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#64748B' }}>
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
                        <tr
                          key={c.id || c.courseId || c.title}
                          style={{
                            fontSize: '0.84rem',
                            borderBottom: '1px solid #F1F5F9',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '0.8rem 0.9rem' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.86rem' }}>
                              {c.title || 'Untitled Course'}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: '2px' }}>
                              {c.courseId || '—'}
                            </div>
                          </td>
                          <td style={{ padding: '0.8rem 0.9rem', fontSize: '0.8rem', color: '#475569' }}>
                            {c.department || c.category || 'General'}
                          </td>
                          <td className="td-right" style={{ padding: '0.8rem 0.9rem', fontWeight: 650, color: '#0F172A' }}>
                            {cEnrolled}
                          </td>
                          <td className="td-right" style={{ padding: '0.8rem 0.9rem', fontWeight: 750, color: '#16A34A' }}>
                            {cCompleted}
                          </td>
                          <td className="td-right" style={{ padding: '0.8rem 0.9rem', fontWeight: 650, color: '#0284C7' }}>
                            {cInProgress}
                          </td>
                          <td style={{ padding: '0.8rem 0.9rem', minWidth: '130px' }}>
                            <div style={{ fontSize: '0.76rem', fontWeight: 750, color: '#1E293B', marginBottom: '3px' }}>
                              <span className="tabular-nums">{cRate}%</span>
                            </div>
                            <div style={{ height: '5px', borderRadius: '999px', background: '#E2E8F0', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(0, cRate))}%`,
                                  height: '100%',
                                  borderRadius: '999px',
                                  background: cRate >= 75 ? '#16A34A' : cRate >= 50 ? '#0284C7' : '#D97706',
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                          </td>
                          <td className="td-right" style={{ padding: '0.8rem 0.9rem', fontWeight: 650, color: '#334155' }}>
                            {cProgress}%
                          </td>
                          <td className="td-right" style={{ padding: '0.8rem 0.9rem', fontWeight: 750, color: '#7C3AED' }}>
                            {cScore}%
                          </td>
                          <td className="td-right" style={{ padding: '0.8rem 0.9rem', fontSize: '0.8rem', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                            {cMandatoryDone} / {cMandatory}
                          </td>
                          <td className="td-right" style={{ padding: '0.8rem 0.9rem', fontWeight: 750, color: Number(cOverdue) > 0 ? '#DC2626' : '#64748B' }}>
                            {cOverdue}
                          </td>
                          <td className="td-right" style={{ padding: '0.8rem 0.9rem', fontWeight: 750, color: '#D97706' }}>
                            {cCerts}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* RIGHT OPERATIONS COLUMN: Live Sessions & Learner Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          {/* UPCOMING LIVE SESSIONS */}
          <section
            aria-labelledby="upcoming-sessions-heading"
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.35rem 1.4rem',
              border: '1px solid rgba(226, 232, 240, 0.95)',
              boxShadow: '0 4px 18px rgba(31, 70, 120, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                marginBottom: '1rem',
                paddingBottom: '0.65rem',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: '#F0F9FF',
                    color: '#0284C7',
                    border: '1px solid #BAE6FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <Calendar size={16} />
                </div>
                <h3
                  id="upcoming-sessions-heading"
                  style={{ margin: 0, fontSize: '0.98rem', fontWeight: 750, color: '#0F172A' }}
                >
                  Upcoming Live Sessions
                </h3>
              </div>

              <button
                type="button"
                onClick={() => navigate('/training-calendar')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0F6CBD',
                  fontSize: '0.76rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <span>Full Calendar</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {isSessionsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {[1, 2].map((sKey) => (
                  <div
                    key={`sess-skel-${sKey}`}
                    className="skeleton-shimmer"
                    style={{
                      height: '84px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                    }}
                  />
                ))}
              </div>
            ) : sessionsError ? (
              <div
                role="alert"
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  fontSize: '0.82rem',
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
                  style={{ padding: '0.28rem 0.6rem', fontSize: '0.74rem', flexShrink: 0 }}
                >
                  Retry
                </button>
              </div>
            ) : upcomingSessions.length === 0 ? (
              <div
                style={{
                  padding: '1.75rem 1rem',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#F0F9FF',
                    color: '#0284C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar size={18} />
                </div>
                <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.86rem' }}>
                  No upcoming live sessions.
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', maxWidth: '220px' }}>
                  Scheduled live workshops and webinars will appear here.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {upcomingSessions.map((session, idx) => {
                  const statusLabel = String(session.status || 'UPCOMING').toUpperCase();
                  const isToday = statusLabel === 'TODAY';
                  return (
                    <div
                      key={session.id ?? `${session.title}-${idx}`}
                      style={{
                        padding: '0.85rem 0.95rem',
                        borderRadius: '10px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(16, 42, 67, 0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem', lineHeight: 1.35 }}>
                          {session.title || 'Live Session'}
                        </div>
                        <span
                          className={`badge-status ${isToday ? 'badge-status-success' : 'badge-status-info'}`}
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                        >
                          <span className={`badge-status-dot ${isToday ? 'pulse' : ''}`} />
                          {statusLabel}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                        Trainer: <strong style={{ color: '#0F172A', fontWeight: 650 }}>{session.trainerName || session.trainer || 'TBA'}</strong>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                        <Clock size={12} style={{ color: '#0284C7' }} />
                        <span>{formatSessionDate(session.date)}</span>
                        <span>•</span>
                        <span>{formatSessionTimeRange(session)}</span>
                      </div>

                      {session.joinUrl && (
                        <div style={{ marginTop: '0.2rem', paddingTop: '0.3rem', borderTop: '1px dashed #E2E8F0' }}>
                          <a
                            href={session.joinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              color: '#0284C7',
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
          </section>

          {/* RECENT LEARNER ACTIVITY */}
          <section
            aria-labelledby="recent-activity-heading"
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.35rem 1.4rem',
              border: '1px solid rgba(226, 232, 240, 0.95)',
              boxShadow: '0 4px 18px rgba(31, 70, 120, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                paddingBottom: '0.65rem',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: '#F0FDF4',
                  color: '#16A34A',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <Activity size={16} />
              </div>
              <h3
                id="recent-activity-heading"
                style={{ margin: 0, fontSize: '0.98rem', fontWeight: 750, color: '#0F172A' }}
              >
                Recent Learner Activity
              </h3>
            </div>

            {isActivityLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {[1, 2].map((aKey) => (
                  <div
                    key={`act-skel-${aKey}`}
                    className="skeleton-shimmer"
                    style={{
                      height: '76px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                    }}
                  />
                ))}
              </div>
            ) : activityError ? (
              <div
                role="alert"
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  fontSize: '0.82rem',
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
                  style={{ padding: '0.28rem 0.6rem', fontSize: '0.74rem', flexShrink: 0 }}
                >
                  Retry
                </button>
              </div>
            ) : recentActivities.length === 0 ? (
              <div
                style={{
                  padding: '1.75rem 1rem',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#F0FDF4',
                    color: '#16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Activity size={18} />
                </div>
                <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.86rem' }}>
                  No recent learner activity.
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', maxWidth: '220px' }}>
                  Learner quiz attempts and lesson completions will appear here.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {recentActivities.map((item, idx) => (
                  <div
                    key={item.activityId ?? `${item.employeeName}-${item.timestamp}-${idx}`}
                    style={{
                      padding: '0.8rem 0.9rem',
                      borderRadius: '10px',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 1px 3px rgba(16, 42, 67, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#16A34A',
                          }}
                        />
                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.85rem' }}>
                          {item.employeeName || 'Learner'}
                        </span>
                      </div>
                      {item.timestamp && (
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                          {formatActivityTimestamp(item.timestamp)}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.79rem', color: '#334155', lineHeight: 1.4 }}>
                      {item.activityDescription || 'Completed learning activity'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          color: '#0369A1',
                          fontWeight: 650,
                          background: '#F0F9FF',
                          border: '1px solid #BAE6FD',
                          padding: '0.12rem 0.45rem',
                          borderRadius: '5px',
                        }}
                      >
                        {item.courseTitle || item.courseId || 'Course'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* =========================================================================
          4. MODALS & OVERLAYS
          CourseBuilderModal, Delete Confirmation Dialog, CourseAssignmentModal
         ========================================================================= */}
      {showBuilderModal && (
        <CourseBuilderModal
          key="new-course"
          onClose={() => setShowBuilderModal(false)}
          onPublish={async () => {
            setShowBuilderModal(false);
            await loadCourses();
          }}
        />
      )}

      {courseToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
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
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #FEE2E2',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 id="delete-dialog-title" style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#0F172A' }}>
                  Delete Course
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Are you sure you want to permanently delete{' '}
              <strong style={{ color: '#0F172A' }}>
                {courseToDelete.title ?? courseToDelete.courseTitle ?? 'this course'}
              </strong>{' '}
              ({getCourseId(courseToDelete)})? All modules, lessons, quizzes, and learner progress will be removed.
            </p>

            {deleteError && (
              <div
                role="alert"
                style={{
                  padding: '0.75rem 1rem',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  color: '#991B1B',
                  fontSize: '0.84rem',
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
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
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
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  border: 'none',
                  background: isDeleting ? '#94A3B8' : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                  color: '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                }}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
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
