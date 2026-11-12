package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "employee_documents")
public class EmployeeDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "employee_id", nullable = false)
    private String employeeId;

    @Column(name = "workdrive_file_id", nullable = false)
    private String workdriveFileId;

    @Column(name = "workdrive_folder_id")
    private String workdriveFolderId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "file_size", nullable = false)
    private Long fileSize = 0L;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "uploaded_by_user_id")
    private Long uploadedByUserId;

    @Column(name = "is_company_policy", nullable = false)
    private Boolean isCompanyPolicy = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public EmployeeDocument() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getWorkdriveFileId() { return workdriveFileId; }
    public void setWorkdriveFileId(String workdriveFileId) { this.workdriveFileId = workdriveFileId; }

    public String getWorkdriveFolderId() { return workdriveFolderId; }
    public void setWorkdriveFolderId(String workdriveFolderId) { this.workdriveFolderId = workdriveFolderId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Long getFileSize() { return fileSize != null ? fileSize : 0L; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize != null ? fileSize : 0L; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Long getUploadedByUserId() { return uploadedByUserId; }
    public void setUploadedByUserId(Long uploadedByUserId) { this.uploadedByUserId = uploadedByUserId; }

    public Boolean getIsCompanyPolicy() { return isCompanyPolicy != null ? isCompanyPolicy : false; }
    public void setIsCompanyPolicy(Boolean isCompanyPolicy) { this.isCompanyPolicy = isCompanyPolicy != null ? isCompanyPolicy : false; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
