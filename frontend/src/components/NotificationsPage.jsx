import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  Trophy,
  BookOpen,
  Info,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  notificationService,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  formatNotificationCategory,
  resolveNotificationNavigation
} from '../services/notificationService';

const PAGE_SIZE = 15;

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [readFilter, setReadFilter] = useState('ALL'); // ALL | UNREAD | READ
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);

  const [notifications, setNotifications] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runningJob, setRunningJob] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState(null);

  const showFeedback = (type, text) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const isHrAdmin = user?.role === 'HR_ADMIN';

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const readParam =
        readFilter === 'UNREAD'
          ? false
          : readFilter === 'READ'
          ? true
          : undefined;

      const data = await notificationService.getNotificationsPage({
        read: readParam,
        type: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
        search: debouncedSearch || undefined,
        page,
        size: PAGE_SIZE
      });

      setNotifications(Array.isArray(data?.content) ? data.content : []);
      setTotalElements(Number(data?.totalElements) || 0);
      setTotalPages(Number(data?.totalPages) || 0);
      setUnreadCount(Math.max(0, Number(data?.unreadCount) || 0));
    } catch (err) {
      setError(err?.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [readFilter, categoryFilter, priorityFilter, debouncedSearch, page]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const handleMarkAsRead = async (notificationId, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('fairmacs:notifications-updated'));
    } catch (err) {
      showFeedback('error', 'Could not mark notification as read.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('fairmacs:notifications-updated'));
      showFeedback('success', 'All notifications marked as read.');
      if (readFilter === 'UNREAD') {
        fetchPage();
      }
    } catch (err) {
      showFeedback('error', 'Could not mark all notifications as read.');
    }
  };

  const handleOpenNotification = async (notif) => {
    if (!notif.read) {
      await handleMarkAsRead(notif.id);
    }
    const dest = resolveNotificationNavigation(notif);
    if (dest?.path && dest.path !== '/notifications') {
      navigate(dest.path);
    }
  };

  const handleRunRemindersNow = async () => {
    setRunningJob(true);
    try {
      const res = await notificationService.runReminders();
      const created = res?.notificationsCreated ?? 0;
      showFeedback('success', `Deadline & overdue scan completed (${created} new notifications).`);
      window.dispatchEvent(new CustomEvent('fairmacs:notifications-updated'));
      fetchPage();
    } catch (err) {
      showFeedback('error', 'Failed to trigger deadline reminder scan.');
    } finally {
      setRunningJob(false);
    }
  };

  const handleRunDigestNow = async () => {
    setRunningJob(true);
    try {
      const res = await notificationService.runComplianceDigest();
      const created = res?.notificationsCreated ?? 0;
      showFeedback('success', `Compliance digest completed (${created} summary alerts generated).`);
      window.dispatchEvent(new CustomEvent('fairmacs:notifications-updated'));
      fetchPage();
    } catch (err) {
      showFeedback('error', 'Failed to trigger compliance digest.');
    } finally {
      setRunningJob(false);
    }
  };

  const getVisualForType = (type) => {
    switch (String(type || '').toUpperCase()) {
      case 'COURSE_OVERDUE':
      case 'TRAINING_OVERDUE':
      case 'ASSESSMENT_FAILED':
      case 'COURSE_CANCELLED':
      case 'SYSTEM_ALERT':
        return {
          bg: 'rgba(254, 226, 226, 0.85)',
          color: '#dc2626',
          icon: <AlertTriangle style={{ width: 18, height: 18 }} />
        };
      case 'COURSE_DUE_SOON':
      case 'TRAINING_DUE_SOON':
      case 'DEADLINE_CHANGED':
        return {
          bg: 'rgba(254, 243, 199, 0.85)',
          color: '#d97706',
          icon: <Clock style={{ width: 18, height: 18 }} />
        };
      case 'CERTIFICATE_ISSUED':
        return {
          bg: 'rgba(254, 243, 199, 0.85)',
          color: '#b45309',
          icon: <Trophy style={{ width: 18, height: 18 }} />
        };
      case 'COURSE_COMPLETED':
      case 'MODULE_COMPLETED':
      case 'ASSESSMENT_RESULT':
        return {
          bg: 'rgba(220, 252, 231, 0.85)',
          color: '#15803d',
          icon: <Check style={{ width: 18, height: 18 }} />
        };
      case 'TEAM_COMPLIANCE':
      case 'HR_ADMIN_ALERT':
      case 'GENERAL_ANNOUNCEMENT':
        return {
          bg: 'rgba(224, 242, 254, 0.85)',
          color: '#0369a1',
          icon: <Info style={{ width: 18, height: 18 }} />
        };
      default:
        return {
          bg: 'rgba(226, 240, 255, 0.85)',
          color: '#1677FF',
          icon: <BookOpen style={{ width: 18, height: 18 }} />
        };
    }
  };

  const getPriorityBadge = (priority) => {
    const p = String(priority || 'NORMAL').toUpperCase();
    if (p === 'CRITICAL') {
      return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', label: 'Critical' };
    }
    if (p === 'HIGH') {
      return { bg: '#ffedd5', color: '#c2410c', border: '#fed7aa', label: 'High Priority' };
    }
    if (p === 'LOW') {
      return { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0', label: 'Low' };
    }
    return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Normal' };
  };

  const formatRelativeTime = (createdAt) => {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const secs = Math.floor(diffMs / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (secs < 60) return 'Just now';
    if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {feedbackBanner && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderRadius: '14px',
            background: feedbackBanner.type === 'error' ? '#FEF2F2' : '#ECFDF5',
            border: feedbackBanner.type === 'error' ? '1px solid #FECACA' : '1px solid #A7F3D0',
            color: feedbackBanner.type === 'error' ? '#B91C1C' : '#065F46',
            fontSize: '0.84rem',
            fontWeight: 700
          }}
        >
          {feedbackBanner.text}
        </div>
      )}
      {/* ======================================================
          HEADER BANNER
      ====================================================== */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem 1.75rem',
          borderRadius: '22px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #1677FF, #102A43)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(22, 119, 255, 0.25)'
            }}
          >
            <Bell style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#102A43' }}>
                Notification Centre
              </h1>
              <span
                style={{
                  background: unreadCount > 0 ? '#fee2e2' : '#dcfce7',
                  color: unreadCount > 0 ? '#b91c1c' : '#15803d',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px'
                }}
              >
                {unreadCount} Unread
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Course assignments, deadline reminders, assessment results, certificates, and compliance updates
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {isHrAdmin && (
            <>
              <button
                type="button"
                disabled={runningJob}
                onClick={handleRunRemindersNow}
                className="glass-button-secondary"
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                title="Evaluate due-soon and overdue enrollments right now"
              >
                <Zap style={{ width: 14, height: 14, color: '#d97706' }} />
                Run Deadline Scan
              </button>
              <button
                type="button"
                disabled={runningJob}
                onClick={handleRunDigestNow}
                className="glass-button-secondary"
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                title="Generate Manager & HR weekly compliance summaries"
              >
                <ShieldAlert style={{ width: 14, height: 14, color: '#1677FF' }} />
                Send Compliance Digest
              </button>
            </>
          )}

          <button
            type="button"
            onClick={fetchPage}
            className="glass-button-secondary"
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="btn-primary"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <CheckCheck style={{ width: 15, height: 15 }} />
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* ======================================================
          FILTERS & TABS BAR
      ====================================================== */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '18px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.85rem'
        }}
      >
        {/* Read / Unread Tabs */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(241, 245, 249, 0.85)',
            padding: '0.25rem',
            borderRadius: '12px',
            border: '1px solid rgba(226, 232, 240, 0.9)'
          }}
        >
          {[
            { id: 'ALL', label: 'All' },
            { id: 'UNREAD', label: `Unread (${unreadCount})` },
            { id: 'READ', label: 'Read' }
          ].map((tab) => {
            const active = readFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setReadFilter(tab.id);
                  setPage(0);
                }}
                style={{
                  padding: '0.42rem 0.95rem',
                  borderRadius: '9px',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: active ? '#1677FF' : 'transparent',
                  color: active ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search + Category + Priority Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 220px', maxWidth: '320px' }}>
            <Search
              style={{
                width: 15,
                height: 15,
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b'
              }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search notifications..."
              style={{
                width: '100%',
                padding: '0.48rem 0.75rem 0.48rem 2.2rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                background: 'rgba(255,255,255,0.9)'
              }}
             enterKeyHint="search" />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter style={{ width: 14, height: 14, color: '#64748b' }} />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
              aria-label="Filter by notification category"
              style={{
                padding: '0.48rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#1e293b',
                background: 'rgba(255,255,255,0.9)'
              }}
            >
              {NOTIFICATION_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(0);
            }}
            aria-label="Filter by notification priority"
            style={{
              padding: '0.48rem 0.75rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#1e293b',
              background: 'rgba(255,255,255,0.9)'
            }}
          >
            {NOTIFICATION_PRIORITIES.map((pri) => (
              <option key={pri.value} value={pri.value}>
                {pri.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ======================================================
          NOTIFICATION FEED
      ====================================================== */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem',
          borderRadius: '20px',
          minHeight: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        {loading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            Loading notifications...
          </div>
        ) : error ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '14px',
              color: '#b91c1c'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{error}</div>
            <button
              type="button"
              onClick={fetchPage}
              className="btn-primary"
              style={{ padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem' }}
            >
              Try Again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <Bell style={{ width: 36, height: 36, color: '#94a3b8', margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
              No matching notifications
            </div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              {readFilter !== 'ALL' || categoryFilter !== 'ALL' || priorityFilter !== 'ALL' || debouncedSearch
                ? 'Try clearing your active search or category filters.'
                : 'When courses are assigned, deadlines approach, or certificates are issued, they will appear here.'}
            </div>
          </div>
        ) : (
          notifications.map((notif) => {
            const visual = getVisualForType(notif.type);
            const pri = getPriorityBadge(notif.priority);
            const exactTimestamp = notif.createdAt
              ? new Date(notif.createdAt).toLocaleString()
              : '';
            const dest = resolveNotificationNavigation(notif);
            const hasDestination = dest?.path && dest.path !== '/notifications';

            return (
              <div
                key={notif.id}
                onClick={() => handleOpenNotification(notif)}
                style={{
                  background: notif.read
                    ? 'rgba(255, 255, 255, 0.72)'
                    : 'rgba(235, 245, 255, 0.92)',
                  border: notif.read
                    ? '1px solid rgba(226, 232, 240, 0.9)'
                    : '1px solid rgba(147, 197, 253, 0.95)',
                  borderRadius: '14px',
                  padding: '1rem 1.15rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  cursor: hasDestination || !notif.read ? 'pointer' : 'default',
                  transition: 'all 0.16s ease',
                  boxShadow: notif.read
                    ? '0 2px 8px rgba(15, 23, 42, 0.03)'
                    : '0 6px 18px rgba(22, 119, 255, 0.08)'
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    background: visual.bg,
                    color: visual.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {visual.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                      marginBottom: '0.3rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.55rem',
                          borderRadius: '999px',
                          background: '#f1f5f9',
                          color: '#334155'
                        }}
                      >
                        {formatNotificationCategory(notif.type)}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.14rem 0.5rem',
                          borderRadius: '999px',
                          background: pri.bg,
                          color: pri.color,
                          border: `1px solid ${pri.border}`
                        }}
                      >
                        {pri.label}
                      </span>
                      {!notif.read && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            color: '#1677FF',
                            background: '#dbeafe',
                            padding: '0.12rem 0.48rem',
                            borderRadius: '999px'
                          }}
                        >
                          NEW
                        </span>
                      )}
                    </div>

                    <span
                      style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}
                      title={exactTimestamp}
                    >
                      {formatRelativeTime(notif.createdAt)}
                      {exactTimestamp ? ` • ${exactTimestamp}` : ''}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {notif.title}
                  </div>

                  <div
                    style={{
                      fontSize: '0.84rem',
                      color: '#334155',
                      marginTop: '0.25rem',
                      lineHeight: 1.5
                    }}
                  >
                    {notif.message}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginTop: '0.65rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    {hasDestination && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNotification(notif);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: '#1677FF',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        Open Related View <ExternalLink style={{ width: 13, height: 13 }} />
                      </button>
                    )}

                    {!notif.read && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: '#475569',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Check style={{ width: 13, height: 13 }} /> Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.85rem',
              marginTop: '0.5rem',
              borderTop: '1px solid #e2e8f0',
              fontSize: '0.8rem',
              color: '#475569'
            }}
          >
            <div>
              Showing page <strong>{page + 1}</strong> of <strong>{totalPages}</strong> ({totalElements} total notifications)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="glass-button-secondary"
                style={{
                  padding: '0.38rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  opacity: page <= 0 ? 0.5 : 1,
                  cursor: page <= 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <ChevronLeft style={{ width: 14, height: 14 }} /> Previous
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="glass-button-secondary"
                style={{
                  padding: '0.38rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  opacity: page + 1 >= totalPages ? 0.5 : 1,
                  cursor: page + 1 >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                Next <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
