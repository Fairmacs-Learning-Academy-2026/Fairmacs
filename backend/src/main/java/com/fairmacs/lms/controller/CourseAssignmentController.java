package com.fairmacs.lms.controller;

import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.EnrollmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/course-assignments")
@CrossOrigin
public class CourseAssignmentController {
    private final EnrollmentService enrollmentService;
    private final SecurityContextUtil securityContextUtil;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    public CourseAssignmentController(EnrollmentService enrollmentService,
                                      SecurityContextUtil securityContextUtil,
                                      CourseRepository courseRepository,
                                      EnrollmentRepository enrollmentRepository) {
        this.enrollmentService = enrollmentService;
        this.securityContextUtil = securityContextUtil;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> assignCourse(@RequestBody AssignCourseRequest request) {
        requireAssignmentRole();
        if (request == null) throw new IllegalArgumentException("Assignment details are required.");
        if (request.getCourseId() == null
                && (request.getCourseCode() == null || request.getCourseCode().isBlank())) {
            throw new IllegalArgumentException("Course ID or course code is required.");
        }
        if (request.getEmployeeIds() == null || request.getEmployeeIds().isEmpty()) {
            throw new IllegalArgumentException("Select at least one employee.");
        }
        if (request.getDueDate() != null && request.getDueDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("The due date cannot be in the past.");
        }

        Course course = resolveCourse(request.getCourseId(), request.getCourseCode());
        if (!Boolean.TRUE.equals(course.getActive()) || Boolean.TRUE.equals(course.getDraft())) {
            throw new IllegalArgumentException("Only published, active courses can be assigned.");
        }

        int assigned = enrollmentService.assignCourseToEmployees(
                request.getEmployeeIds(), course.getId(), course.getCourseId(), request.getDueDate());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "assignedCount", assigned,
                "message", assigned + " employee(s) assigned or restored successfully."
        ));
    }

    /** Current non-revoked enrollments for the assignment modal. */
    @GetMapping("/{courseId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getAssignedEmployees(@PathVariable Long courseId) {
        requireAssignmentRole();
        if (!courseRepository.existsById(courseId)) {
            throw new IllegalArgumentException("Course was not found.");
        }

        List<Map<String, Object>> rows = enrollmentRepository.findByCourseId(courseId).stream()
                .filter(e -> e.getStatus() != EnrollmentStatus.REVOKED)
                .map(e -> {
                    User user = e.getUser();
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("enrollmentId", e.getId());
                    row.put("userId", user.getId());
                    row.put("employeeId", user.getEmployeeId());
                    row.put("name", user.getName());
                    row.put("email", user.getEmail());
                    row.put("department", user.getDepartment());
                    row.put("level", user.getLevel());
                    row.put("status", e.getStatus() == null ? "" : e.getStatus().name());
                    row.put("progressPercent", e.getProgressPercent() == null ? 0 : e.getProgressPercent());
                    row.put("certificateId", e.getCertificateId());
                    return row;
                })
                .toList();
        return ResponseEntity.ok(rows);
    }

    /** Soft-revokes an employee's access while preserving their learning history. */
    @DeleteMapping("/{courseId}/employees/{userId}")
    @Transactional
    public ResponseEntity<Map<String, Object>> removeAssignment(@PathVariable Long courseId,
                                                                 @PathVariable Long userId) {
        requireAssignmentRole();
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                .orElseThrow(() -> new IllegalArgumentException("This employee is not assigned to this course."));

        if (enrollment.getStatus() == EnrollmentStatus.REVOKED) {
            return ResponseEntity.ok(Map.of("success", true, "message", "Course access was already revoked."));
        }
        if (enrollment.getStatus() == EnrollmentStatus.COMPLETED
                || (enrollment.getCertificateId() != null && !enrollment.getCertificateId().isBlank())) {
            throw new IllegalArgumentException(
                    "This course is completed or has a certificate. Its history cannot be removed here.");
        }

        Course course = enrollment.getCourse();
        enrollment.setStatus(EnrollmentStatus.REVOKED);
        enrollmentRepository.save(enrollment);

        // Only decrement for this enrollment transition; do not let the count go below zero.
        int enrolledCount = course.getEnrolledCount() == null ? 0 : course.getEnrolledCount();
        if (enrolledCount > 0) {
            course.setEnrolledCount(enrolledCount - 1);
            courseRepository.save(course);
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Course access revoked. Learning history has been preserved."
        ));
    }

    private Course resolveCourse(Long courseId, String courseCode) {
        if (courseId != null) {
            return courseRepository.findById(courseId)
                    .orElseThrow(() -> new IllegalArgumentException("Course was not found."));
        }
        return courseRepository.findByCourseId(courseCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Course was not found."));
    }

    private void requireAssignmentRole() {
        User currentUser = securityContextUtil.getCurrentUser();
        if (currentUser == null || currentUser.getRole() == null) {
            throw new AccessDeniedException("Authentication is required.");
        }
        Role role = currentUser.getRole();
        if (role != Role.HR_ADMIN && role != Role.TRAINER) {
            throw new AccessDeniedException("Only HR/Admin and Trainers can manage course assignments.");
        }
    }

    public static class AssignCourseRequest {
        private Long courseId;
        private String courseCode;
        private List<Long> employeeIds;
        private LocalDate dueDate;

        public Long getCourseId() { return courseId; }
        public void setCourseId(Long courseId) { this.courseId = courseId; }
        public String getCourseCode() { return courseCode; }
        public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
        public List<Long> getEmployeeIds() { return employeeIds; }
        public void setEmployeeIds(List<Long> employeeIds) { this.employeeIds = employeeIds; }
        public LocalDate getDueDate() { return dueDate; }
        public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    }
}
