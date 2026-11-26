/**
 * Per-page meta title & description resolver for Fairmacs Learning Academy.
 * Maps every public, role-specific, legal, and dynamic route to distinct SEO/browser metadata.
 */

export const BRAND_SUFFIX = 'Fairmacs Learning Academy';
export const DEFAULT_PAGE_TITLE = 'Fairmacs Learning Academy — Enterprise Learning & Development Hub';
export const DEFAULT_PAGE_DESCRIPTION =
  'Fairmacs Learning Academy — central enterprise learning, compliance policies, certifications, and professional development across Fairmacs.';

const STATIC_ROUTE_META = {
  '/': {
    title: DEFAULT_PAGE_TITLE,
    description: DEFAULT_PAGE_DESCRIPTION,
  },
  '/login': {
    title: `Employee Sign In | ${BRAND_SUFFIX}`,
    description: 'Sign in to Fairmacs Learning Academy with your Employee ID or corporate email to access assigned courses, compliance policies, and certifications.',
  },
  '/privacy-policy': {
    title: `Privacy Policy | ${BRAND_SUFFIX}`,
    description: 'Learn how Fairmacs Shipping & Transport Services Pvt. Ltd. collects, safeguards, and processes employee learning and compliance data within Fairmacs Learning Academy.',
  },
  '/terms': {
    title: `Terms of Use | ${BRAND_SUFFIX}`,
    description: 'Review the acceptable use terms, confidentiality obligations, and intellectual property guidelines for Fairmacs Learning Academy.',
  },
  '/thank-you': {
    title: `Confirmation | ${BRAND_SUFFIX}`,
    description: 'Your action in Fairmacs Learning Academy has been completed successfully.',
  },
  '/unauthorized': {
    title: `Access Restricted | ${BRAND_SUFFIX}`,
    description: 'You do not have permission to view this workspace in Fairmacs Learning Academy. Return to your authorized role dashboard.',
  },
  '/dashboard': {
    title: `My Learning Dashboard | ${BRAND_SUFFIX}`,
    description: 'Track your assigned courses, learning streaks, upcoming live training sessions, and compliance policy acknowledgements.',
  },
  '/trainer': {
    title: `Trainer Dashboard | ${BRAND_SUFFIX}`,
    description: 'Manage authored training courses, review learner completion analytics, and coordinate upcoming training sessions.',
  },
  '/manager': {
    title: `Manager Compliance Dashboard | ${BRAND_SUFFIX}`,
    description: 'Monitor team learning progress, overdue assignments, and departmental policy compliance across your reporting line.',
  },
  '/manager/all-courses': {
    title: `Organization Courses | ${BRAND_SUFFIX}`,
    description: 'Browse all published enterprise courses and training curriculums available across Fairmacs departments.',
  },
  '/manager/policies': {
    title: `Team Policies & Agreements | ${BRAND_SUFFIX}`,
    description: 'Submit departmental policies and monitor employee policy acknowledgements for your team.',
  },
  '/admin': {
    title: `HR Operations Overview | ${BRAND_SUFFIX}`,
    description: 'Organization-wide learning operations, compliance metrics, enrollment trends, and HR administration overview.',
  },
  '/hr': {
    title: `HR Operations Overview | ${BRAND_SUFFIX}`,
    description: 'Organization-wide learning operations, compliance metrics, enrollment trends, and HR administration overview.',
  },
  '/hr/overview': {
    title: `HR Operations Overview | ${BRAND_SUFFIX}`,
    description: 'Organization-wide learning operations, compliance metrics, enrollment trends, and HR administration overview.',
  },
  '/hr/employees': {
    title: `Employee Directory & Management | ${BRAND_SUFFIX}`,
    description: 'Onboard employees, manage roles and departments, and maintain employee records across Fairmacs.',
  },
  '/hr/departments': {
    title: `Departments & Learning Matrix | ${BRAND_SUFFIX}`,
    description: 'View department-level training assignments, completion rates, and organizational learning matrices.',
  },
  '/hr/courses': {
    title: `Assigned Learning | ${BRAND_SUFFIX}`,
    description: 'Access and complete training courses personally assigned to your HR Administrator profile.',
  },
  '/hr/drafts': {
    title: `Course Drafts & Review | ${BRAND_SUFFIX}`,
    description: 'Review unpublished course drafts, curriculum modules, and assessments prior to organization-wide release.',
  },
  '/hr/reports': {
    title: `HR Analytics & Compliance Reports | ${BRAND_SUFFIX}`,
    description: 'Generate detailed training completion, assessment score, and policy compliance audit reports.',
  },
  '/hr/certificates': {
    title: `Certificate Registry | ${BRAND_SUFFIX}`,
    description: 'Verify and manage employee course completion certificates across Fairmacs.',
  },
  '/hr/announcements': {
    title: `Corporate Announcements | ${BRAND_SUFFIX}`,
    description: 'Publish organization-wide or department-specific learning and compliance announcements.',
  },
  '/hr/settings': {
    title: `System & Cloud Settings | ${BRAND_SUFFIX}`,
    description: 'Configure Zoho WorkDrive cloud storage integration, notification channels, and platform settings.',
  },
  '/hr/policies': {
    title: `Corporate Policies & Agreements | ${BRAND_SUFFIX}`,
    description: 'Publish watermarked corporate policies, assign mandatory acknowledgements, and audit employee compliance.',
  },
  '/progress': {
    title: `Learning Progress | ${BRAND_SUFFIX}`,
    description: 'Review your enrolled courses, module completion milestones, assessment scores, and learning history.',
  },
  '/courses': {
    title: `Course Catalog | ${BRAND_SUFFIX}`,
    description: 'Explore structured courses, operational guides, and skill development tracks across Fairmacs divisions.',
  },
  '/training-calendar': {
    title: `Learning & Compliance Calendar | ${BRAND_SUFFIX}`,
    description: 'View upcoming live training sessions, course due dates, and policy acknowledgement deadlines.',
  },
  '/reports': {
    title: `Training Reports & Analytics | ${BRAND_SUFFIX}`,
    description: 'Analyze learner engagement, assessment performance, and departmental training completion.',
  },
  '/certificates': {
    title: `My Certificates | ${BRAND_SUFFIX}`,
    description: 'View and download your earned Fairmacs course completion certificates.',
  },
  '/notifications': {
    title: `Notifications | ${BRAND_SUFFIX}`,
    description: 'Stay updated on course assignments, upcoming deadlines, policy reminders, and corporate announcements.',
  },
  '/profile': {
    title: `My Employee Profile | ${BRAND_SUFFIX}`,
    description: 'Manage your employee profile, emergency contacts, personal documents, and account security settings.',
  },
  '/drafts': {
    title: `Course Drafts | ${BRAND_SUFFIX}`,
    description: 'Continue authoring and refining unpublished training courses and assessments.',
  },
};

export function resolvePageMeta(pathname = '/', context = {}) {
  const cleanPath = String(pathname || '/').replace(/\/+$/, '') || '/';

  if (STATIC_ROUTE_META[cleanPath]) {
    return STATIC_ROUTE_META[cleanPath];
  }

  // Dynamic course player: /courses/:courseId/learn
  if (/^\/courses\/[^/]+\/learn$/i.test(cleanPath)) {
    const courseTitle = context?.courseTitle ? String(context.courseTitle).trim() : '';
    const courseDesc = context?.courseDescription ? String(context.courseDescription).trim() : '';
    return {
      title: courseTitle
        ? `${courseTitle} — Learning | ${BRAND_SUFFIX}`
        : `Course Player | ${BRAND_SUFFIX}`,
      description:
        courseDesc ||
        (courseTitle
          ? `Interactive lessons, watermarked training documents, and assessments for ${courseTitle} in Fairmacs Learning Academy.`
          : 'Complete interactive lessons, training documents, and assessments in the Fairmacs Learning Academy course player.'),
    };
  }

  // Dynamic course overview: /courses/:courseId or /courses/:courseId/overview
  if (/^\/courses\/[^/]+(\/overview)?$/i.test(cleanPath)) {
    const courseTitle = context?.courseTitle ? String(context.courseTitle).trim() : '';
    const courseDesc = context?.courseDescription ? String(context.courseDescription).trim() : '';
    return {
      title: courseTitle
        ? `${courseTitle} — Course Overview | ${BRAND_SUFFIX}`
        : `Course Overview | ${BRAND_SUFFIX}`,
      description:
        courseDesc ||
        (courseTitle
          ? `Review syllabus, modules, completion progress, and certification requirements for ${courseTitle}.`
          : 'Review course syllabus, modules, completion status, and certification details in Fairmacs Learning Academy.'),
    };
  }

  // HR Department Course Employees: /hr/departments/:departmentId/courses/:courseId
  if (/^\/hr\/departments\/[^/]+\/courses\/[^/]+$/i.test(cleanPath)) {
    return {
      title: `Department Course Progress | ${BRAND_SUFFIX}`,
      description: 'Inspect employee-level enrollment status and completion progress for a department course.',
    };
  }

  // HR Department Details: /hr/departments/:departmentId
  if (/^\/hr\/departments\/[^/]+$/i.test(cleanPath)) {
    return {
      title: `Department Overview | ${BRAND_SUFFIX}`,
      description: 'Review department roster, assigned courses, and overall training compliance.',
    };
  }

  return {
    title: `Page Not Found (404) | ${BRAND_SUFFIX}`,
    description: 'The requested page could not be found in Fairmacs Learning Academy.',
  };
}

export function resolvePageTitle(pathname = '/', context = {}) {
  return resolvePageMeta(pathname, context).title;
}

export function resolvePageDescription(pathname = '/', context = {}) {
  return resolvePageMeta(pathname, context).description;
}

function upsertMetaTag(selector, attrName, attrValue, content) {
  if (typeof document === 'undefined' || !content) return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Applies title, meta description, Open Graph, and Twitter tags to document.head.
 */
export function applyDocumentMeta(pathname = '/', context = {}) {
  if (typeof document === 'undefined') return;
  const { title, description } = resolvePageMeta(pathname, context);
  document.title = title;
  upsertMetaTag('meta[name="description"]', 'name', 'description', description);
  upsertMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
  upsertMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
  upsertMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  upsertMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
}
