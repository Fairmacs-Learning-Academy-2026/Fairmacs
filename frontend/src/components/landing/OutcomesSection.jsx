import React from 'react';
import { BarChart3 } from 'lucide-react';
import { SITE_CONTENT } from '../../content/site';
import { AnimatedCounter, Reveal } from './motionPrimitives';

export default function OutcomesSection() {
  return (
    <section id="outcomes" aria-labelledby="fla-outcomes-heading" className="fla-section fla-wash-mint z-10">
      <div className="fla-container">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 id="fla-outcomes-heading" className="fla-display-h2 mt-4">
            Built for measurable capability across every branch and desk.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4A5058] leading-relaxed">
            Real structural foundations powering training delivery, departmental oversight, and compliance verification across Fairmacs.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SITE_CONTENT.outcomes.map((metric, idx) => (
            <Reveal key={metric.id} delay={idx * 0.08}>
              <div className="glass glass--strong h-full p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <div className="fla-display-h2 !text-4xl sm:!text-5xl text-[#0B5CAB]">
                    <AnimatedCounter value={metric.value} suffix={metric.suffix} />
                  </div>
                  <h3 className="mt-3 text-base font-bold text-[#1F2328]">{metric.label}</h3>
                </div>
                <p className="mt-2.5 text-xs sm:text-sm text-[#4A5058] leading-relaxed">
                  {metric.sublabel}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
