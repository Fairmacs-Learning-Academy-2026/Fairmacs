package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.ApiResponse;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService.DownloadedDocument;
import com.fairmacs.lms.repository.EmploymentStatusRequestRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.EmployeeDocumentService;
import com.fairmacs.lms.service.EmployeeProfileService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/profile")
public class EmployeeProfileController {

    private final EmployeeProfileService profileService;
    private final EmployeeDocumentService documentService;
    private final SecurityContextUtil securityContextUtil;
    private final UserRepository userRepository;
    private final EmploymentStatusRequestRepository statusRequestRepository;

    public EmployeeProfileController(
            EmployeeProfileService profileService,
            EmployeeDocumentService documentService,
            SecurityContextUtil securityContextUtil,
            UserRepository userRepository,
            EmploymentStatusRequestRepository statusRequestRepository
    ) {
        this.profileService = profileService;
        this.documentService = documentService;
        this.securityContextUtil = securityContextUtil;
        this.userRepository = userRepository;
        this.statusRequestRepository = statusRequestRepository;
    }

    private User getAuthenticatedUser() {
        User user = securityContextUtil.getCurrentUser();
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required.");
        }
        return user;
    }

    /**
     * Get profile for logged-in user.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyProfile() {
        User actor = getAuthenticatedUser();
        Map<String, Object> profile = profileService.getEmployeeProfile(actor.getId(), actor);
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", profile));
    }

    /**
     * Get profile by user ID or Employee ID (RBAC enforced).
     */
    @GetMapping("/{identifier}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProfileByIdentifier(@PathVariable String identifier) {
        User actor = getAuthenticatedUser();
        User target = profileService.resolveTargetUser(identifier);
        if (target == null) {
            target = actor;
        }
        Map<String, Object> profile = profileService.getEmployeeProfile(target.getId(), actor);
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", profile));
    }

    /**
     * Update personal information.
     */
    @PutMapping("/personal-info")
    public ResponseEntity<ApiResponse<EmployeePersonalInformation>> updatePersonalInfo(
            @RequestParam(value = "userId", required = false) Long targetUserId,
            @RequestBody Map<String, Object> request
    ) {
        User actor = getAuthenticatedUser();
        Long uid = targetUserId != null ? targetUserId : actor.getId();
        EmployeePersonalInformation updated = profileService.updatePersonalInformation(uid, request, actor);
        return ResponseEntity.ok(ApiResponse.success("Personal information updated successfully", updated));
    }

    /**
     * Add or update emergency contact.
     */
    @PostMapping("/emergency-contacts")
    public ResponseEntity<ApiResponse<EmployeeEmergencyContact>> saveEmergencyContact(
            @RequestParam(value = "userId", required = false) Long targetUserId,
            @RequestBody Map<String, Object> request
    ) {
        User actor = getAuthenticatedUser();
        Long uid = targetUserId != null ? targetUserId : actor.getId();
        EmployeeEmergencyContact contact = profileService.addOrUpdateEmergencyContact(uid, request, actor);
        return ResponseEntity.ok(ApiResponse.success("Emergency contact saved successfully", contact));
    }

    /**
     * Delete emergency contact.
     */
    @DeleteMapping("/emergency-contacts/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEmergencyContact(@PathVariable Long id) {
        User actor = getAuthenticatedUser();
        profileService.deleteEmergencyContact(id, actor);
        return ResponseEntity.ok(ApiResponse.success("Emergency contact deleted successfully", null));
    }

    /**
     * Update preferences.
     */
    @PutMapping("/preferences")
    public ResponseEntity<ApiResponse<EmployeePreference>> updatePreferences(
            @RequestParam(value = "userId", required = false) Long targetUserId,
            @RequestBody Map<String, Object> request
    ) {
        User actor = getAuthenticatedUser();
        Long uid = targetUserId != null ? targetUserId : actor.getId();
        EmployeePreference pref = profileService.updatePreferences(uid, request, actor);
        return ResponseEntity.ok(ApiResponse.success("Preferences updated successfully", pref));
    }

    /**
     * Submit employment status change request.
     */
    @PostMapping({"/status-requests", "/status-request"})
    public ResponseEntity<ApiResponse<EmploymentStatusRequest>> submitStatusRequest(@RequestBody Map<String, Object> request) {
        User actor = getAuthenticatedUser();
        EmploymentStatusRequest req = profileService.submitStatusRequest(request, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Employment status change request submitted successfully", req));
    }

    /**
     * Get pending status requests for Manager review or HR decision.
     */
    @GetMapping({"/status-requests/pending", "/status-request/pending"})
    @PreAuthorize("hasAnyRole('MANAGER', 'HR_ADMIN')")
    public ResponseEntity<ApiResponse<List<EmploymentStatusRequest>>> getPendingStatusRequests() {
        User actor = getAuthenticatedUser();
        List<EmploymentStatusRequest> pending;

        if (actor.getRole() == Role.HR_ADMIN) {
            pending = statusRequestRepository.findByRequestStatusOrderByCreatedAtDesc("PENDING_HR");
            List<EmploymentStatusRequest> managerPending = statusRequestRepository.findByRequestStatusOrderByCreatedAtDesc("PENDING_MANAGER");
            pending.addAll(managerPending);
        } else {
            // Manager: only requests from employees in their department
            String dept = actor.getDepartment();
            List<EmploymentStatusRequest> allMgrPending = statusRequestRepository.findByRequestStatusOrderByCreatedAtDesc("PENDING_MANAGER");
            pending = allMgrPending.stream().filter(r -> {
                Optional<User> u = userRepository.findById(r.getUserId());
                return u.isPresent() && dept != null && dept.equalsIgnoreCase(u.get().getDepartment());
            }).toList();
        }

        return ResponseEntity.ok(ApiResponse.success("Pending requests retrieved", pending));
    }

    /**
     * Manager review and recommendation on status request.
     */
    @RequestMapping(value = {"/status-requests/{id}/manager-review", "/status-requests/{id}/review"}, method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('MANAGER', 'HR_ADMIN')")
    public ResponseEntity<ApiResponse<EmploymentStatusRequest>> reviewStatusRequest(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {
        User manager = getAuthenticatedUser();
        String recommendation = request.get("recommendation") != null ? String.valueOf(request.get("recommendation")) : "RECOMMENDED";
        String comment = request.get("comment") != null ? String.valueOf(request.get("comment")) : null;

        EmploymentStatusRequest reviewed = profileService.managerReviewStatusRequest(id, recommendation, comment, manager);
        return ResponseEntity.ok(ApiResponse.success("Status request reviewed and forwarded to HR", reviewed));
    }

    /**
     * HR Admin decision on status request (Approve / Reject).
     */
    @RequestMapping(value = {"/status-requests/{id}/hr-decision", "/status-requests/{id}/decision"}, method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<ApiResponse<EmploymentStatusRequest>> decideStatusRequest(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {
        User hrAdmin = getAuthenticatedUser();
        Object approveObj = request.get("approve") != null ? request.get("approve") : request.get("approved");
        boolean approve = Boolean.TRUE.equals(approveObj) || "true".equalsIgnoreCase(String.valueOf(approveObj));
        String comment = request.get("comment") != null ? String.valueOf(request.get("comment")) : null;

        EmploymentStatusRequest decided = profileService.hrAdminDecideStatusRequest(id, approve, comment, hrAdmin);
        return ResponseEntity.ok(ApiResponse.success("Status request decision recorded", decided));
    }

    /**
     * HR Admin direct employment status update.
     */
    @PostMapping("/status/direct-change")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<ApiResponse<User>> directStatusChange(@RequestBody Map<String, Object> request) {
        User hrAdmin = getAuthenticatedUser();
        String employeeId = request.get("employeeId") != null ? String.valueOf(request.get("employeeId")) : null;
        Long targetUserId = request.get("targetUserId") != null ? Long.valueOf(String.valueOf(request.get("targetUserId")))
                : (request.get("userId") != null ? Long.valueOf(String.valueOf(request.get("userId"))) : null);
        String newStatus = request.get("status") != null ? String.valueOf(request.get("status"))
                : (request.get("newStatus") != null ? String.valueOf(request.get("newStatus")) : "ACTIVE");
        String reason = request.get("reason") != null ? String.valueOf(request.get("reason")) : null;
        String comment = request.get("comment") != null ? String.valueOf(request.get("comment")) : null;

        User updated = profileService.hrAdminDirectStatusChange(employeeId, targetUserId, newStatus, reason, comment, hrAdmin);
        return ResponseEntity.ok(ApiResponse.success("Employment status updated successfully", updated));
    }

    /**
     * Get documents for target employee.
     */
    @GetMapping("/documents")
    public ResponseEntity<ApiResponse<List<EmployeeDocument>>> getDocuments(
            @RequestParam(value = "userId", required = false) Long targetUserId
    ) {
        User actor = getAuthenticatedUser();
        Long uid = targetUserId != null ? targetUserId : actor.getId();
        List<EmployeeDocument> docs = documentService.getDocumentsForTargetUser(uid, actor);
        return ResponseEntity.ok(ApiResponse.success("Documents retrieved", docs));
    }

    /**
     * Upload document to Zoho WorkDrive.
     */
    @PostMapping(value = "/documents/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<EmployeeDocument>> uploadDocument(
            @RequestParam(value = "userId", required = false) Long targetUserId,
            @RequestParam("category") String category,
            @RequestParam("file") MultipartFile file
    ) {
        User actor = getAuthenticatedUser();
        Long uid = targetUserId != null ? targetUserId : actor.getId();
        EmployeeDocument doc = documentService.uploadDocument(uid, category, file, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Document uploaded successfully to Zoho WorkDrive", doc));
    }

    /**
     * Replace existing document in Zoho WorkDrive.
     */
    @PostMapping(value = "/documents/{id}/replace", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<EmployeeDocument>> replaceDocument(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file
    ) {
        User actor = getAuthenticatedUser();
        EmployeeDocument doc = documentService.replaceDocument(id, file, actor);
        return ResponseEntity.ok(ApiResponse.success("Document replaced successfully in Zoho WorkDrive", doc));
    }

    /**
     * Download document securely from Zoho WorkDrive.
     */
    @GetMapping("/documents/{id}/download")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable Long id) {
        User actor = getAuthenticatedUser();
        DownloadedDocument doc = documentService.downloadDocument(id, actor);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(doc.contentType());
        headers.setContentDispositionFormData("attachment", doc.filename());
        return new ResponseEntity<>(doc.content(), headers, HttpStatus.OK);
    }

    /**
     * Delete document.
     */
    @DeleteMapping("/documents/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable Long id) {
        User actor = getAuthenticatedUser();
        documentService.deleteDocument(id, actor);
        return ResponseEntity.ok(ApiResponse.success("Document deleted successfully", null));
    }
}
