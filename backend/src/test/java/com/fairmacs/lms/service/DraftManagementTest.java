package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CourseAuthoringRequest;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.Proxy;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Part 1: Draft Management Complete Audit & Verification Test Suite")
class DraftManagementTest {

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
    private final Map<Long, Category> categoryStore = new LinkedHashMap<>();

    private final AtomicLong seq = new AtomicLong(100);

    private DraftService draftService;
    private CourseAuthoringService courseAuthoringService;

    private User hrAdminUser;
    private User trainerUser1;
    private User trainerUser2;
    private User employeeUser;
    private User managerUser;

    private User currentUser;

    private Department deptOps;
    private Department deptDoc;

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
        categoryStore.clear();

        // 1. Users
        hrAdminUser = new User();
        hrAdminUser.setId(1L);
        hrAdminUser.setName("HR Admin Sarah");
        hrAdminUser.setRole(Role.HR_ADMIN);
        userStore.put(hrAdminUser.getId(), hrAdminUser);

        trainerUser1 = new User();
        trainerUser1.setId(2L);
        trainerUser1.setName("Trainer Bob");
        trainerUser1.setRole(Role.TRAINER);
        userStore.put(trainerUser1.getId(), trainerUser1);

        trainerUser2 = new User();
        trainerUser2.setId(3L);
        trainerUser2.setName("Trainer Alice");
        trainerUser2.setRole(Role.TRAINER);
        userStore.put(trainerUser2.getId(), trainerUser2);

        employeeUser = new User();
        employeeUser.setId(4L);
        employeeUser.setName("Employee Charlie");
        employeeUser.setRole(Role.EMPLOYEE);
        userStore.put(employeeUser.getId(), employeeUser);

        managerUser = new User();
        managerUser.setId(5L);
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

        currentUser = hrAdminUser;

        // Repositories
        CourseRepository courseRepo = createMockProxy(CourseRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findAllDrafts".equals(name)) {
                return courseStore.values().stream().filter(c -> Boolean.TRUE.equals(c.getDraft())).toList();
            }
            if ("findDraftsByOwnerId".equals(name)) {
                Long uid = (Long) args[0];
                return courseStore.values().stream().filter(c -> Boolean.TRUE.equals(c.getDraft()) && c.getCreatedBy() != null && uid.equals(c.getCreatedBy().getId())).toList();
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
            if ("findAll".equals(name)) {
                return new ArrayList<>(courseStore.values());
            }
            return null;
        });

        UserRepository userRepo = createMockProxy(UserRepository.class, (method, args) -> {
            if ("findById".equals(method.getName())) {
                return Optional.ofNullable(userStore.get((Long) args[0]));
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
            if ("findAll".equals(name)) {
                return new ArrayList<>(departmentStore.values());
            }
            return null;
        });

        QuizRepository quizRepo = createMockProxy(QuizRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                return quizStore.values().stream().filter(q -> q.getCourse() != null && cid.equals(q.getCourse().getId())).toList();
            }
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                Quiz q = (Quiz) args[0];
                if (q.getId() == null) q.setId(seq.incrementAndGet());
                quizStore.put(q.getId(), q);
                return q;
            }
            if ("deleteAll".equals(name)) {
                @SuppressWarnings("unchecked")
                Iterable<Quiz> items = (Iterable<Quiz>) args[0];
                for (Quiz q : items) quizStore.remove(q.getId());
                return null;
            }
            if ("deleteByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                quizStore.values().removeIf(q -> q.getCourse() != null && cid.equals(q.getCourse().getId()));
                return null;
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
                @SuppressWarnings("unchecked")
                Iterable<Module> items = (Iterable<Module>) args[0];
                for (Module m : items) moduleStore.remove(m.getId());
                return null;
            }
            if ("deleteByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                moduleStore.values().removeIf(m -> m.getCourse() != null && cid.equals(m.getCourse().getId()));
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
            if ("save".equals(name)) {
                Lesson l = (Lesson) args[0];
                if (l.getId() == null) l.setId(seq.incrementAndGet());
                lessonStore.put(l.getId(), l);
                return l;
            }
            if ("deleteByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                lessonStore.values().removeIf(l -> l.getModule() != null && l.getModule().getCourse() != null && cid.equals(l.getModule().getCourse().getId()));
                return null;
            }
            return null;
        });

        QuizQuestionRepository questionRepo = createMockProxy(QuizQuestionRepository.class, (method, args) -> {
            String name = method.getName();
            if ("findByQuiz_IdOrderByOrderIndexAsc".equals(name)) {
                Long qid = (Long) args[0];
                return questionStore.values().stream().filter(q -> q.getQuiz() != null && qid.equals(q.getQuiz().getId())).toList();
            }
            if ("saveAll".equals(name)) {
                @SuppressWarnings("unchecked")
                Iterable<QuizQuestion> items = (Iterable<QuizQuestion>) args[0];
                for (QuizQuestion q : items) {
                    if (q.getId() == null) q.setId(seq.incrementAndGet());
                    questionStore.put(q.getId(), q);
                }
                return items;
            }
            if ("deleteByCourseId".equals(name)) {
                Long cid = (Long) args[0];
                questionStore.values().removeIf(q -> q.getQuiz() != null && q.getQuiz().getCourse() != null && cid.equals(q.getQuiz().getCourse().getId()));
                return null;
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
            return false;
        });

        QuizAttemptRepository attemptRepo = createMockProxy(QuizAttemptRepository.class, (method, args) -> {
            if ("existsByQuizId".equals(method.getName())) {
                Long qid = (Long) args[0];
                return attemptStore.values().stream().anyMatch(a -> a.getQuiz() != null && qid.equals(a.getQuiz().getId()));
            }
            return false;
        });

        CertificateRepository certRepo = createMockProxy(CertificateRepository.class, (method, args) -> {
            if ("existsByCourse_Id".equals(method.getName())) {
                Long cid = (Long) args[0];
                return certificateStore.values().stream().anyMatch(c -> c.getCourse() != null && cid.equals(c.getCourse().getId()));
            }
            return false;
        });

        CourseDepartmentAssignmentRepository cdaRepo = createMockProxy(CourseDepartmentAssignmentRepository.class, (method, args) -> {
            String name = method.getName();
            if ("deleteByCourse_Id".equals(name)) {
                Long cid = (Long) args[0];
                assignmentStore.values().removeIf(a -> a.getCourse() != null && cid.equals(a.getCourse().getId()));
                return null;
            }
            if ("save".equals(name)) {
                CourseDepartmentAssignment a = (CourseDepartmentAssignment) args[0];
                if (a.getId() == null) a.setId(seq.incrementAndGet());
                assignmentStore.put(a.getId(), a);
                return a;
            }
            if ("findByCourseIdWithDepartment".equals(name) || "findByCourse_Id".equals(name)) {
                Long cid = (Long) args[0];
                return assignmentStore.values().stream().filter(a -> a.getCourse() != null && cid.equals(a.getCourse().getId())).toList();
            }
            return null;
        });

        CourseThumbnailRepository thumbRepo = createMockProxy(CourseThumbnailRepository.class, (method, args) -> {
            if ("deleteByCourseId".equals(method.getName())) {
                Long cid = (Long) args[0];
                thumbnailStore.values().removeIf(t -> cid.equals(t.getCourseId()));
                return null;
            }
            return null;
        });

        RecommendationRuleRepository ruleRepo = createMockProxy(RecommendationRuleRepository.class, (method, args) -> {
            if ("deleteByCourseId".equals(method.getName())) {
                Long cid = (Long) args[0];
                ruleStore.values().removeIf(r -> r.getCourse() != null && cid.equals(r.getCourse().getId()));
                return null;
            }
            return null;
        });

        LearningPathRepository lpRepo = createMockProxy(LearningPathRepository.class, (method, args) -> {
            if ("deleteItemsByCourseId".equals(method.getName())) {
                return null;
            }
            return null;
        });

        QuizProgressRepository qpRepo = createMockProxy(QuizProgressRepository.class, (method, args) -> {
            if ("deleteByCourseId".equals(method.getName())) {
                Long cid = (Long) args[0];
                quizProgressStore.values().removeIf(qp -> qp.getQuiz() != null && qp.getQuiz().getCourse() != null && cid.equals(qp.getQuiz().getCourse().getId()));
                return null;
            }
            return null;
        });

        LessonProgressRepository lpProgressRepo = createMockProxy(LessonProgressRepository.class, (method, args) -> {
            if ("deleteByCourseId".equals(method.getName())) {
                Long cid = (Long) args[0];
                lessonProgressStore.values().removeIf(lp -> lp.getLesson() != null && lp.getLesson().getModule() != null
                        && lp.getLesson().getModule().getCourse() != null
                        && cid.equals(lp.getLesson().getModule().getCourse().getId()));
                return null;
            }
            return null;
        });

        CategoryRepository catRepo = createMockProxy(CategoryRepository.class, (method, args) -> {
            if ("findBySlug".equals(method.getName())) {
                String slug = (String) args[0];
                return categoryStore.values().stream().filter(c -> slug.equals(c.getSlug())).findFirst();
            }
            return Optional.empty();
        });

        // Security Context Util
        SecurityContextUtil secUtil = new SecurityContextUtil(userRepo) {
            @Override
            public Long getCurrentUserId() {
                return currentUser != null ? currentUser.getId() : null;
            }
            @Override
            public User getCurrentUser() {
                return currentUser;
            }
            @Override
            public String getCurrentUserRole() {
                return currentUser != null && currentUser.getRole() != null ? currentUser.getRole().name() : null;
            }
        };

        draftService = new DraftService(courseRepo, quizRepo, moduleRepo, enrollmentRepo, attemptRepo, secUtil);
        draftService.setLessonRepository(lessonRepo);
        draftService.setQuestionRepository(questionRepo);
        draftService.setQuizProgressRepository(qpRepo);
        draftService.setLessonProgressRepository(lpProgressRepo);
        draftService.setCertificateRepository(certRepo);
        draftService.setCourseDepartmentAssignmentRepository(cdaRepo);
        draftService.setThumbnailRepository(thumbRepo);
        draftService.setRecommendationRuleRepository(ruleRepo);
        draftService.setLearningPathRepository(lpRepo);

        courseAuthoringService = new CourseAuthoringService(
                catRepo, courseRepo, moduleRepo, lessonRepo, quizRepo, questionRepo,
                secUtil, deptRepo, enrollmentRepo, attemptRepo, null, certRepo,
                lpProgressRepo, qpRepo, ruleRepo, lpRepo, new ObjectMapper().findAndRegisterModules()
        );
        courseAuthoringService.setCourseDepartmentAssignmentRepository(cdaRepo);
        courseAuthoringService.setThumbnailRepository(thumbRepo);
    }

    private Course seedDraft(String courseId, String title, User creator) {
        Course course = new Course();
        course.setId(seq.incrementAndGet());
        course.setCourseId(courseId);
        course.setTitle(title);
        course.setCategory("Operations");
        course.setOwningDepartment(deptOps);
        course.setDraft(true);
        course.setActive(false);
        course.setCreatedBy(creator);
        course.setDraftPayload("{\"courseId\":\"" + courseId + "\",\"title\":\"" + title + "\"}");
        courseStore.put(course.getId(), course);
        return course;
    }

    private Course seedPublishedCourse(String courseId, String title, User creator) {
        Course course = new Course();
        course.setId(seq.incrementAndGet());
        course.setCourseId(courseId);
        course.setTitle(title);
        course.setCategory("Operations");
        course.setOwningDepartment(deptOps);
        course.setDraft(false);
        course.setActive(true);
        course.setCreatedBy(creator);
        course.setDraftPayload("{\"courseId\":\"" + courseId + "\",\"title\":\"" + title + "\"}");
        courseStore.put(course.getId(), course);
        return course;
    }

    // -------------------------------------------------------------
    // SCENARIO 1: HR/Admin can view all drafts across creators
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 1: HR/Admin can list all drafts across creators and departments")
    void hrAdminCanListAllDraftsAcrossCreators() {
        seedDraft("DFT-01", "Trainer Bob Draft", trainerUser1);
        seedDraft("DFT-02", "Trainer Alice Draft", trainerUser2);
        seedDraft("DFT-03", "HR Admin Draft", hrAdminUser);

        currentUser = hrAdminUser;
        List<Course> drafts = draftService.getMyDrafts();
        assertEquals(3, drafts.size(), "HR/Admin must see all drafts across all creators");
    }

    // -------------------------------------------------------------
    // SCENARIO 2: Trainer can view all drafts across creators (equal access)
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 2: Trainer can list all drafts across creators and departments")
    void trainerCanListAllDraftsAcrossCreators() {
        seedDraft("DFT-01", "Trainer Bob Draft", trainerUser1);
        seedDraft("DFT-02", "Trainer Alice Draft", trainerUser2);
        seedDraft("DFT-03", "HR Admin Draft", hrAdminUser);

        currentUser = trainerUser1;
        List<Course> drafts = draftService.getMyDrafts();
        assertEquals(3, drafts.size(), "Trainer must have equal access to view all drafts across creators");
    }

    // -------------------------------------------------------------
    // SCENARIO 3: HR/Admin can open any Trainer's draft
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 3: HR/Admin can open any Trainer's draft")
    void hrAdminCanOpenTrainerDraft() {
        seedDraft("DFT-TR-01", "Bob's Logistics Draft", trainerUser1);

        currentUser = hrAdminUser;
        Course opened = draftService.getMyDraft("DFT-TR-01");
        assertNotNull(opened);
        assertEquals("Bob's Logistics Draft", opened.getTitle());
    }

    // -------------------------------------------------------------
    // SCENARIO 4: Trainer can open HR/Admin draft and other Trainer's draft
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 4: Trainer can open an HR/Admin's draft and another Trainer's draft")
    void trainerCanOpenHrAdminAndOtherTrainerDraft() {
        seedDraft("DFT-HR-01", "HR Compliance Draft", hrAdminUser);
        seedDraft("DFT-TR-02", "Alice Customs Draft", trainerUser2);

        currentUser = trainerUser1; // Bob
        Course hrDraft = draftService.getMyDraft("DFT-HR-01");
        assertNotNull(hrDraft);
        assertEquals("HR Compliance Draft", hrDraft.getTitle());

        Course aliceDraft = draftService.getMyDraft("DFT-TR-02");
        assertNotNull(aliceDraft);
        assertEquals("Alice Customs Draft", aliceDraft.getTitle());
    }

    // -------------------------------------------------------------
    // SCENARIO 5: HR/Admin can update and save Trainer's draft
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 5: HR/Admin can update and save a Trainer's draft")
    void hrAdminCanUpdateAndSaveTrainerDraft() {
        Course bobDraft = seedDraft("DFT-TR-01", "Bob Original Draft", trainerUser1);

        currentUser = hrAdminUser;

        CourseAuthoringRequest req = new CourseAuthoringRequest();
        req.setCourseId("DFT-TR-01");
        req.setTitle("Bob Draft Updated By HR Admin");
        req.setDepartmentId(deptOps.getId());
        req.setPublish(false);

        String updatedId = courseAuthoringService.updateDraft("DFT-TR-01", req);
        assertEquals("DFT-TR-01", updatedId);

        Course updatedCourse = courseStore.get(bobDraft.getId());
        assertEquals("Bob Draft Updated By HR Admin", updatedCourse.getTitle());
        assertTrue(updatedCourse.getDraft(), "Must remain a draft");
    }

    // -------------------------------------------------------------
    // SCENARIO 6: Trainer can update and save HR/Admin draft or other Trainer's draft
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 6: Trainer can update and save an HR/Admin's draft")
    void trainerCanUpdateAndSaveHrAdminDraft() {
        Course hrDraft = seedDraft("DFT-HR-01", "HR Original Draft", hrAdminUser);

        currentUser = trainerUser1; // Bob

        CourseAuthoringRequest req = new CourseAuthoringRequest();
        req.setCourseId("DFT-HR-01");
        req.setTitle("HR Draft Updated By Trainer Bob");
        req.setDepartmentId(deptOps.getId());
        req.setPublish(false);

        String updatedId = courseAuthoringService.updateDraft("DFT-HR-01", req);
        assertEquals("DFT-HR-01", updatedId);

        Course updatedCourse = courseStore.get(hrDraft.getId());
        assertEquals("HR Draft Updated By Trainer Bob", updatedCourse.getTitle());
        assertTrue(updatedCourse.getDraft(), "Must remain a draft");
    }

    // -------------------------------------------------------------
    // SCENARIO 7: HR/Admin can delete a Trainer's draft permanently
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 7: HR/Admin can permanently delete a Trainer's draft")
    void hrAdminCanPermanentlyDeleteTrainerDraft() {
        Course bobDraft = seedDraft("DFT-BOB", "Bob Delete Me", trainerUser1);

        currentUser = hrAdminUser;
        draftService.deleteMyDraft("DFT-BOB");

        assertFalse(courseStore.containsKey(bobDraft.getId()), "Draft must be removed from storage");
    }

    // -------------------------------------------------------------
    // SCENARIO 8: Trainer can delete an HR/Admin draft or other Trainer's draft
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 8: Trainer can permanently delete an HR/Admin's draft")
    void trainerCanPermanentlyDeleteHrAdminDraft() {
        Course hrDraft = seedDraft("DFT-HR-DEL", "HR Delete Me", hrAdminUser);

        currentUser = trainerUser1; // Bob
        draftService.deleteMyDraft("DFT-HR-DEL");

        assertFalse(courseStore.containsKey(hrDraft.getId()), "Draft must be removed from storage by trainer");
    }

    // -------------------------------------------------------------
    // SCENARIO 9: Employee is denied access to draft management
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 9: Employee cannot access draft management endpoints (403 Forbidden)")
    void employeeCannotAccessDraftManagement() {
        seedDraft("DFT-EMP-TEST", "Draft Test", hrAdminUser);
        currentUser = employeeUser;

        assertThrows(AccessDeniedException.class, () -> draftService.getMyDrafts());
        assertThrows(AccessDeniedException.class, () -> draftService.getMyDraft("DFT-EMP-TEST"));
        assertThrows(AccessDeniedException.class, () -> draftService.deleteMyDraft("DFT-EMP-TEST"));
        assertThrows(AccessDeniedException.class, () -> draftService.cleanupMyDrafts());

        CourseAuthoringRequest req = new CourseAuthoringRequest();
        req.setTitle("Employee Course");
        assertThrows(AccessDeniedException.class, () -> courseAuthoringService.updateDraft("DFT-EMP-TEST", req));
    }

    // -------------------------------------------------------------
    // SCENARIO 10: Manager is denied access to draft management
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 10: Manager cannot access draft management endpoints (403 Forbidden)")
    void managerCannotAccessDraftManagement() {
        seedDraft("DFT-MGR-TEST", "Draft Test", hrAdminUser);
        currentUser = managerUser;

        assertThrows(AccessDeniedException.class, () -> draftService.getMyDrafts());
        assertThrows(AccessDeniedException.class, () -> draftService.getMyDraft("DFT-MGR-TEST"));
        assertThrows(AccessDeniedException.class, () -> draftService.deleteMyDraft("DFT-MGR-TEST"));
        assertThrows(AccessDeniedException.class, () -> draftService.cleanupMyDrafts());

        CourseAuthoringRequest req = new CourseAuthoringRequest();
        req.setTitle("Manager Course");
        assertThrows(AccessDeniedException.class, () -> courseAuthoringService.updateDraft("DFT-MGR-TEST", req));
    }

    // -------------------------------------------------------------
    // SCENARIO 11: Published course cannot be accessed as draft
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 11: Published course cannot be accessed through getMyDraft")
    void publishedCourseCannotBeAccessedAsDraft() {
        seedPublishedCourse("PUB-01", "Published Course", hrAdminUser);
        currentUser = hrAdminUser;

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                draftService.getMyDraft("PUB-01")
        );
        assertTrue(ex.getMessage().contains("Published courses cannot be accessed as drafts"));
    }

    // -------------------------------------------------------------
    // SCENARIO 12: Published course cannot be deleted through draft endpoint
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 12: Published course cannot be deleted through draft endpoint")
    void publishedCourseCannotBeDeletedThroughDraftApi() {
        seedPublishedCourse("PUB-02", "Published Operational Guidelines", hrAdminUser);
        currentUser = hrAdminUser;

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                draftService.deleteMyDraft("PUB-02")
        );
        assertTrue(ex.getMessage().contains("Published courses cannot be deleted through draft endpoints"));
    }

    // -------------------------------------------------------------
    // SCENARIO 13: Published course cannot be modified through draft update endpoint
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 13: Published course cannot be modified through updateDraft endpoint")
    void publishedCourseCannotBeModifiedThroughDraftApi() {
        seedPublishedCourse("PUB-03", "Published Course In Catalog", hrAdminUser);
        currentUser = trainerUser1;

        CourseAuthoringRequest req = new CourseAuthoringRequest();
        req.setTitle("Hacked Published Course");
        req.setPublish(false);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                courseAuthoringService.updateDraft("PUB-03", req)
        );
        assertTrue(ex.getMessage().contains("Published courses cannot be modified through draft endpoints"));
    }

    // -------------------------------------------------------------
    // SCENARIO 14: Draft deletion cascades dependent records cleanly
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 14: Draft deletion cascades modules, lessons, quizzes, questions, and thumbnails without affecting other courses")
    void draftDeletionCascadesDependentRecordsCleanly() {
        Course draft = seedDraft("DFT-CASCADE", "Full Draft With Modules", hrAdminUser);

        Module mod = new Module();
        mod.setId(seq.incrementAndGet());
        mod.setCourse(draft);
        mod.setTitle("Module 1");
        moduleStore.put(mod.getId(), mod);

        Lesson les = new Lesson();
        les.setId(seq.incrementAndGet());
        les.setModule(mod);
        les.setTitle("Lesson 1.1");
        les.setWorkdriveFileId("WD-FILE-123");
        lessonStore.put(les.getId(), les);

        Quiz quiz = new Quiz();
        quiz.setId(seq.incrementAndGet());
        quiz.setCourse(draft);
        quiz.setModule(mod);
        quiz.setTitle("Module Quiz");
        quizStore.put(quiz.getId(), quiz);

        QuizQuestion qq = new QuizQuestion();
        qq.setId(seq.incrementAndGet());
        qq.setQuiz(quiz);
        qq.setQuestionText("Question 1");
        questionStore.put(qq.getId(), qq);

        CourseThumbnail thumb = new CourseThumbnail();
        thumb.setId(seq.incrementAndGet());
        thumb.setCourseId(draft.getId());
        thumb.setFilename("thumb.jpg");
        thumbnailStore.put(thumb.getId(), thumb);

        CourseDepartmentAssignment cda = new CourseDepartmentAssignment();
        cda.setId(seq.incrementAndGet());
        cda.setCourse(draft);
        cda.setDepartment(deptOps);
        assignmentStore.put(cda.getId(), cda);

        // Also seed an unrelated course to ensure it remains untouched
        Course otherCourse = seedPublishedCourse("OTHER-PUB", "Keep Me Intact", hrAdminUser);

        currentUser = trainerUser1;
        draftService.deleteMyDraft("DFT-CASCADE");

        assertFalse(courseStore.containsKey(draft.getId()), "Draft must be deleted");
        assertTrue(moduleStore.values().stream().noneMatch(m -> draft.getId().equals(m.getCourse().getId())), "Modules must be deleted");
        assertTrue(quizStore.values().stream().noneMatch(q -> draft.getId().equals(q.getCourse().getId())), "Quizzes must be deleted");
        assertTrue(thumbnailStore.values().stream().noneMatch(t -> draft.getId().equals(t.getCourseId())), "Thumbnails must be deleted");
        assertTrue(assignmentStore.values().stream().noneMatch(a -> draft.getId().equals(a.getCourse().getId())), "Assignments must be deleted");

        // Unrelated course intact
        assertTrue(courseStore.containsKey(otherCourse.getId()), "Unrelated course must remain intact");
    }

    // -------------------------------------------------------------
    // SCENARIO 15: Draft update preserves modules, lessons, WorkDrive files, and department assignments
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 15: Draft update preserves modules, lessons, WorkDrive file ID, WorkDrive filename, and department assignments")
    void draftUpdatePreservesAllFieldsWorkdriveFilesAndAssignments() {
        Course draft = seedDraft("DFT-PRESERVE", "Initial Draft", trainerUser1);

        currentUser = hrAdminUser;

        CourseAuthoringRequest req = new CourseAuthoringRequest();
        req.setCourseId("DFT-PRESERVE");
        req.setTitle("Preserved Draft Title");
        req.setLevel("P2");
        req.setDuration("45 min");
        req.setDepartmentId(deptOps.getId());
        req.setBanner("/api/courses/thumbnails/THUMB-123");
        req.setLearningOutcomes(List.of("Understand BOL", "Process Customs"));

        CourseAuthoringRequest.DepartmentAssignmentInput da = new CourseAuthoringRequest.DepartmentAssignmentInput(
                deptOps.getId(), "Operations", "MANDATORY", LocalDate.now().plusDays(14)
        );
        req.setDepartmentAssignments(List.of(da));

        CourseAuthoringRequest.ModuleInput modInput = new CourseAuthoringRequest.ModuleInput();
        modInput.setTitle("Module 1: Advanced Freight");
        modInput.setOrderIndex(1);

        CourseAuthoringRequest.LessonInput lesInput = new CourseAuthoringRequest.LessonInput();
        lesInput.setTitle("Lesson 1: Documentation Flow");
        lesInput.setType("PDF");
        lesInput.setWorkdriveFileId("WD-DOC-999");
        lesInput.setWorkdriveFileName("freight_documentation_manual.pdf");
        lesInput.setDuration("15 min");
        modInput.setLessons(List.of(lesInput));

        req.setModules(List.of(modInput));
        req.setPublish(false);

        String updatedId = courseAuthoringService.updateDraft("DFT-PRESERVE", req);
        assertEquals("DFT-PRESERVE", updatedId);

        // Verify with getCourseForEditing
        Map<String, Object> editingData = courseAuthoringService.getCourseForEditing("DFT-PRESERVE");
        assertNotNull(editingData);
        assertEquals("Preserved Draft Title", editingData.get("title"));
        assertEquals("P2", editingData.get("level"));
        assertEquals(deptOps.getId(), editingData.get("departmentId"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> restoredModules = (List<Map<String, Object>>) editingData.get("modules");
        assertNotNull(restoredModules);
        assertEquals(1, restoredModules.size());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> restoredLessons = (List<Map<String, Object>>) restoredModules.get(0).get("lessons");
        assertNotNull(restoredLessons);
        assertEquals(1, restoredLessons.size());

        Map<String, Object> restoredLesson = restoredLessons.get(0);
        assertEquals("Lesson 1: Documentation Flow", restoredLesson.get("title"));
        assertEquals("WD-DOC-999", restoredLesson.get("workdriveFileId"));
        assertEquals("freight_documentation_manual.pdf", restoredLesson.get("workdriveFileName"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> restoredAssignments = (List<Map<String, Object>>) editingData.get("departmentAssignments");
        assertNotNull(restoredAssignments);
        assertEquals(1, restoredAssignments.size());
        assertEquals(deptOps.getId(), restoredAssignments.get(0).get("departmentId"));
    }

    // -------------------------------------------------------------
    // SCENARIO 16: Draft cleanup deletes unpublished drafts and blocks if enrollment exists
    // -------------------------------------------------------------
    @Test
    @DisplayName("Scenario 16: Draft cleanup deletes all drafts and safely blocks if an enrollment exists")
    void draftCleanupDeletesUnpublishedDraftsAndSafelyBlocksDraftsWithEnrollmentHistory() {
        Course d1 = seedDraft("DFT-CL-01", "Cleanup Draft 1", trainerUser1);
        Course d2 = seedDraft("DFT-CL-02", "Cleanup Draft 2", hrAdminUser);

        currentUser = hrAdminUser;
        int cleaned = draftService.cleanupMyDrafts();
        assertEquals(2, cleaned, "Should clean up both drafts");
        assertFalse(courseStore.containsKey(d1.getId()));
        assertFalse(courseStore.containsKey(d2.getId()));

        // Now test safety guard when enrollment exists
        Course blockedDraft = seedDraft("DFT-BLOCKED", "Draft with Enrollment", trainerUser1);
        Enrollment enr = new Enrollment();
        enr.setId(seq.incrementAndGet());
        enr.setCourse(blockedDraft);
        enr.setUser(employeeUser);
        enrollmentStore.put(enr.getId(), enr);

        currentUser = trainerUser1;
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                draftService.deleteMyDraft("DFT-BLOCKED")
        );
        assertTrue(ex.getMessage().contains("enrollment records exist"));
    }

    // -------------------------------------------------------------
    // Helper: Dynamic Proxy for Mock Repositories
    // -------------------------------------------------------------
    @SuppressWarnings("unchecked")
    private <T> T createMockProxy(Class<T> repoInterface, RepositoryInvocationHandler handler) {
        return (T) Proxy.newProxyInstance(
                repoInterface.getClassLoader(),
                new Class<?>[]{repoInterface},
                (proxy, method, args) -> {
                    Object result = handler.invoke(method, args);
                    if (result != null) return result;
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
                }
        );
    }

    @FunctionalInterface
    interface RepositoryInvocationHandler {
        Object invoke(java.lang.reflect.Method method, Object[] args) throws Throwable;
    }
}
