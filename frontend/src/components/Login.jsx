import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ship,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = (role) => {
    switch (String(role || '').toUpperCase()) {
      case 'TRAINER':
        return '/trainer';
      case 'MANAGER':
        return '/manager';
      case 'HR_ADMIN':
        return '/hr/overview';
      case 'EMPLOYEE':
      default:
        return '/dashboard';
    }
  };

  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Redirect authenticated users to their role-specific dashboard
  React.useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDashboardPath(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Close the reset-password dialog with Escape
  React.useEffect(() => {
    if (!showForgotModal) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowForgotModal(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showForgotModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!empId && !password) {
      setError(
        'Enter both Employee ID / Email and Password.'
      );
      return;
    }

    if (!password) {
      setError(
        'Please enter password.'
      );
      return;
    }

    if (!empId) {
      setError(
        'Please enter Employee ID / Corporate Email.'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await login(empId, password);

      if (res.success) {
        navigate(getDashboardPath(res.user?.role), { replace: true });
      } else {
        setError(
          res.message ||
          'Invalid Employee ID/Email or Password.'
        );
      }
    } catch (error) {
      setError(
        error.message ||
        'Unable to login. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #0b1f38 0%, #0c2340 50%, #071626 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Back to Home */}
      <button
        type="button"
        onClick={() => navigate('/')}
        title="Back to Home"
        aria-label="Back to Home"
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'rgba(255, 255, 255, 0.08)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'all 0.2s ease',
          zIndex: 20
        }}
      >
        <Home style={{ width: 19, height: 19 }} />
      </button>

      {/* Background Watermark */}
      <div
        style={{
          position: 'absolute',
          right: '-5%',
          bottom: '-10%',
          opacity: 0.03,
          pointerEvents: 'none'
        }}
      >
        <Ship
          style={{
            width: 600,
            height: 600,
            color: 'white'
          }}
        />
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          zIndex: 10,
          textAlign: 'center'
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '2rem'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 68,
              height: 68,
              borderRadius: '18px',
              backgroundColor: '#ffffff',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)',
              padding: '10px',
              marginBottom: '1rem'
            }}
          >
            <img
              src="/fairmacs-logo.png"
              alt="Fairmacs"
              style={{
                height: '100%',
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.3px',
              textAlign: 'center'
            }}
          >
            Fairmacs KMS
          </h1>

          <p
            style={{
              color: '#38bdf8',
              fontSize: '0.9rem',
              fontWeight: 600,
              marginTop: '0.25rem',
              letterSpacing: '0.5px',
              textAlign: 'center'
            }}
          >
            Learn. Grow. Perform.
          </p>
        </div>

        {/* Login Card */}
        <div
          className="glass-modal"
          style={{
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '20px',
            padding: '2.25rem 2rem',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#0f172a',
                textAlign: 'center'
              }}
            >
              Welcome
            </h2>

            <p
              style={{
                fontSize: '0.85rem',
                color: '#64748b',
                marginTop: '0.15rem',
                textAlign: 'center'
              }}
            >
              Sign in with your Fairmacs corporate account
            </p>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem',
                textAlign: 'center'
              }}
            >
              <AlertCircle
                style={{
                  width: 18,
                  height: 18,
                  flexShrink: 0
                }}
              />

              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              textAlign: 'center'
            }}
          >
            {/* Employee ID / Email */}
            <div style={{ textAlign: 'center' }}>
              <label
                htmlFor="login-id"
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.4rem',
                  textAlign: 'center'
                }}
              >
                Employee ID / Email
              </label>

              <div style={{ position: 'relative' }}>
                <User
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 13,
                    width: 18,
                    height: 18,
                    color: '#94a3b8'
                  }}
                />

                <input
                  id="login-id"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. EMP1001 or arjun.kumar@fairmacs.com"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '2.6rem',
                    paddingRight: '1rem',
                    paddingTop: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontWeight: 500,
                    textAlign: 'center',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ textAlign: 'center' }}>
              <label
                htmlFor="login-password"
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.4rem',
                  textAlign: 'center'
                }}
              >
                Password
              </label>

              <div style={{ position: 'relative' }}>
                <Lock
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 13,
                    width: 18,
                    height: 18,
                    color: '#94a3b8'
                  }}
                />

                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    paddingLeft: '2.6rem',
                    paddingRight: '2.6rem',
                    paddingTop: '0.75rem',
                    paddingBottom: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontWeight: 500,
                    textAlign: 'center'
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? (
                    <EyeOff
                      style={{
                        width: 18,
                        height: 18
                      }}
                    />
                  ) : (
                    <Eye
                      style={{
                        width: 18,
                        height: 18
                      }}
                    />
                  )}
                </button>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  marginTop: '0.5rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.8rem',
                fontSize: '0.95rem',
                background:
                  'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                marginTop: '0.25rem',
                boxShadow:
                  '0 4px 14px rgba(2, 132, 199, 0.35)',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}

              <ArrowRight
                style={{
                  width: 18,
                  height: 18,
                  marginLeft: '0.4rem'
                }}
              />
            </button>
          </form>
        </div>

        {/* Security Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            color: '#64748b',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          <ShieldCheck
            style={{
              width: 14,
              height: 14,
              color: '#38bdf8'
            }}
          />

          Encrypted TLS • Role Authorization Active
        </div>
      </div>

      {/* Reset Password Modal
          Password resets are done by HR / IT (temporary password, then a
          forced change at first login). There is no self-service reset
          endpoint, so this dialog explains the process instead of
          pretending to send a link. */}
      {showForgotModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="modal-content animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-password-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '440px',
              boxSizing: 'border-box',
              padding: '1.75rem',
              textAlign: 'center',
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto'
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}
            >
              <Lock style={{ width: 22, height: 22 }} />
            </div>

            <h3
              id="forgot-password-title"
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#0f172a'
              }}
            >
              Reset Password
            </h3>

            <p
              style={{
                fontSize: '0.88rem',
                color: '#475569',
                lineHeight: 1.6,
                margin: '0.75rem 0 1.5rem'
              }}
            >
              Password resets are handled by your HR or IT Helpdesk. Share
              your Employee ID with them and they will give you a temporary
              password. You will be asked to choose a new one when you
              sign in.
            </p>

            <button
              type="button"
              className="btn-primary"
              autoFocus
              onClick={() => setShowForgotModal(false)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
