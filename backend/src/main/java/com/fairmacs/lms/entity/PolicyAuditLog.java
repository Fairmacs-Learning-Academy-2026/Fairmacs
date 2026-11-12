package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "policy_audit_logs")
public class PolicyAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_document_id")
    private PolicyDocument policyDocument;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "policy_version_id")
    private PolicyVersion policyVersion;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id", nullable = false)
    private User actorUser;

    @Column(name = "actor_employee_id", nullable = false)
    private String actorEmployeeId;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PolicyAuditLog() {}

    public PolicyAuditLog(PolicyDocument policyDocument, PolicyVersion policyVersion, String action, User actorUser, String actorEmployeeId, String details) {
        this.policyDocument = policyDocument;
        this.policyVersion = policyVersion;
        this.action = action;
        this.actorUser = actorUser;
        this.actorEmployeeId = actorEmployeeId;
        this.details = details;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public PolicyDocument getPolicyDocument() { return policyDocument; }
    public void setPolicyDocument(PolicyDocument policyDocument) { this.policyDocument = policyDocument; }

    public PolicyVersion getPolicyVersion() { return policyVersion; }
    public void setPolicyVersion(PolicyVersion policyVersion) { this.policyVersion = policyVersion; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public User getActorUser() { return actorUser; }
    public void setActorUser(User actorUser) { this.actorUser = actorUser; }

    public String getActorEmployeeId() { return actorEmployeeId; }
    public void setActorEmployeeId(String actorEmployeeId) { this.actorEmployeeId = actorEmployeeId; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public void setPerformedBy(User user) {
        this.actorUser = user;
        if (user != null) {
            this.actorEmployeeId = user.getEmployeeId() != null ? user.getEmployeeId() : "USR-" + user.getId();
        }
    }

    public void setDescription(String description) {
        this.details = description;
    }

    public void setIpAddress(String ip) {}

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
