package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.LearningDashboardDTO;
import com.fairmacs.lms.entity.Certificate;
import com.fairmacs.lms.entity.Course;
import com.fairmacs.lms.entity.CourseDepartmentAssignment;
import com.fairmacs.lms.entity.Department;
import com.fairmacs.lms.entity.Enrollment;
import com.fairmacs.lms.entity.EnrollmentStatus;
import com.fairmacs.lms.entity.EnrollmentType;
import com.fairmacs.lms.entity.Lesson;
import com.fairmacs.lms.entity.LessonProgress;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.entity.Quiz;
import com.fairmacs.lms.entity.QuizAttempt;
import com.fairmacs.lms.entity.QuizProgress;
import com.fairmacs.lms.entity.QuizQuestion;
import com.fairmacs.lms.entity.QuizType;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.entity.UserStatus;
import com.fairmacs.lms.repository.CategoryRepository;
import com.fairmacs.lms.repository.CertificateRepository;
import com.fairmacs.lms.repository.CourseDepartmentAssignmentRepository;
import com.fairmacs.lms.repository.CourseRepository;
import com.fairmacs.lms.repository.DepartmentRepository;
import com.fairmacs.lms.repository.EnrollmentRepository;
import com.fairmacs.lms.repository.LearningPathRepository;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.LessonRepository;
import com.fairmacs.lms.repository.ModuleRepository;
import com.fairmacs.lms.repository.QuizAttemptRepository;
import com.fairmacs.lms.repository.QuizProgressRepository;
import com.fairmacs.lms.repository.QuizQuestionRepository;
import com.fairmacs.lms.repository.QuizRepository;
import com.fairmacs.lms.repository.UserRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Phase 5 Step 4 - Learning Engine Integration & Automated Onboarding Enrollment Verification Suite.
 */
class Phase5Step4LearningEngineIntegrationTest {

    private UserRepository userRepository;
    private DepartmentRepository departmentRepository;
    private CourseRepository courseRepository;
    private CourseDepartmentAssignmentRepository cdaRepository;
    private EnrollmentRepository enrollmentRepository;
    private ModuleRepository moduleRepository;
    private LessonRepository lessonRepository;
    private LessonProgressRepository lessonProgressRepository;
    private QuizRepository quizRepository;
    private QuizQuestionRepository quizQuestionRepository;
    private QuizProgressRepository quizProgressRepository;
    private QuizAttemptRepository quizAttemptRepository;
    private CertificateRepository certificateRepository;
    private CategoryRepository categoryRepository;
    private LearningPathRepository learningPathRepository;

    private SecurityContextUtil securityContextUtil;
    private NotificationService notificationService;
    private CertificateService certificateService;
    private CourseMapper courseMapper;
    private RecommendationService recommendationService;
    private CatalogService catalogService;
    private EnrollmentService enrollmentService;
    private HrAdminService hrAdminService;
    private EmployeeExcelImportService excelImportService;
    private LessonProgressService lessonProgressService;
    private QuizService quizService;
    private PasswordEncoder passwordEncoder;

    // In-memory state stores for realistic end-to-end stateful testing
    private final Map<Long, User> users = new LinkedHashMap<>();
    private final Map<Long, Department> departments = new LinkedHashMap<>();
    private final Map<Long, Course> courses = new LinkedHashMap<>();
    private final List<CourseDepartmentAssignment> assignments = new ArrayList<>();
    private final Map<Long, Enrollment> enrollments = new LinkedHashMap<>();
    private final Map<Long, Module> modules = new LinkedHashMap<>();
    private final Map<Long, Lesson> lessons = new LinkedHashMap<>();
    private final Map<String, LessonProgress> lessonProgresses = new LinkedHashMap<>();
    private final Map<Long, Quiz> quizzes = new LinkedHashMap<>();
    private final Map<Long, List<QuizQuestion>> quizQuestions = new LinkedHashMap<>();
    private final Map<String, QuizProgress> quizProgresses = new LinkedHashMap<>();
    private final Map<String, QuizAttempt> quizAttempts = new LinkedHashMap<>();
    private final Map<Long, Certificate> certificates = new LinkedHashMap<>();

    private final AtomicLong idSeq = new AtomicLong(100L);
    private User activeSessionUser;

    @BeforeEach
    void setUp() {
        users.clear();
        departments.clear();
        courses.clear();
        assignments.clear();
        enrollments.clear();
        modules.clear();
        lessons.clear();
        lessonProgresses.clear();
        quizzes.clear();
        quizQuestions.clear();
        quizProgresses.clear();
        quizAttempts.clear();
        certificates.clear();

        userRepository = mock(UserRepository.class);
        departmentRepository = mock(DepartmentRepository.class);
        courseRepository = mock(CourseRepository.class);
        cdaRepository = mock(CourseDepartmentAssignmentRepository.class);
        enrollmentRepository = mock(EnrollmentRepository.class);
        moduleRepository = mock(ModuleRepository.class);
        lessonRepository = mock(LessonRepository.class);
        lessonProgressRepository = mock(LessonProgressRepository.class);
        quizRepository = mock(QuizRepository.class);
        quizQuestionRepository = mock(QuizQuestionRepository.class);
        quizProgressRepository = mock(QuizProgressRepository.class);
        quizAttemptRepository = mock(QuizAttemptRepository.class);
        certificateRepository = mock(CertificateRepository.class);
        categoryRepository = mock(CategoryRepository.class);
        learningPathRepository = mock(LearningPathRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();

        securityContextUtil = new SecurityContextUtil(userRepository) {
            @Override
            public User getCurrentUser() {
                return activeSessionUser;
            }
            @Override
            public Long getCurrentUserId() {
                return activeSessionUser != null ? activeSessionUser.getId() : null;
            }
            @Override
            public String getCurrentUserRole() {
                return activeSessionUser != null && activeSessionUser.getRole() != null
                        ? activeSessionUser.getRole().name()
                        : null;
            }
        };

        notificationService = new NotificationService(null, userRepository) {
            @Override
            public com.fairmacs.lms.entity.Notification createNotificationSafely(
                    Long userId,
                    String title,
                    String message,
                    String type,
                    String priority,
                    String relatedEntityType,
                    String relatedEntityId,
                    String actionUrl,
                    String deduplicationKey,
                    Map<String, Object> metadata) {
                return null;
            }
            @Override
            public int notifyDepartmentManagers(
                    String departmentName,
                    String title,
                    String message,
                    String type,
                    String priority,
                    String relatedEntityType,
                    String relatedEntityId,
                    String actionUrl,
                    String deduplicationKeyPrefix,
                    Map<String, Object> metadata) {
                return 0;
            }
        };

        certificateService = new CertificateService(
                certificateRepository,
                userRepository,
                courseRepository,
                securityContextUtil,
                notificationService,
                null
        ) {
            @Override
            public Certificate createCertificate(Long uId, Long cId, Integer score) {
                Certificate existing = certificates.values().stream()
                        .filter(cert -> Objects.equals(cert.getUser().getId(), uId)
                                && Objects.equals(cert.getCourse().getId(), cId))
                        .findFirst()
                        .orElse(null);
                if (existing != null) {
                    return existing;
                }
                Certificate cert = new Certificate();
                cert.setId(idSeq.incrementAndGet());
                cert.setCertificateId("CERT-" + uId + "-" + cId);
                cert.setUser(users.get(uId));
                cert.setCourse(courses.get(cId));
                cert.setScore(score);
                certificates.put(cert.getId(), cert);
                return cert;
            }

            @Override
            public Optional<Certificate> getCertificateByUserIdAndCourseId(Long uId, Long cId) {
                return certificates.values().stream()
                        .filter(cert -> Objects.equals(cert.getUser().getId(), uId)
                                && Objects.equals(cert.getCourse().getId(), cId))
                        .findFirst();
            }

            @Override
            public CertificateDTO toDTO(Certificate cert) {
                CertificateDTO dto = new CertificateDTO();
                dto.setCertificateId(cert.getCertificateId());
                dto.setScore(cert.getScore());
                return dto;
            }

            @Override
            public CertificateDTO verifyCertificate(String certId) {
                return certificates.values().stream()
                        .filter(c -> certId.equals(c.getCertificateId()))
                        .findFirst()
                        .map(this::toDTO)
                        .orElse(null);
            }
        };

        recommendationService = new RecommendationService(
                mock(com.fairmacs.lms.repository.RecommendationRuleRepository.class),
                courseRepository,
                cdaRepository
        );

        // Seed standard departments
        seedDepartment(1L, "General", null);
        Department opsDept = seedDepartment(2L, "Operations", null);
        seedDepartment(3L, "Sales", null);
        seedDepartment(4L, "People Operations", null);
        seedDepartment(5L, "Accounts", null);
        seedDepartment(6L, "Information Technology", null);
        seedDepartment(7L, "Field Operations", opsDept); // Child department of Operations

        // Wire stateful repository mocks
        when(departmentRepository.findAll()).thenAnswer(inv -> new ArrayList<>(departments.values()));
        when(departmentRepository.findByNameIgnoreCase(anyString())).thenAnswer(inv -> {
            String name = inv.getArgument(0);
            return departments.values().stream()
                    .filter(d -> d.getName() != null && d.getName().equalsIgnoreCase(name))
                    .findFirst();
        });

        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            if (u.getId() == null) {
                u.setId(idSeq.incrementAndGet());
            }
            users.put(u.getId(), u);
            return u;
        });
        when(userRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(users.get(inv.getArgument(0))));
        when(userRepository.findAll()).thenAnswer(inv -> new ArrayList<>(users.values()));
        when(userRepository.findByEmployeeId(anyString())).thenAnswer(inv -> {
            String empId = inv.getArgument(0);
            return users.values().stream()
                    .filter(u -> u.getEmployeeId() != null && u.getEmployeeId().equalsIgnoreCase(empId))
                    .findFirst();
        });
        when(userRepository.existsByEmployeeId(anyString())).thenAnswer(inv -> {
            String empId = inv.getArgument(0);
            return users.values().stream()
                    .anyMatch(u -> u.getEmployeeId() != null && u.getEmployeeId().equalsIgnoreCase(empId));
        });
        when(userRepository.existsByEmail(anyString())).thenAnswer(inv -> {
            String email = inv.getArgument(0);
            return users.values().stream()
                    .anyMatch(u -> u.getEmail() != null && u.getEmail().equalsIgnoreCase(email));
        });
        when(userRepository.findByDepartmentIgnoreCase(anyString())).thenAnswer(inv -> {
            String dept = inv.getArgument(0);
            return users.values().stream()
                    .filter(u -> u.getDepartment() != null && u.getDepartment().equalsIgnoreCase(dept))
                    .toList();
        });

        when(courseRepository.save(any(Course.class))).thenAnswer(inv -> {
            Course c = inv.getArgument(0);
            if (c.getId() == null) {
                c.setId(idSeq.incrementAndGet());
            }
            courses.put(c.getId(), c);
            return c;
        });
        when(courseRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(courses.get(inv.getArgument(0))));
        when(courseRepository.findByCourseId(anyString())).thenAnswer(inv -> {
            String code = inv.getArgument(0);
            return courses.values().stream()
                    .filter(c -> c.getCourseId() != null && c.getCourseId().equalsIgnoreCase(code))
                    .findFirst();
        });
        when(courseRepository.findDetailByCourseId(anyString())).thenAnswer(inv -> {
            String code = inv.getArgument(0);
            return courses.values().stream()
                    .filter(c -> c.getCourseId() != null && c.getCourseId().equalsIgnoreCase(code))
                    .findFirst();
        });
        when(courseRepository.findAll()).thenAnswer(inv -> new ArrayList<>(courses.values()));
        when(courseRepository.findActiveWithCategory()).thenReturn(List.of());

        when(cdaRepository.findAll()).thenAnswer(inv -> new ArrayList<>(assignments));
        when(cdaRepository.findByCourse_Id(anyLong())).thenAnswer(inv -> {
            Long cId = inv.getArgument(0);
            return assignments.stream()
                    .filter(a -> a.getCourse() != null && Objects.equals(a.getCourse().getId(), cId))
                    .toList();
        });
        when(cdaRepository.save(any(CourseDepartmentAssignment.class))).thenAnswer(inv -> {
            CourseDepartmentAssignment cda = inv.getArgument(0);
            if (!assignments.contains(cda)) {
                assignments.add(cda);
            }
            return cda;
        });

        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> {
            Enrollment e = inv.getArgument(0);
            if (e.getId() == null) {
                e.setId(idSeq.incrementAndGet());
            }
            enrollments.put(e.getId(), e);
            return e;
        });
        when(enrollmentRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(enrollments.get(inv.getArgument(0))));
        when(enrollmentRepository.findByIdWithUserAndCourse(anyLong())).thenAnswer(inv -> Optional.ofNullable(enrollments.get(inv.getArgument(0))));
        when(enrollmentRepository.findByUserIdAndCourseId(anyLong(), anyLong())).thenAnswer(inv -> {
            Long uId = inv.getArgument(0);
            Long cId = inv.getArgument(1);
            return enrollments.values().stream()
                    .filter(e -> e.getUser() != null && Objects.equals(e.getUser().getId(), uId)
                            && e.getCourse() != null && Objects.equals(e.getCourse().getId(), cId))
                    .findFirst();
        });
        when(enrollmentRepository.findByUserIdWithCourse(anyLong())).thenAnswer(inv -> {
            Long uId = inv.getArgument(0);
            return enrollments.values().stream()
                    .filter(e -> e.getUser() != null && Objects.equals(e.getUser().getId(), uId))
                    .toList();
        });

        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(anyLong())).thenAnswer(inv -> {
            Long cId = inv.getArgument(0);
            return modules.values().stream()
                    .filter(m -> m.getCourse() != null && Objects.equals(m.getCourse().getId(), cId))
                    .toList();
        });

        when(lessonRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(lessons.get(inv.getArgument(0))));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(anyLong())).thenAnswer(inv -> {
            Long mId = inv.getArgument(0);
            return lessons.values().stream()
                    .filter(l -> l.getModule() != null && Objects.equals(l.getModule().getId(), mId))
                    .toList();
        });
        when(lessonRepository.countByModuleCourseId(anyLong())).thenAnswer(inv -> {
            Long cId = inv.getArgument(0);
            return lessons.values().stream()
                    .filter(l -> l.getModule() != null && l.getModule().getCourse() != null
                            && Objects.equals(l.getModule().getCourse().getId(), cId))
                    .count();
        });

        when(lessonProgressRepository.save(any(LessonProgress.class))).thenAnswer(inv -> {
            LessonProgress lp = inv.getArgument(0);
            if (lp.getId() == null) {
                lp.setId(idSeq.incrementAndGet());
            }
            String key = lp.getEnrollment().getId() + ":" + lp.getLesson().getId();
            lessonProgresses.put(key, lp);
            return lp;
        });
        when(lessonProgressRepository.findByEnrollmentIdAndLessonId(anyLong(), anyLong())).thenAnswer(inv -> {
            Long eId = inv.getArgument(0);
            Long lId = inv.getArgument(1);
            return Optional.ofNullable(lessonProgresses.get(eId + ":" + lId));
        });
        when(lessonProgressRepository.findByEnrollmentId(anyLong())).thenAnswer(inv -> {
            Long eId = inv.getArgument(0);
            return lessonProgresses.values().stream()
                    .filter(lp -> lp.getEnrollment() != null && Objects.equals(lp.getEnrollment().getId(), eId))
                    .toList();
        });
        when(lessonProgressRepository.areAllLessonsCompleted(anyLong(), anyLong())).thenAnswer(inv -> {
            Long eId = inv.getArgument(0);
            Long mId = inv.getArgument(1);
            List<Lesson> modLessons = lessons.values().stream()
                    .filter(l -> l.getModule() != null && Objects.equals(l.getModule().getId(), mId))
                    .toList();
            if (modLessons.isEmpty()) return true;
            for (Lesson l : modLessons) {
                LessonProgress lp = lessonProgresses.get(eId + ":" + l.getId());
                if (lp == null || !Boolean.TRUE.equals(lp.getCompleted())) {
                    return false;
                }
            }
            return true;
        });

        when(quizRepository.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(quizzes.get(inv.getArgument(0))));
        when(quizRepository.findByModuleId(anyLong())).thenAnswer(inv -> {
            Long mId = inv.getArgument(0);
            return quizzes.values().stream()
                    .filter(q -> q.getModule() != null && Objects.equals(q.getModule().getId(), mId))
                    .findFirst();
        });
        when(quizRepository.findTopByModuleIdOrderByIdDesc(anyLong())).thenAnswer(inv -> {
            Long mId = inv.getArgument(0);
            return quizzes.values().stream()
                    .filter(q -> q.getModule() != null && Objects.equals(q.getModule().getId(), mId))
                    .findFirst();
        });
        when(quizRepository.findByCourseIdAndType(anyLong(), any(QuizType.class))).thenAnswer(inv -> {
            Long cId = inv.getArgument(0);
            QuizType type = inv.getArgument(1);
            return quizzes.values().stream()
                    .filter(q -> q.getCourse() != null && Objects.equals(q.getCourse().getId(), cId)
                            && q.getType() == type)
                    .toList();
        });
        when(quizRepository.findByCourseId(anyLong())).thenAnswer(inv -> {
            Long cId = inv.getArgument(0);
            return quizzes.values().stream()
                    .filter(q -> q.getCourse() != null && Objects.equals(q.getCourse().getId(), cId))
                    .toList();
        });

        when(quizQuestionRepository.findByQuiz_Id(anyLong())).thenAnswer(inv -> {
            Long qId = inv.getArgument(0);
            return quizQuestions.getOrDefault(qId, List.of());
        });
        when(quizQuestionRepository.findAllById(anyIterable())).thenAnswer(inv -> {
            Iterable<Long> ids = inv.getArgument(0);
            List<QuizQuestion> result = new ArrayList<>();
            for (Long id : ids) {
                for (List<QuizQuestion> list : quizQuestions.values()) {
                    list.stream().filter(q -> Objects.equals(q.getId(), id)).findFirst().ifPresent(result::add);
                }
            }
            return result;
        });

        when(quizProgressRepository.findByQuiz_IdAndUser_Id(anyLong(), anyLong())).thenAnswer(inv -> {
            Long qId = inv.getArgument(0);
            Long uId = inv.getArgument(1);
            return Optional.ofNullable(quizProgresses.get(qId + ":" + uId));
        });
        when(quizProgressRepository.findByQuizIdAndUserId(anyLong(), anyLong())).thenAnswer(inv -> {
            Long qId = inv.getArgument(0);
            Long uId = inv.getArgument(1);
            return Optional.ofNullable(quizProgresses.get(qId + ":" + uId));
        });
        when(quizProgressRepository.existsByQuiz_IdAndUser_IdAndPassedTrue(anyLong(), anyLong())).thenAnswer(inv -> {
            Long qId = inv.getArgument(0);
            Long uId = inv.getArgument(1);
            QuizProgress qp = quizProgresses.get(qId + ":" + uId);
            return qp != null && Boolean.TRUE.equals(qp.getPassed());
        });
        when(quizProgressRepository.save(any(QuizProgress.class))).thenAnswer(inv -> {
            QuizProgress qp = inv.getArgument(0);
            if (qp.getId() == null) {
                qp.setId(idSeq.incrementAndGet());
            }
            quizProgresses.put(qp.getQuiz().getId() + ":" + qp.getUser().getId(), qp);
            return qp;
        });
        when(quizProgressRepository.saveAndFlush(any(QuizProgress.class))).thenAnswer(inv -> {
            QuizProgress qp = inv.getArgument(0);
            if (qp.getId() == null) {
                qp.setId(idSeq.incrementAndGet());
            }
            quizProgresses.put(qp.getQuiz().getId() + ":" + qp.getUser().getId(), qp);
            return qp;
        });

        when(quizAttemptRepository.save(any(QuizAttempt.class))).thenAnswer(inv -> {
            QuizAttempt qa = inv.getArgument(0);
            if (qa.getId() == null) {
                qa.setId(idSeq.incrementAndGet());
            }
            quizAttempts.put(qa.getAttemptId(), qa);
            return qa;
        });
        when(quizAttemptRepository.findByAttemptId(anyString())).thenAnswer(inv -> Optional.ofNullable(quizAttempts.get(inv.getArgument(0))));
        when(quizAttemptRepository.findMaxAttemptNumber(anyLong(), anyLong())).thenAnswer(inv -> {
            Long qId = inv.getArgument(0);
            Long uId = inv.getArgument(1);
            return quizAttempts.values().stream()
                    .filter(a -> a.getQuiz() != null && Objects.equals(a.getQuiz().getId(), qId)
                            && a.getUser() != null && Objects.equals(a.getUser().getId(), uId))
                    .mapToInt(a -> a.getAttemptNumber() != null ? a.getAttemptNumber() : 0)
                    .max()
                    .orElse(0);
        });

        when(certificateRepository.findByUserId(anyLong())).thenAnswer(inv -> {
            Long uId = inv.getArgument(0);
            return certificates.values().stream()
                    .filter(c -> c.getUser() != null && Objects.equals(c.getUser().getId(), uId))
                    .toList();
        });

        courseMapper = new CourseMapper(new ObjectMapper(), quizRepository);

        enrollmentService = new EnrollmentService(
                enrollmentRepository,
                courseRepository,
                certificateService,
                securityContextUtil,
                courseMapper,
                userRepository,
                notificationService,
                departmentRepository,
                lessonProgressRepository,
                moduleRepository,
                quizRepository,
                quizProgressRepository,
                cdaRepository
        );

        hrAdminService = new HrAdminService(
                userRepository,
                enrollmentRepository,
                certificateRepository,
                passwordEncoder,
                enrollmentService
        );

        excelImportService = new EmployeeExcelImportService(
                userRepository,
                departmentRepository,
                passwordEncoder,
                enrollmentService
        );

        lessonProgressService = new LessonProgressService(
                lessonProgressRepository,
                enrollmentRepository,
                lessonRepository,
                securityContextUtil,
                quizRepository,
                quizProgressRepository,
                notificationService,
                moduleRepository
        );

        quizService = new QuizService(
                quizRepository,
                quizQuestionRepository,
                quizAttemptRepository,
                quizProgressRepository,
                userRepository,
                enrollmentRepository,
                lessonProgressRepository,
                moduleRepository,
                lessonRepository,
                new ObjectMapper(),
                enrollmentService,
                securityContextUtil,
                notificationService
        );

        catalogService = new CatalogService(
                categoryRepository,
                courseRepository,
                enrollmentRepository,
                learningPathRepository,
                certificateRepository,
                courseMapper,
                recommendationService,
                securityContextUtil
        );
    }

    private Department seedDepartment(Long id, String name, Department parent) {
        Department d = new Department();
        d.setId(id);
        d.setName(name);
        d.setParentDepartment(parent);
        departments.put(id, d);
        return d;
    }

    private Course createPublishedCourse(
            String courseCode,
            String title,
            String level,
            boolean foundation,
            Department owningDept,
            Department assignedDept,
            EnrollmentType assignmentType,
            LocalDate dueDate) {
        Course course = new Course();
        course.setId(idSeq.incrementAndGet());
        course.setCourseId(courseCode);
        course.setTitle(title);
        course.setLevel(level);
        course.setFoundation(foundation);
        course.setActive(true);
        course.setDraft(false);
        course.setCertificateEligible(!foundation);
        course.setPassingScore(70);
        course.setOwningDepartment(owningDept);
        courses.put(course.getId(), course);

        if (assignedDept != null) {
            CourseDepartmentAssignment cda = new CourseDepartmentAssignment(course, assignedDept, assignmentType, dueDate);
            assignments.add(cda);
            course.getDepartmentAssignments().add(cda);
        }
        return course;
    }

    @Test
    @DisplayName("1. New employee creation automatically enrolls eligible mandatory department & General courses only")
    void createEmployee_autoEnrollsEligibleMandatoryCoursesOnly() {
        Department generalDept = departments.get(1L);
        Department opsDept = departments.get(2L);
        Department salesDept = departments.get(3L);

        LocalDate opsDueDate = LocalDate.now().plusDays(15);
        LocalDate generalDueDate = LocalDate.now().plusDays(30);

        // Eligible: Operations P2 Mandatory
        Course opsMandatoryP2 = createPublishedCourse(
                "CRS-OPS-P2-M", "Operations Safety P2", "P2", false, opsDept, opsDept, EnrollmentType.MANDATORY, opsDueDate);
        // Eligible: General P2 Mandatory (Foundation)
        Course genFoundationP2 = createPublishedCourse(
                "CRS-GEN-P2-F", "Fairmacs Code of Conduct", "P2", true, generalDept, generalDept, EnrollmentType.MANDATORY, generalDueDate);
        // Excluded: Operations P2 Recommended (must NOT auto-enroll)
        createPublishedCourse(
                "CRS-OPS-P2-R", "Operations Optional Workshop", "P2", false, opsDept, opsDept, EnrollmentType.RECOMMENDED, opsDueDate);
        // Excluded: Operations P3 Mandatory (wrong position band)
        createPublishedCourse(
                "CRS-OPS-P3-M", "Operations Leadership P3", "P3", false, opsDept, opsDept, EnrollmentType.MANDATORY, opsDueDate);
        // Excluded: Sales P2 Mandatory (wrong department)
        createPublishedCourse(
                "CRS-SLS-P2-M", "Sales Pipeline P2", "P2", false, salesDept, salesDept, EnrollmentType.MANDATORY, opsDueDate);
        // Excluded: Draft course for Operations P2
        Course draftCourse = createPublishedCourse(
                "CRS-OPS-DRAFT", "Draft Ops Course", "P2", false, opsDept, opsDept, EnrollmentType.MANDATORY, opsDueDate);
        draftCourse.setDraft(true);

        Map<String, Object> createReq = new LinkedHashMap<>();
        createReq.put("id", "EMP-OPS-201");
        createReq.put("name", "Arjun Nair");
        createReq.put("email", "arjun.nair@fairmacs.com");
        createReq.put("role", "EMPLOYEE");
        createReq.put("position", "P2");
        createReq.put("department", "Operations");
        createReq.put("designation", "Operations Executive");
        createReq.put("branch", "Chennai");

        Map<String, Object> created = hrAdminService.createEmployee(createReq);
        Long userId = (Long) created.get("userId");
        assertNotNull(userId);

        List<Enrollment> empEnrollments = enrollmentRepository.findByUserIdWithCourse(userId);
        assertEquals(2, empEnrollments.size(), "Only the 2 eligible MANDATORY courses (Operations P2 + General P2) should be auto-enrolled");

        Enrollment opsEnr = enrollmentRepository.findByUserIdAndCourseId(userId, opsMandatoryP2.getId()).orElse(null);
        assertNotNull(opsEnr);
        assertEquals(EnrollmentType.MANDATORY, opsEnr.getEnrollmentType());
        assertEquals(EnrollmentStatus.NOT_STARTED, opsEnr.getStatus());
        assertEquals(0, opsEnr.getProgressPercent());
        assertEquals(opsDueDate, opsEnr.getDueDate(), "Department assignment due date must be preserved");

        Enrollment genEnr = enrollmentRepository.findByUserIdAndCourseId(userId, genFoundationP2.getId()).orElse(null);
        assertNotNull(genEnr);
        assertEquals(EnrollmentType.MANDATORY, genEnr.getEnrollmentType());
        assertEquals(generalDueDate, genEnr.getDueDate());
    }

    @Test
    @DisplayName("2. Bulk Excel employee import automatically enrolls each employee and prevents duplicates on repeated runs")
    void importEmployees_autoEnrollsMandatoryCoursesAndPreventsDuplicates() throws Exception {
        Department salesDept = departments.get(3L);
        Department hrDept = departments.get(4L);
        Department generalDept = departments.get(1L);

        LocalDate due = LocalDate.now().plusDays(20);
        Course salesP1Course = createPublishedCourse(
                "CRS-SLS-P1", "Sales Onboarding P1", "P1", false, salesDept, salesDept, EnrollmentType.MANDATORY, due);
        Course hrP3Course = createPublishedCourse(
                "CRS-HR-P3", "People Ops Compliance P3", "P3", false, hrDept, hrDept, EnrollmentType.MANDATORY, due);
        Course generalAllLevels = createPublishedCourse(
                "CRS-GEN-FND", "General Foundation", null, true, generalDept, generalDept, EnrollmentType.MANDATORY, due);
        // Recommended course in Sales should NOT be auto-enrolled
        createPublishedCourse(
                "CRS-SLS-REC", "Sales Elective", "P1", false, salesDept, salesDept, EnrollmentType.RECOMMENDED, due);

        byte[] xlsxBytes = buildEmployeeExcelFile(List.of(
                new String[]{"EMP-IMP-01", "Meera Krishnan", "meera.k@fairmacs.com", "EMPLOYEE", "P1", "Sales", "Sales Associate", "Mumbai", "2026-11-01"},
                new String[]{"EMP-IMP-02", "Vikram Rao", "vikram.r@fairmacs.com", "EMPLOYEE", "P3", "Human Resource", "HR Lead", "Chennai", "2026-11-01"}
        ));

        MockMultipartFile file = new MockMultipartFile(
                "file", "employees.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xlsxBytes
        );

        Map<String, Object> importResult = excelImportService.importEmployees(file);
        assertEquals(Boolean.TRUE, importResult.get("success"));
        assertEquals(2, importResult.get("importedCount"));

        User meera = userRepository.findByEmployeeId("EMP-IMP-01").orElseThrow();
        User vikram = userRepository.findByEmployeeId("EMP-IMP-02").orElseThrow();

        // Meera (Sales, P1) -> CRS-SLS-P1 + CRS-GEN-FND
        List<Enrollment> meeraEnrollments = enrollmentRepository.findByUserIdWithCourse(meera.getId());
        assertEquals(2, meeraEnrollments.size());
        assertTrue(enrollmentRepository.findByUserIdAndCourseId(meera.getId(), salesP1Course.getId()).isPresent());
        assertTrue(enrollmentRepository.findByUserIdAndCourseId(meera.getId(), generalAllLevels.getId()).isPresent());

        // Vikram (People Operations via alias "Human Resource", P3) -> CRS-HR-P3 + CRS-GEN-FND
        List<Enrollment> vikramEnrollments = enrollmentRepository.findByUserIdWithCourse(vikram.getId());
        assertEquals(2, vikramEnrollments.size());
        assertTrue(enrollmentRepository.findByUserIdAndCourseId(vikram.getId(), hrP3Course.getId()).isPresent());
        assertTrue(enrollmentRepository.findByUserIdAndCourseId(vikram.getId(), generalAllLevels.getId()).isPresent());

        // Repeated onboarding call must create 0 duplicates
        int duplicateAttempt = enrollmentService.enrollEmployeeInMandatoryCourses(meera);
        assertEquals(0, duplicateAttempt);
        assertEquals(2, enrollmentRepository.findByUserIdWithCourse(meera.getId()).size());

        // Re-importing the same Excel file must fail validation cleanly without creating duplicate users or enrollments
        Map<String, Object> repeatImport = excelImportService.importEmployees(file);
        assertEquals(Boolean.FALSE, repeatImport.get("success"));
        assertEquals(0, repeatImport.get("importedCount"));
        assertEquals(2, enrollmentRepository.findByUserIdWithCourse(meera.getId()).size());
    }

    @Test
    @DisplayName("3. Inactive employees and non-EMPLOYEE roles are never auto-enrolled; child departments inherit parent mandatory courses")
    void onboarding_excludesInactiveAndNonEmployees_andSupportsDepartmentHierarchyAndCrossDepartment() {
        Department opsParent = departments.get(2L);
        Department hrOwner = departments.get(4L);
        Department generalDept = departments.get(1L);

        LocalDate specificDue = LocalDate.now().plusDays(10);
        LocalDate generalDue = LocalDate.now().plusDays(45);

        // Cross-department course owned by People Operations, assigned as MANDATORY to Operations (parent) AND General
        Course crossDeptCourse = createPublishedCourse(
                "CRS-CROSS-P1", "Cross-Department Ethics P1", "P1", false, hrOwner, opsParent, EnrollmentType.MANDATORY, specificDue);
        CourseDepartmentAssignment genAssignment = new CourseDepartmentAssignment(crossDeptCourse, generalDept, EnrollmentType.MANDATORY, generalDue);
        assignments.add(genAssignment);
        crossDeptCourse.getDepartmentAssignments().add(genAssignment);

        // 1. Inactive employee -> 0 enrollments
        Map<String, Object> inactiveReq = new LinkedHashMap<>();
        inactiveReq.put("id", "EMP-INACT-01");
        inactiveReq.put("name", "Inactive User");
        inactiveReq.put("email", "inactive@fairmacs.com");
        inactiveReq.put("role", "EMPLOYEE");
        inactiveReq.put("position", "P1");
        inactiveReq.put("department", "Field Operations");
        inactiveReq.put("status", "INACTIVE");
        Map<String, Object> inactiveCreated = hrAdminService.createEmployee(inactiveReq);
        Long inactiveUserId = (Long) inactiveCreated.get("userId");
        assertTrue(enrollmentRepository.findByUserIdWithCourse(inactiveUserId).isEmpty(),
                "Inactive employees must not be auto-enrolled");

        // 2. Active employee in child department ("Field Operations" under "Operations") -> enrolled once with specific due date
        Map<String, Object> childDeptReq = new LinkedHashMap<>();
        childDeptReq.put("id", "EMP-FIELD-01");
        childDeptReq.put("name", "Deepa Menon");
        childDeptReq.put("email", "deepa.m@fairmacs.com");
        childDeptReq.put("role", "EMPLOYEE");
        childDeptReq.put("position", "P1");
        childDeptReq.put("department", "Field Operations");
        Map<String, Object> activeCreated = hrAdminService.createEmployee(childDeptReq);
        Long activeUserId = (Long) activeCreated.get("userId");

        List<Enrollment> activeEnrollments = enrollmentRepository.findByUserIdWithCourse(activeUserId);
        assertEquals(1, activeEnrollments.size(), "Cross-department course assigned to both parent dept and General must enroll employee only once");
        Enrollment enr = activeEnrollments.get(0);
        assertEquals(specificDue, enr.getDueDate(), "Specific department due date should take precedence over General due date");
        assertEquals("Field Operations", enr.getUser().getDepartment(), "Employee department must remain Field Operations");
        assertEquals("People Operations", enr.getCourse().getOwningDepartment().getName(), "Course owning department must remain People Operations");

        // 3. Updating existing employee department/position must NOT delete or corrupt existing enrollments
        enr.setStatus(EnrollmentStatus.IN_PROGRESS);
        enr.setProgressPercent(60);
        hrAdminService.updateEmployee("EMP-FIELD-01", Map.of("department", "Sales", "position", "P2"));
        Enrollment afterUpdate = enrollmentRepository.findByUserIdAndCourseId(activeUserId, crossDeptCourse.getId()).orElseThrow();
        assertEquals(EnrollmentStatus.IN_PROGRESS, afterUpdate.getStatus());
        assertEquals(60, afterUpdate.getProgressPercent());
    }

    @Test
    @DisplayName("4. Complete 14-Step End-to-End Employee Learning Journey (Standard Course + Foundation Course + Revoked Access Guard)")
    void completeEndToEndEmployeeLearningJourney() {
        Department opsDept = departments.get(2L);
        LocalDate dueDate = LocalDate.now().plusDays(14);

        // Setup 1: Standard Course (2 lessons in Module 1 + Module 1 Quiz + Final Quiz)
        Course standardCourse = createPublishedCourse(
                "CRS-E2E-STD", "Standard Logistics Mastery", "P1", false, opsDept, opsDept, EnrollmentType.MANDATORY, dueDate);
        standardCourse.setModules(new ArrayList<>());

        Module mod1 = new Module();
        mod1.setId(idSeq.incrementAndGet());
        mod1.setModuleId("MOD-E2E-1");
        mod1.setTitle("Module 1: Core Operations");
        mod1.setOrderIndex(1);
        mod1.setCourse(standardCourse);
        mod1.setLessons(new ArrayList<>());
        modules.put(mod1.getId(), mod1);
        standardCourse.getModules().add(mod1);

        Lesson stdLesson1 = new Lesson();
        stdLesson1.setId(idSeq.incrementAndGet());
        stdLesson1.setLessonId("LES-STD-1");
        stdLesson1.setTitle("Lesson 1: Video Orientation");
        stdLesson1.setType("VIDEO");
        stdLesson1.setDuration("10 min");
        stdLesson1.setOrderIndex(1);
        stdLesson1.setModule(mod1);
        lessons.put(stdLesson1.getId(), stdLesson1);
        mod1.getLessons().add(stdLesson1);

        Lesson stdLesson2 = new Lesson();
        stdLesson2.setId(idSeq.incrementAndGet());
        stdLesson2.setLessonId("LES-STD-2");
        stdLesson2.setTitle("Lesson 2: SOP Manual PDF");
        stdLesson2.setType("PDF");
        stdLesson2.setDuration("15 min");
        stdLesson2.setOrderIndex(2);
        stdLesson2.setModule(mod1);
        lessons.put(stdLesson2.getId(), stdLesson2);
        mod1.getLessons().add(stdLesson2);

        Quiz moduleQuiz = new Quiz();
        moduleQuiz.setId(idSeq.incrementAndGet());
        moduleQuiz.setQuizId("QUIZ-MOD-1");
        moduleQuiz.setTitle("Module 1 Quiz");
        moduleQuiz.setType(QuizType.MODULE);
        moduleQuiz.setCourse(standardCourse);
        moduleQuiz.setModule(mod1);
        moduleQuiz.setPassingScore(70);
        moduleQuiz.setActive(true);
        quizzes.put(moduleQuiz.getId(), moduleQuiz);

        QuizQuestion modQ1 = new QuizQuestion();
        modQ1.setId(idSeq.incrementAndGet());
        modQ1.setQuestionId("Q-MOD-1");
        modQ1.setQuiz(moduleQuiz);
        modQ1.setQuestionText("What is the first step in SOP?");
        modQ1.setQuestionType("SINGLE_CHOICE");
        modQ1.setOptionA("Safety Check");
        modQ1.setOptionB("Skip Check");
        modQ1.setOptionC("None");
        modQ1.setOptionD("Later");
        modQ1.setCorrectAnswer("A");
        quizQuestions.put(moduleQuiz.getId(), List.of(modQ1));

        Quiz finalQuiz = new Quiz();
        finalQuiz.setId(idSeq.incrementAndGet());
        finalQuiz.setQuizId("QUIZ-FINAL-1");
        finalQuiz.setTitle("Final Course Assessment");
        finalQuiz.setType(QuizType.FINAL);
        finalQuiz.setCourse(standardCourse);
        finalQuiz.setPassingScore(70);
        finalQuiz.setActive(true);
        quizzes.put(finalQuiz.getId(), finalQuiz);

        QuizQuestion finQ1 = new QuizQuestion();
        finQ1.setId(idSeq.incrementAndGet());
        finQ1.setQuestionId("Q-FIN-1");
        finQ1.setQuiz(finalQuiz);
        finQ1.setQuestionText("Which document governs shipment clearance?");
        finQ1.setQuestionType("SINGLE_CHOICE");
        finQ1.setOptionA("Bill of Lading");
        finQ1.setOptionB("Draft Note");
        finQ1.setOptionC("Memo");
        finQ1.setOptionD("Receipt");
        finQ1.setCorrectAnswer("A");
        quizQuestions.put(finalQuiz.getId(), List.of(finQ1));

        // Setup 2: Foundation Course (1 lesson, no quizzes, reaches 100% directly)
        Course foundationCourse = createPublishedCourse(
                "CRS-E2E-FND", "Foundation Workplace Safety", "P1", true, opsDept, opsDept, EnrollmentType.MANDATORY, dueDate);
        foundationCourse.setModules(new ArrayList<>());

        Module fndMod = new Module();
        fndMod.setId(idSeq.incrementAndGet());
        fndMod.setModuleId("MOD-FND-1");
        fndMod.setTitle("Module 1: Basics");
        fndMod.setOrderIndex(1);
        fndMod.setCourse(foundationCourse);
        fndMod.setLessons(new ArrayList<>());
        modules.put(fndMod.getId(), fndMod);
        foundationCourse.getModules().add(fndMod);

        Lesson fndLesson1 = new Lesson();
        fndLesson1.setId(idSeq.incrementAndGet());
        fndLesson1.setLessonId("LES-FND-1");
        fndLesson1.setTitle("Foundation Lesson 1");
        fndLesson1.setType("VIDEO");
        fndLesson1.setOrderIndex(1);
        fndLesson1.setModule(fndMod);
        lessons.put(fndLesson1.getId(), fndLesson1);
        fndMod.getLessons().add(fndLesson1);

        // STEP 1 & 2: HR/Admin creates employee -> automatic enrollment in both mandatory courses
        Map<String, Object> empPayload = new LinkedHashMap<>();
        empPayload.put("id", "EMP-E2E-100");
        empPayload.put("name", "Karthik Subramanian");
        empPayload.put("email", "karthik.s@fairmacs.com");
        empPayload.put("role", "EMPLOYEE");
        empPayload.put("position", "P1");
        empPayload.put("department", "Operations");

        Map<String, Object> empResp = hrAdminService.createEmployee(empPayload);
        Long empUserId = (Long) empResp.get("userId");
        activeSessionUser = userRepository.findById(empUserId).orElseThrow();

        // STEP 3: Employee opens learning dashboard and sees assigned mandatory courses
        LearningDashboardDTO dashboard = catalogService.getDashboard();
        assertEquals(2, dashboard.getMandatory().size());
        assertEquals(2, dashboard.getEnrolled().size());

        // STEP 4: Employee opens Standard course
        CourseDTO openedCourse = catalogService.getCourse("CRS-E2E-STD");
        assertNotNull(openedCourse.getEnrollmentDbId());
        Long stdEnrollmentId = openedCourse.getEnrollmentDbId();

        // STEP 5: Lesson 1 is unlocked; Lesson 2, Module Quiz, and Final Quiz are locked
        assertTrue(lessonProgressService.isLessonUnlocked(stdEnrollmentId, stdLesson1.getId()));
        assertFalse(lessonProgressService.isLessonUnlocked(stdEnrollmentId, stdLesson2.getId()));

        assertThrows(IllegalStateException.class,
                () -> lessonProgressService.updateProgress(stdEnrollmentId, stdLesson2.getId(), 100, 0, 0),
                "Lesson 2 must reject completion while Lesson 1 is incomplete");
        assertThrows(IllegalStateException.class, () -> quizService.startQuiz(moduleQuiz.getId()),
                "Module quiz must reject start while module lessons are incomplete");
        assertThrows(IllegalStateException.class, () -> quizService.startQuiz(finalQuiz.getId()),
                "Final quiz must reject start while lessons and module quizzes are incomplete");

        // STEP 6 & 7: Employee completes Lesson 1 -> progress saved (33% on 2 lessons + 1 module quiz Standard course), Lesson 2 unlocks
        lessonProgressService.updateProgress(stdEnrollmentId, stdLesson1.getId(), 100, 600, 600);

        Enrollment stdEnrAfterL1 = enrollmentRepository.findById(stdEnrollmentId).orElseThrow();
        assertEquals(EnrollmentStatus.IN_PROGRESS, stdEnrAfterL1.getStatus());
        assertEquals(33, stdEnrAfterL1.getProgressPercent());
        assertTrue(lessonProgressService.isLessonUnlocked(stdEnrollmentId, stdLesson2.getId()));

        // STEP 8: Employee completes Lesson 2 -> Standard course progress reaches 65% (round(2 * 98 / 3) pre-final items completed)
        lessonProgressService.updateProgress(stdEnrollmentId, stdLesson2.getId(), 100, 900, 900);

        Enrollment stdEnrAfterL2 = enrollmentRepository.findById(stdEnrollmentId).orElseThrow();
        assertEquals(EnrollmentStatus.IN_PROGRESS, stdEnrAfterL2.getStatus());
        assertEquals(65, stdEnrAfterL2.getProgressPercent());

        // STEP 9 & 10: Module 1 Quiz unlocks; employee starts and passes Module 1 Quiz
        Map<String, Object> modQuizUnlock = quizService.getQuizUnlockStatus(moduleQuiz.getId());
        assertEquals(Boolean.TRUE, modQuizUnlock.get("unlocked"));

        Map<String, Object> modQuizStart = quizService.startQuiz(moduleQuiz.getId());
        String modAttemptId = (String) modQuizStart.get("attemptId");
        Map<String, Object> modSubmit = quizService.submitQuiz(
                modAttemptId,
                Map.of(String.valueOf(modQ1.getId()), "A"),
                45
        );
        assertEquals(Boolean.TRUE, modSubmit.get("passed"));
        assertEquals(100, modSubmit.get("score"));
        assertEquals(EnrollmentStatus.IN_PROGRESS, enrollmentRepository.findById(stdEnrollmentId).orElseThrow().getStatus(),
                "Passing module quiz must not complete the course before final assessment");

        // STEP 11, 12 & 13: Final assessment unlocks; employee passes Final Assessment -> 100% COMPLETED + Certificate generated
        Map<String, Object> finQuizUnlock = quizService.getQuizUnlockStatus(finalQuiz.getId());
        assertEquals(Boolean.TRUE, finQuizUnlock.get("unlocked"));

        Map<String, Object> finQuizStart = quizService.startQuiz(finalQuiz.getId());
        String finAttemptId = (String) finQuizStart.get("attemptId");
        Map<String, Object> finSubmit = quizService.submitQuiz(
                finAttemptId,
                Map.of(String.valueOf(finQ1.getId()), "A"),
                60
        );
        assertEquals(Boolean.TRUE, finSubmit.get("passed"));
        assertEquals(Boolean.TRUE, finSubmit.get("courseCompleted"));
        assertEquals(Boolean.TRUE, finSubmit.get("certificateGenerated"));
        assertNotNull(finSubmit.get("completion"));

        Enrollment completedStdEnr = enrollmentRepository.findById(stdEnrollmentId).orElseThrow();
        assertEquals(EnrollmentStatus.COMPLETED, completedStdEnr.getStatus());
        assertEquals(100, completedStdEnr.getProgressPercent());
        assertNotNull(completedStdEnr.getCertificateId());
        assertEquals(1, certificates.size());

        // STEP 14: Completed course never regresses to IN_PROGRESS, and repeated completeCourse is idempotent
        lessonProgressService.updateProgress(stdEnrollmentId, stdLesson1.getId(), 30, 120, 120);

        Enrollment afterReplay = enrollmentRepository.findById(stdEnrollmentId).orElseThrow();
        assertEquals(EnrollmentStatus.COMPLETED, afterReplay.getStatus());
        assertEquals(100, afterReplay.getProgressPercent());

        CompleteCourseRequest repeatComplete = new CompleteCourseRequest();
        repeatComplete.setEnrollmentId(stdEnrollmentId);
        CertificateDTO idempotentCert = enrollmentService.completeCourse(repeatComplete);
        assertNotNull(idempotentCert);
        assertEquals(completedStdEnr.getCertificateId(), idempotentCert.getCertificateId());
        assertEquals(1, certificates.size(), "Repeated course completion must not generate duplicate certificates");

        // Foundation Course Verification: completing its only lesson reaches 100% COMPLETED directly without quizzes/certificates
        Enrollment fndEnr = enrollmentRepository.findByUserIdAndCourseId(empUserId, foundationCourse.getId()).orElseThrow();
        lessonProgressService.updateProgress(fndEnr.getId(), fndLesson1.getId(), 100, 300, 300);

        assertEquals(EnrollmentStatus.COMPLETED, fndEnr.getStatus());
        assertEquals(100, fndEnr.getProgressPercent());

        // Revoked Enrollment Guard Verification: revoking an enrollment blocks lesson progress and quiz access
        fndEnr.setStatus(EnrollmentStatus.REVOKED);
        assertThrows(SecurityException.class, () -> lessonProgressService.getEnrollmentProgress(fndEnr.getId()));
        assertThrows(SecurityException.class,
                () -> lessonProgressService.updateProgress(fndEnr.getId(), fndLesson1.getId(), 100, 300, 300));
        completedStdEnr.setStatus(EnrollmentStatus.REVOKED);
        assertThrows(AccessDeniedException.class, () -> quizService.startQuiz(moduleQuiz.getId()));
    }

    private byte[] buildEmployeeExcelFile(List<String[]> dataRows) throws Exception {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Employees");
            String[] headers = {
                    "Employee ID", "Employee Name", "Corporate Email", "Role",
                    "Position", "Department", "Designation", "Branch/Location", "Joining Date"
            };
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
            }
            for (int r = 0; r < dataRows.size(); r++) {
                Row row = sheet.createRow(r + 1);
                String[] values = dataRows.get(r);
                for (int c = 0; c < values.length; c++) {
                    row.createCell(c).setCellValue(values[c]);
                }
            }
            wb.write(out);
            return out.toByteArray();
        }
    }
}
