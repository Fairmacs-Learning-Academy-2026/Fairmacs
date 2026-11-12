package com.fairmacs.lms.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fairmacs.lms.dto.DepartmentCourseDTO;
import com.fairmacs.lms.dto.DepartmentCourseEmployeesDTO;
import com.fairmacs.lms.dto.DepartmentDetailsDTO;
import com.fairmacs.lms.dto.DepartmentEmployeeDTO;
import com.fairmacs.lms.dto.DepartmentSummaryDTO;
import com.fairmacs.lms.service.DepartmentService;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public ResponseEntity<List<DepartmentSummaryDTO>> getAllDepartments() {
        return ResponseEntity.ok(departmentService.getAllDepartments());
    }

    @GetMapping("/{departmentId}/employees")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER','MANAGER')")
    public ResponseEntity<List<DepartmentEmployeeDTO>> getDepartmentEmployees(
            @PathVariable Long departmentId
    ) {
        return ResponseEntity.ok(
                departmentService.getEmployeesByDepartment(departmentId)
        );
    }

    @GetMapping("/{departmentId}/courses")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER','MANAGER')")
    public ResponseEntity<List<DepartmentCourseDTO>> getDepartmentCourses(
            @PathVariable Long departmentId
    ) {
        return ResponseEntity.ok(
                departmentService.getCoursesByDepartment(departmentId)
        );
    }

    @GetMapping("/{departmentId}/details")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER','MANAGER')")
    public ResponseEntity<DepartmentDetailsDTO> getDepartmentDetails(
            @PathVariable Long departmentId
    ) {
        return ResponseEntity.ok(
                departmentService.getDepartmentDetails(departmentId)
        );
    }

    @GetMapping("/{departmentId}/courses/{courseId}/employees")
    @PreAuthorize("hasAnyRole('HR_ADMIN','TRAINER','MANAGER')")
    public ResponseEntity<DepartmentCourseEmployeesDTO> getCourseEmployees(
            @PathVariable Long departmentId,
            @PathVariable Long courseId
    ) {
        return ResponseEntity.ok(
                departmentService.getCourseEmployees(departmentId, courseId)
        );
    }
}
