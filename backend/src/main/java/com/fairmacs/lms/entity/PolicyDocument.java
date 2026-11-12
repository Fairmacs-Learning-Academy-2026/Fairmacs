package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "policy_documents")
public class PolicyDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_code", nullable = false, unique = true, length = 100)
    private String documentCode;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private PolicyCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owning_department_id")
    private Department owningDepartment;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_status", nullable = false, length = 50)
    private PolicyDocumentStatus documentStatus = PolicyDocumentStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", length = 50)
    private PolicyApprovalStatus approvalStatus = PolicyApprovalStatus.NONE;

    @Column(name = "approval_comment", columnDefinition = "TEXT")
    private String approvalComment;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PolicyDocument() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDocumentCode() { return documentCode; }
    public void setDocumentCode(String documentCode) { this.documentCode = documentCode; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public PolicyCategory getCategory() { return category; }
    public void setCategory(PolicyCategory category) { this.category = category; }

    public Department getOwningDepartment() { return owningDepartment; }
    public void setOwningDepartment(Department owningDepartment) { this.owningDepartment = owningDepartment; }

    public PolicyDocumentStatus getDocumentStatus() { return documentStatus; }
    public void setDocumentStatus(PolicyDocumentStatus documentStatus) { this.documentStatus = documentStatus; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public User getApprovedBy() { return approvedBy; }
    public void setApprovedBy(User approvedBy) { this.approvedBy = approvedBy; }

    public PolicyApprovalStatus getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(PolicyApprovalStatus approvalStatus) { this.approvalStatus = approvalStatus; }

    public String getApprovalComment() { return approvalComment; }
    public void setApprovalComment(String approvalComment) { this.approvalComment = approvalComment; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }

    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }

    public LocalDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(LocalDateTime archivedAt) { this.archivedAt = archivedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
