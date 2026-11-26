import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyDocumentMeta } from '../utils/pageMeta';
import { trackPageView } from '../utils/analytics';

/**
 * Automatically updates document.title, meta description, Open Graph tags,
 * and records SPA pageviews on every route navigation.
 */
export default function PageTitleManager() {
  const location = useLocation();

  useEffect(() => {
    const stateCourseTitle =
      location.state?.courseData?.title ||
      location.state?.courseData?.courseTitle ||
      '';
    const stateCourseDescription =
      location.state?.courseData?.description || '';

    applyDocumentMeta(location.pathname, {
      courseTitle: stateCourseTitle,
      courseDescription: stateCourseDescription,
    });

    trackPageView(
      location.pathname,
      typeof document !== 'undefined' ? document.title : ''
    );
  }, [location.pathname, location.state]);

  return null;
}
