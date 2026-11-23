import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PortScene from './port3d/PortScene';
import LoginGlassPanel from './port3d/LoginGlassPanel';
import {
  getTimeStateFromHours,
  getGreetingFromTimeState
} from './port3d/TimeEnvironment';
import './port3d/port3d.css';

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

  // Time-aware environment state: automatically based on browser local time
  const [currentTimeState, setCurrentTimeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTime = params.get('time');
      if (['morning', 'afternoon', 'evening', 'night'].includes(urlTime)) {
        return urlTime;
      }
    }
    return getTimeStateFromHours(new Date().getHours());
  });

  // Periodic local time synchronization (every 30 seconds)
  useEffect(() => {
    const updateLocalTime = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlTime = params.get('time');
        if (['morning', 'afternoon', 'evening', 'night'].includes(urlTime)) {
          setCurrentTimeState(urlTime);
          return;
        }
      }
      const newTime = getTimeStateFromHours(new Date().getHours());
      setCurrentTimeState((prev) => (prev !== newTime ? newTime : prev));
    };

    const timer = setInterval(updateLocalTime, 30000);
    return () => clearInterval(timer);
  }, []);

  const timeGreeting = useMemo(() => {
    return getGreetingFromTimeState(currentTimeState);
  }, [currentTimeState]);

  // Redirect authenticated users to their role-specific dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDashboardPath(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Close the reset-password dialog with Escape
  useEffect(() => {
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
      setError('Enter both Employee ID / Email and Password.');
      return;
    }

    if (!password) {
      setError('Please enter password.');
      return;
    }

    if (!empId) {
      setError('Please enter Employee ID / Corporate Email.');
      return;
    }

    setLoading(true);

    try {
      const res = await login(empId, password);

      if (res.success) {
        navigate(getDashboardPath(res.user?.role), { replace: true });
      } else {
        setError(res.message || 'Invalid Employee ID/Email or Password.');
      }
    } catch (err) {
      setError(err.message || 'Unable to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fairmacs-login-page-root time-${currentTimeState}`}>
      {/* Top-Left: Back to Home Button in Frosted Apple Liquid Glass */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="fairmacs-login-home-btn"
        title="Back to Public Homepage"
        aria-label="Back to Public Homepage"
      >
        <Home style={{ width: 17, height: 17 }} />
        <span>Home</span>
      </button>

      {/* Left & Centre: Photorealistic 3D Container Port & Infinite Crane Loading Operation */}
      <PortScene timeState={currentTimeState} />

      {/* Right Side: Complete Apple Liquid Glass Authentication Panel */}
      <LoginGlassPanel
        empId={empId}
        setEmpId={setEmpId}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        error={error}
        loading={loading}
        onSubmit={handleSubmit}
        onOpenForgotModal={() => setShowForgotModal(true)}
        timeGreeting={timeGreeting}
      />

      {/* Reset Password Modal (Preserved complete institutional process) */}
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
              padding: '2rem 1.75rem',
              textAlign: 'center',
              borderRadius: '24px',
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(232, 241, 251, 0.9) 100%)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              boxShadow:
                '0 25px 60px -12px rgba(25, 52, 83, 0.25), inset 0 1px 2px rgba(255, 255, 255, 1)'
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#E8F1FB',
                color: '#3478E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                border: '1px solid rgba(220, 235, 250, 0.8)'
              }}
            >
              <Lock style={{ width: 22, height: 22 }} />
            </div>

            <h3
              id="forgot-password-title"
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#193453',
                fontFamily: 'var(--font-brand, sans-serif)'
              }}
            >
              Reset Password
            </h3>

            <p
              style={{
                fontSize: '0.88rem',
                color: '#475569',
                lineHeight: 1.6,
                margin: '0.85rem 0 1.5rem'
              }}
            >
              Password resets are handled by your HR or IT Helpdesk. Share your
              Employee ID with them and they will provide a temporary password.
              You will be prompted to choose a new password upon signing in.
            </p>

            <button
              type="button"
              className="fairmacs-signin-submit-btn"
              autoFocus
              onClick={() => setShowForgotModal(false)}
              style={{ width: '100%', margin: 0 }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
