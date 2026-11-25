import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Compass,
  CheckCircle2,
  Building2,
  BookOpen,
  Eye,
  Settings,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = SHARED_API_BASE_URL;

function getAuthToken() {
  return (
    localStorage.getItem('fairmacs_token') ||
    localStorage.getItem('fairmacs_lms_token') ||
    ''
  );
}

function normalizeLearningPaths(payload) {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.content)
        ? payload.content
        : Array.isArray(payload?.learningPaths)
          ? payload.learningPaths
          : [];

  return records.map((path, index) => {
    const courses = Array.isArray(path.courseIds)
      ? path.courseIds
      : Array.isArray(path.courses)
        ? path.courses.map((course) =>
            typeof course === 'string'
              ? course
              : course.courseId ?? course.courseCode ?? course.id ?? course.title
          ).filter(Boolean)
        : [];

    return {
      ...path,
      id: path.id ?? path.pathId ?? path.learningPathId ?? `path-${index}`,
      title: path.title ?? path.name ?? 'Untitled learning path',
      department:
        path.departmentName ??
        path.department?.name ??
        path.department ??
        'General',
      type:
        path.type ??
        (path.mandatory === true ? 'Mandatory' : path.mandatory === false ? 'Recommended' : 'Not specified'),
      description: path.description ?? 'No description provided.',
      courseIds: courses,
      courseCount: path.courseCount ?? path.courses?.length ?? courses.length,
    };
  });
}

export default function LearningPaths() {
  const { user } = useAuth();
  const isHR = user?.role === 'HR_ADMIN' || user?.role === 'MANAGER';

  const [learningPaths, setLearningPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLearningPaths = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      const response = await authFetch(`${API_BASE_URL}/learning-paths`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(
          detail || `Unable to load learning paths (HTTP ${response.status}).`
        );
      }

      const payload = await response.json();
      setLearningPaths(normalizeLearningPaths(payload));
    } catch (loadError) {
      console.error('Failed to load learning paths:', loadError);
      setLearningPaths([]);
      setError(
        loadError.message ||
          'Unable to load learning paths. Check the backend connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLearningPaths();
  }, [loadLearningPaths]);

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', minWidth: 0 }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16, 42, 67, 0.95) 0%, rgba(11, 31, 56, 0.92) 50%, rgba(27, 54, 93, 0.90) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '1.75rem 2rem',
          borderRadius: '20px',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 16px 38px rgba(11, 31, 56, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.78rem',
              color: '#38bdf8',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Enterprise Career Development Tracks
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>
            Departmental Learning Paths
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Explore structured learning tracks configured for employee development.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {isHR && (
            <button
              type="button"
              className="btn-primary"
              disabled
              title="Learning path rule management is not connected to a backend operation yet."
              style={{
                background: '#64748b',
                padding: '0.65rem 1.25rem',
                fontSize: '0.88rem',
                opacity: 0.8,
                cursor: 'not-allowed',
              }}
            >
              <Settings style={{ width: 16, height: 16 }} /> Manage Path Rules
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={loadLearningPaths}
            disabled={isLoading}
            style={{
              background: 'white',
              color: '#0f172a',
              padding: '0.65rem 0.85rem',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <RefreshCw style={{ width: 15, height: 15 }} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '1rem 1.1rem',
            borderRadius: '10px',
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span>{error}</span>
          <button type="button" className="btn-secondary" onClick={loadLearningPaths}>
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '3rem 1rem',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          Loading learning paths…
        </div>
      ) : !error && learningPaths.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '3rem 1rem',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <Compass style={{ width: 32, height: 32, margin: '0 auto 0.75rem', color: '#0284c7' }} />
          <h2 style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800, marginBottom: '0.4rem' }}>
            No learning paths available
          </h2>
          <p style={{ fontSize: '0.88rem' }}>
            No learning paths found. Please refresh and try again.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
            gap: '1.5rem',
          }}
        >
          {learningPaths.map((path) => {
            const isMandatory = String(path.type).toLowerCase() === 'mandatory';

            return (
              <div
                key={path.id}
                className="glass-card"
                style={{
                  background: 'rgba(255, 255, 255, 0.78)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.85)',
                  boxShadow: '0 8px 30px rgba(31, 70, 120, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        background: '#e0f2fe',
                        color: '#0369a1',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <Building2 style={{ width: 13, height: 13 }} /> {path.department}
                    </span>

                    <span
                      style={{
                        background: isMandatory ? '#ffe4e6' : '#fef3c7',
                        color: isMandatory ? '#be123c' : '#b45309',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                      }}
                    >
                      {path.type}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                    {path.title}
                  </h3>

                  <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    {path.description}
                  </p>

                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      marginBottom: '1rem',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#475569',
                        marginBottom: '0.35rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <BookOpen style={{ width: 14, height: 14, color: '#0284c7' }} />
                      Curriculum Modules ({path.courseCount} Courses)
                    </div>
                    {path.courseIds.length ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {path.courseIds.map((courseId, index) => (
                          <span
                            key={`${courseId}-${index}`}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            {courseId}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                        No courses listed for this path.
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    marginTop: 'auto',
                    paddingTop: '1rem',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.76rem',
                      color: '#475569',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <CheckCircle2 style={{ width: 14, height: 14, color: '#16a34a' }} />
                    {path.autoAssigned === true
                      ? 'Auto-assigned on onboarding'
                      : 'Assignment rule not confirmed'}
                  </div>
                  {isHR && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                      onClick={() => setSelectedPath(path)}
                    >
                      <Eye style={{ width: 14, height: 14 }} /> View
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPath && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedPath(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="learning-path-details-title"
            style={{
              background: 'white',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '85vh',
              overflowY: 'auto',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 20px 60px rgba(15, 23, 42, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <div style={{ color: '#0284c7', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  Learning Path Details
                </div>
                <h2 id="learning-path-details-title" style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: 800, marginTop: '0.35rem' }}>
                  {selectedPath.title}
                </h2>
              </div>
              <button
                type="button"
                className="btn-secondary"
                aria-label="Close learning path details"
                onClick={() => setSelectedPath(null)}
                style={{ padding: '0.4rem', minWidth: '34px' }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, marginTop: '0.8rem' }}>
              {selectedPath.description}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
              <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Department</div>
                <div style={{ color: '#0f172a', fontWeight: 700, marginTop: '0.25rem' }}>{selectedPath.department}</div>
              </div>
              <div style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Assignment Type</div>
                <div style={{ color: '#0f172a', fontWeight: 700, marginTop: '0.25rem' }}>{selectedPath.type}</div>
              </div>
            </div>
            <h3 style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, marginTop: '1.25rem', marginBottom: '0.5rem' }}>
              Included Courses
            </h3>
            {selectedPath.courseIds.length ? (
              <ul style={{ paddingLeft: '1.25rem', color: '#334155', fontSize: '0.85rem', lineHeight: 1.8 }}>
                {selectedPath.courseIds.map((courseId, index) => (
                  <li key={`${courseId}-${index}`}>{courseId}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>The API did not return course details for this path.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
