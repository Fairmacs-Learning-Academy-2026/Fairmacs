import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2, Users, Award, ShieldCheck, Download, History, UserCheck,
  BookOpen, BarChart2, X, Plus, Search, FileCheck, AlertCircle, Calendar,
  RefreshCw, Pencil, ClipboardList
} from 'lucide-react';
import EmployeeManagement from './EmployeeManagement';
import DepartmentManagement from './DepartmentManagement';
import LearningPaths from './LearningPaths';
import TrainingAssignmentModal from './TrainingAssignmentModal';
import CourseBuilderModal from './CourseBuilderModal';
import { useAuth } from '../context/AuthContext';
import { useEnrollmentStore } from '../stores/enrollmentStore';
import { getZohoConnectUrl } from '../services/zohoService';

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
  const csv = rows.map((row) =>
    row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const panelStyle = {
  background: '#fff',
  padding: '1.5rem',
  borderRadius: '12px',
  border: '1px solid #e2e8f0'
};

const buttonStyle = {
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '0.6rem 0.85rem',
  background: '#fff',
  color: '#334155',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.45rem',
  fontWeight: 700
};

export default function HrAdminDashboard({ onOpenVerifiedCertificate }) {
  const { user } = useAuth();
  const {
    verifyCertificate,
    verifiedCertificateError,
    fetchRecentCertificates,
    recentCertificates
  } = useEnrollmentStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeHrSubTab = searchParams.get('tab') || 'overview';
  const [selectedDeptForDrilldown, setSelectedDeptForDrilldown] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showCourseBuilderModal, setShowCourseBuilderModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState('');
  const [certInput, setCertInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState('');
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  const handleHrTabChange = (tab) => setSearchParams({ tab });

  const handleConnectZoho = async () => {
    try {
      const authorizationUrl = await getZohoConnectUrl();
      window.location.assign(authorizationUrl);
    } catch (error) {
      alert(error.message || 'Unable to connect to Zoho WorkDrive.');
    }
  };

  const loadHrMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError('');
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/hr/dashboard/metrics`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json'
        }
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
        departmentStats: normalizeDepartmentStats(data.departmentStats)
      });
    } catch (error) {
      setMetricsError(error.message || 'Unable to load live HR metrics.');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    setCoursesLoading(true);
    setCoursesError('');
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/courses`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json'
        }
      });
      if (!response.ok) throw new Error(`Could not load courses (${response.status}).`);
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : (payload.content ?? payload.courses ?? payload.data ?? []);
      setCourses(Array.isArray(items) ? items : []);
    } catch (error) {
      setCoursesError(error.message || 'Unable to load courses.');
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHrMetrics();
  }, [loadHrMetrics]);

  useEffect(() => {
    if (activeHrSubTab === 'courses') loadCourses();
    if (activeHrSubTab === 'certificates') fetchRecentCertificates(10);
  }, [activeHrSubTab, loadCourses, fetchRecentCertificates]);

  const handleVerifyCertificate = async (event) => {
    event?.preventDefault?.();
    const input = certInput.trim();
    if (!input || verifying) return;
    setVerifying(true);
    try {
      const result = await verifyCertificate(input);
      if (result?.certificate) {
        onOpenVerifiedCertificate?.(result.certificate, {
          verifiedBy: user?.id,
          verifiedByName: user?.name || user?.employeeName || 'HR Admin',
          verifiedByRole: user?.role,
          verifiedByRoleLabel: 'HR Admin',
          verifiedAt: new Date().toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
          })
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  const openRecentAsVerified = (certificate) => {
    onOpenVerifiedCertificate?.(certificate, {
      verifiedBy: user?.id,
      verifiedByName: user?.name || user?.employeeName || 'HR Admin',
      verifiedByRole: user?.role,
      verifiedByRoleLabel: 'HR Admin',
      verifiedAt: new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      })
    });
  };

  const exportMetrics = () => {
    const rows = [
      ['Department', 'Employees Completed', 'Total Employees', 'Completion Rate (%)'],
      ...metrics.departmentStats.map((dept) => [
        dept.department, dept.completed, dept.total, Math.round(dept.rate)
      ]),
      [],
      ['HR Metric', 'Value'],
      ['Total Employees', metrics.totalEmployees],
      ['Active Employees', metrics.activeEmployees],
      ['Active Learners', metrics.activeLearners],
      ['Overall Completion Rate (%)', metrics.overallCompletionRate],
      ['Average Training Hours', metrics.avgTrainingHours],
      ['Certificates Issued', metrics.certificatesIssued],
      ['Mandatory Compliance Rate (%)', metrics.mandatoryComplianceRate]
    ];
    downloadCsv('fairmacs-hr-dashboard-report.csv', rows);
  };

  const tabs = [
    { id: 'overview', label: 'HR Overview' },
    { id: 'employees', label: 'Employees' },
    { id: 'departments', label: 'Departments' },
    { id: 'courses', label: 'Courses' },
    { id: 'paths', label: 'Learning Paths' },
    { id: 'assignments', label: 'Training Assignments' },
    { id: 'reports', label: 'Reports & Analytics' },
    { id: 'certificates', label: 'Certificates' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'settings', label: 'System Settings' }
  ];

  const statCards = [
    { label: 'Total Employees', value: metrics.totalEmployees, icon: Users, bg: '#e0f2fe', color: '#0284c7' },
    { label: 'Active Learners', value: metrics.activeLearners, icon: UserCheck, bg: '#f3e8ff', color: '#9333ea' },
    { label: 'Completion Rate', value: `${metrics.overallCompletionRate}%`, icon: BarChart2, bg: '#dcfce7', color: '#16a34a' },
    { label: 'Training Hours', value: `${metrics.avgTrainingHours} h`, icon: Building2, bg: '#fef3c7', color: '#d97706' },
    { label: 'Certificates', value: metrics.certificatesIssued, icon: Award, bg: '#e0e7ff', color: '#4f46e5' },
    { label: 'Mandatory Compliance', value: `${metrics.mandatoryComplianceRate}%`, icon: ShieldCheck, bg: '#ffe4e6', color: '#e11d48' }
  ];

  const visibleCourses = courses.filter((course) => {
    const title = course.title ?? course.courseTitle ?? '';
    const id = course.courseId ?? course.id ?? '';
    const category = course.category ?? '';
    const query = courseSearch.toLowerCase();
    return `${title} ${id} ${category}`.toLowerCase().includes(query);
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        padding: '2rem', borderRadius: '16px', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '1rem', flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            HR & Enterprise Administration Hub
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.2rem' }}>Fairmacs HR Management Portal</h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: '0.4rem', maxWidth: 760 }}>
            Workforce compliance, employee administration, department training, course assignments and analytics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => setShowCourseBuilderModal(true)} style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)' }}>
            <Plus size={16} /> Create Course
          </button>
          <button className="btn-primary" onClick={() => setShowAssignmentModal(true)} style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)' }}>
            <Plus size={16} /> Create Assignment
          </button>
          <button onClick={exportMetrics} style={{ ...buttonStyle, background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}>
            <Download size={16} /> Export HR Report
          </button>
          <button
            type="button"
            onClick={handleConnectZoho}
            style={{ ...buttonStyle, background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
          >
            Connect Zoho WorkDrive
          </button>
        </div>
      </section>

      {metricsLoading && <div style={{ ...panelStyle, padding: '0.8rem 1rem', color: '#64748b' }}>Loading live HR metrics…</div>}
      {metricsError && (
        <div role="alert" style={{ padding: '0.85rem 1rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, color: '#be123c', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
          <span><AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{metricsError}</span>
          <button onClick={loadHrMetrics} style={buttonStyle}><RefreshCw size={14} /> Retry</button>
        </div>
      )}

      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', marginTop: 0, gap: '0.85rem' }}>
        {statCards.map(({ label, value, icon: Icon, bg, color }) => (
          <div className="stat-card" key={label}>
            <div className="stat-icon" style={{ background: bg, color }}><Icon size={18} /></div>
            <div>
              <div className="stat-val" style={{ fontSize: '1.25rem' }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <nav aria-label="HR dashboard sections" style={{ display: 'flex', gap: '0.4rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => handleHrTabChange(tab.id)} style={{
            padding: '0.55rem 1.1rem', borderRadius: 8, fontSize: '0.85rem',
            fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
            background: activeHrSubTab === tab.id ? '#9333ea' : 'transparent',
            color: activeHrSubTab === tab.id ? '#fff' : '#64748b'
          }}>{tab.label}</button>
        ))}
      </nav>

      {activeHrSubTab === 'employees' && <EmployeeManagement />}
      {activeHrSubTab === 'departments' && <DepartmentManagement />}
      {activeHrSubTab === 'paths' && <LearningPaths />}

      {activeHrSubTab === 'courses' && (
        <section style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Course Catalog</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Courses returned by the LMS API.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input value={courseSearch} onChange={(event) => setCourseSearch(event.target.value)} placeholder="Search courses…" aria-label="Search courses" style={{ padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1' }} />
              <button onClick={() => { setEditingCourseId(''); setShowCourseBuilderModal(true); }} className="btn-primary" style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)', border: 'none', borderRadius: 8, padding: '0.6rem 0.85rem', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}><Plus size={15} /> Create Course</button>
              <button onClick={loadCourses} style={buttonStyle}><RefreshCw size={15} /> Refresh</button>
            </div>
          </div>
          {coursesLoading ? <p style={{ color: '#64748b' }}>Loading courses…</p> :
            coursesError ? <div role="alert" style={{ color: '#be123c' }}>{coursesError} <button onClick={loadCourses} style={buttonStyle}>Retry</button></div> :
              visibleCourses.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.85rem' }}>
                  {visibleCourses.map((course, index) => (
                    <article key={course.id ?? course.courseId ?? index} style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: 10 }}>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{course.title ?? course.courseTitle ?? 'Untitled course'}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 5 }}>
                        ID: {course.courseId ?? course.id ?? '—'}{(course.category) ? ` • ${course.category}` : ''}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 8 }}>
                        Status: {course.active === false || course.isActive === false ? 'Inactive' : 'Available'}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
                        <button
                          type="button"
                          onClick={() => setShowAssignmentModal(true)}
                          style={{ ...buttonStyle, padding: '0.5rem 0.65rem', fontSize: '0.78rem' }}
                          aria-label={`Manage assignments for ${course.title ?? course.courseTitle ?? 'course'}`}
                        ><ClipboardList size={14} /> Manage Assignments</button>
                        <button
                          type="button"
                          onClick={() => {
                            const id = course.courseId ?? course.id ?? course.dbId ?? course.courseDbId;
                            if (id == null || String(id).trim() === '') {
                              alert('This course does not include a course ID that can be used to edit its content.');
                              return;
                            }
                            setEditingCourseId(String(id));
                            setShowCourseBuilderModal(true);
                          }}
                          style={{ ...buttonStyle, padding: '0.5rem 0.65rem', fontSize: '0.78rem', background: '#f5f3ff', borderColor: '#ddd6fe', color: '#6d28d9' }}
                          aria-label={`Edit content for ${course.title ?? course.courseTitle ?? 'course'}`}
                        ><Pencil size={14} /> Edit Content</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}><BookOpen size={28} style={{ margin: '0 auto 0.5rem' }} />No courses found.</div>
          }
        </section>
      )}

      {activeHrSubTab === 'assignments' && (
        <section style={panelStyle}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Training Assignments</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Create and manage assignments through the existing assignment workflow. No simulated assignment action is shown here.
          </p>
          <button className="btn-primary" onClick={() => setShowAssignmentModal(true)} style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)' }}><Plus size={16} /> Create Assignment</button>
        </section>
      )}

      {activeHrSubTab === 'reports' && (
        <section style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Training Compliance Analytics</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Based on the live HR metrics response.</p>
            </div>
            <button onClick={exportMetrics} style={buttonStyle}><Download size={15} /> Export CSV</button>
          </div>
          {metrics.departmentStats.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {metrics.departmentStats.map((dept) => (
                <button key={dept.department} onClick={() => setSelectedDeptForDrilldown(dept)} className="hover-highlight" style={{ textAlign: 'left', border: 0, background: 'transparent', padding: '0.4rem', borderRadius: 8, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    <span style={{ color: '#0f172a', fontWeight: 800 }}>{dept.department}</span>
                    <span>{dept.completed} / {dept.total} completed ({Math.round(dept.rate)}%)</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: 10, marginTop: 7 }}>
                    <div className="progress-bar-fill" style={{ width: `${dept.rate}%`, background: dept.rate >= 90 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #9333ea, #c084fc)' }} />
                  </div>
                </button>
              ))}
            </div>
          ) : <p style={{ color: '#64748b' }}>Department-level metrics are not available in the API response.</p>}
        </section>
      )}

      {activeHrSubTab === 'certificates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <section style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{ background: '#f3e8ff', width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center' }}><ShieldCheck size={22} color="#9333ea" /></div>
              <div><h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Verify Certificate</h2><p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>Validate a credential using its certificate ID.</p></div>
            </div>
            <form onSubmit={handleVerifyCertificate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="text" placeholder="Enter certificate ID" value={certInput} onChange={(event) => setCertInput(event.target.value)} style={{ padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
              <button type="submit" className="btn-primary" disabled={verifying || !certInput.trim()} style={{ background: '#9333ea', padding: '0.7rem 1rem' }}>
                <Search size={16} /> {verifying ? 'Verifying…' : 'Verify & View Certificate'}
              </button>
            </form>
            {verifiedCertificateError && <div role="alert" style={{ marginTop: 12, padding: '0.7rem 0.85rem', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: 8, fontSize: '0.82rem' }}><AlertCircle size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />{verifiedCertificateError}</div>}
          </section>
          <section style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div><h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Recently Issued Certificates</h2><p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 3 }}>Select a certificate to open its verification view.</p></div>
              <button onClick={() => fetchRecentCertificates(10)} style={buttonStyle}><RefreshCw size={14} /> Refresh</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: 520 }}>
              {recentCertificates?.length ? recentCertificates.map((cert, index) => (
                <button key={cert.certificateId ?? cert.id ?? index} onClick={() => openRecentAsVerified(cert)} className="hover-highlight" style={{ textAlign: 'left', padding: '0.85rem', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.75rem', alignItems: 'center', cursor: 'pointer' }}>
                  <span style={{ width: 36, height: 36, borderRadius: 8, background: '#dbeafe', color: '#1d4ed8', display: 'grid', placeItems: 'center' }}><Award size={17} /></span>
                  <span>
                    <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{cert.courseTitle || cert.courseName || 'Completed Course'}</span>
                    <span style={{ display: 'block', fontSize: '0.76rem', color: '#64748b', marginTop: 3 }}>{cert.userName || cert.employeeName || 'Employee'}{cert.department ? ` • ${cert.department}` : ''}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#4338ca', marginTop: 4 }}>{cert.certificateId || cert.id || 'Certificate ID unavailable'}{cert.issuedAt ? ` • ${new Date(cert.issuedAt).toLocaleDateString('en-IN')}` : ''}</span>
                  </span>
                </button>
              )) : <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}><FileCheck size={30} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} /><strong style={{ display: 'block' }}>No certificates found</strong><span style={{ fontSize: '0.82rem' }}>Issued credentials will appear here when available.</span></div>}
            </div>
          </section>
        </div>
      )}

      {activeHrSubTab === 'announcements' && (
        <section style={panelStyle}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Announcements</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Announcement publishing is not connected to a confirmed backend endpoint yet. No announcements are fabricated or stored only in component state.</p>
        </section>
      )}

      {activeHrSubTab === 'settings' && (
        <section style={panelStyle}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>System Settings</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>These settings need a persistent backend configuration endpoint before they can be safely changed. The previous local-only toggles have been removed to avoid implying that settings are saved.</p>
        </section>
      )}

      {activeHrSubTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div><h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Departmental Training Compliance</h2><p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>Live figures from HR dashboard metrics.</p></div>
              <button onClick={loadHrMetrics} style={buttonStyle}><RefreshCw size={14} /> Refresh</button>
            </div>
            {metrics.departmentStats.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {metrics.departmentStats.map((dept) => (
                  <button key={dept.department} onClick={() => setSelectedDeptForDrilldown(dept)} className="hover-highlight" style={{ cursor: 'pointer', textAlign: 'left', padding: '0.5rem', border: 0, background: 'transparent', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#334155' }}>
                      <strong style={{ color: '#0f172a' }}>{dept.department}</strong><span>{dept.completed}/{dept.total} ({Math.round(dept.rate)}%)</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: 10, marginTop: 7 }}><div className="progress-bar-fill" style={{ width: `${dept.rate}%`, background: dept.rate >= 90 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #9333ea, #c084fc)' }} /></div>
                  </button>
                ))}
              </div>
            ) : <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No department breakdown returned by the backend.</p>}
          </section>
          <section style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}><History size={20} color="#64748b" /><h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>System Audit Trail</h2></div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>A live audit-log endpoint has not been confirmed for this dashboard. Mock audit records have been removed; the panel will display real events once the backend endpoint is available.</p>
          </section>
        </div>
      )}

      {selectedDeptForDrilldown && (
        <div className="modal-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelectedDeptForDrilldown(null); }}>
          <div className="modal-content animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="dept-drilldown-title" style={{ maxWidth: 600, padding: 0, overflow: 'hidden' }}>
            <div style={{ background: '#0f172a', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', gap: '1rem' }}>
              <div><div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1 }}>Department Analytics</div><h2 id="dept-drilldown-title" style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 4 }}>{selectedDeptForDrilldown.department}</h2></div>
              <button aria-label="Close department details" onClick={() => setSelectedDeptForDrilldown(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 0, padding: '0.4rem', borderRadius: '50%', color: '#fff', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.75rem' }}>
                {[
                  { label: 'Employees', value: selectedDeptForDrilldown.total },
                  { label: 'Completed', value: selectedDeptForDrilldown.completed },
                  { label: 'Completion', value: `${Math.round(selectedDeptForDrilldown.rate)}%` }
                ].map((item) => <div key={item.label} style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: 8, border: '1px solid #e2e8f0' }}><div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>{item.label}</div><div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{item.value}</div></div>)}
              </div>
              <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6, marginTop: '1rem' }}>Employee-level roster and overdue details are not included in the current department metrics response, so they are not estimated or filled with mock data.</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <button onClick={() => setSelectedDeptForDrilldown(null)} style={buttonStyle}>Close</button>
                <button className="btn-primary" onClick={() => { setSelectedDeptForDrilldown(null); setShowAssignmentModal(true); }} style={{ background: '#9333ea' }}><Plus size={15} /> Assign Department Training</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCourseBuilderModal && (
        <CourseBuilderModal
          key={editingCourseId || 'new-course'}
          courseId={editingCourseId || ''}
          onClose={() => { setShowCourseBuilderModal(false); setEditingCourseId(''); }}
          onPublish={() => {
            setShowCourseBuilderModal(false);
            setEditingCourseId('');
            handleHrTabChange('courses');
            loadCourses();
            loadHrMetrics();
          }}
        />
      )}

      {showAssignmentModal && (
        <TrainingAssignmentModal
          onClose={() => setShowAssignmentModal(false)}
          onAssignSuccess={() => { setShowAssignmentModal(false); handleHrTabChange('overview'); loadHrMetrics(); }}
        />
      )}
    </div>
  );
}
