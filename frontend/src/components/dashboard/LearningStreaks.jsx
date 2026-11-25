import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Flame,
  Trophy,
  CheckCircle2,
  Award,
  Sparkles,
  Calendar as CalendarIcon,
  RefreshCw,
  AlertCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import { learningStreakService } from '../../services/learningStreakService';

/**
 * Balanced Apple-inspired Liquid Glass Card styling
 */
const glassCardStyle = {
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(246, 250, 255, 0.82) 100%)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '22px',
  border: '1px solid rgba(255, 255, 255, 0.95)',
  boxShadow: '0 12px 36px rgba(31, 70, 120, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
};

/**
 * Concentric SVG Activity Rings Dimensions
 */
const RING_VIEWBOX_SIZE = 176;
const RING_CENTER = RING_VIEWBOX_SIZE / 2; // 88

// Ring 1: Learning Days (Outer)
const RING_1_RADIUS = 66;
const RING_1_CIRCUMFERENCE = 2 * Math.PI * RING_1_RADIUS; // ~414.69
const RING_1_COLOR = '#3478E5'; // Fairmacs Blue
const RING_1_TRACK = 'rgba(52, 120, 229, 0.12)';

// Ring 2: Completed Lessons (Inner)
const RING_2_RADIUS = 50;
const RING_2_CIRCUMFERENCE = 2 * Math.PI * RING_2_RADIUS; // ~314.16
const RING_2_COLOR = '#3d9f22ff'; // Green
const RING_2_TRACK = 'rgba(228, 39, 39, 0.14)';

const STROKE_WIDTH = 10;

/**
 * Formats a YYYY-MM-DD string into a localized readable date
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Formats today's date in YYYY-MM-DD in Asia/Kolkata
 */
function getTodayIstString() {
  const now = new Date();
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

export default function LearningStreaks() {
  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Fetch streak metrics
  const fetchStreaks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learningStreakService.getLearningStreaks();
      if (data) {
        setStreakData(data);
        // Default selection: today's date if present in dailyActivity, else first active or today
        const todayIst = getTodayIstString();
        const matchingDay = data.dailyActivity?.find(d => d.date === todayIst);
        if (matchingDay) {
          setSelectedDate(matchingDay.date);
        } else if (data.dailyActivity?.length > 0) {
          setSelectedDate(data.dailyActivity[0].date);
        }
      }
    } catch (err) {
      console.error('Failed to load learning streaks:', err);
      setError('Unable to load learning activity rings. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  // Derived metrics with safe fallbacks
  const {
    currentStreak = 0,
    longestStreak = 0,
    weeklyActiveDays = 0,
    weeklyCompletedLessons = 0,
    weeklySubmittedQuizzes = 0,
    weeklyTargetDays = 5,
    weeklyTargetLessons = 5,
    dailyActivity = []
  } = streakData || {};

  const todayIst = useMemo(() => getTodayIstString(), []);

  // Ring 1 calculation (Learning Days, capped at 100%)
  const ring1Percent = useMemo(() => {
    if (!weeklyTargetDays || weeklyTargetDays <= 0) return 0;
    return Math.min(100, Math.round((weeklyActiveDays / weeklyTargetDays) * 100));
  }, [weeklyActiveDays, weeklyTargetDays]);

  const ring1Offset = useMemo(() => {
    const fraction = ring1Percent / 100;
    return RING_1_CIRCUMFERENCE * (1 - fraction);
  }, [ring1Percent]);

  // Ring 2 calculation (Completed Lessons, capped at 100%)
  const ring2Percent = useMemo(() => {
    if (!weeklyTargetLessons || weeklyTargetLessons <= 0) return 0;
    return Math.min(100, Math.round((weeklyCompletedLessons / weeklyTargetLessons) * 100));
  }, [weeklyCompletedLessons, weeklyTargetLessons]);

  const ring2Offset = useMemo(() => {
    const fraction = ring2Percent / 100;
    return RING_2_CIRCUMFERENCE * (1 - fraction);
  }, [ring2Percent]);

  // Selected day object
  const activeSelectedDay = useMemo(() => {
    if (!selectedDate || !dailyActivity.length) return null;
    return dailyActivity.find(d => d.date === selectedDate) || null;
  }, [selectedDate, dailyActivity]);

  // Check if selected date is in the future
  const isSelectedDateFuture = useMemo(() => {
    if (!selectedDate || !todayIst) return false;
    return selectedDate > todayIst;
  }, [selectedDate, todayIst]);

  /* ========================================================
     LOADING SKELETON STATE
  ======================================================== */
  if (loading) {
    return (
      <section
        className="learning-streaks-container animate-fade-in"
        style={{
          ...glassCardStyle,
          padding: '1.6rem 1.8rem',
        }}
        aria-busy="true"
        aria-label="Loading learning streaks"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div className="skeleton-shimmer" style={{ width: '220px', height: '24px', borderRadius: '8px' }} />
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <div className="skeleton-shimmer" style={{ width: '110px', height: '32px', borderRadius: '16px' }} />
            <div className="skeleton-shimmer" style={{ width: '100px', height: '32px', borderRadius: '16px' }} />
          </div>
        </div>
        <div className="learning-streaks-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '1.5rem' }}>
          <div className="skeleton-shimmer" style={{ height: '190px', borderRadius: '18px' }} />
          <div className="skeleton-shimmer" style={{ height: '190px', borderRadius: '18px' }} />
        </div>
      </section>
    );
  }

  /* ========================================================
     ERROR FALLBACK STATE
  ======================================================== */
  if (error) {
    return (
      <section
        className="learning-streaks-container animate-fade-in"
        style={{
          ...glassCardStyle,
          padding: '1.75rem 2rem',
          marginBottom: '1.75rem',
          textAlign: 'center'
        }}
        role="alert"
      >
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: '#FEE2E2',
            color: '#DC2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem',
            border: '1px solid #FECACA'
          }}
        >
          <AlertCircle size={24} />
        </div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.35rem' }}>
          Learning Streaks Unavailable
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0 auto 1rem', maxWidth: '420px' }}>
          {error}
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={fetchStreaks}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.2rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} /> Retry Activity Rings
        </button>
      </section>
    );
  }

  /* ========================================================
     MAIN LIQUID GLASS LEARNING STREAKS COMPONENT
  ======================================================== */
  return (
    <section
      className="learning-streaks-container animate-fade-in"
      style={{
        ...glassCardStyle,
        padding: '1.6rem 1.8rem',
        position: 'relative',
        overflow: 'hidden'
      }}
      aria-label="Learning Consistency and Activity Rings"
    >
      {/* Background ambient lighting accents */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52, 120, 229, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-30px',
          left: '10%',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(87, 173, 156, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* ----------------------------------------------------
          CARD HEADER: TITLE & STREAK BADGES
      ---------------------------------------------------- */}
      <div
        className="learning-streaks-header"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.4rem',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
              color: '#3478E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(52, 120, 229, 0.15)',
              border: '1px solid rgba(52, 120, 229, 0.2)'
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <h2
              style={{
                fontSize: '1.18rem',
                fontWeight: 800,
                color: '#193453',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.25
              }}
            >
              Learning Consistency
            </h2>
          </div>
        </div>

        {/* Streak Badges */}
        <div
          className="learning-streaks-badges"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Current Streak Badge */}
          <div
            className="streak-badge-current"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '14px',
              background: currentStreak > 0
                ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.9) 0%, rgba(253, 230, 138, 0.75) 100%)'
                : 'rgba(241, 245, 249, 0.85)',
              border: currentStreak > 0
                ? '1px solid rgba(245, 158, 11, 0.35)'
                : '1px solid rgba(203, 213, 225, 0.8)',
              color: currentStreak > 0 ? '#B45309' : '#64748B',
              boxShadow: currentStreak > 0 ? '0 2px 8px rgba(245, 158, 11, 0.15)' : 'none'
            }}
            title="Consecutive calendar days with at least one completed lesson or quiz"
          >
            <Flame
              size={17}
              style={{
                color: currentStreak > 0 ? '#F59E0B' : '#94A3B8',
                fill: currentStreak > 0 ? '#F59E0B' : 'none'
              }}
            />
            <span style={{ fontSize: '0.84rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'} Streak
            </span>
          </div>

          {/* Longest Streak Badge */}
          <div
            className="streak-badge-longest"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(243, 232, 255, 0.85) 0%, rgba(233, 213, 255, 0.75) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              color: '#7E22CE',
              boxShadow: '0 2px 8px rgba(168, 85, 247, 0.12)'
            }}
            title="Longest recorded streak in your learning history"
          >
            <Trophy size={16} style={{ color: '#9333EA' }} />
            <span style={{ fontSize: '0.84rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              {longestStreak} {longestStreak === 1 ? 'Day' : 'Days'} Best
            </span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------
          MAIN CONTENT GRID: DUAL RINGS + CALENDAR
      ---------------------------------------------------- */}
      <div
        className="learning-streaks-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(270px, 320px) 1fr',
          gap: '1.5rem',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* ====================================================
            COLUMN 1: DUAL ACTIVITY RINGS
        ==================================================== */}
        <div
          className="activity-rings-card"
          style={{
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '18px',
            padding: '1.25rem 1.15rem',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(31, 70, 120, 0.04)'
          }}
        >
          {/* Concentric SVG Rings */}
          <div
            style={{
              position: 'relative',
              width: `${RING_VIEWBOX_SIZE}px`,
              height: `${RING_VIEWBOX_SIZE}px`,
              marginBottom: '1rem'
            }}
          >
            <svg
              width={RING_VIEWBOX_SIZE}
              height={RING_VIEWBOX_SIZE}
              viewBox={`0 0 ${RING_VIEWBOX_SIZE} ${RING_VIEWBOX_SIZE}`}
              role="img"
              aria-label={`Activity rings: ${weeklyActiveDays} of ${weeklyTargetDays} learning days completed, ${weeklyCompletedLessons} of ${weeklyTargetLessons} lessons completed this week.`}
              style={{ overflow: 'visible' }}
            >
              {/* Gradients */}
              <defs>
                <linearGradient id="ring1Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3478E5" />
                  <stop offset="100%" stopColor="#1E40AF" />
                </linearGradient>
                <linearGradient id="ring2Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#57AD9C" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              {/* Ring 1 (Outer - Learning Days) Background Track */}
              <circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_1_RADIUS}
                fill="none"
                stroke={RING_1_TRACK}
                strokeWidth={STROKE_WIDTH}
              />

              {/* Ring 1 Active Fill */}
              <circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_1_RADIUS}
                fill="none"
                stroke="url(#ring1Gradient)"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={RING_1_CIRCUMFERENCE}
                strokeDashoffset={ring1Offset}
                transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
                style={{
                  transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />

              {/* Ring 2 (Inner - Completed Lessons) Background Track */}
              <circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_2_RADIUS}
                fill="none"
                stroke={RING_2_TRACK}
                strokeWidth={STROKE_WIDTH}
              />

              {/* Ring 2 Active Fill */}
              <circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_2_RADIUS}
                fill="none"
                stroke="url(#ring2Gradient)"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={RING_2_CIRCUMFERENCE}
                strokeDashoffset={ring2Offset}
                transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
                style={{
                  transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </svg>

            {/* Rings Center Content */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}
            >
              <span
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: '#193453',
                  lineHeight: 1,
                  letterSpacing: '-0.03em'
                }}
              >
                {weeklyActiveDays}
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#718198',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginTop: '0.15rem'
                }}
              >
                / {weeklyTargetDays} Days
              </span>
            </div>
          </div>

          {/* Activity Rings Legend */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              paddingTop: '0.35rem',
              borderTop: '1px solid rgba(226, 235, 245, 0.8)'
            }}
          >
            {/* Ring 1 Legend */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.81rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: RING_1_COLOR,
                    display: 'inline-block',
                    boxShadow: '0 0 6px rgba(52, 120, 229, 0.4)'
                  }}
                />
                <span style={{ color: '#334155', fontWeight: 600 }}>Learning Days</span>
              </div>
              <span style={{ fontWeight: 800, color: '#193453' }}>
                {weeklyActiveDays} / {weeklyTargetDays} <span style={{ color: '#718198', fontWeight: 500 }}>({ring1Percent}%)</span>
              </span>
            </div>

            {/* Ring 2 Legend */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.81rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: RING_2_COLOR,
                    display: 'inline-block',
                    boxShadow: '0 0 6px rgba(87, 173, 156, 0.4)'
                  }}
                />
                <span style={{ color: '#334155', fontWeight: 600 }}>Lessons Completed</span>
              </div>
              <span style={{ fontWeight: 800, color: '#193453' }}>
                {weeklyCompletedLessons} / {weeklyTargetLessons} <span style={{ color: '#718198', fontWeight: 500 }}>({ring2Percent}%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* ====================================================
            COLUMN 2: WEEKLY CALENDAR & DAY INSPECTOR
        ==================================================== */}
        <div
          className="activity-calendar-card"
          style={{
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '18px',
            padding: '1.25rem 1.35rem',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(31, 70, 120, 0.04)'
          }}
        >
          <div>
            {/* Calendar Subheader */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <CalendarIcon size={16} style={{ color: '#3478E5' }} />
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1E293B' }}>
                  Weekly Learning Activity
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#718198', fontWeight: 600 }}>
                {weeklyActiveDays} of 7 Days Active
              </span>
            </div>

            {/* 7-Day Calendar Strip */}
            <div
              className="weekly-calendar-strip"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.45rem',
                marginBottom: '1.15rem'
              }}
              role="list"
              aria-label="Weekly learning calendar days"
            >
              {dailyActivity.map((dayItem) => {
                const isSelected = selectedDate === dayItem.date;
                const isToday = dayItem.date === todayIst;
                const isFuture = dayItem.date > todayIst;
                const hasActivity = dayItem.active;

                // Day number extraction
                const dayNum = dayItem.date ? dayItem.date.split('-')[2] : '';

                return (
                  <button
                    key={dayItem.date}
                    type="button"
                    onClick={() => setSelectedDate(dayItem.date)}
                    className="calendar-day-btn"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '0.65rem 0.25rem 0.55rem',
                      borderRadius: '14px',
                      border: isSelected
                        ? '2px solid #3478E5'
                        : isToday
                        ? '1.5px solid rgba(52, 120, 229, 0.45)'
                        : '1px solid rgba(226, 232, 240, 0.8)',
                      background: isSelected
                        ? '#EFF6FF'
                        : hasActivity
                        ? 'rgba(255, 255, 255, 0.95)'
                        : 'rgba(248, 250, 252, 0.7)',
                      boxShadow: isSelected
                        ? '0 4px 14px rgba(52, 120, 229, 0.2)'
                        : hasActivity
                        ? '0 2px 8px rgba(31, 70, 120, 0.05)'
                        : 'none',
                      opacity: isFuture ? 0.55 : 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      position: 'relative'
                    }}
                    role="listitem"
                    aria-selected={isSelected}
                    aria-label={`${dayItem.day} ${dayNum}, ${hasActivity ? 'active with activity' : 'no activity'}${isToday ? ', today' : ''}`}
                  >
                    {/* Day Abbreviation */}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: isSelected ? '#1E40AF' : '#64748B',
                        textTransform: 'uppercase',
                        marginBottom: '0.2rem'
                      }}
                    >
                      {dayItem.day?.substring(0, 3)}
                    </span>

                    {/* Date Number */}
                    <span
                      style={{
                        fontSize: '0.94rem',
                        fontWeight: isSelected || isToday ? 800 : 700,
                        color: isSelected ? '#1E40AF' : isToday ? '#3478E5' : '#1E293B',
                        marginBottom: '0.4rem'
                      }}
                    >
                      {dayNum}
                    </span>

                    {/* Activity Indicator Dot */}
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: hasActivity
                          ? 'linear-gradient(135deg, #3478E5 0%, #57AD9C 100%)'
                          : 'transparent',
                        border: hasActivity
                          ? 'none'
                          : '1px solid rgba(203, 213, 225, 0.6)',
                        boxShadow: hasActivity
                          ? '0 0 6px rgba(52, 120, 229, 0.5)'
                          : 'none'
                      }}
                    />

                    {/* Today Pill Tag */}
                    {isToday && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          fontSize: '0.55rem',
                          fontWeight: 800,
                          background: '#3478E5',
                          color: '#FFFFFF',
                          padding: '1px 5px',
                          borderRadius: '8px',
                          letterSpacing: '0.02em'
                        }}
                      >
                        TODAY
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Selected Day Activity Inspector */}
          <div
            className="selected-day-inspector"
            style={{
              background: 'rgba(255, 255, 255, 0.92)',
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              border: '1px solid rgba(226, 235, 245, 0.9)',
              boxShadow: '0 2px 10px rgba(31, 70, 120, 0.04)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.45rem'
              }}
            >
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E293B' }}>
                {activeSelectedDay ? formatDisplayDate(activeSelectedDay.date) : 'Selected Day'}
              </span>
              {activeSelectedDay?.date === todayIst && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#2563EB',
                    background: '#DBEAFE',
                    padding: '2px 7px',
                    borderRadius: '8px'
                  }}
                >
                  Today
                </span>
              )}
            </div>

            {/* Milestones Content */}
            {activeSelectedDay && activeSelectedDay.active ? (
              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                {/* Completed Lessons Chip */}
                {activeSelectedDay.completedLessons > 0 && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#1E40AF',
                      background: '#EFF6FF',
                      border: '1px solid rgba(52, 120, 229, 0.25)',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '10px'
                    }}
                  >
                    <BookOpen size={14} style={{ color: '#3478E5' }} />
                    <span>
                      {activeSelectedDay.completedLessons} {activeSelectedDay.completedLessons === 1 ? 'Lesson' : 'Lessons'} Completed
                    </span>
                  </div>
                )}

                {/* Submitted Quizzes Chip */}
                {activeSelectedDay.submittedQuizzes > 0 && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#065F46',
                      background: '#ECFDF5',
                      border: '1px solid rgba(87, 173, 156, 0.3)',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '10px'
                    }}
                  >
                    <Award size={14} style={{ color: '#059669' }} />
                    <span>
                      {activeSelectedDay.submittedQuizzes} {activeSelectedDay.submittedQuizzes === 1 ? 'Quiz' : 'Quizzes'} Submitted
                    </span>
                  </div>
                )}
              </div>
            ) : isSelectedDateFuture ? (
              <p
                style={{
                  fontSize: '0.78rem',
                  color: '#64748B',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Clock size={14} style={{ color: '#94A3B8' }} />
                <span>Upcoming day. Continue learning daily to maintain your active streak!</span>
              </p>
            ) : (
              <p
                style={{
                  fontSize: '0.78rem',
                  color: '#64748B',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <CheckCircle2 size={14} style={{ color: '#94A3B8' }} />
                <span>No learning milestones recorded on this day. Complete a lesson or quiz to build consistency.</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
