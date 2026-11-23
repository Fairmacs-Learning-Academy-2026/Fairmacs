/**
 * Electives and Recommendations Utilities for Fairmacs KMS
 * Rule-based reason badges, filtering, and duration formatting
 */

/**
 * Derives a human-readable recommendation reason tag based on course attributes.
 * Backed by real recommendation rules & department alignment.
 */
export function getRecommendationReason(course) {
  if (!course) return 'Fairmacs Recommended';

  if (course.recommendationReason) {
    return course.recommendationReason;
  }

  // Department-specific elective rule
  const dept = course.department || course.owningDepartmentName;
  const hasSpecificDept =
    (dept && dept.trim().toLowerCase() !== 'general') ||
    (Array.isArray(course.departments) && course.departments.some(d => d && d.trim().toLowerCase() !== 'general'));

  if (hasSpecificDept) {
    return 'Department Elective';
  }

  // Role/designation rule match
  if (course.designation || course.level) {
    return 'Recommended for your role';
  }

  return 'Fairmacs Recommended';
}

/**
 * Normalizes duration string or number into a readable label (e.g. "45 mins", "2.5 hrs")
 */
export function formatDuration(duration, durationHours) {
  if (duration && typeof duration === 'string' && duration.trim()) {
    return duration.trim();
  }
  if (typeof durationHours === 'number' && durationHours > 0) {
    if (durationHours < 1) {
      return `${Math.round(durationHours * 60)} mins`;
    }
    return `${durationHours} hr${durationHours === 1 ? '' : 's'}`;
  }
  return null;
}

/**
 * Filters and deduplicates recommended electives
 */
export function filterElectives(recommendedCourses = [], assignedCourses = [], completedCourseIds = []) {
  if (!Array.isArray(recommendedCourses)) return [];

  const excludedIds = new Set();

  if (Array.isArray(assignedCourses)) {
    for (const c of assignedCourses) {
      if (c.id) excludedIds.add(String(c.id));
      if (c.dbId) excludedIds.add(String(c.dbId));
      if (c.courseId) excludedIds.add(String(c.courseId));
      if (c._key) excludedIds.add(String(c._key));
    }
  }

  if (Array.isArray(completedCourseIds)) {
    for (const id of completedCourseIds) {
      if (id != null) excludedIds.add(String(id));
    }
  } else if (completedCourseIds instanceof Set) {
    for (const id of completedCourseIds) {
      if (id != null) excludedIds.add(String(id));
    }
  }

  const seenIds = new Set();
  const result = [];

  for (const raw of recommendedCourses) {
    if (!raw) continue;
    const idKey = String(raw.dbId || raw.id || raw.courseId || raw._key || '');
    if (!idKey || seenIds.has(idKey)) continue;

    // Exclude already enrolled, assigned, or completed
    if (excludedIds.has(idKey)) continue;
    if (raw.id && excludedIds.has(String(raw.id))) continue;
    if (raw.dbId && excludedIds.has(String(raw.dbId))) continue;
    if (raw.courseId && excludedIds.has(String(raw.courseId))) continue;

    // Exclude inactive or draft courses
    if (raw.active === false || raw.isDraft === true || raw.status === 'DRAFT') {
      continue;
    }

    // Exclude mandatory assignments (electives must be voluntary exploration)
    const isMandatory =
      String(raw.assignmentType || '').toUpperCase() === 'MANDATORY' ||
      String(raw.enrollmentType || '').toUpperCase() === 'MANDATORY';
    if (isMandatory) continue;

    seenIds.add(idKey);

    const reason = getRecommendationReason(raw);
    const durationLabel = formatDuration(raw.duration, raw.durationHours);

    result.push({
      ...raw,
      idKey,
      recommendationReason: reason,
      durationLabel
    });
  }

  return result;
}
