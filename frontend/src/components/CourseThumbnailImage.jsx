import React, { useState, useEffect } from 'react';
import {
  DEFAULT_COURSE_THUMBNAIL,
  getCourseBanner,
  isDefaultThumbnail,
  resolveBannerUrl,
  getFallbackSvg,
} from '../utils/courseBanner';

/**
 * CourseThumbnailImage — Centralized Fairmacs LMS Course Thumbnail Component
 *
 * Implements the official fallback rules:
 * 1. If course has custom uploaded thumbnail -> display that custom thumbnail.
 * 2. If course does not have a thumbnail -> display official Fairmacs logo.
 * 3. If custom thumbnail fails/broken -> gracefully fall back to official Fairmacs logo.
 * 4. Preserves thumbnail dimensions and prevents distortion via contain/cover object-fit.
 * 5. Does not overwrite database or state.
 */
export default function CourseThumbnailImage({
  course,
  banner,
  alt,
  className = '',
  style = {},
  objectFit,
  ...props
}) {
  const customCandidate = (
    banner ??
    course?.banner ??
    course?.thumbnailUrl ??
    course?.thumbnail ??
    ''
  );

  const hasCustom = Boolean(
    typeof customCandidate === 'string' &&
    customCandidate.trim() &&
    !isDefaultThumbnail(customCandidate)
  );

  const initialSrc = hasCustom
    ? resolveBannerUrl(customCandidate)
    : DEFAULT_COURSE_THUMBNAIL;

  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [isDefault, setIsDefault] = useState(!hasCustom || initialSrc === DEFAULT_COURSE_THUMBNAIL);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const candidate = (
      banner ??
      course?.banner ??
      course?.thumbnailUrl ??
      course?.thumbnail ??
      ''
    );

    const isCustom = Boolean(
      typeof candidate === 'string' &&
      candidate.trim() &&
      !isDefaultThumbnail(candidate)
    );

    const resolved = isCustom
      ? resolveBannerUrl(candidate)
      : DEFAULT_COURSE_THUMBNAIL;

    setCurrentSrc(resolved);
    setIsDefault(!isCustom || resolved === DEFAULT_COURSE_THUMBNAIL);
    setHasError(false);
  }, [banner, course?.banner, course?.thumbnailUrl, course?.thumbnail]);

  const handleImageError = (e) => {
    if (!isDefault) {
      console.warn(
        `[Fairmacs CourseThumbnail] Custom thumbnail failed to load for course "${course?.title || course?.id || 'Unknown'}". Attempted src: ${currentSrc}. Falling back to default Fairmacs thumbnail.`
      );
      setIsDefault(true);
      setCurrentSrc(DEFAULT_COURSE_THUMBNAIL);
    } else if (!hasError) {
      console.warn(
        `[Fairmacs CourseThumbnail] Default thumbnail failed for course "${course?.title || course?.id || 'Unknown'}". Falling back to clean branded SVG.`
      );
      setHasError(true);
      setCurrentSrc(getFallbackSvg(course));
    }
    if (props.onError) {
      props.onError(e);
    }
  };

  const computedStyle = {
    width: '100%',
    height: '100%',
    objectFit: objectFit || (isDefault ? 'contain' : 'cover'),
    backgroundColor: isDefault ? '#ffffff' : 'transparent',
    padding: isDefault ? '0.75rem' : '0',
    boxSizing: 'border-box',
    display: 'block',
    transition: 'transform 0.3s ease',
    ...style,
  };

  return (
    <img
      src={currentSrc}
      alt={alt || course?.title || course?.courseTitle || 'Fairmacs Course Thumbnail'}
      className={`course-thumbnail-img ${isDefault ? 'course-thumbnail-default' : ''} ${className}`.trim()}
      style={computedStyle}
      onError={handleImageError}
      loading="lazy"
      {...props}
    />
  );
}
