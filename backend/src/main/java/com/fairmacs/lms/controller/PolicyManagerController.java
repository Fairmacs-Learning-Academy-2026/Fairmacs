package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.PolicyService;
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
@RequestMapping("/api/manager/policies")
@PreAuthorize("hasRole('MANAGER')")
public class PolicyManagerController {

    private final PolicyService policyService;
    private final SecurityContextUtil securityContextUtil;

    public PolicyManagerController(PolicyService policyService, SecurityContextUtil securityContextUtil) {
        this.policyService = policyService;
        this.securityContextUtil = securityContextUtil;
    }

    private Long requireAuthenticatedManagerId() {
        Long managerId = securityContextUtil.getCurrentUserId();
        if (managerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        String role = securityContextUtil.getCurrentUserRole();
        if (!"MANAGER".equalsIgnoreCase(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Manager Policies module is restricted strictly to the MANAGER role.");
        }
        return managerId;
    }

    /**
     * Department Overview Dashboard metrics scoped strictly to manager's department hierarchy
     */
    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<PolicyDeptOverviewDTO>> getDepartmentOverview() {
        Long managerId = requireAuthenticatedManagerId();

        PolicyDeptOverviewDTO overview = policyService.getDepartmentOverview(managerId);
        return ResponseEntity.ok(ApiResponse.success("Department overview loaded", overview));
    }

    /**
     * List departments managed by the manager (for forms and filters)
     */
    @GetMapping("/departments")
    public ResponseEntity<ApiResponse<List<DepartmentSummaryDTO>>> getManagerDepartments() {
        Long managerId = requireAuthenticatedManagerId();

        List<DepartmentSummaryDTO> depts = policyService.getManagerDepartments(managerId);
        return ResponseEntity.ok(ApiResponse.success("Manager departments loaded", depts));
    }

    /**
     * List published policies applicable to manager's department hierarchy (company-wide + dept-assigned + employee-assigned)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PolicyDocumentDTO>>> getDepartmentPolicies() {
        Long managerId = requireAuthenticatedManagerId();

        List<PolicyDocumentDTO> policies = policyService.getDepartmentPoliciesForManager(managerId);
        return ResponseEntity.ok(ApiResponse.success("Department policies", policies));
    }

    /**
     * Submit a department-specific policy / SOP draft for HR/Admin approval
     */
    @PostMapping(value = "/submissions", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<PolicyDocumentDTO>> submitDepartmentPolicy(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("categoryId") Long categoryId,
            @RequestParam(value = "targetDepartmentId", required = false) Long targetDepartmentId,
            @RequestParam(value = "versionNumber", required = false, defaultValue = "1.0") String versionNumber,
            @RequestParam(value = "effectiveDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveDate,
            @RequestParam(value = "mandatory", required = false, defaultValue = "true") Boolean mandatory,
            @RequestParam(value = "dueDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDate,
            @RequestParam(value = "allowDownload", required = false, defaultValue = "true") Boolean allowDownload,
            @RequestParam(value = "submissionNotes", required = false) String submissionNotes
    ) {
        Long managerId = requireAuthenticatedManagerId();

        ManagerPolicySubmissionRequest req = new ManagerPolicySubmissionRequest();
        req.setTitle(title);
        req.setDescription(description);
        req.setCategoryId(categoryId);
        req.setTargetDepartmentId(targetDepartmentId);
        req.setVersionNumber(versionNumber);
        req.setEffectiveDate(effectiveDate);
        req.setMandatory(mandatory);
        req.setDueDate(dueDate);
        req.setAllowDownload(allowDownload);
        req.setSubmissionNotes(submissionNotes);

        PolicyDocumentDTO doc = policyService.submitDepartmentPolicy(req, file, managerId);
        return new ResponseEntity<>(ApiResponse.success("Policy submitted for approval", doc), HttpStatus.CREATED);
    }

    /**
     * Get manager's department submissions (with HR review remarks and approval statuses)
     */
    @GetMapping("/submissions")
    public ResponseEntity<ApiResponse<List<PolicyDocumentDTO>>> getMySubmissions() {
        Long managerId = requireAuthenticatedManagerId();

        List<PolicyDocumentDTO> submissions = policyService.getManagerSubmissions(managerId);
        return ResponseEntity.ok(ApiResponse.success("Department submissions", submissions));
    }

    /**
     * Get compliance summary for a policy, scoped strictly to manager's department hierarchy
     */
    @GetMapping("/{id}/compliance")
    public ResponseEntity<ApiResponse<PolicyComplianceSummaryDTO>> getDepartmentCompliance(
            @PathVariable("id") Long id
    ) {
        Long managerId = requireAuthenticatedManagerId();
        String role = securityContextUtil.getCurrentUserRole();

        PolicyComplianceSummaryDTO summary = policyService.getPolicyComplianceSummary(id, managerId, role);
        return ResponseEntity.ok(ApiResponse.success("Department compliance summary", summary));
    }

    /**
     * Get department policy assignments for reports & pending acknowledgements tracking
     */
    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<List<PolicyAssignmentDTO>>> getDepartmentReports(
            @RequestParam(value = "policyId", required = false) Long policyId,
            @RequestParam(value = "departmentId", required = false) Long departmentId,
            @RequestParam(value = "status", required = false, defaultValue = "ALL") String status
    ) {
        Long managerId = requireAuthenticatedManagerId();

        List<PolicyAssignmentDTO> assignments = policyService.getDepartmentPolicyAssignments(managerId, policyId, departmentId, status);
        return ResponseEntity.ok(ApiResponse.success("Department report assignments loaded", assignments));
    }

    // ==========================================
    // STAGE 8: MANAGER COMPLIANCE REPORTING & TRACKING
    // ==========================================

    /**
     * Department-wise compliance comparison across manager's authorized hierarchy
     */
    @GetMapping("/reports/departments")
    public ResponseEntity<ApiResponse<List<PolicyDepartmentReportDTO>>> getDepartmentReportsList() {
        Long managerId = requireAuthenticatedManagerId();
        String role = securityContextUtil.getCurrentUserRole();
        List<PolicyDepartmentReportDTO> reports = policyService.getDepartmentComplianceReports(managerId, role);
        return ResponseEntity.ok(ApiResponse.success("Manager department reports loaded", reports));
    }

    /**
     * Document-wise compliance performance scoped to manager's department hierarchy
     */
    @GetMapping("/reports/documents")
    public ResponseEntity<ApiResponse<List<PolicyDocumentReportDTO>>> getManagerDocumentReports(
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "mandatory", required = false) Boolean mandatory,
            @RequestParam(value = "status", required = false) String status
    ) {
        Long managerId = requireAuthenticatedManagerId();
        String role = securityContextUtil.getCurrentUserRole();
        List<PolicyDocumentReportDTO> reports = policyService.getDocumentComplianceReports(managerId, role, category, mandatory, status);
        return ResponseEntity.ok(ApiResponse.success("Department document compliance reports loaded", reports));
    }

    /**
     * Employees within manager's authorized department hierarchy
     */
    @GetMapping("/reports/employees")
    public ResponseEntity<ApiResponse<List<PolicyEmployeeReportDTO>>> getManagerEmployeeReports(
            @RequestParam(value = "departmentId", required = false) Long departmentId,
            @RequestParam(value = "complianceStatus", required = false) String complianceStatus,
            @RequestParam(value = "userStatus", required = false) String userStatus,
            @RequestParam(value = "search", required = false) String search
    ) {
        Long managerId = requireAuthenticatedManagerId();
        String role = securityContextUtil.getCurrentUserRole();
        List<PolicyEmployeeReportDTO> reports = policyService.getEmployeeComplianceReports(managerId, role, departmentId, complianceStatus, userStatus, search);
        return ResponseEntity.ok(ApiResponse.success("Department employee compliance reports loaded", reports));
    }

    /**
     * Individual employee acknowledgement history (strictly scoped to manager's hierarchy)
     */
    @GetMapping("/reports/employees/{employeeId}/history")
    public ResponseEntity<ApiResponse<PolicyEmployeeHistoryDTO>> getManagerEmployeeHistory(
            @PathVariable("employeeId") Long employeeId
    ) {
        Long managerId = requireAuthenticatedManagerId();
        String role = securityContextUtil.getCurrentUserRole();
        PolicyEmployeeHistoryDTO history = policyService.getEmployeeAcknowledgementHistory(employeeId, managerId, role);
        return ResponseEntity.ok(ApiResponse.success("Department employee acknowledgement history loaded", history));
    }

    /**
     * Export department policy compliance reports to styled Excel spreadsheet (.xlsx)
     */
    @GetMapping("/reports/export")
    public ResponseEntity<byte[]> exportDepartmentReports(
            @RequestParam(value = "type", required = false, defaultValue = "ASSIGNMENTS") String type,
            @RequestParam(value = "policyId", required = false) Long policyId,
            @RequestParam(value = "departmentId", required = false) Long departmentId,
            @RequestParam(value = "status", required = false, defaultValue = "ALL") String status
    ) {
        Long managerId = requireAuthenticatedManagerId();
        String role = securityContextUtil.getCurrentUserRole();

        byte[] excelBytes = policyService.exportComplianceReportToExcel(type, managerId, role, departmentId, policyId, status);

        String filename = "Department_Policies_" + type.toUpperCase() + "_Report.xlsx";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", filename);
        headers.setContentLength(excelBytes.length);

        return new ResponseEntity<>(excelBytes, headers, HttpStatus.OK);
    }

    /**
     * Policy-wise Excel (.xlsx) compliance report export scoped to Manager's authorized department hierarchy
     */
    @GetMapping("/reports/documents/{policyId}/export")
    public ResponseEntity<byte[]> exportManagerPolicyDocumentReportToExcel(
            @PathVariable("policyId") Long policyId
    ) {
        Long managerId = requireAuthenticatedManagerId();
        String role = securityContextUtil.getCurrentUserRole();

        PolicyExcelExportResult result = policyService.exportPolicyDocumentComplianceExcel(policyId, managerId, role);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", result.filename());
        headers.setContentLength(result.excelBytes().length);
        headers.set("Access-Control-Expose-Headers", "Content-Disposition");

        return new ResponseEntity<>(result.excelBytes(), headers, HttpStatus.OK);
    }

    /**
     * Send in-app reminder notification to employee for a pending or overdue policy
     */
    @PostMapping("/assignments/{assignmentId}/remind")
    public ResponseEntity<ApiResponse<Void>> sendReminder(@PathVariable("assignmentId") Long assignmentId) {
        Long managerId = requireAuthenticatedManagerId();

        policyService.sendAcknowledgementReminder(assignmentId, managerId);
        return ResponseEntity.ok(ApiResponse.success("Reminder notification sent to employee successfully", null));
    }
}
