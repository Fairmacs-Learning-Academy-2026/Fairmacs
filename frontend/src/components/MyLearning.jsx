import React, { useState } from 'react';
import { BookOpen, CheckCircle2, PlayCircle, Clock, Award, AlertTriangle, Calendar, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { COURSES, MOCK_USER_PROGRESS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function MyLearning({ onSelectCourse, onOpenCertificates, onOpenCourseDetails }) {
  const { user } = useAuth();
  const [activeTabFilter, setActiveTabFilter] = useState('ALL'); // 'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CERTIFIED' | 'OVERDUE' | 'EXPIRING_SOON'

  const userProgress = MOCK_USER_PROGRESS[user?.id] || MOCK_USER_PROGRESS['EMP1001'] || {};

  // Compute 4-tier lifecycle status for each course
  const courseListWithStatus = COURSES.map((course) => {
    const prog = userProgress[course.id];
    let status = 'NOT STARTED';
    let progressPercent = 0;
    let isCertified = false;
    let isExpiringSoon = false;

    if (prog?.status === 'Completed') {
      status = 'COMPLETED';
      isCertified = true;
      progressPercent = 100;
      // Check if certificate is expiring soon (within 30 days)
      if (prog.completedDate && prog.certId) {
        const completedDate = new Date(prog.completedDate);
        const expiryDate = new Date(completedDate.setFullYear(completedDate.getFullYear() + 1)); // 1 year validity
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          isExpiringSoon = true;
        }
      }
    } else if (prog?.status === 'In Progress' || (prog?.progressPercent > 0 && prog?.progressPercent < 100)) {
      status = 'IN PROGRESS';
      progressPercent = prog.progressPercent || 48;
    } else if (course.id === 'AFO-201') {
      status = 'OVERDUE';
      progressPercent = 15;
    } else if (course.id === 'SEC-101') {
      status = 'EXPIRING SOON';
      progressPercent = 0;
    }

    const isMandatory = course.mandatoryFor?.includes('Operations') || course.mandatoryFor?.includes('All Roles') || course.mandatoryFor?.includes('Documentation');

    return {
      ...course,
      status,
      progressPercent,
      isCertified,
      isMandatory,
      isExpiringSoon,
      deadline: course.deadline || '30 Sep 2026'
    };
  });

  // Filter based on active tab
  const filteredCourses = courseListWithStatus.filter((c) => {
    if (activeTabFilter === 'NOT_STARTED') return c.status === 'NOT STARTED';
    if (activeTabFilter === 'IN_PROGRESS') return c.status === 'IN PROGRESS';
    if (activeTabFilter === 'COMPLETED') return c.status === 'COMPLETED' || c.isCertified;
    if (activeTabFilter === 'OVERDUE') return c.status === 'OVERDUE';
    if (activeTabFilter === 'EXPIRING_SOON') return c.isExpiringSoon || c.status === 'EXPIRING SOON';
    return true; // 'ALL'
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Learner Progression Lifecycle
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>My Learning & Progress Hub</h1>
        </div>

        <button className="btn-secondary" onClick={onOpenCertificates} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontWeight: 700 }}>
          <Award style={{ width: 16, height: 16 }} /> My Digital Certificates (2)
        </button>
      </div>

      {/* Filter Tabs Bar: All | Not Started | In Progress | Completed & Certified | Overdue | Expiring Soon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Trackers', count: courseListWithStatus.length },
            { id: 'NOT_STARTED', label: 'Not Started', count: courseListWithStatus.filter(c => c.status === 'NOT STARTED').length },
            { id: 'IN_PROGRESS', label: 'In Progress', count: courseListWithStatus.filter(c => c.status === 'IN PROGRESS').length },
            { id: 'COMPLETED', label: 'Completed & Certified', count: courseListWithStatus.filter(c => c.status === 'COMPLETED').length },
            { id: 'OVERDUE', label: 'Overdue', count: courseListWithStatus.filter(c => c.status === 'OVERDUE').length },
            { id: 'EXPIRING_SOON', label: 'Expiring Soon', count: courseListWithStatus.filter(c => c.isExpiringSoon || c.status === 'EXPIRING SOON').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabFilter(tab.id)}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeTabFilter === tab.id
                  ? (tab.id === 'OVERDUE' ? '#e11d48' : tab.id === 'COMPLETED' ? '#16a34a' : tab.id === 'EXPIRING_SOON' ? '#f59e0b' : '#0f172a')
                  : '#f1f5f9',
                color: activeTabFilter === tab.id ? 'white' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
          Showing {filteredCourses.length} Courses
        </div>
      </div>

      {/* Course Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {filteredCourses.map((course) => {
          const isCompleted = course.status === 'COMPLETED';
          const isOverdue = course.status === 'OVERDUE';
          const isInProgress = course.status === 'IN PROGRESS';
          const isExpiringSoon = course.isExpiringSoon || course.status === 'EXPIRING SOON';

          return (
            <div key={course.id} className="course-card">
              <div style={{ position: 'relative' }}>
                <img src={course.banner} alt={course.title} className="course-banner" />

                {/* Progression Lifecycle Badge Top Right */}
                <span style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: isCompleted ? '#16a34a' : isOverdue ? '#e11d48' : isExpiringSoon ? '#f59e0b' : isInProgress ? '#0284c7' : '#64748b',
                  color: 'white',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }}>
                  {isCompleted ? <CheckCircle2 style={{ width: 13, height: 13 }} /> : isOverdue ? <AlertTriangle style={{ width: 13, height: 13 }} /> : isExpiringSoon ? <AlertTriangle style={{ width: 13, height: 13 }} /> : <Clock style={{ width: 13, height: 13 }} />}
                  {isCompleted ? 'CERTIFIED' : isExpiringSoon ? 'EXPIRING SOON' : course.status}
                </span>

                <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(15,23,42,0.85)', color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  {course.id}
                </span>
              </div>

              <div className="course-card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="course-category-badge">{course.category}</span>

                  {/* Mandatory vs Optional Badge */}
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    background: course.isMandatory ? '#ffe4e6' : '#f0fdf4',
                    color: course.isMandatory ? '#be123c' : '#166534'
                  }}>
                    {course.isMandatory ? 'Mandatory Track' : 'Optional SOP'}
                  </span>
                </div>

                <h3 className="course-title" style={{ marginTop: '0.4rem', cursor: 'pointer' }} onClick={() => onOpenCourseDetails(course)}>
                  {course.title}
                </h3>

                <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4, marginBottom: '0.85rem' }}>
                  {course.description}
                </p>

                {/* Deadline Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: isOverdue || isExpiringSoon ? '#e11d48' : '#475569', fontWeight: 600, marginBottom: '0.85rem' }}>
                  <Calendar style={{ width: 13, height: 13 }} />
                  <span>Deadline: <strong>{isExpiringSoon ? 'Expires in 15 days' : course.deadline}</strong></span>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>
                    <span>{isCompleted ? 'Final Assessment Score' : 'Progress'}</span>
                    <span>{isCompleted ? '90% Passed' : `${course.progressPercent}%`}</span>
                  </div>

                  <div className="progress-bar-bg" style={{ height: 8, marginTop: '0.35rem' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${course.progressPercent}%`,
                        background: isCompleted
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : isOverdue
                            ? 'linear-gradient(90deg, #f43f5e, #fb7185)'
                            : isExpiringSoon
                              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                              : 'linear-gradient(90deg, #0284c7, #38bdf8)'
                      }}
                    ></div>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      className="btn-primary"
                      style={{
                        flex: 1,
                        justify: 'center',
                        fontSize: '0.82rem',
                        background: isCompleted ? '#10b981' : isOverdue ? '#e11d48' : isExpiringSoon ? '#f59e0b' : undefined
                      }}
                      onClick={() => onSelectCourse(course)}
                    >
                      <PlayCircle style={{ width: 15, height: 15 }} />
                      {isCompleted ? 'Review Materials' : isInProgress ? 'Resume Learning' : isExpiringSoon ? 'Renew Certification' : 'Start Course'}
                    </button>

                    <button
                      className="btn-secondary"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem' }}
                      onClick={() => onOpenCourseDetails(course)}
                      title="View Overview"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
