import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Calendar,
  Sparkles,
  BookOpen,
  Building2,
  Clock,
  ArrowRight
} from 'lucide-react';
import CourseThumbnailImage from './CourseThumbnailImage';
import { formatCourseDuration } from '../utils/courseDuration';

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
      type: 'overdue',
      label: `Overdue by ${Math.abs(diffDays)}d`,
      bg: 'rgba(239, 68, 68, 0.92)',
      color: '#ffffff'
    };
  }
  if (diffDays === 0) {
    return {
      type: 'due_today',
      label: 'Due today',
      bg: 'rgba(245, 158, 11, 0.92)',
      color: '#ffffff'
    };
  }
  if (diffDays <= 5) {
    return {
      type: 'approaching',
      label: `Due in ${diffDays}d`,
      bg: 'rgba(245, 158, 11, 0.92)',
      color: '#ffffff'
    };
  }
  return {
    type: 'normal',
    label: `Due ${formatDueDate(dateVal)}`,
    bg: 'rgba(15, 23, 42, 0.75)',
    color: '#ffffff'
  };
}

export default function AssignedLearningCarousel({
  courses = [],
  onOpenCourse
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Touch gesture state
  const [touchStart, setTouchStart] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const containerRef = useRef(null);
  const interactionTimerRef = useRef(null);

  const totalCourses = courses.length;

  // Keep currentIndex bounded when courses change
  useEffect(() => {
    if (currentIndex >= totalCourses && totalCourses > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, totalCourses]);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Track document tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleNext = useCallback(() => {
    if (totalCourses <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalCourses);
  }, [totalCourses]);

  const handlePrev = useCallback(() => {
    if (totalCourses <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalCourses) % totalCourses);
  }, [totalCourses]);

  // 5-second auto rotation with lifecycle pause
  useEffect(() => {
    if (totalCourses <= 1) return;
    if (prefersReducedMotion) return;
    if (isHovered || isFocused || isInteracting || !isTabVisible) return;

    const interval = setInterval(() => {
      handleNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [
    totalCourses,
    prefersReducedMotion,
    isHovered,
    isFocused,
    isInteracting,
    isTabVisible,
    handleNext
  ]);

  const handleInteractionStart = useCallback(() => {
    setIsInteracting(true);
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 3000);
  }, []);

  // Touch gesture handlers for mobile & tablet swiping
  const handleTouchStart = (e) => {
    if (totalCourses <= 1) return;
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(false);
    handleInteractionStart();
  };

  const handleTouchMove = (e) => {
    if (touchStart === null || totalCourses <= 1) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = touchStart - currentX;
    if (Math.abs(diff) > 10) {
      setIsSwiping(true);
    }
  };

  const handleTouchEnd = (e) => {
    if (touchStart !== null && totalCourses > 1) {
      const currentX = e.changedTouches[0]?.clientX ?? touchStart;
      const diff = touchStart - currentX;
      if (diff > 45) {
        handleNext();
      } else if (diff < -45) {
        handlePrev();
      }
    }
    setTouchStart(null);
    handleInteractionEnd();
    setTimeout(() => {
      setIsSwiping(false);
    }, 150);
  };

  // Keyboard navigation support
  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleInteractionStart();
      handlePrev();
      handleInteractionEnd();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleInteractionStart();
      handleNext();
      handleInteractionEnd();
    }
  };

  if (!totalCourses) return null;

  return (
    <section
      ref={containerRef}
      className="assigned-learning-section animate-fade-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Your Assigned Learning Carousel"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(246, 250, 255, 0.95) 100%)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        borderRadius: '24px',
        border: '1px solid rgba(226, 235, 245, 0.95)',
        boxShadow: '0 12px 36px rgba(31, 70, 120, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        padding: 'clamp(1rem, 2vw, 1.4rem)',
        outline: 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* CAROUSEL TRACK VIEWPORT */}
      <div
        className="carousel-track-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '18px',
          width: '100%'
        }}
      >
        {/* MANUAL PREVIOUS AND NEXT NAVIGATION CONTROLS */}
        {totalCourses > 1 && (
          <>
            <button
              type="button"
              className="carousel-nav-btn carousel-nav-prev"
              onClick={(e) => {
                e.stopPropagation();
                handleInteractionStart();
                handlePrev();
                handleInteractionEnd();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                }
              }}
              aria-label="Previous course"
              title="Previous course"
              tabIndex={0}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="carousel-nav-btn carousel-nav-next"
              onClick={(e) => {
                e.stopPropagation();
                handleInteractionStart();
                handleNext();
                handleInteractionEnd();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                }
              }}
              aria-label="Next course"
              title="Next course"
              tabIndex={0}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* SLIDING FLEX TRACK */}
        <div
          className="carousel-slides-track"
          style={{
            display: 'flex',
            width: '100%',
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: prefersReducedMotion
              ? 'none'
              : 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          {courses.map((course, idx) => {
            const isActiveSlide = idx === currentIndex;
            const isMandatory =
              String(course.assignmentType || '').toUpperCase() === 'MANDATORY' ||
              String(course.enrollmentType || '').toUpperCase() === 'MANDATORY' ||
              Boolean(course.foundation);

            const progress = Math.max(0, Math.min(100, Number(course.progressPercent || 0)));
            const isOngoing = progress > 0 || course.enrollmentStatus === 'IN_PROGRESS';
            const statusLabel = isOngoing ? 'IN PROGRESS' : 'NEWLY ASSIGNED';

            const departmentName =
              course.owningDepartmentName ||
              course.department ||
              (Array.isArray(course.departments) && course.departments[0]) ||
              'Fairmacs Core';

            const deadlineInfo = getDeadlineUrgency(course.dueDate);

            const rawModuleCount = typeof course.moduleCount === 'number'
              ? course.moduleCount
              : (Array.isArray(course.modules)
                  ? course.modules.length
                  : (course.moduleCount != null ? Number(course.moduleCount) : 0));
            const moduleCount = Number.isFinite(rawModuleCount) && rawModuleCount >= 0 ? Math.floor(rawModuleCount) : 0;

            const rawLessonCount = typeof course.lessonCount === 'number'
              ? course.lessonCount
              : (Array.isArray(course.modules) && course.modules.length > 0
                  ? course.modules.reduce((acc, m) => acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0), 0)
                  : (course.lessonCount != null ? Number(course.lessonCount) : 0));
            const lessonCount = Number.isFinite(rawLessonCount) && rawLessonCount >= 0 ? Math.floor(rawLessonCount) : 0;

            const displayDuration = formatCourseDuration(course.duration, course.durationHours);

            return (
              <div
                key={course._key || course.dbId || course.id || idx}
                style={{
                  minWidth: '100%',
                  flexShrink: 0,
                  boxSizing: 'border-box'
                }}
                aria-hidden={!isActiveSlide}
              >
                {/* Semantic article without nested interactive role, preserving full-card clickability */}
                <article
                  className="assigned-course-hero-card"
                  aria-roledescription="slide"
                  aria-label={`Slide ${idx + 1} of ${totalCourses}: ${course.title || course.id}`}
                  onClick={(e) => {
                    if (isSwiping) {
                      e.preventDefault();
                      return;
                    }
                    const interactive = e.target.closest('button, a, input, select, textarea');
                    if (interactive && interactive !== e.currentTarget) {
                      return;
                    }
                    if (onOpenCourse) onOpenCourse(course);
                  }}
                >
                  <div className="carousel-card-split">
                    {/* Left Column: Dedicated Course Thumbnail Card (~34% width, consistent aspect-ratio, rounded corners, no blur) */}
                    <div className="carousel-card-thumb-area">
                      <CourseThumbnailImage
                        course={course}
                        alt={course.title}
                        className="carousel-card-thumb-img"
                      />
                    </div>

                    {/* Right Column: Hierarchical Course Information */}
                    <div className="carousel-card-info">
                      {/* Top Badges Row */}
                      <div className="carousel-card-top-badges">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {/* Department */}
                          <span className="carousel-badge-dept">
                            <Building2 size={12} />
                            {departmentName}
                          </span>

                          {/* Mandatory / Recommended */}
                          <span
                            className="carousel-badge-type"
                            style={{
                              background: isMandatory ? 'rgba(220, 38, 38, 0.95)' : 'rgba(16, 185, 129, 0.95)',
                              color: '#FFFFFF'
                            }}
                          >
                            {isMandatory ? 'Mandatory' : 'Recommended'}
                          </span>

                          {/* Status */}
                          <span
                            className="carousel-badge-status"
                            style={{
                              background: isOngoing ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                              color: isOngoing ? '#FDE68A' : '#7DD3FC',
                              border: isOngoing ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(56, 189, 248, 0.45)'
                            }}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        {/* Due Date */}
                        {deadlineInfo && (
                          <span
                            className="carousel-badge-deadline"
                            style={{
                              background: deadlineInfo.bg,
                              color: deadlineInfo.color
                            }}
                          >
                            <Calendar size={12} />
                            {deadlineInfo.label}
                          </span>
                        )}
                      </div>

                      {/* Course Title & Description */}
                      <div className="carousel-card-content">
                        <h3 className="carousel-card-title" title={course.title}>
                          {course.title}
                        </h3>

                        {course.description && (
                          <p className="carousel-card-desc">
                            {course.description}
                          </p>
                        )}
                      </div>

                      {/* Course Supporting Details: Code · Modules/Lessons · Duration */}
                      <div className="carousel-card-details">
                        <span className="carousel-card-code">
                          {course.id || course.courseId || 'COURSE'}
                        </span>
                        <span className="carousel-card-meta-dot">•</span>
                        <span className="carousel-card-meta-item">
                          <BookOpen size={13} style={{ color: '#38BDF8' }} />
                          <span>{moduleCount} {moduleCount === 1 ? 'Module' : 'Modules'}</span>
                          <span> · {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}</span>
                        </span>
                        <span className="carousel-card-meta-dot">•</span>
                        <span className="carousel-card-meta-item">
                          <Clock size={13} style={{ color: '#38BDF8' }} />
                          <span>{displayDuration}</span>
                        </span>
                      </div>

                      {/* Progress Bar & Open Course Action Button */}
                      <div className="carousel-card-bottom">
                        <div className="carousel-card-progress">
                          <div className="carousel-progress-header">
                            <span>Learning Progress</span>
                            <span style={{ color: progress > 0 ? '#38BDF8' : '#94A3B8' }}>
                              {progress}% Complete
                            </span>
                          </div>
                          <div
                            className="progress-bar-bg"
                            style={{
                              height: '7px',
                              background: 'rgba(255, 255, 255, 0.2)',
                              borderRadius: '999px',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              className="progress-bar-fill"
                              style={{
                                height: '100%',
                                width: `${progress}%`,
                                background: progress >= 100
                                  ? '#10B981'
                                  : 'linear-gradient(90deg, #0F6CBD 0%, #38BDF8 100%)',
                                borderRadius: '999px',
                                transition: 'width 0.4s ease'
                              }}
                            />
                          </div>
                        </div>

                        {/* Primary action CTA button: independently keyboard-accessible */}
                        <button
                          type="button"
                          className="carousel-card-action-btn"
                          tabIndex={isActiveSlide ? 0 : -1}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenCourse) onOpenCourse(course);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                            }
                          }}
                          aria-label={`Open course ${course.title || course.id}`}
                        >
                          <PlayCircle size={16} />
                          <span>Open Course</span>
                          <ArrowRight size={14} style={{ opacity: 0.85 }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      {/* PAGINATION DOT INDICATORS */}
      {totalCourses > 1 && (
        <div
          className="carousel-pagination-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            marginTop: '1rem'
          }}
        >
          {courses.map((c, dotIdx) => {
            const isActive = dotIdx === currentIndex;
            return (
              <button
                key={`dot-${c._key || c.id || dotIdx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInteractionStart();
                  setCurrentIndex(dotIdx);
                  handleInteractionEnd();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                  }
                }}
                aria-label={`Go to slide ${dotIdx + 1} of ${totalCourses}`}
                aria-current={isActive ? 'true' : 'false'}
                tabIndex={0}
                className={`carousel-pagination-dot ${isActive ? 'active' : ''}`}
                style={{
                  height: '7px',
                  width: isActive ? '24px' : '7px',
                  borderRadius: '999px',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  background: isActive ? '#0F6CBD' : 'rgba(148, 163, 184, 0.45)',
                  boxShadow: isActive ? '0 2px 8px rgba(15, 108, 189, 0.35)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
