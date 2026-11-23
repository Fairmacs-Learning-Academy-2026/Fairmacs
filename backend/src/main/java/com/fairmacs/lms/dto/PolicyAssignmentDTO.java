package com.fairmacs.lms.dto;

import com.fairmacs.lms.entity.PolicyAssignmentSource;
import com.fairmacs.lms.entity.PolicyAssignmentStatus;
import com.fairmacs.lms.entity.PolicyVersionType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class PolicyAssignmentDTO {

    private Long id;
    private Long policyDocumentId;
    private String documentCode;
    private String title;
    private String description;
    private Long categoryId;
    private String categoryName;
    private String owningDepartmentName;
    private Long policyVersionId;
    private String versionNumber;
    private PolicyVersionType versionType;
    private LocalDate effectiveDate;
    private Boolean allowDownload;
    private Boolean mandatory;
    private LocalDate dueDate;
    private PolicyAssignmentSource assignmentSource;
    private PolicyAssignmentStatus assignmentStatus;
    private String acknowledgementStatus; // PENDING, ACKNOWLEDGED, OVERDUE
    private LocalDateTime acknowledgedAt;
    private String documentSha256Hash;
    private String workdriveFileId;
    private LocalDateTime assignedAt;

    private Long employeeUserId;
    private String employeeName;
    private String employeeId;
    private String department;
    private Long departmentIdSnapshot;
    private Boolean acknowledged = false;
    private Long acknowledgementId;
    private Boolean isExplicit;
    private String derivedFromVersionNumber;

    public PolicyAssignmentDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPolicyDocumentId() { return policyDocumentId; }
    public void setPolicyDocumentId(Long policyDocumentId) { this.policyDocumentId = policyDocumentId; }

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

    public String getOwningDepartmentName() { return owningDepartmentName; }
    public void setOwningDepartmentName(String owningDepartmentName) { this.owningDepartmentName = owningDepartmentName; }

    public Long getPolicyVersionId() { return policyVersionId; }
    public void setPolicyVersionId(Long policyVersionId) { this.policyVersionId = policyVersionId; }

    public String getVersionNumber() { return versionNumber; }
    public void setVersionNumber(String versionNumber) { this.versionNumber = versionNumber; }

    public PolicyVersionType getVersionType() { return versionType; }
    public void setVersionType(PolicyVersionType versionType) { this.versionType = versionType; }

    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }

    public Boolean getAllowDownload() { return allowDownload; }
    public void setAllowDownload(Boolean allowDownload) { this.allowDownload = allowDownload; }

    public Boolean getMandatory() { return mandatory; }
    public void setMandatory(Boolean mandatory) { this.mandatory = mandatory; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public PolicyAssignmentSource getAssignmentSource() { return assignmentSource; }
    public void setAssignmentSource(PolicyAssignmentSource assignmentSource) { this.assignmentSource = assignmentSource; }

    public PolicyAssignmentStatus getAssignmentStatus() { return assignmentStatus; }
    public void setAssignmentStatus(PolicyAssignmentStatus assignmentStatus) { this.assignmentStatus = assignmentStatus; }

    public String getAcknowledgementStatus() { return acknowledgementStatus; }
    public void setAcknowledgementStatus(String acknowledgementStatus) { this.acknowledgementStatus = acknowledgementStatus; }

    public LocalDateTime getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(LocalDateTime acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }

    public String getDocumentSha256Hash() { return documentSha256Hash; }
    public void setDocumentSha256Hash(String documentSha256Hash) { this.documentSha256Hash = documentSha256Hash; }

    public String getWorkdriveFileId() { return workdriveFileId; }
    public void setWorkdriveFileId(String workdriveFileId) { this.workdriveFileId = workdriveFileId; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(LocalDateTime assignedAt) { this.assignedAt = assignedAt; }

    public String getPolicyTitle() { return title; }
    public void setPolicyTitle(String policyTitle) { this.title = policyTitle; }

    public Long getEmployeeUserId() { return employeeUserId; }
    public void setEmployeeUserId(Long employeeUserId) { this.employeeUserId = employeeUserId; }

    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Long getDepartmentIdSnapshot() { return departmentIdSnapshot; }
    public void setDepartmentIdSnapshot(Long departmentIdSnapshot) { this.departmentIdSnapshot = departmentIdSnapshot; }

    public Boolean getAcknowledged() { return acknowledged != null ? acknowledged : false; }
    public void setAcknowledged(Boolean acknowledged) { this.acknowledged = acknowledged != null ? acknowledged : false; }

    public Long getAcknowledgementId() { return acknowledgementId; }
    public void setAcknowledgementId(Long acknowledgementId) { this.acknowledgementId = acknowledgementId; }

    public String getComplianceStatus() { return acknowledgementStatus; }
    public void setComplianceStatus(String complianceStatus) { this.acknowledgementStatus = complianceStatus; }

    public Boolean getIsExplicit() { return isExplicit; }
    public void setIsExplicit(Boolean isExplicit) { this.isExplicit = isExplicit; }

    public String getDerivedFromVersionNumber() { return derivedFromVersionNumber; }
    public void setDerivedFromVersionNumber(String derivedFromVersionNumber) { this.derivedFromVersionNumber = derivedFromVersionNumber; }
}
