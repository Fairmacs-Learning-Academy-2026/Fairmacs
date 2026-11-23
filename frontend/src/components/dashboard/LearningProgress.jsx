import React, { useMemo } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

/**
 * Normalizes a raw course object to ensure standard property access
 */
function normalizeCourseItem(c) {
  if (!c) return {};
  return {
    ...c,
    id: c.id || c.courseId || c._id || (c.course ? c.course.id : null),
    dbId: c.dbId || (c.course ? c.course.dbId : null),
    title: c.title || (c.course ? c.course.title : 'Course'),
    enrollmentStatus: String(c.enrollmentStatus || (c.enrollment ? c.enrollment.status : '') || c.status || '').toUpperCase(),
    progressPercent: Math.max(0, Math.min(100, Number(c.progressPercent != null ? c.progressPercent : (c.progress || 0))))
  };
}

/**
 * LearningProgress Component (Phase 4)
 * Provides comprehensive, authoritative visualization of the employee's course learning progress:
 * 1. Overall Completion Rate
 * 2. Segmented Progress Bar (Completed, In-Progress, Not-Started)
 * 3. 4 Liquid Glass Snapshot Cards
 */
export default function LearningProgress({
  dashboard = null,
  onNavigateProgressHub,
  loading = false
}) {
  // Deduplicate and categorize active assigned courses
  const progressMetrics = useMemo(() => {
    if (!dashboard) {
      return {
        totalAssigned: 0,
        completedCount: 0,
        inProgressCount: 0,
        notStartedCount: 0,
        completionPercent: 0,
        inProgressPercent: 0,
        notStartedPercent: 0,
        hasData: false
      };
    }

    const enrolledList = Array.isArray(dashboard.enrolled) ? dashboard.enrolled : [];
    const seen = new Set();
    const uniqueCourses = [];

    for (const raw of enrolledList) {
      const c = normalizeCourseItem(raw);
      const key = String(c.dbId || c.id);
      if (!key || seen.has(key)) continue;
      seen.add(key);

      // Exclude revoked, withdrawn, cancelled, or inactive assignments
      const isRevoked = ['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes(c.enrollmentStatus);
      if (isRevoked) continue;

      uniqueCourses.push(c);
    }

    let completedInEnrolled = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;

    for (const c of uniqueCourses) {
      // Authoritative backend completion status; progressPercent >= 100 cannot mark a course complete before final assessment is passed
      const isCompleted = c.enrollmentStatus === 'COMPLETED' || c.status === 'COMPLETED';
      if (isCompleted) {
        completedInEnrolled++;
      } else if (c.progressPercent > 0 || c.enrollmentStatus === 'IN_PROGRESS' || c.status === 'IN_PROGRESS') {
        inProgressCount++;
      } else {
        notStartedCount++;
      }
    }

    // Backend authoritative completed count (takes the max between explicitly counted and backend summary count)
    const backendCompleted = typeof dashboard.completedCourses === 'number' ? Math.max(0, dashboard.completedCourses) : 0;
    const completedCount = Math.max(completedInEnrolled, backendCompleted);

    // Total unique assigned courses
    const totalAssigned = completedCount + inProgressCount + notStartedCount;

    // Segmented percentages
    const completionPercent = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;
    const inProgressPercent = totalAssigned > 0 ? Math.round((inProgressCount / totalAssigned) * 100) : 0;
    const notStartedPercent = totalAssigned > 0 ? Math.max(0, 100 - completionPercent - inProgressPercent) : 0;

    return {
      totalAssigned,
      completedCount,
      inProgressCount,
      notStartedCount,
      completionPercent,
      inProgressPercent,
      notStartedPercent,
      hasData: totalAssigned > 0
    };
  }, [dashboard]);

  // Loading skeleton state
  if (loading) {
    return (
      <section
        className="learning-progress-widget skeleton-loading animate-fade-in"
        aria-label="Loading Learning Progress"
      >
        <div className="learning-progress-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div className="skeleton-shimmer" style={{ width: '240px', height: '22px', borderRadius: '6px' }} />
            <div className="skeleton-shimmer" style={{ width: '90px', height: '28px', borderRadius: '999px' }} />
          </div>
          <div className="skeleton-shimmer" style={{ width: '100%', height: '14px', borderRadius: '999px', marginBottom: '1.5rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`skel-lp-${i}`} className="skeleton-shimmer" style={{ height: '90px', borderRadius: '16px' }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="learning-progress-widget animate-fade-in"
      aria-label="Overall Learning Progress and Curriculum Snapshot"
    >
      <div className="learning-progress-card">
        {/* Specular Ambient Reflection */}
        <div className="learning-progress-ambient" aria-hidden="true" />

        {/* Header Row */}
        <div className="learning-progress-header">
          <div className="learning-progress-title-stack">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <span className="learning-progress-header-icon" aria-hidden="true">
                <TrendingUp size={18} />
              </span>
              <h3 className="learning-progress-title">
                Curriculum Progress & Learning Snapshot
              </h3>
            </div>
            <p className="learning-progress-subtitle">
              Authoritative course completion metrics across active and completed assignments
            </p>
          </div>

          <div className="learning-progress-header-actions">
            {/* Overall Rate Pill */}
            <div
              className="learning-progress-overall-pill"
              title="Overall course curriculum completion rate"
            >
              <span className="learning-progress-overall-value">
                {progressMetrics.completionPercent}%
              </span>
              <span className="learning-progress-overall-label">
                Completed
              </span>
            </div>

            {/* Optional Progress Hub Link */}
            {onNavigateProgressHub && (
              <button
                type="button"
                className="learning-progress-hub-btn"
                onClick={onNavigateProgressHub}
                aria-label="View comprehensive Progress Hub"
              >
                <span>Progress Hub</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Segmented Visualization Bar */}
        <div className="learning-progress-bar-section">
          <div
            className="learning-progress-segmented-bar"
            role="progressbar"
            aria-valuenow={progressMetrics.completionPercent}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Overall progress: ${progressMetrics.completionPercent}% completed, ${progressMetrics.inProgressPercent}% in progress, ${progressMetrics.notStartedPercent}% not started`}
          >
            {/* Completed Segment */}
            {progressMetrics.completionPercent > 0 && (
              <div
                className="progress-segment progress-segment-completed"
                style={{ width: `${progressMetrics.completionPercent}%` }}
                title={`Completed: ${progressMetrics.completedCount} (${progressMetrics.completionPercent}%)`}
              />
            )}
            {/* In Progress Segment */}
            {progressMetrics.inProgressPercent > 0 && (
              <div
                className="progress-segment progress-segment-inprogress"
                style={{ width: `${progressMetrics.inProgressPercent}%` }}
                title={`In Progress: ${progressMetrics.inProgressCount} (${progressMetrics.inProgressPercent}%)`}
              />
            )}
            {/* Not Started Segment */}
            {progressMetrics.notStartedPercent > 0 && (
              <div
                className="progress-segment progress-segment-notstarted"
                style={{ width: `${progressMetrics.notStartedPercent}%` }}
                title={`Not Started: ${progressMetrics.notStartedCount} (${progressMetrics.notStartedPercent}%)`}
              />
            )}
            {/* Zero State Segment */}
            {progressMetrics.totalAssigned === 0 && (
              <div
                className="progress-segment progress-segment-empty"
                style={{ width: '100%' }}
                title="No active curricula assigned"
              />
            )}
          </div>

          {/* Legend Row */}
          <div className="learning-progress-legend-row">
            <div className="legend-item">
              <span className="legend-dot legend-dot-completed" aria-hidden="true" />
              <span className="legend-label">Completed:</span>
              <strong className="legend-value">{progressMetrics.completedCount}</strong>
              <span className="legend-sub">({progressMetrics.completionPercent}%)</span>
            </div>

            <div className="legend-item">
              <span className="legend-dot legend-dot-inprogress" aria-hidden="true" />
              <span className="legend-label">In Progress:</span>
              <strong className="legend-value">{progressMetrics.inProgressCount}</strong>
              <span className="legend-sub">({progressMetrics.inProgressPercent}%)</span>
            </div>

            <div className="legend-item">
              <span className="legend-dot legend-dot-notstarted" aria-hidden="true" />
              <span className="legend-label">Not Started:</span>
              <strong className="legend-value">{progressMetrics.notStartedCount}</strong>
              <span className="legend-sub">({progressMetrics.notStartedPercent}%)</span>
            </div>
          </div>
        </div>

        {/* 4 Compact Liquid Glass Metric Cards (Learning Snapshot) */}
        <div className="learning-snapshot-cards-grid">
          {/* CARD 1: COMPLETED */}
          <div className="snapshot-card snapshot-card-completed">
            <div className="snapshot-card-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
              <CheckCircle2 size={20} strokeWidth={2.4} />
            </div>
            <div className="snapshot-card-details">
              <div className="snapshot-card-value">{progressMetrics.completedCount}</div>
              <div className="snapshot-card-title">Completed Courses</div>
              <div className="snapshot-card-desc">Satisfied curricula</div>
            </div>
          </div>

          {/* CARD 2: IN PROGRESS */}
          <div className="snapshot-card snapshot-card-inprogress">
            <div className="snapshot-card-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
              <BookOpen size={20} strokeWidth={2.4} />
            </div>
            <div className="snapshot-card-details">
              <div className="snapshot-card-value">{progressMetrics.inProgressCount}</div>
              <div className="snapshot-card-title">In Progress</div>
              <div className="snapshot-card-desc">Active learning</div>
            </div>
          </div>

          {/* CARD 3: NOT STARTED */}
          <div className="snapshot-card snapshot-card-notstarted">
            <div className="snapshot-card-icon" style={{ background: '#F1F5F9', color: '#64748B' }}>
              <Clock size={20} strokeWidth={2.4} />
            </div>
            <div className="snapshot-card-details">
              <div className="snapshot-card-value">{progressMetrics.notStartedCount}</div>
              <div className="snapshot-card-title">Not Started</div>
              <div className="snapshot-card-desc">Pending inception</div>
            </div>
          </div>

          {/* CARD 4: TOTAL ASSIGNED & COMPLETION RATE */}
          <div className="snapshot-card snapshot-card-total">
            <div className="snapshot-card-icon" style={{ background: '#F3E8FF', color: '#9333EA' }}>
              <GraduationCap size={20} strokeWidth={2.4} />
            </div>
            <div className="snapshot-card-details">
              <div className="snapshot-card-value">{progressMetrics.totalAssigned}</div>
              <div className="snapshot-card-title">Total Assigned</div>
              <div className="snapshot-card-desc">{progressMetrics.completionPercent}% Overall Completion</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
