import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Filter,
  Clock,
  Star,
  PlayCircle,
  Eye,
  ArrowUpDown,
  CheckCircle2,
  Award,
  RotateCcw,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  X
} from 'lucide-react';

import { courseService } from '../services/courseService';
import { enrollmentService } from '../services/enrollmentService';
import { useAuth } from '../context/AuthContext';
import GlassCarousel from './GlassCarousel';
import CertificateViewer from './CertificateViewer';
import CourseThumbnailImage from './CourseThumbnailImage';
import { getCourseBanner, handleBannerError } from '../utils/courseBanner';
import { formatCourseDuration } from '../utils/courseDuration';

function formatPublishedDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `Published on ${day}/${month}/${year}`;
  } catch {
    return null;
  }
}

function formatPosition(pos) {
  if (!pos) return 'P0';
  const s = String(pos).trim().toUpperCase();
  if (s.startsWith('L') && s.length === 2 && ['0', '1', '2', '3', '4'].includes(s[1])) {
    return 'P' + s[1];
  }
  return s;
}

function getCourseDurationHours(course) {
  if (course.durationHours != null && !isNaN(Number(course.durationHours))) {
    return Number(course.durationHours);
  }
  const s = String(course.duration || '').toLowerCase();
  if (s.includes('min')) {
    const num = parseFloat(s.replace(/[^\d.]/g, '')) || 0;
    return num / 60;
  }
  if (s.includes('hour') || s.includes('hr') || s.includes('h')) {
    const num = parseFloat(s.replace(/[^\d.]/g, '')) || 0;
    return num;
  }
  return parseFloat(s.replace(/[^\d.]/g, '')) || 0;
}

export default function CourseCatalog({
  onSelectCourse,
  onOpenCourseDetails
}) {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();
  const isHrAdmin = role === 'HR_ADMIN' || role === 'ROLE_HR_ADMIN';
  const isTrainer = role === 'TRAINER' || role === 'ROLE_TRAINER';
  const isManager = role === 'MANAGER' || role === 'ROLE_MANAGER';
  const isEmployee = !isHrAdmin && !isTrainer && !isManager;
  const userDept = (user?.department || '').trim().toLowerCase();

  const [courses, setCourses] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('POPULAR');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);
  const [activeCertificate, setActiveCertificate] = useState(null);

  // Filters
  const [selectedOwningDept, setSelectedOwningDept] = useState('ALL');
  const [selectedTargetDept, setSelectedTargetDept] = useState('ALL');
  const [selectedAssignmentType, setSelectedAssignmentType] = useState('ALL');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDuration, setSelectedDuration] = useState('ALL');
  const [selectedCourseType, setSelectedCourseType] = useState('ALL');
  const [selectedCompletionStatus, setSelectedCompletionStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  // Quick owner assignment modal for HR/Admin
  const [assigningCourse, setAssigningCourse] = useState(null);
  const [assignOwnerDeptId, setAssignOwnerDeptId] = useState('');
  const [assignOwnerLoading, setAssignOwnerLoading] = useState(false);
  const [assignOwnerNotice, setAssignOwnerNotice] = useState('');

  const featuredCourses = useMemo(() => {
    return courses.slice(0, 6);
  }, [courses]);

  /*
   * Load courses and dynamic departments
   */
  useEffect(() => {
    let mounted = true;

    const loadData = async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        setError(null);

        const [coursesData, deptsData] = await Promise.allSettled([
          courseService.getAllCourses(),
          authFetch(`${SHARED_API_BASE_URL}/departments`, {
            headers: {
              ...(localStorage.getItem('fairmacs_token') ? { Authorization: `Bearer ${localStorage.getItem('fairmacs_token')}` } : {})
            }
          }).then(r => r.ok ? r.json() : [])
        ]);

        if (!mounted) return;

        if (coursesData.status === 'fulfilled') {
          setCourses(Array.isArray(coursesData.value) ? coursesData.value : []);
        } else {
          throw new Error('Unable to load courses from the server.');
        }

        if (deptsData.status === 'fulfilled') {
          const raw = deptsData.value;
          const rows = Array.isArray(raw) ? raw : (raw?.departments ?? raw?.content ?? raw?.data ?? []);
          setDepartmentsList(
            rows.map(d => ({
              id: d.id,
              name: d.name || d.departmentName || d.label || String(d),
              shortCode: d.shortCode || ''
            })).filter(d => d.name && !d.name.toLowerCase().includes('uncategorized'))
          );
        }
      } catch (err) {
        console.error('Failed to load catalog data:', err);
        if (mounted) setError('Unable to load courses from the server.');
      } finally {
        if (mounted && showLoader) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Filter + Search + Sort
   */
  const filteredCourses = useMemo(() => {
    return courses
      .filter((course) => {
        // 1. Role scoping for employee:
        if (isEmployee) {
          const isEnrolled = Boolean(course.enrollmentDbId || course.enrollmentStatus || course.enrolled);
          const targetsMyDept = (course.departmentAssignments || []).some(
            da => (da.departmentName || '').toLowerCase() === userDept || (da.shortCode || '').toLowerCase() === userDept
          ) || (course.targetDepartments || []).some(
            td => (td || '').toLowerCase() === userDept
          ) || (course.departments || []).some(
            cd => (cd || '').toLowerCase() === userDept
          );

          if (!targetsMyDept && !isEnrolled) {
            return false;
          }
        }

        // 2. Owning department filter:
        if (selectedOwningDept !== 'ALL') {
          if (selectedOwningDept === 'UNASSIGNED') {
            if (course.departmentId || course.owningDepartmentName) return false;
          } else {
            const courseOwner = (course.owningDepartmentName || course.department || '').toLowerCase();
            if (courseOwner !== selectedOwningDept.toLowerCase()) return false;
          }
        }

        // 3. Target department filter:
        if (selectedTargetDept !== 'ALL') {
          const targetsSelected = (course.departmentAssignments || []).some(
            da => (da.departmentName || '').toLowerCase() === selectedTargetDept.toLowerCase()
          ) || (course.targetDepartments || []).some(
            td => (td || '').toLowerCase() === selectedTargetDept.toLowerCase()
          ) || (course.departments || []).some(
            cd => (cd || '').toLowerCase() === selectedTargetDept.toLowerCase()
          );
          if (!targetsSelected) return false;
        }

        // 4. Assignment classification filter (Mandatory vs Recommended):
        if (selectedAssignmentType !== 'ALL') {
          const hasMandatory = (course.departmentAssignments || []).some(da => da.assignmentType === 'MANDATORY') ||
            (Array.isArray(course.targetDepartments) && course.targetDepartments.length > 0) ||
            course.assignmentType === 'MANDATORY' ||
            course.foundation === true;
          const hasRecommended = (course.departmentAssignments || []).some(da => da.assignmentType === 'RECOMMENDED') ||
            course.assignmentType === 'RECOMMENDED';

          if (selectedAssignmentType === 'MANDATORY' && !hasMandatory) return false;
          if (selectedAssignmentType === 'RECOMMENDED' && !hasRecommended && course.assignmentType !== 'RECOMMENDED') return false;
        }

        // 5. Course position filter:
        if (selectedPosition !== 'ALL') {
          const coursePos = formatPosition(course.position || course.level);
          if (!coursePos.includes(selectedPosition.toUpperCase())) return false;
        }

        // 6. Course status filter (Published vs Draft for admin/trainer):
        if (selectedStatus !== 'ALL') {
          const isDraft = !course.publish && course.status !== 'PUBLISHED';
          if (selectedStatus === 'DRAFT' && !isDraft) return false;
          if (selectedStatus === 'PUBLISHED' && isDraft) return false;
        }

        // 7. Course duration filter:
        if (selectedDuration !== 'ALL') {
          const hours = getCourseDurationHours(course);
          if (selectedDuration === 'SHORT' && !(hours < 1)) return false;
          if (selectedDuration === 'MEDIUM' && !(hours >= 1 && hours <= 3)) return false;
          if (selectedDuration === 'LONG' && !(hours > 3)) return false;
        }

        // 8. Course type filter:
        if (selectedCourseType !== 'ALL') {
          const isFoundation = Boolean(course.foundation);
          if (selectedCourseType === 'FOUNDATION' && !isFoundation) return false;
          if (selectedCourseType === 'STANDARD' && isFoundation) return false;
        }

        // 9. Completion status filter:
        if (selectedCompletionStatus !== 'ALL') {
          const isCompleted = course.enrollmentStatus === 'COMPLETED';
          const isInProgress = course.enrollmentStatus === 'IN_PROGRESS' || (course.progressPercent > 0 && !isCompleted);
          const isNotStarted = (!course.enrollmentDbId && !course.enrollmentStatus) || course.enrollmentStatus === 'NOT_STARTED';
          const isOverdue = course.dueDate && new Date(course.dueDate) < new Date() && !isCompleted;

          if (selectedCompletionStatus === 'COMPLETED' && !isCompleted) return false;
          if (selectedCompletionStatus === 'IN_PROGRESS' && !isInProgress) return false;
          if (selectedCompletionStatus === 'NOT_STARTED' && !isNotStarted) return false;
          if (selectedCompletionStatus === 'OVERDUE' && !isOverdue) return false;
        }

        // 10. Search keyword filter:
        const search = searchTerm.trim().toLowerCase();
        if (search) {
          const title = (course.title || '').toLowerCase();
          const description = (course.description || '').toLowerCase();
          const courseId = String(course.id || course.courseId || '').toLowerCase();
          const dept = (course.owningDepartmentName || course.department || '').toLowerCase();
          if (!title.includes(search) && !description.includes(search) && !courseId.includes(search) && !dept.includes(search)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'RATING') {
          return Number(b.rating || 0) - Number(a.rating || 0);
        }
        if (sortBy === 'DURATION_SHORT' || sortBy === 'DURATION') {
          return getCourseDurationHours(a) - getCourseDurationHours(b);
        }
        if (sortBy === 'DURATION_LONG') {
          return getCourseDurationHours(b) - getCourseDurationHours(a);
        }
        if (sortBy === 'TITLE_AZ') {
          return (a.title || '').localeCompare(b.title || '');
        }
        if (sortBy === 'TITLE_ZA') {
          return (b.title || '').localeCompare(a.title || '');
        }
        if (sortBy === 'NEWEST') {
          const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return timeB - timeA || (Number(b.dbId || b.id || 0) - Number(a.dbId || a.id || 0));
        }
        if (sortBy === 'OLDEST') {
          const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
          return timeA - timeB || (Number(a.dbId || a.id || 0) - Number(b.dbId || b.id || 0));
        }
        return Number(b.enrolledCount || 0) - Number(a.enrolledCount || 0);
      });
  }, [
    courses,
    isEmployee,
    userDept,
    selectedOwningDept,
    selectedTargetDept,
    selectedAssignmentType,
    selectedPosition,
    selectedStatus,
    selectedDuration,
    selectedCourseType,
    selectedCompletionStatus,
    searchTerm,
    sortBy
  ]);

  // Reset page to 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedOwningDept,
    selectedTargetDept,
    selectedAssignmentType,
    selectedPosition,
    selectedStatus,
    selectedDuration,
    selectedCourseType,
    selectedCompletionStatus,
    searchTerm,
    sortBy
  ]);

  const isFilterActive = searchTerm !== '' ||
    selectedOwningDept !== 'ALL' ||
    selectedTargetDept !== 'ALL' ||
    selectedAssignmentType !== 'ALL' ||
    selectedPosition !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedDuration !== 'ALL' ||
    selectedCourseType !== 'ALL' ||
    selectedCompletionStatus !== 'ALL' ||
    sortBy !== 'POPULAR';

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedOwningDept('ALL');
    setSelectedTargetDept('ALL');
    setSelectedAssignmentType('ALL');
    setSelectedPosition('ALL');
    setSelectedStatus('ALL');
    setSelectedDuration('ALL');
    setSelectedCourseType('ALL');
    setSelectedCompletionStatus('ALL');
    setSortBy('POPULAR');
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const displayedCourses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCourses.slice(start, start + PAGE_SIZE);
  }, [filteredCourses, currentPage]);

  const handleViewCertificate = async (course) => {
    try {
      const courseDbId = course.dbId ?? course.id;
      const token = localStorage.getItem('fairmacs_token') || localStorage.getItem('token') || '';
      const res = await authFetch(`${SHARED_API_BASE_URL}/certificates/course/${courseDbId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const cert = await res.json();
        setActiveCertificate(cert);
      } else {
        setActiveCertificate({
          courseTitle: course.title,
          certificateId: `${course.id || 'CERT'}-COMP`,
          issueDate: new Date().toLocaleDateString('en-GB')
        });
      }
    } catch (err) {
      console.error('Error fetching certificate:', err);
      setActiveCertificate({
        courseTitle: course.title,
        certificateId: `${course.id || 'CERT'}-COMP`,
        issueDate: new Date().toLocaleDateString('en-GB')
      });
    }
  };

  const handleReviewCourse = (course) => {
    onSelectCourse(course, { reviewMode: true });
  };

  const handleCourseAction = async (course) => {
    const courseId = course.dbId ?? course.id ?? course.courseId;
    const isEnrolled = Boolean(course.enrollmentDbId || course.enrollmentStatus);

    if (isEnrolled) {
      onSelectCourse(course);
      return;
    }

    if (!courseId || enrollingCourseId === courseId) return;

    try {
      setEnrollingCourseId(courseId);
      const result = await enrollmentService.enrollInCourse(courseId);

      if (!result || result.success === false) {
        throw new Error(result?.error || 'Unable to enroll in this course.');
      }

      const refreshedCourses = await courseService.getAllCourses();
      const nextCourses = Array.isArray(refreshedCourses) ? refreshedCourses : [];
      setCourses(nextCourses);

      window.dispatchEvent(new CustomEvent('lms:enrollment-updated'));

      const refreshedCourse = nextCourses.find(
        (item) => String(item.dbId ?? item.id ?? item.courseId) === String(courseId)
      );

      onSelectCourse(refreshedCourse || course);
    } catch (err) {
      console.error('Enrollment error:', err);
      alert(err.message || 'Unable to enroll in this course.');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleAssignOwnerSubmit = async (e) => {
    e.preventDefault();
    if (!assigningCourse || !assignOwnerDeptId) return;
    try {
      setAssignOwnerLoading(true);
      const courseId = assigningCourse.dbId ?? assigningCourse.id ?? assigningCourse.courseId;
      const res = await courseService.assignCourseOwnership(courseId, assignOwnerDeptId);
      if (res && res.success !== false) {
        setAssignOwnerNotice('Owning department successfully assigned!');
        const targetDept = departmentsList.find(d => String(d.id) === String(assignOwnerDeptId));
        setCourses(prev => prev.map(c => {
          if (String(c.dbId ?? c.id ?? c.courseId) === String(courseId)) {
            return {
              ...c,
              departmentId: Number(assignOwnerDeptId),
              owningDepartmentName: targetDept ? targetDept.name : c.owningDepartmentName,
              department: targetDept ? targetDept.name : c.department
            };
          }
          return c;
        }));
        setTimeout(() => {
          setAssigningCourse(null);
          setAssignOwnerDeptId('');
          setAssignOwnerNotice('');
        }, 1200);
      } else {
        alert(res?.error || 'Failed to assign course owner.');
      }
    } catch (err) {
      console.error('Assign owner error:', err);
      alert(err.message || 'Failed to assign course owner.');
    } finally {
      setAssignOwnerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
            Explore Course Catalog
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Browse international logistics SOPs, freight forwarding certifications, customs clearance manuals, and soft skills tracks.
          </p>
        </div>
        <div style={{ background: 'white', padding: '3rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
          Loading courses and department ownership mappings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in" style={{ background: 'white', borderRadius: '12px', border: '1px solid #fecaca', padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: '#b91c1c', fontSize: '1.1rem', fontWeight: 800 }}>Unable to Load Courses</h2>
        <p style={{ color: '#64748b', marginTop: '0.5rem' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--deep-navy)', letterSpacing: '-0.3px' }}>
          Explore Course Catalog
        </h1>
      </div>

      {/* Featured Courses Carousel */}
      {featuredCourses.length > 0 && !searchTerm && selectedOwningDept === 'ALL' && selectedTargetDept === 'ALL' && (
        <GlassCarousel
          items={featuredCourses}
          title="Featured Learning Programs"
          subtitle="Top certified freight forwarding, customs clearance, and global compliance tracks"
          onSelectCourse={onSelectCourse}
          onOpenCourseDetails={onOpenCourseDetails}
        />
      )}

      {/* Comprehensive Filter & Search Bar */}
      <div
        className="glass-panel"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          padding: '1.25rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 8px 30px rgba(31, 70, 120, 0.06)'
        }}
      >
        {/* Top search and sort */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search style={{ position: 'absolute', left: 14, top: 12, width: 17, height: 17, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search courses by name, ID, owning department, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input"
              style={{
                width: '100%',
                paddingLeft: '2.5rem',
                paddingRight: '1rem',
                paddingTop: '0.65rem',
                paddingBottom: '0.65rem',
                borderRadius: '10px',
                fontSize: '0.9rem'
              }}
             enterKeyHint="search" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <ArrowUpDown style={{ width: 16, height: 16, color: '#64748b' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-input"
              style={{
                padding: '0.65rem 0.95rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: '#102A43',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              <option value="POPULAR">Most Popular (Enrolled)</option>
              <option value="RATING">Highest Rated</option>
              <option value="NEWEST">Newest Published</option>
              <option value="OLDEST">Oldest Published</option>
              <option value="TITLE_AZ">Title (A–Z)</option>
              <option value="TITLE_ZA">Title (Z–A)</option>
              <option value="DURATION_SHORT">Duration (Shortest first)</option>
              <option value="DURATION_LONG">Duration (Longest first)</option>
            </select>

            {isFilterActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.6rem 0.95rem',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: '1px solid #fca5a5',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  cursor: 'pointer'
                }}
              >
                <X style={{ width: 14, height: 14 }} />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Multi-dimension Dropdown Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', paddingTop: '4px' }}>
          {/* Owning Department */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Owning Department
            </label>
            <select
              value={selectedOwningDept}
              onChange={(e) => setSelectedOwningDept(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', color: '#0f172a' }}
            >
              <option value="ALL">All Owning Depts</option>
              {isHrAdmin && <option value="UNASSIGNED">⚠️ Unassigned Ownership</option>}
              {departmentsList.map(d => (
                <option key={d.id || d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Target Department */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Target Department
            </label>
            <select
              value={selectedTargetDept}
              onChange={(e) => setSelectedTargetDept(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', color: '#0f172a' }}
            >
              <option value="ALL">All Target Depts</option>
              {departmentsList.map(d => (
                <option key={d.id || d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Assignment Classification */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Assignment Type
            </label>
            <select
              value={selectedAssignmentType}
              onChange={(e) => setSelectedAssignmentType(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', color: '#0f172a' }}
            >
              <option value="ALL">All Classifications</option>
              <option value="MANDATORY">Mandatory</option>
              <option value="RECOMMENDED">Recommended</option>
            </select>
          </div>

          {/* Position */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Position
            </label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', color: '#0f172a' }}
            >
              <option value="ALL">All Positions</option>
              <option value="P0">P0 - Trainee</option>
              <option value="P1">P1 - Assistant</option>
              <option value="P2">P2 - Executive</option>
              <option value="P3">P3 - Manager</option>
              <option value="P4">P4 - Vice President</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Duration
            </label>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', color: '#0f172a' }}
            >
              <option value="ALL">All Durations</option>
              <option value="SHORT">Short (&lt; 1 hr)</option>
              <option value="MEDIUM">Medium (1–3 hrs)</option>
              <option value="LONG">Long (3+ hrs)</option>
            </select>
          </div>

          {/* Course Type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              Course Type
            </label>
            <select
              value={selectedCourseType}
              onChange={(e) => setSelectedCourseType(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', color: '#0f172a' }}
            >
              <option value="ALL">All Course Types</option>
              <option value="FOUNDATION">Foundation Track</option>
              <option value="STANDARD">Standard Course</option>
            </select>
          </div>

          {/* Completion Status */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
              My Status
            </label>
            <select
              value={selectedCompletionStatus}
              onChange={(e) => setSelectedCompletionStatus(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', color: '#0f172a' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          {/* Status (Admin / Trainer) */}
          {!isEmployee && (
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                Publish Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff', color: '#0f172a' }}
              >
                <option value="ALL">All (Pub &amp; Draft)</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
          Showing {filteredCourses.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filteredCourses.length)} of {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
        </div>
        {totalPages > 1 && (
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Page {currentPage} of {totalPages}
          </div>
        )}
      </div>

      {/* Course Cards Grid */}
      {displayedCourses.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '1.5rem' }}>
          {displayedCourses.map((course) => {
            const courseId = course.id || course.courseId;
            const moduleCount = course.modules?.length || course.moduleCount || 0;
            const isCompleted = course.enrollmentStatus === 'COMPLETED';
            const publishedLabel = formatPublishedDate(course.publishedAt);
            const isDraft = !course.publish && course.status !== 'PUBLISHED';
            const hasExplicitOwner = Boolean(course.departmentId || course.owningDepartmentName);
            const owningDeptDisplay = course.owningDepartmentName || course.department;

            // Target departments list
            const targetDeptItems = Array.isArray(course.departmentAssignments) && course.departmentAssignments.length > 0
              ? course.departmentAssignments
              : (Array.isArray(course.targetDepartments) ? course.targetDepartments.map(td => ({ departmentName: td, assignmentType: 'MANDATORY' })) : []);

            return (
              <div key={courseId} className="course-card" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Course Banner */}
                <div
                  style={{ position: 'relative', height: '170px', overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() => onOpenCourseDetails?.(course)}
                >
                  <CourseThumbnailImage
                    course={course}
                    alt={course.title}
                    className="course-banner"
                    style={{ width: '100%', height: '170px' }}
                  />

                  {/* Course ID */}
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
                      borderRadius: '4px',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {courseId}
                  </span>

                  {/* Top-Right Badge: Completed or Status */}
                  {isCompleted ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.6rem',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <CheckCircle2 style={{ width: 12, height: 12 }} />
                      Completed
                    </span>
                  ) : !isEmployee ? (
                    <span
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        background: isDraft ? 'rgba(245, 158, 11, 0.95)' : 'rgba(2, 132, 199, 0.95)',
                        color: 'white',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {isDraft ? 'Draft' : 'Published'}
                    </span>
                  ) : null}
                </div>

                <div className="course-card-content" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Owning Department Badge & Unassigned Indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: 6 }}>
                    {hasExplicitOwner ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '0.73rem',
                          fontWeight: 750,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0'
                        }}
                      >
                        <Building2 style={{ width: 12, height: 12 }} />
                        Owner: {owningDeptDisplay}
                      </span>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.72rem',
                            fontWeight: 750,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a'
                          }}
                        >
                          <AlertTriangle style={{ width: 12, height: 12 }} />
                          Unassigned Ownership
                        </span>
                        {isHrAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningCourse(course);
                              setAssignOwnerDeptId('');
                              setAssignOwnerNotice('');
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#0284c7',
                              fontSize: '0.72rem',
                              fontWeight: 750,
                              textDecoration: 'underline',
                              cursor: 'pointer'
                            }}
                          >
                            Assign Owner
                          </button>
                        )}
                      </div>
                    )}

                    {publishedLabel && (
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar style={{ width: 11, height: 11 }} />
                        {publishedLabel}
                      </span>
                    )}
                  </div>

                  {/* Target Department Badges */}
                  {targetDeptItems.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: '0.6rem' }}>
                      {targetDeptItems.slice(0, 3).map((item, i) => {
                        const isMandatory = String(item.assignmentType || '').toUpperCase() === 'MANDATORY';
                        return (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 750,
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: isMandatory ? '#fef2f2' : '#f0fdf4',
                              color: isMandatory ? '#b91c1c' : '#15803d',
                              border: `1px solid ${isMandatory ? '#fecaca' : '#bbf7d0'}`
                            }}
                          >
                            {item.departmentName} ({isMandatory ? 'Mandatory' : 'Recommended'})
                          </span>
                        );
                      })}
                      {targetDeptItems.length > 3 && (
                        <span style={{ fontSize: '0.68rem', color: '#64748b', alignSelf: 'center' }}>
                          +{targetDeptItems.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <h3
                    className="course-title"
                    style={{ cursor: 'pointer', marginBottom: '0.35rem' }}
                    onClick={() => onOpenCourseDetails(course)}
                  >
                    {course.title}
                  </h3>

                  {/* Description */}
                  <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.45, marginBottom: '1rem', flex: 1 }}>
                    {course.description || 'Fairmacs learning course.'}
                  </p>

                  {/* Course Meta */}
                  <div className="course-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock style={{ width: 14, height: 14 }} />
                      {formatCourseDuration(course.duration, course.durationHours)}
                    </div>

                    <div style={{ background: '#f1f5f9', color: '#334155', fontWeight: 750, padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem' }}>
                      {formatPosition(course.position || course.level)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#d97706', fontWeight: 700 }}>
                      <Star style={{ width: 14, height: 14, fill: '#d97706' }} />
                      {course.rating || '—'}
                    </div>

                    <div style={{ marginLeft: 'auto', fontWeight: 600, color: '#0f172a' }}>
                      {moduleCount} {moduleCount === 1 ? 'Module' : 'Modules'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    {isCompleted ? (
                      <>
                        <button
                          className="btn-secondary"
                          style={{ flex: 1, justifyContent: 'center', padding: '0.5rem 0.75rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => handleReviewCourse(course)}
                        >
                          <RotateCcw style={{ width: 14, height: 14 }} />
                          Review Course
                        </button>
                        <button
                          className="btn-primary"
                          style={{ flex: 1, justifyContent: 'center', padding: '0.5rem 0.75rem', fontSize: '0.78rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => handleViewCertificate(course)}
                        >
                          <Award style={{ width: 14, height: 14 }} />
                          View Certificate
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn-primary"
                          style={{
                            flex: 1,
                            justifyContent: 'center',
                            opacity: enrollingCourseId === (course.dbId ?? course.id ?? course.courseId) ? 0.7 : 1,
                            cursor: enrollingCourseId === (course.dbId ?? course.id ?? course.courseId) ? 'wait' : 'pointer'
                          }}
                          disabled={enrollingCourseId === (course.dbId ?? course.id ?? course.courseId)}
                          onClick={() => handleCourseAction(course)}
                        >
                          <PlayCircle style={{ width: 16, height: 16 }} />
                          {enrollingCourseId === (course.dbId ?? course.id ?? course.courseId)
                            ? 'Enrolling...'
                            : (course.enrollmentDbId || course.enrollmentStatus)
                              ? 'Launch Course'
                              : 'Enroll Course'}
                        </button>

                        <button
                          className="btn-secondary"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem' }}
                          onClick={() => onOpenCourseDetails(course)}
                        >
                          <Eye style={{ width: 16, height: 16 }} />
                          Overview
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', opacity: 0.5 }}>📚</div>
          <h3 style={{ color: '#334155', fontWeight: 800, marginTop: '0.75rem' }}>No courses match your criteria</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Try adjusting your search keywords, owning department, or assignment classification filters.
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            marginTop: '1.25rem',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              opacity: currentPage === 1 ? 0.5 : 1,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              style={{
                padding: '0.45rem 0.8rem',
                fontSize: '0.82rem',
                fontWeight: 750,
                borderRadius: '8px',
                border: page === currentPage ? '1px solid #0284c7' : '1px solid #cbd5e1',
                background: page === currentPage ? '#0284c7' : '#fff',
                color: page === currentPage ? '#fff' : '#334155',
                cursor: 'pointer',
                boxShadow: page === currentPage ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none'
              }}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            className="btn-secondary"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              opacity: currentPage === totalPages ? 0.5 : 1,
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Quick Assign Owner Modal for HR/Admin */}
      {assigningCourse && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
        >
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 style={{ width: 20, height: 20, color: '#0284c7' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Assign Owning Department</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssigningCourse(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '0.86rem', color: '#475569', lineHeight: 1.5 }}>
              Assign course ownership for <strong>{assigningCourse.title}</strong> ({assigningCourse.id || assigningCourse.courseId}).
              This explicitly updates course ownership while preserving all modules, quizzes, enrollments, and certificates.
            </p>

            {assignOwnerNotice && (
              <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#15803d', fontSize: '0.85rem', fontWeight: 700, marginBottom: 14 }}>
                {assignOwnerNotice}
              </div>
            )}

            <form onSubmit={handleAssignOwnerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                  Select Owning Department *
                </label>
                <select
                  value={assignOwnerDeptId}
                  onChange={(e) => setAssignOwnerDeptId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                >
                  <option value="">-- Choose Department --</option>
                  {departmentsList.map(dept => (
                    <option key={dept.id || dept.name} value={dept.id || dept.name}>
                      {dept.name} {dept.shortCode ? `(${dept.shortCode})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setAssigningCourse(null)}
                  style={{ padding: '0.55rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!assignOwnerDeptId || assignOwnerLoading}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0284c7',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#fff',
                    cursor: (!assignOwnerDeptId || assignOwnerLoading) ? 'not-allowed' : 'pointer',
                    opacity: (!assignOwnerDeptId || assignOwnerLoading) ? 0.7 : 1
                  }}
                >
                  {assignOwnerLoading ? 'Saving...' : 'Save Ownership'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeCertificate && (
        <CertificateViewer
          certificate={activeCertificate}
          onClose={() => setActiveCertificate(null)}
        />
      )}
    </div>
  );
}
