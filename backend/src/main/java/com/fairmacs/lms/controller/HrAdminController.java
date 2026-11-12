package com.fairmacs.lms.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.service.EmployeeExcelImportService;
import com.fairmacs.lms.service.HrAdminService;

@RestController
@RequestMapping("/api/hr")
public class HrAdminController {

    private final HrAdminService hrAdminService;
    private final EmployeeExcelImportService employeeExcelImportService;

    public HrAdminController(
            HrAdminService hrAdminService,
            EmployeeExcelImportService employeeExcelImportService
    ) {
        this.hrAdminService = hrAdminService;
        this.employeeExcelImportService = employeeExcelImportService;
    }

    @GetMapping("/dashboard/metrics")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> getDashboardMetrics() {
        try {
            return ResponseEntity.ok(hrAdminService.getDashboardMetrics());
        } catch (Exception ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            Map.of(
                                    "success", false,
                                    "message", "Unable to load HR dashboard metrics."
                            )
                    );
        }
    }

    @GetMapping("/employees")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER')")
    public ResponseEntity<List<Map<String, Object>>> getEmployees() {
        return ResponseEntity.ok(hrAdminService.getEmployees());
    }

    @PostMapping("/employees")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> createEmployee(@RequestBody Map<String, Object> request) {
        try {
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(hrAdminService.createEmployee(request));
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

    @PutMapping("/employees/{employeeId}")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> updateEmployee(
            @PathVariable String employeeId,
            @RequestBody Map<String, Object> request
    ) {
        try {
            return ResponseEntity.ok(hrAdminService.updateEmployee(employeeId, request));
        } catch (ResourceNotFoundException ex) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("success", false, "message", ex.getMessage()));
        }
    }

    @GetMapping(
            value = "/employees/import-template",
            produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<byte[]> downloadEmployeeImportTemplate() {
        byte[] templateBytes = employeeExcelImportService.generateImportTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ));
        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename("fairmacs-employee-import-template.xlsx")
                        .build()
        );
        return new ResponseEntity<>(templateBytes, headers, HttpStatus.OK);
    }

    @PostMapping(
            value = "/employees/import",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> importEmployees(@RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> result = employeeExcelImportService.importEmployees(file);
            boolean success = Boolean.TRUE.equals(result.get("success"));

            if (!success) {
                return ResponseEntity.badRequest().body(result);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(result);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(
                            Map.of(
                                    "success", false,
                                    "message", ex.getMessage()
                            )
                    );
        } catch (Exception ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(
                            Map.of(
                                    "success", false,
                                    "message", "Unable to import employees."
                            )
                    );
        }
    }

    @PatchMapping("/employees/{employeeId}/status")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> changeEmployeeStatus(
            @PathVariable String employeeId,
            @RequestBody(required = false) Map<String, Object> request
    ) {
        try {
            String status = request == null || request.get("status") == null
                    ? null
                    : String.valueOf(request.get("status"));
            String reason = request != null && request.get("reason") != null
                    ? String.valueOf(request.get("reason"))
                    : "HR administrative update";

            return ResponseEntity.ok(hrAdminService.changeEmployeeStatus(employeeId, status, reason));
        } catch (ResourceNotFoundException ex) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", ex.getMessage()));
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

    @GetMapping("/employees/{employeeId}/status-history")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> getEmployeeStatusHistory(@PathVariable String employeeId) {
        return ResponseEntity.ok(hrAdminService.getEmployeeStatusHistory(employeeId));
    }

    @DeleteMapping("/employees/{employeeId}")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> deactivateEmployee(@PathVariable String employeeId) {
        try {
            return ResponseEntity.ok(hrAdminService.changeEmployeeStatus(employeeId, "INACTIVE"));
        } catch (ResourceNotFoundException ex) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("success", false, "message", ex.getMessage()));
        }
    }

    @PostMapping("/employees/{employeeId}/reset-password")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<?> resetEmployeePassword(
            @PathVariable String employeeId,
            @RequestBody(required = false) Map<String, Object> request
    ) {
        try {
            String newPassword = request == null || request.get("newPassword") == null
                    ? null
                    : String.valueOf(request.get("newPassword"));

            return ResponseEntity.ok(
                    hrAdminService.resetEmployeePassword(employeeId, newPassword)
            );
        } catch (ResourceNotFoundException ex) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("success", false, "message", ex.getMessage()));
        }
    }
}
