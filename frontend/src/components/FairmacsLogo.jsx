import React from 'react';

export default function FairmacsLogo({ height = 40, className = '', style = {} }) {
  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', ...style }}
    >
      <img
        src="/fairmacs-header-logo.png"
        alt="FAIRMACS — ACROSS ALL BOUNDARIES"
        style={{
          height: height,
          width: 'auto',
          maxHeight: '100%',
          objectFit: 'contain',
          display: 'block'
        }}
      />
    </div>
  );
}
