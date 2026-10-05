package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.Notification;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.NotificationRepository;
import com.fairmacs.lms.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    /*
     * Get all notifications for a user.
     */
    @Transactional(readOnly = true)
    public List<Notification> getUserNotifications(Long userId) {

        return notificationRepository
                .findByRecipientIdOrderByCreatedAtDesc(userId);
    }

    /*
     * Get only unread notifications.
     */
    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotifications(Long userId) {

        return notificationRepository
                .findByRecipientIdAndReadFalseOrderByCreatedAtDesc(userId);
    }

    /*
     * Get unread notification count.
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {

        return notificationRepository
                .countByRecipientIdAndReadFalse(userId);
    }

    /*
     * Mark one notification as read.
     *
     * The notification must belong to the logged-in user.
     */
    @Transactional
    public Notification markAsRead(
            Long notificationId,
            Long userId
    ) {

        Notification notification =
                notificationRepository
                        .findByIdAndRecipientId(
                                notificationId,
                                userId
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Notification not found"
                                )
                        );

        notification.setRead(true);

        return notificationRepository.save(notification);
    }

    /*
     * Mark all notifications as read.
     */
    @Transactional
    public int markAllAsRead(Long userId) {

        return notificationRepository.markAllAsRead(userId);
    }

    /*
     * Create a notification for a specific user.
     */
    @Transactional
    public Notification createNotification(
            Long recipientUserId,
            String title,
            String message,
            String type,
            String referenceType,
            String referenceId
    ) {

        User recipient = userRepository
                .findById(recipientUserId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Recipient user not found"
                        )
                );

        Notification notification = new Notification(
                recipient,
                title,
                message,
                type
        );

        notification.setReferenceType(referenceType);
        notification.setReferenceId(referenceId);

        return notificationRepository.save(notification);
    }

    /*
     * Simple notification creator when there is
     * no related course/assessment/etc.
     */
    @Transactional
    public Notification createNotification(
            Long recipientUserId,
            String title,
            String message,
            String type
    ) {

        return createNotification(
                recipientUserId,
                title,
                message,
                type,
                null,
                null
        );
    }
}