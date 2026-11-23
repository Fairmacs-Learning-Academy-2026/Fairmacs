import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  X,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getPriorityBadge(priority) {
  const p = String(priority || 'NORMAL').toUpperCase();
  if (p === 'URGENT') return { label: 'URGENT', class: 'red' };
  if (p === 'HIGH') return { label: 'HIGH', class: 'amber' };
  if (p === 'LOW') return { label: 'INFO', class: 'gray' };
  return { label: 'UPDATE', class: 'blue' };
}

export default function AnnouncementsWidget({ onViewAllAnnouncements }) {
  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // First try fetching announcements specifically
      let data = await notificationService.getNotifications({
        type: 'GENERAL_ANNOUNCEMENT',
        size: 10
      });

      // If no items of type GENERAL_ANNOUNCEMENT are found, also check general announcements/broadcast alerts
      if (!Array.isArray(data) || data.length === 0) {
        const allNotes = await notificationService.getNotifications({ size: 15 });
        if (Array.isArray(allNotes)) {
          // Filter for general announcement or broadcast/system alert types
          data = allNotes.filter(
            (n) =>
              n.type === 'GENERAL_ANNOUNCEMENT' ||
              n.type === 'SYSTEM_ALERT' ||
              n.type === 'HR_ADMIN_ALERT'
          );
          // If still none, include top broadcast items
          if (data.length === 0 && allNotes.length > 0) {
            data = allNotes.slice(0, 5);
          }
        }
      }

      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Unable to load company announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();

    const handleNotificationUpdate = () => {
      loadAnnouncements();
    };

    window.addEventListener('lms:notifications-updated', handleNotificationUpdate);
    return () => {
      window.removeEventListener('lms:notifications-updated', handleNotificationUpdate);
    };
  }, [loadAnnouncements]);

  const unreadCount = useMemo(() => {
    return announcements.filter((item) => !item.read && !item.isRead).length;
  }, [announcements]);

  // Open full announcement modal and explicitly mark as read upon user view
  const handleOpenAnnouncement = async (item) => {
    setSelectedAnnouncement(item);

    // CRITICAL: Viewing on dashboard does NOT mark as read; only opening full modal marks as read
    const isUnread = !item.read && !item.isRead;
    if (isUnread && item.id) {
      try {
        await notificationService.markAsRead(item.id);
        // Update local state without triggering full re-fetch to keep UX snappy
        setAnnouncements((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read: true, isRead: true } : n))
        );
        window.dispatchEvent(new CustomEvent('lms:notifications-updated'));
      } catch (err) {
        console.warn('Failed to mark announcement as read:', err);
      }
    }
  };

  const handleNavigateAll = () => {
    if (onViewAllAnnouncements) {
      onViewAllAnnouncements();
    } else {
      navigate('/notifications');
    }
  };

  const recentList = announcements.slice(0, 3);

  return (
    <div className="phase5-widget-card announcements-widget animate-fade-in">
      {/* Specular ambient highlight */}
      <div className="phase5-widget-ambient sky" />

      {/* Header */}
      <div className="phase5-widget-header">
        <div className="phase5-widget-title-stack">
          <div className="phase5-widget-title-row">
            <div className="phase5-icon-pill sky">
              <Megaphone size={18} />
            </div>
            <h3 className="phase5-widget-title">Announcements</h3>
            {unreadCount > 0 && (
              <span className="phase5-badge-pill sky">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="phase5-widget-subtitle">
            Company updates & organizational notices
          </p>
        </div>

        <button
          type="button"
          className="phase5-view-all-btn"
          onClick={handleNavigateAll}
          aria-label="View all company announcements"
        >
          <span>View all</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Content Body */}
      <div className="phase5-widget-body">
        {loading ? (
          <div className="phase5-skeleton-stack" aria-label="Loading announcements">
            <div className="phase5-skeleton-row" />
            <div className="phase5-skeleton-row" />
          </div>
        ) : error ? (
          <div className="phase5-error-state">
            <AlertCircle size={22} className="text-sky-500" />
            <p className="phase5-error-text">{error}</p>
            <button
              type="button"
              className="phase5-retry-btn"
              onClick={loadAnnouncements}
            >
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          </div>
        ) : announcements.length === 0 ? (
          /* Empty State - Apple clean rounded style matching reference image 3 */
          <div className="phase5-empty-state">
            <div className="phase5-empty-icon-circle sky">
              <Megaphone size={26} />
            </div>
            <h4 className="phase5-empty-title">No New Announcements</h4>
            <p className="phase5-empty-desc">
              You are completely up to date. No new announcements or company notices at this moment.
            </p>
            <button
              type="button"
              className="phase5-action-btn secondary"
              onClick={handleNavigateAll}
            >
              <Bell size={14} />
              <span>Notification Centre</span>
            </button>
          </div>
        ) : (
          /* Announcements List */
          <div className="phase5-items-list">
            {recentList.map((item) => {
              const isUnread = !item.read && !item.isRead;
              const dateStr = formatDate(item.createdAt);
              const priorityInfo = getPriorityBadge(item.priority);

              return (
                <div
                  key={item.id}
                  className={`phase5-item-card announcement-item ${isUnread ? 'is-unread' : ''}`}
                  onClick={() => handleOpenAnnouncement(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenAnnouncement(item);
                    }
                  }}
                  aria-label={`${item.title || 'Announcement'} ${isUnread ? '(Unread)' : ''}`}
                >
                  <div className="phase5-item-main">
                    <div className="phase5-announcement-status-col">
                      {isUnread ? (
                        <span className="phase5-unread-dot" title="Unread" />
                      ) : (
                        <span className="phase5-read-check">
                          <CheckCircle2 size={13} />
                        </span>
                      )}
                    </div>

                    <div className="phase5-item-details">
                      <div className="phase5-item-headline">
                        <span className="phase5-item-title announcement-title" title={item.title}>
                          {item.title || 'Company Notice'}
                        </span>
                        <span className={`phase5-urgency-pill ${priorityInfo.class}`}>
                          {priorityInfo.label}
                        </span>
                      </div>

                      {item.message && (
                        <p className="phase5-item-preview" title={item.message}>
                          {item.message}
                        </p>
                      )}

                      <div className="phase5-item-meta-row">
                        {dateStr && (
                          <span className="phase5-meta-item">
                            <Clock size={12} />
                            <span>{dateStr}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="phase5-item-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAnnouncement(item);
                    }}
                    aria-label={`Read announcement: ${item.title}`}
                  >
                    <span>Read</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Announcement Modal */}
      {selectedAnnouncement && (
        <div
          className="modal-overlay animate-fade-in"
          style={{ zIndex: 1100 }}
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="phase5-announcement-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-modal-title"
          >
            <div className="phase5-announcement-modal-header">
              <div className="phase5-announcement-modal-header-left">
                <div className="phase5-icon-pill sky">
                  <Megaphone size={18} />
                </div>
                <div>
                  <div className="phase5-modal-category">Company Announcement</div>
                  <h3 id="announcement-modal-title" className="phase5-modal-title">
                    {selectedAnnouncement.title || 'Company Notice'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                className="phase5-modal-close-btn"
                onClick={() => setSelectedAnnouncement(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="phase5-announcement-modal-meta">
              <span className={`phase5-urgency-pill ${getPriorityBadge(selectedAnnouncement.priority).class}`}>
                {getPriorityBadge(selectedAnnouncement.priority).label}
              </span>
              <span className="phase5-modal-date">
                Published: {formatDate(selectedAnnouncement.createdAt)}
              </span>
            </div>

            <div className="phase5-announcement-modal-body">
              <p className="phase5-modal-message">
                {selectedAnnouncement.message}
              </p>
            </div>

            <div className="phase5-announcement-modal-footer">
              {selectedAnnouncement.actionUrl && (
                <button
                  type="button"
                  className="phase5-action-btn primary"
                  onClick={() => {
                    navigate(selectedAnnouncement.actionUrl);
                    setSelectedAnnouncement(null);
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Open Attached Link</span>
                </button>
              )}
              <button
                type="button"
                className="phase5-action-btn secondary"
                onClick={() => setSelectedAnnouncement(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
