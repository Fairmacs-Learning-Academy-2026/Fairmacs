/**
 * TimeEnvironment.js
 * Standalone time-state utilities for Login greeting.
 * Zero external or Three.js dependencies.
 */

export function getTimeStateFromHours(hours) {
  if (hours >= 5 && hours < 11) return 'morning';
  if (hours >= 11 && hours < 16) return 'afternoon';
  if (hours >= 16 && hours < 19) return 'evening';
  return 'night';
}

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
