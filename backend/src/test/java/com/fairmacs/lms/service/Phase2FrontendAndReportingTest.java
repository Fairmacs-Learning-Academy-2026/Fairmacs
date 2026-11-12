package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.*;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Proxy;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Phase 2: Frontend & Reporting Verification Test Suite")
class Phase2FrontendAndReportingTest {

    private final Map<Long, Course> courseStore = new LinkedHashMap<>();
    private final Map<Long, Department> departmentStore = new LinkedHashMap<>();
    private final Map<Long, CourseDepartmentAssignment> assignmentStore = new LinkedHashMap<>();
    private final Map<Long, User> userStore = new LinkedHashMap<>();
    private final Map<Long, Enrollment> enrollmentStore = new LinkedHashMap<>();
    private final Map<Long, Category> categoryStore = new LinkedHashMap<>();
    private final Map<Long, Module> moduleStore = new LinkedHashMap<>();
    private final Map<Long, Lesson> lessonStore = new LinkedHashMap<>();
    private final Map<Long, Quiz> quizStore = new LinkedHashMap<>();
    private final Map<Long, QuizQuestion> questionStore = new LinkedHashMap<>();
    private final Map<Long, QuizAttempt> attemptStore = new LinkedHashMap<>();
    private final Map<Long, LessonProgress> progressStore = new LinkedHashMap<>();
    private final Map<Long, QuizProgress> quizProgressStore = new LinkedHashMap<>();
    private final Map<Long, Certificate> certificateStore = new LinkedHashMap<>();

    private final AtomicLong courseIdSeq = new AtomicLong(200);
    private final AtomicLong assignmentIdSeq = new AtomicLong(20);
    private final AtomicLong enrollmentIdSeq = new AtomicLong(600);
    private final AtomicLong quizAttemptIdSeq = new AtomicLong(800);

    private CourseAuthoringService authoringService;
    private EnrollmentService enrollmentService;
    private DepartmentService departmentService;
    private ManagerReportsService managerReportsService;
    private QuizService quizService;
    private CourseMapper courseMapper;

    private User hrAdmin;
    private User trainer;
    private User employeeDoc;
    private Department deptOps;
    private Department deptDoc;
    private Department deptAccounts;

    private User currentUser;

    @BeforeEach
    void setup() {
        SecurityContextHolder.clearContext();
        courseStore.clear();
        departmentStore.clear();
        assignmentStore.clear();
        userStore.clear();
        enrollmentStore.clear();
        categoryStore.clear();
        moduleStore.clear();
        lessonStore.clear();
        quizStore.clear();
        questionStore.clear();
        attemptStore.clear();
        progressStore.clear();
        quizProgressStore.clear();
        certificateStore.clear();

        // 1. Departments
        deptOps = new Department();
        deptOps.setId(1L);
        deptOps.setName("Operations");
        deptOps.setShortCode("OP");
        departmentStore.put(1L, deptOps);

        deptDoc = new Department();
        deptDoc.setId(2L);
        deptDoc.setName("Documentation");
        deptDoc.setShortCode("DOC");
        departmentStore.put(2L, deptDoc);

        deptAccounts = new Department();
        deptAccounts.setId(3L);
        deptAccounts.setName("Accounts");
        deptAccounts.setShortCode("ACC");
        departmentStore.put(3L, deptAccounts);

        // 2. Users
        hrAdmin = new User();
        hrAdmin.setId(10L);
        hrAdmin.setName("HR Administrator");
        hrAdmin.setEmail("hr.admin@fairmacs.com");
        hrAdmin.setDepartment("Human Resources");
        hrAdmin.setRole(Role.HR_ADMIN);
        userStore.put(10L, hrAdmin);

        trainer = new User();
        trainer.setId(20L);
        trainer.setName("Senior Trainer");
        trainer.setEmail("trainer@fairmacs.com");
        trainer.setDepartment("Training");
        trainer.setRole(Role.TRAINER);
        userStore.put(20L, trainer);

        employeeDoc = new User();
        employeeDoc.setId(30L);
        employeeDoc.setName("Priya Sharma");
        employeeDoc.setEmail("priya.sharma@fairmacs.com");
        employeeDoc.setDepartment("Documentation");
        employeeDoc.setRole(Role.EMPLOYEE);
        userStore.put(30L, employeeDoc);

        currentUser = hrAdmin;

        // Repositories
        CourseRepository courseRepo = createMockProxy(CourseRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("findById")) return Optional.ofNullable(courseStore.get((Long) args[0]));
            if (name.equals("findByCourseId")) {
                String cId = (String) args[0];
                return courseStore.values().stream().filter(c -> cId.equalsIgnoreCase(c.getCourseId())).findFirst();
            }
            if (name.equals("findAll")) return new ArrayList<>(courseStore.values());
            if (name.startsWith("save")) {
                Course c = (Course) args[0];
                if (c.getId() == null) c.setId(courseIdSeq.incrementAndGet());
                courseStore.put(c.getId(), c);
                return c;
            }
            return null;
        });

        DepartmentRepository deptRepo = createMockProxy(DepartmentRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("findById")) return Optional.ofNullable(departmentStore.get((Long) args[0]));
            if (name.equals("findByNameIgnoreCase")) {
                String dName = (String) args[0];
                return departmentStore.values().stream().filter(d -> d.getName().equalsIgnoreCase(dName)).findFirst();
            }
            if (name.equals("findAll")) return new ArrayList<>(departmentStore.values());
            return null;
        });

        CourseDepartmentAssignmentRepository cdaRepo = createMockProxy(CourseDepartmentAssignmentRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("findByCourse_Id")) {
                Long cid = (Long) args[0];
                return assignmentStore.values().stream()
                        .filter(a -> a.getCourse() != null && cid.equals(a.getCourse().getId()))
                        .toList();
            }
            if (name.equals("findByDepartment_Id")) {
                Long did = (Long) args[0];
                return assignmentStore.values().stream()
                        .filter(a -> a.getDepartment() != null && did.equals(a.getDepartment().getId()))
                        .toList();
            }
            if (name.equals("findByCourse_IdAndDepartment_Id")) {
                Long cid = (Long) args[0];
                Long did = (Long) args[1];
                return assignmentStore.values().stream()
                        .filter(a -> a.getCourse() != null && cid.equals(a.getCourse().getId())
                                && a.getDepartment() != null && did.equals(a.getDepartment().getId()))
                        .findFirst();
            }
            if (name.startsWith("save")) {
                CourseDepartmentAssignment a = (CourseDepartmentAssignment) args[0];
                if (a.getId() == null) a.setId(assignmentIdSeq.incrementAndGet());
                assignmentStore.put(a.getId(), a);
                return a;
            }
            return null;
        });

        UserRepository userRepo = createMockProxy(UserRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("findById")) return Optional.ofNullable(userStore.get((Long) args[0]));
            if (name.equals("findAll")) return new ArrayList<>(userStore.values());
            return null;
        });

        EnrollmentRepository enrollmentRepo = createMockProxy(EnrollmentRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("findById")) return Optional.ofNullable(enrollmentStore.get((Long) args[0]));
            if (name.equals("findByUser_Id") || name.equals("findByUserId") || name.equals("findByUserIdWithCourse")) {
                Long uid = (Long) args[0];
                return enrollmentStore.values().stream()
                        .filter(e -> e.getUser() != null && uid.equals(e.getUser().getId()))
                        .toList();
            }
            if (name.equals("findByCourse_Id") || name.equals("findByCourseId")) {
                Long cid = (Long) args[0];
                return enrollmentStore.values().stream()
                        .filter(e -> e.getCourse() != null && cid.equals(e.getCourse().getId()))
                        .toList();
            }
            if (name.equals("findByUser_IdAndCourse_Id") || name.equals("findByUserIdAndCourseId")) {
                Long uid = (Long) args[0];
                Long cid = (Long) args[1];
                return enrollmentStore.values().stream()
                        .filter(e -> e.getUser() != null && uid.equals(e.getUser().getId())
                                && e.getCourse() != null && cid.equals(e.getCourse().getId()))
                        .findFirst();
            }
            if (name.equals("findAll")) return new ArrayList<>(enrollmentStore.values());
            if (name.startsWith("save")) {
                Enrollment e = (Enrollment) args[0];
                if (e.getId() == null) e.setId(enrollmentIdSeq.incrementAndGet());
                enrollmentStore.put(e.getId(), e);
                return e;
            }
            return null;
        });

        QuizRepository quizRepo = createMockProxy(QuizRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("findById")) return Optional.ofNullable(quizStore.get((Long) args[0]));
            if (name.equals("findByCourse_Id") || name.equals("findByCourseId")) {
                Long cid = (Long) args[0];
                return quizStore.values().stream().filter(q -> q.getCourse() != null && cid.equals(q.getCourse().getId())).findFirst();
            }
            if (name.equals("findByModule_Id") || name.equals("findByModuleId")) {
                Long mid = (Long) args[0];
                return quizStore.values().stream().filter(q -> q.getModule() != null && mid.equals(q.getModule().getId())).findFirst();
            }
            if (name.equals("findTopByModuleIdOrderByIdDesc")) {
                Long mid = (Long) args[0];
                return quizStore.values().stream()
                        .filter(q -> q.getModule() != null && mid.equals(q.getModule().getId()))
                        .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
                        .findFirst();
            }
            if (name.equals("findAllByModuleId")) {
                Long mid = (Long) args[0];
                return quizStore.values().stream()
                        .filter(q -> q.getModule() != null && mid.equals(q.getModule().getId()))
                        .toList();
            }
            if (name.startsWith("save")) {
                Quiz q = (Quiz) args[0];
                if (q.getId() == null) q.setId((long) (quizStore.size() + 1));
                quizStore.put(q.getId(), q);
                return q;
            }
            return null;
        });

        QuizAttemptRepository qaRepo = createMockProxy(QuizAttemptRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("findById")) return Optional.ofNullable(attemptStore.get((Long) args[0]));
            if (name.equals("findTopByQuiz_IdAndUser_IdOrderByAttemptNumberDesc") || name.equals("findTopByQuizIdAndUserIdOrderByAttemptNumberDesc")) {
                Long qid = (Long) args[0];
                Long uid = (Long) args[1];
                return attemptStore.values().stream()
                        .filter(a -> a.getQuiz() != null && qid.equals(a.getQuiz().getId())
                                && a.getUser() != null && uid.equals(a.getUser().getId()))
                        .sorted(Comparator.comparingInt(QuizAttempt::getAttemptNumber).reversed())
                        .findFirst();
            }
            if (name.equals("findTopByQuiz_IdAndUser_IdAndPassedTrueOrderByCompletedAtDesc")) {
                Long qid = (Long) args[0];
                Long uid = (Long) args[1];
                return attemptStore.values().stream()
                        .filter(a -> a.getQuiz() != null && qid.equals(a.getQuiz().getId())
                                && a.getUser() != null && uid.equals(a.getUser().getId())
                                && Boolean.TRUE.equals(a.getPassed()))
                        .sorted((a, b) -> b.getCompletedAt() != null && a.getCompletedAt() != null ? b.getCompletedAt().compareTo(a.getCompletedAt()) : 0)
                        .findFirst();
            }
            if (name.startsWith("save")) {
                QuizAttempt a = (QuizAttempt) args[0];
                if (a.getId() == null) a.setId(quizAttemptIdSeq.incrementAndGet());
                attemptStore.put(a.getId(), a);
                return a;
            }
            return null;
        });

        QuizProgressRepository qpRepo = createMockProxy(QuizProgressRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("findByQuiz_IdAndUser_Id") || name.equals("findByQuizIdAndUserId")) {
                Long qid = (Long) args[0];
                Long uid = (Long) args[1];
                return quizProgressStore.values().stream()
                        .filter(qp -> qp.getQuiz() != null && qid.equals(qp.getQuiz().getId())
                                && qp.getUser() != null && uid.equals(qp.getUser().getId()))
                        .findFirst();
            }
            if (name.startsWith("save")) {
                QuizProgress qp = (QuizProgress) args[0];
                if (qp.getId() == null) qp.setId((long) (quizProgressStore.size() + 1));
                quizProgressStore.put(qp.getId(), qp);
                return qp;
            }
            return null;
        });

        LessonProgressRepository lpRepo = createMockProxy(LessonProgressRepository.class, (method, args) -> Collections.emptyList());
        CategoryRepository catRepo = createMockProxy(CategoryRepository.class, (method, args) -> Optional.empty());
        ModuleRepository modRepo = createMockProxy(ModuleRepository.class, (method, args) -> Collections.emptyList());
        LessonRepository lesRepo = createMockProxy(LessonRepository.class, (method, args) -> Collections.emptyList());
        QuizQuestionRepository qRepo = createMockProxy(QuizQuestionRepository.class, (method, args) -> Collections.emptyList());
        CertificateRepository certRepo = createMockProxy(CertificateRepository.class, (method, args) -> Optional.empty());
        RecommendationRuleRepository ruleRepo = createMockProxy(RecommendationRuleRepository.class, (method, args) -> Collections.emptyList());
        LearningPathRepository lpPathRepo = createMockProxy(LearningPathRepository.class, (method, args) -> Collections.emptyList());

        SecurityContextUtil securityContextUtil = new SecurityContextUtil(userRepo) {
            @Override
            public User getCurrentUser() {
                return currentUser;
            }
        };

        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        courseMapper = new CourseMapper(objectMapper, quizRepo);

        enrollmentService = new EnrollmentService(
                enrollmentRepo, courseRepo, null, securityContextUtil,
                courseMapper, userRepo, null, deptRepo,
                lpRepo, modRepo, quizRepo, qpRepo
        );

        authoringService = new CourseAuthoringService(
                catRepo, courseRepo, modRepo, lesRepo, quizRepo, qRepo,
                securityContextUtil, deptRepo, enrollmentRepo, qaRepo,
                enrollmentService, certRepo, lpRepo, qpRepo, ruleRepo,
                lpPathRepo, objectMapper, null, null
        );
        authoringService.setCourseDepartmentAssignmentRepository(cdaRepo);

        departmentService = new DepartmentService(deptRepo, userRepo, enrollmentRepo, courseRepo);
        managerReportsService = new ManagerReportsService(userRepo, enrollmentRepo);

        quizService = new QuizService(
                quizRepo,
                qRepo,
                qaRepo,
                qpRepo,
                userRepo,
                enrollmentRepo,
                lpRepo,
                modRepo,
                objectMapper,
                enrollmentService,
                securityContextUtil
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("1. Assign owning department to unassigned existing course")
    void testAssignCourseOwnershipToUnassignedCourse() {
        // Historical course with owningDepartment = null
        Course historicalCourse = new Course();
        historicalCourse.setId(101L);
        historicalCourse.setCourseId("FAIR-HIST-01");
        historicalCourse.setTitle("Historical Bill of Lading Basics");
        historicalCourse.setOwningDepartment(null);
        historicalCourse.setLevel("L1");
        historicalCourse.setDraft(false);
        historicalCourse.setPublishedAt(LocalDateTime.now());
        courseStore.put(101L, historicalCourse);

        // HR/Admin assigns owning department to Operations
        currentUser = hrAdmin;
        com.fairmacs.lms.dto.CourseDTO updated = authoringService.assignCourseOwnership("FAIR-HIST-01", deptOps.getId());

        assertNotNull(updated);
        assertEquals(deptOps.getId(), updated.getDepartmentId());
        assertEquals("Operations", updated.getOwningDepartmentName());
        assertEquals("Operations", historicalCourse.getOwningDepartment().getName());
    }

    @Test
    @DisplayName("2. Reopening a completed module quiz returns passed attempt without server error")
    void testReopeningCompletedModuleQuizReturnsGracefully() {
        Course course = new Course();
        course.setId(102L);
        course.setCourseId("FAIR-MOD-01");
        course.setTitle("Documentation Masterclass");
        courseStore.put(102L, course);

        Module module = new Module();
        module.setId(501L);
        module.setTitle("Module 1: Maritime Documents");
        module.setCourse(course);
        moduleStore.put(501L, module);

        Quiz quiz = new Quiz();
        quiz.setId(701L);
        quiz.setTitle("Module 1 Quiz");
        quiz.setPassingScore(70);
        quiz.setModule(module);
        quiz.setMaxAttempts(3);
        quizStore.put(701L, quiz);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(601L);
        enrollment.setCourse(course);
        enrollment.setUser(employeeDoc);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollmentStore.put(601L, enrollment);

        // Attempt passed previously
        QuizAttempt attempt = new QuizAttempt();
        attempt.setId(801L);
        attempt.setQuiz(quiz);
        attempt.setUser(employeeDoc);
        attempt.setAttemptNumber(1);
        attempt.setScore(85);
        attempt.setPassed(true);
        attempt.setCompletedAt(LocalDateTime.now().minusHours(2));
        attemptStore.put(801L, attempt);

        QuizProgress progress = new QuizProgress();
        progress.setId(901L);
        progress.setUser(employeeDoc);
        progress.setQuiz(quiz);
        progress.setPassed(true);
        progress.setBestScore(85);
        progress.setAttemptsUsed(1);
        quizProgressStore.put(901L, progress);

        // Check unlock status
        currentUser = employeeDoc;
        Map<String, Object> status = quizService.getQuizUnlockStatus(quiz.getId());
        assertNotNull(status);
        assertTrue(Boolean.TRUE.equals(status.get("alreadyPassed")));
        assertNotNull(status.get("latestAttempt"));

        // Calling startQuiz on completed quiz returns result map without throwing 500 error
        Map<String, Object> startResult = quizService.startQuiz(quiz.getId());
        assertNotNull(startResult);
        assertTrue(Boolean.TRUE.equals(startResult.get("alreadyPassed")));
        assertTrue(Boolean.TRUE.equals(startResult.get("passed")));
        assertEquals(85, startResult.get("score"));
    }

    @Test
    @DisplayName("3. Progress strictly capped at 98% pre-final assessment and reaches 100% post-final")
    void testProgressCappedAt98UntilFinalAssessmentPassed() {
        Course course = new Course();
        course.setId(103L);
        course.setCourseId("FAIR-PROG-01");
        course.setTitle("Customs Compliance Track");
        course.setOwningDepartment(deptOps);
        courseStore.put(103L, course);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(602L);
        enrollment.setCourse(course);
        enrollment.setUser(employeeDoc);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        // Even if raw progress was 100, enrollment is IN_PROGRESS so it must cap at 98%
        enrollment.setProgressPercent(100);
        enrollmentStore.put(602L, enrollment);

        // Verify transcript enforces progress <= 98 cap for IN_PROGRESS
        currentUser = employeeDoc;
        EmployeeTrainingTranscriptDTO transcript = managerReportsService.getEmployeeTrainingTranscript(employeeDoc.getId());
        assertNotNull(transcript);
        assertFalse(transcript.getCourses().isEmpty());

        EmployeeTrainingTranscriptDTO.CourseRecordDTO record = transcript.getCourses().get(0);
        assertEquals(98, record.getProgressPercent(), "IN_PROGRESS course with all lessons completed must be capped at 98%");
        assertEquals("Documentation", record.getEmployeeDepartment());

        // Now learner passes final assessment -> COMPLETED
        enrollment.setStatus(EnrollmentStatus.COMPLETED);
        enrollment.setProgressPercent(100);
        enrollment.setCompletedDate(LocalDateTime.now());

        EmployeeTrainingTranscriptDTO completedTranscript = managerReportsService.getEmployeeTrainingTranscript(employeeDoc.getId());
        EmployeeTrainingTranscriptDTO.CourseRecordDTO completedRecord = completedTranscript.getCourses().get(0);
        assertEquals(100, completedRecord.getProgressPercent(), "COMPLETED enrollment reaches 100%");
    }

    @Test
    @DisplayName("4. Cross-department reporting and department dashboard metrics")
    void testCrossDepartmentReportingAndDashboardMetrics() {
        // Course owned by Operations
        Course course = new Course();
        course.setId(104L);
        course.setCourseId("FAIR-CROSS-01");
        course.setTitle("Global Freight SOP");
        course.setOwningDepartment(deptOps);
        courseStore.put(104L, course);

        // Recommended assignment to Documentation
        CourseDepartmentAssignment da = new CourseDepartmentAssignment();
        da.setId(21L);
        da.setCourse(course);
        da.setDepartment(deptDoc);
        da.setAssignmentType(EnrollmentType.RECOMMENDED);
        assignmentStore.put(21L, da);

        // Documentation employee enrolls and completes
        Enrollment enrollment = new Enrollment();
        enrollment.setId(603L);
        enrollment.setCourse(course);
        enrollment.setUser(employeeDoc);
        enrollment.setStatus(EnrollmentStatus.COMPLETED);
        enrollment.setProgressPercent(100);
        enrollment.setScore(90);
        enrollmentStore.put(603L, enrollment);

        // Documentation Department details
        DepartmentDetailsDTO docDetails = departmentService.getDepartmentDetails(deptDoc.getId());
        assertNotNull(docDetails);
        assertEquals(0, docDetails.getOwnedCoursesCount(), "Documentation owns 0 courses");
        assertEquals(1, docDetails.getAssignedCoursesCount(), "Documentation assigned 1 course");
        assertEquals(100.0, docDetails.getCompletionRate());

        // Operations Department details
        DepartmentDetailsDTO opsDetails = departmentService.getDepartmentDetails(deptOps.getId());
        assertNotNull(opsDetails);
        assertEquals(1, opsDetails.getOwnedCoursesCount(), "Operations owns 1 course");
    }

    @SuppressWarnings("unchecked")
    private <T> T createMockProxy(Class<T> iface, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(
                iface.getClassLoader(),
                new Class<?>[]{iface},
                (proxy, method, args) -> {
                    Object res = handler.invoke(method, args);
                    if (res != null) return res;
                    Class<?> ret = method.getReturnType();
                    if (ret == boolean.class) return false;
                    if (ret == int.class) return 0;
                    if (ret == long.class) return 0L;
                    if (ret == List.class) return Collections.emptyList();
                    if (ret == Optional.class) return Optional.empty();
                    return null;
                }
        );
    }

    @FunctionalInterface
    interface InvocationHandler {
        Object invoke(java.lang.reflect.Method method, Object[] args) throws Throwable;
    }
}
