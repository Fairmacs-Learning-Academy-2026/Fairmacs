package com.fairmacs.lms.dto;

import java.util.ArrayList;
import java.util.List;

public class PolicyEmployeeHistoryDTO {

    private Long employeeId;
    private String employeeCode;
    private String fullName;
    private String department;
    private String designation;
    private Long totalAssigned = 0L;
    private Long totalAcknowledged = 0L;
    private Long totalPending = 0L;
    private Long totalOverdue = 0L;
    private Double compliancePercentage = 0.0;
    private List<PolicyEmployeeHistoryItemDTO> historyItems = new ArrayList<>();

    public PolicyEmployeeHistoryDTO() {}

    public Long getEmployeeId() { return employeeId; }
    public void setEmployeeId(Long employeeId) { this.employeeId = employeeId; }

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

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

    public List<PolicyEmployeeHistoryItemDTO> getHistoryItems() { return historyItems; }
    public void setHistoryItems(List<PolicyEmployeeHistoryItemDTO> historyItems) { this.historyItems = historyItems; }

    // Frontend compatibility getters
    public String getEmployeeName() { return fullName; }
    public void setEmployeeName(String employeeName) { if (this.fullName == null) this.fullName = employeeName; }

    public String getDepartmentName() { return department; }
    public void setDepartmentName(String departmentName) { if (this.department == null) this.department = departmentName; }

    public String getEmployeeIdNumber() { return employeeCode; }
    public void setEmployeeIdNumber(String employeeIdNumber) { if (this.employeeCode == null) this.employeeCode = employeeIdNumber; }

    public List<PolicyEmployeeHistoryItemDTO> getItems() { return historyItems; }
    public void setItems(List<PolicyEmployeeHistoryItemDTO> items) { if (this.historyItems == null || this.historyItems.isEmpty()) this.historyItems = items; }

    public Long getCompliantDocumentsCount() { return totalAcknowledged; }
    public void setCompliantDocumentsCount(Long compliantDocumentsCount) { if (this.totalAcknowledged == null || this.totalAcknowledged == 0L) this.totalAcknowledged = compliantDocumentsCount; }

    public Long getTotalAssignedDocuments() { return totalAssigned; }
    public void setTotalAssignedDocuments(Long totalAssignedDocuments) { if (this.totalAssigned == null || this.totalAssigned == 0L) this.totalAssigned = totalAssignedDocuments; }
}
