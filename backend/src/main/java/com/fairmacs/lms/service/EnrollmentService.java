package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.EnrollRequest;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final CertificateService certificateService;
    private final SecurityContextUtil securityContextUtil;
    private final CourseMapper courseMapper;

    public EnrollmentService(EnrollmentRepository enrollmentRepository,
            CourseRepository courseRepository,
            CertificateService certificateService,
            SecurityContextUtil securityContextUtil,
            CourseMapper courseMapper) {
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.certificateService = certificateService;
        this.securityContextUtil = securityContextUtil;
        this.courseMapper = courseMapper;
    }

    @Transactional
    public CourseDTO enrollSelf(EnrollRequest request) {
        User user = securityContextUtil.getCurrentUser();
        Course course = resolveCourse(request.getCourseId(), request.getCourseCode());
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(user.getId(), course.getId())
                .orElse(null);
        if (enrollment == null) {
            enrollment = new Enrollment();
            enrollment.setUser(user);
            enrollment.setCourse(course);
            enrollment.setEnrollmentType(Boolean.TRUE.equals(course.getFoundation())
                    ? EnrollmentType.MANDATORY
                    : EnrollmentType.SELF_SELECTED);
            enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
            enrollment.setProgressPercent(0);
            enrollment.setLastAccessed(LocalDateTime.now());
            if (enrollment.getEnrollmentType() == EnrollmentType.MANDATORY) {
                enrollment.setDueDate(LocalDate.now().plusDays(30));
            }
            enrollment = enrollmentRepository.save(enrollment);
            course.setEnrolledCount((course.getEnrolledCount() == null ? 0 : course.getEnrolledCount()) + 1);
            courseRepository.save(course);
        } else if (enrollment.getStatus() == EnrollmentStatus.NOT_STARTED) {
            enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
            enrollment.setLastAccessed(LocalDateTime.now());
            enrollment = enrollmentRepository.save(enrollment);
        }
        String type = enrollment.getEnrollmentType() == EnrollmentType.MANDATORY ? "MANDATORY" : "OPTIONAL";
        return courseMapper.toSummary(course, enrollment, type);
    }

    @Transactional(readOnly = true)
    public List<CourseDTO> myEnrollments() {
        User user = securityContextUtil.getCurrentUser();
        return enrollmentRepository.findByUserIdWithCourse(user.getId()).stream()
                .map(e -> courseMapper.toSummary(e.getCourse(), e,
                        e.getEnrollmentType() == EnrollmentType.MANDATORY ? "MANDATORY" : "OPTIONAL"))
                .toList();
    }

    @Transactional
    public CertificateDTO completeCourse(CompleteCourseRequest request) {
        Long enrollmentId = request.getEnrollmentId();
        Long courseId = request.getCourseId();
        Integer score = request.getScore();

        Enrollment enrollment = null;
        if (enrollmentId != null) {
            enrollment = enrollmentRepository.findByIdWithUserAndCourse(enrollmentId)
                    .orElse(null);
        }
        Long userId = securityContextUtil.getCurrentUserId();
        if (enrollment == null && courseId != null) {
            enrollment = enrollmentRepository.findByUserIdAndCourseId(userId, courseId)
                    .orElse(null);
        }
        if (enrollment == null && request.getCourseCode() != null && !request.getCourseCode().isBlank()) {
            enrollment = enrollmentRepository.findByUserIdAndCourseCode(userId, request.getCourseCode())
                    .orElse(null);
        }
        if (enrollment == null) {
            throw new ResourceNotFoundException("Enrollment",
                    enrollmentId != null ? "id" : "userId+courseId",
                    enrollmentId != null ? enrollmentId.toString() : String.valueOf(courseId));
        }

        Long currentUserId = securityContextUtil.getCurrentUserId();
        String currentRole = securityContextUtil.getCurrentUserRole();
        boolean isOwner = enrollment.getUser().getId().equals(currentUserId);
        boolean isHr = Role.HR_ADMIN.name().equalsIgnoreCase(currentRole);

        if (!isOwner && !isHr) {
            throw new SecurityException("Only the enrolled employee or HR Admin can complete a course.");
        }

        enrollment.setStatus(EnrollmentStatus.COMPLETED);
        enrollment.setProgressPercent(100);
        enrollment.setScore(score);
        enrollment.setCompletedDate(LocalDateTime.now());

        var certificate = certificateService.createCertificate(
                enrollment.getUser().getId(),
                enrollment.getCourse().getId(),
                score);

        enrollment.setCertificateId(certificate.getCertificateId());
        enrollmentRepository.save(enrollment);

        return certificateService.verifyCertificate(certificate.getCertificateId());
    }

    private Course resolveCourse(Long dbId, String courseCode) {
        if (dbId != null) {
            return courseRepository.findById(dbId)
                    .orElseThrow(() -> new ResourceNotFoundException("Course", "id", dbId));
        }
        if (courseCode != null && !courseCode.isBlank()) {
            return courseRepository.findByCourseId(courseCode)
                    .orElseThrow(() -> new ResourceNotFoundException("Course", "courseId", courseCode));
        }
        throw new ResourceNotFoundException("Course", "id", "missing");
    }
}
