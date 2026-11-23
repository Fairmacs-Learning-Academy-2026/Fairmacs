package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.PolicyOrgOverviewDTO;
import com.fairmacs.lms.dto.PolicyDeptOverviewDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.IsoFields;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Scheduled notification processor for Fairmacs LMS:
 * 1. Course deadline reminders (7 days, 3 days, and 0 days before due date).
 * 2. Overdue course reminders (immediately when overdue + weekly repeat while overdue).
 * 3. Assessment retake availability notifications (after 12-hour cooldown).
 * 4. Weekly Manager & HR/Admin compliance summary digests.
 */
@Service
public class NotificationSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(NotificationSchedulerService.class);
    private static final int BATCH_SIZE = 100;

    private final EnrollmentRepository enrollmentRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final NotificationJobLogRepository jobLogRepository;

    @Autowired(required = false)
    private PolicyAssignmentRepository policyAssignmentRepository;

    @Autowired(required = false)
    private PolicyAcknowledgementRepository policyAcknowledgementRepository;

    @Autowired(required = false)
    private PolicyService policyService;

    @Autowired(required = false)
    private DepartmentRepository departmentRepository;

    @Value("${app.notifications.policies.enabled:true}")
    private boolean policyNotificationsEnabled = true;

    @Value("${app.notifications.policies.due-soon-days:5}")
    private int policyDueSoonDays = 5;

    @Value("${app.notifications.policies.overdue-initial-days:1}")
    private int policyOverdueInitialDays = 1;

    @Value("${app.notifications.policies.overdue-reminder-interval-days:7}")
    private int policyOverdueIntervalDays = 7;

    @Value("${app.notifications.policies.escalation-manager-days:1}")
    private int policyEscalationManagerDays = 1;

    @Value("${app.notifications.policies.escalation-hr-days:7}")
    private int policyEscalationHrDays = 7;

    @Value("${app.notifications.policies.remind-on-leave:true}")
    private boolean remindOnLeave = true;

    @Value("${app.notifications.scheduler.enabled:true}")
    private boolean schedulerEnabled = true;

    @Value("${app.notifications.scheduler.timezone:Asia/Kolkata}")
    private String timezone = "Asia/Kolkata";

    @Value("${app.notifications.scheduler.reminder-days:5,7,3,0}")
    private String reminderDaysConfig = "5,7,3,0";

    @Value("${app.notifications.scheduler.overdue-repeat-days:7}")
    private int overdueRepeatDays = 7;

    public NotificationSchedulerService(
            EnrollmentRepository enrollmentRepository,
            QuizAttemptRepository quizAttemptRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            NotificationJobLogRepository jobLogRepository
    ) {
        this.enrollmentRepository = enrollmentRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.jobLogRepository = jobLogRepository;
    }

    /**
     * Daily scheduled check for upcoming course deadlines and overdue assignments.
     * Default schedule: 08:00 AM every day (Asia/Kolkata).
     */
    @Scheduled(
            cron = "${app.notifications.scheduler.deadline-cron:0 0 8 * * *}",
            zone = "${app.notifications.scheduler.timezone:Asia/Kolkata}"
    )
    public void scheduledDeadlineAndOverdueReminders() {
        if (!schedulerEnabled) {
            return;
        }
        processDeadlineAndOverdueReminders(currentLocalDate(), false);
        if (policyNotificationsEnabled) {
            processPolicyDeadlineReminders(currentLocalDate(), false);
        }
    }

    /**
     * Hourly check for assessment attempts whose 12-hour cooldown has elapsed.
     */
    @Scheduled(
            cron = "${app.notifications.scheduler.retake-cron:0 15 * * * *}",
            zone = "${app.notifications.scheduler.timezone:Asia/Kolkata}"
    )
    public void scheduledRetakeAvailableCheck() {
        if (!schedulerEnabled) {
            return;
        }
        processRetakeAvailableNotifications(LocalDateTime.now());
    }

    /**
     * Weekly compliance digest for Department Managers and HR Admins (Course/Learning Engine).
     * Default schedule: Mondays at 08:30 AM (Asia/Kolkata).
     */
    @Scheduled(
            cron = "${app.notifications.scheduler.digest-cron:0 30 8 * * MON}",
            zone = "${app.notifications.scheduler.timezone:Asia/Kolkata}"
    )
    public void scheduledWeeklyComplianceDigests() {
        if (!schedulerEnabled) {
            return;
        }
        processWeeklyComplianceDigests(currentLocalDate(), false);
    }

    /**
     * Weekly compliance digest for Policies & Agreements.
     * Generates HR/Admin organization summary and Manager department-scoped compliance summaries.
     * Default schedule: Mondays at 09:00 AM (Asia/Kolkata).
     */
    @Scheduled(
            cron = "${app.notifications.policies.digest-cron:0 0 9 * * MON}",
            zone = "${app.notifications.scheduler.timezone:Asia/Kolkata}"
    )
    public void scheduledWeeklyPolicyDigests() {
        if (!schedulerEnabled || !policyNotificationsEnabled) {
            return;
        }
        processWeeklyPolicyDigests(currentLocalDate(), false);
    }

    /**
     * Startup recovery listener.
     * Recovers missed scheduled jobs if the server was asleep, restarting, or offline during cron triggers.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        if (!schedulerEnabled) {
            return;
        }
        checkAndRecoverMissedRuns();
    }

    /**
     * Checks if today's daily deadline reminders or this week's compliance digest was missed and triggers catch-up.
     */
    public void checkAndRecoverMissedRuns() {
        LocalDate today = currentLocalDate();
        String dailyKey = "DEADLINE_REMINDERS:" + today;
        boolean dailyRan = jobLogRepository != null
                && jobLogRepository.existsByExecutionKeyAndStatus(dailyKey, "COMPLETED");

        if (!dailyRan) {
            log.info("Startup check: Today's deadline & overdue reminder scan ({}) has not completed. Triggering catch-up.", dailyKey);
            try {
                processDeadlineAndOverdueReminders(today, false);
            } catch (Exception ex) {
                log.warn("Startup catch-up for {} failed: {}", dailyKey, ex.getMessage());
            }
        }

        // Daily policy deadline and overdue reminders check
        if (policyNotificationsEnabled) {
            String dailyPolicyKey = "POLICY_DEADLINE_REMINDERS:" + today;
            boolean dailyPolicyRan = jobLogRepository != null
                    && jobLogRepository.existsByExecutionKeyAndStatus(dailyPolicyKey, "COMPLETED");

            if (!dailyPolicyRan) {
                log.info("Startup check: Today's policy deadline & overdue reminder scan ({}) has not completed. Triggering catch-up.", dailyPolicyKey);
                try {
                    processPolicyDeadlineReminders(today, false);
                } catch (Exception ex) {
                    log.warn("Startup catch-up for {} failed: {}", dailyPolicyKey, ex.getMessage());
                }
            }
        }

        // On Mondays, check if weekly compliance digests were missed
        if (today.getDayOfWeek() == java.time.DayOfWeek.MONDAY) {
            int year = today.get(IsoFields.WEEK_BASED_YEAR);
            int week = today.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
            String weekKey = String.format("%d-W%02d", year, week);
            String digestKey = "WEEKLY_COMPLIANCE_DIGEST:" + weekKey;
            boolean digestRan = jobLogRepository != null
                    && jobLogRepository.existsByExecutionKeyAndStatus(digestKey, "COMPLETED");

            if (!digestRan) {
                log.info("Startup check: Weekly compliance digest ({}) has not completed. Triggering catch-up.", digestKey);
                try {
                    processWeeklyComplianceDigests(today, false);
                } catch (Exception ex) {
                    log.warn("Startup catch-up for {} failed: {}", digestKey, ex.getMessage());
                }
            }

            // Check if policy compliance digest was missed
            if (policyNotificationsEnabled) {
                String policyDigestKey = "POLICY_WEEKLY_DIGEST:" + weekKey;
                boolean policyDigestRan = jobLogRepository != null
                        && jobLogRepository.existsByExecutionKeyAndStatus(policyDigestKey, "COMPLETED");

                if (!policyDigestRan) {
                    log.info("Startup check: Weekly policy compliance digest ({}) has not completed. Triggering catch-up.", policyDigestKey);
                    try {
                        processWeeklyPolicyDigests(today, false);
                    } catch (Exception ex) {
                        log.warn("Startup catch-up for {} failed: {}", policyDigestKey, ex.getMessage());
                    }
                }
            }
        }
    }

    /**
     * Evaluates all active enrollments with due dates in batches and creates due-soon and overdue notifications.
     * Note: Transaction boundaries are per-enrollment and per-joblog to isolate errors and prevent rollback of entire batches.
     */
    public Map<String, Object> processDeadlineAndOverdueReminders(LocalDate referenceDate, boolean manualTrigger) {
        LocalDate today = referenceDate != null ? referenceDate : currentLocalDate();
        String executionKey = manualTrigger
                ? "DEADLINE_REMINDERS:MANUAL:" + System.currentTimeMillis()
                : "DEADLINE_REMINDERS:" + today;

        if (!manualTrigger && jobLogRepository != null && jobLogRepository.existsByExecutionKeyAndStatus(executionKey, "COMPLETED")) {
            log.debug("Deadline reminder job already successfully completed for key={}", executionKey);
            return Map.of("status", "SKIPPED_ALREADY_RAN", "executionKey", executionKey);
        }

        NotificationJobLog jobLog = startJobLog("DEADLINE_AND_OVERDUE_REMINDERS", executionKey);
        int processed = 0;
        int created = 0;
        int failures = 0;

        Set<Long> reminderOffsets = parseReminderOffsets(reminderDaysConfig);
        int repeatInterval = Math.max(1, overdueRepeatDays);

        try {
            int pageIndex = 0;
            Page<Enrollment> page;
            do {
                page = enrollmentRepository.findActiveEnrollmentsWithDueDate(
                        PageRequest.of(pageIndex, BATCH_SIZE)
                );

                for (Enrollment enrollment : page.getContent()) {
                    processed++;
                    try {
                        created += evaluateSingleEnrollmentReminder(
                                enrollment,
                                today,
                                reminderOffsets,
                                repeatInterval
                        );
                    } catch (Exception itemEx) {
                        failures++;
                        log.warn(
                                "Error processing reminder for enrollmentId={}: {}",
                                enrollment.getId(),
                                itemEx.getMessage()
                        );
                    }
                }
                pageIndex++;
            } while (page.hasNext());

            completeJobLog(
                    jobLog,
                    "COMPLETED",
                    processed,
                    created,
                    failures,
                    "Evaluated " + processed + " active enrollments; created " + created + " notifications."
            );
        } catch (Exception ex) {
            failures++;
            completeJobLog(
                    jobLog,
                    "FAILED",
                    processed,
                    created,
                    failures,
                    "Scheduled reminder run encountered an error."
            );
            notifySystemJobFailure("Deadline & Overdue Reminder Job", today.toString());
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("jobName", "DEADLINE_AND_OVERDUE_REMINDERS");
        summary.put("referenceDate", today.toString());
        summary.put("processedEnrollments", processed);
        summary.put("notificationsCreated", created);
        summary.put("failures", failures);
        return summary;
    }

    /**
     * Evaluates a single enrollment against deadline and overdue rules.
     * Runs in its own transaction so a single failing record cannot abort processing of other enrollments.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int evaluateSingleEnrollmentReminder(
            Enrollment enrollment,
            LocalDate today,
            Set<Long> reminderOffsets,
            int repeatIntervalDays
    ) {
        if (enrollment == null || enrollment.getDueDate() == null) {
            return 0;
        }

        // Recheck eligibility
        EnrollmentStatus status = enrollment.getStatus();
        if (status == EnrollmentStatus.COMPLETED || status == EnrollmentStatus.REVOKED) {
            return 0;
        }

        User user = enrollment.getUser();
        Course course = enrollment.getCourse();
        if (user == null || course == null) {
            return 0;
        }
        if (user.getStatus() != null && user.getStatus() != UserStatus.ACTIVE) {
            return 0;
        }
        if (Boolean.FALSE.equals(course.getActive())) {
            return 0;
        }

        LocalDate dueDate = enrollment.getDueDate();
        long daysUntilDue = ChronoUnit.DAYS.between(today, dueDate);
        boolean isMandatory = enrollment.getEnrollmentType() == EnrollmentType.MANDATORY;
        String assignmentLabel = isMandatory ? "Mandatory" : "Recommended";
        String courseActionUrl = "/courses/" + course.getCourseId() + "/learn";

        int createdCount = 0;

        if (daysUntilDue >= 0) {
            if (reminderOffsets.contains(daysUntilDue)) {
                String remainingText = daysUntilDue == 0
                        ? "due today (" + dueDate + ")"
                        : "due in " + daysUntilDue + (daysUntilDue == 1 ? " day" : " days") + " (" + dueDate + ")";

                String title;
                if (daysUntilDue == 0) {
                    title = "Course Due Today: " + course.getTitle();
                } else if (daysUntilDue == 5) {
                    title = "Reminder: 5 days left to complete " + course.getTitle();
                } else {
                    title = "Upcoming Course Deadline: " + course.getTitle();
                }

                String message = String.format(
                        "Your %s course \"%s\" (%s) is %s. Current progress: %d%%. Please complete all modules and assessments on time.",
                        assignmentLabel.toLowerCase(),
                        course.getTitle(),
                        course.getCourseId(),
                        remainingText,
                        enrollment.getProgressPercent() != null ? enrollment.getProgressPercent() : 0
                );

                String priority = (daysUntilDue <= 3 || isMandatory)
                        ? NotificationPriority.HIGH
                        : NotificationPriority.NORMAL;

                String dedupKey = daysUntilDue == 5
                        ? String.format("COURSE_DUE_5D:%s:%d:%s", course.getCourseId(), user.getId(), dueDate)
                        : String.format(
                                "REMINDER_DUE_SOON:ENR:%d:DUE:%s:DAYS:%d",
                                enrollment.getId(),
                                dueDate,
                                daysUntilDue
                        );

                if (!notificationService.isDeduplicationKeyPresent(dedupKey)) {
                    Notification empNotif = notificationService.createNotificationSafely(
                            user.getId(),
                            title,
                            message,
                            NotificationType.COURSE_DUE_SOON,
                            priority,
                            "COURSE_CODE",
                            course.getCourseId(),
                            courseActionUrl,
                            dedupKey,
                            Map.of(
                                    "courseId", course.getCourseId(),
                                    "courseTitle", course.getTitle(),
                                    "dueDate", dueDate.toString(),
                                    "daysRemaining", daysUntilDue,
                                    "assignmentType", assignmentLabel
                            )
                    );
                    if (empNotif != null) {
                        createdCount++;
                    }
                }

                // Notify department manager when a mandatory course is 3 days away from deadline
                if (isMandatory && daysUntilDue == 3 && user.getDepartment() != null) {
                    String mgrTitle = "Approaching Mandatory Deadline: " + user.getName();
                    String mgrMessage = String.format(
                            "Team member %s (%s) has a mandatory course \"%s\" (%s) due in 3 days (%s). Current progress: %d%%.",
                            user.getName(),
                            user.getEmployeeId(),
                            course.getTitle(),
                            course.getCourseId(),
                            dueDate,
                            enrollment.getProgressPercent() != null ? enrollment.getProgressPercent() : 0
                    );
                    String mgrDedupPrefix = String.format(
                            "MGR_DUE_SOON:ENR:%d:DUE:%s:DAYS:3",
                            enrollment.getId(),
                            dueDate
                    );
                    createdCount += notificationService.notifyDepartmentManagers(
                            user.getDepartment(),
                            mgrTitle,
                            mgrMessage,
                            NotificationType.TEAM_COMPLIANCE,
                            NotificationPriority.NORMAL,
                            "COURSE_CODE",
                            course.getCourseId(),
                            "/manager",
                            mgrDedupPrefix,
                            Map.of(
                                    "employeeId", user.getEmployeeId(),
                                    "employeeName", user.getName(),
                                    "courseId", course.getCourseId(),
                                    "dueDate", dueDate.toString()
                            )
                    );
                }
            }
        } else {
            // Course is overdue (daysUntilDue < 0)
            long daysOverdue = Math.abs(daysUntilDue);

            if (enrollment.getStatus() != EnrollmentStatus.OVERDUE) {
                enrollment.setStatus(EnrollmentStatus.OVERDUE);
                enrollmentRepository.save(enrollment);
            }

            int safeRepeat = Math.max(1, repeatIntervalDays);
            if ((daysOverdue - 1) % safeRepeat == 0) {
                long overdueBucket = (daysOverdue - 1) / safeRepeat;

                String title = "Overdue " + assignmentLabel + " Course: " + course.getTitle();
                String message = String.format(
                        "Your %s course \"%s\" (%s) was due on %s and is now %d %s overdue. Please complete this training immediately.",
                        assignmentLabel.toLowerCase(),
                        course.getTitle(),
                        course.getCourseId(),
                        dueDate,
                        daysOverdue,
                        daysOverdue == 1 ? "day" : "days"
                );

                String priority = isMandatory
                        ? NotificationPriority.CRITICAL
                        : NotificationPriority.HIGH;

                String dedupKey = String.format(
                        "REMINDER_OVERDUE:ENR:%d:DUE:%s:BUCKET:%d",
                        enrollment.getId(),
                        dueDate,
                        overdueBucket
                );

                if (!notificationService.isDeduplicationKeyPresent(dedupKey)) {
                    Notification empNotif = notificationService.createNotificationSafely(
                            user.getId(),
                            title,
                            message,
                            NotificationType.COURSE_OVERDUE,
                            priority,
                            "COURSE_CODE",
                            course.getCourseId(),
                            courseActionUrl,
                            dedupKey,
                            Map.of(
                                    "courseId", course.getCourseId(),
                                    "courseTitle", course.getTitle(),
                                    "dueDate", dueDate.toString(),
                                    "daysOverdue", daysOverdue,
                                    "assignmentType", assignmentLabel
                            )
                    );
                    if (empNotif != null) {
                        createdCount++;
                    }
                }

                // Escalate overdue mandatory courses to the employee's Department Manager
                if (isMandatory && user.getDepartment() != null) {
                    String mgrTitle = "Overdue Mandatory Course: " + user.getName();
                    String mgrMessage = String.format(
                            "Team member %s (%s) is %d %s overdue on mandatory course \"%s\" (%s), which was due on %s (Progress: %d%%).",
                            user.getName(),
                            user.getEmployeeId(),
                            daysOverdue,
                            daysOverdue == 1 ? "day" : "days",
                            course.getTitle(),
                            course.getCourseId(),
                            dueDate,
                            enrollment.getProgressPercent() != null ? enrollment.getProgressPercent() : 0
                    );
                    String mgrDedupPrefix = String.format(
                            "MGR_OVERDUE:ENR:%d:DUE:%s:BUCKET:%d",
                            enrollment.getId(),
                            dueDate,
                            overdueBucket
                    );
                    createdCount += notificationService.notifyDepartmentManagers(
                            user.getDepartment(),
                            mgrTitle,
                            mgrMessage,
                            NotificationType.TEAM_COMPLIANCE,
                            NotificationPriority.HIGH,
                            "COURSE_CODE",
                            course.getCourseId(),
                            "/manager",
                            mgrDedupPrefix,
                            Map.of(
                                    "employeeId", user.getEmployeeId(),
                                    "employeeName", user.getName(),
                                    "courseId", course.getCourseId(),
                                    "daysOverdue", daysOverdue
                            )
                    );
                }

                // Also alert HR Admin when a mandatory course first becomes overdue
                if (isMandatory && overdueBucket == 0) {
                    String hrTitle = "Mandatory Training Overdue: " + course.getTitle();
                    String hrMessage = String.format(
                            "Employee %s (%s, %s) is now overdue on mandatory course \"%s\" (%s), due %s.",
                            user.getName(),
                            user.getEmployeeId(),
                            user.getDepartment() != null ? user.getDepartment() : "Unassigned",
                            course.getTitle(),
                            course.getCourseId(),
                            dueDate
                    );
                    String hrDedupPrefix = String.format(
                            "HR_OVERDUE:ENR:%d:DUE:%s:BUCKET:0",
                            enrollment.getId(),
                            dueDate
                    );
                    createdCount += notificationService.notifyHrAdmins(
                            hrTitle,
                            hrMessage,
                            NotificationType.HR_ADMIN_ALERT,
                            NotificationPriority.HIGH,
                            "COURSE_CODE",
                            course.getCourseId(),
                            "/hr",
                            hrDedupPrefix,
                            Map.of(
                                    "employeeId", user.getEmployeeId(),
                                    "courseId", course.getCourseId(),
                                    "dueDate", dueDate.toString()
                            )
                    );
                }
            }
        }

        return createdCount;
    }

    /**
     * Checks failed quiz attempts whose 12-hour cooldown has elapsed and notifies learners
     * that their assessment retake is now unlocked.
     */
    @Transactional
    public int processRetakeAvailableNotifications(LocalDateTime now) {
        LocalDateTime referenceNow = now != null ? now : LocalDateTime.now();
        LocalDateTime cooldownCutoff = referenceNow.minusHours(12);
        LocalDateTime windowStart = referenceNow.minusDays(7);

        List<QuizAttempt> candidates = quizAttemptRepository.findFailedAttemptsReadyForRetake(
                windowStart,
                cooldownCutoff
        );

        int createdCount = 0;
        for (QuizAttempt attempt : candidates) {
            try {
                Quiz quiz = attempt.getQuiz();
                User user = attempt.getUser();
                if (quiz == null || user == null || quiz.getCourse() == null) {
                    continue;
                }

                // Check that this attempt is the user's latest completed attempt on this quiz
                Optional<QuizAttempt> latestOpt = quizAttemptRepository
                        .findTopByQuiz_IdAndUser_IdAndCompletedAtIsNotNullOrderByCompletedAtDesc(
                                quiz.getId(),
                                user.getId()
                        );
                if (latestOpt.isEmpty() || !Objects.equals(latestOpt.get().getId(), attempt.getId())) {
                    continue;
                }

                // Check that the user still has attempts remaining
                long totalAttempts = quizAttemptRepository.countByQuizIdAndUserId(quiz.getId(), user.getId());
                boolean hasAttemptLimit = quiz.getMaxAttempts() != null && quiz.getMaxAttempts() > 0;
                long remaining = hasAttemptLimit ? Math.max(0, quiz.getMaxAttempts() - totalAttempts) : -1;
                if (hasAttemptLimit && remaining <= 0) {
                    continue;
                }

                Course course = quiz.getCourse();
                String dedupKey = "RETAKE_AVAILABLE:ATTEMPT:" + attempt.getId();
                if (notificationService.isDeduplicationKeyPresent(dedupKey)) {
                    continue;
                }
                int cooldownMin = quiz.getCooldownMinutes() != null ? quiz.getCooldownMinutes() : 5;
                String attemptNotice = hasAttemptLimit
                        ? String.format(" You have %d %s remaining.", remaining, remaining == 1 ? "attempt" : "attempts")
                        : " You may retake this assessment now.";
                String title = "Assessment Retake Unlocked: " + quiz.getTitle();
                String message = String.format(
                        "The %d-minute review cooldown for \"%s\" in course \"%s\" (%s) has ended.%s",
                        cooldownMin,
                        quiz.getTitle(),
                        course.getTitle(),
                        course.getCourseId(),
                        attemptNotice
                );

                Map<String, Object> retakeMetadata = new HashMap<>();
                retakeMetadata.put("quizId", quiz.getQuizId() != null ? quiz.getQuizId() : String.valueOf(quiz.getId()));
                retakeMetadata.put("courseId", course.getCourseId());
                if (hasAttemptLimit) {
                    retakeMetadata.put("remainingAttempts", remaining);
                }

                Notification notif = notificationService.createNotificationSafely(
                        user.getId(),
                        title,
                        message,
                        NotificationType.RETAKE_AVAILABLE,
                        NotificationPriority.NORMAL,
                        "COURSE_CODE",
                        course.getCourseId(),
                        "/courses/" + course.getCourseId() + "/learn",
                        dedupKey,
                        retakeMetadata
                );
                if (notif != null) {
                    createdCount++;
                }
            } catch (Exception ex) {
                log.debug("Failed to process retake notification for attemptId={}: {}", attempt.getId(), ex.getMessage());
            }
        }
        return createdCount;
    }

    /**
     * Generates weekly compliance summary notifications for Department Managers and HR Admins
     * based on real database enrollment counts.
     */
    public Map<String, Object> processWeeklyComplianceDigests(LocalDate referenceDate, boolean manualTrigger) {
        LocalDate today = referenceDate != null ? referenceDate : currentLocalDate();
        int year = today.get(IsoFields.WEEK_BASED_YEAR);
        int week = today.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        String weekKey = String.format("%d-W%02d", year, week);

        String executionKey = manualTrigger
                ? "WEEKLY_COMPLIANCE_DIGEST:MANUAL:" + System.currentTimeMillis()
                : "WEEKLY_COMPLIANCE_DIGEST:" + weekKey;

        if (!manualTrigger && jobLogRepository != null && jobLogRepository.existsByExecutionKeyAndStatus(executionKey, "COMPLETED")) {
            return Map.of("status", "SKIPPED_ALREADY_RAN", "executionKey", executionKey);
        }

        NotificationJobLog jobLog = startJobLog("WEEKLY_COMPLIANCE_DIGEST", executionKey);
        int created = 0;
        int failures = 0;

        try {
            List<Enrollment> activeEnrollments = enrollmentRepository.findAllActiveOrganizationEnrollments();

            // 1. Department Manager Weekly Compliance Digests
            List<User> managers = userRepository.findByRoleAndStatus(Role.MANAGER, UserStatus.ACTIVE);
            for (User manager : managers) {
                if (manager.getDepartment() == null || manager.getDepartment().isBlank()) {
                    continue;
                }
                String dept = manager.getDepartment().trim();
                List<Enrollment> deptEnrollments = activeEnrollments.stream()
                        .filter(e -> e.getUser() != null
                                && e.getUser().getRole() == Role.EMPLOYEE
                                && e.getUser().getDepartment() != null
                                && e.getUser().getDepartment().trim().equalsIgnoreCase(dept))
                        .toList();

                long totalMandatory = deptEnrollments.stream()
                        .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY)
                        .count();
                long completedMandatory = deptEnrollments.stream()
                        .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY
                                && e.getStatus() == EnrollmentStatus.COMPLETED)
                        .count();
                long overdueMandatory = deptEnrollments.stream()
                        .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY
                                && (e.getStatus() == EnrollmentStatus.OVERDUE
                                || (e.getDueDate() != null
                                && e.getDueDate().isBefore(today)
                                && e.getStatus() != EnrollmentStatus.COMPLETED)))
                        .count();
                long notStartedMandatory = deptEnrollments.stream()
                        .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY
                                && e.getStatus() == EnrollmentStatus.NOT_STARTED)
                        .count();

                int complianceRate = totalMandatory > 0
                        ? (int) Math.round((completedMandatory * 100.0) / totalMandatory)
                        : 100;

                String title = String.format("Weekly Team Compliance Summary — %s (%d%%)", dept, complianceRate);
                String message = String.format(
                        "Department %s weekly mandatory training summary (%s): %d/%d completed (%d%%), %d overdue, %d not started.",
                        dept,
                        weekKey,
                        completedMandatory,
                        totalMandatory,
                        complianceRate,
                        overdueMandatory,
                        notStartedMandatory
                );

                String priority = overdueMandatory > 0
                        ? NotificationPriority.HIGH
                        : NotificationPriority.NORMAL;

                String dedupKey = manualTrigger
                        ? null
                        : String.format("DIGEST_MANAGER:%s:MGR:%d", weekKey, manager.getId());

                Notification n = notificationService.createNotificationSafely(
                        manager.getId(),
                        title,
                        message,
                        NotificationType.TEAM_COMPLIANCE,
                        priority,
                        "DEPARTMENT",
                        dept,
                        "/manager",
                        dedupKey,
                        Map.of(
                                "department", dept,
                                "week", weekKey,
                                "totalMandatory", totalMandatory,
                                "completedMandatory", completedMandatory,
                                "overdueMandatory", overdueMandatory,
                                "notStartedMandatory", notStartedMandatory,
                                "complianceRate", complianceRate
                        )
                );
                if (n != null) {
                    created++;
                }
            }

            // 2. HR Admin Organization-Wide Weekly Compliance Digest
            long orgTotalMandatory = activeEnrollments.stream()
                    .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY)
                    .count();
            long orgCompletedMandatory = activeEnrollments.stream()
                    .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY
                            && e.getStatus() == EnrollmentStatus.COMPLETED)
                    .count();
            long orgOverdueMandatory = activeEnrollments.stream()
                    .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY
                            && (e.getStatus() == EnrollmentStatus.OVERDUE
                            || (e.getDueDate() != null
                            && e.getDueDate().isBefore(today)
                            && e.getStatus() != EnrollmentStatus.COMPLETED)))
                    .count();
            long orgNotStartedMandatory = activeEnrollments.stream()
                    .filter(e -> e.getEnrollmentType() == EnrollmentType.MANDATORY
                            && e.getStatus() == EnrollmentStatus.NOT_STARTED)
                    .count();

            int orgComplianceRate = orgTotalMandatory > 0
                    ? (int) Math.round((orgCompletedMandatory * 100.0) / orgTotalMandatory)
                    : 100;

            String hrTitle = String.format("Organization Weekly Compliance Digest (%d%%)", orgComplianceRate);
            String hrMessage = String.format(
                    "Organization mandatory compliance summary (%s): %d/%d completed (%d%%), %d overdue mandatory assignments, %d not started across %d total active enrollments.",
                    weekKey,
                    orgCompletedMandatory,
                    orgTotalMandatory,
                    orgComplianceRate,
                    orgOverdueMandatory,
                    orgNotStartedMandatory,
                    activeEnrollments.size()
            );

            String hrPriority = orgOverdueMandatory > 0
                    ? NotificationPriority.HIGH
                    : NotificationPriority.NORMAL;

            String hrDedupPrefix = manualTrigger ? null : "DIGEST_HR_ORG:" + weekKey;
            created += notificationService.notifyHrAdmins(
                    hrTitle,
                    hrMessage,
                    NotificationType.HR_ADMIN_ALERT,
                    hrPriority,
                    "COMPLIANCE_DIGEST",
                    weekKey,
                    "/hr",
                    hrDedupPrefix,
                    Map.of(
                            "week", weekKey,
                            "totalEnrollments", activeEnrollments.size(),
                            "totalMandatory", orgTotalMandatory,
                            "completedMandatory", orgCompletedMandatory,
                            "overdueMandatory", orgOverdueMandatory,
                            "notStartedMandatory", orgNotStartedMandatory,
                            "complianceRate", orgComplianceRate
                    )
            );

            completeJobLog(
                    jobLog,
                    "COMPLETED",
                    activeEnrollments.size(),
                    created,
                    failures,
                    "Generated " + created + " weekly compliance digest notifications."
            );
        } catch (Exception ex) {
            failures++;
            completeJobLog(
                    jobLog,
                    "FAILED",
                    0,
                    created,
                    failures,
                    "Weekly compliance digest job encountered an error."
            );
            notifySystemJobFailure("Weekly Compliance Digest Job", weekKey);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("jobName", "WEEKLY_COMPLIANCE_DIGEST");
        result.put("week", weekKey);
        result.put("notificationsCreated", created);
        result.put("failures", failures);
        return result;
    }

    private Set<Long> parseReminderOffsets(String config) {
        if (config == null || config.isBlank()) {
            return Set.of(7L, 3L, 0L);
        }
        return Arrays.stream(config.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return Long.parseLong(s);
                    } catch (NumberFormatException ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private LocalDate currentLocalDate() {
        try {
            return LocalDate.now(ZoneId.of(timezone));
        } catch (Exception ex) {
            return LocalDate.now();
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public NotificationJobLog startJobLog(String jobName, String executionKey) {
        if (jobLogRepository == null) {
            return null;
        }
        try {
            NotificationJobLog logEntry = new NotificationJobLog(jobName, executionKey);
            return jobLogRepository.save(logEntry);
        } catch (Exception ex) {
            log.debug("Could not create NotificationJobLog for {}: {}", executionKey, ex.getMessage());
            return null;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void completeJobLog(
            NotificationJobLog jobLog,
            String status,
            int processed,
            int created,
            int failures,
            String summary
    ) {
        if (jobLog == null || jobLogRepository == null) {
            return;
        }
        try {
            jobLog.setCompletedAt(LocalDateTime.now());
            jobLog.setStatus(status);
            jobLog.setProcessedCount(processed);
            jobLog.setNotificationsCreated(created);
            jobLog.setFailureCount(failures);
            jobLog.setSummaryMessage(summary);
            jobLogRepository.save(jobLog);
        } catch (Exception ex) {
            log.debug("Could not update NotificationJobLog: {}", ex.getMessage());
        }
    }

    /**
     * Verifies whether an active policy assignment is currently eligible for scheduled notifications.
     * Excludes:
     * - Open-ended assignments (dueDate == null, never marked overdue)
     * - Unpublished or archived policy documents
     * - Inactive or terminated employees
     * - Employees currently ON_LEAVE (unless remindOnLeave is explicitly enabled)
     * - Assignments that are already compliant/acknowledged (or minor version covered by major)
     */
    public boolean isEligibleForPolicyNotification(PolicyAssignment a) {
        if (a == null || a.getDueDate() == null) {
            return false;
        }
        if (a.getPolicyDocument() == null || a.getPolicyDocument().getDocumentStatus() != PolicyDocumentStatus.PUBLISHED) {
            return false;
        }
        User employee = a.getEmployeeUser();
        if (employee == null) {
            return false;
        }
        if (employee.getStatus() == UserStatus.INACTIVE || employee.getStatus() == UserStatus.TERMINATED) {
            return false;
        }
        if (employee.getStatus() == UserStatus.ON_LEAVE && !remindOnLeave) {
            return false;
        }
        if (isPolicyAssignmentCompliant(a)) {
            return false;
        }
        return true;
    }

    /**
     * Resolves all eligible Department Managers for a given employee.
     * Uses manager's primary department and recursively traverses descendant child departments.
     */
    public List<User> findEligibleManagersForEmployee(User employee, Long departmentIdSnapshot) {
        if (employee == null) {
            return Collections.emptyList();
        }

        List<User> allManagers = userRepository.findByRoleAndStatus(Role.MANAGER, UserStatus.ACTIVE);
        if (allManagers == null || allManagers.isEmpty()) {
            List<User> byRole = userRepository.findByRole(Role.MANAGER);
            if (byRole != null) {
                allManagers = byRole.stream()
                        .filter(u -> u.getStatus() != UserStatus.INACTIVE && u.getStatus() != UserStatus.TERMINATED)
                        .toList();
            } else {
                allManagers = Collections.emptyList();
            }
        }

        if (allManagers.isEmpty()) {
            return Collections.emptyList();
        }

        Long empDeptId = departmentIdSnapshot;
        String empDeptName = employee.getDepartment();

        if (empDeptId == null && empDeptName != null && !empDeptName.isBlank() && departmentRepository != null) {
            empDeptId = departmentRepository.findByNameIgnoreCase(empDeptName.trim())
                    .map(Department::getId)
                    .orElse(null);
        }

        List<User> matchingManagers = new ArrayList<>();
        for (User manager : allManagers) {
            if (manager.getDepartment() == null || manager.getDepartment().isBlank()) {
                continue;
            }

            if (empDeptName != null && manager.getDepartment().trim().equalsIgnoreCase(empDeptName.trim())) {
                matchingManagers.add(manager);
                continue;
            }

            if (empDeptId != null && departmentRepository != null) {
                Set<Long> managerDeptIds = resolveDepartmentHierarchyForManager(manager);
                if (managerDeptIds.contains(empDeptId)) {
                    matchingManagers.add(manager);
                }
            }
        }
        return matchingManagers;
    }

    /**
     * Resolves the department hierarchy (primary + child departments) for a Department Manager.
     */
    public Set<Long> resolveDepartmentHierarchyForManager(User manager) {
        Set<Long> deptIds = new HashSet<>();
        if (manager == null || manager.getDepartment() == null || manager.getDepartment().isBlank() || departmentRepository == null) {
            return deptIds;
        }

        departmentRepository.findByNameIgnoreCase(manager.getDepartment().trim()).ifPresent(d -> deptIds.add(d.getId()));
        if (deptIds.isEmpty()) {
            return deptIds;
        }

        List<Department> allDepts = departmentRepository.findAll();
        boolean addedNew;
        do {
            addedNew = false;
            for (Department d : allDepts) {
                if (d.getParentDepartment() != null && deptIds.contains(d.getParentDepartment().getId())) {
                    if (deptIds.add(d.getId())) {
                        addedNew = true;
                    }
                }
            }
        } while (addedNew);

        return deptIds;
    }

    /**
     * Evaluates active policy assignments with due dates and emits:
     * 1. Due-soon reminders (configurable, default 5 days before deadline).
     * 2. Due-today reminders (on deadline day).
     * 3. First overdue reminders (configurable, default 1 day overdue).
     * 4. Subsequent overdue reminders (every configurable interval, default 7 days).
     * 5. Level 2 Manager Escalations (when overdue, scoped strictly to department manager).
     * 6. Level 3 HR/Admin Escalations (prolonged overdue, escalated to HR_ADMIN / SUPER_ADMIN).
     *
     * Note: Assignments without a due date (open-ended) are strictly ignored and never flagged as overdue.
     */
    public Map<String, Object> processPolicyDeadlineReminders(LocalDate referenceDate, boolean manualTrigger) {
        if (!policyNotificationsEnabled) {
            log.debug("Policy deadline reminders are disabled by configuration.");
            return Map.of("status", "DISABLED");
        }
        if (policyAssignmentRepository == null || policyAcknowledgementRepository == null) {
            log.debug("Policy repositories not present; skipping policy deadline reminders.");
            return Map.of("status", "SKIPPED_NO_REPOSITORIES");
        }

        LocalDate today = referenceDate != null ? referenceDate : currentLocalDate();
        String executionKey = manualTrigger
                ? "POLICY_DEADLINE_REMINDERS:MANUAL:" + System.currentTimeMillis()
                : "POLICY_DEADLINE_REMINDERS:" + today;

        if (!manualTrigger && jobLogRepository != null && jobLogRepository.existsByExecutionKeyAndStatus(executionKey, "COMPLETED")) {
            log.debug("Policy deadline reminder job already completed for key={}", executionKey);
            return Map.of("status", "SKIPPED_ALREADY_RAN", "executionKey", executionKey);
        }

        NotificationJobLog jobLog = startJobLog("POLICY_DEADLINE_AND_OVERDUE_REMINDERS", executionKey);
        int processed = 0;
        int created = 0;
        int failures = 0;

        try {
            LocalDate dueSoonDate = today.plusDays(policyDueSoonDays);

            // 1. Due Soon (policyDueSoonDays before deadline, default 5 days)
            List<PolicyAssignment> dueSoonList = policyAssignmentRepository.findActiveAssignmentsDueOn(dueSoonDate);
            for (PolicyAssignment a : dueSoonList) {
                processed++;
                if (!isEligibleForPolicyNotification(a)) continue;
                try {
                    String title = "Policy Due Soon: " + a.getPolicyDocument().getTitle();
                    String message = "The policy \"" + a.getPolicyDocument().getTitle() + "\" (v" +
                            a.getPolicyVersion().getVersionNumber() + ") is due for acknowledgement in " +
                            policyDueSoonDays + " days (" + a.getDueDate() + "). Please review and acknowledge in My Profile.";
                    String dedupKey = "policy-due-" + policyDueSoonDays + "d:" + a.getId();

                    Notification n = notificationService.createNotificationSafely(
                            a.getEmployeeUser().getId(),
                            title,
                            message,
                            NotificationType.POLICY_DUE_SOON,
                            NotificationPriority.NORMAL,
                            "POLICY",
                            a.getPolicyDocument().getId().toString(),
                            "/profile#policies",
                            dedupKey,
                            Map.of(
                                    "policyId", a.getPolicyDocument().getId(),
                                    "dueDate", a.getDueDate().toString(),
                                    "versionNumber", a.getPolicyVersion().getVersionNumber()
                            )
                    );
                    if (n != null) created++;
                } catch (Exception ex) {
                    failures++;
                    log.warn("Error sending due-soon policy reminder for assignmentId={}: {}", a.getId(), ex.getMessage());
                }
            }

            // 1b. Due in 2 days (urgent due soon)
            LocalDate dueIn2Days = today.plusDays(2);
            List<PolicyAssignment> dueSoon2 = policyAssignmentRepository.findActiveAssignmentsDueOn(dueIn2Days);
            for (PolicyAssignment a : dueSoon2) {
                processed++;
                if (!isEligibleForPolicyNotification(a)) continue;
                try {
                    String title = "Urgent: Policy Due Soon - " + a.getPolicyDocument().getTitle();
                    String message = "The policy \"" + a.getPolicyDocument().getTitle() + "\" (v" +
                            a.getPolicyVersion().getVersionNumber() + ") is due for acknowledgement in 2 days (" +
                            a.getDueDate() + "). Please review and acknowledge promptly.";
                    String dedupKey = "policy-due-2d:" + a.getId();

                    Notification n = notificationService.createNotificationSafely(
                            a.getEmployeeUser().getId(),
                            title,
                            message,
                            NotificationType.POLICY_DUE_SOON,
                            NotificationPriority.HIGH,
                            "POLICY",
                            a.getPolicyDocument().getId().toString(),
                            "/profile#policies",
                            dedupKey,
                            Map.of(
                                    "policyId", a.getPolicyDocument().getId(),
                                    "dueDate", a.getDueDate().toString(),
                                    "versionNumber", a.getPolicyVersion().getVersionNumber()
                            )
                    );
                    if (n != null) created++;
                } catch (Exception ex) {
                    failures++;
                    log.warn("Error sending 2-day policy reminder for assignmentId={}: {}", a.getId(), ex.getMessage());
                }
            }

            // 2. Due Today (on deadline date)
            List<PolicyAssignment> dueTodayList = policyAssignmentRepository.findActiveAssignmentsDueOn(today);
            for (PolicyAssignment a : dueTodayList) {
                processed++;
                if (!isEligibleForPolicyNotification(a)) continue;
                try {
                    String title = "Policy Due Today: " + a.getPolicyDocument().getTitle();
                    String message = "The policy \"" + a.getPolicyDocument().getTitle() + "\" (v" +
                            a.getPolicyVersion().getVersionNumber() + ") is due for acknowledgement today (" +
                            a.getDueDate() + "). Please review and submit your acknowledgement in My Profile.";
                    String dedupKey = "policy-due-today:" + a.getId() + ":" + today;

                    Notification n = notificationService.createNotificationSafely(
                            a.getEmployeeUser().getId(),
                            title,
                            message,
                            NotificationType.POLICY_DUE_SOON,
                            NotificationPriority.HIGH,
                            "POLICY",
                            a.getPolicyDocument().getId().toString(),
                            "/profile#policies",
                            dedupKey,
                            Map.of(
                                    "policyId", a.getPolicyDocument().getId(),
                                    "dueDate", a.getDueDate().toString(),
                                    "versionNumber", a.getPolicyVersion().getVersionNumber()
                            )
                    );
                    if (n != null) created++;
                } catch (Exception ex) {
                    failures++;
                    log.warn("Error sending due-today policy reminder for assignmentId={}: {}", a.getId(), ex.getMessage());
                }
            }

            // 3. Overdue assignments (strictly only where dueDate < today, null due dates are NEVER overdue)
            List<PolicyAssignment> overdueList = policyAssignmentRepository.findActiveOverdueAssignments(today);
            for (PolicyAssignment a : overdueList) {
                processed++;
                if (!isEligibleForPolicyNotification(a)) continue;
                try {
                    long daysOverdue = ChronoUnit.DAYS.between(a.getDueDate(), today);
                    if (daysOverdue <= 0) continue;

                    // Level 1: Employee Overdue Reminders
                    // Evaluates initial overdue (1 day overdue) and subsequent recurring interval (every 7 days)
                    boolean isInitialOverdue = (daysOverdue == policyOverdueInitialDays);
                    boolean isRecurringOverdue = (daysOverdue > policyOverdueInitialDays && (daysOverdue - policyOverdueInitialDays) % policyOverdueIntervalDays == 0);

                    if (isInitialOverdue || isRecurringOverdue) {
                        String priority = daysOverdue >= 14 ? NotificationPriority.CRITICAL : NotificationPriority.HIGH;
                        String title = (daysOverdue > 1 ? ("Urgent: Policy Overdue (" + daysOverdue + " days) — ") : "Policy Overdue: ") + a.getPolicyDocument().getTitle();
                        String message = "The acknowledgement for \"" + a.getPolicyDocument().getTitle() + "\" (v" +
                                a.getPolicyVersion().getVersionNumber() + ") is " + daysOverdue + " day(s) overdue (due date was " +
                                a.getDueDate() + "). Please review and submit your acknowledgement.";
                        String dedupKey = "policy-overdue:" + a.getId() + ":" + today;

                        Notification n = notificationService.createNotificationSafely(
                                a.getEmployeeUser().getId(),
                                title,
                                message,
                                NotificationType.POLICY_OVERDUE,
                                priority,
                                "POLICY",
                                a.getPolicyDocument().getId().toString(),
                                "/profile#policies",
                                dedupKey,
                                Map.of(
                                    "policyId", a.getPolicyDocument().getId(),
                                    "dueDate", a.getDueDate().toString(),
                                    "daysOverdue", daysOverdue
                                )
                        );
                        if (n != null) created++;
                    }

                    // Level 2: Department Manager Escalation
                    // Triggered when daysOverdue == policyEscalationManagerDays or matching recurring interval
                    if (daysOverdue == policyEscalationManagerDays || (daysOverdue > policyEscalationManagerDays && (daysOverdue - policyEscalationManagerDays) % policyOverdueIntervalDays == 0)) {
                        List<User> managers = findEligibleManagersForEmployee(a.getEmployeeUser(), a.getDepartmentIdSnapshot());
                        if (!managers.isEmpty()) {
                            for (User mgr : managers) {
                                String mgrTitle = "Manager Escalation: Overdue Policy Acknowledgement — " + a.getEmployeeUser().getFullName();
                                String mgrMessage = "Employee " + a.getEmployeeUser().getFullName() + " (" + a.getEmployeeIdSnapshot() +
                                        ") in " + (a.getDepartmentNameSnapshot() != null ? a.getDepartmentNameSnapshot() : "Department") +
                                        " has not acknowledged \"" + a.getPolicyDocument().getTitle() + "\" (v" +
                                        a.getPolicyVersion().getVersionNumber() + "). The acknowledgement is " + daysOverdue +
                                        " day(s) overdue (due date was " + a.getDueDate() + "). Please follow up with your team member.";
                                String mgrDedupKey = "policy-escalate-mgr:" + mgr.getId() + ":" + a.getId() + ":" + daysOverdue;

                                Notification n = notificationService.createNotificationSafely(
                                        mgr.getId(),
                                        mgrTitle,
                                        mgrMessage,
                                        NotificationType.POLICY_ESCALATION,
                                        NotificationPriority.HIGH,
                                        "POLICY",
                                        a.getPolicyDocument().getId().toString(),
                                        "/manager/policies",
                                        mgrDedupKey,
                                        Map.of(
                                            "policyId", a.getPolicyDocument().getId(),
                                            "assignmentId", a.getId(),
                                            "employeeId", a.getEmployeeUser().getId(),
                                            "daysOverdue", daysOverdue
                                        )
                                );
                                if (n != null) created++;
                            }
                        } else {
                            // Fallback: If no eligible manager found, safely escalate directly to HR/Admin
                            String fallbackDedupPrefix = "policy-escalate-mgr-fallback:" + a.getId() + ":" + daysOverdue;
                            String fbTitle = "Manager Escalation Fallback (Unmanaged Department) — " + a.getEmployeeUser().getFullName();
                            String fbMessage = "Employee " + a.getEmployeeUser().getFullName() + " (" + a.getEmployeeIdSnapshot() +
                                    ", " + (a.getDepartmentNameSnapshot() != null ? a.getDepartmentNameSnapshot() : "Department") +
                                    ") has an overdue policy \"" + a.getPolicyDocument().getTitle() + "\" (" + daysOverdue +
                                    " day(s) overdue, due: " + a.getDueDate() + "). No active department manager was found; escalating to HR.";
                            int hrNotifs = notificationService.notifyHrAdmins(
                                    fbTitle,
                                    fbMessage,
                                    NotificationType.POLICY_ESCALATION,
                                    NotificationPriority.HIGH,
                                    "POLICY",
                                    a.getPolicyDocument().getId().toString(),
                                    "/hr/policies",
                                    fallbackDedupPrefix,
                                    Map.of(
                                        "policyId", a.getPolicyDocument().getId(),
                                        "assignmentId", a.getId(),
                                        "employeeId", a.getEmployeeUser().getId(),
                                        "daysOverdue", daysOverdue
                                    )
                            );
                            created += hrNotifs;
                        }
                    }

                    // Level 3: HR/Admin Escalation for Prolonged Overdue
                    // Triggered when daysOverdue == policyEscalationHrDays (default 7 days) or matching recurring interval
                    if (daysOverdue == policyEscalationHrDays || (daysOverdue > policyEscalationHrDays && (daysOverdue - policyEscalationHrDays) % policyOverdueIntervalDays == 0)) {
                        String hrDedupPrefix = "policy-escalate-hr:" + a.getId() + ":" + daysOverdue;
                        String hrTitle = "HR Escalation (Level 3): Prolonged Overdue Policy — " + a.getEmployeeUser().getFullName();
                        String hrMessage = "Prolonged overdue policy acknowledgement: Employee " + a.getEmployeeUser().getFullName() +
                                " (" + a.getEmployeeIdSnapshot() + ", Department: " + (a.getDepartmentNameSnapshot() != null ? a.getDepartmentNameSnapshot() : "N/A") +
                                ") is " + daysOverdue + " days overdue for \"" + a.getPolicyDocument().getTitle() +
                                "\" (v" + a.getPolicyVersion().getVersionNumber() + ", Due: " + a.getDueDate() +
                                "). Escalation stage: Level 3 (Prolonged Overdue).";
                        int hrNotifs = notificationService.notifyHrAdmins(
                                hrTitle,
                                hrMessage,
                                NotificationType.POLICY_ESCALATION,
                                NotificationPriority.CRITICAL,
                                "POLICY",
                                a.getPolicyDocument().getId().toString(),
                                "/hr/policies",
                                hrDedupPrefix,
                                Map.of(
                                    "policyId", a.getPolicyDocument().getId(),
                                    "assignmentId", a.getId(),
                                    "employeeId", a.getEmployeeUser().getId(),
                                    "daysOverdue", daysOverdue
                                )
                        );
                        created += hrNotifs;
                    }
                } catch (Exception ex) {
                    failures++;
                    log.warn("Error processing overdue policy assignmentId={}: {}", a.getId(), ex.getMessage());
                }
            }

            completeJobLog(
                    jobLog,
                    "COMPLETED",
                    processed,
                    created,
                    failures,
                    "Evaluated " + processed + " active policy assignments with due dates; created " + created + " notifications."
            );
        } catch (Exception ex) {
            failures++;
            completeJobLog(
                    jobLog,
                    "FAILED",
                    processed,
                    created,
                    failures,
                    "Policy reminder job failed: " + ex.getMessage()
            );
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("jobName", "POLICY_DEADLINE_AND_OVERDUE_REMINDERS");
        summary.put("referenceDate", today.toString());
        summary.put("processedAssignments", processed);
        summary.put("notificationsCreated", created);
        summary.put("failures", failures);
        return summary;
    }

    /**
     * Weekly compliance digest for Policies & Agreements.
     * Evaluates organization-wide metrics for HR/Admin and department-scoped metrics for Managers.
     */
    public Map<String, Object> processWeeklyPolicyDigests(LocalDate referenceDate, boolean manualTrigger) {
        if (!policyNotificationsEnabled || policyService == null) {
            log.debug("Policy weekly digests disabled or PolicyService not available.");
            return Map.of("status", "SKIPPED");
        }

        LocalDate today = referenceDate != null ? referenceDate : currentLocalDate();
        int year = today.get(IsoFields.WEEK_BASED_YEAR);
        int week = today.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        String weekKey = String.format("%d-W%02d", year, week);

        String executionKey = manualTrigger
                ? "POLICY_WEEKLY_DIGEST:MANUAL:" + System.currentTimeMillis()
                : "POLICY_WEEKLY_DIGEST:" + weekKey;

        if (!manualTrigger && jobLogRepository != null && jobLogRepository.existsByExecutionKeyAndStatus(executionKey, "COMPLETED")) {
            log.debug("Policy weekly digest already ran for key={}", executionKey);
            return Map.of("status", "SKIPPED_ALREADY_RAN", "executionKey", executionKey);
        }

        NotificationJobLog jobLog = startJobLog("POLICY_WEEKLY_DIGEST", executionKey);
        int created = 0;
        int failures = 0;

        try {
            // 1. HR/Admin Organization-Wide Policy Compliance Digest
            PolicyOrgOverviewDTO orgOverview = policyService.getOrganizationOverview();
            if (orgOverview != null) {
                List<User> hrAdmins = userRepository.findByRoleAndStatus(Role.HR_ADMIN, UserStatus.ACTIVE);
                if (hrAdmins == null || hrAdmins.isEmpty()) {
                    List<User> byRole = userRepository.findByRole(Role.HR_ADMIN);
                    if (byRole != null) {
                        hrAdmins = byRole.stream()
                                .filter(u -> u.getStatus() != UserStatus.INACTIVE && u.getStatus() != UserStatus.TERMINATED)
                                .toList();
                    } else {
                        hrAdmins = Collections.emptyList();
                    }
                }

                double completion = orgOverview.getCompletionPercentage() != null ? orgOverview.getCompletionPercentage() : 0.0;
                long totalAcked = orgOverview.getTotalAcknowledged() != null ? orgOverview.getTotalAcknowledged() : 0L;
                long totalAssigned = orgOverview.getTotalAssigned() != null ? orgOverview.getTotalAssigned() : 0L;
                long totalPending = orgOverview.getTotalPending() != null ? orgOverview.getTotalPending() : 0L;
                long totalOverdue = orgOverview.getTotalOverdue() != null ? orgOverview.getTotalOverdue() : 0L;
                long totalPublished = orgOverview.getTotalPublished() != null ? orgOverview.getTotalPublished() : 0L;

                String hrTitle = String.format("Weekly Policy Compliance Digest — Organization (%.0f%%)", completion);
                String hrMessage = String.format(
                        "Weekly Policies & Agreements Summary (%s): %d/%d acknowledged (%.1f%%), %d pending, %d overdue across %d published documents.",
                        weekKey, totalAcked, totalAssigned, completion, totalPending, totalOverdue, totalPublished
                );
                String hrPriority = totalOverdue > 0 ? NotificationPriority.HIGH : NotificationPriority.NORMAL;

                for (User admin : hrAdmins) {
                    String dedupKey = String.format("policy-digest-hr:%d:%s", admin.getId(), weekKey);
                    Notification n = notificationService.createNotificationSafely(
                            admin.getId(),
                            hrTitle,
                            hrMessage,
                            NotificationType.POLICY_DIGEST,
                            hrPriority,
                            "POLICY_DIGEST",
                            "ORG:" + weekKey,
                            "/hr/policies",
                            dedupKey,
                            Map.of(
                                    "week", weekKey,
                                    "completionPercentage", completion,
                                    "totalAcknowledged", totalAcked,
                                    "totalAssigned", totalAssigned,
                                    "totalPending", totalPending,
                                    "totalOverdue", totalOverdue,
                                    "totalPublished", totalPublished
                            )
                    );
                    if (n != null) created++;
                }
            }

            // 2. Department Manager Weekly Policy Compliance Digest (Strictly department-scoped)
            List<User> managers = userRepository.findByRoleAndStatus(Role.MANAGER, UserStatus.ACTIVE);
            if (managers == null || managers.isEmpty()) {
                List<User> byRole = userRepository.findByRole(Role.MANAGER);
                if (byRole != null) {
                    managers = byRole.stream()
                            .filter(u -> u.getStatus() != UserStatus.INACTIVE && u.getStatus() != UserStatus.TERMINATED)
                            .toList();
                } else {
                    managers = Collections.emptyList();
                }
            }
            for (User manager : managers) {
                try {
                    PolicyDeptOverviewDTO deptOverview = policyService.getDepartmentOverview(manager.getId());
                    if (deptOverview == null) {
                        continue;
                    }

                    String deptName = deptOverview.getDepartmentName() != null ? deptOverview.getDepartmentName() : "Department";
                    double deptCompletion = deptOverview.getCompletionPercentage() != null ? deptOverview.getCompletionPercentage() : 0.0;
                    long deptAcked = deptOverview.getTotalAcknowledged() != null ? deptOverview.getTotalAcknowledged() : 0L;
                    long deptAssigned = deptOverview.getTotalAssigned() != null ? deptOverview.getTotalAssigned() : 0L;
                    long deptPending = deptOverview.getTotalPending() != null ? deptOverview.getTotalPending() : 0L;
                    long deptOverdue = deptOverview.getTotalOverdue() != null ? deptOverview.getTotalOverdue() : 0L;

                    String mgrTitle = String.format("Weekly Department Policy Compliance — %s (%.0f%%)", deptName, deptCompletion);
                    String mgrMessage = String.format(
                            "Department %s policy compliance summary (%s): %d/%d acknowledged (%.1f%%), %d pending, %d overdue.",
                            deptName, weekKey, deptAcked, deptAssigned, deptCompletion, deptPending, deptOverdue
                    );
                    String mgrPriority = deptOverdue > 0 ? NotificationPriority.HIGH : NotificationPriority.NORMAL;

                    String dedupKey = String.format("policy-digest-mgr:%d:%s", manager.getId(), weekKey);
                    Notification n = notificationService.createNotificationSafely(
                            manager.getId(),
                            mgrTitle,
                            mgrMessage,
                            NotificationType.POLICY_DIGEST,
                            mgrPriority,
                            "POLICY_DIGEST",
                            "DEPT:" + manager.getId() + ":" + weekKey,
                            "/manager/policies",
                            dedupKey,
                            Map.of(
                                    "department", deptName,
                                    "week", weekKey,
                                    "completionPercentage", deptCompletion,
                                    "totalAcknowledged", deptAcked,
                                    "totalAssigned", deptAssigned,
                                    "totalPending", deptPending,
                                    "totalOverdue", deptOverdue
                            )
                    );
                    if (n != null) created++;
                } catch (Exception ex) {
                    failures++;
                    log.warn("Error creating policy digest for managerId={}: {}", manager.getId(), ex.getMessage());
                }
            }

            completeJobLog(
                    jobLog,
                    "COMPLETED",
                    1 + managers.size(),
                    created,
                    failures,
                    "Policy weekly digest completed: " + created + " digests emitted."
            );
        } catch (Exception ex) {
            failures++;
            completeJobLog(
                    jobLog,
                    "FAILED",
                    0,
                    created,
                    failures,
                    "Policy weekly digest failed: " + ex.getMessage()
            );
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("jobName", "POLICY_WEEKLY_DIGEST");
        summary.put("weekKey", weekKey);
        summary.put("digestsCreated", created);
        summary.put("failures", failures);
        return summary;
    }

    private void notifySystemJobFailure(String jobLabel, String periodKey) {
        try {
            notificationService.notifyHrAdmins(
                    "System Alert: " + jobLabel + " Issue",
                    "The scheduled " + jobLabel + " (" + periodKey + ") encountered an unexpected processing issue. Please review system diagnostics.",
                    NotificationType.SYSTEM_ALERT,
                    NotificationPriority.HIGH,
                    "SYSTEM_JOB",
                    periodKey,
                    "/hr",
                    "SYS_JOB_FAIL:" + jobLabel + ":" + periodKey,
                    null
            );
        } catch (Exception ignored) {
        }
    }

    private boolean isPolicyAssignmentCompliant(PolicyAssignment a) {
        if (a == null || a.getPolicyVersion() == null || a.getEmployeeUser() == null) {
            return false;
        }
        if (policyService != null) {
            return policyService.isCompliant(a.getPolicyVersion().getId(), a.getEmployeeUser().getId());
        }
        if (policyAcknowledgementRepository != null) {
            return policyAcknowledgementRepository.existsByPolicyVersionIdAndEmployeeUserId(
                    a.getPolicyVersion().getId(),
                    a.getEmployeeUser().getId()
            );
        }
        return false;
    }

    // Setters and getters for testing and configuration customization
    public void setPolicyAssignmentRepository(PolicyAssignmentRepository repo) { this.policyAssignmentRepository = repo; }
    public void setPolicyAcknowledgementRepository(PolicyAcknowledgementRepository repo) { this.policyAcknowledgementRepository = repo; }
    public void setPolicyService(PolicyService service) { this.policyService = service; }
    public void setDepartmentRepository(DepartmentRepository repo) { this.departmentRepository = repo; }
    public void setPolicyNotificationsEnabled(boolean enabled) { this.policyNotificationsEnabled = enabled; }
    public void setPolicyDueSoonDays(int days) { this.policyDueSoonDays = days; }
    public void setPolicyOverdueInitialDays(int days) { this.policyOverdueInitialDays = days; }
    public void setPolicyOverdueIntervalDays(int days) { this.policyOverdueIntervalDays = days; }
    public void setPolicyEscalationManagerDays(int days) { this.policyEscalationManagerDays = days; }
    public void setPolicyEscalationHrDays(int days) { this.policyEscalationHrDays = days; }
    public void setRemindOnLeave(boolean remindOnLeave) { this.remindOnLeave = remindOnLeave; }
}
