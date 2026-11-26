import React, { useEffect, useRef, useState } from 'react';
import { Route } from 'lucide-react';
import { SITE_CONTENT } from '../../content/site';
import { Reveal } from './motionPrimitives';
import { usePrefersReducedMotion } from './motionHooks';

export default function LearningTimeline() {
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0.15);

  useEffect(() => {
    if (reduced || typeof window === 'undefined') return undefined;

    let rafId = 0;
    const computeProgress = () => {
      rafId = 0;
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const start = vh * 0.78;
      const end = vh * 0.22;
      const raw = (start - rect.top) / (rect.height - (start - end) + 200);
      const clamped = Math.max(0.08, Math.min(1, raw));
      setScrollProgress(clamped);
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(computeProgress);
      }
    };

    rafId = requestAnimationFrame(computeProgress);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reduced]);

  const fillProgress = reduced ? 1 : scrollProgress;

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      aria-labelledby="fla-timeline-heading"
      className="fla-section fla-wash-peach z-10"
    >
      <div className="fla-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Sticky Intro Column */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <Reveal>
              <span className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
                <Route size={13} aria-hidden="true" />
                How Learning Works
              </span>
              <h2 id="fla-timeline-heading" className="fla-display-h2 mt-4">
                Four clear steps from role assignment to verified mastery.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-[#4A5058] leading-relaxed">
                Every course and policy follows a structured progression—combining self-paced SOP clarity with live trainer guidance and tamper-evident credentials.
              </p>
            </Reveal>
          </div>

          {/* Scroll-Linked Vertical Spine + Glass Step Cards */}
          <div className="lg:col-span-7 relative pl-8 sm:pl-12">
            {/* Background Track Line */}
            <div
              aria-hidden="true"
              className="absolute left-3 sm:left-4 top-3 bottom-3 w-[3px] rounded-full bg-black/[0.08] overflow-hidden"
            >
              <div
                style={{
                  transform: `scaleY(${fillProgress.toFixed(3)})`,
                  transformOrigin: 'top center',
                }}
                className="h-full w-full bg-gradient-to-b from-[#0B5CAB] via-[#3898EC] to-[#0F766E] transition-transform duration-150 ease-out"
              />
            </div>

            <div className="space-y-6">
              {SITE_CONTENT.howItWorks.map((step, idx) => {
                const threshold = (idx + 0.5) / SITE_CONTENT.howItWorks.length;
                const reached = fillProgress >= threshold;

                return (
                  <Reveal key={step.stepNumber} delay={idx * 0.08} className="relative">
                    {/* Node Marker */}
                    <span
                      aria-hidden="true"
                      className={`fla-tabular absolute -left-8 sm:-left-12 top-6 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors duration-300 ${
                        reached
                          ? 'bg-[#0B5CAB] text-white border-white shadow-md'
                          : 'bg-[#FBF8F3] text-[#4A5058] border-black/15'
                      }`}
                    >
                      {step.stepNumber}
                    </span>

                    <div className="glass glass--strong p-6 sm:p-7">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
                          Step {step.stepNumber}
                        </span>
                        <span className="rounded-full bg-[#BFE3FF]/60 px-3 py-1 text-xs font-semibold text-[#1F2328]">
                          {step.detailBadge}
                        </span>
                      </div>
                      <h3 className="fla-display-h3 mt-2.5">{step.title}</h3>
                      <p className="mt-2 text-sm sm:text-base text-[#4A5058] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
