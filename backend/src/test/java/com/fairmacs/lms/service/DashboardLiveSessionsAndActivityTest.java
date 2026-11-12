package com.fairmacs.lms.service;

import com.fairmacs.lms.controller.ManagerReportsController;
import com.fairmacs.lms.controller.TrainerReportController;
import com.fairmacs.lms.controller.TrainingSessionController;
import com.fairmacs.lms.dto.EmployeeTrainingTranscriptDTO;
import com.fairmacs.lms.dto.LearnerActivityDTO;
import com.fairmacs.lms.dto.UpcomingSessionDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class DashboardLiveSessionsAndActivityTest {

    private static class TestSecurityContextUtil extends SecurityContextUtil {
        private User currentUser;

        public TestSecurityContextUtil() {
            super(null);
        }

        public void setCurrentUser(User user) {
            this.currentUser = user;
        }

        @Override
        public User getCurrentUser() {
            return currentUser;
        }

        @Override
        public Long getCurrentUserId() {
            return currentUser != null ? currentUser.getId() : null;
        }

        @Override
        public String getCurrentUserRole() {
            return currentUser != null && currentUser.getRole() != null
                    ? currentUser.getRole().name()
                    : null;
        }
    }

    @Mock
    private TrainingSessionRepository sessionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private QuizAttemptRepository quizAttemptRepository;

    @Mock
    private LessonProgressRepository lessonProgressRepository;

    @Mock
    private CertificateRepository certificateRepository;

    private TestSecurityContextUtil securityContextUtil;
    private TrainingSessionService trainingSessionService;
    private TrainerReportService trainerReportService;

    private User empOps;
    private User empFinance;
    private User mgrOps;
    private User trainerAlpha;
    private User trainerBeta;
    private User hrAdmin;

    @BeforeEach
    void setUp() {
        securityContextUtil = new TestSecurityContextUtil();
        trainingSessionService = new TrainingSessionService(
                sessionRepository,
                userRepository,
                securityContextUtil,
                null
        );
        trainerReportService = new TrainerReportService(
                courseRepository,
                enrollmentRepository,
                userRepository,
                quizAttemptRepository,
                lessonProgressRepository,
                certificateRepository,
                securityContextUtil
        );

        empOps = createUser(101L, "EMP-101", "Alice Operations", Role.EMPLOYEE, "Operations");
        empFinance = createUser(102L, "EMP-102", "Bob Finance", Role.EMPLOYEE, "Finance");
        mgrOps = createUser(201L, "MGR-201", "Carol Manager", Role.MANAGER, "Operations");
        trainerAlpha = createUser(301L, "TRN-301", "Trainer Alpha", Role.TRAINER, "General");
        trainerBeta = createUser(302L, "TRN-302", "Trainer Beta", Role.TRAINER, "General");
        hrAdmin = createUser(401L, "HR-401", "Diana HR", Role.HR_ADMIN, "People Operations");

        lenient().when(userRepository.findAll()).thenReturn(List.of(
                empOps, empFinance, mgrOps, trainerAlpha, trainerBeta, hrAdmin
        ));
    }

    @Test
    void upcomingSessions_excludesPastCancelledAndCompletedAndAppliesRoleScoping() {
        LocalDate today = LocalDate.now();

        TrainingSession pastSession = createSession(
                1L, "Past Safety Briefing", today.minusDays(2), "09:00 AM - 10:00 AM",
                "Trainer Alpha", TrainingSessionTargetType.ALL, null, List.of(),
                "Room A", "Workshop", trainerAlpha.getId()
        );
        TrainingSession cancelledSession = createSession(
                2L, "Cancelled Briefing [CANCELLED]", today.plusDays(1), "10:00 AM - 11:00 AM",
                "Trainer Alpha", TrainingSessionTargetType.ALL, null, List.of(),
                "Room B", "CANCELLED", trainerAlpha.getId()
        );
        TrainingSession completedSession = createSession(
                3L, "Completed Orientation", today, "08:00 AM - 09:00 AM",
                "Trainer Alpha", TrainingSessionTargetType.ALL, null, List.of(),
                "Room C", "COMPLETED", trainerAlpha.getId()
        );
        TrainingSession todayAllSession = createSession(
                4L, "Maritime Compliance Live Q&A", today, "02:00 PM - 03:30 PM",
                "Trainer Alpha", TrainingSessionTargetType.ALL, null, List.of(),
                "Zoom: https://zoom.us/j/987654321", "Webinar", trainerAlpha.getId()
        );
        TrainingSession opsDeptSession = createSession(
                5L, "Operations SOP Workshop", today.plusDays(2), "11:00 AM - 12:30 PM",
                "Trainer Alpha", TrainingSessionTargetType.DEPARTMENT, "Operations", List.of(),
                "Conference Hall 2", "Workshop", trainerAlpha.getId()
        );
        TrainingSession financeDeptSession = createSession(
                6L, "Finance Audit Deep Dive", today.plusDays(3), "03:00 PM - 04:00 PM",
                "Trainer Beta", TrainingSessionTargetType.DEPARTMENT, "Finance", List.of(),
                "https://meet.google.com/fin-aud-it", "Workshop", trainerBeta.getId()
        );
        TrainingSession targetedFinanceEmpSession = createSession(
                7L, "1-on-1 Finance Coaching", today.plusDays(4), "04:00 PM - 04:45 PM",
                "Trainer Beta", TrainingSessionTargetType.EMPLOYEES, null, List.of(empFinance.getId()),
                "Room D", "Coaching", trainerBeta.getId()
        );

        lenient().when(sessionRepository.findAll(any(Sort.class))).thenReturn(List.of(
                pastSession,
                cancelledSession,
                completedSession,
                todayAllSession,
                opsDeptSession,
                financeDeptSession,
                targetedFinanceEmpSession
        ));

        // 1. EMPLOYEE (Operations): sees ALL (4) and Operations DEPARTMENT (5), not Finance (6, 7) or past/cancelled/completed (1, 2, 3)
        securityContextUtil.setCurrentUser(empOps);
        List<UpcomingSessionDTO> empOpsSessions = trainingSessionService.getUpcomingSessions(10);
        assertEquals(List.of(4L, 5L), empOpsSessions.stream().map(UpcomingSessionDTO::getId).toList());
        assertEquals("TODAY", empOpsSessions.get(0).getStatus());
        assertEquals("02:00 PM", empOpsSessions.get(0).getStartTime());
        assertEquals("03:30 PM", empOpsSessions.get(0).getEndTime());
        assertEquals("https://zoom.us/j/987654321", empOpsSessions.get(0).getJoinUrl());
        assertEquals("UPCOMING", empOpsSessions.get(1).getStatus());
        assertNull(empOpsSessions.get(1).getJoinUrl());

        // 2. EMPLOYEE (Finance): sees ALL (4), Finance DEPARTMENT (6), and targeted EMPLOYEES (7)
        securityContextUtil.setCurrentUser(empFinance);
        List<UpcomingSessionDTO> empFinSessions = trainingSessionService.getUpcomingSessions(10);
        assertEquals(List.of(4L, 6L, 7L), empFinSessions.stream().map(UpcomingSessionDTO::getId).toList());

        // 3. MANAGER (Operations): sees ALL (4) and Operations DEPARTMENT (5)
        securityContextUtil.setCurrentUser(mgrOps);
        List<UpcomingSessionDTO> mgrSessions = trainingSessionService.getUpcomingSessions(10);
        assertEquals(List.of(4L, 5L), mgrSessions.stream().map(UpcomingSessionDTO::getId).toList());

        // 4. TRAINER (Trainer Alpha): sees only Trainer Alpha's upcoming sessions (4, 5), excluding Trainer Beta's (6, 7)
        securityContextUtil.setCurrentUser(trainerAlpha);
        List<UpcomingSessionDTO> trainerAlphaSessions = trainingSessionService.getUpcomingSessions(10);
        assertEquals(List.of(4L, 5L), trainerAlphaSessions.stream().map(UpcomingSessionDTO::getId).toList());

        // 5. HR_ADMIN: sees all valid upcoming sessions across the organization (4, 5, 6, 7)
        securityContextUtil.setCurrentUser(hrAdmin);
        List<UpcomingSessionDTO> hrSessions = trainingSessionService.getUpcomingSessions(10);
        assertEquals(List.of(4L, 5L, 6L, 7L), hrSessions.stream().map(UpcomingSessionDTO::getId).toList());
    }

    @Test
    void recentLearnerActivity_ordersByTimestampDescendingIgnoresPageViewsAndAppliesRoleScoping() {
        Course courseAlpha = createCourse(10L, "CRS-OPS-101", "Cargo Handling Safety", trainerAlpha);
        Course courseBeta = createCourse(20L, "CRS-FIN-201", "Financial Controls", trainerBeta);

        lenient().when(courseRepository.findAll()).thenReturn(List.of(courseAlpha, courseBeta));

        LocalDateTime baseTime = LocalDateTime.of(2026, 11, 5, 9, 0);

        // Enrollment 1: Alice (Operations) in courseAlpha -> started at 09:00, completed at 14:00
        Enrollment enrAlice = new Enrollment();
        enrAlice.setId(501L);
        enrAlice.setUser(empOps);
        enrAlice.setCourse(courseAlpha);
        enrAlice.setStatus(EnrollmentStatus.COMPLETED);
        enrAlice.setProgressPercent(100);
        enrAlice.setEnrolledAt(baseTime);
        enrAlice.setCompletedDate(baseTime.plusHours(5)); // 14:00

        // Enrollment 2: Bob (Finance) in courseBeta -> NOT_STARTED with only lastAccessed (page view only - must NOT emit activity)
        Enrollment enrBobPageViewOnly = new Enrollment();
        enrBobPageViewOnly.setId(502L);
        enrBobPageViewOnly.setUser(empFinance);
        enrBobPageViewOnly.setCourse(courseBeta);
        enrBobPageViewOnly.setStatus(EnrollmentStatus.NOT_STARTED);
        enrBobPageViewOnly.setProgressPercent(0);
        enrBobPageViewOnly.setEnrolledAt(baseTime.minusDays(1));
        enrBobPageViewOnly.setLastAccessed(baseTime.plusHours(6));

        lenient().when(enrollmentRepository.findAllActiveOrganizationEnrollments())
                .thenReturn(List.of(enrAlice, enrBobPageViewOnly));

        // Lesson progress: Alice completed Lesson 1 at 10:00; Bob only opened Lesson 1 (completed=false, completionPercent=0, watchedSeconds=0)
        Lesson lesson1 = new Lesson();
        lesson1.setId(601L);
        lesson1.setTitle("Introduction to Deck Safety");

        LessonProgress lpAlice = new LessonProgress();
        lpAlice.setId(701L);
        lpAlice.setEnrollment(enrAlice);
        lpAlice.setLesson(lesson1);
        lpAlice.setCompleted(true);
        lpAlice.setCompletionPercent(100);
        lpAlice.setCreatedAt(baseTime.plusMinutes(15)); // 09:15 (earliest lesson engagement)
        lpAlice.setCompletedAt(baseTime.plusHours(1));  // 10:00

        LessonProgress lpBobViewOnly = new LessonProgress();
        lpBobViewOnly.setId(702L);
        lpBobViewOnly.setEnrollment(enrBobPageViewOnly);
        lpBobViewOnly.setLesson(lesson1);
        lpBobViewOnly.setCompleted(false);
        lpBobViewOnly.setCompletionPercent(0);
        lpBobViewOnly.setWatchedSeconds(0);
        lpBobViewOnly.setLastAccessedAt(baseTime.plusHours(6));

        lenient().when(lessonProgressRepository.findAllActiveLessonProgressWithDetails())
                .thenReturn(List.of(lpAlice, lpBobViewOnly));

        // Quiz attempts:
        // - Alice completed a MODULE quiz at 11:00
        // - Alice passed the FINAL assessment at 13:00
        // - Bob completed a MODULE quiz in courseBeta at 12:00
        Quiz moduleQuizAlpha = new Quiz();
        moduleQuizAlpha.setId(801L);
        moduleQuizAlpha.setTitle("Module 1 Safety Check");
        moduleQuizAlpha.setType(QuizType.MODULE);
        moduleQuizAlpha.setCourse(courseAlpha);

        Quiz finalQuizAlpha = new Quiz();
        finalQuizAlpha.setId(802L);
        finalQuizAlpha.setTitle("Final Safety Assessment");
        finalQuizAlpha.setType(QuizType.FINAL);
        finalQuizAlpha.setCourse(courseAlpha);

        Quiz moduleQuizBeta = new Quiz();
        moduleQuizBeta.setId(803L);
        moduleQuizBeta.setTitle("Ledger Reconciliation Quiz");
        moduleQuizBeta.setType(QuizType.MODULE);
        moduleQuizBeta.setCourse(courseBeta);

        QuizAttempt qaAliceModule = new QuizAttempt();
        qaAliceModule.setId(901L);
        qaAliceModule.setUser(empOps);
        qaAliceModule.setQuiz(moduleQuizAlpha);
        qaAliceModule.setScore(85);
        qaAliceModule.setPassed(true);
        qaAliceModule.setCompletedAt(baseTime.plusHours(2)); // 11:00

        QuizAttempt qaBobModule = new QuizAttempt();
        qaBobModule.setId(902L);
        qaBobModule.setUser(empFinance);
        qaBobModule.setQuiz(moduleQuizBeta);
        qaBobModule.setScore(90);
        qaBobModule.setPassed(true);
        qaBobModule.setCompletedAt(baseTime.plusHours(3)); // 12:00

        QuizAttempt qaAliceFinal = new QuizAttempt();
        qaAliceFinal.setId(903L);
        qaAliceFinal.setUser(empOps);
        qaAliceFinal.setQuiz(finalQuizAlpha);
        qaAliceFinal.setScore(92);
        qaAliceFinal.setPassed(true);
        qaAliceFinal.setCompletedAt(baseTime.plusHours(4)); // 13:00

        lenient().when(quizAttemptRepository.findCompletedAttemptsWithDetails())
                .thenReturn(List.of(qaAliceFinal, qaBobModule, qaAliceModule));

        // Certificate issued to Alice at 14:05
        Certificate certAlice = new Certificate();
        certAlice.setId(1001L);
        certAlice.setCertificateId("CERT-2026-OPS101");
        certAlice.setUser(empOps);
        certAlice.setCourse(courseAlpha);
        certAlice.setIssuedAt(baseTime.plusHours(5).plusMinutes(5)); // 14:05

        lenient().when(certificateRepository.findAllActiveCertificatesWithDetails())
                .thenReturn(List.of(certAlice));

        // 1. HR_ADMIN sees all 7 real events across both departments, ordered newest-first (14:05 -> 14:00 -> 13:00 -> 12:00 -> 11:00 -> 10:00 -> 09:15)
        securityContextUtil.setCurrentUser(hrAdmin);
        List<LearnerActivityDTO> hrActivities = trainerReportService.getRecentLearnerActivities(10);
        assertEquals(7, hrActivities.size());
        assertEquals("CERTIFICATE_ISSUED", hrActivities.get(0).getActivityType());
        assertEquals("COURSE_COMPLETED", hrActivities.get(1).getActivityType());
        assertEquals("FINAL_ASSESSMENT_PASSED", hrActivities.get(2).getActivityType());
        assertEquals("MODULE_QUIZ_COMPLETED", hrActivities.get(3).getActivityType()); // Bob 12:00
        assertEquals("Bob Finance", hrActivities.get(3).getEmployeeName());
        assertEquals("MODULE_QUIZ_COMPLETED", hrActivities.get(4).getActivityType()); // Alice 11:00
        assertEquals("LESSON_COMPLETED", hrActivities.get(5).getActivityType());      // Alice 10:00
        assertEquals("COURSE_STARTED", hrActivities.get(6).getActivityType());        // Alice 09:15

        // 2. TRAINER (Trainer Alpha) sees only events in courseAlpha (Alice's 6 events), excluding courseBeta (Bob's event)
        securityContextUtil.setCurrentUser(trainerAlpha);
        List<LearnerActivityDTO> trainerAlphaActivities = trainerReportService.getRecentLearnerActivities(10);
        assertEquals(6, trainerAlphaActivities.size());
        assertTrue(trainerAlphaActivities.stream().allMatch(a -> "CRS-OPS-101".equals(a.getCourseId())));

        // 3. MANAGER (Operations) sees only Operations department employee events (Alice's 6 events)
        securityContextUtil.setCurrentUser(mgrOps);
        List<LearnerActivityDTO> mgrOpsActivities = trainerReportService.getRecentLearnerActivities(10);
        assertEquals(6, mgrOpsActivities.size());
        assertTrue(mgrOpsActivities.stream().allMatch(a -> "Alice Operations".equals(a.getEmployeeName())));

        // 4. EMPLOYEE (Bob Finance) sees only his own actual quiz completion (1 event) and NOT his mere page view or Alice's events
        securityContextUtil.setCurrentUser(empFinance);
        List<LearnerActivityDTO> bobActivities = trainerReportService.getRecentLearnerActivities(10);
        assertEquals(1, bobActivities.size());
        assertEquals("Bob Finance", bobActivities.get(0).getEmployeeName());
        assertEquals("MODULE_QUIZ_COMPLETED", bobActivities.get(0).getActivityType());
    }

    @Test
    void unauthenticatedRequestsReturnEmptyAndControllersEnforcePreAuthorizeGuards() throws Exception {
        securityContextUtil.setCurrentUser(null);
        assertTrue(trainingSessionService.getUpcomingSessions(10).isEmpty());
        assertTrue(trainerReportService.getRecentLearnerActivities(10).isEmpty());

        Method upcomingMethod = TrainingSessionController.class.getMethod("getUpcomingSessions", int.class);
        PreAuthorize upcomingAuth = upcomingMethod.getAnnotation(PreAuthorize.class);
        assertNotNull(upcomingAuth);
        assertTrue(upcomingAuth.value().contains("EMPLOYEE"));
        assertTrue(upcomingAuth.value().contains("TRAINER"));

        Method trainerRecentMethod = TrainerReportController.class.getMethod("getTrainerRecentActivity", int.class);
        PreAuthorize trainerRecentAuth = trainerRecentMethod.getAnnotation(PreAuthorize.class);
        assertNotNull(trainerRecentAuth);
        assertEquals("hasAnyRole('TRAINER', 'HR_ADMIN')", trainerRecentAuth.value());

        Method scopedActivityMethod = TrainerReportController.class.getMethod("getScopedRecentLearnerActivity", int.class);
        PreAuthorize scopedActivityAuth = scopedActivityMethod.getAnnotation(PreAuthorize.class);
        assertNotNull(scopedActivityAuth);
        assertEquals("hasAnyRole('EMPLOYEE', 'MANAGER', 'TRAINER', 'HR_ADMIN')", scopedActivityAuth.value());

        // Verify employee training transcript access for self (EMPLOYEE), department MANAGER, TRAINER, and HR_ADMIN
        lenient().when(userRepository.findById(empOps.getId())).thenReturn(Optional.of(empOps));
        lenient().when(userRepository.findById(empFinance.getId())).thenReturn(Optional.of(empFinance));
        lenient().when(enrollmentRepository.findByUserIdWithCourse(empOps.getId())).thenReturn(List.of());

        ManagerReportsService managerReportsService = new ManagerReportsService(userRepository, enrollmentRepository);
        ManagerReportsController transcriptController = new ManagerReportsController(
                managerReportsService,
                securityContextUtil,
                userRepository
        );

        // Employee can load own transcript
        securityContextUtil.setCurrentUser(empOps);
        ResponseEntity<EmployeeTrainingTranscriptDTO> selfResponse =
                transcriptController.getEmployeeTrainingTranscript(empOps.getId());
        assertEquals(empOps.getId(), selfResponse.getBody().getUserId());

        // Employee cannot load another employee's transcript
        assertThrows(SecurityException.class, () ->
                transcriptController.getEmployeeTrainingTranscript(empFinance.getId())
        );

        // Manager can load transcript of employee in same department, but not another department
        securityContextUtil.setCurrentUser(mgrOps);
        assertEquals(empOps.getId(), transcriptController.getEmployeeTrainingTranscript(empOps.getId()).getBody().getUserId());
        assertThrows(SecurityException.class, () ->
                transcriptController.getEmployeeTrainingTranscript(empFinance.getId())
        );

        // Trainer and HR Admin can load employee transcript
        securityContextUtil.setCurrentUser(trainerAlpha);
        assertEquals(empOps.getId(), transcriptController.getEmployeeTrainingTranscript(empOps.getId()).getBody().getUserId());
        securityContextUtil.setCurrentUser(hrAdmin);
        assertEquals(empOps.getId(), transcriptController.getEmployeeTrainingTranscript(empOps.getId()).getBody().getUserId());
    }

    @Test
    @SuppressWarnings("unchecked")
    void trainerCourseAnalyticsMatchesHrReportsOnSameAuthorizedDatasetAndEnforcesRoleScope() {
        Course courseOps = createCourse(101L, "CRS-OPS-101", "Maritime Safety Fundamentals", trainerAlpha);
        courseOps.setCategory("Operations");
        Course courseFin = createCourse(102L, "CRS-FIN-201", "Financial Compliance", trainerAlpha);
        courseFin.setCategory("Finance");

        empOps.setEmail("alice@fairmacs.com");
        empOps.setDesignation("Operations Officer");
        empFinance.setEmail("bob@fairmacs.com");
        empFinance.setDesignation("Finance Analyst");

        Enrollment e1 = new Enrollment();
        e1.setId(501L);
        e1.setUser(empOps);
        e1.setCourse(courseOps);
        e1.setStatus(EnrollmentStatus.COMPLETED);
        e1.setEnrollmentType(EnrollmentType.MANDATORY);
        e1.setProgressPercent(100);
        e1.setScore(92);
        e1.setCertificateId("CERT-OPS-501");

        Enrollment e2 = new Enrollment();
        e2.setId(502L);
        e2.setUser(empFinance);
        e2.setCourse(courseFin);
        e2.setStatus(EnrollmentStatus.IN_PROGRESS);
        e2.setEnrollmentType(EnrollmentType.MANDATORY);
        e2.setProgressPercent(60);
        e2.setScore(78);
        e2.setDueDate(LocalDate.now().minusDays(2)); // Overdue

        lenient().when(courseRepository.findAll()).thenReturn(List.of(courseOps, courseFin));
        lenient().when(userRepository.findAll()).thenReturn(List.of(empOps, empFinance, trainerAlpha, hrAdmin));
        lenient().when(enrollmentRepository.findAll()).thenReturn(List.of(e1, e2));
        lenient().when(enrollmentRepository.findAllActiveOrganizationEnrollments()).thenReturn(List.of(e1, e2));
        lenient().when(quizAttemptRepository.findCompletedAttemptsWithDetails()).thenReturn(List.of());

        HrReportService hrReportService = new HrReportService(
                userRepository,
                enrollmentRepository,
                courseRepository,
                quizAttemptRepository
        );

        securityContextUtil.setCurrentUser(trainerAlpha);
        Map<String, Object> hrReport = hrReportService.getHrTrainingReport();
        Map<String, Object> trainerReport = trainerReportService.getTrainerInsights();

        // 1. Verify identical KPI & Summary calculations on the same authorized dataset
        assertEquals(hrReport.get("totalEmployees"), trainerReport.get("totalEmployees"));
        assertEquals(hrReport.get("activeEmployees"), trainerReport.get("activeEmployees"));
        assertEquals(hrReport.get("activeLearners"), trainerReport.get("activeLearners"));
        assertEquals(hrReport.get("totalAssignments"), trainerReport.get("totalAssignments"));
        assertEquals(hrReport.get("completedAssignments"), trainerReport.get("completedAssignments"));
        assertEquals(hrReport.get("inProgressAssignments"), trainerReport.get("inProgressAssignments"));
        assertEquals(hrReport.get("notStartedAssignments"), trainerReport.get("notStartedAssignments"));
        assertEquals(hrReport.get("overdueAssignments"), trainerReport.get("overdueAssignments"));
        assertEquals(hrReport.get("mandatoryAssignments"), trainerReport.get("mandatoryAssignments"));
        assertEquals(hrReport.get("mandatoryCompleted"), trainerReport.get("mandatoryCompleted"));
        assertEquals(hrReport.get("mandatoryComplianceRate"), trainerReport.get("mandatoryComplianceRate"));
        assertEquals(hrReport.get("averageProgress"), trainerReport.get("averageProgress"));
        assertEquals(hrReport.get("averageScore"), trainerReport.get("averageScore"));
        assertEquals(hrReport.get("certificatesIssued"), trainerReport.get("certificatesIssued"));
        assertEquals(hrReport.get("completionRate"), trainerReport.get("completionRate"));
        assertEquals(hrReport.get("completionRateExact"), trainerReport.get("completionRateExact"));

        // 2. Verify identical Course Analytics breakdown & Department Performance breakdown
        assertEquals(hrReport.get("courseReports"), trainerReport.get("courseReports"));
        assertEquals(hrReport.get("departmentReports"), trainerReport.get("departmentReports"));

        // 3. Verify identical Learner training metrics while omitting HR-only fields (email, status) from Trainer view
        List<Map<String, Object>> hrEmpReports = (List<Map<String, Object>>) hrReport.get("employeeReports");
        List<Map<String, Object>> trainerEmpReports = (List<Map<String, Object>>) trainerReport.get("employeeReports");
        assertEquals(2, hrEmpReports.size());
        assertEquals(2, trainerEmpReports.size());
        for (int i = 0; i < hrEmpReports.size(); i++) {
            Map<String, Object> hrEmp = hrEmpReports.get(i);
            Map<String, Object> trEmp = trainerEmpReports.get(i);
            assertEquals(hrEmp.get("userId"), trEmp.get("userId"));
            assertEquals(hrEmp.get("assignedCourses"), trEmp.get("assignedCourses"));
            assertEquals(hrEmp.get("completedCourses"), trEmp.get("completedCourses"));
            assertEquals(hrEmp.get("inProgressCourses"), trEmp.get("inProgressCourses"));
            assertEquals(hrEmp.get("overdueCourses"), trEmp.get("overdueCourses"));
            assertEquals(hrEmp.get("averageProgress"), trEmp.get("averageProgress"));
            assertEquals(hrEmp.get("averageScore"), trEmp.get("averageScore"));
            assertEquals(hrEmp.get("mandatoryCourses"), trEmp.get("mandatoryCourses"));
            assertEquals(hrEmp.get("mandatoryCompleted"), trEmp.get("mandatoryCompleted"));
            assertTrue(hrEmp.containsKey("email"));
            assertTrue(hrEmp.containsKey("status"));
            assertFalse(trEmp.containsKey("email"));
            assertFalse(trEmp.containsKey("status"));
        }

        // 4. Verify Trainer role scoping excludes another trainer's courses and unenrolled employees
        Course otherTrainerCourse = createCourse(103L, "CRS-OTHER-301", "External Trainer Course", trainerBeta);
        lenient().when(courseRepository.findAll()).thenReturn(List.of(courseOps, otherTrainerCourse));
        lenient().when(enrollmentRepository.findAllActiveOrganizationEnrollments()).thenReturn(List.of(e1, e2));

        Map<String, Object> scopedTrainerReport = trainerReportService.getTrainerInsights();
        assertEquals(1, scopedTrainerReport.get("publishedCourses"));
        assertEquals(1L, scopedTrainerReport.get("totalEmployees"));
        assertEquals(1L, scopedTrainerReport.get("totalAssignments"));
        List<Map<String, Object>> scopedCourses = (List<Map<String, Object>>) scopedTrainerReport.get("courseReports");
        assertEquals(1, scopedCourses.size());
        assertEquals("CRS-OPS-101", scopedCourses.get(0).get("courseId"));
    }

    private User createUser(Long id, String employeeId, String name, Role role, String department) {
        User u = new User();
        u.setId(id);
        u.setEmployeeId(employeeId);
        u.setName(name);
        u.setRole(role);
        u.setDepartment(department);
        u.setStatus(UserStatus.ACTIVE);
        return u;
    }

    private Course createCourse(Long id, String courseCode, String title, User createdBy) {
        Course c = new Course();
        c.setId(id);
        c.setCourseId(courseCode);
        c.setTitle(title);
        c.setActive(true);
        c.setCreatedBy(createdBy);
        return c;
    }

    private TrainingSession createSession(
            Long id,
            String title,
            LocalDate date,
            String time,
            String trainer,
            TrainingSessionTargetType targetType,
            String department,
            List<Long> targetUserIds,
            String location,
            String type,
            Long createdByUserId
    ) {
        TrainingSession s = new TrainingSession();
        s.setId(id);
        s.setTitle(title);
        s.setDate(date);
        s.setTime(time);
        s.setTrainer(trainer);
        s.setTargetType(targetType);
        s.setDepartment(department);
        s.setTargetUserIds(targetUserIds);
        s.setLocation(location);
        s.setType(type);
        s.setCreatedByUserId(createdByUserId);
        return s;
    }
}
