package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.*;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService.DownloadedDocument;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

public interface PolicyService {

    // ==========================================
    // 1. Categories
    // ==========================================
    List<PolicyCategoryDTO> getAllCategories();

    List<PolicyCategoryDTO> getActiveCategories();

    PolicyCategoryDTO createCategory(PolicyCategoryDTO dto, Long userId);

    PolicyCategoryDTO updateCategory(Long id, PolicyCategoryDTO dto, Long userId);

    // ==========================================
    // 2. Policy Document Lifecycle (HR / Admin)
    // ==========================================
    PolicyDocumentDTO createPolicy(CreatePolicyRequest req, Long userId);

    PolicyDocumentDTO updatePolicyDraft(Long id, CreatePolicyRequest req, Long userId);

    PolicyVersionDTO uploadPolicyVersion(
            Long policyId,
            MultipartFile file,
            String versionNumber,
            String versionType,
            LocalDate effectiveDate,
            Boolean allowDownload,
            String versionNotes,
            Long userId
    );

    PolicyDocumentDTO publishPolicy(Long policyId, PublishPolicyRequest req, Long userId);

    PolicyDocumentDTO archivePolicy(Long policyId, Long userId);

    PolicyDocumentDTO getPolicyDetails(Long policyId, Long userId, String userRole);

    List<PolicyDocumentDTO> getAllPoliciesForHr(Long categoryId, String status);

    List<PolicyVersionDTO> getPolicyVersions(Long policyId, Long userId, String userRole);

    List<PolicyAssignmentDTO> getPolicyAssignments(Long policyId, Long userId, String userRole);

    // ==========================================
    // 3. Manager Operations & Submissions
    // ==========================================
    PolicyDocumentDTO submitDepartmentPolicy(
            ManagerPolicySubmissionRequest req,
            MultipartFile file,
            Long managerId
    );

    List<PolicyDocumentDTO> getDepartmentPoliciesForManager(Long managerId);

    List<PolicyDocumentDTO> getPendingSubmissionsForHr();

    PolicyDocumentDTO decideManagerSubmission(
            Long policyId,
            ApprovalDecisionRequest decision,
            Long hrAdminId
    );

    // ==========================================
    // 4. Employee Policy Operations
    // ==========================================
    List<PolicyAssignmentDTO> getMyAssignments(Long userId, String statusFilter);

    PolicyDocumentDTO getMyPolicyDetails(Long policyId, Long userId);

    DownloadedDocument viewPolicyDocument(Long versionId, Long userId, String userRole);

    DownloadedDocument downloadPolicyDocument(Long versionId, Long userId, String userRole);

    PolicyAcknowledgementDTO acknowledgePolicy(
            Long assignmentId,
            AcknowledgePolicyRequest req,
            Long userId,
            String ipAddress,
            String userAgent
    );

    // ==========================================
    // 5. Compliance Reporting
    // ==========================================
    PolicyComplianceSummaryDTO getPolicyComplianceSummary(Long policyId, Long userId, String userRole);

    List<PolicyComplianceSummaryDTO.DepartmentComplianceDTO> getDepartmentComplianceBreakdown(
            Long policyId,
            Long userId,
            String userRole
    );

    // ==========================================
    // 6. Audit Logging
    // ==========================================
    void logAudit(
            Long policyDocumentId,
            Long policyVersionId,
            Long userId,
            String action,
            String description,
            String ipAddress
    );
}
