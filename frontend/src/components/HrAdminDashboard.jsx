import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Award,
  ShieldCheck,
  Download,
  UserCheck,
  BarChart2,
  X,
  Plus,
  RefreshCw,
  Clock,
  ChevronRight,
  FolderGit2,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileCheck,
  Bell,
  Settings,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

import CourseBuilderModal, { preloadCourseBuilderReferenceData } from './CourseBuilderModal';
import AssignedLearningCarousel from './AssignedLearningCarousel';
import UpcomingTrainingWidget from './dashboard/UpcomingTrainingWidget';
import { useAuth } from '../context/AuthContext';
import { useEnrollmentStore } from '../stores/enrollmentStore';
import { courseService } from '../services/courseService';
import { formatCourseDuration } from '../utils/courseDuration';
import { subscribeEnrollmentSync } from '../utils/enrollmentSync';

const API_BASE_URL = SHARED_API_BASE_URL;

const EMPTY_METRICS = {
  totalEmployees: 0,
  activeEmployees: 0,
  activeLearners: 0,
  overallCompletionRate: 0,
  avgTrainingHours: 0,
  certificatesIssued: 0,
  mandatoryComplianceRate: 0,
  departmentStats: []
};

function getToken() {
  return localStorage.getItem('fairmacs_token') || localStorage.getItem('fairmacs_lms_token');
}

function normalizeDepartmentStats(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    const total = Number(item.total ?? item.totalEmployees ?? item.employeeCount ?? 0);
    const completed = Number(item.completed ?? item.completedEmployees ?? 0);
    const rate = Number(item.rate ?? item.completionRate ?? 0);
    const assignedCoursesCount = Number(item.assignedCoursesCount ?? item.assignedCount ?? 0);
    const hasAssignedTraining = Boolean(
      item.hasAssignedTraining !== undefined
        ? item.hasAssignedTraining
        : (assignedCoursesCount > 0 || completed > 0 || rate > 0)
    );
    return {
      ...item,
      department: item.department ?? item.departmentName ?? `Department ${index + 1}`,
      total,
      completed,
      rate: Math.max(0, Math.min(100, Number.isFinite(rate) ? rate : 0)),
      assignedCoursesCount,
      hasAssignedTraining
    };
  });
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) =>
      row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
    )
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatOperationalDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default function HrAdminDashboard({ onOpenVerifiedCertificate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchRecentCertificates, recentCertificates } = useEnrollmentStore();

  const [selectedDeptForDrilldown, setSelectedDeptForDrilldown] = useState(null);
  const [showCourseBuilderModal, setShowCourseBuilderModal] = useState(false);
  const [assignedCourses, setAssignedCourses] = useState([]);

  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState('');
  const [deptSortBy, setDeptSortBy] = useState('highest'); // 'highest' | 'lowest' | 'name'

  const loadHrMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError('');
    try {
      const token = getToken();
      const response = await authFetch(`${API_BASE_URL}/hr/dashboard/metrics`, {
        headers: token
          ? { Authorization: `Bearer ${token}`, Accept: 'application/json' }
          : { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Could not load HR dashboard metrics (${response.status}).`);
      }

      const data = await response.json();
      setMetrics({
        totalEmployees: Number(data.totalEmployees ?? 0),
        activeEmployees: Number(data.activeEmployees ?? 0),
        activeLearners: Number(data.activeLearners ?? 0),
        overallCompletionRate: Number(data.overallCompletionRate ?? 0),
        avgTrainingHours: Number(data.avgTrainingHours ?? 0),
        certificatesIssued: Number(data.certificatesIssued ?? 0),
        mandatoryComplianceRate: Number(data.mandatoryComplianceRate ?? 0),
        departmentStats: normalizeDepartmentStats(data.departmentStats),
      });
    } catch (error) {
      setMetricsError(error.message || 'Unable to load live HR metrics.');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const loadAssignedCourses = useCallback(async () => {
    try {
      const data = await courseService.getLearningDashboard();
      if (data && Array.isArray(data.enrolled)) {
        const seen = new Set();
        const list = [];
        for (const raw of data.enrolled) {
          const isRevoked =
            ['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes(raw.enrollmentStatus) ||
            ['REVOKED', 'CANCELLED', 'WITHDRAWN', 'INACTIVE'].includes(raw.status);
          if (isRevoked) continue;
          const key = String(raw.dbId || raw.id || raw.courseId);
          if (seen.has(key)) continue;
          seen.add(key);

          const modulesList = Array.isArray(raw?.modules) ? raw.modules : [];
          const calculatedModuleCount = modulesList.length;
          const calculatedLessonCount = modulesList.reduce(
            (acc, m) => acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
            0
          );
          const moduleCount =
            typeof raw?.moduleCount === 'number'
              ? raw.moduleCount
              : calculatedModuleCount > 0
              ? calculatedModuleCount
              : (raw?.moduleCount != null ? Number(raw.moduleCount) : 0);
          const lessonCount =
            typeof raw?.lessonCount === 'number'
              ? raw.lessonCount
              : calculatedLessonCount > 0
              ? calculatedLessonCount
              : (raw?.lessonCount != null ? Number(raw.lessonCount) : 0);

          const bannerUrl = raw?.banner || raw?.thumbnailUrl || raw?.thumbnail || '';

          list.push({
            ...raw,
            _key: key,
            title: raw.title || raw.courseTitle || 'Untitled Course',
            id: raw.id || raw.courseId || raw.courseCode || '',
            progressPercent: Number(raw.progressPercent ?? raw.progress ?? 0),
            status: String(raw.enrollmentStatus || raw.status || '').toUpperCase(),
            duration: formatCourseDuration(raw.duration, raw.durationHours),
            banner: bannerUrl,
            thumbnailUrl: bannerUrl,
            thumbnail: bannerUrl,
            moduleCount,
            lessonCount,
            department:
              raw.owningDepartmentName ||
              raw.department ||
              (Array.isArray(raw.departments) && raw.departments[0]) ||
              'Fairmacs Core',
            trainingType: String(
              raw.trainingType || raw.enrollmentType || raw.assignmentType || 'MANDATORY'
            ).toUpperCase()
          });
        }
        setAssignedCourses(list);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const handleOpenCourse = useCallback((course) => {
    const code = course.id || course.courseId;
    if (code) {
      navigate(`/courses/${encodeURIComponent(code)}/overview`, {
        state: { courseData: course, fromCarousel: true }
      });
    }
  }, [navigate]);

  useEffect(() => {
    preloadCourseBuilderReferenceData();
    loadHrMetrics();
    loadAssignedCourses();
    fetchRecentCertificates(6);

    const handleSync = () => {
      loadAssignedCourses();
    };
    window.addEventListener('lms:enrollment-updated', handleSync);
    const unsubscribe = subscribeEnrollmentSync(handleSync);

    return () => {
      window.removeEventListener('lms:enrollment-updated', handleSync);
      unsubscribe();
    };
  }, [loadHrMetrics, loadAssignedCourses, fetchRecentCertificates]);

  // Escape key dismissal and body scroll lock for Department Drilldown modal
  useEffect(() => {
    if (!selectedDeptForDrilldown) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedDeptForDrilldown(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedDeptForDrilldown]);

  const exportMetrics = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Report Generated', new Date().toISOString()],
      ['Organization', 'Fairmacs Shipping & Logistics'],
      ...metrics.departmentStats.map((dept) => [
        `Dept - ${dept.department} Completion Rate (%)`,
        `${dept.rate}% (${dept.completed}/${dept.total})`
      ]),
      ['Total Employees', metrics.totalEmployees],
      ['Active Employees', metrics.activeEmployees],
      ['Active Learners', metrics.activeLearners],
      ['Overall Completion Rate (%)', `${metrics.overallCompletionRate}%`],
      ['Estimated Curriculum Hours', `${metrics.avgTrainingHours} hrs`],
      ['Certificates Issued', metrics.certificatesIssued],
      ['Mandatory Compliance Rate (%)', `${metrics.mandatoryComplianceRate}%`]
    ];
    downloadCsv('fairmacs-hr-dashboard-report.csv', rows);
  };

  const isComplianceMet = metrics.mandatoryComplianceRate >= 90;

  // Accurately labeled metric cards
  const statCards = [
    {
      label: 'Total Employees',
      value: metrics.totalEmployees,
      subtext: `${metrics.activeEmployees} active in directory`,
      icon: Users,
      bg: '#F0F9FF',
      border: '#BAE6FD',
      color: '#0284C7',
    },
    {
      label: 'Active Learners',
      value: metrics.activeLearners,
      subtext: 'Currently in progress',
      icon: UserCheck,
      bg: '#EFF6FF',
      border: '#BFDBFE',
      color: '#0F6CBD',
    },
    {
      label: 'Completion Rate',
      value: `${metrics.overallCompletionRate}%`,
      subtext: 'Across all active enrollments',
      icon: BarChart2,
      bg: '#F0FDF4',
      border: '#BBF7D0',
      color: '#16A34A',
      showProgress: true,
      progressPercent: metrics.overallCompletionRate,
    },
    {
      label: 'Avg Course Duration',
      value: `${metrics.avgTrainingHours} hrs`,
      subtext: 'Estimated duration per enrollment',
      icon: Clock,
      bg: '#FFFBEB',
      border: '#FDE68A',
      color: '#D97706',
    },
    {
      label: 'Certificates Awarded',
      value: metrics.certificatesIssued,
      subtext: 'Verified credentials issued',
      icon: Award,
      bg: '#F0FDF4',
      border: '#BBF7D0',
      color: '#16A34A',
    },
    {
      label: 'Mandatory Compliance',
      value: `${metrics.mandatoryComplianceRate}%`,
      subtext: isComplianceMet ? 'Target achieved (≥90%)' : 'Action recommended (<90%)',
      icon: ShieldCheck,
      bg: isComplianceMet ? '#F0FDF4' : '#FEF2F2',
      border: isComplianceMet ? '#BBF7D0' : '#FECACA',
      color: isComplianceMet ? '#16A34A' : '#DC2626',
      statusBadge: isComplianceMet ? 'Target Met' : 'Below 90% Target',
      isPositiveStatus: isComplianceMet,
    },
  ];

  const sortedDepartments = useMemo(() => {
    const list = [...metrics.departmentStats];
    if (deptSortBy === 'highest') {
      return list.sort((a, b) => b.rate - a.rate);
    }
    if (deptSortBy === 'lowest') {
      return list.sort((a, b) => a.rate - b.rate);
    }
    if (deptSortBy === 'name') {
      return list.sort((a, b) => a.department.localeCompare(b.department));
    }
    return list;
  }, [metrics.departmentStats, deptSortBy]);

  const openRecentAsVerified = (cert) => {
    if (!cert || !onOpenVerifiedCertificate) return;
    const certPayload = {
      id: cert.certificateId || cert.id,
      certificateId: cert.certificateId || cert.id,
      courseTitle: cert.courseTitle || cert.courseName || 'Completed Course',
      employeeName: cert.userName || cert.employeeName || 'Fairmacs Employee',
      department: cert.department || 'Operations',
      issueDate: cert.issuedAt || cert.issueDate || new Date().toISOString(),
      score: cert.score || 100,
      passingGrade: cert.passingGrade || 80,
    };
    onOpenVerifiedCertificate(certPayload, {
      authentic: true,
      certificate: certPayload,
      message: 'Certificate authenticity verified via Fairmacs Learning Academy Registry.',
    });
  };

  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : 'Admin';
  const greeting = getTimeGreeting();
  const operationalDate = formatOperationalDate();

  // Categorized HR Launchpad Groups
  const launchpadGroups = [
    {
      category: 'Learning & Authoring',
      items: [
        {
          label: 'Create Course',
          desc: 'Author modules & quizzes',
          icon: Plus,
          action: () => setShowCourseBuilderModal(true),
          color: '#0F6CBD',
          bg: '#F0F9FF',
          border: '#BAE6FD',
          isPrimary: true,
        },
        {
          label: 'Courses & Catalog',
          desc: 'Catalog & assignments',
          icon: BookOpen,
          action: () => navigate('/hr/courses'),
          color: '#0284C7',
          bg: '#F0F9FF',
          border: '#BAE6FD',
        },
        {
          label: 'Course Drafts',
          desc: 'Unpublished drafts',
          icon: FolderGit2,
          action: () => navigate('/hr/drafts'),
          color: '#475569',
          bg: '#F8FAFC',
          border: '#E2E8F0',
        },
      ]
    },
    {
      category: 'Workforce & Organization',
      items: [
        {
          label: 'Manage Staff',
          desc: 'Directory & roles',
          icon: Users,
          action: () => navigate('/hr/employees'),
          color: '#16A34A',
          bg: '#F0FDF4',
          border: '#BBF7D0',
        },
        {
          label: 'Departments',
          desc: 'Divisions & rosters',
          icon: Building2,
          action: () => navigate('/hr/departments'),
          color: '#4F46E5',
          bg: '#EEF2FF',
          border: '#C7D2FE',
        },
      ]
    },
    {
      category: 'Compliance & Governance',
      items: [
        {
          label: 'Issued Certificates',
          desc: 'Credential registry',
          icon: Award,
          action: () => navigate('/hr/certificates'),
          color: '#D97706',
          bg: '#FFFBEB',
          border: '#FDE68A',
        },
        {
          label: 'Company Policies',
          desc: 'SOPs & acknowledgements',
          icon: ShieldCheck,
          action: () => navigate('/hr/policies'),
          color: '#059669',
          bg: '#ECFDF5',
          border: '#A7F3D0',
        },
        {
          label: 'Announcements',
          desc: 'Broadcast notifications',
          icon: Bell,
          action: () => navigate('/hr/announcements'),
          color: '#0284C7',
          bg: '#F0F9FF',
          border: '#BAE6FD',
        },
      ]
    }
  ];

  return (
    <div className="hr-ops-dashboard animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0, color: '#0F172A' }}>
      {/* =========================================================================
          A. WELCOME BAR & TOP-LEVEL ACTIONS
         ========================================================================= */}
      <header className="hr-ops-welcome-bar">
        {/* Subtle Logistics Route-Line SVG Motif */}
        <svg
          className="hr-ops-route-motif"
          viewBox="0 0 420 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 96 C 95 96, 115 34, 198 34 C 275 34, 295 78, 396 24"
            stroke="#0284C7"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeOpacity="0.35"
          />
          <path
            d="M40 108 C 135 108, 165 58, 255 58 C 325 58, 350 86, 412 52"
            stroke="#0F6CBD"
            strokeWidth="1"
            strokeOpacity="0.2"
          />
          <circle cx="198" cy="34" r="3.5" fill="#0284C7" fillOpacity="0.45" />
          <circle cx="198" cy="34" r="7" stroke="#0284C7" strokeOpacity="0.22" />
          <circle cx="396" cy="24" r="3.5" fill="#0F6CBD" fillOpacity="0.5" />
          <circle cx="255" cy="58" r="2.5" fill="#0F6CBD" fillOpacity="0.35" />
        </svg>

        <div className="hr-ops-welcome-main">
          <div className="hr-ops-eyebrow-row">
            <span className="hr-ops-eyebrow-badge">
              <span className="hr-ops-eyebrow-dot" aria-hidden="true" />
              Fairmacs Learning Academy
            </span>
            <span className="hr-ops-eyebrow-meta">
              {operationalDate}
              {user?.department ? ` • ${user.department}` : ''}
            </span>
          </div>

          <h1 className="hr-ops-welcome-title">
            {greeting}, {firstName}
          </h1>

          <p className="hr-ops-welcome-sub">
            Enterprise workforce training, regulatory compliance monitoring, and central learning operations.
          </p>
        </div>

        <div className="hr-ops-welcome-actions">
          <button
            type="button"
            onClick={exportMetrics}
            className="hr-ops-btn"
            style={{
              background: '#FFFFFF',
              color: '#0F172A',
              borderColor: '#CBD5E1',
            }}
            title="Download CSV report of organization metrics"
          >
            <Download size={15} aria-hidden="true" />
            <span>Export Data</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCourseBuilderModal(true)}
            className="hr-ops-btn hr-ops-btn-primary"
            style={{
              boxShadow: '0 4px 14px rgba(15, 108, 189, 0.35)',
            }}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Create Course</span>
          </button>
        </div>
      </header>

      {/* ASSIGNED LEARNING CAROUSEL FOR SIGNED-IN HR/ADMIN */}
      {assignedCourses.length > 0 && (
        <section aria-label="Assigned Learning Carousel" style={{ marginBottom: '0.25rem' }}>
          <AssignedLearningCarousel
            courses={assignedCourses}
            onOpenCourse={handleOpenCourse}
          />
        </section>
      )}

      {/* ERROR BANNER IF METRICS LOAD FAILED */}
      {metricsError && (
        <div role="alert" className="hr-ops-error-banner">
          <div className="hr-ops-error-content">
            <AlertTriangle size={17} aria-hidden="true" />
            <span>{metricsError}</span>
          </div>
          <button
            type="button"
            onClick={loadHrMetrics}
            className="hr-ops-btn"
            style={{
              padding: '0.38rem 0.8rem',
              fontSize: '0.78rem',
              borderColor: '#FDA4AF',
              color: '#BE123C',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* =========================================================================
          B. 6 CORE LIVE ORGANIZATION KPI CARDS
         ========================================================================= */}
      <section aria-label="Key Performance Indicators" className="hr-ops-kpi-grid">
        {metricsLoading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`skel-${idx}`}
                className="skeleton-shimmer"
                style={{
                  height: '124px',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                }}
              />
            ))
          : statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="hr-ops-kpi-card">
                  <div className="hr-ops-kpi-top">
                    <span className="hr-ops-kpi-label">{card.label}</span>
                    <div
                      className="hr-ops-kpi-icon-box"
                      style={{
                        background: card.bg,
                        color: card.color,
                        borderColor: card.border,
                      }}
                      aria-hidden="true"
                    >
                      <Icon size={17} />
                    </div>
                  </div>

                  <div className="hr-ops-kpi-value">{card.value}</div>

                  <div className="hr-ops-kpi-footer">
                    {card.showProgress && (
                      <div
                        className="hr-ops-progress-track"
                        role="progressbar"
                        aria-valuenow={Math.round(card.progressPercent)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${card.label} progress`}
                      >
                        <div
                          className="hr-ops-progress-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, card.progressPercent))}%`,
                            background: '#16A34A',
                          }}
                        />
                      </div>
                    )}

                    <div className="hr-ops-kpi-subtext">
                      {card.statusBadge ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.28rem',
                            fontWeight: 600,
                            color: card.isPositiveStatus ? '#166534' : '#991B1B',
                          }}
                        >
                          {card.isPositiveStatus ? (
                            <CheckCircle2 size={13} aria-hidden="true" />
                          ) : (
                            <AlertTriangle size={13} aria-hidden="true" />
                          )}
                          {card.subtext}
                        </span>
                      ) : (
                        <span>{card.subtext}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
      </section>

      {/* =========================================================================
          C & D. MANDATORY TRAINING COMPLIANCE + CATEGORIZED HR LAUNCHPAD
         ========================================================================= */}
      <div className="hr-ops-mid-grid">
        {/* C. Mandatory Training Compliance */}
        <section className="hr-ops-panel" aria-labelledby="hr-compliance-heading">
          <div>
            <div className="hr-ops-panel-header">
              <div>
                <h2 id="hr-compliance-heading" className="hr-ops-panel-title">
                  Mandatory Training Compliance
                </h2>
                <p className="hr-ops-panel-subtitle">
                  Freight forwarding safety &amp; regulatory benchmarks
                </p>
              </div>
              <span className={`hr-ops-status-pill ${isComplianceMet ? 'is-met' : 'is-warn'}`}>
                {isComplianceMet ? (
                  <CheckCircle2 size={13} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={13} aria-hidden="true" />
                )}
                {isComplianceMet ? 'Compliance Target Met' : 'Action Recommended'}
              </span>
            </div>

            <div className="hr-ops-compliance-hero">
              <div className="hr-ops-compliance-score-row">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem' }}>
                  <span
                    className="hr-ops-compliance-big-num"
                    style={{ color: isComplianceMet ? '#15803D' : '#DC2626' }}
                  >
                    {metrics.mandatoryComplianceRate}%
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                    overall regulatory compliance
                  </span>
                </div>
                <span className="hr-ops-compliance-target-tag">Benchmark Target: 90%</span>
              </div>

              <div className="hr-ops-compliance-bar-wrap">
                <div
                  className="hr-ops-progress-track"
                  style={{ height: '8px' }}
                  role="progressbar"
                  aria-valuenow={Math.round(metrics.mandatoryComplianceRate)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Mandatory compliance rate"
                >
                  <div
                    className="hr-ops-progress-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, metrics.mandatoryComplianceRate))}%`,
                      background: isComplianceMet ? '#16A34A' : '#D97706',
                    }}
                  />
                </div>
                <div
                  className="hr-ops-compliance-target-marker"
                  title="90% Target Threshold"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="hr-ops-compliance-stat-grid">
              <div className="hr-ops-mini-stat">
                <span className="hr-ops-mini-stat-label">Active Employees</span>
                <span className="hr-ops-mini-stat-val">{metrics.activeEmployees}</span>
              </div>
              <div className="hr-ops-mini-stat">
                <span className="hr-ops-mini-stat-label">Active Learners</span>
                <span className="hr-ops-mini-stat-val" style={{ color: '#0F6CBD' }}>
                  {metrics.activeLearners}
                </span>
              </div>
            </div>
          </div>

          <div className="hr-ops-compliance-actions">
            <button
              type="button"
              onClick={() => navigate('/hr/courses')}
              className="hr-ops-btn hr-ops-btn-primary"
              style={{ flex: 1 }}
            >
              <Plus size={15} aria-hidden="true" /> Assign Course Training
            </button>
            <button
              type="button"
              onClick={() => navigate('/hr/departments')}
              className="hr-ops-btn"
              style={{ flex: 1 }}
            >
              View Departments
            </button>
          </div>
        </section>

        {/* D. HR Launchpad / Operational Quick Actions */}
        <section className="hr-ops-panel" aria-labelledby="hr-launchpad-heading">
          <div>
            <div className="hr-ops-panel-header">
              <div>
                <h2 id="hr-launchpad-heading" className="hr-ops-panel-title">
                  Launchpad
                </h2>
                <p className="hr-ops-panel-subtitle">
                  Direct access to core HR learning and workforce operations
                </p>
              </div>
            </div>

            {/* Categorized action layout */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {launchpadGroups.map((group) => (
                <div key={group.category}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 750, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                    {group.category}
                  </div>
                  <div className="hr-ops-launchpad-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.action}
                          className="hr-ops-launch-tile"
                        >
                          <div
                            className="hr-ops-launch-icon"
                            style={{
                              background: item.bg,
                              color: item.color,
                              borderColor: item.border,
                            }}
                            aria-hidden="true"
                          >
                            <Icon size={16} />
                          </div>
                          <div className="hr-ops-launch-text">
                            <span className="hr-ops-launch-title">{item.label}</span>
                            <span className="hr-ops-launch-desc">{item.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Integration Secondary Group */}
          <div className="hr-ops-integration-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#F0F9FF',
                  color: '#0284C7',
                  border: '1px solid #BAE6FD',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <Settings size={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#0F172A' }}>
                  Platform Settings &amp; Policies
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                  Manage notifications, security rules &amp; integrations
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/hr/settings')}
              className="hr-ops-btn"
              style={{ padding: '0.38rem 0.75rem', fontSize: '0.76rem' }}
            >
              Configure
            </button>
          </div>
        </section>
      </div>

      {/* =========================================================================
          UPCOMING TRAINING & DEADLINES (COMPACT CALENDAR WIDGET)
         ========================================================================= */}
      <UpcomingTrainingWidget />

      {/* =========================================================================
          E. DEPARTMENT TRAINING ANALYTICS
         ========================================================================= */}
      <section className="hr-ops-panel" aria-labelledby="hr-dept-analytics-heading">
        <div className="hr-ops-panel-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
              <h2 id="hr-dept-analytics-heading" className="hr-ops-panel-title">
                Departmental Training Analytics
              </h2>
            </div>
            <p className="hr-ops-panel-subtitle">
              Workforce learning progress by operational division — select any division to inspect details
            </p>
          </div>

          <div className="hr-ops-dept-controls">
            <label
              htmlFor="hr-dept-sort-select"
              style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}
            >
              Sort:
            </label>
            <select
              id="hr-dept-sort-select"
              value={deptSortBy}
              onChange={(e) => setDeptSortBy(e.target.value)}
              className="hr-ops-select"
            >
              <option value="highest">Highest Completion</option>
              <option value="lowest">Lowest Completion</option>
              <option value="name">Alphabetical</option>
            </select>

            <button
              type="button"
              onClick={loadHrMetrics}
              className="hr-ops-btn"
              style={{ padding: '0.42rem 0.75rem', fontSize: '0.79rem' }}
              title="Refresh departmental data"
            >
              <RefreshCw size={14} aria-hidden="true" /> Refresh
            </button>
          </div>
        </div>

        {metricsLoading && sortedDepartments.length === 0 ? (
          <div className="hr-ops-dept-list">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`dept-skel-${idx}`}
                className="skeleton-shimmer"
                style={{ height: '64px', borderRadius: '12px', border: '1px solid #E2E8F0' }}
              />
            ))}
          </div>
        ) : sortedDepartments.length ? (
          <div className="hr-ops-dept-list">
            {sortedDepartments.map((dept) => {
              const rate = Math.round(dept.rate);
              const hasTraining = dept.hasAssignedTraining;
              const isHigh = hasTraining && rate >= 90;
              const isMedium = hasTraining && rate >= 50 && rate < 90;
              const statusClass = !hasTraining
                ? 'is-neutral'
                : isHigh
                ? 'is-met'
                : isMedium
                ? 'is-info'
                : 'is-low';
              const statusLabel = !hasTraining
                ? 'No Course Assigned'
                : isHigh
                ? 'Target Met'
                : isMedium
                ? 'In Progress'
                : 'Needs Focus';

              return (
                <button
                  key={dept.department}
                  type="button"
                  onClick={() => setSelectedDeptForDrilldown(dept)}
                  className="hr-ops-dept-row"
                  aria-label={`${dept.department}: ${dept.completed} of ${dept.total} active employees completed at least one assigned course, ${hasTraining ? rate + '% average course progress' : 'no training assigned'}. Click to open department analytics.`}
                >
                  <div className="hr-ops-dept-identity">
                    <div className="hr-ops-dept-icon" aria-hidden="true">
                      <Building2 size={17} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span className="hr-ops-dept-name">{dept.department}</span>
                      <span className="hr-ops-dept-count">
                        {dept.completed} of {dept.total} active employees completed at least one assigned course
                      </span>
                    </div>
                  </div>

                  <div className="hr-ops-dept-progress-col">
                    <div className="hr-ops-dept-progress-meta">
                      <span>Average Course Progress</span>
                      <span>{hasTraining ? `${rate}%` : '—'}</span>
                    </div>
                    <div className="hr-ops-progress-track">
                      <div
                        className="hr-ops-progress-fill"
                        style={{
                          width: hasTraining ? `${dept.rate}%` : '0%',
                          background: !hasTraining
                            ? '#94A3B8'
                            : isHigh
                            ? '#16A34A'
                            : isMedium
                            ? '#0F6CBD'
                            : '#DC2626',
                        }}
                      />
                    </div>
                  </div>

                  <div className="hr-ops-dept-status-col">
                    <span className={`hr-ops-status-pill ${statusClass}`}>
                      {!hasTraining ? (
                        <HelpCircle size={12} aria-hidden="true" />
                      ) : isHigh ? (
                        <CheckCircle2 size={12} aria-hidden="true" />
                      ) : !isMedium ? (
                        <AlertTriangle size={12} aria-hidden="true" />
                      ) : null}
                      {!hasTraining ? statusLabel : `${rate}% Complete • ${statusLabel}`}
                    </span>
                    <ChevronRight size={16} color="#64748B" aria-hidden="true" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '2.25rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <Building2 size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.45 }} aria-hidden="true" />
            <p style={{ fontWeight: 650, margin: 0, color: '#0F172A' }}>No department statistics found.</p>
            <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Department figures will appear once employee training records are active.
            </p>
          </div>
        )}
      </section>

      {/* =========================================================================
          F. RECENTLY ISSUED CREDENTIALS
         ========================================================================= */}
      <section className="hr-ops-panel" aria-labelledby="hr-recent-creds-heading">
        <div className="hr-ops-panel-header">
          <div>
            <h2 id="hr-recent-creds-heading" className="hr-ops-panel-title">
              Recently Issued Credentials
            </h2>
            <p className="hr-ops-panel-subtitle">
              Verified course certifications awarded across all branches
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/hr/certificates')}
            className="hr-ops-btn"
            style={{ padding: '0.42rem 0.8rem', fontSize: '0.79rem' }}
          >
            View All Certificates <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>

        {recentCertificates?.length ? (
          <div className="hr-ops-cert-grid">
            {recentCertificates.slice(0, 4).map((cert, idx) => {
              const courseTitle = cert.courseTitle || cert.courseName || 'Completed Course';
              const recipientName = cert.userName || cert.employeeName || 'Employee';
              const certCode = cert.certificateId || cert.id;
              return (
                <button
                  key={certCode ?? idx}
                  type="button"
                  onClick={() => openRecentAsVerified(cert)}
                  className="hr-ops-cert-card"
                  aria-label={`Verify certificate ${certCode} for ${recipientName} in ${courseTitle}`}
                >
                  <div className="hr-ops-cert-badge" aria-hidden="true">
                    <Award size={19} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: 650,
                        color: '#0F172A',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {courseTitle}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>
                      {recipientName}
                      {cert.department ? ` • ${cert.department}` : ''}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        marginTop: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.71rem',
                          color: '#0F6CBD',
                          fontWeight: 600,
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          background: '#F0F9FF',
                          padding: '0.1rem 0.42rem',
                          borderRadius: '4px',
                          border: '1px solid #BAE6FD',
                        }}
                      >
                        {certCode}
                      </span>
                      <span style={{ fontSize: '0.71rem', fontWeight: 600, color: '#15803D' }}>
                        Preview →
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <Award size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.45 }} aria-hidden="true" />
            <p style={{ fontWeight: 650, margin: 0, color: '#0F172A' }}>No recent credentials to display.</p>
            <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Newly issued employee certificates will appear here automatically.
            </p>
          </div>
        )}
      </section>

      {/* =========================================================================
          G1. DEPARTMENT DRILLDOWN MODAL (VIEWPORT PORTAL)
         ========================================================================= */}
      {selectedDeptForDrilldown && typeof document !== 'undefined' && createPortal(
        <div
          id="hr-dept-drilldown-portal"
          className="hr-dept-drilldown-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedDeptForDrilldown(null);
          }}
        >
          <div
            className="hr-dept-drilldown-modal animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dept-drilldown-title"
          >
            {/* Header (pinned glass navy) */}
            <div className="hr-dept-drilldown-header">
              <div>
                <div className="hr-dept-drilldown-subtitle">
                  Department Analytics
                </div>
                <h2
                  id="dept-drilldown-title"
                  className="hr-dept-drilldown-title"
                >
                  {selectedDeptForDrilldown.department}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close department details"
                onClick={() => setSelectedDeptForDrilldown(null)}
                className="hr-dept-drilldown-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body (icy-white glass) */}
            <div className="hr-dept-drilldown-body">
              {/* Metric Cards Row */}
              <div className="hr-dept-drilldown-kpi-grid">
                {[
                  { label: 'Active Employees', value: selectedDeptForDrilldown.total },
                  { label: 'Completed ≥1 Assigned Course', value: selectedDeptForDrilldown.completed },
                  {
                    label: 'Average Progress',
                    value: selectedDeptForDrilldown.hasAssignedTraining
                      ? `${Math.round(selectedDeptForDrilldown.rate)}%`
                      : 'No courses assigned',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="hr-dept-drilldown-kpi-card"
                  >
                    <div className="hr-dept-drilldown-kpi-label">
                      {item.label}
                    </div>
                    <div className="hr-dept-drilldown-kpi-value">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Section */}
              <div className="hr-dept-drilldown-progress-section">
                <div className="hr-dept-drilldown-progress-header">
                  <span>Average Course Progress (Assigned Training)</span>
                  <span className="hr-dept-drilldown-progress-pct">
                    {selectedDeptForDrilldown.hasAssignedTraining
                      ? `${Math.round(selectedDeptForDrilldown.rate)}%`
                      : 'No courses assigned'}
                  </span>
                </div>
                <div className="hr-dept-drilldown-progress-track">
                  <div
                    className="hr-dept-drilldown-progress-fill"
                    style={{
                      width: selectedDeptForDrilldown.hasAssignedTraining ? `${selectedDeptForDrilldown.rate}%` : '0%',
                      background:
                        !selectedDeptForDrilldown.hasAssignedTraining
                          ? '#94A3B8'
                          : selectedDeptForDrilldown.rate >= 90
                          ? 'linear-gradient(90deg, #16A34A 0%, #22C55E 100%)'
                          : selectedDeptForDrilldown.rate >= 50
                          ? 'linear-gradient(90deg, #0F6CBD 0%, #0284C7 100%)'
                          : 'linear-gradient(90deg, #DC2626 0%, #EF4444 100%)',
                    }}
                  />
                </div>
              </div>

              {/* Descriptive context */}
              <p className="hr-dept-drilldown-desc">
                Average course progress is calculated across active learners who have eligible assigned courses in this division.
                Assigning courses will cascade to all eligible members of this department.
              </p>
            </div>

            {/* Footer Actions (pinned glass) */}
            <div className="hr-dept-drilldown-footer">
              <button
                type="button"
                onClick={() => setSelectedDeptForDrilldown(null)}
                className="hr-dept-drilldown-btn-close"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDeptForDrilldown(null);
                  navigate('/hr/courses');
                }}
                className="hr-dept-drilldown-btn-primary"
              >
                Go to Courses
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* =========================================================================
          G2. QUICK COURSE BUILDER MODAL
         ========================================================================= */}
      {showCourseBuilderModal && (
        <CourseBuilderModal
          key="hr-quick-builder"
          courseId=""
          onClose={() => {
            setShowCourseBuilderModal(false);
            loadHrMetrics();
          }}
          onPublish={() => {
            setShowCourseBuilderModal(false);
            loadHrMetrics();
            navigate('/hr/courses');
          }}
        />
      )}
    </div>
  );
}
