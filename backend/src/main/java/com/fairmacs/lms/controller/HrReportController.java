package com.fairmacs.lms.controller;

import com.fairmacs.lms.service.HrReportService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/hr/reports")

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

    /**
     * All parameters are optional.
     *
     * department      employee department name, or ALL
     * courseId        course database id
     * employeeStatus  CURRENT (default, excludes inactive/terminated) or ALL
     * enrollmentType  ALL, MANDATORY, RECOMMENDED or SELF_SELECTED
     * from / to       assignment date range (yyyy-MM-dd)
     */
    @GetMapping("/training")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>>
    getHrTrainingReport(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) String employeeStatus,
            @RequestParam(required = false) String enrollmentType,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {

        return ResponseEntity.ok(
                hrReportService.getHrTrainingReport(
                        department,
                        courseId,
                        employeeStatus,
                        enrollmentType,
                        from,
                        to
                )
        );
    }
}