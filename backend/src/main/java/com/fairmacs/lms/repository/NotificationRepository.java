package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    /*
     * Get all notifications for a particular user.
     * Newest notifications appear first.
     */
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long userId);

    /*
     * Get unread notifications for a user.
     */
    List<Notification> findByRecipientIdAndReadFalseOrderByCreatedAtDesc(
            Long userId
    );

    /*
     * Count unread notifications.
     */
    long countByRecipientIdAndReadFalse(Long userId);

    /*
     * Find a specific notification belonging to a specific user.
     *
     * This is important for security because a user should not
     * be able to mark another user's notification as read.
     */
    Optional<Notification> findByIdAndRecipientId(
            Long id,
            Long userId
    );

    /*
     * Mark all notifications belonging to a user as read.
     */
    @Modifying
    @Query("""
        UPDATE Notification n
        SET n.read = true
        WHERE n.recipient.id = :userId
          AND n.read = false
    """)
    int markAllAsRead(@Param("userId") Long userId);
}