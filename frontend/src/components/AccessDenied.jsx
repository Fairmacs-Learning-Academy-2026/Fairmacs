import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccessDenied({ requiredRole, onReturn }) {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in" style={{
      padding: '4rem 2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justify: 'center',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{
        background: '#ffe4e6',
        color: '#e11d48',
        padding: '1.25rem',
        borderRadius: '50%',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justify: 'center'
      }}>
        <ShieldAlert style={{ width: 48, height: 48 }} />
      </div>

      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.4rem' }}>
        403 — Unauthorized Role Access
      </div>

      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
        Access Restricted to {requiredRole || 'Authorized Roles'}
      </h1>

      <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '2rem' }}>
        Your account <strong>{user?.name}</strong> ({user?.roleLabel || user?.role}) does not possess permission to access this module. Route protection is enforced at both the client layer and backend API gateway.
      </p>

      <button className="btn-primary" onClick={onReturn} style={{ background: '#0f172a', padding: '0.75rem 1.5rem' }}>
        <ArrowLeft style={{ width: 18, height: 18 }} /> Return to Authorized Dashboard
      </button>
    </div>
  );
}
