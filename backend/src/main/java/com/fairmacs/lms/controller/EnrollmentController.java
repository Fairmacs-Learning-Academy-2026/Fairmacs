package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.DepartmentCourseAssignmentRequest;
import com.fairmacs.lms.dto.EnrollRequest;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.EnrollmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/enrollments")
@CrossOrigin
public class EnrollmentController {

    private final EnrollmentService enrollmentService;
    private final SecurityContextUtil securityContextUtil;

    public EnrollmentController(EnrollmentService enrollmentService,
                                SecurityContextUtil securityContextUtil) {
        this.enrollmentService = enrollmentService;
        this.securityContextUtil = securityContextUtil;
    }

    @PostMapping
    public ResponseEntity<CourseDTO> enrollInCourse(@RequestBody EnrollRequest request) {
        return ResponseEntity.ok(enrollmentService.enrollSelf(request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<CourseDTO>> getMyEnrollments() {
        return ResponseEntity.ok(enrollmentService.myEnrollments());
    }

    @PostMapping("/complete")
    public ResponseEntity<CertificateDTO> completeCourse(@RequestBody CompleteCourseRequest request) {
        return ResponseEntity.ok(enrollmentService.completeCourse(request));
    }

    @PostMapping("/assign-department")
    public ResponseEntity<Map<String, Object>> assignCourseToDepartment(
            @RequestBody DepartmentCourseAssignmentRequest request) {
        requireAssignmentRole();
        if (request == null) {
            throw new IllegalArgumentException("Department assignment details are required.");
        }

        int assignedCount = enrollmentService.assignCourseToDepartment(
                request.getDepartment(),
                request.getCourseId(),
                request.getCourseCode(),
                request.getDueDate(),
                request.getTrainingType(),
                request.getTargetLevel());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "assignedCount", assignedCount
        ));
    }

    private void requireAssignmentRole() {
        User currentUser = securityContextUtil.getCurrentUser();
        if (currentUser == null || currentUser.getRole() == null) {
            throw new AccessDeniedException("Authentication is required.");
        }
        Role role = currentUser.getRole();
        if (role != Role.HR_ADMIN && role != Role.TRAINER) {
            throw new AccessDeniedException("Only HR/Admin and Trainers can assign courses to departments.");
        }
    }
}
