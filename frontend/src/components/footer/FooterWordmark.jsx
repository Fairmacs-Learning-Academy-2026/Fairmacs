import React, { useEffect, useRef } from 'react';

const WORDMARK_LETTERS = ['F', 'A', 'I', 'R', 'M', 'A', 'C', 'S'];

export default function FooterWordmark() {
  const containerRef = useRef(null);
  const displayRef = useRef(null);
  const letterRefs = useRef([]);
  const taglineRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      if (displayRef.current) displayRef.current.classList.add('is-revealed');
      letterRefs.current.forEach((el) => {
        if (el) {
          el.style.transform = 'translate3d(0, 0, 0)';
          el.style.opacity = '1';
        }
      });
      if (taglineRef.current) {
        taglineRef.current.classList.add('is-revealed');
        taglineRef.current.style.transform = 'translate3d(0, 0, 0)';
        taglineRef.current.style.opacity = '1';
      }
      return undefined;
    }

    let currentP = 0;
    let targetP = 0;
    let rafId = null;
    let isListening = false;

    const applyProgress = (p) => {
      const letters = letterRefs.current;
      const count = WORDMARK_LETTERS.length;

      // Letters reveal across p in [0.0, 0.72] with staggered progression
      for (let i = 0; i < count; i++) {
        const el = letters[i];
        if (!el) continue;

        const start = i * 0.048;
        const span = 0.36;
        const letterP = Math.max(0, Math.min(1, (p - start) / span));
        // Smooth cubic ease out
        const ease = 1 - Math.pow(1 - letterP, 3);
        const y = (1 - ease) * 112; // 112% to 0%
        const op = Math.min(1, ease * 1.25);

        el.style.transform = `translate3d(0, ${y.toFixed(2)}%, 0)`;
        el.style.opacity = op.toFixed(3);
      }

      // Tagline reveals across p in [0.52, 1.0] after wordmark is sufficiently revealed
      if (taglineRef.current) {
        const taglineP = Math.max(0, Math.min(1, (p - 0.52) / 0.48));
        const ease = 1 - Math.pow(1 - taglineP, 3);
        const y = (1 - ease) * 10; // 10px to 0px

        taglineRef.current.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
        taglineRef.current.style.opacity = ease.toFixed(3);
      }

      // Toggle is-revealed class for state awareness & testing
      if (displayRef.current) {
        if (p >= 0.96) {
          displayRef.current.classList.add('is-revealed');
        } else {
          displayRef.current.classList.remove('is-revealed');
        }
      }
      if (taglineRef.current) {
        if (p >= 0.96) {
          taglineRef.current.classList.add('is-revealed');
        } else {
          taglineRef.current.classList.remove('is-revealed');
        }
      }
    };

    const updateTargetProgress = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;

      // Begin revealing when approaching lower portion of viewport (96% of vh)
      // Complete reveal as it moves into the central portion of viewport (56% of vh)
      const startY = vh * 0.96;
      const endY = vh * 0.56;

      let p = (startY - rect.top) / (startY - endY);

      // Gracefully handle reaching the document bottom
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight - (scrollY + vh) < 36 && p > 0.55) {
        p = 1;
      }

      targetP = Math.max(0, Math.min(1, p));

      // Wake up rAF loop if target differs from current
      if (Math.abs(targetP - currentP) > 0.001 && !rafId) {
        loop();
      }
    };

    const loop = () => {
      // Smooth lerp: 0.24 per frame (~80-100ms response time, zero jitter)
      currentP += (targetP - currentP) * 0.24;

      if (Math.abs(targetP - currentP) < 0.002) {
        currentP = targetP;
        applyProgress(currentP);
        rafId = null;
        return;
      }

      applyProgress(currentP);
      rafId = requestAnimationFrame(loop);
    };

    const onScrollOrResize = () => {
      updateTargetProgress();
    };

    // Find scroll parent if nested inside an overflow container
    let scrollParent = window;
    let parent = container.parentElement;
    while (parent && parent !== document.body) {
      const { overflowY } = window.getComputedStyle(parent);
      if (overflowY === 'auto' || overflowY === 'scroll') {
        scrollParent = parent;
        break;
      }
      parent = parent.parentElement;
    }

    const attachScrollListeners = () => {
      if (isListening) return;
      isListening = true;
      window.addEventListener('scroll', onScrollOrResize, { passive: true });
      window.addEventListener('resize', onScrollOrResize, { passive: true });
      if (scrollParent !== window) {
        scrollParent.addEventListener('scroll', onScrollOrResize, { passive: true });
      }
    };

    const detachScrollListeners = () => {
      if (!isListening) return;
      isListening = false;
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (scrollParent !== window) {
        scrollParent.removeEventListener('scroll', onScrollOrResize);
      }
    };

    // IntersectionObserver dynamically guards listeners so scroll events are only monitored near footer
    let observer = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              attachScrollListeners();
              updateTargetProgress();
            } else {
              detachScrollListeners();
              const rect = entry.boundingClientRect;
              const vh = window.innerHeight || document.documentElement.clientHeight;
              if (rect.top >= vh * 0.96) {
                targetP = 0;
                currentP = 0;
                applyProgress(0);
              } else if (rect.bottom <= 0) {
                targetP = 1;
                currentP = 1;
                applyProgress(1);
              }
              if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
            }
          }
        },
        { rootMargin: '300px 0px 300px 0px' }
      );
      observer.observe(container);
    } else {
      attachScrollListeners();
    }

    // Initial check on mount
    updateTargetProgress();
    currentP = targetP;
    applyProgress(currentP);

    return () => {
      detachScrollListeners();
      if (observer) {
        observer.disconnect();
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div className="fairmacs-wordmark-section" ref={containerRef}>
      <div className="fairmacs-wordmark-glow" aria-hidden="true" />

      <div
        ref={displayRef}
        className="fairmacs-wordmark-display fairmacs-brand-wordmark"
        aria-label="Fairmacs"
      >
        {WORDMARK_LETTERS.map((char, idx) => (
          <span className="fairmacs-wordmark-clip" key={`${char}-${idx}`}>
            <span
              ref={(el) => { letterRefs.current[idx] = el; }}
              className="fairmacs-wordmark-char"
            >
              {char}
            </span>
          </span>
        ))}
      </div>

      <div
        ref={taglineRef}
        className="fairmacs-wordmark-tagline fairmacs-brand-tagline"
      >
        ACROSS ALL BOUNDARIES
      </div>
    </div>
  );
}
