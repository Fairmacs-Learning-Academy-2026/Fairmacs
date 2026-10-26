package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
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
     * TRAINING_DUE_SOON
     * TRAINING_OVERDUE
     * ASSESSMENT_RESULT
     * COURSE_COMPLETED
     * CERTIFICATE_ISSUED
     * ANNOUNCEMENT
     */
    @Column(nullable = false)
    private String type;

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
        this.read = false;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (read == null) {
            read = false;
        }
    }

    public Long getId() {
        return id;
    }

    public User getRecipient() {
        return recipient;
    }

    public void setRecipient(User recipient) {
        this.recipient = recipient;
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

    public LocalDateTime getReadAt() {
        return readAt;
    }
}