package com.fairmacs.lms.dto;

import com.fairmacs.lms.entity.Notification;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

/**
 * Public response DTO for in-app notifications.
 * Strictly excludes internal fields such as deduplicationKey, metadataJson,
 * recipient user details, email delivery status, and internal provider errors.
 */
public class NotificationResponse {

    private Long id;
    private String title;
    private String message;
    private String type;
    private String priority;
    private String referenceType;
    private String referenceId;
    private String actionUrl;

    @JsonProperty("read")
    private Boolean read;

    @JsonProperty("isRead")
    private Boolean isRead;

    private LocalDateTime createdAt;
    private LocalDateTime readAt;

    public NotificationResponse() {
    }

    public static NotificationResponse fromEntity(Notification entity) {
        if (entity == null) {
            return null;
        }
        NotificationResponse dto = new NotificationResponse();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setMessage(entity.getMessage());
        dto.setType(entity.getType());
        dto.setPriority(entity.getPriority());
        dto.setReferenceType(entity.getReferenceType());
        dto.setReferenceId(entity.getReferenceId());
        dto.setActionUrl(entity.getActionUrl());

        boolean isReadValue = Boolean.TRUE.equals(entity.getRead());
        dto.setRead(isReadValue);
        dto.setIsRead(isReadValue);

        dto.setCreatedAt(entity.getCreatedAt());
        dto.setReadAt(entity.getReadAt());
        return dto;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
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

    public Boolean getRead() {
        return read;
    }

    public void setRead(Boolean read) {
        this.read = read;
    }

    public Boolean getIsRead() {
        return isRead;
    }

    public void setIsRead(Boolean isRead) {
        this.isRead = isRead;
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
}

