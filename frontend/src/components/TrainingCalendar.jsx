import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Video,
  BookOpen,
  FileCheck,
  Award,
  Filter,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Layers,
  CalendarCheck,
  List,
  Grid,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  calendarService,
  EVENT_TYPES,
  EVENT_STATUSES,
  toIsoDate,
  getTodayIso,
  parseLocalDate,
} from '../services/calendarService';

const EMPTY_EVENT = {
  title: '',
  date: '',
  time: '',
  trainer: '',
  department: 'Operations',
  targetType: 'ALL',
  targetUserIds: [],
  location: '',
  type: 'Workshop',
};

const panelStyle = {
  background: 'rgba(255, 255, 255, 0.85)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: '16px',
  padding: '1.35rem',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  boxShadow: '0 8px 30px rgba(31, 70, 120, 0.06)',
};

const inputStyle = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: 10,
  border: '1px solid rgba(203, 213, 225, 0.85)',
  background: 'rgba(255, 255, 255, 0.9)',
  fontSize: '0.88rem',
  boxSizing: 'border-box',
  outline: 'none',
};

export default function TrainingCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View state: 'month' | 'week' | 'agenda'
  const isMobileInitial = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [currentView, setCurrentView] = useState(isMobileInitial ? 'agenda' : 'month');

  // Filter state
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'SESSION' | 'COURSE_DEADLINE' | 'POLICY_DEADLINE' | 'ASSESSMENT'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'OVERDUE' | 'COMPLETED'
  const [searchQuery, setSearchQuery] = useState('');

  // Date Navigation State
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null); // { dateStr, events }

  // Scheduling Modal State (management only)
  const isManagement = ['HR_ADMIN', 'TRAINER', 'MANAGER'].includes(user?.role);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newEvent, setNewEvent] = useState(EMPTY_EVENT);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // Load all events from unified calendar service
  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await calendarService.getCalendarEvents();
      setEvents(data);
    } catch (err) {
      setError(err.message || 'Unable to load learning and compliance calendar.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Load selectable employees when scheduling
  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const data = await calendarService.getSelectableEmployees();
      setEmployees(data);
    } catch (err) {
      setSaveError(err.message || 'Unable to load employees.');
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showScheduleModal && newEvent.targetType === 'EMPLOYEES' && employees.length === 0) {
      loadEmployees();
    }
  }, [showScheduleModal, newEvent.targetType, employees.length, loadEmployees]);

  // Escape key listener for modals
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;
      if (selectedEvent) {
        setSelectedEvent(null);
        return;
      }
      if (selectedDayEvents) {
        setSelectedDayEvents(null);
        return;
      }
      if (showScheduleModal && !saving) {
        setShowScheduleModal(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedEvent, selectedDayEvents, showScheduleModal, saving]);

  // Handle Session Publish
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.date) return;
    if (newEvent.targetType === 'EMPLOYEES' && newEvent.targetUserIds.length === 0) {
      setSaveError('Select at least one employee.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await calendarService.scheduleSession({
        title: newEvent.title.trim(),
        date: newEvent.date,
        time: newEvent.time.trim(),
        trainer: newEvent.trainer.trim(),
        department: newEvent.targetType === 'DEPARTMENT' ? newEvent.department : null,
        targetType: newEvent.targetType,
        targetUserIds: newEvent.targetType === 'EMPLOYEES' ? newEvent.targetUserIds : [],
        location: newEvent.location.trim(),
        type: newEvent.type,
      });
      setShowScheduleModal(false);
      setNewEvent(EMPTY_EVENT);
      await loadEvents();
    } catch (err) {
      setSaveError(err.message || 'Unable to publish this session.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // 1. Type filter
      if (typeFilter !== 'ALL' && ev.type !== typeFilter) {
        return false;
      }
      // 2. Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'OVERDUE' && ev.status !== EVENT_STATUSES.OVERDUE) return false;
        if (statusFilter === 'UPCOMING' && ev.status !== EVENT_STATUSES.UPCOMING) return false;
        if (statusFilter === 'COMPLETED' && ev.status !== EVENT_STATUSES.COMPLETED) return false;
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const str = `${ev.title} ${ev.typeLabel} ${ev.trainer || ''} ${ev.department || ''} ${ev.documentCode || ''} ${ev.location || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }, [events, typeFilter, statusFilter, searchQuery]);

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: events.length,
      sessions: events.filter((e) => e.type === EVENT_TYPES.SESSION).length,
      courses: events.filter((e) => e.type === EVENT_TYPES.COURSE_DEADLINE).length,
      policies: events.filter((e) => e.type === EVENT_TYPES.POLICY_DEADLINE).length,
      assessments: events.filter((e) => e.type === EVENT_TYPES.ASSESSMENT).length,
      upcoming: events.filter((e) => e.status === EVENT_STATUSES.UPCOMING).length,
      overdue: events.filter((e) => e.status === EVENT_STATUSES.OVERDUE).length,
      completed: events.filter((e) => e.status === EVENT_STATUSES.COMPLETED).length,
    };
  }, [events]);

  // Date Navigation Helpers
  const todayStr = getTodayIso();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrev = () => {
    if (currentView === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (currentView === 'week') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      // Agenda: step back 1 month
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNext = () => {
    if (currentView === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (currentView === 'week') {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      // Agenda: step forward 1 month
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Header Title Text
  const headerDateTitle = useMemo(() => {
    if (currentView === 'month' || currentView === 'agenda') {
      return currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }
    // Week view: calculate Monday to Sunday
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 is Sun
    const diffToMon = curr.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const mon = new Date(curr.setDate(diffToMon));
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);

    const mText = mon.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const sText = sun.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${mText} – ${sText}`;
  }, [currentView, currentDate]);

  // Helpers for Event Badges & Actions
  const getEventBadgeStyle = (item) => {
    const isOverdue = item.status === EVENT_STATUSES.OVERDUE;
    if (isOverdue) {
      return {
        bg: '#FEF2F2',
        border: '#FECACA',
        color: '#DC2626',
        badgeBg: '#FEE2E2',
        badgeColor: '#991B1B',
      };
    }
    switch (item.type) {
      case EVENT_TYPES.SESSION:
        return {
          bg: '#F0F9FF',
          border: '#BAE6FD',
          color: '#0284C7',
          badgeBg: '#E0F2FE',
          badgeColor: '#0369A1',
        };
      case EVENT_TYPES.COURSE_DEADLINE:
        return {
          bg: '#EEF2FF',
          border: '#C7D2FE',
          color: '#4F46E5',
          badgeBg: '#E0E7FF',
          badgeColor: '#3730A3',
        };
      case EVENT_TYPES.POLICY_DEADLINE:
        return {
          bg: '#ECFDF5',
          border: '#A7F3D0',
          color: '#059669',
          badgeBg: '#D1FAE5',
          badgeColor: '#065F46',
        };
      case EVENT_TYPES.ASSESSMENT:
        return {
          bg: '#FFF1F2',
          border: '#FECDD3',
          color: '#E11D48',
          badgeBg: '#FFE4E6',
          badgeColor: '#9F1239',
        };
      default:
        return {
          bg: '#F8FAFC',
          border: '#E2E8F0',
          color: '#0F6CBD',
          badgeBg: '#F1F5F9',
          badgeColor: '#334155',
        };
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case EVENT_TYPES.SESSION:
        return <Video size={14} />;
      case EVENT_TYPES.COURSE_DEADLINE:
        return <BookOpen size={14} />;
      case EVENT_TYPES.POLICY_DEADLINE:
        return <FileCheck size={14} />;
      case EVENT_TYPES.ASSESSMENT:
        return <Award size={14} />;
      default:
        return <CalendarIcon size={14} />;
    }
  };

  const executeEventAction = (item, e) => {
    if (e) e.stopPropagation();
    if (item.actionType === 'external' && item.actionTarget) {
      window.open(item.actionTarget, '_blank', 'noopener,noreferrer');
      return;
    }
    if (item.actionType === 'navigate' && item.actionTarget) {
      navigate(item.actionTarget);
      return;
    }
    setSelectedEvent(item);
  };

  // Month grid calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const paddingDays = new Date(year, month, 1).getDay();

  // Week days calculation
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay();
    const diffToMon = curr.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const monday = new Date(curr.setDate(diffToMon));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const iso = toIsoDate(d);
      return {
        dateObj: d,
        iso,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        isToday: iso === todayStr,
      };
    });
  }, [currentDate, todayStr]);

  // Agenda items grouped chronologically
  const agendaGroups = useMemo(() => {
    const groupsMap = new Map();

    // Group overdue items first
    const overdueItems = filteredEvents.filter((e) => e.status === EVENT_STATUSES.OVERDUE);
    if (overdueItems.length > 0) {
      groupsMap.set('overdue', {
        title: 'Action Needed — Overdue Milestones',
        isOverdueGroup: true,
        items: overdueItems,
      });
    }

    // Remaining items grouped by date
    const remainingItems = filteredEvents.filter((e) => e.status !== EVENT_STATUSES.OVERDUE);
    for (const item of remainingItems) {
      if (!groupsMap.has(item.date)) {
        const itemDate = parseLocalDate(item.date);
        let title = itemDate.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        if (item.date === todayStr) {
          title = `Today — ${title}`;
        }
        groupsMap.set(item.date, {
          title,
          isToday: item.date === todayStr,
          items: [],
        });
      }
      groupsMap.get(item.date).items.push(item);
    }

    return Array.from(groupsMap.values());
  }, [filteredEvents, todayStr]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 1400, margin: '0 auto', paddingBottom: '2.5rem' }}>
      {/* 1. HERO HEADER */}
      <section
        style={{
          background: 'linear-gradient(135deg, rgba(16, 42, 67, 0.95) 0%, rgba(11, 31, 56, 0.92) 50%, rgba(2, 132, 199, 0.90) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 16px 38px rgba(11, 31, 56, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          padding: '1.75rem 2rem',
          borderRadius: 20,
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.78rem',
              color: '#7DD3FC',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Corporate Schedule &amp; Governance
          </div>
          <h1
            style={{
              fontSize: 'clamp(1.35rem, 2vw, 1.85rem)',
              fontWeight: 800,
              margin: '0.35rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            Learning &amp; Compliance Calendar
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '0.9rem', margin: 0, maxWidth: 680, lineHeight: 1.5 }}>
            Track scheduled live training sessions, course milestones, mandatory policy acknowledgements, and assessment deadlines in one unified schedule.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={loadEvents}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.58rem 1rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              background: 'rgba(255, 255, 255, 0.14)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'background-color 0.18s ease',
            }}
            title="Refresh calendar events"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>

          {isManagement && (
            <button
              type="button"
              onClick={() => {
                setSaveError('');
                setShowScheduleModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.58rem 1.1rem',
                borderRadius: '10px',
                border: '1px solid #38BDF8',
                background: '#0284C7',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                transition: 'background-color 0.18s ease',
              }}
            >
              <Plus size={15} /> Schedule Session
            </button>
          )}
        </div>
      </section>

      {/* 2. TOOLBAR: NAVIGATION & VIEW SWITCHER */}
      <section
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(226, 232, 240, 0.95)',
          borderRadius: 16,
          padding: '0.9rem 1.25rem',
          boxShadow: '0 4px 20px rgba(31, 70, 120, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Date controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              aria-label="Previous period"
              onClick={handlePrev}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F6CBD',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next period"
              onClick={handleNext}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#0F172A',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {headerDateTitle}
          </h2>
        </div>

        {/* Right: View Switcher (Month, Week, Agenda) */}
        <div style={{ display: 'flex', gap: '0.35rem', background: '#F1F5F9', padding: '0.25rem', borderRadius: '10px' }}>
          {[
            { id: 'month', label: 'Month', icon: Grid },
            { id: 'week', label: 'Week', icon: Layers },
            { id: 'agenda', label: 'Agenda', icon: List },
          ].map((v) => {
            const Icon = v.icon;
            const active = currentView === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setCurrentView(v.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#0F6CBD' : '#64748B',
                  fontWeight: active ? 750 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: active ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. FILTER BAR */}
      <section
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(226, 232, 240, 0.95)',
          borderRadius: 16,
          padding: '0.85rem 1.25rem',
          boxShadow: '0 4px 20px rgba(31, 70, 120, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Type & Status Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Event Type Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={14} color="#64748B" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by event type"
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '0.82rem',
                color: '#0F172A',
                fontWeight: 650,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Event Types ({counts.all})</option>
              <option value={EVENT_TYPES.SESSION}>Live Sessions ({counts.sessions})</option>
              <option value={EVENT_TYPES.COURSE_DEADLINE}>Course Deadlines ({counts.courses})</option>
              <option value={EVENT_TYPES.POLICY_DEADLINE}>Policy Deadlines ({counts.policies})</option>
              <option value={EVENT_TYPES.ASSESSMENT}>Assessments ({counts.assessments})</option>
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontSize: '0.82rem',
              color: '#0F172A',
              fontWeight: 650,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="UPCOMING">Upcoming ({counts.upcoming})</option>
            <option value="OVERDUE">Overdue ({counts.overdue})</option>
            <option value="COMPLETED">Completed / Past ({counts.completed})</option>
          </select>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <Search
            size={14}
            color="#94A3B8"
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, courses, policies…"
            aria-label="Search calendar events"
            style={{
              padding: '0.45rem 0.75rem 0.45rem 2rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontSize: '0.82rem',
              width: '100%',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          style={{
            ...panelStyle,
            background: '#FEF2F2',
            borderColor: '#FECACA',
            color: '#B91C1C',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span>
            <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {error}
          </span>
          <button
            type="button"
            onClick={loadEvents}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. CALENDAR VIEWS */}
      {loading ? (
        <div style={{ ...panelStyle, minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem', color: '#0F6CBD' }} />
            <p style={{ margin: 0, fontWeight: 650 }}>Loading Learning &amp; Compliance Calendar…</p>
          </div>
        </div>
      ) : (
        <>
          {/* ================= A. MONTH VIEW ================= */}
          {currentView === 'month' && (
            <div style={{ ...panelStyle, padding: '1.25rem' }}>
              {/* Day header row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  textAlign: 'center',
                  fontWeight: 750,
                  fontSize: '0.78rem',
                  color: '#64748B',
                  marginBottom: '0.5rem',
                }}
              >
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} style={{ padding: '0.4rem 0' }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Day cells grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: '0.4rem',
                }}
              >
                {/* Previous month padding cells */}
                {Array.from({ length: paddingDays }, (_, idx) => (
                  <div
                    key={`pad-${idx}`}
                    aria-hidden="true"
                    style={{
                      minHeight: 105,
                      background: 'rgba(248, 250, 252, 0.6)',
                      borderRadius: 10,
                      border: '1px solid #F1F5F9',
                    }}
                  />
                ))}

                {/* Current month days */}
                {Array.from({ length: daysInMonth }, (_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayEvents = filteredEvents.filter((e) => e.date === dateStr);
                  const isToday = dateStr === todayStr;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        if (dayEvents.length > 0) {
                          setSelectedDayEvents({ dateStr, events: dayEvents });
                        }
                      }}
                      style={{
                        minHeight: 105,
                        background: isToday ? '#F0F9FF' : '#FFFFFF',
                        border: isToday ? '2px solid #0284C7' : '1px solid #E2E8F0',
                        borderRadius: 10,
                        padding: '0.45rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (dayEvents.length > 0) {
                          e.currentTarget.style.borderColor = '#93C5FD';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.06)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isToday ? '#0284C7' : '#E2E8F0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Day Number */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: isToday ? '#0284C7' : '#0F172A',
                        }}
                      >
                        <span>{dayNum}</span>
                        {isToday && (
                          <span
                            style={{
                              fontSize: '0.64rem',
                              fontWeight: 800,
                              background: '#0284C7',
                              color: '#FFFFFF',
                              padding: '0.05rem 0.35rem',
                              borderRadius: '4px',
                            }}
                          >
                            TODAY
                          </span>
                        )}
                      </div>

                      {/* Event Chips */}
                      {dayEvents.slice(0, 3).map((item) => {
                        const isOverdue = item.status === EVENT_STATUSES.OVERDUE;
                        const colors = getEventBadgeStyle(item);

                        return (
                          <div
                            key={item.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(item);
                            }}
                            title={`${item.title} (${item.typeLabel})`}
                            style={{
                              fontSize: '0.67rem',
                              fontWeight: 700,
                              padding: '0.18rem 0.35rem',
                              borderRadius: '5px',
                              background: colors.badgeBg,
                              color: colors.badgeColor,
                              borderLeft: `3px solid ${isOverdue ? '#DC2626' : colors.color}`,
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              cursor: 'pointer',
                            }}
                          >
                            {getEventIcon(item.type)}
                            <span>{item.title}</span>
                          </div>
                        );
                      })}

                      {dayEvents.length > 3 && (
                        <span style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 700, marginTop: 'auto' }}>
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= B. WEEK VIEW ================= */}
          {currentView === 'week' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {weekDays.map((day) => {
                const dayEvents = filteredEvents.filter((e) => e.date === day.iso);

                return (
                  <div
                    key={day.iso}
                    style={{
                      ...panelStyle,
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      background: day.isToday ? '#F0F9FF' : '#FFFFFF',
                      borderColor: day.isToday ? '#0284C7' : 'rgba(226, 232, 240, 0.95)',
                      minHeight: '340px',
                    }}
                  >
                    {/* Day Header */}
                    <div
                      style={{
                        paddingBottom: '0.5rem',
                        borderBottom: '1px solid #E2E8F0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                          {day.dayName}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: day.isToday ? '#0284C7' : '#0F172A' }}>
                          {day.dayNum}
                        </div>
                      </div>
                      {day.isToday && (
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            background: '#0284C7',
                            color: '#FFFFFF',
                          }}
                        >
                          TODAY
                        </span>
                      )}
                    </div>

                    {/* Day Events */}
                    {dayEvents.length === 0 ? (
                      <div style={{ padding: '2rem 0.5rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem' }}>
                        No events
                      </div>
                    ) : (
                      dayEvents.map((item) => {
                        const isOverdue = item.status === EVENT_STATUSES.OVERDUE;
                        const colors = getEventBadgeStyle(item);

                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedEvent(item)}
                            style={{
                              padding: '0.6rem 0.75rem',
                              borderRadius: '8px',
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                              borderLeft: `4px solid ${isOverdue ? '#DC2626' : colors.color}`,
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.25rem',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  color: colors.badgeColor,
                                  background: colors.badgeBg,
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                }}
                              >
                                {item.typeLabel}
                              </span>
                              {item.time && (
                                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>{item.time}</span>
                              )}
                            </div>

                            <strong
                              style={{
                                fontSize: '0.8rem',
                                color: '#0F172A',
                                lineHeight: 1.3,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {item.title}
                            </strong>

                            <button
                              type="button"
                              onClick={(e) => executeEventAction(item, e)}
                              style={{
                                marginTop: '0.25rem',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: isOverdue ? '#DC2626' : '#0F6CBD',
                                color: '#FFFFFF',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <span>{item.actionLabel}</span>
                              {item.actionType === 'external' ? <ExternalLink size={10} /> : <ChevronRight size={10} />}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ================= C. AGENDA VIEW (COMPACT & MOBILE) ================= */}
          {currentView === 'agenda' && (
            <div style={{ ...panelStyle, padding: '1.25rem' }}>
              {agendaGroups.length === 0 ? (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
                  <CalendarCheck size={36} style={{ color: '#16A34A', margin: '0 auto 0.6rem', opacity: 0.85 }} />
                  <h3 style={{ margin: '0 0 0.3rem', color: '#0F172A', fontSize: '1.05rem', fontWeight: 750 }}>
                    No Scheduled Events Found
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem' }}>
                    There are no upcoming live sessions, course deadlines, or policy acknowledgements matching your filters.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {agendaGroups.map((group, gIdx) => (
                    <div key={`group-${gIdx}`}>
                      {/* Group Header */}
                      <div
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          color: group.isOverdueGroup ? '#DC2626' : group.isToday ? '#0284C7' : '#0F172A',
                          marginBottom: '0.65rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {group.isOverdueGroup ? (
                          <AlertTriangle size={15} />
                        ) : (
                          <Clock size={15} />
                        )}
                        <span>{group.title}</span>
                      </div>

                      {/* Group Event Cards */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {group.items.map((item) => {
                          const isOverdue = item.status === EVENT_STATUSES.OVERDUE;
                          const colors = getEventBadgeStyle(item);

                          return (
                            <div
                              key={item.id}
                              onClick={() => setSelectedEvent(item)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                padding: '0.9rem 1.15rem',
                                borderRadius: '12px',
                                background: isOverdue ? '#FFF8F8' : '#FFFFFF',
                                border: `1px solid ${isOverdue ? '#FECACA' : '#E2E8F0'}`,
                                borderLeft: `5px solid ${isOverdue ? '#DC2626' : colors.color}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                flexWrap: 'wrap',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = isOverdue ? '#F87171' : '#93C5FD';
                                e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.06)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = isOverdue ? '#FECACA' : '#E2E8F0';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              {/* Left Info */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0, flex: 1 }}>
                                <div
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
                                    color: colors.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {getEventIcon(item.type)}
                                </div>

                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 750, fontSize: '0.92rem', color: '#0F172A', lineHeight: 1.3 }}>
                                    {item.title}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginTop: '3px', fontSize: '0.74rem', color: '#64748B', flexWrap: 'wrap' }}>
                                    <span style={{ padding: '0.12rem 0.45rem', borderRadius: '4px', background: colors.badgeBg, color: colors.badgeColor, fontWeight: 700, fontSize: '0.7rem' }}>
                                      {item.typeLabel}
                                    </span>
                                    <span>{new Date(`${item.date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                    {item.time && <span>• {item.time}</span>}
                                    {item.department && <span>• {item.department}</span>}
                                    <span style={{ fontWeight: 700, color: isOverdue ? '#DC2626' : '#059669' }}>
                                      ({item.deadlineText})
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Action */}
                              <button
                                type="button"
                                onClick={(e) => executeEventAction(item, e)}
                                style={{
                                  padding: '0.48rem 0.95rem',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: isOverdue
                                    ? 'linear-gradient(135deg, #DC2626, #B91C1C)'
                                    : 'linear-gradient(135deg, #0284C7, #0369A1)',
                                  color: '#FFFFFF',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  boxShadow: isOverdue
                                    ? '0 2px 6px rgba(220, 38, 38, 0.25)'
                                    : '0 2px 6px rgba(2, 132, 199, 0.25)',
                                }}
                              >
                                <span>{item.actionLabel}</span>
                                {item.actionType === 'external' ? <ExternalLink size={13} /> : <ChevronRight size={13} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ================= 5. EVENT DETAILS MODAL ================= */}
      {selectedEvent && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEvent(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="modal-content animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-detail-title"
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: getEventBadgeStyle(selectedEvent).badgeColor,
                    background: getEventBadgeStyle(selectedEvent).badgeBg,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    display: 'inline-block',
                    marginBottom: '0.4rem',
                  }}
                >
                  {selectedEvent.typeLabel}
                </span>
                <h3
                  id="event-detail-title"
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#0F172A',
                    lineHeight: 1.35,
                  }}
                >
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close event details"
                onClick={() => setSelectedEvent(null)}
                style={{
                  background: '#F1F5F9',
                  border: 0,
                  padding: '0.4rem',
                  borderRadius: '50%',
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Context Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#475569' }}>
                <CalendarIcon size={16} color="#0F6CBD" />
                <span>
                  Date:{' '}
                  <strong>
                    {new Date(`${selectedEvent.date}T00:00:00`).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                </span>
              </div>

              {selectedEvent.time && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#475569' }}>
                  <Clock size={16} color="#0F6CBD" />
                  <span>Time: <strong>{selectedEvent.time}</strong></span>
                </div>
              )}

              {selectedEvent.trainer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#475569' }}>
                  <User size={16} color="#64748B" />
                  <span>Facilitator / Trainer: <strong>{selectedEvent.trainer}</strong></span>
                </div>
              )}

              {selectedEvent.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#475569' }}>
                  <MapPin size={16} color="#16A34A" />
                  <span>Location: <strong>{selectedEvent.location}</strong></span>
                </div>
              )}

              {selectedEvent.department && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#475569' }}>
                  <Layers size={16} color="#64748B" />
                  <span>Audience / Department: <strong>{selectedEvent.department}</strong></span>
                </div>
              )}

              {selectedEvent.progressPercent != null && (
                <div style={{ marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    <span style={{ color: '#475569' }}>Course Progress</span>
                    <span style={{ color: '#0F6CBD' }}>{selectedEvent.progressPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${selectedEvent.progressPercent}%`, height: '100%', background: '#0F6CBD' }} />
                  </div>
                </div>
              )}

              {selectedEvent.documentCode && (
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Policy Document ID: <strong>{selectedEvent.documentCode}</strong>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>

              <button
                type="button"
                onClick={(e) => executeEventAction(selectedEvent, e)}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                  color: '#FFFFFF',
                  fontWeight: 750,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                }}
              >
                <span>{selectedEvent.actionLabel}</span>
                {selectedEvent.actionType === 'external' ? <ExternalLink size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. DAY SESSIONS LIST MODAL ================= */}
      {selectedDayEvents && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDayEvents(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="modal-content animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="day-details-title"
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <h3 id="day-details-title" style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {new Date(`${selectedDayEvents.dateStr}T00:00:00`).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.8rem', margin: '3px 0 0' }}>
                  {selectedDayEvents.events.length} milestone{selectedDayEvents.events.length === 1 ? '' : 's'} scheduled for this date
                </p>
              </div>
              <button
                type="button"
                aria-label="Close day details"
                onClick={() => setSelectedDayEvents(null)}
                style={{
                  background: '#F1F5F9',
                  border: 0,
                  padding: '0.4rem',
                  borderRadius: '50%',
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '55vh', overflowY: 'auto' }}>
              {selectedDayEvents.events.map((item) => {
                const isOverdue = item.status === EVENT_STATUSES.OVERDUE;
                const colors = getEventBadgeStyle(item);

                return (
                  <article
                    key={item.id}
                    onClick={() => {
                      setSelectedDayEvents(null);
                      setSelectedEvent(item);
                    }}
                    style={{
                      padding: '0.9rem',
                      border: `1px solid ${isOverdue ? '#FECACA' : '#DBEAFE'}`,
                      borderLeft: `4px solid ${isOverdue ? '#DC2626' : colors.color}`,
                      borderRadius: 10,
                      background: isOverdue ? '#FFFBFB' : '#F8FBFF',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: colors.badgeColor, background: colors.badgeBg, padding: '0.12rem 0.4rem', borderRadius: '4px' }}>
                        {item.typeLabel}
                      </span>
                      {item.time && <span style={{ fontSize: '0.74rem', color: '#64748B' }}>{item.time}</span>}
                    </div>

                    <strong style={{ display: 'block', color: '#0F172A', fontSize: '0.88rem', margin: '4px 0' }}>
                      {item.title}
                    </strong>

                    {item.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#475569', fontSize: '0.78rem', marginTop: 4 }}>
                        <MapPin size={12} color="#16A34A" /> {item.location}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. SCHEDULE SESSION MODAL (MANAGEMENT ONLY) ================= */}
      {showScheduleModal && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowScheduleModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="modal-content animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-title"
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem', marginBottom: '1.25rem', gap: '1rem' }}>
              <div>
                <h3 id="schedule-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Schedule Training Session
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0' }}>
                  Publish a live session or webinar to the corporate calendar.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close schedule modal"
                disabled={saving}
                onClick={() => setShowScheduleModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 0,
                  padding: '0.4rem',
                  borderRadius: '50%',
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label htmlFor="event-title" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                  Session Title *
                </label>
                <input
                  id="event-title"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  style={inputStyle}
                  placeholder="e.g. Dangerous Goods Handling Workshop"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label htmlFor="event-date" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Event Date *
                  </label>
                  <input
                    id="event-date"
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="event-time" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Time Range
                  </label>
                  <input
                    id="event-time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    placeholder="e.g. 10:00 AM - 12:00 PM"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="event-audience" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                  Who should attend? *
                </label>
                <select
                  id="event-audience"
                  value={newEvent.targetType}
                  onChange={(e) => setNewEvent({ ...newEvent, targetType: e.target.value, targetUserIds: [] })}
                  style={inputStyle}
                >
                  <option value="ALL">All employees</option>
                  <option value="DEPARTMENT">A department</option>
                  <option value="EMPLOYEES">Selected employees</option>
                </select>
              </div>

              {newEvent.targetType === 'DEPARTMENT' && (
                <div>
                  <label htmlFor="event-department" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Target Department *
                  </label>
                  <select
                    id="event-department"
                    required
                    value={newEvent.department}
                    onChange={(e) => setNewEvent({ ...newEvent, department: e.target.value })}
                    style={inputStyle}
                  >
                    {['Operations', 'Documentation', 'Pricing', 'Sales', 'Accounts', 'People Operations', 'Information Technology', 'Management & Leadership'].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newEvent.targetType === 'EMPLOYEES' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Select Employees * {employeesLoading ? '(loading…)' : ''}
                  </label>
                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #CBD5E1', borderRadius: 8, padding: 8 }}>
                    {employees.map((emp) => (
                      <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px', fontSize: '0.84rem' }}>
                        <input
                          type="checkbox"
                          checked={newEvent.targetUserIds.includes(emp.id)}
                          onChange={(e) =>
                            setNewEvent({
                              ...newEvent,
                              targetUserIds: e.target.checked
                                ? [...newEvent.targetUserIds, emp.id]
                                : newEvent.targetUserIds.filter((id) => id !== emp.id),
                            })
                          }
                        />
                        <span>
                          {emp.name} {emp.employeeId ? `(${emp.employeeId})` : ''} {emp.department ? `— ${emp.department}` : ''}
                        </span>
                      </label>
                    ))}
                    {!employeesLoading && employees.length === 0 && (
                      <span style={{ color: '#64748B', fontSize: '0.82rem' }}>No employees available.</span>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label htmlFor="event-trainer" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Trainer / Facilitator
                  </label>
                  <input
                    id="event-trainer"
                    value={newEvent.trainer}
                    onChange={(e) => setNewEvent({ ...newEvent, trainer: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="event-type" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Event Type
                  </label>
                  <select
                    id="event-type"
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                    style={inputStyle}
                  >
                    {['Workshop', 'Training', 'Assessment', 'Webinar', 'Deadline'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="event-location" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                  Location / Meeting Link (Google Meet, Teams, Zoom)
                </label>
                <input
                  id="event-location"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  style={inputStyle}
                  placeholder="https://meet.google.com/xyz or Room 402, HQ"
                />
              </div>

              {saveError && (
                <div role="alert" style={{ padding: '0.7rem 0.85rem', background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderRadius: 8, fontSize: '0.82rem' }}>
                  <AlertCircle size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                  {saveError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: 5 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={saving}
                  onClick={() => setShowScheduleModal(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{
                    padding: '0.55rem 1.15rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                    color: '#FFFFFF',
                    fontWeight: 750,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Plus size={15} />
                  {saving ? 'Publishing…' : 'Publish to Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
