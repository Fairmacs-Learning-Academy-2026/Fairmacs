import React from 'react';
import SkyAtmosphere from './SkyAtmosphere';
import FairmacsCargoShip from './FairmacsCargoShip';
import OceanWaves from './OceanWaves';
import './maritime.css';

/**
 * Helper to compute the current maritime time state from hours:
 * - Morning:   05:00 - 10:59
 * - Afternoon: 11:00 - 15:59
 * - Evening:   16:00 - 18:59
 * - Night:     19:00 - 04:59
 */
export function getTimeStateFromHours(hours) {
  if (hours >= 5 && hours < 11) return 'morning';
  if (hours >= 11 && hours < 16) return 'afternoon';
  if (hours >= 16 && hours < 19) return 'evening';
  return 'night';
}

/**
 * Helper to compute greeting text corresponding to time state:
 */
export function getGreetingFromTimeState(state) {
  switch (state) {
    case 'morning':
      return 'Good morning';
    case 'afternoon':
      return 'Good afternoon';
    case 'evening':
      return 'Good evening';
    case 'night':
    default:
      return 'Good night';
  }
}

/**
 * MaritimeScene
 *
 * Coordinates the full cinematic maritime experience:
 * 1. Sky & Atmospheric Lighting (Morning / Afternoon / Evening / Night)
 * 2. Background Ocean & Horizon Swells (Layer 1 & Layer 2)
 * 3. Continuous Full-Screen Ship Voyage (Layer 3):
 *    Travels completely from starting edge to the end of the sea,
 *    with continuous rotation (pitch & roll) and zero breaks in flow.
 * 4. Foreground Moving Waves (Layer 4) overlapping hull waterline
 */
export default function MaritimeScene({ timeState = 'afternoon' }) {
  return (
    <div
      className={`fairmacs-maritime-scene-container time-${timeState}`}
      aria-hidden="true"
    >
      {/* 1. Atmospheric Sky & Celestial Bodies */}
      <SkyAtmosphere timeState={timeState} />

      {/* 2. Horizon & Background Ocean (Layers 1 & 2) */}
      <div className="maritime-ocean-stage">
        <OceanWaves timeState={timeState} layer="background" />
      </div>

      {/* 3. Continuous Full-Screen Ocean Cruising Lane
          Dual-carrier seamless loop ensures the ship voyage is continuous
          from start to end across the sea without breaking in between */}
      <div className="maritime-ship-voyage-lane">
        <div className="voyage-carrier carrier-alpha">
          <FairmacsCargoShip timeState={timeState} />
        </div>
        <div className="voyage-carrier carrier-beta">
          <FairmacsCargoShip timeState={timeState} />
        </div>
      </div>

      {/* 4. Foreground Waves (Layer 3) - flows in front of ship lower waterline */}
      <div className="maritime-foreground-waves-stage">
        <OceanWaves timeState={timeState} layer="foreground" />
      </div>
    </div>
  );
}
