package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.PolicyService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/hr/policies")
@PreAuthorize("hasRole('HR_ADMIN')")
public class PolicyHrController {

    private final PolicyService policyService;
    private final SecurityContextUtil securityContextUtil;

    public PolicyHrController(PolicyService policyService, SecurityContextUtil securityContextUtil) {
        this.policyService = policyService;
        this.securityContextUtil = securityContextUtil;
    }

    /**
     * List all policies with optional category and status filters
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PolicyDocumentDTO>>> listPolicies(
            @RequestParam(value = "categoryId", required = false) Long categoryId,
            @RequestParam(value = "status", required = false) String status
    ) {
        List<PolicyDocumentDTO> policies = policyService.getAllPoliciesForHr(categoryId, status);
        return ResponseEntity.ok(ApiResponse.success("Policies list", policies));
    }

    /**
     * Create a new policy draft
     */
    @PostMapping
    public ResponseEntity<ApiResponse<PolicyDocumentDTO>> createPolicy(
            @Valid @RequestBody CreatePolicyRequest req
    ) {
        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        PolicyDocumentDTO doc = policyService.createPolicy(req, userId);
        return new ResponseEntity<>(ApiResponse.success("Policy created successfully", doc), HttpStatus.CREATED);
    }

    /**
     * Update an existing policy draft
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PolicyDocumentDTO>> updatePolicyDraft(
            @PathVariable("id") Long id,
            @Valid @RequestBody CreatePolicyRequest req
    ) {
        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        PolicyDocumentDTO doc = policyService.updatePolicyDraft(id, req, userId);
        return ResponseEntity.ok(ApiResponse.success("Policy updated successfully", doc));
    }

    /**
     * Upload a new PDF version to Zoho WorkDrive for a policy
     */
    @PostMapping(value = "/{id}/versions", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<PolicyVersionDTO>> uploadVersion(
            @PathVariable("id") Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "versionNumber", required = false) String versionNumber,
            @RequestParam(value = "versionType", required = false, defaultValue = "MAJOR") String versionType,
            @RequestParam(value = "effectiveDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDate,
            @RequestParam(value = "allowDownload", required = false, defaultValue = "true") Boolean allowDownload,
            @RequestParam(value = "versionNotes", required = false) String versionNotes
    ) {
        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        PolicyVersionDTO version = policyService.uploadPolicyVersion(
                id,
                file,
                versionNumber,
                versionType,
                effectiveDate,
                allowDownload,
                versionNotes,
                userId
        );

        return new ResponseEntity<>(ApiResponse.success("Policy version uploaded successfully", version), HttpStatus.CREATED);
    }

    /**
     * Publish policy and generate audience assignments
     */
    @PostMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<PolicyDocumentDTO>> publishPolicy(
            @PathVariable("id") Long id,
            @Valid @RequestBody PublishPolicyRequest req
    ) {
        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        PolicyDocumentDTO doc = policyService.publishPolicy(id, req, userId);
        return ResponseEntity.ok(ApiResponse.success("Policy published successfully", doc));
    }

    /**
     * Archive a policy
     */
    @PostMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<PolicyDocumentDTO>> archivePolicy(@PathVariable("id") Long id) {
        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        PolicyDocumentDTO doc = policyService.archivePolicy(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Policy archived successfully", doc));
    }

    /**
     * Get policy details
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PolicyDocumentDTO>> getPolicyDetails(@PathVariable("id") Long id) {
        Long userId = securityContextUtil.getCurrentUserId();
        String role = securityContextUtil.getCurrentUserRole();
        PolicyDocumentDTO doc = policyService.getPolicyDetails(id, userId, role);
        return ResponseEntity.ok(ApiResponse.success("Policy details", doc));
    }

    /**
     * Get all versions of a policy
     */
    @GetMapping("/{id}/versions")
    public ResponseEntity<ApiResponse<List<PolicyVersionDTO>>> getPolicyVersions(@PathVariable("id") Long id) {
        Long userId = securityContextUtil.getCurrentUserId();
        String role = securityContextUtil.getCurrentUserRole();
        List<PolicyVersionDTO> versions = policyService.getPolicyVersions(id, userId, role);
        return ResponseEntity.ok(ApiResponse.success("Policy versions", versions));
    }

    /**
     * Get all assignments for a policy
     */
    @GetMapping("/{id}/assignments")
    public ResponseEntity<ApiResponse<List<PolicyAssignmentDTO>>> getPolicyAssignments(@PathVariable("id") Long id) {
        Long userId = securityContextUtil.getCurrentUserId();
        String role = securityContextUtil.getCurrentUserRole();
        List<PolicyAssignmentDTO> assignments = policyService.getPolicyAssignments(id, userId, role);
        return ResponseEntity.ok(ApiResponse.success("Policy assignments", assignments));
    }

    /**
     * Get compliance summary & department breakdown
     */
    @GetMapping("/{id}/compliance")
    public ResponseEntity<ApiResponse<PolicyComplianceSummaryDTO>> getComplianceSummary(@PathVariable("id") Long id) {
        Long userId = securityContextUtil.getCurrentUserId();
        String role = securityContextUtil.getCurrentUserRole();
        PolicyComplianceSummaryDTO summary = policyService.getPolicyComplianceSummary(id, userId, role);
        return ResponseEntity.ok(ApiResponse.success("Policy compliance summary", summary));
    }

    /**
     * Get all pending manager submissions
     */
    @GetMapping("/submissions")
    public ResponseEntity<ApiResponse<List<PolicyDocumentDTO>>> getPendingSubmissions() {
        List<PolicyDocumentDTO> submissions = policyService.getPendingSubmissionsForHr();
        return ResponseEntity.ok(ApiResponse.success("Pending policy submissions", submissions));
    }

    /**
     * Decide manager submission (APPROVE or REJECT)
     */
    @PostMapping("/submissions/{id}/decision")
    public ResponseEntity<ApiResponse<PolicyDocumentDTO>> decideSubmission(
            @PathVariable("id") Long id,
            @Valid @RequestBody ApprovalDecisionRequest req
    ) {
        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        PolicyDocumentDTO doc = policyService.decideManagerSubmission(id, req, userId);
        return ResponseEntity.ok(ApiResponse.success("Submission decision recorded", doc));
    }

    /**
     * Category management
     */
    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<PolicyCategoryDTO>>> getAllCategories() {
        List<PolicyCategoryDTO> categories = policyService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success("All policy categories", categories));
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<PolicyCategoryDTO>> createCategory(
            @Valid @RequestBody PolicyCategoryDTO req
    ) {
        Long userId = securityContextUtil.getCurrentUserId();
        PolicyCategoryDTO cat = policyService.createCategory(req, userId);
        return new ResponseEntity<>(ApiResponse.success("Category created", cat), HttpStatus.CREATED);
    }

    @PutMapping("/categories/{catId}")
    public ResponseEntity<ApiResponse<PolicyCategoryDTO>> updateCategory(
            @PathVariable("catId") Long catId,
            @Valid @RequestBody PolicyCategoryDTO req
    ) {
        Long userId = securityContextUtil.getCurrentUserId();
        PolicyCategoryDTO cat = policyService.updateCategory(catId, req, userId);
        return ResponseEntity.ok(ApiResponse.success("Category updated", cat));
    }
}
