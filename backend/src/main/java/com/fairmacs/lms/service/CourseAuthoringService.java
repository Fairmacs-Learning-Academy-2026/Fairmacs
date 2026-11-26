package com.fairmacs.lms.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;



import com.fairmacs.lms.dto.CourseAuthoringRequest;
import com.fairmacs.lms.dto.CourseDTO;
import java.util.Objects;
import com.fairmacs.lms.dto.CourseDepartmentAssignmentDTO;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.CourseDepartmentAssignmentDTO;

import com.fairmacs.lms.entity.Category;

import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.CourseDepartmentAssignment;
import com.fairmacs.lms.entity.Department;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.repository.CourseDepartmentAssignmentRepository;

import com.fairmacs.lms.entity.Lesson;

import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.entity.NotificationPriority;
import com.fairmacs.lms.entity.NotificationType;

import com.fairmacs.lms.entity.Quiz;

import com.fairmacs.lms.entity.QuizQuestion;

import com.fairmacs.lms.entity.QuizType;

import com.fairmacs.lms.entity.Role;


import com.fairmacs.lms.entity.LearningPath;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.QuizProgressRepository;
import com.fairmacs.lms.repository.RecommendationRuleRepository;
import com.fairmacs.lms.repository.LearningPathRepository;
import com.fairmacs.lms.repository.CategoryRepository;

import com.fairmacs.lms.repository.CourseRepository;

import com.fairmacs.lms.repository.DepartmentRepository;

import com.fairmacs.lms.repository.LessonRepository;

import com.fairmacs.lms.repository.ModuleRepository;

import com.fairmacs.lms.repository.QuizQuestionRepository;

import com.fairmacs.lms.repository.QuizRepository;

import com.fairmacs.lms.repository.EnrollmentRepository;

import com.fairmacs.lms.repository.QuizAttemptRepository;

import com.fairmacs.lms.security.SecurityContextUtil;

import com.fairmacs.lms.entity.User;

import com.fasterxml.jackson.core.JsonProcessingException;

import com.fasterxml.jackson.databind.ObjectMapper;



import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.security.access.AccessDeniedException;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;



import java.time.LocalDate;

import java.util.ArrayList;
import java.util.Arrays;

import java.util.HashSet;

import java.util.List;

import java.util.Locale;

import java.util.Set;

import java.util.UUID;

import java.util.stream.Collectors;



@Service

public class CourseAuthoringService {

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private SystemSettingsService systemSettingsService;

    /** Default passing score configured by HR in System Settings (falls back to 70). */
    private int defaultPassingScore() {
        if (systemSettingsService != null) {
            int configured = systemSettingsService.getInt(SystemSettingsService.QUIZ_PASSING_SCORE);
            if (configured >= 1 && configured <= 100) {
                return configured;
            }
        }
        return 70;
    }

    private static final Logger log = LoggerFactory.getLogger(CourseAuthoringService.class);



    private final DepartmentRepository departmentRepository;

    private final EnrollmentService enrollmentService;

    private final CategoryRepository categoryRepository;

    private final CourseRepository courseRepository;

    private final ModuleRepository moduleRepository;

    private final LessonRepository lessonRepository;

    private final QuizRepository quizRepository;

    private final QuizQuestionRepository questionRepository;

    private final EnrollmentRepository enrollmentRepository;

    private final QuizAttemptRepository quizAttemptRepository;

    private final SecurityContextUtil securityContextUtil;

    private final ObjectMapper objectMapper;
    private final CertificateRepository certificateRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final QuizProgressRepository quizProgressRepository;
    private final RecommendationRuleRepository recommendationRuleRepository;
    private final LearningPathRepository learningPathRepository;
    private final NotificationService notificationService;
    private final IdSequenceService idSequenceService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.fairmacs.lms.repository.CourseThumbnailRepository thumbnailRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.fairmacs.lms.repository.CourseDepartmentAssignmentRepository courseDepartmentAssignmentRepository;

    public void setCourseDepartmentAssignmentRepository(com.fairmacs.lms.repository.CourseDepartmentAssignmentRepository courseDepartmentAssignmentRepository) {
        this.courseDepartmentAssignmentRepository = courseDepartmentAssignmentRepository;
    }

    public void setThumbnailRepository(com.fairmacs.lms.repository.CourseThumbnailRepository thumbnailRepository) {
        this.thumbnailRepository = thumbnailRepository;
    }

    public void setEntityManager(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @PersistenceContext
    private EntityManager entityManager;

    private void linkThumbnailToCourse(String bannerUrl, Long courseId) {
        if (thumbnailRepository == null || bannerUrl == null || courseId == null) return;
        try {
            String prefix = "/api/courses/thumbnails/";
            int idx = bannerUrl.indexOf(prefix);
            if (idx >= 0) {
                String storageId = bannerUrl.substring(idx + prefix.length()).trim();
                thumbnailRepository.findByStorageId(storageId).ifPresent(thumbnail -> {
                    thumbnail.setCourseId(courseId);
                    thumbnailRepository.save(thumbnail);
                });
            }
        } catch (Exception ex) {
            // Non-blocking thumbnail association
        }
    }

    public CourseAuthoringService(

            CategoryRepository categoryRepository,

            CourseRepository courseRepository,

            ModuleRepository moduleRepository,

            LessonRepository lessonRepository,

            QuizRepository quizRepository,

            QuizQuestionRepository questionRepository,

            SecurityContextUtil securityContextUtil,

            DepartmentRepository departmentRepository,

            EnrollmentRepository enrollmentRepository,

            QuizAttemptRepository quizAttemptRepository,

                        EnrollmentService enrollmentService,
            CertificateRepository certificateRepository,
            LessonProgressRepository lessonProgressRepository,
            QuizProgressRepository quizProgressRepository,
            RecommendationRuleRepository recommendationRuleRepository,
            LearningPathRepository learningPathRepository,
            ObjectMapper objectMapper) {
        this(
                categoryRepository,
                courseRepository,
                moduleRepository,
                lessonRepository,
                quizRepository,
                questionRepository,
                securityContextUtil,
                departmentRepository,
                enrollmentRepository,
                quizAttemptRepository,
                enrollmentService,
                certificateRepository,
                lessonProgressRepository,
                quizProgressRepository,
                recommendationRuleRepository,
                learningPathRepository,
                objectMapper,
                null,
                null
        );
    }

    @org.springframework.beans.factory.annotation.Autowired
    public CourseAuthoringService(
            CategoryRepository categoryRepository,
            CourseRepository courseRepository,
            ModuleRepository moduleRepository,
            LessonRepository lessonRepository,
            QuizRepository quizRepository,
            QuizQuestionRepository questionRepository,
            SecurityContextUtil securityContextUtil,
            DepartmentRepository departmentRepository,
            EnrollmentRepository enrollmentRepository,
            QuizAttemptRepository quizAttemptRepository,
            EnrollmentService enrollmentService,
            CertificateRepository certificateRepository,
            LessonProgressRepository lessonProgressRepository,
            QuizProgressRepository quizProgressRepository,
            RecommendationRuleRepository recommendationRuleRepository,
            LearningPathRepository learningPathRepository,
            ObjectMapper objectMapper,
            NotificationService notificationService,
            IdSequenceService idSequenceService) {

        this.categoryRepository = categoryRepository;
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.lessonRepository = lessonRepository;
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.securityContextUtil = securityContextUtil;
        this.departmentRepository = departmentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.enrollmentService = enrollmentService;
        this.certificateRepository = certificateRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.quizProgressRepository = quizProgressRepository;
        this.recommendationRuleRepository = recommendationRuleRepository;
        this.learningPathRepository = learningPathRepository;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.objectMapper.findAndRegisterModules();
        this.notificationService = notificationService;
        this.idSequenceService = idSequenceService;
    }


    
    @Transactional
    public CourseDTO assignCourseOwnership(String courseIdOrCode, Long departmentId) {
        if (courseIdOrCode == null || courseIdOrCode.isBlank()) {
            throw new IllegalArgumentException("Course ID is required.");
        }
        if (departmentId == null) {
            throw new IllegalArgumentException("Department ID is required.");
        }
        Course course = courseRepository.findAll().stream()
                .filter(c -> courseIdOrCode.equals(c.getCourseId())
                        || (c.getId() != null && courseIdOrCode.equals(String.valueOf(c.getId()))))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Course not found: " + courseIdOrCode));

        Department dept = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new IllegalArgumentException("Owning department with ID " + departmentId + " does not exist."));

        course.setOwningDepartment(dept);
        Course saved = courseRepository.save(course);
        return toCourseDTO(saved);
    }

    private CourseDTO toCourseDTO(Course saved) {
        CourseDTO dto = new CourseDTO();
        dto.setDbId(saved.getId());
        dto.setId(saved.getCourseId());
        dto.setTitle(saved.getTitle());
        dto.setDescription(saved.getDescription());
        dto.setActive(saved.getActive());
        String pos = saved.getLevel();
        if (pos != null && pos.trim().toUpperCase().matches("L[0-4]")) {
            pos = "P" + pos.trim().toUpperCase().charAt(1);
        }
        dto.setLevel(pos);
        dto.setPosition(pos);
        dto.setDuration(saved.getDuration());
        if (saved.getOwningDepartment() != null) {
            dto.setDepartmentId(saved.getOwningDepartment().getId());
            dto.setOwningDepartmentName(saved.getOwningDepartment().getName());
            dto.setDepartment(saved.getOwningDepartment().getName());
        }
        if (saved.getPublishedAt() != null) {
            dto.setPublishedAt(saved.getPublishedAt().toString());
        }
        if (courseDepartmentAssignmentRepository != null) {
            List<CourseDepartmentAssignment> assignments = courseDepartmentAssignmentRepository.findByCourse_Id(saved.getId());
            if (assignments != null && !assignments.isEmpty()) {
                dto.setDepartmentAssignments(assignments.stream().map(a -> {
                    CourseDepartmentAssignmentDTO adto = new CourseDepartmentAssignmentDTO();
                    adto.setId(a.getId());
                    if (a.getDepartment() != null) {
                        adto.setDepartmentId(a.getDepartment().getId());
                        adto.setDepartmentName(a.getDepartment().getName());
                        adto.setShortCode(a.getDepartment().getShortCode());
                    }
                    adto.setAssignmentType(a.getAssignmentType() != null ? a.getAssignmentType().name() : "MANDATORY");
                    adto.setDueDate(a.getDueDate());
                    return adto;
                }).toList());
                dto.setDepartments(assignments.stream().map(a -> a.getDepartment() != null ? a.getDepartment().getName() : null).filter(Objects::nonNull).toList());
            }
        }
        return dto;
    }

    @Transactional
    public void deleteCourse(String courseId) {
        requireAuthoringPermission();

        if (courseId == null || courseId.isBlank()) {
            throw new IllegalArgumentException("Course ID is required.");
        }

        Course course = courseRepository.findByCourseId(courseId)
                .or(() -> {
                    try {
                        return courseRepository.findById(Long.parseLong(courseId));
                    } catch (NumberFormatException e) {
                        return java.util.Optional.empty();
                    }
                })
                .orElseThrow(() -> new IllegalArgumentException("Course not found: " + courseId));

        Long courseDbId = course.getId();

        // Check 1: Preserve completed employee learning history and issued certificates
        if (certificateRepository.existsByCourse_Id(courseDbId)) {
            throw new IllegalStateException(
                    String.format("Cannot delete course '%s' (%s) because certificates have already been issued to employees. Please deactivate or archive the course instead to preserve certification and audit records.",
                            course.getTitle(), course.getCourseId())
            );
        }

        // Check 2: Preserve completed employee enrollments
        List<Enrollment> enrollments = enrollmentRepository.findByCourseId(courseDbId);
        boolean hasCompletions = enrollments.stream()
                .anyMatch(e -> e.getStatus() == EnrollmentStatus.COMPLETED);
        if (hasCompletions) {
            throw new IllegalStateException(
                    String.format("Cannot delete course '%s' (%s) because employees have completed this course. Please deactivate or archive the course instead to preserve employee training history.",
                            course.getTitle(), course.getCourseId())
            );
        }

        // Notify active learners before removing enrollments (non-blocking notification attempt)
        if (notificationService != null && !Boolean.TRUE.equals(course.getDraft())) {
            for (Enrollment enrollment : enrollments) {
                if (enrollment.getUser() != null
                        && enrollment.getStatus() != EnrollmentStatus.REVOKED
                        && enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
                    try {
                        notificationService.createNotificationSafely(
                                enrollment.getUser().getId(),
                                "Course Cancelled: " + course.getTitle(),
                                String.format(
                                        "The course \"%s\" (%s) has been retired by Training Administration and removed from your active assignments.",
                                        course.getTitle(),
                                        course.getCourseId()
                                ),
                                NotificationType.COURSE_CANCELLED,
                                NotificationPriority.HIGH,
                                "COURSE_CODE",
                                course.getCourseId(),
                                "/progress",
                                String.format("COURSE_CANCELLED:USER:%d:COURSE:%d", enrollment.getUser().getId(), courseDbId),
                                java.util.Map.of(
                                        "courseId", course.getCourseId(),
                                        "courseTitle", course.getTitle()
                                )
                        );
                    } catch (Exception notifEx) {
                        log.warn("Failed to notify user {} of course cancellation: {}", enrollment.getUser().getId(), notifEx.getMessage());
                    }
                }
            }
        }

        // Clear persistence context before bulk direct deletions so detached state is clean
        if (entityManager != null) {
            entityManager.clear();
        }

        // Execute transactional deletion of dependent records in strict dependency order.
        // No swallowing of exceptions so any failure immediately triggers a complete rollback.

        // 1. Remove from Learning Paths
        try {
            learningPathRepository.deleteItemsByCourseId(courseDbId);
        } catch (Exception lpEx) {
            log.warn("Direct deletion of learning path items failed, falling back to entity collection removal: {}", lpEx.getMessage());
            List<LearningPath> paths = learningPathRepository.findAllWithItems();
            for (LearningPath path : paths) {
                if (path.getItems() != null) {
                    boolean modified = path.getItems().removeIf(item -> item.getCourse() != null && courseDbId.equals(item.getCourse().getId()));
                    if (modified) {
                        learningPathRepository.save(path);
                    }
                }
            }
        }

        // 2. Remove Recommendation Rules
        recommendationRuleRepository.deleteByCourseId(courseDbId);

        // 3. Remove Course Thumbnails
        if (thumbnailRepository != null) {
            thumbnailRepository.deleteByCourseId(courseDbId);
        }

        // 4. Remove Department Assignments
        if (courseDepartmentAssignmentRepository != null) {
            courseDepartmentAssignmentRepository.deleteByCourse_Id(courseDbId);
        }

        // 5. Remove Lesson Progress (references lessons and enrollments, so delete before lessons and enrollments)
        lessonProgressRepository.deleteByCourseId(courseDbId);

        // 6. Remove Enrollments (after lesson progress is deleted)
        enrollmentRepository.deleteByCourseId(courseDbId);

        // 7. Remove Quiz Attempts and Quiz Progress and Quiz Questions (reference quizzes)
        quizAttemptRepository.deleteByCourseId(courseDbId);
        quizProgressRepository.deleteByCourseId(courseDbId);
        questionRepository.deleteByCourseId(courseDbId);

        // 8. Remove Quizzes (reference course and modules)
        quizRepository.deleteByCourseId(courseDbId);

        // 9. Remove Lessons (reference modules)
        lessonRepository.deleteByCourseId(courseDbId);

        // 10. Remove Modules (reference course)
        moduleRepository.deleteByCourseId(courseDbId);

        // 11. Remove any dangling certificates (policy checked 0, but clean up if any)
        certificateRepository.deleteByCourseId(courseDbId);

        // 12. Clear persistence context, then delete Course record directly
        if (entityManager != null) {
            entityManager.clear();
        }
        courseRepository.deleteCourseById(courseDbId);
        if (entityManager != null) {
            entityManager.clear();
        }
    }

    @Transactional
    public CourseDTO setCourseActive(String courseId, boolean active) {
        requireAuthoringPermission();
        if (courseId == null || courseId.isBlank()) {
            throw new IllegalArgumentException("Course ID is required.");
        }
        Course course = courseRepository.findByCourseId(courseId)
                .or(() -> {
                    try {
                        return courseRepository.findById(Long.parseLong(courseId));
                    } catch (NumberFormatException e) {
                        return java.util.Optional.empty();
                    }
                })
                .orElseThrow(() -> new IllegalArgumentException("Course not found: " + courseId));

        course.setActive(active);
        Course saved = courseRepository.save(course);
        return toCourseDTO(saved);
    }

    @Transactional(readOnly = true)
public java.util.Map<String, Object> getCourseForEditing(String courseId) {
    requireAuthoringPermission();

    if (courseId == null || courseId.isBlank()) {
        throw new IllegalArgumentException("Course ID is required.");
    }

    Course course = courseRepository.findAll()
            .stream()
            .filter(c ->
                    courseId.equals(c.getCourseId())
                    || (c.getId() != null
                        && courseId.equals(String.valueOf(c.getId())))
            )
            .findFirst()
            .orElseThrow(() ->
                    new IllegalArgumentException("Course not found."));

    java.util.Map<String, Object> response =
            new java.util.LinkedHashMap<>();

    // Basic course information
    response.put("id", course.getId());
    response.put("courseId", course.getCourseId());
    response.put("title", course.getTitle());
    response.put("level", course.getLevel());
    response.put("duration", course.getDuration());
    response.put("durationHours", course.getDurationHours());
    response.put("banner", course.getBanner());
    response.put("description", course.getDescription());
    response.put("foundation", course.getFoundation());
    response.put("draft", course.getDraft());
    response.put("active", course.getActive());
    response.put("passingScore", course.getPassingScore());
    response.put("certificateEligible", course.getCertificateEligible());
    response.put("publishedAt", course.getPublishedAt());
    response.put("learningOutcomes", course.getLearningOutcomes());

    if (course.getCatalogCategory() != null) {
        response.put(
                "categorySlug",
                course.getCatalogCategory().getSlug()
        );
    }

    // Keep the authoring snapshot available for both drafts and published courses.
    response.put("draftPayload", course.getDraftPayload());

    // Restore assignment selections. Newer courses have an authoring snapshot;
    // older published courses did not retain it, so infer what we can from enrollments.
    List<String> inferredDepartments = new ArrayList<>();
    List<Long> inferredEmployeeIds = new ArrayList<>();
    LocalDate inferredDueDate = null;
    List<com.fairmacs.lms.entity.Enrollment> courseEnrollments =
            enrollmentRepository.findByCourseId(course.getId());
    for (com.fairmacs.lms.entity.Enrollment enrollment : courseEnrollments) {
        if (enrollment.getDueDate() != null && inferredDueDate == null) {
            inferredDueDate = enrollment.getDueDate();
        }
        if (enrollment.getUser() == null) {
            continue;
        }
        if (enrollment.getEnrollmentType() == com.fairmacs.lms.entity.EnrollmentType.MANDATORY) {
            String departmentName = enrollment.getUser().getDepartment();
            if (departmentName != null && !departmentName.isBlank()
                    && !inferredDepartments.contains(departmentName.trim())) {
                inferredDepartments.add(departmentName.trim());
            }
        } else if (enrollment.getEnrollmentType() == com.fairmacs.lms.entity.EnrollmentType.SELF_SELECTED) {
            Long employeeId = enrollment.getUser().getId();
            if (employeeId != null && !inferredEmployeeIds.contains(employeeId)) {
                inferredEmployeeIds.add(employeeId);
            }
        }
    }

    List<String> targetDepartments = inferredDepartments;
    List<Long> targetEmployeeIds = inferredEmployeeIds;
    LocalDate assignmentDueDate = inferredDueDate;
    CourseAuthoringRequest savedAuthoringRequest = null;
    if (course.getDraftPayload() != null && !course.getDraftPayload().isBlank()) {
        try {
            savedAuthoringRequest = objectMapper.readValue(
                    course.getDraftPayload(), CourseAuthoringRequest.class);
            if (savedAuthoringRequest.getTargetDepartments() != null) {
                targetDepartments = savedAuthoringRequest.getTargetDepartments();
            }
            if (savedAuthoringRequest.getTargetEmployeeIds() != null) {
                targetEmployeeIds = savedAuthoringRequest.getTargetEmployeeIds();
            }
            if (savedAuthoringRequest.getDueDate() != null) {
                assignmentDueDate = savedAuthoringRequest.getDueDate();
            }
        } catch (JsonProcessingException ignored) {
            // Legacy/non-authoring payload: use the enrollment-based inference above.
        }
    }
    response.put("targetDepartments", targetDepartments);
    response.put("targetEmployeeIds", targetEmployeeIds);
    response.put("dueDate", assignmentDueDate);

    // Owning Department (Course Ownership)
    if (course.getOwningDepartment() != null) {
        response.put("departmentId", course.getOwningDepartment().getId());
        response.put("departmentName", course.getOwningDepartment().getName());
        response.put("departmentShortCode", course.getOwningDepartment().getShortCode());
    } else if (savedAuthoringRequest != null && savedAuthoringRequest.getDepartmentId() != null) {
        response.put("departmentId", savedAuthoringRequest.getDepartmentId());
    }

    // Persisted Department Assignments
    List<java.util.Map<String, Object>> assignmentList = new ArrayList<>();
    if (courseDepartmentAssignmentRepository != null) {
        List<CourseDepartmentAssignment> assignments = courseDepartmentAssignmentRepository.findByCourseIdWithDepartment(course.getId());
        for (CourseDepartmentAssignment a : assignments) {
            java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("id", a.getId());
            map.put("departmentId", a.getDepartment() != null ? a.getDepartment().getId() : null);
            map.put("departmentName", a.getDepartment() != null ? a.getDepartment().getName() : null);
            map.put("shortCode", a.getDepartment() != null ? a.getDepartment().getShortCode() : null);
            map.put("assignmentType", a.getAssignmentType() != null ? a.getAssignmentType().name() : "MANDATORY");
            map.put("dueDate", a.getDueDate());
            assignmentList.add(map);
        }
    }
    if (assignmentList.isEmpty() && savedAuthoringRequest != null
            && savedAuthoringRequest.getDepartmentAssignments() != null) {
        for (CourseAuthoringRequest.DepartmentAssignmentInput a : savedAuthoringRequest.getDepartmentAssignments()) {
            if (a == null) continue;
            java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("departmentId", a.getDepartmentId());
            map.put("departmentName", a.getDepartmentName());
            map.put("assignmentType", a.getAssignmentType() != null ? a.getAssignmentType() : "MANDATORY");
            map.put("dueDate", a.getDueDate());
            assignmentList.add(map);
        }
    }
    response.put("departmentAssignments", assignmentList);

    // Load saved quizzes for this course.
    List<Quiz> courseQuizzes =
            quizRepository.findByCourseId(course.getId());

    // Reconstruct modules and lessons from persisted database records.
    List<Module> savedModules =
            moduleRepository.findByCourseIdOrderByOrderIndexAsc(
                    course.getId()
            );

    List<java.util.Map<String, Object>> moduleResults =
            new ArrayList<>();

    for (Module module : savedModules) {
        java.util.Map<String, Object> moduleData =
                new java.util.LinkedHashMap<>();

        moduleData.put("id", module.getId());
        moduleData.put("moduleId", module.getModuleId());
        moduleData.put("title", module.getTitle());
        moduleData.put("orderIndex", module.getOrderIndex());

        List<java.util.Map<String, Object>> lessonResults =
                new ArrayList<>();

        List<Lesson> savedLessons =
                lessonRepository.findByModuleIdOrderByOrderIndexAsc(
                        module.getId()
                );

        for (Lesson lesson : savedLessons) {
            java.util.Map<String, Object> lessonData =
                    new java.util.LinkedHashMap<>();

            lessonData.put("id", lesson.getId());
            lessonData.put("lessonId", lesson.getLessonId());
            lessonData.put("title", lesson.getTitle());
            lessonData.put("type", lesson.getType());
            lessonData.put("contentUrl", lesson.getContentUrl());
            lessonData.put(
                    "workdriveFileId",
                    lesson.getWorkdriveFileId()
            );
            String workdriveFileName = null;
            if (savedAuthoringRequest != null && savedAuthoringRequest.getModules() != null) {
                for (CourseAuthoringRequest.ModuleInput modInput : savedAuthoringRequest.getModules()) {
                    if (modInput == null || modInput.getLessons() == null) continue;
                    for (CourseAuthoringRequest.LessonInput lesInput : modInput.getLessons()) {
                        if (lesInput == null) continue;
                        if (lesson.getWorkdriveFileId() != null
                                && lesson.getWorkdriveFileId().equals(lesInput.getWorkdriveFileId())
                                && lesInput.getWorkdriveFileName() != null) {
                            workdriveFileName = lesInput.getWorkdriveFileName();
                            break;
                        }
                        if (lesson.getTitle() != null
                                && lesson.getTitle().equals(lesInput.getTitle())
                                && lesInput.getWorkdriveFileName() != null) {
                            workdriveFileName = lesInput.getWorkdriveFileName();
                            break;
                        }
                    }
                    if (workdriveFileName != null) break;
                }
            }
            lessonData.put("workdriveFileName", workdriveFileName);
            lessonData.put("duration", lesson.getDuration());
            lessonData.put("summary", lesson.getSummary());
            lessonData.put("orderIndex", lesson.getOrderIndex());

            lessonResults.add(lessonData);
        }

        moduleData.put("lessons", lessonResults);

        // Restore this module's quiz, if one exists.
        Quiz moduleQuiz = courseQuizzes.stream()
                .filter(q ->
                        q.getType() == QuizType.MODULE
                        && q.getModule() != null
                        && module.getId().equals(
                                q.getModule().getId()
                        )
                )
                .findFirst()
                .orElse(null);

        moduleData.put(
                "quiz",
                moduleQuiz == null
                        ? null
                        : toAuthoringQuizMap(moduleQuiz)
        );

        moduleResults.add(moduleData);
    }

    response.put("modules", moduleResults);

    // Restore the course's final quiz and its questions.
    Quiz finalQuiz = courseQuizzes.stream()
            .filter(q -> q.getType() == QuizType.FINAL)
            .findFirst()
            .orElse(null);

    response.put(
            "finalQuiz",
            finalQuiz == null
                    ? null
                    : toAuthoringQuizMap(finalQuiz)
    );

    return response;
}

private java.util.Map<String, Object> toAuthoringQuizMap(Quiz quiz) {
    java.util.Map<String, Object> quizData =
            new java.util.LinkedHashMap<>();

    quizData.put("id", quiz.getId());
    quizData.put("quizId", quiz.getQuizId());
    quizData.put("title", quiz.getTitle());
    quizData.put("passingScore", quiz.getPassingScore());
    quizData.put("timeLimitMinutes", quiz.getTimeLimitMinutes());
    quizData.put("maxAttempts", quiz.getMaxAttempts());
    quizData.put("questionsPerAttempt", quiz.getQuestionsPerAttempt());
    quizData.put("randomizeQuestions", quiz.getRandomizeQuestions());
    quizData.put("randomizeOptions", quiz.getRandomizeOptions());

    List<java.util.Map<String, Object>> questionResults =
            new ArrayList<>();

    List<QuizQuestion> savedQuestions =
            questionRepository.findByQuiz_IdOrderByOrderIndexAsc(
                    quiz.getId()
            );

    for (QuizQuestion question : savedQuestions) {
        java.util.Map<String, Object> questionData =
                new java.util.LinkedHashMap<>();

        questionData.put("id", question.getId());
        questionData.put("questionId", question.getQuestionId());
        questionData.put("questionText", question.getQuestionText());
        questionData.put("questionType", question.getQuestionType());
        questionData.put("optionA", question.getOptionA());
        questionData.put("optionB", question.getOptionB());
        questionData.put("optionC", question.getOptionC());
        questionData.put("optionD", question.getOptionD());
        questionData.put("correctAnswer", question.getCorrectAnswer());
        questionData.put("explanation", question.getExplanation());
        questionData.put("orderIndex", question.getOrderIndex());

        questionResults.add(questionData);
    }

    quizData.put("questions", questionResults);

    return quizData;
}





    @Transactional

    public String createCourse(CourseAuthoringRequest request) {



        requireAuthoringPermission();

        validateRequest(request);



        boolean publish = Boolean.TRUE.equals(request.getPublish());
        boolean isFoundation = Boolean.TRUE.equals(request.getFoundation());

        // Explicit Course Ownership: Owning department MUST be resolved first and determines courseId prefix
        Department owningDepartment = null;
        if (request.getDepartmentId() != null) {
            owningDepartment = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Owning department with ID " + request.getDepartmentId() + " does not exist."));
        } else if (isFoundation) {
            owningDepartment = departmentRepository.findByNameIgnoreCase("General").orElse(null);
        }
        if (publish && owningDepartment == null) {
            throw new IllegalArgumentException("An explicit owning department is required before publishing a course.");
        }

        String courseId = request.getCourseId();

        if (courseId == null || courseId.isBlank() || courseId.startsWith("C-")) {
            String deptPrefix = "GEN";
            if (isFoundation) {
                deptPrefix = "GEN";
            } else if (owningDepartment != null) {
                deptPrefix = owningDepartment.getShortCode() != null && !owningDepartment.getShortCode().isBlank()
                        ? owningDepartment.getShortCode()
                        : owningDepartment.getName();
            }
            if (idSequenceService != null) {
                courseId = idSequenceService.generateCourseId(deptPrefix);
                while (courseRepository.existsByCourseId(courseId)) {
                    courseId = idSequenceService.generateCourseId(deptPrefix);
                }
            } else {
                courseId = "C-" + UUID.randomUUID()
                        .toString()
                        .substring(0, 8)
                        .toUpperCase(Locale.ROOT);
            }
        }

        if (courseRepository.existsByCourseId(courseId)) {
            throw new IllegalArgumentException(
                    "A course with ID " + courseId + " already exists.");
        }

        // Category is optional. Keep the legacy non-null category column populated
        // for compatibility with existing database records and queries.
        Category category = null;
        String categorySlug = request.getCategorySlug();

        if (categorySlug != null && !categorySlug.isBlank()) {
            category = categoryRepository.findBySlug(categorySlug.trim())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown category slug: " + categorySlug.trim()));
        }

        Course course = new Course();
        User currentUser = securityContextUtil.getCurrentUser();

        if (currentUser == null || currentUser.getId() == null) {
            throw new org.springframework.security.access.AccessDeniedException(
                "An authenticated user is required to create a course."
            );
        }

        course.setOwningDepartment(owningDepartment);

        course.setCreatedBy(currentUser);
        course.setDraft(!publish);
        course.setCourseId(courseId);
        course.setTitle(request.getTitle().trim());
        course.setCategory(category == null ? "Uncategorized" : category.getName());
        course.setCatalogCategory(category);
        String rawLevel = request.getPosition() != null ? request.getPosition() : request.getLevel();
        if (rawLevel != null && rawLevel.trim().toUpperCase().matches("L[0-4]")) {
            rawLevel = "P" + rawLevel.trim().toUpperCase().charAt(1);
        }
        course.setLevel(rawLevel);

        // Automatically calculate duration from lessons
        computeAndSetCourseDuration(course, request);

        if (publish) {
            course.setPublishedAt(java.time.LocalDateTime.now());
        }

        // Learning outcomes
        if (request.getLearningOutcomes() != null && !request.getLearningOutcomes().isEmpty()) {
            try {
                course.setLearningOutcomes(objectMapper.writeValueAsString(request.getLearningOutcomes()));
            } catch (Exception ignored) {}
        }

        course.setFoundation(isFoundation);
        boolean hasFinal = request.getFinalQuiz() != null;
        course.setCertificateEligible(!isFoundation && (hasFinal || Boolean.TRUE.equals(request.getCertificateEligible())));

        course.setBanner(request.getBanner());
        course.setDescription(request.getDescription());
        course.setPassingScore(
                request.getPassingScore() == null
                        ? defaultPassingScore()
                        : request.getPassingScore());
        course.setFoundation(Boolean.TRUE.equals(request.getFoundation()));
        course.setRating(0.0);
        course.setEnrolledCount(0);
        course.setActive(publish);
        course.setDraftPayload(serializeAuthoringRequest(request));
        course = courseRepository.saveAndFlush(course);
        linkThumbnailToCourse(course.getBanner(), course.getId());



        List<CourseAuthoringRequest.ModuleInput> moduleInputs =

                request.getModules() == null

                        ? List.of()

                        : request.getModules();



        for (int i = 0; i < moduleInputs.size(); i++) {

            saveModule(course, moduleInputs.get(i), i + 1);

        }



        if (!isFoundation && request.getFinalQuiz() != null) {

            saveQuiz(

                    course,

                    null,

                    request.getFinalQuiz(),

                    QuizType.FINAL,

                    "FINAL");

        } else if (Boolean.TRUE.equals(request.getPublish()) && !isFoundation) {

            throw new IllegalArgumentException(

                    "A final quiz is required before publishing a course.");

        }



        // Assignments and notifications are created only for published courses.

        if (Boolean.TRUE.equals(request.getPublish())) {

            assignPublishedCourse(course, request);

        } else {

            persistDraftDepartmentAssignments(course, request);

        }



        return courseId;

    }

    @Transactional
    public String updateDraft(String courseId, CourseAuthoringRequest request) {

        requireAuthoringPermission();
        validateRequest(request);

        User currentUser = securityContextUtil.getCurrentUser();

        if (currentUser == null || currentUser.getId() == null) {
            throw new AccessDeniedException("Authentication is required.");
        }

        if (request.getCourseId() != null
                && !request.getCourseId().isBlank()
                && !courseId.equals(request.getCourseId())) {
            throw new IllegalArgumentException("Course ID cannot be changed.");
        }

        Course course = courseRepository
                .findByCourseId(courseId)
                .or(() -> courseRepository.findDraftByCourseId(courseId))
                .or(() -> {
                    try {
                        return courseRepository.findById(Long.parseLong(courseId));
                    } catch (NumberFormatException e) {
                        return java.util.Optional.empty();
                    }
                })
                .orElseThrow(() -> new IllegalArgumentException(
                        "Draft not found: " + courseId));

        if (!Boolean.TRUE.equals(course.getDraft())) {
            throw new IllegalStateException(
                    "Published courses cannot be modified through draft endpoints.");
        }

        if (course.getCreatedBy() == null) {
            course.setCreatedBy(currentUser);
        }

        // Never modify a course that has learning history.
        if (enrollmentRepository.existsByCourse_Id(course.getId())) {
            throw new IllegalStateException(
                    "This draft has enrollment records and cannot be replaced.");
        }

        List<Quiz> existingQuizzes =
                quizRepository.findByCourseId(course.getId());

        for (Quiz quiz : existingQuizzes) {
            if (quizAttemptRepository.existsByQuizId(quiz.getId())) {
                throw new IllegalStateException(
                        "This draft has quiz attempts and cannot be replaced.");
            }
        }

        Category category = null;
        String categorySlug = request.getCategorySlug();

        if (categorySlug != null && !categorySlug.isBlank()) {
            category = categoryRepository.findBySlug(categorySlug.trim())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown category slug: " + categorySlug.trim()));
        }

        boolean publish = Boolean.TRUE.equals(request.getPublish());

        boolean isFoundation = Boolean.TRUE.equals(request.getFoundation());

        if (request.getDepartmentId() != null) {
            Department owningDepartment = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Owning department with ID " + request.getDepartmentId() + " does not exist."));
            course.setOwningDepartment(owningDepartment);
        } else if (isFoundation && course.getOwningDepartment() == null) {
            Department gen = departmentRepository.findByNameIgnoreCase("General").orElse(null);
            course.setOwningDepartment(gen);
        } else if (publish && course.getOwningDepartment() == null) {
            throw new IllegalArgumentException("An explicit owning department is required before publishing a course.");
        }

        course.setTitle(request.getTitle().trim());
        course.setCategory(category == null ? "Uncategorized" : category.getName());
        course.setCatalogCategory(category);
        String rawLevel = request.getPosition() != null ? request.getPosition() : request.getLevel();
        if (rawLevel != null && rawLevel.trim().toUpperCase().matches("L[0-4]")) {
            rawLevel = "P" + rawLevel.trim().toUpperCase().charAt(1);
        }
        course.setLevel(rawLevel);
        computeAndSetCourseDuration(course, request);
        course.setBanner(request.getBanner());
        course.setDescription(request.getDescription());
        course.setPassingScore(request.getPassingScore() == null
                ? defaultPassingScore() : request.getPassingScore());
        course.setFoundation(Boolean.TRUE.equals(request.getFoundation()));

        course.setDraft(!publish);
        course.setActive(publish);

        if (publish && course.getPublishedAt() == null) {
            course.setPublishedAt(java.time.LocalDateTime.now());
        }

        if (request.getLearningOutcomes() != null && !request.getLearningOutcomes().isEmpty()) {
            try {
                course.setLearningOutcomes(objectMapper.writeValueAsString(request.getLearningOutcomes()));
            } catch (Exception ignored) {}
        }

        course.setFoundation(isFoundation);
        boolean hasFinal = request.getFinalQuiz() != null;
        course.setCertificateEligible(!isFoundation && (hasFinal || Boolean.TRUE.equals(request.getCertificateEligible())));

        course.setDraftPayload(serializeAuthoringRequest(request));

        courseRepository.saveAndFlush(course);
        linkThumbnailToCourse(course.getBanner(), course.getId());

        // Delete old quizzes first; quiz questions use cascade deletion.
        quizRepository.deleteAll(existingQuizzes);
        quizRepository.flush();

        // Module -> Lesson uses CascadeType.ALL.
        List<Module> existingModules =
                moduleRepository.findByCourseIdOrderByOrderIndexAsc(course.getId());

        moduleRepository.deleteAll(existingModules);
        moduleRepository.flush();

        List<CourseAuthoringRequest.ModuleInput> moduleInputs =
                request.getModules() == null ? List.of() : request.getModules();

        for (int i = 0; i < moduleInputs.size(); i++) {
            saveModule(course, moduleInputs.get(i), i + 1);
        }

        if (!isFoundation && request.getFinalQuiz() != null) {
            saveQuiz(
                    course,
                    null,
                    request.getFinalQuiz(),
                    QuizType.FINAL,
                    "FINAL");
        } else if (publish && !isFoundation) {
            throw new IllegalArgumentException(
                    "A final quiz is required before publishing a course.");
        }

        if (publish) {
            assignPublishedCourse(course, request);
        } else {
            persistDraftDepartmentAssignments(course, request);
        }

        return courseId;
    }

    private void persistDraftDepartmentAssignments(Course course, CourseAuthoringRequest request) {
        if (courseDepartmentAssignmentRepository == null || course == null || course.getId() == null) {
            return;
        }
        try {
            courseDepartmentAssignmentRepository.deleteByCourse_Id(course.getId());
            courseDepartmentAssignmentRepository.flush();
        } catch (Exception ignored) {}

        List<CourseDepartmentAssignment> savedAssignments = new ArrayList<>();
        if (course.getDepartmentAssignments() != null) {
            course.getDepartmentAssignments().clear();
        }

        if (request.getDepartmentAssignments() != null && !request.getDepartmentAssignments().isEmpty()) {
            for (CourseAuthoringRequest.DepartmentAssignmentInput input : request.getDepartmentAssignments()) {
                if (input == null) continue;
                Department dept = resolveDepartment(input.getDepartmentId(), input.getDepartmentName());
                if (dept != null) {
                    EnrollmentType type = "RECOMMENDED".equalsIgnoreCase(input.getAssignmentType())
                            ? EnrollmentType.RECOMMENDED
                            : EnrollmentType.MANDATORY;
                    LocalDate dueDate = input.getDueDate() != null ? input.getDueDate() : request.getDueDate();
                    CourseDepartmentAssignment cda = new CourseDepartmentAssignment(course, dept, type, dueDate);
                    savedAssignments.add(courseDepartmentAssignmentRepository.save(cda));
                }
            }
        } else if (request.getTargetDepartments() != null && !request.getTargetDepartments().isEmpty()) {
            EnrollmentType fallbackType = Boolean.FALSE.equals(request.getMandatory())
                    ? EnrollmentType.RECOMMENDED
                    : EnrollmentType.MANDATORY;
            for (String deptName : request.getTargetDepartments()) {
                if (deptName != null && !deptName.isBlank()) {
                    Department dept = departmentRepository.findByNameIgnoreCase(deptName.trim()).orElse(null);
                    if (dept != null) {
                        CourseDepartmentAssignment cda = new CourseDepartmentAssignment(course, dept, fallbackType, request.getDueDate());
                        savedAssignments.add(courseDepartmentAssignmentRepository.save(cda));
                    }
                }
            }
        }
        course.setDepartmentAssignments(savedAssignments);
    }



    private String serializeAuthoringRequest(CourseAuthoringRequest request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to save course authoring data.", e);
        }
    }

    private void assignPublishedCourse(
            Course course,
            CourseAuthoringRequest request) {

        boolean hasDeptAssignments = request.getDepartmentAssignments() != null
                && !request.getDepartmentAssignments().isEmpty();

        List<String> targetDepartments = request.getTargetDepartments();
        List<Long> targetEmployeeIds = request.getTargetEmployeeIds();

        boolean hasLegacyDepartments = targetDepartments != null
                && targetDepartments.stream().anyMatch(name -> name != null && !name.isBlank());

        boolean hasRecommendedEmployees = targetEmployeeIds != null
                && targetEmployeeIds.stream().anyMatch(id -> id != null);

        if (!hasDeptAssignments && !hasLegacyDepartments && !hasRecommendedEmployees) {
            throw new IllegalArgumentException(
                "Select at least one target department or recommended employee before publishing."
            );
        }

        if (courseDepartmentAssignmentRepository != null) {
            try {
                courseDepartmentAssignmentRepository.deleteByCourse_Id(course.getId());
                courseDepartmentAssignmentRepository.flush();
            } catch (Exception ignored) {}
        }

        List<CourseDepartmentAssignment> savedAssignments = new ArrayList<>();
        if (course.getDepartmentAssignments() != null) {
            course.getDepartmentAssignments().clear();
        }

        if (hasDeptAssignments) {
            List<CourseAuthoringRequest.DepartmentAssignmentInput> mandatoryInputs = request.getDepartmentAssignments().stream()
                    .filter(a -> a != null && !"RECOMMENDED".equalsIgnoreCase(a.getAssignmentType()))
                    .toList();
            List<CourseAuthoringRequest.DepartmentAssignmentInput> recommendedInputs = request.getDepartmentAssignments().stream()
                    .filter(a -> a != null && "RECOMMENDED".equalsIgnoreCase(a.getAssignmentType()))
                    .toList();

            for (CourseAuthoringRequest.DepartmentAssignmentInput input : mandatoryInputs) {
                Department dept = resolveDepartment(input.getDepartmentId(), input.getDepartmentName());
                if (dept != null) {
                    LocalDate dueDate = input.getDueDate() != null ? input.getDueDate() : request.getDueDate();
                    CourseDepartmentAssignment cda = new CourseDepartmentAssignment(course, dept, EnrollmentType.MANDATORY, dueDate);
                    if (courseDepartmentAssignmentRepository != null) {
                        savedAssignments.add(courseDepartmentAssignmentRepository.save(cda));
                    }
                    if (enrollmentService != null) {
                        enrollmentService.assignCourseToDepartment(dept.getName(), course.getId(), course.getCourseId(), dueDate, "MANDATORY", course.getLevel());
                    }
                }
            }

            for (CourseAuthoringRequest.DepartmentAssignmentInput input : recommendedInputs) {
                Department dept = resolveDepartment(input.getDepartmentId(), input.getDepartmentName());
                if (dept != null) {
                    LocalDate dueDate = input.getDueDate() != null ? input.getDueDate() : request.getDueDate();
                    CourseDepartmentAssignment cda = new CourseDepartmentAssignment(course, dept, EnrollmentType.RECOMMENDED, dueDate);
                    if (courseDepartmentAssignmentRepository != null) {
                        savedAssignments.add(courseDepartmentAssignmentRepository.save(cda));
                    }
                    if (enrollmentService != null) {
                        enrollmentService.assignCourseToDepartment(dept.getName(), course.getId(), course.getCourseId(), dueDate, "RECOMMENDED", course.getLevel());
                    }
                }
            }
        } else if (hasLegacyDepartments) {
            EnrollmentType fallbackType = Boolean.FALSE.equals(request.getMandatory())
                    ? EnrollmentType.RECOMMENDED
                    : EnrollmentType.MANDATORY;

            for (String deptName : request.getTargetDepartments()) {
                if (deptName != null && !deptName.isBlank()) {
                    Department dept = departmentRepository.findByNameIgnoreCase(deptName.trim()).orElse(null);
                    if (dept != null) {
                        CourseDepartmentAssignment cda = new CourseDepartmentAssignment(course, dept, fallbackType, request.getDueDate());
                        if (courseDepartmentAssignmentRepository != null) {
                            savedAssignments.add(courseDepartmentAssignmentRepository.save(cda));
                        }
                    }
                }
            }
            if (fallbackType == EnrollmentType.MANDATORY) {
                assignMandatoryCourse(course, request);
            } else {
                for (String d : request.getTargetDepartments()) {
                    if (d != null && !d.isBlank()) {
                        if (enrollmentService != null) {
                            enrollmentService.assignCourseToDepartment(d.trim(), course.getId(), course.getCourseId(), request.getDueDate(), "RECOMMENDED", course.getLevel());
                        }
                    }
                }
            }
        }

        course.setDepartmentAssignments(savedAssignments);

        if (hasRecommendedEmployees) {
            assignRecommendedCourse(course, request);
        }

        if (notificationService != null) {
            User publisher = securityContextUtil.getCurrentUser();
            String publisherName = (publisher != null && publisher.getName() != null)
                    ? publisher.getName()
                    : "Course Author";

            notificationService.notifyHrAdmins(
                    "Course Published: " + course.getTitle(),
                    String.format(
                            "Course \"%s\" (%s) has been published by %s and assigned to targeted learners.",
                            course.getTitle(),
                            course.getCourseId(),
                            publisherName
                    ),
                    NotificationType.HR_ADMIN_ALERT,
                    NotificationPriority.NORMAL,
                    "COURSE_CODE",
                    course.getCourseId(),
                    "/courses",
                    "COURSE_PUBLISHED:" + course.getCourseId(),
                    java.util.Map.of(
                            "courseId", course.getCourseId(),
                            "courseTitle", course.getTitle(),
                            "publishedBy", publisherName
                    )
            );

            if (publisher != null && publisher.getRole() == Role.TRAINER) {
                notificationService.createNotificationSafely(
                        publisher.getId(),
                        "Course Published Successfully: " + course.getTitle(),
                        String.format(
                                "Your course \"%s\" (%s) is now live and assigned to learners.",
                                course.getTitle(),
                                course.getCourseId()
                        ),
                        NotificationType.TRAINER_ACTION_REQUIRED,
                        NotificationPriority.NORMAL,
                        "COURSE_CODE",
                        course.getCourseId(),
                        "/trainer",
                        "TRAINER_PUBLISHED:" + course.getCourseId() + ":" + publisher.getId(),
                        java.util.Map.of(
                                "courseId", course.getCourseId(),
                                "courseTitle", course.getTitle()
                        )
                );
            }
        }

    }





    private void assignMandatoryCourse(

            Course course,

            CourseAuthoringRequest request) {



        Set<String> selectedDepartments =

                request.getTargetDepartments() == null

                        ? new HashSet<>()

                        : request.getTargetDepartments().stream()

                                .filter(name -> name != null && !name.isBlank())

                                .map(name -> name.trim().toLowerCase(Locale.ROOT))

                                .collect(Collectors.toSet());



        if (selectedDepartments.isEmpty()) {

            throw new IllegalArgumentException(

                    "Select at least one department for mandatory training.");

        }



        List<Department> departments = departmentRepository.findAll();



        Set<String> validDepartments = departments.stream()

                .map(department ->

                        department.getName().trim().toLowerCase(Locale.ROOT))

                .collect(Collectors.toSet());



        if (!validDepartments.containsAll(selectedDepartments)) {

            throw new IllegalArgumentException(

                    "One or more selected departments are invalid.");

        }



        // Only selected departments receive mandatory training.

        // EnrollmentService handles descendants and prevents duplicate enrollments.

        for (Department department : departments) {

            String normalizedName =

                    department.getName().trim().toLowerCase(Locale.ROOT);



            if (selectedDepartments.contains(normalizedName)) {

                enrollmentService.assignCourseToDepartment(

                        department.getName(),

                        course.getId(),

                        course.getCourseId(),

                        request.getDueDate(),

                        "MANDATORY",
                        
                        course.getLevel());

            }

        }

    }



    private void assignRecommendedCourse(

            Course course,

            CourseAuthoringRequest request) {



        List<Long> targetEmployeeIds = request.getTargetEmployeeIds();



        if (targetEmployeeIds == null || targetEmployeeIds.isEmpty()) {

            throw new IllegalArgumentException(

                    "Select at least one employee for recommended training.");

        }



        // Recommended training is assigned only to the employees selected by HR

        // or the trainer. No department-wide assignments are created here.

        enrollmentService.assignCourseToEmployees(

                targetEmployeeIds,

                course.getId(),

                course.getCourseId(),

                request.getDueDate());

    }



    private void saveModule(

            Course course,

            CourseAuthoringRequest.ModuleInput input,

            int position) {



        if (input.getTitle() == null || input.getTitle().isBlank()) {

            throw new IllegalArgumentException(

                    "Every module must have a title.");

        }



        Module module = new Module();

        module.setModuleId(

                uniqueId("MOD", course.getCourseId(), position));

        module.setTitle(input.getTitle().trim());

        module.setOrderIndex(

                input.getOrderIndex() == null

                        ? position

                        : input.getOrderIndex());

        module.setCourse(course);



        module = moduleRepository.saveAndFlush(module);



        List<CourseAuthoringRequest.LessonInput> lessons =

                input.getLessons() == null

                        ? List.of()

                        : input.getLessons();



        for (int i = 0; i < lessons.size(); i++) {

            saveLesson(module, lessons.get(i), i + 1);

        }



        if (!Boolean.TRUE.equals(course.getFoundation()) && input.getQuiz() != null) {

            saveQuiz(

                    course,

                    module,

                    input.getQuiz(),

                    QuizType.MODULE,

                    "MOD" + position);

        }

    }



    private void saveLesson(

            Module module,

            CourseAuthoringRequest.LessonInput input,

            int position) {



        if (input.getTitle() == null || input.getTitle().isBlank()) {

            throw new IllegalArgumentException(

                    "Every lesson must have a title.");

        }



        Lesson lesson = new Lesson();

        lesson.setLessonId(

                uniqueId("LES", module.getModuleId(), position));

        lesson.setTitle(input.getTitle().trim());

        lesson.setType(

                input.getType() == null || input.getType().isBlank()

                        ? "VIDEO"

                        : input.getType().trim().toUpperCase(Locale.ROOT));

        lesson.setContentUrl(input.getContentUrl());

        lesson.setDuration(input.getDuration());

        lesson.setOrderIndex(

                input.getOrderIndex() == null

                        ? position

                        : input.getOrderIndex());

        lesson.setModule(module);

        lesson.setWorkdriveFileId(input.getWorkdriveFileId());
        lesson.setSummary(input.getSummary() != null && !input.getSummary().isBlank() ? input.getSummary().trim() : null);

        lessonRepository.save(lesson);

    }

    private void computeAndSetCourseDuration(Course course, CourseAuthoringRequest request) {
        int totalMinutes = 0;
        int validDurationCount = 0;

        if (request.getModules() != null) {
            for (CourseAuthoringRequest.ModuleInput mod : request.getModules()) {
                if (mod.getLessons() != null) {
                    for (CourseAuthoringRequest.LessonInput les : mod.getLessons()) {
                        Integer mins = parseDurationToMinutes(les.getDuration());
                        if (mins != null && mins > 0) {
                            totalMinutes += mins;
                            validDurationCount++;
                        }
                    }
                }
            }
        }

        if (totalMinutes > 0) {
            int hrs = totalMinutes / 60;
            int mins = totalMinutes % 60;
            String formatted;
            if (hrs > 0 && mins > 0) {
                formatted = hrs + " hr " + mins + " min";
            } else if (hrs > 0) {
                formatted = hrs + (hrs == 1 ? " hr" : " hrs");
            } else {
                formatted = mins + " min";
            }
            course.setDuration(formatted);
            course.setDurationHours((double) totalMinutes / 60.0);
        } else if (request.getDuration() != null && !request.getDuration().isBlank()) {
            String trimmed = request.getDuration().trim();
            String lower = trimmed.toLowerCase(Locale.ROOT);
            if (lower.equals("self-paced") || lower.equals("self paced")) {
                course.setDuration("Self-paced");
                course.setDurationHours(null);
            } else if (request.getDurationHours() != null && request.getDurationHours() > 0) {
                double hrs = request.getDurationHours();
                int totalMins = (int) Math.round(hrs * 60);
                int h = totalMins / 60;
                int m = totalMins % 60;
                String formatted = (h > 0 && m > 0) ? (h + (h == 1 ? " hour " : " hours ") + m + " min") : (h > 0 ? (h + (h == 1 ? " hour" : " hours")) : (m + " min"));
                course.setDuration(formatted);
                course.setDurationHours(hrs);
            } else {
                course.setDuration(trimmed);
                Double derivedHours = null;
                if (request.getDurationHours() != null && request.getDurationHours() > 0) {
                    derivedHours = request.getDurationHours().doubleValue();
                } else if (trimmed.matches("^\\d+$")) {
                    try {
                        int val = Integer.parseInt(trimmed);
                        derivedHours = (val <= 12) ? (double) val : ((double) val / 60.0);
                    } catch (Exception ignored) {}
                }
                course.setDurationHours(derivedHours);
            }
        } else if (request.getDurationHours() != null && request.getDurationHours() > 0) {
            double hrs = request.getDurationHours();
            int totalMins = (int) Math.round(hrs * 60);
            int h = totalMins / 60;
            int m = totalMins % 60;
            String formatted = (h > 0 && m > 0) ? (h + (h == 1 ? " hour " : " hours ") + m + " min") : (h > 0 ? (h + (h == 1 ? " hour" : " hours")) : (m + " min"));
            course.setDuration(formatted);
            course.setDurationHours(hrs);
        } else {
            // Missing duration: preserve as null, do not invent values
            course.setDuration(null);
            course.setDurationHours(null);
        }
    }

    private Integer parseDurationToMinutes(String durationStr) {
        if (durationStr == null || durationStr.isBlank()) {
            return null;
        }
        String clean = durationStr.trim().toLowerCase(Locale.ROOT);
        try {
            if (clean.contains(":")) {
                String[] parts = clean.split(":");
                if (parts.length == 2) {
                    int m = Integer.parseInt(parts[0].trim());
                    int s = Integer.parseInt(parts[1].trim());
                    return m + (s > 0 ? 1 : 0);
                } else if (parts.length == 3) {
                    int h = Integer.parseInt(parts[0].trim());
                    int m = Integer.parseInt(parts[1].trim());
                    int s = Integer.parseInt(parts[2].trim());
                    return h * 60 + m + (s > 0 ? 1 : 0);
                }
            }

            int mins = 0;
            boolean matched = false;
            java.util.regex.Matcher hrMatcher = java.util.regex.Pattern.compile("(\\d+)\\s*(?:hr|hour|h)").matcher(clean);
            if (hrMatcher.find()) {
                mins += Integer.parseInt(hrMatcher.group(1)) * 60;
                matched = true;
            }
            java.util.regex.Matcher minMatcher = java.util.regex.Pattern.compile("(\\d+)\\s*(?:min|minute|m)(?!.*hr)").matcher(clean);
            if (minMatcher.find()) {
                mins += Integer.parseInt(minMatcher.group(1));
                matched = true;
            }
            if (matched) {
                return mins;
            }

            if (clean.matches("\\d+")) {
                return Integer.parseInt(clean);
            }
        } catch (Exception ignored) {}
        return null;
    }



    private void saveQuiz(

            Course course,

            Module module,

            CourseAuthoringRequest.QuizInput input,

            QuizType type,

            String suffix) {



        List<CourseAuthoringRequest.QuestionInput> questions =

                input.getQuestions() == null

                        ? List.of()

                        : input.getQuestions();



        if (questions.isEmpty()) {

            throw new IllegalArgumentException(

                    "The " + suffix + " quiz must contain at least one question.");

        }



        Quiz quiz = new Quiz();

        quiz.setQuizId(uniqueId("QUIZ", course.getCourseId(), suffix));

        quiz.setTitle(

                input.getTitle() == null || input.getTitle().isBlank()

                        ? course.getTitle() + " Assessment"

                        : input.getTitle().trim());

        quiz.setType(type);

        quiz.setCourse(course);

        quiz.setModule(module);

        quiz.setPassingScore(

                input.getPassingScore() == null

                        ? defaultPassingScore()

                        : input.getPassingScore());

        quiz.setTimeLimitMinutes(input.getTimeLimitMinutes());

        // Hard attempt limit removed: retakes are governed solely by the 5-minute cooldown system
        quiz.setMaxAttempts(null);

        // Every quiz attempt evaluates all authored questions in the quiz
        quiz.setQuestionsPerAttempt(questions.size());

        quiz.setRandomizeQuestions(

                input.getRandomizeQuestions() == null

                        || input.getRandomizeQuestions());

        quiz.setRandomizeOptions(

                input.getRandomizeOptions() == null

                        || input.getRandomizeOptions());

        quiz.setActive(true);



        quiz = quizRepository.saveAndFlush(quiz);



        List<QuizQuestion> savedQuestions = new ArrayList<>();



        for (int i = 0; i < questions.size(); i++) {

            CourseAuthoringRequest.QuestionInput inputQuestion =

                    questions.get(i);



            if (inputQuestion.getQuestionText() == null

                    || inputQuestion.getQuestionText().isBlank()) {

                throw new IllegalArgumentException(

                        "Every quiz question must contain question text.");

            }



            if (inputQuestion.getCorrectAnswer() == null

                    || inputQuestion.getCorrectAnswer().isBlank()) {

                throw new IllegalArgumentException(

                        "Every quiz question must have a correct answer.");

            }



            QuizQuestion question = new QuizQuestion();

            question.setQuestionId(

                    uniqueId("Q", quiz.getQuizId(), i + 1));

            question.setQuestionText(

                    inputQuestion.getQuestionText().trim());

            String qType = inputQuestion.getQuestionType();
            if (qType == null || qType.isBlank()) {
                qType = "SINGLE_CHOICE";
            } else {
                qType = qType.trim().toUpperCase(Locale.ROOT);
            }
            question.setQuestionType(qType);

            question.setOptionA(inputQuestion.getOptionA());

            question.setOptionB(inputQuestion.getOptionB());

            question.setOptionC(inputQuestion.getOptionC());

            question.setOptionD(inputQuestion.getOptionD());

            String answer = inputQuestion.getCorrectAnswer().trim();
            if ("MULTI_SELECT".equals(qType) || answer.contains(",")) {
                Set<String> validOptions = Set.of("A", "B", "C", "D");
                List<String> sortedAnswers = Arrays.stream(answer.split("[,;\\s]+"))
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .map(s -> s.toUpperCase(Locale.ROOT))
                        .filter(validOptions::contains)
                        .distinct()
                        .sorted()
                        .toList();
                if ("MULTI_SELECT".equals(qType) && sortedAnswers.size() < 2) {
                    throw new IllegalArgumentException(
                            "Multi-select question must have at least two correct options.");
                }
                answer = String.join(",", sortedAnswers);
            }
            question.setCorrectAnswer(answer);

            question.setExplanation(inputQuestion.getExplanation());

            question.setOrderIndex(

                    inputQuestion.getOrderIndex() == null

                            ? i + 1

                            : inputQuestion.getOrderIndex());

            question.setQuiz(quiz);



            savedQuestions.add(question);

        }



        questionRepository.saveAll(savedQuestions);

    }



    private void validateRequest(CourseAuthoringRequest request) {



        if (request == null) {

            throw new IllegalArgumentException(

                    "Course request cannot be empty.");

        }



        if (request.getTitle() == null || request.getTitle().isBlank()) {

            throw new IllegalArgumentException(

                    "Course title is required.");

        }



        Integer passingScore = request.getPassingScore();



        if (passingScore != null

                && (passingScore < 0 || passingScore > 100)) {

            throw new IllegalArgumentException(

                    "Passing score must be between 0 and 100.");

        }



        if (Boolean.TRUE.equals(request.getPublish())

                && (request.getModules() == null

                || request.getModules().isEmpty())) {

            throw new IllegalArgumentException(

                    "Add at least one module before publishing.");

        }



        if (Boolean.TRUE.equals(request.getPublish())

                && request.getDueDate() != null

                && request.getDueDate().isBefore(LocalDate.now())) {

            throw new IllegalArgumentException(

                    "The course due date cannot be in the past.");

        }

        if (request.getDepartmentId() != null) {
            if (!departmentRepository.existsById(request.getDepartmentId())) {
                throw new IllegalArgumentException("Selected owning department with ID " + request.getDepartmentId() + " does not exist.");
            }
        }

        // Validate department assignments
        if (request.getDepartmentAssignments() != null && !request.getDepartmentAssignments().isEmpty()) {
            Set<Long> seenDeptIds = new HashSet<>();
            Set<String> seenDeptNames = new HashSet<>();
            for (CourseAuthoringRequest.DepartmentAssignmentInput input : request.getDepartmentAssignments()) {
                if (input == null) continue;
                Department dept = null;
                if (input.getDepartmentId() != null) {
                    dept = departmentRepository.findById(input.getDepartmentId())
                            .orElseThrow(() -> new IllegalArgumentException("Target department ID " + input.getDepartmentId() + " not found."));
                } else if (input.getDepartmentName() != null && !input.getDepartmentName().isBlank()) {
                    dept = departmentRepository.findByNameIgnoreCase(input.getDepartmentName().trim())
                            .orElseThrow(() -> new IllegalArgumentException("Target department '" + input.getDepartmentName() + "' not found."));
                } else {
                    throw new IllegalArgumentException("Each department assignment must specify a department ID or name.");
                }
                if (!seenDeptIds.add(dept.getId()) || !seenDeptNames.add(dept.getName().toLowerCase(Locale.ROOT))) {
                    throw new IllegalArgumentException("Duplicate department assignment detected for department: " + dept.getName());
                }
                String typeStr = input.getAssignmentType() != null ? input.getAssignmentType().trim().toUpperCase(Locale.ROOT) : "MANDATORY";
                if (!typeStr.equals("MANDATORY") && !typeStr.equals("RECOMMENDED")) {
                    throw new IllegalArgumentException("Invalid assignment type '" + input.getAssignmentType() + "'. Allowed values: MANDATORY, RECOMMENDED.");
                }
                if (input.getDueDate() != null && input.getDueDate().isBefore(LocalDate.now())) {
                    throw new IllegalArgumentException("The due date for " + dept.getName() + " cannot be in the past.");
                }
            }
        } else if (request.getTargetDepartments() != null && !request.getTargetDepartments().isEmpty()) {
            Set<String> seenNames = new HashSet<>();
            for (String dName : request.getTargetDepartments()) {
                if (dName != null && !dName.isBlank()) {
                    String clean = dName.trim().toLowerCase(Locale.ROOT);
                    if (!seenNames.add(clean)) {
                        throw new IllegalArgumentException("Duplicate department assignment detected for department: " + dName.trim());
                    }
                    if (!departmentRepository.existsByNameIgnoreCase(dName.trim())) {
                        throw new IllegalArgumentException("Target department '" + dName.trim() + "' does not exist.");
                    }
                }
            }
        }
    }

    private Department resolveDepartment(Long departmentId, String departmentName) {
        if (departmentId != null) {
            return departmentRepository.findById(departmentId).orElse(null);
        }
        if (departmentName != null && !departmentName.isBlank()) {
            return departmentRepository.findByNameIgnoreCase(departmentName.trim()).orElse(null);
        }
        return null;
    }



    private void requireAuthoringPermission() {
        User user = securityContextUtil.getCurrentUser();
        if (user != null && user.getRole() != null) {
            Role role = user.getRole();
            if (role == Role.HR_ADMIN || role == Role.TRAINER) {
                return;
            }
        }

        String role = securityContextUtil.getCurrentUserRole();
        String normalizedRole = role == null ? "" : role.trim();
        if (normalizedRole.regionMatches(true, 0, "ROLE_", 0, 5)) {
            normalizedRole = normalizedRole.substring(5);
        }

        if (!Role.HR_ADMIN.name().equalsIgnoreCase(normalizedRole)
                && !Role.TRAINER.name().equalsIgnoreCase(normalizedRole)) {

            throw new AccessDeniedException(
                    "Only authorized Trainers or HR Admins can create courses.");

        }

    }



    private String uniqueId(

            String prefix,

            String parentId,

            int position) {



        return uniqueId(prefix, parentId, String.valueOf(position));

    }



    private String uniqueId(

            String prefix,

            String parentId,

            String suffix) {



        String normalizedParent = parentId == null

                ? "NEW"

                : parentId.replaceAll("[^A-Za-z0-9-]", "-");



        return (prefix + "-" + normalizedParent + "-" + suffix + "-"

                + UUID.randomUUID().toString().substring(0, 6))

                .toUpperCase(Locale.ROOT);

    }

}