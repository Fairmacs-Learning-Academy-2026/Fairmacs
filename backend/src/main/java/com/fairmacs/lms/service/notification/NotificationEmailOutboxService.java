package com.fairmacs.lms.service.notification;

import com.fairmacs.lms.entity.Notification;
import com.fairmacs.lms.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Asynchronous, durable outbox worker for email delivery.
 *
 * Guarantees:
 * 1. Strictly disabled by default (app.notifications.email.enabled=false).
 * 2. In-app notification creation is completely decoupled from external HTTP calls.
 * 3. HTTP network calls to Zoho ZeptoMail are NEVER executed inside active DB transactions.
 * 4. Concurrent workers cannot double-send: claiming uses atomic DB updates to 'PROCESSING'.
 * 5. Bounded retries with exponential backoff; stops automatically upon reaching max-retries.
 * 6. Email failures never affect or roll back in-app notification records.
 */
@Service
public class NotificationEmailOutboxService {

    private static final Logger log = LoggerFactory.getLogger(NotificationEmailOutboxService.class);

    private final NotificationRepository notificationRepository;
    private final EmailNotificationChannel emailNotificationChannel;
    private final NotificationEmailProperties emailProperties;

    public NotificationEmailOutboxService(
            NotificationRepository notificationRepository,
            EmailNotificationChannel emailNotificationChannel,
            NotificationEmailProperties emailProperties
    ) {
        this.notificationRepository = notificationRepository;
        this.emailNotificationChannel = emailNotificationChannel;
        this.emailProperties = emailProperties;
    }

    /**
     * Periodic background outbox processor.
     * When email is disabled, returns immediately with zero database or network activity.
     */
    @Scheduled(
            fixedDelayString = "${app.notifications.email.poll-interval-ms:30000}",
            initialDelay = 15000
    )
    public void scheduledOutboxPoll() {
        if (!emailProperties.isEnabled()) {
            return;
        }
        processPendingOutbox(50);
    }

    /**
     * Processes a batch of pending/retryable email deliveries.
     *
     * @param maxBatchSize Maximum records to claim in this batch.
     * @return Summary map with counts of processed, sent, and failed items.
     */
    public Map<String, Object> processPendingOutbox(int maxBatchSize) {
        Map<String, Object> summary = new LinkedHashMap<>();
        if (!emailProperties.isEnabled()) {
            summary.put("status", "DISABLED");
            summary.put("processed", 0);
            return summary;
        }

        int limit = Math.max(1, Math.min(maxBatchSize, 100));
        List<Notification> eligible = notificationRepository.findNotificationsEligibleForEmailDelivery(
                List.of("PENDING", "FAILED"),
                emailProperties.getMaxRetries(),
                PageRequest.of(0, limit)
        );

        int claimedCount = 0;
        int sentCount = 0;
        int failedCount = 0;
        int skippedBackoff = 0;

        LocalDateTime now = LocalDateTime.now();

        for (Notification n : eligible) {
            int attempts = n.getEmailAttempts() != null ? n.getEmailAttempts() : 0;
            if (attempts > 0 && n.getEmailLastAttemptAt() != null) {
                long backoffSeconds = calculateBackoffSeconds(attempts);
                long elapsedSeconds = Duration.between(n.getEmailLastAttemptAt(), now).getSeconds();
                if (elapsedSeconds < backoffSeconds) {
                    skippedBackoff++;
                    continue;
                }
            }

            // 1. Atomically claim the notification in a short independent transaction
            boolean claimed = claimNotification(n.getId(), now);
            if (!claimed) {
                // Another concurrent worker claimed this record
                continue;
            }
            claimedCount++;

            // 2. Perform external HTTP network call OUTSIDE of any database transaction
            try {
                emailNotificationChannel.sendEmailForNotification(n);
                recordDeliverySuccess(n.getId());
                sentCount++;
            } catch (Exception ex) {
                failedCount++;
                String safeError = sanitizeError(ex.getMessage());
                recordDeliveryFailure(n.getId(), attempts + 1, safeError);
            }
        }

        summary.put("status", "COMPLETED");
        summary.put("eligibleFound", eligible.size());
        summary.put("claimed", claimedCount);
        summary.put("sent", sentCount);
        summary.put("failed", failedCount);
        summary.put("skippedBackoff", skippedBackoff);
        return summary;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claimNotification(Long notificationId, LocalDateTime attemptTime) {
        try {
            int updated = notificationRepository.claimNotificationForEmailDelivery(
                    notificationId,
                    attemptTime,
                    List.of("PENDING", "FAILED")
            );
            return updated > 0;
        } catch (Exception ex) {
            log.debug("Failed to claim notification {} for delivery: {}", notificationId, ex.getMessage());
            return false;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordDeliverySuccess(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setEmailStatus("SENT");
            n.setEmailError(null);
            notificationRepository.save(n);
            log.info("Email outbox delivery successful for notificationId={}", notificationId);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordDeliveryFailure(Long notificationId, int newAttempts, String safeError) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setEmailAttempts(newAttempts);
            if (newAttempts >= emailProperties.getMaxRetries()) {
                n.setEmailStatus("PERMANENTLY_FAILED");
                log.warn(
                        "Email notificationId={} reached max retries ({}); marked PERMANENTLY_FAILED: {}",
                        notificationId,
                        emailProperties.getMaxRetries(),
                        safeError
                );
            } else {
                n.setEmailStatus("FAILED");
                log.warn(
                        "Email notificationId={} delivery attempt {} failed: {}",
                        notificationId,
                        newAttempts,
                        safeError
                );
            }
            n.setEmailError(safeError);
            notificationRepository.save(n);
        });
    }

    private long calculateBackoffSeconds(int attempts) {
        long base = Math.max(1, emailProperties.getBaseBackoffSeconds());
        // Exponential: base * 2^(attempts - 1), capped at 3600 seconds (1 hour)
        int shift = Math.min(6, Math.max(0, attempts - 1));
        long delay = base * (1L << shift);
        return Math.min(3600, delay);
    }

    private String sanitizeError(String raw) {
        if (raw == null || raw.isBlank()) {
            return "Email delivery error";
        }
        String cleaned = raw.replaceAll("(?i)Zoho-enczapikey\\s+\\S+", "[REDACTED]");
        return cleaned.length() > 300 ? cleaned.substring(0, 300) : cleaned;
    }
}

