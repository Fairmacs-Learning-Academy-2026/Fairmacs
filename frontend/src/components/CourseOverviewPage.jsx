import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyDocumentMeta } from '../utils/pageMeta';
import {
  ArrowLeft,
  Compass,
  PlayCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  BookOpen,
  FileText,
  Video,
  Award,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
  Lock,
  Sparkles
} from 'lucide-react';
import { courseService } from '../services/courseService';
import { enrollmentService } from '../services/enrollmentService';
import CourseThumbnailImage from './CourseThumbnailImage';
import { formatCourseDuration } from '../utils/courseDuration';

function formatPublishedDate(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDueDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDeadlineUrgency(dateVal) {
  if (!dateVal) return null;
  const due = new Date(dateVal);
  if (Number.isNaN(due.getTime())) return null;

  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `Overdue by ${Math.abs(diffDays)} days`,
      bg: '#FEF2F2',
      color: '#DC2626',
      border: '#FECACA'
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Due today',
      bg: '#FFFBEB',
      color: '#D97706',
      border: '#FDE68A'
    };
  }
  if (diffDays <= 5) {
    return {
      label: `Due in ${diffDays} days`,
      bg: '#FFFBEB',
      color: '#D97706',
      border: '#FDE68A'
    };
  }
  return {
    label: `Due ${formatDueDate(dateVal)}`,
    bg: '#F0F9FF',
    color: '#0284C7',
    border: '#BAE6FD'
  };
}

export default function CourseOverviewPage({
  courseId,
  onStartLearning,
  onViewCertificate,
  onBackToDashboard,
  onBackToCatalog
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const initialCourseData = location.state?.courseData || null;
  const fromCarousel = Boolean(location.state?.fromCarousel);
  const fromCarouselIndex = location.state?.fromCarouselIndex;

  const [course, setCourse] = useState(initialCourseData);
  const [loading, setLoading] = useState(!initialCourseData);

  useEffect(() => {
    const title = course?.title || course?.courseTitle;
    if (title && typeof document !== 'undefined') {
      applyDocumentMeta(location.pathname, {
        courseTitle: title,
        courseDescription: course?.description || '',
      });
    }
  }, [course?.title, course?.courseTitle, course?.description, location.pathname]);
  const [error, setError] = useState('');
  const [completedLessonsMap, setCompletedLessonsMap] = useState({});
  const [expandedModules, setExpandedModules] = useState({});
  const [isExiting, setIsExiting] = useState(false);

  const handleBackToDashboard = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      if (onBackToDashboard) {
        onBackToDashboard(course?.id || course?.courseId || courseId);
      } else {
        navigate('/dashboard', {
          state: {
            returnedFromCourseId: course?.id || course?.courseId || courseId,
            fromCarouselIndex
          }
        });
      }
    }, 240);
  };

  useEffect(() => {
    let cancelled = false;

    const loadCourseData = async () => {
      if (!courseId) {
        setError('No course ID specified.');
        setLoading(false);
        return;
      }

      if (!initialCourseData) {
        setLoading(true);
        // Prevent stale course data when navigating between courses
        setCourse(null);
      }
      setError('');
      setCompletedLessonsMap({});
      setExpandedModules({});

      try {
        const data = await courseService.getCourseById(courseId);
        if (cancelled) return;
        if (!data) throw new Error('This course could not be found or you do not have permission to access it.');

        setCourse((prev) => (prev ? { ...prev, ...data } : data));

        // Expand first module by default
        if (Array.isArray(data.modules) && data.modules.length > 0) {
          const firstModId = data.modules[0].id ?? data.modules[0].dbId ?? 0;
          setExpandedModules({ [firstModId]: true });
        }

        // If enrolled, load completed lessons
        if (data.enrollmentDbId) {
          try {
            const progressList = await enrollmentService.getEnrollmentProgress(data.enrollmentDbId);
            if (!cancelled && Array.isArray(progressList)) {
              const comp = {};
              progressList.forEach((item) => {
                const lessonId = item?.lessonId ?? item?.lesson?.id;
                const percent = Number(item?.completionPercent ?? 0);
                if (lessonId && (Boolean(item?.completed) || percent >= 100)) {
                  comp[lessonId] = true;
                }
              });
              setCompletedLessonsMap(comp);
            }
          } catch (progressErr) {
            console.warn('Could not load detailed lesson progress:', progressErr);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Course overview load error:', err);
          setError(err.message || 'Failed to load course information.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCourseData();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const toggleModule = (modId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId]
    }));
  };

  const modules = useMemo(() => (Array.isArray(course?.modules) ? course.modules : []), [course]);

  const allLessons = useMemo(() => {
    return modules.flatMap((m) => (Array.isArray(m.lessons) ? m.lessons : []));
  }, [modules]);

  const totalModulesCount =
    modules.length > 0
      ? modules.length
      : course?.moduleCount != null
      ? Number(course.moduleCount)
      : 0;

  const totalLessons =
    allLessons.length > 0
      ? allLessons.length
      : course?.lessonCount != null
      ? Number(course.lessonCount)
      : 0;
  const completedLessonsCount = allLessons.filter((l) => {
    const dbId = l?.dbId ?? l?.id;
    return Boolean(completedLessonsMap[dbId]);
  }).length;

  const videoLessonsCount = allLessons.filter(
    (l) => String(l.type || l.lessonType || '').toUpperCase() === 'VIDEO'
  ).length;

  const docLessonsCount = allLessons.filter((l) => {
    const t = String(l.type || l.lessonType || '').toUpperCase();
    return t === 'PDF' || t === 'DOC' || t === 'DOCUMENT';
  }).length;

  const moduleQuizzesCount = modules.filter(
    (m) => Boolean(m.quiz || m.hasQuiz || m.quizId)
  ).length;

  const hasFinalAssessment = Boolean(
    course?.quiz || course?.hasFinalQuiz || course?.finalQuiz
  );

  const isMandatory =
    String(course?.assignmentType || '').toUpperCase() === 'MANDATORY' ||
    String(course?.enrollmentType || '').toUpperCase() === 'MANDATORY' ||
    Boolean(course?.foundation);

  const isCompleted =
    course?.enrollmentStatus === 'COMPLETED' ||
    course?.status === 'COMPLETED' ||
    (course?.foundation && totalLessons > 0 && completedLessonsCount >= totalLessons);

  const progressPercent = isCompleted
    ? 100
    : Math.max(0, Math.min(98, Number(course?.progressPercent || 0)));

  const isOngoing = !isCompleted && (progressPercent > 0 || completedLessonsCount > 0);
  const statusLabel = isCompleted ? 'COMPLETED' : isOngoing ? 'IN PROGRESS' : 'NEWLY ASSIGNED';

  let primaryActionLabel = 'Start Learning';
  if (isCompleted) {
    primaryActionLabel = 'Review Course';
  } else if (isOngoing) {
    primaryActionLabel = 'Continue Learning';
  }

  // Parse learning outcomes
  const learningOutcomes = useMemo(() => {
    if (!course) return [];
    if (Array.isArray(course.learningOutcomes) && course.learningOutcomes.length > 0) {
      return course.learningOutcomes.filter((o) => o && String(o).trim());
    }
    if (typeof course.learningOutcomes === 'string' && course.learningOutcomes.trim()) {
      try {
        const parsed = JSON.parse(course.learningOutcomes);
        if (Array.isArray(parsed)) return parsed.filter((o) => o && String(o).trim());
      } catch {
        return course.learningOutcomes
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    if (Array.isArray(course.outlines) && course.outlines.length > 0) {
      return course.outlines.filter((o) => o && String(o).trim());
    }
    return [];
  }, [course]);

  const departmentName =
    course?.owningDepartmentName ||
    course?.department ||
    (Array.isArray(course?.departments) && course.departments[0]) ||
    'Fairmacs Core';

  const deadlineInfo = getDeadlineUrgency(course?.dueDate);
  const publishedDateStr = formatPublishedDate(course?.publishedAt || course?.publishedDate || course?.createdAt);
  const durationDisplay = formatCourseDuration(course?.duration, course?.durationHours);

  const lessonGlobalIndexMap = useMemo(() => {
    const map = {};
    let idx = 0;
    modules.forEach((mod) => {
      (mod.lessons || []).forEach((l) => {
        const dbId = l?.dbId ?? l?.id;
        if (dbId) map[dbId] = idx;
        idx++;
      });
    });
    return map;
  }, [modules]);

  if (loading) {
    return (
      <div className="course-overview-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
        {/* Navigation Skeleton */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="skeleton-shimmer" style={{ width: '140px', height: '36px', borderRadius: '8px' }} />
          <div className="skeleton-shimmer" style={{ width: '120px', height: '36px', borderRadius: '8px' }} />
        </div>
        {/* Hero Skeleton */}
        <div className="skeleton-shimmer" style={{ height: '340px', borderRadius: '20px' }} />
        {/* Facts Strip Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`facts-skel-${i}`} className="skeleton-shimmer" style={{ height: '90px', borderRadius: '12px' }} />
          ))}
        </div>
        {/* Modules Skeleton */}
        <div className="skeleton-shimmer" style={{ height: '240px', borderRadius: '16px' }} />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div
        className="course-overview-page animate-fade-in"
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '3rem 2rem',
          textAlign: 'center',
          border: '1px solid #FECACA',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#FEF2F2',
            color: '#DC2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}
        >
          <AlertCircle size={28} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem' }}>
          Course Overview Unavailable
        </h2>
        <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
          {error || 'Unable to load course details for the specified course.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleBackToDashboard}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onBackToCatalog}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Compass size={16} /> Browse Course Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`course-overview-page ${isExiting ? 'course-overview-page-exiting' : 'course-overview-page-entering'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        minWidth: 0,
        paddingBottom: '2.5rem'
      }}
    >
      {/* 1. TOP NAVIGATION / BREADCRUMB BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={handleBackToDashboard}
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '0.45rem 0.85rem',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (typeof window !== 'undefined' && !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
              e.currentTarget.style.borderColor = '#0F6CBD';
              e.currentTarget.style.color = '#0F6CBD';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.color = '#334155';
            }}
          >
            <ArrowLeft size={15} /> Dashboard
          </button>

          <span style={{ color: '#94A3B8', fontSize: '0.82rem' }}>/</span>

          <button
            type="button"
            onClick={onBackToCatalog}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.45rem 0.5rem',
              color: '#64748B',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            onMouseEnter={(e) => {
              if (typeof window !== 'undefined' && !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
              e.currentTarget.style.color = '#0F6CBD';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748B';
            }}
          >
            <Compass size={14} /> Catalog
          </button>

          <span style={{ color: '#94A3B8', fontSize: '0.82rem' }}>/</span>

          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#0F172A',
              maxWidth: '320px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {course.title}
          </span>
        </div>

        {/* Course Code Badge */}
        <span
          style={{
            fontSize: '0.76rem',
            fontWeight: 800,
            color: '#0F6CBD',
            background: 'rgba(15, 108, 189, 0.08)',
            border: '1px solid rgba(15, 108, 189, 0.2)',
            borderRadius: '8px',
            padding: '0.25rem 0.65rem'
          }}
        >
          {course.id || course.courseId}
        </span>
      </div>

      {/* 2. HERO SECTION – SPLIT LAYOUT WITH PROMINENT THUMBNAIL */}
      <section className={`course-overview-hero ${fromCarousel ? 'course-overview-hero-expanding' : ''}`}>
        <div className="course-overview-hero-split">
          {/* Left Column: Dedicated Course Thumbnail Card */}
          <div className="course-overview-hero-thumb-card course-overview-hero-thumb-animated">
            <CourseThumbnailImage
              course={course}
              alt={course.title}
              className="course-overview-hero-thumb-img"
            />
          </div>

          {/* Right Column: Hierarchical Course Information */}
          <div className="course-overview-hero-info course-overview-hero-info-animated">
            {/* Top Row: Categorization and Status Badges */}
            <div className="course-overview-hero-badges">
              {/* Department Badge */}
              <span className="course-overview-badge-dept">
                <Building2 size={13} />
                {departmentName}
              </span>

              {/* Mandatory / Recommended Classification Badge */}
              <span
                style={{
                  background: isMandatory ? 'rgba(220, 38, 38, 0.95)' : 'rgba(16, 185, 129, 0.95)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  padding: '0.28rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                {isMandatory ? 'Mandatory' : 'Recommended'}
              </span>

              {/* Status Badge */}
              <span
                style={{
                  background: isCompleted
                    ? 'rgba(16, 185, 129, 0.2)'
                    : isOngoing
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(56, 189, 248, 0.2)',
                  color: isCompleted ? '#6EE7B7' : isOngoing ? '#FDE68A' : '#7DD3FC',
                  border: isCompleted
                    ? '1px solid rgba(16, 185, 129, 0.45)'
                    : isOngoing
                    ? '1px solid rgba(245, 158, 11, 0.45)'
                    : '1px solid rgba(56, 189, 248, 0.45)',
                  borderRadius: '8px',
                  padding: '0.28rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em'
                }}
              >
                {statusLabel}
              </span>

              {/* Due Date Badge */}
              {deadlineInfo && (
                <span
                  style={{
                    background: deadlineInfo.bg,
                    color: deadlineInfo.color,
                    border: `1px solid ${deadlineInfo.border}`,
                    borderRadius: '8px',
                    padding: '0.28rem 0.65rem',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Calendar size={13} />
                  {deadlineInfo.label}
                </span>
              )}
            </div>

            {/* Prominent Course Title */}
            <h1 className="course-overview-hero-title">
              {course.title}
            </h1>

            {/* Short Course Description */}
            {course.description && (
              <p className="course-overview-hero-desc">
                {course.description}
              </p>
            )}

            {/* Course Metadata Row (Course Code · Duration · Level · Published Date) */}
            <div className="course-overview-hero-meta">
              <span className="course-overview-meta-item">
                <strong style={{ color: '#E2E8F0' }}>Course Code:</strong>{' '}
                <span style={{ color: '#38BDF8', fontWeight: 700 }}>
                  {course.id || course.courseId}
                </span>
              </span>
              <span className="course-overview-meta-dot">•</span>
              <span className="course-overview-meta-item">
                <Clock size={14} style={{ color: '#38BDF8' }} />
                <span>{durationDisplay}</span>
              </span>
              {course.level && (
                <>
                  <span className="course-overview-meta-dot">•</span>
                  <span className="course-overview-meta-item">
                    <Award size={14} style={{ color: '#38BDF8' }} />
                    <span>{course.level}</span>
                  </span>
                </>
              )}
              {publishedDateStr && (
                <>
                  <span className="course-overview-meta-dot">•</span>
                  <span className="course-overview-meta-item">
                    <Calendar size={14} style={{ color: '#38BDF8' }} />
                    <span>Published {publishedDateStr}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Strip: Curriculum Progress and Action CTA */}
        <div className="course-overview-hero-bottom">
          <div className="course-overview-hero-progress-col">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#E2E8F0',
                marginBottom: '0.45rem'
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={15} style={{ color: isCompleted ? '#10B981' : '#38BDF8' }} />
                <span>Curriculum Progress</span>
              </span>
              <span style={{ color: isCompleted ? '#6EE7B7' : progressPercent > 0 ? '#38BDF8' : '#94A3B8' }}>
                {progressPercent}% Complete
              </span>
            </div>
            <div
              style={{
                height: '8px',
                background: 'rgba(255, 255, 255, 0.16)',
                borderRadius: '999px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: isCompleted
                    ? '#10B981'
                    : 'linear-gradient(90deg, #0F6CBD 0%, #38BDF8 100%)',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {isCompleted && !course.foundation && (
              <button
                type="button"
                className="course-overview-cert-btn"
                onClick={() => {
                  if (onViewCertificate) onViewCertificate(course);
                  else handleBackToDashboard();
                }}
                style={{
                  background: 'rgba(16, 185, 129, 0.95)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 1.15rem',
                  fontSize: '0.85rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Award size={17} />
                <span>View Certificate</span>
              </button>
            )}
            <button
              type="button"
              className="course-overview-hero-action-btn"
              onClick={() => onStartLearning(course)}
            >
              <PlayCircle size={18} />
              <span>{primaryActionLabel}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. DETAILS CONTENT (CURRICULUM, OUTCOMES, INSTRUCTOR) WITH STAGGERED ENTRANCE */}
      <div className="course-overview-content-stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* KEY COURSE INFORMATION STRIP (FACTS CARDS) */}
        <section className="course-overview-facts-grid">
        <div style={factCardStyle}>
          <div style={{ color: '#0F6CBD', marginBottom: '0.25rem' }}>
            <BookOpen size={18} />
          </div>
          <div style={factValStyle}>{totalModulesCount}</div>
          <div style={factLabelStyle}>Modules</div>
        </div>

        <div style={factCardStyle}>
          <div style={{ color: '#0F6CBD', marginBottom: '0.25rem' }}>
            <FileText size={18} />
          </div>
          <div style={factValStyle}>{totalLessons}</div>
          <div style={factLabelStyle}>Total Lessons</div>
        </div>

        <div style={factCardStyle}>
          <div style={{ color: '#8B5CF6', marginBottom: '0.25rem' }}>
            <Video size={18} />
          </div>
          <div style={factValStyle}>{videoLessonsCount}</div>
          <div style={factLabelStyle}>Video Lessons</div>
        </div>

        <div style={factCardStyle}>
          <div style={{ color: '#F59E0B', marginBottom: '0.25rem' }}>
            <HelpCircle size={18} />
          </div>
          <div style={factValStyle}>{moduleQuizzesCount + (hasFinalAssessment ? 1 : 0)}</div>
          <div style={factLabelStyle}>Assessments</div>
        </div>

        <div style={factCardStyle}>
          <div style={{ color: '#10B981', marginBottom: '0.25rem' }}>
            <Clock size={18} />
          </div>
          <div style={factValStyle}>{formatCourseDuration(course.duration, course.durationHours)}</div>
          <div style={factLabelStyle}>Estimated Time</div>
        </div>

        <div style={factCardStyle}>
          <div style={{ color: '#EC4899', marginBottom: '0.25rem' }}>
            <Award size={18} />
          </div>
          <div style={factValStyle}>{course.foundation ? 'Exempt' : (hasFinalAssessment ? 'Final Exam' : 'Lesson Quiz')}</div>
          <div style={factLabelStyle}>Evaluation</div>
        </div>
      </section>

      {/* 4. LEARNING OBJECTIVES / OUTCOMES */}
      {learningOutcomes.length > 0 && (
        <section
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: '18px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            padding: '1.4rem 1.6rem',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)'
          }}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            Learning Objectives & Outcomes
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
              gap: '0.75rem'
            }}
          >
            {learningOutcomes.map((outcome, idx) => (
              <div
                key={`outcome-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '0.75rem 0.9rem'
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#DCFCE7',
                    color: '#16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <Check size={12} />
                </div>
                <span style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                  {outcome}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. COURSE CONTENT PREVIEW & LEARNING PROGRESS BREAKDOWN */}
      <div className="course-overview-main-columns">
        {/* LEFT: MODULES ACCORDION PREVIEW */}
        <section
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: '18px',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            padding: '1.4rem 1.6rem',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.1rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: 0
                }}
              >
                Course Curriculum & Modules
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0' }}>
                Sequential training modules designed for mastery.
              </p>
            </div>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#64748B',
                background: '#F1F5F9',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px'
              }}
            >
              {totalModulesCount} {totalModulesCount === 1 ? 'Module' : 'Modules'} · {totalLessons} Lessons
            </span>
          </div>

          {modules.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#64748B',
                background: '#F8FAFC',
                borderRadius: '12px'
              }}
            >
              No modules published for this course yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {modules.map((mod, modIdx) => {
                const modId = mod.id ?? mod.dbId ?? modIdx;
                const isExpanded = Boolean(expandedModules[modId]);
                const modLessons = Array.isArray(mod.lessons) ? mod.lessons : [];
                const modCompletedCount = modLessons.filter((l) =>
                  Boolean(completedLessonsMap[l?.dbId ?? l?.id])
                ).length;
                const isModDone = modLessons.length > 0 && modCompletedCount >= modLessons.length;

                return (
                  <div
                    key={`mod-${modId}`}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: '#FFFFFF',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    {/* MODULE HEADER */}
                    <div
                      onClick={() => toggleModule(modId)}
                      style={{
                        padding: '0.9rem 1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        background: isExpanded ? '#F8FAFC' : '#FFFFFF',
                        borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: isModDone ? '#DCFCE7' : '#F1F5F9',
                            color: isModDone ? '#16A34A' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            flexShrink: 0
                          }}
                        >
                          {isModDone ? <Check size={14} /> : modIdx + 1}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <h3
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 750,
                              color: '#0F172A',
                              margin: 0
                            }}
                          >
                            {mod.title || `Module ${modIdx + 1}`}
                          </h3>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            {modLessons.length} {modLessons.length === 1 ? 'lesson' : 'lessons'}
                            {modCompletedCount > 0 && ` · ${modCompletedCount}/${modLessons.length} completed`}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        {isExpanded ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
                      </div>
                    </div>

                    {/* MODULE LESSONS ACCORDION BODY */}
                    {isExpanded && (
                      <div style={{ padding: '0.6rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {modLessons.length === 0 ? (
                          <div style={{ padding: '0.75rem', fontSize: '0.78rem', color: '#94A3B8' }}>
                            No lessons configured in this module.
                          </div>
                        ) : (
                          modLessons.map((lesson, lIdx) => {
                            const lessonDbId = lesson?.dbId ?? lesson?.id;
                            const isLessonDone = Boolean(completedLessonsMap[lessonDbId]);
                            const isVideo = String(lesson.type || lesson.lessonType || '').toUpperCase() === 'VIDEO';
                            const globalIdx = lessonGlobalIndexMap[lessonDbId] ?? lIdx;
                            const isUnlocked = isLessonDone || globalIdx === 0 || Boolean(course?.foundation) || Boolean(completedLessonsMap[allLessons[globalIdx - 1]?.dbId ?? allLessons[globalIdx - 1]?.id]);

                            return (
                              <div
                                key={`lesson-${lessonDbId || lIdx}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.75rem',
                                  padding: '0.55rem 0.75rem',
                                  borderRadius: '8px',
                                  background: isLessonDone ? '#F0FDF4' : !isUnlocked ? '#F8FAFC' : '#FFFFFF',
                                  border: isLessonDone ? '1px solid #DCFCE7' : '1px solid #F1F5F9'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                                  <div
                                    style={{
                                      color: isLessonDone ? '#16A34A' : !isUnlocked ? '#94A3B8' : isVideo ? '#8B5CF6' : '#0F6CBD',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                  >
                                    {isLessonDone ? (
                                      <CheckCircle2 size={16} />
                                    ) : !isUnlocked ? (
                                      <Lock size={15} />
                                    ) : isVideo ? (
                                      <Video size={16} />
                                    ) : (
                                      <FileText size={16} />
                                    )}
                                  </div>

                                  <span
                                    style={{
                                      fontSize: '0.82rem',
                                      fontWeight: isLessonDone ? 600 : !isUnlocked ? 500 : 700,
                                      color: isLessonDone ? '#166534' : !isUnlocked ? '#64748B' : '#1E293B',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {lesson.title || `Lesson ${lIdx + 1}`}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      color: isLessonDone ? '#16A34A' : !isUnlocked ? '#94A3B8' : isVideo ? '#7C3AED' : '#0284C7',
                                      background: isLessonDone ? '#DCFCE7' : !isUnlocked ? '#F1F5F9' : isVideo ? '#F3E8FF' : '#E0F2FE',
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '4px',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em'
                                    }}
                                  >
                                    {isLessonDone ? 'DONE' : !isUnlocked ? 'LOCKED' : isVideo ? 'VIDEO' : 'DOCUMENT'}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT: PROGRESS BREAKDOWN & COURSE BADGES */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <section
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
              borderRadius: '18px',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              padding: '1.35rem',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)'
            }}
          >
            <h3
              style={{
                fontSize: '0.98rem',
                fontWeight: 800,
                color: '#0F172A',
                margin: '0 0 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <ShieldCheck size={17} style={{ color: '#0F6CBD' }} />
              Learning Progress Status
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748B' }}>Completion State</span>
                <strong style={{ color: isCompleted ? '#16A34A' : isOngoing ? '#D97706' : '#64748B' }}>
                  {statusLabel}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748B' }}>Lessons Completed</span>
                <strong style={{ color: '#0F172A' }}>
                  {completedLessonsCount} / {totalLessons}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748B' }}>Remaining Lessons</span>
                <strong style={{ color: '#0F172A' }}>
                  {Math.max(0, totalLessons - completedLessonsCount)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748B' }}>Evaluation Assessment</span>
                <strong style={{ color: course.foundation ? '#64748B' : isCompleted ? '#16A34A' : hasFinalAssessment ? '#0F6CBD' : '#64748B' }}>
                  {course.foundation
                    ? 'Exempt (Foundation Track)'
                    : isCompleted
                      ? 'Final Quiz Passed ✓'
                      : hasFinalAssessment
                        ? 'Final Quiz Required'
                        : 'Module Quizzes'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <span style={{ color: '#64748B' }}>Passing Criteria</span>
                <strong style={{ color: '#0F172A' }}>
                  {course.foundation
                    ? 'Lesson Completion Only'
                    : course.passingScore
                      ? `≥ ${course.passingScore}%`
                      : '≥ 70%'}
                </strong>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.85rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {isCompleted && !course.foundation && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onViewCertificate) onViewCertificate(course);
                      else if (onBackToDashboard) onBackToDashboard();
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.68rem',
                      fontSize: '0.86rem',
                      fontWeight: 750,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Award size={17} />
                    <span>View Certificate</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onStartLearning(course)}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #0F6CBD 0%, #0B4F8A 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.72rem',
                    fontSize: '0.88rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 14px rgba(15, 108, 189, 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <PlayCircle size={17} />
                  {primaryActionLabel}
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>
      {/* End course-overview-content-stagger */}
      </div>
    </div>
  );
}

const factCardStyle = {
  background: '#FFFFFF',
  borderRadius: '12px',
  border: '1px solid #E2E8F0',
  padding: '0.85rem 1rem',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
};

const factValStyle = {
  fontSize: '1.15rem',
  fontWeight: 800,
  color: '#0F172A',
  lineHeight: 1.2
};

const factLabelStyle = {
  fontSize: '0.72rem',
  color: '#64748B',
  fontWeight: 600,
  marginTop: '0.2rem'
};
