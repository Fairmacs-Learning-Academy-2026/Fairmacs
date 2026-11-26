import React from 'react';
import { ArrowUp, Mail, MapPin } from 'lucide-react';
import FairmacsEmblem from '../FairmacsEmblem';
import { SITE_CONTENT } from '../../content/site';
import { usePrefersReducedMotion } from './motionHooks';

export default function LightGlassFooter({ onNavigate }) {
  const reduced = usePrefersReducedMotion();
  const year = new Date().getFullYear();

  const scrollToSection = (href) => {
    const id = String(href || '').replace(/^#/, '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    } else if (onNavigate) {
      onNavigate('/');
    }
  };

  return (
    <footer
      aria-label="Fairmacs Learning Academy Footer"
      className="relative z-10 pt-8 pb-10 fla-safe-bottom bg-[#F4F1EC] border-t border-white/90"
    >
      <div className="fla-container">
        <div className="glass glass--strong p-7 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-black/[0.07]">
            {/* Brand & Registered Corporate HQ */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm border border-black/5">
                  <FairmacsEmblem size={25} fill="#0B5CAB" />
                </span>
                <div>
                  <div className="text-base font-bold tracking-tight text-[#1F2328]">
                    {SITE_CONTENT.brand.name}
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4A5058]">
                    {SITE_CONTENT.brand.tagline}
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#4A5058] leading-relaxed max-w-md">
                Enterprise learning, operational freight curricula, confidential SOP governance, and verifiable credentials across Fairmacs.
              </p>

              <address className="not-italic space-y-2 text-xs sm:text-sm text-[#4A5058]">
                <div className="font-semibold text-[#1F2328]">
                  {SITE_CONTENT.brand.legalEntity}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="text-[#0B5CAB] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{SITE_CONTENT.contact.fullAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={15} className="text-[#0B5CAB] shrink-0" aria-hidden="true" />
                  <a
                    href={`mailto:${SITE_CONTENT.contact.email}`}
                    className="font-semibold text-[#0B5CAB] hover:underline"
                  >
                    {SITE_CONTENT.contact.email}
                  </a>
                </div>
              </address>
            </div>

            {/* Sitemap: Academy Sections */}
            <div className="md:col-span-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2328] mb-3.5">
                Academy
              </h3>
              <ul className="space-y-2.5 text-sm">
                {SITE_CONTENT.navLinks.map((link) => (
                  <li key={link.href}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(link.href)}
                      className="font-medium text-[#4A5058] hover:text-[#0B5CAB] transition"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection('#enquiry')}
                    className="font-medium text-[#4A5058] hover:text-[#0B5CAB] transition"
                  >
                    Request Cohort Demo
                  </button>
                </li>
              </ul>
            </div>

            {/* Portals & Legal */}
            <div className="md:col-span-4 flex flex-col justify-between gap-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2328] mb-3.5">
                  Portals &amp; Governance
                </h3>
                <ul className="space-y-2.5 text-sm">
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('/login')}
                      className="font-semibold text-[#0B5CAB] hover:underline"
                    >
                      Employee, Trainer &amp; HR Sign In →
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('/privacy-policy')}
                      className="font-medium text-[#4A5058] hover:text-[#0B5CAB] transition"
                    >
                      Privacy Policy
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('/terms')}
                      className="font-medium text-[#4A5058] hover:text-[#0B5CAB] transition"
                    >
                      Terms of Use
                    </button>
                  </li>
                </ul>
              </div>

              <div className="flex justify-start md:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
                  }
                  aria-label="Scroll back to top"
                  className="fla-btn-secondary !py-2 !px-4 text-xs"
                >
                  <ArrowUp size={14} aria-hidden="true" />
                  <span>Back to top</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Legal Row */}
          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#4A5058]">
            <span>
              © {year} {SITE_CONTENT.brand.legalEntity} All rights reserved.
            </span>
            <span>{SITE_CONTENT.brand.name} · Daylight Edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
