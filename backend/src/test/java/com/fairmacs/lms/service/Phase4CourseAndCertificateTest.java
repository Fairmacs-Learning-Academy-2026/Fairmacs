package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Phase 4: Course Authoring, Assessments, and Certificates Test Suite")
class Phase4CourseAndCertificateTest {

    private final AtomicLong currentUserIdRef = new AtomicLong(101L);
    private final AtomicReference<String> currentRoleRef = new AtomicReference<>("EMPLOYEE");

    private final Map<String, AtomicLong> sequenceStore = new ConcurrentHashMap<>();
    private final Map<Long, Course> courseStore = new LinkedHashMap<>();
    private final Map<Long, Certificate> certStore = new LinkedHashMap<>();
    private final Map<String, CourseThumbnail> thumbnailStore = new ConcurrentHashMap<>();
    private final Map<Long, User> userStore = new LinkedHashMap<>();
    private final Map<Long, Enrollment> enrollmentStore = new LinkedHashMap<>();
    private final Map<Long, LessonProgress> lessonProgressStore = new LinkedHashMap<>();
    private final Map<Long, QuizProgress> quizProgressStore = new LinkedHashMap<>();
    private final Map<Long, Quiz> quizStore = new LinkedHashMap<>();

    private IdSequenceService idSequenceService;
    private CourseThumbnailService thumbnailService;
    private CertificateService certificateService;
    private EnrollmentService enrollmentService;
    private CourseMapper courseMapper;

    private User testUser;
    private Course testCourse;
    private Enrollment testEnrollment;

    @BeforeEach
    void setup() {
        sequenceStore.clear();
        courseStore.clear();
        certStore.clear();
        thumbnailStore.clear();
        userStore.clear();
        enrollmentStore.clear();
        lessonProgressStore.clear();
        quizProgressStore.clear();
        quizStore.clear();

        // 1. Setup ID Sequence Service with in-memory counter
        idSequenceService = new IdSequenceService(null) {
            @Override
            public synchronized String generateCourseId(String departmentName) {
                String prefix = resolveDepartmentPrefix(departmentName);
                long val = sequenceStore.computeIfAbsent("COURSE_" + prefix, k -> new AtomicLong(0)).incrementAndGet();
                return String.format("%s%03d", prefix, val);
            }

            @Override
            public synchronized String generateCertificateId(String departmentName) {
                String prefix = resolveDepartmentPrefix(departmentName);
                long val = sequenceStore.computeIfAbsent("CERT_" + prefix, k -> new AtomicLong(0)).incrementAndGet();
                return String.format("%s%03d", prefix, val);
            }
        };

        // 2. Setup Repositories using dynamic proxies
        CourseThumbnailRepository thumbnailRepo = (CourseThumbnailRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{CourseThumbnailRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("save".equals(name)) {
                        CourseThumbnail t = (CourseThumbnail) args[0];
                        thumbnailStore.put(t.getStorageId(), t);
                        return t;
                    }
                    if ("findByStorageId".equals(name)) {
                        return Optional.ofNullable(thumbnailStore.get(args[0]));
                    }
                    if ("deleteByStorageId".equals(name)) {
                        thumbnailStore.remove(args[0]);
                        return null;
                    }
                    return null;
                }
        );
        thumbnailService = new CourseThumbnailService(thumbnailRepo);

        currentUserIdRef.set(101L);
        currentRoleRef.set("EMPLOYEE");

        // 3. User & Course setup
        testUser = new User();
        testUser.setId(101L);
        testUser.setName("Alex Kumar");
        testUser.setEmail("alex.kumar@fairmacs.com");
        testUser.setRole(Role.EMPLOYEE);
        testUser.setDepartment("Operations");
        testUser.setEmployeeId("EMP101");
        userStore.put(testUser.getId(), testUser);

        User testTrainer = new User();
        testTrainer.setId(301L);
        testTrainer.setName("Tanya Trainer");
        testTrainer.setEmail("tanya.trainer@fairmacs.com");
        testTrainer.setRole(Role.TRAINER);
        testTrainer.setDepartment("Operations");
        testTrainer.setEmployeeId("TRN301");
        userStore.put(testTrainer.getId(), testTrainer);

        User otherTrainer = new User();
        otherTrainer.setId(302L);
        otherTrainer.setName("Tom Trainer");
        otherTrainer.setEmail("tom.trainer@fairmacs.com");
        otherTrainer.setRole(Role.TRAINER);
        otherTrainer.setDepartment("Finance");
        otherTrainer.setEmployeeId("TRN302");
        userStore.put(otherTrainer.getId(), otherTrainer);

        User testManager = new User();
        testManager.setId(201L);
        testManager.setName("Manoj Manager");
        testManager.setEmail("manoj.manager@fairmacs.com");
        testManager.setRole(Role.MANAGER);
        testManager.setDepartment("Operations");
        testManager.setEmployeeId("MGR201");
        userStore.put(testManager.getId(), testManager);

        User otherManager = new User();
        otherManager.setId(202L);
        otherManager.setName("Olivia Other");
        otherManager.setEmail("olivia.other@fairmacs.com");
        otherManager.setRole(Role.MANAGER);
        otherManager.setDepartment("Finance");
        otherManager.setEmployeeId("MGR202");
        userStore.put(otherManager.getId(), otherManager);

        User testHrAdmin = new User();
        testHrAdmin.setId(401L);
        testHrAdmin.setName("Harish HR");
        testHrAdmin.setEmail("harish.hr@fairmacs.com");
        testHrAdmin.setRole(Role.HR_ADMIN);
        testHrAdmin.setDepartment("Human Resources");
        testHrAdmin.setEmployeeId("HR401");
        userStore.put(testHrAdmin.getId(), testHrAdmin);

        User otherUser = new User();
        otherUser.setId(102L);
        otherUser.setName("Pooja Patel");
        otherUser.setEmail("pooja.patel@fairmacs.com");
        otherUser.setRole(Role.EMPLOYEE);
        otherUser.setDepartment("Finance");
        otherUser.setEmployeeId("EMP102");
        userStore.put(otherUser.getId(), otherUser);

        testCourse = new Course();
        testCourse.setId(10L);
        testCourse.setCourseId("OP001");
        testCourse.setTitle("Freight Forwarding Excellence");
        testCourse.setCategory("Operations");
        testCourse.setDurationHours(2.0);
        testCourse.setDuration("1 hr 30 min");
        testCourse.setDraft(false);
        testCourse.setCertificateEligible(true);
        testCourse.setPassingScore(80);
        testCourse.setCreatedBy(testTrainer);
        Department deptOps = new Department();
        deptOps.setId(1L);
        deptOps.setName("Operations");
        deptOps.setShortCode("OP");
        testCourse.setOwningDepartment(deptOps);
        courseStore.put(testCourse.getId(), testCourse);

        testEnrollment = new Enrollment();
        testEnrollment.setId(501L);
        testEnrollment.setUser(testUser);
        testEnrollment.setCourse(testCourse);
        testEnrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        testEnrollment.setProgressPercent(0);
        enrollmentStore.put(testEnrollment.getId(), testEnrollment);

        // Setup Quiz and QuizProgress
        Quiz finalQuiz = new Quiz();
        finalQuiz.setId(901L);
        finalQuiz.setCourse(testCourse);
        finalQuiz.setType(QuizType.FINAL);
        finalQuiz.setPassingScore(80);
        quizStore.put(finalQuiz.getId(), finalQuiz);

        QuizProgress finalProgress = new QuizProgress();
        finalProgress.setId(801L);
        finalProgress.setUser(testUser);
        finalProgress.setQuiz(finalQuiz);
        finalProgress.setBestScore(85);
        finalProgress.setPassed(true);
        quizProgressStore.put(finalProgress.getId(), finalProgress);

        // Proxies for CertificateService
        CertificateRepository certRepo = (CertificateRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{CertificateRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("save".equals(name) || "saveAndFlush".equals(name)) {
                        Certificate c = (Certificate) args[0];
                        if (c.getId() == null) c.setId((long) (certStore.size() + 1));
                        certStore.put(c.getId(), c);
                        return c;
                    }
                    if ("findByCertificateId".equals(name) || "findByCertificateIdWithDetails".equals(name)) {
                        String cid = (String) args[0];
                        return certStore.values().stream().filter(c -> cid.equals(c.getCertificateId())).findFirst();
                    }
                    if ("findByUserIdAndCourseId".equals(name)) {
                        Long uid = (Long) args[0];
                        Long cid = (Long) args[1];
                        return certStore.values().stream()
                                .filter(c -> c.getUser() != null && uid.equals(c.getUser().getId())
                                        && c.getCourse() != null && cid.equals(c.getCourse().getId()))
                                .findFirst();
                    }
                    if ("existsByCertificateId".equals(name)) {
                        String cid = (String) args[0];
                        return certStore.values().stream().anyMatch(c -> cid.equals(c.getCertificateId()));
                    }
                    if ("existsByUserIdAndCourseId".equals(name)) {
                        Long uid = (Long) args[0];
                        Long cid = (Long) args[1];
                        return certStore.values().stream().anyMatch(c -> c.getUser() != null && uid.equals(c.getUser().getId()) && c.getCourse() != null && cid.equals(c.getCourse().getId()));
                    }
                    if ("findAll".equals(name)) {
                        return new ArrayList<>(certStore.values());
                    }
                    if ("findByUserIdWithCourse".equals(name) || "findByUserId".equals(name)) {
                        Long uid = (Long) args[0];
                        return certStore.values().stream().filter(c -> c.getUser() != null && uid.equals(c.getUser().getId())).toList();
                    }
                    return null;
                }
        );

        UserRepository userRepo = (UserRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> "findById".equals(method.getName())
                        ? Optional.ofNullable(userStore.get(args[0]))
                        : Optional.empty()
        );

        CourseRepository courseRepo = (CourseRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{CourseRepository.class},
                (proxy, method, args) -> "findById".equals(method.getName())
                        ? Optional.ofNullable(courseStore.get(args[0]))
                        : Optional.empty()
        );

        SecurityContextUtil secUtil = new SecurityContextUtil(userRepo) {
            @Override
            public Long getCurrentUserId() {
                return currentUserIdRef.get();
            }

            @Override
            public String getCurrentUserRole() {
                return currentRoleRef.get();
            }

            @Override
            public User getCurrentUser() {
                return userStore.get(currentUserIdRef.get());
            }

            @Override
            public boolean isManagerOrHr() {
                String r = currentRoleRef.get();
                return "MANAGER".equalsIgnoreCase(r) || "HR_ADMIN".equalsIgnoreCase(r);
            }
        };

        certificateService = new CertificateService(
                certRepo,
                userRepo,
                courseRepo,
                secUtil,
                null,
                idSequenceService
        );

        // Proxies for EnrollmentService
        EnrollmentRepository enrollmentRepo = (EnrollmentRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{EnrollmentRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findById".equals(name)) {
                        return Optional.ofNullable(enrollmentStore.get(args[0]));
                    }
                    if ("findByUserIdAndCourseId".equals(name)) {
                        Long uid = (Long) args[0];
                        Long cid = (Long) args[1];
                        return enrollmentStore.values().stream()
                                .filter(e -> uid.equals(e.getUser().getId()) && cid.equals(e.getCourse().getId()))
                                .findFirst();
                    }
                    if ("save".equals(name)) {
                        Enrollment e = (Enrollment) args[0];
                        enrollmentStore.put(e.getId(), e);
                        return e;
                    }
                    return null;
                }
        );

        LessonProgressRepository lessonProgRepo = (LessonProgressRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{LessonProgressRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("areAllLessonsCompleted".equals(name)) {
                        return true;
                    }
                    if ("findByUserIdAndLessonCourseId".equals(name)) {
                        Long uid = (Long) args[0];
                        Long cid = (Long) args[1];
                        return lessonProgressStore.values().stream()
                                .filter(lp -> uid.equals(lp.getEnrollment().getUser().getId())
                                        && cid.equals(lp.getLesson().getModule().getCourse().getId()))
                                .toList();
                    }
                    return Collections.emptyList();
                }
        );

        QuizProgressRepository quizProgRepo = (QuizProgressRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{QuizProgressRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findByQuiz_IdAndUser_Id".equals(name) || "findByQuizIdAndUserId".equals(name) || "findByUserIdAndQuizId".equals(name)) {
                        Long qid = (Long) args[0];
                        Long uid = (Long) args[1];
                        return quizProgressStore.values().stream()
                                .filter(qp -> (uid.equals(qp.getUser().getId()) && qid.equals(qp.getQuiz().getId()))
                                        || (qid.equals(qp.getUser().getId()) && uid.equals(qp.getQuiz().getId())))
                                .findFirst();
                    }
                    return Optional.empty();
                }
        );

        QuizRepository quizRepo = (QuizRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{QuizRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("findById".equals(name)) {
                        Long qid = (Long) args[0];
                        return Optional.ofNullable(quizStore.get(qid));
                    }
                    if ("findByCourseIdAndType".equals(name)) {
                        Long cid = (Long) args[0];
                        QuizType type = (QuizType) args[1];
                        return quizStore.values().stream()
                                .filter(q -> q.getCourse() != null && cid.equals(q.getCourse().getId()) && type == q.getType())
                                .toList();
                    }
                    if ("findByCourseId".equals(name)) {
                        Long cid = (Long) args[0];
                        return quizStore.values().stream()
                                .filter(q -> q.getCourse() != null && cid.equals(q.getCourse().getId()))
                                .toList();
                    }
                    return Optional.empty();
                }
        );

        DepartmentRepository deptRepo = (DepartmentRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{DepartmentRepository.class},
                (proxy, method, args) -> Optional.empty()
        );

        ModuleRepository moduleRepo = (ModuleRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{ModuleRepository.class},
                (proxy, method, args) -> {
                    if ("findByCourseIdOrderByOrderIndexAsc".equals(method.getName()) || "findByCourseId".equals(method.getName())) {
                        Long cid = (Long) args[0];
                        Course c = courseStore.get(cid);
                        return c != null && c.getModules() != null ? c.getModules() : Collections.emptyList();
                    }
                    return Collections.emptyList();
                }
        );

        courseMapper = new CourseMapper(new ObjectMapper(), quizRepo);

        enrollmentService = new EnrollmentService(
                enrollmentRepo,
                courseRepo,
                certificateService,
                secUtil,
                courseMapper,
                userRepo,
                null,
                deptRepo,
                lessonProgRepo,
                moduleRepo,
                quizRepo,
                quizProgRepo
        );
    }

    // =========================================================
    // 1. UNIQUE COURSE ID GENERATION
    // =========================================================

    @Test
    @DisplayName("Course IDs generate department prefixes (OP, DOC, GEN) with 3-digit zero-padding")
    void testCourseIdGeneration() {
        assertEquals("OP001", idSequenceService.generateCourseId("Operations"));
        assertEquals("OP002", idSequenceService.generateCourseId("OPERATIONS"));
        assertEquals("DOC001", idSequenceService.generateCourseId("Documentation"));
        assertEquals("GEN001", idSequenceService.generateCourseId("General Logistics"));
        assertEquals("GEN002", idSequenceService.generateCourseId(null));
        assertEquals("HR001", idSequenceService.generateCourseId("Human Resources"));
    }

    // =========================================================
    // 2. UNIQUE CERTIFICATE ID GENERATION
    // =========================================================

    @Test
    @DisplayName("Certificate IDs follow department prefix pattern and maintain independent sequence")
    void testCertificateIdGeneration() {
        assertEquals("OP001", idSequenceService.generateCertificateId("Operations"));
        assertEquals("OP002", idSequenceService.generateCertificateId("Operations"));
        assertEquals("DOC001", idSequenceService.generateCertificateId("Documentation"));
        assertEquals("GEN001", idSequenceService.generateCertificateId("Other"));
    }

    // =========================================================
    // 3. THUMBNAIL UPLOAD VALIDATION & PERSISTENCE
    // =========================================================

    @Test
    @DisplayName("Thumbnail validation permits valid image types <= 5MB and persists binary in table")
    void testThumbnailValidationAndPersistence() {
        // Valid PNG
        byte[] pngBytes = new byte[]{1, 2, 3, 4};
        MockMultipartFile pngFile = new MockMultipartFile("file", "test.png", "image/png", pngBytes);
        var res = thumbnailService.uploadThumbnail(pngFile);
        assertNotNull(res.get("storageId"));
        assertEquals("image/png", res.get("contentType"));
        assertArrayEquals(pngBytes, thumbnailService.getThumbnail((String) res.get("storageId")).getData());

        // Reject oversized
        byte[] largeBytes = new byte[6 * 1024 * 1024];
        MockMultipartFile largeFile = new MockMultipartFile("file", "large.png", "image/png", largeBytes);
        assertThrows(IllegalArgumentException.class, () -> thumbnailService.uploadThumbnail(largeFile));

        // Reject invalid MIME
        MockMultipartFile exeFile = new MockMultipartFile("file", "hack.exe", "application/octet-stream", pngBytes);
        assertThrows(IllegalArgumentException.class, () -> thumbnailService.uploadThumbnail(exeFile));
    }

    // =========================================================
    // 4. ASSESSMENT COMPLETION & CERTIFICATE RULES
    // =========================================================

    @Test
    @DisplayName("Module quizzes NEVER complete course or generate certificate")
    void testModuleQuizDoesNotGenerateCertificate() {
        // Setup module quiz
        Quiz moduleQuiz = new Quiz();
        moduleQuiz.setId(201L);
        moduleQuiz.setCourse(testCourse);
        moduleQuiz.setType(QuizType.MODULE);
        quizStore.put(moduleQuiz.getId(), moduleQuiz);

        QuizProgress mp = new QuizProgress();
        mp.setId(301L);
        mp.setUser(testUser);
        mp.setQuiz(moduleQuiz);
        mp.setPassed(true);
        mp.setBestScore(100);
        quizProgressStore.put(mp.getId(), mp);

        // Module quiz passes should not complete course
        CompleteCourseRequest req = new CompleteCourseRequest();
        req.setCourseId(testCourse.getId());
        req.setQuizId(moduleQuiz.getId());
        req.setScore(100);

        // Attempting course completion via module quiz throws IllegalStateException
        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> enrollmentService.completeCourse(req));
        assertTrue(ex.getMessage().contains("Module quizzes cannot complete a course"));
        assertTrue(certStore.isEmpty());
    }

    @Test
    @DisplayName("Complete course succeeds when all lessons and final assessment are passed; score is verified strictly from DB")
    void testCompleteCourseSuccessAndServerVerifiedScore() {
        // Setup 1 lesson in module
        Module module = new Module();
        module.setId(11L);
        module.setCourse(testCourse);

        Lesson lesson = new Lesson();
        lesson.setId(101L);
        lesson.setModule(module);
        lesson.setTitle("Introduction");
        lesson.setDuration("30 min");
        lesson.setSummary("Key introductory concepts");
        module.setLessons(List.of(lesson));
        testCourse.setModules(List.of(module));

        LessonProgress lp = new LessonProgress();
        lp.setId(401L);
        lp.setEnrollment(testEnrollment);
        lp.setLesson(lesson);
        lp.setCompleted(true);
        lessonProgressStore.put(lp.getId(), lp);

        // Client passes fake score 100, but DB bestScore is 85
        CompleteCourseRequest req = new CompleteCourseRequest();
        req.setCourseId(testCourse.getId());
        req.setScore(100); // Attempted client-side spoof

        CertificateDTO cert = enrollmentService.completeCourse(req);

        assertNotNull(cert);
        assertEquals("Alex Kumar", cert.getUserName());
        assertEquals("Freight Forwarding Excellence", cert.getCourseTitle());
        assertEquals(85, cert.getScore(), "Server must enforce database-verified score (85%), ignoring spoofed client score (100%)");
        assertTrue(cert.getCertificateId().startsWith("OP"));
        assertEquals(EnrollmentStatus.COMPLETED, testEnrollment.getStatus());

        // Verify certificate is stored
        assertEquals(1, certStore.size());
    }

    @Test
    @DisplayName("Idempotent course completion: second completion returns existing certificate without duplicating")
    void testIdempotentCourseCompletion() {
        // Prepare fully completed course
        Module module = new Module();
        module.setId(11L);
        module.setCourse(testCourse);
        testCourse.setModules(List.of(module));

        CompleteCourseRequest req = new CompleteCourseRequest();
        req.setCourseId(testCourse.getId());
        req.setScore(85);

        CertificateDTO cert1 = enrollmentService.completeCourse(req);
        assertNotNull(cert1);
        String certId = cert1.getCertificateId();

        // Second call
        CertificateDTO cert2 = enrollmentService.completeCourse(req);
        assertEquals(certId, cert2.getCertificateId());
        assertEquals(1, certStore.size(), "Must not create duplicate certificates in database");
    }

    // =========================================================
    // 5. COURSE MAPPER: DEPARTMENT, SUMMARY, LEARNING OUTCOMES
    // =========================================================

    @Test
    @DisplayName("CourseMapper sets department, eliminates Uncategorized, maps learning outcomes and lesson summary")
    void testCourseMapper() {
        Lesson lesson = new Lesson();
        lesson.setId(51L);
        lesson.setTitle("Operational Cargo Planning");
        lesson.setDuration("45 min");
        lesson.setSummary("Comprehensive overview of cargo segregation rules.");

        Module module = new Module();
        module.setId(21L);
        module.setTitle("Module 1");
        module.setCourse(testCourse);
        module.setLessons(List.of(lesson));
        lesson.setModule(module);

        testCourse.setModules(List.of(module));
        testCourse.setLearningOutcomes("[\"Master IMDG code\",\"Understand reefer transport\"]");
        testCourse.setPublishedAt(LocalDateTime.of(2026, 10, 15, 10, 0));

        CourseDTO dto = courseMapper.toDetail(testCourse, null, "MANDATORY");

        assertEquals("Operations", dto.getDepartment());
        assertEquals("Operations", dto.getCategory(), "Category must be replaced by department name, never Uncategorized");
        assertNotNull(dto.getLearningOutcomes());
        assertEquals(2, dto.getLearningOutcomes().size());
        assertEquals("Master IMDG code", dto.getLearningOutcomes().get(0));

        CourseDTO.LessonDTO lessonDTO = dto.getModules().get(0).getLessons().get(0);
        assertEquals("Comprehensive overview of cargo segregation rules.", lessonDTO.getSummary());
    }

    // =========================================================
    // 6. CERTIFICATE PDF RENDERING WITH TEMPLATE
    // =========================================================

    @Test
    @DisplayName("Certificate PDF generation overlays learner name and outputs valid PDF binary bytes")
    void testCertificatePdfGeneration() throws Exception {
        Certificate cert = new Certificate();
        cert.setId(1L);
        cert.setCertificateId("OP001");
        cert.setUser(testUser);
        cert.setCourse(testCourse);
        cert.setIssuedAt(LocalDateTime.now());
        cert.setScore(92);

        byte[] pdfBytes = certificateService.createCertificatePdf(cert);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500, "PDF byte array must not be empty");

        // Verify PDF Header Magic Bytes '%PDF-'
        String header = new String(pdfBytes, 0, 5);
        assertEquals("%PDF-", header);
    }

    // =========================================================
    // 7. RELEASE 03.11.1: FOUNDATION COURSES & STRICT EMAIL
    // =========================================================

    @Test
    @DisplayName("Release 03.11.1: Foundation course blocks certificate generation")
    void testFoundationCourseBlocksCertificateGeneration() {
        Course foundation = new Course();
        foundation.setId(99L);
        foundation.setCourseId("GEN001");
        foundation.setTitle("Corporate Induction");
        foundation.setFoundation(true);
        foundation.setCertificateEligible(false);
        Department genDept = new Department();
        genDept.setName("General / Common");
        foundation.setOwningDepartment(genDept);
        courseStore.put(99L, foundation);

        Enrollment enr = new Enrollment();
        enr.setId(9901L);
        enr.setUser(testUser);
        enr.setCourse(foundation);
        enr.setStatus(EnrollmentStatus.COMPLETED);
        enrollmentStore.put(9901L, enr);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                certificateService.createCertificate(testUser.getId(), 99L, 90));
        assertTrue(ex.getMessage().contains("Foundation courses do not issue certificates"));
    }

    @Test
    @DisplayName("Release 03.11.1: Strict Email Notification Channel permits exactly 3 events")
    void testStrict3EventEmailPolicy() {
        NotificationRepository mockNotifRepo = (NotificationRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(),
                new Class<?>[]{NotificationRepository.class},
                (proxy, method, args) -> "save".equals(method.getName()) ? args[0] : null
        );

        com.fairmacs.lms.service.notification.NotificationEmailProperties props =
                new com.fairmacs.lms.service.notification.NotificationEmailProperties();
        props.setEnabled(true);
        com.fairmacs.lms.service.notification.EmailNotificationChannel channel =
                new com.fairmacs.lms.service.notification.EmailNotificationChannel(
                        props,
                        new com.fairmacs.lms.service.notification.EmailTemplateRenderer(),
                        mockNotifRepo,
                        new ObjectMapper()
                );

        // Allowed 1: COURSE_ASSIGNED
        Notification n1 = new Notification();
        n1.setType(NotificationType.COURSE_ASSIGNED);
        n1.setRecipient(testUser);
        channel.deliver(n1);
        assertEquals("PENDING", n1.getEmailStatus());

        // Allowed 2: COURSE_DUE_SOON
        Notification n2 = new Notification();
        n2.setType(NotificationType.COURSE_DUE_SOON);
        n2.setRecipient(testUser);
        channel.deliver(n2);
        assertEquals("PENDING", n2.getEmailStatus());

        // Allowed 3: GENERAL_ANNOUNCEMENT
        Notification n3 = new Notification();
        n3.setType(NotificationType.GENERAL_ANNOUNCEMENT);
        n3.setRecipient(testUser);
        channel.deliver(n3);
        assertEquals("PENDING", n3.getEmailStatus());

        // Disallowed: COURSE_COMPLETED
        Notification n4 = new Notification();
        n4.setType(NotificationType.COURSE_COMPLETED);
        n4.setRecipient(testUser);
        channel.deliver(n4);
        assertEquals("SUPPRESSED", n4.getEmailStatus());

        // Disallowed: CERTIFICATE_ISSUED
        Notification n5 = new Notification();
        n5.setType(NotificationType.CERTIFICATE_ISSUED);
        n5.setRecipient(testUser);
        channel.deliver(n5);
        assertEquals("SUPPRESSED", n5.getEmailStatus());

        // Disallowed: ASSESSMENT_FAILED
        Notification n6 = new Notification();
        n6.setType(NotificationType.ASSESSMENT_FAILED);
        n6.setRecipient(testUser);
        channel.deliver(n6);
        assertEquals("SUPPRESSED", n6.getEmailStatus());
    }

    @Test
    @DisplayName("Release 03.11.1: Multi-answer set-based scoring")
    void testMultiAnswerScoring() {
        String correctAnswer = "A,B,C";

        java.util.function.BiFunction<String, String, Boolean> evaluate = (submitted, expected) -> {
            Set<String> sub = Arrays.stream(submitted.split("[,;\\s]+"))
                    .map(String::trim).filter(s -> !s.isBlank()).map(String::toUpperCase)
                    .collect(java.util.stream.Collectors.toSet());
            Set<String> exp = Arrays.stream(expected.split("[,;\\s]+"))
                    .map(String::trim).filter(s -> !s.isBlank()).map(String::toUpperCase)
                    .collect(java.util.stream.Collectors.toSet());
            return !exp.isEmpty() && exp.equals(sub);
        };

        // Permutations match
        assertTrue(evaluate.apply("C,B,A", correctAnswer));
        assertTrue(evaluate.apply("B, A, C", correctAnswer));
        assertTrue(evaluate.apply("a,b,c", correctAnswer));

        // Partial or extra options fail
        assertFalse(evaluate.apply("A,B", correctAnswer));
        assertFalse(evaluate.apply("A,B,C,D", correctAnswer));
        assertFalse(evaluate.apply("D", correctAnswer));
    }

    // =========================================================
    // 8. ROLE-BASED ACCESS CONTROL TESTS
    // =========================================================

    @Test
    @DisplayName("RBAC: Employee can access own certificate but is blocked from other employees")
    void testRoleBasedAccess_EmployeeCanViewOwn_BlockedFromOthers() {
        Certificate cert = certificateService.createCertificate(testUser.getId(), testCourse.getId(), 88);
        assertNotNull(cert);

        // 1. Employee Alex (101) accesses own certificate -> success
        currentUserIdRef.set(101L);
        currentRoleRef.set("EMPLOYEE");
        CertificateDTO dto = certificateService.verifyCertificate(cert.getCertificateId());
        assertEquals("Alex Kumar", dto.getUserName());

        // 2. Employee Pooja (102) attempts to access Alex's certificate -> SecurityException
        currentUserIdRef.set(102L);
        currentRoleRef.set("EMPLOYEE");
        SecurityException ex = assertThrows(SecurityException.class, () ->
                certificateService.verifyCertificate(cert.getCertificateId()));
        assertTrue(ex.getMessage().contains("not authorized to access this certificate"));

        // 3. Employee Pooja attempts to get Alex's certificates -> SecurityException
        assertThrows(SecurityException.class, () ->
                certificateService.getCertificatesByUser(101L));
    }

    @Test
    @DisplayName("RBAC: Manager can access department certificates but is blocked from cross-department certificates")
    void testRoleBasedAccess_ManagerCanViewDept_BlockedFromOtherDept() {
        Certificate certAlex = certificateService.createCertificate(testUser.getId(), testCourse.getId(), 90);

        // Create Finance course and certificate for Pooja
        Course finCourse = new Course();
        finCourse.setId(20L);
        finCourse.setCourseId("ACC001");
        finCourse.setTitle("Financial Auditing");
        finCourse.setCategory("Finance");
        Department deptFin = new Department();
        deptFin.setName("Finance");
        deptFin.setShortCode("ACC");
        finCourse.setOwningDepartment(deptFin);
        courseStore.put(finCourse.getId(), finCourse);

        Certificate certPooja = certificateService.createCertificate(102L, 20L, 95);

        // Operations Manager (201L) views Operations employee Alex (101L) -> Allowed
        currentUserIdRef.set(201L);
        currentRoleRef.set("MANAGER");
        CertificateDTO dtoAlex = certificateService.verifyCertificate(certAlex.getCertificateId());
        assertEquals("Alex Kumar", dtoAlex.getUserName());
        var alexCerts = certificateService.getCertificatesByUser(101L);
        assertEquals(1, alexCerts.size());

        // Operations Manager (201L) attempts to access Finance employee Pooja's certificate -> Blocked
        SecurityException ex = assertThrows(SecurityException.class, () ->
                certificateService.verifyCertificate(certPooja.getCertificateId()));
        assertTrue(ex.getMessage().contains("own department"));

        assertThrows(SecurityException.class, () ->
                certificateService.getCertificatesByUser(102L));
    }

    @Test
    @DisplayName("RBAC: Trainer can access certificates within training scope (authored courses) but blocked outside")
    void testRoleBasedAccess_TrainerCanViewAuthoredCourseCertificates_BlockedFromOutsideScope() {
        Certificate cert = certificateService.createCertificate(testUser.getId(), testCourse.getId(), 91);

        // Tanya Trainer (301L) authored testCourse -> Allowed
        currentUserIdRef.set(301L);
        currentRoleRef.set("TRAINER");
        CertificateDTO dto = certificateService.verifyCertificate(cert.getCertificateId());
        assertEquals("Alex Kumar", dto.getUserName());
        var userCerts = certificateService.getCertificatesByUser(101L);
        assertEquals(1, userCerts.size());

        // Tom Trainer (302L, Finance, not author) tries to access Operations course certificate -> Blocked
        currentUserIdRef.set(302L);
        currentRoleRef.set("TRAINER");
        SecurityException ex = assertThrows(SecurityException.class, () ->
                certificateService.verifyCertificate(cert.getCertificateId()));
        assertTrue(ex.getMessage().contains("authorized training scope"));
    }

    @Test
    @DisplayName("RBAC: HR Admin has global visibility across all departments and learners")
    void testRoleBasedAccess_HrAdminHasGlobalAccess() {
        Certificate certAlex = certificateService.createCertificate(testUser.getId(), testCourse.getId(), 89);

        Course finCourse = new Course();
        finCourse.setId(20L);
        finCourse.setCourseId("ACC001");
        finCourse.setTitle("Financial Auditing");
        Department deptFin = new Department();
        deptFin.setName("Finance");
        deptFin.setShortCode("ACC");
        finCourse.setOwningDepartment(deptFin);
        courseStore.put(finCourse.getId(), finCourse);

        Certificate certPooja = certificateService.createCertificate(102L, 20L, 94);

        // HR Admin (401L)
        currentUserIdRef.set(401L);
        currentRoleRef.set("HR_ADMIN");

        CertificateDTO dto1 = certificateService.verifyCertificate(certAlex.getCertificateId());
        CertificateDTO dto2 = certificateService.verifyCertificate(certPooja.getCertificateId());
        assertEquals("Alex Kumar", dto1.getUserName());
        assertEquals("Pooja Patel", dto2.getUserName());

        List<CertificateDTO> allRecent = certificateService.getRecentCertificates(10);
        assertEquals(2, allRecent.size());
    }

    @Test
    @DisplayName("Search & Filter: Search by query, department, and role constraints")
    void testSearchAndFilterCertificates() {
        certificateService.createCertificate(testUser.getId(), testCourse.getId(), 87);

        Course docCourse = new Course();
        docCourse.setId(30L);
        docCourse.setCourseId("DOC001");
        docCourse.setTitle("Bills of Lading Compliance");
        Department docDept = new Department();
        docDept.setName("Documentation");
        docDept.setShortCode("DOC");
        docCourse.setOwningDepartment(docDept);
        courseStore.put(docCourse.getId(), docCourse);

        certificateService.createCertificate(102L, 30L, 93);

        // HR Admin searches globally
        currentUserIdRef.set(401L);
        currentRoleRef.set("HR_ADMIN");

        // 1. Search by name query "Alex"
        List<CertificateDTO> alexResult = certificateService.searchCertificates("Alex", null, 10);
        assertEquals(1, alexResult.size());
        assertEquals("Alex Kumar", alexResult.get(0).getUserName());

        // 2. Search by course title "Bills"
        List<CertificateDTO> billsResult = certificateService.searchCertificates("Bills", null, 10);
        assertEquals(1, billsResult.size());
        assertEquals("Bills of Lading Compliance", billsResult.get(0).getCourseTitle());

        // 3. Search by department "Operations"
        List<CertificateDTO> opsResult = certificateService.searchCertificates(null, "Operations", 10);
        assertEquals(1, opsResult.size());
        assertEquals("OP001", opsResult.get(0).getCertificateId());

        // 4. Operations Manager searching sees only Operations certificates
        currentUserIdRef.set(201L);
        currentRoleRef.set("MANAGER");
        List<CertificateDTO> mgrResult = certificateService.searchCertificates(null, null, 10);
        assertEquals(1, mgrResult.size());
        assertEquals("Alex Kumar", mgrResult.get(0).getUserName());
    }

    @Test
    @DisplayName("PDF Auto-Healing: Automatically regenerates PDF if deleted or missing from disk")
    void testAutoRegeneratePdfWhenMissingFromDisk() throws Exception {
        Certificate cert = certificateService.createCertificate(testUser.getId(), testCourse.getId(), 92);
        assertNotNull(cert);
        String certId = cert.getCertificateId();

        // Deliberately delete the PDF file from disk to simulate container restart/cache clear
        java.nio.file.Path pdfPath = java.nio.file.Paths.get("uploads/certificates", certId + ".pdf");
        java.nio.file.Files.deleteIfExists(pdfPath);
        assertFalse(java.nio.file.Files.exists(pdfPath));

        // As HR Admin, download the certificate PDF -> auto-heals and generates file on demand
        currentUserIdRef.set(401L);
        currentRoleRef.set("HR_ADMIN");

        byte[] pdfBytes = certificateService.getCertificatePdf(certId);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500);
        assertEquals("%PDF-", new String(pdfBytes, 0, 5));
        assertTrue(java.nio.file.Files.exists(pdfPath), "PDF file must be reconstructed on disk");
    }
}
