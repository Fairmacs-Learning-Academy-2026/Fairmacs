package com.fairmacs.lms.controller;

import com.fairmacs.lms.service.HrAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hr")
@CrossOrigin
public class HrAdminController {

    private final HrAdminService hrAdminService;

    public HrAdminController(HrAdminService hrAdminService) {
        this.hrAdminService = hrAdminService;
    }

    // =========================================================
    // EMPLOYEES
    // =========================================================

    @GetMapping("/employees")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getEmployees() {
        return ResponseEntity.ok(hrAdminService.getEmployees());
    }

    @PostMapping("/employees")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> createEmployee(
            @RequestBody Map<String, Object> request
    ) {
        try {
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(hrAdminService.createEmployee(request));

        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    @PatchMapping("/employees/{employeeId}/status")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> toggleEmployeeStatus(
            @PathVariable String employeeId
    ) {
        try {
            return ResponseEntity.ok(
                    hrAdminService.toggleEmployeeStatus(employeeId)
            );

        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/employees/{employeeId}/reset-password")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> resetEmployeePassword(
            @PathVariable String employeeId,
            @RequestBody(required = false) Map<String, Object> request
    ) {
        try {
            String newPassword = null;

            if (request != null && request.get("newPassword") != null) {
                newPassword = String.valueOf(
                        request.get("newPassword")
                );
            }

            return ResponseEntity.ok(
                    hrAdminService.resetEmployeePassword(
                            employeeId,
                            newPassword
                    )
            );

        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    // =========================================================
    // HR DASHBOARD METRICS
    // =========================================================

    @GetMapping("/dashboard/metrics")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Map<String, Object>> getDashboardMetrics() {
        return ResponseEntity.ok(
                hrAdminService.getDashboardMetrics()
        );
    }
}