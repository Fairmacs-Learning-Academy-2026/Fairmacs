package com.fairmacs.lms.dto;

import com.fairmacs.lms.entity.PolicyAssignmentSource;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public class PublishPolicyRequest {

    private Long policyVersionId;

    @NotNull(message = "Audience type is required")
    private PolicyAssignmentSource audienceType = PolicyAssignmentSource.ALL_EMPLOYEES;

    private List<Long> departmentIds;

    private List<Long> employeeUserIds;

    private Boolean mandatory = true;

    private LocalDate dueDate;

    public PublishPolicyRequest() {}

    public Long getPolicyVersionId() { return policyVersionId; }
    public void setPolicyVersionId(Long policyVersionId) { this.policyVersionId = policyVersionId; }

    public PolicyAssignmentSource getAudienceType() { return audienceType; }
    public void setAudienceType(PolicyAssignmentSource audienceType) { this.audienceType = audienceType; }

    public List<Long> getDepartmentIds() { return departmentIds; }
    public void setDepartmentIds(List<Long> departmentIds) { this.departmentIds = departmentIds; }

    public List<Long> getEmployeeUserIds() { return employeeUserIds; }
    public void setEmployeeUserIds(List<Long> employeeUserIds) { this.employeeUserIds = employeeUserIds; }

    public Boolean getMandatory() { return mandatory != null ? mandatory : true; }
    public void setMandatory(Boolean mandatory) { this.mandatory = mandatory != null ? mandatory : true; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
}
