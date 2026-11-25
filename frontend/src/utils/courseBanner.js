/**
 * Course Banner & Thumbnail Resolution Utilities — Fairmacs LMS
 *
 * Centralized thumbnail fallback and WorkDrive resolution:
 * 1. If course has custom uploaded thumbnail -> resolve and display custom thumbnail.
 * 2. If course does not have a thumbnail -> display default official Fairmacs logo.
 * 3. If custom thumbnail URL is broken / 404 / unavailable -> catch onError and fall back to Fairmacs logo.
 * 4. Never overwrites existing custom thumbnails.
 * 5. Uses centralized constants and prevents distortion via proper object-fit.
 */

export const DEFAULT_THUMBNAIL_WORKDRIVE_URL =
  'https://workdrive.zoho.com/file/uxhlk57c56d1fba87474680a8259345370bb6';

export const DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID =
  'uxhlk57c56d1fba87474680a8259345370bb6';

export const BACKEND_DEFAULT_THUMBNAIL_FILE_ID =
  'gugjua96c81958f1448058257a65e94d8997b';

export const DEFAULT_COURSE_THUMBNAIL = '/fairmacs-default-thumbnail.png';

/**
 * Checks whether the given banner string or course object is using the default Fairmacs thumbnail.
 */
export function isDefaultThumbnail(bannerOrCourse) {
  if (!bannerOrCourse) return true;
  if (typeof bannerOrCourse === 'object') {
    const raw =
      bannerOrCourse.banner ??
      bannerOrCourse.thumbnailUrl ??
      bannerOrCourse.thumbnail;
    if (!raw || typeof raw !== 'string' || !raw.trim()) return true;
    return isDefaultThumbnail(raw);
  }
  if (typeof bannerOrCourse === 'string') {
    const trimmed = bannerOrCourse.trim();
    if (!trimmed) return true;
    if (trimmed === DEFAULT_COURSE_THUMBNAIL) return true;
    if (trimmed.includes(DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID)) return true;
    if (trimmed.includes(BACKEND_DEFAULT_THUMBNAIL_FILE_ID)) return true;
    if (trimmed.includes('/api/courses/thumbnails/default')) return true;
    if (trimmed.includes('fairmacs-default-thumbnail.png')) return true;
    if (trimmed.includes('fairmacs-logo-square.png')) return true;
    if (trimmed.includes('fairmacs-logo.png')) return true;
  }
  return false;
}

function getApiHost() {
  const envBase = (
    (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta?.env?.PROD ? 'https://fairmacs-lms-api.onrender.com/api' : 'http://localhost:8080/api')
  ).trim();
  if (envBase.startsWith('http://') || envBase.startsWith('https://')) {
    return envBase.replace(/\/api\/?$/, '');
  }
  return '';
}

/**
 * Resolves a thumbnail or banner string to a playable/displayable URL.
 * Handles WorkDrive preview links, relative backend thumbnail storage IDs, and absolute URLs.
 */
export function resolveBannerUrl(banner) {
  if (!banner || typeof banner !== 'string') return DEFAULT_COURSE_THUMBNAIL;
  const trimmed = banner.trim();
  if (!trimmed) return DEFAULT_COURSE_THUMBNAIL;

  // Direct reference to official default thumbnail
  if (
    trimmed.includes(DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID) ||
    trimmed.includes(BACKEND_DEFAULT_THUMBNAIL_FILE_ID)
  ) {
    return DEFAULT_COURSE_THUMBNAIL;
  }

  // Frontend public static asset (never prepend backend API origin)
  if (
    trimmed.startsWith('/fairmacs-') ||
    trimmed.startsWith('fairmacs-') ||
    trimmed === DEFAULT_COURSE_THUMBNAIL
  ) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // WorkDrive file preview URL: https://workdrive.zoho.com/file/<fileId>
  // Zoho file preview pages return HTML (HTTP 302 redirect), not image bytes.
  // Route through backend proxy /api/courses/thumbnails/workdrive/<fileId> to stream the actual image securely.
  const workdriveMatch = trimmed.match(/workdrive\.zoho\.com\/file\/([a-zA-Z0-9]+)/i);
  if (workdriveMatch && workdriveMatch[1]) {
    const fileId = workdriveMatch[1];
    if (
      fileId === DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID ||
      fileId === BACKEND_DEFAULT_THUMBNAIL_FILE_ID
    ) {
      return DEFAULT_COURSE_THUMBNAIL;
    }
    const proxyPath = `/api/courses/thumbnails/workdrive/${fileId}`;
    const apiHost = getApiHost();
    return apiHost ? `${apiHost}${proxyPath}` : proxyPath;
  }

  // Raw WorkDrive file ID (alphanumeric string 25-45 chars without slashes)
  if (/^[a-zA-Z0-9]{25,45}$/.test(trimmed)) {
    if (
      trimmed === DEFAULT_THUMBNAIL_WORKDRIVE_FILE_ID ||
      trimmed === BACKEND_DEFAULT_THUMBNAIL_FILE_ID
    ) {
      return DEFAULT_COURSE_THUMBNAIL;
    }
    const proxyPath = `/api/courses/thumbnails/workdrive/${trimmed}`;
    const apiHost = getApiHost();
    return apiHost ? `${apiHost}${proxyPath}` : proxyPath;
  }

  // UUID storage ID (e.g. 3f5a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    const proxyPath = `/api/courses/thumbnails/${trimmed}`;
    const apiHost = getApiHost();
    return apiHost ? `${apiHost}${proxyPath}` : proxyPath;
  }

  // Already absolute or inline data URI
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  // If already starts with api/ or /api/, prepend remote origin if remote
  const cleanApi = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (cleanApi.startsWith('/api/')) {
    const apiHost = getApiHost();
    return apiHost ? `${apiHost}${cleanApi}` : cleanApi;
  }

  return cleanApi;
}

/**
 * Returns the resolved banner URL for a course, or the default Fairmacs thumbnail if absent.
 */
export function getCourseBanner(course) {
  if (!course) return DEFAULT_COURSE_THUMBNAIL;
  const candidate = (
    course.banner ??
    course.thumbnailUrl ??
    course.thumbnail ??
    ''
  ).trim();

  if (candidate) {
    return resolveBannerUrl(candidate);
  }
  return DEFAULT_COURSE_THUMBNAIL;
}

/**
 * Gracefully handles broken or failed image URLs by switching to the official Fairmacs default thumbnail.
 */
export function handleBannerError(event, course) {
  if (!event || !event.currentTarget) return;
  const img = event.currentTarget;

  // Prevent infinite loops if default thumbnail also triggers error (fall back to SVG)
  if (
    img.dataset.hasFailedFallback === 'true' ||
    (img.src && img.src.includes('fairmacs-default-thumbnail.png'))
  ) {
    img.onerror = null;
    img.src = getFallbackSvg(course);
    img.style.objectFit = 'cover';
    img.style.backgroundColor = 'transparent';
    return;
  }

  img.dataset.hasFailedFallback = 'true';
  img.onerror = () => {
    img.onerror = null;
    img.src = getFallbackSvg(course);
    img.style.objectFit = 'cover';
    img.style.backgroundColor = 'transparent';
  };
  img.src = DEFAULT_COURSE_THUMBNAIL;
  img.style.objectFit = 'contain';
  img.style.backgroundColor = '#ffffff';
}

/**
 * Generates an SVG card as an ultimate offline fallback if images cannot load.
 */
export function getFallbackSvg(course) {
  const dept =
    course?.department ||
    (course?.departments && course.departments[0]) ||
    course?.category ||
    'FAIRMACS';
  const title = (
    course?.title ||
    course?.courseTitle ||
    'OPERATIONAL EXCELLENCE'
  ).slice(0, 36);
  const code = course?.id || course?.courseId || course?.courseCode || 'LMS';

  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeDept = String(dept).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeCode = String(code).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a192f"/>
        <stop offset="60%" stop-color="#0f2b48"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
    </defs>
    <rect width="600" height="340" fill="url(#bg)"/>
    <circle cx="520" cy="50" r="140" fill="#38bdf8" fill-opacity="0.08"/>
    <circle cx="80" cy="280" r="110" fill="#0ea5e9" fill-opacity="0.08"/>
    <text x="36" y="52" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="800" letter-spacing="2">FAIRMACS LEARNING</text>
    <rect x="36" y="66" width="60" height="3" fill="#38bdf8" rx="1.5"/>
    <text x="36" y="130" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800">${safeTitle}</text>
    <rect x="36" y="210" width="100" height="28" rx="14" fill="#ffffff" fill-opacity="0.12"/>
    <text x="50" y="229" fill="#e0f2fe" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700">${safeCode}</text>
    <rect x="146" y="210" width="140" height="28" rx="14" fill="#38bdf8" fill-opacity="0.2"/>
    <text x="160" y="229" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700">${safeDept}</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
