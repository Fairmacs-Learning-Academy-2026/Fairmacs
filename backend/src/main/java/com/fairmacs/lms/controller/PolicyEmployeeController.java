package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.AcknowledgePolicyRequest;
import com.fairmacs.lms.dto.ApiResponse;
import com.fairmacs.lms.dto.PolicyAcknowledgementDTO;
import com.fairmacs.lms.dto.PolicyAssignmentDTO;
import com.fairmacs.lms.dto.PolicyCategoryDTO;
import com.fairmacs.lms.dto.PolicyDocumentDTO;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService.DownloadedDocument;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.PolicyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/policies")
public class PolicyEmployeeController {

    private final PolicyService policyService;
    private final SecurityContextUtil securityContextUtil;

    public PolicyEmployeeController(PolicyService policyService, SecurityContextUtil securityContextUtil) {
        this.policyService = policyService;
        this.securityContextUtil = securityContextUtil;
    }

    /**
     * Get active categories for filtering
     */
    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<PolicyCategoryDTO>>> getCategories() {
        List<PolicyCategoryDTO> categories = policyService.getActiveCategories();
        return ResponseEntity.ok(ApiResponse.success("Active policy categories", categories));
    }

    /**
     * Get assignments for authenticated user with optional status filter (ALL, PENDING, ACKNOWLEDGED, OVERDUE)
     */
    @GetMapping("/my-assignments")
    public ResponseEntity<ApiResponse<List<PolicyAssignmentDTO>>> getMyAssignments(
            @RequestParam(value = "status", required = false, defaultValue = "ALL") String status
    ) {
        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        List<PolicyAssignmentDTO> assignments = policyService.getMyAssignments(userId, status);
        return ResponseEntity.ok(ApiResponse.success("Employee policy assignments", assignments));
    }

    /**
     * Get immutable acknowledgement history for the authenticated user only
     */
    @GetMapping("/my-acknowledgements")
    public ResponseEntity<ApiResponse<List<PolicyAcknowledgementDTO>>> getMyAcknowledgements() {
        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        List<PolicyAcknowledgementDTO> history = policyService.getMyAcknowledgements(userId);
        return ResponseEntity.ok(ApiResponse.success("Employee policy acknowledgement history", history));
    }

    /**
     * Get published policy document details
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PolicyDocumentDTO>> getPolicyDetails(@PathVariable("id") Long id) {
        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        PolicyDocumentDTO doc = policyService.getMyPolicyDetails(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Policy details", doc));
    }

    /**
     * Stream policy PDF for in-app viewing
     */
    @GetMapping("/versions/{versionId}/view")
    public ResponseEntity<byte[]> viewPolicyDocument(@PathVariable("versionId") Long versionId) {
        Long userId = securityContextUtil.getCurrentUserId();
        String role = securityContextUtil.getCurrentUserRole();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        DownloadedDocument doc = policyService.viewPolicyDocument(versionId, userId, role);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(doc.contentType() != null ? doc.contentType() : MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.inline().filename(doc.filename()).build());
        headers.setContentLength(doc.content().length);
        headers.setCacheControl("private, max-age=3600");

        return new ResponseEntity<>(doc.content(), headers, HttpStatus.OK);
    }

    /**
     * Download policy PDF (blocked if allowDownload is false and user is not HR_ADMIN)
     */
    @GetMapping("/versions/{versionId}/download")
    public ResponseEntity<byte[]> downloadPolicyDocument(@PathVariable("versionId") Long versionId) {
        Long userId = securityContextUtil.getCurrentUserId();
        String role = securityContextUtil.getCurrentUserRole();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        DownloadedDocument doc = policyService.downloadPolicyDocument(versionId, userId, role);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(doc.contentType() != null ? doc.contentType() : MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment().filename(doc.filename()).build());
        headers.setContentLength(doc.content().length);

        return new ResponseEntity<>(doc.content(), headers, HttpStatus.OK);
    }

    /**
     * Acknowledge assigned policy (Idempotent, strictly append-only, self-only)
     */
    @PostMapping("/assignments/{assignmentId}/acknowledge")
    public ResponseEntity<ApiResponse<PolicyAcknowledgementDTO>> acknowledgePolicy(
            @PathVariable("assignmentId") Long assignmentId,
            @Valid @RequestBody(required = false) AcknowledgePolicyRequest req,
            HttpServletRequest request
    ) {
        Long userId = securityContextUtil.getCurrentUserId();
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        String clientIp = resolveClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        AcknowledgePolicyRequest effectiveReq = req != null ? req : new AcknowledgePolicyRequest();

        PolicyAcknowledgementDTO ack = policyService.acknowledgePolicy(
                assignmentId,
                effectiveReq,
                userId,
                clientIp,
                userAgent
        );

        return ResponseEntity.ok(ApiResponse.success("Policy acknowledged successfully", ack));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
