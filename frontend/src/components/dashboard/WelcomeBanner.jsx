import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Calendar, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';

/**
 * Derives a time-aware professional greeting based on current local hour.
 */
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Formats current date for corporate dashboard header.
 * e.g. "Tuesday, 17 Nov 2026"
 */
function formatTodayDate() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * WelcomeBanner - Balanced Apple-inspired Liquid Glass Employee Welcome Header
 * Displays personalized time-aware greeting, employee credentials, and notification status.
 */
export default function WelcomeBanner({ onOpenNotifications }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);

  // Time-aware greeting
  const greeting = getTimeGreeting();
  const todayDate = formatTodayDate();

  // Extract clean employee display values
  const fullName = user?.name || 'Employee';
  const firstName = fullName.trim().split(/\s+/)[0] || 'Employee';
  const designation = user?.designation || user?.roleLabel || 'Specialist';
  const department = user?.department || 'Operations';
  const employeeId = user?.employeeId || user?.id || '';

  // Load unread notification count using existing notification service
  const loadNotificationCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(typeof count === 'number' ? Math.max(0, count) : 0);
    } catch (err) {
      console.warn('WelcomeBanner: Unable to fetch unread notification count:', err);
      setUnreadCount(0);
    } finally {
      setLoadingCount(false);
    }
  }, []);

  useEffect(() => {
    loadNotificationCount();

    // Listen to cross-component sync event dispatched when notifications update
    const handleSync = () => {
      loadNotificationCount();
    };

    window.addEventListener('fairmacs:notifications-updated', handleSync);
    return () => {
      window.removeEventListener('fairmacs:notifications-updated', handleSync);
    };
  }, [loadNotificationCount]);

  const handleNotificationClick = () => {
    if (onOpenNotifications) {
      onOpenNotifications();
    } else {
      navigate('/notifications');
    }
  };

  // If user profile is still loading / unpopulated, render a sleek glass skeleton
  if (!user) {
    return (
      <section className="welcome-banner-glass animate-fade-in" aria-label="Loading Welcome Header">
        <div className="welcome-banner-ambient" aria-hidden="true" />
        <div className="welcome-banner-content">
          <div className="welcome-banner-left">
            <div className="welcome-banner-text-stack" style={{ gap: '0.45rem', width: '100%', maxWidth: '440px' }}>
              <div className="skeleton-shimmer" style={{ width: '180px', height: '18px', borderRadius: '999px' }} />
              <div className="skeleton-shimmer" style={{ width: 'min(260px, 100%)', height: '28px', borderRadius: '8px' }} />
              <div className="skeleton-shimmer" style={{ width: 'min(380px, 100%)', height: '14px', borderRadius: '6px' }} />
            </div>
          </div>
          <div className="welcome-banner-right">
            <div className="skeleton-shimmer" style={{ width: '120px', height: '28px', borderRadius: '999px' }} />
            <div className="skeleton-shimmer" style={{ width: '100px', height: '28px', borderRadius: '999px' }} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="welcome-banner-glass animate-fade-in"
      aria-label="Welcome Header"
    >
      {/* Soft Ambient Illumination Layer */}
      <div className="welcome-banner-ambient" aria-hidden="true" />

      <div className="welcome-banner-content">
        {/* Left Column: Greeting Details & Credentials (avatar-free layout) */}
        <div className="welcome-banner-left">
          {/* Text Stack */}
          <div className="welcome-banner-text-stack">
            {/* Meta Pill: Designation • Department • Employee Code */}
            <div className="welcome-banner-meta-row">
              <span className="welcome-banner-badge-primary">
                {designation}
              </span>
              <span className="welcome-banner-meta-divider">•</span>
              <span className="welcome-banner-meta-dept">
                {department}
              </span>
              {employeeId && (
                <>
                  <span className="welcome-banner-meta-divider">•</span>
                  <span className="welcome-banner-meta-code">
                    {employeeId}
                  </span>
                </>
              )}
            </div>

            {/* Time-Aware Greeting Heading */}
            <h1 className="welcome-banner-heading">
              <span className="welcome-banner-greeting-prefix">{greeting}, </span>
              <span className="welcome-banner-greeting-name">{firstName}</span>
            </h1>

            {/* Supporting Message */}
            <p className="welcome-banner-subtitle">
              Welcome to Fairmacs Learning Academy! Track your active courses, level up your skills, and own your growth.
            </p>
          </div>
        </div>

        {/* Right Column: Date, Quick Notification Status & Profile Action */}
        <div className="welcome-banner-right">
          {/* Today's Date Pill */}
          <div className="welcome-banner-date-pill">
            <span>{todayDate}</span>
          </div>

          {/* Unread Notification Summary Pill (Clickable deep-link) */}
          <button
            type="button"
            onClick={handleNotificationClick}
            className={`welcome-banner-notif-pill ${unreadCount > 0 ? 'has-unread' : 'is-clear'}`}
            title={unreadCount > 0 ? `${unreadCount} unread notification(s)` : 'All notifications caught up'}
            aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'All notifications caught up'}
          >
            {unreadCount > 0 ? (
              <>
                <span className="welcome-banner-notif-dot" />
                <Bell size={14} className="welcome-banner-notif-icon" />
                <span className="welcome-banner-notif-count">
                  {loadingCount ? '...' : `${unreadCount} unread`}
                </span>
                <ArrowRight size={12} className="welcome-banner-notif-arrow" />
              </>
            ) : (
              <>
                <CheckCircle2 size={14} className="welcome-banner-clear-icon" />
                <span className="welcome-banner-notif-clear-text">All caught up</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
