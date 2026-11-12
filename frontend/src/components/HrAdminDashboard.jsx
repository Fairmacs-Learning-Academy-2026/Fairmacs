import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  FolderGit2
} from 'lucide-react';

import CourseBuilderModal, { preloadCourseBuilderReferenceData } from './CourseBuilderModal';
import { useAuth } from '../context/AuthContext';
import { useEnrollmentStore } from '../stores/enrollmentStore';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');

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
    const rate = Number(item.rate ?? item.completionRate ?? (total ? (completed / total) * 100 : 0));
    return {
      ...item,
      department: item.department ?? item.departmentName ?? `Department ${index + 1}`,
      total,
      completed,
      rate: Math.max(0, Math.min(100, Number.isFinite(rate) ? rate : 0))
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

export default function HrAdminDashboard({ onOpenVerifiedCertificate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchRecentCertificates, recentCertificates } = useEnrollmentStore();

  const [selectedDeptForDrilldown, setSelectedDeptForDrilldown] = useState(null);
  const [showCourseBuilderModal, setShowCourseBuilderModal] = useState(false);

  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState('');
  const [deptSortBy, setDeptSortBy] = useState('highest'); // 'highest' | 'lowest' | 'name'

  const loadHrMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError('');
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/hr/dashboard/metrics`, {
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

  useEffect(() => {
    preloadCourseBuilderReferenceData();
    loadHrMetrics();
    fetchRecentCertificates(6);
  }, [loadHrMetrics, fetchRecentCertificates]);

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
      ['Average Training Hours', `${metrics.avgTrainingHours} hrs`],
      ['Certificates Issued', metrics.certificatesIssued],
      ['Mandatory Compliance Rate (%)', `${metrics.mandatoryComplianceRate}%`]
    ];
    downloadCsv('fairmacs-hr-dashboard-report.csv', rows);
  };

  const statCards = [
    {
      label: 'Total Employees',
      value: metrics.totalEmployees,
      subtext: '___________________________',

      icon: Users,
      bg: '#F0F9FF',
      color: '#0284C7',
    },
    {
      label: 'Active Learners',
      value: metrics.activeLearners,
      subtext: 'Enrolled & in training',
      icon: UserCheck,
      bg: '#F0F9FF',
      color: '#0F6CBD',
    },
    {
      label: 'Completion Rate',
      value: `${metrics.overallCompletionRate}%`,
      subtext: 'Across all active courses',
      icon: BarChart2,
      bg: '#F0FDF4',
      color: '#16A34A',
      showProgress: true,
      progressPercent: metrics.overallCompletionRate,
    },
    {
      label: 'Average Hours',
      value: `${metrics.avgTrainingHours} hrs`,
      subtext: 'Average per employee',
      icon: Clock,
      bg: '#FFFBEB',
      color: '#D97706',
    },
    {
      label: 'Certificates Awarded',
      value: metrics.certificatesIssued,
      subtext: 'Credentials verified',
      icon: Award,
      bg: '#F0FDF4',
      color: '#16A34A',
    },
    {
      label: 'Mandatory Compliance',
      value: `${metrics.mandatoryComplianceRate}%`,
      subtext: metrics.mandatoryComplianceRate >= 90 ? 'Target achieved (≥90%)' : 'Action recommended (<90%)',
      icon: ShieldCheck,
      bg: metrics.mandatoryComplianceRate >= 90 ? '#F0FDF4' : '#FEF2F2',
      color: metrics.mandatoryComplianceRate >= 90 ? '#16A34A' : '#DC2626',
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
      message: 'Certificate authenticity verified via KMS Registry.',
    });
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
      {/* 1. TOP HEADER & ACTIONS BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            HR Overview
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '3px 0 0 0' }}>
            Enterprise learning health, active enrollments, and compliance overview
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={exportMetrics}
            style={actionBtnStyle}
            title="Export metrics CSV"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {metricsError && (
        <div
          role="alert"
          style={{
            padding: '0.9rem 1.25rem',
            borderRadius: '6px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{metricsError}</span>
          <button
            type="button"
            onClick={loadHrMetrics}
            style={{
              ...actionBtnStyle,
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              background: '#FFFFFF',
              borderColor: '#FDA4AF',
              color: '#BE123C',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. 6 CORE LIVE KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
          gap: '1rem',
        }}
      >
        {metricsLoading
          ? Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={`skel-${idx}`}
              className="skeleton-shimmer"
              style={{
                height: '118px',
                borderRadius: '8px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            />
          ))
          : statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                style={{
                  ...cardStyle,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: '#64748B',
                      textTransform: 'none',
                      letterSpacing: 'normal',
                    }}
                  >
                    {card.label}
                  </span>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '6px',
                      background: card.bg,
                      color: card.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <Icon size={18} />
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '1.75rem',
                      fontWeight: 650,
                      color: '#0F172A',
                      lineHeight: 1.2,
                      letterSpacing: '-0.015em',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {card.value}
                  </div>
                  {card.showProgress && (
                    <div
                      className="progress-bar-bg"
                      style={{ height: '6px', marginTop: '0.55rem', borderRadius: '4px' }}
                    >
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, card.progressPercent))}%`,
                          background: '#16A34A',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#64748B',
                      marginTop: card.showProgress ? '0.35rem' : '0.25rem',
                    }}
                  >
                    {card.subtext}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* 3. ROW 1: COMPLIANCE CARD + QUICK ACTION LAUNCHPAD */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Mandatory Compliance Overview Card */}
        <section style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Mandatory Training Compliance
                </h2>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0 0' }}>
                  Freight forwarding safety & regulatory benchmarks
                </p>
              </div>
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: metrics.mandatoryComplianceRate >= 90 ? '#F0FDF4' : '#FFFBEB',
                  color: metrics.mandatoryComplianceRate >= 90 ? '#166534' : '#92400E',
                  border: `1px solid ${metrics.mandatoryComplianceRate >= 90 ? '#BBF7D0' : '#FDE68A'}`,
                }}
              >
                {metrics.mandatoryComplianceRate >= 90 ? 'Compliance Target Met' : 'Action Recommended'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.75rem',
                margin: '1rem 0 0.5rem 0',
              }}
            >
              <span
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  color: metrics.mandatoryComplianceRate >= 90 ? '#16A34A' : '#DC2626',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {metrics.mandatoryComplianceRate}%
              </span>
              <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>
                overall regulatory compliance
              </span>
            </div>

            <div className="progress-bar-bg" style={{ height: '8px', margin: '0.75rem 0 1.25rem 0' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, metrics.mandatoryComplianceRate))}%`,
                  background: metrics.mandatoryComplianceRate >= 90 ? '#16A34A' : '#D97706',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                background: '#F8FAFC',
                padding: '0.85rem',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                  ACTIVE EMPLOYEES
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 650, color: '#0F172A', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  {metrics.activeEmployees}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                  ACTIVE LEARNERS
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 650, color: '#0F6CBD', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  {metrics.activeLearners}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={() => navigate('/hr/courses')}
              style={{
                ...actionBtnStyle,
                background: '#0F6CBD',
                color: '#FFFFFF',
                border: '1px solid #0F6CBD',
                flex: 1,
              }}
            >
              <Plus size={15} /> Assign Course Training
            </button>
            <button
              type="button"
              onClick={() => navigate('/hr/departments')}
              style={{ ...actionBtnStyle, flex: 1 }}
            >
              View Departments
            </button>
          </div>
        </section>

        {/* Quick Action Launchpad */}
        <section style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Launchpad
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0 0' }}>
                Instant navigation to dedicated administrative sections
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.65rem',
              }}
            >
              {[
                {
                  label: 'Create Course',
                  icon: Plus,
                  action: () => setShowCourseBuilderModal(true),
                  color: '#0F6CBD',
                  bg: '#F0F9FF',
                },
                {
                  label: 'Courses',
                  icon: Users,
                  action: () => navigate('/hr/courses'),
                  color: '#0284C7',
                  bg: '#F0F9FF',
                },
                {
                  label: 'Manage Staff',
                  icon: Users,
                  action: () => navigate('/hr/employees'),
                  color: '#16A34A',
                  bg: '#F0FDF4',
                },
                {
                  label: 'Departments',
                  icon: Building2,
                  action: () => navigate('/hr/departments'),
                  color: '#4F46E5',
                  bg: '#EEF2FF',
                },
                {
                  label: 'Certificates',
                  icon: Award,
                  action: () => navigate('/hr/certificates'),
                  color: '#D97706',
                  bg: '#FFFBEB',
                },
                {
                  label: 'Export Data',
                  icon: Download,
                  action: exportMetrics,
                  color: '#0F6CBD',
                  bg: '#F8FAFC',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    style={{
                      padding: '0.85rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.45rem',
                      textAlign: 'center',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.04)';
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        background: item.bg,
                        color: item.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0F172A' }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System Integration Quick Link */}
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem 0.95rem',
              background: '#F8FAFC',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <FolderGit2 size={18} color="#0F6CBD" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#0F172A' }}>
                  Zoho WorkDrive Storage
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Video lesson files stream securely via OAuth
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/hr/settings')}
              style={{
                ...actionBtnStyle,
                padding: '0.35rem 0.75rem',
                fontSize: '0.78rem',
              }}
            >
              Configure
            </button>
          </div>
        </section>
      </div>

      {/* 4. ROW 2: DEPARTMENTAL TRAINING ANALYTICS */}
      <section style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Departmental Training Analytics
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Workforce learning progress by operational division
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>Sort:</span>
            <select
              value={deptSortBy}
              onChange={(e) => setDeptSortBy(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.8rem',
                color: '#334155',
                background: '#FFFFFF',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="highest">Highest Completion</option>
              <option value="lowest">Lowest Completion</option>
              <option value="name">Alphabetical</option>
            </select>

            <button
              type="button"
              onClick={loadHrMetrics}
              style={{ ...actionBtnStyle, padding: '0.4rem 0.75rem' }}
              title="Refresh departmental data"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {sortedDepartments.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sortedDepartments.map((dept) => {
              const rate = Math.round(dept.rate);
              const isHigh = rate >= 90;
              const isMedium = rate >= 60 && rate < 90;

              return (
                <div
                  key={dept.department}
                  onClick={() => setSelectedDeptForDrilldown(dept)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: '#F0F9FF',
                          color: '#0F6CBD',
                          border: '1px solid #BAE6FD',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}
                      >
                        <Building2 size={16} />
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 650,
                            color: '#0F172A',
                          }}
                        >
                          {dept.department}
                        </span>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#64748B',
                          }}
                        >
                          {dept.completed} of {dept.total} employees trained
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.55rem',
                          borderRadius: '4px',
                          background: isHigh ? '#F0FDF4' : isMedium ? '#F0F9FF' : '#FEF2F2',
                          color: isHigh ? '#166534' : isMedium ? '#075985' : '#991B1B',
                          border: `1px solid ${isHigh ? '#BBF7D0' : isMedium ? '#BAE6FD' : '#FECACA'}`,
                        }}
                      >
                        {rate}% Complete
                      </span>
                      <ChevronRight size={16} color="#94A3B8" />
                    </div>
                  </div>

                  <div className="progress-bar-bg" style={{ height: '6px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${dept.rate}%`,
                        background: isHigh ? '#16A34A' : isMedium ? '#0F6CBD' : '#DC2626',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <Building2 size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600, margin: 0, color: '#0F172A' }}>No department statistics found.</p>
            <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Department figures will appear once employee training records are active.
            </p>
          </div>
        )}
      </section>

      {/* 5. ROW 3: RECENTLY AWARDED CERTIFICATES PREVIEW */}
      <section style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Recently Issued Credentials
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Verified course certifications awarded across all branches
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/hr/certificates')}
            style={{ ...actionBtnStyle, padding: '0.4rem 0.75rem' }}
          >
            View All Certificates <ChevronRight size={14} />
          </button>
        </div>

        {recentCertificates?.length ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {recentCertificates.slice(0, 4).map((cert, idx) => (
              <div
                key={cert.certificateId ?? cert.id ?? idx}
                onClick={() => openRecentAsVerified(cert)}
                style={{
                  padding: '0.75rem 0.95rem',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    background: '#F0FDF4',
                    color: '#16A34A',
                    border: '1px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Award size={18} />
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
                    {cert.courseTitle || cert.courseName || 'Completed Course'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>
                    {cert.userName || cert.employeeName || 'Employee'}
                    {cert.department ? ` • ${cert.department}` : ''}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#0F6CBD', fontWeight: 500, marginTop: 2, fontFamily: 'monospace' }}>
                    {cert.certificateId || cert.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B' }}>
            <Award size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600, margin: 0, color: '#0F172A' }}>No recent credentials to display.</p>
            <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Newly issued employee certificates will appear here automatically.
            </p>
          </div>
        )}
      </section>

      {/* DEPARTMENT DRILLDOWN MODAL */}
      {selectedDeptForDrilldown && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedDeptForDrilldown(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dept-drilldown-title"
            style={{
              maxWidth: 540,
              width: '100%',
              borderRadius: '8px',
              background: '#FFFFFF',
              boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                background: '#0F172A',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#FFFFFF',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#38BDF8',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Department Analytics
                </div>
                <h2
                  id="dept-drilldown-title"
                  style={{ fontSize: '1.2rem', fontWeight: 700, margin: '4px 0 0 0' }}
                >
                  {selectedDeptForDrilldown.department}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close department details"
                onClick={() => setSelectedDeptForDrilldown(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 0,
                  padding: '0.4rem',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                }}
              >
                {[
                  { label: 'Total Employees', value: selectedDeptForDrilldown.total },
                  { label: 'Completed', value: selectedDeptForDrilldown.completed },
                  {
                    label: 'Completion',
                    value: `${Math.round(selectedDeptForDrilldown.rate)}%`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: '#F8FAFC',
                      padding: '0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: '#0F172A',
                        marginTop: 4,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <p
                style={{
                  color: '#64748B',
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                  marginTop: '1.25rem',
                }}
              >
                Department completion rate is dynamically computed from live employee course attempts.
                Assigning mandatory training will instantly cascade to all active members of this department.
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedDeptForDrilldown(null)}
                  style={actionBtnStyle}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeptForDrilldown(null);
                    navigate('/hr/courses');
                  }}
                  style={{
                    ...actionBtnStyle,
                    background: '#0F6CBD',
                    color: '#FFFFFF',
                    border: '1px solid #0F6CBD',
                  }}
                >
                  Go to Courses
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK COURSE BUILDER MODAL */}
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
