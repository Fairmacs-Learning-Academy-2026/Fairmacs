package com.fairmacs.lms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(name = "idx_notifications_recipient_created", columnList = "recipient_user_id, created_at DESC"),
                @Index(name = "idx_notifications_recipient_read", columnList = "recipient_user_id, is_read"),
                @Index(name = "idx_notifications_dedup_key", columnList = "deduplication_key", unique = true)
        }
)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * User who should receive this notification.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_user_id", nullable = false)
    private User recipient;

    /*
     * Short notification heading.
     */
    @Column(nullable = false)
    private String title;

    /*
     * Full notification message.
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /*
     * Notification category.
     *
     * Examples:
     * COURSE_ASSIGNED
     * COURSE_DUE_SOON
     * COURSE_OVERDUE
     * COURSE_COMPLETED
     * MODULE_COMPLETED
     * QUIZ_AVAILABLE
     * ASSESSMENT_RESULT
     * ASSESSMENT_FAILED
     * RETAKE_AVAILABLE
     * CERTIFICATE_ISSUED
     * COURSE_CANCELLED
     * ASSIGNMENT_REVOKED
     * DEADLINE_CHANGED
     * TRAINER_ACTION_REQUIRED
     * TEAM_COMPLIANCE
     * HR_ADMIN_ALERT
     * SYSTEM_ALERT
     * GENERAL_ANNOUNCEMENT
     */
    @Column(nullable = false)
    private String type;

    /*
     * Notification priority: LOW, NORMAL, HIGH, CRITICAL
     */
    @Column(name = "priority", nullable = false, length = 32)
    private String priority = NotificationPriority.NORMAL;

    /*
     * Optional reference to the object related
     * to this notification.
     *
     * Example:
     * referenceType = "COURSE"
     * referenceId = "12"
     */
    @Column(name = "reference_type")
    private String referenceType;

    @Column(name = "reference_id")
    private String referenceId;

    /*
     * Direct internal navigation path in the LMS frontend
     * (e.g. "/courses/CRS-101/learn", "/certificates", "/progress").
     */
    @Column(name = "action_url", length = 512)
    private String actionUrl;

    /*
     * Optional idempotency / deduplication key to prevent duplicate notifications
     * across retries, overlapping assignments, and scheduled reminder runs.
     */
    @Column(name = "deduplication_key", unique = true)
    private String deduplicationKey;

    /*
     * Optional structured metadata JSON string (course code, score, due date, etc.).
     */
    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    /*
     * Whether the user has opened/read it.
     */
    @Column(name = "is_read", nullable = false)
    private Boolean read = false;

    /*
     * When the notification was created.
     */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /*
     * When the notification was read.
     */
    @Column(name = "read_at")
    private LocalDateTime readAt;

    /*
     * Email delivery state tracking (DISABLED, PENDING, SENT, FAILED, SKIPPED).
     */
    @Column(name = "email_status", length = 32)
    private String emailStatus = "DISABLED";

    @Column(name = "email_attempts")
    private Integer emailAttempts = 0;

    @Column(name = "email_last_attempt_at")
    private LocalDateTime emailLastAttemptAt;

    @Column(name = "email_error", columnDefinition = "TEXT")
    private String emailError;

    public Notification() {
    }

    public Notification(
            User recipient,
            String title,
            String message,
            String type
    ) {
        this.recipient = recipient;
        this.title = title;
        this.message = message;
        this.type = type;
        this.priority = NotificationPriority.NORMAL;
        this.read = false;
        this.createdAt = LocalDateTime.now();
        this.emailStatus = "DISABLED";
        this.emailAttempts = 0;
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (read == null) {
            read = false;
        }
        if (priority == null || priority.isBlank()) {
            priority = NotificationPriority.NORMAL;
        }
        if (emailStatus == null || emailStatus.isBlank()) {
            emailStatus = "DISABLED";
        }
        if (emailAttempts == null) {
            emailAttempts = 0;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @JsonIgnore
    public User getRecipient() {
        return recipient;
    }

    public void setRecipient(User recipient) {
        this.recipient = recipient;
    }

    public Long getRecipientUserId() {
        return recipient != null ? recipient.getId() : null;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getPriority() {
        return priority != null ? priority : NotificationPriority.NORMAL;
    }

    public void setPriority(String priority) {
        this.priority = (priority != null && !priority.isBlank()) ? priority : NotificationPriority.NORMAL;
    }

    public String getReferenceType() {
        return referenceType;
    }

    public void setReferenceType(String referenceType) {
        this.referenceType = referenceType;
    }

    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    public String getActionUrl() {
        return actionUrl;
    }

    public void setActionUrl(String actionUrl) {
        this.actionUrl = actionUrl;
    }

    public String getDeduplicationKey() {
        return deduplicationKey;
    }

    public void setDeduplicationKey(String deduplicationKey) {
        this.deduplicationKey = deduplicationKey;
    }

    public String getMetadataJson() {
        return metadataJson;
    }

    public void setMetadataJson(String metadataJson) {
        this.metadataJson = metadataJson;
    }

    public Boolean getRead() {
        return read;
    }

    public void setRead(Boolean read) {
        this.read = read;

        if (Boolean.TRUE.equals(read) && readAt == null) {
            readAt = LocalDateTime.now();
        }
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
    }

    public String getEmailStatus() {
        return emailStatus;
    }

    public void setEmailStatus(String emailStatus) {
        this.emailStatus = emailStatus;
    }

    public Integer getEmailAttempts() {
        return emailAttempts;
    }

    public void setEmailAttempts(Integer emailAttempts) {
        this.emailAttempts = emailAttempts;
    }

    public LocalDateTime getEmailLastAttemptAt() {
        return emailLastAttemptAt;
    }

    public void setEmailLastAttemptAt(LocalDateTime emailLastAttemptAt) {
        this.emailLastAttemptAt = emailLastAttemptAt;
    }

    public String getEmailError() {
        return emailError;
    }

    public void setEmailError(String emailError) {
        this.emailError = emailError;
    }
}
