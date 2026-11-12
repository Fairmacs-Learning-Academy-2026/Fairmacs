import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Award,
  LogOut,
  Lock,
  User,
  ChevronDown,
  ShieldCheck,
  Check,
  AlertTriangle,
  Info,
  BookOpen,
  Trophy,
  X,
  Mail,
  Building2,
  Briefcase,
  BadgeCheck,
  Menu,
  Clock,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import {
  notificationService,
  formatNotificationCategory,
  resolveNotificationNavigation
} from '../services/notificationService';
import FairmacsLogo from './FairmacsLogo';
import PasswordModal from './PasswordModal';
import UserAvatar from './UserAvatar';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';

const icon = (size) => ({ width: size, height: size });

/* Small card used in the About modal */
function InfoCard({ Icon, label, children, wide = false, valueStyle = {} }) {
  return (
    <div
      style={{
        padding: '0.85rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        minWidth: 0,
        ...(wide ? { gridColumn: '1 / -1' } : {})
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: '#64748b',
          fontSize: '0.7rem',
          fontWeight: 700,
          marginBottom: '0.3rem'
        }}
      >
        <Icon style={icon(14)} />
        {label}
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', ...valueStyle }}>
        {children}
      </div>
    </div>
  );
}

const menuButtonStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  padding: '0.6rem 0.75rem',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  color: '#334155',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer'
};

export default function Header({
  onOpenCertificates,
  onOpenNotifications,
  onNavigateHome,
  onToggleMobileNav
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [serverUnreadCount, setServerUnreadCount] = useState(0);

  // ============================================================
  // ABOUT MODAL: close on Escape and lock page scroll while open
  // ============================================================

  useEffect(() => {
    if (!showAboutModal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowAboutModal(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [showAboutModal]);

  // ============================================================
  // LOAD NOTIFICATIONS (with 60s refresh & cross-page sync)
  // ============================================================

  const loadNotifications = useCallback(async (silent = false) => {
    if (!user) return;

    try {
      if (!silent) setNotificationLoading(true);
      const [data, count] = await Promise.all([
        notificationService.getNotifications({ size: 25 }),
        notificationService.getUnreadCount()
      ]);
      setNotifications(Array.isArray(data) ? data : []);
      setServerUnreadCount(typeof count === 'number' ? Math.max(0, count) : 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      if (!silent) setNotifications([]);
    } finally {
      if (!silent) setNotificationLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications(false);

    const intervalId = setInterval(() => {
      loadNotifications(true);
    }, 60000);

    const handleSync = () => {
      loadNotifications(true);
    };
    window.addEventListener('fairmacs:notifications-updated', handleSync);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('fairmacs:notifications-updated', handleSync);
    };
  }, [loadNotifications]);

  const unreadCount = serverUnreadCount;

  const markAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setServerUnreadCount(0);
      window.dispatchEvent(new CustomEvent('fairmacs:notifications-updated'));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setServerUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('fairmacs:notifications-updated'));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
    }
    setShowNotifDrawer(false);
    const dest = resolveNotificationNavigation(notif);
    if (dest?.path) {
      navigate(dest.path);
    }
  };

  const handleViewAllNotifications = () => {
    setShowNotifDrawer(false);
    if (onOpenNotifications) {
      onOpenNotifications();
    } else {
      navigate('/notifications');
    }
  };

  // ============================================================
  // NOTIFICATION VISUAL TYPE & PRIORITY
  // ============================================================

  const getNotificationVisual = (type) => {
    switch (String(type || '').toUpperCase()) {
      case 'TRAINING_OVERDUE':
      case 'COURSE_OVERDUE':
      case 'ASSESSMENT_FAILED':
      case 'COURSE_CANCELLED':
      case 'SYSTEM_ALERT':
        return { background: '#ffe4e6', color: '#e11d48', icon: <AlertTriangle style={icon(15)} /> };

      case 'TRAINING_DUE_SOON':
      case 'COURSE_DUE_SOON':
      case 'DEADLINE_CHANGED':
        return { background: '#fef3c7', color: '#d97706', icon: <Clock style={icon(15)} /> };

      case 'CERTIFICATE_ISSUED':
        return { background: '#fef3c7', color: '#d97706', icon: <Trophy style={icon(15)} /> };

      case 'COURSE_COMPLETED':
      case 'MODULE_COMPLETED':
      case 'ASSESSMENT_RESULT':
        return { background: '#dcfce7', color: '#16a34a', icon: <Check style={icon(15)} /> };

      case 'ANNOUNCEMENT':
      case 'GENERAL_ANNOUNCEMENT':
      case 'TEAM_COMPLIANCE':
      case 'HR_ADMIN_ALERT':
        return { background: '#e0f2fe', color: '#0284c7', icon: <Info style={icon(15)} /> };

      case 'COURSE_ASSIGNED':
      case 'QUIZ_AVAILABLE':
      case 'RETAKE_AVAILABLE':
      default:
        return { background: '#e0f2fe', color: '#0284c7', icon: <BookOpen style={icon(15)} /> };
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    const p = String(priority || 'NORMAL').toUpperCase();
    if (p === 'CRITICAL') {
      return { background: '#fee2e2', color: '#b91c1c', label: 'Critical' };
    }
    if (p === 'HIGH') {
      return { background: '#ffedd5', color: '#c2410c', label: 'High' };
    }
    return null;
  };

  // ============================================================
  // FORMAT NOTIFICATION TIME
  // ============================================================

  const formatNotificationTime = (createdAt) => {
    if (!createdAt) return '';

    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return '';

    const difference = Date.now() - created.getTime();
    const seconds = Math.floor(difference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`;
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return created.toLocaleDateString();
  };

  // ============================================================
  // GREETING / ROLE
  // ============================================================

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const roleLabel =
    user?.roleLabel || (user?.role === 'HR_ADMIN' ? 'HR / Admin' : user?.role);

  const firstName = user?.name ? user.name.split(' ')[0] : 'User';

  const userRole = String(user?.role || '').toUpperCase();
  const showCertificateAction = userRole === 'EMPLOYEE' && Boolean(onOpenCertificates);

  return (
    <header className="header floating-glass-header">
      {/* ======================================================
          BRAND LOGO & MOBILE HAMBURGER
      ====================================================== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {onToggleMobileNav && (
          <button
            type="button"
            className="glass-icon-button mobile-menu-toggle"
            onClick={onToggleMobileNav}
            aria-label="Toggle navigation menu"
            title="Open Menu"
            style={{ width: 36, height: 36 }}
          >
            <Menu style={icon(18)} />
          </button>
        )}

        <div
          className="brand-logo"
          onClick={onNavigateHome}
          style={{ cursor: 'pointer' }}
          title="Fairmacs - KMS"
        >
          <FairmacsLogo variant="default" height={42} />
        </div>
      </div>

      {/* ======================================================
          DYNAMIC GREETING (hidden on narrow screens via CSS)
      ====================================================== */}
      <div className="header-greeting">
        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--deep-navy)' }}>
          {getGreeting()}, {firstName} 👋
        </span>
      </div>

      {/* ======================================================
          USER ACTIONS
      ====================================================== */}

      <div
        className="header-actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          position: 'relative'
        }}
      >
        {/* CERTIFICATES (learner milestone access for Employee role) */}
        {showCertificateAction && (
          <button
            onClick={onOpenCertificates}
            type="button"
            className="glass-button-secondary"
            style={{
              background: 'rgba(236, 253, 245, 0.75)',
              color: '#047857',
              border: '1px solid rgba(167, 243, 208, 0.85)',
              padding: '0.42rem 0.85rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)'
            }}
          >
            <Award style={icon(15)} />
            Certificates
          </button>
        )}

        {/* NOTIFICATIONS */}

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              const nextState = !showNotifDrawer;
              setShowNotifDrawer(nextState);
              setShowDropdown(false);
              if (nextState) {
                loadNotifications(true);
              }
            }}
            type="button"
            className="glass-icon-button"
            style={{ position: 'relative' }}
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell style={icon(17)} />

            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  background: 'linear-gradient(135deg, #e11d48, #f43f5e)',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  minWidth: 18,
                  height: 18,
                  padding: '0 4px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(225, 29, 72, 0.4)'
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifDrawer && (
            <div
              className="header-menu glass-dropdown"
              style={{
                position: 'absolute',
                right: 0,
                top: '48px',
                width: '380px',
                maxWidth: 'calc(100vw - 24px)',
                padding: '1rem',
                zIndex: 1000,
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              {/* Notification Header */}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.75rem',
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: '0.75rem'
                }}
              >
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: '#e0f2fe',
                        color: '#0284c7',
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '999px'
                      }}
                    >
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    onClick={() => loadNotifications(false)}
                    title="Refresh notifications"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <RefreshCw style={icon(13)} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Notification List */}
              
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  maxHeight: '340px',
                  overflowY: 'auto'
                }}
              >
                {notificationLoading ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '1.75rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                    You’re all caught up! No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((notif) => {
                    const visual = getNotificationVisual(notif.type);
                    const priorityBadge = getPriorityBadgeStyle(notif.priority);
                    const exactDate = notif.createdAt
                      ? new Date(notif.createdAt).toLocaleString()
                      : '';

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          background: notif.read ? 'rgba(255, 255, 255, 0.85)' : '#f0f9ff',
                          padding: '0.75rem',
                          borderRadius: '10px',
                          border: notif.read ? '1px solid #e2e8f0' : '1px solid #bae6fd',
                          display: 'flex',
                          gap: '0.65rem',
                          alignItems: 'flex-start',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div
                          style={{
                            padding: '0.4rem',
                            borderRadius: '50%',
                            background: visual.background,
                            color: visual.color,
                            flexShrink: 0,
                            marginTop: '0.1rem'
                          }}
                        >
                          {visual.icon}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                            <span
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.45rem',
                                borderRadius: '999px',
                                background: '#f1f5f9',
                                color: '#475569'
                              }}
                            >
                              {formatNotificationCategory(notif.type)}
                            </span>
                            {priorityBadge && (
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  padding: '0.1rem 0.42rem',
                                  borderRadius: '999px',
                                  background: priorityBadge.background,
                                  color: priorityBadge.color
                                }}
                              >
                                {priorityBadge.label}
                              </span>
                            )}
                            {!notif.read && (
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: '50%',
                                  background: '#1677FF',
                                  marginLeft: 'auto'
                                }}
                                title="Unread"
                              />
                            )}
                          </div>

                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                            {notif.title}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '0.15rem', lineHeight: 1.4 }}>
                            {notif.message}
                          </div>
                          <div
                            style={{
                              fontSize: '0.68rem',
                              color: '#94a3b8',
                              marginTop: '0.35rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            title={exactDate}
                          >
                            <span>{formatNotificationTime(notif.createdAt)}</span>
                            <span style={{ color: '#1677FF', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                              Open <ExternalLink style={icon(10)} />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer: View All Notifications */}
              <div
                style={{
                  borderTop: '1px solid #f1f5f9',
                  marginTop: '0.75rem',
                  paddingTop: '0.65rem',
                  textAlign: 'center'
                }}
              >
                <button
                  type="button"
                  onClick={handleViewAllNotifications}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(22, 119, 255, 0.25)',
                    background: 'rgba(226, 240, 255, 0.55)',
                    color: '#1677FF',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PROFILE DROPDOWN */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="header-profile-trigger"
            onClick={() => {
              setShowDropdown(!showDropdown);
              setShowNotifDrawer(false);
            }}
          >
            <UserAvatar
              name={user?.name}
              employeeId={user?.employeeId}
              email={user?.email}
              size="sm"
            />

            <div className="header-profile-text">
              <div
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 750,
                  color: '#102A43',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {user?.name}
                <ChevronDown style={{ ...icon(14), color: '#64748b' }} />
              </div>

              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                {user?.designation}
              </div>
            </div>
          </button>

          {/* USER ACCOUNT MENU */}

          {showDropdown && (
            <div
              className="header-menu glass-dropdown"
              style={{
                position: 'absolute',
                right: 0,
                top: '50px',
                width: '260px',
                padding: '0.75rem',
                zIndex: 1000,
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              {/* User Summary */}

              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid #f1f5f9',
                  marginBottom: '0.5rem'
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  ID: {user?.employeeId || user?.id}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600, wordBreak: 'break-word' }}>
                  {user?.email}
                </div>
              </div>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/profile');
                }}
                style={menuButtonStyle}
              >
                <User style={{ ...icon(16), color: '#0284c7' }} />
                My Profile
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  setShowPasswordModal(true);
                }}
                style={menuButtonStyle}
              >
                <Lock style={{ ...icon(16), color: '#64748b' }} />
                Change Password
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
                style={{
                  ...menuButtonStyle,
                  color: '#e11d48',
                  fontWeight: 700,
                  marginTop: '0.25rem'
                }}
              >
                <LogOut style={icon(16)} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================
          ABOUT MODAL
          Rendered through a portal into document.body. The header uses
          backdrop-filter and position: sticky, which would otherwise trap
          this fixed overlay inside the 68px header (clipped and layered
          under the page content).
      ====================================================== */}
      {showAboutModal &&
        createPortal(
          <div
            className="modal-overlay"
            onClick={() => setShowAboutModal(false)}
            style={{ zIndex: 2000 }}
          >
            <div
              className="modal-content animate-fade-in"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Employee profile"
              style={{
                width: '100%',
                maxWidth: '520px',
                padding: 0,
                maxHeight: 'calc(100dvh - 32px)',
                overflowY: 'auto'
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0b1f38 0%, #0c2340 55%, #075985 100%)',
                  padding: '1.5rem',
                  color: 'white',
                  position: 'relative'
                }}
              >
                <button
                  onClick={() => setShowAboutModal(false)}
                  aria-label="Close profile"
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '1rem',
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    color: 'white',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X style={icon(18)} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <UserAvatar
                    name={user?.name}
                    employeeId={user?.employeeId}
                    email={user?.email}
                    size="xl"
                  />

                  <div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#7dd3fc',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        marginBottom: '0.2rem'
                      }}
                    >
                      Employee Profile
                    </div>

                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                      {user?.name || 'User'}
                    </h2>

                    <div style={{ marginTop: '0.2rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      {user?.designation || 'Employee'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem' }}>
                  Personal & Work Information
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <InfoCard Icon={BadgeCheck} label="Employee ID">
                    {user?.employeeId || user?.id || 'N/A'}
                  </InfoCard>

                  <InfoCard Icon={ShieldCheck} label="Role">
                    {roleLabel || 'N/A'}
                  </InfoCard>

                  <InfoCard
                    Icon={Mail}
                    label="Email"
                    valueStyle={{ fontSize: '0.8rem', color: '#0284c7', wordBreak: 'break-word' }}
                  >
                    {user?.email || 'N/A'}
                  </InfoCard>

                  <InfoCard Icon={Building2} label="Department">
                    {user?.department || 'N/A'}
                  </InfoCard>

                  <InfoCard Icon={Briefcase} label="Designation" wide>
                    {user?.designation || 'N/A'}
                  </InfoCard>
                </div>

                {/* Account Status */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '0.25rem',
                    padding: '0.85rem 1rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck style={{ ...icon(18), color: '#16a34a' }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                      Account Status
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: '#166534',
                      background: '#dcfce7',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '20px'
                    }}
                  >
                    {user?.status || 'ACTIVE'}
                  </span>
                </div>

                <button
                  onClick={() => setShowAboutModal(false)}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================
          PASSWORD MODAL (also portaled for the same reason)
      ====================================================== */}
      {showPasswordModal &&
        createPortal(
          <PasswordModal onClose={() => setShowPasswordModal(false)} />,
          document.body
        )}
    </header>
  );
}
