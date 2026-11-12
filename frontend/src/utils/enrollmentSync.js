/**
 * Fairmacs Knowledge Management System - Enrollment Synchronization Utility
 *
 * Provides a lightweight, reliable cross-context synchronization bus:
 * 1. Same-window / same-tab: CustomEvent ('lms:enrollment-updated')
 * 2. Cross-tab (same browser): BroadcastChannel ('fairmacs_lms_enrollment_sync') + localStorage 'storage' event fallback
 * 3. Cross-session / idle revalidation: visibilitychange & window focus revalidation
 */

export const EVENT_ENROLLMENT_UPDATED = 'lms:enrollment-updated';
export const SYNC_CHANNEL_NAME = 'fairmacs_lms_enrollment_sync';
export const SYNC_STORAGE_KEY = 'fairmacs_last_enrollment_sync';

let broadcastChannel = null;

try {
  if (typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function') {
    broadcastChannel = new window.BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel unavailable in this environment
  broadcastChannel = null;
}

/**
 * Notifies all active contexts that an enrollment, course completion,
 * or assignment state has changed.
 */
export function notifyEnrollmentUpdated(payload = {}) {
  const timestamp = Date.now();

  // 1. Same-tab / same-window dispatch
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent(EVENT_ENROLLMENT_UPDATED, {
          detail: { ...payload, timestamp }
        })
      );
    } catch {
      // Ignore dispatch failures in non-DOM test environments
    }
  }

  // 2. Cross-tab dispatch via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: EVENT_ENROLLMENT_UPDATED,
        payload,
        timestamp
      });
    } catch {
      // Ignore broadcast channel errors
    }
  }

  // 3. Cross-tab fallback via StorageEvent
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        SYNC_STORAGE_KEY,
        JSON.stringify({ timestamp, rand: Math.random() })
      );
    } catch {
      // Ignore storage quota / access issues
    }
  }
}

/**
 * Subscribes to enrollment update notifications across same-tab,
 * cross-tab, and window focus/visibility changes.
 *
 * @param {Function} onSync - Callback executed when an update is detected.
 * @param {Object} options - Optional configuration (debounceMs, revalidateOnFocus).
 * @returns {Function} cleanup - Function to unsubscribe all listeners.
 */
export function subscribeEnrollmentSync(onSync, options = {}) {
  if (typeof onSync !== 'function') return () => {};

  const debounceMs = Math.max(100, Number(options.debounceMs || 300));
  const revalidateOnFocus = options.revalidateOnFocus !== false;
  const focusThrottleMs = Math.max(5000, Number(options.focusThrottleMs || 15000));

  let debounceTimer = null;
  let lastTriggeredAt = 0;
  let lastFocusSyncAt = Date.now();

  const debouncedSync = () => {
    const now = Date.now();
    if (now - lastTriggeredAt < debounceMs) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      lastTriggeredAt = Date.now();
      onSync();
    }, 50);
  };

  // 1. Same-window listener
  const handleWindowCustomEvent = () => {
    debouncedSync();
  };

  // 2. Cross-tab BroadcastChannel listener
  let localChannel = null;
  const handleBroadcastMessage = (event) => {
    if (event?.data?.type === EVENT_ENROLLMENT_UPDATED) {
      debouncedSync();
    }
  };

  // 3. Cross-tab StorageEvent listener
  const handleStorageEvent = (event) => {
    if (event?.key === SYNC_STORAGE_KEY) {
      debouncedSync();
    }
  };

  // 4. Focus & visibility listener (handles user switching back from other apps or tabs)
  const handleVisibilityOrFocus = () => {
    if (!revalidateOnFocus) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    const now = Date.now();
    if (now - lastFocusSyncAt >= focusThrottleMs) {
      lastFocusSyncAt = now;
      debouncedSync();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(EVENT_ENROLLMENT_UPDATED, handleWindowCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    if (revalidateOnFocus) {
      window.addEventListener('focus', handleVisibilityOrFocus);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
      }
    }

    try {
      if (typeof window.BroadcastChannel === 'function') {
        localChannel = new window.BroadcastChannel(SYNC_CHANNEL_NAME);
        localChannel.onmessage = handleBroadcastMessage;
      }
    } catch {
      localChannel = null;
    }
  }

  // Return uninstaller
  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);

    if (typeof window !== 'undefined') {
      window.removeEventListener(EVENT_ENROLLMENT_UPDATED, handleWindowCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleVisibilityOrFocus);

      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      }
    }

    if (localChannel) {
      try {
        localChannel.close();
      } catch {
        // Ignore close error
      }
      localChannel = null;
    }
  };
}
