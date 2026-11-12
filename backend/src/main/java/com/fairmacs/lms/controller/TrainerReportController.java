package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.LearnerActivityDTO;
import com.fairmacs.lms.service.TrainerReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class TrainerReportController {

    private final TrainerReportService trainerReportService;

    public TrainerReportController(TrainerReportService trainerReportService) {
        this.trainerReportService = trainerReportService;
    }

    @GetMapping("/api/trainer/insights")
    @PreAuthorize("hasAnyRole('TRAINER', 'HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> getTrainerInsights() {
        return ResponseEntity.ok(
                trainerReportService.getTrainerInsights()
        );
    }

    @GetMapping("/api/trainer/reports")
    @PreAuthorize("hasAnyRole('TRAINER', 'HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> getTrainerReports() {
        return ResponseEntity.ok(
                trainerReportService.getTrainerInsights()
        );
    }

    @GetMapping("/api/trainer/recent-activity")
    @PreAuthorize("hasAnyRole('TRAINER', 'HR_ADMIN')")
    public ResponseEntity<List<LearnerActivityDTO>> getTrainerRecentActivity(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(
                trainerReportService.getRecentLearnerActivities(limit)
        );
    }

    @GetMapping("/api/activity/recent")
    @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'TRAINER', 'HR_ADMIN')")
    public ResponseEntity<List<LearnerActivityDTO>> getScopedRecentLearnerActivity(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(
                trainerReportService.getRecentLearnerActivities(limit)
        );
    }
}
