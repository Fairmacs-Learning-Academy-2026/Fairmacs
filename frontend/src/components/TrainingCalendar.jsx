import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, Plus, X, Video, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { MOCK_CALENDAR_EVENTS, COURSES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

export default function TrainingCalendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState(MOCK_CALENDAR_EVENTS);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: 'Customs Valuation & Bill of Entry Session',
    date: '2026-09-29',
    time: '10:00 AM - 12:00 PM',
    trainer: 'Priya Nair (Instructor)',
    department: 'Documentation & Accounts',
    location: 'Chennai HQ Training Hall / Teams Link',
    type: 'Workshop'
  });

  const isManagement = user?.role === 'HR_ADMIN' || user?.role === 'TRAINER' || user?.role === 'MANAGER';

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    const dayNum = new Date(newEvent.date).getDate().toString();
    setEvents([
      {
        id: `cal-${Date.now()}`,
        dayNumber: dayNum,
        ...newEvent
      },
      ...events
    ]);
    setShowScheduleModal(false);
  };

  // Days in Sept 2026 (30 days, starting on Wednesday)
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);
  const paddingDays = [0, 1]; // Offset for Sept 1 2026 (Tuesday)

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0f172a 100%)', padding: '1.75rem 2rem', borderRadius: '14px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Corporate Learning Schedule & Live Workshops
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.2rem' }}>Training Calendar — September 2026</h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Schedule of live instructor sessions, department SOP workshops, and assessment deadlines.
          </p>
        </div>

        {isManagement && (
          <button
            className="btn-primary"
            onClick={() => setShowScheduleModal(true)}
            style={{ background: 'white', color: '#0f172a', fontWeight: 700, padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
          >
            <Plus style={{ width: 18, height: 18 }} /> Schedule Session
          </button>
        )}
      </div>

      {/* Main Layout: Month Grid + Event List */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Left Side: Month Grid */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon style={{ width: 20, height: 20, color: '#0284c7' }} /> September 2026
            </h2>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem' }}><ChevronLeft style={{ width: 16, height: 16 }} /></button>
              <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem' }}><ChevronRight style={{ width: 16, height: 16 }} /></button>
            </div>
          </div>

          {/* Days Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Day Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
            {paddingDays.map(p => (
              <div key={p} style={{ minHeight: '80px', background: '#f8fafc', borderRadius: '8px', opacity: 0.4 }}></div>
            ))}

            {daysInMonth.map((day) => {
              const dayStr = day.toString().padStart(2, '0');
              const hasEvents = events.filter(e => e.dayNumber === day.toString() || e.date.endsWith(`-${dayStr}`));
              const isToday = day === 21;

              return (
                <div
                  key={day}
                  style={{
                    minHeight: '82px',
                    background: isToday ? '#f0f9ff' : 'white',
                    border: isToday ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between'
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isToday ? '#0284c7' : '#0f172a' }}>
                    {day}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {hasEvents.map(ev => (
                      <div
                        key={ev.id}
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.35rem',
                          borderRadius: '4px',
                          background: ev.type === 'Assessment' ? '#ffe4e6' : ev.type === 'Deadline' ? '#fef3c7' : '#e0f2fe',
                          color: ev.type === 'Assessment' ? '#be123c' : ev.type === 'Deadline' ? '#b45309' : '#0369a1',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}
                        title={`${ev.title} (${ev.time})`}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Scheduled Event Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
              Scheduled Sessions & Deadlines
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {events.map((ev) => (
                <div key={ev.id} style={{ background: '#f8fafc', padding: '0.9rem', borderRadius: '10px', borderLeft: '4px solid #0284c7', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      {ev.type}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{ev.date}</span>
                  </div>

                  <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: '0.4rem', marginBottom: '0.3rem' }}>
                    {ev.title}
                  </h4>

                  <div style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock style={{ width: 12, height: 12, color: '#0284c7' }} /> {ev.time}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <User style={{ width: 12, height: 12, color: '#64748b' }} /> {ev.trainer}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin style={{ width: 12, height: 12, color: '#16a34a' }} /> {ev.location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Training Session Modal */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Schedule Training Session</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Configure live workshop, clinic, or assessment deadline</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem', borderRadius: '50%', color: '#64748b', cursor: 'pointer' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>Session Title *</label>
                <input
                  type="text"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>Event Date *</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>Time Range *</label>
                  <input
                    type="text"
                    required
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>Trainer / Facilitator</label>
                  <input
                    type="text"
                    value={newEvent.trainer}
                    onChange={(e) => setNewEvent({ ...newEvent, trainer: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>Target Department</label>
                  <select
                    value={newEvent.department}
                    onChange={(e) => setNewEvent({ ...newEvent, department: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="Documentation">Documentation</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales & BD</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>Location / Teams Link</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Publish to Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
