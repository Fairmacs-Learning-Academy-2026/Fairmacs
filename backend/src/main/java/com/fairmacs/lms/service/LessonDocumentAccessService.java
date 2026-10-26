
package com.fairmacs.lms.service;

import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.Lesson;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LessonRepository;
import com.fairmacs.lms.security.SecurityContextUtil;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LessonDocumentAccessService {

    private final LessonRepository lessonRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SecurityContextUtil securityContextUtil;
    private final ZohoWorkDriveDownloadService downloadService;

    public LessonDocumentAccessService(
            LessonRepository lessonRepository,
            EnrollmentRepository enrollmentRepository,
            SecurityContextUtil securityContextUtil,
            ZohoWorkDriveDownloadService downloadService) {
        this.lessonRepository = lessonRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.securityContextUtil = securityContextUtil;
        this.downloadService = downloadService;
    }

    @Transactional(readOnly = true)
    public ZohoWorkDriveDownloadService.DownloadedDocument
            viewDocument(String lessonId) {

        User user = securityContextUtil.getCurrentUser();

        if (user == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required.");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Your account is not active.");
        }

        Lesson lesson = lessonRepository.findByLessonId(lessonId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Lesson not found."));

        if (lesson.getModule() == null
                || lesson.getModule().getCourse() == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "The lesson is not linked to a course.");
        }

        Course course = lesson.getModule().getCourse();

        boolean privileged =
                user.getRole() == Role.HR_ADMIN
                || user.getRole() == Role.TRAINER;

        if (!privileged) {
            // Employees and other roles must have an explicit,
            // non-revoked enrollment in this exact course.
            Enrollment enrollment = enrollmentRepository
                    .findByUserIdAndCourseId(
                            user.getId(), course.getId())
                    .orElse(null);

            if (enrollment == null
                    || enrollment.getStatus() == EnrollmentStatus.REVOKED) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You do not have access to this course document.");
            }

            // Employees must not access inactive or draft courses.
            if (user.getRole() == Role.EMPLOYEE
                    && (!Boolean.TRUE.equals(course.getActive())
                    || Boolean.TRUE.equals(course.getDraft()))) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "This course is not currently available.");
            }
        }

        if (lesson.getWorkdriveFileId() == null
                || lesson.getWorkdriveFileId().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No document is attached to this lesson.");
        }

        // Only contact Zoho after access has been verified.
        return downloadService.download(lesson.getWorkdriveFileId());
    }
}
