import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  BookOpen,
  RefreshCw,
  AlertCircle,
  Eye,
  X,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  LayoutGrid,
  List,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import '../styles/department-directory-glass.css';

const API_BASE_URL = SHARED_API_BASE_URL;

function getToken() {
  return (
    localStorage.getItem('fairmacs_token') ||
    localStorage.getItem('fairmacs_lms_token') ||
    ''
  );
}

export default function DepartmentManagement() {
  const navigate = useNavigate();

  // Core State
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Apple Toolbar & Filters
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'NEEDS_COURSES'
  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CARDS'
  const [sortBy, setSortBy] = useState('NAME'); // 'NAME' | 'WORKFORCE' | 'COURSES'

  // Apple Gesture Quick-Look Sheet
  const [inspectDept, setInspectDept] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectDetails, setInspectDetails] = useState(null);

  // Gesture handling for bottom sheet
  const [dragY, setDragY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const dragStartY = useRef(0);

  // 1. Fetch All Departments
  const loadDepartments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const token = getToken();
      const response = await authFetch(`${API_BASE_URL}/departments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`Unable to load departments (${response.status})`);
      }

      const data = await response.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Department loading failed:', err);
      setError(err.message || 'Unable to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  // 2. Fetch Division Details for Quick-Look Sheet
  const handleOpenQuickLook = useCallback(async (dept) => {
    setInspectDept(dept);
    setInspectDetails(null);
    setInspectLoading(true);
    setDragY(0);

    try {
      const token = getToken();
      const response = await authFetch(`${API_BASE_URL}/departments/${dept.id}/details`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInspectDetails(data);
      }
    } catch (err) {
      console.error('Failed to load quick-look details:', err);
    } finally {
      setInspectLoading(false);
    }
  }, []);

  const handleCloseQuickLook = useCallback(() => {
    setInspectDept(null);
    setInspectDetails(null);
    setDragY(0);
  }, []);

  // Lock body scroll and handle Escape key for Quick-Look sheet
  useEffect(() => {
    if (!inspectDept) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleCloseQuickLook();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [inspectDept, handleCloseQuickLook]);

  // Gesture Drag Handling
  const handlePointerDown = (e) => {
    dragStartY.current = e.clientY;
    setIsDraggingSheet(true);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingSheet) return;
    const deltaY = e.clientY - dragStartY.current;
    if (deltaY > 0) {
      // 1:1 down tracking with rubber-band
      setDragY(deltaY);
    } else {
      // Upward rubber band
      setDragY(deltaY * 0.2);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDraggingSheet) return;
    setIsDraggingSheet(false);
    const deltaY = e.clientY - dragStartY.current;
    // Dismiss if pulled down > 110px
    if (deltaY > 110) {
      handleCloseQuickLook();
    } else {
      setDragY(0);
    }
  };

  // 3. Computed Telemetry
  const telemetry = useMemo(() => {
    const totalDivisions = departments.length;
    const totalEmployees = departments.reduce(
      (sum, d) => sum + Number(d.employeeCount || 0),
      0
    );
    const activeWithCourses = departments.filter(
      (d) => Number(d.assignedCoursesCount || 0) > 0
    ).length;

    const avgCompletion =
      totalDivisions > 0
        ? Math.round(
            departments.reduce((sum, d) => sum + Number(d.completionRate || 0), 0) /
              totalDivisions
          )
        : 0;

    return {
      totalDivisions,
      totalEmployees,
      activeWithCourses,
      avgCompletion
    };
  }, [departments]);

  // 4. Filtering and Sorting
  const filteredDepartments = useMemo(() => {
    let list = [...departments];

    // Segmented Filter
    if (activeFilter === 'ACTIVE') {
      list = list.filter((d) => Number(d.assignedCoursesCount || 0) > 0);
    } else if (activeFilter === 'NEEDS_COURSES') {
      list = list.filter((d) => Number(d.assignedCoursesCount || 0) === 0);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'WORKFORCE') {
        return Number(b.employeeCount || 0) - Number(a.employeeCount || 0);
      }
      if (sortBy === 'COURSES') {
        return (
          Number(b.assignedCoursesCount || 0) -
          Number(a.assignedCoursesCount || 0)
        );
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    return list;
  }, [departments, activeFilter, sortBy]);

  const handleViewDepartment = (deptId) => {
    navigate(`/hr/departments/${deptId}`);
  };

  return (
    <div className="dept-apple-shell">
      {/* Subtle Ambient Glow */}
      <div className="dept-apple-ambient" aria-hidden="true" />

      {/* =========================================================================
          1. APPLE VIBRANCY TOOLBAR (Zero Dark Banner)
         ========================================================================= */}
        <header className="dept-apple-toolbar">
        {/* Secondary Bar: Segmented Filter + View Switcher + Sort */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.65rem',
          }}
        >
          {/* Segmented Filter */}
          <div className="dept-segmented-track" role="tablist" aria-label="Department filters">
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === 'ALL'}
              data-active={activeFilter === 'ALL'}
              onClick={() => setActiveFilter('ALL')}
              className="dept-segmented-tab"
            >
              All ({departments.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === 'ACTIVE'}
              data-active={activeFilter === 'ACTIVE'}
              onClick={() => setActiveFilter('ACTIVE')}
              className="dept-segmented-tab"
            >
              Active Courses ({telemetry.activeWithCourses})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === 'NEEDS_COURSES'}
              data-active={activeFilter === 'NEEDS_COURSES'}
              onClick={() => setActiveFilter('NEEDS_COURSES')}
              className="dept-segmented-tab"
            >
              Needs Courses ({departments.length - telemetry.activeWithCourses})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            {/* Sort Selector */}
            <div className="dept-segmented-track">
              <button
                type="button"
                data-active={sortBy === 'NAME'}
                onClick={() => setSortBy('NAME')}
                className="dept-segmented-tab"
                title="Sort Alphabetically"
              >
                A–Z
              </button>
              <button
                type="button"
                data-active={sortBy === 'WORKFORCE'}
                onClick={() => setSortBy('WORKFORCE')}
                className="dept-segmented-tab"
                title="Sort by Workforce size"
              >
                Workforce
              </button>
              <button
                type="button"
                data-active={sortBy === 'COURSES'}
                onClick={() => setSortBy('COURSES')}
                className="dept-segmented-tab"
                title="Sort by Assigned Courses"
              >
                Courses
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="dept-segmented-track" aria-label="View switch">
              <button
                type="button"
                data-active={viewMode === 'LIST'}
                onClick={() => setViewMode('LIST')}
                className="dept-segmented-tab"
                aria-label="List View"
                title="List View"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                data-active={viewMode === 'CARDS'}
                onClick={() => setViewMode('CARDS')}
                className="dept-segmented-tab"
                aria-label="Cards View"
                title="Cards View"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#B91C1C'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={18} aria-hidden="true" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadDepartments}
            className="dept-apple-btn"
            style={{ height: '32px', borderColor: '#FECACA', color: '#B91C1C' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* =========================================================================
          3. DEPARTMENT DIRECTORY CONTENT (Cards or Inset List)
         ========================================================================= */}
      {loading ? (
        <div
          style={{
            padding: '4rem 1rem',
            textAlign: 'center',
            color: '#64748B',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <RefreshCw size={26} className="animate-spin text-sky-600" aria-hidden="true" />
          <span style={{ fontSize: '0.9rem', fontWeight: 650 }}>
            Loading Fairmacs departments...
          </span>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div
          style={{
            padding: '4rem 1rem',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.65)',
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}
        >
          <Building2 size={34} style={{ margin: '0 auto 0.6rem', color: '#94A3B8' }} aria-hidden="true" />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 750, color: '#0F172A' }}>
            No departments found
          </h3>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
            {searchQuery
              ? `No division matched "${searchQuery}". Try a different keyword.`
              : 'No departments currently registered in the database.'}
          </p>
        </div>
      ) : viewMode === 'CARDS' ? (
        /* CARDS PLATTER GRID */
        <div className="dept-cards-grid animate-fade-in">
          {filteredDepartments.map((dept) => {
            const employeeCount = Number(dept.employeeCount || 0);
            const assignedCourses = Number(dept.assignedCoursesCount || 0);
            const rate = Math.round(Number(dept.completionRate || 0));
            const hasAssigned = assignedCourses > 0;
            const initial = (dept.name || 'D').charAt(0).toUpperCase();

            return (
              <div key={dept.id} className="dept-card-platter">
                {/* Header */}
                <div className="dept-card-header">
                  <div className="dept-card-identity">
                    <div className="dept-card-avatar" aria-hidden="true">
                      {initial}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 className="dept-card-title" title={dept.name}>
                        {dept.name}
                      </h3>
                      <div className="dept-card-lead">
                        {dept.headId ? `Lead: ${dept.headId}` : 'Lead Unassigned'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`dept-status-pill ${
                      !hasAssigned
                        ? 'is-neutral'
                        : rate >= 90
                        ? 'is-met'
                        : 'is-active'
                    }`}
                  >
                    {!hasAssigned ? (
                      <>
                        <HelpCircle size={11} aria-hidden="true" /> No Courses
                      </>
                    ) : rate >= 90 ? (
                      <>
                        <CheckCircle2 size={11} aria-hidden="true" /> {rate}% Complete
                      </>
                    ) : (
                      <>
                        <Layers size={11} aria-hidden="true" /> {rate}% Active
                      </>
                    )}
                  </span>
                </div>

                {/* Body */}
                <div className="dept-card-body">
                  <p className="dept-card-desc">
                    {dept.description ||
                      'Operational division managing enterprise processes and cross-border freight forwarding services.'}
                  </p>

                  <div className="dept-card-stats-row">
                    <div className="dept-card-chip" title="Active Workforce">
                      <Users size={14} color="#0284C7" aria-hidden="true" />
                      <span>{employeeCount} Staff</span>
                    </div>

                    <div className="dept-card-chip" title="Assigned Courses">
                      <BookOpen size={14} color="#16A34A" aria-hidden="true" />
                      <span>{assignedCourses} Courses</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="dept-card-footer">
                  <button
                    type="button"
                    onClick={() => handleOpenQuickLook(dept)}
                    className="dept-action-peek"
                    aria-label={`Quick look ${dept.name}`}
                  >
                    <Eye size={13} aria-hidden="true" />
                    <span>Quick Look</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewDepartment(dept.id)}
                    className="dept-action-open"
                    aria-label={`Open ${dept.name} full details`}
                  >
                    <span>View Division</span>
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* INSET GROUPED LIST VIEW */
        <div className="dept-inset-list animate-fade-in" role="list">
          {filteredDepartments.map((dept) => {
            const employeeCount = Number(dept.employeeCount || 0);
            const assignedCourses = Number(dept.assignedCoursesCount || 0);
            const rate = Math.round(Number(dept.completionRate || 0));
            const hasAssigned = assignedCourses > 0;
            const initial = (dept.name || 'D').charAt(0).toUpperCase();

            return (
              <div
                key={dept.id}
                role="listitem"
                onClick={() => handleOpenQuickLook(dept)}
                className="dept-list-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
                  <div className="dept-card-avatar" style={{ width: 38, height: 38, fontSize: '0.95rem' }} aria-hidden="true">
                    {initial}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 750, color: '#0F172A' }}>
                      {dept.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 1 }}>
                      {dept.headId ? `Lead: ${dept.headId}` : 'Lead Unassigned'}
                    </div>
                  </div>
                </div>

                <div className="dept-list-metrics-cluster">
                  <span className="dept-card-chip dept-metric-chip" title="Employees">
                    <Users size={13} color="#0284C7" aria-hidden="true" />
                    <span>{employeeCount}</span>
                  </span>

                  <span className="dept-card-chip dept-metric-chip" title="Assigned Courses">
                    <BookOpen size={13} color="#16A34A" aria-hidden="true" />
                    <span>{assignedCourses}</span>
                  </span>

                  <span
                    className={`dept-status-pill dept-status-fixed ${
                      !hasAssigned ? 'is-neutral' : rate >= 90 ? 'is-met' : 'is-active'
                    }`}
                  >
                    {!hasAssigned ? 'No Courses' : `${rate}%`}
                  </span>

                  <ChevronRight size={16} color="#94A3B8" aria-hidden="true" className="dept-row-chevron" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          4. APPLE GESTURE QUICK-LOOK SHEET (Draggable Bottom Sheet)
         ========================================================================= */}
      {inspectDept && typeof document !== 'undefined' && createPortal(
        <div
          className="dept-sheet-overlay animate-fade-in"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseQuickLook();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dept-quick-look-title"
            className="dept-sheet-platter"
            style={{
              transform: `translateY(${Math.max(0, dragY)}px)`,
              transition: isDraggingSheet ? 'none' : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)'
            }}
          >
            {/* Gesture Drag Handle */}
            <div
              className="dept-sheet-drag-handle-wrap"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Drag handle to dismiss"
            >
              <div className="dept-sheet-drag-pill" />
            </div>

            {/* Header */}
            <div className="dept-sheet-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div className="dept-card-avatar" style={{ width: 36, height: 36, fontSize: '0.9rem' }} aria-hidden="true">
                  {(inspectDept.name || 'D').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 id="dept-quick-look-title" className="dept-sheet-title">
                    {inspectDept.name}
                  </h2>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    {inspectDept.headId ? `Lead: ${inspectDept.headId}` : 'Lead Unassigned'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseQuickLook}
                className="dept-sheet-close-btn"
                aria-label="Close Quick Look"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="dept-sheet-body">
              {/* Telemetry Highlights */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.65rem',
                  padding: '0.85rem',
                  background: 'rgba(241, 245, 249, 0.75)',
                  borderRadius: '16px'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Staff
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#0F172A' }}>
                    {inspectDetails?.employeeCount ?? inspectDept.employeeCount ?? 0}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Courses
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#0F172A' }}>
                    {inspectDetails?.assignedCoursesCount ?? inspectDept.assignedCoursesCount ?? 0}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Completion
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 850, color: '#16A34A' }}>
                    {Math.round(inspectDetails?.completionRate ?? inspectDept.completionRate ?? 0)}%
                  </div>
                </div>
              </div>

              {/* Description */}
              {inspectDept.description && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 750, color: '#475569', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Overview
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                    {inspectDept.description}
                  </p>
                </div>
              )}

              {/* Roster Preview */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 750, color: '#475569', textTransform: 'uppercase' }}>
                    Workforce Roster ({inspectDetails?.employees?.length ?? inspectDept.employeeCount ?? 0})
                  </span>
                </div>

                {inspectLoading ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
                    <RefreshCw size={18} className="animate-spin text-sky-600" style={{ margin: '0 auto 0.4rem' }} aria-hidden="true" />
                    Fetching roster details...
                  </div>
                ) : inspectDetails?.employees?.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {inspectDetails.employees.slice(0, 5).map((emp) => (
                      <div
                        key={emp.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '12px',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                            {emp.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            {emp.designation || 'Staff'} • {emp.email}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '6px', background: '#E0F2FE', color: '#0369A1', fontWeight: 700 }}>
                          {emp.employeeId || 'ID'}
                        </span>
                      </div>
                    ))}
                    {inspectDetails.employees.length > 5 && (
                      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748B', padding: '0.2rem' }}>
                        +{inspectDetails.employees.length - 5} more members
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
                    No employees assigned to this division yet.
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="dept-sheet-footer">
              <button
                type="button"
                onClick={handleCloseQuickLook}
                className="dept-apple-btn"
                style={{ height: '36px' }}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const id = inspectDept.id;
                  handleCloseQuickLook();
                  handleViewDepartment(id);
                }}
                className="dept-action-open"
                style={{ height: '36px', padding: '0 1.15rem' }}
              >
                <span>Open Full Division</span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
