import React, { useState } from 'react';
import { BookOpen, Users, FilePlus, Star, CheckCircle2, Calendar, Activity, Plus } from 'lucide-react';
import { COURSES } from '../data/mockData';
import CourseBuilderModal from './CourseBuilderModal';

export default function TrainerDashboard({ onSelectCourse }) {
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [courseList, setCourseList] = useState(COURSES);

  const handlePublishedNewCourse = (newCourse) => {
    setCourseList(prev => [newCourse, ...prev]);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '2rem', borderRadius: '16px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Trainer Portal & Course Builder
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.2rem' }}>Welcome, Priya Nair (Trainer)</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Manage course modules, author quizzes, launch live sessions, and track learner engagement.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setShowBuilderModal(true)}
          style={{ background: 'linear-gradient(135deg, #0284c7, #06b6d4)', padding: '0.75rem 1.25rem', fontSize: '0.92rem' }}
        >
          <Plus style={{ width: 18, height: 18 }} /> Create Course Wizard
        </button>
      </div>

      {/* Trainer Stats: Active courses, Total learners, Completion rate, Avg score */}
      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 0 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <BookOpen style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">{courseList.length}</div>
            <div className="stat-label">Active Authored Courses</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
            <Users style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">1,245</div>
            <div className="stat-label">Total Active Learners</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <CheckCircle2 style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">89.2%</div>
            <div className="stat-label">Course Completion Rate</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Star style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div className="stat-val">91.5%</div>
            <div className="stat-label">Avg Assessment Score</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Authored Courses Table | Right: Upcoming Sessions & Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Left Side Table */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
            Authored Courses & Catalog Status
          </h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Course ID & Title</th>
                <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                <th style={{ padding: '0.75rem 1rem' }}>Enrolled</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courseList.map((course) => (
                <tr key={course.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{course.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {course.id} • {course.duration}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {course.category}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{course.enrolledCount || 120} Learners</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                      Published
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => onSelectCourse(course)}>
                      Edit Content
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Side: Upcoming Sessions & Learner Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Upcoming Sessions Panel */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 800, fontSize: '0.98rem' }}>
              <Calendar style={{ width: 18, height: 18, color: '#0284c7' }} /> Upcoming Live Sessions
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: '#f0f9ff', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #0284c7' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0369a1' }}>Air Cargo HAWB Live Clinic</div>
                <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.2rem' }}>Tomorrow, 2:00 PM • 45 Attendees registered</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #64748b' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>Customs Hold Q&A Session</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Friday, 11:00 AM • Chennai Branch</div>
              </div>
            </div>
          </div>

          {/* Recent Learner Activity */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 800, fontSize: '0.98rem' }}>
              <Activity style={{ width: 18, height: 18, color: '#16a34a' }} /> Recent Learner Activity
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ fontSize: '0.82rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Arjun Kumar passed Freight Exam</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Score: 92% • 10 mins ago</div>
              </div>

              <div style={{ fontSize: '0.82rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Kavita Sharma completed Air Cargo SOP</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Score: 88% • 1 hour ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Builder Modal */}
      {showBuilderModal && (
        <CourseBuilderModal
          onClose={() => setShowBuilderModal(false)}
          onPublish={handlePublishedNewCourse}
        />
      )}
    </div>
  );
}
