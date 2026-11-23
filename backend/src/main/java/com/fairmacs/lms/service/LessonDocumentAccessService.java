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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class LessonDocumentAccessService {

    private static final Logger log = LoggerFactory.getLogger(LessonDocumentAccessService.class);

    private final LessonRepository lessonRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SecurityContextUtil securityContextUtil;
    private final ZohoWorkDriveDownloadService downloadService;
    private final LessonProgressService lessonProgressService;
    private final PolicyWatermarkService policyWatermarkService;

    public LessonDocumentAccessService(
            LessonRepository lessonRepository,
            EnrollmentRepository enrollmentRepository,
            SecurityContextUtil securityContextUtil,
            ZohoWorkDriveDownloadService downloadService) {
        this(lessonRepository, enrollmentRepository, securityContextUtil, downloadService, null, new PolicyWatermarkService());
    }

    public LessonDocumentAccessService(
            LessonRepository lessonRepository,
            EnrollmentRepository enrollmentRepository,
            SecurityContextUtil securityContextUtil,
            ZohoWorkDriveDownloadService downloadService,
            LessonProgressService lessonProgressService) {
        this(lessonRepository, enrollmentRepository, securityContextUtil, downloadService, lessonProgressService, new PolicyWatermarkService());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public LessonDocumentAccessService(
            LessonRepository lessonRepository,
            EnrollmentRepository enrollmentRepository,
            SecurityContextUtil securityContextUtil,
            ZohoWorkDriveDownloadService downloadService,
            LessonProgressService lessonProgressService,
            PolicyWatermarkService policyWatermarkService) {
        this.lessonRepository = lessonRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.securityContextUtil = securityContextUtil;
        this.downloadService = downloadService;
        this.lessonProgressService = lessonProgressService;
        this.policyWatermarkService = policyWatermarkService != null ? policyWatermarkService : new PolicyWatermarkService();
    }

    /**
     * Retrieve original document for in-browser viewer.
     */
    @Transactional(readOnly = true)
    public ZohoWorkDriveDownloadService.DownloadedDocument viewDocument(String lessonId) {
        User user = getCurrentValidatedUser();
        Lesson lesson = validateAccessAndGetLesson(lessonId, user);
        return downloadService.download(lesson.getWorkdriveFileId());
    }

    /**
     * Retrieve employee-specific watermarked derivative of the course document for download.
     * Original WorkDrive document and original byte array remain completely unmodified.
     */
    @Transactional(readOnly = true)
    public ZohoWorkDriveDownloadService.DownloadedDocument downloadWatermarkedDocument(String lessonId) {
        User user = getCurrentValidatedUser();
        Lesson lesson = validateAccessAndGetLesson(lessonId, user);

        ZohoWorkDriveDownloadService.DownloadedDocument originalDoc =
                downloadService.download(lesson.getWorkdriveFileId());

        if (originalDoc == null || originalDoc.content() == null || originalDoc.content().length == 0) {
            return originalDoc;
        }

        // Apply watermark strictly to PDF documents
        boolean isPdf = isPdfDocument(originalDoc.filename(), originalDoc.contentType());
        if (!isPdf) {
            log.info("Non-PDF document '{}' for lessonId '{}' downloaded without watermark",
                    originalDoc.filename(), lessonId);
            return originalDoc;
        }

        String watermarkText = generateWatermarkText(user, LocalDateTime.now());
        log.info("Generating watermarked course PDF for employee '{}' (ID: '{}') for lessonId '{}'",
                user.getName(), user.getEmployeeId(), lessonId);

        byte[] watermarkedBytes = policyWatermarkService.embedWatermark(originalDoc.content(), watermarkText);

        return new ZohoWorkDriveDownloadService.DownloadedDocument(
                watermarkedBytes,
                originalDoc.filename(),
                originalDoc.contentType()
        );
    }

    /**
     * Resolves and validates active employee/user access to a lesson.
     */
    public Lesson validateAccessAndGetLesson(String lessonId, User user) {
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
            // Employees and other roles must have an explicit, non-revoked enrollment
            Enrollment enrollment = enrollmentRepository
                    .findByUserIdAndCourseId(user.getId(), course.getId())
                    .orElse(null);

            if (enrollment == null || enrollment.getStatus() == EnrollmentStatus.REVOKED) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You do not have access to this course document.");
            }

            // Employees must not access inactive or draft courses
            if (user.getRole() == Role.EMPLOYEE
                    && (!Boolean.TRUE.equals(course.getActive()) || Boolean.TRUE.equals(course.getDraft()))) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "This course is not currently available.");
            }

            if (lessonProgressService != null && !lessonProgressService.isLessonUnlocked(enrollment.getId(), lesson.getId())) {
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Lesson is locked. You must complete the previous lesson before accessing this document.");
            }
        }

        if (lesson.getWorkdriveFileId() == null || lesson.getWorkdriveFileId().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No document is attached to this lesson.");
        }

        return lesson;
    }

    /**
     * Generates standard diagonal watermark text string:
     * CONFIDENTIAL – PROPERTY OF FAIRMACS | Employee Name | Employee Code | FAIRMACS KMS | Date & Time
     */
    public String generateWatermarkText(User user, LocalDateTime timestamp) {
        String employeeName = (user != null && user.getFullName() != null && !user.getFullName().isBlank())
                ? user.getFullName().trim()
                : (user != null && user.getName() != null && !user.getName().isBlank())
                    ? user.getName().trim()
                    : (user != null && user.getEmail() != null) ? user.getEmail() : "Authorized Employee";

        String employeeCode = (user != null && user.getEmployeeId() != null && !user.getEmployeeId().isBlank())
                ? user.getEmployeeId().trim()
                : (user != null && user.getId() != null) ? "EMP" + user.getId() : "EMP-001";

        String formattedTime = (timestamp != null ? timestamp : LocalDateTime.now())
                .format(DateTimeFormatter.ofPattern("d MMM yyyy, hh:mm a", Locale.ENGLISH));

        return "CONFIDENTIAL \u2013 PROPERTY OF FAIRMACS | " + employeeName + " | " + employeeCode + " | FAIRMACS KMS | " + formattedTime;
    }

    /**
     * Determines whether the document is a PDF based on content-type or filename.
     */
    public boolean isPdfDocument(String filename, org.springframework.http.MediaType contentType) {
        if (contentType != null && (org.springframework.http.MediaType.APPLICATION_PDF.includes(contentType)
                || contentType.toString().toLowerCase(Locale.ROOT).contains("pdf"))) {
            return true;
        }
        return filename != null && filename.toLowerCase(Locale.ROOT).endsWith(".pdf");
    }

    public boolean isPdfDocument(String filename, String contentType) {
        if (contentType != null && contentType.toLowerCase(Locale.ROOT).contains("pdf")) {
            return true;
        }
        return filename != null && filename.toLowerCase(Locale.ROOT).endsWith(".pdf");
    }

    public User getCurrentValidatedUser() {
        User user = securityContextUtil.getCurrentUser();
        if (user == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication is required.");
        }
        if (user.getStatus() != null && user.getStatus() != UserStatus.ACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Your account is not active.");
        }
        return user;
    }

    public User getCurrentUser() {
        return securityContextUtil.getCurrentUser();
    }
}
