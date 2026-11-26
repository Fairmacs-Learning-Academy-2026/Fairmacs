import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  ExternalLink,
  Building2,
  GraduationCap,
  Layers,
  Users,
  Trash2,
  Filter,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseService } from '../services/courseService';
import { enrollmentService } from '../services/enrollmentService';
import CourseThumbnailImage from './CourseThumbnailImage';
import CourseBuilderModal, { preloadCourseBuilderReferenceData } from './CourseBuilderModal';
import CourseAssignmentModal from './CourseAssignmentModal';
import { formatCourseDuration } from '../utils/courseDuration';

function normalizeStatus(course) {
  const status = String(course?.enrollmentStatus || course?.status || '').toUpperCase();
  const progress = Number(course?.progressPercent ?? course?.progress ?? 0);

  if (status === 'COMPLETED' || progress >= 100) {
    return 'COMPLETED';
  }

  if (course?.dueDate) {
    const due = new Date(course.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!Number.isNaN(due.getTime()) && due < today && progress < 100) {
      return 'OVERDUE';
    }
  }

  if (status === 'IN_PROGRESS' || status === 'IN PROGRESS' || progress > 0) {
    return 'IN_PROGRESS';
  }

  return 'NOT_STARTED';
}

function getDeadlineInfo(dateVal) {
  if (!dateVal) return null;
  const due = new Date(dateVal);
  if (Number.isNaN(due.getTime())) return null;

  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const formattedDate = due.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  if (diffDays < 0) {
    return {
      type: 'overdue',
      label: `Overdue by ${Math.abs(diffDays)}d`,
      dateText: formattedDate,
      bg: '#FEE2E2',
      color: '#DC2626'
    };
  }
  if (diffDays === 0) {
    return {
      type: 'due_today',
      label: 'Due today',
      dateText: formattedDate,
      bg: '#FEF3C7',
      color: '#D97706'
    };
  }
  if (diffDays <= 7) {
    return {
      type: 'approaching',
      label: `Due in ${diffDays}d`,
      dateText: formattedDate,
      bg: '#FEF3C7',
      color: '#B45309'
    };
  }
  return {
    type: 'normal',
    label: `Due ${formattedDate}`,
    dateText: formattedDate,
    bg: '#F1F5F9',
    color: '#475569'
  };
}

function normalizeAssignedCourse(course, index = 0) {
  const modulesList = Array.isArray(course?.modules) ? course.modules : [];
  const calculatedModuleCount = modulesList.length;
  const calculatedLessonCount = modulesList.reduce(
    (acc, m) => acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
    0
  );

  const moduleCount =
    typeof course?.moduleCount === 'number'
      ? course.moduleCount
      : calculatedModuleCount > 0
      ? calculatedModuleCount
      : (course?.moduleCount != null ? Number(course.moduleCount) : 0);

  const lessonCount =
    typeof course?.lessonCount === 'number'
      ? course.lessonCount
      : calculatedLessonCount > 0
      ? calculatedLessonCount
      : (course?.lessonCount != null ? Number(course.lessonCount) : 0);

  const bannerUrl = course?.banner || course?.thumbnailUrl || course?.thumbnail || '';
  const progressPercent = Math.max(0, Math.min(100, Number(course?.progressPercent ?? course?.progress ?? 0)));
  const normalizedStatus = normalizeStatus(course);

  return {
    ...course,
    _key: course?.dbId ?? course?.courseDatabaseId ?? course?.id ?? course?.courseId ?? index,
    title: course?.title ?? course?.courseTitle ?? 'Untitled Course',
    id: course?.id ?? course?.courseId ?? course?.courseCode ?? '',
    progressPercent,
    status: normalizedStatus,
    duration: formatCourseDuration(course?.duration, course?.durationHours),
    banner: bannerUrl,
    thumbnailUrl: bannerUrl,
    thumbnail: bannerUrl,
    moduleCount,
    lessonCount,
    department:
      course?.owningDepartmentName ||
      course?.department ||
      (Array.isArray(course?.departments) && course?.departments[0]) ||
      'Fairmacs Core',
    trainingType: String(
      course?.trainingType || course?.enrollmentType || course?.assignmentType || 'MANDATORY'
    ).toUpperCase()
  };
}

const getCourseId = (course) => {
  const id = course?.courseId ?? course?.courseCode ?? course?.id ?? course?.courseDbId ?? course?.dbId;
  return id == null ? '' : String(id).trim();
};

const getCourseStatus = (course) => {
  const status = String(course?.status ?? '').toUpperCase();
  if (status) return ['AVAILABLE', 'PUBLISHED', 'ACTIVE'].includes(status) ? 'PUBLISHED' : status;
  if ([true, 'true', 1, '1'].includes(course?.active) || [true, 'true', 1, '1'].includes(course?.isActive) || course?.isPublished === true || course?.published === true) return 'PUBLISHED';
  if (course?.active === false || course?.isActive === false) return 'DRAFT';
  return 'UNKNOWN';
};

export default function HrCoursesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam === 'assigned' ? 'assigned' : 'catalog');

  // ================= CATALOG STATE =================
  const [catalogCourses, setCatalogCourses] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL');

  const [courseForAssignment, setCourseForAssignment] = useState(null);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ================= ASSIGNED LEARNING STATE =================
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [assignedLoading, setAssignedLoading] = useState(true);
  const [assignedError, setAssignedError] = useState('');
  const [assignedSearch, setAssignedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // ================= COURSE BUILDER STATE =================
  const [showCourseBuilderModal, setShowCourseBuilderModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState('');

  // Load Catalog Courses
  const loadCatalogCourses = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setCatalogLoading(true);
    setCatalogError('');
    try {
      const data = await courseService.getAllCourses();
      if (Array.isArray(data)) {
        setCatalogCourses(data);
      } else {
        setCatalogCourses([]);
      }
    } catch (err) {
      setCatalogError(err.message || 'Unable to load course catalog.');
      setCatalogCourses([]);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // Load Assigned Courses for HR User
  const loadAssignedCourses = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setAssignedLoading(true);
    setAssignedError('');
    try {
      const dashboardData = await courseService.getLearningDashboard();
      let rawList = [];

      if (dashboardData && Array.isArray(dashboardData.enrolled)) {
        rawList = dashboardData.enrolled;
      } else {
        rawList = await enrollmentService.getUserEnrollments();
      }

      if (Array.isArray(rawList)) {
        const seen = new Set();
        const normalized = [];

        for (let i = 0; i < rawList.length; i++) {
          const item = rawList[i];
          const course = normalizeAssignedCourse(item, i);
          const key = String(course.dbId || course.id || course._key);

          const isRevoked =
            ['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes(course.enrollmentStatus) ||
            ['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes(course.status);

          if (seen.has(key) || isRevoked) continue;
          seen.add(key);
          normalized.push(course);
        }
        setAssignedCourses(normalized);
      } else {
        setAssignedCourses([]);
      }
    } catch (err) {
      setAssignedError(err.message || 'Unable to load your assigned courses.');
      setAssignedCourses([]);
    } finally {
      setAssignedLoading(false);
    }
  }, []);

  useEffect(() => {
    preloadCourseBuilderReferenceData();
    loadCatalogCourses();
    loadAssignedCourses();
  }, [loadCatalogCourses, loadAssignedCourses]);

  // Catalog Categories & Filtering
  const catalogCategories = useMemo(() => {
    const set = new Set();
    catalogCourses.forEach((c) => {
      const cat = c.category ?? c.categoryName ?? c.catalogCategory?.name;
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [catalogCourses]);

  const filteredCatalogCourses = useMemo(() => {
    return catalogCourses.filter((course) => {
      const q = catalogSearch.trim().toLowerCase();
      const title = course.title ?? course.courseTitle ?? '';
      const id = getCourseId(course);
      const cat = course.category ?? course.categoryName ?? course.catalogCategory?.name ?? '';
      const desc = course.description ?? '';
      const matchesSearch = !q || `${title} ${id} ${cat} ${desc}`.toLowerCase().includes(q);
      const matchesCategory =
        catalogCategoryFilter === 'ALL' ||
        cat.toLowerCase() === catalogCategoryFilter.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [catalogCourses, catalogSearch, catalogCategoryFilter]);

  // Assigned Courses Filtering
  const filteredAssignedCourses = useMemo(() => {
    return assignedCourses.filter((course) => {
      const q = assignedSearch.trim().toLowerCase();
      const textMatch =
        !q ||
        [course.title, course.id, course.department, course.category, course.description]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));

      if (!textMatch) return false;

      switch (statusFilter) {
        case 'IN_PROGRESS':
          return course.status === 'IN_PROGRESS';
        case 'NOT_STARTED':
          return course.status === 'NOT_STARTED';
        case 'COMPLETED':
          return course.status === 'COMPLETED';
        case 'OVERDUE':
          return course.status === 'OVERDUE';
        default:
          return true;
      }
    });
  }, [assignedCourses, assignedSearch, statusFilter]);

  const assignedCounts = useMemo(() => {
    return {
      all: assignedCourses.length,
      inProgress: assignedCourses.filter((c) => c.status === 'IN_PROGRESS').length,
      notStarted: assignedCourses.filter((c) => c.status === 'NOT_STARTED').length,
      completed: assignedCourses.filter((c) => c.status === 'COMPLETED').length,
      overdue: assignedCourses.filter((c) => c.status === 'OVERDUE').length
    };
  }, [assignedCourses]);

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    const courseId = getCourseId(courseToDelete);
    if (!courseId) {
      setDeleteError('Course ID missing.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      const result = await courseService.deleteCourse(courseId);
      if (result && result.success) {
        setCourseToDelete(null);
        await loadCatalogCourses();
      } else {
        setDeleteError(result?.error || 'Failed to delete course.');
      }
    } catch (err) {
      setDeleteError(err.message || 'An unexpected error occurred while deleting the course.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateCourse = async () => {
    if (!courseToDelete) return;
    const courseId = getCourseId(courseToDelete);
    if (!courseId) return;
    setIsDeactivating(true);
    setDeleteError('');
    try {
      const result = await courseService.updateCourseStatus(courseId, false);
      if (result && result.success) {
        setCourseToDelete(null);
        await loadCatalogCourses();
      } else {
        setDeleteError(result?.error || 'Failed to deactivate course.');
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to deactivate course.');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleOpenCourse = (course) => {
    const code = course.id || course.courseId;
    if (code) {
      navigate(`/courses/${encodeURIComponent(code)}/overview`, {
        state: { courseData: course }
      });
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'assigned' ? { tab: 'assigned' } : {});
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: '0 auto', padding: '0.5rem 0.5rem 2.5rem' }}>
      {/* 1. FAIRMACS BLUE GLASSMORPHISM WELCOME HEADER */}
      <section
        style={{
          background:
            'linear-gradient(135deg, rgba(16, 42, 67, 0.95) 0%, rgba(11, 31, 56, 0.92) 50%, rgba(2, 132, 199, 0.90) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 16px 38px rgba(11, 31, 56, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          padding: '1.75rem 2rem',
          borderRadius: 20,
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.78rem',
              color: '#7DD3FC',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Fairmacs Learning Academy • Course Administration
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.35rem, 2vw, 1.85rem)',
              fontWeight: 800,
              margin: '0.35rem 0',
              letterSpacing: '-0.02em'
            }}
          >
            {activeTab === 'catalog' ? 'Course Catalog & Assignments' : 'Courses Assigned to You'}
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '0.9rem', margin: 0, maxWidth: 680, lineHeight: 1.5 }}>
            {activeTab === 'catalog'
              ? 'Manage course curricula, assign learning paths across departments and employees, and maintain catalog status.'
              : 'Access training courses assigned to your HR/Admin account for professional development, mandatory compliance, and certification.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'catalog') {
                loadCatalogCourses(true);
              } else {
                loadAssignedCourses(true);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.58rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              background: 'rgba(255, 255, 255, 0.14)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'background-color 0.18s ease'
            }}
            title="Refresh current view"
          >
            <RefreshCw size={15} /> Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCourseId('');
              setShowCourseBuilderModal(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.58rem 1.1rem',
              borderRadius: '10px',
              border: '1px solid #38BDF8',
              background: '#0284C7',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              transition: 'background-color 0.18s ease'
            }}
          >
            <Plus size={15} /> Create Course
          </button>
        </div>
      </section>

      {/* 2. PRIMARY VIEW SWITCHER TABS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => handleTabSwitch('catalog')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.15rem',
            borderRadius: '12px',
            border: activeTab === 'catalog' ? '1px solid #0284C7' : '1px solid #E2E8F0',
            background: activeTab === 'catalog' ? '#0F6CBD' : '#FFFFFF',
            color: activeTab === 'catalog' ? '#FFFFFF' : '#334155',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'catalog' ? '0 4px 14px rgba(15, 108, 189, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.18s ease'
          }}
        >
          <Layers size={16} />
          <span>Course Catalog &amp; Management</span>
          <span
            style={{
              fontSize: '0.74rem',
              padding: '0.12rem 0.5rem',
              borderRadius: '999px',
              background: activeTab === 'catalog' ? 'rgba(255, 255, 255, 0.25)' : '#F1F5F9',
              color: activeTab === 'catalog' ? '#FFFFFF' : '#64748B',
              fontWeight: 750
            }}
          >
            {catalogCourses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch('assigned')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.15rem',
            borderRadius: '12px',
            border: activeTab === 'assigned' ? '1px solid #0284C7' : '1px solid #E2E8F0',
            background: activeTab === 'assigned' ? '#0F6CBD' : '#FFFFFF',
            color: activeTab === 'assigned' ? '#FFFFFF' : '#334155',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'assigned' ? '0 4px 14px rgba(15, 108, 189, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.18s ease'
          }}
        >
          <GraduationCap size={16} />
          <span>My Assigned Learning</span>
          <span
            style={{
              fontSize: '0.74rem',
              padding: '0.12rem 0.5rem',
              borderRadius: '999px',
              background: activeTab === 'assigned' ? 'rgba(255, 255, 255, 0.25)' : '#F1F5F9',
              color: activeTab === 'assigned' ? '#FFFFFF' : '#64748B',
              fontWeight: 750
            }}
          >
            {assignedCourses.length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: COURSE CATALOG & MANAGEMENT ================= */}
      {activeTab === 'catalog' && (
        <div className="animate-fade-in">
          {/* Filter & Search Bar */}
          <section
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(226, 232, 240, 0.95)',
              borderRadius: 16,
              padding: '1rem 1.35rem',
              boxShadow: '0 4px 20px rgba(31, 70, 120, 0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search
                  size={15}
                  color="#94A3B8"
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search course title, ID, category…"
                  aria-label="Search course catalog"
                  style={{
                    padding: '0.52rem 0.85rem 0.52rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    color: '#0F172A',
                    background: '#FFFFFF',
                    outline: 'none'
                  }}
                 enterKeyHint="search" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Filter size={15} color="#64748B" />
                <select
                  value={catalogCategoryFilter}
                  onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                  style={{
                    padding: '0.52rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.84rem',
                    color: '#0F172A',
                    background: '#FFFFFF',
                    outline: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">All Categories ({catalogCourses.length})</option>
                  {catalogCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#64748B', fontWeight: 600 }}>
              Showing {filteredCatalogCourses.length} of {catalogCourses.length} courses
            </div>
          </section>

          {/* Catalog Error Banner */}
          {catalogError && (
            <div
              role="alert"
              style={{
                padding: '0.8rem 1rem',
                marginBottom: '1.25rem',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#B91C1C',
                border: '1px solid #FECACA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}
            >
              <span>{catalogError}</span>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => loadCatalogCourses(true)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Catalog Management Data Table */}
          <div
            className="glass-panel"
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRadius: '16px',
              padding: '1.25rem',
              border: '1px solid rgba(226, 232, 240, 0.95)',
              boxShadow: '0 4px 20px rgba(31, 70, 120, 0.05)',
              overflow: 'hidden'
            }}
          >
            <div className="table-scroll">
              <table className="data-table" style={{ width: '100%', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Course ID &amp; Title</th>
                    <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Category</th>
                    <th className="th-right" style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Enrolled</th>
                    <th className="th-center" style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogLoading ? (
                    Array.from({ length: 4 }).map((_, sIdx) => (
                      <tr key={`catalog-skel-${sIdx}`}>
                        <td colSpan={5} style={{ padding: '0.75rem 1rem' }}>
                          <div
                            className="skeleton-shimmer"
                            style={{
                              height: '48px',
                              borderRadius: '8px',
                              width: '100%',
                            }}
                          />
                        </td>
                      </tr>
                    ))
                  ) : filteredCatalogCourses.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <BookOpen size={32} style={{ color: '#94a3b8' }} />
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>No courses found</div>
                          <p style={{ margin: 0, fontSize: '0.84rem' }}>
                            {catalogError
                              ? 'Courses could not be loaded. Click Refresh to try again.'
                              : 'No courses match the current search and filter criteria.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCatalogCourses.map((course, index) => {
                      const courseId = getCourseId(course);
                      const status = getCourseStatus(course);
                      const isPublished = status === 'PUBLISHED' || status === 'ACTIVE';
                      const title = course.title ?? course.courseTitle ?? 'Untitled course';
                      const category = course.category ?? course.categoryName ?? course.categorySlug ?? course.catalogCategory?.name ?? '—';
                      const duration = course.duration
                        ?? (course.durationHours != null ? `${course.durationHours} hours` : 'Duration not set');
                      const enrolledCount = course.enrolledCount ?? course.enrollmentCount ?? 0;

                      return (
                        <tr
                          key={courseId ? `cat-row-${courseId}` : `cat-row-idx-${index}`}
                          style={{ fontSize: '0.88rem' }}
                        >
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                              <div
                                style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  border: '1px solid #E2EAF3',
                                  background: '#F8FAFC',
                                }}
                              >
                                <CourseThumbnailImage
                                  course={course}
                                  alt={title}
                                  style={{ width: '100%', height: '100%' }}
                                />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{title}</div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                                  ID: <span className="tabular-nums font-semibold">{courseId || '—'}</span> • {duration}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                padding: '0.22rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(186, 230, 253, 0.8)',
                              }}
                            >
                              {category}
                            </span>
                          </td>
                          <td className="nowrap td-right" style={{ padding: '1rem', fontWeight: 700, color: '#0f172a' }}>
                            {enrolledCount == null ? '0 Learners' : `${enrolledCount} Learners`}
                          </td>
                          <td className="td-center" style={{ padding: '1rem' }}>
                            <span
                              className={`badge-status ${isPublished ? 'badge-status-success' : 'badge-status-warning'}`}
                            >
                              <span className="badge-status-dot" />
                              {status === 'UNKNOWN' ? 'Status unavailable' : status}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn-primary nowrap"
                                style={{
                                  padding: '0.42rem 0.85rem',
                                  fontSize: '0.8rem',
                                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                  color: '#ffffff',
                                  borderRadius: '8px',
                                  border: 'none',
                                  fontWeight: 650,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                                  transition: 'all 0.15s ease-in-out',
                                }}
                                onClick={() => setCourseForAssignment(course)}
                              >
                                <Users size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                Manage Assignments
                              </button>

                              <button
                                type="button"
                                className="nowrap"
                                style={{
                                  padding: '0.42rem 0.75rem',
                                  fontSize: '0.8rem',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontWeight: 650,
                                  transition: 'all 0.15s ease-in-out',
                                }}
                                onClick={() => {
                                  setDeleteError('');
                                  setCourseToDelete(course);
                                }}
                                title="Delete Course"
                              >
                                <Trash2 size={14} />
                                Delete
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
        </div>
      )}

      {/* ================= TAB 2: MY ASSIGNED LEARNING ================= */}
      {activeTab === 'assigned' && (
        <div className="animate-fade-in">
          {/* Status Filter Tabs & Search */}
          <section
            style={{
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(226, 232, 240, 0.95)',
              borderRadius: 16,
              padding: '1rem 1.35rem',
              boxShadow: '0 4px 20px rgba(31, 70, 120, 0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1.5rem'
            }}
          >
            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {[
                { id: 'ALL', label: 'All Assigned', count: assignedCounts.all },
                { id: 'IN_PROGRESS', label: 'In Progress', count: assignedCounts.inProgress },
                { id: 'NOT_STARTED', label: 'Not Started', count: assignedCounts.notStarted },
                { id: 'COMPLETED', label: 'Completed', count: assignedCounts.completed },
                { id: 'OVERDUE', label: 'Overdue', count: assignedCounts.overdue }
              ].map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      border: active ? '1px solid #0F6CBD' : '1px solid transparent',
                      background: active ? '#0F6CBD' : 'rgba(241, 245, 249, 0.8)',
                      color: active ? '#FFFFFF' : '#334155',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.16s ease'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.1rem 0.42rem',
                        borderRadius: '10px',
                        background: active ? 'rgba(255, 255, 255, 0.25)' : '#E2E8F0',
                        color: active ? '#FFFFFF' : '#475569',
                        fontWeight: 750
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search
                size={15}
                color="#94A3B8"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />
              <input
                type="text"
                value={assignedSearch}
                onChange={(e) => setAssignedSearch(e.target.value)}
                placeholder="Search assigned courses…"
                aria-label="Search assigned courses"
                style={{
                  padding: '0.52rem 0.85rem 0.52rem 2.25rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.84rem',
                  width: '100%',
                  boxSizing: 'border-box',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none'
                }}
               enterKeyHint="search" />
            </div>
          </section>

          {/* Assigned Content Area */}
          {assignedLoading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
                gap: '1.25rem'
              }}
            >
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`c-skel-${idx}`}
                  className="skeleton-shimmer"
                  style={{ height: '340px', borderRadius: '14px', border: '1px solid #E2E8F0' }}
                />
              ))}
            </div>
          ) : assignedError ? (
            <div
              role="alert"
              style={{
                padding: '2.5rem 2rem',
                background: '#FFFFFF',
                border: '1px solid #FECACA',
                borderRadius: 16,
                textAlign: 'center',
                boxShadow: '0 4px 18px rgba(220, 38, 38, 0.05)'
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem', color: '#0F172A', fontSize: '1.1rem', fontWeight: 700 }}>
                Failed to Load Assigned Courses
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
                {assignedError}
              </p>
              <button
                type="button"
                onClick={() => loadAssignedCourses(true)}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '10px',
                  background: '#0F6CBD',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : filteredAssignedCourses.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: '3.5rem 2rem',
                textAlign: 'center',
                boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)'
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: '#F0F9FF',
                  color: '#0284C7',
                  border: '1px solid #BAE6FD',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}
              >
                <BookOpen size={26} />
              </div>
              <h3 style={{ margin: '0 0 0.4rem', color: '#0F172A', fontSize: '1.15rem', fontWeight: 750 }}>
                No Courses Assigned
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0, maxWidth: 440, marginInline: 'auto' }}>
                {assignedSearch
                  ? 'No assigned courses match your search criteria. Try adjusting your query or filter.'
                  : 'You do not have any courses assigned to your account right now. Check back later or browse available curricula.'}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
                gap: '1.25rem'
              }}
            >
              {filteredAssignedCourses.map((course) => {
                const deadline = getDeadlineInfo(course.dueDate);
                const isCompleted = course.status === 'COMPLETED';
                const isOverdue = course.status === 'OVERDUE';
                const isInProgress = course.status === 'IN_PROGRESS';

                return (
                  <article
                    key={course._key}
                    onClick={() => handleOpenCourse(course)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 16,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
                    }}
                    onMouseEnter={(e) => {
              if (typeof window !== 'undefined' && !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.09)';
                      e.currentTarget.style.borderColor = '#93C5FD';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(15, 23, 42, 0.04)';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    {/* Thumbnail banner */}
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '155px',
                        background: '#0B1F38',
                        overflow: 'hidden'
                      }}
                    >
                      <CourseThumbnailImage
                        course={course}
                        alt={course.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />

                      {/* Training Type Badge */}
                      <span
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.22rem 0.55rem',
                          borderRadius: '6px',
                          letterSpacing: '0.5px',
                          background:
                            course.trainingType === 'MANDATORY'
                              ? 'rgba(220, 38, 38, 0.92)'
                              : 'rgba(15, 108, 189, 0.92)',
                          color: '#FFFFFF',
                          backdropFilter: 'blur(4px)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                        }}
                      >
                        {course.trainingType}
                      </span>

                      {/* Status pill badge */}
                      <span
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          fontSize: '0.7rem',
                          fontWeight: 750,
                          padding: '0.22rem 0.55rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: isCompleted
                            ? '#DCFCE7'
                            : isOverdue
                            ? '#FEE2E2'
                            : isInProgress
                            ? '#E0F2FE'
                            : '#F1F5F9',
                          color: isCompleted
                            ? '#166534'
                            : isOverdue
                            ? '#991B1B'
                            : isInProgress
                            ? '#0369A1'
                            : '#475569',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={12} />
                        ) : isOverdue ? (
                          <AlertTriangle size={12} />
                        ) : null}
                        {course.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div
                      style={{
                        padding: '1.15rem 1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#0284C7',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '0.3rem'
                        }}
                      >
                        {course.department}
                      </div>

                      <h3
                        style={{
                          margin: '0 0 0.5rem',
                          fontSize: '1rem',
                          fontWeight: 750,
                          color: '#0F172A',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {course.title}
                      </h3>

                      {/* Meta badges: duration, lessons */}
                      <div
                        style={{
                          display: 'flex',
                          gap: '0.85rem',
                          fontSize: '0.76rem',
                          color: '#64748B',
                          marginBottom: '1rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        {course.duration && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={13} /> {course.duration}
                          </span>
                        )}
                        {(course.lessonCount > 0 || course.moduleCount > 0) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Layers size={13} /> {course.moduleCount} modules • {course.lessonCount} lessons
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginTop: 'auto', paddingTop: '0.65rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            marginBottom: '0.35rem'
                          }}
                        >
                          <span style={{ color: '#475569' }}>Progress</span>
                          <span
                            style={{
                              color: isCompleted ? '#16A34A' : '#0F6CBD',
                              fontVariantNumeric: 'tabular-nums'
                            }}
                          >
                            {course.progressPercent}%
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '6px',
                            background: '#E2E8F0',
                            borderRadius: '999px',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${course.progressPercent}%`,
                              height: '100%',
                              background: isCompleted ? '#16A34A' : '#0F6CBD',
                              borderRadius: '999px',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      </div>

                      {/* Deadline label & Action */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '0.85rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px solid #F1F5F9'
                        }}
                      >
                        {deadline ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: deadline.color,
                              background: deadline.bg,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Calendar size={12} />
                            {deadline.label}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Self-paced</span>
                        )}

                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#0F6CBD',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {isCompleted ? 'Review' : 'Continue'} <ExternalLink size={13} />
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* Delete Course Confirmation Modal */}
      {courseToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Delete Course</h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Permanent Removal</div>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, margin: '0 0 1rem' }}>
              Are you sure you want to permanently delete{' '}
              <strong>{courseToDelete.title || courseToDelete.courseTitle || 'this course'}</strong> (
              {getCourseId(courseToDelete)})? This action cannot be undone and will delete all associated modules,
              lessons, and quiz questions.
            </p>

            {deleteError && (
              <div
                role="alert"
                style={{
                  padding: '0.75rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={isDeleting || isDeactivating}
                onClick={() => setCourseToDelete(null)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: (isDeleting || isDeactivating) ? 'not-allowed' : 'pointer',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              {deleteError && deleteError.toLowerCase().includes('active') && (
                <button
                  type="button"
                  disabled={isDeleting || isDeactivating}
                  onClick={handleDeactivateCourse}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: (isDeleting || isDeactivating) ? 'not-allowed' : 'pointer',
                    border: '1px solid #0F172A',
                    background: '#0F172A',
                    color: '#FFFFFF',
                  }}
                >
                  {isDeactivating ? 'Deactivating…' : 'Deactivate Course Instead'}
                </button>
              )}
              <button
                type="button"
                disabled={isDeleting || isDeactivating}
                onClick={handleDeleteCourse}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: (isDeleting || isDeactivating) ? 'not-allowed' : 'pointer',
                  border: 'none',
                  background: isDeleting ? '#94a3b8' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                }}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    Deleting…
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

      {/* Course Assignment Modal */}
      {courseForAssignment && (
        <CourseAssignmentModal
          course={courseForAssignment}
          onClose={() => setCourseForAssignment(null)}
          onAssigned={async () => {
            setCourseForAssignment(null);
            await loadCatalogCourses();
          }}
        />
      )}

      {/* Course Builder Modal */}
      {showCourseBuilderModal && (
        <CourseBuilderModal
          key={editingCourseId || 'new-course'}
          courseId={editingCourseId || ''}
          onClose={() => {
            setShowCourseBuilderModal(false);
            setEditingCourseId('');
            loadCatalogCourses();
          }}
          onPublish={() => {
            setShowCourseBuilderModal(false);
            setEditingCourseId('');
            loadCatalogCourses();
          }}
        />
      )}
    </div>
  );
}
