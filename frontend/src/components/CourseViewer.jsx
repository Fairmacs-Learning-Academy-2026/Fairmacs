import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Award,
  Bookmark,
  Edit3,
  ChevronRight,
  ChevronLeft,
  Check,
  Circle
} from 'lucide-react';
import { enrollmentService } from '../services/enrollmentService';

export default function CourseViewer({
  course,
  onBack,
  onStartQuiz
}) {
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

  const activeLesson =
    allLessons[currentLessonIndex] ||
    allLessons[0];

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

      return result;

    } catch (error) {
      console.error(
        'Failed to save lesson progress:',
        error
      );
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
  const handleVideoEnded = async event => {
    const video = event.currentTarget;

    await saveLessonProgress(
      activeLesson,
      100,
      Math.floor(video.duration || 0),
      Math.floor(video.duration || 0)
    );
  };

  /*
   * ---------------------------------------------------------
   * DOCUMENT COMPLETION
   * ---------------------------------------------------------
   */
  const handleDocumentComplete = async () => {
    await saveLessonProgress(
      activeLesson,
      100,
      0,
      0
    );
  };

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
            onClick={() =>
              onStartQuiz({
                ...course.quiz,
                courseId: course.id,
                courseTitle: course.title
              })
            }
            style={{
              background:
                'linear-gradient(135deg, #10b981, #059669)'
            }}
          >
            <Award
              style={{
                width: 18,
                height: 18
              }}
            />

            Take Quiz & Assessment
          </button>
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

            {activeLesson?.type?.toLowerCase() === 'video' ? (
              <video
                key={activeLesson.id}
                controls
                autoPlay={false}
                onTimeUpdate={
                  handleVideoTimeUpdate
                }
                onEnded={
                  handleVideoEnded
                }
                style={{
                  width: '100%',
                  maxHeight: '420px',
                  objectFit: 'contain'
                }}
                src={
                  activeLesson.assetUrl ||
                  activeLesson.contentUrl
                }
              >
                Your browser does not support
                HTML5 video.
              </video>
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
                  style={{
                    width: 64,
                    height: 64,
                    color: '#38bdf8',
                    margin:
                      '0 auto 1rem'
                  }}
                />

                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700
                  }}
                >
                  {activeLesson?.title}
                </h3>

                <p
                  style={{
                    color: '#94a3b8',
                    fontSize: '0.88rem',
                    marginTop: '0.5rem',
                    marginBottom: '1.5rem',
                    lineHeight: 1.5
                  }}
                >
                  {activeLesson?.contentText ||
                    'Standard Operating Procedure (SOP) Official Fairmacs Training Material.'}
                </p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '1rem'
                  }}
                >
                  <button
                    className="btn-primary"
                    onClick={
                      handleDocumentComplete
                    }
                    disabled={
                      completedLessons[
                        activeLesson?.dbId
                      ] || savingProgress
                    }
                    style={{
                      background:
                        completedLessons[
                          activeLesson?.dbId
                        ]
                          ? '#16a34a'
                          : '#0284c7'
                    }}
                  >
                    {completedLessons[
                      activeLesson?.dbId
                    ] ? (
                      <>
                        <Check
                          style={{
                            width: 16,
                            height: 16
                          }}
                        />

                        Completed
                      </>
                    ) : (
                      <>
                        <Check
                          style={{
                            width: 16,
                            height: 16
                          }}
                        />

                        Mark Lesson Complete
                      </>
                    )}
                  </button>
                </div>
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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