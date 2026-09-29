import React, { useState } from 'react';
import { Building2, Users, BookOpen, CheckCircle2, Zap, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { MOCK_DEPARTMENTS_DATA, DEPARTMENT_LEARNING_PATHS, COURSES } from '../data/mockData';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState(MOCK_DEPARTMENTS_DATA);
  const [triggerStatus, setTriggerStatus] = useState({});

  const handleTriggerAutoAssign = (deptName) => {
    setTriggerStatus(prev => ({ ...prev, [deptName]: true }));
    setTimeout(() => {
      setTriggerStatus(prev => ({ ...prev, [deptName]: 'completed' }));
    }, 800);
  };

  const totalEmployeesCount = departments.reduce((acc, d) => acc + d.employeeCount, 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Banner Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '1.75rem 2rem', borderRadius: '14px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Enterprise Department & Auto-Assignment Governance
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>Department Management Suite</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Manage departmental learning rules, monitor completion rates, and trigger automatic course assignments.
          </p>
        </div>

        <div style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.75rem 1.25rem', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>6 Departments</div>
          <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{totalEmployeesCount} Total Workforce</div>
        </div>
      </div>

      {/* Departments Table */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Fairmacs Departmental Performance & Rules</h2>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.15rem' }}>
              System auto-assigns mandatory learning tracks upon employee creation per department configuration.
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Department</th>
              <th style={{ padding: '0.75rem 1rem' }}>Department Lead</th>
              <th style={{ padding: '0.75rem 1rem' }}>Employees</th>
              <th style={{ padding: '0.75rem 1rem' }}>Mandatory Track Rules</th>
              <th style={{ padding: '0.75rem 1rem' }}>Completion Rate</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Auto-Assignment Action</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => {
              const ruleConfig = DEPARTMENT_LEARNING_PATHS[dept.department] || {};
              const mandatoryNames = ruleConfig.mandatoryCourseIds
                ? ruleConfig.mandatoryCourseIds.map(id => COURSES.find(c => c.id === id)?.title || id).join(', ')
                : 'Orientation & Security';

              const isTriggering = triggerStatus[dept.department] === true;
              const isDone = triggerStatus[dept.department] === 'completed';

              return (
                <tr key={dept.department} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Building2 style={{ width: 16, height: 16, color: '#0284c7' }} />
                      {dept.department}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#475569', fontWeight: 600 }}>{dept.head}</td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: '#0f172a' }}>{dept.employeeCount} Members</td>
                  <td style={{ padding: '1rem', maxWidth: '320px' }}>
                    <div style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={mandatoryNames}>
                      {mandatoryNames}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, marginTop: '0.15rem' }}>
                      ⚡ Auto-Assign Rule Active
                    </div>
                  </td>
                  <td style={{ padding: '1rem', minWidth: '160px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                      <span>Progress</span>
                      <span>{dept.completionRate}%</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: 8, marginTop: '0.3rem' }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${dept.completionRate}%`,
                          background: dept.completionRate > 90 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #0284c7, #38bdf8)'
                        }}
                      ></div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button
                      className="btn-primary"
                      onClick={() => handleTriggerAutoAssign(dept.department)}
                      disabled={isTriggering}
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.78rem',
                        background: isDone ? '#16a34a' : isTriggering ? '#64748b' : 'linear-gradient(135deg, #0284c7, #0369a1)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      {isTriggering ? (
                        <>
                          <RefreshCw style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> Processing...
                        </>
                      ) : isDone ? (
                        <>
                          <CheckCircle2 style={{ width: 14, height: 14 }} /> Auto-Assigned ✓
                        </>
                      ) : (
                        <>
                          <Zap style={{ width: 14, height: 14 }} /> Auto-Assign All
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
