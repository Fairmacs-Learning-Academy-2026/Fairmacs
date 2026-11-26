import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Compass, Home, LogIn } from 'lucide-react';
import '../styles/landing-glass.css';
import { useAuth } from '../context/AuthContext';
import FairmacsEmblem from './FairmacsEmblem';
import AmbientBackground from './landing/AmbientBackground';

function getRoleHome(role) {
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
}

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const primaryPath = isAuthenticated ? getRoleHome(user?.role) : '/';

  return (
    <div className="fla-daylight-root flex flex-col justify-between px-4 py-8">
      <AmbientBackground />

      <header className="relative z-10 mx-auto w-full max-w-5xl flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-black/5">
            <FairmacsEmblem size={23} fill="#0B5CAB" />
          </span>
          <span>
            <span className="block text-base font-bold text-[#1F2328]">Fairmacs</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4A5058]">
              Learning Academy
            </span>
          </span>
        </button>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-xl my-auto py-12 text-center">
        <div className="glass glass--strong p-8 sm:p-11">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#BFE3FF]/75 text-[#0B5CAB]">
            <Compass size={32} aria-hidden="true" />
          </div>

          <span className="inline-flex items-center gap-2 glass-pill rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#0B5CAB]">
            Error 404 · Page Not Found
          </span>

          <h1 className="fla-display-h2 mt-5 !text-3xl sm:!text-4xl">
            We couldn&apos;t find that page.
          </h1>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#4A5058]">
            The address{' '}
            <code className="rounded bg-[#F4F1EC] px-2 py-0.5 text-xs font-semibold text-[#0B5CAB] break-all">
              {location.pathname}
            </code>{' '}
            doesn&apos;t exist or may have been moved within Fairmacs Learning Academy.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(primaryPath, { replace: true })}
              className="fla-btn-primary w-full sm:w-auto text-sm"
            >
              <Home size={17} aria-hidden="true" />
              <span>{isAuthenticated ? 'Return to Dashboard' : 'Back to Home'}</span>
            </button>

            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="fla-btn-secondary w-full sm:w-auto text-sm"
              >
                <LogIn size={17} aria-hidden="true" />
                <span>Employee Login</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="fla-btn-secondary w-full sm:w-auto text-sm"
              >
                <ArrowLeft size={17} aria-hidden="true" />
                <span>Go Back</span>
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-5xl text-center text-xs text-[#4A5058]">
        © {new Date().getFullYear()} Fairmacs Shipping &amp; Transport Services Pvt. Ltd. · Need help?{' '}
        <a href="mailto:hr-training@fairmacs.com" className="font-semibold text-[#0B5CAB] underline">
          hr-training@fairmacs.com
        </a>
      </footer>
    </div>
  );
}
