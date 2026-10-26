import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon, Clock, MapPin, User, Plus, X, ChevronLeft,
  ChevronRight, AlertCircle, RefreshCw, Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');

const EMPTY_EVENT = {
  title: '',
  date: '',
  time: '',
  trainer: '',
  department: 'Operations',
  targetType: 'ALL',
  targetUserIds: [],
  location: '',
  type: 'Workshop'
};

function getToken() {
  return localStorage.getItem('fairmacs_token') || localStorage.getItem('fairmacs_lms_token');
}

function toIsoDate(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function normalizeEvent(event, index = 0) {
  const date = toIsoDate(event.date ?? event.eventDate ?? event.startDate ?? event.scheduledAt);
  return {
    ...event,
    id: event.id ?? event.eventId ?? event.sessionId ?? `event-${index}`,
    title: event.title ?? event.name ?? event.sessionTitle ?? 'Untitled session',
    date,
    time: event.time ?? event.timeRange ?? event.startTime ?? '',
    trainer: event.trainer ?? event.trainerName ?? event.facilitator ?? '',
    department: event.department ?? event.departmentName ?? event.targetDepartment ?? (event.targetType === 'ALL' ? 'All Employees' : event.targetType === 'EMPLOYEES' ? 'Selected Employees' : 'All Departments'),
    location: event.location ?? event.venue ?? event.meetingLink ?? '',
    type: event.type ?? event.eventType ?? event.sessionType ?? 'Workshop'
  };
}

function formatMonth(date) {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function sameMonth(dateString, year, month) {
  if (!dateString) return false;
  const date = new Date(`${dateString}T00:00:00`);
  return date.getFullYear() === year && date.getMonth() === month;
}

const panelStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: '1.25rem',
  border: '1px solid #e2e8f0',
  boxShadow: 'var(--shadow-sm)'
};

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.8rem',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: '0.88rem',
  boxSizing: 'border-box'
};

export default function TrainingCalendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newEvent, setNewEvent] = useState(EMPTY_EVENT);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const isManagement = ['HR_ADMIN', 'TRAINER', 'MANAGER'].includes(user?.role);

  // Escape closes the topmost calendar modal. Keep the schedule form open
  // while a save request is in progress to avoid accidental data loss.
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      if (showScheduleModal) {
        if (!saving) setShowScheduleModal(false);
        return;
      }
      if (selectedDate) setSelectedDate('');
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showScheduleModal, selectedDate, saving]);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/training-calendar/employees`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Could not load employees (${response.status}).`);
      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setSaveError(loadError.message || 'Unable to load employees.');
    } finally { setEmployeesLoading(false); }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/training-calendar`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json'
        }
      });
      if (response.status === 404 || response.status === 405) {
        throw new Error('The training calendar API is not available yet. Connect a backend endpoint to load and save sessions.');
      }
      if (!response.ok) throw new Error(`Could not load training calendar (${response.status}).`);
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : (payload.content ?? payload.events ?? payload.sessions ?? payload.data ?? []);
      if (!Array.isArray(items)) throw new Error('The training calendar API returned an unsupported response format.');
      setEvents(items.map(normalizeEvent).filter((event) => event.date));
    } catch (loadError) {
      setError(loadError.message || 'Unable to load training sessions.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const monthYear = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
  const paddingDays = new Date(monthYear, monthIndex, 1).getDay();
  const today = new Date();
  const todayString = toIsoDate(today);

  const monthEvents = useMemo(
    () => events.filter((event) => sameMonth(event.date, monthYear, monthIndex)).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [events, monthYear, monthIndex]
  );

  const handleAddEvent = async (event) => {
    event.preventDefault();
    if (!newEvent.title.trim() || !newEvent.date) return;
    if (newEvent.targetType === 'EMPLOYEES' && newEvent.targetUserIds.length === 0) { setSaveError('Select at least one employee.'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/training-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: newEvent.title.trim(),
          date: newEvent.date,
          time: newEvent.time.trim(),
          trainer: newEvent.trainer.trim(),
          department: newEvent.targetType === 'DEPARTMENT' ? newEvent.department : null,
          targetType: newEvent.targetType,
          targetUserIds: newEvent.targetType === 'EMPLOYEES' ? newEvent.targetUserIds : [],
          location: newEvent.location.trim(),
          type: newEvent.type
        })
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(response.status === 404 || response.status === 405
          ? 'The training calendar create API is not available yet.'
          : `Could not publish session (${response.status})${detail ? `: ${detail.slice(0, 180)}` : ''}`);
      }
      setShowScheduleModal(false);
      setNewEvent(EMPTY_EVENT);
      await loadEvents();
    } catch (saveError) {
      setSaveError(saveError.message || 'Unable to publish this session.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (showScheduleModal && newEvent.targetType === 'EMPLOYEES' && employees.length === 0) loadEmployees();
  }, [showScheduleModal, newEvent.targetType, employees.length, loadEmployees]);

  const moveMonth = (amount) => setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0f172a 100%)',
        padding: '1.75rem 2rem', borderRadius: 14, color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '1rem', flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            Corporate Learning Schedule
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>Training Calendar</h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            View scheduled training sessions and deadlines from the LMS.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button onClick={loadEvents} disabled={loading} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0.65rem 0.9rem',
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.35)',
            background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer'
          }}><RefreshCw size={16} /> Refresh</button>
          {isManagement && <button className="btn-primary" onClick={() => { setSaveError(''); setShowScheduleModal(true); }} style={{ background: '#fff', color: '#0f172a', fontWeight: 700, padding: '0.65rem 1.1rem' }}><Plus size={17} /> Schedule Session</button>}
        </div>
      </section>

      {loading && <div style={{ ...panelStyle, color: '#64748b' }}>Loading training calendar…</div>}
      {error && <div role="alert" style={{ ...panelStyle, background: '#fff1f2', borderColor: '#fecdd3', color: '#be123c', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}><span><AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />{error}</span><button onClick={loadEvents} style={{ ...inputStyle, width: 'auto', cursor: 'pointer', background: '#fff' }}>Retry</button></div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)', gap: '1.25rem', alignItems: 'start' }}>
        <section style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarIcon size={20} color="#0284c7" /> {formatMonth(currentMonth)}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button aria-label="Previous month" onClick={() => moveMonth(-1)} style={{ ...inputStyle, width: 'auto', padding: '0.4rem 0.55rem', cursor: 'pointer', background: '#fff' }}><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))} style={{ ...inputStyle, width: 'auto', padding: '0.4rem 0.7rem', cursor: 'pointer', background: '#fff' }}>Today</button>
              <button aria-label="Next month" onClick={() => moveMonth(1)} style={{ ...inputStyle, width: 'auto', padding: '0.4rem 0.55rem', cursor: 'pointer', background: '#fff' }}><ChevronRight size={16} /></button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', textAlign: 'center', fontWeight: 700, fontSize: '0.78rem', color: '#64748b', marginBottom: '0.5rem' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} style={{ padding: '0.35rem 0' }}>{day}</div>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.35rem' }}>
            {Array.from({ length: paddingDays }, (_, index) => <div key={`pad-${index}`} aria-hidden="true" style={{ minHeight: 78, background: '#f8fafc', borderRadius: 8 }} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const date = `${monthYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = monthEvents.filter((item) => item.date === date);
              const isToday = date === todayString;
              const isSelected = selectedDate === date;
              return (
                <button key={date} type="button" onClick={() => setSelectedDate(date)} aria-label={`View sessions for ${date}`} style={{
                  minHeight: 92, minWidth: 0, textAlign: 'left', background: isSelected ? '#eff6ff' : isToday ? '#f0f9ff' : '#fff',
                  border: isSelected ? '2px solid #0284c7' : isToday ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  borderRadius: 8, padding: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', cursor: 'pointer', font: 'inherit', overflow: 'hidden'
                }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isToday ? '#0284c7' : '#0f172a' }}>{day}</div>
                  {dayEvents.slice(0, 3).map((item) => {
                    const isAssessment = item.type?.toLowerCase().includes('assessment');
                    const isDeadline = item.type?.toLowerCase().includes('deadline');
                    return <div key={item.id} title={`${item.title}${item.time ? ` (${item.time})` : ''}`} style={{
                      fontSize: '0.67rem', fontWeight: 700, padding: '0.15rem 0.25rem', borderRadius: 4,
                      background: isAssessment ? '#ffe4e6' : isDeadline ? '#fef3c7' : '#e0f2fe',
                      color: isAssessment ? '#be123c' : isDeadline ? '#b45309' : '#0369a1',
                      textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'
                    }}>{item.title}</div>;
                  })}
                  {dayEvents.length > 3 && <span style={{ fontSize: '0.65rem', color: '#64748b' }}>+{dayEvents.length - 3} more</span>}
                </button>
              );
            })}
          </div>
          <p style={{ marginTop: '0.75rem', color: '#64748b', fontSize: '0.75rem' }}>Select any date to expand its session details.</p>
        </section>

        <aside style={{ ...panelStyle, padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Sessions & Deadlines</h3>
          {monthEvents.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: 680, overflowY: 'auto' }}>
              {monthEvents.map((item) => (
                <article key={item.id} style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: 10, border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '0.15rem 0.45rem', borderRadius: 4 }}>{item.type}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textAlign: 'right' }}>{new Date(`${item.date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: 8, marginBottom: 8 }}>{item.title}</h4>
                  <div style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {item.time && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} color="#0284c7" />{item.time}</div>}
                    {item.trainer && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><User size={12} color="#64748b" />{item.trainer}</div>}
                    {item.location && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}><MapPin size={12} color="#16a34a" />{item.location}</div>}
                    {item.department && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Department: {item.department}</div>}
                  </div>
                </article>
              ))}
            </div>
          ) : <div style={{ padding: '2rem 0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}><CalendarIcon size={30} style={{ margin: '0 auto 0.6rem', opacity: 0.45 }} /><strong style={{ display: 'block', color: '#475569' }}>{loading ? 'Loading sessions…' : 'No scheduled sessions'}</strong><span style={{ display: 'block', marginTop: 4 }}>{error ? 'Resolve the calendar API error to view sessions.' : 'There are no events in this month.'}</span></div>}
        </aside>
      </div>

      {selectedDate && (
        <div className="modal-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelectedDate(''); }}>
          <div className="modal-content animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="day-details-title" style={{ maxWidth: 560, width: 'min(560px, calc(100vw - 2rem))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div><h3 id="day-details-title" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3><p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 4 }}>Training sessions scheduled for this date</p></div>
              <button aria-label="Close day details" onClick={() => setSelectedDate('')} style={{ background: '#f1f5f9', border: 0, padding: '0.4rem', borderRadius: '50%', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {events.filter((item) => item.date === selectedDate).length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '55vh', overflowY: 'auto' }}>
                {events.filter((item) => item.date === selectedDate).map((item) => (
                  <article key={item.id} style={{ padding: '0.9rem', border: '1px solid #dbeafe', borderLeft: '4px solid #0284c7', borderRadius: 10, background: '#f8fbff' }}>
                    <strong style={{ display: 'block', color: '#0f172a', marginBottom: 8 }}>{item.title}</strong>
                    {item.time && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '0.84rem', marginBottom: 5 }}><Clock size={14} />{item.time}</div>}
                    {item.trainer && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '0.84rem', marginBottom: 5 }}><User size={14} />{item.trainer}</div>}
                    {item.location && <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: '0.84rem', marginBottom: 5 }}><MapPin size={14} />{item.location}</div>}
                    <span style={{ display: 'inline-block', marginTop: 4, padding: '3px 7px', borderRadius: 5, background: '#e0f2fe', color: '#0369a1', fontSize: '0.72rem', fontWeight: 700 }}>{item.type}{item.department ? ` · ${item.department}` : ''}</span>
                  </article>
                ))}
              </div>
            ) : <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', color: '#64748b' }}><CalendarIcon size={28} style={{ margin: '0 auto 0.6rem' }} /><strong style={{ display: 'block', color: '#334155' }}>No sessions scheduled</strong><span style={{ display: 'block', fontSize: '0.84rem', marginTop: 4 }}>There are no training sessions for this date.</span></div>}
            {isManagement && <button type="button" onClick={() => { setNewEvent({ ...EMPTY_EVENT, date: selectedDate }); setSaveError(''); setSelectedDate(''); setShowScheduleModal(true); }} style={{ marginTop: '1rem', padding: '0.65rem 0.9rem', border: 0, borderRadius: 8, background: '#0284c7', color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={16} /> Schedule on this date</button>}
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="modal-overlay" role="presentation" onClick={(event) => { if (event.target === event.currentTarget && !saving) setShowScheduleModal(false); }}>
          <div className="modal-content animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="schedule-title" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem', gap: '1rem' }}>
              <div><h3 id="schedule-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Schedule Training Session</h3><p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 3 }}>Publish a session to the shared training calendar.</p></div>
              <button aria-label="Close schedule modal" disabled={saving} onClick={() => setShowScheduleModal(false)} style={{ background: '#f1f5f9', border: 0, padding: '0.4rem', borderRadius: '50%', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div><label htmlFor="event-title" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>Session Title *</label><input id="event-title" required value={newEvent.title} onChange={(event) => setNewEvent({ ...newEvent, title: event.target.value })} style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div><label htmlFor="event-date" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>Event Date *</label><input id="event-date" type="date" required value={newEvent.date} onChange={(event) => setNewEvent({ ...newEvent, date: event.target.value })} style={inputStyle} /></div>
                <div><label htmlFor="event-time" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>Time Range</label><input id="event-time" value={newEvent.time} onChange={(event) => setNewEvent({ ...newEvent, time: event.target.value })} placeholder="e.g. 10:00 AM - 12:00 PM" style={inputStyle} /></div>
              </div>
              <div><label htmlFor="event-audience" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>Who should attend? *</label><select id="event-audience" value={newEvent.targetType} onChange={(event) => setNewEvent({ ...newEvent, targetType: event.target.value, targetUserIds: [] })} style={inputStyle}><option value="ALL">All employees</option><option value="DEPARTMENT">A department</option><option value="EMPLOYEES">Selected employees</option></select></div>
              {newEvent.targetType === 'DEPARTMENT' && <div><label htmlFor="event-department" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>Target Department *</label><select id="event-department" required value={newEvent.department} onChange={(event) => setNewEvent({ ...newEvent, department: event.target.value })} style={inputStyle}>{['Operations', 'Documentation', 'Pricing', 'Sales', 'Accounts', 'Human Resource', 'IT & Technology', 'Management & Leadership'].map((department) => <option key={department} value={department}>{department}</option>)}</select></div>}
              {newEvent.targetType === 'EMPLOYEES' && <div><label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>Select Employees * {employeesLoading ? '(loading…)' : ''}</label><div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: 8, padding: 8 }}>{employees.map((employee) => <label key={employee.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px', fontSize: '0.84rem' }}><input type="checkbox" checked={newEvent.targetUserIds.includes(employee.id)} onChange={(event) => setNewEvent({ ...newEvent, targetUserIds: event.target.checked ? [...newEvent.targetUserIds, employee.id] : newEvent.targetUserIds.filter((id) => id !== employee.id) })} /> <span>{employee.name} {employee.employeeId ? `(${employee.employeeId})` : ''} {employee.department ? `— ${employee.department}` : ''}</span></label>)}{!employeesLoading && employees.length === 0 && <span style={{ color: '#64748b', fontSize: '0.82rem' }}>No employees available.</span>}</div></div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div><label htmlFor="event-trainer" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>Trainer / Facilitator</label><input id="event-trainer" value={newEvent.trainer} onChange={(event) => setNewEvent({ ...newEvent, trainer: event.target.value })} style={inputStyle} /></div>
              </div>
              <div><label htmlFor="event-type" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>Event Type</label><select id="event-type" value={newEvent.type} onChange={(event) => setNewEvent({ ...newEvent, type: event.target.value })} style={inputStyle}>{['Workshop', 'Training', 'Assessment', 'Deadline', 'Webinar'].map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
              <div><label htmlFor="event-location" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>Location / Meeting Link</label><input id="event-location" value={newEvent.location} onChange={(event) => setNewEvent({ ...newEvent, location: event.target.value })} style={inputStyle} /></div>
              {saveError && <div role="alert" style={{ padding: '0.7rem 0.85rem', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', borderRadius: 8, fontSize: '0.82rem' }}><AlertCircle size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />{saveError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: 5 }}>
                <button type="button" className="btn-secondary" disabled={saving} onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving} style={{ background: '#0284c7' }}><Plus size={15} />{saving ? 'Publishing…' : 'Publish to Calendar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
