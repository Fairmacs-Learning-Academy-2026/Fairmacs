import React, { useRef, useCallback } from 'react';
import { ArrowUpRight, ArrowUp, Compass } from 'lucide-react';

const MAX_MAGNETIC_PULL = 6; // Maximum 6px magnetic attraction

export default function FooterCTA({
  variant = 'public',
  role = 'EMPLOYEE',
  onNavigate,
  onScrollToTop,
}) {
  const btnRef = useRef(null);

  const isPublic = variant === 'public';

  const getCtaConfig = () => {
    if (isPublic) {
      return {
        eyebrow: 'Fairmacs Learning Academy',
        heading: 'Empowering learning across every boundary.',
        buttonLabel: "Let's move possibilities forward",
        targetPath: '/login',
      };
    }

    const normalizedRole = String(role || 'EMPLOYEE').toUpperCase();
    switch (normalizedRole) {
      case 'MANAGER':
        return {
          eyebrow: 'Manager Learning Portal',
          heading: 'Guide your team toward operational excellence.',
          buttonLabel: 'Continue your learning journey',
          targetPath: '/manager/all-courses',
        };
      case 'TRAINER':
        return {
          eyebrow: 'Trainer Authoring Studio',
          heading: 'Build impactful training across Fairmacs.',
          buttonLabel: 'Continue your learning journey',
          targetPath: '/courses',
        };
      case 'HR_ADMIN':
        return {
          eyebrow: 'HR Administration',
          heading: 'Drive compliance and growth organization-wide.',
          buttonLabel: 'Continue your learning journey',
          targetPath: '/hr/courses',
        };
      case 'EMPLOYEE':
      default:
        return {
          eyebrow: 'Fairmacs Learning Academy',
          heading: 'Build capability and stay ahead every day.',
          buttonLabel: 'Continue your learning journey',
          targetPath: '/courses',
        };
    }
  };

  const config = getCtaConfig();

  const handlePointerMove = useCallback((e) => {
    if (e.pointerType !== 'mouse') return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const el = btnRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    const moveX = Math.max(-MAX_MAGNETIC_PULL, Math.min(MAX_MAGNETIC_PULL, relX * MAX_MAGNETIC_PULL * 2));
    const moveY = Math.max(-MAX_MAGNETIC_PULL, Math.min(MAX_MAGNETIC_PULL, relY * MAX_MAGNETIC_PULL * 2));

    el.style.transform = `translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0)`;
  }, []);

  const handlePointerLeave = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    el.style.transform = 'translate3d(0, 0, 0)';
  }, []);

  const handleBackToTop = () => {
    if (onScrollToTop) {
      onScrollToTop();
      return;
    }
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReduced ? 'auto' : 'smooth',
    });
  };

  return (
    <div className="fairmacs-footer-cta-row">
      <div className="fairmacs-cta-copy">
        <div className="fairmacs-cta-eyebrow">
          <Compass size={13} aria-hidden="true" />
          <span>{config.eyebrow}</span>
        </div>
        <h2 className="fairmacs-cta-heading">{config.heading}</h2>
      </div>

      <div className="fairmacs-cta-actions-group">
        <button
          ref={btnRef}
          type="button"
          className="fairmacs-magnetic-cta"
          onClick={() => onNavigate && onNavigate(config.targetPath)}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <span>{config.buttonLabel}</span>
          <span className="fairmacs-magnetic-cta-arrow" aria-hidden="true">
            <ArrowUpRight size={17} />
          </span>
        </button>

        <button
          type="button"
          className="fairmacs-back-to-top"
          onClick={handleBackToTop}
          aria-label="Back to top"
          title="Back to top"
        >
          <span className="fairmacs-back-to-top-icon" aria-hidden="true">
            <ArrowUp size={18} />
          </span>
        </button>
      </div>
    </div>
  );
}
