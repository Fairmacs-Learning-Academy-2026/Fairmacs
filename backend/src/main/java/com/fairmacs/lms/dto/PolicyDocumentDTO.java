package com.fairmacs.lms.dto;

import com.fairmacs.lms.entity.PolicyApprovalStatus;
import com.fairmacs.lms.entity.PolicyDocumentStatus;

import java.time.LocalDateTime;

public class PolicyDocumentDTO {

    private Long id;
    private String documentCode;
    private String title;
    private String description;
    private Long categoryId;
    private String categoryName;
    private String categoryCode;
    private Long owningDepartmentId;
    private String owningDepartmentName;
    private PolicyDocumentStatus documentStatus;
    private PolicyApprovalStatus approvalStatus;
    private String approvalComment;
    private PolicyVersionDTO currentVersion;
    private Long totalAssignments = 0L;
    private Long totalAcknowledgements = 0L;
    private Double compliancePercentage = 0.0;
    private String createdByEmployeeId;
    private String createdByName;
    private String approvedByName;
    private LocalDateTime submittedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime publishedAt;
    private LocalDateTime archivedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public PolicyDocumentDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDocumentCode() { return documentCode; }
    public void setDocumentCode(String documentCode) { this.documentCode = documentCode; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getCategoryCode() { return categoryCode; }
    public void setCategoryCode(String categoryCode) { this.categoryCode = categoryCode; }

    public Long getOwningDepartmentId() { return owningDepartmentId; }
    public void setOwningDepartmentId(Long owningDepartmentId) { this.owningDepartmentId = owningDepartmentId; }

    public String getOwningDepartmentName() { return owningDepartmentName; }
    public void setOwningDepartmentName(String owningDepartmentName) { this.owningDepartmentName = owningDepartmentName; }

    public PolicyDocumentStatus getDocumentStatus() { return documentStatus; }
    public void setDocumentStatus(PolicyDocumentStatus documentStatus) { this.documentStatus = documentStatus; }
    public void setDocumentStatus(String documentStatus) {
        this.documentStatus = documentStatus != null ? PolicyDocumentStatus.valueOf(documentStatus) : PolicyDocumentStatus.DRAFT;
    }

    public PolicyApprovalStatus getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(PolicyApprovalStatus approvalStatus) { this.approvalStatus = approvalStatus; }
    public void setApprovalStatus(String approvalStatus) {
        this.approvalStatus = approvalStatus != null ? PolicyApprovalStatus.valueOf(approvalStatus) : PolicyApprovalStatus.NONE;
    }

    public void setCreatedByUserId(Long id) {}
    public void setCreatedByUserName(String name) { this.createdByName = name; }
    public void setApprovedByUserId(Long id) {}
    public void setApprovedByUserName(String name) { this.approvedByName = name; }
    public void setLatestVersion(PolicyVersionDTO v) { this.currentVersion = v; }
    public PolicyVersionDTO getLatestVersion() { return currentVersion; }

    public String getApprovalComment() { return approvalComment; }
    public void setApprovalComment(String approvalComment) { this.approvalComment = approvalComment; }

    public PolicyVersionDTO getCurrentVersion() { return currentVersion; }
    public void setCurrentVersion(PolicyVersionDTO currentVersion) { this.currentVersion = currentVersion; }

    public Long getTotalAssignments() { return totalAssignments; }
    public void setTotalAssignments(Long totalAssignments) { this.totalAssignments = totalAssignments; }

    public Long getTotalAcknowledgements() { return totalAcknowledgements; }
    public void setTotalAcknowledgements(Long totalAcknowledgements) { this.totalAcknowledgements = totalAcknowledgements; }

    public Double getCompliancePercentage() { return compliancePercentage; }
    public void setCompliancePercentage(Double compliancePercentage) { this.compliancePercentage = compliancePercentage; }

    public String getCreatedByEmployeeId() { return createdByEmployeeId; }
    public void setCreatedByEmployeeId(String createdByEmployeeId) { this.createdByEmployeeId = createdByEmployeeId; }

    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }

    public String getApprovedByName() { return approvedByName; }
    public void setApprovedByName(String approvedByName) { this.approvedByName = approvedByName; }

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
