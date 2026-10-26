import React from 'react';
import { LayoutGrid, BookOpen, Compass, Calendar, Award, Info, BarChart3, Layers, FileText, LibraryBig } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, onOpenCertificates }) {
  const { user } = useAuth();
  const getNavItems = () => {
    switch (String(user?.role || '').toUpperCase()) {
      case 'TRAINER':
        return [
          { id: 'dashboard', label: 'Trainer Overview', icon: LayoutGrid },
          { id: 'catalog', label: 'Course Catalog', icon: Compass },
          { id: 'drafts', label: 'Drafts', icon: FileText },
          { id: 'paths', label: 'Learning Paths', icon: Layers },
          { id: 'calendar', label: 'Training Calendar', icon: Calendar },
          { id: 'reports', label: 'Course Analytics', icon: BarChart3 }
        ];
      case 'MANAGER':
        return [
          { id: 'dashboard', label: 'Team Compliance', icon: LayoutGrid },
          { id: 'allCourses', label: 'All Courses', icon: LibraryBig },
          { id: 'catalog', label: 'Course Catalog', icon: Compass },
          { id: 'paths', label: 'Learning Paths', icon: Layers },
          { id: 'calendar', label: 'Training Calendar', icon: Calendar },
          { id: 'reports', label: 'Team Reports', icon: BarChart3 }
        ];
      case 'HR_ADMIN':
        return [
          { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutGrid },
          { id: 'catalog', label: 'Course Catalog', icon: Compass },
          { id: 'drafts', label: 'Drafts', icon: FileText },
          { id: 'paths', label: 'Learning Paths', icon: Layers },
          { id: 'calendar', label: 'Training Calendar', icon: Calendar },
          { id: 'reports', label: 'HR Analytics', icon: BarChart3 }
        ];
      default:
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
          { id: 'mylearning', label: 'Progress Hub', icon: BookOpen },
          { id: 'catalog', label: 'Course Catalog', icon: Compass },
          { id: 'paths', label: 'Learning Paths', icon: Layers },
          { id: 'calendar', label: 'Training Calendar', icon: Calendar },
          { id: 'certificates', label: 'Certificates', icon: Award }
        ];
    }
  };

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 0.75rem', marginBottom: '0.6rem', marginTop: '0.25rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.2px' }}>WORKSPACE</div>
        </div>
        <ul className="sidebar-nav-list" style={{ marginTop: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {getNavItems().map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const handleClick = () => {
              if (item.id === 'certificates' && onOpenCertificates) {
                onOpenCertificates();
                return;
              }
              setActiveTab(item.id);
            };
            return (
              <li key={item.id} style={{ position: 'relative' }}>
                <button type="button" className={`sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleClick} aria-current={isActive ? 'page' : undefined}
                  style={{ width: '100%', border: 'none', background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent', color: isActive ? '#ffffff' : '#cbd5e1', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: isActive ? 600 : 500, fontSize: '0.92rem', position: 'relative', transition: 'all 0.15s ease', cursor: 'pointer', textAlign: 'left' }}>
                  {isActive && <span style={{ position: 'absolute', left: '3px', top: '50%', transform: 'translateY(-50%)', width: '3px', height: '18px', background: '#eab308', borderRadius: '2px' }} />}
                  <Icon style={{ width: 18, height: 18, color: isActive ? '#ffffff' : '#cbd5e1', flexShrink: 0 }} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.3rem' }}>
            <Info style={{ width: 16, height: 16, color: '#eab308' }} /> Need help?
          </div>
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.45 }}>Learning support and content ownership are configurable.</div>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.85rem', paddingLeft: '0.25rem' }}>FAIRMACS LMS</div>
      </div>
    </aside>
  );
}
