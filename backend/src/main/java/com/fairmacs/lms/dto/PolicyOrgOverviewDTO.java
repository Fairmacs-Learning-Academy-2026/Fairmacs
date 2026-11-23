package com.fairmacs.lms.dto;

import java.util.ArrayList;
import java.util.List;

public class PolicyOrgOverviewDTO {

    private Long totalPublished = 0L;
    private Long totalPolicies = 0L;
    private Long totalAgreements = 0L;
    private Long totalDrafts = 0L;
    private Long totalArchived = 0L;
    private Long pendingApprovals = 0L;

    private Long totalAssigned = 0L;
    private Long totalAcknowledged = 0L;
    private Long totalPending = 0L;
    private Long totalOverdue = 0L;
    private Double completionPercentage = 0.0;

    private Long totalActiveEmployees = 0L;
    private Long totalMandatoryAssigned = 0L;
    private Long totalMandatoryAcknowledged = 0L;
    private Double mandatoryCompliancePercentage = 0.0;
    private Long totalOptionalAssigned = 0L;
    private Long totalOptionalAcknowledged = 0L;
    private Double optionalCompliancePercentage = 0.0;
    private Long employeesWithOutstandingMandatory = 0L;

    private List<PolicyComplianceSummaryDTO.DepartmentComplianceDTO> departmentBreakdowns = new ArrayList<>();
    private List<PolicyDocumentDTO> recentlyPublished = new ArrayList<>();
    private List<PolicyDocumentDTO> recentSubmissions = new ArrayList<>();
    private List<PolicyDocumentDTO> documentsRequiringAttention = new ArrayList<>();

    public PolicyOrgOverviewDTO() {}

    public Long getTotalPublished() { return totalPublished; }
    public void setTotalPublished(Long totalPublished) { this.totalPublished = totalPublished; }

    public Long getTotalPolicies() { return totalPolicies; }
    public void setTotalPolicies(Long totalPolicies) { this.totalPolicies = totalPolicies; }

    public Long getTotalAgreements() { return totalAgreements; }
    public void setTotalAgreements(Long totalAgreements) { this.totalAgreements = totalAgreements; }

    public Long getTotalDrafts() { return totalDrafts; }
    public void setTotalDrafts(Long totalDrafts) { this.totalDrafts = totalDrafts; }

    public Long getTotalArchived() { return totalArchived; }
    public void setTotalArchived(Long totalArchived) { this.totalArchived = totalArchived; }

    public Long getPendingApprovals() { return pendingApprovals; }
    public void setPendingApprovals(Long pendingApprovals) { this.pendingApprovals = pendingApprovals; }

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

    public Long getTotalActiveEmployees() { return totalActiveEmployees; }
    public void setTotalActiveEmployees(Long totalActiveEmployees) { this.totalActiveEmployees = totalActiveEmployees; }

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

    public List<PolicyComplianceSummaryDTO.DepartmentComplianceDTO> getDepartmentBreakdowns() { return departmentBreakdowns; }
    public void setDepartmentBreakdowns(List<PolicyComplianceSummaryDTO.DepartmentComplianceDTO> departmentBreakdowns) { this.departmentBreakdowns = departmentBreakdowns; }

    public List<PolicyDocumentDTO> getRecentlyPublished() { return recentlyPublished; }
    public void setRecentlyPublished(List<PolicyDocumentDTO> recentlyPublished) { this.recentlyPublished = recentlyPublished; }

    public List<PolicyDocumentDTO> getRecentSubmissions() { return recentSubmissions; }
    public void setRecentSubmissions(List<PolicyDocumentDTO> recentSubmissions) { this.recentSubmissions = recentSubmissions; }

    public List<PolicyDocumentDTO> getDocumentsRequiringAttention() { return documentsRequiringAttention; }
    public void setDocumentsRequiringAttention(List<PolicyDocumentDTO> documentsRequiringAttention) { this.documentsRequiringAttention = documentsRequiringAttention; }
}
