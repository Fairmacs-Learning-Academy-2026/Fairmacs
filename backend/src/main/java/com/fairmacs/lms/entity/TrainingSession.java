package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "training_sessions")
public class TrainingSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(name = "session_date", nullable = false)
    private LocalDate date;

    @Column(length = 80)
    private String time;

    @Column(length = 180)
    private String trainer;

    @Column(name = "target_type", nullable = false, length = 24)
    @Enumerated(EnumType.STRING)
    private TrainingSessionTargetType targetType = TrainingSessionTargetType.ALL;

    @Column(length = 120)
    private String department;

    @Column(length = 500)
    private String location;

    @Column(name = "event_type", length = 40)
    private String type = "Workshop";

    @Column(name = "created_by_user_id")
    private Long createdByUserId;

    @Column(name = "created_by_name", length = 180)
    private String createdByName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ElementCollection
    @CollectionTable(name = "training_session_targets", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "user_id", nullable = false)
    private List<Long> targetUserIds = new ArrayList<>();

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getTrainer() { return trainer; }
    public void setTrainer(String trainer) { this.trainer = trainer; }
    public TrainingSessionTargetType getTargetType() { return targetType; }
    public void setTargetType(TrainingSessionTargetType targetType) { this.targetType = targetType; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Long getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(Long createdByUserId) { this.createdByUserId = createdByUserId; }
    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public List<Long> getTargetUserIds() { return targetUserIds; }
    public void setTargetUserIds(List<Long> targetUserIds) { this.targetUserIds = targetUserIds == null ? new ArrayList<>() : new ArrayList<>(targetUserIds); }
}
