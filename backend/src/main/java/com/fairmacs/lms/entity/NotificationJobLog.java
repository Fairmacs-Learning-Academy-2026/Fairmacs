package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "notification_job_logs",
        indexes = {
                @Index(name = "idx_notif_job_name_started", columnList = "job_name, started_at DESC"),
                @Index(name = "idx_notif_job_exec_key", columnList = "execution_key", unique = true)
        }
)
public class NotificationJobLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_name", nullable = false, length = 128)
    private String jobName;

    @Column(name = "execution_key", unique = true, nullable = false)
    private String executionKey;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "processed_count")
    private Integer processedCount = 0;

    @Column(name = "notifications_created")
    private Integer notificationsCreated = 0;

    @Column(name = "failure_count")
    private Integer failureCount = 0;

    @Column(name = "summary_message", columnDefinition = "TEXT")
    private String summaryMessage;

    public NotificationJobLog() {
    }

    public NotificationJobLog(String jobName, String executionKey) {
        this.jobName = jobName;
        this.executionKey = executionKey;
        this.startedAt = LocalDateTime.now();
        this.status = "RUNNING";
        this.processedCount = 0;
        this.notificationsCreated = 0;
        this.failureCount = 0;
    }

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) {
            startedAt = LocalDateTime.now();
        }
        if (status == null || status.isBlank()) {
            status = "RUNNING";
        }
        if (processedCount == null) {
            processedCount = 0;
        }
        if (notificationsCreated == null) {
            notificationsCreated = 0;
        }
        if (failureCount == null) {
            failureCount = 0;
        }
    }

    public Long getId() {
        return id;
    }

    public String getJobName() {
        return jobName;
    }

    public void setJobName(String jobName) {
        this.jobName = jobName;
    }

    public String getExecutionKey() {
        return executionKey;
    }

    public void setExecutionKey(String executionKey) {
        this.executionKey = executionKey;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getProcessedCount() {
        return processedCount;
    }

    public void setProcessedCount(Integer processedCount) {
        this.processedCount = processedCount;
    }

    public Integer getNotificationsCreated() {
        return notificationsCreated;
    }

    public void setNotificationsCreated(Integer notificationsCreated) {
        this.notificationsCreated = notificationsCreated;
    }

    public Integer getFailureCount() {
        return failureCount;
    }

    public void setFailureCount(Integer failureCount) {
        this.failureCount = failureCount;
    }

    public String getSummaryMessage() {
        return summaryMessage;
    }

    public void setSummaryMessage(String summaryMessage) {
        this.summaryMessage = summaryMessage;
    }
}

