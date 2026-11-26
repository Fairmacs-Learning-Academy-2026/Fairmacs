import React from 'react';
import { CheckCircle2, GraduationCap, ShieldCheck, TrendingUp } from 'lucide-react';
import { SITE_CONTENT } from '../../content/site';
import { Reveal, TiltGlassCard } from './motionPrimitives';

const CARD_ICONS = [GraduationCap, ShieldCheck, TrendingUp];

export default function MethodMentorsSection() {
  return (
    <section aria-labelledby="fla-method-heading" className="fla-section fla-wash-lilac z-10">
      <div className="fla-container">
        <Reveal className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
            <GraduationCap size={14} aria-hidden="true" />
            The Fairmacs Method
          </span>
          <h2 id="fla-method-heading" className="fla-display-h2 mt-4">
            Practitioner wisdom paired with audit-grade governance.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4A5058] leading-relaxed">
            Every curriculum blends operational field experience from senior Fairmacs leads with secure digital compliance workflows.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {SITE_CONTENT.mentorsAndMethod.map((card, idx) => {
            const Icon = CARD_ICONS[idx % CARD_ICONS.length];
            return (
              <Reveal key={card.id} delay={idx * 0.08} className="h-full">
                <TiltGlassCard strong className="h-full p-6 sm:p-7">
                  <div className="flex flex-col justify-between h-full gap-5">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#BFE3FF]/70 text-[#0B5CAB]">
                          <Icon size={21} aria-hidden="true" />
                        </span>
                        <span className="rounded-full bg-white/85 border border-black/10 px-3 py-1 text-xs font-bold text-[#4A5058]">
                          {card.badge}
                        </span>
                      </div>

                      <h3 className="fla-display-h3 mt-5">{card.title}</h3>
                      <div className="mt-1 text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
                        {card.roleOrFocus}
                      </div>
                      <p className="mt-3 text-sm text-[#4A5058] leading-relaxed">
                        {card.description}
                      </p>
                    </div>

                    <ul className="pt-4 border-t border-black/[0.06] space-y-2">
                      {card.highlights.map((h) => (
                        <li key={h} className="flex items-start gap-2 text-xs sm:text-sm font-medium text-[#1F2328]">
                          <CheckCircle2
                            size={15}
                            className="text-[#0B5CAB] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TiltGlassCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
