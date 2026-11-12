package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_import_audit_logs")
public class EmployeeImportAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "imported_by_user_id")
    private Long importedByUserId;

    @Column(name = "imported_by_name", length = 255)
    private String importedByName;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "total_rows", nullable = false)
    private Integer totalRows = 0;

    @Column(name = "imported_count", nullable = false)
    private Integer importedCount = 0;

    @Column(name = "failed_count", nullable = false)
    private Integer failedCount = 0;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "COMPLETED";

    @Column(name = "error_summary", columnDefinition = "TEXT")
    private String errorSummary;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.totalRows == null) {
            this.totalRows = 0;
        }
        if (this.importedCount == null) {
            this.importedCount = 0;
        }
        if (this.failedCount == null) {
            this.failedCount = 0;
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "COMPLETED";
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getImportedByUserId() {
        return importedByUserId;
    }

    public void setImportedByUserId(Long importedByUserId) {
        this.importedByUserId = importedByUserId;
    }

    public String getImportedByName() {
        return importedByName;
    }

    public void setImportedByName(String importedByName) {
        this.importedByName = importedByName;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public Integer getTotalRows() {
        return totalRows;
    }

    public void setTotalRows(Integer totalRows) {
        this.totalRows = totalRows;
    }

    public Integer getImportedCount() {
        return importedCount;
    }

    public void setImportedCount(Integer importedCount) {
        this.importedCount = importedCount;
    }

    public Integer getFailedCount() {
        return failedCount;
    }

    public void setFailedCount(Integer failedCount) {
        this.failedCount = failedCount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getErrorSummary() {
        return errorSummary;
    }

    public void setErrorSummary(String errorSummary) {
        this.errorSummary = errorSummary;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
