package com.fairmacs.lms.controller;

import com.fairmacs.lms.entity.Notification;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin
public class NotificationController {

    private final NotificationService notificationService;
    private final SecurityContextUtil securityContextUtil;

    public NotificationController(
            NotificationService notificationService,
            SecurityContextUtil securityContextUtil
    ) {
        this.notificationService = notificationService;
        this.securityContextUtil = securityContextUtil;
    }

    /*
     * Get all notifications for the logged-in user.
     */
    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications() {

        Long userId = securityContextUtil.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.getUserNotifications(userId)
        );
    }

    /*
     * Get unread notifications.
     */
    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications() {

        Long userId = securityContextUtil.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.getUnreadNotifications(userId)
        );
    }

    /*
     * Get unread notification count.
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Long> getUnreadCount() {

        Long userId = securityContextUtil.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.getUnreadCount(userId)
        );
    }

    /*
     * Mark one notification as read.
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(
            @PathVariable Long id
    ) {

        Long userId = securityContextUtil.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.markAsRead(
                        id,
                        userId
                )
        );
    }

    /*
     * Mark all notifications as read.
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Integer> markAllAsRead() {

        Long userId = securityContextUtil.getCurrentUserId();

        return ResponseEntity.ok(
                notificationService.markAllAsRead(userId)
        );
    }
}