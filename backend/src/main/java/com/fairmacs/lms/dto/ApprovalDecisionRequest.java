package com.fairmacs.lms.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class ApprovalDecisionRequest {

    public enum Decision {
        APPROVE,
        REJECT
    }

    @NotNull(message = "Approval decision is required")
    private Boolean approved;

    private String comment;

    private Boolean autoPublish = false;

    private LocalDate dueDate;

    public ApprovalDecisionRequest() {}

    public ApprovalDecisionRequest(Boolean approved, String comment) {
        this.approved = approved;
        this.comment = comment;
    }

    public Boolean getApproved() { return approved; }
    public void setApproved(Boolean approved) { this.approved = approved; }

    public Decision getDecision() {
        return Boolean.TRUE.equals(approved) ? Decision.APPROVE : Decision.REJECT;
    }

    public void setDecision(Decision decision) {
        this.approved = (decision == Decision.APPROVE);
    }

    public boolean isApproved() {
        return Boolean.TRUE.equals(approved);
    }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public Boolean getAutoPublish() { return autoPublish; }
    public boolean isAutoPublish() { return Boolean.TRUE.equals(autoPublish); }
    public void setAutoPublish(Boolean autoPublish) { this.autoPublish = autoPublish; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
}
