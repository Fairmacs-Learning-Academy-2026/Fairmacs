import React, { useState } from 'react';
import { Users, AlertCircle, CheckCircle2, Send, ShieldAlert, FileSpreadsheet, BarChart2, TrendingUp, Clock, Search, ShieldCheck } from 'lucide-react';
import { MOCK_TEAM_MEMBERS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useEnrollmentStore } from '../stores/enrollmentStore';

export default function ManagerDashboard({ onOpenVerifiedCertificate }) {
  const { user } = useAuth();
  const { verifyCertificate, verifiedCertificate, verifiedCertificateError } = useEnrollmentStore();
  const [team, setTeam] = useState(MOCK_TEAM_MEMBERS);
  const [sentReminders, setSentReminders] = useState({});
  const [certInput, setCertInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleSendReminder = (id) => {
    setSentReminders(prev => ({ ...prev, [id]: true }));
  };

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
        verifiedByName: user?.name || user?.employeeName || 'Manager',
        verifiedByRole: user?.role,
        verifiedByRoleLabel: 'Manager',
        verifiedAt: today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      };
      onOpenVerifiedCertificate?.(result.certificate, verificationData);
    }
  };

  const compliantCount = team.filter(t => t.complianceStatus === 'Compliant').length;
  const complianceRate = Math.round((compliantCount / team.length) * 100);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Manager Header */}
      <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0f172a 100%)', padding: '2rem', borderRadius: '16px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Managerial Team Supervision
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.2rem' }}>Welcome, Rahul Menon (Manager)</h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Direct team training visibility, mandatory course compliance, overdue alerts, and performance metrics.
          </p>
        </div>

        <button className="btn-secondary" onClick={() => alert('Exporting team performance summary to CSV...')} style={{ background: 'white', color: '#0f172a' }}>
          <FileSpreadsheet style={{ width: 16, height: 16 }} /> Export Team Summary
        </button>
      </div>

      {/* Certificate Verification Widget */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem 1.5rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
          <div style={{ background: '#f0fdf4', width: 38, height: 38, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck style={{ width: 20, height: 20, color: '#16a34a' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Verify Team Certificate</h2>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>Enter the unique credential ID to validate a team member's issued certificate.</div>
          </div>
        </div>
        <form onSubmit={handleVerifyCertificate} style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="e.g. FM-CERT-2026-1234"
            value={certInput}
            onChange={(e) => setCertInput(e.target.value)}
            style={{ flex: 1, minWidth: 240, padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', outline: 'none' }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={verifying || !certInput.trim()}
            style={{ background: verifying ? '#64748b' : 'linear-gradient(135deg, #0284c7, #0369a1)', gap: '0.4rem', display: 'flex', alignItems: 'center' }}
          >
            <Search style={{ width: 15, height: 15 }} />
            {verifying ? 'Verifying…' : 'Verify Credential'}
          </button>
        </form>
        {verifiedCertificateError && (
          <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertCircle style={{ width: 15, height: 15 }} />
            {verifiedCertificateError}
          </div>
        )}
      </div>

      {/* Metrics Row: Team members, Completion, Mandatory training, Overdue */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 0 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Users style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">{team.length}</div>
            <div className="stat-label">Direct Team Members</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle2 style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">{complianceRate}%</div>
            <div className="stat-label">Training Completion</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <TrendingUp style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">100%</div>
            <div className="stat-label">Mandatory Compliance</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ffe4e6', color: '#e11d48' }}>
            <ShieldAlert style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">2</div>
            <div className="stat-label">Overdue / Action Needed</div>
          </div>
        </div>
      </div>

      {/* Main Layout: Left Roster | Right Department Stats & Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Team Members Roster & Status */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Direct Team Roster & Compliance</h2>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Operations Department • Chennai HQ & Mumbai Branch</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Employee Name & Designation</th>
                <th style={{ padding: '0.75rem 1rem' }}>Assigned</th>
                <th style={{ padding: '0.75rem 1rem' }}>Completed</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Manager Action</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => {
                const isCompliant = member.complianceStatus === 'Compliant';
                const isOverdue = member.complianceStatus.includes('Overdue');

                return (
                  <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{member.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{member.designation} ({member.id})</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{member.assigned} Modules</td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#16a34a' }}>{member.completed} Modules</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: isCompliant ? '#dcfce7' : isOverdue ? '#ffe4e6' : '#fef3c7',
                        color: isCompliant ? '#15803d' : isOverdue ? '#be123c' : '#b45309'
                      }}>
                        {member.complianceStatus}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {!isCompliant ? (
                        <button
                          className="btn-primary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: sentReminders[member.id] ? '#64748b' : undefined }}
                          disabled={sentReminders[member.id]}
                          onClick={() => handleSendReminder(member.id)}
                        >
                          <Send style={{ width: 14, height: 14 }} />
                          {sentReminders[member.id] ? 'Reminder Sent' : 'Nudge Employee'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>Up to date ✓</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Side: Department Stats & Team Performance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Department Statistics Panel */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 800, fontSize: '0.98rem' }}>
              <BarChart2 style={{ width: 18, height: 18, color: '#0284c7' }} /> Operations Department Stats
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                  <span>Air Freight SOP Pass Rate</span>
                  <span>92%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: 8, marginTop: '0.35rem' }}>
                  <div className="progress-bar-fill" style={{ width: '92%' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                  <span>Customs Documentation Compliance</span>
                  <span>88%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: 8, marginTop: '0.35rem' }}>
                  <div className="progress-bar-fill" style={{ width: '88%' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                  <span>Mandatory Cybersecurity Certs</span>
                  <span>100%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: 8, marginTop: '0.35rem' }}>
                  <div className="progress-bar-fill" style={{ width: '100%', background: '#10b981' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
