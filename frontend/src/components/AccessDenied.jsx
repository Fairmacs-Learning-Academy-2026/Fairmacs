import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccessDenied({ requiredRole, onReturn }) {
  const { user } = useAuth();

  return (
    <div
      className="animate-fade-in"
      style={{
        padding: 'clamp(2rem, 6vw, 4rem) clamp(1rem, 4vw, 2rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          background: '#FFE4E6',
          color: '#E11D48',
          padding: '1.15rem',
          borderRadius: '50%',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ShieldAlert style={{ width: 44, height: 44 }} />
      </div>

      <div
        style={{
          fontSize: '0.78rem',
          fontWeight: 700,
          color: '#E11D48',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          marginBottom: '0.4rem',
        }}
      >
        403 — Unauthorized Role Access
      </div>

      <h1
        style={{
          fontSize: 'clamp(1.35rem, 4vw, 1.75rem)',
          fontWeight: 800,
          color: '#1F2328',
          marginBottom: '0.75rem',
        }}
      >
        Access Restricted to {requiredRole || 'Authorized Roles'}
      </h1>

      <p
        style={{
          color: '#475569',
          fontSize: '0.92rem',
          lineHeight: 1.55,
          marginBottom: '1.75rem',
        }}
      >
        Your account <strong>{user?.name}</strong> ({user?.roleLabel || user?.role}) does not possess permission to access this module. Route protection is enforced at both the client layer and backend API gateway.
      </p>

      <button
        type="button"
        className="btn-primary"
        onClick={onReturn}
        style={{ padding: '0.75rem 1.5rem', borderRadius: '9999px' }}
      >
        <ArrowLeft style={{ width: 18, height: 18 }} />
        <span>Return to Authorized Dashboard</span>
      </button>
    </div>
  );
}
