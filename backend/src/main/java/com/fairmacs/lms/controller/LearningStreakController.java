package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.LearningStreakDTO;
import com.fairmacs.lms.service.LearningStreakService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Fairmacs KMS — Learning Streaks & Activity Rings Controller
 *
 * Exposes the employee learning consistency endpoint:
 * GET /api/learning/streaks
 *
 * Access is restricted to authenticated employees, deriving identity
 * exclusively from the security principal.
 */
@RestController
@RequestMapping("/api/learning")
public class LearningStreakController {

    private final LearningStreakService learningStreakService;

    public LearningStreakController(LearningStreakService learningStreakService) {
        this.learningStreakService = learningStreakService;
    }

    @GetMapping("/streaks")
    public ResponseEntity<LearningStreakDTO> getStreaks() {
        return ResponseEntity.ok(learningStreakService.getEmployeeStreaks());
    }
}
