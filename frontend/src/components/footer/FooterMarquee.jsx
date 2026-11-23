import React from 'react';

const MARQUEE_PHRASES = [
  { text: 'ACROSS ALL BOUNDARIES', style: 'solid', type: 'tagline' },
  { text: 'CONNECTING THE WORLD', style: 'accent' },
  { text: 'MOVING POSSIBILITIES', style: 'outline' },
  { text: 'GLOBAL LOGISTICS', style: 'solid' },
  { text: 'CONNECTING BUSINESSES', style: 'accent' },
  { text: 'FAIRMACS', style: 'accent', type: 'brand' },
];

export default function FooterMarquee() {
  const renderGroup = (groupKey) => (
    <div className="fairmacs-marquee-group" key={groupKey}>
      {MARQUEE_PHRASES.map((phrase, idx) => (
        <span
          className={`fairmacs-marquee-item ${
            phrase.type === 'tagline'
              ? 'is-marquee-tagline fairmacs-brand-tagline'
              : phrase.type === 'brand'
              ? 'is-marquee-brand fairmacs-brand-wordmark'
              : ''
          }`}
          key={`${groupKey}-${idx}`}
        >
          <span className={`marquee-style-${phrase.style}`}>{phrase.text}</span>
          <span className="marquee-separator" />
        </span>
      ))}
    </div>
  );

  return (
    <div className="fairmacs-marquee-viewport" aria-hidden="true">
      <div className="fairmacs-marquee-track">
        {renderGroup('g1')}
        {renderGroup('g2')}
      </div>
    </div>
  );
}
