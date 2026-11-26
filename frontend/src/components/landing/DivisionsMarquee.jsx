import React from 'react';
import { Compass } from 'lucide-react';
import { SITE_CONTENT } from '../../content/site';

export default function DivisionsMarquee() {
  if (!SITE_CONTENT.flags.showDivisionsMarquee) return null;

  const items = SITE_CONTENT.divisions;

  return (
    <section
      aria-label="Fairmacs operational divisions served"
      className="relative z-10 py-6 border-y border-white/80 bg-[#F4F1EC]/70 backdrop-blur-md"
    >
      <div className="fla-container mb-3 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#575E68]">
          Unified Capability Across Fairmacs Business Divisions
        </p>
      </div>

      <div className="fla-marquee-mask overflow-hidden py-1">
        <div className="fla-marquee-track gap-3 px-3">
          {[...items, ...items].map((division, idx) => (
            <div
              key={`${division}-${idx}`}
              aria-hidden={idx >= items.length ? 'true' : undefined}
              className="inline-flex items-center gap-2 glass-pill rounded-full px-4 py-2 text-xs sm:text-sm font-semibold text-[#1F2328] mr-3 shrink-0"
            >
              <Compass size={14} className="text-[#0B5CAB]" aria-hidden="true" />
              <span>{division}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
