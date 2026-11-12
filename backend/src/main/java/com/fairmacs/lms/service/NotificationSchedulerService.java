package com.fairmacs.lms.service;

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
        processPolicyDeadlineReminders(currentLocalDate(), false);
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
     * Weekly compliance digest for Department Managers and HR Admins.
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

        // On Mondays, check if weekly compliance digest was missed
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
     * Evaluates active policy assignments with due dates and emits due-soon and overdue notifications.
     * Note: Assignments without a due date (open-ended) are strictly ignored and never flagged as overdue.
     */
    public Map<String, Object> processPolicyDeadlineReminders(LocalDate referenceDate, boolean manualTrigger) {
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
            // Find all active policy assignments that have an explicit due date (strictly ignore null due dates!)
            LocalDate dueIn5Days = today.plusDays(5);
            LocalDate dueIn2Days = today.plusDays(2);

            // 1. Due in 5 days
            List<PolicyAssignment> dueSoon5 = policyAssignmentRepository.findActiveAssignmentsDueOn(dueIn5Days);
            for (PolicyAssignment a : dueSoon5) {
                processed++;
                try {
                    boolean acked = policyAcknowledgementRepository.existsByPolicyVersionIdAndEmployeeUserId(
                            a.getPolicyVersion().getId(),
                            a.getEmployeeUser().getId()
                    );
                    if (!acked) {
                        String title = "Policy Due Soon: " + a.getPolicyDocument().getTitle();
                        String message = "The policy \"" + a.getPolicyDocument().getTitle() + "\" is due for acknowledgement in 5 days (" + a.getDueDate() + ").";
                        String dedupKey = "policy-due-5d:" + a.getId();

                        Notification n = notificationService.createNotification(
                                a.getEmployeeUser().getId(),
                                title,
                                message,
                                NotificationType.POLICY_DUE_SOON,
                                "NORMAL",
                                "POLICY",
                                a.getPolicyDocument().getId().toString(),
                                "/profile#policies",
                                dedupKey,
                                Map.of("policyId", a.getPolicyDocument().getId(), "dueDate", a.getDueDate().toString())
                        );
                        if (n != null) created++;
                    }
                } catch (Exception ex) {
                    failures++;
                    log.warn("Error sending 5-day policy reminder for assignmentId={}: {}", a.getId(), ex.getMessage());
                }
            }

            // 2. Due in 2 days
            List<PolicyAssignment> dueSoon2 = policyAssignmentRepository.findActiveAssignmentsDueOn(dueIn2Days);
            for (PolicyAssignment a : dueSoon2) {
                processed++;
                try {
                    boolean acked = policyAcknowledgementRepository.existsByPolicyVersionIdAndEmployeeUserId(
                            a.getPolicyVersion().getId(),
                            a.getEmployeeUser().getId()
                    );
                    if (!acked) {
                        String title = "Urgent: Policy Due Soon - " + a.getPolicyDocument().getTitle();
                        String message = "The policy \"" + a.getPolicyDocument().getTitle() + "\" is due for acknowledgement in 2 days (" + a.getDueDate() + "). Please review and acknowledge promptly.";
                        String dedupKey = "policy-due-2d:" + a.getId();

                        Notification n = notificationService.createNotification(
                                a.getEmployeeUser().getId(),
                                title,
                                message,
                                NotificationType.POLICY_DUE_SOON,
                                "HIGH",
                                "POLICY",
                                a.getPolicyDocument().getId().toString(),
                                "/profile#policies",
                                dedupKey,
                                Map.of("policyId", a.getPolicyDocument().getId(), "dueDate", a.getDueDate().toString())
                        );
                        if (n != null) created++;
                    }
                } catch (Exception ex) {
                    failures++;
                    log.warn("Error sending 2-day policy reminder for assignmentId={}: {}", a.getId(), ex.getMessage());
                }
            }

            // 3. Overdue assignments (strictly only where dueDate < today, null due dates are NEVER overdue)
            List<PolicyAssignment> overdueList = policyAssignmentRepository.findActiveOverdueAssignments(today);
            for (PolicyAssignment a : overdueList) {
                processed++;
                try {
                    boolean acked = policyAcknowledgementRepository.existsByPolicyVersionIdAndEmployeeUserId(
                            a.getPolicyVersion().getId(),
                            a.getEmployeeUser().getId()
                    );
                    if (!acked) {
                        String title = "Policy Overdue: " + a.getPolicyDocument().getTitle();
                        String message = "The acknowledgement for \"" + a.getPolicyDocument().getTitle() + "\" is overdue since " + a.getDueDate() + ". Please review and submit your acknowledgement.";
                        String dedupKey = "policy-overdue:" + a.getId() + ":" + today;

                        Notification n = notificationService.createNotification(
                                a.getEmployeeUser().getId(),
                                title,
                                message,
                                NotificationType.POLICY_OVERDUE,
                                "HIGH",
                                "POLICY",
                                a.getPolicyDocument().getId().toString(),
                                "/profile#policies",
                                dedupKey,
                                Map.of("policyId", a.getPolicyDocument().getId(), "dueDate", a.getDueDate().toString())
                        );
                        if (n != null) created++;
                    }
                } catch (Exception ex) {
                    failures++;
                    log.warn("Error sending policy overdue reminder for assignmentId={}: {}", a.getId(), ex.getMessage());
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
}
