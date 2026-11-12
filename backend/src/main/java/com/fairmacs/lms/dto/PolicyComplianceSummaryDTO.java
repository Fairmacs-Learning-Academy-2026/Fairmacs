package com.fairmacs.lms.dto;

import java.util.ArrayList;
import java.util.List;

public class PolicyComplianceSummaryDTO {

    private Long policyDocumentId;
    private String documentCode;
    private String title;
    private Long totalAssigned = 0L;
    private Long totalAcknowledged = 0L;
    private Long totalPending = 0L;
    private Long totalOverdue = 0L;
    private Double compliancePercentage = 0.0;
    private List<DepartmentComplianceDTO> departmentBreakdowns = new ArrayList<>();

    public PolicyComplianceSummaryDTO() {}

    public Long getPolicyDocumentId() { return policyDocumentId; }
    public void setPolicyDocumentId(Long policyDocumentId) { this.policyDocumentId = policyDocumentId; }

    public String getDocumentCode() { return documentCode; }
    public void setDocumentCode(String documentCode) { this.documentCode = documentCode; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

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

    public List<DepartmentComplianceDTO> getDepartmentBreakdowns() { return departmentBreakdowns; }
    public void setDepartmentBreakdowns(List<DepartmentComplianceDTO> departmentBreakdowns) { this.departmentBreakdowns = departmentBreakdowns; }

    public static class DepartmentComplianceDTO {
        private Long departmentId;
        private String departmentName;
        private Long totalAssigned = 0L;
        private Long totalAcknowledged = 0L;
        private Long totalPending = 0L;
        private Long totalOverdue = 0L;
        private Double compliancePercentage = 0.0;

        public DepartmentComplianceDTO() {}

        public DepartmentComplianceDTO(Long departmentId, String departmentName, Long totalAssigned, Long totalAcknowledged, Long totalPending, Long totalOverdue, Double compliancePercentage) {
            this.departmentId = departmentId;
            this.departmentName = departmentName;
            this.totalAssigned = totalAssigned;
            this.totalAcknowledged = totalAcknowledged;
            this.totalPending = totalPending;
            this.totalOverdue = totalOverdue;
            this.compliancePercentage = compliancePercentage;
        }

        public Long getDepartmentId() { return departmentId; }
        public void setDepartmentId(Long departmentId) { this.departmentId = departmentId; }

        public String getDepartmentName() { return departmentName; }
        public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }

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
    }
}
