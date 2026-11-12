package com.fairmacs.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class ManagerPolicySubmissionRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title cannot exceed 255 characters")
    private String title;

    private String description;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    private Long targetDepartmentId;

    private String versionNotes;

    private LocalDate effectiveDate;

    private Boolean allowDownload = true;

    public ManagerPolicySubmissionRequest() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public Long getTargetDepartmentId() { return targetDepartmentId; }
    public void setTargetDepartmentId(Long targetDepartmentId) { this.targetDepartmentId = targetDepartmentId; }

    public String getVersionNotes() { return versionNotes; }
    public void setVersionNotes(String versionNotes) { this.versionNotes = versionNotes; }

    public String getSubmissionNotes() { return versionNotes; }
    public void setSubmissionNotes(String submissionNotes) { this.versionNotes = submissionNotes; }

    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }

    public Boolean getAllowDownload() { return allowDownload != null ? allowDownload : true; }
    public void setAllowDownload(Boolean allowDownload) { this.allowDownload = allowDownload != null ? allowDownload : true; }
}
