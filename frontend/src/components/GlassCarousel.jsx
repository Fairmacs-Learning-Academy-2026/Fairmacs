import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  PlayCircle,
  Eye,
  BookOpen,
  Award,
  Sparkles,
  CheckCircle2,
  Layers,
  Pause,
  Play
} from 'lucide-react';
import CourseThumbnailImage from './CourseThumbnailImage';
import { getCourseBanner, handleBannerError, getFallbackSvg } from '../utils/courseBanner';
import { formatCourseDuration } from '../utils/courseDuration';

/**
 * Premium Glass Carousel Component
 *
 * Provides a responsive, accessible, animated frosted-glass carousel with:
 * - Rounded translucent cards with frosted-glass surfaces
 * - Subtle blue gradient lighting and fine glass borders
 * - Smooth horizontal slide transitions with active-card scaling
 * - Glassy circular prev/next buttons
 * - Animated glowing pagination dots
 * - Touch swiping support on mobile / tablet
 * - Keyboard navigation (ArrowLeft / ArrowRight)
 * - Restrained autoplay with hover/focus pause
 * - Reduced-motion accessibility support
 */
export default function GlassCarousel({
  items = [],
  renderItem,
  title,
  subtitle,
  badge,
  icon: HeaderIcon = Sparkles,
  actionButton,
  onSelectCourse,
  onOpenCourseDetails,
  autoPlay = false,
  autoPlayInterval = 6000,
  emptyState = null,
  className = ''
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [visibleCount, setVisibleCount] = useState(3);
  const [touchStart, setTouchStart] = useState(null);
  const [touchDelta, setTouchDelta] = useState(0);

  const containerRef = useRef(null);

  // Responsive items-per-view calculation
  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleCount(1);
      } else if (width < 1024) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };

    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  const totalItems = items.length;
  const maxIndex = Math.max(0, totalItems - visibleCount);

  // Ensure currentIndex stays within bounds when resizing
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  // Autoplay timer
  useEffect(() => {
    if (!isPlaying || isPaused || maxIndex === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isPlaying, isPaused, maxIndex, autoPlayInterval]);

  // Touch gesture handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchDelta(0);
  };

  const handleTouchMove = (e) => {
    if (touchStart === null) return;
    const currentX = e.targetTouches[0].clientX;
    setTouchDelta(touchStart - currentX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null) return;
    if (touchDelta > 50) {
      handleNext();
    } else if (touchDelta < -50) {
      handlePrev();
    }
    setTouchStart(null);
    setTouchDelta(0);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  if (!items || items.length === 0) {
    return emptyState || null;
  }

  // Calculate slide offset percentage
  const slidePercent = (currentIndex * 100) / visibleCount;

  return (
    <section
      className={`glass-carousel-container ${className}`}
      aria-roledescription="carousel"
      aria-label={title || 'Featured Courses Carousel'}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      ref={containerRef}
    >
      {/* Header bar with glassy controls */}
      {(title || subtitle || actionButton) && (
        <div className="glass-carousel-header">
          <div className="glass-carousel-title-group">
            {badge && (
              <span className="glass-badge-highlight">
                <HeaderIcon size={13} />
                {badge}
              </span>
            )}
            {title && <h2 className="glass-carousel-title">{title}</h2>}
            {subtitle && <p className="glass-carousel-subtitle">{subtitle}</p>}
          </div>

          <div className="glass-carousel-controls">
            {actionButton}

            {autoPlay && (
              <button
                type="button"
                className="glass-icon-button"
                onClick={() => setIsPlaying((p) => !p)}
                title={isPlaying ? 'Pause autoplay' : 'Start autoplay'}
                aria-label={isPlaying ? 'Pause autoplay' : 'Start autoplay'}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
            )}

            <button
              type="button"
              className="glass-icon-button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous slide"
              title="Previous"
            >
              <ChevronLeft size={17} />
            </button>

            <button
              type="button"
              className="glass-icon-button"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next slide"
              title="Next"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}

      {/* Viewport and sliding track */}
      <div
        className="glass-carousel-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="glass-carousel-track"
          style={{
            transform: `translateX(-${slidePercent}%)`,
            transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          {items.map((item, index) => {
            const isActive = index >= currentIndex && index < currentIndex + visibleCount;
            const isFirstVisible = index === currentIndex;
            const itemKey = item.id || item.courseId || item._key || index;

            return (
              <div
                key={itemKey}
                className={`glass-carousel-slide ${isActive ? 'is-active' : ''} ${
                  isFirstVisible ? 'is-spotlight' : ''
                }`}
                style={{
                  flex: `0 0 ${100 / visibleCount}%`,
                  maxWidth: `${100 / visibleCount}%`
                }}
              >
                {renderItem ? (
                  renderItem(item, index, isActive)
                ) : (
                  <DefaultGlassCourseCard
                    course={item}
                    isActive={isActive}
                    onSelectCourse={onSelectCourse}
                    onOpenCourseDetails={onOpenCourseDetails}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination progress dots */}
      {maxIndex > 0 && (
        <div className="glass-carousel-pagination" role="tablist" aria-label="Slides">
          {Array.from({ length: maxIndex + 1 }).map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              role="tab"
              aria-selected={currentIndex === dotIndex}
              aria-label={`Go to slide ${dotIndex + 1}`}
              className={`glass-carousel-dot ${currentIndex === dotIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(dotIndex)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function formatPosition(pos) {
  if (!pos) return '';
  const s = String(pos).trim().toUpperCase();
  if (s.startsWith('L') && s.length === 2 && ['0', '1', '2', '3', '4'].includes(s[1])) {
    return 'P' + s[1];
  }
  return s;
}

/**
 * Default Premium Glass Course Card
 * Used when no custom renderItem prop is provided.
 */
function DefaultGlassCourseCard({
  course,
  isActive,
  onSelectCourse,
  onOpenCourseDetails
}) {
  const courseId = course.id || course.courseId || course.courseCode || '';
  const title = course.title || course.courseTitle || 'Untitled Course';
  const category = course.category || 'Professional Development';
  const banner = getCourseBanner(course);
  const duration = formatCourseDuration(course.duration, course.durationHours);
  const coursePos = formatPosition(course.position || course.level);
  const progress = Number(course.progressPercent || course.progress || 0);
  const isEnrolled = course.enrolled === true || course.enrollmentStatus || progress > 0;
  const isMandatory =
    course.assignmentType === 'MANDATORY' ||
    course.foundation === true ||
    (Array.isArray(course.mandatoryFor) && course.mandatoryFor.length > 0);

  return (
    <article
      className={`glass-carousel-card ${isActive ? 'active' : ''}`}
      onClick={() => onOpenCourseDetails?.(course)}
    >
      {/* Course Banner with gradient overlay */}
      <div className="glass-card-banner-wrapper">
        <CourseThumbnailImage
          course={course}
          alt={title}
          className="glass-card-banner"
        />
        <div className="glass-card-banner-overlay" />

        {/* Top Badges */}
        <div className="glass-card-badges">
          <span className="glass-badge-category">{category}</span>
          {isMandatory && <span className="glass-badge-mandatory">Mandatory</span>}
        </div>

        {courseId && <span className="glass-badge-id">{courseId}</span>}
      </div>

      {/* Card Content */}
      <div className="glass-card-content">
        <h3 className="glass-card-title" title={title}>
          {title}
        </h3>

        <div className="glass-card-meta">
          <span className="glass-meta-item">
            <Clock size={13} />
            {duration}
          </span>
          {coursePos && (
            <span
              className="glass-meta-item"
              style={{
                background: 'rgba(2, 132, 199, 0.12)',
                color: '#0369a1',
                padding: '1px 6px',
                borderRadius: 4,
                fontWeight: 750,
                fontSize: '0.72rem'
              }}
            >
              {coursePos}
            </span>
          )}
          {course.moduleCount !== undefined && course.moduleCount !== null && (
            <span className="glass-meta-item">
              <Layers size={13} />
              {course.moduleCount} {Number(course.moduleCount) === 1 ? 'Module' : 'Modules'}
            </span>
          )}
        </div>

        {/* Progress bar if enrolled */}
        {isEnrolled && progress > 0 && (
          <div className="glass-card-progress-section">
            <div className="glass-card-progress-labels">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="glass-progress-track">
              <div
                className="glass-progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Card Actions */}
        <div className="glass-card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="glass-button-primary"
            onClick={() => onSelectCourse?.(course)}
          >
            <PlayCircle size={15} />
            {progress >= 100 ? 'Review Course' : progress > 0 ? 'Resume' : 'Start Course'}
          </button>

          {onOpenCourseDetails && (
            <button
              type="button"
              className="glass-button-secondary"
              onClick={() => onOpenCourseDetails(course)}
              title="View course curriculum"
            >
              <Eye size={14} />
              Details
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

