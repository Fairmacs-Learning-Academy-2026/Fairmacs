import React from 'react';
import {
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  PlayCircle,
  ArrowRight,
  ShieldCheck,
  Compass,
  Sparkles,
  Calendar,
  Bell,
  Building2,
  Briefcase,
  RefreshCw,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { courseService } from '../services/courseService';
import { useAuth } from '../context/AuthContext';

const panelStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '1.25rem',
  border: '1px solid #e2e8f0',
  boxShadow: 'var(--shadow-sm)'
};

const mutedStyle = { color: '#64748b', fontSize: '.82rem' };

function normalizeCourse(course, index = 0) {
  return {
    ...course,
    _key: course?.dbId ?? course?.courseDatabaseId ?? course?.id ?? course?.courseId ?? index,
    title: course?.title ?? course?.courseTitle ?? 'Untitled Course',
    id: course?.id ?? course?.courseId ?? course?.courseCode ?? '',
    progressPercent: Number(course?.progressPercent ?? course?.progress ?? 0),
    status: String(course?.enrollmentStatus ?? course?.status ?? '').toUpperCase(),
    duration: course?.duration ?? course?.durationHours
      ? (course?.duration ?? `${course.durationHours} hours`)
      : 'Self-paced'
  };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Overview({
  onSelectCourse,
  onOpenCertificates,
  setActiveTab,
  onOpenCourseDetails
}) {
  const { user } = useAuth();
  const [dashboard, setDashboard] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState('');

  const loadDashboard = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await courseService.getLearningDashboard();
      if (!data) {
        setDashboard(null);
        setError('Unable to load your learning dashboard. Please retry.');
        return;
      }
      setDashboard(data);
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load your learning dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const initialLoad = async () => {
      if (!mounted) return;
      await loadDashboard();
    };

    const handleEnrollmentUpdated = () => {
      loadDashboard(true);
    };

    initialLoad();
    window.addEventListener('lms:enrollment-updated', handleEnrollmentUpdated);

    return () => {
      mounted = false;
      window.removeEventListener('lms:enrollment-updated', handleEnrollmentUpdated);
    };
  }, [loadDashboard]);

  const userName = user?.name || user?.employeeName || dashboard?.name || user?.fullName || 'there';
  const userDept = dashboard?.department || user?.department || '';
  const userDesig = dashboard?.designation || user?.designation || '';
  const branch = dashboard?.branch || user?.branch || '';

  const enrolledCourses = React.useMemo(
    () => (Array.isArray(dashboard?.enrolled) ? dashboard.enrolled : []).map(normalizeCourse),
    [dashboard]
  );
  const recommendedCourses = React.useMemo(
    () => (Array.isArray(dashboard?.recommended) ? dashboard.recommended : []).map(normalizeCourse),
    [dashboard]
  );

  const completedCourses = Number(dashboard?.completedCourses ?? 0);
  const inProgressCourses = Number(dashboard?.inProgress ?? enrolledCourses.filter(course => course.status !== 'COMPLETED').length);
  const certificates = Number(dashboard?.certificates ?? 0);
  const learningHours = dashboard?.learningHours ?? '—';

  const continueLearningCourses = enrolledCourses.filter(course => course.status !== 'COMPLETED');

  const dueCourses = enrolledCourses
    .filter(course => course.dueDate && course.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4);

  const recentCourses = [...enrolledCourses]
    .filter(course => course.lastAccessed || course.completedDate || course.updatedAt || course.enrolledAt)
    .sort((a, b) => {
      const dateA = new Date(a.lastAccessed || a.completedDate || a.updatedAt || a.enrolledAt || 0).getTime();
      const dateB = new Date(b.lastAccessed || b.completedDate || b.updatedAt || b.enrolledAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 4);

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '.75rem' }} />
        <div>Loading your learning dashboard…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in" style={{ ...panelStyle, padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={30} color="#dc2626" style={{ marginBottom: '.6rem' }} />
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 .4rem' }}>
          Dashboard unavailable
        </h2>
        <p role="alert" style={{ color: '#b91c1c', fontSize: '.88rem', margin: '0 0 1rem' }}>{error}</p>
        <button type="button" className="btn-primary" onClick={() => loadDashboard()} style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}>
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    );
  }

  const metricCards = [
    { label: 'Enrolled Courses', value: enrolledCourses.length, Icon: BookOpen, color: '#0284c7', background: '#e0f2fe' },
    { label: 'In Progress', value: inProgressCourses, Icon: Clock, color: '#d97706', background: '#fef3c7' },
    { label: 'Completed', value: completedCourses, Icon: CheckCircle2, color: '#16a34a', background: '#dcfce7' },
    { label: 'Learning Hours', value: learningHours, Icon: Clock, color: '#9333ea', background: '#f3e8ff' },
    { label: 'Certificates Earned', value: certificates, Icon: Award, color: '#e11d48', background: '#ffe4e6', action: onOpenCertificates }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
      <section style={{
        background: 'linear-gradient(135deg, #0b1f38 0%, #0c2340 50%, #1e3a5f 100%)',
        borderRadius: 16, padding: 'clamp(1.25rem, 3vw, 2.25rem)', color: '#fff',
        boxShadow: '0 10px 25px rgba(11, 31, 56, .2)', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap'
      }}>
        <div style={{ maxWidth: 700 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '.5rem',
            background: 'rgba(56,189,248,.15)', color: '#38bdf8',
            padding: '.35rem .85rem', borderRadius: 20, fontSize: '.78rem',
            fontWeight: 750, marginBottom: '.85rem'
          }}>
            <Sparkles size={15} /> Fairmacs Employee Learning Hub
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 800, margin: '0 0 .55rem', letterSpacing: '-.3px' }}>
            Welcome back, {userName}!
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '.9rem', lineHeight: 1.6, margin: '0 0 1.1rem' }}>
            Pick up where you left off, explore available courses, and track your learning progress.
          </p>
          <div style={{ display: 'flex', gap: '.65rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
            {userDesig && (
              <span style={{ background: 'rgba(255,255,255,.12)', color: '#bae6fd', padding: '.3rem .7rem', borderRadius: 6, fontSize: '.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
                <Briefcase size={14} /> {userDesig}
              </span>
            )}
            {userDept && (
              <span style={{ background: 'rgba(255,255,255,.12)', color: '#a7f3d0', padding: '.3rem .7rem', borderRadius: 6, fontSize: '.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
                <Building2 size={14} /> {userDept}
              </span>
            )}
            {branch && <span style={{ color: '#cbd5e1', fontSize: '.8rem' }}>{branch}</span>}
          </div>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={() => setActiveTab?.('catalog')}
              style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', padding: '.65rem 1.1rem', fontSize: '.88rem', display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}>
              <Compass size={16} /> Explore Courses
            </button>
            <button type="button" className="btn-secondary" onClick={() => setActiveTab?.('mylearning')}
              style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', padding: '.65rem 1.1rem', fontSize: '.88rem', display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}>
              <BookOpen size={16} /> My Learning
            </button>
            <button type="button" onClick={() => loadDashboard(true)} disabled={refreshing}
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.3)', borderRadius: 8, padding: '.65rem .85rem', display: 'inline-flex', alignItems: 'center', gap: '.45rem', cursor: 'pointer' }}>
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      <section className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', marginTop: 0, gap: '1rem' }}>
        {metricCards.map(({ label, value, Icon, color, background, action }) => (
          <div className="stat-card" key={label} style={{ minWidth: 0 }}>
            <div className="stat-icon" style={{ background, color, cursor: action ? 'pointer' : 'default' }} onClick={action}>
              <Icon size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="stat-val">{value}</div>
              <div className="stat-label">{label}</div>
              {action && <button type="button" onClick={action} style={{ marginTop: '.35rem', border: 0, padding: 0, background: 'none', color: '#0284c7', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700 }}>View certificates</button>}
            </div>
          </div>
        ))}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>
          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Continue Learning</h2>
                <p style={{ ...mutedStyle, margin: '.25rem 0 0' }}>Your active courses</p>
              </div>
              {continueLearningCourses.length > 0 && <span className="badge-mandatory">{continueLearningCourses.length} active</span>}
            </div>
            {continueLearningCourses.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem' }}>
                {continueLearningCourses.map(course => {
                  const progress = Math.min(100, Math.max(0, course.progressPercent || 0));
                  return (
                    <article key={course._key} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem', display: 'flex', gap: '.9rem', alignItems: 'center', background: '#f8fafc', minWidth: 0 }}>
                      {course.banner ? (
                        <img src={course.banner} alt={course.title} style={{ width: 100, height: 78, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 78, height: 78, borderRadius: 8, background: '#e0f2fe', display: 'grid', placeItems: 'center', color: '#0284c7', flexShrink: 0 }}>
                          <BookOpen size={27} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.7rem', fontWeight: 750, color: '#0284c7', marginBottom: '.2rem' }}>
                          {course.id || 'COURSE'}{course.category ? ` · ${course.category}` : ''}
                        </div>
                        <h3 title={course.title} style={{ fontSize: '.93rem', fontWeight: 800, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.74rem', fontWeight: 700, color: '#475569', marginTop: '.55rem' }}>
                          <span>Progress</span><span>{progress}%</span>
                        </div>
                        <div className="progress-bar-bg" style={{ height: 6, marginTop: '.3rem', marginBottom: '.65rem' }}>
                          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <button type="button" className="btn-primary" onClick={() => onSelectCourse?.(course)}
                          style={{ padding: '.42rem .75rem', fontSize: '.76rem', display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
                          <PlayCircle size={14} /> {progress > 0 ? 'Resume' : 'Start Course'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: 10, padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
                <PlayCircle size={36} color="#94a3b8" style={{ marginBottom: '.6rem' }} />
                <div style={{ fontWeight: 750, color: '#334155', marginBottom: '.3rem' }}>No active courses</div>
                <p style={{ fontSize: '.84rem', margin: '0 0 .9rem' }}>Courses assigned to you will appear here.</p>
                <button type="button" className="btn-primary" onClick={() => setActiveTab?.('catalog')} style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
                  Browse Courses <ArrowRight size={15} />
                </button>
              </div>
            )}
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', marginBottom: '.85rem' }}>
              <div>
                <h2 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Recommended Courses</h2>
                <p style={{ ...mutedStyle, margin: '.25rem 0 0' }}>{userDept ? `Suggestions for ${userDept}` : 'Suggestions for you'}</p>
              </div>
              <button type="button" onClick={() => setActiveTab?.('catalog')} style={{ color: '#0284c7', fontSize: '.82rem', fontWeight: 750, background: 'none', border: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                View catalog →
              </button>
            </div>
            {recommendedCourses.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: '1rem' }}>
                {recommendedCourses.slice(0, 3).map(course => (
                  <article key={course._key} className="course-card">
                    {course.banner && <img src={course.banner} alt={course.title} className="course-banner" />}
                    <div className="course-card-content">
                      {course.category && <span className="course-category-badge">{course.category}</span>}
                      <h3 className="course-title" style={{ fontSize: '.95rem' }}>{course.title}</h3>
                      <div style={{ fontSize: '.78rem', color: '#64748b', margin: '.5rem 0 1rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                        <Clock size={13} /> {course.duration || 'Self-paced'}
                      </div>
                      <button type="button" className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '.82rem', padding: '.5rem' }} onClick={() => onSelectCourse?.(course)}>
                        <PlayCircle size={15} /> View Course
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div style={{ ...panelStyle, borderStyle: 'dashed', boxShadow: 'none', textAlign: 'center', color: '#64748b', padding: '1.8rem 1rem' }}>
                <GraduationCap size={30} color="#94a3b8" style={{ marginBottom: '.5rem' }} />
                <div style={{ fontWeight: 750, color: '#334155' }}>No recommendations available</div>
                <p style={{ fontSize: '.84rem', margin: '.35rem 0 0' }}>There are no recommended courses in the dashboard response right now.</p>
              </div>
            )}
          </section>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 }}>
          <section style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 800, fontSize: '.98rem' }}>
              <ShieldCheck size={18} color="#0284c7" /> Learning Overview
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem' }}>
                <span style={{ ...mutedStyle, color: '#334155' }}>Enrolled</span><strong>{enrolledCourses.length}</strong>
              </div>
              <div style={{ height: 7, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${enrolledCourses.length ? Math.min(100, completedCourses / enrolledCourses.length * 100) : 0}%`, background: '#16a34a' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem' }}>
                <span style={{ ...mutedStyle, color: '#334155' }}>Completed courses</span><strong>{completedCourses}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem' }}>
                <span style={{ ...mutedStyle, color: '#334155' }}>In progress</span><strong>{inProgressCourses}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem' }}>
                <span style={{ ...mutedStyle, color: '#334155' }}>Certificates earned</span><strong>{certificates}</strong>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setActiveTab?.('mylearning')} style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '.4rem', marginTop: '.2rem' }}>
                Open My Learning <ArrowRight size={15} />
              </button>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 800, fontSize: '.98rem' }}>
              <Calendar size={18} color="#0284c7" /> Upcoming Due Dates
            </div>
            {dueCourses.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
                {dueCourses.map(course => (
                  <div key={course._key} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '.8rem' }}>
                    <div style={{ fontSize: '.83rem', fontWeight: 800, color: '#0f172a' }}>{course.title}</div>
                    <div style={{ fontSize: '.74rem', color: '#64748b', marginTop: '.3rem' }}>Due {formatDate(course.dueDate)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '.83rem', lineHeight: 1.6 }}>
                {enrolledCourses.length
                  ? 'No due dates are available for your active courses.'
                  : 'Due dates will appear here when course assignments include them.'}
              </div>
            )}
          </section>

          <section style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 800, fontSize: '.98rem' }}>
              <Bell size={18} color="#16a34a" /> Recent Learning
            </div>
            {recentCourses.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
                {recentCourses.map(course => {
                  const dateValue = course.lastAccessed || course.completedDate || course.updatedAt || course.enrolledAt;
                  return (
                    <div key={course._key} style={{ display: 'flex', gap: '.65rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: course.status === 'COMPLETED' ? '#dcfce7' : '#e0f2fe', color: course.status === 'COMPLETED' ? '#16a34a' : '#0284c7', display: 'grid', placeItems: 'center' }}>
                        {course.status === 'COMPLETED' ? <Award size={15} /> : <CheckCircle2 size={15} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '.82rem', fontWeight: 750, color: '#0f172a' }}>{course.title}</div>
                        <div style={{ fontSize: '.72rem', color: '#64748b', marginTop: '.2rem' }}>
                          {course.status === 'COMPLETED' ? 'Completed' : 'Learning activity'}{dateValue ? ` · ${formatDate(dateValue)}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '.83rem', lineHeight: 1.6 }}>
                Recent course activity will appear here when the dashboard response includes course activity dates.
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
