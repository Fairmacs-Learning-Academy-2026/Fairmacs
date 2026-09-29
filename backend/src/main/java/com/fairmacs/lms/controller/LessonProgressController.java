package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.LessonProgressDTO;
import com.fairmacs.lms.service.LessonProgressService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/progress")
@CrossOrigin
public class LessonProgressController {

        private final LessonProgressService lessonProgressService;

        public LessonProgressController(
                        LessonProgressService lessonProgressService) {
                this.lessonProgressService = lessonProgressService;
        }

        @PostMapping("/{enrollmentId}/{lessonId}")
        public ResponseEntity<LessonProgressDTO> updateProgress(
                        @PathVariable Long enrollmentId,
                        @PathVariable Long lessonId,
                        @RequestParam(required = false, defaultValue = "0") Integer completionPercent,
                        @RequestParam(required = false, defaultValue = "0") Integer watchedSeconds,
                        @RequestParam(required = false, defaultValue = "0") Integer lastPositionSeconds) {

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
}