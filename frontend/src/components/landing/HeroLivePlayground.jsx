import React, { useMemo, useReducer } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, CheckCircle2, Clock, Flame, RotateCcw, Sparkles } from 'lucide-react';
import { SITE_CONTENT } from '../../content/site';
import { ease, usePrefersReducedMotion } from './motionHooks';

const LEVELS = ['Foundation', 'Practitioner', 'Lead'];
const TRACKS = ['freight', 'docs', 'pricing', 'compliance'];

const initialState = {
  track: 'freight',
  level: 'Foundation',
  selectedOption: null,
  status: 'idle',
  streak: 1,
  completedIds: [],
};

function playgroundReducer(state, action) {
  switch (action.type) {
    case 'SELECT_TRACK':
      return {
        ...state,
        track: action.track,
        selectedOption: null,
        status: 'idle',
      };
    case 'SELECT_LEVEL':
      return {
        ...state,
        level: action.level,
        selectedOption: null,
        status: 'idle',
      };
    case 'ANSWER': {
      if (action.isCorrect) {
        const alreadyDone = state.completedIds.includes(action.challengeId);
        return {
          ...state,
          selectedOption: action.optionIndex,
          status: 'correct',
          streak: alreadyDone ? state.streak : state.streak + 1,
          completedIds: alreadyDone
            ? state.completedIds
            : [...state.completedIds, action.challengeId],
        };
      }
      return {
        ...state,
        selectedOption: action.optionIndex,
        status: 'retry',
      };
    }
    case 'RESET_QUESTION':
      return {
        ...state,
        selectedOption: null,
        status: 'idle',
      };
    case 'NEXT_CHALLENGE': {
      const currentLevelIdx = LEVELS.indexOf(state.level);
      if (currentLevelIdx < LEVELS.length - 1) {
        return {
          ...state,
          level: LEVELS[currentLevelIdx + 1],
          selectedOption: null,
          status: 'idle',
        };
      }
      const nextTrackIdx = (TRACKS.indexOf(state.track) + 1) % TRACKS.length;
      return {
        ...state,
        track: TRACKS[nextTrackIdx],
        level: 'Foundation',
        selectedOption: null,
        status: 'idle',
      };
    }
    default:
      return state;
  }
}

export default function HeroLivePlayground() {
  const reduced = usePrefersReducedMotion();
  const [state, dispatch] = useReducer(playgroundReducer, initialState);

  const challenge = useMemo(() => {
    return (
      SITE_CONTENT.playgroundChallenges.find(
        (c) => c.track === state.track && c.level === state.level
      ) || SITE_CONTENT.playgroundChallenges[0]
    );
  }, [state.track, state.level]);

  const progressPct = Math.min(100, Math.round(((state.completedIds.length + 1) / 4) * 100));
  const ringCircumference = 2 * Math.PI * 18;
  const ringOffset = ringCircumference * (1 - progressPct / 100);

  const firePastelConfetti = () => {
    if (reduced || typeof window === 'undefined') return;
    try {
      confetti({
        particleCount: 38,
        spread: 62,
        origin: { y: 0.62 },
        colors: ['#7CC4FA', '#FFB899', '#8CE0B8', '#C9B6FF', '#0B5CAB'],
        disableForReducedMotion: true,
      });
    } catch {
      // Ignore headless canvas restrictions
    }
  };

  const handleOptionSelect = (idx) => {
    const isCorrect = idx === challenge.correctIndex;
    dispatch({
      type: 'ANSWER',
      optionIndex: idx,
      isCorrect,
      challengeId: challenge.id,
    });
    if (isCorrect) {
      firePastelConfetti();
    }
  };

  return (
    <div
      role="region"
      aria-label="Interactive Lesson Playground"
      className="glass glass--strong p-5 sm:p-6 shadow-xl"
    >
      {/* Top Bar: Widget Title + Progress Ring + Streak Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/[0.06]">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#BFE3FF]/70 text-[#0B5CAB]">
            <Sparkles size={16} aria-hidden="true" />
          </span>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#0B5CAB]">
              Interactive Playground
            </div>
            <div className="text-xs text-[#4A5058]">Try a 60-second logistics drill</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className="inline-flex items-center gap-1 rounded-full bg-[#FFD9C7]/65 border border-white/90 px-3 py-1 text-xs font-bold text-[#1F2328] fla-tabular"
            aria-live="polite"
          >
            <Flame size={13} className="text-[#C2410C]" aria-hidden="true" />
            <span>{state.streak} streak</span>
          </div>

          <div className="flex items-center gap-1.5" title={`Readiness ring: ${progressPct}%`}>
            <svg width="42" height="42" viewBox="0 0 44 44" aria-hidden="true">
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="rgba(31,35,40,0.09)"
                strokeWidth="4"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="#0B5CAB"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 22 22)"
                style={{
                  transition: reduced ? 'none' : `stroke-dashoffset 500ms ${ease.out}`,
                }}
              />
              <text
                x="22"
                y="26"
                textAnchor="middle"
                className="fill-[#1F2328] text-[10px] font-bold fla-tabular"
              >
                {progressPct}%
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Track Selector Chips */}
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#575E68] mb-2">
          1. Pick a Track
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Select learning track">
          {SITE_CONTENT.playgroundTracks.map((t) => {
            const active = state.track === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: 'SELECT_TRACK', track: t.id })}
                className={`fla-chip rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-[#0B5CAB] text-white shadow-sm'
                    : 'bg-white/75 text-[#1F2328] border border-black/10 hover:bg-white'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Level Selector */}
      <div className="mt-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#575E68] mb-2">
          2. Choose Depth
        </div>
        <div
          className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#F4F1EC]/90 p-1 border border-white/80"
          role="group"
          aria-label="Select challenge level"
        >
          {SITE_CONTENT.playgroundLevels.map((lvl) => {
            const active = state.level === lvl;
            return (
              <button
                key={lvl}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: 'SELECT_LEVEL', level: lvl })}
                className={`rounded-xl py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-white text-[#0B5CAB] shadow-sm'
                    : 'text-[#4A5058] hover:text-[#1F2328]'
                }`}
              >
                {lvl}
              </button>
            );
          })}
        </div>
      </div>

      {/* Challenge Card */}
      <div
        key={challenge.id}
        style={
          reduced
            ? undefined
            : {
                animation: `flaCardFadeIn 240ms ${ease.out} both`,
              }
        }
        className="mt-4 rounded-2xl bg-white/80 border border-white/95 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2 text-xs text-[#4A5058]">
          <span className="font-semibold text-[#0B5CAB]">{challenge.moduleTag}</span>
          <span className="inline-flex items-center gap-1 fla-tabular">
            <Clock size={12} aria-hidden="true" />
            {challenge.durationMinutes} min micro-lesson
          </span>
        </div>

        <p className="mt-2 text-xs text-[#4A5058] leading-relaxed">{challenge.scenarioContext}</p>

        <h3 className="mt-2 text-sm font-bold text-[#1F2328] leading-snug">
          {challenge.question}
        </h3>

        <div className="mt-3 space-y-2" role="radiogroup" aria-label={challenge.question}>
          {challenge.options.map((opt, idx) => {
            const isSelected = state.selectedOption === idx;
            const isCorrectOption = idx === challenge.correctIndex;
            let optionStyle =
              'bg-[#FBF8F3] border-black/10 text-[#1F2328] hover:border-[#0B5CAB]/40 hover:bg-white';

            if (isSelected && state.status === 'correct') {
              optionStyle = 'bg-[#CFF3E3]/80 border-[#0F766E]/40 text-[#1F2328] font-semibold';
            } else if (isSelected && state.status === 'retry') {
              optionStyle = 'bg-[#FFD9C7]/75 border-[#C2410C]/40 text-[#1F2328]';
            } else if (state.status === 'correct' && isCorrectOption) {
              optionStyle = 'bg-[#CFF3E3]/65 border-[#0F766E]/35 text-[#1F2328]';
            }

            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleOptionSelect(idx)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-xs leading-snug transition flex items-start justify-between gap-2 ${optionStyle}`}
              >
                <span>{opt}</span>
                {isSelected && state.status === 'correct' && (
                  <CheckCircle2
                    size={15}
                    className="shrink-0 text-[#0F766E] mt-0.5"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {state.status === 'correct' && (
          <div
            className="mt-3 rounded-xl bg-[#CFF3E3]/70 border border-[#0F766E]/25 p-3 text-xs text-[#1F2328]"
            role="status"
          >
            <div className="font-bold text-[#0F5132]">Spot on! +1 Learning Streak</div>
            <p className="mt-1 text-[#1F2328]/90 leading-relaxed">{challenge.explanation}</p>
            <button
              type="button"
              onClick={() => dispatch({ type: 'NEXT_CHALLENGE' })}
              className="mt-2 inline-flex items-center gap-1 font-bold text-[#0B5CAB] hover:underline"
            >
              <span>Try Next Challenge</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
        )}

        {state.status === 'retry' && (
          <div
            className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#FFD9C7]/65 border border-[#C2410C]/25 p-2.5 text-xs text-[#1F2328]"
            role="status"
          >
            <span>Not quite—check when risk vs. cost shifts on the shipment leg.</span>
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESET_QUESTION' })}
              className="inline-flex shrink-0 items-center gap-1 font-bold text-[#0B5CAB]"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
