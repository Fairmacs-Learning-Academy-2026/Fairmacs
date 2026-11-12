package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.LessonProgressDTO;
import com.fairmacs.lms.service.LessonProgressService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/progress")

public class LessonProgressController {

    private final LessonProgressService lessonProgressService;

    public LessonProgressController(
            LessonProgressService lessonProgressService) {
        this.lessonProgressService = lessonProgressService;
    }

    /**
     * Update progress for a lesson.
     *
     * The frontend sends progress values as JSON:
     *
     * {
     *   "completionPercent": 50,
     *   "watchedSeconds": 120,
     *   "lastPositionSeconds": 120
     * }
     */
    @PostMapping("/{enrollmentId}/{lessonId}")
    public ResponseEntity<LessonProgressDTO> updateProgress(
            @PathVariable Long enrollmentId,
            @PathVariable Long lessonId,
            @RequestBody(required = false) LessonProgressRequest request) {

        int completionPercent = 0;
        int watchedSeconds = 0;
        int lastPositionSeconds = 0;

        if (request != null) {
            if (request.completionPercent != null) {
                completionPercent = request.completionPercent;
            }

            if (request.watchedSeconds != null) {
                watchedSeconds = request.watchedSeconds;
            }

            if (request.lastPositionSeconds != null) {
                lastPositionSeconds = request.lastPositionSeconds;
            }
        }

        return ResponseEntity.ok(
                lessonProgressService.updateProgress(
                        enrollmentId,
                        lessonId,
                        completionPercent,
                        watchedSeconds,
                        lastPositionSeconds));
    }

    @GetMapping("/{enrollmentId}")
    public ResponseEntity<List<LessonProgressDTO>> getEnrollmentProgress(
            @PathVariable Long enrollmentId) {

        return ResponseEntity.ok(
                lessonProgressService.getEnrollmentProgress(
                        enrollmentId));
    }

    @GetMapping("/{enrollmentId}/{lessonId}")
    public ResponseEntity<LessonProgressDTO> getLessonProgress(
            @PathVariable Long enrollmentId,
            @PathVariable Long lessonId) {

        return ResponseEntity.ok(
                lessonProgressService.getLessonProgress(
                        enrollmentId,
                        lessonId));
    }

    /**
     * Request body for updating lesson progress.
     */
    public static class LessonProgressRequest {

        private Integer completionPercent;
        private Integer watchedSeconds;
        private Integer lastPositionSeconds;

        public Integer getCompletionPercent() {
            return completionPercent;
        }

        public void setCompletionPercent(Integer completionPercent) {
            this.completionPercent = completionPercent;
        }

        public Integer getWatchedSeconds() {
            return watchedSeconds;
        }

        public void setWatchedSeconds(Integer watchedSeconds) {
            this.watchedSeconds = watchedSeconds;
        }

        public Integer getLastPositionSeconds() {
            return lastPositionSeconds;
        }

        public void setLastPositionSeconds(Integer lastPositionSeconds) {
            this.lastPositionSeconds = lastPositionSeconds;
        }
    }
}