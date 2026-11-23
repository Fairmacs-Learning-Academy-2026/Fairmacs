package com.fairmacs.lms.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class PolicyEmployeeHistoryItemDTO {

    private Long assignmentId;
    private Long documentId;
    private String documentCode;
    private String documentTitle;
    private String categoryName;
    private String versionNumber;
    private String versionType;
    private Boolean mandatory = true;
    private LocalDateTime assignedAt;
    private LocalDate dueDate;
    private String complianceStatus; // ACKNOWLEDGED, PENDING, OVERDUE
    private Long acknowledgementId;
    private LocalDateTime acknowledgedAt;
    private Boolean isDerived = false;
    private String derivedFromVersionNumber;
    private String documentSha256Hash;
    private String ipAddress;

    public PolicyEmployeeHistoryItemDTO() {}

    public Long getAssignmentId() { return assignmentId; }
    public void setAssignmentId(Long assignmentId) { this.assignmentId = assignmentId; }

    public Long getDocumentId() { return documentId; }
    public void setDocumentId(Long documentId) { this.documentId = documentId; }

    public String getDocumentCode() { return documentCode; }
    public void setDocumentCode(String documentCode) { this.documentCode = documentCode; }

    public String getDocumentTitle() { return documentTitle; }
    public void setDocumentTitle(String documentTitle) { this.documentTitle = documentTitle; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getVersionNumber() { return versionNumber; }
    public void setVersionNumber(String versionNumber) { this.versionNumber = versionNumber; }

    public String getVersionType() { return versionType; }
    public void setVersionType(String versionType) { this.versionType = versionType; }

    public Boolean getMandatory() { return mandatory; }
    public void setMandatory(Boolean mandatory) { this.mandatory = mandatory; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public String getComplianceStatus() { return complianceStatus; }
    public void setComplianceStatus(String complianceStatus) { this.complianceStatus = complianceStatus; }

    public Long getAcknowledgementId() { return acknowledgementId; }
    public void setAcknowledgementId(Long acknowledgementId) { this.acknowledgementId = acknowledgementId; }

    public LocalDateTime getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(LocalDateTime acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }

    public Boolean getIsDerived() { return isDerived; }
    public void setIsDerived(Boolean isDerived) { this.isDerived = isDerived; }

    public String getDerivedFromVersionNumber() { return derivedFromVersionNumber; }
    public void setDerivedFromVersionNumber(String derivedFromVersionNumber) { this.derivedFromVersionNumber = derivedFromVersionNumber; }

    public String getDocumentSha256Hash() { return documentSha256Hash; }
    public void setDocumentSha256Hash(String documentSha256Hash) { this.documentSha256Hash = documentSha256Hash; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    // Frontend compatibility getters
    public String getChecksumSha256() { return documentSha256Hash; }
    public void setChecksumSha256(String checksumSha256) { if (this.documentSha256Hash == null) this.documentSha256Hash = checksumSha256; }

    public String getTitle() { return documentTitle; }
    public void setTitle(String title) { if (this.documentTitle == null) this.documentTitle = title; }

    public String getCode() { return documentCode; }
    public void setCode(String code) { if (this.documentCode == null) this.documentCode = code; }

    public Boolean getIsOverdue() { return "OVERDUE".equalsIgnoreCase(complianceStatus); }
    public Boolean getIsAcknowledged() { return "ACKNOWLEDGED".equalsIgnoreCase(complianceStatus); }
}
