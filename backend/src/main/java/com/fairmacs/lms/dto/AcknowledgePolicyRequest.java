package com.fairmacs.lms.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

public class AcknowledgePolicyRequest {

    @NotNull(message = "Confirmation flag is required")
    @AssertTrue(message = "You must explicitly confirm that you have read, understood, and accept this policy")
    private Boolean confirmed;

    private String acknowledgementText;

    public AcknowledgePolicyRequest() {}

    public AcknowledgePolicyRequest(Boolean confirmed, String acknowledgementText) {
        this.confirmed = confirmed;
        this.acknowledgementText = acknowledgementText;
    }

    public static AcknowledgePolicyRequest confirmed() {
        return new AcknowledgePolicyRequest(true, null);
    }

    public Boolean getConfirmed() { return confirmed; }
    public void setConfirmed(Boolean confirmed) { this.confirmed = confirmed; }

    public String getAcknowledgementText() { return acknowledgementText; }
    public void setAcknowledgementText(String acknowledgementText) { this.acknowledgementText = acknowledgementText; }

    public String getComments() { return acknowledgementText; }
    public void setComments(String comments) { this.acknowledgementText = comments; }

    public String getAcknowledgementType() { return "STANDARD"; }
    public void setAcknowledgementType(String type) {}
}
