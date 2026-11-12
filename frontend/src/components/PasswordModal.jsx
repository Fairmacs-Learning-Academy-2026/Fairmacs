import React, { useEffect, useState } from 'react';
import {
  X,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldAlert,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '0.35rem'
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.65rem 0.85rem',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '0.88rem'
};

export default function PasswordModal({ onClose, forceChange = false }) {
  const { changePassword, logout } = useAuth();

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Close on Escape, except for the mandatory first-login change
  useEffect(() => {
    if (forceChange || typeof onClose !== 'function') return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [forceChange, onClose, loading]);

  const validateNewPasswordPolicy = (password) => {
    if (!password || password.length < 8) {
      return 'New password must be at least 8 characters long.';
    }
    if (!/[A-Z]/.test(password)) {
      return 'New password must contain at least one uppercase letter.';
    }
    if (!/[a-z]/.test(password)) {
      return 'New password must contain at least one lowercase letter.';
    }
    if (!/[0-9]/.test(password)) {
      return 'New password must contain at least one number.';
    }
    if (!/[^A-Za-z0-9\s]/.test(password)) {
      return 'New password must contain at least one special character.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!currentPass) {
      setError('Please enter your current password.');
      return;
    }

    if (!newPass) {
      setError('Please enter a new password.');
      return;
    }

    const policyError = validateNewPasswordPolicy(newPass);
    if (policyError) {
      setError(policyError);
      return;
    }

    if (newPass === currentPass) {
      setError('New password must be different from your current password.');
      return;
    }

    if (newPass !== confirmPass) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await changePassword(currentPass, newPass);

      if (!res?.success) {
        setError(
          res?.error ||
          res?.message ||
          'Unable to update password.'
        );
        return;
      }

      setSuccess('Corporate password updated successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');

      if (typeof onClose === 'function') {
        setTimeout(() => {
          onClose();
        }, 1200);
      }

    } catch (err) {
      console.error('Password update failed:', err);
      setError(
        err?.message ||
        'Unable to update password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="modal-content animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-modal-title"
        style={{
          width: '100%',
          maxWidth: '470px',
          boxSizing: 'border-box',
          padding: '1.75rem',
          maxHeight: 'calc(100dvh - 32px)',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              minWidth: 0
            }}
          >
            <Lock
              style={{
                width: 20,
                height: 20,
                flexShrink: 0,
                color: '#0284c7'
              }}
            />

            <h3
              id="password-modal-title"
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#0f172a'
              }}
            >
              {forceChange ? 'Mandatory First-Login Password Change' : 'Change Password'}
            </h3>
          </div>

          {!forceChange && typeof onClose === 'function' && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
              style={{
                background: '#f1f5f9',
                border: 'none',
                padding: '0.4rem',
                borderRadius: '50%',
                flexShrink: 0,
                color: '#64748b',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          )}
        </div>

        {forceChange && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              padding: '0.85rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              marginBottom: '1rem'
            }}
          >
            <ShieldAlert style={{ width: 18, height: 18, flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Action Required:</strong> You signed in with a temporary password. For your account security, please set a new personal password before accessing the Fairmacs LMS.
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#e11d48',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            <AlertCircle
              style={{
                width: 16,
                height: 16,
                flexShrink: 0
              }}
            />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            role="status"
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            <CheckCircle
              style={{
                width: 16,
                height: 16,
                flexShrink: 0
              }}
            />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          {/* Current Password */}
          <div>
            <label htmlFor="current-password" style={labelStyle}>
              Current / Temporary Password
            </label>

            <input
              id="current-password"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Enter current password"
              disabled={loading}
              style={inputStyle}
            />
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="new-password" style={labelStyle}>
              New Password
            </label>

            <input
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Min. 8 characters..."
              disabled={loading}
              style={inputStyle}
            />
            <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.3rem', lineHeight: 1.45 }}>
              Must include at least 8 characters, uppercase, lowercase, number, and special character.
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-password" style={labelStyle}>
              Confirm New Password
            </label>

            <input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Re-enter new password"
              disabled={loading}
              style={inputStyle}
            />
          </div>

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              marginTop: '0.5rem'
            }}
          >
            {forceChange ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={logout}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <LogOut style={{ width: 15, height: 15 }} />
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                minWidth: '155px'
              }}
            >
              {loading ? (
                <>
                  <Loader2
                    style={{
                      width: 16,
                      height: 16,
                      animation: 'spin 1s linear infinite'
                    }}
                  />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
