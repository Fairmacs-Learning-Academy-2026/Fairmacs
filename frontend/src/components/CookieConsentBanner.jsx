import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import '../styles/landing-glass.css';
import { getCookieConsent, setCookieConsent } from '../utils/analytics';

const PUBLIC_BANNER_PATHS = new Set(['/', '/login', '/privacy-policy', '/terms']);

export default function CookieConsentBanner() {
  const location = useLocation();
  const [visible, setVisible] = useState(() => !getCookieConsent());

  const handleChoice = (choice) => {
    setCookieConsent(choice);
    setVisible(false);
  };

  if (!visible || !PUBLIC_BANNER_PATHS.has(location.pathname)) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label="Cookie and storage preferences"
      style={{
        bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
      }}
      className="fixed left-3 right-3 sm:left-4 sm:right-4 z-50 mx-auto max-w-4xl glass glass--strong p-4 sm:p-5 text-[#1F2328]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#BFE3FF]/75 text-[#0B5CAB]">
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-[#4A5058]">
            Fairmacs Learning Academy uses essential browser storage to keep employee sessions secure and optional analytics cookies to improve learning performance. Read our{' '}
            <Link
              to="/privacy-policy"
              className="font-semibold text-[#0B5CAB] underline underline-offset-2"
            >
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link
              to="/terms"
              className="font-semibold text-[#0B5CAB] underline underline-offset-2"
            >
              Terms of Use
            </Link>
            .
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleChoice('essential')}
            className="fla-btn-secondary !py-2 !px-3.5 text-xs"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={() => handleChoice('all')}
            className="fla-btn-primary !py-2 !px-4 text-xs"
          >
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
}
