import React from 'react';
import ParticleRingBackdrop from './ParticleRingBackdrop';

/**
 * PortScene.jsx
 * Thin wrapper around ParticleRingBackdrop preserving backwards-compatible
 * import paths and default export for Login.jsx.
 */
export default function PortScene(props) {
  return <ParticleRingBackdrop {...props} />;
}
