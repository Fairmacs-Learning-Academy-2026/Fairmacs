package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.LearnerActivityDTO;
import com.fairmacs.lms.entity.Certificate;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.Lesson;
import com.fairmacs.lms.entity.LessonProgress;
import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.QuizAttempt;
import com.fairmacs.lms.entity.QuizType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.QuizAttemptRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class TrainerReportService {

    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final CertificateRepository certificateRepository;
    private final SecurityContextUtil securityContextUtil;
    private final HrReportService hrReportService;

    public TrainerReportService(
            CourseRepository courseRepository,
            EnrollmentRepository enrollmentRepository,
            UserRepository userRepository,
            SecurityContextUtil securityContextUtil) {
        this(courseRepository, enrollmentRepository, userRepository, null, null, null, securityContextUtil, null);
    }

    public TrainerReportService(
            CourseRepository courseRepository,
            EnrollmentRepository enrollmentRepository,
            UserRepository userRepository,
            QuizAttemptRepository quizAttemptRepository,
            SecurityContextUtil securityContextUtil) {
        this(courseRepository, enrollmentRepository, userRepository, quizAttemptRepository, null, null, securityContextUtil, null);
    }

    public TrainerReportService(
            CourseRepository courseRepository,
            EnrollmentRepository enrollmentRepository,
            UserRepository userRepository,
            QuizAttemptRepository quizAttemptRepository,
            LessonProgressRepository lessonProgressRepository,
            CertificateRepository certificateRepository,
            SecurityContextUtil securityContextUtil) {
        this(courseRepository, enrollmentRepository, userRepository, quizAttemptRepository, lessonProgressRepository, certificateRepository, securityContextUtil, null);
    }

    @Autowired
    public TrainerReportService(
            CourseRepository courseRepository,
            EnrollmentRepository enrollmentRepository,
            UserRepository userRepository,
            @Autowired(required = false) QuizAttemptRepository quizAttemptRepository,
            @Autowired(required = false) LessonProgressRepository lessonProgressRepository,
            @Autowired(required = false) CertificateRepository certificateRepository,
            SecurityContextUtil securityContextUtil,
            @Autowired(required = false) HrReportService hrReportService) {
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.certificateRepository = certificateRepository;
        this.securityContextUtil = securityContextUtil;
        this.hrReportService = hrReportService != null
                ? hrReportService
                : new HrReportService(userRepository, enrollmentRepository, courseRepository, quizAttemptRepository);
    }

    public Map<String, Object> getTrainerInsights() {
        User trainer = securityContextUtil != null ? securityContextUtil.getCurrentUser() : null;

        List<Course> allCourses = courseRepository.findAll();
        List<Course> scopedCourses = resolveTrainerScopedCourses(trainer, allCourses);

        Set<Long> scopedCourseIds = scopedCourses.stream()
                .map(Course::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<Enrollment> enrollments = loadEnrollments().stream()
                .filter(e -> e.getUser() != null && e.getUser().getRole() == Role.EMPLOYEE)
                .filter(e -> e.getCourse() != null && scopedCourseIds.contains(e.getCourse().getId()))
                .filter(e -> e.getStatus() != EnrollmentStatus.REVOKED)
                .toList();

        List<User> scopedEmployees = hrReportService.extractEmployeesFromEnrollments(enrollments);

        List<QuizAttempt> completedAttempts = quizAttemptRepository != null
                ? loadCompletedQuizAttempts().stream()
                        .filter(qa -> qa.getCompletedAt() != null && qa.getScore() != null)
                        .filter(qa -> qa.getUser() != null && qa.getUser().getRole() == Role.EMPLOYEE)
                        .filter(qa -> qa.getQuiz() != null && qa.getQuiz().getCourse() != null
                                && scopedCourseIds.contains(qa.getQuiz().getCourse().getId()))
                        .toList()
                : List.of();

        Map<String, Object> response = new LinkedHashMap<>(
                hrReportService.buildScopedAnalyticsReport(
                        scopedCourses,
                        scopedEmployees,
                        enrollments,
                        completedAttempts,
                        false
                )
        );
        response.put("recentActivity", getRecentLearnerActivities(10));

        return response;
    }

    /**
     * Returns recent persisted learner activity ordered by actual event timestamp descending,
     * scoped strictly according to the authenticated user's role:
     * - EMPLOYEE: only their own learning events
     * - MANAGER: learning events of active employees in their authorized department
     * - TRAINER: learning events in courses within their authorized training scope
     * - HR_ADMIN: organization-wide learning events
     */
    public List<LearnerActivityDTO> getRecentLearnerActivities(int limit) {
        int safeLimit = limit <= 0 ? 10 : Math.min(limit, 50);
        User current = securityContextUtil != null ? securityContextUtil.getCurrentUser() : null;
        if (current == null || current.getRole() == null) {
            return List.of();
        }

        Set<Long> trainerScopedCourseIds = Set.of();
        if (current.getRole() == Role.TRAINER) {
            List<Course> allCourses = courseRepository != null ? courseRepository.findAll() : List.of();
            trainerScopedCourseIds = resolveTrainerScopedCourses(current, allCourses).stream()
                    .map(Course::getId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
        }

        Map<String, LearnerActivityDTO> dedupedEvents = new LinkedHashMap<>();
        Map<Long, LocalDateTime> earliestLessonActivityByEnrollment = new HashMap<>();

        // 1. Lesson completions & earliest actual lesson start timestamps (never treating mere page views as completions)
        if (lessonProgressRepository != null) {
            List<LessonProgress> progressList = loadLessonProgress();
            for (LessonProgress lp : progressList) {
                if (lp == null || lp.getEnrollment() == null) {
                    continue;
                }
                Enrollment enrollment = lp.getEnrollment();
                if (enrollment.getStatus() == EnrollmentStatus.REVOKED) {
                    continue;
                }
                User learner = enrollment.getUser();
                Course course = enrollment.getCourse();
                if (!isRecordVisibleToUser(learner, course, current, trainerScopedCourseIds)) {
                    continue;
                }

                // Track earliest वास्तविक lesson engagement timestamp for accurate COURSE_STARTED event
                boolean hasRealEngagement = Boolean.TRUE.equals(lp.getCompleted())
                        || (lp.getCompletionPercent() != null && lp.getCompletionPercent() > 0)
                        || (lp.getWatchedSeconds() != null && lp.getWatchedSeconds() > 0);
                if (hasRealEngagement && enrollment.getId() != null && lp.getCreatedAt() != null) {
                    earliestLessonActivityByEnrollment.merge(
                            enrollment.getId(),
                            lp.getCreatedAt(),
                            (existing, candidate) -> candidate.isBefore(existing) ? candidate : existing
                    );
                }

                // Completed lesson activity
                if (Boolean.TRUE.equals(lp.getCompleted())) {
                    LocalDateTime completedTs = lp.getCompletedAt() != null ? lp.getCompletedAt() : lp.getUpdatedAt();
                    if (completedTs != null) {
                        Lesson lesson = lp.getLesson();
                        Long lessonId = lesson != null && lesson.getId() != null ? lesson.getId() : lp.getId();
                        String lessonTitle = (lesson != null && lesson.getTitle() != null && !lesson.getTitle().isBlank())
                                ? lesson.getTitle().trim()
                                : "Lesson";
                        String dedupKey = "LESSON_COMPLETED:ENR:" + enrollment.getId() + ":LES:" + lessonId;
                        dedupedEvents.putIfAbsent(
                                dedupKey,
                                new LearnerActivityDTO(
                                        dedupKey,
                                        safeEmployeeName(learner),
                                        safeDepartment(learner),
                                        "LESSON_COMPLETED",
                                        "Completed lesson: " + lessonTitle,
                                        course.getCourseId(),
                                        course.getTitle(),
                                        completedTs
                                )
                        );
                    }
                }
            }
        }

        // 2. Course started & Course completed from Enrollment records
        if (enrollmentRepository != null) {
            List<Enrollment> enrollments = loadEnrollments();
            for (Enrollment e : enrollments) {
                if (e == null || e.getStatus() == EnrollmentStatus.REVOKED) {
                    continue;
                }
                User learner = e.getUser();
                Course course = e.getCourse();
                if (!isRecordVisibleToUser(learner, course, current, trainerScopedCourseIds)) {
                    continue;
                }

                boolean hasStartedCourse = e.getStatus() == EnrollmentStatus.IN_PROGRESS
                        || e.getStatus() == EnrollmentStatus.COMPLETED
                        || (e.getProgressPercent() != null && e.getProgressPercent() > 0)
                        || (e.getId() != null && earliestLessonActivityByEnrollment.containsKey(e.getId()));

                if (hasStartedCourse) {
                    LocalDateTime startedTs = e.getId() != null
                            ? earliestLessonActivityByEnrollment.getOrDefault(e.getId(), e.getEnrolledAt())
                            : e.getEnrolledAt();
                    if (startedTs != null) {
                        String startKey = "COURSE_STARTED:U:" + learner.getId() + ":C:" + course.getId();
                        dedupedEvents.putIfAbsent(
                                startKey,
                                new LearnerActivityDTO(
                                        startKey,
                                        safeEmployeeName(learner),
                                        safeDepartment(learner),
                                        "COURSE_STARTED",
                                        "Started course",
                                        course.getCourseId(),
                                        course.getTitle(),
                                        startedTs
                                )
                        );
                    }
                }

                if (e.getStatus() == EnrollmentStatus.COMPLETED && e.getCompletedDate() != null) {
                    String completedKey = "COURSE_COMPLETED:U:" + learner.getId() + ":C:" + course.getId();
                    dedupedEvents.putIfAbsent(
                            completedKey,
                            new LearnerActivityDTO(
                                    completedKey,
                                    safeEmployeeName(learner),
                                    safeDepartment(learner),
                                    "COURSE_COMPLETED",
                                    "Completed course",
                                    course.getCourseId(),
                                    course.getTitle(),
                                    e.getCompletedDate()
                            )
                    );
                }
            }
        }

        // 3. Module quiz completions & Final assessment passes from QuizAttempt records
        if (quizAttemptRepository != null) {
            List<QuizAttempt> attempts = loadCompletedQuizAttempts();
            for (QuizAttempt qa : attempts) {
                if (qa == null || qa.getCompletedAt() == null || qa.getQuiz() == null) {
                    continue;
                }
                Quiz quiz = qa.getQuiz();
                Course course = quiz.getCourse();
                User learner = qa.getUser();
                if (!isRecordVisibleToUser(learner, course, current, trainerScopedCourseIds)) {
                    continue;
                }

                String scoreText = qa.getScore() != null ? " (" + qa.getScore() + "%)" : "";
                String attemptKeySuffix = qa.getId() != null
                        ? String.valueOf(qa.getId())
                        : (qa.getAttemptId() != null ? qa.getAttemptId() : String.valueOf(qa.getCompletedAt()));

                if (quiz.getType() == QuizType.MODULE) {
                    String quizTitle = (quiz.getTitle() != null && !quiz.getTitle().isBlank())
                            ? quiz.getTitle().trim()
                            : "Module Quiz";
                    String dedupKey = "MODULE_QUIZ_COMPLETED:QA:" + attemptKeySuffix;
                    dedupedEvents.putIfAbsent(
                            dedupKey,
                            new LearnerActivityDTO(
                                    dedupKey,
                                    safeEmployeeName(learner),
                                    safeDepartment(learner),
                                    "MODULE_QUIZ_COMPLETED",
                                    "Completed module quiz: " + quizTitle + scoreText,
                                    course.getCourseId(),
                                    course.getTitle(),
                                    qa.getCompletedAt()
                            )
                    );
                } else if (quiz.getType() == QuizType.FINAL && Boolean.TRUE.equals(qa.getPassed())) {
                    String dedupKey = "FINAL_ASSESSMENT_PASSED:U:" + learner.getId() + ":Q:" + quiz.getId();
                    LearnerActivityDTO existing = dedupedEvents.get(dedupKey);
                    if (existing == null || qa.getCompletedAt().isAfter(existing.getTimestamp())) {
                        dedupedEvents.put(
                                dedupKey,
                                new LearnerActivityDTO(
                                        dedupKey,
                                        safeEmployeeName(learner),
                                        safeDepartment(learner),
                                        "FINAL_ASSESSMENT_PASSED",
                                        "Passed final assessment" + scoreText,
                                        course.getCourseId(),
                                        course.getTitle(),
                                        qa.getCompletedAt()
                                )
                        );
                    }
                }
            }
        }

        // 4. Certificates issued from Certificate records
        if (certificateRepository != null) {
            List<Certificate> certificates = loadCertificates();
            for (Certificate cert : certificates) {
                if (cert == null || cert.getIssuedAt() == null) {
                    continue;
                }
                User learner = cert.getUser();
                Course course = cert.getCourse();
                if (!isRecordVisibleToUser(learner, course, current, trainerScopedCourseIds)) {
                    continue;
                }

                String certCode = (cert.getCertificateId() != null && !cert.getCertificateId().isBlank())
                        ? cert.getCertificateId().trim()
                        : null;
                String dedupKey = "CERTIFICATE_ISSUED:U:" + learner.getId() + ":C:" + course.getId();
                String description = certCode != null
                        ? "Certificate issued (" + certCode + ")"
                        : "Certificate issued";

                dedupedEvents.putIfAbsent(
                        dedupKey,
                        new LearnerActivityDTO(
                                dedupKey,
                                safeEmployeeName(learner),
                                safeDepartment(learner),
                                "CERTIFICATE_ISSUED",
                                description,
                                course.getCourseId(),
                                course.getTitle(),
                                cert.getIssuedAt()
                        )
                );
            }
        }

        return dedupedEvents.values().stream()
                .filter(item -> item.getTimestamp() != null)
                .sorted(Comparator
                        .comparing(LearnerActivityDTO::getTimestamp, Comparator.reverseOrder())
                        .thenComparing(LearnerActivityDTO::getActivityId))
                .limit(safeLimit)
                .collect(Collectors.toList());
    }

    private List<Course> resolveTrainerScopedCourses(User trainer, List<Course> allCourses) {
        if (allCourses == null || allCourses.isEmpty()) {
            return List.of();
        }
        if (trainer != null && trainer.getRole() == Role.TRAINER && trainer.getId() != null) {
            boolean hasAuthored = allCourses.stream()
                    .anyMatch(c -> c != null && c.getCreatedBy() != null && Objects.equals(c.getCreatedBy().getId(), trainer.getId()));
            if (hasAuthored) {
                return allCourses.stream()
                        .filter(c -> c != null && c.getCreatedBy() != null && Objects.equals(c.getCreatedBy().getId(), trainer.getId()))
                        .toList();
            }
        }
        return allCourses.stream().filter(Objects::nonNull).toList();
    }

    private boolean isRecordVisibleToUser(
            User learner,
            Course course,
            User current,
            Set<Long> trainerScopedCourseIds
    ) {
        if (learner == null || course == null || current == null || current.getRole() == null) {
            return false;
        }
        if (learner.getStatus() != null && learner.getStatus() != UserStatus.ACTIVE) {
            return false;
        }
        if (Boolean.FALSE.equals(course.getActive()) && course.getPublishedAt() == null) {
            return false;
        }

        Role role = current.getRole();
        if (role == Role.EMPLOYEE) {
            return current.getId() != null && Objects.equals(learner.getId(), current.getId());
        }
        if (learner.getRole() != null && learner.getRole() != Role.EMPLOYEE) {
            return false;
        }
        if (role == Role.MANAGER) {
            return departmentMatches(learner.getDepartment(), current.getDepartment());
        }
        if (role == Role.TRAINER) {
            if (trainerScopedCourseIds == null || trainerScopedCourseIds.isEmpty()) {
                return true;
            }
            return course.getId() != null && trainerScopedCourseIds.contains(course.getId());
        }
        return role == Role.HR_ADMIN;
    }

    private boolean departmentMatches(String deptA, String deptB) {
        if (deptA == null || deptA.isBlank() || deptB == null || deptB.isBlank()) {
            return false;
        }
        return canonicalizeDepartment(deptA).equalsIgnoreCase(canonicalizeDepartment(deptB));
    }

    private String canonicalizeDepartment(String dept) {
        String trimmed = dept == null ? "" : dept.trim();
        if (trimmed.equalsIgnoreCase("Human Resource")
                || trimmed.equalsIgnoreCase("Human Resources")
                || trimmed.equalsIgnoreCase("People Operations")
                || trimmed.equalsIgnoreCase("HR")) {
            return "People Operations";
        }
        if (trimmed.equalsIgnoreCase("General")
                || trimmed.equalsIgnoreCase("General / Common")
                || trimmed.equalsIgnoreCase("All Departments")) {
            return "General";
        }
        return trimmed;
    }

    private String safeEmployeeName(User learner) {
        if (learner == null || learner.getName() == null || learner.getName().isBlank()) {
            return "Employee";
        }
        return learner.getName().trim();
    }

    private String safeDepartment(User learner) {
        if (learner == null || learner.getDepartment() == null || learner.getDepartment().isBlank()) {
            return "General";
        }
        return learner.getDepartment().trim();
    }

    private List<Enrollment> loadEnrollments() {
        if (enrollmentRepository == null) {
            return List.of();
        }
        List<Enrollment> fetched = enrollmentRepository.findAllActiveOrganizationEnrollments();
        if (fetched != null && !fetched.isEmpty()) {
            return fetched;
        }
        List<Enrollment> fallback = enrollmentRepository.findAll();
        return fallback != null ? fallback : List.of();
    }

    private List<LessonProgress> loadLessonProgress() {
        if (lessonProgressRepository == null) {
            return List.of();
        }
        List<LessonProgress> fetched = lessonProgressRepository.findAllActiveLessonProgressWithDetails();
        if (fetched != null && !fetched.isEmpty()) {
            return fetched;
        }
        List<LessonProgress> fallback = lessonProgressRepository.findAll();
        return fallback != null ? fallback : List.of();
    }

    private List<QuizAttempt> loadCompletedQuizAttempts() {
        if (quizAttemptRepository == null) {
            return List.of();
        }
        List<QuizAttempt> fetched = quizAttemptRepository.findCompletedAttemptsWithDetails();
        if (fetched != null && !fetched.isEmpty()) {
            return fetched;
        }
        List<QuizAttempt> fallback = quizAttemptRepository.findAll();
        return fallback != null ? fallback : List.of();
    }

    private List<Certificate> loadCertificates() {
        if (certificateRepository == null) {
            return List.of();
        }
        List<Certificate> fetched = certificateRepository.findAllActiveCertificatesWithDetails();
        if (fetched != null && !fetched.isEmpty()) {
            return fetched;
        }
        List<Certificate> fallback = certificateRepository.findAll();
        return fallback != null ? fallback : List.of();
    }
}
