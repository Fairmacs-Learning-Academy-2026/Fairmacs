package com.fairmacs.lms.dto;

public class PolicyEmployeeReportDTO {

    private Long employeeId;
    private String employeeCode;
    private String fullName;
    private Long departmentId;
    private String department;
    private String designation;
    private String userStatus;
    private Long totalAssigned = 0L;
    private Long totalAcknowledged = 0L;
    private Long totalPending = 0L;
    private Long totalOverdue = 0L;
    private Double compliancePercentage = 0.0;
    private Long mandatoryPendingCount = 0L;
    private String overallComplianceStatus; // COMPLIANT, PENDING, OVERDUE

    public PolicyEmployeeReportDTO() {}

    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public Long getDepartmentId() { return departmentId; }
    public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public String getUserStatus() { return userStatus; }
    public void setUserStatus(String userStatus) { this.userStatus = userStatus; }

    public Long getTotalAssigned() { return totalAssigned; }
    public void setTotalAssigned(Long totalAssigned) { this.totalAssigned = totalAssigned; }

    public Long getTotalAcknowledged() { return totalAcknowledged; }
    public void setTotalAcknowledged(Long totalAcknowledged) { this.totalAcknowledged = totalAcknowledged; }

    public Long getTotalPending() { return totalPending; }
    public void setTotalPending(Long totalPending) { this.totalPending = totalPending; }

    public Long getTotalOverdue() { return totalOverdue; }
    public void setTotalOverdue(Long totalOverdue) { this.totalOverdue = totalOverdue; }

    public Double getCompliancePercentage() { return compliancePercentage; }
    public void setCompliancePercentage(Double compliancePercentage) { this.compliancePercentage = compliancePercentage; }

    public Long getMandatoryPendingCount() { return mandatoryPendingCount; }
    public void setMandatoryPendingCount(Long mandatoryPendingCount) { this.mandatoryPendingCount = mandatoryPendingCount; }

    public String getOverallComplianceStatus() { return overallComplianceStatus; }
    public void setOverallComplianceStatus(String overallComplianceStatus) { this.overallComplianceStatus = overallComplianceStatus; }
}
