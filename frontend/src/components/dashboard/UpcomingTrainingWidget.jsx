import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Video,
  BookOpen,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Award,
  CalendarCheck,
  RefreshCw,
} from 'lucide-react';
import { calendarService, EVENT_TYPES, EVENT_STATUSES } from '../../services/calendarService';

export default function UpcomingTrainingWidget({ limit = 4, className = '', style = {} }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWidgetEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const allEvents = await calendarService.getCalendarEvents();

      // Filter out completed events unless there are no upcoming/overdue events
      const activeEvents = allEvents.filter((ev) => ev.status !== EVENT_STATUSES.COMPLETED);

      // Sort: OVERDUE first (most urgent), then upcoming by date ascending
      activeEvents.sort((a, b) => {
        if (a.status === EVENT_STATUSES.OVERDUE && b.status !== EVENT_STATUSES.OVERDUE) return -1;
        if (b.status === EVENT_STATUSES.OVERDUE && a.status !== EVENT_STATUSES.OVERDUE) return 1;
        return a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '');
      });

      // Display up to limit
      setEvents(activeEvents.slice(0, limit));
    } catch (err) {
      console.warn('UpcomingTrainingWidget error:', err);
      setError('Unable to load upcoming deadlines.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadWidgetEvents();
  }, [loadWidgetEvents]);

  const handleAction = (eventItem, e) => {
    e.stopPropagation();
    if (eventItem.actionType === 'external' && eventItem.actionTarget) {
      window.open(eventItem.actionTarget, '_blank', 'noopener,noreferrer');
      return;
    }
    if (eventItem.actionType === 'navigate' && eventItem.actionTarget) {
      navigate(eventItem.actionTarget);
      return;
    }
    navigate('/training-calendar');
  };

  const getEventIcon = (type) => {
    switch (type) {
      case EVENT_TYPES.SESSION:
        return <Video size={16} />;
      case EVENT_TYPES.COURSE_DEADLINE:
        return <BookOpen size={16} />;
      case EVENT_TYPES.POLICY_DEADLINE:
        return <FileCheck size={16} />;
      case EVENT_TYPES.ASSESSMENT:
        return <Award size={16} />;
      default:
        return <Calendar size={16} />;
    }
  };

  const getEventColors = (type, isOverdue) => {
    if (isOverdue) {
      return {
        bg: '#FEF2F2',
        border: '#FECACA',
        color: '#DC2626',
        badgeBg: '#FEE2E2',
        badgeColor: '#991B1B',
      };
    }
    switch (type) {
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

  return (
    <section
      className={`glass-panel ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderRadius: '16px',
        padding: '1.25rem 1.4rem',
        border: '1px solid rgba(226, 232, 240, 0.95)',
        boxShadow: '0 4px 20px rgba(31, 70, 120, 0.05)',
        position: 'relative',
        ...style,
      }}
      aria-labelledby="upcoming-training-widget-title"
    >
      {/* Widget Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={18} />
          </div>
          <div>
            <h2
              id="upcoming-training-widget-title"
              style={{
                fontSize: '0.98rem',
                fontWeight: 750,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Upcoming Training &amp; Deadlines
            </h2>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B' }}>
              Schedule of live sessions, course milestones &amp; policy acknowledgements
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/training-calendar')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.38rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#0F6CBD',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
              if (typeof window !== 'undefined' && !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
            e.currentTarget.style.background = '#F0F9FF';
            e.currentTarget.style.borderColor = '#93C5FD';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.borderColor = '#CBD5E1';
          }}
        >
          <span>View Calendar</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Widget Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {[1, 2, 3].map((sKey) => (
            <div
              key={`up-skel-${sKey}`}
              className="skeleton-shimmer"
              style={{
                height: '56px',
                borderRadius: '10px',
                width: '100%',
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          style={{
            padding: '0.9rem',
            borderRadius: '10px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={loadWidgetEvents}
            style={{
              padding: '0.25rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div
          style={{
            padding: '1.75rem 1rem',
            textAlign: 'center',
            color: '#64748B',
            background: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
          }}
        >
          <CalendarCheck size={28} style={{ color: '#16A34A', margin: '0 auto 0.4rem', opacity: 0.85 }} />
          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.88rem' }}>All caught up!</div>
          <p style={{ margin: '3px 0 0.75rem', fontSize: '0.78rem' }}>
            No upcoming training sessions or pending deadlines right now.
          </p>
          <button
            type="button"
            onClick={() => navigate('/training-calendar')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0F6CBD',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Check Full Calendar
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {events.map((item) => {
            const isOverdue = item.status === EVENT_STATUSES.OVERDUE;
            const colors = getEventColors(item.type, isOverdue);

            return (
              <div
                key={item.id}
                onClick={() => navigate('/training-calendar')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '10px',
                  background: isOverdue ? '#FFFBFB' : '#FFFFFF',
                  border: `1px solid ${isOverdue ? '#FECACA' : '#E2E8F0'}`,
                  borderLeft: `4px solid ${isOverdue ? '#DC2626' : colors.color}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
              if (typeof window !== 'undefined' && !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
                  e.currentTarget.style.borderColor = isOverdue ? '#F87171' : '#93C5FD';
                  e.currentTarget.style.boxShadow = '0 3px 10px rgba(15, 23, 42, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isOverdue ? '#FECACA' : '#E2E8F0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Left: Icon & Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      color: colors.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {getEventIcon(item.type)}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        color: '#0F172A',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        marginTop: '3px',
                        fontSize: '0.72rem',
                        color: '#64748B',
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Type Tag */}
                      <span
                        style={{
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          background: colors.badgeBg,
                          color: colors.badgeColor,
                          fontWeight: 700,
                          fontSize: '0.68rem',
                        }}
                      >
                        {item.typeLabel}
                      </span>

                      {/* Date & Deadline Text */}
                      <span
                        style={{
                          fontWeight: isOverdue ? 750 : 600,
                          color: isOverdue ? '#DC2626' : '#475569',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        {isOverdue && <AlertTriangle size={11} />}
                        {new Date(`${item.date}T00:00:00`).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                        {item.time ? ` • ${item.time}` : ''} ({item.deadlineText})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Direct Action Button */}
                <button
                  type="button"
                  onClick={(e) => handleAction(item, e)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: isOverdue
                      ? 'linear-gradient(135deg, #DC2626, #B91C1C)'
                      : 'linear-gradient(135deg, #0284C7, #0369A1)',
                    color: '#FFFFFF',
                    boxShadow: isOverdue
                      ? '0 2px 6px rgba(220, 38, 38, 0.25)'
                      : '0 2px 6px rgba(2, 132, 199, 0.25)',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  <span>{item.actionLabel}</span>
                  {item.actionType === 'external' ? <ExternalLink size={12} /> : <ChevronRight size={12} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
