package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.ApiResponse;
import com.fairmacs.lms.dto.ManagerPolicySubmissionRequest;
import com.fairmacs.lms.dto.PolicyComplianceSummaryDTO;
import com.fairmacs.lms.dto.PolicyDocumentDTO;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.PolicyService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/manager/policies")
@PreAuthorize("hasAnyRole('MANAGER', 'HR_ADMIN')")
public class PolicyManagerController {

    private final PolicyService policyService;
    private final SecurityContextUtil securityContextUtil;

    public PolicyManagerController(PolicyService policyService, SecurityContextUtil securityContextUtil) {
        this.policyService = policyService;
        this.securityContextUtil = securityContextUtil;
    }

    /**
     * List policies targeted to or owned by manager's department hierarchy
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PolicyDocumentDTO>>> getDepartmentPolicies() {
        Long managerId = securityContextUtil.getCurrentUserId();
        if (managerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        List<PolicyDocumentDTO> policies = policyService.getDepartmentPoliciesForManager(managerId);
        return ResponseEntity.ok(ApiResponse.success("Department policies", policies));
    }

    /**
     * Submit a department-specific policy draft for HR/Admin approval
     */
    @PostMapping(value = "/submissions", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<PolicyDocumentDTO>> submitDepartmentPolicy(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("categoryId") Long categoryId,
            @RequestParam("targetDepartmentId") Long targetDepartmentId,
            @RequestParam(value = "allowDownload", required = false, defaultValue = "true") Boolean allowDownload,
            @RequestParam(value = "submissionNotes", required = false) String submissionNotes
    ) {
        Long managerId = securityContextUtil.getCurrentUserId();
        if (managerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        ManagerPolicySubmissionRequest req = new ManagerPolicySubmissionRequest();
        req.setTitle(title);
        req.setDescription(description);
        req.setCategoryId(categoryId);
        req.setTargetDepartmentId(targetDepartmentId);
        req.setAllowDownload(allowDownload);
        req.setSubmissionNotes(submissionNotes);

        PolicyDocumentDTO doc = policyService.submitDepartmentPolicy(req, file, managerId);
        return new ResponseEntity<>(ApiResponse.success("Policy submitted for approval", doc), HttpStatus.CREATED);
    }

    /**
     * Get manager's department submissions
     */
    @GetMapping("/submissions")
    public ResponseEntity<ApiResponse<List<PolicyDocumentDTO>>> getMySubmissions() {
        Long managerId = securityContextUtil.getCurrentUserId();
        if (managerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        List<PolicyDocumentDTO> submissions = policyService.getDepartmentPoliciesForManager(managerId);
        return ResponseEntity.ok(ApiResponse.success("Department submissions", submissions));
    }

    /**
     * Get compliance summary for a policy, scoped strictly to manager's department hierarchy
     */
    @GetMapping("/{id}/compliance")
    public ResponseEntity<ApiResponse<PolicyComplianceSummaryDTO>> getDepartmentCompliance(
            @PathVariable("id") Long id
    ) {
        Long managerId = securityContextUtil.getCurrentUserId();
        String role = securityContextUtil.getCurrentUserRole();
        if (managerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        PolicyComplianceSummaryDTO summary = policyService.getPolicyComplianceSummary(id, managerId, role);
        return ResponseEntity.ok(ApiResponse.success("Department compliance summary", summary));
    }
}
