import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { useAuth } from '../context/AuthContext';
import { useEnrollmentStore } from '../stores/enrollmentStore';

export default function QuizModal({
  quiz,
  onClose,
  onPassCertificate
}) {
  const { user } = useAuth();

  const {
    completeCourse,
    isLoading
  } = useEnrollmentStore();

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const [timeLeftSeconds, setTimeLeftSeconds] = useState(
    (quiz.timeLimitMinutes || 15) * 60
  );

  const [generatingCert, setGeneratingCert] = useState(false);

  // Timer Countdown
  useEffect(() => {
    if (submitted) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submitted]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId, optionIndex) => {
    if (submitted) return;

    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const toggleFlag = (questionId) => {
    setFlagged((prev) => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleSubmitQuiz = () => {
    let correctCount = 0;

    quiz.questions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) {
        correctCount++;
      }
    });

    const calculatedScore = Math.round(
      (correctCount / quiz.questions.length) * 100
    );

    setScore(calculatedScore);
    setSubmitted(true);

    if (
      calculatedScore >=
      (quiz.passingScore || 80)
    ) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const currentQ = quiz.questions[currentQIndex];

  const isPassed =
    score >= (quiz.passingScore || 80);

  return (
    <div className="modal-overlay">
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '750px',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Top Header */}
        <div
          style={{
            background: '#0f172a',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'white'
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#38bdf8',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              Fairmacs Verified Assessment Engine
            </div>

            <h2
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                marginTop: '0.1rem'
              }}
            >
              {quiz.title}
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            {!submitted && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border:
                    '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <Clock
                  style={{
                    width: 15,
                    height: 15
                  }}
                />

                {formatTimer(timeLeftSeconds)}
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                padding: '0.4rem',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <X
                style={{
                  width: 20,
                  height: 20
                }}
              />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.75rem' }}>
          {!submitted ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}
            >
              {/* Question Navigation */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#0284c7'
                  }}
                >
                  Question {currentQIndex + 1} of{' '}
                  {quiz.questions.length}
                </div>

                <button
                  onClick={() =>
                    toggleFlag(currentQ.id)
                  }
                  style={{
                    background: flagged[currentQ.id]
                      ? '#fef3c7'
                      : '#f8fafc',
                    color: flagged[currentQ.id]
                      ? '#b45309'
                      : '#64748b',
                    border: flagged[currentQ.id]
                      ? '1px solid #fcd34d'
                      : '1px solid #cbd5e1',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer'
                  }}
                >
                  <Flag
                    style={{
                      width: 14,
                      height: 14
                    }}
                  />

                  {flagged[currentQ.id]
                    ? 'Flagged for Review'
                    : 'Flag Question'}
                </button>
              </div>

              {/* Active Question */}
              <div
                style={{
                  background: '#f8fafc',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '1.25rem',
                    lineHeight: 1.5
                  }}
                >
                  {currentQ.question}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem'
                  }}
                >
                  {currentQ.options.map(
                    (opt, optIdx) => {
                      const isSelected =
                        answers[currentQ.id] === optIdx;

                      return (
                        <button
                          key={optIdx}
                          onClick={() =>
                            handleSelectOption(
                              currentQ.id,
                              optIdx
                            )
                          }
                          style={{
                            textAlign: 'left',
                            padding: '0.85rem 1.1rem',
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
                              'all 0.12s ease'
                          }}
                        >
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              border: isSelected
                                ? '7px solid #0284c7'
                                : '2px solid #cbd5e1',
                              background: 'white',
                              display: 'inline-block',
                              flexShrink: 0
                            }}
                          />

                          <span>{opt}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Bottom Pagination */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.5rem'
                }}
              >
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setCurrentQIndex((prev) =>
                      Math.max(0, prev - 1)
                    )
                  }
                  disabled={currentQIndex === 0}
                  style={{
                    opacity:
                      currentQIndex === 0 ? 0.5 : 1
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

                {currentQIndex <
                quiz.questions.length - 1 ? (
                  <button
                    className="btn-primary"
                    onClick={() =>
                      setCurrentQIndex((prev) =>
                        Math.min(
                          quiz.questions.length - 1,
                          prev + 1
                        )
                      )
                    }
                  >
                    Next Question

                    <ChevronRight
                      style={{
                        width: 16,
                        height: 16
                      }}
                    />
                  </button>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={handleSubmitQuiz}
                    disabled={
                      Object.keys(answers).length <
                      quiz.questions.length
                    }
                    style={{
                      background:
                        'linear-gradient(135deg, #10b981, #059669)',
                      padding: '0.65rem 1.5rem',
                      fontSize: '0.92rem'
                    }}
                  >
                    Submit Final Assessment
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Result Screen */
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem 1rem'
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
                    margin: '0 auto 1rem'
                  }}
                >
                  <CheckCircle
                    style={{
                      width: 44,
                      height: 44
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
                    margin: '0 auto 1rem'
                  }}
                >
                  <AlertCircle
                    style={{
                      width: 44,
                      height: 44
                    }}
                  />
                </div>
              )}

              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#0f172a'
                }}
              >
                {isPassed
                  ? 'Congratulations! Assessment Passed!'
                  : 'Retake Assessment Required'}
              </h3>

              <div
                style={{
                  fontSize: '2.8rem',
                  fontWeight: 900,
                  color: isPassed
                    ? '#16a34a'
                    : '#e11d48',
                  margin: '0.5rem 0'
                }}
              >
                {score}%
              </div>

              <p
                style={{
                  color: '#64748b',
                  fontSize: '0.9rem',
                  maxWidth: '480px',
                  margin: '0 auto 1.5rem',
                  lineHeight: 1.5
                }}
              >
                {isPassed
                  ? 'You have satisfied Fairmacs global operational compliance criteria for this training track.'
                  : 'The minimum passing benchmark is 80%. Please review the learning materials and try again.'}
              </p>

              {/* Review Answers */}
              <div
                style={{
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'left',
                  marginBottom: '1.5rem',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    marginBottom: '0.5rem'
                  }}
                >
                  Assessment Answer Key Review:
                </div>

                {quiz.questions.map((q, idx) => {
                  const userAns = answers[q.id];

                  const isCorrect =
                    userAns === q.correctIndex;

                  return (
                    <div
                      key={q.id}
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.35rem 0',
                        borderBottom:
                          '1px solid #f1f5f9'
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: isCorrect
                            ? '#16a34a'
                            : '#e11d48'
                        }}
                      >
                        Q{idx + 1}:{' '}
                        {isCorrect
                          ? '✓ Correct'
                          : '✗ Incorrect'}{' '}
                        —
                      </span>{' '}

                      <span
                        style={{
                          color: '#334155'
                        }}
                      >
                        Selected:{' '}
                        {q.options[userAns] ||
                          'None'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Result Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '1rem'
                }}
              >
                {isPassed ? (
                  <button
                    className="btn-primary"
                    disabled={generatingCert}
                    onClick={async () => {
                      setGeneratingCert(true);

                      try {
                        const courseId =
                          quiz.courseId;

                        const userId =
                          user?.id || 'EMP1001';

                        const result =
                          await completeCourse(
                            userId,
                            courseId,
                            score,
                            {
                              enrollmentId:
                                quiz.enrollmentId,

                              courseCode:
                                quiz.courseCode
                            }
                          );

                        if (
                          !result?.success ||
                          !result?.certificate
                        ) {
                          throw new Error(
                            result?.error ||
                              'Unable to generate the certificate. Please try again.'
                          );
                        }

                        const certInfo =
                          result.certificate;

                        onClose();

                        onPassCertificate(
                          certInfo
                        );
                      } catch (error) {
                        console.error(
                          'Certificate generation failed:',
                          error
                        );

                        alert(
                          error?.message ||
                            'Unable to generate the certificate. Please try again.'
                        );
                      } finally {
                        setGeneratingCert(false);
                      }
                    }}
                    style={{
                      background:
                        'linear-gradient(135deg, #10b981, #059669)',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.95rem'
                    }}
                  >
                    {generatingCert ? (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <Loader2
                          style={{
                            width: 20,
                            height: 20
                          }}
                          className="animate-spin"
                        />

                        Generating Credential…
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <Award
                          style={{
                            width: 20,
                            height: 20
                          }}
                        />

                        View & Download Certificate
                      </span>
                    )}
                  </button>
                ) : (
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSubmitted(false);
                      setAnswers({});
                      setCurrentQIndex(0);
                      setTimeLeftSeconds(
                        (quiz.timeLimitMinutes || 15) *
                          60
                      );
                    }}
                    style={{
                      padding: '0.75rem 1.5rem'
                    }}
                  >
                    <RotateCcw
                      style={{
                        width: 16,
                        height: 16
                      }}
                    />

                    Retake Assessment
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}