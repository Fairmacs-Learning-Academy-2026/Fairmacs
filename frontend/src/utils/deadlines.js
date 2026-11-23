/**
 * Deadlines and Urgency Utilities for Fairmacs KMS
 * Asia/Kolkata timezone compliant date calculations and urgency ranking
 */

/**
 * Calculates date at midnight in Asia/Kolkata timezone
 */
export function parseDateToIstMidnight(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const istParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d).split('-'); // ['YYYY', 'MM', 'DD']
    return new Date(Date.UTC(+istParts[0], +istParts[1] - 1, +istParts[2]));
  } catch {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
}

/**
 * Derives current date at midnight in Asia/Kolkata timezone
 */
export function getTodayIstMidnight() {
  const d = new Date();
  try {
    const istParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d).split('-');
    return new Date(Date.UTC(+istParts[0], +istParts[1] - 1, +istParts[2]));
  } catch {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
}

/**
 * Formats date string to friendly localized format in Asia/Kolkata e.g. "25 Nov 2026"
 */
export function formatIstDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

/**
 * Evaluates urgency tier and badge properties for a given due date relative to IST today.
 * Hierarchy:
 * 1. Overdue (diffDays < 0)
 * 2. Due today (diffDays === 0)
 * 3. Due within 3 days (1 <= diffDays <= 3)
 * 4. Due within 7 days (4 <= diffDays <= 7)
 * 5. Other upcoming deadlines (diffDays > 7)
 */
export function evaluateDeadlineUrgency(dueDateStr, todayMidnight = getTodayIstMidnight()) {
  if (!dueDateStr) return null;
  const dueMidnight = parseDateToIstMidnight(dueDateStr);
  if (!dueMidnight) return null;

  const diffMs = dueMidnight.getTime() - todayMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      tier: 1,
      type: 'OVERDUE',
      diffDays,
      overdueDays,
      badgeText: `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
      badgeClass: 'urgency-overdue',
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA'
    };
  }

  if (diffDays === 0) {
    return {
      tier: 2,
      type: 'DUE_TODAY',
      diffDays: 0,
      badgeText: 'Due today',
      badgeClass: 'urgency-due-today',
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A'
    };
  }

  if (diffDays <= 3) {
    return {
      tier: 3,
      type: 'DUE_SOON',
      diffDays,
      badgeText: `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`,
      badgeClass: 'urgency-due-soon',
      color: '#D97706',
      bg: '#FFFBEB',
      border: '#FDE68A'
    };
  }

  if (diffDays <= 7) {
    return {
      tier: 4,
      type: 'DUE_WEEK',
      diffDays,
      badgeText: `${diffDays} days remaining`,
      badgeClass: 'urgency-due-week',
      color: '#2563EB',
      bg: '#EFF6FF',
      border: '#BFDBFE'
    };
  }

  return {
    tier: 5,
    type: 'UPCOMING',
    diffDays,
    badgeText: `${diffDays} days remaining`,
    badgeClass: 'urgency-upcoming',
    color: '#475569',
    bg: '#F1F5F9',
    border: '#E2E8F0'
  };
}
