import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { getCookieConsent, setCookieConsent } from '../utils/analytics';

const PUBLIC_BANNER_PATHS = new Set(['/', '/login', '/privacy-policy', '/terms']);

export default function CookieConsentBanner() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const existing = getCookieConsent();
    setVisible(!existing);
  }, []);

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
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl rounded-2xl border border-white/15 bg-[#0b1a2e]/95 backdrop-blur-2xl p-4 sm:p-5 text-white shadow-2xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-400/25 text-blue-300">
            <ShieldCheck size={18} />
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
            Fairmacs Learning Academy uses essential browser storage to keep employee sessions secure and optional analytics cookies to improve learning performance. Read our{' '}
            <Link
              to="/privacy-policy"
              className="font-semibold text-blue-300 underline underline-offset-2 hover:text-white"
            >
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link
              to="/terms"
              className="font-semibold text-blue-300 underline underline-offset-2 hover:text-white"
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
            className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition"
          >
            Essential Only
          </button>
          <button
            type="button"
            onClick={() => handleChoice('all')}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-md shadow-blue-950/40"
          >
            Accept All
          </button>
        </div>
      </div>
    </aside>
  );
}
