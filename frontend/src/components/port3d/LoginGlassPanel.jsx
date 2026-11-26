import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

/**
 * LoginGlassPanel.jsx
 *
 * Right-side Complete Apple Liquid Glass Authentication Panel:
 * - Translucent Cloud White (#F5F8FC), Ice Blue (#E8F1FB), Glass Blue (#DCEBFA) frosted surface
 * - Fairmacs Blue (#3478E5) interactive accents & Deep Navy (#193453) typography
 * - Official Fairmacs brand lockup + League Spartan Bold 700 (FAIRMACS) & Regular 400 (ACROSS ALL BOUNDARIES)
 * - Floating labels with animated input focus rings
 * - Animated password visibility toggle
 * - Preserves 100% of existing authentication, validation, loading, error & forgot-password flows
 */

export default function LoginGlassPanel({
  empId,
  setEmpId,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  loading,
  onSubmit,
  onOpenForgotModal,
  timeGreeting
}) {
  const [idFocused, setIdFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

  const isIdFloating = idFocused || Boolean(empId && empId.length > 0);
  const isPwFloating = pwFocused || Boolean(password && password.length > 0);

  return (
    <main className="fairmacs-port3d-login-assembly">
      <div className="fairmacs-port3d-liquid-glass-card">
        {/* Top Specular Refraction Rim */}
        <div className="liquid-glass-specular-rim" aria-hidden="true" />

        {/* Official Brand Identity Header */}
        <header className="fairmacs-port3d-brand-header">
          <div className="fairmacs-login-full-brand-lockup">
            <img
              src="/fairmacs-full-brand-lockup.png"
              alt="FAIRMACS — ACROSS ALL BOUNDARIES"
              className="fairmacs-login-brand-img"
            />
          </div>

          {/* Semantic Brand Typography (League Spartan 700 & 400) */}
          <div className="fairmacs-brand-typography-meta">
            <span className="fairmacs-brand-wordmark">FAIRMACS</span>
            <span className="fairmacs-brand-tagline">ACROSS ALL BOUNDARIES</span>
          </div>
        </header>

        {/* Validation & Authentication Error Alert */}
        {error && (
          <div
            role="alert"
            className="fairmacs-login-error-alert fairmacs-port3d-error-alert"
          >
            <AlertCircle style={{ width: 17, height: 17, flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={onSubmit} className="fairmacs-port3d-form" noValidate>
          {/* Floating-Label Input: Employee ID / Corporate Email */}
          <div
            className={`fairmacs-floating-group ${isIdFloating ? 'is-floating' : ''} ${idFocused ? 'is-focused' : ''
              }`}
          >
            <div className="fairmacs-floating-input-box">
              <User className="fairmacs-floating-icon" />
              <div className="fairmacs-floating-field-stack">
                <label htmlFor="login-id" className="fairmacs-floating-label">
                  Employee ID / Corporate Email
                </label>
                <input
                  id="login-id"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  placeholder={
                    idFocused ? 'e.g. EMP001 or abc@fairmacs.com' : ''
                  }
                  value={empId}
                  onFocus={() => setIdFocused(true)}
                  onBlur={() => setIdFocused(false)}
                  onChange={(e) => setEmpId(e.target.value)}
                  className="fairmacs-floating-input"
                />
              </div>
            </div>
          </div>

          {/* Floating-Label Input: Password */}
          <div
            className={`fairmacs-floating-group ${isPwFloating ? 'is-floating' : ''} ${pwFocused ? 'is-focused' : ''
              }`}
          >
            <div className="fairmacs-floating-input-box">
              <Lock className="fairmacs-floating-icon" />
              <div className="fairmacs-floating-field-stack">
                <label htmlFor="login-password" className="fairmacs-floating-label">
                  Password
                </label>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  placeholder={pwFocused ? 'Enter your password' : ''}
                  value={password}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                  onChange={(e) => setPassword(e.target.value)}
                  className="fairmacs-floating-input"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className={`fairmacs-password-toggle-btn ${showPassword ? 'is-revealed' : ''
                  }`}
              >
                <span className="pw-toggle-icon-wrap">
                  {showPassword ? (
                    <EyeOff style={{ width: 17, height: 17 }} />
                  ) : (
                    <Eye style={{ width: 17, height: 17 }} />
                  )}
                </span>
              </button>
            </div>

            <div className="fairmacs-forgot-pw-row">
              <button
                type="button"
                onClick={onOpenForgotModal}
                className="fairmacs-forgot-pw-btn"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {/* Primary Sign In CTA Button */}
          <button
            type="submit"
            disabled={loading}
            className={`fairmacs-signin-submit-btn ${loading ? 'is-loading' : ''}`}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight
              className="fairmacs-btn-arrow"
              style={{ width: 18, height: 18 }}
            />
          </button>
        </form>
      </div>
    </main>
  );
}
