import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Compass, Home, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FairmacsEmblem from './FairmacsEmblem';

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
    <div className="min-h-screen bg-[#06111f] text-white flex flex-col justify-between relative overflow-hidden px-4 py-10">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-36 -left-36 h-[420px] w-[420px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-0 -right-32 h-[380px] w-[380px] rounded-full bg-cyan-500/10 blur-[110px]" />
      </div>

      {/* Top brand bar */}
      <header className="relative z-10 mx-auto w-full max-w-5xl flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1.5 shadow-md">
            <FairmacsEmblem size={24} fill="#1B365D" />
          </div>
          <div>
            <div className="fairmacs-brand-wordmark text-base font-bold tracking-wide text-white">
              FAIRMACS
            </div>
            <div className="fairmacs-brand-tagline text-[10px] uppercase tracking-[0.16em] text-slate-300">
              ACROSS ALL BOUNDARIES
            </div>
          </div>
        </button>
      </header>

      {/* Main 404 Card */}
      <main className="relative z-10 mx-auto w-full max-w-xl my-auto py-12 text-center">
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-8 sm:p-11 shadow-2xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15 text-blue-300">
            <Compass size={32} />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-blue-200">
            Error 404 · Page Not Found
          </div>

          <h1 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            We couldn&apos;t find that page.
          </h1>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-300">
            The address{' '}
            <code className="rounded bg-white/10 px-2 py-0.5 text-xs text-blue-200 break-all">
              {location.pathname}
            </code>{' '}
            doesn&apos;t exist or may have been moved within Fairmacs Learning Academy.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(primaryPath, { replace: true })}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500 transition"
            >
              <Home size={17} />
              {isAuthenticated ? 'Return to Dashboard' : 'Back to Home'}
            </button>

            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
              >
                <LogIn size={17} />
                Employee Login
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
              >
                <ArrowLeft size={17} />
                Go Back
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-5xl text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Fairmacs Shipping &amp; Transport Services Pvt. Ltd. · Need assistance? <button className="text-blue-400" onClick={() => window.location.href = 'mailto:[EMAIL_ADDRESS]'}><u><b>Contact us</b></u></button>
      </footer>
    </div>
  );
}
