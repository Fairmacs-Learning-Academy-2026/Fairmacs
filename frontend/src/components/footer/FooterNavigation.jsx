import React from 'react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import FairmacsEmblem from '../FairmacsEmblem';

const PUBLIC_EXPLORE_LINKS = [
  { label: 'About Fairmacs', sectionId: 'about' },
  { label: 'Leadership', sectionId: 'leadership' },
  { label: 'Insights', sectionId: 'insights' },
  { label: 'Learning', sectionId: 'learning' },
];

const PUBLIC_QUICK_LINKS = [
  { label: 'Login to Academy', path: '/login' },
  { label: 'Learning Journey', sectionId: 'learning' },
  { label: 'Company Overview', sectionId: 'about' },
];

const PUBLIC_CONNECT_LINKS = [
  { label: 'Employee Portal', path: '/login' },
  { label: 'Manager & Trainer Portal', path: '/login' },
  { label: 'HR Administration', path: '/login' },
];

const ROLE_DASHBOARD_LINKS = {
  EMPLOYEE: [
    { label: 'My Learning', path: '/dashboard' },
    { label: 'Progress Hub', path: '/progress' },
    { label: 'Course Catalog', path: '/courses' },
    { label: 'Certificates', path: '/certificates' },
    { label: 'Notifications', path: '/notifications' },
    { label: 'Profile', path: '/profile' },
  ],
  MANAGER: [
    { label: 'Team Compliance', path: '/manager' },
    { label: 'Course Catalog', path: '/courses' },
    { label: 'Policies & Agreements', path: '/manager/policies' },
    { label: 'Team Reports', path: '/reports' },
    { label: 'Training Calendar', path: '/training-calendar' },
    { label: 'Profile', path: '/profile' },
  ],
  TRAINER: [
    { label: 'Trainer Overview', path: '/trainer' },
    { label: 'Course Catalog', path: '/courses' },
    { label: 'Drafts', path: '/drafts' },
    { label: 'Training Analytics', path: '/reports' },
    { label: 'Training Calendar', path: '/training-calendar' },
    { label: 'Profile', path: '/profile' },
  ],
  HR_ADMIN: [
    { label: 'HR Overview', path: '/hr/overview' },
    { label: 'Employees', path: '/hr/employees' },
    { label: 'Policies & Agreements', path: '/hr/policies' },
    { label: 'HR Analytics', path: '/hr/reports' },
    { label: 'System Settings', path: '/hr/settings' },
    { label: 'Profile', path: '/profile' },
  ],
};

const ROLE_LABELS = {
  EMPLOYEE: 'Employee Workspace',
  MANAGER: 'Manager Workspace',
  TRAINER: 'Trainer Workspace',
  HR_ADMIN: 'HR Admin Workspace',
};

export default function FooterNavigation({
  variant = 'public',
  role = 'EMPLOYEE',
  onNavigate,
  onScrollToSection,
}) {
  const handleItemClick = (item) => {
    if (item.sectionId && onScrollToSection) {
      onScrollToSection(item.sectionId);
    } else if (item.path && onNavigate) {
      onNavigate(item.path);
    }
  };

  if (variant === 'dashboard') {
    const normalizedRole = String(role || 'EMPLOYEE').toUpperCase();
    const links = ROLE_DASHBOARD_LINKS[normalizedRole] || ROLE_DASHBOARD_LINKS.EMPLOYEE;
    const roleLabel = ROLE_LABELS[normalizedRole] || ROLE_LABELS.EMPLOYEE;

    return (
      <nav
        className="fairmacs-footer-nav-dashboard"
        aria-label="Dashboard footer navigation"
      >
        <div className="fairmacs-footer-brand-lockup">
          <div className="fairmacs-footer-logo-badge">
            <FairmacsEmblem size={26} fill="#1B365D" />
          </div>
          <div>
            <div className="fairmacs-footer-brand-name fairmacs-brand-wordmark">FAIRMACS LEARNING ACADEMY</div>
            <div className="fairmacs-footer-brand-sub fairmacs-brand-tagline">ACROSS ALL BOUNDARIES</div>
          </div>
          <span className="fairmacs-role-badge">
            <ShieldCheck size={12} aria-hidden="true" />
            {roleLabel}
          </span>
        </div>

        <ul className="fairmacs-footer-dashboard-links">
          {links.map((item) => (
            <li key={item.path + item.label}>
              <button
                type="button"
                className="fairmacs-footer-link"
                onClick={() => handleItemClick(item)}
              >
                <span>{item.label}</span>
                <ArrowUpRight
                  size={14}
                  className="fairmacs-footer-link-arrow"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      className="fairmacs-footer-nav-grid-public"
      aria-label="Footer navigation"
    >
      {/* 1. Brand */}
      <div className="fairmacs-footer-brand-block">
        <div className="fairmacs-footer-brand-lockup">
          <div className="fairmacs-footer-logo-badge">
            <FairmacsEmblem size={26} fill="#1B365D" />
          </div>
          <div>
            <div className="fairmacs-footer-brand-name fairmacs-brand-wordmark">FAIRMACS</div>
            <div className="fairmacs-footer-brand-sub fairmacs-brand-tagline">ACROSS ALL BOUNDARIES</div>
          </div>
        </div>
        <p className="fairmacs-footer-brand-desc">
          A central learning and knowledge management platform connecting
          Fairmacs people, processes and business functions.
        </p>
        <address className="fairmacs-footer-contact-address">
          <span>Fairmacs Shipping &amp; Transport Services Pvt. Ltd.</span>
          <span>No.4/244, 1st street Noombal road, Sri Devi nagar, Kattupakkam, Poonamallee, Goparasanallur, Tamil Nadu 600077</span>
          <a href="mailto:fla@fairmacs.com" className="fairmacs-footer-contact-email">
            fla@fairmacs.com
          </a>
        </address>
      </div>

      {/* 2. Explore */}
      <div>
        <h3 className="fairmacs-footer-col-title">Explore</h3>
        <ul className="fairmacs-footer-link-list">
          {PUBLIC_EXPLORE_LINKS.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                className="fairmacs-footer-link"
                onClick={() => handleItemClick(item)}
              >
                <span>{item.label}</span>
                <ArrowUpRight
                  size={14}
                  className="fairmacs-footer-link-arrow"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 3. Quick Links */}
      <div>
        <h3 className="fairmacs-footer-col-title">Quick Links</h3>
        <ul className="fairmacs-footer-link-list">
          {PUBLIC_QUICK_LINKS.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                className="fairmacs-footer-link"
                onClick={() => handleItemClick(item)}
              >
                <span>{item.label}</span>
                <ArrowUpRight
                  size={14}
                  className="fairmacs-footer-link-arrow"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 4. Connect / Platform Access */}
      <div>
        <h3 className="fairmacs-footer-col-title">Platform Access</h3>
        <ul className="fairmacs-footer-link-list">
          {PUBLIC_CONNECT_LINKS.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                className="fairmacs-footer-link"
                onClick={() => handleItemClick(item)}
              >
                <span>{item.label}</span>
                <ArrowUpRight
                  size={14}
                  className="fairmacs-footer-link-arrow"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
