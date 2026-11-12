package com.fairmacs.lms.integration.zoho;

import java.util.HashMap;
import java.util.Map;

import com.fairmacs.lms.entity.Lesson;
import com.fairmacs.lms.repository.LessonRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/integrations/zoho/documents")
public class ZohoWorkDriveController {

    private final ZohoWorkDriveService workDriveService;
    private final LessonRepository lessonRepository;

    public ZohoWorkDriveController(
            ZohoWorkDriveService workDriveService,
            LessonRepository lessonRepository) {
        this.workDriveService = workDriveService;
        this.lessonRepository = lessonRepository;
    }

    /**
     * Upload a PDF/DOCX document to Zoho WorkDrive during course creation.
     *
     * The lesson does not need to exist yet. The returned fileId must be
     * included in the course creation request and saved to the lesson.
     */
    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'TRAINER')")
    public ResponseEntity<Map<String, Object>> uploadDocument(
            @RequestParam("file") MultipartFile file) {

        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Please select a document to upload."
                ));
            }

            Map<String, Object> upload =
                    workDriveService.uploadDocument(file);

            if (upload == null
                    || !Boolean.TRUE.equals(upload.get("success"))
                    || upload.get("fileId") == null) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .body(Map.of(
                                "success", false,
                                "message", "Zoho WorkDrive did not return a valid file ID."
                        ));
            }

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("fileId", upload.get("fileId"));
            result.put("fileName", upload.get("fileName"));
            result.put("fileType", upload.get("fileType"));
            result.put("sizeBytes", upload.get("sizeBytes"));
            result.put("message", "Document uploaded successfully.");

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", ex.getMessage() != null
                            ? ex.getMessage()
                            : "Invalid document."
            ));

        } catch (Exception ex) {
            // Keep provider credentials and internal exception details out
            // of the response. Check backend logs for troubleshooting.
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                    "success", false,
                    "message", "Document upload failed. Check backend logs."
            ));
        }
    }

    /**
     * Attach a document to an existing lesson.
     *
     * Retained for lessons that already exist.
     */
    @PostMapping("/attach-to-lesson")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> attachToLesson(
            @RequestParam("lessonId") String lessonId,
            @RequestParam("file") MultipartFile file) {

        Lesson lesson = lessonRepository.findByLessonId(lessonId)
                .orElse(null);

        if (lesson == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "success", false,
                            "message", "Lesson not found."
                    ));
        }

        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Please select a document to upload."
                ));
            }

            Map<String, Object> upload =
                    workDriveService.uploadDocument(file);

            if (upload == null
                    || !Boolean.TRUE.equals(upload.get("success"))
                    || upload.get("fileId") == null) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .body(Map.of(
                                "success", false,
                                "message", "Zoho WorkDrive did not return a valid file ID."
                        ));
            }

            String fileId = upload.get("fileId").toString();

            lesson.setWorkdriveFileId(fileId);
            lessonRepository.save(lesson);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("lessonId", lesson.getLessonId());
            result.put("lessonTitle", lesson.getTitle());
            result.put("fileId", fileId);
            result.put("fileName", upload.get("fileName"));
            result.put("fileType", upload.get("fileType"));

            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", ex.getMessage() != null
                            ? ex.getMessage()
                            : "Invalid document."
            ));

        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(
                    Map.of(
                            "success", false,
                            "message", "Document upload or association failed. Check backend logs."
                    )
            );
        }
    }
}
