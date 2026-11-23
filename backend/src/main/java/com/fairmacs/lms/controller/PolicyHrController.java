package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.PolicyService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/hr/policies")
@PreAuthorize("hasAnyRole('HR_ADMIN', 'SUPER_ADMIN')")
public class PolicyHrController {

    private final PolicyService policyService;
    private final SecurityContextUtil securityContextUtil;

    public PolicyHrController(PolicyService policyService, SecurityContextUtil securityContextUtil) {
        this.policyService = policyService;
        this.securityContextUtil = securityContextUtil;
    }

    private Long requireHrOrSuperAdmin() {
        Long userId = securityContextUtil.getCurrentUserId();
        String role = securityContextUtil.getCurrentUserRole();
        if (userId == null && role == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (!"HR_ADMIN".equalsIgnoreCase(role) && !"SUPER_ADMIN".equalsIgnoreCase(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: HR Policy operations are restricted strictly to HR_ADMIN and SUPER_ADMIN.");
        }
        return userId;
    }

    /**
     * List all policies with optional category and status filters
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PolicyDocumentDTO>>> listPolicies(
            @RequestParam(value = "categoryId", required = false) Long categoryId,
            @RequestParam(value = "status", required = false) String status
    ) {
        requireHrOrSuperAdmin();
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
        Long userId = requireHrOrSuperAdmin();

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
        Long userId = requireHrOrSuperAdmin();

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
        Long userId = requireHrOrSuperAdmin();

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
        Long userId = requireHrOrSuperAdmin();

        PolicyDocumentDTO doc = policyService.publishPolicy(id, req, userId);
        return ResponseEntity.ok(ApiResponse.success("Policy published successfully", doc));
    }

    /**
     * Archive a policy
     */
    @PostMapping("/{id}/archive")
    public ResponseEntity<ApiResponse<PolicyDocumentDTO>> archivePolicy(@PathVariable("id") Long id) {
        Long userId = requireHrOrSuperAdmin();

        PolicyDocumentDTO doc = policyService.archivePolicy(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Policy archived successfully", doc));
    }

    /**
     * Get policy details
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PolicyDocumentDTO>> getPolicyDetails(@PathVariable("id") Long id) {
        Long userId = requireHrOrSuperAdmin();
        String role = securityContextUtil.getCurrentUserRole();
        PolicyDocumentDTO doc = policyService.getPolicyDetails(id, userId, role);
        return ResponseEntity.ok(ApiResponse.success("Policy details", doc));
    }

    /**
     * Get all versions of a policy
     */
    @GetMapping("/{id}/versions")
    public ResponseEntity<ApiResponse<List<PolicyVersionDTO>>> getPolicyVersions(@PathVariable("id") Long id) {
        Long userId = requireHrOrSuperAdmin();
        String role = securityContextUtil.getCurrentUserRole();
        List<PolicyVersionDTO> versions = policyService.getPolicyVersions(id, userId, role);
        return ResponseEntity.ok(ApiResponse.success("Policy versions", versions));
    }

    /**
     * Get organization-wide overview dashboard statistics
     */
    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<PolicyOrgOverviewDTO>> getOrganizationOverview() {
        requireHrOrSuperAdmin();
        PolicyOrgOverviewDTO overview = policyService.getOrganizationOverview();
        return ResponseEntity.ok(ApiResponse.success("Organization policy overview", overview));
    }

    /**
     * Get organization-wide assignments report with optional filters
     */
    @GetMapping("/assignments")
    public ResponseEntity<ApiResponse<List<PolicyAssignmentDTO>>> getAllPolicyAssignments(
            @RequestParam(value = "policyId", required = false) Long policyId,
            @RequestParam(value = "departmentId", required = false) Long departmentId,
            @RequestParam(value = "status", required = false) String status
    ) {
        requireHrOrSuperAdmin();
        List<PolicyAssignmentDTO> assignments = policyService.getAllPolicyAssignments(policyId, departmentId, status);
        return ResponseEntity.ok(ApiResponse.success("Organization policy assignments", assignments));
    }

    /**
     * Export policy assignments report to Excel (.xlsx)
     */
    @GetMapping("/assignments/export")
    public ResponseEntity<byte[]> exportAssignmentsToExcel(
            @RequestParam(value = "policyId", required = false) Long policyId,
            @RequestParam(value = "departmentId", required = false) Long departmentId,
            @RequestParam(value = "status", required = false) String status
    ) {
        requireHrOrSuperAdmin();
        byte[] excelBytes = policyService.exportAssignmentsToExcel(policyId, departmentId, status);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", "policies_acknowledgements_report.xlsx");
        headers.setContentLength(excelBytes.length);
        return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
    }

    // ==========================================
    // STAGE 8: COMPLIANCE REPORTS & TRACKING
    // ==========================================

    /**
     * Comprehensive organization compliance overview metrics
     */
    @GetMapping("/reports/overview")
    public ResponseEntity<ApiResponse<PolicyOrgOverviewDTO>> getReportsOverview() {
        requireHrOrSuperAdmin();
        PolicyOrgOverviewDTO overview = policyService.getOrganizationOverview();
        return ResponseEntity.ok(ApiResponse.success("Organization compliance overview loaded", overview));
    }

    /**
     * Department-wise compliance comparison
     */
    @GetMapping("/reports/departments")
    public ResponseEntity<ApiResponse<List<PolicyDepartmentReportDTO>>> getDepartmentReports() {
        requireHrOrSuperAdmin();
        String role = securityContextUtil.getCurrentUserRole();
        List<PolicyDepartmentReportDTO> reports = policyService.getDepartmentComplianceReports(null, role);
        return ResponseEntity.ok(ApiResponse.success("Department compliance reports loaded", reports));
    }

    /**
     * Document-wise compliance performance
     */
    @GetMapping("/reports/documents")
    public ResponseEntity<ApiResponse<List<PolicyDocumentReportDTO>>> getDocumentReports(
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "mandatory", required = false) Boolean mandatory,
            @RequestParam(value = "status", required = false) String status
    ) {
        requireHrOrSuperAdmin();
        String role = securityContextUtil.getCurrentUserRole();
        List<PolicyDocumentReportDTO> reports = policyService.getDocumentComplianceReports(null, role, category, mandatory, status);
        return ResponseEntity.ok(ApiResponse.success("Document compliance reports loaded", reports));
    }

    /**
     * Employee-wise compliance tracking table
     */
    @GetMapping("/reports/employees")
    public ResponseEntity<ApiResponse<List<PolicyEmployeeReportDTO>>> getEmployeeReports(
            @RequestParam(value = "departmentId", required = false) Long departmentId,
            @RequestParam(value = "complianceStatus", required = false) String complianceStatus,
            @RequestParam(value = "userStatus", required = false) String userStatus,
            @RequestParam(value = "search", required = false) String search
    ) {
        requireHrOrSuperAdmin();
        String role = securityContextUtil.getCurrentUserRole();
        List<PolicyEmployeeReportDTO> reports = policyService.getEmployeeComplianceReports(null, role, departmentId, complianceStatus, userStatus, search);
        return ResponseEntity.ok(ApiResponse.success("Employee compliance reports loaded", reports));
    }

    /**
     * Individual employee acknowledgement history
     */
    @GetMapping("/reports/employees/{employeeId}/history")
    public ResponseEntity<ApiResponse<PolicyEmployeeHistoryDTO>> getEmployeeHistory(@PathVariable("employeeId") Long employeeId) {
        Long requesterId = requireHrOrSuperAdmin();
        String role = securityContextUtil.getCurrentUserRole();
        PolicyEmployeeHistoryDTO history = policyService.getEmployeeAcknowledgementHistory(employeeId, requesterId, role);
        return ResponseEntity.ok(ApiResponse.success("Employee acknowledgement history loaded", history));
    }

    /**
     * Unified Excel (.xlsx) export for HR/Admin reports
     */
    @GetMapping("/reports/export")
    public ResponseEntity<byte[]> exportReportsToExcel(
            @RequestParam(value = "type", required = false, defaultValue = "ASSIGNMENTS") String type,
            @RequestParam(value = "departmentId", required = false) Long departmentId,
            @RequestParam(value = "policyId", required = false) Long policyId,
            @RequestParam(value = "status", required = false) String status
    ) {
        requireHrOrSuperAdmin();
        String role = securityContextUtil.getCurrentUserRole();
        byte[] excelBytes = policyService.exportComplianceReportToExcel(type, null, role, departmentId, policyId, status);

        String filename = "Policy_Compliance_" + type.toUpperCase() + "_Report.xlsx";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(excelBytes.length);

        return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
    }

    /**
     * Policy-wise Excel (.xlsx) compliance report export for HR/Admin
     */
    @GetMapping("/reports/documents/{policyId}/export")
    public ResponseEntity<byte[]> exportPolicyDocumentReportToExcel(
            @PathVariable("policyId") Long policyId
    ) {
        requireHrOrSuperAdmin();
        String role = securityContextUtil.getCurrentUserRole();
        PolicyExcelExportResult result = policyService.exportPolicyDocumentComplianceExcel(policyId, null, role);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", result.filename());
        headers.setContentLength(result.excelBytes().length);
        headers.set("Access-Control-Expose-Headers", "Content-Disposition");

        return new ResponseEntity<>(result.excelBytes(), headers, HttpStatus.OK);
    }

    /**
     * Get all assignments for a policy
     */
    @GetMapping("/{id}/assignments")
    public ResponseEntity<ApiResponse<List<PolicyAssignmentDTO>>> getPolicyAssignments(@PathVariable("id") Long id) {
        Long userId = requireHrOrSuperAdmin();
        String role = securityContextUtil.getCurrentUserRole();
        List<PolicyAssignmentDTO> assignments = policyService.getPolicyAssignments(id, userId, role);
        return ResponseEntity.ok(ApiResponse.success("Policy assignments", assignments));
    }

    /**
     * Get compliance summary & department breakdown
     */
    @GetMapping("/{id}/compliance")
    public ResponseEntity<ApiResponse<PolicyComplianceSummaryDTO>> getComplianceSummary(@PathVariable("id") Long id) {
        Long userId = requireHrOrSuperAdmin();
        String role = securityContextUtil.getCurrentUserRole();
        PolicyComplianceSummaryDTO summary = policyService.getPolicyComplianceSummary(id, userId, role);
        return ResponseEntity.ok(ApiResponse.success("Policy compliance summary", summary));
    }

    /**
     * Get all pending manager submissions
     */
    @GetMapping("/submissions")
    public ResponseEntity<ApiResponse<List<PolicyDocumentDTO>>> getPendingSubmissions() {
        requireHrOrSuperAdmin();
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
        Long userId = requireHrOrSuperAdmin();

        PolicyDocumentDTO doc = policyService.decideManagerSubmission(id, req, userId);
        return ResponseEntity.ok(ApiResponse.success("Submission decision recorded", doc));
    }

    /**
     * Category management
     */
    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<PolicyCategoryDTO>>> getAllCategories() {
        requireHrOrSuperAdmin();
        List<PolicyCategoryDTO> categories = policyService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success("All policy categories", categories));
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<PolicyCategoryDTO>> createCategory(
            @Valid @RequestBody PolicyCategoryDTO req
    ) {
        Long userId = requireHrOrSuperAdmin();
        PolicyCategoryDTO cat = policyService.createCategory(req, userId);
        return new ResponseEntity<>(ApiResponse.success("Category created", cat), HttpStatus.CREATED);
    }

    @PutMapping("/categories/{catId}")
    public ResponseEntity<ApiResponse<PolicyCategoryDTO>> updateCategory(
            @PathVariable("catId") Long catId,
            @Valid @RequestBody PolicyCategoryDTO req
    ) {
        Long userId = requireHrOrSuperAdmin();
        PolicyCategoryDTO cat = policyService.updateCategory(catId, req, userId);
        return ResponseEntity.ok(ApiResponse.success("Category updated", cat));
    }
}
