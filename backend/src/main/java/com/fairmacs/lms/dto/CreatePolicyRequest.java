package com.fairmacs.lms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreatePolicyRequest {

    @NotBlank(message = "Document title is required")
    @Size(max = 255, message = "Document title cannot exceed 255 characters")
    private String title;

    private String description;

    @Size(max = 100, message = "Document code cannot exceed 100 characters")
    private String documentCode;

    @NotNull(message = "Policy category ID is required")
    private Long categoryId;

    private Long owningDepartmentId;

    public CreatePolicyRequest() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDocumentCode() { return documentCode; }
    public void setDocumentCode(String documentCode) { this.documentCode = documentCode; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public Long getOwningDepartmentId() { return owningDepartmentId; }
    public void setOwningDepartmentId(Long owningDepartmentId) { this.owningDepartmentId = owningDepartmentId; }
}
