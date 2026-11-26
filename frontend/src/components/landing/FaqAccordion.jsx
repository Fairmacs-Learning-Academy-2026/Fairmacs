import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { SITE_CONTENT } from '../../content/site';
import { Reveal } from './motionPrimitives';

export default function FaqAccordion() {
  const [openId, setOpenId] = useState(SITE_CONTENT.faqs[0]?.id || null);

  return (
    <section id="faq" aria-labelledby="fla-faq-heading" className="fla-section fla-wash-sky z-10">
      <div className="fla-container max-w-4xl">
        <Reveal className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
            <HelpCircle size={13} aria-hidden="true" />
            Frequently Asked Questions
          </span>
          <h2 id="fla-faq-heading" className="fla-display-h2 mt-4">
            Everything you need to know about the Academy.
          </h2>
        </Reveal>

        <div className="mt-10 space-y-3.5">
          {SITE_CONTENT.faqs.map((faq, idx) => {
            const isOpen = openId === faq.id;
            const panelId = `fla-faq-panel-${faq.id}`;
            const triggerId = `fla-faq-trigger-${faq.id}`;

            return (
              <Reveal key={faq.id} delay={idx * 0.05}>
                <div className="glass glass--strong rounded-2xl px-5 sm:px-6 py-4">
                  <h3>
                    <button
                      id={triggerId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenId(isOpen ? null : faq.id)}
                      className="flex w-full items-center justify-between gap-4 py-1 text-left text-base font-bold text-[#1F2328]"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        size={19}
                        aria-hidden="true"
                        className={`shrink-0 text-[#0B5CAB] transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  </h3>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    data-open={isOpen ? 'true' : 'false'}
                    className="fla-accordion-panel"
                  >
                    <div className="fla-accordion-inner">
                      <p className="pt-3 pb-1 text-sm sm:text-base text-[#4A5058] leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
