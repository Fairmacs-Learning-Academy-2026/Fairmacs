import React from 'react';
import {
  BookOpen,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  ArrowRight,
  ShieldCheck,
  Compass,
  Sparkles,
  Calendar,
  Bell,
  Building2,
  Briefcase
} from 'lucide-react';

import { DEPARTMENT_LEARNING_PATHS } from '../data/mockData';
import { courseService } from '../services/courseService';
import { useAuth } from '../context/AuthContext';

export default function Overview({
  onSelectCourse,
  onOpenCertificates,
  setActiveTab,
  onOpenCourseDetails
}) {
  const { user } = useAuth();

  const [dashboard, setDashboard] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      const data = await courseService.getLearningDashboard();

      if (!mounted) return;

      if (data) {
        setDashboard(data);
      } else {
        setError('Unable to load learning dashboard');
      }

      setLoading(false);
    };

    loadDashboard();

    const handleEnrollmentUpdated = () => {
      loadDashboard();
    };

    window.addEventListener(
      'lms:enrollment-updated',
      handleEnrollmentUpdated
    );

    return () => {
      mounted = false;

      window.removeEventListener(
        'lms:enrollment-updated',
        handleEnrollmentUpdated
      );
    };
  }, []);

  const userDept =
    dashboard?.department ||
    user?.department ||
    'Operations';

  const userDesig =
    dashboard?.designation ||
    user?.designation ||
    'Executive';

  const deptRules =
    DEPARTMENT_LEARNING_PATHS[userDept] ||
    DEPARTMENT_LEARNING_PATHS['Operations'];

  const enrolledCourses = dashboard?.enrolled || [];

  const completedCourses =
    dashboard?.completedCourses || 0;

  const inProgressCourses =
    dashboard?.inProgress || 0;

  const recommendedCourses =
    dashboard?.recommended || [];

  /*
   * Continue Learning now supports multiple active courses.
   *
   * The dashboard already provides the employee's enrolled
   * courses in `dashboard.enrolled`. We use that list as the
   * source of truth instead of the old single
   * `dashboard.continueLearning` value.
   */
  const continueLearningCourses =
    enrolledCourses.filter(course => {
      const status = String(
        course?.enrollmentStatus ??
        course?.status ??
        ''
      ).toUpperCase();

      return status !== 'COMPLETED';
    });

  const learningHours =
    dashboard?.learningHours || '0h 0m';

  const certificates =
    dashboard?.certificates || 0;

  if (loading) {
    return (
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#64748b'
        }}
      >
        Loading your learning dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#dc2626'
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem'
      }}
    >

      {/* =========================
          Welcome Banner
      ========================== */}
      <div
        style={{
          background:
            'linear-gradient(135deg, #0b1f38 0%, #0c2340 50%, #1e3a5f 100%)',
          borderRadius: '16px',
          padding: '2.25rem',
          color: 'white',
          boxShadow: '0 10px 25px rgba(11, 31, 56, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            maxWidth: '680px',
            zIndex: 2,
            position: 'relative'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '0.85rem'
            }}
          >
            <Sparkles
              style={{
                width: 15,
                height: 15
              }}
            />

            Fairmacs Employee Learning Hub
          </div>

          <h1
            style={{
              fontSize: '2.1rem',
              fontWeight: 800,
              marginBottom: '0.5rem',
              letterSpacing: '-0.3px'
            }}
          >
            Welcome back, {user?.name || dashboard?.name || 'Arjun Kumar'}!
          </h1>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap'
            }}
          >
            <span
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#38bdf8',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Briefcase
                style={{
                  width: 14,
                  height: 14
                }}
              />

              {userDesig}
            </span>

            <span
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#34d399',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Building2
                style={{
                  width: 14,
                  height: 14
                }}
              />

              {userDept} Department
            </span>

            <span
              style={{
                color: '#cbd5e1',
                fontSize: '0.82rem'
              }}
            >
              ({user?.branch || dashboard?.branch || 'Chennai HQ'})
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <button
              className="btn-primary"
              onClick={() => setActiveTab('catalog')}
              style={{
                background:
                  'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem'
              }}
            >
              <Compass
                style={{
                  width: 16,
                  height: 16
                }}
              />

              Explore Courses
            </button>

            <button
              className="btn-secondary"
              onClick={() => setActiveTab('mylearning')}
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: 'white',
                border:
                  '1px solid rgba(255,255,255,0.2)',
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem'
              }}
            >
              <BookOpen
                style={{
                  width: 16,
                  height: 16
                }}
              />

              Progress Hub
            </button>
          </div>
        </div>
      </div>

      {/* =========================
          Department Mandatory Alert
      ========================== */}
      <div
        style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              background: '#e0f2fe',
              color: '#0284c7',
              padding: '0.75rem',
              borderRadius: '10px'
            }}
          >
            <ShieldCheck
              style={{
                width: 24,
                height: 24
              }}
            />
          </div>

          <div>
            <div
              style={{
                fontWeight: 800,
                color: '#0369a1',
                fontSize: '0.98rem'
              }}
            >
              {userDept} Department Mandatory Learning Path
            </div>

            <div
              style={{
                fontSize: '0.85rem',
                color: '#0284c7',
                marginTop: '0.15rem'
              }}
            >
              {deptRules.description}
            </div>
          </div>
        </div>

        <button
          className="btn-primary"
          style={{
            background: '#0284c7',
            whiteSpace: 'nowrap'
          }}
          onClick={() => setActiveTab('mylearning')}
        >
          View Department Track
        </button>
      </div>

      {/* =========================
          Metrics
      ========================== */}
      <div
        className="card-grid"
        style={{
          gridTemplateColumns: 'repeat(5, 1fr)',
          marginTop: 0,
          gap: '1rem'
        }}
      >

        {/* Enrolled */}
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{
              background: '#e0f2fe',
              color: '#0284c7'
            }}
          >
            <BookOpen
              style={{
                width: 20,
                height: 20
              }}
            />
          </div>

          <div>
            <div className="stat-val">
              {enrolledCourses.length}
            </div>

            <div className="stat-label">
              Enrolled Courses
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{
              background: '#fef3c7',
              color: '#d97706'
            }}
          >
            <Clock
              style={{
                width: 20,
                height: 20
              }}
            />
          </div>

          <div>
            <div className="stat-val">
              {inProgressCourses}
            </div>

            <div className="stat-label">
              In Progress
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{
              background: '#dcfce7',
              color: '#16a34a'
            }}
          >
            <CheckCircle2
              style={{
                width: 20,
                height: 20
              }}
            />
          </div>

          <div>
            <div className="stat-val">
              {completedCourses}
            </div>

            <div className="stat-label">
              Completed
            </div>
          </div>
        </div>

        {/* Learning Hours */}
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{
              background: '#f3e8ff',
              color: '#9333ea'
            }}
          >
            <Clock
              style={{
                width: 20,
                height: 20
              }}
            />
          </div>

          <div>
            <div className="stat-val">
              {learningHours}
            </div>

            <div className="stat-label">
              Learning Hours
            </div>
          </div>
        </div>

        {/* Certificates */}
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{
              background: '#ffe4e6',
              color: '#e11d48'
            }}
          >
            <Award
              style={{
                width: 20,
                height: 20
              }}
            />
          </div>

          <div>
            <div className="stat-val">
              {certificates}
            </div>

            <div className="stat-label">
              Certificates Earned
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          Main Grid
      ========================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '1.5rem'
        }}
      >

        {/* =========================
            Left Side
        ========================== */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >

          {/* Continue Learning */}
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid #e2e8f0',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}
                >
                  Continue Learning
                </h2>

                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    marginTop: '0.2rem'
                  }}
                >
                  Your active courses
                </div>
              </div>

              {continueLearningCourses.length > 0 && (
                <span className="badge-mandatory">
                  {continueLearningCourses.length}{' '}
                  {continueLearningCourses.length === 1
                    ? 'Course'
                    : 'Courses'}
                </span>
              )}
            </div>

            {continueLearningCourses.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1rem'
                }}
              >
                {continueLearningCourses.map((course) => {
                  const progress = Number(
                    course?.progressPercent ??
                    course?.progress ??
                    0
                  );

                  const courseKey =
                    course?.dbId ??
                    course?.id ??
                    course?.courseId;

                  return (
                    <div
                      key={courseKey}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1rem',
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        background: '#f8fafc'
                      }}
                    >
                      {course?.banner ? (
                        <img
                          src={course.banner}
                          alt={course.title}
                          style={{
                            width: 120,
                            height: 82,
                            borderRadius: '8px',
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 120,
                            height: 82,
                            borderRadius: '8px',
                            background: '#e0f2fe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0284c7',
                            flexShrink: 0
                          }}
                        >
                          <BookOpen
                            style={{
                              width: 28,
                              height: 28
                            }}
                          />
                        </div>
                      )}

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#0284c7',
                            marginBottom: '0.15rem'
                          }}
                        >
                          {course?.id ||
                            course?.courseId ||
                            'COURSE'}
                          {course?.category
                            ? ` • ${course.category}`
                            : ''}
                        </div>

                        <h3
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: '#0f172a',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={course?.title}
                        >
                          {course?.title || 'Untitled Course'}
                        </h3>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#475569',
                            marginTop: '0.55rem'
                          }}
                        >
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>

                        <div
                          className="progress-bar-bg"
                          style={{
                            height: 6,
                            marginTop: '0.3rem',
                            marginBottom: '0.7rem'
                          }}
                        >
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.min(
                                Math.max(progress, 0),
                                100
                              )}%`
                            }}
                          />
                        </div>

                        <button
                          className="btn-primary"
                          onClick={() =>
                            onSelectCourse?.(course)
                          }
                          style={{
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.78rem'
                          }}
                        >
                          <PlayCircle
                            style={{
                              width: 15,
                              height: 15
                            }}
                          />

                          {progress > 0
                            ? 'Resume'
                            : 'Start Course'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#64748b'
                }}
              >
                <PlayCircle
                  style={{
                    width: 42,
                    height: 42,
                    margin: '0 auto 0.75rem',
                    color: '#94a3b8'
                  }}
                />

                <div
                  style={{
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.25rem'
                  }}
                >
                  No course in progress
                </div>

                <div
                  style={{
                    fontSize: '0.85rem',
                    marginBottom: '1rem'
                  }}
                >
                  Enroll in a course to see it here.
                </div>

                <button
                  className="btn-primary"
                  onClick={() => setActiveTab('catalog')}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem'
                  }}
                >
                  Browse Courses
                  <ArrowRight
                    style={{
                      width: 15,
                      height: 15
                    }}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Recommended Courses */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}
            >
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#0f172a'
                }}
              >
                Recommended for {userDept}
              </h2>

              <button
                style={{
                  color: '#0284c7',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveTab('catalog')}
              >
                View Catalog →
              </button>
            </div>

            {recommendedCourses.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '1.25rem'
                }}
              >
                {recommendedCourses
                  .slice(0, 3)
                  .map((course) => (
                    <div
                      key={course.id || course.courseId}
                      className="course-card"
                    >
                      {course.banner && (
                        <img
                          src={course.banner}
                          alt={course.title}
                          className="course-banner"
                        />
                      )}

                      <div className="course-card-content">
                        <span className="course-category-badge">
                          {course.category}
                        </span>

                        <h3
                          className="course-title"
                          style={{
                            fontSize: '0.95rem'
                          }}
                        >
                          {course.title}
                        </h3>

                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: '#64748b',
                            margin: '0.5rem 0 1rem'
                          }}
                        >
                          <Clock
                            style={{
                              width: 13,
                              height: 13,
                              display: 'inline',
                              marginRight: '0.3rem'
                            }}
                          />

                          {course.duration || 'Self-paced'}
                        </div>

                        <button
                          className="btn-primary"
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            fontSize: '0.82rem',
                            padding: '0.5rem'
                          }}
                          onClick={() =>
                            onSelectCourse?.(course)
                          }
                        >
                          <PlayCircle
                            style={{
                              width: 15,
                              height: 15
                            }}
                          />

                          Start Course
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '2rem',
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                  color: '#64748b'
                }}
              >
                <BookOpen
                  style={{
                    width: 42,
                    height: 42,
                    margin: '0 auto 0.75rem',
                    color: '#94a3b8'
                  }}
                />

                <div
                  style={{
                    fontWeight: 700,
                    color: '#334155'
                  }}
                >
                  No recommendations available
                </div>

                <div
                  style={{
                    fontSize: '0.85rem',
                    marginTop: '0.25rem'
                  }}
                >
                  Recommended courses will appear here based on your
                  learning path.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================
            Right Side
        ========================== */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >

          {/* Upcoming Training */}
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '0.98rem'
              }}
            >
              <Calendar
                style={{
                  width: 18,
                  height: 18,
                  color: '#0284c7'
                }}
              />

              Upcoming Training
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              <div
                style={{
                  background: '#fff1f2',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  borderLeft: '4px solid #e11d48'
                }}
              >
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#9f1239'
                  }}
                >
                  {userDept} Compliance Refresher
                </div>

                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#be123c',
                    marginTop: '0.2rem'
                  }}
                >
                  Due: 30 Sep 2026 • Mandatory Track
                </div>
              </div>

              <div
                style={{
                  background: '#f0f9ff',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  borderLeft: '4px solid #0284c7'
                }}
              >
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#0369a1'
                  }}
                >
                  Live IATA Freight Workshop
                </div>

                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#0284c7',
                    marginTop: '0.2rem'
                  }}
                >
                  Oct 05, 2026 • Trainer: Priya Nair
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '0.98rem'
              }}
            >
              <Bell
                style={{
                  width: 18,
                  height: 18,
                  color: '#16a34a'
                }}
              />

              Recent Activity
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    background: '#dcfce7',
                    color: '#16a34a',
                    padding: '0.4rem',
                    borderRadius: '50%',
                    flexShrink: 0
                  }}
                >
                  <Award
                    style={{
                      width: 15,
                      height: 15
                    }}
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    Earned Cybersecurity Cert
                  </div>

                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748b'
                    }}
                  >
                    Score: 90% • Sept 10, 2026
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    background: '#e0f2fe',
                    color: '#0284c7',
                    padding: '0.4rem',
                    borderRadius: '50%',
                    flexShrink: 0
                  }}
                >
                  <CheckCircle2
                    style={{
                      width: 15,
                      height: 15
                    }}
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    Passed Company Induction
                  </div>

                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#64748b'
                    }}
                  >
                    Score: 100% • Sept 02, 2026
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}