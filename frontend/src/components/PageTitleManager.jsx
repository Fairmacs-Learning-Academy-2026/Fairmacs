import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { resolvePageTitle } from '../utils/pageMeta';

/**
 * Automatically updates document.title on every route change.
 * Dynamic pages (such as CourseOverviewPage and CourseViewer) refine the title
 * further once entity metadata finishes loading.
 */
export default function PageTitleManager() {
  const location = useLocation();

  useEffect(() => {
    const stateCourseTitle =
      location.state?.courseData?.title ||
      location.state?.courseData?.courseTitle ||
      '';
    document.title = resolvePageTitle(location.pathname, {
      courseTitle: stateCourseTitle,
    });
  }, [location.pathname, location.state]);

  return null;
}
