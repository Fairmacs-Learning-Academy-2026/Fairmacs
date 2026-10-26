
package com.fairmacs.lms.controller;

import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.service.LessonDocumentAccessService;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/lessons")
public class LessonDocumentController {

    private final LessonDocumentAccessService accessService;

    public LessonDocumentController(
            LessonDocumentAccessService accessService) {
        this.accessService = accessService;
    }

    @GetMapping("/{lessonId}/document")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> viewDocument(
            @PathVariable String lessonId) {

        ZohoWorkDriveDownloadService.DownloadedDocument document =
                accessService.viewDocument(lessonId);

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

        return ResponseEntity.ok()
                .headers(headers)
                .body(document.content());
    }
}
