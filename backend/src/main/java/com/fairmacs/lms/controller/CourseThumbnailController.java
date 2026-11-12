package com.fairmacs.lms.controller;

import com.fairmacs.lms.entity.CourseThumbnail;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.service.CourseThumbnailService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/courses/thumbnails")
public class CourseThumbnailController {

    private final CourseThumbnailService thumbnailService;

    public CourseThumbnailController(CourseThumbnailService thumbnailService) {
        this.thumbnailService = thumbnailService;
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'TRAINER')")
    public ResponseEntity<Map<String, Object>> uploadThumbnail(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(thumbnailService.uploadThumbnail(file));
    }

    @GetMapping("/default")
    public ResponseEntity<byte[]> getDefaultThumbnail() {
        byte[] defaultImage = thumbnailService.getDefaultThumbnail();
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"fairmacs-default-thumbnail.png\"")
                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                .body(defaultImage);
    }

    @GetMapping("/{storageId}")
    public ResponseEntity<byte[]> getThumbnail(@PathVariable String storageId) {
        CourseThumbnail thumbnail;
        try {
            thumbnail = thumbnailService.getThumbnail(storageId);
        } catch (ResourceNotFoundException e) {
            byte[] fallback = thumbnailService.getBrandedFallbackThumbnail("Course Thumbnail", storageId);
            return ResponseEntity.status(HttpStatus.OK)
                    .contentType(MediaType.valueOf("image/svg+xml"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"thumbnail-fallback.svg\"")
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                    .body(fallback);
        }

        byte[] data = thumbnail.getData();
        if (data == null || data.length == 0) {
            byte[] fallback = thumbnailService.getBrandedFallbackThumbnail(thumbnail.getFilename(), storageId);
            return ResponseEntity.status(HttpStatus.OK)
                    .contentType(MediaType.valueOf("image/svg+xml"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"thumbnail-fallback.svg\"")
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                    .body(fallback);
        }

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(thumbnail.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.IMAGE_PNG;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + thumbnail.getFilename() + "\"")
                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                .body(data);
    }

    @GetMapping("/workdrive/{workdriveFileId}")
    public ResponseEntity<byte[]> getThumbnailByWorkdriveId(@PathVariable String workdriveFileId) {
        CourseThumbnail thumbnail;
        try {
            thumbnail = thumbnailService.getThumbnailByWorkdriveFileId(workdriveFileId);
        } catch (ResourceNotFoundException e) {
            byte[] fallback = thumbnailService.getBrandedFallbackThumbnail("Course Thumbnail", workdriveFileId);
            return ResponseEntity.status(HttpStatus.OK)
                    .contentType(MediaType.valueOf("image/svg+xml"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"thumbnail-fallback.svg\"")
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                    .body(fallback);
        }

        byte[] data = thumbnail.getData();
        if (data == null || data.length == 0) {
            byte[] fallback = thumbnailService.getBrandedFallbackThumbnail(thumbnail.getFilename(), workdriveFileId);
            return ResponseEntity.status(HttpStatus.OK)
                    .contentType(MediaType.valueOf("image/svg+xml"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"thumbnail-fallback.svg\"")
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                    .body(fallback);
        }

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(thumbnail.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.IMAGE_PNG;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + thumbnail.getFilename() + "\"")
                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                .body(data);
    }

    @DeleteMapping("/{storageId}")
    @PreAuthorize("hasAnyRole('HR_ADMIN', 'TRAINER')")
    public ResponseEntity<Map<String, Object>> deleteThumbnail(@PathVariable String storageId) {
        thumbnailService.deleteThumbnail(storageId);
        return ResponseEntity.ok(Map.of("message", "Thumbnail deleted successfully."));
    }
}
