package com.fairmacs.lms.service;

import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService.DownloadedDocument;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class PolicyWorkDriveService {

    private static final Logger log = LoggerFactory.getLogger(PolicyWorkDriveService.class);

    public static final String POLICIES_ROOT_FOLDER_NAME = "Policies & Agreements";
    public static final String DEPT_SUBMISSIONS_FOLDER_NAME = "Department Submissions";
    private static final long MAX_POLICY_FILE_SIZE = 25L * 1024 * 1024; // 25 MB

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".pdf");
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf",
            "application/x-pdf",
            "application/acrobat",
            "applications/pdf"
    );

    private final ZohoWorkDriveService zohoWorkDriveService;
    private final ZohoWorkDriveDownloadService zohoDownloadService;

    @Value("${zoho.employee-documents-folder-id:ap17jb6b3094df81d4dd79ccea04508fc6910}")
    private String rootFolderId;

    public PolicyWorkDriveService(
            ZohoWorkDriveService zohoWorkDriveService,
            ZohoWorkDriveDownloadService zohoDownloadService
    ) {
        this.zohoWorkDriveService = zohoWorkDriveService;
        this.zohoDownloadService = zohoDownloadService;
    }

    public record UploadedPolicyFile(
            String workdriveFileId,
            String fileName,
            String folderId,
            long fileSize,
            String contentType,
            String sha256Hash
    ) {}

    public UploadedPolicyFile uploadPolicyPdf(MultipartFile file, String categoryName, boolean isDepartmentSubmission) {
        validatePdfFile(file);

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read uploaded PDF file", e);
        }

        String sha256 = computeSha256(bytes);
        String targetFolderId = resolveTargetFolder(categoryName, isDepartmentSubmission);

        log.info("Uploading policy PDF '{}' ({} bytes, sha256: {}) to Zoho WorkDrive folder {}",
                file.getOriginalFilename(), bytes.length, sha256, targetFolderId);

        Map<String, Object> uploadResult = zohoWorkDriveService.uploadFileToFolder(file, targetFolderId);

        String fileId = String.valueOf(uploadResult.get("fileId"));
        String returnedFilename = String.valueOf(uploadResult.get("fileName"));
        String contentType = file.getContentType() != null ? file.getContentType() : "application/pdf";

        return new UploadedPolicyFile(
                fileId,
                returnedFilename != null && !returnedFilename.isBlank() ? returnedFilename : file.getOriginalFilename(),
                targetFolderId,
                bytes.length,
                contentType,
                sha256
        );
    }

    public DownloadedDocument downloadPolicyPdf(String workdriveFileId) {
        if (workdriveFileId == null || workdriveFileId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No document attached to this policy version");
        }
        return zohoDownloadService.download(workdriveFileId);
    }

    public String resolveTargetFolder(String categoryName, boolean isDepartmentSubmission) {
        String baseRoot = (rootFolderId != null && !rootFolderId.isBlank())
                ? rootFolderId
                : zohoWorkDriveService.getEmployeeDocumentsFolderId();

        try {
            // Level 1: "Policies & Agreements"
            String policiesRootId = zohoWorkDriveService.getOrCreateSubfolder(baseRoot, POLICIES_ROOT_FOLDER_NAME);

            // Level 2: Subfolder by Category or Department Submissions
            String subfolderName = isDepartmentSubmission
                    ? DEPT_SUBMISSIONS_FOLDER_NAME
                    : (categoryName != null && !categoryName.isBlank() ? categoryName.trim() : "Company Policies");

            return zohoWorkDriveService.getOrCreateSubfolder(policiesRootId, subfolderName);
        } catch (Exception ex) {
            log.error("Zoho WorkDrive policy folder resolution failed: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to access or create Zoho WorkDrive folder for policies: " + ex.getMessage(), ex);
        }
    }

    public void validatePdfFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select a PDF file to upload");
        }

        if (file.getSize() > MAX_POLICY_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Policy PDF exceeds maximum file size limit of 25 MB");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PDF file name is required");
        }

        String lower = originalFilename.toLowerCase(Locale.ROOT);
        boolean hasValidExt = ALLOWED_EXTENSIONS.stream().anyMatch(lower::endsWith);
        if (!hasValidExt) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only PDF (.pdf) documents are permitted for Policies & Agreements");
        }

        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()) {
            String lowerType = contentType.toLowerCase(Locale.ROOT);
            if (!ALLOWED_MIME_TYPES.contains(lowerType) && !lowerType.contains("pdf")) {
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Invalid content type: Only PDF documents are permitted");
            }
        }
    }

    public String computeSha256(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("Cannot compute SHA-256 of empty bytes");
        }
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(bytes);
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available in runtime", e);
        }
    }
}
