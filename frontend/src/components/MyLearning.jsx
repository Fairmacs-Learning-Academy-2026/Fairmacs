import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  PlayCircle,
  Clock,
  Award,
  AlertTriangle,
  Calendar,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

import { enrollmentService } from '../services/enrollmentService';
import { useAuth } from '../context/AuthContext';
import CourseThumbnailImage from './CourseThumbnailImage';
import { getCourseBanner, handleBannerError } from '../utils/courseBanner';

function normalizeStatus(course) {
  const status = String(
    course?.enrollmentStatus || ''
  ).toUpperCase();

  const progress = Number(
    course?.progressPercent || 0
  );

  if (status === 'COMPLETED' || progress >= 100) {
    return 'COMPLETED';
  }

  if (course?.dueDate) {
    const due = new Date(course.dueDate);
    const today = new Date();

    if (
      !Number.isNaN(due.getTime()) &&
      due < today &&
      progress < 100
    ) {
      return 'OVERDUE';
    }
  }

  if (
    status === 'IN_PROGRESS' ||
    status === 'IN PROGRESS' ||
    progress > 0
  ) {
    return 'IN PROGRESS';
  }

  return 'NOT STARTED';
}

function isDueSoon(course) {
  if (!course?.dueDate) return false;

  const due = new Date(course.dueDate);
  const today = new Date();

  if (Number.isNaN(due.getTime())) return false;

  const days =
    (due.getTime() - today.getTime()) /
    (1000 * 60 * 60 * 24);

  return days >= 0 && days <= 30;
}

function formatDate(value) {
  if (!value) return 'No deadline assigned';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function MyLearning({
  onSelectCourse,
  onOpenCertificates,
  onOpenCourseDetails,
}) {
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [activeTabFilter, setActiveTabFilter] =
    useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadEnrollments = async (showInitialLoader = true) => {
    try {
      if (showInitialLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError('');

      const data =
        await enrollmentService.getUserEnrollments();

      setCourses(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        'My Learning loading error:',
        err
      );

      setError(
        err?.message ||
        'Unable to load your learning records.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadEnrollments();
    }
  }, [user?.id]);

  const courseListWithStatus = useMemo(() => {
    return courses.map((course) => {
      const status = normalizeStatus(course);
      const progressPercent = Math.max(
        0,
        Math.min(
          100,
          Number(course.progressPercent || 0)
        )
      );

      return {
        ...course,
        status,
        progressPercent,
        isMandatory:
          String(course.enrollmentType || '').toUpperCase() ===
            'MANDATORY' ||
          course.foundation === true,
        isDueSoon:
          status !== 'COMPLETED' &&
          isDueSoon(course),
      };
    });
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courseListWithStatus.filter((course) => {
      switch (activeTabFilter) {
        case 'NOT_STARTED':
          return course.status === 'NOT STARTED';
        case 'IN_PROGRESS':
          return course.status === 'IN PROGRESS';
        case 'COMPLETED':
          return course.status === 'COMPLETED';
        case 'OVERDUE':
          return course.status === 'OVERDUE';
        case 'DUE_SOON':
          return course.isDueSoon;
        default:
          return true;
      }
    });
  }, [courseListWithStatus, activeTabFilter]);

  const counts = useMemo(
    () => ({
      all: courseListWithStatus.length,
      notStarted: courseListWithStatus.filter(
        (course) => course.status === 'NOT STARTED'
      ).length,
      inProgress: courseListWithStatus.filter(
        (course) => course.status === 'IN PROGRESS'
      ).length,
      completed: courseListWithStatus.filter(
        (course) => course.status === 'COMPLETED'
      ).length,
      overdue: courseListWithStatus.filter(
        (course) => course.status === 'OVERDUE'
      ).length,
      dueSoon: courseListWithStatus.filter(
        (course) => course.isDueSoon
      ).length,
    }),
    [courseListWithStatus]
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: 420,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <RefreshCw
            style={{
              width: 30,
              height: 30,
              margin: '0 auto 1rem',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ fontWeight: 700 }}>
            Loading your learning records...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="animate-fade-in"
        style={{
          background: 'white',
          border: '1px solid #fecaca',
          borderRadius: 16,
          padding: '3rem',
          textAlign: 'center',
        }}
      >
        <AlertTriangle
          style={{
            width: 42,
            height: 42,
            margin: '0 auto 1rem',
            color: '#dc2626',
          }}
        />

        <h2
          style={{
            margin: '0 0 0.5rem',
            color: '#0f172a',
          }}
        >
          Unable to load My Learning
        </h2>

        <p
          style={{
            margin: '0 auto 1.25rem',
            maxWidth: 560,
            color: '#64748b',
          }}
        >
          {error}
        </p>

        <button
          className="btn-primary"
          onClick={() => loadEnrollments()}
        >
          <RefreshCw style={{ width: 16, height: 16 }} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
      }}
    >
      {/* Header */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          background: 'rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          padding: '1.25rem 1.5rem',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 8px 30px rgba(31, 70, 120, 0.06)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 750,
              color: '#0284c7',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Learner Progression Lifecycle
          </div>

          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--deep-navy)',
              margin: '0.15rem 0 0',
              letterSpacing: '-0.3px',
            }}
          >
            My Learning & Progress Hub
          </h1>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
            alignItems: 'center',
          }}
        >
          <button
            className="btn-secondary"
            onClick={() => loadEnrollments(false)}
            disabled={refreshing}
          >
            <RefreshCw
              style={{
                width: 16,
                height: 16,
                animation: refreshing
                  ? 'spin 1s linear infinite'
                  : undefined,
              }}
            />
            Refresh
          </button>

          <button
            className="btn-secondary"
            onClick={onOpenCertificates}
            style={{
              background: 'rgba(236, 253, 245, 0.75)',
              color: '#047857',
              border: '1px solid rgba(167, 243, 208, 0.85)',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)',
            }}
          >
            <Award style={{ width: 16, height: 16 }} />
            My Digital Certificates
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          background: 'rgba(255, 255, 255, 0.76)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          padding: '0.75rem 1.25rem',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 4px 20px rgba(31, 70, 120, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          {[
            ['ALL', 'All Trackers', counts.all],
            ['NOT_STARTED', 'Not Started', counts.notStarted],
            ['IN_PROGRESS', 'In Progress', counts.inProgress],
            ['COMPLETED', 'Completed & Certified', counts.completed],
            ['OVERDUE', 'Overdue', counts.overdue],
            ['DUE_SOON', 'Due Soon', counts.dueSoon],
          ].map(([id, label, count]) => (
            <button
              key={id}
              onClick={() => setActiveTabFilter(id)}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background:
                  activeTabFilter === id
                    ? id === 'OVERDUE'
                      ? '#e11d48'
                      : id === 'COMPLETED'
                        ? '#16a34a'
                        : '#0f172a'
                    : '#f1f5f9',
                color:
                  activeTabFilter === id
                    ? 'white'
                    : '#475569',
              }}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <div
          style={{
            fontSize: '0.8rem',
            color: '#64748b',
            fontWeight: 600,
          }}
        >
          Showing {filteredCourses.length} Courses
        </div>
      </div>

      {/* Empty state */}
      {!filteredCourses.length && (
        <div
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: '4rem 2rem',
            textAlign: 'center',
          }}
        >
          <BookOpen
            style={{
              width: 48,
              height: 48,
              margin: '0 auto 1rem',
              color: '#94a3b8',
            }}
          />
          <h3
            style={{
              margin: '0 0 0.5rem',
              color: '#0f172a',
            }}
          >
            No courses found
          </h3>
          <p
            style={{
              margin: 0,
              color: '#64748b',
            }}
          >
            {courses.length
              ? 'There are no courses matching this filter.'
              : 'You do not have any course enrollments yet. Visit the Course Catalog to start learning.'}
          </p>
        </div>
      )}

      {/* Course cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {filteredCourses.map((course) => {
          const isCompleted =
            course.status === 'COMPLETED';
          const isOverdue =
            course.status === 'OVERDUE';
          const isInProgress =
            course.status === 'IN PROGRESS';
          const progress = course.progressPercent;

          return (
            <div
              key={
                course.enrollmentDbId ||
                course.dbId ||
                course.id
              }
              className="course-card"
            >
              <div
                style={{ position: 'relative', height: '160px', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => onOpenCourseDetails?.(course)}
              >
                <CourseThumbnailImage
                  course={course}
                  alt={course.title}
                  className="course-banner"
                />

                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: isCompleted
                      ? '#16a34a'
                      : isOverdue
                        ? '#e11d48'
                        : isInProgress
                          ? '#0284c7'
                          : '#64748b',
                    color: 'white',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.25rem 0.65rem',
                    borderRadius: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  {isCompleted ? (
                    <CheckCircle2
                      style={{ width: 13, height: 13 }}
                    />
                  ) : isOverdue ? (
                    <AlertTriangle
                      style={{ width: 13, height: 13 }}
                    />
                  ) : (
                    <Clock
                      style={{ width: 13, height: 13 }}
                    />
                  )}
                  {isCompleted
                    ? 'CERTIFIED'
                    : course.status}
                </span>

                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    background: 'rgba(15,23,42,0.85)',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: 4,
                  }}
                >
                  {course.id || course.dbId}
                </span>
              </div>

              <div className="course-card-content">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span className="course-category-badge">
                    {course.category || 'Training'}
                  </span>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 4,
                      background: course.isMandatory
                        ? '#ffe4e6'
                        : '#f0fdf4',
                      color: course.isMandatory
                        ? '#be123c'
                        : '#166534',
                    }}
                  >
                    {course.isMandatory
                      ? 'Mandatory Track'
                      : 'Optional'}
                  </span>
                </div>

                <h3
                  className="course-title"
                  style={{
                    marginTop: '0.4rem',
                    cursor: 'pointer',
                  }}
                  onClick={() =>
                    onOpenCourseDetails?.(course)
                  }
                >
                  {course.title}
                </h3>

                <p
                  style={{
                    fontSize: '0.82rem',
                    color: '#64748b',
                    lineHeight: 1.4,
                    marginBottom: '0.85rem',
                  }}
                >
                  {course.description ||
                    'Fairmacs learning and compliance training course.'}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.76rem',
                    color: isOverdue
                      ? '#e11d48'
                      : '#475569',
                    fontWeight: 600,
                    marginBottom: '0.85rem',
                  }}
                >
                  <Calendar
                    style={{ width: 13, height: 13 }}
                  />
                  <span>
                    Deadline:{' '}
                    <strong>
                      {formatDate(course.dueDate)}
                    </strong>
                  </span>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#475569',
                    }}
                  >
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>

                  <div
                    style={{
                      height: 8,
                      background: '#a2afc0ff',
                      borderRadius: 999,
                      overflow: 'hidden',
                      margin: '0.45rem 0 1rem',
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: isCompleted
                          ? '#16a34a'
                          : '#0284c7',
                        borderRadius: 999,
                        transition: 'width 0.25s ease',
                      }}
                    />
                  </div>

                  <button
                    className="btn-primary"
                    style={{ width: '100%' }}
                    onClick={() =>
                      onSelectCourse?.(course)
                    }
                  >
                    {isCompleted ? (
                      <>
                        <Award
                          style={{
                            width: 16,
                            height: 16,
                          }}
                        />
                        Review Course
                      </>
                    ) : (
                      <>
                        <PlayCircle
                          style={{
                            width: 16,
                            height: 16,
                          }}
                        />
                        {isInProgress
                          ? 'Continue Learning'
                          : 'Start Learning'}
                        <ArrowRight
                          style={{
                            width: 16,
                            height: 16,
                            marginLeft: 'auto',
                          }}
                        />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
