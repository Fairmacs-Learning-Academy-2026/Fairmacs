import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Compass,
  Sparkles,
  Calendar,
  RefreshCw,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { courseService } from '../services/courseService';
import AssignedLearningCarousel from './AssignedLearningCarousel';
import WelcomeBanner from './dashboard/WelcomeBanner';
import LearningStreaks from './dashboard/LearningStreaks';
import SmartLearningCard from './dashboard/SmartLearningCard';
import LearningProgress from './dashboard/LearningProgress';
import CertificatesWidget from './dashboard/CertificatesWidget';
import PoliciesWidget from './dashboard/PoliciesWidget';
import AnnouncementsWidget from './dashboard/AnnouncementsWidget';
import UpcomingDeadlinesWidget from './dashboard/UpcomingDeadlinesWidget';
import UpcomingTrainingWidget from './dashboard/UpcomingTrainingWidget';
import RecommendedElectivesWidget from './dashboard/RecommendedElectivesWidget';
import { formatCourseDuration } from '../utils/courseDuration';
import { subscribeEnrollmentSync } from '../utils/enrollmentSync';

export { formatCourseDuration };

const panelStyle = {
  background: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 18,
  padding: '1.4rem 1.6rem',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  boxShadow: '0 4px 20px rgba(31, 70, 120, 0.05)'
};

function normalizeCourse(course, index = 0) {
  const modulesList = Array.isArray(course?.modules) ? course.modules : [];
  const calculatedModuleCount = modulesList.length;
  const calculatedLessonCount = modulesList.reduce(
    (acc, m) => acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
    0
  );

  const moduleCount =
    typeof course?.moduleCount === 'number'
      ? course.moduleCount
      : calculatedModuleCount > 0
      ? calculatedModuleCount
      : (course?.moduleCount != null ? Number(course.moduleCount) : 0);

  const lessonCount =
    typeof course?.lessonCount === 'number'
      ? course.lessonCount
      : calculatedLessonCount > 0
      ? calculatedLessonCount
      : (course?.lessonCount != null ? Number(course.lessonCount) : 0);

  const bannerUrl = course?.banner || course?.thumbnailUrl || course?.thumbnail || '';

  return {
    ...course,
    _key: course?.dbId ?? course?.courseDatabaseId ?? course?.id ?? course?.courseId ?? index,
    title: course?.title ?? course?.courseTitle ?? 'Untitled Course',
    id: course?.id ?? course?.courseId ?? course?.courseCode ?? '',
    progressPercent: Number(course?.progressPercent ?? course?.progress ?? 0),
    status: String(course?.enrollmentStatus ?? course?.status ?? '').toUpperCase(),
    duration: formatCourseDuration(course?.duration, course?.durationHours),
    banner: bannerUrl,
    thumbnailUrl: bannerUrl,
    thumbnail: bannerUrl,
    moduleCount,
    lessonCount
  };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}


export default function Overview({
  onSelectCourse,
  setActiveTab,
  onOpenCertificates
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const returnedCourseId = location.state?.returnedFromCourseId;
  const returnedIndex = location.state?.fromCarouselIndex;
  const [dashboard, setDashboard] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const loadDashboard = React.useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError('');

    try {
      const data = await courseService.getLearningDashboard();
      if (!data) {
        setDashboard(null);
        setError('Unable to load your learning dashboard. Please retry.');
        return;
      }
      setDashboard(data);
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load your learning dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const initialLoad = async () => {
      if (!mounted) return;
      await loadDashboard();
    };

    const handleEnrollmentUpdated = () => {
      loadDashboard(true);
    };

    initialLoad();

    // Direct window event listener for same-tab updates
    window.addEventListener('lms:enrollment-updated', handleEnrollmentUpdated);

    // Universal cross-tab and visibility/focus synchronization bus (skipSameTabEvent prevents double-firing)
    const unsubscribe = subscribeEnrollmentSync(handleEnrollmentUpdated, { skipSameTabEvent: true });

    // 60-second periodic background revalidation for active tabs (e.g. kiosk or unattended open tab)
    const intervalId = setInterval(() => {
      if (mounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadDashboard(true);
      }
    }, 60000);

    return () => {
      mounted = false;
      window.removeEventListener('lms:enrollment-updated', handleEnrollmentUpdated);
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [loadDashboard]);

  // Navigate to dedicated course overview page with seamless transition state
  // Navigation Contract: navigate(`/courses/${encodeURIComponent(code)}/overview`)
  const handleOpenCourse = (course) => {
    const code = course.id || course.courseId;
    if (code) {
      const courseIndex = assignedCourses.findIndex(
        (c) => (c.id || c.courseId || c.dbId) === (course.id || course.courseId || course.dbId)
      );
      navigate(`/courses/${encodeURIComponent(code)}/overview`, {
        state: {
          courseData: course,
          fromCarousel: true,
          fromCarouselIndex: courseIndex >= 0 ? courseIndex : 0
        }
      });
    } else if (onSelectCourse) {
      onSelectCourse(course);
    }
  };

  // Filter ONLY assigned courses for the authenticated employee
  const assignedCourses = useMemo(() => {
    if (!dashboard?.enrolled || !Array.isArray(dashboard.enrolled)) return [];
    const seen = new Set();
    const eligible = [];

    for (const rawCourse of dashboard.enrolled) {
      const course = normalizeCourse(rawCourse);
      const key = String(course.dbId || course.id || course._key);
      if (seen.has(key)) continue;
      seen.add(key);

      // Backend authoritative completion status
      const isCompleted =
        course.enrollmentStatus === 'COMPLETED' ||
        course.status === 'COMPLETED';

      // Revoked or inactive enrollments
      const isRevokedOrInactive =
        ['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes(course.enrollmentStatus) ||
        ['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes(course.status);

      if (isCompleted || isRevokedOrInactive) continue;

      const progress = Math.max(0, Math.min(100, Number(course.progressPercent || 0)));
      const isOngoing = progress > 0 || course.enrollmentStatus === 'IN_PROGRESS' || course.status === 'IN_PROGRESS';
      const isNewlyAssigned = !isOngoing;

      eligible.push({
        ...course,
        progress,
        isOngoing,
        isNewlyAssigned,
        statusLabel: isOngoing ? 'IN PROGRESS' : 'NEWLY ASSIGNED',
        actionLabel: isOngoing ? 'Continue Learning' : 'Start Learning'
      });
    }

    return eligible;
  }, [dashboard]);

  const recommendedCourses = useMemo(
    () => (Array.isArray(dashboard?.recommended) ? dashboard.recommended : []).map(normalizeCourse),
    [dashboard]
  );

  const completedCourses = Number(dashboard?.completedCourses ?? 0);

  // Set of completed course IDs for authoritative elective filtering
  const completedCourseIds = useMemo(() => {
    const ids = new Set();
    if (Array.isArray(dashboard?.enrolled)) {
      for (const c of dashboard.enrolled) {
        if (c.enrollmentStatus === 'COMPLETED' || c.status === 'COMPLETED') {
          if (c.id) ids.add(String(c.id));
          if (c.dbId) ids.add(String(c.dbId));
          if (c.courseId) ids.add(String(c.courseId));
        }
      }
    }
    return ids;
  }, [dashboard]);

  // Overall progress percentage
  const overallProgress = useMemo(() => {
    if (dashboard?.mandatoryPercent != null && typeof dashboard.mandatoryPercent === 'number') {
      return Number(dashboard.mandatoryPercent);
    }
    const totalCount = assignedCourses.length + completedCourses;
    if (totalCount === 0) return 0;
    const assignedSum = assignedCourses.reduce((sum, c) => sum + (c.progress || 0), 0);
    const completedSum = completedCourses * 100;
    return Math.round((assignedSum + completedSum) / totalCount);
  }, [dashboard, assignedCourses, completedCourses]);

  return (
    <div className="employee-dashboard-shell animate-fade-in">
      {/* ========================================================
          PHASE 2: BALANCED APPLE LIQUID GLASS WELCOME HEADER
          Always displayed at the top of the dashboard shell
      ======================================================== */}
      <WelcomeBanner
        onOpenNotifications={() => {
          if (setActiveTab) setActiveTab('notifications');
          navigate('/notifications');
        }}
      />

      {/* ========================================================
          DASHBOARD STATE: LOADING SKELETON
      ======================================================== */}
      {loading ? (
        <div
          className="employee-dashboard-loading animate-fade-in"
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}
        >
          {/* Carousel Skeleton - compact realistic height 220px matching AssignedLearningCarousel card aspect ratio */}
          <div
            className="skeleton-shimmer"
            style={{
              height: '220px',
              borderRadius: '22px',
              border: '1px solid rgba(226, 235, 245, 0.85)',
              boxShadow: '0 8px 24px rgba(31, 70, 120, 0.04)'
            }}
          />
          {/* Learning Streaks Skeleton - realistic height 190px matching Dual Activity Rings & Weekly Calendar */}
          <div
            className="skeleton-shimmer"
            style={{
              height: '190px',
              borderRadius: '22px',
              border: '1px solid rgba(226, 235, 245, 0.85)',
              boxShadow: '0 8px 24px rgba(31, 70, 120, 0.04)'
            }}
          />
          {/* Smart Learning Card Skeleton */}
          <SmartLearningCard loading={true} />
          {/* Learning Progress Skeleton */}
          <LearningProgress loading={true} />
          {/* Phase 5 Widgets Grid Skeleton */}
          <div className="employee-dashboard-phase5-grid">
            <div className="phase5-skeleton-row" style={{ height: '170px', borderRadius: '22px' }} />
            <div className="phase5-skeleton-row" style={{ height: '170px', borderRadius: '22px' }} />
            <div className="phase5-skeleton-row" style={{ height: '170px', borderRadius: '22px' }} />
          </div>
          {/* Phase 7 Widgets Skeleton */}
          <UpcomingDeadlinesWidget loading={true} />
          <RecommendedElectivesWidget loading={true} />
        </div>
      ) : error ? (
        /* ========================================================
            DASHBOARD STATE: ERROR FALLBACK PANEL
        ======================================================== */
        <div
          className="dashboard-error-panel animate-fade-in"
          style={{
            ...panelStyle,
            padding: '2.5rem 2rem',
            textAlign: 'center',
            borderRadius: '22px'
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              border: '1px solid #FECACA'
            }}
          >
            <AlertCircle size={28} />
          </div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#0F172A',
              margin: '0 0 0.5rem',
              letterSpacing: '-0.02em'
            }}
          >
            Dashboard Temporarily Unavailable
          </h2>
          <p
            role="alert"
            style={{
              color: '#64748B',
              fontSize: '0.88rem',
              margin: '0 auto 1.25rem',
              maxWidth: '460px',
              lineHeight: 1.55
            }}
          >
            {error}
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => loadDashboard()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.35rem',
              borderRadius: '10px'
            }}
          >
            <RefreshCw size={15} /> Retry Loading
          </button>
        </div>
      ) : (
        /* ========================================================
            DASHBOARD STATE: FULLY LOADED CONTENT
        ======================================================== */
        <>
          {/* ========================================================
              PART B & C: ASSIGNED LEARNING CAROUSEL OR PART G: EMPTY STATE
          ======================================================== */}
          {assignedCourses.length > 0 ? (
            <AssignedLearningCarousel
              courses={assignedCourses}
              onOpenCourse={handleOpenCourse}
              initialCourseId={returnedCourseId}
              initialIndex={returnedIndex}
            />
          ) : (
            /* PART G: REFINED EMPTY STATE MATCHING REFERENCE SPECIFICATION */
            <section
              className="assigned-learning-empty-state animate-fade-in"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(246, 250, 255, 0.86) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '22px',
                border: '1px solid rgba(255, 255, 255, 0.95)',
                boxShadow: '0 12px 36px rgba(31, 70, 120, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
                padding: '2.75rem 2rem',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#EFF6FF',
                  color: '#2563EB',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.15rem',
                  border: '1px solid rgba(37, 99, 235, 0.15)',
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.12)'
                }}
              >
                <CheckCircle2 size={30} />
              </div>
              <h2
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: '0 0 0.45rem',
                  letterSpacing: '-0.02em'
                }}
              >
                You're all caught up!
              </h2>
              <p
                style={{
                  color: '#64748B',
                  fontSize: '0.92rem',
                  maxWidth: '480px',
                  margin: '0 auto 1.35rem',
                  lineHeight: 1.55
                }}
              >
                You have completed all your assigned courses. Explore the course catalog to discover more learning opportunities.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (setActiveTab) setActiveTab('catalog');
                  navigate('/courses');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.68rem 1.4rem',
                  fontSize: '0.88rem',
                  borderRadius: '10px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)'
                }}
              >
                <Compass size={16} /> Explore Course Catalog
              </button>
            </section>
          )}

          {/* ========================================================
              PHASE 3: LEARNING CONSISTENCY (DUAL ACTIVITY RINGS & CALENDAR)
              Positioned immediately below the Course Carousel
          ======================================================== */}
          <LearningStreaks />

          {/* ========================================================
              PHASE 4: DYNAMIC SMART LEARNING CARD
              Context-aware priority-driven action card
          ======================================================== */}
          <SmartLearningCard
            assignedCourses={assignedCourses}
            recommendedCourses={recommendedCourses}
            completedCoursesCount={completedCourses}
            onOpenCourse={handleOpenCourse}
            onExploreCatalog={() => {
              if (setActiveTab) setActiveTab('catalog');
              navigate('/courses');
            }}
          />

          {/* ========================================================
              PHASE 4: LEARNING PROGRESS WIDGETS & CURRICULUM SNAPSHOT
              Segmented visual progress bar and 4 Liquid Glass metric cards
          ======================================================== */}
          <LearningProgress
            dashboard={dashboard}
            onNavigateProgressHub={() => {
              if (setActiveTab) setActiveTab('mylearning');
              navigate('/progress');
            }}
          />

          {/* ========================================================
              PHASE 5: CERTIFICATES, POLICIES & AGREEMENTS, AND ANNOUNCEMENTS
              Liquid Glass 3-Card Responsive Grid Layout
          ======================================================== */}
          <div className="employee-dashboard-phase5-grid">
            {/* 6. Certificates Widget */}
            <CertificatesWidget
              onViewAllCertificates={() => {
                if (onOpenCertificates) {
                  onOpenCertificates();
                } else {
                  if (setActiveTab) setActiveTab('certificates');
                  navigate('/certificates');
                }
              }}
            />

            {/* 7. Policies & Agreements Widget */}
            <PoliciesWidget
              onViewAllPolicies={() => {
                if (setActiveTab) setActiveTab('profile');
                navigate('/profile?tab=policies#policies');
              }}
            />

            {/* 8. Announcements Widget */}
            <AnnouncementsWidget
              onViewAllAnnouncements={() => {
                if (setActiveTab) setActiveTab('notifications');
                navigate('/notifications');
              }}
            />
          </div>

          {/* ========================================================
              PHASE 7: UPCOMING TRAINING & DEADLINES (CALENDAR INTEGRATED)
              Balanced Apple Liquid Glass Sections
          ======================================================== */}
          {/* 9. Upcoming Training & Deadlines Widget */}
          <UpcomingTrainingWidget />

          {/* 10. Recommended Electives Widget */}
          <RecommendedElectivesWidget
            recommendedCourses={recommendedCourses}
            assignedCourses={assignedCourses}
            completedCourseIds={completedCourseIds}
            onOpenCourse={handleOpenCourse}
            onExploreCatalog={() => {
              if (setActiveTab) setActiveTab('catalog');
              navigate('/courses');
            }}
            loading={false}
          />
        </>
      )}
    </div>
  );
}
