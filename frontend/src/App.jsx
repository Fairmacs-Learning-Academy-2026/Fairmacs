import React, { useEffect, useState } from 'react';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom';

import {
  AuthProvider,
  useAuth
} from './context/AuthContext';

import { enrollmentService } from './services/enrollmentService';
import { courseService } from './services/courseService';

import PublicHome from './components/PublicHome';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import FairmacsFooter from './components/footer/FairmacsFooter';
import Overview from './components/Overview';
import MyLearning from './components/MyLearning';
import TrainerDashboard from './components/TrainerDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import ManagerAllCourses from './components/ManagerAllCourses';
import HrAdminDashboard from './components/HrAdminDashboard';
import EmployeeManagement from './components/EmployeeManagement';
import DepartmentManagement from './components/DepartmentManagement';
import HrCoursesPage from './components/HrCoursesPage';
import HrDraftsPage from './components/HrDraftsPage';
import HrCertificatesPage from './components/HrCertificatesPage';
import HrAnnouncementsPage from './components/HrAnnouncementsPage';
import HrSettingsPage from './components/HrSettingsPage';
import PolicyHrManagement from './components/policies/PolicyHrManagement';
import PolicyManagerManagement from './components/policies/manager/PolicyManagerManagement';
import DepartmentDetails from './components/DepartmentDetails';
import DepartmentCourseEmployees from './components/DepartmentCourseEmployees';
import CourseCatalog from './components/CourseCatalog';
import CourseViewer from './components/CourseViewer';
import CourseOverviewPage from './components/CourseOverviewPage';
import QuizModal from './components/QuizModal';
import CertificateViewer from './components/CertificateViewer';
import CertificatesPage from './components/CertificatesPage';
import TrainingCalendar from './components/TrainingCalendar';
import ReportsView from './components/ReportsView';
import Login from './components/Login';
import Unauthorized from './components/Unauthorized';
import Drafts from './components/Drafts';
import CourseBuilderModal from './components/CourseBuilderModal';
import NotificationsPage from './components/NotificationsPage';
import ProfilePage from './components/ProfilePage';
import PasswordModal from './components/PasswordModal';
import ErrorBoundary from './components/ErrorBoundary';
import PageTitleManager from './components/PageTitleManager';
import { resolvePageTitle } from './utils/pageMeta';


import ProtectedRoute from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';

import './App.css';


/* =========================================================
   TAB <-> PATH MAPPING
========================================================= */

const tabToPath = {
  dashboard: '/dashboard',
  catalog: '/courses',
  mylearning: '/progress',
  calendar: '/training-calendar',
  reports: '/reports',
  certificates: '/certificates',
  drafts: '/drafts',
  allCourses: '/manager/all-courses',
  notifications: '/notifications',
  profile: '/profile',
  hrOverview: '/hr/overview',
  hrEmployees: '/hr/employees',
  hrDepartments: '/hr/departments',
  hrCourses: '/hr/courses',
  hrDrafts: '/hr/drafts',
  hrReports: '/hr/reports',
  hrCertificates: '/hr/certificates',
  hrAnnouncements: '/hr/announcements',
  hrSettings: '/hr/settings',
  hrPolicies: '/hr/policies',
  managerPolicies: '/manager/policies',
};


const pathToTab = {
  '/dashboard': 'dashboard',
  '/trainer': 'dashboard',
  '/manager': 'dashboard',
  '/manager/all-courses': 'allCourses',
  '/manager/policies': 'managerPolicies',
  '/admin': 'hrOverview',
  '/hr': 'hrOverview',
  '/hr/overview': 'hrOverview',
  '/hr/employees': 'hrEmployees',
  '/hr/departments': 'hrDepartments',
  '/hr/courses': 'hrCourses',
  '/hr/drafts': 'hrDrafts',
  '/hr/reports': 'hrReports',
  '/hr/certificates': 'hrCertificates',
  '/hr/announcements': 'hrAnnouncements',
  '/hr/settings': 'hrSettings',
  '/hr/policies': 'hrPolicies',

  '/courses': 'catalog',
  '/progress': 'mylearning',
  '/training-calendar': 'calendar',
  '/reports': 'reports',
  '/certificates': 'certificates',
  '/drafts': 'drafts',
  '/notifications': 'notifications',
  '/profile': 'profile',
};


/* =========================================================
   ROLE DASHBOARD PATH
========================================================= */

export function getDashboardPath(role) {

  switch (
    String(role || '').toUpperCase()
  ) {

    case 'TRAINER':
      return '/trainer';

    case 'MANAGER':
      return '/manager';

    case 'HR_ADMIN':
      return '/hr/overview';

    case 'EMPLOYEE':
    default:
      return '/dashboard';
  }
}


/* =========================================================
   MAIN APPLICATION
========================================================= */

function MainApp() {

  const {
    user,
    isAuthenticated
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] =
    useState(() => pathToTab[window.location.pathname] || 'dashboard');

  const [selectedCourse, setSelectedCourse] =
    useState(null);

  const [courseRouteLoading, setCourseRouteLoading] = useState(false);

  const [selectedCourseDetails, setSelectedCourseDetails] =
    useState(null);

  // Restore the selected course from its URL on refresh/deep link.
  useEffect(() => {
    const match = location.pathname.match(/^\/courses\/([^/]+)\/learn\/?$/);
    if (match) setActiveTab('catalog');
    if (!match) {
      if (selectedCourse) setSelectedCourse(null);
      setCourseRouteLoading(false);
      return;
    }

    const routeCourseId = decodeURIComponent(match[1]);
    if (selectedCourse && String(selectedCourse.id || selectedCourse.courseId) === routeCourseId) return;

    let cancelled = false;
    setCourseRouteLoading(true);
    courseService.getCourseById(routeCourseId)
      .then(fullCourse => {
        if (cancelled) return;
        if (!fullCourse) throw new Error('Course not found');
        setSelectedCourse(fullCourse);
        setSelectedCourseDetails(null);
      })
      .catch(error => {
        if (!cancelled) {
          console.error('Restore course from URL failed:', error);
          setSelectedCourse(null);
        }
      })
      .finally(() => { if (!cancelled) setCourseRouteLoading(false); });

    return () => { cancelled = true; };
  }, [location.pathname]);


  useEffect(() => {
    const courseTitle = selectedCourse?.title || selectedCourse?.courseTitle;
    if (courseTitle && /^\/courses\/[^/]+\/learn\/?$/i.test(location.pathname)) {
      document.title = resolvePageTitle(location.pathname, { courseTitle });
    }
  }, [selectedCourse, location.pathname]);

  const [activeQuiz, setActiveQuiz] =
    useState(null);

  const [activeCert, setActiveCert] =
    useState(null);

  const [showCertModal, setShowCertModal] =
    useState(false);

  const [certVerificationData, setCertVerificationData] =
    useState(null);

  const [selectedDraftId, setSelectedDraftId] =
    useState(null);

  const [draftsRefreshKey, setDraftsRefreshKey] =
    useState(0);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleWindowResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth > 768 && mobileNavOpen) {
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [mobileNavOpen]);


  /* =========================================================
     KEEP ACTIVE TAB SYNCHRONIZED WITH URL

     IMPORTANT:
     This hook must run BEFORE any conditional return.
  ========================================================== */

  useEffect(() => {
    const currentTab =
      pathToTab[location.pathname];
    if (currentTab) {
      setActiveTab(currentTab);
    } else if (location.pathname.startsWith('/courses/')) {
      setActiveTab('catalog');
    }
  }, [location.pathname]);


  /* =========================================================
     AUTHENTICATION
  ========================================================== */

  if (!isAuthenticated || !user) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (user.mustChangePassword) {
    return (
      <div
        className="app-container"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <PasswordModal forceChange={true} />
      </div>
    );
  }


  /* =========================================================
     TAB NAVIGATION
  ========================================================== */

  const handleTabChange = (tab) => {

    setSelectedCourse(null);
    setSelectedCourseDetails(null);

    setActiveTab(tab);

    /*
     * Dashboard navigation is always role-specific.
     */
    if (tab === 'dashboard') {

      navigate(
        getDashboardPath(user.role)
      );

      return;
    }

    const path =
      tabToPath[tab] ||
      getDashboardPath(user.role);

    navigate(path);
  };


  /* =========================================================
     COURSE HANDLERS
  ========================================================== */

  const handleSelectCourse = async (course, options = {}) => {

    try {

      const courseCode =
        course.id ||
        course.courseId;

      const fullCourse =
        await courseService.getCourseById(
          courseCode
        );

      if (!fullCourse) {

        throw new Error(
          'Unable to load course details.'
        );
      }

      setSelectedCourse({
        ...fullCourse,
        reviewMode: Boolean(
          options.reviewMode ||
          course.reviewMode ||
          course.enrollmentStatus === 'COMPLETED' ||
          course.status === 'COMPLETED' ||
          fullCourse.enrollmentStatus === 'COMPLETED' ||
          fullCourse.status === 'COMPLETED'
        )
      });
      navigate(`/courses/${encodeURIComponent(fullCourse.id || fullCourse.courseId || courseCode)}/learn`);

    } catch (error) {

      console.error(
        'Open course error:',
        error
      );

      alert(
        error.message ||
        'Unable to open course.'
      );
    }
  };


  const handleOpenCourseDetails = (course) => {
    if (!course) return;
    const courseCode = course.id || course.courseId || course.dbId;
    if (courseCode) {
      setSelectedCourse(null);
      setSelectedCourseDetails(null);
      navigate(`/courses/${encodeURIComponent(courseCode)}/overview`);
    }
  };


  const handleStartLearning = async (
    course
  ) => {

    try {

      const courseCode =
        course.id ||
        course.courseId;

      const courseDbId =
        course.dbId;

      /*
       * Already enrolled.
       */
      if (course.enrollmentDbId) {

        const fullCourse =
          await courseService.getCourseById(
            courseCode
          );

        if (!fullCourse) {

          throw new Error(
            'Unable to load course details.'
          );
        }

        setSelectedCourse(
          fullCourse
        );
        navigate(`/courses/${encodeURIComponent(fullCourse.id || fullCourse.courseId || courseCode)}/learn`);

        setSelectedCourseDetails(
          null
        );

        return;
      }


      /*
       * New enrollment.
       */
      const enrolledCourse =
        await enrollmentService.enrollInCourse(
          courseDbId
        );

      if (
        !enrolledCourse ||
        enrolledCourse.success === false
      ) {

        throw new Error(
          enrolledCourse?.error ||
          'Unable to enroll in this course.'
        );
      }


      const fullCourse =
        await courseService.getCourseById(
          courseCode
        );

      if (!fullCourse) {

        throw new Error(
          'Enrollment succeeded, but course details could not be loaded.'
        );
      }


      setSelectedCourse(
        fullCourse
      );
      navigate(`/courses/${encodeURIComponent(fullCourse.id || fullCourse.courseId || courseCode)}/learn`);

      setSelectedCourseDetails(
        null
      );

    } catch (error) {

      console.error(
        'Start learning error:',
        error
      );

      alert(
        error.message ||
        'Unable to start the course.'
      );
    }
  };


  /* =========================================================
     QUIZ HANDLERS
  ========================================================== */

  const handleStartQuiz = (
    quiz
  ) => {

    setActiveQuiz(
      quiz
    );
  };


  /* =========================================================
     CERTIFICATE HANDLERS
  ========================================================== */

  const handlePassCertificate = (
    certData
  ) => {

    setCertVerificationData(
      null
    );

    setActiveCert(
      certData
    );

    setShowCertModal(
      true
    );
  };


  const handleOpenVerifiedCertificate = (
    cert,
    verificationData
  ) => {

    setActiveCert(
      cert
    );

    setCertVerificationData(
      verificationData
    );

    setShowCertModal(
      true
    );
  };


  /* =========================================================
     RENDER PAGE CONTENT
  ========================================================== */

  const renderContent = () => {

    /* -----------------------------------------
       HR DEPARTMENT / COURSE DETAIL PAGES
       These pages are rendered in their own full-page layout.
    ------------------------------------------ */

    if (location.pathname.startsWith('/hr/departments/')) {

      if (location.pathname.includes('/courses/')) {
        return <DepartmentCourseEmployees />;
      }

      return <DepartmentDetails />;
    }

    /* -----------------------------------------
       HR DEDICATED PAGES
    ------------------------------------------ */

    if (
      location.pathname === '/hr/overview' ||
      location.pathname === '/admin' ||
      location.pathname === '/hr'
    ) {
      return (
        <HrAdminDashboard
          onOpenVerifiedCertificate={handleOpenVerifiedCertificate}
        />
      );
    }

    if (location.pathname === '/hr/employees') {
      return (
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <EmployeeManagement />
        </div>
      );
    }

    if (location.pathname === '/hr/departments') {
      return (
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <DepartmentManagement />
        </div>
      );
    }

    if (location.pathname === '/hr/courses') {
      return <HrCoursesPage />;
    }

    if (location.pathname === '/hr/drafts') {
      return <HrDraftsPage />;
    }

    if (location.pathname === '/hr/reports') {
      return (
        <div style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <ReportsView currentRole="HR_ADMIN" embedded={true} />
        </div>
      );
    }

    if (location.pathname === '/hr/certificates') {
      return (
        <HrCertificatesPage
          onViewCertificate={handleOpenVerifiedCertificate}
        />
      );
    }

    if (location.pathname === '/hr/announcements') {
      return <HrAnnouncementsPage />;
    }

    if (location.pathname === '/hr/settings') {
      return <HrSettingsPage />;
    }

    if (location.pathname === '/hr/policies') {
      if (String(user?.role || '').toUpperCase() !== 'HR_ADMIN' && String(user?.role || '').toUpperCase() !== 'SUPER_ADMIN') {
        return <Unauthorized />;
      }
      return <PolicyHrManagement />;
    }

    if (location.pathname === '/manager/policies') {
      if (String(user?.role || '').toUpperCase() !== 'MANAGER') {
        return <Unauthorized />;
      }
      return <PolicyManagerManagement />;
    }

    /* -----------------------------------------
       COURSE OVERVIEW PAGE
    ------------------------------------------ */
    const overviewMatch = location.pathname.match(/^\/courses\/([^/]+)(?:\/overview)?\/?$/);
    const isLearnPath = Boolean(location.pathname.match(/^\/courses\/([^/]+)\/learn\/?$/));
    if (!isLearnPath && overviewMatch && overviewMatch[1] && overviewMatch[1] !== 'courses') {
      const overviewCourseId = decodeURIComponent(overviewMatch[1]);
      return (
        <ErrorBoundary
          title="Course Overview Error"
          onReset={() => {
            navigate('/dashboard');
          }}
        >
          <CourseOverviewPage
            courseId={overviewCourseId}
            onStartLearning={(courseToStart) => {
              handleSelectCourse(courseToStart || { id: overviewCourseId, courseId: overviewCourseId });
            }}
            onViewCertificate={() => {
              setActiveTab('certificates');
              navigate('/certificates');
            }}
            onBackToDashboard={(returnedCourseId) => {
              setActiveTab('dashboard');
              navigate('/dashboard', {
                state: {
                  returnedFromCourseId: returnedCourseId || overviewCourseId,
                  fromCarouselIndex: location.state?.fromCarouselIndex
                }
              });
            }}
            onBackToCatalog={() => {
              setActiveTab('catalog');
              navigate('/courses');
            }}
          />
        </ErrorBoundary>
      );
    }

    /* -----------------------------------------
       COURSE VIEWER
    ------------------------------------------ */

    if (courseRouteLoading && !selectedCourse) {
      return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading course…</div>;
    }

    if (selectedCourse) {

      return (
        <ErrorBoundary
          title="Course Viewer Error"
          onReset={() => {
            setSelectedCourse(null);
            navigate('/courses');
          }}
        >
          <CourseViewer
            course={selectedCourse}

            onBack={() => {
              setSelectedCourse(null);
              navigate('/courses');
            }}

            onStartQuiz={
              handleStartQuiz
            }
          />
        </ErrorBoundary>
      );
    }


    if (activeTab === 'allCourses') {
      return <ManagerAllCourses />;
    }

    if (activeTab === 'notifications') {
      return <NotificationsPage />;
    }

    if (activeTab === 'profile' || location.pathname === '/profile') {
      return <ProfilePage />;
    }

    /* -----------------------------------------
       COURSE CATALOG
    ------------------------------------------ */

    if (
      activeTab === 'catalog'
    ) {

      return (
        <CourseCatalog
          onSelectCourse={
            handleSelectCourse
          }

          onOpenCourseDetails={
            handleOpenCourseDetails
          }
        />
      );
    }
/* -----------------------------------------
       TRAINING CALENDAR
    ------------------------------------------ */

    if (
      activeTab === 'calendar'
    ) {

      return (
        <TrainingCalendar />
      );
    }


    /* -----------------------------------------
       REPORTS
    ------------------------------------------ */

    if (
      activeTab === 'reports'
    ) {

      return (
        <ReportsView
          currentRole={
            user.role
          }
        />
      );
    }

    /* -----------------------------------------
      CERTIFICATES
    ------------------------------------------ */

    if (
      activeTab === 'certificates'
    ) {

      return (
        <CertificatesPage

          onViewCertificate={
            handlePassCertificate
          }
        />
      );
    }

    /* -----------------------------------------
       MY LEARNING
    ------------------------------------------ */

    if (
      activeTab === 'mylearning'
    ) {

      return (
        <MyLearning

          onSelectCourse={
            handleSelectCourse
          }

          onOpenCertificates={() =>
            setShowCertModal(true)
          }

          onOpenCourseDetails={
            handleOpenCourseDetails
          }

        />
      );
    }

    /* -----------------------------------------
       DRAFTS
    ------------------------------------------ */

    if (activeTab === 'drafts') {
      const normalizedRole = String(user?.role || '').toUpperCase();
      if (normalizedRole !== 'HR_ADMIN' && normalizedRole !== 'TRAINER') {
        return <Unauthorized />;
      }
      return (
    <>
      <Drafts
        refreshKey={draftsRefreshKey}
        onCreateDraft={() => setSelectedDraftId('NEW_DRAFT')}
        onOpenDraft={(draft) => {
          const draftId = draft.courseId || draft.id;

          if (!draftId) {
            alert('This draft has no course ID.');
            return;
          }

          setSelectedDraftId(String(draftId));
        }}
      />

      {selectedDraftId && (
        <CourseBuilderModal
          key={selectedDraftId}
          courseId={selectedDraftId === 'NEW_DRAFT' ? '' : selectedDraftId}
          onClose={() => {
            setSelectedDraftId(null);
            setDraftsRefreshKey((k) => k + 1);
          }}
          onPublish={() => {
            setSelectedDraftId(null);
            setDraftsRefreshKey((k) => k + 1);
          }}
        />
      )}
      </>
      );
    }

    /* -----------------------------------------
       ROLE DASHBOARD
    ------------------------------------------ */

    switch (
      String(
        user.role || ''
      ).toUpperCase()
    ) {

      case 'TRAINER':

        return (
          <TrainerDashboard
            onSelectCourse={
              handleSelectCourse
            }
          />
        );


      case 'MANAGER':

        return (
          <ManagerDashboard
            onOpenVerifiedCertificate={
              handleOpenVerifiedCertificate
            }
          />
        );


      case 'HR_ADMIN':

        return (
          <HrAdminDashboard
            onOpenVerifiedCertificate={
              handleOpenVerifiedCertificate
            }
          />
        );


      case 'EMPLOYEE':

      default:

        return (
          <Overview

  onSelectCourse={
    handleSelectCourse
  }

  onOpenCertificates={() =>
    handleTabChange('certificates')
  }

  setActiveTab={
    handleTabChange
  }

  onOpenCourseDetails={
    handleOpenCourseDetails
  }

/>
        );
    }
  };


  /* =========================================================
     MAIN LAYOUT
  ========================================================== */

  /*
   * Department detail pages are intentionally rendered outside the
   * global KMS header/sidebar shell. The page owns its complete layout.
   */
  if (location.pathname.startsWith('/hr/departments/')) {
    return renderContent();
  }

  return (
    <div className="app-container">
      <div className="app-main-layout">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            handleTabChange(tab);
            setMobileNavOpen(false);
          }}
          onOpenCertificates={() => {
            handleTabChange('certificates');
            setMobileNavOpen(false);
          }}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <div className="app-workspace-column">
          <Header
            activeTab={activeTab}
            onOpenCertificates={() => handleTabChange('certificates')}
            onOpenNotifications={() => handleTabChange('notifications')}
            onNavigateHome={() => handleTabChange('dashboard')}
            onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
          />

          <main className="main-content">
            {renderContent()}
          </main>

          {!location.pathname.endsWith('/learn') && (
            <FairmacsFooter
              variant="dashboard"
              role={user?.role}
              onNavigate={(path) => {
                navigate(path);
                window.scrollTo({ top: 0, behavior: 'auto' });
              }}
            />
          )}
        </div>
      </div>





      {/* =====================================================
          QUIZ MODAL
      ====================================================== */}

      {activeQuiz && (

        <QuizModal

          quiz={
            activeQuiz
          }

          onClose={() =>
            setActiveQuiz(
              null
            )
          }

          onPassCertificate={
            handlePassCertificate
          }

        />

      )}


      {/* =====================================================
          CERTIFICATE VIEWER
      ====================================================== */}

      {showCertModal && (

        <CertificateViewer

          certificate={
            activeCert
          }

          onClose={() => {

            setShowCertModal(
              false
            );

            setCertVerificationData(
              null
            );

          }}

          verificationData={
            certVerificationData
          }

        />

      )}

    </div>
  );
}


/* =========================================================
   APPLICATION ROUTER
========================================================= */

export default function App() {

  return (

    <Router>

      <PageTitleManager />

      <AuthProvider>

        <Routes>

          {/* =================================================
              PUBLIC HOMEPAGE
          ================================================= */}

          <Route
            path="/"
            element={
              <PublicHome />
            }
          />


          {/* =================================================
              LOGIN
          ================================================= */}

          <Route
            path="/login"
            element={
              <Login />
            }
          />


          {/* =================================================
              UNAUTHORIZED
          ================================================= */}

          <Route
            path="/unauthorized"
            element={
              <Unauthorized />
            }
          />


          {/* =================================================
              EMPLOYEE DASHBOARD
          ================================================= */}

          <Route
            path="/dashboard"
            element={

              <RoleRoute
                allowedRoles={[
                  'EMPLOYEE'
                ]}
              >

                <MainApp />

              </RoleRoute>

            }
          />


          {/* =================================================
              TRAINER DASHBOARD
          ================================================= */}

          <Route
            path="/trainer"
            element={

              <RoleRoute
                allowedRoles={[
                  'TRAINER'
                ]}
              >

                <MainApp />

              </RoleRoute>

            }
          />


          {/* =================================================
              MANAGER DASHBOARD
          ================================================= */}

          <Route
            path="/manager"
            element={

              <RoleRoute
                allowedRoles={[
                  'MANAGER'
                ]}
              >

                <MainApp />

              </RoleRoute>

            }
          />


          {/* =================================================
              HR / ADMIN DASHBOARD
          ================================================= */}

          <Route
            path="/manager/all-courses"
            element={
              <RoleRoute allowedRoles={['MANAGER']}>
                <MainApp />
              </RoleRoute>
            }
          />

          <Route
            path="/manager/policies"
            element={
              <RoleRoute allowedRoles={['MANAGER']}>
                <MainApp />
              </RoleRoute>
            }
          />

          {/* =================================================
              HR / ADMIN DEDICATED ROUTES
          ================================================= */}

          <Route
            path="/admin"
            element={<Navigate to="/hr/overview" replace />}
          />

          <Route
            path="/hr"
            element={<Navigate to="/hr/overview" replace />}
          />

          <Route
            path="/hr/overview"
            element={
              <RoleRoute allowedRoles={['HR_ADMIN']}>
                <MainApp />
              </RoleRoute>
            }
          />

          <Route
            path="/hr/employees"
            element={
              <RoleRoute allowedRoles={['HR_ADMIN']}>
                <MainApp />
              </RoleRoute>
            }
          />

          <Route
            path="/hr/departments"
            element={
              <RoleRoute allowedRoles={['HR_ADMIN']}>
                <MainApp />
              </RoleRoute>
            }
          />

          <Route
            path="/hr/courses"
            element={
              <RoleRoute allowedRoles={['HR_ADMIN']}>
                <MainApp />
              </RoleRoute>
            }
          />

          <Route
            path="/hr/drafts"
            element={
              <RoleRoute allowedRoles={['HR_ADMIN']}>
                <MainApp />
              </RoleRoute>
            }
          />

          <Route
            path="/hr/reports"
            element={
              <RoleRoute allowedRoles={['HR_ADMIN']}>
                <MainApp />
              </RoleRoute>
            }
          />

          <Route
            path="/hr/certificates"
            element={
              <RoleRoute allowedRoles={['HR_ADMIN']}>
                <MainApp />
              </RoleRoute>
            }
          />

          <Route
            path="/hr/announcements"
            element={
              <RoleRoute allowedRoles={['HR_ADMIN']}>
                <MainApp />
              </RoleRoute>
            }
          />

          <Route
            path="/hr/settings"
            element={
              <RoleRoute allowedRoles={['HR_ADMIN']}>
                <MainApp />
              </RoleRoute>
            }
          />

          <Route
            path="/hr/policies"
            element={
              <RoleRoute allowedRoles={['HR_ADMIN', 'SUPER_ADMIN']}>
                <MainApp />
              </RoleRoute>
            }
          />


          {/* =================================================
              EMPLOYEE PROGRESS
          ================================================= */}

          <Route
            path="/progress"
            element={

              <RoleRoute
                allowedRoles={[
                  'EMPLOYEE'
                ]}
              >

                <MainApp />

              </RoleRoute>

            }
          />


          {/* =================================================
              COURSE CATALOG
              All authenticated roles
          ================================================= */}

          <Route
            path="/courses/:courseId/learn"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/:courseId/overview"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />

          <Route
            path="/courses"
            element={

              <ProtectedRoute>

                <MainApp />

              </ProtectedRoute>

            }
          />


          {/* =================================================
              TRAINING CALENDAR
              All authenticated roles
          ================================================= */}

          <Route
            path="/training-calendar"
            element={

              <ProtectedRoute>

                <MainApp />

              </ProtectedRoute>

            }
          />


          {/* =================================================
              REPORTS
              Trainer / Manager / HR Admin
          ================================================= */}

          <Route
            path="/reports"
            element={

              <RoleRoute
                allowedRoles={[
                  'EMPLOYEE',
                  'TRAINER',
                  'MANAGER',
                  'HR_ADMIN'
                ]}
              >

                <MainApp />

              </RoleRoute>

            }
          />
          {/* =================================================
              CERTIFICATES
              Authenticated users
            ================================================= */}

          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <MainApp />
              </ProtectedRoute>
            }
          />
          {/* =================================================
              DRAFTS
          ===================================================*/}

          <Route
            path="/drafts"
            element={
              <RoleRoute allowedRoles={['TRAINER', 'HR_ADMIN']}>
                <MainApp />
              </RoleRoute>
            }
          />
          {/* =================================================
              HR DEPARTMENT DETAILS
          ================================================= */}

          <Route
            path="/hr/departments/:departmentId"
            element={
              <RoleRoute
                allowedRoles={[
                  'HR_ADMIN'
                ]}
              >
                <MainApp />
              </RoleRoute>
            }
          />

          {/* =================================================
              HR DEPARTMENT COURSE EMPLOYEES
          ================================================= */}

          <Route
            path="/hr/departments/:departmentId/courses/:courseId"
            element={
              <RoleRoute
                allowedRoles={[
                  'HR_ADMIN'
                ]}
              >
                <MainApp />
              </RoleRoute>
            }
          />


          {/* =================================================
              UNKNOWN ROUTES
          ================================================= */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>

      </AuthProvider>

    </Router>
  );
}