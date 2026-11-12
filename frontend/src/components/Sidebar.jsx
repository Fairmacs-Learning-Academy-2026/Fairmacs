import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutGrid,
  Users,
  Building2,
  BookOpen,
  BarChart3,
  Award,
  Bell,
  Settings,
  Compass,
  Calendar,
  FileText,
  LibraryBig,
  Megaphone,
  LogOut,
  X
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';

export default function Sidebar({
  activeTab,
  setActiveTab,
  onOpenCertificates,
  mobileOpen = false,
  onCloseMobile
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Edge-activated emergence state
  const [isEmerged, setIsEmerged] = useState(false);
  const retractTimeoutRef = useRef(null);
  const sidebarRef = useRef(null);

  // Intentional movement & browser visibility lifecycle refs
  const isEmergedRef = useRef(false);
  const ignoreEventsUntilRef = useRef(Date.now() + 400); // 400ms guard on mount
  const lastPointerRef = useRef({ x: null, y: null, time: 0 });
  const hasMovedSinceFocusRef = useRef(false);
  const wasAtEdgeOnFocusRef = useRef(false);

  useEffect(() => {
    isEmergedRef.current = isEmerged;
  }, [isEmerged]);

  // Floating tooltip state for intelligent hover navigation
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const hoverTimeoutRef = useRef(null);
  const navContainerRef = useRef(null);

  const isHrAdmin = String(user?.role || '').toUpperCase() === 'HR_ADMIN';

  const getNavItems = () => {
    switch (String(user?.role || '').toUpperCase()) {
      case 'TRAINER':
        return [
          { id: 'dashboard', label: 'Trainer Overview', icon: LayoutGrid, path: '/trainer', animType: 'grid-pulse' },
          { id: 'catalog', label: 'Course Catalog', icon: Compass, path: '/courses', animType: 'compass-quiver' },
          { id: 'drafts', label: 'Drafts', icon: FileText, path: '/drafts', animType: 'doc-write' },
          { id: 'calendar', label: 'Training Calendar', icon: Calendar, path: '/training-calendar', animType: 'calendar-lift' },
          { id: 'reports', label: 'Training Analytics', icon: BarChart3, path: '/reports', animType: 'chart-grow' },
          { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications', animType: 'bell-sway' }
        ];
      case 'MANAGER':
        return [
          { id: 'dashboard', label: 'Team Compliance', icon: LayoutGrid, path: '/manager', animType: 'grid-pulse' },
          { id: 'allCourses', label: 'All Courses', icon: LibraryBig, path: '/manager/all-courses', animType: 'library-slide' },
          { id: 'catalog', label: 'Course Catalog', icon: Compass, path: '/courses', animType: 'compass-quiver' },
          { id: 'calendar', label: 'Training Calendar', icon: Calendar, path: '/training-calendar', animType: 'calendar-lift' },
          { id: 'reports', label: 'Team Reports', icon: BarChart3, path: '/reports', animType: 'chart-grow' },
          { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications', animType: 'bell-sway' }
        ];
      case 'HR_ADMIN':
        return [
          { id: 'overview', label: 'HR Overview', icon: LayoutGrid, path: '/hr/overview', animType: 'grid-pulse' },
          { id: 'employees', label: 'Employees', icon: Users, path: '/hr/employees', animType: 'person-shift' },
          { id: 'departments', label: 'Departments', icon: Building2, path: '/hr/departments', animType: 'building-lift' },
          { id: 'courses', label: 'Course Catalog', icon: BookOpen, path: '/hr/courses', animType: 'book-open' },
          { id: 'drafts', label: 'Course Drafts', icon: FileText, path: '/hr/drafts', animType: 'doc-write' },
          { id: 'reports', label: 'HR Analytics', icon: BarChart3, path: '/hr/reports', animType: 'chart-grow' },
          { id: 'certificates', label: 'Certificates', icon: Award, path: '/hr/certificates', animType: 'award-sparkle' },
          { id: 'announcements', label: 'Announcements', icon: Megaphone, path: '/hr/announcements', animType: 'bell-ring' },
          { id: 'settings', label: 'System Settings', icon: Settings, path: '/hr/settings', animType: 'gear-rotate' },
          { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications', animType: 'bell-sway' }
        ];
      default:
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutGrid, path: '/dashboard', animType: 'grid-pulse' },
          { id: 'mylearning', label: 'Progress Hub', icon: BookOpen, path: '/progress', animType: 'book-open' },
          { id: 'catalog', label: 'Course Catalog', icon: Compass, path: '/courses', animType: 'compass-quiver' },
          { id: 'calendar', label: 'Training Calendar', icon: Calendar, path: '/training-calendar', animType: 'calendar-lift' },
          { id: 'certificates', label: 'Certificates', icon: Award, path: '/certificates', animType: 'award-sparkle' },
          { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications', animType: 'bell-sway' }
        ];
    }
  };

  const navItems = getNavItems();

  // Reset all activation states (used on tab switch, window blur, or hidden state)
  const resetActivationState = useCallback(() => {
    if (retractTimeoutRef.current) {
      clearTimeout(retractTimeoutRef.current);
      retractTimeoutRef.current = null;
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsEmerged(false);
    isEmergedRef.current = false;
    setHoveredTooltip(null);
    lastPointerRef.current = { x: null, y: null, time: 0 };
    hasMovedSinceFocusRef.current = false;
    wasAtEdgeOnFocusRef.current = true;
  }, []);

  // Browser Lifecycle & Visibility Synchronization (prevent accidental tab restoration activation)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User switched away from KMS tab - immediately tuck away and clear timers
        resetActivationState();
      } else if (document.visibilityState === 'visible') {
        // User returned to KMS tab - keep sidebar tucked away and establish cooldown
        resetActivationState();
        ignoreEventsUntilRef.current = Date.now() + 350;
      }
    };

    const handleWindowBlur = () => {
      // Window lost focus (Alt-Tab, dev tools, minimize, click outside)
      resetActivationState();
    };

    const handleWindowFocus = () => {
      // Window restored / focused - keep hidden, absorb synthetic pointer events
      resetActivationState();
      ignoreEventsUntilRef.current = Date.now() + 350;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [resetActivationState]);

  // Emergence & Retraction Handlers with debounced grace period
  const emergeSidebar = useCallback(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    if (retractTimeoutRef.current) {
      clearTimeout(retractTimeoutRef.current);
      retractTimeoutRef.current = null;
    }
    setIsEmerged(true);
  }, []);

  const scheduleRetract = useCallback((delay = 350) => {
    if (retractTimeoutRef.current) {
      clearTimeout(retractTimeoutRef.current);
    }
    retractTimeoutRef.current = setTimeout(() => {
      setIsEmerged(false);
      setHoveredTooltip(null);
    }, delay);
  }, []);

  const keepEmerged = useCallback(() => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    if (retractTimeoutRef.current) {
      clearTimeout(retractTimeoutRef.current);
      retractTimeoutRef.current = null;
    }
    if (isEmergedRef.current) {
      setIsEmerged(true);
    }
  }, []);

  // Left-Edge Hotzone Handler with Intentional Motion Validation
  const handleEdgeZoneInteraction = useCallback(
    (e) => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      if (Date.now() < ignoreEventsUntilRef.current) {
        return;
      }
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        return;
      }
      if (wasAtEdgeOnFocusRef.current) {
        return;
      }

      // Check genuine pointer motion (require delta >= 2px)
      if (!hasMovedSinceFocusRef.current) {
        if (lastPointerRef.current.x === null || lastPointerRef.current.y === null) {
          lastPointerRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
          return;
        }
        const dx = e.clientX - lastPointerRef.current.x;
        const dy = e.clientY - lastPointerRef.current.y;
        if (Math.hypot(dx, dy) < 2) {
          return;
        }
        hasMovedSinceFocusRef.current = true;
      }

      emergeSidebar();
    },
    [emergeSidebar]
  );

  // Left-Edge Pointer Proximity Detection (approx 8-16px threshold) with Intentional Motion Validation
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (typeof window === 'undefined') return;
      if (window.innerWidth <= 768) return; // Mobile drawer handled via menu toggle

      // 1. Guard against hidden or background document
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      const now = Date.now();

      // 2. Cooldown period right after visibility/focus: absorb synthetic events & seed coordinates
      if (now < ignoreEventsUntilRef.current) {
        lastPointerRef.current = { x: e.clientX, y: e.clientY, time: now };
        if (e.clientX <= 48) {
          wasAtEdgeOnFocusRef.current = true;
        } else {
          wasAtEdgeOnFocusRef.current = false;
        }
        return;
      }

      const prev = lastPointerRef.current;

      // 3. First pointer event after mount/focus: seed coordinates without opening
      if (prev.x === null || prev.y === null) {
        lastPointerRef.current = { x: e.clientX, y: e.clientY, time: now };
        if (e.clientX <= 48) {
          wasAtEdgeOnFocusRef.current = true;
        } else {
          wasAtEdgeOnFocusRef.current = false;
        }
        return;
      }

      // 4. Calculate movement distance (filter out stationary clicks & jitter < 2px)
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      const distance = Math.hypot(dx, dy);

      lastPointerRef.current = { x: e.clientX, y: e.clientY, time: now };

      if (distance < 2) {
        return;
      }

      hasMovedSinceFocusRef.current = true;

      // 5. If cursor was sitting near edge on focus, wait until user moves into the workspace
      if (wasAtEdgeOnFocusRef.current) {
        if (e.clientX > 48) {
          wasAtEdgeOnFocusRef.current = false;
        }
        return;
      }

      // 6. Intentional left-edge proximity activation (e.clientX <= 16 threshold)
      if (e.clientX <= 16) {
        emergeSidebar();
      } else if (isEmergedRef.current && e.clientX > 120 && !retractTimeoutRef.current) {
        scheduleRetract(350);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (retractTimeoutRef.current) clearTimeout(retractTimeoutRef.current);
    };
  }, [emergeSidebar, scheduleRetract]);

  const handleNavClick = (item) => {
    setHoveredTooltip(null);
    if (item.path) {
      navigate(item.path);
      if (onCloseMobile) onCloseMobile();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (item.id === 'certificates' && onOpenCertificates) {
      onOpenCertificates();
      if (onCloseMobile) onCloseMobile();
      return;
    }

    if (setActiveTab) setActiveTab(item.id);
    if (onCloseMobile) onCloseMobile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isItemActive = (item) => {
    if (item.path) {
      if (item.path === '/hr/overview') {
        return location.pathname === '/hr/overview' || location.pathname === '/admin' || location.pathname === '/hr';
      }
      if (item.path === '/hr/departments') {
        return location.pathname.startsWith('/hr/departments');
      }
      return location.pathname === item.path;
    }
    return activeTab === item.id;
  };

  const roleDisplay = user?.roleLabel || (isHrAdmin ? 'HR / Admin' : user?.role || 'Staff');
  const userAvatar =
    user?.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';

  // Show floating tooltip beside target element
  const showTooltip = useCallback(
    (e, config) => {
      // Don't show floating desktop hover tooltips in open mobile drawer
      if (typeof window !== 'undefined' && window.innerWidth <= 768 && mobileOpen) return;

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredTooltip({
        id: config.id,
        label: config.label,
        sublabel: config.sublabel,
        isActive: config.isActive,
        item: config.item,
        onClick: config.onClick,
        top: Math.round(rect.top + rect.height / 2),
        left: Math.round(rect.right + 12)
      });
    },
    [mobileOpen]
  );

  const hideTooltip = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTooltip(null);
    }, 80);
  }, []);

  const keepTooltip = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Dismiss tooltip on scroll or resize; close mobile drawer if resized to desktop
  useEffect(() => {
    const handleScrollOrResize = () => {
      setHoveredTooltip(null);
      if (typeof window !== 'undefined' && window.innerWidth > 768 && mobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };

    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {/* Extreme Left Edge Proximity Activation Zone (Desktop & Tablet) */}
      <div
        className="sidebar-edge-hotzone"
        onMouseEnter={handleEdgeZoneInteraction}
        onMouseMove={handleEdgeZoneInteraction}
        aria-hidden="true"
      />

      {/* Mobile Translucent Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-overlay"
          onClick={onCloseMobile}
          role="button"
          tabIndex={0}
          aria-label="Close navigation drawer"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && onCloseMobile) onCloseMobile();
          }}
        />
      )}

      <aside
        ref={sidebarRef}
        className={`sidebar floating-glass-sidebar ${
          isEmerged ? 'sidebar-emerged' : ''
        } ${mobileOpen ? 'sidebar-mobile-open' : ''}`}
        aria-label="Sidebar Navigation"
        onMouseEnter={() => {
          if (isEmergedRef.current) {
            keepEmerged();
          }
        }}
        onMouseLeave={() => scheduleRetract(350)}
        onFocus={() => {
          if (isEmergedRef.current) {
            keepEmerged();
          }
        }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            scheduleRetract(400);
          }
        }}
      >
        {/* Section 1: Top Header Area (Mobile only) */}
        {mobileOpen && (
          <div className="sidebar-header-area">
            <div className="sidebar-mobile-header" style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>Navigation</span>
              {onCloseMobile && (
                <button
                  type="button"
                  className="glass-icon-button"
                  onClick={onCloseMobile}
                  aria-label="Close menu"
                  style={{ width: 32, height: 32 }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section 2: Scrollable Navigation Menu (Consumes remaining vertical space) */}
        <nav
          ref={navContainerRef}
          className="sidebar-nav-container"
          aria-label="Primary Navigation"
          onScroll={() => setHoveredTooltip(null)}
        >
          <ul
            className="sidebar-nav-list"
            role="list"
            style={{ '--total-items': navItems.length }}
          >
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isItemActive(item);

              return (
                <li
                  key={item.id}
                  style={{
                    position: 'relative',
                    '--item-index': index
                  }}
                >
                  <button
                    type="button"
                    className={`sidebar-nav-item glass-nav-item ${active ? 'active' : ''}`}
                    style={{ '--item-index': index }}
                    onClick={() => handleNavClick(item)}
                    aria-current={active ? 'page' : undefined}
                    aria-label={item.label}
                    onMouseEnter={(e) =>
                      showTooltip(e, {
                        id: item.id,
                        label: item.label,
                        item
                      })
                    }
                    onMouseLeave={hideTooltip}
                    onFocus={(e) =>
                      showTooltip(e, {
                        id: item.id,
                        label: item.label,
                        item
                      })
                    }
                    onBlur={hideTooltip}
                  >
                    {active && <span className="glass-nav-active-bar" />}
                    <span className="glass-nav-icon-wrap">
                      <Icon
                        className={`sidebar-icon-glyph sidebar-icon-${item.animType || 'grid-pulse'}`}
                        style={{
                          width: 19,
                          height: 19,
                          color: active ? '#0F6CBD' : '#475569',
                          flexShrink: 0,
                          transition: 'color 0.18s ease'
                        }}
                      />
                    </span>
                    <span className="sidebar-nav-label">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Section 3: User Profile & Logout Area (Fixed Bottom) */}
        <div
          className="sidebar-user-footer"
          style={{ '--total-items': navItems.length }}
        >
          {/* User Profile Avatar Button */}
          <button
            type="button"
            className={`sidebar-avatar-btn ${location.pathname === '/profile' ? 'active' : ''}`}
            onClick={() => {
              setHoveredTooltip(null);
              navigate('/profile');
              if (onCloseMobile) onCloseMobile();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label={`User Profile: ${user?.name || 'Administrator'} (${roleDisplay})`}
            aria-current={location.pathname === '/profile' ? 'page' : undefined}
            onMouseEnter={(e) =>
              showTooltip(e, {
                id: 'profile',
                label: user?.name || 'Administrator',
                sublabel: 'View Profile',
                onClick: () => {
                  setHoveredTooltip(null);
                  navigate('/profile');
                  if (onCloseMobile) onCloseMobile();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              })
            }
            onMouseLeave={hideTooltip}
            onFocus={(e) =>
              showTooltip(e, {
                id: 'profile',
                label: user?.name || 'Administrator',
                sublabel: 'View Profile',
                onClick: () => {
                  setHoveredTooltip(null);
                  navigate('/profile');
                  if (onCloseMobile) onCloseMobile();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              })
            }
            onBlur={hideTooltip}
          >
            <UserAvatar
              name={user?.name}
              employeeId={user?.employeeId}
              email={user?.email}
              size="sm"
            />
          </button>

          {/* User Details in Mobile Drawer Only */}
          {mobileOpen && (
            <div
              className="sidebar-mobile-user-info"
              onClick={() => {
                setHoveredTooltip(null);
                navigate('/profile');
                if (onCloseMobile) onCloseMobile();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
            >
              <div className="sidebar-mobile-user-name">{user?.name || 'Administrator'}</div>
              <div className="sidebar-mobile-user-role">{roleDisplay} • View Profile</div>
            </div>
          )}

          {/* Logout Action Button */}
          {logout && (
            <button
              type="button"
              onClick={logout}
              aria-label="Log out of Fairmacs KMS"
              className="sidebar-logout-btn"
              onMouseEnter={(e) =>
                showTooltip(e, {
                  id: 'logout',
                  label: 'Log Out',
                  sublabel: 'Sign out of Fairmacs KMS',
                  onClick: logout
                })
              }
              onMouseLeave={hideTooltip}
              onFocus={(e) =>
                showTooltip(e, {
                  id: 'logout',
                  label: 'Log Out',
                  sublabel: 'Sign out of Fairmacs KMS',
                  onClick: logout
                })
              }
              onBlur={hideTooltip}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Intelligent Floating Hover Tooltip Portal (Rendered outside overflow containers) */}
      {hoveredTooltip &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="sidebar-floating-tooltip"
            style={{
              position: 'fixed',
              top: `${hoveredTooltip.top}px`,
              left: `${hoveredTooltip.left}px`,
              transform: 'translateY(-50%)',
              zIndex: 99999,
              pointerEvents: 'auto'
            }}
            onMouseEnter={() => {
              keepTooltip();
              keepEmerged();
            }}
            onMouseLeave={() => {
              hideTooltip();
              scheduleRetract(320);
            }}
            onClick={() => {
              if (hoveredTooltip.onClick) {
                hoveredTooltip.onClick();
              } else if (hoveredTooltip.item) {
                handleNavClick(hoveredTooltip.item);
              }
            }}
            role="tooltip"
          >
            <div className="sidebar-tooltip-arrow" />
            <div className="sidebar-tooltip-content">
              <span className="sidebar-tooltip-label">{hoveredTooltip.label}</span>
              {hoveredTooltip.sublabel && (
                <span className="sidebar-tooltip-sublabel">{hoveredTooltip.sublabel}</span>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
