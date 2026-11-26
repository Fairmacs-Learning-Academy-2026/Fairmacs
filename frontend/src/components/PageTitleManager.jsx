import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyDocumentMeta } from '../utils/pageMeta';
import { trackPageView } from '../utils/analytics';

const PUBLIC_ALABASTER_PATHS = new Set([
  '/',
  '/privacy-policy',
  '/terms',
  '/thank-you',
]);

/**
 * Automatically updates document.title, meta description, Open Graph tags,
 * mobile status-bar theme-color, and SPA pageviews on every route navigation.
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

    if (typeof document !== 'undefined') {
      const topSurfaceColor = PUBLIC_ALABASTER_PATHS.has(location.pathname)
        ? '#FBF8F3'
        : location.pathname === '/login'
        ? '#FAFBFC'
        : '#F2F7FC';
      const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
      themeMetas.forEach((meta) => {
        meta.setAttribute('content', topSurfaceColor);
      });
    }

    trackPageView(
      location.pathname,
      typeof document !== 'undefined' ? document.title : ''
    );
  }, [location.pathname, location.state]);

  return null;
}
