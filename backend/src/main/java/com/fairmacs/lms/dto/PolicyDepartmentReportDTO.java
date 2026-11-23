package com.fairmacs.lms.dto;

public class PolicyDepartmentReportDTO {

    private Long departmentId;
    private String departmentName;
    private Long totalEligibleEmployees = 0L;
    private Long totalAssigned = 0L;
    private Long totalAcknowledged = 0L;
    private Long totalPending = 0L;
    private Long totalOverdue = 0L;
    private Double compliancePercentage = 0.0;
    private Double mandatoryCompliancePercentage = 0.0;
    private Long mandatoryAssigned = 0L;
    private Long mandatoryAcknowledged = 0L;

    public PolicyDepartmentReportDTO() {}

    public PolicyDepartmentReportDTO(Long departmentId, String departmentName, Long totalEligibleEmployees,
                                     Long totalAssigned, Long totalAcknowledged, Long totalPending,
                                     Long totalOverdue, Double compliancePercentage, Double mandatoryCompliancePercentage) {
        this.departmentId = departmentId;
        this.departmentName = departmentName;
        this.totalEligibleEmployees = totalEligibleEmployees;
        this.totalAssigned = totalAssigned;
        this.totalAcknowledged = totalAcknowledged;
        this.totalPending = totalPending;
        this.totalOverdue = totalOverdue;
        this.compliancePercentage = compliancePercentage;
        this.mandatoryCompliancePercentage = mandatoryCompliancePercentage;
    }

    public Long getDepartmentId() { return departmentId; }
    public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public Long getTotalEligibleEmployees() { return totalEligibleEmployees; }
    public void setTotalEligibleEmployees(Long totalEligibleEmployees) { this.totalEligibleEmployees = totalEligibleEmployees; }

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

    public Double getMandatoryCompliancePercentage() { return mandatoryCompliancePercentage; }
    public void setMandatoryCompliancePercentage(Double mandatoryCompliancePercentage) { this.mandatoryCompliancePercentage = mandatoryCompliancePercentage; }

    public Long getMandatoryAssigned() { return mandatoryAssigned; }
    public void setMandatoryAssigned(Long mandatoryAssigned) { this.mandatoryAssigned = mandatoryAssigned; }

    public Long getMandatoryAcknowledged() { return mandatoryAcknowledged; }
    public void setMandatoryAcknowledged(Long mandatoryAcknowledged) { this.mandatoryAcknowledged = mandatoryAcknowledged; }
}
