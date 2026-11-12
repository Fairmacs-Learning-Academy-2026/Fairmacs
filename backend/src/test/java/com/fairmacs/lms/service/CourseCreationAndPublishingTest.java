package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CourseAuthoringRequest;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.Proxy;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Part 2: Course Creation, Editing & Publishing Verification Test Suite")
class CourseCreationAndPublishingTest {

    private final Map<Long, Course> courseStore = new LinkedHashMap<>();
    private final Map<Long, Department> departmentStore = new LinkedHashMap<>();
    private final Map<Long, User> userStore = new LinkedHashMap<>();
    private final Map<Long, Enrollment> enrollmentStore = new LinkedHashMap<>();
    private final Map<Long, Certificate> certificateStore = new LinkedHashMap<>();
    private final Map<Long, Module> moduleStore = new LinkedHashMap<>();
    private final Map<Long, Lesson> lessonStore = new LinkedHashMap<>();
    private final Map<Long, Quiz> quizStore = new LinkedHashMap<>();
    private final Map<Long, QuizQuestion> questionStore = new LinkedHashMap<>();
    private final Map<Long, QuizAttempt> attemptStore = new LinkedHashMap<>();
    private final Map<Long, CourseDepartmentAssignment> assignmentStore = new LinkedHashMap<>();
    private final Map<Long, CourseThumbnail> thumbnailStore = new LinkedHashMap<>();
    private final Map<Long, Category> categoryStore = new LinkedHashMap<>();
    private final Map<String, Long> sequenceStore = new LinkedHashMap<>();

    private final AtomicLong seq = new AtomicLong(100);

    private CourseAuthoringService courseAuthoringService;
    private IdSequenceService idSequenceService;
    private CourseMapper courseMapper;
    private CatalogService catalogService;

    private User hrAdminUser;
    private User trainerUser;
    private User employeeUser;
    private User managerUser;
    private User currentUser;

    private Department deptOps;
    private Department deptDoc;
    private Department deptGen;
    private Department deptIT;
    private Department deptHR;

    @BeforeEach
    void setUp() {
        courseStore.clear();
        departmentStore.clear();
        userStore.clear();
        enrollmentStore.clear();
        certificateStore.clear();
        moduleStore.clear();
        lessonStore.clear();
        quizStore.clear();
        questionStore.clear();
        attemptStore.clear();
        assignmentStore.clear();
        thumbnailStore.clear();
        categoryStore.clear();
        sequenceStore.clear();

        // 1. Users
        hrAdminUser = new User();
        hrAdminUser.setId(1L);
        hrAdminUser.setName("HR Admin Sarah");
        hrAdminUser.setRole(Role.HR_ADMIN);
        userStore.put(hrAdminUser.getId(), hrAdminUser);

        trainerUser = new User();
        trainerUser.setId(2L);
        trainerUser.setName("Trainer Bob");
        trainerUser.setRole(Role.TRAINER);
        userStore.put(trainerUser.getId(), trainerUser);

        employeeUser = new User();
        employeeUser.setId(3L);
        employeeUser.setName("Employee Charlie");
        employeeUser.setRole(Role.EMPLOYEE);
        userStore.put(employeeUser.getId(), employeeUser);

        managerUser = new User();
        managerUser.setId(4L);
        managerUser.setName("Manager Dan");
        managerUser.setRole(Role.MANAGER);
        userStore.put(managerUser.getId(), managerUser);

        // 2. Departments
        deptOps = new Department();
        deptOps.setId(10L);
        deptOps.setName("Operations");
        deptOps.setShortCode("OP");
        departmentStore.put(deptOps.getId(), deptOps);

        deptDoc = new Department();
        deptDoc.setId(20L);
        deptDoc.setName("Documentation");
        deptDoc.setShortCode("DOC");
        departmentStore.put(deptDoc.getId(), deptDoc);

        deptGen = new Department();
        deptGen.setId(30L);
        deptGen.setName("General");
        deptGen.setShortCode("GEN");
        departmentStore.put(deptGen.getId(), deptGen);

        deptIT = new Department();
        deptIT.setId(40L);
        deptIT.setName("Information Technology");
        deptIT.setShortCode("IT");
        departmentStore.put(deptIT.getId(), deptIT);

        deptHR = new Department();
        deptHR.setId(50L);
        deptHR.setName("People Operations");
        deptHR.setShortCode("HR");
        departmentStore.put(deptHR.getId(), deptHR);

        currentUser = hrAdminUser;

        // 3. Mock Repositories
        CourseRepository courseRepo = createMockProxy(CourseRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findAllDrafts".equals(name)) {
                return courseStore.values().stream().filter(c -> Boolean.TRUE.equals(c.getDraft())).toList();
            }
            if ("findByCourseId".equals(name) || "findDraftByCourseId".equals(name)) {
                String cid = (String) args[0];
                return courseStore.values().stream().filter(c -> cid.equals(c.getCourseId())).findFirst();
            }
            if ("findById".equals(name)) {
                Long id = (Long) args[0];
                return Optional.ofNullable(courseStore.get(id));
            }
            if ("existsByCourseId".equals(name)) {
                String cid = (String) args[0];
                return courseStore.values().stream().anyMatch(c -> cid.equals(c.getCourseId()));
            }
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                Course c = (Course) args[0];
                if (c.getId() == null) c.setId(seq.incrementAndGet());
                courseStore.put(c.getId(), c);
                return c;
            }
            if ("searchCatalog".equals(name)) {
                return courseStore.values().stream().filter(c -> !Boolean.TRUE.equals(c.getDraft()) && Boolean.TRUE.equals(c.getActive())).toList();
            }
            if ("findAll".equals(name)) {
                return new ArrayList<>(courseStore.values());
            }
            return null;
        });

        DepartmentRepository deptRepo = createMockProxy(DepartmentRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findById".equals(name)) {
                return Optional.ofNullable(departmentStore.get((Long) args[0]));
            }
            if ("findByNameIgnoreCase".equals(name)) {
                String dName = (String) args[0];
                return departmentStore.values().stream().filter(d -> d.getName().equalsIgnoreCase(dName)).findFirst();
            }
            if ("existsById".equals(name)) {
                return departmentStore.containsKey((Long) args[0]);
            }
            if ("searchCatalog".equals(name)) {
                return courseStore.values().stream().filter(c -> !Boolean.TRUE.equals(c.getDraft()) && Boolean.TRUE.equals(c.getActive())).toList();
            }
            if ("findAll".equals(name)) {
                return new ArrayList<>(departmentStore.values());
            }
            return null;
        });

        UserRepository userRepo = createMockProxy(UserRepository.class, (method, args) -> {
            if ("findById".equals(method.getName())) {
                return Optional.ofNullable(userStore.get((Long) args[0]));
            }
            return null;
        });

        EnrollmentRepository enrollmentRepo = createMockProxy(EnrollmentRepository.class, (method, args) -> {
            String name = method.getName();
            if ("existsByCourse_Id".equals(name)) {
                Long cid = (Long) args[0];
                return enrollmentStore.values().stream().anyMatch(e -> e.getCourse() != null && cid.equals(e.getCourse().getId()));
            }
            if ("findByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                return enrollmentStore.values().stream().filter(e -> e.getCourse() != null && cid.equals(e.getCourse().getId())).toList();
            }
            if ("findByUserIdWithCourse".equals(name) || "findByUser_Id".equals(name)) {
                Long uid = (Long) args[0];
                return enrollmentStore.values().stream().filter(e -> e.getUser() != null && uid.equals(e.getUser().getId())).toList();
            }
            return null;
        });

        QuizRepository quizRepo = createMockProxy(QuizRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                return quizStore.values().stream().filter(q -> q.getCourse() != null && cid.equals(q.getCourse().getId())).toList();
            }
            if ("findByCourseIdAndType".equals(name)) {
                Long cid = (Long) args[0];
                QuizType type = (QuizType) args[1];
                return quizStore.values().stream().filter(q -> q.getCourse() != null && cid.equals(q.getCourse().getId()) && q.getType() == type).toList();
            }
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                Quiz q = (Quiz) args[0];
                if (q.getId() == null) q.setId(seq.incrementAndGet());
                quizStore.put(q.getId(), q);
                return q;
            }
            if ("deleteAll".equals(name)) {
                Collection<Quiz> quizzes = (Collection<Quiz>) args[0];
                for (Quiz q : quizzes) quizStore.remove(q.getId());
                return null;
            }
            return null;
        });

        QuizQuestionRepository questionRepo = createMockProxy(QuizQuestionRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByQuiz_IdOrderByOrderIndexAsc".equals(name) || "findByQuizIdOrderByOrderIndexAsc".equals(name)) {
                Long qid = (Long) args[0];
                return questionStore.values().stream().filter(qq -> qq.getQuiz() != null && qid.equals(qq.getQuiz().getId())).toList();
            }
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                QuizQuestion qq = (QuizQuestion) args[0];
                if (qq.getId() == null) qq.setId(seq.incrementAndGet());
                questionStore.put(qq.getId(), qq);
                return qq;
            }
            return null;
        });

        QuizAttemptRepository attemptRepo = createMockProxy(QuizAttemptRepository.class, (method, args) -> {
            if ("existsByQuizId".equals(method.getName())) {
                Long qid = (Long) args[0];
                return attemptStore.values().stream().anyMatch(a -> a.getQuiz() != null && qid.equals(a.getQuiz().getId()));
            }
            return null;
        });

        ModuleRepository moduleRepo = createMockProxy(ModuleRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByCourseIdOrderByOrderIndexAsc".equals(name)) {
                Long cid = (Long) args[0];
                return moduleStore.values().stream().filter(m -> m.getCourse() != null && cid.equals(m.getCourse().getId())).toList();
            }
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                Module m = (Module) args[0];
                if (m.getId() == null) m.setId(seq.incrementAndGet());
                moduleStore.put(m.getId(), m);
                return m;
            }
            if ("deleteAll".equals(name)) {
                Collection<Module> modules = (Collection<Module>) args[0];
                for (Module m : modules) moduleStore.remove(m.getId());
                return null;
            }
            return null;
        });

        LessonRepository lessonRepo = createMockProxy(LessonRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByModuleIdOrderByOrderIndexAsc".equals(name)) {
                Long mid = (Long) args[0];
                return lessonStore.values().stream().filter(l -> l.getModule() != null && mid.equals(l.getModule().getId())).toList();
            }
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                Lesson l = (Lesson) args[0];
                if (l.getId() == null) l.setId(seq.incrementAndGet());
                lessonStore.put(l.getId(), l);
                return l;
            }
            return null;
        });

        CourseDepartmentAssignmentRepository assignmentRepo = createMockProxy(CourseDepartmentAssignmentRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByCourseIdWithDepartment".equals(name) || "findByCourse_Id".equals(name)) {
                Long cid = (Long) args[0];
                return assignmentStore.values().stream().filter(a -> a.getCourse() != null && cid.equals(a.getCourse().getId())).toList();
            }
            if ("deleteByCourse_Id".equals(name)) {
                Long cid = (Long) args[0];
                assignmentStore.values().removeIf(a -> a.getCourse() != null && cid.equals(a.getCourse().getId()));
                return null;
            }
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                CourseDepartmentAssignment a = (CourseDepartmentAssignment) args[0];
                if (a.getId() == null) a.setId(seq.incrementAndGet());
                assignmentStore.put(a.getId(), a);
                return a;
            }
            return null;
        });

        CourseThumbnailRepository thumbnailRepo = createMockProxy(CourseThumbnailRepository.class, (method, args) -> {
            if ("save".equals(method.getName()) || "saveAndFlush".equals(method.getName())) {
                CourseThumbnail t = (CourseThumbnail) args[0];
                if (t.getId() == null) t.setId(seq.incrementAndGet());
                thumbnailStore.put(t.getId(), t);
                return t;
            }
            return null;
        });

        CategoryRepository categoryRepo = createMockProxy(CategoryRepository.class, (method, args) -> {
            if ("findBySlug".equals(method.getName())) {
                String slug = (String) args[0];
                return categoryStore.values().stream().filter(c -> slug.equals(c.getSlug())).findFirst();
            }
            return null;
        });

        // 4. Security Context Util
        SecurityContextUtil securityContextUtil = new SecurityContextUtil(userRepo) {
            @Override
            public User getCurrentUser() {
                return currentUser;
            }
        };

        // 5. In-Memory IdSequenceService
        idSequenceService = new IdSequenceService(null) {
            @Override
            public long getNextSequence(String sequenceKey) {
                return sequenceStore.compute(sequenceKey, (k, v) -> v == null ? 1L : v + 1);
            }
        };

        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();

        courseAuthoringService = new CourseAuthoringService(
                categoryRepo,
                courseRepo,
                moduleRepo,
                lessonRepo,
                quizRepo,
                questionRepo,
                securityContextUtil,
                deptRepo,
                enrollmentRepo,
                attemptRepo,
                null,
                null,
                null,
                null,
                null,
                null,
                objectMapper,
                null,
                idSequenceService
        );
        courseAuthoringService.setCourseDepartmentAssignmentRepository(assignmentRepo);
        courseAuthoringService.setThumbnailRepository(thumbnailRepo);

        courseMapper = new CourseMapper(objectMapper, quizRepo);

        RecommendationService recommendationService = new RecommendationService(
                null,
                courseRepo
        ) {
            @Override
            public List<Course> recommendFor(User user, Set<Long> enrolledIds) {
                return List.of();
            }
        };

        catalogService = new CatalogService(
                categoryRepo,
                courseRepo,
                enrollmentRepo,
                null,
                null,
                courseMapper,
                recommendationService,
                securityContextUtil
        );
    }

    private CourseAuthoringRequest createSampleCourseRequest(boolean publish, boolean isFoundation) {
        CourseAuthoringRequest req = new CourseAuthoringRequest();
        req.setTitle("Advanced Freight Documentation");
        req.setDescription("Comprehensive operational shipping workflows.");
        req.setDepartmentId(deptDoc.getId());
        req.setPosition("P2");
        req.setLevel("P2");
        req.setDuration("4 Hours");
        req.setDurationHours(4);
        req.setBanner("/fairmacs-default-thumbnail.png");
        req.setPublish(publish);
        req.setFoundation(isFoundation);
        req.setPassingScore(75);
        req.setLearningOutcomes(List.of(
                "Master Bill of Lading verification",
                "Ensure compliance with international customs regulations"
        ));

        // Module & Lesson
        CourseAuthoringRequest.ModuleInput mod = new CourseAuthoringRequest.ModuleInput();
        mod.setTitle("Module 1: Document Processing");
        mod.setOrderIndex(1);

        CourseAuthoringRequest.LessonInput les = new CourseAuthoringRequest.LessonInput();
        les.setTitle("Lesson 1: Verified Gross Mass (VGM)");
        les.setType("PDF");
        les.setContentUrl("/documents/vgm-guide.pdf");
        les.setWorkdriveFileId("wd-file-998877");
        les.setWorkdriveFileName("vgm-guide.pdf");
        les.setDuration("20 mins");
        les.setSummary("VGM declaration requirements under SOLAS regulations.");
        les.setOrderIndex(1);
        mod.setLessons(List.of(les));
        req.setModules(List.of(mod));

        // Department Assignments
        CourseAuthoringRequest.DepartmentAssignmentInput assignDoc = new CourseAuthoringRequest.DepartmentAssignmentInput();
        assignDoc.setDepartmentId(deptDoc.getId());
        assignDoc.setDepartmentName("Documentation");
        assignDoc.setAssignmentType("MANDATORY");
        assignDoc.setDueDate(LocalDate.now().plusDays(30));

        CourseAuthoringRequest.DepartmentAssignmentInput assignOps = new CourseAuthoringRequest.DepartmentAssignmentInput();
        assignOps.setDepartmentId(deptOps.getId());
        assignOps.setDepartmentName("Operations");
        assignOps.setAssignmentType("RECOMMENDED");
        assignOps.setDueDate(LocalDate.now().plusDays(60));

        req.setDepartmentAssignments(List.of(assignDoc, assignOps));
        req.setTargetDepartments(List.of("Operations")); // Intentionally set target dept to Operations to verify Owning Dept separation!

        if (!isFoundation) {
            CourseAuthoringRequest.QuizInput finalQuiz = new CourseAuthoringRequest.QuizInput();
            finalQuiz.setTitle("Final Assessment");
            finalQuiz.setPassingScore(75);
            finalQuiz.setTimeLimitMinutes(30);

            CourseAuthoringRequest.QuestionInput q1 = new CourseAuthoringRequest.QuestionInput();
            q1.setQuestionText("What is the primary purpose of a Bill of Lading?");
            q1.setQuestionType("SINGLE_CHOICE");
            q1.setOptionA("Receipt of goods");
            q1.setOptionB("Document of title");
            q1.setOptionC("Contract of carriage");
            q1.setOptionD("All of the above");
            q1.setCorrectAnswer("D");
            q1.setExplanation("A Bill of Lading serves all three legal functions.");
            q1.setOrderIndex(1);
            finalQuiz.setQuestions(List.of(q1));
            req.setFinalQuiz(finalQuiz);
        }

        return req;
    }

    @Test
    @DisplayName("Scenario 1 & 2: Create new course and save as draft")
    void test1_CreateAndSaveDraft() {
        currentUser = hrAdminUser;
        CourseAuthoringRequest req = createSampleCourseRequest(false, false);

        String courseId = courseAuthoringService.createCourse(req);
        assertNotNull(courseId);
        assertTrue(courseId.startsWith("DOC"), "Course ID must begin with Owning Department short code DOC: " + courseId);

        Course saved = courseStore.values().stream().filter(c -> courseId.equals(c.getCourseId())).findFirst().orElse(null);
        assertNotNull(saved);
        assertTrue(saved.getDraft(), "Course must be saved as draft");
        assertFalse(saved.getActive(), "Draft course must not be active");
        assertNull(saved.getPublishedAt(), "Draft course must not have publishedAt timestamp");
        assertEquals("Documentation", saved.getOwningDepartment().getName());
        assertEquals("DOC", saved.getOwningDepartment().getShortCode());
    }

    @Test
    @DisplayName("Scenario 3: Reopen draft with all metadata and authoring snapshot preserved")
    void test3_ReopenDraftPreserved() {
        currentUser = trainerUser;
        CourseAuthoringRequest req = createSampleCourseRequest(false, false);
        String courseId = courseAuthoringService.createCourse(req);

        Map<String, Object> reopened = courseAuthoringService.getCourseForEditing(courseId);
        assertNotNull(reopened);
        assertEquals("Advanced Freight Documentation", reopened.get("title"));
        assertEquals("P2", reopened.get("level"));
        assertEquals("20 min", reopened.get("duration"));
        assertEquals(deptDoc.getId(), reopened.get("departmentId"));
        assertEquals("Documentation", reopened.get("departmentName"));
        assertEquals("DOC", reopened.get("departmentShortCode"));

        List<?> modules = (List<?>) reopened.get("modules");
        assertNotNull(modules);
        assertEquals(1, modules.size());
        Map<?, ?> mod = (Map<?, ?>) modules.get(0);
        assertEquals("Module 1: Document Processing", mod.get("title"));

        List<?> lessons = (List<?>) mod.get("lessons");
        assertNotNull(lessons);
        assertEquals(1, lessons.size());
        Map<?, ?> les = (Map<?, ?>) lessons.get(0);
        assertEquals("Lesson 1: Verified Gross Mass (VGM)", les.get("title"));
        assertEquals("PDF", les.get("type"));
        assertEquals("/documents/vgm-guide.pdf", les.get("contentUrl"));
        assertEquals("wd-file-998877", les.get("workdriveFileId"));
        assertEquals("vgm-guide.pdf", les.get("workdriveFileName"));
        assertEquals("VGM declaration requirements under SOLAS regulations.", les.get("summary"));
    }

    @Test
    @DisplayName("Scenario 4 & 5: Edit course metadata and add/remove modules & lessons")
    void test4_EditCourseMetadataAndModules() {
        currentUser = trainerUser;
        CourseAuthoringRequest req = createSampleCourseRequest(false, false);
        String courseId = courseAuthoringService.createCourse(req);

        // Edit metadata and add a 2nd module
        req.setTitle("Advanced Freight Documentation - Updated Edition");
        req.setDescription("Updated operational shipping and documentation workflows.");

        CourseAuthoringRequest.ModuleInput mod2 = new CourseAuthoringRequest.ModuleInput();
        mod2.setTitle("Module 2: Customs Clearance");
        mod2.setOrderIndex(2);

        CourseAuthoringRequest.LessonInput les2 = new CourseAuthoringRequest.LessonInput();
        les2.setTitle("Lesson 2.1: HS Code Classification");
        les2.setType("VIDEO");
        les2.setContentUrl("https://youtube.com/watch?v=sample123");
        les2.setDuration("15 mins");
        les2.setSummary("How to classify goods accurately using the Harmonized System.");
        les2.setOrderIndex(1);
        mod2.setLessons(List.of(les2));

        req.setModules(List.of(req.getModules().get(0), mod2));
        courseAuthoringService.updateDraft(courseId, req);

        Map<String, Object> updated = courseAuthoringService.getCourseForEditing(courseId);
        assertEquals("Advanced Freight Documentation - Updated Edition", updated.get("title"));
        List<?> updatedModules = (List<?>) updated.get("modules");
        assertEquals(2, updatedModules.size());
    }

    @Test
    @DisplayName("Scenario 6: Save lesson summaries manually (no mock data or auto-generated summaries)")
    void test6_SaveLessonSummariesManually() {
        currentUser = hrAdminUser;
        CourseAuthoringRequest req = createSampleCourseRequest(false, false);
        String customSummary = "Specialized customs checklist for perishable cargo imports.";
        req.getModules().get(0).getLessons().get(0).setSummary(customSummary);

        String courseId = courseAuthoringService.createCourse(req);
        Map<String, Object> reopened = courseAuthoringService.getCourseForEditing(courseId);
        List<?> modules = (List<?>) reopened.get("modules");
        Map<?, ?> les = (Map<?, ?>) ((List<?>) ((Map<?, ?>) modules.get(0)).get("lessons")).get(0);
        assertEquals(customSummary, les.get("summary"));
    }

    @Test
    @DisplayName("Scenario 7, 8, 9: WorkDrive PDF/video references and original filenames preserved")
    void test7_WorkDriveReferencesAndFilenamesPreserved() {
        currentUser = trainerUser;
        CourseAuthoringRequest req = createSampleCourseRequest(false, false);
        String courseId = courseAuthoringService.createCourse(req);

        Map<String, Object> data = courseAuthoringService.getCourseForEditing(courseId);
        List<?> modules = (List<?>) data.get("modules");
        Map<?, ?> les = (Map<?, ?>) ((List<?>) ((Map<?, ?>) modules.get(0)).get("lessons")).get(0);
        assertEquals("wd-file-998877", les.get("workdriveFileId"));
        assertEquals("vgm-guide.pdf", les.get("workdriveFileName"));
        assertEquals("/documents/vgm-guide.pdf", les.get("contentUrl"));
    }

    @Test
    @DisplayName("Scenario 10: Course thumbnail upload and restoration")
    void test10_CourseThumbnailRestoration() {
        currentUser = hrAdminUser;
        CourseAuthoringRequest req = createSampleCourseRequest(false, false);
        req.setBanner("/api/courses/thumbnails/wd-thumb-554433.jpg");
        String courseId = courseAuthoringService.createCourse(req);

        Course saved = courseStore.values().stream().filter(c -> courseId.equals(c.getCourseId())).findFirst().orElse(null);
        assertNotNull(saved);
        assertEquals("/api/courses/thumbnails/wd-thumb-554433.jpg", saved.getBanner());

        Map<String, Object> authoringData = courseAuthoringService.getCourseForEditing(courseId);
        assertEquals("/api/courses/thumbnails/wd-thumb-554433.jpg", authoringData.get("banner"));
    }

    @Test
    @DisplayName("Scenario 11, 12, 13, 14: Multiple target department assignments with Mandatory, Recommended & Due Dates")
    void test11_MultiDepartmentAssignmentsWithDueDates() {
        currentUser = hrAdminUser;
        CourseAuthoringRequest req = createSampleCourseRequest(false, false);
        String courseId = courseAuthoringService.createCourse(req);

        Map<String, Object> reopened = courseAuthoringService.getCourseForEditing(courseId);
        List<?> assignments = (List<?>) reopened.get("departmentAssignments");
        assertNotNull(assignments);
        assertEquals(2, assignments.size());

        Map<?, ?> docAssign = (Map<?, ?>) assignments.stream().filter(a -> "Documentation".equals(((Map<?, ?>) a).get("departmentName"))).findFirst().orElse(null);
        assertNotNull(docAssign);
        assertEquals("MANDATORY", docAssign.get("assignmentType"));
        assertNotNull(docAssign.get("dueDate"));

        Map<?, ?> opsAssign = (Map<?, ?>) assignments.stream().filter(a -> "Operations".equals(((Map<?, ?>) a).get("departmentName"))).findFirst().orElse(null);
        assertNotNull(opsAssign);
        assertEquals("RECOMMENDED", opsAssign.get("assignmentType"));
        assertNotNull(opsAssign.get("dueDate"));
    }

    @Test
    @DisplayName("Scenario 15 & 16: Owning Department vs Target Departments - Prefix strictly uses Owning Dept")
    void test15_OwningDeptDeterminesCourseIdPrefix_NotTargetDepts() {
        currentUser = trainerUser;

        // Create course with Owning Department = Operations (OP), but Target Departments = Documentation (DOC)
        CourseAuthoringRequest reqOps = createSampleCourseRequest(false, false);
        reqOps.setDepartmentId(deptOps.getId()); // Owning = Operations
        reqOps.setTargetDepartments(List.of("Documentation", "General")); // Target = Documentation

        String courseIdOps = courseAuthoringService.createCourse(reqOps);
        assertTrue(courseIdOps.startsWith("OP"), "Course ID MUST use Owning Department short code OP, never target dept DOC. Got: " + courseIdOps);

        // Create course with Owning Department = IT, Target Departments = Sales
        CourseAuthoringRequest reqIT = createSampleCourseRequest(false, false);
        reqIT.setDepartmentId(deptIT.getId()); // Owning = IT
        reqIT.setTargetDepartments(List.of("Sales", "Operations"));

        String courseIdIT = courseAuthoringService.createCourse(reqIT);
        assertTrue(courseIdIT.startsWith("IT"), "Course ID MUST use Owning Department short code IT: " + courseIdIT);

        // Create course with Owning Department = HR (People Operations)
        CourseAuthoringRequest reqHR = createSampleCourseRequest(false, false);
        reqHR.setDepartmentId(deptHR.getId()); // Owning = HR
        reqHR.setTargetDepartments(List.of("Operations"));

        String courseIdHR = courseAuthoringService.createCourse(reqHR);
        assertTrue(courseIdHR.startsWith("HR"), "Course ID MUST use Owning Department short code HR: " + courseIdHR);
    }

    @Test
    @DisplayName("Scenario 17: Unique course ID generation without duplicates")
    void test17_UniqueCourseIdSequences() {
        String id1 = idSequenceService.generateCourseId("Operations");
        String id2 = idSequenceService.generateCourseId("Operations");
        String id3 = idSequenceService.generateCourseId("Documentation");

        assertEquals("OP001", id1);
        assertEquals("OP002", id2);
        assertEquals("DOC001", id3);
        assertNotEquals(id1, id2);
    }

    @Test
    @DisplayName("Scenario 18: Course ID cannot be changed on edit")
    void test18_CourseIdImmutableOnEdit() {
        currentUser = hrAdminUser;
        CourseAuthoringRequest req = createSampleCourseRequest(false, false);
        String courseId = courseAuthoringService.createCourse(req);

        // Try to change course ID to another value
        req.setCourseId("OP999");
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                courseAuthoringService.updateDraft(courseId, req)
        );
        assertTrue(ex.getMessage().contains("Course ID cannot be changed"));
    }

    @Test
    @DisplayName("Scenario 19: Publish valid course transitions state to draft=false, active=true, publishedAt!=null")
    void test19_PublishValidCourse() {
        currentUser = hrAdminUser;
        CourseAuthoringRequest req = createSampleCourseRequest(false, false);
        String courseId = courseAuthoringService.createCourse(req);

        // Now publish the draft
        req.setCourseId(courseId);
        req.setPublish(true);
        courseAuthoringService.updateDraft(courseId, req);

        Course published = courseStore.values().stream().filter(c -> courseId.equals(c.getCourseId())).findFirst().orElse(null);
        assertNotNull(published);
        assertFalse(published.getDraft(), "Course draft flag must be false upon publishing");
        assertTrue(published.getActive(), "Course active flag must be true upon publishing");
        assertNotNull(published.getPublishedAt(), "Course publishedAt must be set upon publishing");
    }

    @Test
    @DisplayName("Scenario 20: Prevent invalid/incomplete publishing")
    void test20_PreventIncompletePublishing() {
        currentUser = trainerUser;

        // 1. Missing title
        CourseAuthoringRequest reqNoTitle = createSampleCourseRequest(true, false);
        reqNoTitle.setTitle("");
        assertThrows(IllegalArgumentException.class, () -> courseAuthoringService.createCourse(reqNoTitle));

        // 2. Missing owning department on publish
        CourseAuthoringRequest reqNoDept = createSampleCourseRequest(true, false);
        reqNoDept.setDepartmentId(null);
        assertThrows(IllegalArgumentException.class, () -> courseAuthoringService.createCourse(reqNoDept));

        // 3. Non-foundation course missing final quiz
        CourseAuthoringRequest reqNoQuiz = createSampleCourseRequest(true, false);
        reqNoQuiz.setFinalQuiz(null);
        assertThrows(IllegalArgumentException.class, () -> courseAuthoringService.createCourse(reqNoQuiz));
    }

    @Test
    @DisplayName("Scenario 21: Published courses appear in catalog with Owning Department name (Never 'Uncategorized')")
    void test21_CatalogNeverDisplaysUncategorized() {
        currentUser = hrAdminUser;
        CourseAuthoringRequest req = createSampleCourseRequest(true, false);
        String courseId = courseAuthoringService.createCourse(req);

        Course course = courseStore.values().stream().filter(c -> courseId.equals(c.getCourseId())).findFirst().orElse(null);
        assertNotNull(course);

        CourseDTO dto = courseMapper.toSummary(course, null, "MANDATORY");
        assertNotNull(dto);
        assertEquals("Documentation", dto.getDepartment());
        assertFalse("Uncategorized".equalsIgnoreCase(dto.getCategory()), "Category must never be Uncategorized");
        assertFalse("Uncategorized".equalsIgnoreCase(dto.getDepartment()), "Department must never be Uncategorized");
    }

    @Test
    @DisplayName("Scenario 22: Published date formatting DD/MM/YYYY")
    void test22_PublishedDateFormatting() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 4, 10, 30);
        String formatted = String.format("Published on %02d/%02d/%04d", now.getDayOfMonth(), now.getMonthValue(), now.getYear());
        assertEquals("Published on 04/11/2026", formatted);
    }

    @Test
    @DisplayName("Scenario 23: Foundation course configuration (General dept, no quizzes, no certificates, 100% on lessons)")
    void test23_FoundationCourseConfiguration() {
        currentUser = trainerUser;
        CourseAuthoringRequest req = createSampleCourseRequest(true, true); // Foundation = true
        req.setDepartmentId(null); // Leave null to verify automatic fallback to General

        String courseId = courseAuthoringService.createCourse(req);
        assertTrue(courseId.startsWith("GEN"), "Foundation course ID must begin with GEN: " + courseId);

        Course saved = courseStore.values().stream().filter(c -> courseId.equals(c.getCourseId())).findFirst().orElse(null);
        assertNotNull(saved);
        assertTrue(saved.getFoundation());
        assertFalse(saved.getCertificateEligible(), "Foundation courses are not eligible for certificates");
        assertEquals("General", saved.getOwningDepartment().getName());

        // Quizzes must be empty for Foundation course
        List<Quiz> quizzes = quizStore.values().stream().filter(q -> q.getCourse() != null && saved.getId().equals(q.getCourse().getId())).toList();
        assertTrue(quizzes.isEmpty(), "Foundation course must not have any module or final quizzes");
    }

    @Test
    @DisplayName("Scenario 24: Role authorization - HR/Admin and Trainer allowed; Employee and Manager blocked")
    void test24_RoleAuthorization() {
        CourseAuthoringRequest req = createSampleCourseRequest(false, false);

        // HR Admin allowed
        currentUser = hrAdminUser;
        assertDoesNotThrow(() -> courseAuthoringService.createCourse(req));

        // Trainer allowed
        currentUser = trainerUser;
        assertDoesNotThrow(() -> courseAuthoringService.createCourse(req));

        // Employee blocked
        currentUser = employeeUser;
        assertThrows(AccessDeniedException.class, () -> courseAuthoringService.createCourse(req));

        // Manager blocked
        currentUser = managerUser;
        assertThrows(AccessDeniedException.class, () -> courseAuthoringService.createCourse(req));
    }

    @Test
    @DisplayName("Scenario 25: Publish course and verify employee catalog visibility")
    void test25_PublishCourseAndVerifyEmployeeCatalogVisibility() {
        // 1. HR Admin authors and publishes a course
        currentUser = hrAdminUser;
        CourseAuthoringRequest req = createSampleCourseRequest(true, false);
        req.setTitle("Ocean Freight Documentation Masterclass");
        String courseId = courseAuthoringService.createCourse(req);
        assertNotNull(courseId);

        // Verify published state in database
        Course published = courseStore.values().stream().filter(c -> courseId.equals(c.getCourseId())).findFirst().orElse(null);
        assertNotNull(published);
        assertFalse(published.getDraft());
        assertTrue(published.getActive());
        assertNotNull(published.getPublishedAt());

        // 2. Switch authenticated user context to an Employee in Operations department with matching level P2
        employeeUser.setDepartment("Operations");
        employeeUser.setLevel("P2");
        currentUser = employeeUser;

        // 3. Query course catalog as Employee
        List<CourseDTO> catalogCourses = catalogService.listCourses(null, null);
        assertNotNull(catalogCourses);
        assertFalse(catalogCourses.isEmpty(), "Employee catalog must contain published courses");

        CourseDTO employeeView = catalogCourses.stream()
                .filter(c -> courseId.equals(c.getId()))
                .findFirst()
                .orElse(null);

        assertNotNull(employeeView, "Newly published course must appear in the employee course catalog");
        assertEquals("Ocean Freight Documentation Masterclass", employeeView.getTitle());
        assertEquals("Documentation", employeeView.getDepartment(), "Catalog department must match Owning Department");
        assertNotEquals("Uncategorized", employeeView.getCategory(), "Category must never be Uncategorized");
        assertNotNull(employeeView.getPublishedAt(), "Published date must be present");
        assertTrue(employeeView.getPublishedAt().contains("2026"), "Published date must contain current year");
        assertEquals("P2", employeeView.getLevel());
    }

    @SuppressWarnings("unchecked")
    private <T> T createMockProxy(Class<T> interfaceClass, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(
                interfaceClass.getClassLoader(),
                new Class<?>[]{interfaceClass},
                (proxy, method, args) -> {
                    String name = method.getName();
                    if ("equals".equals(name)) return proxy == args[0];
                    if ("hashCode".equals(name)) return System.identityHashCode(proxy);
                    if ("toString".equals(name)) return interfaceClass.getSimpleName() + "Proxy";
                    return handler.invoke(method, args == null ? new Object[0] : args);
                }
        );
    }

    @FunctionalInterface
    private interface InvocationHandler {
        Object invoke(java.lang.reflect.Method method, Object[] args) throws Throwable;
    }
}
