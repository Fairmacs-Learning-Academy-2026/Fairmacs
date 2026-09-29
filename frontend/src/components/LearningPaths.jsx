import React, { useState } from 'react';
import { Compass, CheckCircle2, Shield, ArrowRight, Building2, BookOpen, Layers, Edit, Eye, Users, Settings } from 'lucide-react';
import { MOCK_LEARNING_PATHS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function LearningPaths() {
  const { user } = useAuth();
  const isHR = user?.role === 'HR_ADMIN' || user?.role === 'MANAGER';
  const [selectedPath, setSelectedPath] = useState(null);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '1.75rem 2rem', borderRadius: '14px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Enterprise Career Development Tracks
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>Departmental Learning Paths</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Structured learning tracks automatically assigned upon employee department onboarding.
          </p>
        </div>
        {isHR && (
          <button className="btn-primary" style={{ background: '#9333ea', padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}>
            <Settings style={{ width: 16, height: 16 }} /> Manage Path Rules
          </button>
        )}
      </div>

      {/* Learning Path Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {MOCK_LEARNING_PATHS.map((path) => {
          const isMandatory = path.type === 'Mandatory';

          return (
            <div
              key={path.id}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #e2e8f0',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Building2 style={{ width: 13, height: 13 }} /> {path.department}
                  </span>

                  <span style={{
                    background: isMandatory ? '#ffe4e6' : '#fef3c7',
                    color: isMandatory ? '#be123c' : '#b45309',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px'
                  }}>
                    {path.type}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
                  {path.title}
                </h3>

                <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  {path.description}
                </p>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <BookOpen style={{ width: 14, height: 14, color: '#0284c7' }} /> Curriculum Modules ({path.courseCount} Courses)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {path.courseIds.map(cId => (
                      <span key={cId} style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                        {cId}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle2 style={{ width: 14, height: 14 }} /> Auto-Assigned on Employee Onboarding
                </div>
                {isHR && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setSelectedPath(path)}>
                      <Eye style={{ width: 14, height: 14 }} /> View
                    </button>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: '#f3e8ff', color: '#7e22ce' }}>
                      <Edit style={{ width: 14, height: 14 }} /> Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
