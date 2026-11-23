package com.fairmacs.lms.dto;

import java.util.ArrayList;
import java.util.List;

public class PolicyDeptOverviewDTO {

    private String departmentName;
    private Long totalApplicablePolicies = 0L;
    private Long mandatoryCount = 0L;
    private Long optionalCount = 0L;
    private Long totalAssigned = 0L;
    private Long totalAcknowledged = 0L;
    private Long totalPending = 0L;
    private Long totalOverdue = 0L;
    private Double completionPercentage = 0.0;
    private Long totalEligibleEmployees = 0L;
    private Long totalMandatoryAssigned = 0L;
    private Long totalMandatoryAcknowledged = 0L;
    private Double mandatoryCompliancePercentage = 0.0;
    private Long totalOptionalAssigned = 0L;
    private Long totalOptionalAcknowledged = 0L;
    private Double optionalCompliancePercentage = 0.0;
    private Long employeesWithOutstandingMandatory = 0L;
    private Long pendingSubmissionsCount = 0L;
    private List<PolicyDocumentDTO> recentlyPublished = new ArrayList<>();
    private List<PolicyDocumentDTO> pendingSubmissions = new ArrayList<>();

    public PolicyDeptOverviewDTO() {}

    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

    public Long getTotalApplicablePolicies() { return totalApplicablePolicies; }
    public void setTotalApplicablePolicies(Long totalApplicablePolicies) { this.totalApplicablePolicies = totalApplicablePolicies; }

    public Long getMandatoryCount() { return mandatoryCount; }
    public void setMandatoryCount(Long mandatoryCount) { this.mandatoryCount = mandatoryCount; }

    public Long getOptionalCount() { return optionalCount; }
    public void setOptionalCount(Long optionalCount) { this.optionalCount = optionalCount; }

    public Long getTotalAssigned() { return totalAssigned; }
    public void setTotalAssigned(Long totalAssigned) { this.totalAssigned = totalAssigned; }

    public Long getTotalAcknowledged() { return totalAcknowledged; }
    public void setTotalAcknowledged(Long totalAcknowledged) { this.totalAcknowledged = totalAcknowledged; }

    public Long getTotalPending() { return totalPending; }
    public void setTotalPending(Long totalPending) { this.totalPending = totalPending; }

    public Long getTotalOverdue() { return totalOverdue; }
    public void setTotalOverdue(Long totalOverdue) { this.totalOverdue = totalOverdue; }

    public Double getCompletionPercentage() { return completionPercentage; }
    public void setCompletionPercentage(Double completionPercentage) { this.completionPercentage = completionPercentage; }

    public Long getTotalEligibleEmployees() { return totalEligibleEmployees; }
    public void setTotalEligibleEmployees(Long totalEligibleEmployees) { this.totalEligibleEmployees = totalEligibleEmployees; }

    public Long getTotalMandatoryAssigned() { return totalMandatoryAssigned; }
    public void setTotalMandatoryAssigned(Long totalMandatoryAssigned) { this.totalMandatoryAssigned = totalMandatoryAssigned; }

    public Long getTotalMandatoryAcknowledged() { return totalMandatoryAcknowledged; }
    public void setTotalMandatoryAcknowledged(Long totalMandatoryAcknowledged) { this.totalMandatoryAcknowledged = totalMandatoryAcknowledged; }

    public Double getMandatoryCompliancePercentage() { return mandatoryCompliancePercentage; }
    public void setMandatoryCompliancePercentage(Double mandatoryCompliancePercentage) { this.mandatoryCompliancePercentage = mandatoryCompliancePercentage; }

    public Long getTotalOptionalAssigned() { return totalOptionalAssigned; }
    public void setTotalOptionalAssigned(Long totalOptionalAssigned) { this.totalOptionalAssigned = totalOptionalAssigned; }

    public Long getTotalOptionalAcknowledged() { return totalOptionalAcknowledged; }
    public void setTotalOptionalAcknowledged(Long totalOptionalAcknowledged) { this.totalOptionalAcknowledged = totalOptionalAcknowledged; }

    public Double getOptionalCompliancePercentage() { return optionalCompliancePercentage; }
    public void setOptionalCompliancePercentage(Double optionalCompliancePercentage) { this.optionalCompliancePercentage = optionalCompliancePercentage; }

    public Long getEmployeesWithOutstandingMandatory() { return employeesWithOutstandingMandatory; }
    public void setEmployeesWithOutstandingMandatory(Long employeesWithOutstandingMandatory) { this.employeesWithOutstandingMandatory = employeesWithOutstandingMandatory; }

    public Long getPendingSubmissionsCount() { return pendingSubmissionsCount; }
    public void setPendingSubmissionsCount(Long pendingSubmissionsCount) { this.pendingSubmissionsCount = pendingSubmissionsCount; }

    public List<PolicyDocumentDTO> getRecentlyPublished() { return recentlyPublished; }
    public void setRecentlyPublished(List<PolicyDocumentDTO> recentlyPublished) { this.recentlyPublished = recentlyPublished; }

    public List<PolicyDocumentDTO> getPendingSubmissions() { return pendingSubmissions; }
    public void setPendingSubmissions(List<PolicyDocumentDTO> pendingSubmissions) { this.pendingSubmissions = pendingSubmissions; }
}
