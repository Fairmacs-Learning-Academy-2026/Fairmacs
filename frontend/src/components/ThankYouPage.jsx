import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Home } from 'lucide-react';
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

const CONTEXT_COPY = {
  zoho: {
    badge: 'Cloud Integration Active',
    heading: 'Zoho WorkDrive Connected!',
    body: 'Your enterprise Zoho WorkDrive integration has been authorized and is ready to stream course and policy documents.',
  },
  course: {
    badge: 'Learning Milestone Completed',
    heading: 'Congratulations on Completing Your Course!',
    body: 'Your assessment results and completion record have been saved to your Fairmacs learning transcript.',
  },
  policy: {
    badge: 'Compliance Recorded',
    heading: 'Thank You — Policy Acknowledged',
    body: 'Your electronic acknowledgement has been securely timestamped and recorded in Fairmacs Learning Academy.',
  },
  default: {
    badge: 'Action Confirmed',
    heading: 'Thank You!',
    body: 'Your submission has been received and recorded in Fairmacs Learning Academy.',
  },
};

export default function ThankYouPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();

  const source = String(searchParams.get('source') || 'default').toLowerCase();
  const copy = CONTEXT_COPY[source] || CONTEXT_COPY.default;
  const dashboardPath = isAuthenticated ? getRoleHome(user?.role) : '/login';

  return (
    <div className="min-h-screen bg-[#06111f] text-white flex flex-col justify-between px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-36 left-1/4 h-[420px] w-[420px] rounded-full bg-emerald-500/15 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[380px] w-[380px] rounded-full bg-blue-600/15 blur-[120px]" />
      </div>

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

      <main className="relative z-10 mx-auto w-full max-w-xl my-auto py-12 text-center">
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-8 sm:p-11 shadow-2xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 size={34} />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-200">
            {copy.badge}
          </div>

          <h1 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {copy.heading}
          </h1>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-300">
            {copy.body}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(dashboardPath, { replace: true })}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500 transition"
            >
              <span>{isAuthenticated ? 'Continue to Dashboard' : 'Employee Sign In'}</span>
              <ArrowRight size={17} />
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
            >
              <Home size={17} />
              <span>Public Home</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-5xl text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Fairmacs Shipping &amp; Transport Services Pvt. Ltd.
      </footer>
    </div>
  );
}
