package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CourseAuthoringRequest;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Phase 1: Centralized Course Management & Department Ownership Test Suite")
class Phase1CentralizedCourseManagementTest {

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

    private final AtomicLong courseIdSeq = new AtomicLong(100);
    private final AtomicLong assignmentIdSeq = new AtomicLong(10);
    private final AtomicLong enrollmentIdSeq = new AtomicLong(500);

    private CourseAuthoringService authoringService;
    private EnrollmentService enrollmentService;
    private DepartmentService departmentService;
    private ManagerReportsService managerReportsService;
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

        // 2. Users with explicit departments
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
        employeeDoc.setId(101L);
        employeeDoc.setName("Deepak Sharma");
        employeeDoc.setEmail("deepak.sharma@fairmacs.com");
        employeeDoc.setDepartment("Documentation");
        employeeDoc.setDesignation("Documentation Officer");
        employeeDoc.setRole(Role.EMPLOYEE);
        employeeDoc.setStatus(UserStatus.ACTIVE);
        employeeDoc.setLevel("L1");
        userStore.put(101L, employeeDoc);

        // 3. SecurityContextUtil stub
        SecurityContextUtil securityContextUtil = new SecurityContextUtil(null) {
            @Override
            public User getCurrentUser() {
                return currentUser;
            }

            @Override
            public String getCurrentUserRole() {
                return currentUser != null && currentUser.getRole() != null ? currentUser.getRole().name() : null;
            }
        };

        // 4. Mock Repositories
        DepartmentRepository deptRepo = createMockProxy(DepartmentRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("findById")) {
                return Optional.ofNullable(departmentStore.get((Long) args[0]));
            }
            if (name.equals("findAll")) {
                return new ArrayList<>(departmentStore.values());
            }
            if (name.equals("findByNameIgnoreCase")) {
                String search = (String) args[0];
                return departmentStore.values().stream()
                        .filter(d -> d.getName() != null && d.getName().equalsIgnoreCase(search))
                        .findFirst();
            }
            if (name.equals("existsById")) {
                return departmentStore.containsKey((Long) args[0]);
            }
            if (name.equals("existsByNameIgnoreCase")) {
                String search = (String) args[0];
                return departmentStore.values().stream()
                        .anyMatch(d -> d.getName() != null && d.getName().equalsIgnoreCase(search));
            }
            return null;
        });

        CourseDepartmentAssignmentRepository cdaRepo = createMockProxy(CourseDepartmentAssignmentRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("save")) {
                CourseDepartmentAssignment a = (CourseDepartmentAssignment) args[0];
                if (a.getId() == null) a.setId(assignmentIdSeq.incrementAndGet());
                assignmentStore.put(a.getId(), a);
                return a;
            }
            if (name.equals("findByCourse_Id") || name.equals("findByCourseIdWithDepartment")) {
                Long cid = (Long) args[0];
                return assignmentStore.values().stream()
                        .filter(a -> a.getCourse() != null && cid.equals(a.getCourse().getId()))
                        .toList();
            }
            if (name.equals("deleteByCourse_Id")) {
                Long cid = (Long) args[0];
                assignmentStore.values().removeIf(a -> a.getCourse() != null && cid.equals(a.getCourse().getId()));
                return null;
            }
            return null;
        });

        CourseRepository courseRepo = createMockProxy(CourseRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("save") || name.equals("saveAndFlush")) {
                Course c = (Course) args[0];
                if (c.getId() == null) c.setId(courseIdSeq.incrementAndGet());
                courseStore.put(c.getId(), c);
                return c;
            }
            if (name.equals("findById") || name.equals("findDetailById")) {
                return Optional.ofNullable(courseStore.get((Long) args[0]));
            }
            if (name.equals("findByCourseId") || name.equals("findDetailByCourseId")) {
                String code = (String) args[0];
                return courseStore.values().stream()
                        .filter(c -> code.equals(c.getCourseId()))
                        .findFirst();
            }
            if (name.equals("existsByCourseId")) {
                String code = (String) args[0];
                return courseStore.values().stream().anyMatch(c -> code.equals(c.getCourseId()));
            }
            if (name.equals("findAll")) {
                return new ArrayList<>(courseStore.values());
            }
            if (name.equals("delete")) {
                Course c = (Course) args[0];
                courseStore.remove(c.getId());
                return null;
            }
            if (name.equals("deleteCourseById") || name.equals("deleteById")) {
                Long cid = (Long) args[0];
                courseStore.remove(cid);
                return null;
            }
            if (name.equals("flush")) {
                return null;
            }
            return null;
        });

        EnrollmentRepository enrollmentRepo = createMockProxy(EnrollmentRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("save")) {
                Enrollment e = (Enrollment) args[0];
                if (e.getId() == null) e.setId(enrollmentIdSeq.incrementAndGet());
                enrollmentStore.put(e.getId(), e);
                return e;
            }
            if (name.equals("deleteByCourseId")) {
                Long cid = (Long) args[0];
                enrollmentStore.values().removeIf(e -> e.getCourse() != null && cid.equals(e.getCourse().getId()));
                return null;
            }
            if (name.equals("findByUserIdAndCourseId")) {
                Long uid = (Long) args[0];
                Long cid = (Long) args[1];
                return enrollmentStore.values().stream()
                        .filter(e -> e.getUser() != null && uid.equals(e.getUser().getId())
                                && e.getCourse() != null && cid.equals(e.getCourse().getId()))
                        .findFirst();
            }
            if (name.equals("findByUserIdWithCourse")) {
                Long uid = (Long) args[0];
                return enrollmentStore.values().stream()
                        .filter(e -> e.getUser() != null && uid.equals(e.getUser().getId()))
                        .toList();
            }
            if (name.equals("findByCourseId")) {
                Long cid = (Long) args[0];
                return enrollmentStore.values().stream()
                        .filter(e -> e.getCourse() != null && cid.equals(e.getCourse().getId()))
                        .toList();
            }
            if (name.equals("findAll")) {
                return new ArrayList<>(enrollmentStore.values());
            }
            return null;
        });

        UserRepository userRepo = createMockProxy(UserRepository.class, (method, args) -> {
            String name = method.getName();
            if (name.equals("findById")) {
                return Optional.ofNullable(userStore.get((Long) args[0]));
            }
            if (name.equals("findByDepartmentIgnoreCase")) {
                String dept = (String) args[0];
                return userStore.values().stream()
                        .filter(u -> u.getDepartment() != null && u.getDepartment().equalsIgnoreCase(dept))
                        .toList();
            }
            if (name.equals("findAll")) {
                return new ArrayList<>(userStore.values());
            }
            return null;
        });

        CategoryRepository catRepo = createMockProxy(CategoryRepository.class, (method, args) -> Optional.empty());
        ModuleRepository modRepo = createMockProxy(ModuleRepository.class, (method, args) -> {
            if (method.getName().startsWith("save")) {
                Module m = (Module) args[0];
                if (m.getId() == null) m.setId(1L);
                return m;
            }
            return Collections.emptyList();
        });
        LessonRepository lesRepo = createMockProxy(LessonRepository.class, (method, args) -> {
            if (method.getName().startsWith("save")) {
                Lesson l = (Lesson) args[0];
                if (l.getId() == null) l.setId(1L);
                return l;
            }
            return Collections.emptyList();
        });
        QuizRepository quizRepo = createMockProxy(QuizRepository.class, (method, args) -> {
            if (method.getName().startsWith("save")) {
                Quiz q = (Quiz) args[0];
                if (q.getId() == null) q.setId(1L);
                return q;
            }
            if ("findByCourseId".equals(method.getName())) return Collections.emptyList();
            return null;
        });
        QuizQuestionRepository qRepo = createMockProxy(QuizQuestionRepository.class, (method, args) -> Collections.emptyList());
        QuizAttemptRepository qaRepo = createMockProxy(QuizAttemptRepository.class, (method, args) -> false);
        CertificateRepository certRepo = createMockProxy(CertificateRepository.class, (method, args) -> {
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
        LessonProgressRepository lpRepo = createMockProxy(LessonProgressRepository.class, (method, args) -> Collections.emptyList());
        QuizProgressRepository qpRepo = createMockProxy(QuizProgressRepository.class, (method, args) -> Collections.emptyList());
        RecommendationRuleRepository ruleRepo = createMockProxy(RecommendationRuleRepository.class, (method, args) -> Collections.emptyList());
        LearningPathRepository lpPathRepo = createMockProxy(LearningPathRepository.class, (method, args) -> Collections.emptyList());

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
    }

    private CourseAuthoringRequest buildSampleRequest(Long owningDeptId, List<CourseAuthoringRequest.DepartmentAssignmentInput> assignments) {
        CourseAuthoringRequest req = new CourseAuthoringRequest();
        req.setTitle("Customs & Cross-Border Logistics Masterclass");
        req.setLevel("L1");
        req.setDuration("45 min");
        req.setDurationHours(1);
        req.setPassingScore(80);
        req.setPublish(true);
        req.setDepartmentId(owningDeptId);
        req.setDepartmentAssignments(assignments);

        CourseAuthoringRequest.ModuleInput mod = new CourseAuthoringRequest.ModuleInput();
        mod.setTitle("Module 1: Trade Documentation");
        mod.setOrderIndex(1);

        CourseAuthoringRequest.LessonInput les = new CourseAuthoringRequest.LessonInput();
        les.setTitle("Lesson 1: Bill of Lading Basics");
        les.setType("VIDEO");
        les.setContentUrl("https://workdrive.zoho.com/file/sample123");
        les.setDuration("20 min");
        les.setOrderIndex(1);
        mod.setLessons(List.of(les));

        req.setModules(List.of(mod));

        CourseAuthoringRequest.QuizInput quiz = new CourseAuthoringRequest.QuizInput();
        quiz.setTitle("Final Assessment");
        quiz.setPassingScore(80);

        CourseAuthoringRequest.QuestionInput q = new CourseAuthoringRequest.QuestionInput();
        q.setQuestionText("What is a Bill of Lading?");
        q.setOptionA("Contract of carriage and document of title");
        q.setOptionB("Invoice for customs clearance");
        q.setCorrectAnswer("A");
        q.setOrderIndex(1);
        quiz.setQuestions(List.of(q));

        req.setFinalQuiz(quiz);
        return req;
    }

    @Test
    @DisplayName("1. HR/Admin can create a course owned by any department")
    void testHrAdminCanCreateCourseOwnedByAnyDepartment() {
        currentUser = hrAdmin;

        CourseAuthoringRequest req = buildSampleRequest(
                deptOps.getId(), // Owned by Operations
                List.of(new CourseAuthoringRequest.DepartmentAssignmentInput(deptOps.getId(), "Operations", "MANDATORY", LocalDate.now().plusDays(15)))
        );

        String courseCode = authoringService.createCourse(req);
        assertNotNull(courseCode);

        Course saved = courseStore.values().stream()
                .filter(c -> courseCode.equals(c.getCourseId()))
                .findFirst()
                .orElse(null);

        assertNotNull(saved);
        assertNotNull(saved.getOwningDepartment());
        assertEquals("Operations", saved.getOwningDepartment().getName());
        assertEquals(hrAdmin.getId(), saved.getCreatedBy().getId());
    }

    @Test
    @DisplayName("2. Authorized Trainer can create a course owned by any department")
    void testAuthorizedTrainerCanCreateCourseOwnedByAnyDepartment() {
        currentUser = trainer;

        CourseAuthoringRequest req = buildSampleRequest(
                deptDoc.getId(), // Owned by Documentation
                List.of(new CourseAuthoringRequest.DepartmentAssignmentInput(deptDoc.getId(), "Documentation", "MANDATORY", LocalDate.now().plusDays(20)))
        );

        String courseCode = authoringService.createCourse(req);
        assertNotNull(courseCode);

        Course saved = courseStore.values().stream()
                .filter(c -> courseCode.equals(c.getCourseId()))
                .findFirst()
                .orElse(null);

        assertNotNull(saved);
        assertNotNull(saved.getOwningDepartment());
        assertEquals("Documentation", saved.getOwningDepartment().getName());
        assertEquals(trainer.getId(), saved.getCreatedBy().getId());
    }

    @Test
    @DisplayName("3. Course creator department does not determine course ownership")
    void testCourseCreatorDepartmentDoesNotDetermineOwnership() {
        // Trainer belongs to "Training" department, but creates course owned by "Accounts"
        currentUser = trainer;
        assertEquals("Training", trainer.getDepartment());

        CourseAuthoringRequest req = buildSampleRequest(
                deptAccounts.getId(), // Explicitly owned by Accounts
                List.of(new CourseAuthoringRequest.DepartmentAssignmentInput(deptAccounts.getId(), "Accounts", "MANDATORY", LocalDate.now().plusDays(30)))
        );

        String courseCode = authoringService.createCourse(req);
        Course saved = courseStore.values().stream()
                .filter(c -> courseCode.equals(c.getCourseId()))
                .findFirst()
                .orElse(null);

        assertNotNull(saved);
        assertEquals("Training", saved.getCreatedBy().getDepartment());
        assertEquals("Accounts", saved.getOwningDepartment().getName());
        assertNotEquals(saved.getCreatedBy().getDepartment(), saved.getOwningDepartment().getName());
    }

    @Test
    @DisplayName("4. A course can target multiple departments with distinct assignment types (Mandatory vs Recommended)")
    void testCourseCanTargetMultipleDepartmentsWithDistinctAssignmentTypes() {
        currentUser = hrAdmin;

        CourseAuthoringRequest req = buildSampleRequest(
                deptOps.getId(), // Course owner: Operations
                List.of(
                        new CourseAuthoringRequest.DepartmentAssignmentInput(deptOps.getId(), "Operations", "MANDATORY", LocalDate.now().plusDays(10)),
                        new CourseAuthoringRequest.DepartmentAssignmentInput(deptDoc.getId(), "Documentation", "RECOMMENDED", LocalDate.now().plusDays(30))
                )
        );

        String courseCode = authoringService.createCourse(req);
        Course saved = courseStore.values().stream()
                .filter(c -> courseCode.equals(c.getCourseId()))
                .findFirst()
                .orElse(null);

        assertNotNull(saved);
        assertEquals(2, assignmentStore.size());

        CourseDepartmentAssignment opsAssignment = assignmentStore.values().stream()
                .filter(a -> a.getDepartment().getId().equals(deptOps.getId()))
                .findFirst().orElse(null);
        CourseDepartmentAssignment docAssignment = assignmentStore.values().stream()
                .filter(a -> a.getDepartment().getId().equals(deptDoc.getId()))
                .findFirst().orElse(null);

        assertNotNull(opsAssignment);
        assertNotNull(docAssignment);
        assertEquals(EnrollmentType.MANDATORY, opsAssignment.getAssignmentType());
        assertEquals(EnrollmentType.RECOMMENDED, docAssignment.getAssignmentType());
    }

    @Test
    @DisplayName("5. Duplicate department assignments are rejected")
    void testDuplicateDepartmentAssignmentsAreRejected() {
        currentUser = hrAdmin;

        CourseAuthoringRequest req = buildSampleRequest(
                deptOps.getId(),
                List.of(
                        new CourseAuthoringRequest.DepartmentAssignmentInput(deptOps.getId(), "Operations", "MANDATORY", LocalDate.now().plusDays(10)),
                        new CourseAuthoringRequest.DepartmentAssignmentInput(deptOps.getId(), "Operations", "RECOMMENDED", LocalDate.now().plusDays(30))
                )
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> authoringService.createCourse(req));
        assertTrue(ex.getMessage().contains("Duplicate department assignment detected"));
    }

    @Test
    @DisplayName("6. Existing courses with unknown ownership remain accessible for HR/Admin review")
    void testExistingCoursesAndEnrollmentsRemainAccessible() {
        // Historical course with department_id = NULL
        Course legacyCourse = new Course();
        legacyCourse.setId(99L);
        legacyCourse.setCourseId("LEGACY-101");
        legacyCourse.setTitle("Historical Freight Compliance");
        legacyCourse.setActive(true);
        legacyCourse.setCategory("Operations");
        legacyCourse.setOwningDepartment(null); // Unknown historical ownership
        courseStore.put(99L, legacyCourse);

        // Map to DTO
        CourseDTO dto = courseMapper.toSummary(legacyCourse, null, "OPTIONAL");
        assertNotNull(dto);
        assertEquals("LEGACY-101", dto.getId());
        assertNull(dto.getDepartmentId()); // Explicitly NULL for HR/Admin review
        assertEquals("Operations", dto.getDepartment()); // Falls back to legacy category
    }

    @Test
    @DisplayName("7. Revoked enrollments are excluded from active assignments and restored safely on reassignment")
    void testRevokedEnrollmentsExcludedFromActiveAssignments() {
        Course course = new Course();
        course.setId(50L);
        course.setCourseId("OP-501");
        course.setTitle("Ocean Freight Documentation");
        course.setActive(true);
        course.setOwningDepartment(deptOps);
        courseStore.put(50L, course);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(701L);
        enrollment.setUser(employeeDoc);
        enrollment.setCourse(course);
        enrollment.setStatus(EnrollmentStatus.REVOKED);
        enrollment.setEnrollmentType(EnrollmentType.RECOMMENDED);
        enrollmentStore.put(701L, enrollment);

        // When reassigning to employeeDoc's department as MANDATORY
        enrollmentService.assignCourseToDepartment("Documentation", course.getId(), course.getCourseId(), LocalDate.now().plusDays(14), "MANDATORY", "L1");

        // The enrollment is restored rather than duplicated
        assertEquals(1, enrollmentStore.size());
        Enrollment updated = enrollmentStore.get(701L);
        assertNotNull(updated);
        assertNotEquals(EnrollmentStatus.REVOKED, updated.getStatus());
        assertEquals(EnrollmentStatus.NOT_STARTED, updated.getStatus());
        assertEquals(EnrollmentType.MANDATORY, updated.getEnrollmentType());
    }

    @Test
    @DisplayName("8. Employee/course enrollment uniqueness is preserved (no duplicate enrollments)")
    void testEmployeeCourseEnrollmentUniquenessPreserved() {
        Course course = new Course();
        course.setId(60L);
        course.setCourseId("OP-601");
        course.setTitle("Air Freight Operations");
        course.setActive(true);
        course.setOwningDepartment(deptOps);
        courseStore.put(60L, course);

        // First assignment
        enrollmentService.assignCourseToDepartment("Documentation", course.getId(), course.getCourseId(), LocalDate.now().plusDays(10), "RECOMMENDED", "L1");
        assertEquals(1, enrollmentStore.size());
        Enrollment first = enrollmentStore.values().iterator().next();
        assertEquals(EnrollmentType.RECOMMENDED, first.getEnrollmentType());

        // Second assignment as MANDATORY (overlapping target)
        enrollmentService.assignCourseToDepartment("Documentation", course.getId(), course.getCourseId(), LocalDate.now().plusDays(15), "MANDATORY", "L1");

        // Exactly one enrollment record remains, upgraded to MANDATORY
        assertEquals(1, enrollmentStore.size());
        Enrollment existing = enrollmentStore.get(first.getId());
        assertEquals(EnrollmentType.MANDATORY, existing.getEnrollmentType());
    }

    @Test
    @DisplayName("9. Cross-department recommended course completion reflects in both Home and Owning department reports")
    void testRecommendedCourseCompletionInHomeAndOwningDepartment() {
        // Course owner: Operations
        Course opsCourse = new Course();
        opsCourse.setId(88L);
        opsCourse.setCourseId("OP-888");
        opsCourse.setTitle("Port Operations Protocol");
        opsCourse.setActive(true);
        opsCourse.setOwningDepartment(deptOps);
        courseStore.put(88L, opsCourse);

        // Employee department: Documentation
        // Assignment: RECOMMENDED
        Enrollment enrollment = new Enrollment();
        enrollment.setId(901L);
        enrollment.setUser(employeeDoc);
        enrollment.setCourse(opsCourse);
        enrollment.setEnrollmentType(EnrollmentType.RECOMMENDED);
        enrollment.setStatus(EnrollmentStatus.COMPLETED);
        enrollment.setProgressPercent(100);
        enrollment.setScore(95);
        enrollment.setCertificateId("CERT-OP-888");
        enrollment.setCompletedDate(LocalDateTime.now());
        enrollmentStore.put(901L, enrollment);

        // 1. Employee personal transcript
        EmployeeTrainingTranscriptDTO transcript = managerReportsService.getEmployeeTrainingTranscript(employeeDoc.getId());
        assertEquals(1, transcript.getCourses().size());
        EmployeeTrainingTranscriptDTO.CourseRecordDTO record = transcript.getCourses().get(0);
        assertEquals("Operations", record.getCourseDepartment());
        assertEquals("Recommended", record.getAssignmentType());
        assertEquals(deptOps.getId(), record.getOwningDepartmentId());

        // 2. Documentation Department Courses (Home department)
        List<?> docCourses = departmentService.getCoursesByDepartment(deptDoc.getId());
        assertFalse(docCourses.isEmpty(), "Documentation reporting should reflect its employee taking the course");

        // 3. Operations Department Courses (Owning department)
        List<?> opsCourses = departmentService.getCoursesByDepartment(deptOps.getId());
        assertFalse(opsCourses.isEmpty(), "Operations reporting should reflect completion of its owned course");

        // 4. Exactly one enrollment record exists
        assertEquals(1, enrollmentStore.size());
    }

    @Test
    @DisplayName("10. Course.setDepartmentAssignments preserves collection identity without dereferencing orphan-tracked list")
    void testCourseDepartmentAssignmentsCollectionReferencePreserved() {
        Course course = new Course();
        List<CourseDepartmentAssignment> originalBag = course.getDepartmentAssignments();
        assertNotNull(originalBag);

        CourseDepartmentAssignment cda1 = new CourseDepartmentAssignment(course, deptOps, EnrollmentType.MANDATORY, LocalDate.now().plusDays(10));
        List<CourseDepartmentAssignment> newAssignments = new ArrayList<>(List.of(cda1));

        // Setting department assignments must preserve original collection reference
        course.setDepartmentAssignments(newAssignments);
        assertSame(originalBag, course.getDepartmentAssignments(),
                "Collection reference must be preserved to prevent Hibernate cascade all-delete-orphan exception");
        assertEquals(1, course.getDepartmentAssignments().size());
        assertEquals(deptOps, course.getDepartmentAssignments().get(0).getDepartment());
    }

    @Test
    @DisplayName("11. HR/Admin deletes published course: cascades cleanly without 500 error or foreign key exceptions")
    void testDeleteCourseCascadesCleanlyWithoutExceptions() {
        currentUser = hrAdmin;

        CourseAuthoringRequest req = buildSampleRequest(deptOps.getId(), List.of(
                new CourseAuthoringRequest.DepartmentAssignmentInput(null, "Documentation", "MANDATORY", LocalDate.now().plusDays(15))
        ));

        String createdCourseId = authoringService.createCourse(req);
        assertNotNull(createdCourseId);
        assertEquals(1, courseStore.size());
        assertEquals(1, assignmentStore.size());

        // Deleting course must succeed without exception
        assertDoesNotThrow(() -> authoringService.deleteCourse(createdCourseId));

        // Verify course and assignment stores are now empty
        assertEquals(0, courseStore.size(), "Course should be removed from store");
        assertEquals(0, assignmentStore.size(), "Course department assignments should be cascade removed");
    }

    @SuppressWarnings("unchecked")
    private <T> T createMockProxy(Class<T> iface, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(
                iface.getClassLoader(),
                new Class<?>[]{iface},
                (proxy, method, args) -> handler.handle(method, args == null ? new Object[0] : args)
        );
    }

    @FunctionalInterface
    interface InvocationHandler {
        Object handle(java.lang.reflect.Method method, Object[] args) throws Throwable;
    }
}
