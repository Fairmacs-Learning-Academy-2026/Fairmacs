import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CourseThumbnailImage from './CourseThumbnailImage';
import CourseBuilderModal, { preloadCourseBuilderReferenceData } from './CourseBuilderModal';
import CourseAssignmentModal from './CourseAssignmentModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const cardStyle = {
  background: '#FFFFFF',
  borderRadius: '8px',
  border: '1px solid #E2E8F0',
  padding: '1.25rem 1.4rem',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
};

const actionBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.45rem',
  padding: '0.52rem 0.95rem',
  borderRadius: '6px',
  fontSize: '0.84rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease, border-color 0.15s ease',
  border: '1px solid #CBD5E1',
  background: '#FFFFFF',
  color: '#0F172A',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
  whiteSpace: 'nowrap',
};

export default function HrCoursesPage() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState('ALL');

  const [showCourseBuilderModal, setShowCourseBuilderModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState('');
  const [courseForAssignment, setCourseForAssignment] = useState(null);

  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadCourses = useCallback(async () => {
    setCoursesLoading(true);
    setCoursesError('');
    try {
      const token = localStorage.getItem('fairmacs_token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/courses`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error(`Could not load courses (${response.status})`);
      const data = await response.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      setCoursesError(err.message || 'Unable to load course catalog.');
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    preloadCourseBuilderReferenceData();
    loadCourses();
  }, [loadCourses]);

  const courseCategories = useMemo(() => {
    const set = new Set();
    courses.forEach((c) => {
      const cat = c.category ?? c.catalogCategory?.name;
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [courses]);

  const visibleCourses = useMemo(() => {
    return courses.filter((course) => {
      const title = course.title ?? course.courseTitle ?? '';
      const id = course.courseId ?? course.id ?? '';
      const category = course.category ?? course.catalogCategory?.name ?? '';
      const query = courseSearch.toLowerCase();
      const matchesSearch = `${title} ${id} ${category}`.toLowerCase().includes(query);
      const matchesCategory =
        courseCategoryFilter === 'ALL' ||
        category.toLowerCase() === courseCategoryFilter.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [courses, courseSearch, courseCategoryFilter]);

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    const targetId = courseToDelete.id ?? courseToDelete.courseId ?? courseToDelete.dbId;
    if (!targetId) {
      setDeleteError('No valid identifier found for course deletion.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem('fairmacs_token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        let msg = `Delete failed with HTTP ${response.status}`;
        try {
          const body = await response.json();
          msg = body.message || body.error || msg;
        } catch {
          // keep fallback
        }
        throw new Error(msg);
      }

      setCourseToDelete(null);
      await loadCourses();
    } catch (err) {
      setDeleteError(err.message || 'Unable to delete course.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateCourse = async () => {
    if (!courseToDelete) return;
    const targetId = courseToDelete.id ?? courseToDelete.courseId ?? courseToDelete.dbId;
    if (!targetId) return;

    setIsDeactivating(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem('fairmacs_token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/courses/${encodeURIComponent(targetId)}/deactivate`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Deactivation failed with HTTP ${response.status}`);
      }

      setCourseToDelete(null);
      await loadCourses();
    } catch (err) {
      setDeleteError(err.message || 'Unable to deactivate course.');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        minWidth: 0,
        color: '#14243A',
      }}
    >
      <section style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Courses & Learning Catalog
              </h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '4px',
                  background: '#F0F9FF',
                  color: '#075985',
                  border: '1px solid #BAE6FD',
                }}
              >
                {courses.length} courses
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Manage learning catalog, module contents, quizzes, and learner enrollments
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                color="#94A3B8"
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <input
                type="text"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Search course title or ID…"
                aria-label="Search courses"
                style={{
                  padding: '0.48rem 0.75rem 0.48rem 2rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                  width: '240px',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none',
                }}
              />
            </div>

            {/* Category Filter */}
            {courseCategories.length > 0 && (
              <select
                value={courseCategoryFilter}
                onChange={(e) => setCourseCategoryFilter(e.target.value)}
                style={{
                  padding: '0.48rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                  color: '#334155',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Categories</option>
                {courseCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingCourseId('');
                setShowCourseBuilderModal(true);
              }}
              style={{
                ...actionBtnStyle,
                background: '#0F6CBD',
                color: '#FFFFFF',
                border: '1px solid #0F6CBD',
              }}
            >
              <Plus size={15} /> Create Course
            </button>

            <button
              type="button"
              onClick={loadCourses}
              style={actionBtnStyle}
              title="Refresh course list"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {coursesLoading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
            }}
          >
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`c-skel-${idx}`}
                className="skeleton-shimmer"
                style={{ height: '180px', borderRadius: '8px' }}
              />
            ))}
          </div>
        ) : coursesError ? (
          <div
            role="alert"
            style={{
              padding: '1rem',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{coursesError}</span>
            <button
              type="button"
              onClick={loadCourses}
              style={{ ...actionBtnStyle, padding: '0.35rem 0.75rem' }}
            >
              Retry
            </button>
          </div>
        ) : visibleCourses.length ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.15rem',
            }}
          >
            {visibleCourses.map((course, index) => {
              const title = course.title ?? course.courseTitle ?? 'Untitled course';
              const courseId = course.courseId ?? course.id ?? '—';
              const category = course.category ?? course.catalogCategory?.name;
              const isPublished = course.active !== false && course.isActive !== false;
              const learnersCount = course.enrolledCount ?? course.enrollmentCount;
              const duration =
                course.duration ??
                (course.durationHours != null ? `${course.durationHours} hrs` : null);

              return (
                <article
                  key={course.id ?? course.courseId ?? index}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  }}
                >
                  <div>
                    {/* Course Thumbnail */}
                    <div
                      style={{
                        width: '100%',
                        height: '140px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        marginBottom: '0.85rem',
                        border: '1px solid #E2E8F0',
                        background: '#F8FAFC',
                        position: 'relative',
                      }}
                    >
                      <CourseThumbnailImage
                        course={course}
                        alt={title}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>

                    {/* Top Badges */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        marginBottom: '0.65rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.18rem 0.5rem',
                          borderRadius: '4px',
                          background: '#F1F5F9',
                          color: '#475569',
                          fontFamily: 'monospace',
                        }}
                      >
                        {courseId}
                      </span>

                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          padding: '0.18rem 0.55rem',
                          borderRadius: '4px',
                          background: isPublished ? '#F0FDF4' : '#F1F5F9',
                          color: isPublished ? '#166534' : '#64748B',
                          border: `1px solid ${isPublished ? '#BBF7D0' : '#E2E8F0'}`,
                        }}
                      >
                        {isPublished ? 'Available' : 'Draft / Inactive'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: 650,
                        color: '#0F172A',
                        margin: '0 0 0.45rem 0',
                        lineHeight: 1.35,
                      }}
                    >
                      {title}
                    </h3>

                    {/* Meta Pills */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                        fontSize: '0.78rem',
                        color: '#64748B',
                        marginTop: '0.5rem',
                      }}
                    >
                      {category && (
                        <span
                          style={{
                            background: '#F0F9FF',
                            color: '#075985',
                            border: '1px solid #BAE6FD',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 500,
                          }}
                        >
                          {category}
                        </span>
                      )}
                      {duration && <span>• {duration}</span>}
                      {learnersCount != null && (
                        <span>• {learnersCount} Learners</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.45rem',
                      paddingTop: '0.85rem',
                      borderTop: '1px solid #E2E8F0',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setCourseForAssignment(course)}
                      style={{
                        ...actionBtnStyle,
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.78rem',
                        flex: 1,
                        background: '#0F6CBD',
                        color: '#FFFFFF',
                        border: '1px solid #0F6CBD',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        fontWeight: 600,
                      }}
                    >
                      <Users size={14} /> Manage Assignments
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourseId(courseId);
                        setShowCourseBuilderModal(true);
                      }}
                      style={{
                        ...actionBtnStyle,
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.78rem',
                      }}
                      title="Edit Course"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError('');
                        setCourseToDelete(course);
                      }}
                      style={{
                        ...actionBtnStyle,
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.78rem',
                        background: '#FEF2F2',
                        borderColor: '#FECACA',
                        color: '#DC2626',
                      }}
                      title="Delete Course Permanently"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              color: '#64748B',
            }}
          >
            <BookOpen size={36} style={{ margin: '0 auto 0.65rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 650, fontSize: '1rem', color: '#0F172A', margin: 0 }}>
              No courses match your criteria.
            </p>
            <p style={{ fontSize: '0.84rem', margin: '6px 0 1.25rem 0' }}>
              Try adjusting your search terms or create a new course.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingCourseId('');
                setShowCourseBuilderModal(true);
              }}
              style={{
                ...actionBtnStyle,
                background: '#0F6CBD',
                color: '#FFFFFF',
                border: '1px solid #0F6CBD',
              }}
            >
              <Plus size={15} /> Create Course
            </button>
          </div>
        )}
      </section>

      {/* Delete Course Confirmation Modal */}
      {courseToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !isDeleting && setCourseToDelete(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '6px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                  Delete Course Permanently
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Are you sure you want to permanently delete{' '}
              <strong style={{ color: '#0F172A' }}>
                {courseToDelete.title ?? courseToDelete.courseTitle ?? 'this course'}
              </strong>{' '}
              ({courseToDelete.courseId ?? courseToDelete.id ?? courseToDelete.dbId ?? ''})? All associated
              modules, lessons, quizzes, attempts, and learner progress will be removed from the database.
            </p>

            {deleteError && (
              <div
                role="alert"
                style={{
                  padding: '0.75rem 1rem',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  color: '#991B1B',
                  fontSize: '0.84rem',
                  marginBottom: '1rem',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={isDeleting || isDeactivating}
                onClick={() => setCourseToDelete(null)}
                style={{
                  ...actionBtnStyle,
                  cursor: (isDeleting || isDeactivating) ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              {deleteError && deleteError.toLowerCase().includes('deactivate') && (
                <button
                  type="button"
                  disabled={isDeleting || isDeactivating}
                  onClick={handleDeactivateCourse}
                  style={{
                    ...actionBtnStyle,
                    background: '#0F172A',
                    color: '#FFFFFF',
                    border: '1px solid #0F172A',
                    cursor: (isDeleting || isDeactivating) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isDeactivating ? (
                    <>
                      <RefreshCw size={15} className="spin" />
                      Deactivating…
                    </>
                  ) : (
                    'Deactivate Course Instead'
                  )}
                </button>
              )}
              <button
                type="button"
                disabled={isDeleting || isDeactivating}
                onClick={handleDeleteCourse}
                style={{
                  ...actionBtnStyle,
                  background: isDeleting ? '#94A3B8' : '#DC2626',
                  color: '#FFFFFF',
                  border: '1px solid #DC2626',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    Deleting Course…
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Yes, Delete Course
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Builder Modal */}
      {showCourseBuilderModal && (
        <CourseBuilderModal
          key={editingCourseId || 'new-course'}
          courseId={editingCourseId || ''}
          onClose={() => {
            setShowCourseBuilderModal(false);
            setEditingCourseId('');
            loadCourses();
          }}
          onPublish={() => {
            setShowCourseBuilderModal(false);
            setEditingCourseId('');
            loadCourses();
          }}
        />
      )}

      {/* Course Assignment Modal */}
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
