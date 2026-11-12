import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Compass,
  Sparkles,
  Calendar,
  RefreshCw,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { courseService } from '../services/courseService';
import AssignedLearningCarousel from './AssignedLearningCarousel';
import GlassCarousel from './GlassCarousel';
import { formatCourseDuration } from '../utils/courseDuration';
import { subscribeEnrollmentSync } from '../utils/enrollmentSync';

export { formatCourseDuration };

const panelStyle = {
  background: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 18,
  padding: '1.4rem 1.6rem',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  boxShadow: '0 4px 20px rgba(31, 70, 120, 0.05)'
};

function normalizeCourse(course, index = 0) {
  const modulesList = Array.isArray(course?.modules) ? course.modules : [];
  const calculatedModuleCount = modulesList.length;
  const calculatedLessonCount = modulesList.reduce(
    (acc, m) => acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
    0
  );

  const moduleCount =
    typeof course?.moduleCount === 'number'
      ? course.moduleCount
      : calculatedModuleCount > 0
      ? calculatedModuleCount
      : (course?.moduleCount != null ? Number(course.moduleCount) : 0);

  const lessonCount =
    typeof course?.lessonCount === 'number'
      ? course.lessonCount
      : calculatedLessonCount > 0
      ? calculatedLessonCount
      : (course?.lessonCount != null ? Number(course.lessonCount) : 0);

  const bannerUrl = course?.banner || course?.thumbnailUrl || course?.thumbnail || '';

  return {
    ...course,
    _key: course?.dbId ?? course?.courseDatabaseId ?? course?.id ?? course?.courseId ?? index,
    title: course?.title ?? course?.courseTitle ?? 'Untitled Course',
    id: course?.id ?? course?.courseId ?? course?.courseCode ?? '',
    progressPercent: Number(course?.progressPercent ?? course?.progress ?? 0),
    status: String(course?.enrollmentStatus ?? course?.status ?? '').toUpperCase(),
    duration: formatCourseDuration(course?.duration, course?.durationHours),
    banner: bannerUrl,
    thumbnailUrl: bannerUrl,
    thumbnail: bannerUrl,
    moduleCount,
    lessonCount
  };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDeadlineInfo(dueDateStr) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  if (Number.isNaN(due.getTime())) return null;

  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      type: 'overdue',
      label: `Overdue by ${overdueDays}d`,
      fullLabel: `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
      badgeStyle: {
        background: '#FEF2F2',
        color: '#DC2626',
        border: '1px solid #FECACA'
      }
    };
  }
  if (diffDays === 0) {
    return {
      type: 'due_today',
      label: 'Due today',
      fullLabel: 'Due today',
      badgeStyle: {
        background: '#FFFBEB',
        color: '#D97706',
        border: '1px solid #FDE68A'
      }
    };
  }
  if (diffDays <= 5) {
    return {
      type: 'approaching',
      label: `${diffDays}d remaining`,
      fullLabel: `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`,
      badgeStyle: {
        background: '#FFFBEB',
        color: '#D97706',
        border: '1px solid #FDE68A'
      }
    };
  }
  return {
    type: 'normal',
    label: `${diffDays}d remaining`,
    fullLabel: `${diffDays} days remaining`,
    badgeStyle: {
      background: '#F0F9FF',
      color: '#0284C7',
      border: '1px solid #BAE6FD'
    }
  };
}

export default function Overview({
  onSelectCourse,
  setActiveTab
}) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadDashboard = React.useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError('');

    try {
      const data = await courseService.getLearningDashboard();
      if (!data) {
        setDashboard(null);
        setError('Unable to load your learning dashboard. Please retry.');
        return;
      }
      setDashboard(data);
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load your learning dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const initialLoad = async () => {
      if (!mounted) return;
      await loadDashboard();
    };

    const handleEnrollmentUpdated = () => {
      loadDashboard(true);
    };

    initialLoad();

    // Direct window event listener for same-tab updates
    window.addEventListener('lms:enrollment-updated', handleEnrollmentUpdated);

    // Universal cross-tab and visibility/focus synchronization bus
    const unsubscribe = subscribeEnrollmentSync(handleEnrollmentUpdated);

    // 60-second periodic background revalidation for active tabs (e.g. kiosk or unattended open tab)
    const intervalId = setInterval(() => {
      if (mounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadDashboard(true);
      }
    }, 60000);

    return () => {
      mounted = false;
      window.removeEventListener('lms:enrollment-updated', handleEnrollmentUpdated);
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [loadDashboard]);

  // Navigate to dedicated course overview page
  const handleOpenCourse = (course) => {
    const code = course.id || course.courseId;
    if (code) {
      navigate(`/courses/${encodeURIComponent(code)}/overview`);
    } else if (onSelectCourse) {
      onSelectCourse(course);
    }
  };

  // Filter ONLY assigned courses for the authenticated employee
  const assignedCourses = useMemo(() => {
    if (!dashboard?.enrolled || !Array.isArray(dashboard.enrolled)) return [];
    const seen = new Set();
    const eligible = [];

    for (const rawCourse of dashboard.enrolled) {
      const course = normalizeCourse(rawCourse);
      const key = String(course.dbId || course.id || course._key);
      if (seen.has(key)) continue;
      seen.add(key);

      // Backend authoritative completion status
      const isCompleted =
        course.enrollmentStatus === 'COMPLETED' ||
        course.status === 'COMPLETED';

      // Revoked or inactive enrollments
      const isRevokedOrInactive =
        ['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes(course.enrollmentStatus) ||
        ['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes(course.status);

      if (isCompleted || isRevokedOrInactive) continue;

      const progress = Math.max(0, Math.min(100, Number(course.progressPercent || 0)));
      const isOngoing = progress > 0 || course.enrollmentStatus === 'IN_PROGRESS' || course.status === 'IN_PROGRESS';
      const isNewlyAssigned = !isOngoing;

      eligible.push({
        ...course,
        progress,
        isOngoing,
        isNewlyAssigned,
        statusLabel: isOngoing ? 'IN PROGRESS' : 'NEWLY ASSIGNED',
        actionLabel: isOngoing ? 'Continue Learning' : 'Start Learning'
      });
    }

    return eligible;
  }, [dashboard]);

  const recommendedCourses = useMemo(
    () => (Array.isArray(dashboard?.recommended) ? dashboard.recommended : []).map(normalizeCourse),
    [dashboard]
  );

  const completedCourses = Number(dashboard?.completedCourses ?? 0);

  // Overall progress percentage
  const overallProgress = useMemo(() => {
    if (dashboard?.mandatoryPercent != null && typeof dashboard.mandatoryPercent === 'number') {
      return Number(dashboard.mandatoryPercent);
    }
    const totalCount = assignedCourses.length + completedCourses;
    if (totalCount === 0) return 0;
    const assignedSum = assignedCourses.reduce((sum, c) => sum + (c.progress || 0), 0);
    const completedSum = completedCourses * 100;
    return Math.round((assignedSum + completedSum) / totalCount);
  }, [dashboard, assignedCourses, completedCourses]);

  // Upcoming deadlines (active incomplete assigned courses only)
  const upcomingDeadlines = useMemo(() => {
    return assignedCourses
      .filter((course) => Boolean(course.dueDate))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  }, [assignedCourses]);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
        {/* Carousel Skeleton */}
        <div className="skeleton-shimmer" style={{ height: '360px', borderRadius: '24px', border: '1px solid rgba(226, 235, 245, 0.8)' }} />
        {/* Snapshot Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`ov-skel-${i}`} className="skeleton-shimmer" style={{ height: '110px', borderRadius: '16px', border: '1px solid rgba(226, 235, 245, 0.8)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in" style={{ ...panelStyle, padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            border: '1px solid #fecaca',
          }}
        >
          <AlertCircle size={28} />
        </div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 .4rem' }}>
          Dashboard Unavailable
        </h2>
        <p role="alert" style={{ color: '#b91c1c', fontSize: '.88rem', margin: '0 0 1.25rem' }}>{error}</p>
        <button type="button" className="btn-primary" onClick={() => loadDashboard()} style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}>
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem', minWidth: 0 }}>
      {/* ========================================================
          PART B & C: ASSIGNED LEARNING CAROUSEL OR PART G: EMPTY STATE
      ======================================================== */}
      {assignedCourses.length > 0 ? (
        <AssignedLearningCarousel
          courses={assignedCourses}
          onOpenCourse={handleOpenCourse}
        />
      ) : (
        /* PART G: EMPTY STATE */
        <section
          className="assigned-learning-empty-state animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(246, 250, 255, 0.92) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            boxShadow: '0 16px 42px rgba(31, 70, 120, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
            padding: '3.2rem 2rem',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
              color: '#16A34A',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              boxShadow: '0 8px 24px rgba(22, 163, 74, 0.2)'
            }}
          >
            <CheckCircle2 size={34} />
          </div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 0.5rem',
              letterSpacing: '-0.02em'
            }}
          >
            You're all caught up!
          </h2>
          <p
            style={{
              color: '#64748B',
              fontSize: '0.94rem',
              maxWidth: '520px',
              margin: '0 auto 1.5rem',
              lineHeight: 1.6
            }}
          >
            You have completed all your assigned courses. Explore the course catalog to discover more learning opportunities.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (setActiveTab) setActiveTab('catalog');
              navigate('/courses');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.75rem 1.45rem',
              fontSize: '0.9rem',
              boxShadow: '0 4px 16px rgba(15, 108, 189, 0.35)'
            }}
          >
            <Compass size={17} /> Explore Course Catalog
          </button>
        </section>
      )}

      {/* ========================================================
          PART H: EMPLOYEE LEARNING SNAPSHOT (3 COMPACT CARDS)
      ======================================================== */}
      <section
        className="employee-learning-snapshot-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem'
        }}
      >
        {/* CARD 1: ASSIGNED COURSES */}
        <div
          className="stat-card"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            padding: '1.25rem 1.35rem',
            boxShadow: '0 4px 16px rgba(31, 70, 120, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            minWidth: 0
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: '#E0F2FE',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <BookOpen size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
              {assignedCourses.length}
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
              Assigned Courses
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
              Active incomplete curricula
            </div>
          </div>
        </div>

        {/* CARD 2: COURSES COMPLETED */}
        <div
          className="stat-card"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            padding: '1.25rem 1.35rem',
            boxShadow: '0 4px 16px rgba(31, 70, 120, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            minWidth: 0
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
              {completedCourses}
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
              Courses Completed
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
              Successfully satisfied
            </div>
          </div>
        </div>

        {/* CARD 3: OVERALL LEARNING PROGRESS */}
        <div
          className="stat-card"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            padding: '1.25rem 1.35rem',
            boxShadow: '0 4px 16px rgba(31, 70, 120, 0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            minWidth: 0
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: '#F3E8FF',
              color: '#9333EA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <GraduationCap size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                {overallProgress}%
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: overallProgress >= 75 ? '#16A34A' : '#0F6CBD',
                  background: overallProgress >= 75 ? '#DCFCE7' : '#E0F2FE',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px'
                }}
              >
                Overall
              </span>
            </div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
              Learning Progress
            </div>
            {/* Mini Progress Bar */}
            <div
              style={{
                height: '5px',
                background: '#E2E8F0',
                borderRadius: '999px',
                overflow: 'hidden',
                marginTop: '6px'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${overallProgress}%`,
                  background: 'linear-gradient(90deg, #9333EA 0%, #0F6CBD 100%)',
                  borderRadius: '999px'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          PART I: UPCOMING DEADLINES & RECOMMENDED LEARNING GRID
      ======================================================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: upcomingDeadlines.length > 0 ? 'minmax(0, 1.4fr) minmax(300px, 1fr)' : '1fr',
          gap: '1.4rem',
          alignItems: 'start'
        }}
      >
        {/* UPCOMING DEADLINES SECTION */}
        {upcomingDeadlines.length > 0 && (
          <section
            style={{
              ...panelStyle,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <Calendar size={17} style={{ color: '#0F6CBD' }} />
                  Upcoming Deadlines
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '3px 0 0' }}>
                  Active incomplete assigned courses with target completion dates.
                </p>
              </div>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#64748B',
                  background: '#F1F5F9',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px'
                }}
              >
                {upcomingDeadlines.length} Due Soon
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {upcomingDeadlines.map((course) => {
                const deadline = getDeadlineInfo(course.dueDate);
                const isMandatory =
                  String(course.assignmentType || '').toUpperCase() === 'MANDATORY' ||
                  String(course.enrollmentType || '').toUpperCase() === 'MANDATORY';

                return (
                  <div
                    key={`dl-${course._key || course.id}`}
                    onClick={() => handleOpenCourse(course)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '0.8rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0F6CBD';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 108, 189, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.12rem 0.45rem',
                            borderRadius: '4px',
                            background: isMandatory ? '#FEE2E2' : '#DCFCE7',
                            color: isMandatory ? '#DC2626' : '#16A34A',
                            textTransform: 'uppercase'
                          }}
                        >
                          {isMandatory ? 'Mandatory' : 'Recommended'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>
                          Due {formatDate(course.dueDate)}
                        </span>
                      </div>
                      <h4
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 750,
                          color: '#0F172A',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {course.title}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
                      {deadline && (
                        <span
                          style={{
                            ...deadline.badgeStyle,
                            fontSize: '0.72rem',
                            fontWeight: 750,
                            padding: '0.22rem 0.55rem',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {deadline.label}
                        </span>
                      )}
                      <ArrowRight size={14} color="#94A3B8" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* RECOMMENDED COURSES SECTION */}
        <section style={{ minWidth: 0 }}>
          {recommendedCourses.length > 0 ? (
            <GlassCarousel
              items={recommendedCourses}
              title="Recommended For You"
              subtitle="Tailored to your organizational position and role"
              badge="RECOMMENDED"
              icon={Sparkles}
              actionButton={
                <button
                  type="button"
                  onClick={() => {
                    if (setActiveTab) setActiveTab('catalog');
                    navigate('/courses');
                  }}
                  style={{
                    color: '#0F6CBD',
                    fontSize: '0.82rem',
                    fontWeight: 750,
                    background: 'none',
                    border: 0,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  View catalog →
                </button>
              }
              onSelectCourse={handleOpenCourse}
              onOpenCourseDetails={handleOpenCourse}
            />
          ) : (
            <div
              style={{
                ...panelStyle,
                borderStyle: 'dashed',
                boxShadow: 'none',
                textAlign: 'center',
                color: '#64748B',
                padding: '2rem 1.5rem'
              }}
            >
              <GraduationCap size={32} color="#94A3B8" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 750, color: '#334155', fontSize: '0.92rem' }}>
                Explore More Skills
              </div>
              <p style={{ fontSize: '0.82rem', margin: '0.35rem 0 1rem' }}>
                Discover new courses available in your enterprise catalog.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (setActiveTab) setActiveTab('catalog');
                  navigate('/courses');
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
              >
                <Compass size={14} /> Open Course Catalog
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
