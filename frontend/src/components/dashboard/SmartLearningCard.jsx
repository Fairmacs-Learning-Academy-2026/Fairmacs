import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  Play,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Compass,
  Calendar,
  BookOpen
} from 'lucide-react';

/**
 * Derives current date string in IST ("YYYY-MM-DD")
 */
function getTodayIstString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

/**
 * Formats date string to friendly format e.g. "20 Nov 2026"
 */
function formatFriendlyDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * SmartLearningCard Component
 * Dynamically selects and renders the highest priority context-aware learning card:
 * Priority 1: Overdue Course
 * Priority 2: Approaching Deadline (<= 5 days)
 * Priority 3: Continue Learning (In-Progress) / Start Learning (Assigned)
 * Priority 4: Recommended Learning (from real API recommendations)
 * Priority 5: Encouragement / Completion State (All Caught Up)
 */
export default function SmartLearningCard({
  assignedCourses = [],
  recommendedCourses = [],
  completedCoursesCount = 0,
  onOpenCourse,
  onExploreCatalog,
  loading = false
}) {
  const todayStr = useMemo(() => getTodayIstString(), []);

  // Compute the smart card state based on strict priority rules
  const cardState = useMemo(() => {
    // -------------------------------------------------------------
    // PRIORITY 1: OVERDUE COURSE
    // Incomplete assigned course where dueDate < today
    // -------------------------------------------------------------
    const overdueCourses = assignedCourses
      .filter((c) => {
        if (!c.dueDate) return false;
        // Strictly require backend authoritative completion status; progress alone does not complete a course
        const isCompleted = c.enrollmentStatus === 'COMPLETED' || c.status === 'COMPLETED';
        return !isCompleted && c.dueDate < todayStr;
      })
      .sort((a, b) => {
        // Urgency tie-breaker 1: Earliest due date (most overdue)
        if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
        // Urgency tie-breaker 2: Highest progress percentage (closest to resolution)
        const progDiff = Number(b.progress || 0) - Number(a.progress || 0);
        if (progDiff !== 0) return progDiff;
        // Deterministic tie-breaker 3: Alphabetical title
        return String(a.title || '').localeCompare(String(b.title || ''));
      });

    if (overdueCourses.length > 0) {
      const course = overdueCourses[0];
      const todayDate = new Date(todayStr + 'T00:00:00');
      const dueDate = new Date(course.dueDate + 'T00:00:00');
      const diffMs = todayDate.getTime() - dueDate.getTime();
      const overdueDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

      return {
        priority: 1,
        type: 'OVERDUE',
        badge: 'ACTION REQUIRED • OVERDUE',
        badgeStyle: {
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#DC2626',
          border: '1px solid rgba(239, 68, 68, 0.25)'
        },
        iconBg: '#FEE2E2',
        iconColor: '#DC2626',
        icon: AlertTriangle,
        course,
        title: course.title,
        category: course.category || course.department || 'Required Compliance',
        highlightMetric: `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`,
        subMetric: `Target due date was ${formatFriendlyDate(course.dueDate)}`,
        progress: Math.min(100, Math.max(0, Number(course.progress || 0))),
        actionLabel: 'Continue Learning',
        actionIcon: ArrowRight,
        actionType: 'course',
        message: 'This assigned curriculum has passed its completion deadline. Immediate progress is advised to restore compliance.'
      };
    }

    // -------------------------------------------------------------
    // PRIORITY 2: APPROACHING DEADLINE
    // Incomplete assigned course with deadline within next 5 days (0 <= diffDays <= 5)
    // -------------------------------------------------------------
    const deadlineCourses = assignedCourses
      .filter((c) => {
        if (!c.dueDate) return false;
        const isCompleted = c.enrollmentStatus === 'COMPLETED' || c.status === 'COMPLETED';
        if (isCompleted || c.dueDate < todayStr) return false;

        const todayDate = new Date(todayStr + 'T00:00:00');
        const dueDate = new Date(c.dueDate + 'T00:00:00');
        const diffMs = dueDate.getTime() - todayDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 5;
      })
      .sort((a, b) => {
        // Urgency tie-breaker 1: Closest deadline first
        const d1 = new Date(a.dueDate + 'T00:00:00').getTime();
        const d2 = new Date(b.dueDate + 'T00:00:00').getTime();
        if (d1 !== d2) return d1 - d2;
        // Urgency tie-breaker 2: Highest progress percentage (closest to completing)
        const progDiff = Number(b.progress || 0) - Number(a.progress || 0);
        if (progDiff !== 0) return progDiff;
        // Deterministic tie-breaker 3: Alphabetical title
        return String(a.title || '').localeCompare(String(b.title || ''));
      });

    if (deadlineCourses.length > 0) {
      const course = deadlineCourses[0];
      const todayDate = new Date(todayStr + 'T00:00:00');
      const dueDate = new Date(course.dueDate + 'T00:00:00');
      const diffDays = Math.round((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      const dueLabel = diffDays === 0 ? 'Due today' : diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays} days`;

      return {
        priority: 2,
        type: 'APPROACHING_DEADLINE',
        badge: `APPROACHING DEADLINE • ${dueLabel.toUpperCase()}`,
        badgeStyle: {
          background: 'rgba(245, 158, 11, 0.12)',
          color: '#D97706',
          border: '1px solid rgba(245, 158, 11, 0.28)'
        },
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
        icon: Clock,
        course,
        title: course.title,
        category: course.category || course.department || 'Assigned Curriculum',
        highlightMetric: `${dueLabel} (${formatFriendlyDate(course.dueDate)})`,
        subMetric: `${course.completedLessonsCount || 0} of ${course.totalLessonsCount || course.lessonCount || '?'} lessons finished`,
        progress: Math.min(100, Math.max(0, Number(course.progress || 0))),
        actionLabel: 'Continue Learning',
        actionIcon: ArrowRight,
        actionType: 'course',
        message: 'Upcoming completion deadline approaching within the next 5 days. Complete remaining lessons to stay on track.'
      };
    }

    // -------------------------------------------------------------
    // PRIORITY 3: CONTINUE LEARNING
    // In-progress assigned course (or newly assigned course to start)
    // -------------------------------------------------------------
    const inProgressCourses = assignedCourses.filter((c) => {
      const isCompleted = c.enrollmentStatus === 'COMPLETED' || c.status === 'COMPLETED';
      return !isCompleted && (Number(c.progress || 0) > 0 || c.enrollmentStatus === 'IN_PROGRESS' || c.status === 'IN_PROGRESS');
    }).sort((a, b) => {
      // Urgency tie-breaker 1: Highest progress percentage (closest to completing)
      const progDiff = Number(b.progress || 0) - Number(a.progress || 0);
      if (progDiff !== 0) return progDiff;
      // Urgency tie-breaker 2: Has earlier due date if present
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
        return a.dueDate < b.dueDate ? -1 : 1;
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      // Deterministic tie-breaker 3: Alphabetical title
      return String(a.title || '').localeCompare(String(b.title || ''));
    });

    if (inProgressCourses.length > 0) {
      const course = inProgressCourses[0];
      const prog = Math.min(100, Math.max(0, Number(course.progress || 0)));

      return {
        priority: 3,
        type: 'CONTINUE_LEARNING',
        badge: 'ACTIVE CURRICULUM • IN PROGRESS',
        badgeStyle: {
          background: 'rgba(52, 120, 229, 0.10)',
          color: '#2563EB',
          border: '1px solid rgba(52, 120, 229, 0.24)'
        },
        iconBg: '#EFF6FF',
        iconColor: '#2563EB',
        icon: Play,
        course,
        title: course.title,
        category: course.category || course.department || 'Enrolled Training',
        highlightMetric: `${prog}% Complete`,
        subMetric: course.dueDate ? `Target deadline: ${formatFriendlyDate(course.dueDate)}` : (course.duration ? `Estimated duration: ${course.duration}` : 'Self-paced learning'),
        progress: prog,
        actionLabel: 'Continue Learning',
        actionIcon: ArrowRight,
        actionType: 'course',
        message: 'Resume your active learning journey where you left off. Every completed lesson advances your consistency streak.'
      };
    }

    // If assigned courses exist but none have started yet (0% progress)
    const notStartedCourses = assignedCourses.filter((c) => {
      const isCompleted = c.enrollmentStatus === 'COMPLETED' || c.status === 'COMPLETED';
      return !isCompleted;
    }).sort((a, b) => {
      // Urgency tie-breaker 1: Has earlier due date if present
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
        return a.dueDate < b.dueDate ? -1 : 1;
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      // Deterministic tie-breaker 2: Alphabetical title
      return String(a.title || '').localeCompare(String(b.title || ''));
    });

    if (notStartedCourses.length > 0) {
      const course = notStartedCourses[0];
      return {
        priority: 3,
        type: 'START_LEARNING',
        badge: 'NEWLY ASSIGNED • READY TO START',
        badgeStyle: {
          background: 'rgba(2, 132, 199, 0.10)',
          color: '#0284C7',
          border: '1px solid rgba(2, 132, 199, 0.24)'
        },
        iconBg: '#E0F2FE',
        iconColor: '#0284C7',
        icon: BookOpen,
        course,
        title: course.title,
        category: course.category || course.department || 'Assigned Training',
        highlightMetric: 'Ready to begin',
        subMetric: course.duration ? `Duration: ${course.duration}` : 'Start Module 1 today',
        progress: 0,
        actionLabel: 'Start Learning',
        actionIcon: ArrowRight,
        actionType: 'course',
        message: 'You have a newly assigned curriculum ready for inception. Start learning today to build your weekly streak.'
      };
    }

    // -------------------------------------------------------------
    // PRIORITY 4: RECOMMENDED LEARNING
    // When no assigned courses remain incomplete, and valid API recommendation exists
    // -------------------------------------------------------------
    if (recommendedCourses.length > 0) {
      const course = recommendedCourses[0];
      return {
        priority: 4,
        type: 'RECOMMENDED',
        badge: 'RECOMMENDED FOR YOU',
        badgeStyle: {
          background: 'rgba(124, 58, 237, 0.10)',
          color: '#7C3AED',
          border: '1px solid rgba(124, 58, 237, 0.24)'
        },
        iconBg: '#F5F3FF',
        iconColor: '#7C3AED',
        icon: Sparkles,
        course,
        title: course.title,
        category: course.category || course.department || 'Professional Development',
        highlightMetric: 'Curated for your profile',
        subMetric: course.duration ? `Estimated duration: ${course.duration}` : 'Self-paced catalog elective',
        progress: null, // no progress bar for un-enrolled recommendation
        actionLabel: 'View Course',
        actionIcon: ArrowRight,
        actionType: 'course',
        message: 'Tailored to your organizational department and role. Broaden your skills with this recommended curriculum.'
      };
    }

    // -------------------------------------------------------------
    // PRIORITY 5: ENCOURAGEMENT / COMPLETION STATE
    // No active assigned courses or recommendations; employee is all caught up
    // -------------------------------------------------------------
    return {
      priority: 5,
      type: 'COMPLETION_STATE',
      badge: 'ALL CAUGHT UP • EXCELLENT WORK',
      badgeStyle: {
        background: 'rgba(16, 185, 129, 0.12)',
        color: '#059669',
        border: '1px solid rgba(16, 185, 129, 0.25)'
      },
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      icon: CheckCircle2,
      course: null,
      title: "You're all caught up!",
      category: 'Curriculum Status',
      highlightMetric: completedCoursesCount > 0 ? `${completedCoursesCount} Curricula Completed` : 'All Assignments Satisfied',
      subMetric: 'Zero pending or overdue requirements',
      progress: null,
      actionLabel: 'Explore Course Catalog',
      actionIcon: Compass,
      actionType: 'catalog',
      message: 'Great work! You have satisfied all your current curriculum assignments. Keep your learning momentum going by browsing available electives.'
    };
  }, [assignedCourses, recommendedCourses, completedCoursesCount, todayStr]);

  const handleAction = () => {
    if (cardState.actionType === 'course' && cardState.course) {
      if (onOpenCourse) onOpenCourse(cardState.course);
    } else if (cardState.actionType === 'catalog') {
      if (onExploreCatalog) onExploreCatalog();
    }
  };

  // Loading skeleton state
  if (loading) {
    return (
      <section
        className="smart-learning-card smart-card-skeleton animate-fade-in"
        aria-label="Loading Smart Learning Card"
      >
        <div className="smart-card-ambient" aria-hidden="true" />
        <div className="smart-card-body">
          <div className="skeleton-shimmer" style={{ width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton-shimmer" style={{ width: '160px', height: '18px', borderRadius: '999px' }} />
            <div className="skeleton-shimmer" style={{ width: 'min(280px, 100%)', height: '22px', borderRadius: '6px' }} />
            <div className="skeleton-shimmer" style={{ width: '220px', height: '14px', borderRadius: '6px' }} />
          </div>
          <div className="skeleton-shimmer" style={{ width: '150px', height: '40px', borderRadius: '12px', flexShrink: 0 }} />
        </div>
      </section>
    );
  }

  const IconComponent = cardState.icon;

  return (
    <section
      className={`smart-learning-card smart-card-priority-${cardState.priority} animate-fade-in`}
      aria-label={`Smart Learning Card: ${cardState.badge}`}
    >
      {/* Specular Ambient Glow */}
      <div className="smart-card-ambient" aria-hidden="true" />

      <div className="smart-card-body">
        {/* Left Column: Context Icon */}
        <div
          className="smart-card-icon-wrap"
          style={{
            background: cardState.iconBg,
            color: cardState.iconColor,
            border: `1px solid ${cardState.iconColor}22`
          }}
          aria-hidden="true"
        >
          <IconComponent size={24} strokeWidth={2.2} />
        </div>

        {/* Middle Column: Context Content */}
        <div className="smart-card-content">
          {/* Badge & Category Row */}
          <div className="smart-card-meta-row">
            <span
              className="smart-card-badge"
              style={cardState.badgeStyle}
            >
              {cardState.badge}
            </span>
            <span className="smart-card-category">
              {cardState.category}
            </span>
          </div>

          {/* Title */}
          <h3 className="smart-card-title" title={cardState.title}>
            {cardState.title}
          </h3>

          {/* Contextual Metric Row */}
          <div className="smart-card-detail-row">
            <span className="smart-card-highlight-metric">
              {cardState.highlightMetric}
            </span>
            <span className="smart-card-metric-dot" aria-hidden="true">•</span>
            <span className="smart-card-sub-metric">
              {cardState.subMetric}
            </span>
          </div>

          {/* Optional Progress Bar (for P1, P2, P3 active courses) */}
          {cardState.progress !== null && (
            <div className="smart-card-progress-wrap">
              <div
                className="smart-card-progress-bar-bg"
                role="progressbar"
                aria-valuenow={cardState.progress}
                aria-valuemin="0"
                aria-valuemax="100"
                aria-label={`Course progress: ${cardState.progress}%`}
              >
                <div
                  className="smart-card-progress-bar-fill"
                  style={{
                    width: `${cardState.progress}%`,
                    background: cardState.priority === 1
                      ? 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)'
                      : cardState.priority === 2
                      ? 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)'
                      : 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)'
                  }}
                />
              </div>
              <span className="smart-card-progress-label">
                {cardState.progress}%
              </span>
            </div>
          )}

          {/* Context message */}
          <p className="smart-card-message">
            {cardState.message}
          </p>
        </div>

        {/* Right Column: Context Action CTA */}
        <div className="smart-card-action-wrap">
          <button
            type="button"
            className="smart-card-action-btn"
            onClick={handleAction}
            aria-label={`${cardState.actionLabel}: ${cardState.title}`}
          >
            <span>{cardState.actionLabel}</span>
            <cardState.actionIcon size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
