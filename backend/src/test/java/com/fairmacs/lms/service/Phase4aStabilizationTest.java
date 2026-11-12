package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.EmployeeTrainingTranscriptDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Phase 4A: Course Catalog, Course History, Assessments & Completion Stabilization Test Suite")
class Phase4aStabilizationTest {

    private final Map<Long, Course> courseStore = new LinkedHashMap<>();
    private final Map<Long, Certificate> certStore = new LinkedHashMap<>();
    private final Map<Long, User> userStore = new LinkedHashMap<>();
    private final Map<Long, Enrollment> enrollmentStore = new LinkedHashMap<>();
    private final Map<Long, LessonProgress> lessonProgressStore = new LinkedHashMap<>();
    private final Map<Long, QuizProgress> quizProgressStore = new LinkedHashMap<>();
    private final Map<Long, QuizAttempt> quizAttemptStore = new LinkedHashMap<>();
    private final Map<Long, Quiz> quizStore = new LinkedHashMap<>();
    private final Map<Long, Module> moduleStore = new LinkedHashMap<>();
    private final Map<Long, Lesson> lessonStore = new LinkedHashMap<>();
    private final Map<Long, Department> departmentStore = new LinkedHashMap<>();

    private QuizService quizService;
    private EnrollmentService enrollmentService;
    private LessonProgressService lessonProgressService;
    private ManagerReportsService managerReportsService;
    private DepartmentService departmentService;
    private CertificateService certificateService;
    private CourseMapper courseMapper;

    private User employeeOps;
    private User managerOps;
    private Course docCourse;
    private Quiz moduleQuiz;
    private Quiz finalQuiz;
    private Enrollment opsEnrollment;

    private Long currentMockUserId;

    @BeforeEach
    void setup() {
        courseStore.clear();
        certStore.clear();
        userStore.clear();
        enrollmentStore.clear();
        lessonProgressStore.clear();
        quizProgressStore.clear();
        quizAttemptStore.clear();
        quizStore.clear();
        moduleStore.clear();
        lessonStore.clear();
        departmentStore.clear();

        // Setup users
        employeeOps = new User();
        employeeOps.setId(101L);
        employeeOps.setEmployeeId("EMP1001");
        employeeOps.setName("Arjun Kumar");
        employeeOps.setEmail("arjun.kumar@fairmacs.com");
        employeeOps.setDepartment("Operations");
        employeeOps.setDesignation("Operations Specialist");
        employeeOps.setRole(Role.EMPLOYEE);
        userStore.put(employeeOps.getId(), employeeOps);

        managerOps = new User();
        managerOps.setId(201L);
        managerOps.setEmployeeId("MGR1001");
        managerOps.setName("Ravi Shankar");
        managerOps.setEmail("ravi.shankar@fairmacs.com");
        managerOps.setDepartment("Operations");
        managerOps.setDesignation("Operations Manager");
        managerOps.setRole(Role.MANAGER);
        userStore.put(managerOps.getId(), managerOps);

        // Setup departments
        Department deptOps = new Department();
        deptOps.setId(1L);
        deptOps.setName("Operations");
        departmentStore.put(1L, deptOps);

        Department deptDoc = new Department();
        deptDoc.setId(2L);
        deptDoc.setName("Documentation");
        departmentStore.put(2L, deptDoc);

        Department deptIT = new Department();
        deptIT.setId(3L);
        deptIT.setName("Information Technology");
        departmentStore.put(3L, deptIT);

        Department deptGen = new Department();
        deptGen.setId(4L);
        deptGen.setName("General");
        departmentStore.put(4L, deptGen);

        // Setup course owned by Documentation
        docCourse = new Course();
        docCourse.setId(501L);
        docCourse.setCourseId("DOC001");
        docCourse.setTitle("Bill of Lading & Documentation Fundamentals");
        docCourse.setCategory("Documentation");
        docCourse.setDurationHours(2.5);
        docCourse.setPassingScore(70);
        docCourse.setCertificateEligible(true);
        docCourse.setActive(true);
        docCourse.setOwningDepartment(deptDoc);
        courseStore.put(docCourse.getId(), docCourse);

        // Modules & Lessons
        Module mod1 = new Module();
        mod1.setId(601L);
        mod1.setCourse(docCourse);
        mod1.setTitle("Module 1: Shipping Documentation");
        mod1.setOrderIndex(1);
        moduleStore.put(mod1.getId(), mod1);

        Lesson l1 = new Lesson();
        l1.setId(701L);
        l1.setModule(mod1);
        l1.setTitle("Lesson 1.1: Bill of Lading Basics");
        lessonStore.put(l1.getId(), l1);

        Lesson l2 = new Lesson();
        l2.setId(702L);
        l2.setModule(mod1);
        l2.setTitle("Lesson 1.2: Consignee & Notify Party");
        lessonStore.put(l2.getId(), l2);

        // Module Quiz
        moduleQuiz = new Quiz();
        moduleQuiz.setId(801L);
        moduleQuiz.setCourse(docCourse);
        moduleQuiz.setModule(mod1);
        moduleQuiz.setTitle("Module 1 Quiz");
        moduleQuiz.setType(QuizType.MODULE);
        moduleQuiz.setPassingScore(70);
        moduleQuiz.setMaxAttempts(3);
        moduleQuiz.setCooldownMinutes(5);
        quizStore.put(moduleQuiz.getId(), moduleQuiz);

        // Final Quiz
        finalQuiz = new Quiz();
        finalQuiz.setId(802L);
        finalQuiz.setCourse(docCourse);
        finalQuiz.setTitle("Final Assessment: Documentation Mastery");
        finalQuiz.setType(QuizType.FINAL);
        finalQuiz.setPassingScore(70);
        finalQuiz.setMaxAttempts(3);
        finalQuiz.setCooldownMinutes(5);
        quizStore.put(finalQuiz.getId(), finalQuiz);

        // Single authoritative enrollment: recommended course for employeeOps
        opsEnrollment = new Enrollment();
        opsEnrollment.setId(901L);
        opsEnrollment.setUser(employeeOps);
        opsEnrollment.setCourse(docCourse);
        opsEnrollment.setEnrollmentType(EnrollmentType.RECOMMENDED);
        opsEnrollment.setStatus(EnrollmentStatus.NOT_STARTED);
        opsEnrollment.setProgressPercent(0);
        opsEnrollment.setEnrolledAt(LocalDateTime.now().minusDays(2));
        enrollmentStore.put(opsEnrollment.getId(), opsEnrollment);

        currentMockUserId = employeeOps.getId();

        // Create Repository Proxies
        EnrollmentRepository enrollmentRepo = createMockRepo(EnrollmentRepository.class, enrollmentStore);
        UserRepository userRepo = createMockRepo(UserRepository.class, userStore);
        CourseRepository courseRepo = createMockRepo(CourseRepository.class, courseStore);
        DepartmentRepository deptRepo = createMockRepo(DepartmentRepository.class, departmentStore);
        LessonProgressRepository lessonProgressRepo = createMockRepo(LessonProgressRepository.class, lessonProgressStore);
        QuizProgressRepository quizProgressRepo = createMockRepo(QuizProgressRepository.class, quizProgressStore);
        QuizAttemptRepository quizAttemptRepo = createMockRepo(QuizAttemptRepository.class, quizAttemptStore);
        QuizRepository quizRepo = createMockRepo(QuizRepository.class, quizStore);
        ModuleRepository moduleRepo = createMockRepo(ModuleRepository.class, moduleStore);
        LessonRepository lessonRepo = createMockRepo(LessonRepository.class, lessonStore);
        CertificateRepository certRepo = createMockRepo(CertificateRepository.class, certStore);

        // Security Context stub
        SecurityContextUtil securityContextUtil = new SecurityContextUtil(userRepo) {
            @Override
            public Long getCurrentUserId() {
                return currentMockUserId;
            }
            @Override
            public User getCurrentUser() {
                return userStore.get(currentMockUserId);
            }
            @Override
            public String getCurrentUserRole() {
                User u = userStore.get(currentMockUserId);
                return u != null && u.getRole() != null ? u.getRole().name() : "EMPLOYEE";
            }
        };

        certificateService = new CertificateService(
                certRepo,
                userRepo,
                courseRepo,
                securityContextUtil,
                null,
                new IdSequenceService(null) {
                    private final AtomicLong certCounter = new AtomicLong(100);
                    @Override
                    public synchronized String generateCertificateId(String departmentName) {
                        return "CERT-FMC-" + certCounter.incrementAndGet();
                    }
                }
        );

        enrollmentService = new EnrollmentService(
                enrollmentRepo,
                courseRepo,
                certificateService,
                securityContextUtil,
                courseMapper,
                userRepo,
                null,
                deptRepo,
                lessonProgressRepo,
                moduleRepo,
                quizRepo,
                quizProgressRepo
        );

        lessonProgressService = new LessonProgressService(
                lessonProgressRepo,
                enrollmentRepo,
                lessonRepo,
                securityContextUtil,
                quizRepo,
                quizProgressRepo,
                null
        );

        quizService = new QuizService(
                quizRepo,
                null,
                quizAttemptRepo,
                quizProgressRepo,
                userRepo,
                enrollmentRepo,
                lessonProgressRepo,
                moduleRepo,
                lessonRepo,
                new ObjectMapper(),
                enrollmentService,
                securityContextUtil,
                null
        );

        managerReportsService = new ManagerReportsService(
                userRepo,
                enrollmentRepo
        );

        departmentService = new DepartmentService(
                deptRepo,
                userRepo,
                enrollmentRepo,
                courseRepo
        );

        courseMapper = new CourseMapper(new ObjectMapper(), quizRepo);
    }

    @Test
    @DisplayName("Bug 2 Fix: Reopening completed module quiz returns passed result without 500 error")
    void testReopeningCompletedModuleQuizReturnsPassedResultWithout500() {
        // Record completed attempt and quiz progress as passed
        QuizProgress qp = new QuizProgress();
        qp.setId(1L);
        qp.setUser(employeeOps);
        qp.setQuiz(moduleQuiz);
        qp.setPassed(true);
        qp.setBestScore(85);
        qp.setAttemptsUsed(1);
        quizProgressStore.put(qp.getId(), qp);

        QuizAttempt attempt = new QuizAttempt();
        attempt.setId(1L);
        attempt.setAttemptId("ATT-MOD-001");
        attempt.setUser(employeeOps);
        attempt.setQuiz(moduleQuiz);
        attempt.setScore(85);
        attempt.setPassed(true);
        attempt.setCompletedAt(LocalDateTime.now().minusHours(1));
        attempt.setCorrectAnswers(9);
        attempt.setWrongAnswers(1);
        attempt.setTotalQuestions(10);
        quizAttemptStore.put(attempt.getId(), attempt);

        // 1. Check unlock status returns alreadyPassed and latestAttempt
        Map<String, Object> unlockStatus = quizService.getQuizUnlockStatus(moduleQuiz.getId());
        assertNotNull(unlockStatus);
        assertEquals(Boolean.TRUE, unlockStatus.get("alreadyPassed"));
        assertEquals(Boolean.TRUE, unlockStatus.get("unlocked"));
        assertEquals(Boolean.FALSE, unlockStatus.get("cooldownActive"));
        assertNotNull(unlockStatus.get("latestAttempt"));

        // 2. Call startQuiz - must return review data gracefully instead of throwing 500 IllegalStateException
        Map<String, Object> startResult = quizService.startQuiz(moduleQuiz.getId());
        assertNotNull(startResult);
        assertEquals(Boolean.TRUE, startResult.get("alreadyPassed"));
        assertEquals(Boolean.TRUE, startResult.get("passed"));
        assertEquals(85, startResult.get("score"));
        assertEquals("ATT-MOD-001", startResult.get("attemptId"));
    }

    @Test
    @DisplayName("Module Quiz Retake: Enforce backend-calculated 5-minute cooldown on failed attempt")
    void testFailedAttemptEnforces5MinuteCooldown() {
        // User failed quiz 10 minutes ago
        LocalDateTime failedAt = LocalDateTime.now().minusMinutes(2);

        QuizAttempt failedAttempt = new QuizAttempt();
        failedAttempt.setId(2L);
        failedAttempt.setAttemptId("ATT-FAIL-001");
        failedAttempt.setUser(employeeOps);
        failedAttempt.setQuiz(moduleQuiz);
        failedAttempt.setScore(50);
        failedAttempt.setPassed(false);
        failedAttempt.setCompletedAt(failedAt);
        quizAttemptStore.put(failedAttempt.getId(), failedAttempt);

        // Cooldown should be active (cooldown duration = 30 minutes, 20 minutes remaining)
        Map<String, Object> cooldownStatus = quizService.getCooldownStatus(moduleQuiz.getId(), employeeOps.getId());
        assertTrue(Boolean.TRUE.equals(cooldownStatus.get("cooldownActive")), "Cooldown must be active within 5 minutes of failure");
        assertEquals(5, cooldownStatus.get("cooldownMinutes"));
        assertTrue(((Number) cooldownStatus.get("remainingSeconds")).longValue() > 0);
        assertTrue(String.valueOf(cooldownStatus.get("message")).contains("5 minutes"));

        // Calling startQuiz during cooldown must be blocked
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> quizService.startQuiz(moduleQuiz.getId()));
        assertTrue(ex.getMessage().contains("You failed this assessment"));

        // After 31 minutes have elapsed:
        failedAttempt.setCompletedAt(LocalDateTime.now().minusMinutes(6));
        Map<String, Object> postCooldown = quizService.getCooldownStatus(moduleQuiz.getId(), employeeOps.getId());
        assertFalse(Boolean.TRUE.equals(postCooldown.get("cooldownActive")), "Cooldown must end after 5 minutes");
    }

    @Test
    @DisplayName("Progress Calculation & 98% Cap: All lessons and module quizzes complete = strictly 98% pre-final")
    void testPreFinalProgressCappedAt98Percent() {
        // Mark both lessons completed
        LessonProgress lp1 = new LessonProgress();
        lp1.setId(1L);
        lp1.setEnrollment(opsEnrollment);
        lp1.setLesson(lessonStore.get(701L));
        lp1.setCompleted(true);
        lessonProgressStore.put(1L, lp1);

        LessonProgress lp2 = new LessonProgress();
        lp2.setId(2L);
        lp2.setEnrollment(opsEnrollment);
        lp2.setLesson(lessonStore.get(702L));
        lp2.setCompleted(true);
        lessonProgressStore.put(2L, lp2);

        // Mark module quiz passed
        QuizProgress qp = new QuizProgress();
        qp.setId(1L);
        qp.setUser(employeeOps);
        qp.setQuiz(moduleQuiz);
        qp.setPassed(true);
        quizProgressStore.put(1L, qp);

        // Update progress via lesson progress service
        lessonProgressService.updateProgress(opsEnrollment.getId(), 701L, 100, 300, 300);

        // Progress must be capped strictly at 98% because final assessment is not passed
        assertEquals(98, opsEnrollment.getProgressPercent(), "Pre-final progress must be strictly capped at 98%");
        assertNotEquals(EnrollmentStatus.COMPLETED, opsEnrollment.getStatus(), "Course must NOT be marked complete pre-final");
    }

    @Test
    @DisplayName("Certificate Eligibility: Passing final assessment sets 100% and generates certificate")
    void testFinalAssessmentPassSets100PercentAndGeneratesCertificate() {
        // Mark lessons and module quiz complete
        LessonProgress lp1 = new LessonProgress();
        lp1.setId(1L);
        lp1.setEnrollment(opsEnrollment);
        lp1.setLesson(lessonStore.get(701L));
        lp1.setCompleted(true);
        lessonProgressStore.put(1L, lp1);

        LessonProgress lp2 = new LessonProgress();
        lp2.setId(2L);
        lp2.setEnrollment(opsEnrollment);
        lp2.setLesson(lessonStore.get(702L));
        lp2.setCompleted(true);
        lessonProgressStore.put(2L, lp2);

        QuizProgress qpMod = new QuizProgress();
        qpMod.setId(1L);
        qpMod.setUser(employeeOps);
        qpMod.setQuiz(moduleQuiz);
        qpMod.setPassed(true);
        quizProgressStore.put(1L, qpMod);

        // Pass final assessment
        QuizProgress qpFinal = new QuizProgress();
        qpFinal.setId(2L);
        qpFinal.setUser(employeeOps);
        qpFinal.setQuiz(finalQuiz);
        qpFinal.setPassed(true);
        qpFinal.setBestScore(95);
        quizProgressStore.put(2L, qpFinal);

        CompleteCourseRequest req = new CompleteCourseRequest();
        req.setEnrollmentId(opsEnrollment.getId());
        req.setCourseId(docCourse.getId());
        req.setScore(95);

        CertificateDTO cert = enrollmentService.completeCourse(req);

        assertNotNull(cert, "Certificate must be generated upon passing final assessment");
        assertEquals(EnrollmentStatus.COMPLETED, opsEnrollment.getStatus(), "Course status must be COMPLETED");
        assertEquals(100, opsEnrollment.getProgressPercent(), "Progress must be 100% upon passing final assessment");
        assertNotNull(opsEnrollment.getCertificateId(), "Enrollment must record certificate ID");
    }

    @Test
    @DisplayName("Module Quizzes must NEVER mark course complete or generate certificate")
    void testModuleQuizPassNeverGeneratesCertificate() {
        // Module quiz passed, but final quiz has NOT been passed
        QuizProgress qpMod = new QuizProgress();
        qpMod.setId(1L);
        qpMod.setUser(employeeOps);
        qpMod.setQuiz(moduleQuiz);
        qpMod.setPassed(true);
        quizProgressStore.put(1L, qpMod);

        CompleteCourseRequest req = new CompleteCourseRequest();
        req.setEnrollmentId(opsEnrollment.getId());
        req.setCourseId(docCourse.getId());
        req.setScore(80);
        req.setQuizId(moduleQuiz.getId());

        // Must reject course completion attempt with module quiz
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> enrollmentService.completeCourse(req));
        assertTrue(ex.getMessage().contains("Module quizzes cannot complete a course") || ex.getMessage().contains("Pass the final assessment"));
        assertNull(opsEnrollment.getCertificateId(), "No certificate must be generated for module quiz");
        assertNotEquals(EnrollmentStatus.COMPLETED, opsEnrollment.getStatus());
    }

    @Test
    @DisplayName("Cross-Department Recommended Course Completion: Visible in home & owning departments with single enrollment")
    void testCrossDepartmentRecommendedCourseVisibilityWithoutDuplicateEnrollments() {
        // Employee is from Operations. Course is owned by Documentation.
        // Complete the course:
        opsEnrollment.setStatus(EnrollmentStatus.COMPLETED);
        opsEnrollment.setProgressPercent(100);
        opsEnrollment.setScore(90);

        // 1. Single authoritative enrollment count
        long totalEnrollments = enrollmentStore.values().stream()
                .filter(e -> e.getUser().getId().equals(employeeOps.getId()) && e.getCourse().getId().equals(docCourse.getId()))
                .count();
        assertEquals(1, totalEnrollments, "Exactly one authoritative enrollment must exist (no duplicate rows created for reporting)");

        // 2. Visible in employee's home department (Operations) courses
        var opsCourses = departmentService.getCoursesByDepartment(1L);
        assertTrue(opsCourses.stream().anyMatch(c -> c.getCourseId().equals(docCourse.getId())),
                "Cross-department course completion must be visible in home department (Operations)");

        // 3. Visible in course-owning department (Documentation) courses
        var docCourses = departmentService.getCoursesByDepartment(2L);
        assertTrue(docCourses.stream().anyMatch(c -> c.getCourseId().equals(docCourse.getId())),
                "Cross-department course completion must be visible in course-owning department (Documentation)");

        // 4. Visible in employee's personal transcript
        EmployeeTrainingTranscriptDTO transcript = managerReportsService.getEmployeeTrainingTranscript(employeeOps.getId());
        assertNotNull(transcript);
        assertEquals(1, transcript.getCourses().size());
        assertEquals("DOC001", transcript.getCourses().get(0).getCourseId());
        assertEquals("Documentation", transcript.getCourses().get(0).getCourseDepartment());
        assertEquals("Recommended", transcript.getCourses().get(0).getAssignmentType());
    }

    @Test
    @DisplayName("Mandatory vs Recommended Classification in Course DTO and History")
    void testMandatoryVsRecommendedClassification() {
        CourseDTO dto = courseMapper.toSummary(docCourse, opsEnrollment, null);
        assertEquals("Recommended", dto.getAssignmentType(), "Recommended enrollment must have 'Recommended' assignment type");

        opsEnrollment.setEnrollmentType(EnrollmentType.MANDATORY);
        CourseDTO dtoMandatory = courseMapper.toSummary(docCourse, opsEnrollment, null);
        assertEquals("Mandatory", dtoMandatory.getAssignmentType(), "Mandatory enrollment must have 'Mandatory' assignment type");
    }

    @Test
    @DisplayName("Department Renames: General and Information Technology preserved safely")
    void testDepartmentRenames() {
        Department itDept = departmentStore.get(3L);
        assertEquals("Information Technology", itDept.getName());

        Department genDept = departmentStore.get(4L);
        assertEquals("General", genDept.getName());
    }

    // Dynamic repository proxy helper
    @SuppressWarnings("unchecked")
    private <T> T createMockRepo(Class<T> repoInterface, Map<Long, ?> store) {
        return (T) Proxy.newProxyInstance(
                repoInterface.getClassLoader(),
                new Class<?>[]{repoInterface},
                (proxy, method, args) -> {
                    String methodName = method.getName();

                    if ("findById".equals(methodName)) {
                        Long id = (Long) args[0];
                        return Optional.ofNullable(store.get(id));
                    }
                    if ("save".equals(methodName) || "saveAndFlush".equals(methodName)) {
                        Object entity = args[0];
                        if (entity instanceof Certificate c) {
                            if (c.getId() == null) c.setId((long) (certStore.size() + 1));
                            certStore.put(c.getId(), c);
                        } else if (entity instanceof Enrollment e) {
                            if (e.getId() == null) e.setId(201L);
                            enrollmentStore.put(e.getId(), e);
                        }
                        return entity;
                    }
                    if ("findAll".equals(methodName)) {
                        return new ArrayList<>(store.values());
                    }
                    if ("findByUserIdWithCourse".equals(methodName)) {
                        Long uid = (Long) args[0];
                        List<Enrollment> list = new ArrayList<>();
                        for (Object o : store.values()) {
                            if (o instanceof Enrollment e && e.getUser() != null && e.getUser().getId().equals(uid)) {
                                list.add(e);
                            }
                        }
                        return list;
                    }
                    if ("findByUserIdAndCourseId".equals(methodName)) {
                        Long uid = (Long) args[0];
                        Long cid = (Long) args[1];
                        for (Object o : store.values()) {
                            if (o instanceof Enrollment e && e.getUser() != null && e.getUser().getId().equals(uid) && e.getCourse() != null && e.getCourse().getId().equals(cid)) {
                                return Optional.of(e);
                            }
                        }
                        return Optional.empty();
                    }
                    if ("findByIdWithUserAndCourse".equals(methodName)) {
                        Long eid = (Long) args[0];
                        return Optional.ofNullable(store.get(eid));
                    }
                    if ("findByCourseId".equals(methodName)) {
                        Long cid = (Long) args[0];
                        List<Enrollment> list = new ArrayList<>();
                        for (Object o : store.values()) {
                            if (o instanceof Enrollment e && e.getCourse() != null && e.getCourse().getId().equals(cid)) {
                                list.add(e);
                            }
                        }
                        return list;
                    }
                    if ("findByCourseIdAndType".equals(methodName)) {
                        Long cid = (Long) args[0];
                        QuizType type = (QuizType) args[1];
                        List<Quiz> list = new ArrayList<>();
                        for (Object o : store.values()) {
                            if (o instanceof Quiz q && q.getCourse() != null && q.getCourse().getId().equals(cid) && q.getType() == type) {
                                list.add(q);
                            }
                        }
                        return list;
                    }
                    if ("findByModuleId".equals(methodName)) {
                        Long mid = (Long) args[0];
                        for (Object o : store.values()) {
                            if (o instanceof Quiz q && q.getModule() != null && q.getModule().getId().equals(mid)) {
                                return Optional.of(q);
                            }
                        }
                        return Optional.empty();
                    }
                    if ("findByCourseIdOrderByOrderIndexAsc".equals(methodName)) {
                        Long cid = (Long) args[0];
                        List<Module> list = new ArrayList<>();
                        for (Object o : store.values()) {
                            if (o instanceof Module m && m.getCourse() != null && m.getCourse().getId().equals(cid)) {
                                list.add(m);
                            }
                        }
                        return list;
                    }
                    if ("findByCertificateId".equals(methodName) || "findByCertificateIdWithDetails".equals(methodName)) {
                        String cid = (String) args[0];
                        for (Certificate c : certStore.values()) {
                            if (cid != null && cid.equals(c.getCertificateId())) {
                                return Optional.of(c);
                            }
                        }
                        return Optional.empty();
                    }
                    if ("existsByCertificateId".equals(methodName)) {
                        String cid = (String) args[0];
                        return certStore.values().stream().anyMatch(c -> cid != null && cid.equals(c.getCertificateId()));
                    }
                    if ("findByEnrollmentId".equals(methodName)) {
                        Long eid = (Long) args[0];
                        List<LessonProgress> list = new ArrayList<>();
                        for (Object o : store.values()) {
                            if (o instanceof LessonProgress lp && lp.getEnrollment() != null && lp.getEnrollment().getId().equals(eid)) {
                                list.add(lp);
                            }
                        }
                        return list;
                    }
                    if ("findByQuiz_IdAndUser_Id".equals(methodName) || "findByQuizIdAndUserId".equals(methodName)) {
                        Long qid = (Long) args[0];
                        Long uid = (Long) args[1];
                        for (Object o : store.values()) {
                            if (o instanceof QuizProgress qp && qp.getQuiz() != null && qp.getQuiz().getId().equals(qid) && qp.getUser() != null && qp.getUser().getId().equals(uid)) {
                                return Optional.of(qp);
                            }
                        }
                        return Optional.empty();
                    }
                    if ("existsByQuiz_IdAndUser_IdAndPassedTrue".equals(methodName)) {
                        Long qid = (Long) args[0];
                        Long uid = (Long) args[1];
                        for (Object o : store.values()) {
                            if (o instanceof QuizProgress qp && qp.getQuiz() != null && qp.getQuiz().getId().equals(qid) && qp.getUser() != null && qp.getUser().getId().equals(uid) && Boolean.TRUE.equals(qp.getPassed())) {
                                return true;
                            }
                        }
                        return false;
                    }
                    if ("findTopByQuiz_IdAndUser_IdAndCompletedAtIsNotNullOrderByCompletedAtDesc".equals(methodName)) {
                        Long qid = (Long) args[0];
                        Long uid = (Long) args[1];
                        return store.values().stream()
                                .filter(o -> o instanceof QuizAttempt qa && qa.getQuiz() != null && qa.getQuiz().getId().equals(qid) && qa.getUser() != null && qa.getUser().getId().equals(uid) && qa.getCompletedAt() != null)
                                .map(o -> (QuizAttempt) o)
                                .max(Comparator.comparing(QuizAttempt::getCompletedAt));
                    }
                    if ("countByModuleCourseId".equals(methodName)) {
                        Long cid = (Long) args[0];
                        return store.values().stream()
                                .filter(o -> o instanceof Lesson l && l.getModule() != null && l.getModule().getCourse() != null && l.getModule().getCourse().getId().equals(cid))
                                .count();
                    }
                    if ("areAllLessonsCompleted".equals(methodName)) {
                        Long eid = (Long) args[0];
                        Long mid = (Long) args[1];
                        long totalInMod = lessonStore.values().stream().filter(l -> l.getModule().getId().equals(mid)).count();
                        long completedInMod = lessonProgressStore.values().stream().filter(lp -> lp.getEnrollment().getId().equals(eid) && lp.getLesson().getModule().getId().equals(mid) && Boolean.TRUE.equals(lp.getCompleted())).count();
                        return totalInMod > 0 && totalInMod == completedInMod;
                    }
                    if ("findByUserIdAndCourseIdWithCourseAndUser".equals(methodName)) {
                        Long uid = (Long) args[0];
                        Long cid = (Long) args[1];
                        for (Object o : certStore.values()) {
                            if (o instanceof Certificate c && c.getUser().getId().equals(uid) && c.getCourse().getId().equals(cid)) {
                                return Optional.of(c);
                            }
                        }
                        return Optional.empty();
                    }

                    if (method.getReturnType().equals(boolean.class)) return false;
                    if (method.getReturnType().equals(long.class)) return 0L;
                    if (method.getReturnType().equals(int.class)) return 0;
                    if (method.getReturnType().equals(Optional.class)) return Optional.empty();
                    if (method.getReturnType().equals(List.class)) return Collections.emptyList();
                    return null;
                }
        );
    }
}
