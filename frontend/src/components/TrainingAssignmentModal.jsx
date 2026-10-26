import React, { useEffect, useMemo, useState } from 'react';

import {
  X,
  CheckCircle2,
  AlertCircle,
  Send,
} from 'lucide-react';

import { courseService } from '../services/courseService';
import { enrollmentService } from '../services/enrollmentService';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

function getAuthToken() {
  return (
    localStorage.getItem('fairmacs_token') ||
    localStorage.getItem('fairmacs_lms_token') ||
    ''
  );
}

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function TrainingAssignmentModal({
  onClose,
  onAssignSuccess,
}) {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const [courseId, setCourseId] = useState('');
  const [assignTargetType, setAssignTargetType] =
    useState('DEPARTMENT');
  const [targetDept, setTargetDept] = useState('');
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [trainingType, setTrainingType] =
    useState('MANDATORY');

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [assignedCount, setAssignedCount] = useState(0);

  const selectedCourse = useMemo(() => {
    return courses.find(
      (course) =>
        String(course.id ?? course.courseId ?? '') ===
        String(courseId)
    );
  }, [courses, courseId]);

  const selectedDepartment = useMemo(() => {
    return departments.find(
      (department) =>
        String(department.id ?? '') ===
        String(targetDept)
    );
  }, [departments, targetDept]);

  // ----------------------------------------------------------
  // LOAD REAL COURSES + DEPARTMENTS
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        setError('');

        const data = await courseService.getAllCourses();

        if (cancelled) return;

        const list = Array.isArray(data) ? data : [];

        setCourses(list);

        if (list.length > 0) {
          const firstCourse = list[0];

          setCourseId(
            String(
              firstCourse.id ??
              firstCourse.courseId ??
              firstCourse.code ??
              ''
            )
          );
        }
      } catch (err) {
        console.error('Failed to load courses:', err);

        if (!cancelled) {
          setError(
            err?.message ||
            'Unable to load courses from the server.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCourses(false);
        }
      }
    };

    const loadDepartments = async () => {
      try {
        setLoadingDepartments(true);

        const token = getAuthToken();

        const response = await fetch(
          `${API_BASE_URL}/departments`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
          }
        );

        const text = await response.text();

        let data = null;

        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
            data?.error ||
            `Unable to load departments (${response.status}).`
          );
        }

        if (cancelled) return;

        const list = Array.isArray(data) ? data : [];

        setDepartments(list);

        if (list.length > 0) {
          setTargetDept(
            String(
              list[0].name ??
              list[0].departmentName ??
              list[0].id ??
              ''
            )
          );
        }
      } catch (err) {
        console.error('Failed to load departments:', err);

        if (!cancelled) {
          setError(
            err?.message ||
            'Unable to load departments from the server.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingDepartments(false);
        }
      }
    };

    loadCourses();
    loadDepartments();

    return () => {
      cancelled = true;
    };
  }, []);

  // ----------------------------------------------------------
  // SUBMIT REAL DEPARTMENT ASSIGNMENT
  // ----------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (!selectedCourse) {
      setError('Please select a valid course.');
      return;
    }

    if (!targetDept) {
      setError('Please select a department.');
      return;
    }

    if (!dueDate) {
      setError('Please select a due date.');
      return;
    }

    if (assignTargetType !== 'DEPARTMENT') {
      setError(
        'Department assignment is currently supported. Employee, Role and Organization assignment will be added separately.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const courseCode =
        selectedCourse.id ??
        selectedCourse.courseCode ??
        selectedCourse.code;

      const courseDbId =
        selectedCourse.dbId ??
        selectedCourse.courseId ??
        selectedCourse.id;

      const departmentName =
        selectedDepartment?.name ??
        selectedDepartment?.departmentName ??
        targetDept;

      const response =
        await enrollmentService.assignCourseToDepartment({
          department: departmentName,
          courseId: courseDbId || null,
          courseCode: courseCode || null,
          dueDate,
          trainingType,
        });

      setAssignedCount(
        Number(response?.assignedCount || 0)
      );

      setSubmitted(true);

      setTimeout(() => {
        onAssignSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      console.error(
        'Course assignment failed:',
        err
      );

      setError(
        err?.message ||
        'Failed to assign training. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const courseTitle =
    selectedCourse?.title ??
    selectedCourse?.name ??
    selectedCourse?.courseName ??
    'Selected course';

  const departmentLabel =
    selectedDepartment?.name ??
    selectedDepartment?.departmentName ??
    targetDept;

  const departmentCount =
    selectedDepartment?.employeeCount ??
    selectedDepartment?.employeesCount ??
    selectedDepartment?.totalEmployees;

  const loading =
    loadingCourses || loadingDepartments;

  return (
    <div className="modal-overlay">
      <div
        className="modal-content animate-fade-in"
        style={{
          maxWidth: '600px',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#0f172a',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'white',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#c084fc',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              HR Enterprise Training Suite
            </div>

            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                margin: 0,
              }}
            >
              Create Training Assignment
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              padding: '0.4rem',
              borderRadius: '50%',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.75rem' }}>
          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              {/* Course */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.35rem',
                  }}
                >
                  Select Course *
                </label>

                <select
                  value={courseId}
                  disabled={loadingCourses || submitting}
                  onChange={(e) =>
                    setCourseId(e.target.value)
                  }
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: 'white',
                  }}
                >
                  {loadingCourses ? (
                    <option value="">
                      Loading courses...
                    </option>
                  ) : courses.length === 0 ? (
                    <option value="">
                      No courses available
                    </option>
                  ) : (
                    courses.map((course) => {
                      const value =
                        course.id ??
                        course.courseId ??
                        course.code;

                      const code =
                        course.courseCode ??
                        course.code ??
                        course.id;

                      const title =
                        course.title ??
                        course.name ??
                        course.courseName ??
                        'Untitled Course';

                      return (
                        <option
                          key={String(value)}
                          value={String(value)}
                        >
                          {title} ({code})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              {/* Target */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '0.5rem',
                  }}
                >
                  Assign To Target *
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(2, 1fr)',
                    gap: '0.6rem',
                  }}
                >
                  {[
                    {
                      id: 'DEPARTMENT',
                      label: 'Department',
                    },
                    {
                      id: 'EMPLOYEE',
                      label: 'Individual Employee',
                      disabled: true,
                    },
                    {
                      id: 'ROLE',
                      label: 'System Role',
                      disabled: true,
                    },
                    {
                      id: 'ALL',
                      label: 'Entire Organization',
                      disabled: true,
                    },
                  ].map((item) => (
                    <label
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border:
                          assignTargetType === item.id
                            ? '2px solid #9333ea'
                            : '1px solid #cbd5e1',
                        background:
                          assignTargetType === item.id
                            ? '#f3e8ff'
                            : '#f8fafc',
                        cursor: item.disabled
                          ? 'not-allowed'
                          : 'pointer',
                        fontSize: '0.85rem',
                        fontWeight:
                          assignTargetType === item.id
                            ? 700
                            : 500,
                        color:
                          assignTargetType === item.id
                            ? '#7e22ce'
                            : '#334155',
                        opacity: item.disabled ? 0.55 : 1,
                      }}
                    >
                      <input
                        type="radio"
                        name="assignTarget"
                        checked={
                          assignTargetType === item.id
                        }
                        disabled={item.disabled}
                        onChange={() =>
                          setAssignTargetType(item.id)
                        }
                      />

                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Department */}
              {assignTargetType === 'DEPARTMENT' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Select Target Department *
                  </label>

                  <select
                    value={targetDept}
                    disabled={
                      loadingDepartments || submitting
                    }
                    onChange={(e) =>
                      setTargetDept(e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      background: 'white',
                    }}
                  >
                    {loadingDepartments ? (
                      <option value="">
                        Loading departments...
                      </option>
                    ) : departments.length === 0 ? (
                      <option value="">
                        No departments available
                      </option>
                    ) : (
                      departments.map((department) => {
                        const value =
                          department.name ??
                          department.departmentName ??
                          department.id;

                        const count =
                          department.employeeCount ??
                          department.employeesCount ??
                          department.totalEmployees;

                        return (
                          <option
                            key={String(
                              department.id ?? value
                            )}
                            value={String(value)}
                          >
                            {value}
                            {count != null
                              ? ` (${count} Employees)`
                              : ''}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              )}

              {/* Date + Type */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: '1rem',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Compliance Due Date *
                  </label>

                  <input
                    type="date"
                    required
                    min={new Date()
                      .toISOString()
                      .split('T')[0]}
                    value={dueDate}
                    disabled={submitting}
                    onChange={(e) =>
                      setDueDate(e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Training Requirement Type *
                  </label>

                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      marginTop: '0.2rem',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#e11d48',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="tType"
                        checked={
                          trainingType === 'MANDATORY'
                        }
                        disabled={submitting}
                        onChange={() =>
                          setTrainingType('MANDATORY')
                        }
                      />
                      Mandatory
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#0284c7',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="tType"
                        checked={
                          trainingType === 'RECOMMENDED'
                        }
                        disabled={submitting}
                        onChange={() =>
                          setTrainingType('RECOMMENDED')
                        }
                      />
                      Recommended
                    </label>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  <AlertCircle
                    style={{
                      width: 17,
                      height: 17,
                      flexShrink: 0,
                    }}
                  />
                  {error}
                </div>
              )}

              {/* Summary */}
              <div
                style={{
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.82rem',
                  color: '#475569',
                }}
              >
                <strong>Summary:</strong> Assigning{' '}
                <strong>{courseTitle}</strong> as{' '}
                <strong>{trainingType}</strong> training
                to <strong>{departmentLabel}</strong>
                {departmentCount != null
                  ? ` (${departmentCount} employees)`
                  : ''}{' '}
                due by <strong>{dueDate}</strong>.
                In-app notifications will be dispatched
                automatically.
              </div>

              {/* Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    submitting ||
                    loading ||
                    courses.length === 0 ||
                    departments.length === 0
                  }
                  style={{
                    background: submitting
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #9333ea, #7e22ce)',
                    padding: '0.65rem 1.5rem',
                    fontSize: '0.92rem',
                    cursor: submitting
                      ? 'not-allowed'
                      : 'pointer',
                    opacity: submitting ? 0.8 : 1,
                  }}
                >
                  <Send
                    style={{
                      width: 16,
                      height: 16,
                    }}
                  />

                  {submitting
                    ? 'Assigning...'
                    : 'Assign Training & Notify'}
                </button>
              </div>
            </form>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem 0',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: '#dcfce7',
                  color: '#16a34a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <CheckCircle2
                  style={{
                    width: 40,
                    height: 40,
                  }}
                />
              </div>

              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                Training Successfully Assigned!
              </h3>

              <p
                style={{
                  fontSize: '0.85rem',
                  color: '#64748b',
                  marginTop: '0.4rem',
                }}
              >
                Training has been assigned successfully
                to <strong>{assignedCount}</strong>{' '}
                learner
                {assignedCount !== 1 ? 's' : ''}.
                In-app notifications have been sent
                automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
