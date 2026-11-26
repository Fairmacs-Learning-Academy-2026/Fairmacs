import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquareQuote } from 'lucide-react';
import { SITE_CONTENT } from '../../content/site';
import { Reveal } from './motionPrimitives';
import { ease, usePrefersReducedMotion } from './motionHooks';

export default function TestimonialsCarousel() {
  const reduced = usePrefersReducedMotion();
  const items = SITE_CONTENT.testimonials;
  const [activeIndex, setActiveIndex] = useState(0);
  const dragStartX = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);

  if (!SITE_CONTENT.flags.showSampleTestimonials || !items.length) {
    return null;
  }

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const handlePointerDown = (e) => {
    dragStartX.current = e.clientX;
  };

  const handlePointerMove = (e) => {
    if (dragStartX.current === null) return;
    setDragOffset(e.clientX - dragStartX.current);
  };

  const handlePointerEnd = () => {
    if (dragStartX.current === null) return;
    if (dragOffset < -48) {
      goNext();
    } else if (dragOffset > 48) {
      goPrev();
    }
    dragStartX.current = null;
    setDragOffset(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    }
  };

  const current = items[activeIndex];

  return (
    <section aria-labelledby="fla-testimonials-heading" className="fla-section fla-wash-peach z-10">
      <div className="fla-container">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <Reveal className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
              <MessageSquareQuote size={14} aria-hidden="true" />
              Team Perspectives
            </span>
            <h2 id="fla-testimonials-heading" className="fla-display-h2 mt-4">
              Designed around how logistics teams actually learn.
            </h2>
          </Reveal>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous perspective"
              className="fla-btn-secondary !p-2.5 rounded-full"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next perspective"
              className="fla-btn-secondary !p-2.5 rounded-full"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Draggable & Keyboard-Accessible Glass Carousel Surface */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Learner perspectives"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          style={{ touchAction: 'pan-y' }}
          className="mt-8 select-none cursor-grab active:cursor-grabbing rounded-3xl"
        >
          <div
            key={current.id}
            style={{
              transform: dragOffset ? `translate3d(${(dragOffset * 0.35).toFixed(1)}px, 0, 0)` : undefined,
              animation: reduced ? 'none' : `flaCardFadeIn 280ms ${ease.out} both`,
            }}
            className="glass glass--strong p-7 sm:p-10"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <span className="rounded-full bg-[#BFE3FF]/70 px-3 py-1 text-xs font-bold text-[#0B5CAB]">
                {current.division}
              </span>
              {current.isSample && (
                <span className="rounded-full bg-[#FFD9C7]/75 px-3 py-1 text-[11px] font-semibold text-[#7C2D12]">
                  Illustrative Sample Copy · Editable in src/content/site.js
                </span>
              )}
            </div>

            <blockquote className="fla-display-h3 !text-xl sm:!text-2xl !leading-relaxed text-[#1F2328]">
              “{current.quote}”
            </blockquote>

            <div className="mt-6 pt-5 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[#1F2328]">{current.authorLabel}</div>
                <div className="text-xs text-[#4A5058]">Track: {current.trackCompleted}</div>
              </div>

              {/* Slide Dots */}
              <div className="flex items-center gap-2" role="tablist" aria-label="Select slide">
                {items.map((item, idx) => {
                  const selected = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-label={`Show perspective ${idx + 1} of ${items.length}`}
                      onClick={() => setActiveIndex(idx)}
                      className={`h-2.5 rounded-full transition-all ${
                        selected ? 'w-7 bg-[#0B5CAB]' : 'w-2.5 bg-black/20 hover:bg-black/35'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
