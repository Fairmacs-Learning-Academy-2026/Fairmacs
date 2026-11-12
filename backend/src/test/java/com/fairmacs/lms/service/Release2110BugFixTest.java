package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Release 2.11.0 Critical Bug Fix Audit Test Suite")
class Release2110BugFixTest {

    private final Map<Long, Course> courseStore = new LinkedHashMap<>();
    private final Map<Long, Department> departmentStore = new LinkedHashMap<>();
    private final Map<Long, User> userStore = new LinkedHashMap<>();
    private final Map<Long, Enrollment> enrollmentStore = new LinkedHashMap<>();
    private final Map<Long, Certificate> certificateStore = new LinkedHashMap<>();
    private final Map<Long, Module> moduleStore = new LinkedHashMap<>();
    private final Map<Long, Lesson> lessonStore = new LinkedHashMap<>();
    private final Map<Long, LessonProgress> lessonProgressStore = new LinkedHashMap<>();
    private final Map<Long, Quiz> quizStore = new LinkedHashMap<>();
    private final Map<Long, QuizQuestion> questionStore = new LinkedHashMap<>();
    private final Map<Long, QuizAttempt> attemptStore = new LinkedHashMap<>();
    private final Map<Long, QuizProgress> quizProgressStore = new LinkedHashMap<>();
    private final Map<Long, CourseDepartmentAssignment> assignmentStore = new LinkedHashMap<>();
    private final Map<Long, CourseThumbnail> thumbnailStore = new LinkedHashMap<>();
    private final Map<Long, RecommendationRule> ruleStore = new LinkedHashMap<>();
    private final Map<Long, LearningPath> learningPathStore = new LinkedHashMap<>();

    private final AtomicLong courseIdSeq = new AtomicLong(100);
    private final AtomicLong certIdSeq = new AtomicLong(1);

    private CertificateService certificateService;
    private EnrollmentService enrollmentService;
    private CourseAuthoringService courseAuthoringService;
    private QuizService quizService;
    private IdSequenceService idSequenceService;

    private User hrAdmin;
    private User employee;
    private Department deptOps;
    private Department deptDoc;
    private Department deptUncategorized;

    private User currentUser;

    @BeforeEach
    void setUp() {
        courseStore.clear();
        departmentStore.clear();
        userStore.clear();
        enrollmentStore.clear();
        certificateStore.clear();
        moduleStore.clear();
        lessonStore.clear();
        lessonProgressStore.clear();
        quizStore.clear();
        questionStore.clear();
        attemptStore.clear();
        quizProgressStore.clear();
        assignmentStore.clear();
        thumbnailStore.clear();
        ruleStore.clear();
        learningPathStore.clear();

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

        deptUncategorized = new Department();
        deptUncategorized.setId(3L);
        deptUncategorized.setName("Uncategorized");
        deptUncategorized.setShortCode("UNC");
        departmentStore.put(3L, deptUncategorized);

        // 2. Users
        hrAdmin = new User();
        hrAdmin.setId(10L);
        hrAdmin.setName("HR Administrator");
        hrAdmin.setRole(Role.HR_ADMIN);
        hrAdmin.setDepartment("Human Resources");
        userStore.put(10L, hrAdmin);

        employee = new User();
        employee.setId(20L);
        employee.setName("John Doe");
        employee.setRole(Role.EMPLOYEE);
        employee.setDepartment("Operations");
        userStore.put(20L, employee);

        currentUser = hrAdmin;

        // 3. SecurityContextUtil stub
        SecurityContextUtil securityContextUtil = new SecurityContextUtil(null) {
            @Override
            public Long getCurrentUserId() {
                return currentUser.getId();
            }

            @Override
            public String getCurrentUserRole() {
                return currentUser.getRole().name();
            }

            @Override
            public boolean hasRole(Role role) {
                return currentUser.getRole() == role;
            }
        };

        // 4. Repositories using dynamic proxies
        CourseRepository courseRepo = createMockProxy(CourseRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findById".equals(name)) {
                Long id = (Long) args[0];
                return Optional.ofNullable(courseStore.get(id));
            }
            if ("findByCourseId".equals(name)) {
                String cid = (String) args[0];
                return courseStore.values().stream().filter(c -> cid.equals(c.getCourseId())).findFirst();
            }
            if ("findAll".equals(name)) {
                return new ArrayList<>(courseStore.values());
            }
            if ("save".equals(name)) {
                Course c = (Course) args[0];
                if (c.getId() == null) c.setId(courseIdSeq.incrementAndGet());
                courseStore.put(c.getId(), c);
                return c;
            }
            if ("delete".equals(name)) {
                Course c = (Course) args[0];
                courseStore.remove(c.getId());
                return null;
            }
            if ("deleteCourseById".equals(name) || "deleteById".equals(name)) {
                Long id = (Long) args[0];
                courseStore.remove(id);
                return null;
            }
            if ("flush".equals(name)) {
                return null;
            }
            return null;
        });

        UserRepository userRepo = createMockProxy(UserRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findById".equals(name)) {
                return Optional.ofNullable(userStore.get((Long) args[0]));
            }
            return null;
        });

        CertificateRepository certRepo = createMockProxy(CertificateRepository.class, (method, args) -> {
            String name = method.getName();
            if ("existsByCourse_Id".equals(name)) {
                Long cid = (Long) args[0];
                return certificateStore.values().stream().anyMatch(c -> c.getCourse() != null && cid.equals(c.getCourse().getId()));
            }
            if ("existsByUserIdAndCourseId".equals(name)) {
                Long uid = (Long) args[0];
                Long cid = (Long) args[1];
                return certificateStore.values().stream().anyMatch(c ->
                        c.getUser() != null && uid.equals(c.getUser().getId())
                                && c.getCourse() != null && cid.equals(c.getCourse().getId()));
            }
            if ("existsByCertificateId".equals(name)) {
                String certId = (String) args[0];
                return certificateStore.values().stream().anyMatch(c -> certId.equals(c.getCertificateId()));
            }
            if ("findByUserId".equals(name)) {
                Long uid = (Long) args[0];
                return certificateStore.values().stream()
                        .filter(c -> c.getUser() != null && uid.equals(c.getUser().getId()))
                        .toList();
            }
            if ("findByCertificateId".equals(name) || "findByCertificateIdWithDetails".equals(name)) {
                String certId = (String) args[0];
                return certificateStore.values().stream()
                        .filter(c -> certId.equals(c.getCertificateId()))
                        .findFirst();
            }
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                Certificate c = (Certificate) args[0];
                if (c.getId() == null) c.setId(certIdSeq.incrementAndGet());
                certificateStore.put(c.getId(), c);
                return c;
            }
            if ("deleteByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                certificateStore.values().removeIf(c -> c.getCourse() != null && cid.equals(c.getCourse().getId()));
                return null;
            }
            if (method.getReturnType().equals(boolean.class) || method.getReturnType().equals(Boolean.class)) {
                return false;
            }
            if (method.getReturnType().equals(List.class)) {
                return Collections.emptyList();
            }
            if (method.getReturnType().equals(Optional.class)) {
                return Optional.empty();
            }
            return null;
        });

        EnrollmentRepository enrollmentRepo = createMockProxy(EnrollmentRepository.class, (method, args) -> {
            String name = method.getName();
            if ("save".equals(name)) {
                Enrollment e = (Enrollment) args[0];
                if (e.getId() == null) e.setId(courseIdSeq.incrementAndGet());
                enrollmentStore.put(e.getId(), e);
                return e;
            }
            if ("findById".equals(name) || "findByIdWithUserAndCourse".equals(name)) {
                return Optional.ofNullable(enrollmentStore.get((Long) args[0]));
            }
            if ("findByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                return enrollmentStore.values().stream().filter(e -> e.getCourse() != null && cid.equals(e.getCourse().getId())).toList();
            }
            if ("findByUserIdAndCourseId".equals(name)) {
                Long uid = (Long) args[0];
                Long cid = (Long) args[1];
                return enrollmentStore.values().stream()
                        .filter(e -> e.getUser() != null && uid.equals(e.getUser().getId())
                                && e.getCourse() != null && cid.equals(e.getCourse().getId()))
                        .findFirst();
            }
            if ("deleteByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                enrollmentStore.values().removeIf(e -> e.getCourse() != null && cid.equals(e.getCourse().getId()));
                return null;
            }
            return null;
        });

        QuizRepository quizRepo = createMockProxy(QuizRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByCourseIdAndType".equals(name)) {
                Long cid = (Long) args[0];
                QuizType type = (QuizType) args[1];
                return quizStore.values().stream()
                        .filter(q -> q.getCourse() != null && cid.equals(q.getCourse().getId()) && q.getType() == type)
                        .toList();
            }
            if ("findById".equals(name)) {
                return Optional.ofNullable(quizStore.get((Long) args[0]));
            }
            if ("deleteByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                quizStore.values().removeIf(q -> q.getCourse() != null && cid.equals(q.getCourse().getId()));
                return null;
            }
            if (method.getReturnType().equals(List.class)) return Collections.emptyList();
            return null;
        });

        QuizProgressRepository quizProgressRepo = createMockProxy(QuizProgressRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByQuizIdAndUserId".equals(name) || "findByQuiz_IdAndUser_Id".equals(name)) {
                Long qid = (Long) args[0];
                Long uid = (Long) args[1];
                return quizProgressStore.values().stream()
                        .filter(qp -> qp.getQuiz() != null && qid.equals(qp.getQuiz().getId())
                                && qp.getUser() != null && uid.equals(qp.getUser().getId()))
                        .findFirst();
            }
            if ("deleteByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                quizProgressStore.values().removeIf(qp -> qp.getQuiz() != null && qp.getQuiz().getCourse() != null && cid.equals(qp.getQuiz().getCourse().getId()));
                return null;
            }
            if ("save".equals(name)) {
                QuizProgress qp = (QuizProgress) args[0];
                if (qp.getId() == null) qp.setId(courseIdSeq.incrementAndGet());
                quizProgressStore.put(qp.getId(), qp);
                return qp;
            }
            if (method.getReturnType().equals(Boolean.TYPE) || method.getReturnType().equals(Boolean.class)) {
                return false;
            }
            return null;
        });

        QuizQuestionRepository questionRepo = createMockProxy(QuizQuestionRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findAllById".equals(name)) {
                Iterable<Long> qids = (Iterable<Long>) args[0];
                List<QuizQuestion> matched = new ArrayList<>();
                for (Long qid : qids) {
                    QuizQuestion q = questionStore.get(qid);
                    if (q != null) matched.add(q);
                }
                return matched;
            }
            if ("findByQuiz_Id".equals(name) || "findByQuizId".equals(name)) {
                Long qid = (Long) args[0];
                return questionStore.values().stream()
                        .filter(q -> q.getQuiz() != null && qid.equals(q.getQuiz().getId()))
                        .toList();
            }
            if ("deleteByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                questionStore.values().removeIf(q -> q.getQuiz() != null && q.getQuiz().getCourse() != null && cid.equals(q.getQuiz().getCourse().getId()));
                return null;
            }
            return Collections.emptyList();
        });

        QuizAttemptRepository attemptRepo = createMockProxy(QuizAttemptRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByAttemptId".equals(name)) {
                String aid = (String) args[0];
                return attemptStore.values().stream()
                        .filter(a -> aid.equals(a.getAttemptId()))
                        .findFirst();
            }
            if ("save".equals(name)) {
                QuizAttempt a = (QuizAttempt) args[0];
                if (a.getId() == null) a.setId(courseIdSeq.incrementAndGet());
                attemptStore.put(a.getId(), a);
                return a;
            }
            if ("deleteByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                attemptStore.values().removeIf(a -> a.getQuiz() != null && a.getQuiz().getCourse() != null && cid.equals(a.getQuiz().getCourse().getId()));
                return null;
            }
            if (method.getReturnType().equals(Optional.class)) {
                return Optional.empty();
            }
            if (method.getReturnType().equals(Boolean.TYPE) || method.getReturnType().equals(Boolean.class)) {
                return false;
            }
            return null;
        });

        LessonProgressRepository lessonProgressRepo = createMockProxy(LessonProgressRepository.class, (method, args) -> {
            if ("deleteByCourseId".equals(method.getName())) {
                Long cid = (Long) args[0];
                lessonProgressStore.values().removeIf(lp -> lp.getLesson() != null && lp.getLesson().getModule() != null
                        && lp.getLesson().getModule().getCourse() != null && cid.equals(lp.getLesson().getModule().getCourse().getId()));
            }
            return Collections.emptyList();
        });

        LessonRepository lessonRepo = createMockProxy(LessonRepository.class, (method, args) -> {
            if ("deleteByCourseId".equals(method.getName())) {
                Long cid = (Long) args[0];
                lessonStore.values().removeIf(l -> l.getModule() != null && l.getModule().getCourse() != null && cid.equals(l.getModule().getCourse().getId()));
            }
            if ("countByModuleCourseId".equals(method.getName())) return (long) lessonStore.size();
            return Collections.emptyList();
        });

        ModuleRepository moduleRepo = createMockProxy(ModuleRepository.class, (method, args) -> {
            if ("deleteByCourseId".equals(method.getName())) {
                Long cid = (Long) args[0];
                moduleStore.values().removeIf(m -> m.getCourse() != null && cid.equals(m.getCourse().getId()));
            }
            return Collections.emptyList();
        });

        CourseDepartmentAssignmentRepository cdaRepo = createMockProxy(CourseDepartmentAssignmentRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByCourse_Id".equals(name)) {
                Long cid = (Long) args[0];
                return assignmentStore.values().stream().filter(a -> a.getCourse() != null && cid.equals(a.getCourse().getId())).toList();
            }
            if ("deleteByCourse_Id".equals(name)) {
                Long cid = (Long) args[0];
                assignmentStore.values().removeIf(a -> a.getCourse() != null && cid.equals(a.getCourse().getId()));
                return null;
            }
            return Collections.emptyList();
        });

        CourseThumbnailRepository ctRepo = createMockProxy(CourseThumbnailRepository.class, (method, args) -> {
            if ("deleteByCourseId".equals(method.getName())) {
                Long cid = (Long) args[0];
                thumbnailStore.values().removeIf(t -> cid.equals(t.getCourseId()));
            }
            return null;
        });

        RecommendationRuleRepository ruleRepo = createMockProxy(RecommendationRuleRepository.class, (method, args) -> {
            if ("deleteByCourseId".equals(method.getName())) {
                Long cid = (Long) args[0];
                ruleStore.values().removeIf(r -> r.getCourse() != null && cid.equals(r.getCourse().getId()));
            }
            return Collections.emptyList();
        });

        LearningPathRepository lpRepo = createMockProxy(LearningPathRepository.class, (method, args) -> {
            if ("findAllWithItems".equals(method.getName())) {
                return new ArrayList<>(learningPathStore.values());
            }
            if ("deleteItemsByCourseId".equals(method.getName())) {
                Long cId = (Long) args[0];
                for (LearningPath lp : learningPathStore.values()) {
                    if (lp.getItems() != null) {
                        lp.getItems().removeIf(item -> item.getCourse() != null && cId.equals(item.getCourse().getId()));
                    }
                }
                return null;
            }
            if ("save".equals(method.getName())) {
                LearningPath lp = (LearningPath) args[0];
                learningPathStore.put(lp.getId(), lp);
                return lp;
            }
            return Collections.emptyList();
        });

        DepartmentRepository deptRepo = createMockProxy(DepartmentRepository.class, (method, args) -> {
            if ("findById".equals(method.getName())) {
                return Optional.ofNullable(departmentStore.get((Long) args[0]));
            }
            return null;
        });

        // 5. IdSequenceService mock
        idSequenceService = new IdSequenceService(null) {
            private final Map<String, Long> seqs = new HashMap<>();

            @Override
            public synchronized String generateCertificateId(String departmentName) {
                String prefix = resolveDepartmentPrefix(departmentName);
                long seq = seqs.compute(prefix, (k, v) -> v == null ? 1L : v + 1);
                return String.format("%s%03d", prefix, seq);
            }
        };

        // 6. Instantiate Services
        certificateService = new CertificateService(
                certRepo,
                userRepo,
                courseRepo,
                securityContextUtil,
                null,
                idSequenceService
        );

        enrollmentService = new EnrollmentService(
                enrollmentRepo,
                courseRepo,
                certificateService,
                securityContextUtil,
                null, // courseMapper
                userRepo,
                null, // notificationService
                deptRepo,
                lessonProgressRepo,
                moduleRepo,
                quizRepo,
                quizProgressRepo
        );

        courseAuthoringService = new CourseAuthoringService(
                null, // categoryRepository
                courseRepo,
                moduleRepo,
                lessonRepo,
                quizRepo,
                questionRepo,
                securityContextUtil,
                deptRepo,
                enrollmentRepo,
                attemptRepo,
                enrollmentService,
                certRepo,
                lessonProgressRepo,
                quizProgressRepo,
                ruleRepo,
                lpRepo,
                null, // objectMapper
                null, // notificationService
                idSequenceService
        );
        courseAuthoringService.setCourseDepartmentAssignmentRepository(cdaRepo);

        quizService = new QuizService(
                quizRepo,
                questionRepo,
                attemptRepo,
                quizProgressRepo,
                userRepo,
                enrollmentRepo,
                lessonProgressRepo,
                moduleRepo,
                lessonRepo,
                new com.fasterxml.jackson.databind.ObjectMapper(),
                enrollmentService,
                securityContextUtil,
                null  // notificationService
        );
    }

    // =========================================================================
    // BUG 1: CERTIFICATE PREFIX & OWNING DEPARTMENT TESTS
    // =========================================================================

    @Test
    @DisplayName("BUG 1 - Test A: Course with category='Uncategorized' and owningDepartment=Operations generates OP-prefixed certificate")
    void testCertificateIdPrefixUsesOwningDepartmentNotCategory() {
        Course course = new Course();
        course.setId(101L);
        course.setCourseId("COURSE-OP-01");
        course.setTitle("Operations Standards");
        course.setCategory("Uncategorized"); // In Phase 1, category is legacy/Uncategorized
        course.setOwningDepartment(deptOps); // Owning department is Operations
        course.setCertificateEligible(true);
        course.setPassingScore(80);
        courseStore.put(101L, course);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(201L);
        enrollment.setUser(employee);
        enrollment.setCourse(course);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollmentStore.put(201L, enrollment);

        Quiz finalQuiz = new Quiz();
        finalQuiz.setId(301L);
        finalQuiz.setCourse(course);
        finalQuiz.setType(QuizType.FINAL);
        finalQuiz.setPassingScore(80);
        quizStore.put(301L, finalQuiz);

        QuizProgress qp = new QuizProgress();
        qp.setId(401L);
        qp.setUser(employee);
        qp.setQuiz(finalQuiz);
        qp.setPassed(true);
        qp.setBestScore(85);
        quizProgressStore.put(401L, qp);

        currentUser = employee;
        CompleteCourseRequest request = new CompleteCourseRequest();
        request.setEnrollmentId(201L);
        request.setCourseId(101L);
        request.setScore(85);

        CertificateDTO certDTO = enrollmentService.completeCourse(request);

        assertNotNull(certDTO, "Certificate DTO must not be null upon completion");
        assertNotNull(certDTO.getCertificateId(), "Certificate ID must be generated");
        assertTrue(certDTO.getCertificateId().startsWith("OP"),
                "Certificate ID must start with OP for Operations department, but got: " + certDTO.getCertificateId());
        assertFalse(certDTO.getCertificateId().startsWith("GEN"),
                "Certificate ID must not fall back to GEN or Uncategorized");
        assertEquals("Operations", certDTO.getCourseCategory(),
                "Course category in CertificateDTO must reflect the owning department name");
    }

    @Test
    @DisplayName("BUG 1 - Test B: Course with category='Uncategorized' and owningDepartment=Documentation generates DOC-prefixed certificate")
    void testCertificateIdPrefixWithDocumentationDepartment() {
        Course course = new Course();
        course.setId(102L);
        course.setCourseId("COURSE-DOC-01");
        course.setTitle("Documentation Standards");
        course.setCategory("Uncategorized");
        course.setOwningDepartment(deptDoc); // Owning department is Documentation
        course.setCertificateEligible(true);
        course.setPassingScore(75);
        courseStore.put(102L, course);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(202L);
        enrollment.setUser(employee);
        enrollment.setCourse(course);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollmentStore.put(202L, enrollment);

        Quiz finalQuiz = new Quiz();
        finalQuiz.setId(302L);
        finalQuiz.setCourse(course);
        finalQuiz.setType(QuizType.FINAL);
        finalQuiz.setPassingScore(75);
        quizStore.put(302L, finalQuiz);

        QuizProgress qp = new QuizProgress();
        qp.setId(402L);
        qp.setUser(employee);
        qp.setQuiz(finalQuiz);
        qp.setPassed(true);
        qp.setBestScore(90);
        quizProgressStore.put(402L, qp);

        currentUser = employee;
        CompleteCourseRequest request = new CompleteCourseRequest();
        request.setEnrollmentId(202L);
        request.setCourseId(102L);
        request.setScore(90);

        CertificateDTO certDTO = enrollmentService.completeCourse(request);

        assertNotNull(certDTO);
        assertTrue(certDTO.getCertificateId().startsWith("DOC"),
                "Certificate ID must start with DOC for Documentation department, but got: " + certDTO.getCertificateId());
        assertEquals("Documentation", certDTO.getCourseCategory());
    }

    @Test
    @DisplayName("BUG 1 - Test C: Missing course ownership throws actionable IllegalStateException")
    void testCertificateGenerationFailsWhenOwningDepartmentMissing() {
        Course course = new Course();
        course.setId(103L);
        course.setCourseId("COURSE-NO-DEPT");
        course.setTitle("Orphan Course");
        course.setCategory("Uncategorized");
        course.setOwningDepartment(null); // No owning department
        course.setCertificateEligible(true);
        courseStore.put(103L, course);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(203L);
        enrollment.setUser(employee);
        enrollment.setCourse(course);
        enrollmentStore.put(203L, enrollment);

        Quiz finalQuiz = new Quiz();
        finalQuiz.setId(303L);
        finalQuiz.setCourse(course);
        finalQuiz.setType(QuizType.FINAL);
        quizStore.put(303L, finalQuiz);

        QuizProgress qp = new QuizProgress();
        qp.setId(403L);
        qp.setUser(employee);
        qp.setQuiz(finalQuiz);
        qp.setPassed(true);
        qp.setBestScore(85);
        quizProgressStore.put(403L, qp);

        currentUser = employee;
        CompleteCourseRequest request = new CompleteCourseRequest();
        request.setEnrollmentId(203L);
        request.setCourseId(103L);
        request.setScore(85);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                enrollmentService.completeCourse(request)
        );

        assertTrue(ex.getMessage().contains("does not have an assigned owning department"),
                "Error message must provide actionable instruction about missing owning department: " + ex.getMessage());
    }

    @Test
    @DisplayName("BUG 1 - Test D: Course with owning department 'Uncategorized' throws actionable IllegalStateException")
    void testCertificateGenerationFailsWhenOwningDepartmentIsUncategorized() {
        Course course = new Course();
        course.setId(104L);
        course.setCourseId("COURSE-UNCAT");
        course.setTitle("Uncategorized Course");
        course.setOwningDepartment(deptUncategorized); // Owning department is "Uncategorized"
        course.setCertificateEligible(true);
        courseStore.put(104L, course);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(204L);
        enrollment.setUser(employee);
        enrollment.setCourse(course);
        enrollmentStore.put(204L, enrollment);

        Quiz finalQuiz = new Quiz();
        finalQuiz.setId(304L);
        finalQuiz.setCourse(course);
        finalQuiz.setType(QuizType.FINAL);
        quizStore.put(304L, finalQuiz);

        QuizProgress qp = new QuizProgress();
        qp.setId(404L);
        qp.setUser(employee);
        qp.setQuiz(finalQuiz);
        qp.setPassed(true);
        qp.setBestScore(85);
        quizProgressStore.put(404L, qp);

        currentUser = employee;
        CompleteCourseRequest request = new CompleteCourseRequest();
        request.setEnrollmentId(204L);
        request.setCourseId(104L);
        request.setScore(85);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                enrollmentService.completeCourse(request)
        );

        assertTrue(ex.getMessage().contains("invalid owning department 'Uncategorized'"),
                "Error message must reject 'Uncategorized' department: " + ex.getMessage());
    }

    @Test
    @DisplayName("BUG 1 - Test E: Module quiz submission does NOT issue certificate or complete course")
    void testModuleQuizSubmissionDoesNotIssueCertificateOrCompleteCourse() {
        Course course = new Course();
        course.setId(105L);
        course.setCourseId("COURSE-MOD-01");
        course.setTitle("Module Quiz Test Course");
        course.setOwningDepartment(deptOps);
        courseStore.put(105L, course);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(205L);
        enrollment.setUser(employee);
        enrollment.setCourse(course);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollmentStore.put(205L, enrollment);

        Quiz moduleQuiz = new Quiz();
        moduleQuiz.setId(305L);
        moduleQuiz.setCourse(course);
        moduleQuiz.setType(QuizType.MODULE); // MODULE quiz, not FINAL
        moduleQuiz.setPassingScore(70);
        quizStore.put(305L, moduleQuiz);

        currentUser = employee;
        CompleteCourseRequest request = new CompleteCourseRequest();
        request.setEnrollmentId(205L);
        request.setCourseId(105L);
        request.setQuizId(305L);
        request.setScore(90);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                enrollmentService.completeCourse(request)
        );

        assertTrue(ex.getMessage().contains("Module quizzes cannot complete a course or generate certificates"),
                "Attempting to complete course with module quiz must be rejected: " + ex.getMessage());
        assertEquals(0, certificateStore.size(), "No certificate must be generated for module quiz");
        assertEquals(EnrollmentStatus.IN_PROGRESS, enrollment.getStatus(), "Enrollment status must remain IN_PROGRESS");
    }

    // =========================================================================
    // BUG 2: COURSE DELETION POLICY & ERROR HANDLING TESTS
    // =========================================================================

    @Test
    @DisplayName("BUG 2 - Test F: Course deletion is blocked when certificates have been issued (Preserves history & certificates)")
    void testCourseDeletionBlockedWhenCertificatesExist() {
        Course course = new Course();
        course.setId(106L);
        course.setCourseId("COURSE-CERT-EXISTS");
        course.setTitle("Certified Course");
        course.setOwningDepartment(deptOps);
        courseStore.put(106L, course);

        Certificate cert = new Certificate();
        cert.setId(501L);
        cert.setCertificateId("OP001");
        cert.setCourse(course);
        cert.setUser(employee);
        certificateStore.put(501L, cert);

        currentUser = hrAdmin;

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                courseAuthoringService.deleteCourse("COURSE-CERT-EXISTS")
        );

        assertTrue(ex.getMessage().contains("certificates have already been issued to employees"),
                "Exception message must mention issued certificates: " + ex.getMessage());
        assertTrue(ex.getMessage().contains("deactivate or archive the course instead"),
                "Exception message must provide actionable advice to deactivate/archive: " + ex.getMessage());

        // Verify records remain completely preserved in database
        assertTrue(courseStore.containsKey(106L), "Course must not be deleted from database");
        assertTrue(certificateStore.containsKey(501L), "Certificate must not be deleted from database");
    }

    @Test
    @DisplayName("BUG 2 - Test G: Course deletion is blocked when employees have completed the course (Preserves training history)")
    void testCourseDeletionBlockedWhenCompletedEnrollmentsExist() {
        Course course = new Course();
        course.setId(107L);
        course.setCourseId("COURSE-COMPLETED");
        course.setTitle("Completed Training Course");
        course.setOwningDepartment(deptOps);
        courseStore.put(107L, course);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(207L);
        enrollment.setUser(employee);
        enrollment.setCourse(course);
        enrollment.setStatus(EnrollmentStatus.COMPLETED); // Employee completed course
        enrollmentStore.put(207L, enrollment);

        currentUser = hrAdmin;

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                courseAuthoringService.deleteCourse("COURSE-COMPLETED")
        );

        assertTrue(ex.getMessage().contains("employees have completed this course"),
                "Exception message must mention course completion: " + ex.getMessage());
        assertTrue(ex.getMessage().contains("deactivate or archive the course instead"),
                "Exception message must provide actionable advice to deactivate/archive: " + ex.getMessage());

        // Verify records remain preserved
        assertTrue(courseStore.containsKey(107L), "Course must not be deleted");
        assertTrue(enrollmentStore.containsKey(207L), "Completed enrollment record must not be deleted");
    }

    @Test
    @DisplayName("BUG 2 - Test H: Safe course deletion succeeds for drafts or courses without completions/certificates")
    void testSafeCourseDeletionSucceedsForDraftOrUncompletedCourse() {
        Course course = new Course();
        course.setId(108L);
        course.setCourseId("COURSE-DRAFT-01");
        course.setTitle("Draft Course To Delete");
        course.setDraft(true);
        course.setOwningDepartment(deptOps);
        courseStore.put(108L, course);

        // Add dependent records across the dependency tree
        Module mod = new Module();
        mod.setId(601L);
        mod.setCourse(course);
        moduleStore.put(601L, mod);

        Lesson lesson = new Lesson();
        lesson.setId(701L);
        lesson.setModule(mod);
        lessonStore.put(701L, lesson);

        Quiz quiz = new Quiz();
        quiz.setId(801L);
        quiz.setCourse(course);
        quizStore.put(801L, quiz);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(208L);
        enrollment.setUser(employee);
        enrollment.setCourse(course);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS); // In-progress only, NOT completed
        enrollmentStore.put(208L, enrollment);

        CourseDepartmentAssignment cda = new CourseDepartmentAssignment();
        cda.setId(901L);
        cda.setCourse(course);
        cda.setDepartment(deptOps);
        assignmentStore.put(901L, cda);

        currentUser = hrAdmin;

        assertDoesNotThrow(() -> courseAuthoringService.deleteCourse("COURSE-DRAFT-01"));

        // Verify all dependent items and course were deleted
        assertFalse(courseStore.containsKey(108L), "Course must be deleted");
        assertFalse(moduleStore.containsKey(601L), "Modules must be deleted");
        assertFalse(lessonStore.containsKey(701L), "Lessons must be deleted");
        assertFalse(quizStore.containsKey(801L), "Quizzes must be deleted");
        assertFalse(enrollmentStore.containsKey(208L), "Uncompleted enrollment must be deleted");
        assertFalse(assignmentStore.containsKey(901L), "Department assignments must be deleted");
    }

    @Test
    @DisplayName("BUG 2 - Test I: setCourseActive deactivates and activates course cleanly")
    void testSetCourseActiveDeactivatesAndActivatesCourse() {
        Course course = new Course();
        course.setId(109L);
        course.setCourseId("COURSE-TOGGLE-STATUS");
        course.setTitle("Toggle Status Course");
        course.setActive(true);
        course.setOwningDepartment(deptOps);
        courseStore.put(109L, course);

        currentUser = hrAdmin;

        CourseDTO deactivated = courseAuthoringService.setCourseActive("COURSE-TOGGLE-STATUS", false);
        assertNotNull(deactivated);
        assertFalse(course.getActive(), "Course active flag must be false");
        assertEquals(Boolean.FALSE, deactivated.getActive());

        CourseDTO activated = courseAuthoringService.setCourseActive("COURSE-TOGGLE-STATUS", true);
        assertNotNull(activated);
        assertTrue(course.getActive(), "Course active flag must be true");
        assertEquals(Boolean.TRUE, activated.getActive());
    }

    @Test
    @DisplayName("BUG FIX: submitQuiz handles null maxAttempts (unlimited attempts) without throwing NPE on remainingAttemptsCount")
    void testSubmitQuizWithNullMaxAttemptsDoesNotThrowNPE() {
        Course course = new Course();
        course.setId(110L);
        course.setCourseId("COURSE-UNLIMITED-QUIZ");
        course.setTitle("Unlimited Quiz Course");
        course.setActive(true);
        courseStore.put(110L, course);

        Quiz quiz = new Quiz();
        quiz.setId(802L);
        quiz.setQuizId("QZ-UNLIMITED-01");
        quiz.setTitle("Unlimited Attempts Quiz");
        quiz.setType(QuizType.MODULE);
        quiz.setPassingScore(80);
        quiz.setActive(true);
        quiz.setMaxAttempts(null); // Explicitly null per Flyway V10!
        quiz.setCooldownMinutes(5);
        quiz.setCourse(course);
        quizStore.put(802L, quiz);

        QuizQuestion question = new QuizQuestion();
        question.setId(751L);
        question.setQuiz(quiz);
        question.setQuestionId("QQ-UNLIMITED-01");
        question.setQuestionText("Test Question");
        question.setCorrectAnswer("A");
        questionStore.put(751L, question);

        QuizProgress progress = new QuizProgress();
        progress.setId(651L);
        progress.setQuiz(quiz);
        progress.setUser(employee);
        progress.setAttemptsUsed(0);
        progress.setPassed(false);
        quizProgressStore.put(651L, progress);

        QuizAttempt attempt = new QuizAttempt();
        attempt.setId(551L);
        attempt.setAttemptId("ATTEMPT-UUID-UNLIMITED");
        attempt.setAttemptNumber(1);
        attempt.setQuiz(quiz);
        attempt.setUser(employee);
        attempt.setQuestionIds("[751]");
        attempt.setStartedAt(LocalDateTime.now().minusMinutes(5));
        attemptStore.put(551L, attempt);

        currentUser = employee;

        // Wire a mock notificationService to QuizService to test emitQuizSubmissionNotifications path with non-null service
        NotificationService mockNotifService = new NotificationService(null, null) {
            @Override
            public Notification createNotificationSafely(
                    Long recipientUserId,
                    String title,
                    String message,
                    String type,
                    String priority,
                    String referenceType,
                    String referenceId,
                    String actionUrl,
                    String deduplicationKey,
                    Map<String, Object> metadata
            ) {
                return null;
            }
        };
        quizService.setNotificationService(mockNotifService);

        // Submit quiz: passing score
        Map<String, String> answers = Map.of(String.valueOf(751L), "A");
        assertDoesNotThrow(() -> {
            Map<String, Object> result = quizService.submitQuiz("ATTEMPT-UUID-UNLIMITED", answers, 60);
            assertNotNull(result);
            assertTrue((Boolean) result.get("quizPassed"));
            assertNull(result.get("remainingAttempts"), "Remaining attempts must be null for unlimited attempts");
        });

        // Submit another attempt: failing score
        QuizAttempt failAttempt = new QuizAttempt();
        failAttempt.setId(552L);
        failAttempt.setAttemptId("ATTEMPT-UUID-UNLIMITED-FAIL");
        failAttempt.setAttemptNumber(2);
        failAttempt.setQuiz(quiz);
        failAttempt.setUser(employee);
        failAttempt.setQuestionIds("[751]");
        failAttempt.setStartedAt(LocalDateTime.now().minusMinutes(5));
        attemptStore.put(552L, failAttempt);

        Map<String, String> wrongAnswers = Map.of(String.valueOf(751L), "B");
        assertDoesNotThrow(() -> {
            Map<String, Object> result = quizService.submitQuiz("ATTEMPT-UUID-UNLIMITED-FAIL", wrongAnswers, 60);
            assertNotNull(result);
            assertFalse((Boolean) result.get("passed"), "Current attempt must not be passed");
            assertTrue((Boolean) result.get("quizPassed"), "Overall quiz progress remains passed from attempt 1");
            assertNull(result.get("remainingAttempts"), "Remaining attempts must be null for unlimited attempts");
        });
    }

    @SuppressWarnings("unchecked")
    private <T> T createMockProxy(Class<T> intf, ProxyInvocationHandler handler) {
        return (T) Proxy.newProxyInstance(
                intf.getClassLoader(),
                new Class<?>[]{intf},
                (proxy, method, args) -> handler.handle(method, args)
        );
    }

    @FunctionalInterface
    interface ProxyInvocationHandler {
        Object handle(java.lang.reflect.Method method, Object[] args) throws Throwable;
    }
}
