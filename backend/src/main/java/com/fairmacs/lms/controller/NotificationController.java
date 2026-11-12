package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.NotificationResponse;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.NotificationSchedulerService;
import com.fairmacs.lms.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final SecurityContextUtil securityContextUtil;
    private final NotificationSchedulerService schedulerService;

    public NotificationController(
            NotificationService notificationService,
            SecurityContextUtil securityContextUtil
    ) {
        this(notificationService, securityContextUtil, null);
    }

    @Autowired
    public NotificationController(
            NotificationService notificationService,
            SecurityContextUtil securityContextUtil,
            NotificationSchedulerService schedulerService
    ) {
        this.notificationService = notificationService;
        this.securityContextUtil = securityContextUtil;
        this.schedulerService = schedulerService;
    }

    /*
     * Get notifications for the logged-in user (supports optional filtering & pagination params).
     */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @RequestParam(required = false) Boolean read,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        Long userId = securityContextUtil.getCurrentUserId();

        if (page != null && page < 0) {
            throw new IllegalArgumentException("Page index cannot be negative");
        }
        if (size != null && (size <= 0 || size > 100)) {
            throw new IllegalArgumentException("Page size must be between 1 and 100");
        }
        if (search != null && search.trim().length() > 200) {
            throw new IllegalArgumentException("Search query cannot exceed 200 characters");
        }

        return ResponseEntity.ok(
                notificationService.getFilteredNotificationResponsesList(
                        userId,
                        read,
                        type,
                        priority,
                        search,
                        page,
                        size
                )
        );
    }

    /*
     * Get paginated notifications with metadata for the full Notification Centre page.
     */
    @GetMapping("/page")
    public ResponseEntity<Map<String, Object>> getNotificationsPage(
            @RequestParam(required = false) Boolean read,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Long userId = securityContextUtil.getCurrentUserId();

        if (page < 0) {
            throw new IllegalArgumentException("Page index cannot be negative");
        }
        if (size <= 0 || size > 100) {
            throw new IllegalArgumentException("Page size must be between 1 and 100");
        }
        if (search != null && search.trim().length() > 200) {
            throw new IllegalArgumentException("Search query cannot exceed 200 characters");
        }

        return ResponseEntity.ok(
                notificationService.getNotificationResponsesPage(
                        userId,
                        read,
                        type,
                        priority,
                        search,
                        page,
                        size
                )
        );
    }

    /*
     * Get unread notifications for the logged-in user.
     */
    @GetMapping("/unread")
    public ResponseEntity<List<NotificationResponse>> getUnreadNotifications() {
        Long userId = securityContextUtil.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.getUnreadNotificationResponses(userId)
        );
    }

    /*
     * Get unread notification count (supports both /unread/count and /unread-count).
     */
    @GetMapping({"/unread/count", "/unread-count"})
    public ResponseEntity<Long> getUnreadCount() {
        Long userId = securityContextUtil.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.getUnreadCount(userId)
        );
    }

    /*
     * Mark one notification belonging to the logged-in user as read.
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long id
    ) {
        Long userId = securityContextUtil.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.markAsReadResponse(id, userId)
        );
    }

    /*
     * Mark all notifications belonging to the logged-in user as read.
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Integer> markAllAsRead() {
        Long userId = securityContextUtil.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.markAllAsRead(userId)
        );
    }

    /*
     * HR Admin: Broadcast an organization-wide or department-specific announcement.
     */
    @PostMapping("/announcements")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> broadcastAnnouncement(
            @RequestBody Map<String, String> payload
    ) {
        if (payload == null || payload.isEmpty()) {
            throw new IllegalArgumentException("Announcement request body is required");
        }
        String title = payload.get("title");
        String message = payload.get("message");
        String department = payload.get("department");
        String priority = payload.get("priority");
        String actionUrl = payload.get("actionUrl");
        String broadcastRequestId = payload.get("broadcastRequestId");

        Long currentUserId = securityContextUtil.getCurrentUserId();

        int deliveredCount = notificationService.broadcastAnnouncement(
                title,
                message,
                department,
                priority,
                actionUrl,
                broadcastRequestId,
                currentUserId
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "SENT");
        response.put("recipientsCount", deliveredCount);
        response.put("targetDepartment", department != null && !department.isBlank() ? department : "ALL");
        return ResponseEntity.ok(response);
    }

    /*
     * HR Admin: Trigger deadline & overdue reminder scan on demand.
     */
    @PostMapping("/admin/run-reminders")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> runRemindersNow() {
        if (schedulerService == null) {
            return ResponseEntity.ok(Map.of("status", "SCHEDULER_UNAVAILABLE"));
        }
        return ResponseEntity.ok(
                schedulerService.processDeadlineAndOverdueReminders(LocalDate.now(), true)
        );
    }

    /*
     * HR Admin: Trigger weekly Manager & HR compliance digests on demand.
     */
    @PostMapping("/admin/run-digest")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> runComplianceDigestNow() {
        if (schedulerService == null) {
            return ResponseEntity.ok(Map.of("status", "SCHEDULER_UNAVAILABLE"));
        }
        return ResponseEntity.ok(
                schedulerService.processWeeklyComplianceDigests(LocalDate.now(), true)
        );
    }

    /*
     * HR Admin: Inspect notification system status and recent scheduled job logs.
     */
    @GetMapping("/admin/diagnostics")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> getDiagnostics() {
        return ResponseEntity.ok(notificationService.getSystemDiagnostics());
    }
}
