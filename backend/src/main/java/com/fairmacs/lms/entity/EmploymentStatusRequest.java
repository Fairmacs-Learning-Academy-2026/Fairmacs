package com.fairmacs.lms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employment_status_requests")
public class EmploymentStatusRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "employee_id", nullable = false)
    private String employeeId;

    @Column(name = "requested_status", nullable = false)
    private String requestedStatus;

    @Column(name = "current_status", nullable = false)
    private String currentStatus;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "supporting_document_file_id")
    private String supportingDocumentFileId;

    @Column(name = "supporting_document_name")
    private String supportingDocumentName;

    @Column(name = "request_status", nullable = false)
    private String requestStatus = "PENDING_MANAGER"; // PENDING_MANAGER, PENDING_HR, APPROVED, REJECTED

    @Column(name = "manager_id")
    private Long managerId;

    @Column(name = "manager_recommendation")
    private String managerRecommendation; // RECOMMENDED, NOT_RECOMMENDED

    @Column(name = "manager_comment", columnDefinition = "TEXT")
    private String managerComment;

    @Column(name = "manager_reviewed_at")
    private LocalDateTime managerReviewedAt;

    @Column(name = "hr_admin_id")
    private Long hrAdminId;

    @Column(name = "hr_admin_comment", columnDefinition = "TEXT")
    private String hrAdminComment;

    @Column(name = "hr_reviewed_at")
    private LocalDateTime hrReviewedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public EmploymentStatusRequest() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getEmployeeId() { return employeeId; }
    public void setEmployeeId(String employeeId) { this.employeeId = employeeId; }

    public String getRequestedStatus() { return requestedStatus; }
    public void setRequestedStatus(String requestedStatus) { this.requestedStatus = requestedStatus; }

    public String getCurrentStatus() { return currentStatus; }
    public void setCurrentStatus(String currentStatus) { this.currentStatus = currentStatus; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getSupportingDocumentFileId() { return supportingDocumentFileId; }
    public void setSupportingDocumentFileId(String supportingDocumentFileId) { this.supportingDocumentFileId = supportingDocumentFileId; }

    public String getSupportingDocumentName() { return supportingDocumentName; }
    public void setSupportingDocumentName(String supportingDocumentName) { this.supportingDocumentName = supportingDocumentName; }

    public String getRequestStatus() { return requestStatus; }
    public void setRequestStatus(String requestStatus) { this.requestStatus = requestStatus; }

    public Long getManagerId() { return managerId; }
    public void setManagerId(Long managerId) { this.managerId = managerId; }

    public String getManagerRecommendation() { return managerRecommendation; }
    public void setManagerRecommendation(String managerRecommendation) { this.managerRecommendation = managerRecommendation; }

    public String getManagerComment() { return managerComment; }
    public void setManagerComment(String managerComment) { this.managerComment = managerComment; }

    public LocalDateTime getManagerReviewedAt() { return managerReviewedAt; }
    public void setManagerReviewedAt(LocalDateTime managerReviewedAt) { this.managerReviewedAt = managerReviewedAt; }

    public Long getHrAdminId() { return hrAdminId; }
    public void setHrAdminId(Long hrAdminId) { this.hrAdminId = hrAdminId; }

    public String getHrAdminComment() { return hrAdminComment; }
    public void setHrAdminComment(String hrAdminComment) { this.hrAdminComment = hrAdminComment; }

    public LocalDateTime getHrReviewedAt() { return hrReviewedAt; }
    public void setHrReviewedAt(LocalDateTime hrReviewedAt) { this.hrReviewedAt = hrReviewedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
