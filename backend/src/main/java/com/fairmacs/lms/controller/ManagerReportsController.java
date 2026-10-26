package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.EmployeeTrainingTranscriptDTO;
import com.fairmacs.lms.service.ManagerReportsService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/manager/reports")
@CrossOrigin
public class ManagerReportsController {

    private final ManagerReportsService managerReportsService;

    public ManagerReportsController(
            ManagerReportsService managerReportsService
    ) {
        this.managerReportsService = managerReportsService;
    }

    // =========================================================
    // EMPLOYEE TRAINING TRANSCRIPT
    // =========================================================

    @GetMapping("/employee/{userId}")
    public ResponseEntity<EmployeeTrainingTranscriptDTO>
    getEmployeeTrainingTranscript(
            @PathVariable Long userId
    ) {

        return ResponseEntity.ok(
                managerReportsService
                        .getEmployeeTrainingTranscript(userId)
        );
    }
}