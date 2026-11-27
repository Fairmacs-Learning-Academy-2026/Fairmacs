import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  X,
  CheckCircle,
  AlertCircle,
  Award,
  Flag,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Loader2,
  Lock,
} from 'lucide-react';

import confetti from 'canvas-confetti';

import { useAuth } from '../context/AuthContext';
import { useEnrollmentStore } from '../stores/enrollmentStore';
import quizService from '../services/quizService';
import { notifyEnrollmentUpdated } from '../utils/enrollmentSync';

export default function QuizModal({
  quiz,
  onClose,
  onPassCertificate,
}) {
  const { user } = useAuth();

  const {
    completeCourse,
    isLoading,
  } = useEnrollmentStore();

  const [attempt, setAttempt] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [cooldownStatus, setCooldownStatus] = useState(null);
  const [cooldownNow, setCooldownNow] = useState(Date.now());
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const cleanOptionText = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/^(?:\[?[A-Da-d1-4]\]?[.:)\-]\s*|(?:option\s*[A-Da-d1-4][:.)]?\s*))/i, '')
      .trim();
  };

  const [generatingCert, setGeneratingCert] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Preview mode is read-only and must never start a learner attempt.
  const previewMode = Boolean(quiz?.previewMode);

  const answersRef = useRef({});
  const submittedRef = useRef(false);
  const attemptStartedAtRef = useRef(null);
  const isStartingRef = useRef(false);

  const userId =
    user?.id ??
    user?.userId ??
    user?.dbId ??
    null;

  const quizId = (() => {
    const id = quiz?.id ?? quiz?.dbId ?? quiz?.quizDbId;

    if (id == null || !/^\d+$/.test(String(id))) {
      return null;
    }

    return String(id);
  })();

  const questions = attempt?.questions || [];
  const currentQ = questions[currentQIndex];

  const getAuthToken = () =>
    localStorage.getItem('fairmacs_token') ||
    localStorage.getItem('fairmacs_lms_token') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    '';

  const getApiBaseUrl = () => SHARED_API_BASE_URL;

  const loadCooldownStatus = useCallback(async () => {
    if (!quizId || previewMode) return null;
    const token = getAuthToken();
    if (!token) return null;

    try {
      const response = await authFetch(
        `${getApiBaseUrl()}/quizzes/${encodeURIComponent(quizId)}/unlock-status`,
        {
          method: 'GET',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) return null;
      const payload = await response.json();
      // Support both a direct DTO and common { data: DTO } API envelopes.
      const data = payload?.data && typeof payload.data === 'object'
        ? payload.data
        : payload;
      setCooldownStatus(data);
      setCooldownNow(Date.now());
      return data;
    } catch (statusError) {
      console.warn('Unable to load quiz cooldown status:', statusError);
      return null;
    }
  }, [quizId, previewMode]);

  useEffect(() => {
    if (!cooldownStatus?.cooldownActive) return undefined;
    const timer = setInterval(() => setCooldownNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldownStatus]);

  const retryAtMs = cooldownStatus?.retryAvailableAt
    ? new Date(cooldownStatus.retryAvailableAt).getTime()
    : NaN;
  const cooldownSecondsRemaining = Number.isFinite(retryAtMs)
    ? Math.max(0, Math.ceil((retryAtMs - cooldownNow) / 1000))
    : Math.max(0, Number(cooldownStatus?.remainingSeconds || 0));
  const cooldownIsActive = Boolean(
    cooldownStatus?.cooldownActive && cooldownSecondsRemaining > 0
  );
  const formatCooldown = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const resetAttemptState = useCallback(() => {
    setAttempt(null);
    setCurrentQIndex(0);
    setAnswers({});
    answersRef.current = {};
    setFlagged({});
    setSubmitted(false);
    submittedRef.current = false;
    setResult(null);
    setElapsedSeconds(0);
    setError('');
  }, []);

  const loadQuizPreview = useCallback(async () => {
    if (!quizId) {
      setError('This assessment is not linked to a valid quiz ID.');
      setLoadingQuiz(false);
      return;
    }

    if (isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      setLoadingQuiz(true);
      setError('');
      setPreviewData(null);

      const token =
        localStorage.getItem('fairmacs_token') ||
        localStorage.getItem('fairmacs_lms_token') ||
        localStorage.getItem('accessToken') ||
        localStorage.getItem('token') ||
        '';

      if (!token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const apiBaseUrl = SHARED_API_BASE_URL;

      const response = await authFetch(
        `${apiBaseUrl}/quizzes/${encodeURIComponent(quizId)}/preview`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        if (response.status === 403) {
          throw new Error('Only HR/Admin users can preview quiz answers.');
        }
        if (response.status === 404) {
          throw new Error('Quiz not found.');
        }
        throw new Error(`Unable to load quiz preview (HTTP ${response.status}).`);
      }

      const data = await response.json();
      if (!Array.isArray(data?.questions)) {
        throw new Error('The server returned an invalid quiz preview.');
      }

      setPreviewData(data);
    } catch (err) {
      console.error('Load quiz preview error:', err);
      setError(err?.message || 'Unable to load quiz preview.');
    } finally {
      isStartingRef.current = false;
      setLoadingQuiz(false);
    }
  }, [quizId]);

  const startQuiz = useCallback(async () => {
    if (!quizId) {
      setError(
        'quiz is unavailable. Please contact your administrator.'
      );
      setLoadingQuiz(false);
      return;
    }

    if (!userId) {
      setError(
        'Unable to identify the logged-in employee.'
      );
      setLoadingQuiz(false);
      return;
    }

    try {
      setLoadingQuiz(true);
      setError('');
      setMaxAttemptsReached(false);

      resetAttemptState();

      const data = await quizService.startQuiz(quizId);

      if (data?.alreadyPassed) {
        setResult(data);
        setSubmitted(true);
        setLoadingQuiz(false);
        return;
      }

      if (!data?.attemptId || !Array.isArray(data?.questions)) {
        throw new Error(
          'Invaild attempt! Please refresh and try again.'
        );
      }

      setAttempt(data);

      const limitSeconds =
        Number(data.timeLimitMinutes || 0) * 60;

      setTimeLeftSeconds(limitSeconds);
      attemptStartedAtRef.current = Date.now();
    } catch (err) {
      console.error('Start quiz error:', err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Unable to start this assessment.';
      const attemptLimitError =
        /maximum.{0,30}attempt|attempts?.{0,20}reached|no attempts remaining|cooldown|retry available|attempt limit/i.test(
          `${message} ${JSON.stringify(err?.response?.data || {})}`
        );
      if (attemptLimitError) {
        setMaxAttemptsReached(true);
        const status = await loadCooldownStatus();
        if (status?.cooldownActive) {
          setError(status.message || 'You have reached the attempt limit. Please wait and try again.');
        } else {
          setError(message);
        }
      } else {
        setError(message);
      }
    } finally {
      setLoadingQuiz(false);
    }
  }, [quizId, userId, resetAttemptState, loadCooldownStatus]);

  useEffect(() => {
    if (previewMode || !maxAttemptsReached || cooldownIsActive) return undefined;
    // Once the displayed cooldown expires, re-check server eligibility.
    const timer = setInterval(() => {
      loadCooldownStatus().then((status) => {
        if (status && !status.cooldownActive) {
          setMaxAttemptsReached(false);
          setError('Cooldown ended. You can try starting the assessment now.');
        }
      });
    }, 15000);
    return () => clearInterval(timer);
  }, [previewMode, maxAttemptsReached, cooldownIsActive, loadCooldownStatus]);

  useEffect(() => {
    if (previewMode) {
      loadQuizPreview();
    } else {
      loadCooldownStatus().then((status) => {
        if (status?.alreadyPassed) {
          const attemptData = status.latestAttempt || {
            score: status.bestScore ?? status.score ?? 100,
            passed: true,
            totalQuestions: status.totalQuestions ?? 0,
            correctAnswers: status.correctAnswers ?? 0,
            wrongAnswers: status.wrongAnswers ?? 0,
            passingScore: status.passingScore ?? 70,
          };
          setResult({
            ...attemptData,
            quizType: status.quizType,
            alreadyPassed: true,
          });
          setSubmitted(true);
          setLoadingQuiz(false);
        } else if (status?.cooldownActive) {
          setMaxAttemptsReached(true);
          setError(status.message || 'Maximum quiz attempts reached. Please wait and try again.');
          setLoadingQuiz(false);
        } else {
          startQuiz();
        }
      });
    }
  }, [previewMode, loadQuizPreview, startQuiz, loadCooldownStatus]);

  const submitCurrentAttempt = useCallback(
    async (forced = false) => {
      if (
        submittedRef.current ||
        submitting ||
        !attempt?.attemptId
      ) {
        return;
      }

      submittedRef.current = true;
      setSubmitting(true);
      setError('');

      const startedAt =
        attemptStartedAtRef.current || Date.now();

      const calculatedElapsed = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000)
      );

      const timeTaken = Math.max(
        0,
        forced
          ? Math.max(
              calculatedElapsed,
              Number(
                attempt.timeLimitMinutes || 0
              ) * 60
            )
          : calculatedElapsed
      );

      try {
        const serverResult =
          await quizService.submitQuiz(
            attempt.attemptId,
            answersRef.current,
            timeTaken
          );

        setResult(serverResult);
        setSubmitted(true);

        const isCompletedOnBackend =
          Boolean(serverResult?.courseCompleted) ||
          (Boolean(serverResult?.passed) &&
            (quiz?.type === 'FINAL' ||
              quiz?.quizType === 'FINAL' ||
              quiz?.isFinal ||
              quiz?.isFinalQuiz));

        if (isCompletedOnBackend) {
          notifyEnrollmentUpdated({
            source: 'quiz-final-assessment-completed',
            courseCompleted: true,
          });
        }

        if (serverResult?.passed) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      } catch (err) {
        console.error('Submit quiz error:', err);

        submittedRef.current = false;

        setError(
          err?.message ||
            'Unable to submit the assessment.'
        );
      } finally {
        setSubmitting(false);
      }
    },
    [attempt, submitting]
  );

  // Countdown timer. The final submission is still
  // graded by the backend.
  useEffect(() => {
    if (
      loadingQuiz ||
      submitted ||
      !attempt ||
      !attemptStartedAtRef.current
    ) {
      return undefined;
    }

    const timer = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() -
          attemptStartedAtRef.current) /
          1000
      );

      setElapsedSeconds(elapsed);

      const limit =
        Number(attempt.timeLimitMinutes || 0) *
        60;

      if (limit > 0) {
        const remaining = Math.max(
          0,
          limit - elapsed
        );

        setTimeLeftSeconds(remaining);

        if (remaining === 0) {
          clearInterval(timer);
          submitCurrentAttempt(true);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    loadingQuiz,
    submitted,
    attempt,
    submitCurrentAttempt,
  ]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins
      .toString()
      .padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleSelectOption = (
    questionId,
    optionValue
  ) => {
    if (submitted || submitting) return;

    const currentQuestion = (attempt?.questions || []).find(
      (q) => String(q.id) === String(questionId)
    );
    const isMultiSelect = currentQuestion?.questionType === 'MULTI_SELECT';

    setAnswers((prev) => {
      let nextValue;
      if (isMultiSelect) {
        const existing = (prev[questionId] || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const exists = existing.includes(optionValue);
        let updated;
        if (exists) {
          updated = existing.filter((v) => v !== optionValue);
        } else {
          updated = [...existing, optionValue];
        }
        updated.sort();
        nextValue = updated.join(',');
      } else {
        nextValue = optionValue;
      }

      const next = {
        ...prev,
        [questionId]: nextValue,
      };

      answersRef.current = next;
      return next;
    });
  };

  const toggleFlag = (questionId) => {
    if (submitted) return;

    setFlagged((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const answeredCount =
    Object.keys(answers).length;

  const isLastQuestion =
    currentQIndex === questions.length - 1;

  const isPassed = Boolean(result?.passed);

  const isFinalQuiz =
    quiz?.type === 'FINAL' ||
    quiz?.quizType === 'FINAL' ||
    result?.quizType === 'FINAL' ||
    cooldownStatus?.quizType === 'FINAL' ||
    Boolean(quiz?.isFinal) ||
    Boolean(quiz?.isFinalQuiz);

  const passingScore =
    Number(
      result?.passingScore ??
        attempt?.passingScore ??
        quiz?.passingScore ??
        70
    );

  const handleGenerateCertificate =
    async () => {
      if (!isPassed || !isFinalQuiz) return;

      setGeneratingCert(true);

      try {
        const courseId =
          quiz?.courseId ??
          quiz?.courseDbId ??
          quiz?.course?.id;

        const score = Number(result?.score ?? 0);

        const completionResult =
          await completeCourse(
            userId,
            courseId,
            score,
            {
              enrollmentId:
                quiz?.enrollmentId,
              courseCode:
                quiz?.courseCode,
            }
          );

        if (
          !completionResult?.success ||
          !completionResult?.certificate
        ) {
          throw new Error(
            completionResult?.error ||
              'Unable to generate the certificate. Please try again.'
          );
        }

        onClose();

        onPassCertificate(
          completionResult.certificate
        );
      } catch (err) {
        console.error(
          'Certificate generation failed:',
          err
        );

        alert(
          err?.message ||
            'Unable to generate the certificate. Please try again.'
        );
      } finally {
        setGeneratingCert(false);
      }
    };

  if (loadingQuiz) {
    return (
      <div className="modal-overlay">
        <div
          className="modal-content animate-fade-in"
          style={{
            maxWidth: '520px',
            padding: '2.5rem',
            textAlign: 'center',
          }}
        >
          <Loader2
            className="animate-spin"
            style={{
              width: 42,
              height: 42,
              margin: '0 auto 1rem',
              color: '#0284c7',
            }}
          />

          <h3
            style={{
              margin: 0,
              color: '#0f172a',
            }}
          >
            {previewMode ? 'Loading quiz preview...' : 'Starting assessment...'}
          </h3>

          <p
            style={{
              color: '#64748b',
              marginTop: '0.5rem',
            }}
          >
            {previewMode
              ? 'Loading questions and answer keys without creating an attempt.'
              : 'Verifying your eligibility and creating a secure quiz attempt.'}
          </p>
        </div>
      </div>
    );
  }

  if (error && !attempt && !submitted) {
    return (
      <div className="modal-overlay">
        <div
          className="modal-content animate-fade-in"
          style={{
            maxWidth: '560px',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#1F2328',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#0B5CAB',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Fairmacs Verified Assessment Engine
              </div>

              <h2
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  margin: '0.1rem 0 0',
                }}
              >
                {quiz?.title || 'Assessment'}
              </h2>
            </div>

            <button
              onClick={onClose}
              style={{
                background:
                  'rgba(255,255,255,0.1)',
                border: 'none',
                padding: '0.4rem',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              <X
                style={{
                  width: 20,
                  height: 20,
                }}
              />
            </button>
          </div>

          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            {cooldownIsActive ? (
              <Lock style={{ width: 52, height: 52, color: '#e11d48', margin: '0 auto 1rem' }} />
            ) : (
              <AlertCircle
              style={{
                width: 52,
                height: 52,
                color: '#e11d48',
                margin: '0 auto 1rem',
              }}
            />
            )}

            <h3
              style={{
                color: '#0f172a',
                marginBottom: '0.5rem',
              }}
            >
              {cooldownIsActive ? 'Assessment temporarily locked' : 'Assessment unavailable'}
            </h3>

            <p
              style={{
                color: '#64748b',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
              }}
            >
              {cooldownIsActive
                ? 'You did not pass this assessment. Try again after 5-minute.'
                : error}
            </p>

            {cooldownIsActive && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '1rem', margin: '0 auto 1.5rem', maxWidth: 360 }}>
                <div style={{ color: '#9f1239', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quiz available in</div>
                <div aria-live="polite" style={{ color: '#be123c', fontSize: '1.8rem', fontWeight: 900, margin: '0.35rem 0' }}>{formatCooldown(cooldownSecondsRemaining)}</div>
                {cooldownStatus?.retryAvailableAt && (
                  <div style={{ color: '#881337', fontSize: '0.8rem' }}>Available at: {new Date(cooldownStatus.retryAvailableAt).toLocaleString()}</div>
                )}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.75rem',
              }}
            >
              <button
                className="btn-secondary"
                onClick={onClose}
              >
                Close
              </button>

              {!cooldownIsActive && !maxAttemptsReached && (
                <button
                  className="btn-primary"
                  onClick={previewMode ? loadQuizPreview : startQuiz}
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (previewMode) {
    const previewQuestions = previewData?.questions || [];
    return (
      <div className="modal-overlay">
        <div
          className="modal-content animate-fade-in"
          style={{ maxWidth: '850px', padding: 0, overflow: 'hidden', maxHeight: '90dvh', overflowY: 'auto' }}
        >
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
            padding: '1.25rem 1.5rem',
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: '1rem', color: '#1F2328',
            position: 'sticky', top: 0, zIndex: 2
          }}>
            <div>
              <div style={{
                fontSize: '0.72rem', fontWeight: 800, color: '#0B5CAB',
                textTransform: 'uppercase', letterSpacing: '1px'
              }}>
                Read-only preview
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.25rem 0 0' }}>
                {previewData?.title || quiz?.title || 'Quiz Preview'}
              </h2>
              <p style={{ margin: '0.35rem 0 0', color: '#656D76', fontSize: '0.8rem' }}>
                {previewQuestions.length} questions · No attempt or learner progress will be changed
              </p>
            </div>
            <button type="button" aria-label="Close quiz preview" onClick={onClose} style={{
              background: 'rgba(255,255,255,0.1)', border: 0, padding: '0.45rem',
              borderRadius: '50%', color: 'white', cursor: 'pointer', flexShrink: 0
            }}>
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>

          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {previewData && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '0.6rem',
                color: '#334155', fontSize: '0.8rem'
              }}>
                <span style={{ background: '#f1f5f9', padding: '0.4rem 0.65rem', borderRadius: 7 }}>
                  Passing score: {previewData.passingScore ?? '—'}%
                </span>
                <span style={{ background: '#f1f5f9', padding: '0.4rem 0.65rem', borderRadius: 7 }}>
                  Time limit: {previewData.timeLimitMinutes ?? '—'} min
                </span>
                <span style={{ background: '#f1f5f9', padding: '0.4rem 0.65rem', borderRadius: 7 }}>
                  Retake policy: 5-minute cooldown
                </span>
              </div>
            )}

            {previewQuestions.map((question, index) => {
              const options = question.options || {};
              const optionEntries = Array.isArray(options)
                ? options.map(option => [option.value, option.text])
                : Object.entries(options);
              const correctAnswer = String(question.correctAnswer ?? '').trim().toUpperCase();

              return (
                <section key={question.id ?? question.questionId ?? index} style={{
                  border: '1px solid #e2e8f0', borderRadius: 12,
                  padding: '1rem', background: 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.8rem' }}>
                    <strong style={{ color: '#0284c7', fontSize: '0.78rem' }}>
                      QUESTION {index + 1}{question.questionId ? ` · ${question.questionId}` : ''}
                    </strong>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      {question.questionType || 'Multiple choice'}
                    </span>
                  </div>
                  <p style={{ color: '#0f172a', fontWeight: 700, lineHeight: 1.5, margin: '0 0 0.9rem' }}>
                    {question.question || question.questionText || 'Question text unavailable'}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {optionEntries.map(([key, value]) => {
                      const optionKey = String(key ?? '').trim().toUpperCase();
                      const isCorrect = correctAnswer
                        .split(',')
                        .map((s) => s.trim().toUpperCase())
                        .includes(optionKey);
                      return (
                        <div key={optionKey} style={{
                          display: 'flex', alignItems: 'center', gap: '0.65rem',
                          padding: '0.7rem 0.8rem', borderRadius: 8,
                          border: isCorrect ? '1px solid #86efac' : '1px solid #e2e8f0',
                          background: isCorrect ? '#f0fdf4' : '#f8fafc',
                          color: isCorrect ? '#166534' : '#334155'
                        }}>
                          <span style={{ flex: 1 }}>{cleanOptionText(value) ?? '—'}</span>
                          {isCorrect && <span style={{ fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap' }}>✓ Correct answer</span>}
                        </div>
                      );
                    })}
                  </div>
                  {!correctAnswer && (
                    <p style={{ margin: '0.7rem 0 0', color: '#b45309', fontSize: '0.8rem' }}>
                      No correct answer is configured for this question.
                    </p>
                  )}
                </section>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
              <button type="button" className="btn-primary" onClick={onClose}>Close Preview</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '750px',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#1F2328',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#0B5CAB',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Fairmacs Verified Assessment Engine
            </div>

            <h2
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                margin: '0.1rem 0 0',
              }}
            >
              {quiz?.title || 'Assessment'}
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            {!submitted && (
              <div
                style={{
                  background:
                    'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border:
                    '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <Clock
                  style={{
                    width: 15,
                    height: 15,
                  }}
                />
                {formatTimer(timeLeftSeconds)}
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                background:
                  'rgba(255,255,255,0.1)',
                border: 'none',
                padding: '0.4rem',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              <X
                style={{
                  width: 20,
                  height: 20,
                }}
              />
            </button>
          </div>
        </div>

        <div style={{ padding: '1.75rem' }}>
          {error && attempt && !submitted && (
            <div
              style={{
                background: '#fff1f2',
                color: '#be123c',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          {!submitted ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#0284c7',
                  }}
                >
                  Question {currentQIndex + 1} of{' '}
                  {questions.length}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748b',
                      fontWeight: 600,
                    }}
                  >
                    {answeredCount}/{questions.length}{' '}
                    answered
                  </span>

                  <button
                    onClick={() =>
                      toggleFlag(currentQ.id)
                    }
                    style={{
                      background:
                        flagged[currentQ.id]
                          ? '#fef3c7'
                          : '#f8fafc',
                      color:
                        flagged[currentQ.id]
                          ? '#b45309'
                          : '#64748b',
                      border:
                        flagged[currentQ.id]
                          ? '1px solid #fcd34d'
                          : '1px solid #cbd5e1',
                      padding:
                        '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Flag
                      style={{
                        width: 14,
                        height: 14,
                      }}
                    />

                    {flagged[currentQ.id]
                      ? 'Flagged'
                      : 'Flag'}
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '1.25rem',
                    lineHeight: 1.5,
                  }}
                >
                  {currentQ?.question}
                </div>

                {currentQ?.questionType === 'MULTI_SELECT' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#0369a1', background: '#e0f2fe', padding: '4px 9px', borderRadius: 6, fontWeight: 700, marginBottom: '0.75rem', width: 'fit-content' }}>
                    Multiple Answers (Select all that apply)
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                  }}
                >
                  {(currentQ?.options || []).map(
                    (opt) => {
                      const isMultiSelect = currentQ?.questionType === 'MULTI_SELECT';
                      const selectedValues = isMultiSelect
                        ? (answers[currentQ.id] || '').split(',').map((s) => s.trim()).filter(Boolean)
                        : [answers[currentQ.id]];
                      const isSelected = selectedValues.includes(opt.value);

                      return (
                        <button
                          key={opt.value}
                          onClick={() =>
                            handleSelectOption(
                              currentQ.id,
                              opt.value
                            )
                          }
                          style={{
                            textAlign: 'left',
                            padding:
                              '0.85rem 1.1rem',
                            borderRadius: '8px',
                            border: isSelected
                              ? '2px solid #0284c7'
                              : '1px solid #cbd5e1',
                            background: isSelected
                              ? '#e0f2fe'
                              : 'white',
                            color: isSelected
                              ? '#0369a1'
                              : '#334155',
                            fontWeight: isSelected
                              ? 700
                              : 500,
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.85rem',
                            cursor: 'pointer',
                            transition:
                              'all 0.12s ease',
                          }}
                        >
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: isMultiSelect ? 4 : '50%',
                              border: isSelected
                                ? (isMultiSelect ? 'none' : '7px solid #0284c7')
                                : '2px solid #cbd5e1',
                              background: isSelected && isMultiSelect ? '#0284c7' : 'white',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '0.85rem',
                              fontWeight: 900,
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && isMultiSelect ? '✓' : ''}
                          </span>

                          <span style={{ flex: 1 }}>
                            {cleanOptionText(opt.text)}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.5rem',
                }}
              >
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setCurrentQIndex((prev) =>
                      Math.max(0, prev - 1)
                    )
                  }
                  disabled={
                    currentQIndex === 0 ||
                    submitting
                  }
                  style={{
                    opacity:
                      currentQIndex === 0 ? 0.5 : 1,
                  }}
                >
                  <ChevronLeft
                    style={{
                      width: 16,
                      height: 16,
                    }}
                  />
                  Previous
                </button>

                {!isLastQuestion ? (
                  <button
                    className="btn-primary"
                    onClick={() =>
                      setCurrentQIndex((prev) =>
                        Math.min(
                          questions.length - 1,
                          prev + 1
                        )
                      )
                    }
                    disabled={submitting}
                  >
                    Next Question
                    <ChevronRight
                      style={{
                        width: 16,
                        height: 16,
                      }}
                    />
                  </button>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() =>
                      setShowConfirmSubmit(true)
                    }
                    disabled={
                      submitting ||
                      questions.length === 0
                    }
                    style={{
                      background:
                        'linear-gradient(135deg, #10b981, #059669)',
                      padding:
                        '0.65rem 1.5rem',
                      fontSize: '0.92rem',
                    }}
                  >
                    {submitting ? (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <Loader2
                          className="animate-spin"
                          style={{
                            width: 16,
                            height: 16,
                          }}
                        />
                        Submitting...
                      </span>
                    ) : (
                      'Submit'
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem 1rem',
              }}
            >
              {isPassed ? (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    background: '#dcfce7',
                    color: '#16a34a',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <CheckCircle
                    style={{
                      width: 44,
                      height: 44,
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    background: '#ffe4e6',
                    color: '#e11d48',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <AlertCircle
                    style={{
                      width: 44,
                      height: 44,
                    }}
                  />
                </div>
              )}

              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                {isPassed
                  ? 'Congratulations! Assessment Passed!'
                  : 'Assessment Not Passed'}
              </h3>

              <div
                style={{
                  fontSize: '2.8rem',
                  fontWeight: 900,
                  color: isPassed
                    ? '#16a34a'
                    : '#e11d48',
                  margin: '0.5rem 0',
                }}
              >
                {Number(result?.score ?? 0)}%
              </div>

              <p
                style={{
                  color: '#64748b',
                  fontSize: '0.9rem',
                  maxWidth: '500px',
                  margin: '0 auto 1.5rem',
                  lineHeight: 1.5,
                }}
              >
                {isPassed
                  ? ``
                  : `You need atleast ${passingScore}% to pass this assessment.`}
              </p>

              <div
                className="mn-kpi-grid-4"
                style={{
                  gap: '0.75rem',
                  maxWidth: '560px',
                  margin:
                    '0 auto 1.5rem',
                }}
              >
                <div
                  style={{
                    background: '#f8fafc',
                    border:
                      '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.8rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    {result?.totalQuestions ?? 0}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748b',
                    }}
                  >
                    Questions
                  </div>
                </div>

                <div
                  style={{
                    background: '#f0fdf4',
                    border:
                      '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '0.8rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: '#16a34a',
                    }}
                  >
                    {result?.correctAnswers ?? 0}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748b',
                    }}
                  >
                    Correct
                  </div>
                </div>

                <div
                  style={{
                    background: '#fff1f2',
                    border:
                      '1px solid #fecdd3',
                    borderRadius: '10px',
                    padding: '0.8rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: '#e11d48',
                    }}
                  >
                    {result?.wrongAnswers ?? 0}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748b',
                    }}
                  >
                    Wrong
                  </div>
                </div>

                <div
                  style={{
                    background: '#eff6ff',
                    border:
                      '1px solid #bfdbfe',
                    borderRadius: '10px',
                    padding: '0.8rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: '#2563eb',
                    }}
                  >
                    {result?.attemptsUsed ?? 1}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748b',
                    }}
                  >
                    Attempt Count
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                {isPassed ? (
                  isFinalQuiz ? (
                    <button
                      className="btn-primary"
                      disabled={
                        generatingCert ||
                        isLoading
                      }
                      onClick={
                        handleGenerateCertificate
                      }
                      style={{
                        background:
                          'linear-gradient(135deg, #10b981, #059669)',
                        padding:
                          '0.75rem 1.5rem',
                        fontSize: '0.95rem',
                      }}
                    >
                      {generatingCert ||
                      isLoading ? (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <Loader2
                            className="animate-spin"
                            style={{
                              width: 20,
                              height: 20,
                            }}
                          />
                          Generating Credential...
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <Award
                            style={{
                              width: 20,
                              height: 20,
                            }}
                          />
                          View & Download Certificate
                        </span>
                      )}
                    </button>
                  ) : (
                    <button
                      className="btn-primary"
                      onClick={onClose}
                      style={{
                        background:
                          'linear-gradient(135deg, #10b981, #059669)',
                        padding:
                          '0.75rem 1.5rem',
                        fontSize: '0.95rem',
                      }}
                    >
                      <CheckCircle
                        style={{
                          width: 20,
                          height: 20,
                          marginRight: '0.5rem',
                          display: 'inline-block',
                          verticalAlign: 'middle',
                        }}
                      />
                      Module Quiz Passed — Continue Course
                    </button>
                  )
                ) : (
                  <button
                    className="btn-secondary"
                    onClick={startQuiz}
                    disabled={
                      loadingQuiz ||
                      submitting ||
                      cooldownIsActive
                    }
                    style={{
                      padding:
                        '0.75rem 1.5rem',
                    }}
                  >
                    <RotateCcw
                      style={{
                        width: 16,
                        height: 16,
                      }}
                    />
                    {cooldownIsActive
                      ? `Cooldown Active (${formatCooldown(cooldownSecondsRemaining)})`
                      : 'Retake Assessment'}
                  </button>
                )}

                <button
                  className="btn-secondary"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showConfirmSubmit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
              }}
            >
              <AlertCircle size={28} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Submit Assessment?
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              You have answered <strong>{questions.filter(q => (answers[q.id] || []).length > 0).length}</strong> of <strong>{questions.length}</strong> questions.
            </p>

            {questions.length - questions.filter(q => (answers[q.id] || []).length > 0).length > 0 && (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#b45309',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textAlign: 'left',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>
                  You have {questions.length - questions.filter(q => (answers[q.id] || []).length > 0).length} unanswered question(s). Unanswered questions will receive 0 marks.
                </span>
              </div>
            )}

            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: 1.4 }}>
              Once submitted, your answers will be evaluated by the server. If you do not pass, a 5-minute cooldown period applies before retrying.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowConfirmSubmit(false)}
                style={{ flex: 1, padding: '0.65rem 1rem', fontWeight: 600 }}
              >
                Return to Quiz
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowConfirmSubmit(false);
                  submitCurrentAttempt(false);
                }}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  fontWeight: 600,
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                }}
              >
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
