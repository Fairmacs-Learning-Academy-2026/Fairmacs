import React, { useEffect, useState } from 'react';
import { ArrowRight, LogIn, Menu, X } from 'lucide-react';
import FairmacsEmblem from '../FairmacsEmblem';
import { SITE_CONTENT } from '../../content/site';
import { ease, usePrefersReducedMotion } from './motionHooks';

export default function LandingNav({ onLoginClick, onPrimaryCtaClick }) {
  const reduced = usePrefersReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setMounted(true));
    if (typeof window === 'undefined') return () => cancelAnimationFrame(rafId);
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const scrollToAnchor = (href) => {
    setMobileOpen(false);
    const id = String(href || '').replace(/^#/, '');
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  return (
    <header
      style={
        reduced
          ? undefined
          : {
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translate3d(0, 0, 0)' : 'translate3d(0, -22px, 0)',
              transition: `opacity 480ms ${ease.out} 80ms, transform 480ms ${ease.out} 80ms`,
            }
      }
      className="sticky top-0 z-40 w-full fla-safe-top px-3 sm:px-6"
    >
      <div
        className={`mx-auto max-w-[1240px] rounded-full border transition-all duration-300 ${
          scrolled
            ? 'glass glass--strong px-4 sm:px-6 py-2.5 shadow-lg'
            : 'glass px-4 sm:px-6 py-3.5'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
            className="flex items-center gap-2.5 text-left rounded-full pr-2"
            aria-label="Fairmacs Learning Academy — Back to top"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-white/90">
              <FairmacsEmblem size={23} fill="#0B5CAB" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm sm:text-base font-bold tracking-tight text-[#1F2328]">
                Fairmacs
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4A5058]">
                Learning Academy
              </span>
            </span>
          </button>

          {/* Desktop 4 Navigation Links */}
          <nav aria-label="Primary sections" className="hidden lg:flex items-center gap-1">
            {SITE_CONTENT.navLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => scrollToAnchor(link.href)}
                className="fla-nav-link rounded-full px-4 py-2 text-sm font-semibold text-[#4A5058] transition"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Sticky Mobile Login CTA + Desktop Primary CTA + Hamburger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLoginClick}
              className="fla-btn-secondary !py-2 !px-3.5 text-xs sm:text-sm"
            >
              <LogIn size={15} aria-hidden="true" />
              <span>Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onPrimaryCtaClick();
              }}
              className="hidden md:inline-flex fla-btn-primary !py-2.5 !px-5 text-sm"
            >
              <span>{SITE_CONTENT.brand.primaryCtaLabel}</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-controls="fla-mobile-nav-drawer"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-full bg-white/75 border border-white/90 text-[#1F2328]"
            >
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Glass Drawer */}
      {mobileOpen && (
        <div
          id="fla-mobile-nav-drawer"
          className="lg:hidden mx-auto mt-2 max-w-[1240px] glass glass--strong rounded-3xl p-4 space-y-1.5"
        >
          {SITE_CONTENT.navLinks.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => scrollToAnchor(link.href)}
              className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-base font-semibold text-[#1F2328] active:bg-white/80"
            >
              <span>{link.label}</span>
              <ArrowRight size={16} className="text-[#0B5CAB]" aria-hidden="true" />
            </button>
          ))}

          <div className="pt-2 border-t border-black/5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onPrimaryCtaClick();
              }}
              className="fla-btn-primary w-full justify-center text-sm"
            >
              <span>{SITE_CONTENT.brand.primaryCtaLabel}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
