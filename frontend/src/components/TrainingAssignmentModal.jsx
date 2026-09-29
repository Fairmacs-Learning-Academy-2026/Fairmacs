import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Calendar, Send, ShieldCheck, Users, Building2 } from 'lucide-react';
import { COURSES } from '../data/mockData';

export default function TrainingAssignmentModal({ onClose, onAssignSuccess }) {
  const [courseId, setCourseId] = useState('CUS-301');
  const [assignTargetType, setAssignTargetType] = useState('DEPARTMENT'); // 'EMPLOYEE' | 'DEPARTMENT' | 'ROLE' | 'ALL'
  const [targetDept, setTargetDept] = useState('Documentation');
  const [dueDate, setDueDate] = useState('2026-09-30');
  const [trainingType, setTrainingType] = useState('MANDATORY'); // 'MANDATORY' | 'RECOMMENDED'
  const [submitted, setSubmitted] = useState(false);

  const selectedCourse = COURSES.find(c => c.id === courseId) || COURSES[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      if (onAssignSuccess) onAssignSuccess();
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '600px', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#0f172a', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '1px' }}>
              HR Enterprise Training Suite
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Create Training Assignment</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: '0.4rem', borderRadius: '50%', color: 'white', cursor: 'pointer' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Body Form */}
        <div style={{ padding: '1.75rem' }}>
          {!submitted ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Select Course Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Select Course *
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  style={{ width: '100%', padding: '0.7rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}
                >
                  {COURSES.map(c => (
                    <option key={c.id} value={c.id}>{c.title} ({c.id})</option>
                  ))}
                </select>
              </div>

              {/* Assign To Radio Options: Employee | Department | Role | Entire Organization */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                  Assign To Target *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                  {[
                    { id: 'DEPARTMENT', label: 'Department' },
                    { id: 'EMPLOYEE', label: 'Individual Employee' },
                    { id: 'ROLE', label: 'System Role' },
                    { id: 'ALL', label: 'Entire Organization' }
                  ].map(item => (
                    <label
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        border: assignTargetType === item.id ? '2px solid #9333ea' : '1px solid #cbd5e1',
                        background: assignTargetType === item.id ? '#f3e8ff' : '#f8fafc',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: assignTargetType === item.id ? 700 : 500,
                        color: assignTargetType === item.id ? '#7e22ce' : '#334155'
                      }}
                    >
                      <input
                        type="radio"
                        name="assignTarget"
                        checked={assignTargetType === item.id}
                        onChange={() => setAssignTargetType(item.id)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Target Department Selection */}
              {assignTargetType === 'DEPARTMENT' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Select Target Department *
                  </label>
                  <select
                    value={targetDept}
                    onChange={(e) => setTargetDept(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  >
                    <option value="Documentation">Documentation (24 Employees)</option>
                    <option value="Accounts">Accounts (18 Employees)</option>
                    <option value="Operations">Operations (42 Employees)</option>
                    <option value="Sales">Sales & BD (16 Employees)</option>
                    <option value="HR">HR (8 Employees)</option>
                    <option value="IT">IT (10 Employees)</option>
                  </select>
                </div>
              )}

              {/* Due Date & Training Type Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Compliance Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Training Requirement Type *
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 700, color: '#e11d48', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="tType"
                        checked={trainingType === 'MANDATORY'}
                        onChange={() => setTrainingType('MANDATORY')}
                      />
                      Mandatory
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 700, color: '#0284c7', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="tType"
                        checked={trainingType === 'RECOMMENDED'}
                        onChange={() => setTrainingType('RECOMMENDED')}
                      />
                      Recommended
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview Box */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#475569' }}>
                <strong>Summary:</strong> Assigning <strong>{selectedCourse.title}</strong> as <strong>{trainingType}</strong> training to <strong>{assignTargetType === 'DEPARTMENT' ? `${targetDept} Department` : assignTargetType}</strong> due by <strong>{dueDate}</strong>. In-app notifications will be dispatched automatically.
              </div>

              {/* Submit CTA */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #9333ea, #7e22ce)', padding: '0.65rem 1.5rem', fontSize: '0.92rem' }}>
                  <Send style={{ width: 16, height: 16 }} /> Assign Training & Notify
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ width: 64, height: 64, background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CheckCircle2 style={{ width: 40, height: 40 }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Training Successfully Assigned!</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.4rem' }}>
                In-app notifications and email alerts have been broadcast to all target learners.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
