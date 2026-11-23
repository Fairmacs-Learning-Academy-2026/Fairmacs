package com.fairmacs.lms.controller;

import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.service.LessonDocumentAccessService;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/lessons")
public class LessonDocumentController {

    private final LessonDocumentAccessService accessService;

    public LessonDocumentController(
            LessonDocumentAccessService accessService) {
        this.accessService = accessService;
    }

    /**
     * Backwards-compatible 1-arg overload for unit & integration tests.
     */
    public ResponseEntity<byte[]> viewDocument(String lessonId) {
        return viewDocument(lessonId, false);
    }

    /**
     * View lesson document inline (supplies trusted watermark metadata in HTTP headers for PDF canvas overlay).
     */
    @GetMapping("/{lessonId}/document")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> viewDocument(
            @PathVariable String lessonId,
            @RequestParam(value = "download", defaultValue = "false") boolean download) {

        if (download) {
            return downloadDocument(lessonId);
        }

        ZohoWorkDriveDownloadService.DownloadedDocument document =
                accessService.viewDocument(lessonId);

        User currentUser = accessService.getCurrentUser();
        String watermarkText = accessService.generateWatermarkText(currentUser, LocalDateTime.now());
        String employeeName = (currentUser != null && currentUser.getFullName() != null && !currentUser.getFullName().isBlank())
                ? currentUser.getFullName().trim()
                : (currentUser != null && currentUser.getName() != null && !currentUser.getName().isBlank())
                    ? currentUser.getName().trim()
                    : (currentUser != null && currentUser.getEmail() != null) ? currentUser.getEmail() : "Authorized Employee";

        String employeeCode = (currentUser != null && currentUser.getEmployeeId() != null && !currentUser.getEmployeeId().isBlank())
                ? currentUser.getEmployeeId().trim()
                : (currentUser != null && currentUser.getId() != null) ? "EMP" + currentUser.getId() : "EMP-001";

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("d MMM yyyy, hh:mm a", Locale.ENGLISH));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(document.contentType());
        headers.setContentDisposition(
                ContentDisposition.inline()
                        .filename(
                                document.filename(),
                                StandardCharsets.UTF_8)
                        .build());
        headers.setCacheControl(CacheControl.noStore());
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("X-Document-Filename", document.filename());
        headers.set("X-Watermark-Text", watermarkText);
        headers.set("X-Watermark-Employee-Name", employeeName);
        headers.set("X-Watermark-Employee-Code", employeeCode);
        headers.set("X-Watermark-Timestamp", timestamp);
        headers.setAccessControlExposeHeaders(
                List.of("Content-Disposition", "X-Document-Filename", "Content-Type",
                        "X-Watermark-Text", "X-Watermark-Employee-Name", "X-Watermark-Employee-Code", "X-Watermark-Timestamp"));

        return ResponseEntity.ok()
                .headers(headers)
                .body(document.content());
    }

    /**
     * Download employee-specific watermarked copy of the course PDF document.
     */
    @GetMapping("/{lessonId}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> downloadDocument(
            @PathVariable String lessonId) {

        ZohoWorkDriveDownloadService.DownloadedDocument document =
                accessService.downloadWatermarkedDocument(lessonId);

        User currentUser = accessService.getCurrentUser();
        String watermarkText = accessService.generateWatermarkText(currentUser, LocalDateTime.now());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(document.contentType());
        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename(
                                document.filename(),
                                StandardCharsets.UTF_8)
                        .build());
        headers.setCacheControl(CacheControl.noStore());
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("X-Document-Filename", document.filename());
        headers.set("X-Watermark-Text", watermarkText);
        headers.setAccessControlExposeHeaders(
                List.of("Content-Disposition", "X-Document-Filename", "Content-Type", "X-Watermark-Text"));

        return ResponseEntity.ok()
                .headers(headers)
                .body(document.content());
    }
}
