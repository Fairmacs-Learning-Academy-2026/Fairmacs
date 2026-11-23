import React from 'react';
import FairmacsEmblem from './FairmacsEmblem';

export default function FairmacsLogo({ variant = 'default', height = 40, showText = true }) {
  const isDarkBg = variant === 'header' || variant === 'dark';
  const textColor = isDarkBg ? '#ffffff' : '#1b365d';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
      <FairmacsEmblem
        size={height}
        fill={isDarkBg ? '#38BDF8' : '#1B365D'}
        style={{ filter: isDarkBg ? 'drop-shadow(0 2px 6px rgba(56, 189, 248, 0.4))' : 'none' }}
      />
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span
              className="fairmacs-brand-wordmark"
              style={{
                fontFamily: 'var(--font-brand)',
                fontSize: '1.2rem',
                fontWeight: 700,
                color: textColor,
                letterSpacing: '0.04em',
                lineHeight: 1
              }}
            >
              FAIRMACS
            </span>
          </div>
          <span
            className="fairmacs-brand-tagline"
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: '0.62rem',
              color: isDarkBg ? '#94a3b8' : '#64748b',
              fontWeight: 400,
              letterSpacing: '0.14em',
              marginTop: '0.18rem',
              lineHeight: 1.1
            }}
          >
            ACROSS ALL BOUNDARIES
          </span>
        </div>
      )}
    </div>
  );
}
