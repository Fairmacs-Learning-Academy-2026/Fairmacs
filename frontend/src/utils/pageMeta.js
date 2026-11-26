/**
 * Per-page meta title resolver for Fairmacs KMS.
 * Maps every public, role-specific, and dynamic route to a distinct document title.
 */

export const BRAND_SUFFIX = 'Fairmacs Learning Academy';
export const DEFAULT_PAGE_TITLE = 'Fairmacs Learning Academy';

const STATIC_ROUTE_TITLES = {
  '/': DEFAULT_PAGE_TITLE,
  '/login': `Employee Sign In | ${BRAND_SUFFIX}`,
  '/unauthorized': `Access Restricted | ${BRAND_SUFFIX}`,
  '/dashboard': `My Learning Dashboard | ${BRAND_SUFFIX}`,
  '/trainer': `Trainer Dashboard | ${BRAND_SUFFIX}`,
  '/manager': `Manager Compliance Dashboard | ${BRAND_SUFFIX}`,
  '/manager/all-courses': `Organization Courses | ${BRAND_SUFFIX}`,
  '/manager/policies': `Team Policies & Agreements | ${BRAND_SUFFIX}`,
  '/admin': `People Operations | ${BRAND_SUFFIX}`,
  '/hr': `People Operations | ${BRAND_SUFFIX}`,
  '/hr/overview': `People Operations | ${BRAND_SUFFIX}`,
  '/hr/employees': `Employee Directory & Management | ${BRAND_SUFFIX}`,
  '/hr/departments': `Departments & Learning Matrix | ${BRAND_SUFFIX}`,
  '/hr/courses': `Assigned Learning | ${BRAND_SUFFIX}`,
  '/hr/drafts': `Course Drafts & Review | ${BRAND_SUFFIX}`,
  '/hr/reports': `HR Analytics & Compliance Reports | ${BRAND_SUFFIX}`,
  '/hr/certificates': `Certificate Registry | ${BRAND_SUFFIX}`,
  '/hr/announcements': `Corporate Announcements | ${BRAND_SUFFIX}`,
  '/hr/settings': `System & Cloud Settings | ${BRAND_SUFFIX}`,
  '/hr/policies': `Corporate Policies & Agreements | ${BRAND_SUFFIX}`,
  '/progress': `Learning Progress | ${BRAND_SUFFIX}`,
  '/courses': `Course Catalog | ${BRAND_SUFFIX}`,
  '/training-calendar': `Learning & Compliance Calendar | ${BRAND_SUFFIX}`,
  '/reports': `Training Reports & Analytics | ${BRAND_SUFFIX}`,
  '/certificates': `My Certificates | ${BRAND_SUFFIX}`,
  '/notifications': `Notifications | ${BRAND_SUFFIX}`,
  '/profile': `My Employee Profile | ${BRAND_SUFFIX}`,
  '/drafts': `Course Drafts | ${BRAND_SUFFIX}`,
};

export function resolvePageTitle(pathname = '/', context = {}) {
  const cleanPath = String(pathname || '/').replace(/\/+$/, '') || '/';

  if (STATIC_ROUTE_TITLES[cleanPath]) {
    return STATIC_ROUTE_TITLES[cleanPath];
  }

  // Dynamic course player: /courses/:courseId/learn
  if (/^\/courses\/[^/]+\/learn$/i.test(cleanPath)) {
    const courseTitle = context?.courseTitle ? String(context.courseTitle).trim() : '';
    return courseTitle
      ? `${courseTitle} — Learning | ${BRAND_SUFFIX}`
      : `Course Player | ${BRAND_SUFFIX}`;
  }

  // Dynamic course overview: /courses/:courseId or /courses/:courseId/overview
  if (/^\/courses\/[^/]+(\/overview)?$/i.test(cleanPath)) {
    const courseTitle = context?.courseTitle ? String(context.courseTitle).trim() : '';
    return courseTitle
      ? `${courseTitle} — Course Overview | ${BRAND_SUFFIX}`
      : `Course Overview | ${BRAND_SUFFIX}`;
  }

  // HR Department Course Employees: /hr/departments/:departmentId/courses/:courseId
  if (/^\/hr\/departments\/[^/]+\/courses\/[^/]+$/i.test(cleanPath)) {
    return `Department Course Progress | ${BRAND_SUFFIX}`;
  }

  // HR Department Details: /hr/departments/:departmentId
  if (/^\/hr\/departments\/[^/]+$/i.test(cleanPath)) {
    return `Department Overview | ${BRAND_SUFFIX}`;
  }

  return DEFAULT_PAGE_TITLE;
}
