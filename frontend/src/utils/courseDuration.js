/**
 * Shared Course Duration Formatter & Classifier — Fairmacs KMS
 *
 * Implements the official Fairmacs duration specification & classification:
 * 1. EXPLICIT_SELF_PACED: Explicitly authored as "Self-paced"
 * 2. VALID_CONFIGURED: Valid duration (numeric hours or parseable time string)
 * 3. MISSING: Null or blank duration
 * 4. INVALID_LEGACY: Corrupted strings like 'a', 'null', single characters
 *
 * Specification table:
 * | Actual duration | Display |
 * |---|---|
 * | 0.5 hours | 30 min |
 * | 1 hour | 1 hour |
 * | 1.5 hours | 1 hour 30 min |
 * | 2 hours | 2 hours |
 * | 2.5 hours | 2 hours 30 min |
 * | 3 hours | 3 hours |
 * | Missing / null / invalid / 'a' | Self-paced |
 */

export const DurationClassification = {
  EXPLICIT_SELF_PACED: 'EXPLICIT_SELF_PACED',
  VALID_CONFIGURED: 'VALID_CONFIGURED',
  MISSING: 'MISSING',
  INVALID_LEGACY: 'INVALID_LEGACY'
};

export function classifyCourseDuration(rawDuration, rawHours) {
  const numHours = Number(rawHours);
  const hasValidNumericHours = rawHours != null && !Number.isNaN(numHours) && numHours > 0;

  // 1. Missing duration check
  const isMissing = (rawDuration == null || (typeof rawDuration === 'string' && !rawDuration.trim())) &&
                    !hasValidNumericHours;
  if (isMissing) {
    return {
      classification: DurationClassification.MISSING,
      display: 'Self-paced',
      raw: rawDuration ?? null
    };
  }

  // 2. Parse string rawDuration first if present
  if (typeof rawDuration === 'string' && rawDuration.trim()) {
    const trimmed = rawDuration.trim();
    const lower = trimmed.toLowerCase();

    // Explicit Self-paced
    if (lower === 'self-paced' || lower === 'self paced') {
      return {
        classification: DurationClassification.EXPLICIT_SELF_PACED,
        display: 'Self-paced',
        raw: trimmed
      };
    }

    // Invalid legacy duration string (e.g. 'a')
    if (
      lower === 'a' ||
      lower === 'null' ||
      lower === 'undefined' ||
      lower === 'nan' ||
      lower === '-' ||
      lower === 'none' ||
      /^[a-z]$/i.test(trimmed)
    ) {
      return {
        classification: DurationClassification.INVALID_LEGACY,
        display: 'Self-paced',
        raw: trimmed
      };
    }

    // Pure integer e.g. "1", "2", "3", "30", "90"
    if (/^\d+$/.test(trimmed)) {
      const val = Number(trimmed);
      if (val <= 0) {
        return {
          classification: DurationClassification.EXPLICIT_SELF_PACED,
          display: 'Self-paced',
          raw: trimmed
        };
      }
      if (val <= 12) {
        // Integer 1 to 12 in course duration field represents hours (e.g. "1" -> 1 hour, "2" -> 2 hours, "3" -> 3 hours)
        return {
          classification: DurationClassification.VALID_CONFIGURED,
          display: `${val} ${val === 1 ? 'hour' : 'hours'}`,
          raw: trimmed,
          hours: val
        };
      }
      // Numbers > 12 represent minutes (e.g. "30" -> 30 min, "90" -> 1 hour 30 min)
      if (val >= 60) {
        const h = Math.floor(val / 60);
        const rem = val % 60;
        return {
          classification: DurationClassification.VALID_CONFIGURED,
          display: rem > 0 ? `${h} ${h === 1 ? 'hour' : 'hours'} ${rem} min` : `${h} ${h === 1 ? 'hour' : 'hours'}`,
          raw: trimmed,
          hours: val / 60
        };
      }
      return {
        classification: DurationClassification.VALID_CONFIGURED,
        display: `${val} min`,
        raw: trimmed,
        hours: val / 60
      };
    }

    // HH:MM:SS or MM:SS format
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map((p) => Number(p.trim()));
      if (parts.length === 2 && !parts.some(Number.isNaN)) {
        const [m, s] = parts;
        const total = m + (s > 0 ? 1 : 0);
        if (total >= 60) {
          const h = Math.floor(total / 60);
          const rem = total % 60;
          return {
            classification: DurationClassification.VALID_CONFIGURED,
            display: rem > 0 ? `${h} ${h === 1 ? 'hour' : 'hours'} ${rem} min` : `${h} ${h === 1 ? 'hour' : 'hours'}`,
            raw: trimmed
          };
        }
        return {
          classification: DurationClassification.VALID_CONFIGURED,
          display: `${total} min`,
          raw: trimmed
        };
      }
      if (parts.length === 3 && !parts.some(Number.isNaN)) {
        const [h, m, s] = parts;
        const remM = m + (s > 0 ? 1 : 0);
        return {
          classification: DurationClassification.VALID_CONFIGURED,
          display: (h > 0 && remM > 0) ? `${h} ${h === 1 ? 'hour' : 'hours'} ${remM} min` : (h > 0 ? `${h} ${h === 1 ? 'hour' : 'hours'}` : `${remM} min`),
          raw: trimmed
        };
      }
    }

    // Decimal or integer hours pattern, e.g. "1.5 hours", "0.5 hr", "2 hours"
    const decimalHourMatch = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)\s*(?:hours?|hrs?|h\b)/i);
    if (decimalHourMatch) {
      const parsedH = parseFloat(decimalHourMatch[1]);
      if (!Number.isNaN(parsedH) && parsedH > 0) {
        return classifyCourseDuration(null, parsedH);
      }
    }

    // Explicit hours and/or minutes pattern, e.g. "1 hour 30 min", "45 min"
    const hrMatch = trimmed.match(/(\d+)\s*(?:hr|hour|h\b)/i);
    const minMatch = trimmed.match(/(\d+)\s*(?:min|minute|m\b)/i);
    if (hrMatch || minMatch) {
      const h = hrMatch ? Number(hrMatch[1]) : 0;
      const m = minMatch ? Number(minMatch[1]) : 0;
      let display;
      if (h > 0 && m > 0) display = `${h} ${h === 1 ? 'hour' : 'hours'} ${m} min`;
      else if (h > 0) display = `${h} ${h === 1 ? 'hour' : 'hours'}`;
      else if (m > 0) display = `${m} min`;
      else display = 'Self-paced';

      return {
        classification: DurationClassification.VALID_CONFIGURED,
        display,
        raw: trimmed
      };
    }

    // If it contains any digit, return clean trimmed string as valid
    if (/\d+/.test(trimmed)) {
      return {
        classification: DurationClassification.VALID_CONFIGURED,
        display: trimmed,
        raw: trimmed
      };
    }
  }

  // 3. Fall back to numeric durationHours if rawDuration was absent or unparseable
  if (hasValidNumericHours) {
    const totalMinutes = Math.round(numHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    let formatted;
    if (h > 0 && m > 0) {
      formatted = `${h} ${h === 1 ? 'hour' : 'hours'} ${m} min`;
    } else if (h > 0) {
      formatted = `${h} ${h === 1 ? 'hour' : 'hours'}`;
    } else if (m > 0) {
      formatted = `${m} min`;
    } else {
      formatted = 'Self-paced';
    }
    return {
      classification: DurationClassification.VALID_CONFIGURED,
      display: formatted,
      raw: rawDuration,
      hours: numHours
    };
  }

  return {
    classification: DurationClassification.MISSING,
    display: 'Self-paced',
    raw: rawDuration ?? null
  };
}

export function formatCourseDuration(rawDuration, rawHours) {
  const result = classifyCourseDuration(rawDuration, rawHours);
  if (result.classification === DurationClassification.INVALID_LEGACY) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[Fairmacs KMS] Detected invalid legacy course duration: "${result.raw}". Safely displaying as "Self-paced".`);
    }
  }
  return result.display;
}
