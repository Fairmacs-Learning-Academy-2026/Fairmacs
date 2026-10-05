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
import HrAdminDashboard from './components/HrAdminDashboard';
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
  certificates: '/certificates'
};


const pathToTab = {
  '/dashboard': 'dashboard',
  '/trainer': 'dashboard',
  '/manager': 'dashboard',
  '/admin': 'dashboard',

  '/courses': 'catalog',
  '/progress': 'mylearning',
  '/learning-paths': 'paths',
  '/training-calendar': 'calendar',
  '/reports': 'reports',
  '/certificates': 'certificates'
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
    useState('dashboard');

  const [selectedCourse, setSelectedCourse] =
    useState(null);

  const [selectedCourseDetails, setSelectedCourseDetails] =
    useState(null);

  const [activeQuiz, setActiveQuiz] =
    useState(null);

  const [activeCert, setActiveCert] =
    useState(null);

  const [showCertModal, setShowCertModal] =
    useState(false);

  const [certVerificationData, setCertVerificationData] =
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


  const handleOpenCourseDetails = (
    course
  ) => {

    setSelectedCourseDetails(
      course
    );
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
       COURSE VIEWER
    ------------------------------------------ */

    if (selectedCourse) {

      return (
        <CourseViewer
          course={selectedCourse}

          onBack={() =>
            setSelectedCourse(null)
          }

          onStartQuiz={
            handleStartQuiz
          }
        />
      );
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