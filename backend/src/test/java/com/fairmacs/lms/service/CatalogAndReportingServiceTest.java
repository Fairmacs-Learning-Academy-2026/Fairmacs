package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.CategoryDTO;
import com.fairmacs.lms.dto.CourseDTO;
import com.fairmacs.lms.dto.EmployeeTrainingTranscriptDTO;
import com.fairmacs.lms.dto.LearningDashboardDTO;
import com.fairmacs.lms.dto.ManagerReportDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class CatalogAndReportingServiceTest {

    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private EnrollmentRepository enrollmentRepository;
    @Mock
    private LearningPathRepository learningPathRepository;
    @Mock
    private CertificateRepository certificateRepository;
    @Mock
    private QuizRepository quizRepository;
    @Mock
    private QuizAttemptRepository quizAttemptRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CourseDepartmentAssignmentRepository courseDepartmentAssignmentRepository;
    @Mock
    private RecommendationRuleRepository recommendationRuleRepository;

    private static class TestSecurityContextUtil extends SecurityContextUtil {
        private User currentUser;
        public TestSecurityContextUtil() { super(null); }
        public void setCurrentUser(User user) { this.currentUser = user; }
        @Override public User getCurrentUser() { return currentUser; }
        @Override public Long getCurrentUserId() { return currentUser != null ? currentUser.getId() : null; }
        @Override public String getCurrentUserRole() { return currentUser != null && currentUser.getRole() != null ? currentUser.getRole().name() : null; }
    }

    private TestSecurityContextUtil securityContextUtil;
    private CourseMapper courseMapper;
    private RecommendationService recommendationService;
    private CatalogService catalogService;
    private TrainerReportService trainerReportService;
    private ManagerReportService managerReportService;
    private ManagerReportsService managerReportsService;
    private HrReportService hrReportService;

    @BeforeEach
    void setUp() {
        securityContextUtil = new TestSecurityContextUtil();
        courseMapper = new CourseMapper(new com.fasterxml.jackson.databind.ObjectMapper(), quizRepository);

        recommendationService = new RecommendationService(
                recommendationRuleRepository,
                courseRepository,
                courseDepartmentAssignmentRepository
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

        trainerReportService = new TrainerReportService(
                courseRepository,
                enrollmentRepository,
                userRepository,
                quizAttemptRepository,
                securityContextUtil
        );

        managerReportService = new ManagerReportService(
                userRepository,
                enrollmentRepository
        );

        managerReportsService = new ManagerReportsService(
                userRepository,
                enrollmentRepository
        );

        hrReportService = new HrReportService(
                userRepository,
                enrollmentRepository
        );
    }

    // =========================================================================
    // 1. CATALOG SERVICE TESTS
    // =========================================================================

    @Test
    @DisplayName("Catalog: listCategories aggregates counts by slug")
    void testListCategories() {
        Category cat1 = new Category();
        cat1.setName("Logistics");
        cat1.setSlug("logistics");
        cat1.setSortOrder(1);

        Course c1 = new Course();
        c1.setCatalogCategory(cat1);

        CategoryDTO catDto = new CategoryDTO();
        catDto.setId(1L);
        catDto.setName("Logistics");
        catDto.setSlug("logistics");
        catDto.setCourseCount(1);

        when(courseRepository.findActiveWithCategory()).thenReturn(List.of(c1));
        when(categoryRepository.findAllByOrderBySortOrderAsc()).thenReturn(List.of(cat1));

        List<CategoryDTO> result = catalogService.listCategories();
        assertEquals(1, result.size());
        assertEquals("Logistics", result.get(0).getName());
        assertEquals(1, result.get(0).getCourseCount());
    }

    @Test
    @DisplayName("Catalog: listCourses filters by user level for employee")
    void testListCourses_LevelFiltering() {
        User employee = new User();
        employee.setId(10L);
        employee.setLevel("P1");
        employee.setRole(Role.EMPLOYEE);
        employee.setDepartment("Operations");

        securityContextUtil.setCurrentUser(employee);
        when(enrollmentRepository.findByUserIdWithCourse(10L)).thenReturn(List.of());

        Course c1 = new Course();
        c1.setId(101L);
        c1.setCourseId("P1-001");
        c1.setTitle("P1 Course");
        c1.setLevel("P1");

        Course c2 = new Course();
        c2.setId(102L);
        c2.setCourseId("P2-001");
        c2.setTitle("P2 Course");
        c2.setLevel("P2");

        when(courseRepository.searchCatalog(any(), any())).thenReturn(List.of(c1, c2));

        List<CourseDTO> courses = catalogService.listCourses(null, null);
        assertEquals(1, courses.size());
        assertEquals("P1 Course", courses.get(0).getTitle());
    }

    @Test
    @DisplayName("Catalog: listCourses shows all levels to HR_ADMIN and TRAINER")
    void testListCourses_AdminTrainerBypassLevelFilter() {
        User trainer = new User();
        trainer.setId(20L);
        trainer.setLevel("P1");
        trainer.setRole(Role.TRAINER);

        securityContextUtil.setCurrentUser(trainer);
        when(enrollmentRepository.findByUserIdWithCourse(20L)).thenReturn(List.of());

        Course c1 = new Course();
        c1.setId(101L);
        c1.setCourseId("P1-001");
        c1.setTitle("P1 Course");
        c1.setLevel("P1");

        Course c2 = new Course();
        c2.setId(102L);
        c2.setCourseId("P3-001");
        c2.setTitle("P3 Course");
        c2.setLevel("P3");

        when(courseRepository.searchCatalog(any(), any())).thenReturn(List.of(c1, c2));

        List<CourseDTO> courses = catalogService.listCourses(null, null);
        assertEquals(2, courses.size());
    }

    @Test
    @DisplayName("Catalog: getDashboard returns accurate progress metrics")
    void testGetDashboard_RealMetrics() {
        User user = new User();
        user.setId(5L);
        user.setName("John Doe");
        user.setDepartment("Finance");
        user.setRole(Role.EMPLOYEE);

        securityContextUtil.setCurrentUser(user);

        Course c1 = new Course();
        c1.setId(1L);
        c1.setDurationHours(2.0);

        Course c2 = new Course();
        c2.setId(2L);
        c2.setDurationHours(3.0);

        Enrollment e1 = new Enrollment();
        e1.setCourse(c1);
        e1.setEnrollmentType(EnrollmentType.MANDATORY);
        e1.setStatus(EnrollmentStatus.COMPLETED);
        e1.setProgressPercent(100);

        Enrollment e2 = new Enrollment();
        e2.setCourse(c2);
        e2.setEnrollmentType(EnrollmentType.MANDATORY);
        e2.setStatus(EnrollmentStatus.IN_PROGRESS);
        e2.setProgressPercent(50);

        when(enrollmentRepository.findByUserIdWithCourse(5L)).thenReturn(List.of(e1, e2));
        when(certificateRepository.findByUserId(5L)).thenReturn(List.of(new Certificate()));

        LearningDashboardDTO dashboard = catalogService.getDashboard();
        assertNotNull(dashboard);
        assertEquals("John Doe", dashboard.getName());
        assertEquals("Finance", dashboard.getDepartment());
        assertEquals(1, dashboard.getCompletedCourses());
        assertEquals(1, dashboard.getInProgress());
        assertEquals(1, dashboard.getCertificates());
        assertEquals(50, dashboard.getMandatoryPercent()); // 1 completed of 2 mandatory
        assertNotNull(dashboard.getLearningHours());
    }

    // =========================================================================
    // 2. RECOMMENDATION SERVICE TESTS
    // =========================================================================

    @Test
    @DisplayName("Recommendations: recommends target department assignment with RECOMMENDED")
    void testRecommendations_TargetDepartmentAssignment() {
        User user = new User();
        user.setId(10L);
        user.setDepartment("Logistics");
        user.setLevel("P2");

        Department dept = new Department();
        dept.setName("Logistics");

        Course recCourse = new Course();
        recCourse.setId(201L);
        recCourse.setTitle("Logistics Excellence");
        recCourse.setActive(true);
        recCourse.setLevel("P2");
        recCourse.setFoundation(false);

        CourseDepartmentAssignment cda = new CourseDepartmentAssignment(recCourse, dept, EnrollmentType.RECOMMENDED, LocalDate.now().plusDays(30));

        when(courseDepartmentAssignmentRepository.findByDepartment_NameIgnoreCase("Logistics"))
                .thenReturn(List.of(cda));
        when(courseRepository.findActiveWithCategory()).thenReturn(List.of());

        List<Course> recommendations = recommendationService.recommendFor(user, Set.of());
        assertEquals(1, recommendations.size());
        assertEquals(201L, recommendations.get(0).getId());
    }

    @Test
    @DisplayName("Recommendations: excludes foundation courses and mismatched levels")
    void testRecommendations_ExcludesFoundationAndMismatchedLevel() {
        User user = new User();
        user.setId(10L);
        user.setDepartment("Operations");
        user.setLevel("P1");

        Department dept = new Department();
        dept.setName("Operations");

        Course foundationCourse = new Course();
        foundationCourse.setId(301L);
        foundationCourse.setActive(true);
        foundationCourse.setLevel("P1");
        foundationCourse.setFoundation(true); // Foundation excluded

        Course higherLevelCourse = new Course();
        higherLevelCourse.setId(302L);
        higherLevelCourse.setActive(true);
        higherLevelCourse.setLevel("P3"); // Mismatch: user is P1
        higherLevelCourse.setFoundation(false);

        CourseDepartmentAssignment cda1 = new CourseDepartmentAssignment(foundationCourse, dept, EnrollmentType.RECOMMENDED, null);
        CourseDepartmentAssignment cda2 = new CourseDepartmentAssignment(higherLevelCourse, dept, EnrollmentType.RECOMMENDED, null);

        when(courseDepartmentAssignmentRepository.findByDepartment_NameIgnoreCase("Operations"))
                .thenReturn(List.of(cda1, cda2));
        when(courseRepository.findActiveWithCategory()).thenReturn(List.of());

        List<Course> recommendations = recommendationService.recommendFor(user, Set.of());
        assertTrue(recommendations.isEmpty(), "Foundation and mismatched level courses should not be recommended");
    }

    // =========================================================================
    // 3. TRAINER REPORT SERVICE TESTS
    // =========================================================================

    @Test
    @DisplayName("Trainer Report: calculates real published, active learners, completion rate and score")
    void testTrainerInsights_Calculation() {
        Course pubCourse = new Course();
        pubCourse.setId(1L);
        pubCourse.setCourseId("CRS-01");
        pubCourse.setTitle("Freight 101");
        pubCourse.setActive(true);

        Course draftCourse = new Course();
        draftCourse.setId(2L);
        draftCourse.setCourseId("CRS-02");
        draftCourse.setTitle("Air Cargo Draft");
        draftCourse.setActive(false);

        when(courseRepository.findAll()).thenReturn(List.of(pubCourse, draftCourse));

        User learner1 = new User();
        learner1.setId(101L);
        learner1.setRole(Role.EMPLOYEE);

        User learner2 = new User();
        learner2.setId(102L);
        learner2.setRole(Role.EMPLOYEE);

        Enrollment e1 = new Enrollment();
        e1.setCourse(pubCourse);
        e1.setUser(learner1);
        e1.setStatus(EnrollmentStatus.COMPLETED);
        e1.setScore(90);

        Enrollment e2 = new Enrollment();
        e2.setCourse(pubCourse);
        e2.setUser(learner2);
        e2.setStatus(EnrollmentStatus.IN_PROGRESS);
        e2.setScore(70);

        when(enrollmentRepository.findAll()).thenReturn(List.of(e1, e2));

        Map<String, Object> insights = trainerReportService.getTrainerInsights();
        assertEquals(1, insights.get("publishedCourses"));
        assertEquals(1, insights.get("draftCourses"));
        assertEquals(2, insights.get("totalCourses"));
        assertEquals(2, insights.get("activeLearners"));
        assertEquals(2, insights.get("totalEnrollments"));
        assertEquals(1, insights.get("completedEnrollments"));
        assertEquals(50, insights.get("completionRate")); // 1 of 2 completed = 50%
        assertEquals(80.0, insights.get("averageScore")); // (90 + 70) / 2 = 80.0
    }

    @Test
    @DisplayName("Trainer Report: scopes to authored courses and computes score from completed quiz attempts")
    void testTrainerInsights_AuthoredCourseScopeAndQuizAttempts() {
        User trainer = new User();
        trainer.setId(88L);
        trainer.setRole(Role.TRAINER);
        securityContextUtil.setCurrentUser(trainer);

        User otherTrainer = new User();
        otherTrainer.setId(99L);
        otherTrainer.setRole(Role.TRAINER);

        Course myCourse = new Course();
        myCourse.setId(10L);
        myCourse.setTitle("Trainer Authored");
        myCourse.setActive(true);
        myCourse.setCreatedBy(trainer);

        Course otherCourse = new Course();
        otherCourse.setId(20L);
        otherCourse.setTitle("Other Course");
        otherCourse.setActive(true);
        otherCourse.setCreatedBy(otherTrainer);

        when(courseRepository.findAll()).thenReturn(List.of(myCourse, otherCourse));

        User learner = new User();
        learner.setId(501L);
        learner.setRole(Role.EMPLOYEE);

        Enrollment eMy = new Enrollment();
        eMy.setCourse(myCourse);
        eMy.setUser(learner);
        eMy.setStatus(EnrollmentStatus.COMPLETED);

        Enrollment eOther = new Enrollment();
        eOther.setCourse(otherCourse);
        eOther.setUser(learner);
        eOther.setStatus(EnrollmentStatus.COMPLETED);

        when(enrollmentRepository.findAll()).thenReturn(List.of(eMy, eOther));

        Quiz quiz = new Quiz();
        quiz.setId(1001L);
        quiz.setCourse(myCourse);

        QuizAttempt attempt = new QuizAttempt();
        attempt.setQuiz(quiz);
        attempt.setUser(learner);
        attempt.setCompletedAt(java.time.LocalDateTime.now());
        attempt.setScore(88);

        when(quizAttemptRepository.findAll()).thenReturn(List.of(attempt));

        Map<String, Object> insights = trainerReportService.getTrainerInsights();
        assertEquals(1, insights.get("publishedCourses")); // Only myCourse!
        assertEquals(1, insights.get("totalCourses"));
        assertEquals(1, insights.get("activeLearners"));
        assertEquals(1, insights.get("totalEnrollments"));
        assertEquals(1, insights.get("completedEnrollments"));
        assertEquals(100, insights.get("completionRate"));
        assertEquals(88.0, insights.get("averageScore")); // Computed from actual completed quiz attempt!
    }

    @Test
    @DisplayName("HR Training Report: filters out revoked enrollments from organization stats")
    void testHrReport_FiltersRevokedEnrollments() {
        User emp = new User();
        emp.setId(301L);
        emp.setRole(Role.EMPLOYEE);
        emp.setStatus(UserStatus.ACTIVE);

        when(userRepository.findAll()).thenReturn(List.of(emp));

        Course course = new Course();
        course.setId(1L);

        Enrollment valid = new Enrollment();
        valid.setUser(emp);
        valid.setCourse(course);
        valid.setStatus(EnrollmentStatus.COMPLETED);
        valid.setEnrollmentType(EnrollmentType.MANDATORY);
        valid.setScore(90);

        Enrollment revoked = new Enrollment();
        revoked.setUser(emp);
        revoked.setCourse(course);
        revoked.setStatus(EnrollmentStatus.REVOKED);
        revoked.setEnrollmentType(EnrollmentType.MANDATORY);

        when(enrollmentRepository.findAll()).thenReturn(List.of(valid, revoked));

        Map<String, Object> report = hrReportService.getHrTrainingReport();
        assertNotNull(report);
        assertEquals(1L, report.get("totalEmployees"));
        assertEquals(1L, report.get("totalAssignments")); // Revoked excluded!
        assertEquals(1L, report.get("completedAssignments"));
        assertEquals(100.0, report.get("mandatoryComplianceRate"));
    }

    // =========================================================================
    // 4. MANAGER REPORT SERVICE TESTS
    // =========================================================================

    @Test
    @DisplayName("Manager Report: scopes strictly to manager's department employees and ignores revoked")
    void testManagerReport_DepartmentScoping() {
        User manager = new User();
        manager.setId(1L);
        manager.setRole(Role.MANAGER);
        manager.setDepartment("Customer Service");

        when(userRepository.findById(1L)).thenReturn(Optional.of(manager));

        User emp1 = new User();
        emp1.setId(11L);
        emp1.setEmployeeId("EMP-011");
        emp1.setName("Alice");
        emp1.setDesignation("CSR");
        emp1.setRole(Role.EMPLOYEE);
        emp1.setDepartment("Customer Service");

        when(userRepository.findByDepartmentIgnoreCaseAndRole("Customer Service", Role.EMPLOYEE))
                .thenReturn(List.of(emp1));

        Course crossDeptCourse = new Course();
        crossDeptCourse.setId(88L);
        crossDeptCourse.setTitle("IT Security Protocol"); // Owned by IT, but taken by Customer Service employee

        Enrollment validEnrollment = new Enrollment();
        validEnrollment.setUser(emp1);
        validEnrollment.setCourse(crossDeptCourse);
        validEnrollment.setStatus(EnrollmentStatus.COMPLETED);
        validEnrollment.setProgressPercent(100);
        validEnrollment.setScore(95);
        validEnrollment.setEnrollmentType(EnrollmentType.MANDATORY);

        Enrollment revokedEnrollment = new Enrollment();
        revokedEnrollment.setUser(emp1);
        revokedEnrollment.setCourse(crossDeptCourse);
        revokedEnrollment.setStatus(EnrollmentStatus.REVOKED);

        when(enrollmentRepository.findActiveEmployeeEnrollmentsByDepartment("Customer Service"))
                .thenReturn(List.of(validEnrollment, revokedEnrollment));

        ManagerReportDTO report = managerReportService.getManagerReport(1L);
        assertNotNull(report);
        assertEquals(1, report.getTeamMembers());
        assertEquals(100, report.getOverallCompletion());
        assertEquals(100, report.getMandatoryCompliance());
        assertEquals(95, report.getAssessmentPerformance());
        assertEquals(1, report.getTeamMembersData().size());
        assertEquals("COMPLIANT", report.getTeamMembersData().get(0).getStatus());
    }

    // =========================================================================
    // 5. EMPLOYEE TRAINING TRANSCRIPT TESTS
    // =========================================================================

    @Test
    @DisplayName("Employee Transcript: preserves cross-department course ownership and caps incomplete progress at 98%")
    void testEmployeeTrainingTranscript_PreservesOwnershipAndCapsProgress() {
        User emp = new User();
        emp.setId(50L);
        emp.setEmployeeId("EMP-50");
        emp.setName("Bob");
        emp.setEmail("bob@fairmacs.com");
        emp.setDepartment("Logistics");

        when(userRepository.findById(50L)).thenReturn(Optional.of(emp));

        Department itDept = new Department();
        itDept.setId(9L);
        itDept.setName("Information Technology");

        Course crossCourse = new Course();
        crossCourse.setId(99L);
        crossCourse.setCourseId("IT-SEC-01");
        crossCourse.setTitle("Cyber Security 2026");
        crossCourse.setOwningDepartment(itDept);
        crossCourse.setDurationHours(2.5);

        Enrollment e = new Enrollment();
        e.setId(500L);
        e.setUser(emp);
        e.setCourse(crossCourse);
        e.setStatus(EnrollmentStatus.IN_PROGRESS);
        e.setProgressPercent(100); // IN_PROGRESS with 100% must be capped at 98%
        e.setEnrollmentType(EnrollmentType.MANDATORY);

        when(enrollmentRepository.findByUserIdWithCourse(50L)).thenReturn(List.of(e));

        EmployeeTrainingTranscriptDTO transcript = managerReportsService.getEmployeeTrainingTranscript(50L);
        assertNotNull(transcript);
        assertEquals("Bob", transcript.getEmployeeName());
        assertEquals("Logistics", transcript.getDepartment());
        assertEquals(1, transcript.getCourses().size());

        EmployeeTrainingTranscriptDTO.CourseRecordDTO record = transcript.getCourses().get(0);
        assertEquals("Information Technology", record.getCourseDepartment()); // Preserves IT owning department!
        assertEquals("Logistics", record.getEmployeeDepartment()); // Preserves employee's department!
        assertEquals(98, record.getProgressPercent()); // Capped at 98% for incomplete course!
    }
}
