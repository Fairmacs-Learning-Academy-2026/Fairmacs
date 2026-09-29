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
  KeyRound,
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
        return '/admin';
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
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Redirect authenticated users to their role-specific dashboard
  React.useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDashboardPath(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!empId || !password) {
      setError(
        'Please enter both Employee ID / Corporate Email and Password.'
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

  const handleQuickLogin = async (demoId, demoPass) => {
    setEmpId(demoId);
    setPassword(demoPass);
    setError('');
    setLoading(true);

    try {
      const res = await login(demoId, demoPass);

      if (res.success) {
        navigate(getDashboardPath(res.user?.role), { replace: true });
      } else {
        setError(
          res.message ||
          'Unable to login with these credentials.'
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
              gap: '0.85rem',
              marginBottom: '0.85rem'
            }}
          >
            <img
              src="/fairmacs-logo.png"
              alt="Fairmacs"
              style={{
                height: 48,
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
            Fairmacs LMS
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
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '2.25rem 2rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
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
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.4rem',
                  textAlign: 'center'
                }}
              >
                Employee ID / Corporate Email
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
                  type="text"
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
                  type={showPassword ? 'text' : 'password'}
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

        {/* Demo Credentials */}
        <div
          style={{
            marginTop: '1.5rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '1.1rem',
            backdropFilter: 'blur(4px)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              color: '#eab308',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: '0.75rem',
              textAlign: 'center'
            }}
          >
            <KeyRound
              style={{
                width: 14,
                height: 14
              }}
            />

            1-Click Demo Credentials
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem'
            }}
          >
            <button
              type="button"
              onClick={() =>
                handleQuickLogin('EMP1001', 'Employee@123')
              }
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'white',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: '#38bdf8'
                }}
              >
                Employee
              </div>

              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#cbd5e1'
                }}
              >
                EMP1001 • Arjun
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickLogin('TRN2001', 'Trainer@123')
              }
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'white',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: '#c084fc'
                }}
              >
                Trainer
              </div>

              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#cbd5e1'
                }}
              >
                TRN2001 • Ravi
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickLogin('MGR3001', 'Manager@123')
              }
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'white',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: '#f59e0b'
                }}
              >
                Manager
              </div>

              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#cbd5e1'
                }}
              >
                MGR3001 • Priya
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                handleQuickLogin('HR4001', 'Admin@123')
              }
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'white',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: '#34d399'
                }}
              >
                HR / Admin
              </div>

              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#cbd5e1'
                }}
              >
                HR4001 • Anita
              </div>
            </button>
          </div>
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

          Encrypted TLS 1.3 • Role Authorization Active
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay">
          <div
            className="modal-content animate-fade-in"
            style={{
              maxWidth: '440px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '1rem',
                marginBottom: '1rem',
                textAlign: 'center'
              }}
            >
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  textAlign: 'center'
                }}
              >
                Reset Corporate Password
              </h3>

              <p
                style={{
                  fontSize: '0.82rem',
                  color: '#64748b',
                  marginTop: '0.2rem',
                  textAlign: 'center'
                }}
              >
                Enter your Employee ID or Corporate Email to receive
                password reset instructions.
              </p>
            </div>

            {!forgotSubmitted ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setForgotSubmitted(true);
                }}
                style={{ textAlign: 'center' }}
              >
                <div
                  style={{
                    marginBottom: '1.25rem',
                    textAlign: 'center'
                  }}
                >
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.4rem',
                      textAlign: 'center'
                    }}
                  >
                    Corporate Email / Employee ID
                  </label>

                  <input
                    type="text"
                    required
                    placeholder="e.g. arjun.kumar@fairmacs.com"
                    value={forgotEmail}
                    onChange={(e) =>
                      setForgotEmail(e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      textAlign: 'center'
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'center'
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotSubmitted(false);
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '1rem 0'
                }}
              >
                <div
                  style={{
                    background: '#dcfce7',
                    color: '#16a34a',
                    padding: '0.75rem',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}
                >
                  <ShieldCheck
                    style={{
                      width: 28,
                      height: 28
                    }}
                  />
                </div>

                <h4
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    textAlign: 'center'
                  }}
                >
                  Reset Instructions Dispatched
                </h4>

                <p
                  style={{
                    fontSize: '0.82rem',
                    color: '#64748b',
                    marginTop: '0.4rem',
                    marginBottom: '1.25rem',
                    textAlign: 'center'
                  }}
                >
                  A secure password reset link has been dispatched
                  to your registered Fairmacs email account.
                </p>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotSubmitted(false);
                  }}
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}