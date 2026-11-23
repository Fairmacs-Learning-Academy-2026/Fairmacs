import React from 'react';

/**
 * SkyAtmosphere
 *
 * Renders the 4 seamless atmospheric sky states:
 * - Morning: Sunrise on horizon, pale peach & gold, morning mist.
 * - Afternoon: Bright azure sky, high midday sun, white cumulus clouds.
 * - Evening: Sunset horizon, warm amber, violet/pink evening clouds.
 * - Night: Deep navy/indigo, stars, moon with luminous lunar halo.
 *
 * Uses stacked layers with opacity crossfading so transitions are continuous
 * without abrupt jumps or DOM remounting.
 */
export default function SkyAtmosphere({ timeState = 'afternoon' }) {
  return (
    <div className="fairmacs-sky-atmosphere" aria-hidden="true">
      {/* 1. MORNING SKY (05:00 - 10:59) */}
      <div
        className={`sky-backdrop sky-morning ${timeState === 'morning' ? 'is-active' : ''}`}
      >
        <div className="sky-gradient-morning" />
        <div className="morning-sun-disc" />
        <div className="morning-sun-glow" />
        <div className="morning-mist-layer" />
        <div className="morning-clouds" />
      </div>

      {/* 2. AFTERNOON SKY (11:00 - 15:59) */}
      <div
        className={`sky-backdrop sky-afternoon ${timeState === 'afternoon' ? 'is-active' : ''}`}
      >
        <div className="sky-gradient-afternoon" />
        <div className="afternoon-sun-disc" />
        <div className="afternoon-sun-flare" />
        <div className="afternoon-clouds-bank" />
        <div className="afternoon-cumulus-drift" />
      </div>

      {/* 3. EVENING SKY (16:00 - 18:59) */}
      <div
        className={`sky-backdrop sky-evening ${timeState === 'evening' ? 'is-active' : ''}`}
      >
        <div className="sky-gradient-evening" />
        <div className="evening-sunset-disc" />
        <div className="evening-sunset-flare" />
        <div className="evening-horizon-fire" />
        <div className="evening-purple-clouds" />
      </div>

      {/* 4. NIGHT SKY (19:00 - 04:59) */}
      <div
        className={`sky-backdrop sky-night ${timeState === 'night' ? 'is-active' : ''}`}
      >
        <div className="sky-gradient-night" />
        <div className="night-stars-field" />
        <div className="night-moon-disc" />
        <div className="night-moon-halo" />
        <div className="night-ambient-clouds" />
      </div>

      {/* Shared Ambient Atmospheric Vignette */}
      <div className="sky-ambient-vignette" />
    </div>
  );
}
