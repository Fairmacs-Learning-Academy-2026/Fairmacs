package com.fairmacs.lms.controller;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.EnrollRequest;
import com.fairmacs.lms.service.EnrollmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/enrollments")
@CrossOrigin
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    public EnrollmentController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @PostMapping
    public ResponseEntity<CourseDTO> enrollInCourse(
            @RequestBody EnrollRequest request) {

        return ResponseEntity.ok(
                enrollmentService.enrollSelf(request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<CourseDTO>> getMyEnrollments() {

        return ResponseEntity.ok(
                enrollmentService.myEnrollments());
    }

    @PostMapping("/complete")
    public ResponseEntity<CertificateDTO> completeCourse(
            @RequestBody CompleteCourseRequest request) {

        return ResponseEntity.ok(
                enrollmentService.completeCourse(request));
    }
}