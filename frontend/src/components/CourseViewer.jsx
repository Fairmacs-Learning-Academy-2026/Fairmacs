import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';
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
  CheckCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RefreshCw,
  WifiOff
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { enrollmentService } from '../services/enrollmentService';
import { notifyEnrollmentUpdated } from '../utils/enrollmentSync';
import { generateSafeWatermarkSvg } from '../utils/watermarkUtil';
import { useAuth } from '../context/AuthContext';
import { renderAsync } from 'docx-preview';
import CertificateViewer from './CertificateViewer';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatMediaTime = seconds => {
  const safe = Number.isFinite(Number(seconds)) && Number(seconds) > 0
    ? Math.floor(Number(seconds))
    : 0;
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const parseFilenameFromHeaders = headers => {
  if (!headers) return '';
  const direct = headers.get?.('x-document-filename') || headers.get?.('X-Document-Filename');
  if (direct && direct.trim()) return direct.trim();
  const disposition = headers.get?.('content-disposition') || headers.get?.('Content-Disposition') || '';
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;\n]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ''));
    } catch {
      return utf8Match[1].trim();
    }
  }
  const stdMatch = disposition.match(/filename="?([^";\n]+)"?/i);
  return stdMatch?.[1]?.trim() || '';
};

export default function CourseViewer({
  course,
  onBack,
  onStartQuiz,
  reviewMode = false
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
  const [documentFilename, setDocumentFilename] = useState('');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const [pdfRendering, setPdfRendering] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const pdfContainerRef = useRef(null);
  const docxContainerRef = useRef(null);

  // Course Document Watermark State & SVG Pattern
  const [watermarkData, setWatermarkData] = useState(null);

  const watermarkString = useMemo(() => {
    if (watermarkData?.watermarkText) {
      return watermarkData.watermarkText;
    }
    const empName = watermarkData?.employeeName || user?.fullName || user?.name || user?.email || 'Authorized Employee';
    const empCode = watermarkData?.employeeCode || user?.employeeId;
    const timeStr = watermarkData?.timestamp || new Date().toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `CONFIDENTIAL \u2013 PROPERTY OF FAIRMACS | ${empName} | ${empCode} | FAIRMACS LEARNING ACADEMY | ${timeStr}`;
  }, [watermarkData, user]);

  const watermarkSvgUrl = useMemo(() => {
    const escapedText = watermarkString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="280" viewBox="0 0 560 280">
      <text 
        x="280" 
        y="140" 
        text-anchor="middle" 
        dominant-baseline="central" 
        transform="rotate(-45 280 140)" 
        fill="rgba(15, 23, 42, 0.22)" 
        font-size="11" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
        font-weight="600" 
        letter-spacing="0.5"
        xml:space="preserve"
      >${escapedText}</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [watermarkString]);

  // Video player refs & states (HTML5 & YouTube)
  const html5VideoRef = useRef(null);
  const videoWrapperRef = useRef(null);
  const youtubeIframeRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubeCompletionHandledRef = useRef(false);
  const lastTimeRef = useRef(0);
  const actualWatchTimeRef = useRef(0);
  const youtubeCheckpointIntervalRef = useRef(null);

  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoPlaybackRate, setVideoPlaybackRate] = useState(1);
  const [videoFullscreen, setVideoFullscreen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoBuffering, setVideoBuffering] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeBuffering, setYoutubeBuffering] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Page Visibility API automatic pause/resume & autoplay fallback
  const wasPlayingBeforeHideRef = useRef(false);
  const wasManuallyPausedRef = useRef(false);
  const autoPausedByVisibilityRef = useRef(false);
  const pausedAtPositionRef = useRef(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Checkpoint deduplication & offline queue
  const lastSavedCheckpointRef = useRef({ lessonDbId: null, percent: -1, position: -1 });
  const pendingCheckpointRef = useRef(null);

  useEffect(() => {
    lastTimeRef.current = 0;
    actualWatchTimeRef.current = 0;
    wasPlayingBeforeHideRef.current = false;
    wasManuallyPausedRef.current = false;
    autoPausedByVisibilityRef.current = false;
    pausedAtPositionRef.current = 0;
    lastSavedCheckpointRef.current = { lessonDbId: null, percent: -1, position: -1 };
    setAutoplayBlocked(false);
    setVideoPlaying(false);
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setVideoLoading(false);
    setVideoBuffering(false);
    setVideoError('');
    setYoutubeLoading(false);
    setYoutubeBuffering(false);
    setYoutubeError('');
    return () => {
      if (youtubeCheckpointIntervalRef.current) {
        window.clearInterval(youtubeCheckpointIntervalRef.current);
        youtubeCheckpointIntervalRef.current = null;
      }
    };
  }, [activeLesson?.dbId, activeLesson?.id]);

  const API_BASE_URL = SHARED_API_BASE_URL;


  const [moduleQuizzes, setModuleQuizzes] = useState([]);
  const [finalQuiz, setFinalQuiz] = useState(null);
  const [_quizLoadError, setQuizLoadError] = useState('');
  const [pendingModuleQuiz, setPendingModuleQuiz] = useState(null);
  const [quizUnlockStatuses, setQuizUnlockStatuses] = useState({});
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const [viewingCertificate, setViewingCertificate] = useState(null);
  const [loadingCertificate, setLoadingCertificate] = useState(false);

  const handleOpenCertificate = async () => {
    const courseDbId = course?.dbId ?? course?.courseDbId ?? course?.id;
    if (!courseDbId) return;
    setLoadingCertificate(true);
    try {
      const token =
        localStorage.getItem('fairmacs_token') ||
        localStorage.getItem('fairmacs_lms_token') ||
        localStorage.getItem('token') ||
        '';
      const res = await authFetch(`${SHARED_API_BASE_URL}/certificates/course/${encodeURIComponent(courseDbId)}`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const cert = await res.json();
        setViewingCertificate(cert);
      } else {
        setViewingCertificate({
          userName: user?.name,
          courseTitle: course?.title,
          certificateId: course?.certificateId || 'OP001',
          issuedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to load certificate:', err);
      setViewingCertificate({
        userName: user?.name,
        courseTitle: course?.title,
        certificateId: course?.certificateId || 'OP001',
        issuedAt: new Date().toISOString()
      });
    } finally {
      setLoadingCertificate(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const courseDbId = course?.dbId ?? course?.courseDbId ?? course?.id;
    if (!courseDbId) { setModuleQuizzes([]); setFinalQuiz(null); return; }
    const token = localStorage.getItem('fairmacs_token') || '';
    authFetch(`${API_BASE_URL}/quizzes/course/${encodeURIComponent(courseDbId)}`, {
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
          const response = await authFetch(`${API_BASE_URL}/quizzes/${encodeURIComponent(id)}/unlock-status`, {
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
    alert('Course is not found. Please refresh and try again.');
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
   * ---------------------------------------------------------
   * SEQUENTIAL LESSON UNLOCKING & LOCK STATE (PHASE 5)
   * ---------------------------------------------------------
   */
  const isLessonUnlocked = targetIndex => {
    if (isHrAdmin) return true;
    if (targetIndex === 0) return true;
    if (targetIndex < 0 || targetIndex >= allLessons.length) return false;

    const targetLesson = allLessons[targetIndex];
    const targetDbId = targetLesson?.dbId ?? targetLesson?.id;

    // Completed lessons always remain accessible for review
    if (Boolean(completedLessons[targetDbId])) return true;

    // 1. All preceding lessons must be completed
    for (let i = 0; i < targetIndex; i++) {
      const prevLesson = allLessons[i];
      const prevDbId = prevLesson?.dbId ?? prevLesson?.id;
      if (!completedLessons[prevDbId]) {
        return false;
      }
    }

    // 2. Inter-module quiz prerequisite check:
    // If target lesson belongs to Module M (M > 0), any prior module with a quiz must be passed.
    if (!isFoundationCourse && Array.isArray(course?.modules)) {
      let targetModuleIndex = -1;
      for (let mIdx = 0; mIdx < course.modules.length; mIdx++) {
        const m = course.modules[mIdx];
        const lessons = Array.isArray(m.lessons) ? m.lessons : [];
        if (lessons.some(l => (l?.dbId ?? l?.id) === targetDbId)) {
          targetModuleIndex = mIdx;
          break;
        }
      }

      if (targetModuleIndex > 0) {
        for (let mIdx = 0; mIdx < targetModuleIndex; mIdx++) {
          const priorModule = course.modules[mIdx];
          const priorModuleNumericId = getNumericModuleId(priorModule);
          const priorQuiz = moduleQuizzes.find(q =>
            Number(q.moduleId) === priorModuleNumericId &&
            String(q.type || '').toUpperCase() === 'MODULE'
          );
          if (priorQuiz) {
            const pId = priorQuiz?.dbId ?? priorQuiz?.id ?? priorQuiz?.quizId;
            const pStatus = pId != null ? quizUnlockStatuses[String(pId)] : null;
            const isPassed = Boolean(pStatus?.alreadyPassed || pStatus?.quizPassed);
            if (!isPassed) {
              return false;
            }
          }
        }
      }
    }

    return true;
  };

  const getLessonLockReason = targetIndex => {
    if (isHrAdmin || targetIndex <= 0 || targetIndex >= allLessons.length) return null;
    const targetLesson = allLessons[targetIndex];
    const targetDbId = targetLesson?.dbId ?? targetLesson?.id;
    if (Boolean(completedLessons[targetDbId])) return null;

    for (let i = 0; i < targetIndex; i++) {
      const prevLesson = allLessons[i];
      const prevDbId = prevLesson?.dbId ?? prevLesson?.id;
      if (!completedLessons[prevDbId]) {
        return `Complete the previous lesson ("${prevLesson?.title || 'Lesson ' + (i + 1)}") to unlock this lesson.`;
      }
    }

    if (!isFoundationCourse && Array.isArray(course?.modules)) {
      let targetModuleIndex = -1;
      for (let mIdx = 0; mIdx < course.modules.length; mIdx++) {
        const m = course.modules[mIdx];
        const lessons = Array.isArray(m.lessons) ? m.lessons : [];
        if (lessons.some(l => (l?.dbId ?? l?.id) === targetDbId)) {
          targetModuleIndex = mIdx;
          break;
        }
      }

      if (targetModuleIndex > 0) {
        for (let mIdx = 0; mIdx < targetModuleIndex; mIdx++) {
          const priorModule = course.modules[mIdx];
          const priorModuleNumericId = getNumericModuleId(priorModule);
          const priorQuiz = moduleQuizzes.find(q =>
            Number(q.moduleId) === priorModuleNumericId &&
            String(q.type || '').toUpperCase() === 'MODULE'
          );
          if (priorQuiz) {
            const pId = priorQuiz?.dbId ?? priorQuiz?.id ?? priorQuiz?.quizId;
            const pStatus = pId != null ? quizUnlockStatuses[String(pId)] : null;
            const isPassed = Boolean(pStatus?.alreadyPassed || pStatus?.quizPassed);
            if (!isPassed) {
              return `Pass the module quiz for "${priorModule?.title || 'Module ' + (mIdx + 1)}" before accessing lessons in this module.`;
            }
          }
        }
      }
    }

    return null;
  };

  // Helper for module quiz locking and status
  const getModuleQuizState = module => {
    if (isFoundationCourse) return { available: false };
    const moduleNumericId = getNumericModuleId(module);
    const moduleQuiz = moduleQuizzes.find(quiz =>
      Number(quiz.moduleId) === moduleNumericId &&
      String(quiz.type || '').toUpperCase() === 'MODULE'
    );
    if (!moduleQuiz) return { available: false };

    const quizId = moduleQuiz?.dbId ?? moduleQuiz?.id ?? moduleQuiz?.quizId;
    const status = quizId != null ? quizUnlockStatuses[String(quizId)] : null;
    const isPassed = Boolean(status?.alreadyPassed || status?.quizPassed);
    const cooldown = getQuizCooldown(moduleQuiz);

    const moduleLessons = Array.isArray(module.lessons) ? module.lessons : [];
    const allModuleLessonsDone = moduleLessons.length > 0 && moduleLessons.every(l => Boolean(completedLessons[l?.dbId]));

    let priorQuizzesPassed = true;
    let priorFailedModuleTitle = '';
    const currentModIdx = (course?.modules || []).findIndex(m => getNumericModuleId(m) === moduleNumericId);
    if (currentModIdx > 0) {
      for (let i = 0; i < currentModIdx; i++) {
        const pMod = course.modules[i];
        const pModId = getNumericModuleId(pMod);
        const pQuiz = moduleQuizzes.find(q => Number(q.moduleId) === pModId && String(q.type || '').toUpperCase() === 'MODULE');
        if (pQuiz) {
          const pId = pQuiz?.dbId ?? pQuiz?.id ?? pQuiz?.quizId;
          const pStatus = pId != null ? quizUnlockStatuses[String(pId)] : null;
          if (!pStatus?.alreadyPassed && !pStatus?.quizPassed) {
            priorQuizzesPassed = false;
            priorFailedModuleTitle = pMod.title || `Module ${i + 1}`;
            break;
          }
        }
      }
    }

    let isLocked = false;
    let lockReason = '';
    if (!allModuleLessonsDone) {
      isLocked = true;
    } else if (!priorQuizzesPassed) {
      isLocked = true;
      lockReason = `Pass the module quiz for "${priorFailedModuleTitle}" before attempting this quiz.`;
    } else if (cooldown.active) {
      isLocked = true;
      lockReason = `Cooldown active. Retry available at ${formatRetryTime(cooldown.retryAt)}.`;
    }

    return {
      available: true,
      quiz: moduleQuiz,
      isPassed,
      isLocked: !isHrAdmin && isLocked,
      lockReason,
      cooldown,
      allModuleLessonsDone,
      priorQuizzesPassed
    };
  };

  // Helper for final assessment locking and status
  const getFinalAssessmentState = () => {
    if (isFoundationCourse || !finalQuiz) return { available: false };
    const quizId = finalQuiz?.dbId ?? finalQuiz?.id ?? finalQuiz?.quizId;
    const status = quizId != null ? quizUnlockStatuses[String(quizId)] : null;
    const isPassed = Boolean(status?.alreadyPassed || status?.quizPassed);
    const cooldown = getQuizCooldown(finalQuiz);

    const allLessonsDone = totalLessons > 0 && allLessons.every(l => Boolean(completedLessons[l?.dbId]));
    const allModuleQuizzesDone = moduleQuizzes.length === 0 || moduleQuizzes.every(q => {
      const qId = q?.dbId ?? q?.id ?? q?.quizId;
      const qStatus = qId != null ? quizUnlockStatuses[String(qId)] : null;
      return Boolean(qStatus?.alreadyPassed || qStatus?.quizPassed);
    });

    let isLocked = false;
    let lockReason = '';
    if (!allLessonsDone) {
      isLocked = true;
    } else if (!allModuleQuizzesDone) {
      isLocked = true;
      lockReason = 'Pass all module quizzes before taking the final assessment.';
    } else if (cooldown.active) {
      isLocked = true;
      lockReason = `Cooldown active. Retry available at ${formatRetryTime(cooldown.retryAt)}.`;
    }

    return {
      available: true,
      quiz: finalQuiz,
      isPassed,
      isLocked: !isHrAdmin && isLocked,
      lockReason,
      cooldown,
      allLessonsDone,
      allModuleQuizzesDone
    };
  };

  // Auto-adjust current lesson if it points to a locked lesson on progress load
  useEffect(() => {
    if (!isHrAdmin && allLessons.length > 0 && !isLessonUnlocked(currentLessonIndex)) {
      let firstUnlocked = 0;
      for (let i = 0; i < allLessons.length; i++) {
        if (isLessonUnlocked(i) && !completedLessons[allLessons[i]?.dbId]) {
          firstUnlocked = i;
          break;
        }
      }
      setCurrentLessonIndex(firstUnlocked);
    }
  }, [completedLessons, quizUnlockStatuses, allLessons.length, isHrAdmin]);



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

  const [enrollmentStatus, setEnrollmentStatus] = useState(
    course?.enrollmentStatus ??
      course?.status ??
      course?.enrollment?.status ??
      ''
  );

  /*
   * Keep the enrollment ID and status synchronized when the selected course
   * changes. useState only uses its initial value once.
   */
  useEffect(() => {
    setResolvedEnrollmentId(
      course?.enrollmentDbId ??
        course?.enrollmentId ??
        course?.enrollment?.id ??
        null
    );
    setEnrollmentStatus(
      course?.enrollmentStatus ??
        course?.status ??
        course?.enrollment?.status ??
        ''
    );
  }, [
    course?.enrollmentDbId,
    course?.enrollmentId,
    course?.enrollment?.id,
    course?.enrollmentStatus,
    course?.status,
    course?.enrollment?.status
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

        let matchingEnrollment = null;

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

          matchingEnrollment =
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

        if (matchingEnrollment?.status) {
          setEnrollmentStatus(matchingEnrollment.status);
        }

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
    setDocumentFilename('');
    setDocumentError('');
    setDocumentLoading(false);
    setPdfRendering(false);
    setPdfPageCount(0);
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
    setDocumentFilename(
      activeLesson?.originalFileName ||
      activeLesson?.fileName ||
      activeLesson?.filename ||
      ''
    );
    setPdfPageCount(0);

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

      const response = await authFetch(
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
      const resolvedFilename =
        parseFilenameFromHeaders(response.headers) ||
        activeLesson?.originalFileName ||
        activeLesson?.fileName ||
        activeLesson?.filename ||
        activeLesson?.title ||
        'Lesson Document';

      const headerWatermarkText = response.headers.get('x-watermark-text') || '';
      const headerEmpName = response.headers.get('x-watermark-employee-name') || '';
      const headerEmpCode = response.headers.get('x-watermark-employee-code') || '';
      const headerTimestamp = response.headers.get('x-watermark-timestamp') || '';

      if (cancelled) return;

      setWatermarkData({
        watermarkText: headerWatermarkText,
        employeeName: headerEmpName,
        employeeCode: headerEmpCode,
        timestamp: headerTimestamp
      });

      objectUrl = URL.createObjectURL(
        contentType ? new Blob([blob], { type: contentType }) : blob
      );

      setDocumentBlob(blob);
      setDocumentContentType(contentType);
      setDocumentFilename(resolvedFilename);
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
  isDocumentLesson,
  activeLesson?.originalFileName,
  activeLesson?.fileName,
  activeLesson?.filename,
  activeLesson?.title
]);

  // Controlled PDF.js canvas renderer (completely removes browser PDF toolbar, download, print, and native controls)
  useEffect(() => {
    const isPdfContent =
      documentContentType === 'application/pdf' ||
      lessonType === 'pdf' ||
      (lessonType === 'document' && !documentContentType.includes('wordprocessingml.document'));

    if (
      !isDocumentLesson ||
      !documentBlob ||
      !pdfContainerRef.current ||
      !isPdfContent
    ) {
      return;
    }

    let cancelled = false;
    let loadingTask = null;
    let pdfDoc = null;
    let resizeTimer = null;
    let lastRenderedWidth = 0;
    const container = pdfContainerRef.current;

    const renderPdfPages = async () => {
      if (cancelled || !container) return;
      setPdfRendering(true);
      try {
        if (!pdfDoc) {
          const arrayBuffer = await documentBlob.arrayBuffer();
          if (cancelled) return;
          loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          pdfDoc = await loadingTask.promise;
          if (cancelled) {
            try { await pdfDoc.destroy(); } catch { /* ignore */ }
            return;
          }
          setPdfPageCount(pdfDoc.numPages || 0);
        }

        const totalPages = pdfDoc.numPages || 0;
        const availableWidth = Math.max(280, (container.clientWidth || 720) - 32);
        lastRenderedWidth = availableWidth;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const fragment = document.createDocumentFragment();

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          if (cancelled) return;
          const page = await pdfDoc.getPage(pageNum);
          if (cancelled) return;

          const unscaledViewport = page.getViewport({ scale: 1 });
          const fitScale = unscaledViewport.width > 0
            ? availableWidth / unscaledViewport.width
            : 1;
          const viewport = page.getViewport({ scale: fitScale });

          const pageWrapper = document.createElement('div');
          Object.assign(pageWrapper.style, {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: pageNum < totalPages ? '16px' : '0'
          });

          const pageCanvasBox = document.createElement('div');
          pageCanvasBox.className = 'course-pdf-page-box';
          Object.assign(pageCanvasBox.style, {
            position: 'relative',
            width: `${Math.floor(viewport.width)}px`,
            height: `${Math.floor(viewport.height)}px`,
            maxWidth: '100%',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          });

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          Object.assign(canvas.style, {
            width: `${Math.floor(viewport.width)}px`,
            height: `${Math.floor(viewport.height)}px`,
            maxWidth: '100%',
            background: '#ffffff',
            display: 'block'
          });

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr);
            await page.render({
              canvasContext: ctx,
              viewport
            }).promise;
          }

          // Per-page safe non-clipping diagonal watermark overlay layer
          const watermarkOverlay = document.createElement('div');
          watermarkOverlay.className = 'course-pdf-page-watermark';
          watermarkOverlay.setAttribute('aria-hidden', 'true');
          Object.assign(watermarkOverlay.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            zIndex: '10',
            pointerEvents: 'none',
            userSelect: 'none',
            overflow: 'hidden',
            mixBlendMode: 'multiply'
          });
          watermarkOverlay.innerHTML = generateSafeWatermarkSvg(viewport.width, viewport.height, watermarkString, 45);

          pageCanvasBox.appendChild(canvas);
          pageCanvasBox.appendChild(watermarkOverlay);
          pageWrapper.appendChild(pageCanvasBox);
          fragment.appendChild(pageWrapper);
        }

        if (!cancelled && container) {
          container.replaceChildren(fragment);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('PDF rendering failed:', error);
          setDocumentError('The PDF document is corrupted or could not be displayed.');
        }
      } finally {
        if (!cancelled) {
          setPdfRendering(false);
        }
      }
    };

    renderPdfPages();

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver(entries => {
        const entry = entries?.[0];
        if (!entry || cancelled || !pdfDoc) return;
        const nextWidth = Math.max(280, Math.floor(entry.contentRect.width) - 32);
        if (Math.abs(nextWidth - lastRenderedWidth) > 24) {
          if (resizeTimer) window.clearTimeout(resizeTimer);
          resizeTimer = window.setTimeout(() => {
            if (!cancelled) renderPdfPages();
          }, 200);
        }
      });
      resizeObserver.observe(container);
    }

    return () => {
      cancelled = true;
      if (resizeTimer) window.clearTimeout(resizeTimer);
      try { resizeObserver?.disconnect?.(); } catch { /* ignore */ }
      try { loadingTask?.destroy?.(); } catch { /* ignore */ }
      try { pdfDoc?.destroy?.(); } catch { /* ignore */ }
      try { container?.replaceChildren?.(); } catch { /* ignore */ }
    };
  }, [documentBlob, documentContentType, isDocumentLesson, lessonType, watermarkSvgUrl, watermarkString]);

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
   * PROGRESS CALCULATION
   * ---------------------------------------------------------
   */
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter(lesson =>
    Boolean(completedLessons[lesson?.dbId ?? lesson?.id])
  ).length;

  const isFoundationCourse = Boolean(course?.foundation || course?.isFoundation);
  const resolvedStatus = String(
    enrollmentStatus ||
    course?.enrollmentStatus ||
    course?.status ||
    course?.enrollment?.status ||
    ''
  ).toUpperCase();
  const isCourseCompleted =
    resolvedStatus === 'COMPLETED' ||
    (isFoundationCourse && totalLessons > 0 && completedCount >= totalLessons);

  const totalModuleQuizzes = isFoundationCourse ? 0 : (Array.isArray(moduleQuizzes) ? moduleQuizzes.length : 0);
  const passedModuleQuizzes = isFoundationCourse ? 0 : (Array.isArray(moduleQuizzes) ? moduleQuizzes.filter(q => {
    const id = q?.dbId ?? q?.id ?? q?.quizId;
    const status = id != null ? quizUnlockStatuses[String(id)] : null;
    return Boolean(status?.alreadyPassed || status?.quizPassed);
  }).length : 0);

  const totalItems = totalLessons + totalModuleQuizzes;
  const completedItems = completedCount + passedModuleQuizzes;

  const progressPercent = isCourseCompleted
    ? 100
    : isFoundationCourse
      ? (totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0)
      : (totalItems > 0 ? Math.min(98, Math.round((completedItems / totalItems) * 98)) : 0);

  /*
   * ---------------------------------------------------------
   * SAVE LESSON PROGRESS (WITH DEDUPLICATION & OFFLINE QUEUE)
   * ---------------------------------------------------------
   */
  const saveLessonProgress = async (
    lesson,
    completionPercent,
    watchedSeconds = 0,
    lastPositionSeconds = 0,
    options = {}
  ) => {
    const { silent = false, force = false } = options;

    /*
     * IMPORTANT:
     * Use the actual database Lesson ID for the
     * backend progress API.
     */
    const lessonDbId =
      lesson?.dbId;

    if (!enrollmentId || !lessonDbId) {
      if (!silent) {
        console.warn(
          'Cannot save progress. Please refresh and try again',
          {
            enrollmentId,
            lessonDbId,
            lesson
          }
        );
      }
      return false;
    }

    const safePercent = Math.max(0, Math.min(100, Math.round(Number(completionPercent) || 0)));
    const safeWatched = Math.max(0, Math.floor(Number(watchedSeconds) || 0));
    const safePosition = Math.max(0, Math.floor(Number(lastPositionSeconds) || 0));

    // Avoid duplicate non-completion checkpoint calls for identical position & percent
    if (
      !force &&
      safePercent < 100 &&
      lastSavedCheckpointRef.current.lessonDbId === lessonDbId &&
      lastSavedCheckpointRef.current.percent === safePercent &&
      Math.abs(lastSavedCheckpointRef.current.position - safePosition) < 2
    ) {
      return true;
    }

    try {
      setSavingProgress(true);

      const result =
        await enrollmentService.updateLessonProgress(
          enrollmentId,
          lessonDbId,
          safePercent,
          safeWatched,
          safePosition
        );

      lastSavedCheckpointRef.current = {
        lessonDbId,
        percent: safePercent,
        position: safePosition
      };
      if (pendingCheckpointRef.current?.lesson?.dbId === lessonDbId) {
        pendingCheckpointRef.current = null;
      }

      const alreadyCompleted = Boolean(completedLessons[lessonDbId]);
      const completed =
        alreadyCompleted ||
        Boolean(result?.completed) ||
        safePercent >= 100;

      /*
       * Store progress using the database ID.
       */
      setLessonProgress(prev => {
        const prevEntry = prev[lessonDbId];
        const prevPercent = Number(prevEntry?.completionPercent ?? 0);
        const prevWatched = Number(prevEntry?.watchedSeconds ?? 0);
        return {
          ...prev,
          [lessonDbId]: {
            completionPercent: completed ? 100 : Math.max(prevPercent, safePercent),
            watchedSeconds: Math.max(prevWatched, safeWatched),
            lastPositionSeconds: safePosition,
            completed
          }
        };
      });

      if (completed) {
        setCompletedLessons(prev => {
          const updated = {
            ...prev,
            [lessonDbId]: true
          };
          if (isFoundationCourse) {
            const count = allLessons.filter(l => Boolean(updated[l?.dbId ?? l?.id])).length;
            if (totalLessons > 0 && count >= totalLessons) {
              setEnrollmentStatus('COMPLETED');
              notifyEnrollmentUpdated({
                source: 'foundation-course-completed',
                courseCode: course?.courseId || course?.id
              });
            }
          }
          return updated;
        });
      } else {
        setCompletedLessons(prev => ({
          ...prev,
          [lessonDbId]: Boolean(prev[lessonDbId])
        }));
      }

      return true;

    } catch (error) {
      console.error(
        'Failed to save lesson progress:',
        error
      );
      // Queue checkpoint for retry when connectivity recovers
      pendingCheckpointRef.current = {
        lesson,
        completionPercent: safePercent,
        watchedSeconds: safeWatched,
        lastPositionSeconds: safePosition
      };
      if (!silent) {
        alert('Lesson progress could not be saved. Please check your connection and try again.');
      }
      return false;
    } finally {
      setSavingProgress(false);
    }
  };

  // Monitor network connectivity and flush queued progress checkpoint on reconnect
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      const pending = pendingCheckpointRef.current;
      if (pending && pending.lesson) {
        pendingCheckpointRef.current = null;
        youtubeCallbacksRef.current.saveLessonProgress?.(
          pending.lesson,
          pending.completionPercent,
          pending.watchedSeconds,
          pending.lastPositionSeconds,
          { silent: true, force: true }
        );
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Track fullscreen state changes for HTML5 video wrapper
  useEffect(() => {
    const handleFullscreenChange = () => {
      setVideoFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * HTML5 VIDEO CONTROLS & PROGRESS
   * ---------------------------------------------------------
   */
  const handleTogglePlayPause = () => {
    const video = html5VideoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      wasManuallyPausedRef.current = false;
      setAutoplayBlocked(false);
      video.play().catch(err => {
        console.warn('Video play blocked:', err);
      });
    } else {
      wasManuallyPausedRef.current = true;
      video.pause();
    }
  };

  const handleToggleMute = () => {
    const video = html5VideoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setVideoMuted(nextMuted);
  };

  const handleVolumeChange = event => {
    const nextVol = Math.max(0, Math.min(1, Number(event.target.value)));
    const video = html5VideoRef.current;
    setVideoVolume(nextVol);
    if (video) {
      video.volume = nextVol;
      if (nextVol > 0 && video.muted) {
        video.muted = false;
        setVideoMuted(false);
      } else if (nextVol === 0) {
        setVideoMuted(true);
      }
    }
  };

  const handlePlaybackRateChange = event => {
    const rate = Number(event.target.value) || 1;
    setVideoPlaybackRate(rate);
    const video = html5VideoRef.current;
    if (video) {
      video.playbackRate = rate;
    }
  };

  const handleToggleFullscreen = () => {
    const target = videoWrapperRef.current || html5VideoRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      target.requestFullscreen?.().catch(() => {});
    }
  };

  const handleVideoTimeUpdate = event => {
    const video = event.currentTarget;
    const currentTime = Number(video.currentTime || 0);
    const duration = Number(video.duration || 0);

    setVideoCurrentTime(currentTime);
    if (duration > 0 && Number.isFinite(duration)) {
      setVideoDuration(duration);
    }

    if (!duration || !Number.isFinite(duration)) return;

    const delta = currentTime - lastTimeRef.current;
    if (delta > 0 && delta <= 2.5 * (video.playbackRate || 1)) {
      actualWatchTimeRef.current += delta;
    }
    lastTimeRef.current = currentTime;

    const percent = Math.round(
      (currentTime / duration) * 100
    );

    /*
     * Use database lesson ID for progress lookup.
     */
    const activeLessonDbId =
      activeLesson?.dbId;

    const previous =
      lessonProgress[activeLessonDbId]
        ?.completionPercent ?? 0;

    const lastPos =
      lastSavedCheckpointRef.current.lessonDbId === activeLessonDbId
        ? lastSavedCheckpointRef.current.position
        : Number(lessonProgress[activeLessonDbId]?.lastPositionSeconds ?? 0);

    const checkpoint =
      percent >= 100 ||
      percent >= previous + 10 ||
      Math.abs(Math.floor(currentTime) - lastPos) >= 15;

    if (!checkpoint) return;

    saveLessonProgress(
      activeLesson,
      Math.min(percent, 99),
      Math.floor(actualWatchTimeRef.current),
      Math.floor(currentTime),
      { silent: true }
    );
  };

  /*
   * ---------------------------------------------------------
   * VIDEO COMPLETED
   * ---------------------------------------------------------
   */
  const completeLessonAndContinue = async (lesson, watchedSeconds = 0, lastPositionSeconds = 0) => {
    if (!lesson) return;
    const saved = await saveLessonProgress(lesson, 100, watchedSeconds, lastPositionSeconds, { force: true });
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

    if (!isFoundationCourse && containingModule && lessonIndex === moduleEndIndex) {
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
    setVideoPlaying(false);
    const duration = Math.floor(video.duration || 0);
    const activeLessonDbId = activeLesson?.dbId;
    const isAlreadyDone = Boolean(completedLessons[activeLessonDbId]);

    // Anti-scrub protection: require at least 70% actual elapsed watch time for videos > 10s
    if (!isAlreadyDone && duration > 10 && actualWatchTimeRef.current < (0.7 * duration)) {
      alert(`Please watch the video lessons thoroughly. You have watched ${Math.round(actualWatchTimeRef.current)} seconds of ${duration} seconds (at least 70% required).`);
      return;
    }

    await completeLessonAndContinue(
      activeLesson,
      duration,
      duration
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

  const youtubeCallbacksRef = useRef({
    lessonProgress,
    activeLesson,
    saveLessonProgress,
    completeLessonAndContinue
  });
  youtubeCallbacksRef.current = {
    lessonProgress,
    activeLesson,
    saveLessonProgress,
    completeLessonAndContinue
  };

  useEffect(() => {
    const container = youtubeIframeRef.current;
    if (lessonType !== 'video' || !activeYoutubeVideoId || !container) return;

    let disposed = false;
    let player = null;
    let retry = null;
    let retryTimeout = null;
    youtubeCompletionHandledRef.current = false;
    setYoutubeLoading(true);
    setYoutubeBuffering(false);
    setYoutubeError('');

    const currentLesson = youtubeCallbacksRef.current.activeLesson;
    const savedPosInitial = Number(
      youtubeCallbacksRef.current.lessonProgress[currentLesson?.dbId]?.lastPositionSeconds ?? 0
    );
    const startParam =
      savedPosInitial > 0 && Number.isFinite(savedPosInitial)
        ? `&start=${Math.floor(savedPosInitial)}`
        : '';

    const iframe = document.createElement('iframe');
    iframe.id = `youtube-player-${String(currentLesson?.dbId ?? currentLesson?.id ?? currentLessonIndex).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    iframe.title = currentLesson?.title || 'Training video';
    iframe.src = `https://www.youtube.com/embed/${activeYoutubeVideoId}?controls=1&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&cc_load_policy=0${startParam}`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    Object.assign(iframe.style, {
      width: '100%',
      height: '420px',
      border: '0',
      background: '#000'
    });
    container.replaceChildren(iframe);

    const initializePlayer = () => {
      if (disposed || player || !window.YT?.Player || !iframe.isConnected) return;
      try {
        player = new window.YT.Player(iframe, {
          events: {
            onReady: event => {
              if (disposed) return;
              setYoutubeLoading(false);
              const lesson = youtubeCallbacksRef.current.activeLesson;
              const savedPos = Number(
                youtubeCallbacksRef.current.lessonProgress[lesson?.dbId]?.lastPositionSeconds ?? 0
              );
              if (savedPos > 0 && Number.isFinite(savedPos)) {
                try {
                  event.target.seekTo(savedPos, true);
                } catch (e) {
                  console.warn('YouTube seekTo failed:', e);
                }
              }
            },
            onStateChange: async event => {
              if (disposed) return;
              setYoutubeLoading(false);
              // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
              if (event.data === 3) {
                setYoutubeBuffering(true);
              } else {
                setYoutubeBuffering(false);
              }

              if (event.data === 1) {
                wasManuallyPausedRef.current = false;
                autoPausedByVisibilityRef.current = false;
                setAutoplayBlocked(false);
                if (!youtubeCheckpointIntervalRef.current) {
                  youtubeCheckpointIntervalRef.current = window.setInterval(() => {
                    try {
                      const curTime = Math.floor(Number(event.target?.getCurrentTime?.()) || 0);
                      const dur = Math.floor(Number(event.target?.getDuration?.()) || 0);
                      if (curTime > 0 && dur > 0) {
                        const pct = Math.min(99, Math.round((curTime / dur) * 100));
                        youtubeCallbacksRef.current.saveLessonProgress(
                          youtubeCallbacksRef.current.activeLesson,
                          pct,
                          curTime,
                          curTime,
                          { silent: true }
                        );
                      }
                    } catch {
                      // ignore
                    }
                  }, 10000);
                }
              } else {
                if (event.data === 2) {
                  // Paused: if not triggered by visibility auto-pause, record as manual pause
                  if (!autoPausedByVisibilityRef.current && document.visibilityState === 'visible') {
                    wasManuallyPausedRef.current = true;
                  }
                }
                if (youtubeCheckpointIntervalRef.current) {
                  window.clearInterval(youtubeCheckpointIntervalRef.current);
                  youtubeCheckpointIntervalRef.current = null;
                }
              }

              // YT.PlayerState.ENDED === 0. Guard against duplicate end events.
              if (event.data !== 0 || disposed || youtubeCompletionHandledRef.current) return;
              youtubeCompletionHandledRef.current = true;
              if (youtubeCheckpointIntervalRef.current) {
                window.clearInterval(youtubeCheckpointIntervalRef.current);
                youtubeCheckpointIntervalRef.current = null;
              }
              const duration = Math.floor(Number(event.target?.getDuration?.()) || 0);
              await youtubeCallbacksRef.current.completeLessonAndContinue(
                youtubeCallbacksRef.current.activeLesson,
                duration,
                duration
              );
            },
            onError: event => {
              if (disposed) return;
              setYoutubeLoading(false);
              setYoutubeBuffering(false);
              const code = Number(event?.data);
              let message = 'This training video is currently unavailable. Please try again or contact your trainer.';
              if (code === 100) {
                message = 'This YouTube training video was removed or marked private.';
              } else if (code === 101 || code === 150) {
                message = 'Playback of this YouTube video on embedded players has been restricted by its owner.';
              } else if (code === 2 || code === 5) {
                message = 'The video player encountered a playback error. Please check your connection and reload.';
              }
              console.error('YouTube player error:', code);
              setYoutubeError(message);
            }
          }
        });
        youtubePlayerRef.current = player;
      } catch (error) {
        console.error('Could not initialize YouTube Player:', error);
        setYoutubeLoading(false);
        setYoutubeError('Unable to initialize the YouTube video player.');
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
      retry = window.setInterval(() => {
        if (window.YT?.Player) {
          window.clearInterval(retry);
          retry = null;
          initializePlayer();
        }
      }, 250);
      retryTimeout = window.setTimeout(() => {
        if (retry) {
          window.clearInterval(retry);
          retry = null;
        }
        if (!disposed && !player) {
          setYoutubeLoading(false);
        }
      }, 15000);
    }

    return () => {
      disposed = true;
      if (retry) window.clearInterval(retry);
      if (retryTimeout) window.clearTimeout(retryTimeout);
      if (youtubeCheckpointIntervalRef.current) {
        window.clearInterval(youtubeCheckpointIntervalRef.current);
        youtubeCheckpointIntervalRef.current = null;
      }
      try { player?.destroy?.(); } catch (error) { console.warn('YouTube player cleanup failed:', error); }
      try { container.replaceChildren(); } catch { /* ignore */ }
      if (youtubePlayerRef.current === player) youtubePlayerRef.current = null;
    };
  }, [activeYoutubeVideoId, currentLessonIndex, lessonType]);

  /*
   * ---------------------------------------------------------
   * PAGE VISIBILITY API: AUTO PAUSE & RESUME ON TAB SWITCH
   * ---------------------------------------------------------
   */
  const handleResumeFromAutoplayBlock = () => {
    setAutoplayBlocked(false);
    wasManuallyPausedRef.current = false;
    autoPausedByVisibilityRef.current = false;

    if (activeYoutubeVideoId && youtubePlayerRef.current) {
      try {
        const yt = youtubePlayerRef.current;
        if (pausedAtPositionRef.current > 0 && typeof yt.seekTo === 'function') {
          yt.seekTo(pausedAtPositionRef.current, true);
        }
        yt.playVideo?.();
      } catch (err) {
        console.warn('YouTube manual resume failed:', err);
      }
      return;
    }

    const video = html5VideoRef.current;
    if (video) {
      if (
        pausedAtPositionRef.current > 0 &&
        Number.isFinite(pausedAtPositionRef.current) &&
        Math.abs(video.currentTime - pausedAtPositionRef.current) > 1.5
      ) {
        video.currentTime = pausedAtPositionRef.current;
      }
      video.play().catch(err => {
        console.warn('HTML5 video manual resume failed:', err);
      });
    }
  };

  useEffect(() => {
    if (lessonType !== 'video') return undefined;

    let resumeVerifyTimer = null;

    const handleVisibilityChange = () => {
      const currentLesson = youtubeCallbacksRef.current.activeLesson;

      if (document.visibilityState === 'hidden') {
        if (resumeVerifyTimer) {
          window.clearTimeout(resumeVerifyTimer);
          resumeVerifyTimer = null;
        }

        // Case 1: YouTube video lesson
        if (activeYoutubeVideoId && youtubePlayerRef.current) {
          const yt = youtubePlayerRef.current;
          let ytState = -1;
          try {
            ytState = typeof yt.getPlayerState === 'function' ? Number(yt.getPlayerState()) : -1;
          } catch {
            ytState = -1;
          }

          // YT.PlayerState.PLAYING === 1, BUFFERING === 3
          const isYtPlaying = (ytState === 1 || ytState === 3) && !wasManuallyPausedRef.current;
          if (isYtPlaying) {
            wasPlayingBeforeHideRef.current = true;
            autoPausedByVisibilityRef.current = true;
            let curPos = 0;
            let dur = 0;
            try {
              curPos = Math.floor(Number(yt.getCurrentTime?.()) || 0);
              dur = Math.floor(Number(yt.getDuration?.()) || 0);
            } catch {
              curPos = 0;
            }
            pausedAtPositionRef.current = curPos;
            try {
              yt.pauseVideo?.();
            } catch (err) {
              console.warn('YouTube auto-pause on tab hide failed:', err);
            }
            if (curPos > 0) {
              const prevPct = Number(
                youtubeCallbacksRef.current.lessonProgress[currentLesson?.dbId]?.completionPercent ?? 0
              );
              const pct = dur > 0
                ? Math.min(99, Math.round((curPos / dur) * 100))
                : Math.min(99, prevPct);
              youtubeCallbacksRef.current.saveLessonProgress(
                currentLesson,
                pct,
                curPos,
                curPos,
                { silent: true }
              );
            }
          } else {
            wasPlayingBeforeHideRef.current = false;
          }
          return;
        }

        // Case 2: HTML5 video lesson
        const video = html5VideoRef.current;
        if (video) {
          const isHtml5Playing = !video.paused && !video.ended && !wasManuallyPausedRef.current;
          if (isHtml5Playing) {
            wasPlayingBeforeHideRef.current = true;
            autoPausedByVisibilityRef.current = true;
            const curPos = Math.floor(Number(video.currentTime) || 0);
            const dur = Math.floor(Number(video.duration) || 0);
            pausedAtPositionRef.current = curPos;
            video.pause();
            if (curPos > 0) {
              const prevPct = Number(
                youtubeCallbacksRef.current.lessonProgress[currentLesson?.dbId]?.completionPercent ?? 0
              );
              const pct = dur > 0
                ? Math.min(99, Math.round((curPos / dur) * 100))
                : Math.min(99, prevPct);
              youtubeCallbacksRef.current.saveLessonProgress(
                currentLesson,
                pct,
                Math.floor(actualWatchTimeRef.current || curPos),
                curPos,
                { silent: true }
              );
            }
          } else {
            wasPlayingBeforeHideRef.current = false;
          }
        }
        return;
      }

      if (document.visibilityState === 'visible') {
        if (!wasPlayingBeforeHideRef.current) {
          // Learner had manually paused before leaving the tab — keep paused.
          return;
        }

        wasPlayingBeforeHideRef.current = false;
        autoPausedByVisibilityRef.current = false;

        // Case 1: Resume YouTube video from paused position
        if (activeYoutubeVideoId && youtubePlayerRef.current) {
          const yt = youtubePlayerRef.current;
          try {
            if (pausedAtPositionRef.current > 0 && typeof yt.seekTo === 'function') {
              const cur = Number(yt.getCurrentTime?.() || 0);
              if (Math.abs(cur - pausedAtPositionRef.current) > 1.5) {
                yt.seekTo(pausedAtPositionRef.current, true);
              }
            }
            yt.playVideo?.();
            resumeVerifyTimer = window.setTimeout(() => {
              try {
                const stateAfter = typeof yt.getPlayerState === 'function' ? Number(yt.getPlayerState()) : -1;
                if (stateAfter !== 1 && stateAfter !== 3) {
                  setAutoplayBlocked(true);
                } else {
                  setAutoplayBlocked(false);
                }
              } catch {
                setAutoplayBlocked(true);
              }
            }, 500);
          } catch {
            setAutoplayBlocked(true);
          }
          return;
        }

        // Case 2: Resume HTML5 video from paused position
        const video = html5VideoRef.current;
        if (video && !video.ended) {
          if (
            pausedAtPositionRef.current > 0 &&
            Number.isFinite(pausedAtPositionRef.current) &&
            Math.abs(video.currentTime - pausedAtPositionRef.current) > 1.5
          ) {
            video.currentTime = pausedAtPositionRef.current;
            lastTimeRef.current = pausedAtPositionRef.current;
          }
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise
              .then(() => {
                setAutoplayBlocked(false);
              })
              .catch(() => {
                // Browser blocked automatic playback upon returning to tab:
                // show the clean "Resume Video" fallback button without resetting position.
                setAutoplayBlocked(true);
              });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (resumeVerifyTimer) {
        window.clearTimeout(resumeVerifyTimer);
      }
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
      const nextIdx = currentLessonIndex + 1;
      if (!isHrAdmin && !isLessonUnlocked(nextIdx)) {
        const reason = getLessonLockReason(nextIdx) || 'The next lesson is locked. Complete the current lesson first.';
        alert(reason);
        return;
      }
      setCurrentLessonIndex(nextIdx);
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
      if (!isHrAdmin && !isLessonUnlocked(index)) {
        const reason = getLessonLockReason(index) || 'This lesson is locked. Complete the previous lessons to unlock it.';
        alert(reason);
        return;
      }
      setCurrentLessonIndex(index);
    }
  };

  /*
   * ---------------------------------------------------------
   * RENDER GUARDS
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
        <p>Course details are not available.</p>
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
        <p>This course does not have any lessons loaded yet.</p>
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

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */
  return (
    <div
      className="animate-fade-in mn-course-viewer-shell"
    >

      {/* =====================================================
          TOP HEADER
      ====================================================== */}

      <div
        className="mn-course-top-bar"
      >
        <div
          className="mn-course-top-left"
        >
          <button
            className="btn-secondary"
            onClick={onBack}
            style={{
              padding: '0.45rem 0.8rem',
              flexShrink: 0
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

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#0284c7',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {course.id} • {course.department || (course.departments && course.departments[0]) || course.category || 'General Logistics'}
            </div>

            <h1
              style={{
                fontSize: 'clamp(1rem, 3.6vw, 1.2rem)',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.25,
                wordBreak: 'break-word'
              }}
            >
              {course.title}
            </h1>
          </div>
        </div>

        <div
          className="mn-course-top-actions"
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

          {!isFoundationCourse && (() => {
            const finalState = getFinalAssessmentState();
            if (!finalState.available) return null;
            const { quiz: fQuiz, isPassed, isLocked, lockReason, cooldown } = finalState;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <button
                  className="btn-primary"
                  disabled={isLocked}
                  onClick={() => {
                    if (!isLocked) {
                      openQuiz(fQuiz, false);
                    } else if (lockReason) {
                      alert(lockReason);
                    }
                  }}
                  title={lockReason || (isPassed ? 'Final Assessment Passed' : 'Take Final Assessment')}
                  style={{
                    background: isPassed
                      ? '#16a34a'
                      : isLocked
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #10b981, #059669)',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked ? 0.8 : 1
                  }}
                >
                  {isPassed ? (
                    <CheckCircle style={{ width: 18, height: 18 }} />
                  ) : isLocked ? (
                    <Lock style={{ width: 18, height: 18 }} />
                  ) : (
                    <Award style={{ width: 18, height: 18 }} />
                  )}
                  {isPassed ? 'Assessment Passed' : isLocked ? 'Assessment Locked' : 'Take Final Assessment'}
                </button>

                {isHrAdmin && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => openQuiz(fQuiz, true)}
                    style={{ border: '1px solid #93c5fd', color: '#1d4ed8', background: '#eff6ff' }}
                  >
                    Preview Final Assessment
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {(reviewMode || course?.reviewMode) && (
        <div
          style={{
            background: 'linear-gradient(90deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '0.75rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🎓</span>
            <span>
              <strong>Course Completed (Review Mode):</strong> You have successfully finished all curriculum and assessments.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!isFoundationCourse && (
              <button
                type="button"
                onClick={handleOpenCertificate}
                disabled={loadingCertificate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'white',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  borderRadius: '8px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <Award style={{ width: 15, height: 15, color: '#059669' }} />
                {loadingCertificate ? 'Loading...' : 'View Certificate'}
              </button>
            )}
            <span
              style={{
                background: '#059669',
                color: 'white',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '12px',
                letterSpacing: '0.5px'
              }}
            >
              COMPLETED
            </span>
          </div>
        </div>
      )}

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <div
        className="mn-course-viewer-grid"
      >

        {/* ===================================================
            LEFT SIDE
        ==================================================== */}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            minWidth: 0
          }}
        >

          {/* =================================================
              MEDIA PLAYER
          ================================================== */}

          <div
            ref={videoWrapperRef}
            className="mn-video-stage"
          >

            {lessonType === 'video' ? (() => {
              const sourceUrl = activeLesson.assetUrl || activeLesson.contentUrl || '';
              const youtubeMatch = String(sourceUrl).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
              if (youtubeMatch) {
                const videoId = youtubeMatch[1];
                return (
                  <div style={{ position: 'relative', width: '100%', background: '#000' }}>
                    {youtubeLoading && !youtubeError && (
                      <div
                        role="status"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(15, 23, 42, 0.78)',
                          color: '#e2e8f0',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          zIndex: 2,
                          pointerEvents: 'none'
                        }}
                      >
                        Loading training video…
                      </div>
                    )}

                    {youtubeError && (
                      <div
                        role="alert"
                        style={{
                          padding: '2rem',
                          textAlign: 'center',
                          background: '#1e293b',
                          color: '#fecaca',
                          borderBottom: '1px solid #334155'
                        }}
                      >
                        <p style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Video Unavailable</p>
                        <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{youtubeError}</p>
                      </div>
                    )}

                    <div
                      key={`yt-container-${activeLesson.dbId ?? activeLesson.id ?? videoId}`}
                      ref={youtubeIframeRef}
                      className="mn-youtube-frame"
                    />

                    {(youtubeBuffering || isOffline) && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.45rem 1rem',
                          background: '#1e293b',
                          color: '#e2e8f0',
                          fontSize: '0.78rem',
                          borderTop: '1px solid #334155'
                        }}
                      >
                        <span>{youtubeBuffering ? 'Buffering video…' : 'Playing'}</span>
                        {isOffline && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24' }}>
                            <WifiOff size={14} /> Offline – progress checkpoint queued
                          </span>
                        )}
                      </div>
                    )}

                    {autoplayBlocked && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(15, 23, 42, 0.82)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.75rem',
                          zIndex: 5,
                          padding: '1.5rem',
                          textAlign: 'center'
                        }}
                      >
                        <p style={{ fontSize: '0.92rem', color: '#e2e8f0', fontWeight: 600 }}>
                          Video paused while you were in another tab ({formatMediaTime(pausedAtPositionRef.current)})
                        </p>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleResumeFromAutoplayBlock}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1.25rem',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            background: '#0284c7',
                            color: '#ffffff',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <Play size={16} /> Resume Video
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              if (sourceUrl.trim()) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', background: '#000', position: 'relative' }}>
                    {videoLoading && !videoError && (
                      <div
                        role="status"
                        style={{
                          position: 'absolute',
                          top: '0',
                          left: '0',
                          right: '0',
                          height: '420px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(15, 23, 42, 0.65)',
                          color: '#e2e8f0',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          zIndex: 2,
                          pointerEvents: 'none'
                        }}
                      >
                        Loading video stream…
                      </div>
                    )}

                    {videoError && (
                      <div
                        role="alert"
                        style={{
                          padding: '1.25rem',
                          background: '#7f1d1d',
                          color: '#fecaca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{videoError}</span>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setVideoError('');
                            const v = html5VideoRef.current;
                            if (v) {
                              v.load();
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.78rem',
                            background: '#ffffff',
                            color: '#7f1d1d',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                        >
                          <RefreshCw size={14} /> Retry Video
                        </button>
                      </div>
                    )}

                    <video
                      ref={html5VideoRef}
                      key={activeLesson.dbId ?? activeLesson.id}
                      controls
                      playsInline
                      onLoadStart={() => {
                        setVideoLoading(true);
                        setVideoError('');
                      }}
                      onLoadedMetadata={event => {
                        const video = event.currentTarget;
                        setVideoLoading(false);
                        setVideoDuration(Number(video.duration || 0));
                        video.volume = videoVolume;
                        video.muted = videoMuted;
                        video.playbackRate = videoPlaybackRate;
                        const savedPosition = Number(lessonProgress[activeLesson?.dbId]?.lastPositionSeconds ?? 0);
                        if (savedPosition > 0 && Number.isFinite(savedPosition) && savedPosition < video.duration) {
                          video.currentTime = savedPosition;
                          lastTimeRef.current = savedPosition;
                          setVideoCurrentTime(savedPosition);
                        }
                      }}
                      onCanPlay={() => {
                        setVideoLoading(false);
                        setVideoBuffering(false);
                      }}
                      onPlaying={() => {
                        setVideoPlaying(true);
                        setVideoLoading(false);
                        setVideoBuffering(false);
                        setAutoplayBlocked(false);
                      }}
                      onPause={() => {
                        setVideoPlaying(false);
                        if (!autoPausedByVisibilityRef.current && document.visibilityState === 'visible') {
                          wasManuallyPausedRef.current = true;
                        }
                      }}
                      onWaiting={() => {
                        setVideoBuffering(true);
                      }}
                      onStalled={() => {
                        setVideoBuffering(true);
                      }}
                      onVolumeChange={event => {
                        const video = event.currentTarget;
                        setVideoVolume(Number(video.volume ?? 1));
                        setVideoMuted(Boolean(video.muted));
                      }}
                      onRateChange={event => {
                        const video = event.currentTarget;
                        setVideoPlaybackRate(Number(video.playbackRate || 1));
                      }}
                      onError={() => {
                        setVideoLoading(false);
                        setVideoBuffering(false);
                        setVideoPlaying(false);
                        setVideoError('Video playback encountered a network or media error. Please check your connection and retry.');
                      }}
                      onTimeUpdate={handleVideoTimeUpdate}
                      onEnded={handleVideoEnded}
                      className="mn-video-element"
                      src={sourceUrl}
                    >
                      Your browser does not support HTML5 video.
                    </video>

                    {autoplayBlocked && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: '48px',
                          background: 'rgba(15, 23, 42, 0.82)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.75rem',
                          zIndex: 5,
                          padding: '1.5rem',
                          textAlign: 'center'
                        }}
                      >
                        <p style={{ fontSize: '0.92rem', color: '#e2e8f0', fontWeight: 600 }}>
                          Video paused while you were in another tab ({formatMediaTime(pausedAtPositionRef.current)})
                        </p>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleResumeFromAutoplayBlock}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1.25rem',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            background: '#0284c7',
                            color: '#ffffff',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <Play size={16} /> Resume Video
                        </button>
                      </div>
                    )}

                    {/* LMS Video Control & Status Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        padding: '0.55rem 1rem',
                        background: '#1e293b',
                        borderTop: '1px solid #334155',
                        color: '#f8fafc',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleTogglePlayPause}
                          aria-label={videoPlaying ? 'Pause video' : 'Play video'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {videoPlaying ? <Pause size={14} /> : <Play size={14} />}
                          {videoPlaying ? 'Pause' : 'Play'}
                        </button>

                        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#cbd5e1', fontWeight: 600 }}>
                          {formatMediaTime(videoCurrentTime)} / {formatMediaTime(videoDuration)}
                        </span>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={handleToggleMute}
                            aria-label={videoMuted ? 'Unmute video' : 'Mute video'}
                            style={{
                              background: 'transparent',
                              color: '#cbd5e1',
                              border: 'none',
                              padding: '0.2rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            {videoMuted || videoVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            aria-label="Volume"
                            value={videoMuted ? 0 : videoVolume}
                            onChange={handleVolumeChange}
                            style={{ width: '68px', accentColor: '#38bdf8', cursor: 'pointer' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {videoBuffering && (
                          <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.75rem' }}>
                            Buffering…
                          </span>
                        )}
                        {isOffline && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}>
                            <WifiOff size={13} /> Offline
                          </span>
                        )}

                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#cbd5e1', fontSize: '0.76rem' }}>
                          Speed:
                          <select
                            aria-label="Playback speed"
                            value={videoPlaybackRate}
                            onChange={handlePlaybackRateChange}
                            style={{
                              background: '#0f172a',
                              color: '#f8fafc',
                              border: '1px solid #475569',
                              borderRadius: '6px',
                              padding: '0.2rem 0.45rem',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {PLAYBACK_SPEEDS.map(rate => (
                              <option key={rate} value={rate}>
                                {rate}x
                              </option>
                            ))}
                          </select>
                        </label>

                        <button
                          type="button"
                          onClick={handleToggleFullscreen}
                          aria-label={videoFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: '#334155',
                            color: '#f8fafc',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {videoFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                          {videoFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
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
                      {documentFilename
                        ? `${documentFilename} • Private Fairmacs training document`
                        : 'Private Fairmacs training document'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                    {pdfPageCount > 0 && (
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '999px',
                          padding: '0.25rem 0.75rem',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}
                      >
                        {pdfPageCount} {pdfPageCount === 1 ? 'Page' : 'Pages'}
                      </span>
                    )}
                  </div>
                </div>

                {(documentLoading || pdfRendering) && (
                  <div role="status" style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>
                    {documentLoading ? 'Loading document securely…' : 'Rendering PDF pages…'}
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

                {!documentLoading && !documentError && documentBlob &&
                  (documentContentType === 'application/pdf' ||
                    lessonType === 'pdf' ||
                    (lessonType === 'document' && !documentContentType.includes('wordprocessingml.document'))) && (
                    <div
                      key={documentLessonId}
                      ref={pdfContainerRef}
                      onContextMenu={event => event.preventDefault()}
                      aria-label={documentFilename || activeLesson?.title || 'Lesson PDF content'}
                      style={{
                        width: '100%',
                        maxHeight: '72dvh',
                        minHeight: '500px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        boxSizing: 'border-box',
                        userSelect: 'none'
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

                {!documentLoading && !documentError && !documentBlob && !documentUrl && (
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
                      pdfRendering ||
                      Boolean(documentError) ||
                      !documentBlob
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
                {activeLesson?.summary || activeLesson?.contentText || 'No summary authored for this lesson.'}
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
                            l => (l.dbId ?? l.id) === (lesson.dbId ?? lesson.id)
                          );

                        const isSelected =
                          currentLessonIndex === idxInAll;

                        const lessonDbId =
                          lesson.dbId;

                        const isDone =
                          Boolean(
                            completedLessons[lessonDbId]
                          );

                        const unlocked =
                          isHrAdmin || isLessonUnlocked(idxInAll);

                        const lockReason =
                          unlocked ? null : getLessonLockReason(idxInAll);

                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            disabled={!unlocked}
                            onClick={() =>
                              handleSelectLesson(idxInAll)
                            }
                            title={lockReason || (isDone ? 'Completed lesson (click to review)' : lesson.title)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.5rem 0.65rem',
                              borderRadius: '6px',
                              background:
                                isSelected
                                  ? '#0f172a'
                                  : isDone
                                  ? '#f0fdf4'
                                  : !unlocked
                                  ? '#f8fafc'
                                  : 'white',
                              color:
                                isSelected
                                  ? 'white'
                                  : isDone
                                  ? '#166534'
                                  : !unlocked
                                  ? '#94a3b8'
                                  : '#334155',
                              border:
                                isSelected
                                  ? '1px solid #0f172a'
                                  : isDone
                                  ? '1px solid #bbf7d0'
                                  : !unlocked
                                  ? '1px dashed #cbd5e1'
                                  : '1px solid #e2e8f0',
                              fontSize: '0.78rem',
                              textAlign: 'left',
                              cursor: !unlocked ? 'not-allowed' : 'pointer',
                              opacity: !unlocked ? 0.65 : 1,
                              transition: 'all 0.12s ease'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                overflow: 'hidden'
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
                              ) : !unlocked ? (
                                <Lock
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color: '#94a3b8',
                                    flexShrink: 0
                                  }}
                                />
                              ) : isSelected ? (
                                <Circle
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color: '#38bdf8',
                                    fill: '#38bdf8',
                                    flexShrink: 0
                                  }}
                                />
                              ) : (
                                <Circle
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color: '#94a3b8',
                                    flexShrink: 0
                                  }}
                                />
                              )}

                              <span
                                style={{
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                  fontWeight: isSelected ? 700 : 500
                                }}
                              >
                                {lesson.title}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: '0.7rem',
                                opacity: 0.8,
                                marginLeft: 'auto'
                              }}
                            >
                              {!unlocked ? 'Locked' : lesson.duration}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>

                  {(() => {
                    const modState = getModuleQuizState(module);
                    if (!modState.available) return null;
                    const { quiz: moduleQuiz, isPassed, isLocked, lockReason, cooldown } = modState;

                    return (
                      <div key={`quiz-${moduleQuiz.id || moduleQuiz.quizId}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.65rem' }}>
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            if (!isLocked) {
                              openQuiz(moduleQuiz, false, module.title);
                            } else if (lockReason) {
                              alert(lockReason);
                            }
                          }}
                          title={lockReason || (isPassed ? 'Module Quiz Passed' : 'Take Module Quiz')}
                          style={{
                            width: '100%', padding: '0.7rem 0.75rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '0.5rem', borderRadius: '8px',
                            border: `1px solid ${isPassed ? '#86efac' : isLocked ? '#fecaca' : '#a7f3d0'}`,
                            background: isPassed ? '#f0fdf4' : isLocked ? '#fff1f2' : '#ecfdf5',
                            color: isPassed ? '#15803d' : isLocked ? '#9f1239' : '#065f46',
                            fontWeight: 800,
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                            opacity: isLocked ? 0.85 : 1
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isPassed ? (
                              <CheckCircle style={{ width: 16, height: 16, color: '#16a34a' }} />
                            ) : isLocked ? (
                              <Lock style={{ width: 16, height: 16 }} />
                            ) : (
                              <Award style={{ width: 16, height: 16 }} />
                            )}
                            {isPassed ? 'Passed · ' : isLocked ? 'Locked · ' : 'Module Quiz · '}
                            {moduleQuiz.title || module.title}
                          </span>
                          {cooldown.active ? (
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '.78rem', whiteSpace: 'nowrap' }}>
                              {formatCountdown(cooldown.remaining)}
                            </span>
                          ) : (
                            <ChevronRight style={{ width: 16, height: 16 }} />
                          )}
                        </button>

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
        className="mn-course-bottom-bar"
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
            {progressPercent}% Complete
          </span>
        </div>

        <div
          className="mn-course-bottom-nav"
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
              currentLessonIndex === totalLessons - 1 ||
              (!isHrAdmin && !isLessonUnlocked(currentLessonIndex + 1))
            }
            title={
              currentLessonIndex < totalLessons - 1 && !isHrAdmin && !isLessonUnlocked(currentLessonIndex + 1)
                ? (getLessonLockReason(currentLessonIndex + 1) || 'Next lesson is locked')
                : 'Next lesson'
            }
            style={{
              opacity:
                currentLessonIndex === totalLessons - 1 ||
                (!isHrAdmin && !isLessonUnlocked(currentLessonIndex + 1))
                  ? 0.5
                  : 1,
              cursor:
                currentLessonIndex === totalLessons - 1 ||
                (!isHrAdmin && !isLessonUnlocked(currentLessonIndex + 1))
                  ? 'not-allowed'
                  : 'pointer'
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

      {viewingCertificate && (
        <CertificateViewer
          certificate={viewingCertificate}
          onClose={() => setViewingCertificate(null)}
        />
      )}
    </div>
  );
}