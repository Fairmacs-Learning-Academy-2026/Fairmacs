package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.EmployeeTrainingTranscriptDTO;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ManagerReportsService {

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;

    public ManagerReportsService(
            UserRepository userRepository,
            EnrollmentRepository enrollmentRepository
    ) {
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    // =========================================================
    // EMPLOYEE TRAINING TRANSCRIPT
    // =========================================================

    public EmployeeTrainingTranscriptDTO getEmployeeTrainingTranscript(
            Long userId
    ) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Employee not found."
                        )
                );

        List<Enrollment> enrollments =
                enrollmentRepository.findByUserIdWithCourse(userId);

        EmployeeTrainingTranscriptDTO dto =
                new EmployeeTrainingTranscriptDTO();

        // =====================================================
        // EMPLOYEE INFORMATION
        // =====================================================

        dto.setUserId(user.getId());
        dto.setEmployeeId(user.getEmployeeId());
        dto.setEmployeeName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setDesignation(user.getDesignation());
        dto.setDepartment(user.getDepartment());

        // =====================================================
        // COURSE RECORDS
        // =====================================================

        List<EmployeeTrainingTranscriptDTO.CourseRecordDTO> records =
                enrollments.stream()
                        .map(this::toCourseRecord)
                        .toList();

        dto.setCourses(records);

        // =====================================================
        // SUMMARY
        // =====================================================

        int totalCourses = enrollments.size();

        int completedCourses = (int) enrollments.stream()
                .filter(e ->
                        e.getStatus() == EnrollmentStatus.COMPLETED
                )
                .count();

        int inProgressCourses = (int) enrollments.stream()
                .filter(e ->
                        e.getStatus() != EnrollmentStatus.COMPLETED
                                &&
                        e.getStatus() != EnrollmentStatus.NOT_STARTED
                )
                .count();

        int notStartedCourses = (int) enrollments.stream()
                .filter(e ->
                        e.getStatus() == EnrollmentStatus.NOT_STARTED
                )
                .count();

        int certificatesIssued = (int) enrollments.stream()
                .filter(e ->
                        e.getCertificateId() != null
                                &&
                        !e.getCertificateId().isBlank()
                )
                .count();

        double overallProgress = enrollments.stream()
                .map(Enrollment::getProgressPercent)
                .filter(value -> value != null)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0);

        double averageScore = enrollments.stream()
                .map(Enrollment::getScore)
                .filter(value -> value != null)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0.0);

        double totalTrainingHours = enrollments.stream()
                .map(Enrollment::getCourse)
                .filter(course -> course != null)
                .map(course -> course.getDurationHours())
                .filter(value -> value != null)
                .mapToDouble(Double::doubleValue)
                .sum();

        dto.setTotalCourses(totalCourses);
        dto.setCompletedCourses(completedCourses);
        dto.setInProgressCourses(inProgressCourses);
        dto.setNotStartedCourses(notStartedCourses);
        dto.setCertificatesIssued(certificatesIssued);

        dto.setOverallProgress(round(overallProgress));
        dto.setAverageScore(round(averageScore));
        dto.setTotalTrainingHours(round(totalTrainingHours));

        return dto;
    }

    // =========================================================
    // CONVERT ENROLLMENT → COURSE RECORD
    // =========================================================

    private EmployeeTrainingTranscriptDTO.CourseRecordDTO
    toCourseRecord(Enrollment enrollment) {

        EmployeeTrainingTranscriptDTO.CourseRecordDTO dto =
                new EmployeeTrainingTranscriptDTO.CourseRecordDTO();

        dto.setEnrollmentId(enrollment.getId());

        if (enrollment.getCourse() != null) {

            dto.setCourseDatabaseId(
                    enrollment.getCourse().getId()
            );

            dto.setCourseId(
                    enrollment.getCourse().getCourseId()
            );

            dto.setCourseTitle(
                    enrollment.getCourse().getTitle()
            );

            dto.setCategory(
                    enrollment.getCourse().getCategory()
            );

            String courseDept = enrollment.getCourse().getOwningDepartment() != null
                    ? enrollment.getCourse().getOwningDepartment().getName()
                    : (enrollment.getCourse().getCatalogCategory() != null && !enrollment.getCourse().getCatalogCategory().getName().equalsIgnoreCase("Uncategorized")
                            ? enrollment.getCourse().getCatalogCategory().getName()
                            : (enrollment.getCourse().getCategory() != null && !enrollment.getCourse().getCategory().isBlank() && !enrollment.getCourse().getCategory().equalsIgnoreCase("Uncategorized")
                                    ? enrollment.getCourse().getCategory()
                                    : "General"));
            dto.setCourseDepartment(courseDept);
            dto.setOwningDepartmentId(enrollment.getCourse().getOwningDepartment() != null ? enrollment.getCourse().getOwningDepartment().getId() : null);

            dto.setDurationHours(
                    enrollment.getCourse().getDurationHours()
            );
        }

        String assignType = enrollment.getEnrollmentType() == EnrollmentType.MANDATORY
                ? "Mandatory"
                : (enrollment.getEnrollmentType() == EnrollmentType.RECOMMENDED ? "Recommended" : "Self-Selected");
        dto.setAssignmentType(assignType);

        dto.setEnrollmentType(
                enrollment.getEnrollmentType() != null
                        ? enrollment.getEnrollmentType().name()
                        : null
        );

        dto.setStatus(
                enrollment.getStatus() != null
                        ? enrollment.getStatus().name()
                        : null
        );

        Integer progress = enrollment.getProgressPercent();
        if (enrollment.getStatus() != EnrollmentStatus.COMPLETED && progress != null && progress >= 100) {
            progress = 98;
        }
        dto.setProgressPercent(progress);

        if (enrollment.getUser() != null) {
            dto.setEmployeeDepartment(enrollment.getUser().getDepartment());
        }

        dto.setScore(
                enrollment.getScore()
        );

        dto.setCertificateId(
                enrollment.getCertificateId()
        );

        dto.setDueDate(
                enrollment.getDueDate()
        );

        dto.setEnrolledAt(
                enrollment.getEnrolledAt()
        );

        dto.setCompletedDate(
                enrollment.getCompletedDate()
        );

        dto.setLastAccessed(
                enrollment.getLastAccessed()
        );

        return dto;
    }

    // =========================================================
    // ROUND
    // =========================================================

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
