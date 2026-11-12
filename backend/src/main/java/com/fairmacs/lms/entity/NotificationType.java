package com.fairmacs.lms.entity;

/**
 * Standardized notification categories for the Fairmacs LMS.
 * Stored as String on Notification.type for backward compatibility with existing records.
 */
public final class NotificationType {

    public static final String COURSE_ASSIGNED = "COURSE_ASSIGNED";
    public static final String COURSE_DUE_SOON = "COURSE_DUE_SOON";
    public static final String COURSE_OVERDUE = "COURSE_OVERDUE";
    public static final String COURSE_COMPLETED = "COURSE_COMPLETED";
    public static final String MODULE_COMPLETED = "MODULE_COMPLETED";
    public static final String QUIZ_AVAILABLE = "QUIZ_AVAILABLE";
    public static final String ASSESSMENT_RESULT = "ASSESSMENT_RESULT";
    public static final String ASSESSMENT_FAILED = "ASSESSMENT_FAILED";
    public static final String RETAKE_AVAILABLE = "RETAKE_AVAILABLE";
    public static final String CERTIFICATE_ISSUED = "CERTIFICATE_ISSUED";
    public static final String COURSE_CANCELLED = "COURSE_CANCELLED";
    public static final String ASSIGNMENT_REVOKED = "ASSIGNMENT_REVOKED";
    public static final String DEADLINE_CHANGED = "DEADLINE_CHANGED";
    public static final String TRAINER_ACTION_REQUIRED = "TRAINER_ACTION_REQUIRED";
    public static final String TEAM_COMPLIANCE = "TEAM_COMPLIANCE";
    public static final String HR_ADMIN_ALERT = "HR_ADMIN_ALERT";
    public static final String SYSTEM_ALERT = "SYSTEM_ALERT";
    public static final String GENERAL_ANNOUNCEMENT = "GENERAL_ANNOUNCEMENT";

    private NotificationType() {
    }
}

