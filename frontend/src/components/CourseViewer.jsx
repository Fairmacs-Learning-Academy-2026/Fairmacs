import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Award,
  Bookmark,
  Edit3,
  ChevronRight,
  ChevronLeft,
  Check,
  Circle,
  Lock,
  Clock3
} from 'lucide-react';
import { enrollmentService } from '../services/enrollmentService';
import { useAuth } from '../context/AuthContext';
import { renderAsync } from 'docx-preview';

export default function CourseViewer({
  course,
  onBack,
  onStartQuiz
}) {
  const { user } = useAuth();

  const roleValues = [
    user?.role,
    user?.roleName,
    user?.userRole,
    ...(Array.isArray(user?.roles) ? user.roles : []),
    ...(Array.isArray(user?.authorities) ? user.authorities : [])
  ]
    .filter(Boolean)
    .map(role => String(typeof role === 'object' ? (role.authority ?? role.name ?? role.role ?? '') : role)
      .replace(/^ROLE_/, '')
      .toUpperCase()
      .replace(/[\s-]+/g, '_'));

  const isHrAdmin = roleValues.some(role =>
    ['HR_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(role)
  );

  const allLessons = useMemo(() => {
    return Array.isArray(course?.modules)
      ? course.modules.flatMap(module =>
          Array.isArray(module.lessons) ? module.lessons : []
        )
      : [];
  }, [course]);

  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState({});
  const [lessonProgress, setLessonProgress] = useState({});
  const [bookmarkedLessons, setBookmarkedLessons] = useState({});
  const [notesText, setNotesText] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);

  const activeLesson =
    allLessons[currentLessonIndex] ||
    allLessons[0];

  const lessonType = String(
    activeLesson?.type || ''
  ).toLowerCase();

  const isDocumentLesson = [
    'pdf',
    'document',
    'docx',
    'word'
  ].includes(lessonType);

  // The endpoint expects the lesson's business ID,
  // not the numeric database ID used by progress tracking.
  const documentLessonId =
    activeLesson?.lessonId ??
    activeLesson?.id ??
    '';
  const [documentBlob, setDocumentBlob] = useState(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentContentType, setDocumentContentType] = useState('');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const docxContainerRef = useRef(null);
  const youtubeIframeRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubeCompletionHandledRef = useRef(false);

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:8080/api';


  const [moduleQuizzes, setModuleQuizzes] = useState([]);
  const [finalQuiz, setFinalQuiz] = useState(null);
  const [quizLoadError, setQuizLoadError] = useState('');
  const [pendingModuleQuiz, setPendingModuleQuiz] = useState(null);
  const [quizUnlockStatuses, setQuizUnlockStatuses] = useState({});
  const [countdownNow, setCountdownNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    const courseDbId = course?.dbId ?? course?.courseDbId ?? course?.id;
    if (!courseDbId) { setModuleQuizzes([]); setFinalQuiz(null); return; }
    const token = localStorage.getItem('fairmacs_token') || '';
    fetch(`${API_BASE_URL}/quizzes/course/${encodeURIComponent(courseDbId)}`, {
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    }).then(async response => {
      if (!response.ok) throw new Error(`Quiz list request failed (${response.status})`);
      return response.json();
    }).then(data => {
      if (!cancelled) {
        const quizzes = Array.isArray(data) ? data : [];
        setModuleQuizzes(quizzes.filter(q => String(q.type || '').toUpperCase() === 'MODULE'));
        setFinalQuiz(quizzes.find(q => ['FINAL', 'FINAL_ASSESSMENT', 'COURSE'].includes(String(q.type || '').toUpperCase())) || null);
        setQuizLoadError('');
      }
    }).catch(error => {
      if (!cancelled) { console.error('Load course quizzes failed:', error); setQuizLoadError('Course quizzes could not be loaded.'); }
    });
    return () => { cancelled = true; };
  }, [course?.dbId, course?.courseDbId, course?.id, API_BASE_URL]);

  // Poll unlock status from the backend and keep the countdown visually current.
  useEffect(() => {
    const timer = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const quizzes = [...moduleQuizzes, ...(finalQuiz ? [finalQuiz] : [])];
    if (!quizzes.length) return undefined;

    const loadStatuses = async () => {
      const token = localStorage.getItem('fairmacs_token') ||
        localStorage.getItem('fairmacs_lms_token') ||
        localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
      const entries = await Promise.all(quizzes.map(async quiz => {
        const id = quiz?.dbId ?? quiz?.id ?? quiz?.quizId;
        if (!id) return null;
        try {
          const response = await fetch(`${API_BASE_URL}/quizzes/${encodeURIComponent(id)}/unlock-status`, {
            headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
          });
          if (!response.ok) throw new Error(`Unlock status request failed (${response.status})`);
          return [String(id), await response.json()];
        } catch (error) {
          console.warn(`Could not load unlock status for quiz ${id}:`, error);
          return null;
        }
      }));
      if (!cancelled) {
        setQuizUnlockStatuses(previous => {
          const next = { ...previous };
          entries.filter(Boolean).forEach(([id, status]) => { next[id] = status; });
          return next;
        });
      }
    };

    loadStatuses();
    const refresh = window.setInterval(loadStatuses, 30000);
    return () => { cancelled = true; window.clearInterval(refresh); };
  }, [moduleQuizzes, finalQuiz, API_BASE_URL]);

  const getQuizCooldown = quiz => {
    const id = quiz?.dbId ?? quiz?.id ?? quiz?.quizId;
    const status = id == null ? null : quizUnlockStatuses[String(id)];
    const retryAt = status?.retryAvailableAt ? new Date(status.retryAvailableAt).getTime() : NaN;
    const remaining = Number.isFinite(retryAt)
      ? Math.max(0, Math.ceil((retryAt - countdownNow) / 1000))
      : Math.max(0, Number(status?.remainingSeconds || 0));
    return { active: Boolean(status?.cooldownActive) && remaining > 0, remaining, retryAt, status };
  };

  const formatCountdown = totalSeconds => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
  };

  const formatRetryTime = timestamp => Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'after the cooldown ends';

  const openQuiz = (targetQuiz, preview = false, moduleTitle = null) => {
  const rawQuizId = targetQuiz?.dbId ?? targetQuiz?.id ?? targetQuiz?.quizId;
  const quizDbId = Number(rawQuizId);

  if (!targetQuiz || !Number.isSafeInteger(quizDbId) || quizDbId <= 0) {
    alert('A valid quiz database ID is unavailable. Please refresh and try again.');
    return;
  }

  const courseDbId = Number(course?.dbId ?? course?.courseDbId);

  if (!Number.isSafeInteger(courseDbId) || courseDbId <= 0) {
    alert('A valid course database ID is unavailable. Please refresh and try again.');
    return;
  }

  onStartQuiz({
    ...targetQuiz,
    id: quizDbId,
    dbId: quizDbId,
    quizId: targetQuiz?.quizId ?? quizDbId,
    courseId: courseDbId,
    courseTitle: course.title,
    ...(moduleTitle ? { moduleTitle } : {}),
    ...(preview ? { previewMode: true } : {})
  });
};

  const getNumericModuleId = module => {
  const id = module?.dbId;

  if (id == null || id === '' || !Number.isFinite(Number(id))) {
    return null;
  }

  return Number(id);
};



  /*
   * Reset local viewer state whenever a different course is opened.
   * This prevents progress from the previous course leaking into
   * the newly selected course.
   */
  useEffect(() => {
    setCurrentLessonIndex(0);
    setCompletedLessons({});
    setLessonProgress({});
    setBookmarkedLessons({});
    setNotesText('');
    setActiveTab('content');
    setSavingProgress(false);
    setPendingModuleQuiz(null);
  }, [course?.dbId, course?.id]);

  /*
   * The enrollment ID is created by the backend when the employee
   * starts the course.
   */
  const [resolvedEnrollmentId, setResolvedEnrollmentId] =
    useState(
      course?.enrollmentDbId ??
        course?.enrollmentId ??
        course?.enrollment?.id ??
        null
    );

  /*
   * Keep the enrollment ID synchronized when the selected course
   * changes. useState only uses its initial value once.
   */
  useEffect(() => {
    setResolvedEnrollmentId(
      course?.enrollmentDbId ??
        course?.enrollmentId ??
        course?.enrollment?.id ??
        null
    );
  }, [
    course?.enrollmentDbId,
    course?.enrollmentId,
    course?.enrollment?.id
  ]);

  const enrollmentId = resolvedEnrollmentId;

  /*
   * ---------------------------------------------------------
   * LOAD SAVED PROGRESS FROM BACKEND
   * ---------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    const resolveEnrollmentAndProgress = async () => {
      if (allLessons.length === 0) {
        setLoadingProgress(false);
        return;
      }

      try {
        setLoadingProgress(true);

        let currentEnrollmentId =
          course?.enrollmentDbId ??
          course?.enrollmentId ??
          course?.enrollment?.id ??
          null;

        /*
         * If the course details do not contain the enrollment ID,
         * get the employee's enrollments and find this course.
         */
        if (!currentEnrollmentId) {
          const enrollments =
            await enrollmentService.getUserEnrollments();

          const courseId =
            course?.dbId ??
            course?.courseId ??
            course?.id;

          const matchingEnrollment =
            Array.isArray(enrollments)
              ? enrollments.find(enrollment => {
                  const enrollmentCourseId =
                    enrollment?.courseId ??
                    enrollment?.course?.id ??
                    enrollment?.course?.dbId ??
                    enrollment?.course?.courseId;

                  return (
                    String(enrollmentCourseId) ===
                    String(courseId)
                  );
                })
              : null;

          currentEnrollmentId =
            matchingEnrollment?.id ??
            matchingEnrollment?.enrollmentId ??
            matchingEnrollment?.dbId ??
            matchingEnrollment?.enrollmentDbId ??
            null;
        }

        if (cancelled) return;

        if (!currentEnrollmentId) {
          console.error(
            'Unable to resolve enrollment ID for course:',
            course
          );

          setLoadingProgress(false);
          return;
        }

        setResolvedEnrollmentId(
          currentEnrollmentId
        );

        /*
         * Now load the actual lesson progress.
         */
        const progressList =
          await enrollmentService.getEnrollmentProgress(
            currentEnrollmentId
          );

        if (cancelled) return;

        const completed = {};
        const progressMap = {};

        if (Array.isArray(progressList)) {
          progressList.forEach(item => {

            /*
             * Backend progress records use the actual
             * database Lesson ID.
             */
            const lessonDbId =
              item?.lessonId ??
              item?.lesson?.id;

            if (!lessonDbId) return;

            const percent =
              Number(
                item?.completionPercent ?? 0
              );

            const completedValue =
              Boolean(item?.completed) ||
              percent >= 100;

            progressMap[lessonDbId] = {
              completionPercent: percent,
              watchedSeconds:
                Number(
                  item?.watchedSeconds ?? 0
                ),
              lastPositionSeconds:
                Number(
                  item?.lastPositionSeconds ?? 0
                ),
              completed: completedValue
            };

            if (completedValue) {
              completed[lessonDbId] = true;
            }
          });
        }

        setLessonProgress(progressMap);
        setCompletedLessons(completed);

      } catch (error) {
        console.error(
          'Failed to load lesson progress:',
          error
        );
      } finally {
        if (!cancelled) {
          setLoadingProgress(false);
        }
      }
    };

    resolveEnrollmentAndProgress();

    return () => {
      cancelled = true;
    };
  }, [
    course,
    allLessons.length
  ]);

  useEffect(() => {
  if (!isDocumentLesson || !documentLessonId) {
    setDocumentBlob(null);
    setDocumentUrl('');
    setDocumentContentType('');
    setDocumentError('');
    setDocumentLoading(false);
    return;
  }

  let cancelled = false;
  let objectUrl = '';

  const loadDocument = async () => {
    setDocumentLoading(true);
    setDocumentError('');
    setDocumentBlob(null);
    setDocumentUrl('');
    setDocumentContentType('');

    try {
      const token =
        localStorage.getItem('fairmacs_token') ||
        localStorage.getItem('fairmacs_lms_token') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        '';

      if (!token) {
        throw new Error(
          'Your session has expired. Please sign in again.'
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/lessons/${encodeURIComponent(
          documentLessonId
        )}/document`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept:
              'application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            'Authentication failed. Please sign in again.'
          );
        }

        if (response.status === 403) {
          throw new Error(
            'You do not have permission to view this document.'
          );
        }

        if (response.status === 404) {
          throw new Error(
            'No document is attached to this lesson.'
          );
        }

        throw new Error(
          `Unable to load document (HTTP ${response.status}).`
        );
      }

      const blob = await response.blob();
      const contentType = (
        response.headers.get('content-type') || blob.type || ''
      ).split(';')[0].trim().toLowerCase();

      if (cancelled) return;

      objectUrl = URL.createObjectURL(
        contentType ? new Blob([blob], { type: contentType }) : blob
      );

      setDocumentBlob(blob);
      setDocumentContentType(contentType);
      setDocumentUrl(objectUrl);
    } catch (error) {
      if (!cancelled) {
        setDocumentError(
          error.message || 'Unable to load document.'
        );
      }
    } finally {
      if (!cancelled) {
        setDocumentLoading(false);
      }
    }
  };

  loadDocument();

  return () => {
    cancelled = true;

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  };
}, [
  API_BASE_URL,
  documentLessonId,
  isDocumentLesson
]);

  useEffect(() => {
  if (
    !isDocumentLesson ||
    !documentBlob ||
    !docxContainerRef.current ||
    !(documentContentType.includes('wordprocessingml.document') ||
      lessonType.includes('docx') ||
      lessonType.includes('word'))
  ) {
    return;
  }

  let cancelled = false;
  const container = docxContainerRef.current;

  container.replaceChildren();

  const renderDocument = async () => {
    try {
      await renderAsync(
        documentBlob,
        container,
        container,
        {
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false
        }
      );
    } catch (error) {
      if (!cancelled) {
        console.error('DOCX preview failed:', error);
        setDocumentError(
          'The Word document could not be previewed.'
        );
      }
    }
  };

  renderDocument();

  return () => {
    cancelled = true;
    container.replaceChildren();
  };
}, [documentBlob, documentContentType, isDocumentLesson, lessonType]);



  /*
   * ---------------------------------------------------------
   * COURSE / LESSON SAFETY
   * ---------------------------------------------------------
   */
  if (!course) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center'
        }}
      >
        <h2>Unable to load course</h2>

        <p>
          Course details are not available.
        </p>

        <button
          className="btn-primary"
          onClick={onBack}
          style={{ marginTop: '1rem' }}
        >
          Back to Courses
        </button>
      </div>
    );
  }

  if (allLessons.length === 0) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center'
        }}
      >
        <h2>No lessons available</h2>

        <p>
          This course does not have any lessons
          loaded yet.
        </p>

        <button
          className="btn-primary"
          onClick={onBack}
          style={{ marginTop: '1rem' }}
        >
          Back to Courses
        </button>
      </div>
    );
  }

  const totalLessons = allLessons.length;

  /*
   * ---------------------------------------------------------
   * PROGRESS CALCULATION
   * ---------------------------------------------------------
   */
  const completedCount =
    Object.values(completedLessons).filter(Boolean)
      .length;

  const progressPercent =
    totalLessons > 0
      ? Math.round(
          (completedCount / totalLessons) * 100
        )
      : 0;

  /*
   * ---------------------------------------------------------
   * SAVE LESSON PROGRESS
   * ---------------------------------------------------------
   */
  const saveLessonProgress = async (
    lesson,
    completionPercent,
    watchedSeconds = 0,
    lastPositionSeconds = 0
  ) => {

    /*
     * IMPORTANT:
     * Use the actual database Lesson ID for the
     * backend progress API.
     */
    const lessonDbId =
      lesson?.dbId;

    if (!enrollmentId || !lessonDbId) {
      console.warn(
        'Cannot save progress: enrollment ID or lesson database ID is missing.',
        {
          enrollmentId,
          lessonDbId,
          lesson
        }
      );

      return;
    }

    try {
      setSavingProgress(true);

      const result =
        await enrollmentService.updateLessonProgress(
          enrollmentId,
          lessonDbId,
          completionPercent,
          watchedSeconds,
          lastPositionSeconds
        );

      const completed =
        completionPercent >= 100;

      /*
       * Store progress using the database ID.
       */
      setLessonProgress(prev => ({
        ...prev,
        [lessonDbId]: {
          completionPercent,
          watchedSeconds,
          lastPositionSeconds,
          completed
        }
      }));

      if (completed) {
        setCompletedLessons(prev => ({
          ...prev,
          [lessonDbId]: true
        }));
      } else {
        setCompletedLessons(prev => ({
          ...prev,
          [lessonDbId]: false
        }));
      }

      return true;

    } catch (error) {
      console.error(
        'Failed to save lesson progress:',
        error
      );
      alert('Lesson progress could not be saved. Please check your connection and try again.');
      return false;
    } finally {
      setSavingProgress(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * VIDEO PROGRESS
   * ---------------------------------------------------------
   */
  const handleVideoTimeUpdate = event => {
    const video = event.currentTarget;

    if (!video.duration) return;

    const percent = Math.round(
      (video.currentTime / video.duration) * 100
    );

    /*
     * Use database lesson ID for progress lookup.
     */
    const activeLessonDbId =
      activeLesson?.dbId;

    const previous =
      lessonProgress[activeLessonDbId]
        ?.completionPercent ?? 0;

    const checkpoint =
      percent >= 100 ||
      percent >= previous + 10;

    if (!checkpoint) return;

    saveLessonProgress(
      activeLesson,
      Math.min(percent, 100),
      Math.floor(video.currentTime),
      Math.floor(video.currentTime)
    );
  };

  /*
   * ---------------------------------------------------------
   * VIDEO COMPLETED
   * ---------------------------------------------------------
   */
  const completeLessonAndContinue = async (lesson, watchedSeconds = 0, lastPositionSeconds = 0) => {
    if (!lesson) return;
    const saved = await saveLessonProgress(lesson, 100, watchedSeconds, lastPositionSeconds);
    if (saved !== true) return;

    const lessonIndex = allLessons.findIndex(item =>
      String(item?.dbId ?? item?.id ?? item?.lessonId) === String(lesson?.dbId ?? lesson?.id ?? lesson?.lessonId)
    );
    if (lessonIndex < 0) return;

    // Determine the module containing this lesson and whether it is the module's final lesson.
    let offset = 0;
    let containingModule = null;
    let moduleEndIndex = -1;
    for (const module of (course?.modules || [])) {
      const lessons = Array.isArray(module.lessons) ? module.lessons : [];
      const end = offset + lessons.length - 1;
      if (lessonIndex >= offset && lessonIndex <= end) {
        containingModule = module;
        moduleEndIndex = end;
        break;
      }
      offset += lessons.length;
    }

    if (containingModule && lessonIndex === moduleEndIndex) {
  const moduleId = getNumericModuleId(containingModule);

  const moduleQuiz = moduleId == null
    ? null
    : moduleQuizzes.find(
        quiz =>
          Number(quiz.moduleId) === moduleId &&
          String(quiz.type || '').toUpperCase() === 'MODULE'
      );

  if (moduleQuiz) {
    setPendingModuleQuiz({
      quiz: moduleQuiz,
      title: containingModule.title || 'this module'
    });
    return;
  }
}

    if (lessonIndex < allLessons.length - 1) {
      setCurrentLessonIndex(lessonIndex + 1);
    }
  };

  /* VIDEO COMPLETED */
  const handleVideoEnded = async event => {
    const video = event.currentTarget;
    await completeLessonAndContinue(
      activeLesson,
      Math.floor(video.duration || video.currentTime || 0),
      Math.floor(video.duration || video.currentTime || 0)
    );
  };

  /* DOCUMENT COMPLETED */
  const handleDocumentComplete = async () => {
    await completeLessonAndContinue(activeLesson, 0, 0);
  };

  // YouTube iframe videos do not fire HTMLVideoElement's onEnded event.
  // Use the official YouTube IFrame Player API to detect the ENDED state.
  const activeVideoUrl = String(activeLesson?.assetUrl || activeLesson?.contentUrl || '');
  const activeYoutubeMatch = activeVideoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  const activeYoutubeVideoId = activeYoutubeMatch?.[1] || null;

  useEffect(() => {
    if (lessonType !== 'video' || !activeYoutubeVideoId || !youtubeIframeRef.current) return;

    let disposed = false;
    let player = null;
    youtubeCompletionHandledRef.current = false;

    const initializePlayer = () => {
      if (disposed || player || !window.YT?.Player || !youtubeIframeRef.current) return;
      try {
        player = new window.YT.Player(youtubeIframeRef.current, {
          events: {
            onStateChange: async event => {
              // YT.PlayerState.ENDED === 0. Guard against duplicate end events.
              if (event.data !== 0 || disposed || youtubeCompletionHandledRef.current) return;
              youtubeCompletionHandledRef.current = true;
              const duration = Math.floor(Number(event.target?.getDuration?.()) || 0);
              await completeLessonAndContinue(activeLesson, duration, duration);
            },
            onError: event => console.error('YouTube player error:', event.data)
          }
        });
        youtubePlayerRef.current = player;
      } catch (error) {
        console.error('Could not initialize YouTube Player API:', error);
      }
    };

    // Reuse the API if already loaded; otherwise load it once.
    if (window.YT?.Player) {
      initializePlayer();
    } else {
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      }
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === 'function') previousReady();
        initializePlayer();
      };
      // Handle API already in flight and ready callback having fired before this effect.
      const retry = window.setInterval(() => {
        if (window.YT?.Player) {
          window.clearInterval(retry);
          initializePlayer();
        }
      }, 250);
      window.setTimeout(() => window.clearInterval(retry), 15000);
    }

    return () => {
      disposed = true;
      try { player?.destroy?.(); } catch (error) { console.warn('YouTube player cleanup failed:', error); }
      if (youtubePlayerRef.current === player) youtubePlayerRef.current = null;
    };
  }, [activeYoutubeVideoId, currentLessonIndex, lessonType]);

  /*
   * ---------------------------------------------------------
   * BOOKMARK
   * ---------------------------------------------------------
   */
  const toggleBookmark = lessonId => {
    setBookmarkedLessons(prev => ({
      ...prev,
      [lessonId]: !prev[lessonId]
    }));
  };

  /*
   * ---------------------------------------------------------
   * NAVIGATION
   * ---------------------------------------------------------
   */
  const handleNext = () => {
    if (
      currentLessonIndex <
      totalLessons - 1
    ) {
      setCurrentLessonIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(prev => prev - 1);
    }
  };

  /*
   * ---------------------------------------------------------
   * SELECT LESSON
   * ---------------------------------------------------------
   */
  const handleSelectLesson = index => {
    if (
      index >= 0 &&
      index < totalLessons
    ) {
      setCurrentLessonIndex(index);
    }
  };

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */
  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}
    >

      {/* =====================================================
          TOP HEADER
      ====================================================== */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <button
            className="btn-secondary"
            onClick={onBack}
            style={{
              padding: '0.4rem 0.8rem'
            }}
          >
            <ArrowLeft
              style={{
                width: 16,
                height: 16
              }}
            />

            Back
          </button>

          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#0284c7'
              }}
            >
              {course.id} • {course.category}
            </div>

            <h1
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#0f172a'
              }}
            >
              {course.title}
            </h1>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}
        >
          <button
            className="btn-secondary"
            onClick={() => {
              if (activeLesson) {
                toggleBookmark(activeLesson.id);
              }
            }}
            style={{
              background:
                activeLesson &&
                bookmarkedLessons[activeLesson.id]
                  ? '#fef3c7'
                  : '#f8fafc',

              color:
                activeLesson &&
                bookmarkedLessons[activeLesson.id]
                  ? '#b45309'
                  : '#64748b',

              border:
                activeLesson &&
                bookmarkedLessons[activeLesson.id]
                  ? '1px solid #fcd34d'
                  : '1px solid #e2e8f0'
            }}
          >
            <Bookmark
              style={{
                width: 16,
                height: 16
              }}
            />

            {activeLesson &&
            bookmarkedLessons[activeLesson.id]
              ? 'Bookmarked'
              : 'Bookmark'}
          </button>

          <button
            className="btn-primary"
            disabled={!isHrAdmin && getQuizCooldown(finalQuiz).active}
            onClick={() => {
              if (finalQuiz?.id != null && !(!isHrAdmin && getQuizCooldown(finalQuiz).active)) {
                openQuiz(finalQuiz, false);
              } else {
                alert(
                  quizLoadError ||
                  'The final assessment database ID could not be loaded. Please refresh and try again.'
                );
              }
            }}
            style={{
              background: !isHrAdmin && getQuizCooldown(finalQuiz).active ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
              cursor: !isHrAdmin && getQuizCooldown(finalQuiz).active ? 'not-allowed' : 'pointer',
              opacity: !isHrAdmin && getQuizCooldown(finalQuiz).active ? 0.8 : 1
            }}
          >
            {!isHrAdmin && getQuizCooldown(finalQuiz).active
              ? <Lock style={{ width: 18, height: 18 }} />
              : <Award style={{ width: 18, height: 18 }} />}
            {!isHrAdmin && getQuizCooldown(finalQuiz).active ? 'Assessment Locked' : 'Take Final Assessment'}
          </button>
          {!isHrAdmin && getQuizCooldown(finalQuiz).active && (
            <div style={{ border: '1px solid #fecaca', background: 'linear-gradient(135deg,#fff7ed,#fff1f2)', borderRadius: 12, padding: '0.85rem', color: '#9f1239' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '.82rem' }}><Clock3 size={17} /> Retry cooldown active</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', margin: '.35rem 0' }}>{formatCountdown(getQuizCooldown(finalQuiz).remaining)}</div>
              <div style={{ fontSize: '.75rem', lineHeight: 1.45 }}>You can retry at {formatRetryTime(getQuizCooldown(finalQuiz).retryAt)}. The assessment unlocks automatically when the timer ends.</div>
            </div>
          )}

          {isHrAdmin && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                if (finalQuiz?.id != null) {
                  openQuiz(finalQuiz, true);
                } else {
                  alert(
                    quizLoadError ||
                    'The final assessment database ID could not be loaded. Please refresh and try again.'
                  );
                }
              }}
              style={{ border: '1px solid #93c5fd', color: '#1d4ed8', background: '#eff6ff' }}
            >
              Preview Final Assessment
            </button>
          )}
        </div>
      </div>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1fr 340px',
          gap: '1.5rem'
        }}
      >

        {/* ===================================================
            LEFT SIDE
        ==================================================== */}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >

          {/* =================================================
              MEDIA PLAYER
          ================================================== */}

          <div
            style={{
              background: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              color: 'white',
              position: 'relative'
            }}
          >

            {lessonType === 'video' ? (() => {
              const sourceUrl = activeLesson.assetUrl || activeLesson.contentUrl || '';
              const youtubeMatch = String(sourceUrl).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
              if (youtubeMatch) {
                const videoId = youtubeMatch[1];
                return <iframe
                  key={activeLesson.dbId ?? activeLesson.id ?? videoId}
                  ref={youtubeIframeRef}
                  id={`youtube-player-${String(activeLesson.dbId ?? activeLesson.id ?? currentLessonIndex).replace(/[^a-zA-Z0-9_-]/g, '-')}`}
                  title={activeLesson.title || 'Training video'}
                  src={`https://www.youtube.com/embed/${videoId}?controls=1&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&cc_load_policy=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  style={{ width: '100%', height: '420px', border: 0, background: '#000' }}
                />;
              }
              if (sourceUrl.trim()) {
                return <video
                  key={activeLesson.id}
                  controls
                  onLoadedMetadata={event => {
                    const video = event.currentTarget;
                    const savedPosition = Number(lessonProgress[activeLesson?.dbId]?.lastPositionSeconds ?? 0);
                    if (savedPosition > 0 && Number.isFinite(savedPosition) && savedPosition < video.duration) video.currentTime = savedPosition;
                  }}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                  style={{ width: '100%', maxHeight: '420px', objectFit: 'contain' }}
                  src={sourceUrl}
                >Your browser does not support HTML5 video.</video>;
              }
              return <div role="status" style={{ padding: '2rem', textAlign: 'center', color: '#cbd5e1' }}>
                Video is unavailable because this lesson has no valid video URL.
              </div>;
            })() : isDocumentLesson ? (
              <div
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  width: '100%',
                  minHeight: '400px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxSizing: 'border-box'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                      {activeLesson?.title || 'Lesson document'}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                      Private Fairmacs training document
                    </p>
                  </div>
                  {documentUrl && (
                    <a
                      href={documentUrl}
                      download={activeLesson?.title || 'Fairmacs-training-document'}
                      className="btn-secondary"
                      style={{ textDecoration: 'none' }}
                    >
                      Download document
                    </a>
                  )}
                </div>

                {documentLoading && (
                  <div role="status" style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>
                    Loading document securely…
                  </div>
                )}

                {documentError && (
                  <div
                    role="alert"
                    style={{ padding: '1rem', borderRadius: '8px', background: '#fef2f2', color: '#b91c1c' }}
                  >
                    {documentError}
                  </div>
                )}

                {!documentLoading && !documentError && documentUrl &&
                  (documentContentType === 'application/pdf' || lessonType === 'pdf') && (
                    <iframe
                      key={documentLessonId}
                      src={documentUrl}
                      title={activeLesson?.title || 'Lesson PDF'}
                      style={{
                        width: '100%',
                        height: '70vh',
                        minHeight: '500px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: '#ffffff'
                      }}
                    />
                  )}

                {!documentLoading && !documentError && documentBlob &&
                  (documentContentType.includes('wordprocessingml.document') ||
                    lessonType.includes('docx') || lessonType.includes('word')) && (
                    <div
                      ref={docxContainerRef}
                      style={{
                        width: '100%',
                        minHeight: '500px',
                        overflow: 'auto',
                        padding: '1rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxSizing: 'border-box'
                      }}
                    />
                  )}

                {!documentLoading && !documentError && !documentUrl && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    No document is attached to this lesson.
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <button
                    className="btn-primary"
                    onClick={handleDocumentComplete}
                    disabled={
                      Boolean(completedLessons[activeLesson?.dbId]) ||
                      savingProgress ||
                      documentLoading ||
                      Boolean(documentError) ||
                      !documentUrl
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: completedLessons[activeLesson?.dbId] ? '#16a34a' : '#0284c7'
                    }}
                  >
                    <Check style={{ width: 16, height: 16 }} />
                    {completedLessons[activeLesson?.dbId]
                      ? 'Completed'
                      : savingProgress
                        ? 'Saving progress…'
                        : 'Mark Lesson Complete'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '3rem',
                  textAlign: 'center',
                  margin: 'auto',
                  maxWidth: '550px'
                }}
              >
                <FileText
                  style={{ width: 64, height: 64, color: '#38bdf8', margin: '0 auto 1rem' }}
                />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {activeLesson?.title}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  {activeLesson?.contentText || 'This lesson has no previewable media attached.'}
                </p>
              </div>
            )}
          </div>

          {/* =================================================
              LESSON INFORMATION
          ================================================== */}

          <div
            style={{
              background: 'white',
              padding: '1.25rem',
              borderRadius: '12px',
              border:
                '1px solid #e2e8f0'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                borderBottom:
                  '1px solid #f1f5f9',
                paddingBottom: '0.85rem',
                marginBottom: '1rem'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    fontWeight: 600
                  }}
                >
                  Active Lesson{' '}
                  {currentLessonIndex + 1}{' '}
                  of {totalLessons}
                </div>

                <h2
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#0f172a'
                  }}
                >
                  {activeLesson?.title}
                </h2>
              </div>

              {savingProgress && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#0284c7',
                    fontWeight: 600
                  }}
                >
                  Saving progress...
                </span>
              )}
            </div>

            {/* Tabs */}

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                borderBottom:
                  '1px solid #e2e8f0',
                paddingBottom: '0.5rem',
                marginBottom: '1rem'
              }}
            >
              <button
                onClick={() =>
                  setActiveTab('content')
                }
                style={{
                  border: 'none',
                  background: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color:
                    activeTab === 'content'
                      ? '#0284c7'
                      : '#64748b',
                  cursor: 'pointer'
                }}
              >
                Lesson Summary
              </button>

              <button
                onClick={() =>
                  setActiveTab('notes')
                }
                style={{
                  border: 'none',
                  background: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color:
                    activeTab === 'notes'
                      ? '#0284c7'
                      : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Edit3
                  style={{
                    width: 14,
                    height: 14
                  }}
                />

                Personal Notes
              </button>
            </div>

            {activeTab === 'notes' ? (
              <div>
                <textarea
                  value={notesText}
                  onChange={e =>
                    setNotesText(
                      e.target.value
                    )
                  }
                  placeholder="Type key operational takeaways or questions for your trainer..."
                  style={{
                    width: '100%',
                    height: '90px',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border:
                      '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />

                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#16a34a',
                    fontWeight: 600,
                    marginTop: '0.3rem'
                  }}
                >
                  ✓ Notes auto-saved locally
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: '0.88rem',
                  color: '#475569',
                  lineHeight: 1.5
                }}
              >
                {activeLesson?.contentText ||
                  'This module covers core shipping procedures, documentation validation, and operational risk management.'}
              </div>
            )}
          </div>
        </div>

        {/* ===================================================
            RIGHT SIDEBAR
        ==================================================== */}

        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.25rem',
            border:
              '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >

          {/* Course Progress */}

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#0f172a'
              }}
            >
              <span>
                Course Progress
              </span>

              <span>
                {loadingProgress
                  ? '...'
                  : `${progressPercent}%`}
              </span>
            </div>

            <div
              className="progress-bar-bg"
              style={{
                height: 8,
                marginTop: '0.4rem'
              }}
            >
              <div
                className="progress-bar-fill"
                style={{
                  width: `${progressPercent}%`,
                  transition:
                    'width 0.3s ease'
                }}
              />
            </div>
          </div>

          {/* Modules */}

          <div
            style={{
              borderTop:
                '1px solid #e2e8f0',
              paddingTop: '1rem'
            }}
          >
            <h3
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#0f172a',
                textTransform:
                  'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '0.75rem'
              }}
            >
              MODULES
            </h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              {course.modules.map(module => (
                <div
                  key={module.id}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '0.75rem'
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#1e293b',
                      marginBottom:
                        '0.5rem'
                    }}
                  >
                    {module.title}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection:
                        'column',
                      gap: '0.35rem'
                    }}
                  >
                    {module.lessons.map(
                      lesson => {

                        const idxInAll =
                          allLessons.findIndex(
                            l =>
                              l.id ===
                              lesson.id
                          );

                        const isSelected =
                          currentLessonIndex ===
                          idxInAll;

                        /*
                         * Progress uses the actual
                         * database lesson ID.
                         */
                        const lessonDbId =
                          lesson.dbId;

                        const isDone =
                          Boolean(
                            completedLessons[
                              lessonDbId
                            ]
                          );

                        return (
                          <button
                            key={lesson.id}
                            onClick={() =>
                              handleSelectLesson(
                                idxInAll
                              )
                            }
                            style={{
                              display: 'flex',
                              alignItems:
                                'center',
                              justifyContent:
                                'space-between',
                              padding:
                                '0.5rem 0.65rem',
                              borderRadius:
                                '6px',
                              background:
                                isSelected
                                  ? '#0f172a'
                                  : isDone
                                  ? '#f0fdf4'
                                  : 'white',
                              color:
                                isSelected
                                  ? 'white'
                                  : isDone
                                  ? '#166534'
                                  : '#334155',
                              border:
                                isSelected
                                  ? '1px solid #0f172a'
                                  : isDone
                                  ? '1px solid #bbf7d0'
                                  : '1px solid #e2e8f0',
                              fontSize:
                                '0.78rem',
                              textAlign:
                                'left',
                              cursor:
                                'pointer',
                              transition:
                                'all 0.12s ease'
                            }}
                          >
                            <div
                              style={{
                                display:
                                  'flex',
                                alignItems:
                                  'center',
                                gap: '0.5rem',
                                overflow:
                                  'hidden'
                              }}
                            >
                              {isDone ? (
                                <Check
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color:
                                      isSelected
                                        ? '#34d399'
                                        : '#16a34a',
                                    flexShrink: 0
                                  }}
                                />
                              ) : isSelected ? (
                                <Circle
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color:
                                      '#38bdf8',
                                    fill:
                                      '#38bdf8',
                                    flexShrink: 0
                                  }}
                                />
                              ) : (
                                <Circle
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color:
                                      '#94a3b8',
                                    flexShrink: 0
                                  }}
                                />
                              )}

                              <span
                                style={{
                                  textOverflow:
                                    'ellipsis',
                                  overflow:
                                    'hidden',
                                  whiteSpace:
                                    'nowrap',
                                  fontWeight:
                                    isSelected
                                      ? 700
                                      : 500
                                }}
                              >
                                {lesson.title}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize:
                                  '0.7rem',
                                opacity: 0.8,
                                marginLeft:
                                  'auto'
                              }}
                            >
                              {lesson.duration}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>

                  {(() => {
                    const moduleNumericId = getNumericModuleId(module);
                    const moduleQuiz = moduleQuizzes.find(quiz =>
                      Number(quiz.moduleId) === moduleNumericId &&
                      String(quiz.type || '').toUpperCase() === 'MODULE'
                    );
                    if (!moduleQuiz) return null;
                    return (
                      <div key={`quiz-${moduleQuiz.id || moduleQuiz.quizId}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.65rem' }}>
                        <button
                          type="button"
                          disabled={!isHrAdmin && getQuizCooldown(moduleQuiz).active}
                          onClick={() => { if (isHrAdmin || !getQuizCooldown(moduleQuiz).active) openQuiz(moduleQuiz, false, module.title); }}
                          style={{
                            width: '100%', padding: '0.7rem 0.75rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '0.5rem', borderRadius: '8px',
                            border: `1px solid ${!isHrAdmin && getQuizCooldown(moduleQuiz).active ? '#fecaca' : '#a7f3d0'}`,
                            background: !isHrAdmin && getQuizCooldown(moduleQuiz).active ? '#fff1f2' : '#ecfdf5',
                            color: !isHrAdmin && getQuizCooldown(moduleQuiz).active ? '#9f1239' : '#065f46', fontWeight: 800,
                            cursor: !isHrAdmin && getQuizCooldown(moduleQuiz).active ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: !isHrAdmin && getQuizCooldown(moduleQuiz).active ? 0.9 : 1
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!isHrAdmin && getQuizCooldown(moduleQuiz).active ? <Lock style={{ width: 16, height: 16 }} /> : <Award style={{ width: 16, height: 16 }} />}
                            { !isHrAdmin && getQuizCooldown(moduleQuiz).active ? 'Quiz Locked · ' : 'Module Quiz · '}{moduleQuiz.title || module.title}
                          </span>
                          {!isHrAdmin && getQuizCooldown(moduleQuiz).active ? <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '.78rem', whiteSpace: 'nowrap' }}>{formatCountdown(getQuizCooldown(moduleQuiz).remaining)}</span> : <ChevronRight style={{ width: 16, height: 16 }} />}
                        </button>
                        {!isHrAdmin && getQuizCooldown(moduleQuiz).active && (
                          <div style={{ border: '1px solid #fecaca', background: '#fff7f7', color: '#9f1239', borderRadius: 8, padding: '.65rem .75rem', fontSize: '.75rem', lineHeight: 1.45 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, marginBottom: 3 }}><Clock3 size={14} /> Retry available in {formatCountdown(getQuizCooldown(moduleQuiz).remaining)}</div>
                            <div>Available at {formatRetryTime(getQuizCooldown(moduleQuiz).retryAt)}. You can continue reviewing lessons while you wait.</div>
                          </div>
                        )}
                        {isHrAdmin && (
                          <button
                            type="button"
                            onClick={() => openQuiz(moduleQuiz, true, module.title)}
                            className="btn-secondary"
                            style={{ width: '100%', justifyContent: 'center', border: '1px solid #93c5fd', background: '#eff6ff', color: '#1d4ed8' }}
                          >
                            Preview Questions & Answers
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {pendingModuleQuiz && (
        <div role="dialog" aria-modal="true" aria-labelledby="module-quiz-prompt-title" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: 'min(100%, 440px)', background: '#fff', color: '#0f172a', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 24px 80px rgba(0,0,0,.25)' }}>
            <h2 id="module-quiz-prompt-title" style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '.5rem' }}>Module completed</h2>
            <p style={{ color: '#475569', marginBottom: '1.25rem' }}>You have completed all lessons in {pendingModuleQuiz.title}. Would you like to start the module quiz now?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem' }}>
              <button className="btn-secondary" onClick={() => setPendingModuleQuiz(null)}>Not now</button>
              <button className="btn-primary" onClick={() => { const pending = pendingModuleQuiz; setPendingModuleQuiz(null); openQuiz(pending.quiz, false, pending.title); }}>Start Quiz</button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          BOTTOM NAVIGATION
      ====================================================== */}

      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '0.85rem 1.5rem',
          border:
            '1px solid #e2e8f0',
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#334155'
          }}
        >
          Lesson{' '}
          {currentLessonIndex + 1} of{' '}
          {totalLessons} •{' '}
          <span
            style={{
              color: '#0284c7'
            }}
          >
            {progressPercent}%
            Complete
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem'
          }}
        >
          <button
            className="btn-secondary"
            onClick={handlePrev}
            disabled={
              currentLessonIndex === 0
            }
            style={{
              opacity:
                currentLessonIndex === 0
                  ? 0.5
                  : 1
            }}
          >
            <ChevronLeft
              style={{
                width: 16,
                height: 16
              }}
            />

            Previous
          </button>

          <button
            className="btn-primary"
            onClick={handleNext}
            disabled={
              currentLessonIndex ===
              totalLessons - 1
            }
            style={{
              opacity:
                currentLessonIndex ===
                totalLessons - 1
                  ? 0.5
                  : 1
            }}
          >
            Next

            <ChevronRight
              style={{
                width: 16,
                height: 16
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}