package com.fairmacs.lms.repository;

import com.fairmacs.lms.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
     * Check if a notification with a given deduplication key already exists.
     */
    boolean existsByDeduplicationKey(String deduplicationKey);

    Optional<Notification> findByDeduplicationKey(String deduplicationKey);

    /*
     * Paginated and filtered notification query for a specific user.
     */
    @Query("""
        SELECT n
        FROM Notification n
        WHERE n.recipient.id = :userId
          AND (:read IS NULL OR n.read = :read)
          AND (:type IS NULL OR :type = '' OR UPPER(n.type) = UPPER(:type))
          AND (:priority IS NULL OR :priority = '' OR UPPER(n.priority) = UPPER(:priority))
          AND (
              :search IS NULL OR :search = ''
              OR LOWER(n.title) LIKE LOWER(CONCAT('%', :search, '%'))
              OR LOWER(n.message) LIKE LOWER(CONCAT('%', :search, '%'))
          )
        ORDER BY n.createdAt DESC, n.id DESC
    """)
    Page<Notification> findFilteredNotifications(
            @Param("userId") Long userId,
            @Param("read") Boolean read,
            @Param("type") String type,
            @Param("priority") String priority,
            @Param("search") String search,
            Pageable pageable
    );

    /*
     * Find pending/failed email notifications eligible for retry when email channel is enabled.
     */
    @Query("""
        SELECT n
        FROM Notification n
        JOIN FETCH n.recipient
        WHERE n.emailStatus IN :statuses
          AND (n.emailAttempts IS NULL OR n.emailAttempts < :maxAttempts)
        ORDER BY n.createdAt ASC
    """)
    List<Notification> findNotificationsEligibleForEmailDelivery(
            @Param("statuses") List<String> statuses,
            @Param("maxAttempts") int maxAttempts,
            Pageable pageable
    );

    /*
     * Count notifications by email status for HR diagnostics.
     */
    long countByEmailStatus(String emailStatus);

    /*
     * Atomically claim a pending or failed notification for email delivery.
     * Guarantees that only one concurrent worker can transition the record to PROCESSING.
     */
    @Modifying
    @Query("""
        UPDATE Notification n
        SET n.emailStatus = 'PROCESSING',
            n.emailLastAttemptAt = :attemptTime
        WHERE n.id = :id
          AND n.emailStatus IN :allowedStatuses
    """)
    int claimNotificationForEmailDelivery(
            @Param("id") Long id,
            @Param("attemptTime") java.time.LocalDateTime attemptTime,
            @Param("allowedStatuses") List<String> allowedStatuses
    );

    /*
     * Mark all notifications belonging to a user as read.
     */
    @Modifying
    @Query("""
        UPDATE Notification n
        SET n.read = true,
            n.readAt = CURRENT_TIMESTAMP
        WHERE n.recipient.id = :userId
          AND n.read = false
    """)
    int markAllAsRead(@Param("userId") Long userId);
}
