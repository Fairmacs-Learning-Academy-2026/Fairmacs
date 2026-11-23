import React from 'react';

/**
 * OceanWaves
 *
 * Three distinct animated ocean layers:
 * - layer === 'background' (or 'all'):
 *     Layer 1: Distant horizon ocean swell with time-aware specular sun/moon track.
 *     Layer 2: Midground rolling open-sea swells.
 * - layer === 'foreground' (or 'all'):
 *     Layer 3: Crisp wave crests and foam flowing across the lower hull waterline.
 */
export default function OceanWaves({ timeState = 'afternoon', layer = 'all' }) {
  const showBg = layer === 'all' || layer === 'background';
  const showFg = layer === 'all' || layer === 'foreground';

  return (
    <div className={`fairmacs-ocean-system time-${timeState}`} aria-hidden="true">
      {/* ==============================================================
          LAYER 1: BACKGROUND OCEAN (Distant horizon swell)
          ============================================================== */}
      {showBg && (
        <>
          <div className="ocean-layer ocean-background">
            {/* Sun/Moon Specular Reflection Highway */}
            <div className="ocean-specular-track" />

            <svg
              className="ocean-svg ocean-bg-svg"
              viewBox="0 0 1440 220"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bgOceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" className="ocean-stop-bg-top" />
                  <stop offset="100%" className="ocean-stop-bg-bottom" />
                </linearGradient>
              </defs>
              <path
                className="wave-path wave-path-bg"
                d="M 0 35 
                   Q 180 50, 360 35 
                   T 720 35 
                   T 1080 35 
                   T 1440 35 
                   L 1440 220 
                   L 0 220 Z"
                fill="url(#bgOceanGrad)"
              />
            </svg>
          </div>

          {/* ==============================================================
              LAYER 2: MIDGROUND OCEAN (Rolling swells & surface texture)
              ============================================================== */}
          <div className="ocean-layer ocean-midground">
            <svg
              className="ocean-svg ocean-mid-svg"
              viewBox="0 0 1440 180"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="midOceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" className="ocean-stop-mid-top" />
                  <stop offset="60%" className="ocean-stop-mid-mid" />
                  <stop offset="100%" className="ocean-stop-mid-bottom" />
                </linearGradient>
              </defs>
              <path
                className="wave-path wave-path-mid-1"
                d="M 0 28 
                   C 120 44, 240 16, 360 32 
                   C 480 48, 600 20, 720 34 
                   C 840 48, 960 18, 1080 30 
                   C 1200 42, 1320 22, 1440 28 
                   L 1440 180 
                   L 0 180 Z"
                fill="url(#midOceanGrad)"
              />
              <path
                className="wave-path wave-path-mid-2"
                d="M 0 40 
                   C 140 22, 280 52, 420 36 
                   C 560 20, 700 50, 840 34 
                   C 980 22, 1120 48, 1260 32 
                   C 1340 24, 1400 38, 1440 40 
                   L 1440 180 
                   L 0 180 Z"
                fill="url(#midOceanGrad)"
                opacity="0.82"
              />
            </svg>
          </div>
        </>
      )}

      {/* ==============================================================
          LAYER 3: FOREGROUND WAVES (Crisp crests & water overlap)
          Flows in front of the lower waterline of the hull
          ============================================================== */}
      {showFg && (
        <div className="ocean-layer ocean-foreground">
          <svg
            className="ocean-svg ocean-fg-svg"
            viewBox="0 0 1440 140"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="fgOceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" className="ocean-stop-fg-top" />
                <stop offset="100%" className="ocean-stop-fg-bottom" />
              </linearGradient>
            </defs>

            {/* Foreground Wave Swell */}
            <path
              className="wave-path wave-path-fg-1"
              d="M 0 24 
                 C 100 12, 200 36, 320 22 
                 C 440 8, 560 34, 680 20 
                 C 800 6, 920 32, 1040 18 
                 C 1160 8, 1280 30, 1440 20 
                 L 1440 140 
                 L 0 140 Z"
              fill="url(#fgOceanGrad)"
            />

            {/* White Foam Crest Line */}
            <path
              className="wave-foam-crest"
              d="M 0 24 
                 C 100 12, 200 36, 320 22 
                 C 440 8, 560 34, 680 20 
                 C 800 6, 920 32, 1040 18 
                 C 1160 8, 1280 30, 1440 20"
              fill="none"
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />

            {/* Secondary Counter-Flow Wave */}
            <path
              className="wave-path wave-path-fg-2"
              d="M 0 38 
                 C 160 50, 300 24, 460 40 
                 C 620 54, 760 26, 920 42 
                 C 1080 56, 1220 28, 1360 44 
                 L 1440 38 
                 L 1440 140 
                 L 0 140 Z"
              fill="url(#fgOceanGrad)"
              opacity="0.75"
            />
          </svg>

          {/* Dynamic Foam Flecks and Specular Glimmers */}
          <div className="ocean-foam-flecks" />
        </div>
      )}
    </div>
  );
}
