package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.ManagerReportDTO;
import com.fairmacs.lms.service.ManagerReportService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/manager/reports")
@CrossOrigin
public class ManagerReportController {

    private final ManagerReportService managerReportService;

    public ManagerReportController(
            ManagerReportService managerReportService
    ) {
        this.managerReportService = managerReportService;
    }

    @GetMapping("/{managerId}")
    public ResponseEntity<ManagerReportDTO> getManagerReports(
            @PathVariable Long managerId
    ) {

        return ResponseEntity.ok(
                managerReportService.getManagerReport(managerId)
        );
    }
}