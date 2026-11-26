import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  Users,
  X,
} from 'lucide-react';
import { SITE_CONTENT } from '../../content/site';
import { Reveal, TiltGlassCard } from './motionPrimitives';
import { ease, usePrefersReducedMotion } from './motionHooks';

const WASH_BADGE = {
  sky: 'bg-[#BFE3FF]/70 text-[#0B5CAB]',
  mint: 'bg-[#CFF3E3]/80 text-[#0F5132]',
  peach: 'bg-[#FFD9C7]/80 text-[#9A3412]',
  lilac: 'bg-[#E4DAFF]/80 text-[#4C1D95]',
};

export default function ProgramsBentoGrid({ onSelectTrackForEnquiry, onSignInClick }) {
  const reduced = usePrefersReducedMotion();
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedProgram, setExpandedProgram] = useState(null);
  const lastTriggerRef = useRef(null);
  const closeBtnRef = useRef(null);

  const visiblePrograms = useMemo(() => {
    if (activeCategory === 'all') return SITE_CONTENT.programs;
    return SITE_CONTENT.programs.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  const handleFilterChange = (categoryId) => {
    if (
      !reduced &&
      typeof document !== 'undefined' &&
      typeof document.startViewTransition === 'function'
    ) {
      document.startViewTransition(() => {
        setActiveCategory(categoryId);
      });
    } else {
      setActiveCategory(categoryId);
    }
  };

  const openProgramDetail = (program, triggerEl) => {
    lastTriggerRef.current = triggerEl || null;
    setExpandedProgram(program);
  };

  const closeProgramDetail = () => {
    setExpandedProgram(null);
    if (lastTriggerRef.current && typeof lastTriggerRef.current.focus === 'function') {
      setTimeout(() => lastTriggerRef.current?.focus(), 20);
    }
  };

  useEffect(() => {
    if (!expandedProgram) return undefined;
    closeBtnRef.current?.focus();
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeProgramDetail();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expandedProgram]);

  return (
    <section id="programs" aria-labelledby="fla-programs-heading" className="fla-section fla-wash-lilac z-10">
      <div className="fla-container">
        <Reveal className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
            <Layers size={13} aria-hidden="true" />
            Role-Mapped Curriculum
          </span>
          <h2 id="fla-programs-heading" className="fla-display-h2 mt-4">
            Practical logistics &amp; enterprise tracks built for real desks.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#4A5058] leading-relaxed">
            Filter by operational track or select any card to inspect its syllabus, target roles, and certification format.
          </p>
        </Reveal>

        {/* Interactive Filter Chips */}
        <div
          role="tablist"
          aria-label="Filter academy programs by track"
          className="mt-8 flex flex-wrap gap-2"
        >
          {SITE_CONTENT.bentoCategories.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleFilterChange(cat.id)}
                className={`fla-chip rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                  active
                    ? 'bg-[#0B5CAB] text-white shadow-md'
                    : 'glass-pill text-[#1F2328] hover:bg-white/90'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* 12-Column Asymmetric Interactive Bento Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-5">
          {visiblePrograms.map((program, idx) => {
            const isWide =
              activeCategory === 'all' ? Boolean(program.featured) : idx % 3 === 0;
            const colSpanClass = isWide ? 'md:col-span-7' : 'md:col-span-5';
            const badgeStyle = WASH_BADGE[program.accentWash] || WASH_BADGE.sky;

            return (
              <div
                key={program.id}
                style={
                  reduced
                    ? undefined
                    : {
                        animation: `flaCardFadeIn 340ms ${ease.out} ${idx * 55}ms both`,
                      }
                }
                className={colSpanClass}
              >
                <TiltGlassCard
                  strong={isWide}
                  role="button"
                  tabIndex={0}
                  ariaLabel={`${program.title} — Open syllabus details`}
                  onClick={(e) => openProgramDetail(program, e?.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openProgramDetail(program, e.currentTarget);
                    }
                  }}
                  className="h-full p-6 sm:p-7 cursor-pointer group transition-shadow hover:shadow-xl"
                >
                  <div className="flex flex-col justify-between h-full gap-5">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${badgeStyle}`}
                        >
                          {program.categoryLabel}
                        </span>
                        <span className="rounded-full bg-white/80 border border-black/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#4A5058]">
                          {program.level}
                        </span>
                      </div>

                      <h3 className="fla-display-h3 mt-4">{program.title}</h3>
                      <p className="mt-2 text-sm font-semibold text-[#0B5CAB]">
                        {program.outcomeHeadline}
                      </p>
                      <p className="mt-2.5 text-sm text-[#4A5058] leading-relaxed">
                        {program.summary}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4 text-xs font-semibold text-[#4A5058] fla-tabular">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen size={14} className="text-[#0B5CAB]" aria-hidden="true" />
                          {program.modulesCount} Modules
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={14} className="text-[#0B5CAB]" aria-hidden="true" />
                          {program.estimatedHours}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0B5CAB]">
                        <span>Inspect Syllabus</span>
                        <ArrowUpRight
                          size={15}
                          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </div>
                </TiltGlassCard>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Frosted Detail Sheet Modal */}
      {expandedProgram && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fla-bento-modal-title"
          onClick={closeProgramDetail}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F2328]/25 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={
              reduced
                ? undefined
                : { animation: `flaCardFadeIn 220ms ${ease.out} both` }
            }
            className="glass glass--strong max-w-2xl w-full p-6 sm:p-8 max-h-[88dvh] overflow-y-auto shadow-2xl bg-white/88"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      WASH_BADGE[expandedProgram.accentWash] || WASH_BADGE.sky
                    }`}
                  >
                    {expandedProgram.categoryLabel}
                  </span>
                  <span className="rounded-full bg-[#F4F1EC] px-3 py-1 text-xs font-semibold text-[#4A5058]">
                    {expandedProgram.level} Level · {expandedProgram.estimatedHours}
                  </span>
                </div>
                <h3 id="fla-bento-modal-title" className="fla-display-h3 mt-3 !text-2xl">
                  {expandedProgram.title}
                </h3>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={closeProgramDetail}
                aria-label="Close syllabus preview"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4F1EC] text-[#1F2328] hover:bg-white border border-black/10"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-3 text-sm sm:text-base font-semibold text-[#0B5CAB]">
              {expandedProgram.outcomeHeadline}
            </p>
            <p className="mt-2 text-sm text-[#4A5058] leading-relaxed">
              {expandedProgram.summary}
            </p>

            {/* Syllabus Highlights */}
            <div className="mt-6 rounded-2xl bg-[#FBF8F3] border border-black/[0.07] p-4 sm:p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#575E68] mb-3">
                Core Syllabus &amp; Drills ({expandedProgram.modulesCount} Modules)
              </div>
              <ul className="space-y-2.5">
                {expandedProgram.syllabusHighlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[#1F2328]">
                    <CheckCircle2
                      size={16}
                      className="text-[#0B5CAB] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Target Roles & Credential */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/80 border border-black/[0.06] p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#575E68]">
                  <Users size={14} className="text-[#0B5CAB]" aria-hidden="true" />
                  Designed For
                </div>
                <p className="mt-1.5 text-xs sm:text-sm font-semibold text-[#1F2328]">
                  {expandedProgram.rolesTargeted.join(' · ')}
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 border border-black/[0.06] p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#575E68]">
                  <Award size={14} className="text-[#0B5CAB]" aria-hidden="true" />
                  Credential Issued
                </div>
                <p className="mt-1.5 text-xs sm:text-sm font-semibold text-[#1F2328]">
                  {expandedProgram.certificationType}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  closeProgramDetail();
                  onSignInClick();
                }}
                className="fla-btn-secondary w-full sm:w-auto text-sm"
              >
                Employee Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  const chosen = expandedProgram.title;
                  closeProgramDetail();
                  onSelectTrackForEnquiry(chosen);
                }}
                className="fla-btn-primary w-full sm:w-auto text-sm"
              >
                <span>Enquire About This Track</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
