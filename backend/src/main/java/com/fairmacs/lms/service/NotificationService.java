package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.NotificationResponse;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.NotificationJobLogRepository;
import com.fairmacs.lms.repository.NotificationRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.service.notification.NotificationChannel;
import com.fairmacs.lms.service.notification.NotificationEmailProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final List<NotificationChannel> channels;
    private final NotificationEmailProperties emailProperties;
    private final NotificationJobLogRepository jobLogRepository;
    private final ObjectMapper objectMapper;

    /**
     * Backward-compatible constructor for unit tests.
     */
    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository
    ) {
        this(
                notificationRepository,
                userRepository,
                Collections.emptyList(),
                new NotificationEmailProperties(),
                null,
                new ObjectMapper()
        );
    }

    @Autowired
    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            List<NotificationChannel> channels,
            NotificationEmailProperties emailProperties,
            NotificationJobLogRepository jobLogRepository,
            ObjectMapper objectMapper
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.channels = channels != null ? channels : Collections.emptyList();
        this.emailProperties = emailProperties != null ? emailProperties : new NotificationEmailProperties();
        this.jobLogRepository = jobLogRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    /*
     * Get all notifications for a user.
     */
    @Transactional(readOnly = true)
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
    }

    /*
     * Get filtered notifications list (supports optional filtering & pagination parameters).
     */
    @Transactional(readOnly = true)
    public List<Notification> getFilteredNotificationsList(
            Long userId,
            Boolean read,
            String type,
            String priority,
            String search,
            Integer page,
            Integer size
    ) {
        boolean hasFilter = read != null
                || (type != null && !type.isBlank())
                || (priority != null && !priority.isBlank())
                || (search != null && !search.isBlank())
                || page != null
                || size != null;

        if (!hasFilter) {
            return getUserNotifications(userId);
        }

        int safePage = (page != null && page >= 0) ? page : 0;
        int safeSize = (size != null && size > 0 && size <= 200) ? size : 50;
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<Notification> result = notificationRepository.findFilteredNotifications(
                userId,
                read,
                normalizeFilter(type),
                normalizeFilter(priority),
                search != null ? search.trim() : null,
                pageable
        );
        return result.getContent();
    }

    /*
     * Get paginated notifications with metadata for the Notification Centre page.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getNotificationsPage(
            Long userId,
            Boolean read,
            String type,
            String priority,
            String search,
            int page,
            int size
    ) {
        int safePage = Math.max(0, page);
        int safeSize = (size > 0 && size <= 100) ? size : 20;
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<Notification> notificationPage = notificationRepository.findFilteredNotifications(
                userId,
                read,
                normalizeFilter(type),
                normalizeFilter(priority),
                search != null ? search.trim() : null,
                pageable
        );

        long unreadCount = getUnreadCount(userId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", notificationPage.getContent());
        response.put("page", notificationPage.getNumber());
        response.put("size", notificationPage.getSize());
        response.put("totalElements", notificationPage.getTotalElements());
        response.put("totalPages", notificationPage.getTotalPages());
        response.put("hasNext", notificationPage.hasNext());
        response.put("hasPrevious", notificationPage.hasPrevious());
        response.put("unreadCount", unreadCount);
        return response;
    }

    /*
     * Get only unread notifications.
     */
    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByRecipientIdAndReadFalseOrderByCreatedAtDesc(userId);
    }

    /*
     * Get unread notification count (guaranteed non-negative).
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        long count = notificationRepository.countByRecipientIdAndReadFalse(userId);
        return Math.max(0L, count);
    }

    /*
     * Mark one notification as read.
     * The notification must belong to the logged-in user.
     */
    @Transactional
    public Notification markAsRead(
            Long notificationId,
            Long userId
    ) {
        Notification notification = notificationRepository
                .findByIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!Boolean.TRUE.equals(notification.getRead())) {
            notification.setRead(true);
            return notificationRepository.save(notification);
        }

        return notification;
    }

    /*
     * Mark one notification as read and return consumer-safe NotificationResponse DTO.
     */
    @Transactional
    public NotificationResponse markAsReadResponse(
            Long notificationId,
            Long userId
    ) {
        Notification updated = markAsRead(notificationId, userId);
        return NotificationResponse.fromEntity(updated);
    }

    /*
     * Dismiss (delete) one notification belonging to the user.
     * Enforces recipient ownership validation: rejects cross-user dismiss.
     */
    @Transactional
    public void dismissNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository
                .findByIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        notificationRepository.delete(notification);
    }

    /*
     * Get filtered notifications list as consumer-safe DTOs.
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getFilteredNotificationResponsesList(
            Long userId,
            Boolean read,
            String type,
            String priority,
            String search,
            Integer page,
            Integer size
    ) {
        List<Notification> entities = getFilteredNotificationsList(
                userId,
                read,
                type,
                priority,
                search,
                page,
                size
        );
        return entities.stream().map(NotificationResponse::fromEntity).toList();
    }

    /*
     * Get paginated notifications for Notification Centre as consumer-safe DTOs.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getNotificationResponsesPage(
            Long userId,
            Boolean read,
            String type,
            String priority,
            String search,
            int page,
            int size
    ) {
        Map<String, Object> pageData = getNotificationsPage(
                userId,
                read,
                type,
                priority,
                search,
                page,
                size
        );
        @SuppressWarnings("unchecked")
        List<Notification> entities = (List<Notification>) pageData.get("content");
        List<NotificationResponse> dtos = entities != null
                ? entities.stream().map(NotificationResponse::fromEntity).toList()
                : Collections.emptyList();

        Map<String, Object> response = new LinkedHashMap<>(pageData);
        response.put("content", dtos);
        return response;
    }

    /*
     * Get unread notifications as consumer-safe DTOs.
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotificationResponses(Long userId) {
        return getUnreadNotifications(userId).stream()
                .map(NotificationResponse::fromEntity)
                .toList();
    }

    /*
     * Mark all notifications as read.
     */
    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllAsRead(userId);
    }

    /*
     * Create a notification for a specific user (backward-compatible signature).
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
        return createNotification(
                recipientUserId,
                title,
                message,
                type,
                NotificationPriority.NORMAL,
                referenceType,
                referenceId,
                null,
                null,
                null
        );
    }

    /*
     * Simple notification creator when there is no related course/assessment/etc.
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
                NotificationPriority.NORMAL,
                null,
                null,
                null,
                null,
                null
        );
    }

    /*
     * Full-featured notification creator with priority, actionUrl, deduplicationKey, and metadata.
     */
    @Transactional
    public Notification createNotification(
            Long recipientUserId,
            String title,
            String message,
            String type,
            String priority,
            String referenceType,
            String referenceId,
            String actionUrl,
            String deduplicationKey,
            Map<String, Object> metadata
    ) {
        if (recipientUserId == null) {
            return null;
        }

        String normalizedDedupKey = (deduplicationKey != null && !deduplicationKey.isBlank())
                ? deduplicationKey.trim()
                : null;

        if (normalizedDedupKey != null && notificationRepository.existsByDeduplicationKey(normalizedDedupKey)) {
            log.debug("Skipping duplicate notification for deduplicationKey={}", normalizedDedupKey);
            return notificationRepository.findByDeduplicationKey(normalizedDedupKey).orElse(null);
        }

        User recipient = userRepository
                .findById(recipientUserId)
                .orElseThrow(() -> new RuntimeException("Recipient user not found"));

        // Skip inactive or terminated users so stale accounts do not receive notifications
        if (recipient.getStatus() != null
                && (recipient.getStatus() == UserStatus.INACTIVE || recipient.getStatus() == UserStatus.TERMINATED)) {
            log.debug("Skipping notification for inactive/terminated userId={}", recipientUserId);
            return null;
        }

        Notification notification = new Notification(
                recipient,
                sanitizeText(title, "LMS Notification"),
                sanitizeText(message, ""),
                (type != null && !type.isBlank()) ? type.trim().toUpperCase() : NotificationType.GENERAL_ANNOUNCEMENT
        );

        notification.setPriority(resolvePriority(priority, notification.getType()));
        notification.setReferenceType(referenceType);
        notification.setReferenceId(referenceId);
        notification.setActionUrl(resolveActionUrl(actionUrl, notification.getType(), referenceType, referenceId));
        notification.setDeduplicationKey(normalizedDedupKey);
        notification.setEmailStatus(emailProperties.isEnabled() ? "PENDING" : "DISABLED");
        notification.setEmailAttempts(0);

        if (metadata != null && !metadata.isEmpty()) {
            try {
                notification.setMetadataJson(objectMapper.writeValueAsString(metadata));
            } catch (Exception ex) {
                log.debug("Failed to serialize notification metadata: {}", ex.getMessage());
            }
        }

        Notification saved;
        try {
            saved = notificationRepository.save(notification);
        } catch (DataIntegrityViolationException dupEx) {
            if (normalizedDedupKey != null) {
                log.debug("Concurrent duplicate prevented for deduplicationKey={}", normalizedDedupKey);
                return notificationRepository.findByDeduplicationKey(normalizedDedupKey).orElse(null);
            }
            throw dupEx;
        }

        dispatchToChannels(saved);
        return saved;
    }

    /**
     * Safe non-throwing wrapper for emitting notifications from LMS business workflows
     * so notification issues never break primary user actions.
     */
    @Transactional
    public Notification createNotificationSafely(
            Long recipientUserId,
            String title,
            String message,
            String type,
            String priority,
            String referenceType,
            String referenceId,
            String actionUrl,
            String deduplicationKey,
            Map<String, Object> metadata
    ) {
        try {
            return createNotification(
                    recipientUserId,
                    title,
                    message,
                    type,
                    priority,
                    referenceType,
                    referenceId,
                    actionUrl,
                    deduplicationKey,
                    metadata
            );
        } catch (Exception ex) {
            log.error(
                    "Non-fatal error creating notification [type={}, recipientUserId={}]: {}",
                    type,
                    recipientUserId,
                    ex.getMessage()
            );
            return null;
        }
    }

    /**
     * Checks whether a notification with the given deduplication key has already been persisted.
     */
    @Transactional(readOnly = true)
    public boolean isDeduplicationKeyPresent(String deduplicationKey) {
        if (deduplicationKey == null || deduplicationKey.isBlank()) {
            return false;
        }
        return notificationRepository.existsByDeduplicationKey(deduplicationKey.trim());
    }

    /**
     * Notify all active Managers belonging to a specific department.
     */
    @Transactional
    public int notifyDepartmentManagers(
            String department,
            String title,
            String message,
            String type,
            String priority,
            String referenceType,
            String referenceId,
            String actionUrl,
            String deduplicationKeyPrefix,
            Map<String, Object> metadata
    ) {
        if (department == null || department.isBlank()) {
            return 0;
        }

        List<User> managers = userRepository.findByDepartmentIgnoreCaseAndRole(
                department.trim(),
                Role.MANAGER
        );

        int count = 0;
        for (User manager : managers) {
            if (manager.getStatus() != null && manager.getStatus() != UserStatus.ACTIVE) {
                continue;
            }
            String dedupKey = (deduplicationKeyPrefix != null && !deduplicationKeyPrefix.isBlank())
                    ? deduplicationKeyPrefix + ":MGR:" + manager.getId()
                    : null;
            if (dedupKey != null && isDeduplicationKeyPresent(dedupKey)) {
                continue;
            }

            Notification created = createNotificationSafely(
                    manager.getId(),
                    title,
                    message,
                    type != null ? type : NotificationType.TEAM_COMPLIANCE,
                    priority != null ? priority : NotificationPriority.NORMAL,
                    referenceType,
                    referenceId,
                    actionUrl != null ? actionUrl : "/manager",
                    dedupKey,
                    metadata
            );
            if (created != null) {
                count++;
            }
        }
        return count;
    }

    /**
     * Notify all active HR_ADMIN users across the organization.
     */
    @Transactional
    public int notifyHrAdmins(
            String title,
            String message,
            String type,
            String priority,
            String referenceType,
            String referenceId,
            String actionUrl,
            String deduplicationKeyPrefix,
            Map<String, Object> metadata
    ) {
        List<User> hrAdmins = userRepository.findByRoleAndStatus(Role.HR_ADMIN, UserStatus.ACTIVE);
        if (hrAdmins.isEmpty()) {
            hrAdmins = userRepository.findByRole(Role.HR_ADMIN);
        }

        int count = 0;
        for (User admin : hrAdmins) {
            if (admin.getStatus() != null
                    && (admin.getStatus() == UserStatus.INACTIVE || admin.getStatus() == UserStatus.TERMINATED)) {
                continue;
            }
            String dedupKey = (deduplicationKeyPrefix != null && !deduplicationKeyPrefix.isBlank())
                    ? deduplicationKeyPrefix + ":HR:" + admin.getId()
                    : null;
            if (dedupKey != null && isDeduplicationKeyPresent(dedupKey)) {
                continue;
            }

            Notification created = createNotificationSafely(
                    admin.getId(),
                    title,
                    message,
                    type != null ? type : NotificationType.HR_ADMIN_ALERT,
                    priority != null ? priority : NotificationPriority.NORMAL,
                    referenceType,
                    referenceId,
                    actionUrl != null ? actionUrl : "/hr",
                    dedupKey,
                    metadata
            );
            if (created != null) {
                count++;
            }
        }
        return count;
    }

    /**
     * Overloaded convenience method for notifying HR Admins with standard policy/alert defaults.
     */
    @Transactional
    public int notifyHrAdmins(
            String title,
            String message,
            String type,
            String actionUrl,
            String deduplicationKeyPrefix
    ) {
        return notifyHrAdmins(
                title,
                message,
                type,
                NotificationPriority.NORMAL,
                "POLICY",
                null,
                actionUrl,
                deduplicationKeyPrefix,
                null
        );
    }

    /**
     * Broadcast an organization-wide or department-scoped announcement (HR_ADMIN feature).
     */
    @Transactional
    public int broadcastAnnouncement(
            String title,
            String message,
            String targetDepartment,
            String priority,
            String actionUrl
    ) {
        return broadcastAnnouncement(title, message, targetDepartment, priority, actionUrl, null, null);
    }

    /**
     * Broadcast announcement with optional double-click deduplication key and creator tracking.
     */
    @Transactional
    public int broadcastAnnouncement(
            String title,
            String message,
            String targetDepartment,
            String priority,
            String actionUrl,
            String broadcastRequestId,
            Long broadcastByUserId
    ) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Announcement title is required");
        }
        if (title.trim().length() > 200) {
            throw new IllegalArgumentException("Announcement title cannot exceed 200 characters");
        }
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("Announcement message is required");
        }
        if (message.trim().length() > 2000) {
            throw new IllegalArgumentException("Announcement message cannot exceed 2000 characters");
        }

        String deptKey = (targetDepartment != null && !targetDepartment.isBlank())
                ? targetDepartment.trim()
                : "ALL";

        List<User> recipients;
        if (!"ALL".equalsIgnoreCase(deptKey)) {
            recipients = userRepository.findByDepartmentIgnoreCase(deptKey);
        } else {
            recipients = userRepository.findByStatus(UserStatus.ACTIVE);
            if (recipients.isEmpty()) {
                recipients = userRepository.findAll();
            }
        }

        String resolvedPriority = resolvePriority(priority, NotificationType.GENERAL_ANNOUNCEMENT);
        String safeActionUrl = resolveActionUrl(actionUrl, NotificationType.GENERAL_ANNOUNCEMENT, "ANNOUNCEMENT", deptKey);

        // Deduplication prefix to prevent duplicate broadcasts from double-clicks or retries
        String dedupPrefix;
        if (broadcastRequestId != null && !broadcastRequestId.isBlank()) {
            dedupPrefix = "ANNOUNCEMENT:" + broadcastRequestId.trim();
        } else {
            // Deterministic 1-minute window key based on content hash
            long minuteWindow = System.currentTimeMillis() / 60000L;
            int contentHash = Objects.hash(title.trim(), message.trim(), deptKey);
            dedupPrefix = String.format("ANNOUNCEMENT:HASH:%d:WIN:%d", contentHash, minuteWindow);
        }

        int sent = 0;
        for (User user : recipients) {
            if (user.getStatus() != null
                    && (user.getStatus() == UserStatus.INACTIVE || user.getStatus() == UserStatus.TERMINATED)) {
                continue;
            }

            String userDedupKey = dedupPrefix + ":USR:" + user.getId();
            if (isDeduplicationKeyPresent(userDedupKey)) {
                continue;
            }

            Map<String, Object> metadata = new LinkedHashMap<>();
            metadata.put("targetDepartment", deptKey);
            metadata.put("broadcastAt", LocalDateTime.now().toString());
            if (broadcastByUserId != null) {
                metadata.put("broadcastByUserId", broadcastByUserId);
            }

            Notification n = createNotificationSafely(
                    user.getId(),
                    title.trim(),
                    message.trim(),
                    NotificationType.GENERAL_ANNOUNCEMENT,
                    resolvedPriority,
                    "ANNOUNCEMENT",
                    deptKey,
                    safeActionUrl,
                    userDedupKey,
                    metadata
            );
            if (n != null) {
                sent++;
            }
        }
        return sent;
    }

    /**
     * Return operational diagnostics for HR_ADMIN without exposing secrets.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getSystemDiagnostics() {
        Map<String, Object> diagnostics = new LinkedHashMap<>();
        diagnostics.put("inAppChannelEnabled", true);
        diagnostics.put("emailChannelEnabled", emailProperties.isEnabled());
        diagnostics.put("emailProvider", "Zoho ZeptoMail API (Disabled by default)");
        diagnostics.put("emailFromAddress", emailProperties.getFromAddress());
        diagnostics.put("emailFromName", emailProperties.getFromName());
        diagnostics.put("emailMaxRetries", emailProperties.getMaxRetries());
        diagnostics.put("totalInAppNotifications", notificationRepository.count());
        diagnostics.put("emailPendingCount", notificationRepository.countByEmailStatus("PENDING"));
        diagnostics.put("emailProcessingCount", notificationRepository.countByEmailStatus("PROCESSING"));
        diagnostics.put("emailSentCount", notificationRepository.countByEmailStatus("SENT"));
        diagnostics.put("emailFailedCount", notificationRepository.countByEmailStatus("FAILED"));
        diagnostics.put("emailPermanentlyFailedCount", notificationRepository.countByEmailStatus("PERMANENTLY_FAILED"));
        diagnostics.put("emailDisabledCount", notificationRepository.countByEmailStatus("DISABLED"));
        diagnostics.put("emailSkippedCount", notificationRepository.countByEmailStatus("SKIPPED"));
        diagnostics.put("recentJobLogs", jobLogRepository != null
                ? jobLogRepository.findTop20ByOrderByStartedAtDesc()
                : Collections.emptyList());
        return diagnostics;
    }

    private void dispatchToChannels(Notification notification) {
        if (channels == null || channels.isEmpty()) {
            return;
        }
        for (NotificationChannel channel : channels) {
            try {
                if (channel.isEnabled()) {
                    channel.deliver(notification);
                }
            } catch (Exception ex) {
                log.warn(
                        "Notification channel {} failed for notificationId={}: {}",
                        channel.getChannelName(),
                        notification.getId(),
                        ex.getMessage()
                );
            }
        }
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value.trim())) {
            return null;
        }
        return value.trim();
    }

    private String sanitizeText(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        // Strip any accidental stack trace frames if passed into message
        String cleaned = value.replaceAll("(?m)^\\s*at\\s+[a-zA-Z0-9_$.]+\\([^)]*\\)\\s*$", "").trim();
        return cleaned.isEmpty() ? fallback : cleaned;
    }

    private String resolvePriority(String requestedPriority, String type) {
        if (requestedPriority != null && !requestedPriority.isBlank()) {
            String upper = requestedPriority.trim().toUpperCase();
            if (NotificationPriority.LOW.equals(upper)
                    || NotificationPriority.NORMAL.equals(upper)
                    || NotificationPriority.HIGH.equals(upper)
                    || NotificationPriority.CRITICAL.equals(upper)) {
                return upper;
            }
        }
        if (type == null) {
            return NotificationPriority.NORMAL;
        }
        return switch (type.toUpperCase()) {
            case NotificationType.COURSE_OVERDUE,
                 NotificationType.SYSTEM_ALERT -> NotificationPriority.HIGH;
            default -> NotificationPriority.NORMAL;
        };
    }

    private String resolveActionUrl(
            String explicitUrl,
            String type,
            String referenceType,
            String referenceId
    ) {
        if (explicitUrl != null && !explicitUrl.isBlank()) {
            String trimmed = explicitUrl.trim();
            // Sanitize against open redirects: reject external schemes, protocol-relative '//', or malicious schemes
            if (trimmed.startsWith("/")
                    && !trimmed.startsWith("//")
                    && !trimmed.toLowerCase().startsWith("/http:")
                    && !trimmed.toLowerCase().startsWith("/https:")
                    && !trimmed.toLowerCase().contains("javascript:")
                    && !trimmed.toLowerCase().contains("data:")) {
                return trimmed.replaceAll("/+", "/");
            }
        }
        if (type == null) {
            return "/notifications";
        }
        return switch (type.toUpperCase()) {
            case NotificationType.COURSE_ASSIGNED,
                 NotificationType.MODULE_COMPLETED,
                 NotificationType.QUIZ_AVAILABLE,
                 NotificationType.RETAKE_AVAILABLE -> {
                if (referenceId != null && !referenceId.isBlank() && "COURSE_CODE".equalsIgnoreCase(referenceType)) {
                    yield "/courses/" + referenceId + "/learn";
                }
                yield "/progress";
            }
            case NotificationType.CERTIFICATE_ISSUED -> "/certificates";
            case NotificationType.COURSE_DUE_SOON,
                 NotificationType.COURSE_OVERDUE,
                 NotificationType.COURSE_COMPLETED,
                 NotificationType.ASSESSMENT_RESULT,
                 NotificationType.ASSESSMENT_FAILED,
                 NotificationType.ASSIGNMENT_REVOKED,
                 NotificationType.DEADLINE_CHANGED,
                 NotificationType.COURSE_CANCELLED -> "/progress";
            case NotificationType.TEAM_COMPLIANCE -> "/manager";
            case NotificationType.TRAINER_ACTION_REQUIRED -> "/trainer";
            case NotificationType.HR_ADMIN_ALERT,
                 NotificationType.SYSTEM_ALERT -> "/hr";
            default -> "/notifications";
        };
    }
}
