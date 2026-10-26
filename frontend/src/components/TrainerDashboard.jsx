import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Users,
  Star,
  CheckCircle2,
  Calendar,
  Activity,
  Plus,
  RefreshCw,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { courseService } from '../services/courseService';
import CourseBuilderModal from './CourseBuilderModal';
import CourseAssignmentModal from './CourseAssignmentModal';

export default function TrainerDashboard({ onSelectCourse }) {
  const { user } = useAuth();
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState('');
  const [courseForAssignment, setCourseForAssignment] = useState(null);
  const [courseList, setCourseList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const result = await courseService.getAllCourses();

      if (!Array.isArray(result)) {
        throw new Error('The courses API returned an unexpected response.');
      }

      setCourseList(result);
    } catch (error) {
      console.error('Failed to load trainer courses:', error);
      setLoadError('Unable to load courses. Please try again.');
      setCourseList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handlePublishedNewCourse = async () => {
    setShowBuilderModal(false);
    await loadCourses();
  };

  const getCourseId = (course) => {
    const id = course?.courseId ?? course?.courseCode ?? course?.id ?? course?.courseDbId ?? course?.dbId;
    return id == null ? '' : String(id).trim();
  };

  const getCourseStatus = (course) => {
    const status = String(course.status ?? '').toUpperCase();
    if (status) return ['AVAILABLE', 'PUBLISHED', 'ACTIVE'].includes(status) ? 'PUBLISHED' : status;
    if ([true, 'true', 1, '1'].includes(course.active) || [true, 'true', 1, '1'].includes(course.isActive) || course.isPublished === true || course.published === true) return 'PUBLISHED';
    if (course.active === false || course.isActive === false) return 'DRAFT';
    return 'UNKNOWN';
  };

  const getStatusStyle = (status) => {
    if (status === 'PUBLISHED' || status === 'ACTIVE') {
      return { background: '#dcfce7', color: '#15803d' };
    }
    if (status === 'DRAFT' || status === 'INACTIVE') {
      return { background: '#f1f5f9', color: '#475569' };
    }
    return { background: '#fef3c7', color: '#92400e' };
  };

  const activeCourseCount = courseList.filter((course) => {
    const status = getCourseStatus(course);
    return status === 'PUBLISHED' || status === 'ACTIVE';
  }).length;

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        minWidth: 0,
      }}
    >
      <div
        className="trainer-hero"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          padding: '2rem',
          borderRadius: '16px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.8rem',
              color: '#38bdf8',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Trainer Portal &amp; Course Builder
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.2rem' }}>
            Welcome{user?.name ? `, ${user.name}` : ''} (Trainer)
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Manage course modules, author quizzes, and monitor course publishing status.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setShowBuilderModal(true)}
          style={{
            background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
            padding: '0.75rem 1.25rem',
            fontSize: '0.92rem',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Plus style={{ width: 18, height: 18 }} /> Create Course Wizard
        </button>
      </div>

      <div className="trainer-stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <BookOpen style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">{isLoading ? '—' : activeCourseCount}</div>
            <div className="stat-label">Published Courses</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
            <Users style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">—</div>
            <div className="stat-label">Active Learners</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
              Not provided by the current courses API
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle2 style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">—</div>
            <div className="stat-label">Course Completion Rate</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
              Training report API required
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Star style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">—</div>
            <div className="stat-label">Average Assessment Score</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
              Assessment report API required
            </div>
          </div>
        </div>
      </div>

      <div className="trainer-main-grid">
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #e2e8f0',
            boxShadow: 'var(--shadow-sm)',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Authored Courses &amp; Catalog Status
            </h2>
            <button
              type="button"
              className="btn-secondary"
              onClick={loadCourses}
              disabled={isLoading}
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loadError && (
            <div
              role="alert"
              style={{
                padding: '0.8rem 1rem',
                marginBottom: '1rem',
                borderRadius: '8px',
                background: '#fef2f2',
                color: '#b91c1c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <span>{loadError}</span>
              <button type="button" className="btn-secondary" onClick={loadCourses}>
                Retry
              </button>
            </div>
          )}

          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.78rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Course ID &amp; Title</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Enrolled</th>
                  <th style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      Loading courses from the server…
                    </td>
                  </tr>
                ) : courseList.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
                      {loadError
                        ? 'Courses could not be loaded. Retry to try again.'
                        : 'No courses were returned by the server. Create a course or refresh the list.'}
                    </td>
                  </tr>
                ) : (
                  courseList.map((course, index) => {
                    const courseId = getCourseId(course);
                    const status = getCourseStatus(course);
                    const statusStyle = getStatusStyle(status);
                    const title = course.title ?? course.courseTitle ?? 'Untitled course';
                    const category = course.category ?? course.categoryName ?? course.categorySlug ?? '—';
                    const duration = course.duration
                      ?? (course.durationHours != null ? `${course.durationHours} hours` : 'Duration not set');
                    const enrolledCount = course.enrolledCount ?? course.enrollmentCount;

                    return (
                      <tr
                        key={courseId ?? `${title}-${index}`}
                        style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            ID: {courseId ?? '—'} • {duration}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                            }}
                          >
                            {category}
                          </span>
                        </td>
                        <td className="nowrap" style={{ padding: '1rem', fontWeight: 600 }}>
                          {enrolledCount == null ? '—' : `${enrolledCount} Learners`}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                              background: statusStyle.background,
                              color: statusStyle.color,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '20px',
                            }}
                          >
                            {status === 'UNKNOWN' ? 'Status unavailable' : status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', justifyContent: 'flex-end', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn-primary nowrap"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
                              onClick={() => setCourseForAssignment(course)}
                            >
                              <Users size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
                              Manage Assignments
                            </button>
                            <button
                              type="button"
                              className="btn-secondary nowrap"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              onClick={() => {
                                const id = getCourseId(course);

                                if (!id) {
                                  console.error('Course ID missing from API response:', course);
                                  setLoadError(
                                    'The courses API did not return a usable course ID. Check the browser console.'
                                  );
                                  return;
                                }

                                setEditingCourseId(id);
                                setShowBuilderModal(true);
                              }}
                            >
                              Edit Content
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 800, fontSize: '0.98rem' }}>
              <Calendar style={{ width: 18, height: 18, color: '#0284c7', flexShrink: 0 }} />
              Upcoming Live Sessions
            </div>
            <div style={{ padding: '1rem', borderRadius: '8px', background: '#f8fafc', color: '#64748b', fontSize: '0.85rem' }}>
              Live session data is not connected yet.
            </div>
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 800, fontSize: '0.98rem' }}>
              <Activity style={{ width: 18, height: 18, color: '#16a34a', flexShrink: 0 }} />
              Recent Learner Activity
            </div>
            <div style={{ padding: '1rem', borderRadius: '8px', background: '#f8fafc', color: '#64748b', fontSize: '0.85rem' }}>
              Learner activity data is not connected yet.
            </div>
          </div>
        </div>
      </div>

      {showBuilderModal && (
        <CourseBuilderModal
          key={editingCourseId || 'new-course'}
          courseId={editingCourseId}
          onClose={() => {
            setShowBuilderModal(false);
            setEditingCourseId('');
          }}
          onPublish={async () => {
            setShowBuilderModal(false);
            setEditingCourseId('');
            await loadCourses();
          }}
        />
      )}

      {courseForAssignment && (
        <CourseAssignmentModal
          course={courseForAssignment}
          onClose={() => setCourseForAssignment(null)}
          onAssigned={async () => {
            setCourseForAssignment(null);
            await loadCourses();
          }}
        />
      )}
    </div>
  );
}
