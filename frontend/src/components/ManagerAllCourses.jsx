import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, RefreshCw, Search, Users, CheckCircle2, AlertTriangle } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');
const token = () => localStorage.getItem('fairmacs_token') || localStorage.getItem('token') || '';

function StatCard({ icon: Icon, label, value, tone = 'blue' }) {
  const colors = { blue: ['#eff6ff', '#1d4ed8'], green: ['#f0fdf4', '#15803d'], red: ['#fef2f2', '#b91c1c'] };
  const [bg, fg] = colors[tone] || colors.blue;
  return <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color: fg, display: 'grid', placeItems: 'center' }}><Icon size={21} /></div>
    <div><div style={{ fontSize: 12, color: '#64748b', fontWeight: 650 }}>{label}</div><div style={{ fontSize: 25, color: '#0f172a', fontWeight: 750 }}>{value}</div></div>
  </div>;
}

export default function ManagerAllCourses() {
  const [courses, setCourses] = useState([]);
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('ALL');
  const [trainingType, setTrainingType] = useState('ALL');

  const loadCourses = useCallback(async (refresh = false) => {
    setError('');
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/manager/all-courses`, {
        headers: { Accept: 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }
      });
      if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
      const data = await response.json();
      setDepartment(data.department || '');
      setCourses(Array.isArray(data.courses) ? data.courses : []);
    } catch (err) {
      setError(err.message || 'Unable to load courses. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const filtered = useMemo(() => courses.filter((course) => {
    const q = search.trim().toLowerCase();
    const textMatch = !q || [course.title, course.courseId, course.description, course.category].some(v => String(v || '').toLowerCase().includes(q));
    return textMatch && (level === 'ALL' || String(course.level || '').toUpperCase() === level)
      && (trainingType === 'ALL' || String(course.trainingType || '').toUpperCase() === trainingType);
  }), [courses, search, level, trainingType]);

  const totals = useMemo(() => courses.reduce((a, c) => ({
    assigned: a.assigned + Number(c.assignedCount || 0),
    completed: a.completed + Number(c.completedCount || 0),
    overdue: a.overdue + Number(c.overdueCount || 0)
  }), { assigned: 0, completed: 0, overdue: 0 }), [courses]);

  const selectStyle = { border: '1px solid #cbd5e1', borderRadius: 9, padding: '10px 12px', background: '#fff', color: '#334155', fontSize: 13 };
  return <div style={{ maxWidth: 1400, margin: '0 auto', padding: '8px 4px 32px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
      <div><div style={{ color: '#0284c7', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 8 }}>MANAGER WORKSPACE</div>
        <h1 style={{ margin: 0, color: '#0f172a', fontSize: 28, letterSpacing: '-0.03em' }}>All Courses</h1>
        <p style={{ color: '#64748b', margin: '8px 0 0', fontSize: 14 }}>Published courses assigned to {department || 'your department'} and its subdepartments.</p></div>
      <button type="button" onClick={() => loadCourses(true)} disabled={loading || refreshing} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 10, padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: 8, color: '#334155', fontWeight: 700, cursor: 'pointer' }}><RefreshCw size={16} />{refreshing ? 'Refreshing…' : 'Refresh'}</button>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
      <StatCard icon={BookOpen} label="Courses listed" value={courses.length} />
      <StatCard icon={Users} label="Employee assignments" value={totals.assigned} />
      <StatCard icon={CheckCircle2} label="Completed assignments" value={totals.completed} tone="green" />
      <StatCard icon={AlertTriangle} label="Overdue assignments" value={totals.overdue} tone="red" />
    </div>

    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
      <div style={{ flex: '1 1 260px', position: 'relative' }}><Search size={17} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search course title or ID…" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 9, padding: '10px 12px 10px 38px', background: '#fff', fontSize: 13 }} /></div>
      <select value={level} onChange={e => setLevel(e.target.value)} style={selectStyle} aria-label="Filter by level"><option value="ALL">All levels</option>{['L0','L1','L2','L3','L4'].map(v => <option key={v}>{v}</option>)}</select>
      <select value={trainingType} onChange={e => setTrainingType(e.target.value)} style={selectStyle} aria-label="Filter by assignment type"><option value="ALL">All assignment types</option><option value="MANDATORY">Mandatory</option><option value="RECOMMENDED">Recommended</option></select>
    </div>

    {error && <div role="alert" style={{ padding: 14, marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#991b1b', fontSize: 14 }}>{error}</div>}
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
      {loading ? <div style={{ padding: 42, textAlign: 'center', color: '#64748b' }}>Loading department courses…</div>
        : filtered.length === 0 ? <div style={{ padding: 42, textAlign: 'center' }}><BookOpen size={30} style={{ color: '#94a3b8', marginBottom: 10 }} /><div style={{ color: '#0f172a', fontWeight: 750 }}>No courses found</div><p style={{ color: '#64748b', fontSize: 13 }}>{courses.length ? 'Try changing your search or filters.' : 'No active course assignments were found for your department.'}</p></div>
        : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
          <thead><tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{['Course','Level','Assignment','Assigned','Started','Completed','Overdue'].map(v => <th key={v} style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{v}</th>)}</tr></thead>
          <tbody>{filtered.map(c => <tr key={c.courseId || c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: 16, maxWidth: 360 }}><div style={{ fontWeight: 750, color: '#0f172a', fontSize: 14 }}>{c.title || 'Untitled course'}</div><div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>{c.courseId || '—'}{c.category ? ` · ${c.category}` : ''}</div>{c.description && <div style={{ marginTop: 6, color: '#64748b', fontSize: 12 }}>{c.description}</div>}</td>
            <td style={{ padding: 16 }}><span style={{ padding: '4px 8px', borderRadius: 7, background: '#f1f5f9', color: '#334155', fontSize: 12, fontWeight: 750 }}>{c.level || 'Not set'}</span></td>
            <td style={{ padding: 16 }}><span style={{ padding: '5px 8px', borderRadius: 7, fontSize: 11, fontWeight: 750, background: c.trainingType === 'MANDATORY' ? '#fff7ed' : '#eff6ff', color: c.trainingType === 'MANDATORY' ? '#c2410c' : '#1d4ed8' }}>{c.trainingType === 'MANDATORY' ? 'Mandatory' : c.trainingType === 'RECOMMENDED' ? 'Recommended' : 'Assigned'}</span></td>
            <td style={{ padding: 16, fontWeight: 700 }}>{c.assignedCount ?? 0}</td><td style={{ padding: 16, color: '#0369a1' }}>{c.startedCount ?? 0}</td><td style={{ padding: 16, color: '#15803d' }}>{c.completedCount ?? 0}</td><td style={{ padding: 16, color: Number(c.overdueCount) ? '#b91c1c' : '#64748b', fontWeight: Number(c.overdueCount) ? 750 : 500 }}>{c.overdueCount ?? 0}</td>
          </tr>)}</tbody>
        </table></div>}
    </div>
    <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 12 }}>This page is for department visibility and reporting. Viewing this list does not enroll you or grant lesson access.</p>
  </div>;
}
