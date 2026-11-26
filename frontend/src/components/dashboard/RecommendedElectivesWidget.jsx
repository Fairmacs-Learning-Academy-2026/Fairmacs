import React, { useMemo } from 'react';
import {
  Sparkles,
  Compass,
  Clock,
  BookOpen,
  ArrowRight,
  GraduationCap,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  getRecommendationReason,
  formatDuration,
  filterElectives
} from '../../utils/electives';

export { getRecommendationReason, formatDuration, filterElectives };

/**
 * Fallback gradient palettes for courses without a custom thumbnail
 */
const CATEGORY_GRADIENTS = {
  operations: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)',
  customs: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
  documentation: 'linear-gradient(135deg, #4338CA 0%, #6366F1 100%)',
  compliance: 'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)',
  sales: 'linear-gradient(135deg, #047857 0%, #10B981 100%)',
  technology: 'linear-gradient(135deg, #3730A3 0%, #818CF8 100%)',
  default: 'linear-gradient(135deg, #0F6CBD 0%, #0284C7 100%)'
};

function getThumbnailGradient(category = '') {
  const cat = String(category).toLowerCase();
  for (const [key, grad] of Object.entries(CATEGORY_GRADIENTS)) {
    if (cat.includes(key)) return grad;
  }
  return CATEGORY_GRADIENTS.default;
}

/**
 * RecommendedElectivesWidget Component
 * Balanced Apple Liquid Glass section displaying curated voluntary electives
 */
export default function RecommendedElectivesWidget({
  recommendedCourses = [],
  assignedCourses = [],
  completedCourseIds = [],
  onOpenCourse,
  onExploreCatalog,
  loading = false
}) {
  // Deduplicate and filter recommended courses
  const filteredElectives = useMemo(() => {
    return filterElectives(recommendedCourses, assignedCourses, completedCourseIds);
  }, [recommendedCourses, assignedCourses, completedCourseIds]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="phase7-electives-card skeleton-shimmer" style={{ minHeight: '260px' }}>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ height: '24px', width: '220px', background: '#E2E8F0', borderRadius: '6px', marginBottom: '1.25rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            <div style={{ height: '180px', background: '#F1F5F9', borderRadius: '16px' }} />
            <div style={{ height: '180px', background: '#F1F5F9', borderRadius: '16px' }} />
          </div>
        </div>
      </div>
    );
  }

  const hasElectives = filteredElectives.length > 0;

  return (
    <section className="phase7-widget-section phase7-electives-section" aria-label="Recommended Electives">
      <div className="phase7-electives-card">
        {/* Ambient Specular Highlight */}
        <div className="phase7-widget-ambient indigo" aria-hidden="true" />

        {/* Section Header */}
        <div className="phase7-widget-header">
          <div className="phase7-widget-title-stack">
            <div className="phase7-widget-title-row">
              <span className="phase7-icon-pill indigo">
                <Sparkles size={17} />
              </span>
              <h3 className="phase7-widget-title">Recommended Electives</h3>
              <span className="phase7-badge-pill indigo">
                {hasElectives ? `${filteredElectives.length} Available` : 'Explore Catalog'}
              </span>
            </div>
            <p className="phase7-widget-subtitle">
              Curated voluntary courses aligned with your role, department, and career growth
            </p>
          </div>

          {/* Catalog Link in Header */}
          <button
            type="button"
            className="phase7-header-action-btn"
            onClick={onExploreCatalog}
          >
            <span>Explore catalog</span>
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Electives Content */}
        {!hasElectives ? (
          /* Empty State: Apple-style explore catalog prompt */
          <div className="phase7-empty-state">
            <div className="phase7-empty-icon-wrapper indigo">
              <Compass size={28} className="phase7-empty-icon" />
            </div>
            <div className="phase7-empty-text-stack">
              <h4 className="phase7-empty-title">Explore Course Catalog</h4>
              <p className="phase7-empty-description">
                Broaden your professional skills with electives, skill tracks, and industry certifications across all Fairmacs divisions.
              </p>
              <button
                type="button"
                className="phase7-catalog-cta-btn"
                onClick={onExploreCatalog}
              >
                <BookOpen size={14} />
                <span>Open Course Catalog</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Grid of Elective Cards */
          <div className="phase7-electives-grid">
            {filteredElectives.map((course) => {
              const thumbnail = course.thumbnailUrl || course.thumbnail || course.banner;
              const bgGradient = getThumbnailGradient(course.category);

              return (
                <div
                  key={`elective-${course.idKey}`}
                  className="phase7-elective-item-card"
                  onClick={() => onOpenCourse && onOpenCourse(course)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onOpenCourse) onOpenCourse(course);
                    }
                  }}
                  aria-label={`${course.title} - ${course.recommendationReason}`}
                >
                  {/* Thumbnail / Header Banner */}
                  <div className="phase7-elective-banner-box">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={course.title ? `${course.title} course thumbnail` : 'Recommended course thumbnail'}
                        className="phase7-elective-banner-img"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextSibling) {
                            e.currentTarget.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}

                    {/* Gradient Fallback */}
                    <div
                      className="phase7-elective-banner-fallback"
                      style={{
                        background: bgGradient,
                        display: thumbnail ? 'none' : 'flex'
                      }}
                    >
                      <GraduationCap size={28} color="#FFFFFF" opacity={0.85} />
                    </div>

                    {/* Floating Reason Badge */}
                    <span className="phase7-elective-reason-badge">
                      <Sparkles size={11} style={{ marginRight: '3px' }} />
                      {course.recommendationReason}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="phase7-elective-body">
                    <div className="phase7-elective-meta-row">
                      {course.category && (
                        <span className="phase7-elective-category">
                          {course.category}
                        </span>
                      )}
                      {course.level && (
                        <span className="phase7-elective-level">
                          {course.level}
                        </span>
                      )}
                    </div>

                    <h4 className="phase7-elective-title" title={course.title}>
                      {course.title}
                    </h4>

                    {course.description && (
                      <p className="phase7-elective-description" title={course.description}>
                        {course.description}
                      </p>
                    )}

                    {/* Footer Row: Duration & Explore Action */}
                    <div className="phase7-elective-footer">
                      <div className="phase7-elective-duration">
                        {course.durationLabel ? (
                          <>
                            <Clock size={12} />
                            <span>{course.durationLabel}</span>
                          </>
                        ) : course.moduleCount ? (
                          <>
                            <Layers size={12} />
                            <span>{course.moduleCount} modules</span>
                          </>
                        ) : (
                          <span>Self-paced</span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="phase7-explore-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenCourse) onOpenCourse(course);
                        }}
                      >
                        <span>Explore</span>
                        <ArrowRight size={13} className="phase7-explore-arrow" />
                      </button>
                    </div>
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
