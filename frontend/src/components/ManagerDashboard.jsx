import { API_BASE_URL as SHARED_API_BASE_URL, authFetch } from '../utils/apiConfig';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  BarChart2,
  TrendingUp,
  Search,
  ShieldCheck,
  RefreshCw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Clock,
  Compass,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEnrollmentStore } from '../stores/enrollmentStore';
import AssignedLearningCarousel from './AssignedLearningCarousel';
import UpcomingTrainingWidget from './dashboard/UpcomingTrainingWidget';
import { courseService } from '../services/courseService';
import { formatCourseDuration } from '../utils/courseDuration';
import { subscribeEnrollmentSync } from '../utils/enrollmentSync';

const API_BASE_URL = SHARED_API_BASE_URL;

function getToken() {
  return localStorage.getItem('fairmacs_token') ||
    localStorage.getItem('fairmacs_lms_token') || '';
}

async function apiGet(path) {
  const token = getToken();
  const response = await authFetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.message || body.error || message;
    } catch {
      // Keep HTTP status message if not JSON
    }
    throw new Error(message);
  }
  return response.json();
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeCsv(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export default function ManagerDashboard({ onOpenVerifiedCertificate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    verifyCertificate,
    verifiedCertificateError
  } = useEnrollmentStore();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [certInput, setCertInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortProgress, setSortProgress] = useState('none');

  const managerId = user?.id ?? user?.userId;
  const managerName = user?.name || user?.employeeName || user?.fullName || 'Manager';
  const managerDept = user?.department || 'Operations';
  const team = Array.isArray(report?.teamMembersData) ? report.teamMembersData : [];

  const loadReport = useCallback(async (isRefresh = false) => {
    if (managerId == null || managerId === '') {
      setLoadError('Your account ID is not available. Sign in again and retry.');
      setLoading(false);
      return;
    }
    if (!isRefresh) setLoading(true);
    setLoadError('');
    try {
      const data = await apiGet(`/manager/reports/${encodeURIComponent(managerId)}`);
      setReport(data || null);
    } catch (error) {
      setLoadError(error.message || 'Unable to load the team report.');
    } finally {
      setLoading(false);
    }
  }, [managerId]);

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
    loadReport();
    loadAssignedCourses();

    const handleSync = () => {
      loadAssignedCourses();
    };
    window.addEventListener('lms:enrollment-updated', handleSync);
    const unsubscribe = subscribeEnrollmentSync(handleSync);

    return () => {
      window.removeEventListener('lms:enrollment-updated', handleSync);
      unsubscribe();
    };
  }, [loadReport, loadAssignedCourses]);

  const filteredTeam = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = team.filter((member) => {
      const matchesSearch = !query || [
        member.name, member.employeeId, member.designation, member.status
      ].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'ALL' ||
        String(member.status || '').toUpperCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
    if (sortProgress === 'high') rows = [...rows].sort((a, b) => (b.progress || 0) - (a.progress || 0));
    if (sortProgress === 'low') rows = [...rows].sort((a, b) => (a.progress || 0) - (b.progress || 0));
    return rows;
  }, [team, search, statusFilter, sortProgress]);

  const actionNeededMembers = useMemo(() => {
    return team.filter((m) => String(m.status || '').toUpperCase() === 'ACTION NEEDED');
  }, [team]);

  const exportCsv = () => {
    if (!team.length) return;
    const rows = [
      ['Employee ID', 'Employee Name', 'Designation', 'Assigned Courses', 'Completed Courses', 'Progress (%)', 'Status'],
      ...team.map((member) => [
        member.employeeId, member.name, member.designation,
        member.assigned, member.completed, member.progress, member.status
      ])
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fairmacs-team-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleVerifyCertificate = async (event) => {
    event?.preventDefault?.();
    const credential = certInput.trim();
    if (!credential) return;
    setVerifying(true);
    setVerifyError('');
    try {
      const result = await verifyCertificate(credential);
      if (result?.certificate) {
        const verificationData = {
          verifiedBy: managerId,
          verifiedByName: managerName,
          verifiedByRole: user?.role,
          verifiedByRoleLabel: 'Manager',
          verifiedAt: new Date().toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
          })
        };
        if (onOpenVerifiedCertificate) {
          onOpenVerifiedCertificate(result.certificate, verificationData);
        } else {
          setVerifyError('Certificate verified, but the certificate viewer is not available on this page.');
        }
      } else {
        setVerifyError('No verified certificate was returned. Check the credential ID and try again.');
      }
    } catch (error) {
      setVerifyError(error.message || 'Certificate verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const openTranscript = async (member) => {
    setSelectedEmployee(member);
    setTranscript(null);
    setTranscriptError('');
    setTranscriptLoading(true);
    try {
      const data = await apiGet(`/manager/reports/employee/${encodeURIComponent(member.userId)}`);
      setTranscript(data || null);
    } catch (error) {
      setTranscriptError(error.message || 'Unable to load this employee transcript.');
    } finally {
      setTranscriptLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Team Members',
      value: report?.teamMembers ?? team.length,
      subtext: 'Direct reports supervised',
      icon: Users,
      color: '#0284C7',
      bg: '#F0F9FF',
      border: '#BAE6FD',
    },
    {
      label: 'Overall Completion',
      value: report ? `${report.overallCompletion ?? 0}%` : '—',
      subtext: 'Average curriculum progress',
      icon: CheckCircle2,
      color: '#16A34A',
      bg: '#F0FDF4',
      border: '#BBF7D0',
    },
    {
      label: 'Mandatory Compliance',
      value: report ? `${report.mandatoryCompliance ?? 0}%` : '—',
      subtext: 'Benchmark Target: 90%',
      icon: TrendingUp,
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A',
    },
    {
      label: 'Assessment Average',
      value: report ? `${report.assessmentPerformance ?? 0}%` : '—',
      subtext: 'Evaluated quiz performance',
      icon: ShieldCheck,
      color: '#7C3AED',
      bg: '#F5F3FF',
      border: '#DDD6FE',
    }
  ];

  const renderStatusBadge = (status) => {
    const value = String(status || '').toUpperCase();
    if (value === 'COMPLIANT' || value === 'COMPLETED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: '#F0FDF4',
            color: '#15803D',
            border: '1px solid #BBF7D0',
            padding: '0.22rem 0.6rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          <CheckCircle2 size={12} />
          Compliant
        </span>
      );
    }
    if (value === 'ON TRACK') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: '#F0F9FF',
            color: '#0369A1',
            border: '1px solid #BAE6FD',
            padding: '0.22rem 0.6rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          <Clock size={12} />
          On Track
        </span>
      );
    }
    if (value === 'ACTION NEEDED' || value.includes('OVERDUE')) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: '#FEF2F2',
            color: '#BE123C',
            border: '1px solid #FECACA',
            padding: '0.22rem 0.6rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          <AlertTriangle size={12} />
          Action Needed
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: '#F8FAFC',
          color: '#64748B',
          border: '1px solid #E2E8F0',
          padding: '0.22rem 0.6rem',
          borderRadius: '999px',
          fontSize: '0.72rem',
          fontWeight: 650,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />
        No Training
      </span>
    );
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        minWidth: 0,
        color: '#0F172A',
      }}
    >
      {/* =========================================================================
          1. HEADER & ACTIONS
          Contextual managerial oversight header
         ========================================================================= */}
      <header
        style={{
          background: 'linear-gradient(135deg, rgba(16, 42, 67, 0.96) 0%, rgba(11, 31, 56, 0.94) 55%, rgba(2, 132, 199, 0.90) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 16px 36px rgba(11, 31, 56, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          padding: '1.75rem 2rem',
          borderRadius: 20,
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontSize: '0.74rem',
              color: '#7DD3FC',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(2, 132, 199, 0.25)',
              border: '1px solid rgba(125, 211, 252, 0.35)',
              padding: '0.24rem 0.75rem',
              borderRadius: '20px',
              marginBottom: '0.55rem',
            }}
          >
            <Users size={13} />
            Fairmacs Learning Academy • Team Supervision
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.4rem, 2.2vw, 1.85rem)',
              fontWeight: 800,
              margin: '0 0 0.3rem',
              letterSpacing: '-0.025em',
              lineHeight: 1.25,
            }}
          >
            Welcome, {managerName}
          </h1>
          <p
            style={{
              color: '#CBD5E1',
              fontSize: '0.88rem',
              margin: 0,
              lineHeight: 1.5,
              maxWidth: '680px',
            }}
          >
            Supervise team learning progress in {managerDept}, monitor mandatory compliance benchmarks, and track employee course milestones.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <button
            type="button"
            onClick={() => navigate('/manager/policies')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              borderRadius: '10px',
              padding: '0.6rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 650,
              cursor: 'pointer',
              transition: 'background 0.18s ease',
            }}
            title="Review and manage team policy assignments"
          >
            <ShieldCheck size={15} />
            <span>Team Policies</span>
          </button>

          <button
            type="button"
            onClick={exportCsv}
            disabled={!team.length}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              color: '#0F172A',
              borderRadius: '10px',
              padding: '0.6rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 750,
              cursor: team.length ? 'pointer' : 'not-allowed',
              opacity: team.length ? 1 : 0.6,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => loadReport(true)}
            disabled={loading}
            title="Refresh team report"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              borderRadius: '10px',
              padding: '0.6rem 0.75rem',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* ERROR BANNER IF REPORT LOAD FAILED */}
      {loadError && (
        <div
          role="alert"
          style={{
            padding: '0.9rem 1.15rem',
            borderRadius: '12px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.86rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={17} />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => loadReport()}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              borderRadius: '8px',
              border: '1px solid #FDA4AF',
              background: '#FFFFFF',
              color: '#991B1B',
              fontWeight: 650,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* =========================================================================
          2. ASSIGNED LEARNING CAROUSEL FOR SIGNED-IN MANAGER
         ========================================================================= */}
      {assignedCourses.length > 0 && (
        <section aria-label="Assigned Learning Carousel" style={{ marginBottom: '0.25rem' }}>
          <AssignedLearningCarousel
            courses={assignedCourses}
            onOpenCourse={handleOpenCourse}
          />
        </section>
      )}

      {/* =========================================================================
          3. TEAM SUMMARY & PRACTICAL FOLLOW-UP CALLOUT
          Compact 4-segment operational metrics
         ========================================================================= */}
      <section
        aria-label="Team Performance Summary"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {statCards.map(({ label, value, subtext, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.2rem 1.35rem',
              border: '1px solid rgba(226, 232, 240, 0.95)',
              boxShadow: '0 4px 18px rgba(31, 70, 120, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 650, color: '#475569' }}>{label}</span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: bg,
                  color: color,
                  border: `1px solid ${border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-hidden="true"
              >
                <Icon size={16} />
              </div>
            </div>

            <div style={{ marginTop: '0.35rem' }}>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                {loading ? '—' : value}
              </div>
            </div>

            <div style={{ marginTop: '0.45rem', fontSize: '0.74rem', color: '#64748B' }}>
              {subtext}
            </div>
          </div>
        ))}
      </section>

      {/* PRACTICAL FOLLOW-UP BANNER */}
      {!loading && !loadError && (
        <section
          aria-label="Team Follow-Up Status"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            background: actionNeededMembers.length > 0 ? '#FFF1F2' : '#F0FDF4',
            border: `1px solid ${actionNeededMembers.length > 0 ? '#FECDD3' : '#BBF7D0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: actionNeededMembers.length > 0 ? '#FFE4E6' : '#DCFCE7',
                color: actionNeededMembers.length > 0 ? '#E11D48' : '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {actionNeededMembers.length > 0 ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
            </div>
            <div>
              <div
                style={{
                  fontWeight: 750,
                  fontSize: '0.88rem',
                  color: actionNeededMembers.length > 0 ? '#9F1239' : '#166534',
                }}
              >
                {actionNeededMembers.length > 0
                  ? `${actionNeededMembers.length} team member${actionNeededMembers.length === 1 ? '' : 's'} require follow-up`
                  : 'Team learning status is healthy'}
              </div>
              <div
                style={{
                  fontSize: '0.76rem',
                  color: actionNeededMembers.length > 0 ? '#BE123C' : '#15803D',
                  marginTop: '1px',
                }}
              >
                {actionNeededMembers.length > 0
                  ? 'Incomplete or lagging assignments detected. Inspect individual progress and follow up directly.'
                  : 'All direct reports are currently compliant or progressing on track with assigned curriculums.'}
              </div>
            </div>
          </div>

          {actionNeededMembers.length > 0 && statusFilter !== 'ACTION NEEDED' && (
            <button
              type="button"
              onClick={() => setStatusFilter('ACTION NEEDED')}
              style={{
                padding: '0.42rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid #FDA4AF',
                background: '#FFFFFF',
                color: '#BE123C',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>Show Action Needed Only</span>
              <ArrowRight size={13} />
            </button>
          )}
        </section>
      )}

      {/* =========================================================================
          4. TEAM TRAINING REPORT (THE PRIMARY WORKING SURFACE)
         ========================================================================= */}
      <section
        aria-labelledby="team-report-heading"
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.4rem 1.5rem',
          border: '1px solid rgba(226, 232, 240, 0.95)',
          boxShadow: '0 4px 20px rgba(31, 70, 120, 0.04)',
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #F1F5F9',
          }}
        >
          <div>
            <h2
              id="team-report-heading"
              style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0F172A', margin: 0 }}
            >
              Team Training &amp; Compliance
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
              {loading
                ? 'Loading team report…'
                : `${team.length} employee${team.length === 1 ? '' : 's'} assigned to ${managerDept}`}
            </p>
          </div>

          {/* Filtering and search controls */}
          <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                }}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employees…"
                aria-label="Search team members"
                style={{
                  padding: '0.42rem 0.75rem 0.42rem 2rem',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  outline: 'none',
                  minWidth: '180px',
                }}
               enterKeyHint="search" />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
              style={{
                padding: '0.42rem 0.75rem',
                fontSize: '0.8rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#0F172A',
                outline: 'none',
                fontWeight: 600,
              }}
            >
              <option value="ALL">All statuses</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="ON TRACK">On track</option>
              <option value="ACTION NEEDED">Action needed</option>
              <option value="NO TRAINING">No training</option>
            </select>

            <button
              type="button"
              onClick={() => setSortProgress((value) => (value === 'none' ? 'high' : value === 'high' ? 'low' : 'none'))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.42rem 0.75rem',
                fontSize: '0.8rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                color: '#0F172A',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <span>Progress</span>
              {sortProgress === 'high' ? (
                <ChevronDown size={14} />
              ) : sortProgress === 'low' ? (
                <ChevronUp size={14} />
              ) : null}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.6rem', color: '#0284C7' }} />
            <div style={{ fontSize: '0.88rem', fontWeight: 650 }}>Loading live team report…</div>
          </div>
        ) : !loadError && filteredTeam.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <Users size={32} style={{ margin: '0 auto 0.6rem', color: '#94A3B8' }} />
            <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.92rem' }}>
              {team.length ? 'No employees match your filters' : 'No team members found'}
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
              {team.length
                ? 'Try a different search query or reset your status filter.'
                : 'The API returned no employees registered under this manager’s division.'}
            </p>
            {team.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setSortProgress('none');
                }}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.78rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '780px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Employee
                  </th>
                  <th style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Assigned
                  </th>
                  <th style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Completed
                  </th>
                  <th style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '150px' }}>
                    Progress
                  </th>
                  <th style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem 0.9rem', fontSize: '0.76rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTeam.map((member) => (
                  <tr
                    key={member.userId}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      fontSize: '0.86rem',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '0.85rem 0.9rem' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{member.name || 'Unnamed employee'}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                        {[member.designation, member.employeeId].filter(Boolean).join(' • ') || 'Employee details unavailable'}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 0.9rem', fontWeight: 650, color: '#0F172A' }}>
                      {member.assigned ?? 0}
                    </td>
                    <td style={{ padding: '0.85rem 0.9rem', fontWeight: 700, color: '#15803D' }}>
                      {member.completed ?? 0}
                    </td>
                    <td style={{ padding: '0.85rem 0.9rem', minWidth: '150px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '999px', flex: 1, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.max(0, Math.min(100, Number(member.progress) || 0))}%`,
                              background: '#0284C7',
                              borderRadius: '999px',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                        <span style={{ minWidth: '38px', fontSize: '0.78rem', fontWeight: 750, color: '#0F172A' }}>
                          {member.progress ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 0.9rem' }}>
                      {renderStatusBadge(member.status)}
                    </td>
                    <td style={{ padding: '0.85rem 0.9rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => openTranscript(member)}
                        disabled={member.userId == null}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.38rem 0.75rem',
                          fontSize: '0.78rem',
                          fontWeight: 650,
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#0F172A',
                          cursor: member.userId != null ? 'pointer' : 'not-allowed',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <BookOpen size={13} />
                        <span>Transcript</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =========================================================================
          5. UPCOMING TRAINING & DEADLINES (COMPACT CALENDAR WIDGET)
         ========================================================================= */}
      <UpcomingTrainingWidget />

      {/* =========================================================================
          6. SECONDARY ACTIONS (CERTIFICATE VERIFICATION & QUICK NAVIGATION)
          Restrained, clean secondary operational tools
         ========================================================================= */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Certificate Verification Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.35rem 1.45rem',
            border: '1px solid rgba(226, 232, 240, 0.95)',
            boxShadow: '0 4px 18px rgba(31, 70, 120, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                background: '#F0FDF4',
                color: '#16A34A',
                border: '1px solid #BBF7D0',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Verify Team Certificate
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748B' }}>
                Enter the credential ID to validate an issued employee credential.
              </p>
            </div>
          </div>

          <form onSubmit={handleVerifyCertificate} style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="e.g. FMC-CERT-88492"
              value={certInput}
              onChange={(event) => {
                setCertInput(event.target.value);
                setVerifyError('');
              }}
              aria-label="Certificate credential ID"
              style={{
                flex: '1 1 200px',
                minWidth: 0,
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.82rem',
                outline: 'none',
                background: '#F8FAFC',
              }}
            />
            <button
              type="submit"
              disabled={verifying || !certInput.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 650,
                cursor: verifying || !certInput.trim() ? 'not-allowed' : 'pointer',
                opacity: verifying || !certInput.trim() ? 0.6 : 1,
              }}
            >
              <Search size={14} />
              <span>{verifying ? 'Verifying…' : 'Verify'}</span>
            </button>
          </form>

          {(verifyError || verifiedCertificateError) && (
            <div
              role="alert"
              style={{
                marginTop: '0.65rem',
                padding: '0.65rem 0.8rem',
                background: '#FFF1F2',
                border: '1px solid #FECDD3',
                color: '#BE123C',
                borderRadius: '8px',
                fontSize: '0.78rem',
                display: 'flex',
                gap: '0.45rem',
                alignItems: 'center',
              }}
            >
              <AlertCircle size={14} />
              <span>{verifyError || verifiedCertificateError}</span>
            </div>
          )}
        </div>

        {/* Quick Manager Resources */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.35rem 1.45rem',
            border: '1px solid rgba(226, 232, 240, 0.95)',
            boxShadow: '0 4px 18px rgba(31, 70, 120, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.2rem' }}>
              Managerial Navigation
            </h3>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.76rem', color: '#64748B' }}>
              Direct access to team governance, calendar, and learning catalogs.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={() => navigate('/manager/policies')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '0.8rem',
                fontWeight: 650,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <ShieldCheck size={16} color="#0284C7" />
              <span>Policies &amp; SOPs</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/training-calendar')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 0.8rem',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontSize: '0.8rem',
                fontWeight: 650,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Clock size={16} color="#16A34A" />
              <span>Full Calendar</span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. EMPLOYEE TRANSCRIPT MODAL
         ========================================================================= */}
      {selectedEmployee && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Employee training transcript"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedEmployee(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'grid',
            placeItems: 'center',
            padding: '1rem',
          }}
        >
          <section
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              width: 'min(920px, 100%)',
              maxHeight: '85dvh',
              overflow: 'auto',
              padding: '1.5rem 1.75rem',
              boxShadow: '0 25px 60px rgba(15, 23, 42, 0.28)',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                alignItems: 'flex-start',
                marginBottom: '1.15rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {selectedEmployee.name || 'Employee'} — Training Transcript
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                  {[selectedEmployee.employeeId, selectedEmployee.designation].filter(Boolean).join(' • ') || 'Detailed training record'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close transcript"
                onClick={() => setSelectedEmployee(null)}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0.4rem',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={17} />
              </button>
            </div>

            {transcriptLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.6rem', color: '#0284C7' }} />
                <p style={{ margin: 0, fontSize: '0.88rem' }}>Loading live employee transcript…</p>
              </div>
            ) : transcriptError ? (
              <div
                role="alert"
                style={{
                  padding: '0.85rem 1rem',
                  background: '#FFF1F2',
                  color: '#BE123C',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  border: '1px solid #FECDD3',
                }}
              >
                {transcriptError}
              </div>
            ) : transcript ? (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '0.65rem',
                    marginBottom: '1rem',
                  }}
                >
                  {[
                    ['Total Courses', transcript.totalCourses],
                    ['Completed', transcript.completedCourses],
                    ['In Progress', transcript.inProgressCourses],
                    ['Not Started', transcript.notStartedCourses],
                    ['Certificates', transcript.certificatesIssued],
                    ['Overall Progress', `${transcript.overallProgress ?? 0}%`]
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '0.65rem 0.8rem',
                      }}
                    >
                      <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 600 }}>{label}</div>
                      <div style={{ color: '#0F172A', fontSize: '1.18rem', fontWeight: 800, marginTop: '0.15rem' }}>
                        {value ?? 0}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1.25rem',
                    fontSize: '0.8rem',
                    color: '#64748B',
                    marginBottom: '1rem',
                    padding: '0.55rem 0.85rem',
                    background: '#F1F5F9',
                    borderRadius: '8px',
                  }}
                >
                  <span><strong>Department:</strong> {transcript.department || '—'}</span>
                  <span><strong>Training Hours:</strong> {transcript.totalTrainingHours ?? 0}</span>
                  <span><strong>Average Score:</strong> {transcript.averageScore ?? 0}%</span>
                </div>

                {Array.isArray(transcript.courses) && transcript.courses.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>
                          <th style={{ padding: '0.65rem 0.8rem', textAlign: 'left' }}>Course</th>
                          <th style={{ padding: '0.65rem 0.8rem', textAlign: 'left' }}>Type</th>
                          <th style={{ padding: '0.65rem 0.8rem', textAlign: 'left' }}>Status</th>
                          <th style={{ padding: '0.65rem 0.8rem', textAlign: 'left' }}>Progress</th>
                          <th style={{ padding: '0.65rem 0.8rem', textAlign: 'left' }}>Score</th>
                          <th style={{ padding: '0.65rem 0.8rem', textAlign: 'left' }}>Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transcript.courses.map((course, index) => (
                          <tr
                            key={course.enrollmentId ?? `${course.courseId}-${index}`}
                            style={{ borderBottom: '1px solid #F1F5F9', fontSize: '0.84rem' }}
                          >
                            <td style={{ padding: '0.75rem 0.8rem' }}>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>
                                {course.courseTitle || course.courseId || 'Course'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {course.courseId || ''}
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem 0.8rem', fontSize: '0.8rem' }}>
                              <span
                                style={{
                                  background: String(course.enrollmentType || '').toUpperCase() === 'MANDATORY' ? '#FEF2F2' : '#F0F9FF',
                                  color: String(course.enrollmentType || '').toUpperCase() === 'MANDATORY' ? '#DC2626' : '#0284C7',
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 650,
                                }}
                              >
                                {course.enrollmentType || 'ELECTIVE'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 0.8rem' }}>
                              {String(course.status || '—').replaceAll('_', ' ')}
                            </td>
                            <td style={{ padding: '0.75rem 0.8rem', fontWeight: 650 }}>
                              {course.progressPercent ?? 0}%
                            </td>
                            <td style={{ padding: '0.75rem 0.8rem', fontWeight: 650 }}>
                              {course.score == null ? '—' : `${course.score}%`}
                            </td>
                            <td style={{ padding: '0.75rem 0.8rem', color: '#475569' }}>
                              {formatDate(course.dueDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '1rem 0 0' }}>
                    No course records are available for this employee.
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '1rem 0 0' }}>
                No transcript data returned.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
