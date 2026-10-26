package com.fairmacs.lms.controller;

import com.fairmacs.lms.service.HrReportService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/hr/reports")
@CrossOrigin
public class HrReportController {

    private final HrReportService hrReportService;

    public HrReportController(
            HrReportService hrReportService
    ) {
        this.hrReportService = hrReportService;
    }

    // =========================================================
    // HR TRAINING REPORT
    // =========================================================

    @GetMapping("/training")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>>
    getHrTrainingReport() {

        return ResponseEntity.ok(
                hrReportService.getHrTrainingReport()
        );
    }
}