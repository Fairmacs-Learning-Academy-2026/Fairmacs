import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Award, CheckCircle2, LogIn, ShieldCheck } from 'lucide-react';
import { SITE_CONTENT } from '../../content/site';
import HeroLivePlayground from './HeroLivePlayground';
import { MagneticButton } from './motionPrimitives';
import { ease, usePrefersReducedMotion } from './motionHooks';

export default function LandingHero({ onPrimaryCtaClick, onSecondaryCtaClick }) {
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);

  const heroRef = useRef(null);
  const playgroundParallaxRef = useRef(null);
  const chipFastRef = useRef(null);
  const chipSlowRef = useRef(null);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Multi-depth scroll-linked parallax (0.1x, 0.3x, 0.6x) smoothed via rAF spring
  useEffect(() => {
    if (reduced || typeof window === 'undefined') return undefined;

    let currentScroll = 0;
    let targetScroll = 0;
    let rafId = 0;

    const updateParallax = () => {
      currentScroll += (targetScroll - currentScroll) * 0.14;
      const clamped = Math.min(600, Math.max(0, currentScroll));

      if (playgroundParallaxRef.current) {
        playgroundParallaxRef.current.style.transform = `translate3d(0, ${(-clamped * 0.08).toFixed(1)}px, 0)`;
      }
      if (chipFastRef.current) {
        chipFastRef.current.style.transform = `translate3d(0, ${(-clamped * 0.15).toFixed(1)}px, 0)`;
      }
      if (chipSlowRef.current) {
        chipSlowRef.current.style.transform = `translate3d(0, ${(-clamped * 0.04).toFixed(1)}px, 0)`;
      }

      if (Math.abs(targetScroll - currentScroll) > 0.4) {
        rafId = requestAnimationFrame(updateParallax);
      } else {
        rafId = 0;
      }
    };

    const onScroll = () => {
      targetScroll = window.scrollY;
      if (!rafId) {
        rafId = requestAnimationFrame(updateParallax);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reduced]);

  let globalWordIdx = 0;

  return (
    <section
      ref={heroRef}
      aria-labelledby="fla-hero-heading"
      className="relative z-10 min-h-[calc(100svh-5rem)] flex items-center pt-8 pb-16 sm:pt-12 sm:pb-24 fla-wash-sky"
    >
      <style>{`
        @keyframes flaCardFadeIn {
          from { opacity: 0; transform: translate3d(0, 8px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes flaBobSlow {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -5px, 0); }
        }
        @keyframes flaBobAlt {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, 5px, 0); }
        }
      `}</style>

      <div className="fla-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column (7 cols) */}
          <div className="lg:col-span-7">
            <div
              style={
                reduced
                  ? undefined
                  : {
                      opacity: ready ? 1 : 0,
                      transform: ready ? 'translate3d(0, 0, 0)' : 'translate3d(0, 12px, 0)',
                      transition: `opacity 480ms ${ease.out} 140ms, transform 480ms ${ease.out} 140ms`,
                    }
              }
              className="inline-flex items-center gap-2 glass-pill rounded-full px-4 py-1.5 text-xs font-semibold text-[#0B5CAB] mb-6"
            >
              <ShieldCheck size={14} aria-hidden="true" />
              <span>{SITE_CONTENT.hero.eyebrow}</span>
            </div>

            {/* Staggered Kinetic H1 with Masked Word Rise + Drawn SVG Underline */}
            <h1 id="fla-hero-heading" className="fla-display-h1">
              {SITE_CONTENT.hero.headlineLines.map((line, lineIdx) => (
                <span key={lineIdx} className="block">
                  {line.map((word) => {
                    const currentIdx = globalWordIdx++;
                    const isHighlighted = word === SITE_CONTENT.hero.highlightedWord;
                    const wordDelayMs = 200 + currentIdx * 60;

                    return (
                      <span
                        key={`${lineIdx}-${word}`}
                        className="inline-block overflow-hidden align-bottom pb-1.5 mr-[0.24em]"
                      >
                        <span
                          style={
                            reduced
                              ? undefined
                              : {
                                  transform: ready ? 'translate3d(0, 0%, 0)' : 'translate3d(0, 110%, 0)',
                                  transition: `transform 880ms ${ease.out} ${wordDelayMs}ms`,
                                }
                          }
                          className={`inline-block relative ${
                            isHighlighted ? 'text-[#0B5CAB] italic' : ''
                          }`}
                        >
                          {word}
                          {isHighlighted && (
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 220 18"
                              fill="none"
                              className="absolute -bottom-1 left-0 w-full h-3.5 overflow-visible"
                            >
                              <defs>
                                <linearGradient id="flaHeroArc" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#0B5CAB" />
                                  <stop offset="55%" stopColor="#3898EC" />
                                  <stop offset="100%" stopColor="#FF9B71" />
                                </linearGradient>
                              </defs>
                              <path
                                d="M4 13 C 62 3, 154 3, 216 11"
                                stroke="url(#flaHeroArc)"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeDasharray="220"
                                strokeDashoffset={reduced || ready ? '0' : '220'}
                                style={
                                  reduced
                                    ? undefined
                                    : {
                                        transition: `stroke-dashoffset 850ms ${ease.out} 720ms`,
                                      }
                                }
                              />
                            </svg>
                          )}
                        </span>
                      </span>
                    );
                  })}
                </span>
              ))}
            </h1>

            <p
              style={
                reduced
                  ? undefined
                  : {
                      opacity: ready ? 1 : 0,
                      transform: ready ? 'translate3d(0, 0, 0)' : 'translate3d(0, 18px, 0)',
                      transition: `opacity 520ms ${ease.out} 600ms, transform 520ms ${ease.out} 600ms`,
                    }
              }
              className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-[#4A5058]"
            >
              {SITE_CONTENT.hero.subcopy}
            </p>

            {/* Primary Magnetic CTA + Secondary CTA */}
            <div
              style={
                reduced
                  ? undefined
                  : {
                      opacity: ready ? 1 : 0,
                      transform: ready ? 'translate3d(0, 0, 0)' : 'translate3d(0, 18px, 0)',
                      transition: `opacity 520ms ${ease.out} 720ms, transform 520ms ${ease.out} 720ms`,
                    }
              }
              className="mt-8 flex flex-wrap items-center gap-3.5"
            >
              <MagneticButton variant="primary" pulseRing onClick={onPrimaryCtaClick}>
                <span>{SITE_CONTENT.brand.primaryCtaLabel}</span>
                <ArrowRight size={17} aria-hidden="true" />
              </MagneticButton>

              <MagneticButton variant="secondary" onClick={onSecondaryCtaClick}>
                <LogIn size={16} aria-hidden="true" />
                <span>{SITE_CONTENT.brand.secondaryCtaLabel}</span>
              </MagneticButton>
            </div>

            {/* Trust Micro-Row */}
            <ul
              style={
                reduced
                  ? undefined
                  : {
                      opacity: ready ? 1 : 0,
                      transition: `opacity 520ms ${ease.out} 860ms`,
                    }
              }
              className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-sm font-semibold text-[#4A5058]"
              aria-label="Academy highlights"
            >
              {SITE_CONTENT.hero.trustRow.map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#0B5CAB] shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Column (5 cols): Live Playground + Parallax Floating Glass Chips */}
          <div className="lg:col-span-5 relative">
            {/* Floating Chip 1 (0.6x parallax + bobbing) */}
            <div
              ref={chipFastRef}
              style={
                reduced
                  ? undefined
                  : {
                      opacity: ready ? 1 : 0,
                      transition: `opacity 450ms ${ease.out} 940ms`,
                    }
              }
              className="hidden sm:flex items-center gap-2.5 glass-pill rounded-2xl px-3.5 py-2 absolute -top-5 right-3 z-20"
            >
              <span
                style={reduced ? undefined : { animation: 'flaBobSlow 4.2s ease-in-out infinite' }}
                className="flex items-center gap-2"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#0F766E]" aria-hidden="true" />
                <span className="text-xs font-bold text-[#1F2328]">
                  {SITE_CONTENT.hero.floatingChips[0].label}
                </span>
              </span>
            </div>

            {/* Playground Container (0.3x parallax) */}
            <div
              ref={playgroundParallaxRef}
              style={
                reduced
                  ? undefined
                  : {
                      opacity: ready ? 1 : 0,
                      transition: `opacity 600ms ${ease.out} 800ms`,
                    }
              }
            >
              <HeroLivePlayground />
            </div>

            {/* Floating Chip 2 (0.1x parallax + desynchronized bobbing) */}
            <div
              ref={chipSlowRef}
              style={
                reduced
                  ? undefined
                  : {
                      opacity: ready ? 1 : 0,
                      transition: `opacity 450ms ${ease.out} 1100ms`,
                    }
              }
              className="hidden sm:flex items-center gap-2 glass-pill rounded-2xl px-3.5 py-2 absolute -bottom-5 left-3 z-20"
            >
              <span
                style={reduced ? undefined : { animation: 'flaBobAlt 5.1s ease-in-out infinite' }}
                className="flex items-center gap-2"
              >
                <Award size={15} className="text-[#0B5CAB]" aria-hidden="true" />
                <span className="text-xs font-bold text-[#1F2328]">
                  {SITE_CONTENT.hero.floatingChips[1].label}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
