package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "employee_preferences")
public class EmployeePreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "email_notifications", nullable = false)
    private Boolean emailNotifications = true;

    @Column(name = "in_app_notifications", nullable = false)
    private Boolean inAppNotifications = true;

    @Column(name = "assignment_alerts", nullable = false)
    private Boolean assignmentAlerts = true;

    @Column(name = "course_reminders", nullable = false)
    private Boolean courseReminders = true;

    @Column(name = "theme", nullable = false)
    private String theme = "system";

    @Column(name = "language", nullable = false)
    private String language = "en";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public EmployeePreference() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Boolean getEmailNotifications() { return emailNotifications != null ? emailNotifications : true; }
    public void setEmailNotifications(Boolean emailNotifications) { this.emailNotifications = emailNotifications != null ? emailNotifications : true; }

    public Boolean getInAppNotifications() { return inAppNotifications != null ? inAppNotifications : true; }
    public void setInAppNotifications(Boolean inAppNotifications) { this.inAppNotifications = inAppNotifications != null ? inAppNotifications : true; }

    public Boolean getAssignmentAlerts() { return assignmentAlerts != null ? assignmentAlerts : true; }
    public void setAssignmentAlerts(Boolean assignmentAlerts) { this.assignmentAlerts = assignmentAlerts != null ? assignmentAlerts : true; }

    public Boolean getCourseReminders() { return courseReminders != null ? courseReminders : true; }
    public void setCourseReminders(Boolean courseReminders) { this.courseReminders = courseReminders != null ? courseReminders : true; }

    public String getTheme() { return theme != null ? theme : "system"; }
    public void setTheme(String theme) { this.theme = theme != null ? theme : "system"; }

    public String getLanguage() { return language != null ? language : "en"; }
    public void setLanguage(String language) { this.language = language != null ? language : "en"; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
