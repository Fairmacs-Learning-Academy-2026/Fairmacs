import React from 'react';
import { BookOpen, Award, Clock, AlertTriangle, CheckCircle2, PlayCircle, ArrowRight } from 'lucide-react';
import { COURSES, MOCK_USER_PROGRESS } from '../data/mockData';

export default function EmployeeDashboard({ onSelectCourse, onOpenCertificates, setActiveTab }) {
  const userProgress = MOCK_USER_PROGRESS.emp01 || {};

  // Calculate learner stats
  const enrolledCourses = COURSES.filter(c => userProgress[c.id]);
  const completedCourses = COURSES.filter(c => userProgress[c.id]?.status === 'Completed');
  const mandatoryCourses = COURSES.filter(c => c.mandatoryFor.includes('Operations') || c.mandatoryFor.includes('All Roles'));

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', padding: '2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            <Clock style={{ width: 14, height: 14 }} /> Welcome back, Employee 1!
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Your Learning Dashboard</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '600px' }}>
            Track your assigned freight forwarding modules, complete mandatory compliance courses, and access your certified credentials.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setActiveTab('catalog')}>
          Explore Course Catalog <ArrowRight style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Metric Cards */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 0 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <BookOpen />
          </div>
          <div>
            <div className="stat-val">{enrolledCourses.length}</div>
            <div className="stat-label">Active Courses</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle2 />
          </div>
          <div>
            <div className="stat-val">{completedCourses.length}</div>
            <div className="stat-label">Completed Modules</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Award />
          </div>
          <div>
            <div className="stat-val">2</div>
            <div className="stat-label">Verified Certificates</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
            <Clock />
          </div>
          <div>
            <div className="stat-val">12.5 hrs</div>
            <div className="stat-label">Training Hours Logged</div>
          </div>
        </div>
      </div>

      {/* Pending Mandatory Alert */}
      <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#ffe4e6', color: '#e11d48', padding: '0.75rem', borderRadius: '10px' }}>
            <AlertTriangle style={{ width: 24, height: 24 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#9f1239', fontSize: '0.95rem' }}>Mandatory Compliance Requirement</div>
            <div style={{ fontSize: '0.85rem', color: '#be123c', marginTop: '0.1rem' }}>
              <strong>LFF-101: Freight Forwarding Fundamentals</strong> must be completed by September 30, 2026.
            </div>
          </div>
        </div>
        <button 
          className="btn-primary" 
          style={{ background: '#e11d48', whiteSpace: 'nowrap' }}
          onClick={() => onSelectCourse(COURSES.find(c => c.id === 'LFF-101'))}
        >
          Resume Course
        </button>
      </div>

      {/* In Progress Courses */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>My In-Progress Training</h2>
          <button style={{ color: '#0284c7', fontSize: '0.85rem', fontWeight: 600, background: 'none' }} onClick={() => setActiveTab('catalog')}>
            View All Courses
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {COURSES.map((course) => {
            const progress = userProgress[course.id];
            const isCompleted = progress?.status === 'Completed';
            const percent = progress?.progressPercent || 0;

            return (
              <div key={course.id} className="course-card">
                <img src={course.banner} alt={course.title} className="course-banner" />
                <div className="course-card-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="course-category-badge">{course.category}</span>
                    {course.mandatoryFor.includes('Operations') && (
                      <span className="badge-mandatory">Mandatory</span>
                    )}
                  </div>
                  <h3 className="course-title">{course.title}</h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4, marginBottom: '1rem' }}>
                    {course.description}
                  </p>

                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>
                      <span>Progress</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
                    </div>

                    <button
                      className="btn-primary"
                      style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
                      onClick={() => onSelectCourse(course)}
                    >
                      <PlayCircle style={{ width: 16, height: 16 }} />
                      {isCompleted ? 'Review Material' : percent > 0 ? 'Continue Lesson' : 'Start Course'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
