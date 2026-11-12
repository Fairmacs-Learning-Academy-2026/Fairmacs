import React from 'react';

/**
 * Deterministic color palette for employee avatars (10 corporate colors).
 * Each employee consistently gets the exact same color based on their Employee ID or Name.
 */
const AVATAR_PALETTE = [
  { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-400', shadow: 'shadow-indigo-500/20' },
  { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-400', shadow: 'shadow-emerald-500/20' },
  { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-400', shadow: 'shadow-blue-500/20' },
  { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-400', shadow: 'shadow-amber-500/20' },
  { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-400', shadow: 'shadow-rose-500/20' },
  { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-400', shadow: 'shadow-violet-500/20' },
  { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-400', shadow: 'shadow-teal-500/20' },
  { bg: 'bg-cyan-600', text: 'text-white', border: 'border-cyan-400', shadow: 'shadow-cyan-500/20' },
  { bg: 'bg-fuchsia-600', text: 'text-white', border: 'border-fuchsia-400', shadow: 'shadow-fuchsia-500/20' },
  { bg: 'bg-slate-700', text: 'text-white', border: 'border-slate-500', shadow: 'shadow-slate-500/20' },
];

/**
 * Deterministic hash from string to palette index.
 */
function getPaletteIndex(str) {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % AVATAR_PALETTE.length;
}

/**
 * Get initials from name (up to 2 characters, e.g. "Dev Employee" -> "DE", "Admin" -> "A")
 */
function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const clean = name.trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 1).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_MAP = {
  xs: { box: 'w-6 h-6', font: 'text-xs', ring: 'ring-1' },
  sm: { box: 'w-8 h-8', font: 'text-xs font-semibold', ring: 'ring-2' },
  md: { box: 'w-10 h-10', font: 'text-sm font-bold', ring: 'ring-2' },
  lg: { box: 'w-14 h-14', font: 'text-lg font-bold', ring: 'ring-2' },
  xl: { box: 'w-20 h-20', font: 'text-2xl font-bold', ring: 'ring-4' },
  '2xl': { box: 'w-24 h-24', font: 'text-3xl font-extrabold', ring: 'ring-4' },
};

/**
 * UserAvatar - Modern, deterministic initial-based circular avatar.
 * Replaces external photo avatars across the LMS.
 */
export default function UserAvatar({
  name = '',
  employeeId = '',
  email = '',
  size = 'md',
  className = '',
  showRing = true,
  status = null, // e.g. 'ACTIVE', 'ON_LEAVE', 'INACTIVE'
}) {
  const seed = employeeId || email || name || 'default';
  const color = AVATAR_PALETTE[getPaletteIndex(seed)];
  const initials = getInitials(name || employeeId || email);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  const statusIndicatorColors = {
    ACTIVE: 'bg-emerald-500',
    ON_LEAVE: 'bg-amber-500',
    INACTIVE: 'bg-rose-500',
    TERMINATED: 'bg-slate-500',
  };

  return (
    <div className={`relative inline-flex flex-shrink-0 items-center justify-center select-none ${className}`}>
      <div
        className={`rounded-full flex items-center justify-center tracking-wider transition-all duration-200 ${sizeConfig.box} ${sizeConfig.font} ${color.bg} ${color.text} ${showRing ? `${sizeConfig.ring} ring-white dark:ring-slate-900 shadow-sm` : ''}`}
        title={name || employeeId || 'Employee Avatar'}
        aria-label={name || employeeId || 'Employee Avatar'}
      >
        <span>{initials}</span>
      </div>

      {status && statusIndicatorColors[status] && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-900 ${statusIndicatorColors[status]} ${
            size === 'xs' || size === 'sm' ? 'w-2 h-2' : size === 'lg' || size === 'xl' || size === '2xl' ? 'w-4 h-4' : 'w-3 h-3'
          }`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
}
