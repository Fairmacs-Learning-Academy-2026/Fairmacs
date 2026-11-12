package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.EmployeeDocument;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService.DownloadedDocument;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveService;
import com.fairmacs.lms.repository.EmployeeDocumentRepository;
import com.fairmacs.lms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class EmployeeDocumentService {

    private static final Logger log = LoggerFactory.getLogger(EmployeeDocumentService.class);

    public static final String ROOT_FOLDER_ID = "ap17jb6b3094df81d4dd79ccea04508fc6910";

    public static final String CAT_OFFER_LETTER = "Offer Letter";
    public static final String CAT_APPOINTMENT_LETTER = "Appointment Letter";
    public static final String CAT_EMPLOYMENT_AGREEMENT = "Employment Agreement";
    public static final String CAT_IDENTITY_DOCUMENTS = "Identity Documents";
    public static final String CAT_EDUCATIONAL_CERTIFICATES = "Educational Certificates";
    public static final String CAT_EXPERIENCE_CERTIFICATES = "Experience Certificates";
    public static final String CAT_COMPANY_POLICIES = "Company Policies";
    public static final String CAT_OTHER_HR_DOCUMENTS = "Other HR Documents";

    public static final Set<String> ALLOWED_CATEGORIES = Set.of(
            CAT_OFFER_LETTER,
            CAT_APPOINTMENT_LETTER,
            CAT_EMPLOYMENT_AGREEMENT,
            CAT_IDENTITY_DOCUMENTS,
            CAT_EDUCATIONAL_CERTIFICATES,
            CAT_EXPERIENCE_CERTIFICATES,
            CAT_COMPANY_POLICIES,
            CAT_OTHER_HR_DOCUMENTS
    );

    public static final Set<String> EMPLOYEE_SELF_UPLOAD_CATEGORIES = Set.of(
            CAT_IDENTITY_DOCUMENTS,
            CAT_EDUCATIONAL_CERTIFICATES,
            CAT_EXPERIENCE_CERTIFICATES,
            CAT_OTHER_HR_DOCUMENTS
    );

    private final EmployeeDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final ZohoWorkDriveService zohoWorkDriveService;
    private final ZohoWorkDriveDownloadService zohoDownloadService;

    public EmployeeDocumentService(
            EmployeeDocumentRepository documentRepository,
            UserRepository userRepository,
            ZohoWorkDriveService zohoWorkDriveService,
            ZohoWorkDriveDownloadService zohoDownloadService
    ) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.zohoWorkDriveService = zohoWorkDriveService;
        this.zohoDownloadService = zohoDownloadService;
    }

    @Transactional(readOnly = true)
    public List<EmployeeDocument> getDocumentsForTargetUser(Long targetUserId, User actor) {
        if (targetUserId == null) return Collections.emptyList();

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", targetUserId));

        // Enforce RBAC
        checkViewPermission(targetUser, actor);

        List<EmployeeDocument> userDocs = documentRepository.findByUserIdOrderByCreatedAtDesc(targetUserId);
        List<EmployeeDocument> companyPolicies = documentRepository.findByIsCompanyPolicyTrueOrderByCreatedAtDesc();

        // Combine user docs and unique company policies
        List<EmployeeDocument> result = new ArrayList<>(userDocs);
        for (EmployeeDocument cp : companyPolicies) {
            if (result.stream().noneMatch(d -> d.getId().equals(cp.getId()))) {
                result.add(cp);
            }
        }
        return result;
    }

    @Transactional
    public EmployeeDocument uploadDocument(Long targetUserId, String category, MultipartFile file, User actor) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file to upload.");
        }
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("Document category is required.");
        }
        String normalizedCategory = normalizeCategory(category);

        User targetUser = null;
        boolean isCompanyPolicy = CAT_COMPANY_POLICIES.equalsIgnoreCase(normalizedCategory);

        if (isCompanyPolicy) {
            if (actor.getRole() != Role.HR_ADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only HR/Admin can upload Company Policies.");
            }
            targetUser = actor;
        } else {
            if (targetUserId == null) {
                targetUserId = actor.getId();
            }
            final Long uid = targetUserId;
            targetUser = userRepository.findById(uid)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", uid));
            checkUploadPermission(targetUser, normalizedCategory, actor);
        }

        // Determine target Zoho WorkDrive folder
        String targetFolderId;
        String rootId = zohoWorkDriveService.getEmployeeDocumentsFolderId();

        try {
            if (isCompanyPolicy) {
                targetFolderId = zohoWorkDriveService.getOrCreateSubfolder(rootId, CAT_COMPANY_POLICIES);
            } else {
                String employeeFolderName = targetUser.getEmployeeId() + " - " + targetUser.getName();
                String employeeFolderId = zohoWorkDriveService.getOrCreateSubfolder(rootId, employeeFolderName);
                targetFolderId = zohoWorkDriveService.getOrCreateSubfolder(employeeFolderId, normalizedCategory);
            }
        } catch (Exception ex) {
            log.error("Zoho WorkDrive folder navigation failed: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to access or create Zoho WorkDrive folder.");
        }

        // Upload file to the target subfolder
        Map<String, Object> uploadResult = zohoWorkDriveService.uploadFileToFolder(file, targetFolderId);
        String workdriveFileId = String.valueOf(uploadResult.get("fileId"));
        String returnedFilename = String.valueOf(uploadResult.get("fileName"));
        Long sizeBytes = uploadResult.get("sizeBytes") instanceof Number
                ? ((Number) uploadResult.get("sizeBytes")).longValue()
                : file.getSize();

        EmployeeDocument doc = new EmployeeDocument();
        doc.setUserId(targetUser.getId());
        doc.setEmployeeId(targetUser.getEmployeeId());
        doc.setWorkdriveFileId(workdriveFileId);
        doc.setWorkdriveFolderId(targetFolderId);
        doc.setFileName(returnedFilename != null && !returnedFilename.isBlank() ? returnedFilename : file.getOriginalFilename());
        doc.setCategory(normalizedCategory);
        doc.setFileSize(sizeBytes);
        doc.setContentType(file.getContentType());
        doc.setUploadedByUserId(actor.getId());
        doc.setIsCompanyPolicy(isCompanyPolicy);

        EmployeeDocument saved = documentRepository.save(doc);
        log.info("Saved employee document id={}, fileId={}, employeeId={}", saved.getId(), workdriveFileId, targetUser.getEmployeeId());
        return saved;
    }

    @Transactional(readOnly = true)
    public DownloadedDocument downloadDocument(Long documentId, User actor) {
        EmployeeDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        if (!Boolean.TRUE.equals(doc.getIsCompanyPolicy())) {
            User targetUser = userRepository.findById(doc.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", doc.getUserId()));
            checkViewPermission(targetUser, actor);
        }

        return zohoDownloadService.download(doc.getWorkdriveFileId());
    }

    @Transactional
    public EmployeeDocument replaceDocument(Long documentId, MultipartFile file, User actor) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please select a file to replace existing document.");
        }
        EmployeeDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        User targetUser = userRepository.findById(doc.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", doc.getUserId()));

        if (Boolean.TRUE.equals(doc.getIsCompanyPolicy())) {
            if (actor.getRole() != Role.HR_ADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only HR/Admin can replace Company Policies.");
            }
        } else {
            checkUploadPermission(targetUser, doc.getCategory(), actor);
        }

        String targetFolderId = doc.getWorkdriveFolderId();
        if (targetFolderId == null || targetFolderId.isBlank()) {
            String rootId = zohoWorkDriveService.getEmployeeDocumentsFolderId();
            if (Boolean.TRUE.equals(doc.getIsCompanyPolicy())) {
                targetFolderId = zohoWorkDriveService.getOrCreateSubfolder(rootId, CAT_COMPANY_POLICIES);
            } else {
                String employeeFolderName = targetUser.getEmployeeId() + " - " + targetUser.getName();
                String employeeFolderId = zohoWorkDriveService.getOrCreateSubfolder(rootId, employeeFolderName);
                targetFolderId = zohoWorkDriveService.getOrCreateSubfolder(employeeFolderId, doc.getCategory());
            }
            doc.setWorkdriveFolderId(targetFolderId);
        }

        Map<String, Object> uploadResult = zohoWorkDriveService.uploadFileToFolder(file, targetFolderId);
        String workdriveFileId = String.valueOf(uploadResult.get("fileId"));
        String returnedFilename = String.valueOf(uploadResult.get("fileName"));
        Long sizeBytes = uploadResult.get("sizeBytes") instanceof Number
                ? ((Number) uploadResult.get("sizeBytes")).longValue()
                : file.getSize();

        doc.setWorkdriveFileId(workdriveFileId);
        doc.setFileName(returnedFilename != null && !returnedFilename.isBlank() ? returnedFilename : file.getOriginalFilename());
        doc.setFileSize(sizeBytes);
        doc.setContentType(file.getContentType());
        doc.setUploadedByUserId(actor.getId());

        EmployeeDocument saved = documentRepository.save(doc);
        log.info("Replaced employee document id={}, newFileId={}, by actor={}", documentId, workdriveFileId, actor.getEmployeeId());
        return saved;
    }

    @Transactional
    public void deleteDocument(Long documentId, User actor) {
        EmployeeDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        if (Boolean.TRUE.equals(doc.getIsCompanyPolicy())) {
            if (actor.getRole() != Role.HR_ADMIN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only HR/Admin can delete Company Policies.");
            }
        } else {
            User targetUser = userRepository.findById(doc.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", doc.getUserId()));
            checkManagePermission(targetUser, actor);
        }

        documentRepository.delete(doc);
        log.info("Deleted employee document record id={} by actor={}", documentId, actor.getEmployeeId());
    }

    private String normalizeCategory(String input) {
        for (String cat : ALLOWED_CATEGORIES) {
            if (cat.equalsIgnoreCase(input.trim())) {
                return cat;
            }
        }
        return CAT_OTHER_HR_DOCUMENTS;
    }

    private void checkViewPermission(User targetUser, User actor) {
        if (actor.getRole() == Role.HR_ADMIN) return;
        if (actor.getId().equals(targetUser.getId())) return;
        if (actor.getRole() == Role.MANAGER) {
            String actorDept = actor.getDepartment();
            String targetDept = targetUser.getDepartment();
            if (actorDept != null && targetDept != null && actorDept.trim().equalsIgnoreCase(targetDept.trim())) {
                return;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to employee documents.");
    }

    private void checkUploadPermission(User targetUser, String category, User actor) {
        if (actor.getRole() == Role.HR_ADMIN) return;
        if (actor.getId().equals(targetUser.getId())) {
            if (!EMPLOYEE_SELF_UPLOAD_CATEGORIES.contains(category)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Employees can only upload personal documents: Identity, Educational, Experience, or Other HR documents.");
            }
            return;
        }
        if (actor.getRole() == Role.MANAGER) {
            String actorDept = actor.getDepartment();
            String targetDept = targetUser.getDepartment();
            if (actorDept != null && targetDept != null && actorDept.trim().equalsIgnoreCase(targetDept.trim())) {
                return;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to upload documents for this employee.");
    }

    private void checkManagePermission(User targetUser, User actor) {
        if (actor.getRole() == Role.HR_ADMIN) return;
        if (actor.getRole() == Role.MANAGER) {
            String actorDept = actor.getDepartment();
            String targetDept = targetUser.getDepartment();
            if (actorDept != null && targetDept != null && actorDept.trim().equalsIgnoreCase(targetDept.trim())) {
                return;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to manage documents for this employee.");
    }
}
