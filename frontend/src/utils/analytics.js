/**
 * Fairmacs KMS — Lightweight Privacy-First Web & Product Analytics
 *
 * - Respects user consent stored in `fairmacs_cookie_consent` ('all' | 'essential').
 * - Automatically initializes Google Analytics 4 (`VITE_GA_MEASUREMENT_ID`) or
 *   Plausible (`VITE_PLAUSIBLE_DOMAIN`) when configured and consented.
 * - Captures SPA route pageviews and key CTA interactions.
 */

export const COOKIE_CONSENT_KEY = 'fairmacs_cookie_consent';

let gaInitialized = false;
let plausibleInitialized = false;

export function getCookieConsent() {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY);
  } catch {
    return null;
  }
}

export function setCookieConsent(level = 'essential') {
  const normalized = level === 'all' ? 'all' : 'essential';
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, normalized);
    } catch {
      // Ignore storage quota errors
    }
  }
  if (normalized === 'all') {
    initAnalyticsProviders();
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      trackPageView(window.location.pathname, document.title);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('fairmacs:cookie-consent', { detail: { consent: normalized } })
    );
  }
}

export function initAnalyticsProviders() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (getCookieConsent() === 'essential') return;

  const gaId =
    typeof import.meta !== 'undefined' && import.meta?.env?.VITE_GA_MEASUREMENT_ID
      ? String(import.meta.env.VITE_GA_MEASUREMENT_ID).trim()
      : '';

  if (gaId && !gaInitialized) {
    gaInitialized = true;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag() {
        window.dataLayer.push(arguments);
      };
    window.gtag('js', new Date());
    window.gtag('config', gaId, { send_page_view: false, anonymize_ip: true });
  }

  const plausibleDomain =
    typeof import.meta !== 'undefined' && import.meta?.env?.VITE_PLAUSIBLE_DOMAIN
      ? String(import.meta.env.VITE_PLAUSIBLE_DOMAIN).trim()
      : '';

  if (plausibleDomain && !plausibleInitialized) {
    plausibleInitialized = true;
    const script = document.createElement('script');
    script.defer = true;
    script.setAttribute('data-domain', plausibleDomain);
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
  }
}

function recordDiagnosticEvent(entry) {
  if (typeof window === 'undefined') return;
  if (!Array.isArray(window.__FAIRMACS_ANALYTICS_EVENTS__)) {
    window.__FAIRMACS_ANALYTICS_EVENTS__ = [];
  }
  window.__FAIRMACS_ANALYTICS_EVENTS__.push(entry);
  if (window.__FAIRMACS_ANALYTICS_EVENTS__.length > 50) {
    window.__FAIRMACS_ANALYTICS_EVENTS__.shift();
  }
}

export function trackPageView(pathname = '/', title = '') {
  if (typeof window === 'undefined') return;
  initAnalyticsProviders();

  recordDiagnosticEvent({
    type: 'page_view',
    path: pathname,
    title,
    ts: Date.now(),
  });

  if (getCookieConsent() === 'essential') return;

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: pathname,
      page_title: title,
    });
  }
  if (typeof window.plausible === 'function') {
    window.plausible('pageview');
  }
}

export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || !eventName) return;

  recordDiagnosticEvent({
    type: 'event',
    name: eventName,
    params,
    ts: Date.now(),
  });

  if (getCookieConsent() === 'essential') return;

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
  if (typeof window.plausible === 'function') {
    window.plausible(eventName, { props: params });
  }
}
