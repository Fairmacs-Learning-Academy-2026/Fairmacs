import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Calendar,
  Sparkles,
  BookOpen,
  Building2,
  Clock,
  ArrowRight,
  CheckCircle2
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
      bg: 'rgba(239, 68, 68, 0.95)',
      color: '#ffffff'
    };
  }
  if (diffDays === 0) {
    return {
      type: 'due_today',
      label: 'Due today',
      bg: 'rgba(245, 158, 11, 0.95)',
      color: '#ffffff'
    };
  }
  if (diffDays <= 5) {
    return {
      type: 'approaching',
      label: `Due in ${diffDays}d`,
      bg: 'rgba(245, 158, 11, 0.95)',
      color: '#ffffff'
    };
  }
  return {
    type: 'normal',
    label: `Due ${formatDueDate(dateVal)}`,
    bg: 'rgba(15, 23, 42, 0.78)',
    color: '#ffffff'
  };
}

export default function AssignedLearningCarousel({
  courses = [],
  onOpenCourse,
  initialCourseId,
  initialIndex
}) {
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialIndex != null && initialIndex >= 0 && initialIndex < courses.length) {
      return initialIndex;
    }
    if (initialCourseId && courses.length > 0) {
      const found = courses.findIndex(
        (c) => (c.id || c.courseId || c.dbId) === initialCourseId
      );
      if (found >= 0) return found;
    }
    return 0;
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [openingCourseId, setOpeningCourseId] = useState(null);

  // Touch gesture state
  const [touchStart, setTouchStart] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const containerRef = useRef(null);
  const interactionTimerRef = useRef(null);

  const totalCourses = courses.length;

  // Sync index if initialCourseId or initialIndex provided on return/navigation
  useEffect(() => {
    if (initialIndex != null && initialIndex >= 0 && initialIndex < courses.length) {
      setCurrentIndex(initialIndex);
    } else if (initialCourseId && courses.length > 0) {
      const found = courses.findIndex(
        (c) => (c.id || c.courseId || c.dbId) === initialCourseId
      );
      if (found >= 0) {
        setCurrentIndex(found);
      }
    }
  }, [initialCourseId, initialIndex, courses]);

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

  const handleOpenCourseAction = useCallback((course) => {
    if (!course) return;
    setOpeningCourseId(course.id || course.courseId || course.dbId);
    if (onOpenCourse) onOpenCourse(course);
  }, [onOpenCourse]);

  const handleInteractionStart = useCallback(() => {
    setIsInteracting(true);
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
  }, []);

  const handleInteractionEnd = useCallback(() => {
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 1200);
  }, []);

  // 5-second auto rotation with lifecycle pause & countdown restart
  useEffect(() => {
    if (totalCourses <= 1) return;
    if (prefersReducedMotion) return;
    if (isHovered || isFocused || isInteracting || !isTabVisible) return;

    const timer = setTimeout(() => {
      handleNext();
    }, 5000);

    return () => clearTimeout(timer);
  }, [
    currentIndex,
    totalCourses,
    prefersReducedMotion,
    isHovered,
    isFocused,
    isInteracting,
    isTabVisible,
    handleNext
  ]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // If an element inside has focus from a mouse click rather than keyboard navigation,
    // release focus on mouse leave so automatic rotation resumes smoothly
    if (containerRef.current && containerRef.current.contains(document.activeElement)) {
      const activeEl = document.activeElement;
      if (activeEl && !activeEl.matches(':focus-visible')) {
        activeEl.blur();
        setIsFocused(false);
      }
    }
  };

  const handleFocusCapture = () => {
    setIsFocused(true);
  };

  const handleBlurCapture = (e) => {
    const nextFocused = e.relatedTarget;
    if (!containerRef.current || !containerRef.current.contains(nextFocused)) {
      setIsFocused(false);
    }
  };

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

  // Compute upcoming preview cards (up to 2 vertically oriented cards on right)
  const previewCards = useMemo(() => {
    if (totalCourses <= 1) return [];
    if (totalCourses === 2) {
      const nextIdx = (currentIndex + 1) % totalCourses;
      return [{ course: courses[nextIdx], index: nextIdx, isFront: true }];
    }
    const idx1 = (currentIndex + 1) % totalCourses;
    const idx2 = (currentIndex + 2) % totalCourses;
    return [
      { course: courses[idx1], index: idx1, isFront: true },
      { course: courses[idx2], index: idx2, isFront: false }
    ];
  }, [courses, currentIndex, totalCourses]);

  if (!totalCourses) return null;

  return (
    <section
      ref={containerRef}
      className={`assigned-learning-section cinematic-carousel-shell ${totalCourses <= 1 ? 'single-course-shell' : ''} animate-fade-in`}
      data-autoplay-state={JSON.stringify({ isHovered, isFocused, isInteracting, isTabVisible, prefersReducedMotion, currentIndex })}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label="Your Assigned Learning Carousel"
    >
      {/* CAROUSEL TRACK VIEWPORT */}
      <div
        className="carousel-track-viewport cinematic-track-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* SLIDING FLEX TRACK */}
        <div
          className="carousel-slides-track cinematic-slides-track"
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            transform: `translateX(-${currentIndex * 100}%)`,
            transition: prefersReducedMotion
              ? 'none'
              : 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          {courses.map((course, idx) => {
            const isActiveSlide = idx === currentIndex;
            const isMandatory =
              String(course.assignmentType || '').toUpperCase() === 'MANDATORY' ||
              String(course.enrollmentType || '').toUpperCase() === 'MANDATORY' ||
              Boolean(course.foundation);

            const isCompleted =
              course.enrollmentStatus === 'COMPLETED' ||
              course.status === 'COMPLETED';

            const progress = Math.max(0, Math.min(100, Number(course.progressPercent || 0)));
            const isOngoing = !isCompleted && (progress > 0 || course.enrollmentStatus === 'IN_PROGRESS' || course.status === 'IN_PROGRESS');
            const statusLabel = isCompleted ? 'COMPLETED' : isOngoing ? 'IN PROGRESS' : 'NEWLY ASSIGNED';

            let actionLabel = 'Start Learning';
            if (isCompleted) {
              actionLabel = 'Review Course';
            } else if (isOngoing) {
              actionLabel = 'Continue Learning';
            }

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
                className={`cinematic-slide-wrapper ${isActiveSlide ? 'slide-active' : 'slide-inactive'}`}
                style={{
                  minWidth: '100%',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  height: '100%',
                  position: 'relative'
                }}
                aria-hidden={!isActiveSlide}
              >
                {/* Full-card semantic article container */}
                <article
                  className={`assigned-course-hero-card cinematic-hero-card ${
                    openingCourseId === (course.id || course.courseId || course.dbId)
                      ? 'carousel-card-opening'
                      : ''
                  } ${
                    initialCourseId === (course.id || course.courseId || course.dbId) && isActiveSlide
                      ? 'carousel-return-settle'
                      : ''
                  }`}
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
                  {/* FULL-BLEED ACTIVE COURSE BACKGROUND */}
                  <div className="cinematic-hero-bg-layer" aria-hidden="true">
                    <CourseThumbnailImage
                      course={course}
                      alt=""
                      className="cinematic-hero-bg-img"
                    />
                    {/* Controlled Light Liquid Glass Overlay for Legibility */}
                    <div className="cinematic-hero-scrim-gradient" />
                  </div>

                  {/* CONTENT LAYOUT SPLIT */}
                  <div className="carousel-card-split cinematic-card-split">
                    {/* Left Column: Editorial Active Course Information */}
                    <div className="carousel-card-info cinematic-info-col">
                      {/* Top Badges Row */}
                      <div className="carousel-card-top-badges">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
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
                              background: isCompleted ? 'rgba(16, 185, 129, 0.16)' : isOngoing ? 'rgba(245, 158, 11, 0.18)' : 'rgba(56, 189, 248, 0.18)',
                              color: isCompleted ? '#059669' : isOngoing ? '#B45309' : '#0284C7',
                              border: isCompleted ? '1px solid rgba(16, 185, 129, 0.35)' : isOngoing ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)'
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
                      <div className="carousel-card-content cinematic-content-box">
                        <h3 className="carousel-card-title cinematic-hero-title" title={course.title}>
                          {course.title}
                        </h3>

                        {course.description && (
                          <p className="carousel-card-desc cinematic-hero-desc">
                            {course.description}
                          </p>
                        )}
                      </div>

                      {/* Course Supporting Details: Code · Modules/Lessons · Duration */}
                      <div className="carousel-card-details cinematic-hero-meta">
                        <span className="carousel-card-code">
                          {course.id || course.courseId || 'COURSE'}
                        </span>
                        <span className="carousel-card-meta-dot">•</span>
                        <span className="carousel-card-meta-item">
                          <BookOpen size={13} style={{ color: '#2563EB' }} />
                          <span>{moduleCount} {moduleCount === 1 ? 'Module' : 'Modules'}</span>
                          <span> · {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}</span>
                        </span>
                        <span className="carousel-card-meta-dot">•</span>
                        <span className="carousel-card-meta-item">
                          <Clock size={13} style={{ color: '#2563EB' }} />
                          <span>{displayDuration}</span>
                        </span>
                      </div>

                      {/* Progress Bar & Open Course Action Button */}
                      <div className="carousel-card-bottom cinematic-hero-bottom">
                        <div className="carousel-card-progress">
                          <div className="carousel-progress-header">
                            <span>Learning Progress</span>
                            <span style={{ color: progress > 0 ? '#2563EB' : '#64748B', fontWeight: 800 }}>
                              {progress}% Complete
                            </span>
                          </div>
                          <div
                            className="progress-bar-bg"
                            style={{
                              height: '7px',
                              background: 'rgba(226, 232, 240, 0.85)',
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
                                  : 'linear-gradient(90deg, #2563EB 0%, #38BDF8 100%)',
                                borderRadius: '999px',
                                transition: 'width 0.4s ease'
                              }}
                            />
                          </div>
                        </div>

                        {/* Primary Action Button */}
                        <button
                          type="button"
                          className="carousel-card-action-btn cinematic-action-btn"
                          tabIndex={isActiveSlide ? 0 : -1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCourseAction(course);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                            }
                          }}
                          aria-label={`Open course ${course.title || course.id}`}
                        >
                          <PlayCircle size={16} />
                          <span>{actionLabel}</span>
                          <ArrowRight size={14} style={{ opacity: 0.9 }} />
                        </button>
                      </div>
                    </div>

                    {/* Hidden thumbnail anchor preserving compatibility */}
                    <div className="carousel-card-thumb-area" style={{ display: 'none' }} aria-hidden="true">
                      <CourseThumbnailImage course={course} alt="" className="carousel-card-thumb-img" />
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT-SIDE OVERLAPPING PREVIEW CARDS (RECREATING REFERENCE COMPOSITION - OUTSIDE CLIPPED VIEWPORT) */}
      {previewCards.length > 0 && (
        <aside className="cinematic-previews-container" aria-label="Upcoming courses in queue">
          {previewCards.map((pItem) => {
            const pCourse = pItem.course;
            const isFront = pItem.isFront;
            const pDept =
              pCourse.owningDepartmentName ||
              pCourse.department ||
              (Array.isArray(pCourse.departments) && pCourse.departments[0]) ||
              'Fairmacs';

            const pProgress = Math.max(0, Math.min(100, Number(pCourse.progressPercent || 0)));

            return (
              <button
                key={`preview-card-${isFront ? 'front' : 'back'}-${pCourse.id || pCourse.courseId || pCourse.dbId || pItem.index}`}
                type="button"
                className={`cinematic-preview-card ${isFront ? 'preview-card-front' : 'preview-card-back'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInteractionStart();
                    setCurrentIndex(pItem.index);
                    handleInteractionEnd();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      handleInteractionStart();
                      setCurrentIndex(pItem.index);
                      handleInteractionEnd();
                    }
                  }}
                  aria-label={`Select course: ${pCourse.title || pCourse.id}`}
                  title={`View next: ${pCourse.title}`}
                  tabIndex={0}
                >
                  {/* Card Background Image */}
                  <div className="cinematic-preview-media">
                    <CourseThumbnailImage
                      course={pCourse}
                      alt=""
                      className="cinematic-preview-img"
                    />
                    <div className="cinematic-preview-gradient" />
                  </div>

                  {/* Bottom Preview Metadata */}
                  <div className="cinematic-preview-info">
                    <span className="cinematic-preview-dept-text">{pDept}</span>
                    <h4 className="cinematic-preview-title-text" title={pCourse.title}>
                      {pCourse.title}
                    </h4>
                    <div className="cinematic-preview-meta-row">
                      <span className="cinematic-preview-code-tag">{pCourse.id || pCourse.courseId || 'CRS'}</span>
                      {pProgress > 0 && (
                        <span className="cinematic-preview-progress-pill">{pProgress}%</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>
        )}

        {/* BOTTOM MINIMAL GLASS CONTROLS CLUSTER */}
        {totalCourses > 1 && (
          <nav className="cinematic-controls-cluster" aria-label="Carousel slide controls">
            {/* Prev Button */}
            <button
              type="button"
              className="carousel-nav-btn carousel-nav-prev cinematic-nav-btn"
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
              <ChevronLeft size={18} />
            </button>

            {/* Slide Index Dots */}
            <div className="carousel-pagination-row cinematic-pagination-dots">
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
                    className={`carousel-pagination-dot cinematic-dot ${isActive ? 'active' : ''}`}
                  />
                );
              })}
            </div>

            {/* Next Button */}
            <button
              type="button"
              className="carousel-nav-btn carousel-nav-next cinematic-nav-btn"
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
              <ChevronRight size={18} />
            </button>
          </nav>
        )}
    </section>
  );
}
