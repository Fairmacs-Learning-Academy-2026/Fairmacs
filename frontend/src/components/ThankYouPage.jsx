import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Home } from 'lucide-react';
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
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#CFF3E3]/80 text-[#0F766E]">
            <CheckCircle2 size={34} aria-hidden="true" />
          </div>

          <span className="inline-flex items-center gap-2 rounded-full bg-[#CFF3E3]/75 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0F5132]">
            {copy.badge}
          </span>

          <h1 className="fla-display-h2 mt-5 !text-3xl sm:!text-4xl">{copy.heading}</h1>

          <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#4A5058]">
            {copy.body}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(dashboardPath, { replace: true })}
              className="fla-btn-primary w-full sm:w-auto text-sm"
            >
              <span>{isAuthenticated ? 'Continue to Dashboard' : 'Employee Sign In'}</span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="fla-btn-secondary w-full sm:w-auto text-sm"
            >
              <Home size={17} aria-hidden="true" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-5xl text-center text-xs text-[#4A5058]">
        © {new Date().getFullYear()} Fairmacs Shipping &amp; Transport Services Pvt. Ltd.
      </footer>
    </div>
  );
}
