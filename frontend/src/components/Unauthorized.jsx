import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #FBF8F3 0%, #F2F7FC 100%)',
        padding:
          'max(1.25rem, env(safe-area-inset-top, 1.25rem)) max(1rem, env(safe-area-inset-right, 1rem)) max(1.5rem, env(safe-area-inset-bottom, 1.5rem)) max(1rem, env(safe-area-inset-left, 1rem))',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          borderRadius: '22px',
          padding: 'clamp(1.75rem, 5vw, 3rem)',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 44px rgba(16, 42, 67, 0.08)',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            background: '#FFE4E6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <ShieldAlert style={{ width: 36, height: 36, color: '#E11D48' }} />
        </div>

        <h1
          style={{
            fontSize: 'clamp(1.4rem, 4vw, 1.75rem)',
            fontWeight: 800,
            color: '#1F2328',
            marginBottom: '0.65rem',
          }}
        >
          Access Denied
        </h1>

        <p
          style={{
            fontSize: '0.95rem',
            color: '#475569',
            lineHeight: 1.6,
            marginBottom: '1.75rem',
          }}
        >
          You do not have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn-primary"
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '9999px',
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          <span>Go Back</span>
        </button>
      </div>
    </div>
  );
}
