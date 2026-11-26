import React from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { SITE_CONTENT } from '../../content/site';
import { Reveal, TiltGlassCard } from './motionPrimitives';

export default function LearningFormatsSection({ onChooseFormat }) {
  if (!SITE_CONTENT.flags.showLearningFormats) return null;

  return (
    <section aria-labelledby="fla-formats-heading" className="fla-section fla-wash-mint z-10">
      <div className="fla-container">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
            <Sparkles size={13} aria-hidden="true" />
            Delivery Formats &amp; Cohorts
          </span>
          <h2 id="fla-formats-heading" className="fla-display-h2 mt-4">
            Structured for every stage of a Fairmacs career.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4A5058] leading-relaxed">
            Whether onboarding a new branch joiner or running a multi-week commercial pricing workshop, pick the cadence that fits your team.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {SITE_CONTENT.learningFormats.map((tier, idx) => (
            <Reveal key={tier.id} delay={idx * 0.08} className="h-full">
              <TiltGlassCard
                strong={Boolean(tier.recommended)}
                className={`h-full p-6 sm:p-8 flex flex-col justify-between ${
                  tier.recommended
                    ? 'ring-2 ring-[#0B5CAB] bg-white/80'
                    : ''
                }`}
              >
                <div className="flex flex-col justify-between h-full gap-6">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#575E68]">
                        {tier.cadence}
                      </span>
                      {tier.recommended && (
                        <span className="rounded-full bg-[#0B5CAB] px-3 py-1 text-[11px] font-bold text-white">
                          Recommended
                        </span>
                      )}
                    </div>

                    <h3 className="fla-display-h3 mt-3 !text-2xl">{tier.name}</h3>
                    <div className="mt-1 text-xs font-semibold text-[#0B5CAB]">
                      {tier.audience}
                    </div>
                    <p className="mt-3 text-sm text-[#4A5058] leading-relaxed">
                      {tier.description}
                    </p>

                    <ul className="mt-5 pt-5 border-t border-black/[0.06] space-y-2.5">
                      {tier.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-sm text-[#1F2328]">
                          <CheckCircle2
                            size={16}
                            className="text-[#0B5CAB] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => onChooseFormat(tier.name)}
                    className={
                      tier.recommended
                        ? 'fla-btn-primary w-full text-sm'
                        : 'fla-btn-secondary w-full text-sm'
                    }
                  >
                    <span>{tier.ctaLabel}</span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </TiltGlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
