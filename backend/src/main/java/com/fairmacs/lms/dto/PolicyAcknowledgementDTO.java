package com.fairmacs.lms.dto;

import java.time.LocalDateTime;

public class PolicyAcknowledgementDTO {

    private Long id;
    private Long policyAssignmentId;
    private Long policyDocumentId;
    private String documentCode;
    private String documentTitle;
    private Long policyVersionId;
    private String versionNumber;
    private Long employeeUserId;
    private String employeeIdSnapshot;
    private String employeeName;
    private String departmentName;
    private LocalDateTime acceptedAt;
    private String authenticatedUserEmail;
    private String documentSha256Hash;
    private String acknowledgementTextVersion;
    private String requestIp;
    private String userAgent;

    public PolicyAcknowledgementDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPolicyAssignmentId() { return policyAssignmentId; }
    public void setPolicyAssignmentId(Long policyAssignmentId) { this.policyAssignmentId = policyAssignmentId; }

    public Long getPolicyDocumentId() { return policyDocumentId; }
    public void setPolicyDocumentId(Long policyDocumentId) { this.policyDocumentId = policyDocumentId; }

    public String getDocumentCode() { return documentCode; }
    public void setDocumentCode(String documentCode) { this.documentCode = documentCode; }

    public String getDocumentTitle() { return documentTitle; }
    public void setDocumentTitle(String documentTitle) { this.documentTitle = documentTitle; }

    public Long getPolicyVersionId() { return policyVersionId; }
    public void setPolicyVersionId(Long policyVersionId) { this.policyVersionId = policyVersionId; }

    public String getVersionNumber() { return versionNumber; }
    public void setVersionNumber(String versionNumber) { this.versionNumber = versionNumber; }

    public Long getEmployeeUserId() { return employeeUserId; }
    public void setEmployeeUserId(Long employeeUserId) { this.employeeUserId = employeeUserId; }

    public String getEmployeeIdSnapshot() { return employeeIdSnapshot; }
    public void setEmployeeIdSnapshot(String employeeIdSnapshot) { this.employeeIdSnapshot = employeeIdSnapshot; }

    public String getEmployeeName() { return employeeName; }
    public void setEmployeeName(String employeeName) { this.employeeName = employeeName; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public LocalDateTime getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime acceptedAt) { this.acceptedAt = acceptedAt; }

    public String getAuthenticatedUserEmail() { return authenticatedUserEmail; }
    public void setAuthenticatedUserEmail(String authenticatedUserEmail) { this.authenticatedUserEmail = authenticatedUserEmail; }

    public String getDocumentSha256Hash() { return documentSha256Hash; }
    public void setDocumentSha256Hash(String documentSha256Hash) { this.documentSha256Hash = documentSha256Hash; }

    public String getAcknowledgementTextVersion() { return acknowledgementTextVersion; }
    public void setAcknowledgementTextVersion(String acknowledgementTextVersion) { this.acknowledgementTextVersion = acknowledgementTextVersion; }

    public String getRequestIp() { return requestIp; }
    public void setRequestIp(String requestIp) { this.requestIp = requestIp; }

    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }

    public String getPolicyTitle() { return documentTitle; }
    public void setPolicyTitle(String policyTitle) { this.documentTitle = policyTitle; }

    public String getEmployeeId() { return employeeIdSnapshot; }
    public void setEmployeeId(String employeeId) { this.employeeIdSnapshot = employeeId; }

    public String getDepartment() { return departmentName; }
    public void setDepartment(String department) { this.departmentName = department; }

    public String getIpAddress() { return requestIp; }
    public void setIpAddress(String ipAddress) { this.requestIp = ipAddress; }

    public String getAcknowledgementType() { return "STANDARD"; }
    public void setAcknowledgementType(String acknowledgementType) {}

    public String getComments() { return null; }
    public void setComments(String comments) {}
}
