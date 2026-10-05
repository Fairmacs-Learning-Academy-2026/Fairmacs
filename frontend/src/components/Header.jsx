import React, { useEffect, useState } from 'react';
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
  BadgeCheck
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';
import FairmacsLogo from './FairmacsLogo';
import PasswordModal from './PasswordModal';

export default function Header({ onOpenCertificates, onNavigateHome }) {
  const { user, logout } = useAuth();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Real notifications from backend
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // ============================================================
  // LOAD NOTIFICATIONS
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      if (!user) {
        return;
      }

      try {
        setNotificationLoading(true);

        const data = await notificationService.getNotifications();

        if (mounted) {
          setNotifications(
            Array.isArray(data) ? data : []
          );
        }
      } catch (error) {
        console.error(
          'Failed to load notifications:',
          error
        );

        if (mounted) {
          setNotifications([]);
        }
      } finally {
        if (mounted) {
          setNotificationLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      mounted = false;
    };
  }, [user]);

  // ============================================================
  // UNREAD COUNT
  // ============================================================

  const unreadCount = notifications.filter(
    notification => !notification.read
  ).length;

  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  const markAllRead = async () => {
    try {
      await notificationService.markAllAsRead();

      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          read: true
        }))
      );
    } catch (error) {
      console.error(
        'Failed to mark all notifications as read:',
        error
      );
    }
  };

  // ============================================================
  // MARK ONE NOTIFICATION AS READ
  // ============================================================

  const markNotificationRead = async notificationId => {
    try {
      await notificationService.markAsRead(
        notificationId
      );

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? {
                ...notification,
                read: true
              }
            : notification
        )
      );
    } catch (error) {
      console.error(
        'Failed to mark notification as read:',
        error
      );
    }
  };

  // ============================================================
  // NOTIFICATION VISUAL TYPE
  // ============================================================

  const getNotificationVisual = type => {
    switch (type) {
      case 'TRAINING_DUE_SOON':
      case 'TRAINING_OVERDUE':
      case 'ASSESSMENT_FAILED':
        return {
          background: '#ffe4e6',
          color: '#e11d48',
          icon: (
            <AlertTriangle
              style={{
                width: 15,
                height: 15
              }}
            />
          )
        };

      case 'CERTIFICATE_ISSUED':
        return {
          background: '#fef3c7',
          color: '#d97706',
          icon: (
            <Trophy
              style={{
                width: 15,
                height: 15
              }}
            />
          )
        };

      case 'COURSE_COMPLETED':
      case 'ASSESSMENT_RESULT':
        return {
          background: '#dcfce7',
          color: '#16a34a',
          icon: (
            <Check
              style={{
                width: 15,
                height: 15
              }}
            />
          )
        };

      case 'ANNOUNCEMENT':
        return {
          background: '#e0f2fe',
          color: '#0284c7',
          icon: (
            <Info
              style={{
                width: 15,
                height: 15
              }}
            />
          )
        };

      case 'COURSE_ASSIGNED':
      default:
        return {
          background: '#e0f2fe',
          color: '#0284c7',
          icon: (
            <BookOpen
              style={{
                width: 15,
                height: 15
              }}
            />
          )
        };
    }
  };

  // ============================================================
  // FORMAT NOTIFICATION TIME
  // ============================================================

  const formatNotificationTime = createdAt => {
    if (!createdAt) {
      return '';
    }

    const created = new Date(createdAt);

    if (Number.isNaN(created.getTime())) {
      return '';
    }

    const now = new Date();

    const difference =
      now.getTime() - created.getTime();

    const seconds = Math.floor(
      difference / 1000
    );

    const minutes = Math.floor(
      seconds / 60
    );

    const hours = Math.floor(
      minutes / 60
    );

    const days = Math.floor(
      hours / 24
    );

    if (seconds < 60) {
      return 'Just now';
    }

    if (minutes < 60) {
      return `${minutes} ${
        minutes === 1 ? 'min' : 'mins'
      } ago`;
    }

    if (hours < 24) {
      return `${hours} ${
        hours === 1 ? 'hour' : 'hours'
      } ago`;
    }

    if (days === 1) {
      return 'Yesterday';
    }

    if (days < 7) {
      return `${days} days ago`;
    }

    return created.toLocaleDateString();
  };

  // ============================================================
  // GREETING
  // ============================================================

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    }

    if (hour < 18) {
      return 'Good afternoon';
    }

    return 'Good evening';
  };

  // ============================================================
  // ROLE LABEL
  // ============================================================

  const roleLabel =
    user?.roleLabel ||
    (
      user?.role === 'HR_ADMIN'
        ? 'HR / Admin'
        : user?.role
    );

  const firstName =
    user?.name
      ? user.name.split(' ')[0]
      : 'User';

  return (
    <header className="header">

      {/* ======================================================
          BRAND LOGO
      ====================================================== */}

      <div
        className="brand-logo"
        onClick={onNavigateHome}
        style={{ cursor: 'pointer' }}
        title="Return to Fairmacs Home Page"
      >
        <FairmacsLogo
          variant="default"
          height={42}
        />
      </div>

      {/* ======================================================
          DYNAMIC GREETING
      ====================================================== */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 800,
            color: '#0f172a'
          }}
        >
          {getGreeting()}, {firstName} 👋
        </span>

        <span
          style={{
            background:
              user?.role === 'HR_ADMIN'
                ? '#f3e8ff'
                : user?.role === 'MANAGER'
                ? '#fef3c7'
                : user?.role === 'TRAINER'
                ? '#e0f2fe'
                : '#e0f2fe',

            color:
              user?.role === 'HR_ADMIN'
                ? '#7e22ce'
                : user?.role === 'MANAGER'
                ? '#b45309'
                : user?.role === 'TRAINER'
                ? '#0369a1'
                : '#0369a1',

            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.2rem 0.6rem',
            borderRadius: '20px'
          }}
        >
          {roleLabel}
        </span>
      </div>

      {/* ======================================================
          USER ACTIONS
      ====================================================== */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          position: 'relative'
        }}
      >

        {/* ====================================================
            CERTIFICATES
        ==================================================== */}

        <button
          onClick={onOpenCertificates}
          style={{
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            padding: '0.4rem 0.8rem',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer'
          }}
        >
          <Award
            style={{
              width: 16,
              height: 16
            }}
          />

          Certificates
        </button>

        {/* ====================================================
            NOTIFICATIONS
        ==================================================== */}

        <div style={{ position: 'relative' }}>

          <button
            onClick={() => {
              setShowNotifDrawer(
                !showNotifDrawer
              );

              setShowDropdown(false);
            }}
            style={{
              position: 'relative',
              background: '#f1f5f9',
              border: 'none',
              padding: '0.55rem',
              borderRadius: '50%',
              color: '#475569',
              cursor: 'pointer'
            }}
            title="Notifications"
          >
            <Bell
              style={{
                width: 18,
                height: 18
              }}
            />

            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  background: '#f43f5e',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* ==================================================
              NOTIFICATION DRAWER
          ================================================== */}

          {showNotifDrawer && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '48px',
                width: '340px',
                background: 'white',
                borderRadius: '12px',
                boxShadow:
                  '0 10px 30px rgba(0, 0, 0, 0.18)',
                border: '1px solid #e2e8f0',
                padding: '1rem',
                zIndex: 1000,
                animation:
                  'fadeIn 0.2s ease-out'
              }}
            >

              {/* Notification Header */}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.75rem',
                  borderBottom:
                    '1px solid #f1f5f9',
                  marginBottom: '0.75rem'
                }}
              >
                <div
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}
                >
                  Notifications

                  {unreadCount > 0 && (
                    <span
                      style={{
                        color: '#0284c7'
                      }}
                    >
                      {' '}
                      ({unreadCount})
                    </span>
                  )}
                </div>

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

              {/* Notification List */}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}
              >

                {/* Loading */}

                {notificationLoading ? (

                  <div
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      fontSize: '0.78rem',
                      color: '#64748b'
                    }}
                  >
                    Loading notifications...
                  </div>

                ) : notifications.length === 0 ? (

                  /* Empty */

                  <div
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      fontSize: '0.78rem',
                      color: '#64748b'
                    }}
                  >
                    No notifications
                  </div>

                ) : (

                  /* Notifications */

                  notifications.map(notif => {

                    const visual =
                      getNotificationVisual(
                        notif.type
                      );

                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (!notif.read) {
                            markNotificationRead(
                              notif.id
                            );
                          }
                        }}
                        style={{
                          background:
                            notif.read
                              ? '#ffffff'
                              : '#f0f9ff',

                          padding: '0.75rem',

                          borderRadius: '8px',

                          border:
                            '1px solid #e2e8f0',

                          display: 'flex',

                          gap: '0.6rem',

                          alignItems:
                            'flex-start',

                          cursor:
                            notif.read
                              ? 'default'
                              : 'pointer'
                        }}
                      >

                        {/* Notification Icon */}

                        <div
                          style={{
                            padding: '0.35rem',
                            borderRadius: '50%',
                            background:
                              visual.background,
                            color:
                              visual.color,
                            flexShrink: 0
                          }}
                        >
                          {visual.icon}
                        </div>

                        {/* Notification Content */}

                        <div>

                          <div
                            style={{
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              color: '#0f172a'
                            }}
                          >
                            {notif.title}
                          </div>

                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: '#475569',
                              marginTop: '0.15rem',
                              lineHeight: 1.35
                            }}
                          >
                            {notif.message}
                          </div>

                          <div
                            style={{
                              fontSize: '0.68rem',
                              color: '#94a3b8',
                              marginTop: '0.35rem'
                            }}
                          >
                            {formatNotificationTime(
                              notif.createdAt
                            )}
                          </div>

                        </div>

                      </div>
                    );
                  })

                )}

              </div>

            </div>
          )}

        </div>

        {/* ====================================================
            PROFILE DROPDOWN
        ==================================================== */}

        <div
          style={{
            position: 'relative'
          }}
        >

          <button
            onClick={() => {
              setShowDropdown(
                !showDropdown
              );

              setShowNotifDrawer(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              paddingLeft: '0.75rem',
              borderLeft:
                '1px solid #e2e8f0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >

            <img
              src={
                user?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
              }
              alt={user?.name}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                objectFit: 'cover',
                border:
                  '2px solid #0284c7'
              }}
            />

            <div>

              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {user?.name}

                <ChevronDown
                  style={{
                    width: 14,
                    height: 14,
                    color: '#64748b'
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#64748b'
                }}
              >
                {user?.designation}
              </div>

            </div>

          </button>

          {/* ==================================================
              USER ACCOUNT MENU
          ================================================== */}

          {showDropdown && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '50px',
                width: '260px',
                background: 'white',
                borderRadius: '12px',
                boxShadow:
                  '0 10px 25px rgba(0, 0, 0, 0.15)',
                border:
                  '1px solid #e2e8f0',
                padding: '0.75rem',
                zIndex: 1000,
                animation:
                  'fadeIn 0.2s ease-out'
              }}
            >

              {/* User Summary */}

              <div
                style={{
                  padding:
                    '0.5rem 0.75rem',
                  borderBottom:
                    '1px solid #f1f5f9',
                  marginBottom: '0.5rem'
                }}
              >

                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#0f172a'
                  }}
                >
                  {user?.name}
                </div>

                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#64748b'
                  }}
                >
                  ID:{' '}
                  {user?.employeeId ||
                    user?.id}
                </div>

                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#0284c7',
                    fontWeight: 600
                  }}
                >
                  {user?.email}
                </div>

              </div>

              {/* About */}

              <button
                onClick={() => {
                  setShowDropdown(false);
                  setShowAboutModal(true);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding:
                    '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: '#334155',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <User
                  style={{
                    width: 16,
                    height: 16,
                    color: '#0284c7'
                  }}
                />

                About
              </button>

              {/* Change Password */}

              <button
                onClick={() => {
                  setShowDropdown(false);
                  setShowPasswordModal(true);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding:
                    '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: '#334155',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Lock
                  style={{
                    width: 16,
                    height: 16,
                    color: '#64748b'
                  }}
                />

                Change Password
              </button>

              {/* Sign Out */}

              <button
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding:
                    '0.6rem 0.75rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: '#e11d48',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '0.25rem'
                }}
              >
                <LogOut
                  style={{
                    width: 16,
                    height: 16
                  }}
                />

                Sign Out
              </button>

            </div>
          )}

        </div>

      </div>

      {/* ======================================================
          ABOUT MODAL
      ====================================================== */}

      {showAboutModal && (
        <div
          className="modal-overlay"
          onClick={() =>
            setShowAboutModal(false)
          }
          style={{
            zIndex: 2000
          }}
        >

          <div
            className="modal-content animate-fade-in"
            onClick={e =>
              e.stopPropagation()
            }
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: 0,
              overflow: 'hidden'
            }}
          >

            {/* Modal Header */}

            <div
              style={{
                background:
                  'linear-gradient(135deg, #0b1f38 0%, #0c2340 55%, #075985 100%)',
                padding: '1.5rem',
                color: 'white',
                position: 'relative'
              }}
            >

              <button
                onClick={() =>
                  setShowAboutModal(false)
                }
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '1rem',
                  background:
                    'rgba(255,255,255,0.15)',
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
                <X
                  style={{
                    width: 18,
                    height: 18
                  }}
                />
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >

                <img
                  src={
                    user?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
                  }
                  alt={user?.name}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border:
                      '3px solid rgba(255,255,255,0.9)'
                  }}
                />

                <div>

                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#7dd3fc',
                      textTransform:
                        'uppercase',
                      letterSpacing: '0.8px',
                      marginBottom: '0.2rem'
                    }}
                  >
                    Employee Profile
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      fontSize: '1.35rem',
                      fontWeight: 800
                    }}
                  >
                    {user?.name || 'User'}
                  </h2>

                  <div
                    style={{
                      marginTop: '0.2rem',
                      fontSize: '0.8rem',
                      color: '#cbd5e1'
                    }}
                  >
                    {user?.designation ||
                      'Employee'}
                  </div>

                </div>

              </div>

            </div>

            {/* Details */}

            <div
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem'
              }}
            >

              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: '0.2rem'
                }}
              >
                Personal & Work Information
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 1fr',
                  gap: '0.75rem'
                }}
              >

                {/* Employee ID */}

                <div
                  style={{
                    padding: '0.85rem',
                    background: '#f8fafc',
                    border:
                      '1px solid #e2e8f0',
                    borderRadius: '10px'
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
                    <BadgeCheck
                      style={{
                        width: 14,
                        height: 14
                      }}
                    />

                    Employee ID
                  </div>

                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {user?.employeeId ||
                      user?.id ||
                      'N/A'}
                  </div>
                </div>

                {/* Role */}

                <div
                  style={{
                    padding: '0.85rem',
                    background: '#f8fafc',
                    border:
                      '1px solid #e2e8f0',
                    borderRadius: '10px'
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
                    <ShieldCheck
                      style={{
                        width: 14,
                        height: 14
                      }}
                    />

                    Role
                  </div>

                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {roleLabel || 'N/A'}
                  </div>
                </div>

                {/* Email */}

                <div
                  style={{
                    padding: '0.85rem',
                    background: '#f8fafc',
                    border:
                      '1px solid #e2e8f0',
                    borderRadius: '10px'
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
                    <Mail
                      style={{
                        width: 14,
                        height: 14
                      }}
                    />

                    Email
                  </div>

                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#0284c7',
                      wordBreak: 'break-word'
                    }}
                  >
                    {user?.email || 'N/A'}
                  </div>
                </div>

                {/* Department */}

                <div
                  style={{
                    padding: '0.85rem',
                    background: '#f8fafc',
                    border:
                      '1px solid #e2e8f0',
                    borderRadius: '10px'
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
                    <Building2
                      style={{
                        width: 14,
                        height: 14
                      }}
                    />

                    Department
                  </div>

                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {user?.department ||
                      'N/A'}
                  </div>
                </div>

                {/* Designation */}

                <div
                  style={{
                    padding: '0.85rem',
                    background: '#f8fafc',
                    border:
                      '1px solid #e2e8f0',
                    borderRadius: '10px',
                    gridColumn: '1 / -1'
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
                    <Briefcase
                      style={{
                        width: 14,
                        height: 14
                      }}
                    />

                    Designation
                  </div>

                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {user?.designation ||
                      'N/A'}
                  </div>
                </div>

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
                  border:
                    '1px solid #bbf7d0',
                  borderRadius: '10px'
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <ShieldCheck
                    style={{
                      width: 18,
                      height: 18,
                      color: '#16a34a'
                    }}
                  />

                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#166534'
                    }}
                  >
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
                onClick={() =>
                  setShowAboutModal(false)
                }
                className="btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  marginTop: '0.25rem'
                }}
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ======================================================
          PASSWORD MODAL
      ====================================================== */}

      {showPasswordModal && (
        <PasswordModal
          onClose={() =>
            setShowPasswordModal(false)
          }
        />
      )}

    </header>
  );
}