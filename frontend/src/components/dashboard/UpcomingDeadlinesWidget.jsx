import React, { useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Play,
  ArrowRight,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import {
  parseDateToIstMidnight,
  getTodayIstMidnight,
  formatIstDate,
  evaluateDeadlineUrgency
} from '../../utils/deadlines';

export { formatIstDate, evaluateDeadlineUrgency };

/**
 * UpcomingDeadlinesWidget Component
 * Balanced Apple Liquid Glass section displaying incomplete assigned courses with target deadlines
 */
export default function UpcomingDeadlinesWidget({
  assignedCourses = [],
  onOpenCourse,
  loading = false
}) {
  const todayMidnight = useMemo(() => getTodayIstMidnight(), []);

  // Filter and sort active incomplete courses with valid due dates
  const deadlines = useMemo(() => {
    if (!Array.isArray(assignedCourses)) return [];

    return assignedCourses
      .filter((c) => {
        if (!c.dueDate) return false;
        // Strictly exclude completed courses
        const isCompleted =
          c.enrollmentStatus === 'COMPLETED' ||
          c.status === 'COMPLETED';
        return !isCompleted;
      })
      .map((c) => {
        const urgency = evaluateDeadlineUrgency(c.dueDate, todayMidnight);
        const progress = Math.max(0, Math.min(100, Number(c.progress || c.progressPercent || 0)));
        const isMandatory =
          String(c.assignmentType || '').toUpperCase() === 'MANDATORY' ||
          String(c.enrollmentType || '').toUpperCase() === 'MANDATORY';

        const dueMs = parseDateToIstMidnight(c.dueDate)?.getTime() ?? 0;

        return {
          ...c,
          urgency,
          progress,
          isMandatory,
          dueMs,
          formattedDueDate: formatIstDate(c.dueDate)
        };
      })
      .filter((c) => Boolean(c.urgency))
      .sort((a, b) => {
        // 1. Urgency tier ascending (Overdue: 1 -> Due Today: 2 -> Due in 3d: 3 -> Due in 7d: 4 -> Later: 5)
        if (a.urgency.tier !== b.urgency.tier) {
          return a.urgency.tier - b.urgency.tier;
        }
        // 2. Earliest due date
        if (a.dueMs !== b.dueMs) {
          return a.dueMs - b.dueMs;
        }
        // 3. Highest progress percentage
        if (b.progress !== a.progress) {
          return b.progress - a.progress;
        }
        // 4. Alphabetical title
        return String(a.title || '').localeCompare(String(b.title || ''));
      });
  }, [assignedCourses, todayMidnight]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="phase7-deadlines-card skeleton-shimmer" style={{ minHeight: '220px' }}>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ height: '24px', width: '200px', background: '#E2E8F0', borderRadius: '6px', marginBottom: '1rem' }} />
          <div style={{ height: '70px', background: '#F1F5F9', borderRadius: '14px', marginBottom: '0.75rem' }} />
          <div style={{ height: '70px', background: '#F1F5F9', borderRadius: '14px' }} />
        </div>
      </div>
    );
  }

  const hasDeadlines = deadlines.length > 0;
  const overdueCount = deadlines.filter((d) => d.urgency.tier === 1).length;

  return (
    <section className="phase7-widget-section phase7-deadlines-section" aria-label="Upcoming Deadlines">
      <div className="phase7-deadlines-card">
        {/* Ambient Specular Highlight */}
        <div
          className={`phase7-widget-ambient ${overdueCount > 0 ? 'red' : hasDeadlines ? 'amber' : 'green'}`}
          aria-hidden="true"
        />

        {/* Section Header */}
        <div className="phase7-widget-header">
          <div className="phase7-widget-title-stack">
            <div className="phase7-widget-title-row">
              <span className={`phase7-icon-pill ${overdueCount > 0 ? 'red' : hasDeadlines ? 'amber' : 'green'}`}>
                {overdueCount > 0 ? (
                  <AlertTriangle size={17} />
                ) : hasDeadlines ? (
                  <Clock size={17} />
                ) : (
                  <CheckCircle2 size={17} />
                )}
              </span>
              <h3 className="phase7-widget-title">Upcoming Deadlines</h3>
              <span className={`phase7-badge-pill ${overdueCount > 0 ? 'red' : hasDeadlines ? 'amber' : 'green'}`}>
                {overdueCount > 0
                  ? `${overdueCount} Overdue`
                  : hasDeadlines
                  ? `${deadlines.length} Active`
                  : 'All Caught Up'}
              </span>
            </div>
            <p className="phase7-widget-subtitle">
              Active assigned courses prioritized by required completion schedule
            </p>
          </div>
        </div>

        {/* Deadlines Content */}
        {!hasDeadlines ? (
          /* Empty State: Apple-style all caught up */
          <div className="phase7-empty-state">
            <div className="phase7-empty-icon-wrapper green">
              <CheckCircle2 size={28} className="phase7-empty-icon" />
            </div>
            <div className="phase7-empty-text-stack">
              <h4 className="phase7-empty-title">No Upcoming Deadlines</h4>
              <p className="phase7-empty-description">
                You have no upcoming deadlines. You can continue accessing your active courses.
              </p>
            </div>
          </div>
        ) : (
          /* List of Deadlines */
          <div className="phase7-deadlines-list">
            {deadlines.map((item) => {
              const UrgencyIcon = item.urgency.tier === 1 ? AlertTriangle : item.urgency.tier <= 3 ? Clock : Calendar;
              const isOverdue = item.urgency.tier === 1;

              return (
                <div
                  key={`deadline-${item.dbId || item.id || item._key}`}
                  className={`phase7-deadline-row ${item.urgency.badgeClass}`}
                  onClick={() => onOpenCourse && onOpenCourse(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onOpenCourse) onOpenCourse(item);
                    }
                  }}
                  aria-label={`${item.title} - ${item.urgency.badgeText}`}
                >
                  {/* Left Column: Metadata & Course Info */}
                  <div className="phase7-deadline-main">
                    <div className="phase7-deadline-tags">
                      {/* Urgency Badge */}
                      <span className={`phase7-urgency-badge ${item.urgency.badgeClass}`}>
                        <UrgencyIcon size={12} style={{ marginRight: '4px' }} />
                        {item.urgency.badgeText}
                      </span>

                      {/* Mandatory / Recommended Status */}
                      <span className={`phase7-status-tag ${item.isMandatory ? 'mandatory' : 'recommended'}`}>
                        {item.isMandatory ? 'Mandatory' : 'Recommended'}
                      </span>

                      {/* Category */}
                      {item.category && (
                        <span className="phase7-category-tag">
                          {item.category}
                        </span>
                      )}

                      {/* Due Date in IST */}
                      <span className="phase7-due-date">
                        Due {item.formattedDueDate}
                      </span>
                    </div>

                    <h4 className="phase7-deadline-title" title={item.title}>
                      {item.title}
                    </h4>

                    {/* Progress Bar & Percentage */}
                    <div className="phase7-deadline-progress-row">
                      <div className="phase7-progress-track">
                        <div
                          className={`phase7-progress-bar ${isOverdue ? 'overdue' : 'normal'}`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="phase7-progress-text">
                        {item.progress}% completed
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Context Action Button */}
                  <div className="phase7-deadline-action-box">
                    <button
                      type="button"
                      className={`phase7-action-btn ${isOverdue ? 'overdue' : 'primary'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenCourse) onOpenCourse(item);
                      }}
                    >
                      {item.progress > 0 ? (
                        <>
                          <Play size={13} fill="currentColor" />
                          <span>Continue</span>
                        </>
                      ) : (
                        <>
                          <BookOpen size={13} />
                          <span>Start</span>
                        </>
                      )}
                      <ArrowRight size={13} className="phase7-btn-arrow" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
