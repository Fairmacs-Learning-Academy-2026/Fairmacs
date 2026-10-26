package com.fairmacs.lms.controller;

import com.fairmacs.lms.service.EmployeeExcelImportService;
import com.fairmacs.lms.service.HrAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hr")
@CrossOrigin
public class HrAdminController {

    private final HrAdminService hrAdminService;
    private final EmployeeExcelImportService employeeExcelImportService;

    public HrAdminController(
            HrAdminService hrAdminService,
            EmployeeExcelImportService employeeExcelImportService
    ) {
        this.hrAdminService = hrAdminService;
        this.employeeExcelImportService =
                employeeExcelImportService;
    }

    // =========================================================
    // HR DASHBOARD METRICS
    // =========================================================

    @GetMapping("/dashboard/metrics")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> getDashboardMetrics() {

        try {

            return ResponseEntity.ok(
                    hrAdminService.getDashboardMetrics()
            );

        } catch (Exception ex) {

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            Map.of(
                                    "success",
                                    false,
                                    "message",
                                    "Unable to load HR dashboard metrics."
                            )
                    );
        }
    }

    // =========================================================
    // GET ALL EMPLOYEES
    // =========================================================

    @GetMapping("/employees")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<List<Map<String, Object>>> getEmployees() {

        return ResponseEntity.ok(
                hrAdminService.getEmployees()
        );
    }

    // =========================================================
    // CREATE SINGLE EMPLOYEE
    // =========================================================

    @PostMapping("/employees")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> createEmployee(
            @RequestBody Map<String, Object> request
    ) {

        try {

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            hrAdminService.createEmployee(
                                    request
                            )
                    );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "success",
                                    false,
                                    "message",
                                    ex.getMessage()
                            )
                    );
        }
    }

    // =========================================================
    // EXCEL EMPLOYEE IMPORT
    // =========================================================

    @PostMapping(
            value = "/employees/import",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> importEmployees(
            @RequestParam("file")
            MultipartFile file
    ) {

        try {

            Map<String, Object> result =
                    employeeExcelImportService
                            .importEmployees(file);

            boolean success =
                    Boolean.TRUE.equals(
                            result.get("success")
                    );

            if (!success) {

                return ResponseEntity
                        .badRequest()
                        .body(result);
            }

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(result);

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "success",
                                    false,
                                    "message",
                                    ex.getMessage()
                            )
                    );

        } catch (Exception ex) {

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(
                            Map.of(
                                    "success",
                                    false,
                                    "message",
                                    "Unable to import employees."
                            )
                    );
        }
    }

    // =========================================================
// CHANGE EMPLOYEE LIFECYCLE STATUS
// =========================================================
@PatchMapping("/employees/{employeeId}/status")
@PreAuthorize("hasRole('HR_ADMIN')")
public ResponseEntity<?> changeEmployeeStatus(
        @PathVariable String employeeId,
        @RequestBody Map<String, Object> request
) {
    try {
        String status = request == null || request.get("status") == null
                ? null
                : String.valueOf(request.get("status"));

        return ResponseEntity.ok(
                hrAdminService.changeEmployeeStatus(
                        employeeId,
                        status
                )
        );

    } catch (IllegalArgumentException ex) {
        return ResponseEntity
                .badRequest()
                .body(
                        Map.of(
                                "success", false,
                                "message", ex.getMessage()
                        )
                );
    }
}
    // =========================================================
    // RESET PASSWORD
    // =========================================================

    @PostMapping(
            "/employees/{employeeId}/reset-password"
    )
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> resetEmployeePassword(
            @PathVariable String employeeId,
            @RequestBody(required = false)
            Map<String, Object> request
    ) {

        try {

            String newPassword =
                    request == null
                            ? null
                            : request.get("newPassword") == null
                            ? null
                            : String.valueOf(
                                    request.get("newPassword")
                            );

            return ResponseEntity.ok(
                    hrAdminService
                            .resetEmployeePassword(
                                    employeeId,
                                    newPassword
                            )
            );

        } catch (IllegalArgumentException ex) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(
                            Map.of(
                                    "message",
                                    ex.getMessage()
                            )
                    );
        }
    }
}