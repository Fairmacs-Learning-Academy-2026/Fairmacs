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
import Overview from './components/Overview';
import MyLearning from './components/MyLearning';
import TrainerDashboard from './components/TrainerDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import ManagerAllCourses from './components/ManagerAllCourses';
import HrAdminDashboard from './components/HrAdminDashboard';
import DepartmentDetails from './components/DepartmentDetails';
import DepartmentCourseEmployees from './components/DepartmentCourseEmployees';
import CourseCatalog from './components/CourseCatalog';
import CourseViewer from './components/CourseViewer';
import CourseDetailsModal from './components/CourseDetailsModal';
import QuizModal from './components/QuizModal';
import CertificateViewer from './components/CertificateViewer';
import CertificatesPage from './components/CertificatesPage';
import LearningPaths from './components/LearningPaths';
import TrainingCalendar from './components/TrainingCalendar';
import ReportsView from './components/ReportsView';
import Login from './components/Login';
import Unauthorized from './components/Unauthorized';
import Drafts from './components/Drafts';
import CourseBuilderModal from './components/CourseBuilderModal';


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
  paths: '/learning-paths',
  calendar: '/training-calendar',
  reports: '/reports',
  certificates: '/certificates',
  drafts: '/drafts',
  allCourses: '/manager/all-courses',
};


const pathToTab = {
  '/dashboard': 'dashboard',
  '/trainer': 'dashboard',
  '/manager': 'dashboard',
  '/manager/all-courses': 'allCourses',
  '/admin': 'dashboard',

  '/courses': 'catalog',
  '/progress': 'mylearning',
  '/learning-paths': 'paths',
  '/training-calendar': 'calendar',
  '/reports': 'reports',
  '/certificates': 'certificates',
  '/drafts': 'drafts',
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
      return '/admin';

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

  const handleSelectCourse = async (course) => {

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

      setSelectedCourse(
        fullCourse
      );
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


  const handleOpenCourseDetails = async (
    course
  ) => {

    if (!course) return;

    try {
      /*
       * Course catalog and My Learning use the lightweight
       * CourseDTO summary. Fetch the detail DTO before opening
       * the overview modal so modules and lessons are available.
       */
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

      setSelectedCourseDetails(
        fullCourse
      );

    } catch (error) {

      console.error(
        'Open course details error:',
        error
      );

      alert(
        error.message ||
        'Unable to load course details.'
      );
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
       COURSE VIEWER
    ------------------------------------------ */

    if (courseRouteLoading && !selectedCourse) {
      return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading course…</div>;
    }

    if (selectedCourse) {

      return (
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
      );
    }


    if (activeTab === 'allCourses') {
      return <ManagerAllCourses />;
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
       LEARNING PATHS
    ------------------------------------------ */

    if (
      activeTab === 'paths'
    ) {

      return (
        <LearningPaths />
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
      return (
    <>
      <Drafts
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
          courseId={selectedDraftId}
          onClose={() => setSelectedDraftId(null)}
          onPublish={() => {
            setSelectedDraftId(null);
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

      <Header

  onOpenCertificates={() =>
    handleTabChange('certificates')
  }

  onNavigateHome={() =>
    handleTabChange(
      'dashboard'
    )
  }

/>


      <div className="app-main-layout">

        <Sidebar

  activeTab={
    activeTab
  }

  setActiveTab={
    handleTabChange
  }

  onOpenCertificates={() =>
    handleTabChange('certificates')
  }

/>


        <main className="main-content">

          {renderContent()}

        </main>

      </div>


      {/* =====================================================
          COURSE DETAILS MODAL
      ====================================================== */}

      {selectedCourseDetails && (

        <CourseDetailsModal

          course={
            selectedCourseDetails
          }

          onClose={() =>
            setSelectedCourseDetails(
              null
            )
          }

          onStartLearning={
            handleStartLearning
          }

        />

      )}


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
            path="/admin"
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
            path="/courses"
            element={

              <ProtectedRoute>

                <MainApp />

              </ProtectedRoute>

            }
          />


          {/* =================================================
              LEARNING PATHS
              All authenticated roles
          ================================================= */}

          <Route
            path="/learning-paths"
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