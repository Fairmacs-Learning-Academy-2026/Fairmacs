import React from 'react';

export default function FairmacsLogo({ variant = 'default', height = 40, showText = true }) {
  const isDarkBg = variant === 'header' || variant === 'dark';
  const textColor = isDarkBg ? '#ffffff' : '#1b365d';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
      <img
        src="/fairmacs-logo.png"
        alt="Fairmacs"
        style={{ height: height, width: 'auto', objectFit: 'contain', filter: isDarkBg ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'none' }}
      />
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, color: textColor, letterSpacing: '1.5px', lineHeight: 1 }}>
              FAIRMACS
            </span>
            <span className="brand-badge">KMS</span>
          </div>
          <span style={{ fontSize: '0.62rem', color: isDarkBg ? '#94a3b8' : '#64748b', fontWeight: 600, letterSpacing: '0.5px', marginTop: '0.15rem' }}>
            LOGISTICS & FREIGHT FORWARDING
          </span>
        </div>
      )}
    </div>
  );
}
