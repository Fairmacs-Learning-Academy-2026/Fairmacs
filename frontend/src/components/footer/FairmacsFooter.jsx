import React from 'react';
import { useNavigate } from 'react-router-dom';
import FooterMarquee from './FooterMarquee';
import FooterCTA from './FooterCTA';
import FooterNavigation from './FooterNavigation';
import FooterWordmark from './FooterWordmark';
import FairmacsEmblem from '../FairmacsEmblem';
import './footer.css';

export default function FairmacsFooter({
  variant = 'public',
  role = 'EMPLOYEE',
  onNavigate,
  onScrollToSection,
}) {
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const handleScrollToSection = (sectionId) => {
    if (onScrollToSection) {
      onScrollToSection(sectionId);
      return;
    }
    const target = document.getElementById(sectionId);
    if (target) {
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`fairmacs-footer-root variant-${variant}`}
      aria-label="Fairmacs Footer"
    >
      {/* Hybrid Light Liquid Glass Upper Section + Kinetic Marquee */}
      <div className="fairmacs-footer-light-band">
        <FooterMarquee />
      </div>

      {/* Smooth Liquid-to-Navy Gradient Bridge */}
      <div className="fairmacs-footer-bridge" aria-hidden="true" />

      {/* Deep Navy Cinematic Lower Stage */}
      <div className="fairmacs-footer-dark-stage">
        {/* Ambient Mesh Gradient Drift & Subtle Fairmacs Sail Logo Watermark */}
        <div className="fairmacs-footer-ambient-layer" aria-hidden="true">
          <div className="fairmacs-ambient-orb fairmacs-ambient-orb-1" />
          <div className="fairmacs-ambient-orb fairmacs-ambient-orb-2" />
          <div className="fairmacs-ambient-orb fairmacs-ambient-orb-3" />
          <div className="fairmacs-footer-bg-logo-watermark">
            <FairmacsEmblem size={500} fill="#BFD9F8" />
          </div>
        </div>
        <div className="fairmacs-footer-noise" aria-hidden="true" />

        <div className="fairmacs-footer-inner">
          <FooterCTA
            variant={variant}
            role={role}
            onNavigate={handleNavigate}
          />

          <FooterNavigation
            variant={variant}
            role={role}
            onNavigate={handleNavigate}
            onScrollToSection={handleScrollToSection}
          />

          <FooterWordmark />

          <div className="fairmacs-footer-legal-bar">
            <span>© {currentYear} Fairmacs. All Rights Reserved</span>
            <span>Fairmacs Knowledge Management System</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
