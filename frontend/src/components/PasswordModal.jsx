import React, { useState } from 'react';
import {
  X,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

export default function PasswordModal({ onClose }) {
  const { changePassword } = useAuth();

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    /*
     * STEP 1:
     * Current password is required.
     */
    if (!currentPass) {
      setError('Please enter your current password.');
      return;
    }

    setLoading(true);

    try {
      /*
       * STEP 2:
       * Verify the current password ONLY.
       *
       * This does NOT change the password.
       */
      const verification =
        await authService.verifyCurrentPassword(
          currentPass
        );

      /*
       * Backend/API error.
       */
      if (!verification?.success) {
        setError(
          verification?.error ||
          'Unable to verify current password.'
        );
        return;
      }

      /*
       * STEP 3:
       * Current password is incorrect.
       *
       * This check happens BEFORE checking
       * new password and confirm password.
       */
      if (!verification.valid) {
        setError(
          'Current password does not match.'
        );
        return;
      }

      /*
       * STEP 4:
       * Now validate the new password.
       */
      if (!newPass) {
        setError('Please enter a new password.');
        return;
      }

      if (newPass.length < 8) {
        setError(
          'New password must be at least 8 characters long.'
        );
        return;
      }

      /*
       * STEP 5:
       * Check new password confirmation.
       */
      if (newPass !== confirmPass) {
        setError(
          'New password and confirmation password do not match.'
        );
        return;
      }

      /*
       * STEP 6:
       * Actually change the password.
       */
      const res = await changePassword(
        currentPass,
        newPass
      );

      if (!res?.success) {
        setError(
          res?.error ||
          res?.message ||
          'Unable to update password.'
        );
        return;
      }

      /*
       * STEP 7:
       * Password successfully changed.
       */
      setSuccess(
        'Corporate password updated successfully!'
      );

      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error(
        'Password update failed:',
        error
      );

      setError(
        error?.message ||
        'Unable to update password. Please try again.'
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-content animate-fade-in"
        style={{ maxWidth: '460px' }}
      >

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Lock
              style={{
                width: 20,
                height: 20,
                color: '#0284c7'
              }}
            />

            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#0f172a'
              }}
            >
              Change Corporate Password
            </h3>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: '#f1f5f9',
              border: 'none',
              padding: '0.4rem',
              borderRadius: '50%',
              color: '#64748b',
              cursor: loading
                ? 'not-allowed'
                : 'pointer'
            }}
          >
            <X
              style={{
                width: 18,
                height: 18
              }}
            />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div
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
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '0.35rem'
              }}
            >
              Current Password
            </label>

            <input
              type="password"
              required
              value={currentPass}
              onChange={(e) =>
                setCurrentPass(e.target.value)
              }
              placeholder="Enter current password"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* New Password */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '0.35rem'
              }}
            >
              New Password
            </label>

            <input
              type="password"
              required
              value={newPass}
              onChange={(e) =>
                setNewPass(e.target.value)
              }
              placeholder="Min. 8 characters"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '0.35rem'
              }}
            >
              Confirm New Password
            </label>

            <input
              type="password"
              required
              value={confirmPass}
              onChange={(e) =>
                setConfirmPass(e.target.value)
              }
              placeholder="Re-enter new password"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              marginTop: '0.5rem'
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                minWidth: '145px'
              }}
            >
              {loading ? (
                <>
                  <Loader2
                    style={{
                      width: 16,
                      height: 16,
                      animation:
                        'spin 1s linear infinite'
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