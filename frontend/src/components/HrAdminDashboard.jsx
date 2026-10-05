import React, { useState, useEffect } from 'react';
import { Building2, Users, Award, ShieldCheck, Download, History, PlusCircle, UserCheck, BookOpen, Send, BarChart2, Bell, Settings, ArrowRight, X, Plus, Search, FileCheck, AlertCircle, Calendar } from 'lucide-react';
import { MOCK_HR_METRICS, MOCK_AUDIT_LOGS, COURSES, MOCK_USERS_DATABASE, MOCK_DEPARTMENTS_DATA } from '../data/mockData';
import EmployeeManagement from './EmployeeManagement';
import DepartmentManagement from './DepartmentManagement';
import LearningPaths from './LearningPaths';
import TrainingAssignmentModal from './TrainingAssignmentModal';
import { useAuth } from '../context/AuthContext';
import { useEnrollmentStore } from '../stores/enrollmentStore';

export default function HrAdminDashboard({ onOpenVerifiedCertificate }) {
  const { user } = useAuth();
  const { verifyCertificate, verifiedCertificate, verifiedCertificateError, fetchRecentCertificates, recentCertificates } = useEnrollmentStore();
  const [activeHrSubTab, setActiveHrSubTab] = useState('overview');
  // 'overview' | 'employees' | 'departments' | 'courses' | 'paths' | 'assignments' | 'reports' | 'announcements' | 'settings' | 'certificates'

  const [selectedDeptForDrilldown, setSelectedDeptForDrilldown] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [certInput, setCertInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (activeHrSubTab === 'certificates') {
      fetchRecentCertificates(10);
    }
  }, [activeHrSubTab, fetchRecentCertificates]);

  const handleVerifyCertificate = async (e) => {
    e?.preventDefault?.();
    const input = certInput.trim();
    if (!input) return;
    setVerifying(true);
    const result = await verifyCertificate(input);
    setVerifying(false);
    if (result?.certificate) {
      const today = new Date();
      const verificationData = {
        verifiedBy: user?.id,
        verifiedByName: user?.name || user?.employeeName || 'HR Admin',
        verifiedByRole: user?.role,
        verifiedByRoleLabel: 'HR Admin',
        verifiedAt: today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      };
      onOpenVerifiedCertificate?.(result.certificate, verificationData);
    }
  };

  const openRecentAsVerified = (cert) => {
    const today = new Date();
    const verificationData = {
      verifiedBy: user?.id,
      verifiedByName: user?.name || user?.employeeName || 'HR Admin',
      verifiedByRole: user?.role,
      verifiedByRoleLabel: 'HR Admin',
      verifiedAt: today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    };
    onOpenVerifiedCertificate?.(cert, verificationData);
  };

  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    activeLearners: 0,
    overallCompletionRate: 0,
    avgTrainingHours: 0,
    certificatesIssued: 0,
    mandatoryComplianceRate: 0,
    departmentStats: []
  });

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState('');

  useEffect(() => {
    const loadHrMetrics = async () => {
      try {
        setMetricsLoading(true);
        setMetricsError('');

        const token =
          localStorage.getItem('fairmacs_lms_token') ||
          localStorage.getItem('fairmacs_token');

        const response = await fetch(
          'http://localhost:8080/api/hr/dashboard/metrics',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load HR metrics (${response.status})`);
        }

        const data = await response.json();

        setMetrics({
          totalEmployees: data.totalEmployees ?? 0,
          activeEmployees: data.activeEmployees ?? 0,
          activeLearners: data.activeLearners ?? 0,
          overallCompletionRate: data.overallCompletionRate ?? 0,
          avgTrainingHours: data.avgTrainingHours ?? 0,
          certificatesIssued: data.certificatesIssued ?? 0,
          mandatoryComplianceRate: data.mandatoryComplianceRate ?? 0,
          departmentStats: data.departmentStats ?? []
        });
      } catch (error) {
        console.error('HR metrics loading error:', error);
        setMetricsError('Unable to load live HR metrics.');
      } finally {
        setMetricsLoading(false);
      }
    };

    loadHrMetrics();
  }, []);
  const [announcements, setAnnouncements] = useState([
    { id: 1, title: 'Annual Mandatory Cybersecurity Certification Deadline', target: 'All Employees', date: '20 Sep 2026' },
    { id: 2, title: 'New Incoterms 2020 Refresher Module Launched', target: 'Operations & Sales', date: '15 Sep 2026' }
  ]);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  const handleAddAnnouncement = () => {
    if (!newAnnouncement.trim()) return;
    setAnnouncements([
      { id: Date.now(), title: newAnnouncement, target: 'All Employees', date: '21 Sep 2026' },
      ...announcements
    ]);
    setNewAnnouncement('');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* HR Executive Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', padding: '2rem', borderRadius: '16px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            HR & Enterprise Administration Hub
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.2rem' }}>Fairmacs HR Management Portal</h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Workforce compliance health, employee provisioning, department rules, course assignments, and analytics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={() => setShowAssignmentModal(true)} style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)' }}>
            <Plus style={{ width: 16, height: 16 }} /> Create Assignment
          </button>
          <button className="btn-secondary" onClick={() => alert('Downloading enterprise compliance PDF report...')} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Download style={{ width: 16, height: 16 }} /> Audit Report (PDF)
          </button>
        </div>
      </div>

      {metricsLoading && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            color: '#64748b',
            fontSize: '0.85rem'
          }}
        >
          Loading live HR metrics...
        </div>
      )}

      {metricsError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '10px',
            color: '#be123c',
            fontSize: '0.85rem',
            fontWeight: 600
          }}
        >
          {metricsError}
        </div>
      )}

      {/* HR KPIs Bar */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginTop: 0, gap: '0.85rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Users style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div className="stat-val" style={{ fontSize: '1.25rem' }}>{metrics.totalEmployees}</div>
            <div className="stat-label">Total Employees</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
            <UserCheck style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div className="stat-val" style={{ fontSize: '1.25rem' }}>{metrics.activeLearners}</div>
            <div className="stat-label">Active Learners</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <BarChart2 style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div className="stat-val" style={{ fontSize: '1.25rem' }}>{metrics.overallCompletionRate}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Building2 style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div className="stat-val" style={{ fontSize: '1.25rem' }}>{metrics.avgTrainingHours} h</div>
            <div className="stat-label">Training Hours</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
            <Award style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div className="stat-val" style={{ fontSize: '1.25rem' }}>{metrics.certificatesIssued}</div>
            <div className="stat-label">Certificates</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ffe4e6', color: '#e11d48' }}>
            <ShieldCheck style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <div className="stat-val" style={{ fontSize: '1.25rem' }}>{metrics.mandatoryComplianceRate}%</div>
            <div className="stat-label">Mandatory Compliance</div>
          </div>
        </div>
      </div>

      {/* HR Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {[
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
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveHrSubTab(tab.id)}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: activeHrSubTab === tab.id ? '#9333ea' : 'transparent',
              color: activeHrSubTab === tab.id ? 'white' : '#64748b',
              transition: 'all 0.12s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeHrSubTab === 'employees' && <EmployeeManagement />}
      {activeHrSubTab === 'departments' && <DepartmentManagement />}
      {activeHrSubTab === 'paths' && <LearningPaths />}

      {activeHrSubTab === 'courses' && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Enterprise Course Catalog Governance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {COURSES.map(c => (
              <div key={c.id} style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px' }}>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{c.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>ID: {c.id} • Category: {c.category}</div>
                <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, marginTop: '0.5rem' }}>Active in Enterprise Catalog</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeHrSubTab === 'assignments' && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Bulk Training Assignment Tool</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <select style={{ padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}>
              <option>Select Target Department (Documentation)</option>
              <option>Accounts</option>
              <option>Operations</option>
              <option>Sales & BD</option>
              <option>HR</option>
              <option>IT</option>
            </select>
            <select style={{ padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}>
              <option>Select Course (Customs Clearance & Documentation SOP)</option>
              <option>Freight Forwarding Fundamentals</option>
              <option>Air Freight Operations & AWB Management</option>
              <option>Cybersecurity Awareness</option>
            </select>
            <button className="btn-primary" onClick={() => alert('Assigned mandatory track to all employees in target department!')}>
              Assign Mandatory Track
            </button>
          </div>
        </div>
      )}

      {activeHrSubTab === 'reports' && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Enterprise L&D Compliance Analytics</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {metrics.departmentStats.map((dept) => (
              <div key={dept.department}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  <span>{dept.department}</span>
                  <span>{dept.completed} / {dept.total} Employees ({dept.rate}%)</span>
                </div>
                <div className="progress-bar-bg" style={{ height: 10, marginTop: '0.4rem' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${dept.rate}%`,
                      background: dept.rate > 90 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #9333ea, #c084fc)'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeHrSubTab === 'certificates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem' }}>
          {/* Left: Certificate Verification */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{ background: '#f3e8ff', width: 42, height: 42, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck style={{ width: 22, height: 22, color: '#9333ea' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Verify Credential</h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>Validate any employee certificate using its unique ID.</div>
              </div>
            </div>
            <form onSubmit={handleVerifyCertificate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="text"
                placeholder="Enter Certificate ID — e.g. FM-CERT-2026-0123"
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                style={{ padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={verifying || !certInput.trim()}
                style={{ background: verifying ? '#64748b' : 'linear-gradient(135deg, #9333ea, #7e22ce)', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Search style={{ width: 16, height: 16 }} />
                {verifying ? 'Validating in Registry…' : 'Verify & View Certificate'}
              </button>
            </form>
            {verifiedCertificateError && (
              <div style={{ marginTop: '0.85rem', padding: '0.7rem 0.85rem', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertCircle style={{ width: 15, height: 15 }} />
                {verifiedCertificateError}
              </div>
            )}
            <div style={{ marginTop: '1.25rem', padding: '0.9rem 1rem', background: '#f8fafc', borderRadius: '10px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>💡 Tips for HR Admins</div>
              Credential IDs follow the format <span style={{ fontFamily: 'monospace', background: '#eef2ff', padding: '1px 5px', borderRadius: 4, color: '#4338ca' }}>FM-CERT-{new Date().getFullYear()}-XXXX</span>. Upon verification, the full certificate (including the employee's name, department, course, and score) will open with a tamper-proof "Verified Credential" banner.
            </div>
          </div>

          {/* Right: Recently Issued Certificates */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div style={{ background: '#ecfdf5', width: 38, height: 38, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCheck style={{ width: 19, height: 19, color: '#059669' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Recently Issued Credentials</h2>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Click a row to open the verified certificate.</div>
                </div>
              </div>
              <button
                onClick={() => fetchRecentCertificates(10)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1px solid #c4b5fd', background: '#f5f3ff', color: '#6d28d9', cursor: 'pointer', fontWeight: 600 }}
              >
                ↻ Refresh
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: 520 }}>
              {recentCertificates && recentCertificates.length > 0 ? (
                recentCertificates.map((cert, idx) => (
                  <div
                    key={cert.certificateId || cert.id || idx}
                    onClick={() => openRecentAsVerified(cert)}
                    className="hover-highlight"
                    style={{ padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s ease', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '0.85rem', alignItems: 'center' }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Award style={{ width: 17, height: 17 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{cert.courseTitle || cert.courseName || 'Completed Course'}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 2 }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{cert.userName || cert.employeeName || 'Employee'}</span>
                        {cert.department && <span> • {cert.department}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#4338ca', background: '#eef2ff', padding: '2px 7px', borderRadius: 5 }}>
                        {cert.certificateId}
                      </div>
                      {cert.issuedAt && (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                          <Calendar style={{ width: 11, height: 11 }} />
                          {new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  <FileCheck style={{ width: 36, height: 36, margin: '0 auto 0.75rem', opacity: 0.4 }} />
                  <div style={{ fontWeight: 600, color: '#64748b' }}>No certificates issued yet</div>
                  <div style={{ marginTop: 4 }}>Recently earned credentials will appear here.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeHrSubTab === 'announcements' && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Broadcast LMS Announcements</h2>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Type corporate LMS announcement message..."
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
            <button className="btn-primary" onClick={handleAddAnnouncement} style={{ background: '#9333ea' }}>
              Broadcast Announcement
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {announcements.map(ann => (
              <div key={ann.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #9333ea' }}>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{ann.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Target: {ann.target} • Published: {ann.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeHrSubTab === 'settings' && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Enterprise LMS System Settings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
              <input type="checkbox" defaultChecked /> Enable Automatic Department Learning Path Auto-Assignment
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
              <input type="checkbox" defaultChecked /> Allow Manager Nudges for Direct Reports
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
              <input type="checkbox" defaultChecked /> Enforce 80% Minimum Assessment Passing Score
            </label>
          </div>
        </div>
      )}

      {activeHrSubTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Department Breakdown */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Departmental Training Compliance
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#9333ea', fontWeight: 700 }}>Click department for drilldown 🔍</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {metrics.departmentStats.map((dept) => (
                <div
                  key={dept.department}
                  onClick={() => setSelectedDeptForDrilldown(dept)}
                  style={{ cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.15s ease' }}
                  className="hover-highlight"
                  title="Click to view detailed department drilldown"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    <span style={{ color: '#0f172a', fontWeight: 800 }}>{dept.department}</span>
                    <span>{dept.completed} / {dept.total} Employees ({dept.rate}%)</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: 10, marginTop: '0.4rem' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${dept.rate}%`,
                        background: dept.rate > 90 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #9333ea, #c084fc)'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Trail */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <History style={{ width: 20, height: 20, color: '#64748b' }} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Real-time System Audit Trail</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {MOCK_AUDIT_LOGS.map((log) => (
                <div key={log.id} style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', borderLeft: '4px solid #9333ea' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{log.action}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                    <span>{log.user}</span>
                    <span>{log.timestamp} • IP: {log.ip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Training Assignment Modal */}
      {showAssignmentModal && (
        <TrainingAssignmentModal
          onClose={() => setShowAssignmentModal(false)}
          onAssignSuccess={() => setActiveHrSubTab('overview')}
        />
      )}

      {/* Department Analytics Drilldown Modal */}
      {selectedDeptForDrilldown && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '680px', padding: 0, overflow: 'hidden' }}>
            <div style={{ background: '#0f172a', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Department Analytics & Workforce Compliance
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedDeptForDrilldown.department} Department Drilldown</h2>
              </div>
              <button onClick={() => setSelectedDeptForDrilldown(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.4rem', borderRadius: '50%', color: 'white', cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Top Stats Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                {(() => {
                  const deptEmployees = MOCK_USERS_DATABASE.filter(u => u.department === selectedDeptForDrilldown.department);
                  const overdueCount = deptEmployees.filter(emp => emp.id === 'EMP1003' || emp.id === 'EMP1004').length;
                  return (
                    <>
                      <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Headcount</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>{deptEmployees.length} Employees</div>
                      </div>
                      <div style={{ background: '#f0f9ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                        <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 700 }}>Active Courses</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7', marginTop: '0.1rem' }}>{selectedDeptForDrilldown.activeCoursesCount || 8} Courses</div>
                      </div>
                      <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>Completion Rate</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a', marginTop: '0.1rem' }}>{selectedDeptForDrilldown.rate || selectedDeptForDrilldown.completionRate}%</div>
                      </div>
                      <div style={{ background: '#fff1f2', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                        <div style={{ fontSize: '0.72rem', color: '#be123c', fontWeight: 700 }}>Overdue / Warning</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e11d48', marginTop: '0.1rem' }}>{overdueCount} Employees</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Employee Roster List */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                  Department Employee Compliance Roster
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>ID & Name</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Designation</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Assigned</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Completed</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_USERS_DATABASE.filter(u => u.department === selectedDeptForDrilldown.department).map(emp => {
                      const isOverdue = emp.id === 'EMP1003' || emp.id === 'EMP1004';
                      const assignedCount = 4;
                      const completedCount = isOverdue ? 1 : 3;
                      return (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9', background: isOverdue ? '#fff1f2' : 'white' }}>
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#0f172a' }}>
                            {emp.name} <span style={{ color: '#64748b', fontWeight: 500 }}>({emp.id})</span>
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>{emp.designation}</td>
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>{assignedCount}</td>
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#16a34a' }}>{completedCount}</td>
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <span style={{ background: isOverdue ? '#ffe4e6' : '#dcfce7', color: isOverdue ? '#be123c' : '#166534', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                              {isOverdue ? 'Action Overdue' : 'Compliant'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <button className="btn-secondary" onClick={() => setSelectedDeptForDrilldown(null)}>
                  Close
                </button>
                <button
                  className="btn-primary"
                  style={{ background: '#9333ea' }}
                  onClick={() => {
                    setSelectedDeptForDrilldown(null);
                    setShowAssignmentModal(true);
                  }}
                >
                  Assign Department Training
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
