import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, AlertCircle, CheckCircle2, FileSpreadsheet, BarChart2,
  TrendingUp, Search, ShieldCheck, RefreshCw, BookOpen,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEnrollmentStore } from '../stores/enrollmentStore';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');

function getToken() {
  return localStorage.getItem('fairmacs_token') ||
    localStorage.getItem('fairmacs_lms_token') || '';
}

async function apiGet(path) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
      // Keep the HTTP status message when the response is not JSON.
    }
    throw new Error(message);
  }
  return response.json();
}

const styles = {
  panel: {
    background: 'rgba(255, 255, 255, 0.78)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    padding: '1.35rem',
    boxShadow: '0 8px 30px rgba(31, 70, 120, 0.06)'
  },
  muted: { color: '#64748b', fontSize: '.82rem' },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '.45rem',
    border: '1px solid rgba(255, 255, 255, 0.85)',
    borderRadius: 10,
    background: 'rgba(255, 255, 255, 0.75)',
    color: '#102A43',
    padding: '.55rem .85rem',
    fontSize: '.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 2px 8px rgba(31, 70, 120, 0.05)',
    transition: 'all 0.18s ease'
  }
};

function statusStyle(status) {
  const value = String(status || '').toUpperCase();
  if (value === 'COMPLIANT' || value === 'COMPLETED') {
    return { background: '#dcfce7', color: '#15803d' };
  }
  if (value === 'ACTION NEEDED' || value.includes('OVERDUE')) {
    return { background: '#ffe4e6', color: '#be123c' };
  }
  if (value === 'NO TRAINING') {
    return { background: '#f1f5f9', color: '#475569' };
  }
  return { background: '#fef3c7', color: '#92400e' };
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
  const { user } = useAuth();
  const {
    verifyCertificate,
    verifiedCertificateError
  } = useEnrollmentStore();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const filteredTeam = useMemo(() => {
    const query = search.trim().toLowerCase();
    let rows = team.filter(member => {
      const matchesSearch = !query || [
        member.name, member.employeeId, member.designation, member.status
      ].some(value => String(value || '').toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'ALL' ||
        String(member.status || '').toUpperCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
    if (sortProgress === 'high') rows = [...rows].sort((a, b) => (b.progress || 0) - (a.progress || 0));
    if (sortProgress === 'low') rows = [...rows].sort((a, b) => (a.progress || 0) - (b.progress || 0));
    return rows;
  }, [team, search, statusFilter, sortProgress]);

  const exportCsv = () => {
    if (!team.length) return;
    const rows = [
      ['Employee ID', 'Employee Name', 'Designation', 'Assigned Courses', 'Completed Courses', 'Progress (%)', 'Status'],
      ...team.map(member => [
        member.employeeId, member.name, member.designation,
        member.assigned, member.completed, member.progress, member.status
      ])
    ];
    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
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

  const handleVerifyCertificate = async event => {
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

  const openTranscript = async member => {
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
      icon: Users, color: '#0284c7', background: '#e0f2fe'
    },
    {
      label: 'Overall Completion',
      value: report ? `${report.overallCompletion ?? 0}%` : '—',
      icon: CheckCircle2, color: '#16a34a', background: '#dcfce7'
    },
    {
      label: 'Mandatory Compliance',
      value: report ? `${report.mandatoryCompliance ?? 0}%` : '—',
      icon: TrendingUp, color: '#d97706', background: '#fef3c7'
    },
    {
      label: 'Assessment Performance',
      value: report ? `${report.assessmentPerformance ?? 0}%` : '—',
      icon: ShieldCheck, color: '#7c3aed', background: '#ede9fe'
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
      <section style={{
        background: 'linear-gradient(135deg, rgba(16, 42, 67, 0.95) 0%, rgba(11, 31, 56, 0.92) 50%, rgba(2, 132, 199, 0.90) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 16px 38px rgba(11, 31, 56, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        padding: '1.75rem 2rem', borderRadius: 20, color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '1rem', flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: '.78rem', color: '#7dd3fc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Managerial Team Supervision
          </div>
          <h1 style={{ fontSize: 'clamp(1.35rem, 2vw, 1.8rem)', fontWeight: 800, margin: '.35rem 0' }}>
            Welcome, {managerName}
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '.9rem', margin: 0, maxWidth: 680 }}>
            Monitor team training progress, mandatory learning compliance and assessment performance using live KMS records.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={exportCsv} disabled={!team.length}
            style={{ ...styles.button, background: '#fff', color: '#0f172a', opacity: team.length ? 1 : .6 }}>
            <FileSpreadsheet size={16} /> Export CSV
          </button>
        </div>
      </section>

      <section style={styles.panel}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.9rem' }}>
          <div style={{ background: '#f0fdf4', width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center' }}>
            <ShieldCheck size={20} color="#16a34a" />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Verify Team Certificate</h2>
            <p style={{ ...styles.muted, margin: '.2rem 0 0' }}>Enter the credential ID to validate an issued certificate.</p>
          </div>
        </div>
        <form onSubmit={handleVerifyCertificate} style={{ display: 'flex', gap: '.65rem', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Enter certificate credential ID" value={certInput}
            onChange={event => { setCertInput(event.target.value); setVerifyError(''); }}
            aria-label="Certificate credential ID"
            style={{ flex: '1 1 260px', minWidth: 0, padding: '.7rem .85rem', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '.88rem' }} />
          <button type="submit" className="btn-primary" disabled={verifying || !certInput.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: '#0284c7' }}>
            <Search size={15} /> {verifying ? 'Verifying…' : 'Verify Credential'}
          </button>
        </form>
        {(verifyError || verifiedCertificateError) && (
          <div role="alert" style={{ marginTop: '.75rem', padding: '.7rem .85rem', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: 8, fontSize: '.82rem', display: 'flex', gap: '.45rem', alignItems: 'center' }}>
            <AlertCircle size={15} /> {verifyError || verifiedCertificateError}
          </div>
        )}
      </section>

      {loadError && (
        <div role="alert" style={{ ...styles.panel, background: '#fff7ed', borderColor: '#fed7aa', color: '#9a3412', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><AlertCircle size={17} /> {loadError}</span>
          <button type="button" onClick={() => loadReport()} style={styles.button}>Retry</button>
        </div>
      )}

      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', marginTop: 0 }}>
        {statCards.map(({ label, value, icon: Icon, color, background }) => (
          <div className="stat-card" key={label}>
            <div className="stat-icon" style={{ background, color }}><Icon size={20} /></div>
            <div><div className="stat-val">{loading ? '—' : value}</div><div className="stat-label">{label}</div></div>
          </div>
        ))}
      </div>

      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Team Training & Compliance</h2>
            <p style={{ ...styles.muted, margin: '.3rem 0 0' }}>
              {loading ? 'Loading team report…' : `${team.length} employee${team.length === 1 ? '' : 's'} returned by the manager report API`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '.55rem', flexWrap: 'wrap' }}>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search employees…"
              aria-label="Search team members"
              style={{ ...styles.button, fontWeight: 400, textAlign: 'left', minWidth: 190 }} />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter by status"
              style={{ ...styles.button }}>
              <option value="ALL">All statuses</option>
              <option value="COMPLIANT">Compliant</option>
              <option value="ON TRACK">On track</option>
              <option value="ACTION NEEDED">Action needed</option>
              <option value="NO TRAINING">No training</option>
            </select>
            <button type="button" onClick={() => setSortProgress(value => value === 'none' ? 'high' : value === 'high' ? 'low' : 'none')} style={styles.button}>
              Progress {sortProgress === 'high' ? <ChevronDown size={14} /> : sortProgress === 'low' ? <ChevronUp size={14} /> : null}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw size={22} className="animate-spin" style={{ marginBottom: '.6rem' }} />
            <div>Loading live team report…</div>
          </div>
        ) : !loadError && filteredTeam.length === 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <Users size={28} style={{ marginBottom: '.6rem', color: '#94a3b8' }} />
            <div style={{ fontWeight: 700, color: '#334155' }}>{team.length ? 'No employees match your filters' : 'No team members found'}</div>
            <p style={{ ...styles.muted, margin: '.35rem 0 0' }}>{team.length ? 'Try a different search or status filter.' : 'The API returned no employees for this manager’s department.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 760 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '.74rem', color: '#64748b', textTransform: 'uppercase' }}>
                  <th style={{ padding: '.8rem' }}>Employee</th>
                  <th style={{ padding: '.8rem' }}>Assigned</th>
                  <th style={{ padding: '.8rem' }}>Completed</th>
                  <th style={{ padding: '.8rem', minWidth: 150 }}>Progress</th>
                  <th style={{ padding: '.8rem' }}>Status</th>
                  <th style={{ padding: '.8rem', textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeam.map(member => (
                  <tr key={member.userId} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '.86rem' }}>
                    <td style={{ padding: '.95rem .8rem' }}>
                      <div style={{ fontWeight: 750, color: '#0f172a' }}>{member.name || 'Unnamed employee'}</div>
                      <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: 3 }}>
                        {[member.designation, member.employeeId].filter(Boolean).join(' · ') || 'Employee details unavailable'}
                      </div>
                    </td>
                    <td style={{ padding: '.95rem .8rem', fontWeight: 650 }}>{member.assigned ?? 0}</td>
                    <td style={{ padding: '.95rem .8rem', fontWeight: 650, color: '#15803d' }}>{member.completed ?? 0}</td>
                    <td style={{ padding: '.95rem .8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
                        <div style={{ height: 7, background: '#e2e8f0', borderRadius: 99, flex: 1, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, Number(member.progress) || 0))}%`, background: '#0284c7', borderRadius: 99 }} />
                        </div>
                        <span style={{ minWidth: 35, fontSize: '.78rem', fontWeight: 750 }}>{member.progress ?? 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '.95rem .8rem' }}>
                      <span style={{ ...statusStyle(member.status), padding: '.28rem .55rem', borderRadius: 99, fontSize: '.7rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {String(member.status || 'UNKNOWN').replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '.95rem .8rem', textAlign: 'right' }}>
                      <button type="button" onClick={() => openTranscript(member)} disabled={member.userId == null}
                        style={{ ...styles.button, padding: '.42rem .6rem' }}>
                        <BookOpen size={14} /> Transcript
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </section>

      {selectedEmployee && (
        <div role="dialog" aria-modal="true" aria-label="Employee training transcript"
          onClick={event => { if (event.target === event.currentTarget) setSelectedEmployee(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <section style={{ background: '#fff', borderRadius: 14, width: 'min(900px, 100%)', maxHeight: '85vh', overflow: 'auto', padding: '1.35rem', boxShadow: '0 20px 60px rgba(15,23,42,.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{selectedEmployee.name || 'Employee'} — Training Transcript</h2>
                <p style={{ ...styles.muted, margin: '.3rem 0 0' }}>{selectedEmployee.employeeId || ''} {selectedEmployee.designation ? `· ${selectedEmployee.designation}` : ''}</p>
              </div>
              <button type="button" aria-label="Close transcript" onClick={() => setSelectedEmployee(null)} style={styles.button}><X size={17} /></button>
            </div>
            {transcriptLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}><RefreshCw size={20} className="animate-spin" /> <p>Loading transcript…</p></div>
            ) : transcriptError ? (
              <div role="alert" style={{ padding: '.85rem', background: '#fff1f2', color: '#be123c', borderRadius: 8 }}>{transcriptError}</div>
            ) : transcript ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '.7rem', marginBottom: '1rem' }}>
                  {[
                    ['Total courses', transcript.totalCourses],
                    ['Completed', transcript.completedCourses],
                    ['In progress', transcript.inProgressCourses],
                    ['Not started', transcript.notStartedCourses],
                    ['Certificates', transcript.certificatesIssued],
                    ['Overall progress', `${transcript.overallProgress ?? 0}%`]
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '.75rem' }}>
                      <div style={{ color: '#64748b', fontSize: '.72rem' }}>{label}</div>
                      <div style={{ color: '#0f172a', fontSize: '1.15rem', fontWeight: 800, marginTop: '.25rem' }}>{value ?? 0}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', ...styles.muted, marginBottom: '1rem' }}>
                  <span><strong>Department:</strong> {transcript.department || '—'}</span>
                  <span><strong>Training hours:</strong> {transcript.totalTrainingHours ?? 0}</span>
                  <span><strong>Average score:</strong> {transcript.averageScore ?? 0}%</span>
                </div>
                {(Array.isArray(transcript.courses) && transcript.courses.length > 0) ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                      <thead><tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '.73rem', textTransform: 'uppercase' }}>
                        {['Course', 'Type', 'Status', 'Progress', 'Score', 'Due date'].map(label => <th key={label} style={{ padding: '.7rem', textAlign: 'left' }}>{label}</th>)}
                      </tr></thead>
                      <tbody>{transcript.courses.map((course, index) => (
                        <tr key={course.enrollmentId ?? `${course.courseId}-${index}`} style={{ borderTop: '1px solid #e2e8f0', fontSize: '.82rem' }}>
                          <td style={{ padding: '.75rem' }}><strong>{course.courseTitle || course.courseId || 'Course'}</strong><div style={styles.muted}>{course.courseId || ''}</div></td>
                          <td style={{ padding: '.75rem' }}>{course.enrollmentType || '—'}</td>
                          <td style={{ padding: '.75rem' }}>{String(course.status || '—').replaceAll('_', ' ')}</td>
                          <td style={{ padding: '.75rem' }}>{course.progressPercent ?? 0}%</td>
                          <td style={{ padding: '.75rem' }}>{course.score == null ? '—' : `${course.score}%`}</td>
                          <td style={{ padding: '.75rem' }}>{formatDate(course.dueDate)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p style={styles.muted}>No course records are available for this employee.</p>}
              </>
            ) : <p style={styles.muted}>No transcript data returned.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
