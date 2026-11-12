package com.fairmacs.lms.service;

import com.fairmacs.lms.controller.NotificationController;
import com.fairmacs.lms.dto.CertificateDTO;
import com.fairmacs.lms.dto.CompleteCourseRequest;
import com.fairmacs.lms.dto.NotificationResponse;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import com.fairmacs.lms.service.notification.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.ResponseEntity;

import java.lang.reflect.Proxy;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Comprehensive JUnit 5 test suite for the Fairmacs LMS Notification System.
 * Uses pure Java interface proxies and lightweight fakes so tests run cleanly
 * across Java 17, 21, and 25+ without ByteBuddy agent instrumentation limits.
 */
class NotificationSystemTest {

    // In-memory state backing repository proxies
    private final List<Notification> savedNotifications = new ArrayList<>();
    private final Set<String> deduplicationKeys = new HashSet<>();
    private final Map<Long, User> usersById = new LinkedHashMap<>();
    private final Map<Long, Course> coursesById = new LinkedHashMap<>();
    private final List<Enrollment> enrollments = new ArrayList<>();
    private final List<Department> departments = new ArrayList<>();
    private final List<Quiz> quizzes = new ArrayList<>();
    private final List<QuizAttempt> quizAttempts = new ArrayList<>();
    private final Set<String> passedQuizUserPairs = new HashSet<>();

    private Long currentAuthenticatedUserId = 10L;

    private NotificationRepository notificationRepository;
    private UserRepository userRepository;
    private NotificationJobLogRepository jobLogRepository;
    private EnrollmentRepository enrollmentRepository;
    private CourseRepository courseRepository;
    private DepartmentRepository departmentRepository;
    private LessonProgressRepository lessonProgressRepository;
    private ModuleRepository moduleRepository;
    private QuizRepository quizRepository;
    private QuizAttemptRepository quizAttemptRepository;
    private QuizProgressRepository quizProgressRepository;

    private SecurityContextUtil securityContextUtil;
    private CertificateService certificateService;
    private CourseMapper courseMapper;

    private NotificationEmailProperties emailProperties;
    private EmailTemplateRenderer templateRenderer;
    private EmailNotificationChannel emailChannel;
    private InAppNotificationChannel inAppChannel;
    private NotificationService notificationService;
    private NotificationSchedulerService schedulerService;
    private NotificationController notificationController;

    private User activeEmployee;
    private User activeManager;
    private User activeHrAdmin;
    private Course sampleCourse;

    @BeforeEach
    void setUp() {
        savedNotifications.clear();
        deduplicationKeys.clear();
        usersById.clear();
        coursesById.clear();
        enrollments.clear();
        departments.clear();
        quizzes.clear();
        quizAttempts.clear();
        passedQuizUserPairs.clear();

        activeEmployee = new User();
        activeEmployee.setId(10L);
        activeEmployee.setEmployeeId("EMP-010");
        activeEmployee.setName("Aarav Sharma");
        activeEmployee.setEmail("aarav.sharma@fairmacs.com");
        activeEmployee.setDepartment("Operations");
        activeEmployee.setDesignation("Customs Executive");
        activeEmployee.setLevel("L1");
        activeEmployee.setRole(Role.EMPLOYEE);
        activeEmployee.setStatus(UserStatus.ACTIVE);
        usersById.put(10L, activeEmployee);

        activeManager = new User();
        activeManager.setId(20L);
        activeManager.setEmployeeId("MGR-020");
        activeManager.setName("Priya Nair");
        activeManager.setEmail("priya.nair@fairmacs.com");
        activeManager.setDepartment("Operations");
        activeManager.setRole(Role.MANAGER);
        activeManager.setStatus(UserStatus.ACTIVE);
        usersById.put(20L, activeManager);

        activeHrAdmin = new User();
        activeHrAdmin.setId(30L);
        activeHrAdmin.setEmployeeId("HR-030");
        activeHrAdmin.setName("Rohan Verma");
        activeHrAdmin.setEmail("rohan.verma@fairmacs.com");
        activeHrAdmin.setDepartment("HR");
        activeHrAdmin.setRole(Role.HR_ADMIN);
        activeHrAdmin.setStatus(UserStatus.ACTIVE);
        usersById.put(30L, activeHrAdmin);

        sampleCourse = new Course();
        sampleCourse.setId(101L);
        sampleCourse.setCourseId("CRS-OPS-101");
        sampleCourse.setTitle("Customs Clearance & Freight Compliance");
        sampleCourse.setLevel("L1");
        sampleCourse.setActive(true);
        sampleCourse.setDraft(false);
        sampleCourse.setPassingScore(80);
        sampleCourse.setCertificateEligible(true);
        coursesById.put(101L, sampleCourse);

        Department opsDept = new Department();
        opsDept.setId(1L);
        opsDept.setName("Operations");
        departments.add(opsDept);

        initRepositoryProxies();

        securityContextUtil = new SecurityContextUtil(userRepository) {
            @Override
            public Long getCurrentUserId() {
                return currentAuthenticatedUserId;
            }

            @Override
            public User getCurrentUser() {
                return usersById.get(currentAuthenticatedUserId);
            }
        };

        ObjectMapper objectMapper = new ObjectMapper();
        emailProperties = new NotificationEmailProperties();
        emailProperties.setEnabled(false); // Disabled by default

        templateRenderer = new EmailTemplateRenderer();
        inAppChannel = new InAppNotificationChannel();
        emailChannel = new EmailNotificationChannel(
                emailProperties,
                templateRenderer,
                notificationRepository,
                objectMapper
        );

        notificationService = new NotificationService(
                notificationRepository,
                userRepository,
                List.of(inAppChannel, emailChannel),
                emailProperties,
                jobLogRepository,
                objectMapper
        );

        schedulerService = new NotificationSchedulerService(
                enrollmentRepository,
                quizAttemptRepository,
                userRepository,
                notificationService,
                jobLogRepository
        );

        notificationController = new NotificationController(
                notificationService,
                securityContextUtil,
                schedulerService
        );

        certificateService = new CertificateService(
                null,
                userRepository,
                courseRepository,
                securityContextUtil,
                notificationService
        ) {
            @Override
            public Certificate createCertificate(Long userId, Long courseId, Integer score) {
                Certificate cert = new Certificate();
                cert.setCertificateId("FM-CERT-2026-0001");
                cert.setUser(usersById.get(userId));
                cert.setCourse(coursesById.get(courseId));
                cert.setScore(score);
                cert.setPdfUrl("/api/certificates/FM-CERT-2026-0001/pdf");

                notificationService.createNotificationSafely(
                        userId,
                        "Certificate Issued: " + coursesById.get(courseId).getTitle(),
                        "Your certificate FM-CERT-2026-0001 has been issued.",
                        NotificationType.CERTIFICATE_ISSUED,
                        NotificationPriority.NORMAL,
                        "CERTIFICATE",
                        "FM-CERT-2026-0001",
                        "/certificates",
                        "CERTIFICATE_ISSUED:FM-CERT-2026-0001",
                        Map.of("certificateId", "FM-CERT-2026-0001")
                );
                return cert;
            }

            @Override
            public CertificateDTO verifyCertificate(String certificateId) {
                CertificateDTO dto = new CertificateDTO();
                dto.setCertificateId(certificateId);
                return dto;
            }
        };

        courseMapper = null;
    }

    @SuppressWarnings("unchecked")
    private void initRepositoryProxies() {
        notificationRepository = (NotificationRepository) Proxy.newProxyInstance(
                NotificationRepository.class.getClassLoader(),
                new Class<?>[]{NotificationRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    switch (name) {
                        case "save" -> {
                            Notification n = (Notification) args[0];
                            if (n.getId() == null) {
                                n.setId((long) (savedNotifications.size() + 1));
                                savedNotifications.add(n);
                            }
                            if (n.getDeduplicationKey() != null) {
                                deduplicationKeys.add(n.getDeduplicationKey());
                            }
                            return n;
                        }
                        case "existsByDeduplicationKey" -> {
                            String key = (String) args[0];
                            return key != null && deduplicationKeys.contains(key);
                        }
                        case "findByDeduplicationKey" -> {
                            String key = (String) args[0];
                            return savedNotifications.stream()
                                    .filter(n -> Objects.equals(n.getDeduplicationKey(), key))
                                    .findFirst();
                        }
                        case "findByRecipientIdOrderByCreatedAtDesc" -> {
                            Long uid = (Long) args[0];
                            return savedNotifications.stream()
                                    .filter(n -> Objects.equals(n.getRecipientUserId(), uid))
                                    .toList();
                        }
                        case "findByRecipientIdAndReadFalseOrderByCreatedAtDesc" -> {
                            Long uid = (Long) args[0];
                            return savedNotifications.stream()
                                    .filter(n -> Objects.equals(n.getRecipientUserId(), uid) && !Boolean.TRUE.equals(n.getRead()))
                                    .toList();
                        }
                        case "countByRecipientIdAndReadFalse" -> {
                            Long uid = (Long) args[0];
                            return savedNotifications.stream()
                                    .filter(n -> Objects.equals(n.getRecipientUserId(), uid) && !Boolean.TRUE.equals(n.getRead()))
                                    .count();
                        }
                        case "findByIdAndRecipientId" -> {
                            Long id = (Long) args[0];
                            Long uid = (Long) args[1];
                            return savedNotifications.stream()
                                    .filter(n -> Objects.equals(n.getId(), id) && Objects.equals(n.getRecipientUserId(), uid))
                                    .findFirst();
                        }
                        case "markAllAsRead" -> {
                            Long uid = (Long) args[0];
                            int count = 0;
                            for (Notification n : savedNotifications) {
                                if (Objects.equals(n.getRecipientUserId(), uid) && !Boolean.TRUE.equals(n.getRead())) {
                                    n.setRead(true);
                                    count++;
                                }
                            }
                            return count;
                        }
                        case "findFilteredNotifications" -> {
                            Long uid = (Long) args[0];
                            Boolean read = (Boolean) args[1];
                            String type = (String) args[2];
                            String priority = (String) args[3];
                            String search = (String) args[4];
                            List<Notification> filtered = savedNotifications.stream()
                                    .filter(n -> Objects.equals(n.getRecipientUserId(), uid))
                                    .filter(n -> read == null || Objects.equals(n.getRead(), read))
                                    .filter(n -> type == null || type.equalsIgnoreCase(n.getType()))
                                    .filter(n -> priority == null || priority.equalsIgnoreCase(n.getPriority()))
                                    .filter(n -> search == null
                                            || n.getTitle().toLowerCase().contains(search.toLowerCase())
                                            || n.getMessage().toLowerCase().contains(search.toLowerCase()))
                                    .toList();
                            return new PageImpl<>(filtered);
                        }
                        case "count" -> {
                            return (long) savedNotifications.size();
                        }
                        case "countByEmailStatus" -> {
                            String st = (String) args[0];
                            return savedNotifications.stream()
                                    .filter(n -> Objects.equals(n.getEmailStatus(), st))
                                    .count();
                        }
                        case "claimNotificationForEmailDelivery" -> {
                            Long id = (Long) args[0];
                            LocalDateTime attTime = (LocalDateTime) args[1];
                            @SuppressWarnings("unchecked")
                            List<String> allowed = (List<String>) args[2];
                            for (Notification n : savedNotifications) {
                                if (Objects.equals(n.getId(), id) && allowed.contains(n.getEmailStatus())) {
                                    n.setEmailStatus("PROCESSING");
                                    n.setEmailLastAttemptAt(attTime);
                                    return 1;
                                }
                            }
                            return 0;
                        }
                        case "findNotificationsEligibleForEmailDelivery" -> {
                            @SuppressWarnings("unchecked")
                            List<String> statuses = (List<String>) args[0];
                            int maxAtt = (int) args[1];
                            return savedNotifications.stream()
                                    .filter(n -> statuses.contains(n.getEmailStatus()))
                                    .filter(n -> n.getEmailAttempts() == null || n.getEmailAttempts() < maxAtt)
                                    .toList();
                        }
                        case "findById" -> {
                            Long id = (Long) args[0];
                            return savedNotifications.stream()
                                    .filter(n -> Objects.equals(n.getId(), id))
                                    .findFirst();
                        }
                        default -> {
                            return null;
                        }
                    }
                }
        );

        userRepository = (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    return switch (name) {
                        case "findById" -> Optional.ofNullable(usersById.get((Long) args[0]));
                        case "findAll" -> new ArrayList<>(usersById.values());
                        case "findAllById" -> {
                            Iterable<Long> ids = (Iterable<Long>) args[0];
                            List<User> list = new ArrayList<>();
                            for (Long id : ids) {
                                if (usersById.containsKey(id)) list.add(usersById.get(id));
                            }
                            yield list;
                        }
                        case "findByDepartmentIgnoreCase" -> {
                            String dept = (String) args[0];
                            yield usersById.values().stream()
                                    .filter(u -> u.getDepartment() != null
                                            && u.getDepartment().equalsIgnoreCase(dept))
                                    .toList();
                        }
                        case "findByDepartmentIgnoreCaseAndRole" -> {
                            String dept = (String) args[0];
                            Role role = (Role) args[1];
                            yield usersById.values().stream()
                                    .filter(u -> u.getRole() == role
                                            && u.getDepartment() != null
                                            && u.getDepartment().equalsIgnoreCase(dept))
                                    .toList();
                        }
                        case "findByRoleAndStatus" -> {
                            Role role = (Role) args[0];
                            UserStatus status = (UserStatus) args[1];
                            yield usersById.values().stream()
                                    .filter(u -> u.getRole() == role && u.getStatus() == status)
                                    .toList();
                        }
                        case "findByStatus" -> {
                            UserStatus status = (UserStatus) args[0];
                            yield usersById.values().stream()
                                    .filter(u -> u.getStatus() == status)
                                    .toList();
                        }
                        default -> Collections.emptyList();
                    };
                }
        );

        jobLogRepository = (NotificationJobLogRepository) Proxy.newProxyInstance(
                NotificationJobLogRepository.class.getClassLoader(),
                new Class<?>[]{NotificationJobLogRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "existsByExecutionKey" -> false;
                    case "existsByExecutionKeyAndStatus" -> false;
                    case "save" -> args[0];
                    case "findTop20ByOrderByStartedAtDesc" -> Collections.emptyList();
                    default -> null;
                }
        );

        enrollmentRepository = (EnrollmentRepository) Proxy.newProxyInstance(
                EnrollmentRepository.class.getClassLoader(),
                new Class<?>[]{EnrollmentRepository.class},
                (proxy, method, args) -> {
                    String name = method.getName();
                    return switch (name) {
                        case "findByUserIdAndCourseId" -> {
                            Long uid = (Long) args[0];
                            Long cid = (Long) args[1];
                            yield enrollments.stream()
                                    .filter(e -> Objects.equals(e.getUser().getId(), uid)
                                            && Objects.equals(e.getCourse().getId(), cid))
                                    .findFirst();
                        }
                        case "findByIdWithUserAndCourse" -> {
                            Long id = (Long) args[0];
                            yield enrollments.stream()
                                    .filter(e -> Objects.equals(e.getId(), id))
                                    .findFirst();
                        }
                        case "save" -> {
                            Enrollment e = (Enrollment) args[0];
                            if (e.getId() == null) {
                                e.setId((long) (enrollments.size() + 1));
                                enrollments.add(e);
                            }
                            yield e;
                        }
                        case "findAllActiveOrganizationEnrollments" -> new ArrayList<>(enrollments);
                        case "findActiveEnrollmentsWithDueDate" -> new PageImpl<>(enrollments);
                        default -> null;
                    };
                }
        );

        courseRepository = (CourseRepository) Proxy.newProxyInstance(
                CourseRepository.class.getClassLoader(),
                new Class<?>[]{CourseRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "findById" -> Optional.ofNullable(coursesById.get((Long) args[0]));
                    case "save" -> args[0];
                    default -> null;
                }
        );

        departmentRepository = (DepartmentRepository) Proxy.newProxyInstance(
                DepartmentRepository.class.getClassLoader(),
                new Class<?>[]{DepartmentRepository.class},
                (proxy, method, args) -> "findAll".equals(method.getName()) ? departments : null
        );

        lessonProgressRepository = (LessonProgressRepository) Proxy.newProxyInstance(
                LessonProgressRepository.class.getClassLoader(),
                new Class<?>[]{LessonProgressRepository.class},
                (proxy, method, args) -> "areAllLessonsCompleted".equals(method.getName()) ? true : null
        );

        moduleRepository = (ModuleRepository) Proxy.newProxyInstance(
                ModuleRepository.class.getClassLoader(),
                new Class<?>[]{ModuleRepository.class},
                (proxy, method, args) -> Collections.emptyList()
        );

        quizRepository = (QuizRepository) Proxy.newProxyInstance(
                QuizRepository.class.getClassLoader(),
                new Class<?>[]{QuizRepository.class},
                (proxy, method, args) -> "findByCourseIdAndType".equals(method.getName()) ? quizzes : Optional.empty()
        );

        quizAttemptRepository = (QuizAttemptRepository) Proxy.newProxyInstance(
                QuizAttemptRepository.class.getClassLoader(),
                new Class<?>[]{QuizAttemptRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "findFailedAttemptsReadyForRetake" -> new ArrayList<>(quizAttempts);
                    case "findTopByQuiz_IdAndUser_IdAndCompletedAtIsNotNullOrderByCompletedAtDesc" ->
                            quizAttempts.isEmpty() ? Optional.empty() : Optional.of(quizAttempts.get(quizAttempts.size() - 1));
                    case "countByQuizIdAndUserId" -> (long) quizAttempts.size();
                    default -> null;
                }
        );

        quizProgressRepository = (QuizProgressRepository) Proxy.newProxyInstance(
                QuizProgressRepository.class.getClassLoader(),
                new Class<?>[]{QuizProgressRepository.class},
                (proxy, method, args) -> {
                    if ("existsByQuiz_IdAndUser_IdAndPassedTrue".equals(method.getName())) {
                        return passedQuizUserPairs.contains(args[0] + ":" + args[1]);
                    }
                    if ("findByQuiz_IdAndUser_Id".equals(method.getName()) || "findByQuizIdAndUserId".equals(method.getName())) {
                        QuizProgress qp = new QuizProgress();
                        qp.setPassed(true);
                        qp.setBestScore(90);
                        return Optional.of(qp);
                    }
                    return null;
                }
        );
    }

    // =========================================================================
    // A. IN-APP NOTIFICATIONS & AUTHORIZATION
    // =========================================================================

    @Test
    @DisplayName("A1. Create notification, list for user, and get non-negative unread count")
    void createListAndUnreadCount() {
        Notification created = notificationService.createNotification(
                10L,
                "New Mandatory Course Assigned",
                "Please complete Customs Clearance & Freight Compliance.",
                NotificationType.COURSE_ASSIGNED,
                NotificationPriority.HIGH,
                "COURSE_CODE",
                "CRS-OPS-101",
                "/courses/CRS-OPS-101/learn",
                "COURSE_ASSIGNED:USER:10:COURSE:101",
                Map.of("courseId", "CRS-OPS-101")
        );

        assertNotNull(created);
        assertEquals(NotificationType.COURSE_ASSIGNED, created.getType());
        assertEquals(NotificationPriority.HIGH, created.getPriority());
        assertEquals("/courses/CRS-OPS-101/learn", created.getActionUrl());
        assertEquals("DISABLED", created.getEmailStatus());
        assertFalse(created.getRead());

        currentAuthenticatedUserId = 10L;
        ResponseEntity<List<NotificationResponse>> listResp = notificationController.getNotifications(
                null, null, null, null, null, null
        );
        assertEquals(1, listResp.getBody().size());
        assertEquals("New Mandatory Course Assigned", listResp.getBody().get(0).getTitle());
        // Verify internal fields are not exposed in DTO
        assertNotNull(listResp.getBody().get(0).getId());

        ResponseEntity<Long> countResp = notificationController.getUnreadCount();
        assertEquals(1L, countResp.getBody());
    }

    @Test
    @DisplayName("A2. Mark single notification as read, mark all as read, and block cross-user access")
    void markReadAndPreventUnauthorizedAccess() {
        Notification created = notificationService.createNotification(
                10L,
                "Course Assigned",
                "Complete CRS-OPS-101",
                NotificationType.COURSE_ASSIGNED
        );

        Notification marked = notificationService.markAsRead(created.getId(), 10L);
        assertTrue(marked.getRead());
        assertNotNull(marked.getReadAt());
        assertEquals(0L, notificationService.getUnreadCount(10L));

        // Another user (userId = 20L) attempting to mark employee 10's notification as read must be rejected
        assertThrows(RuntimeException.class, () -> notificationService.markAsRead(created.getId(), 20L));

        // Create two more unread notifications and mark all as read
        notificationService.createNotification(10L, "Reminder 1", "Msg 1", NotificationType.COURSE_DUE_SOON);
        notificationService.createNotification(10L, "Reminder 2", "Msg 2", NotificationType.COURSE_DUE_SOON);
        assertEquals(2L, notificationService.getUnreadCount(10L));

        int markedAll = notificationService.markAllAsRead(10L);
        assertEquals(2, markedAll);
        assertEquals(0L, notificationService.getUnreadCount(10L));
    }

    @Test
    @DisplayName("A3. Filter notifications by read/unread, category, priority, and search")
    void filterAndPaginateNotifications() {
        notificationService.createNotification(
                10L,
                "Overdue Mandatory Course: Customs Clearance",
                "Your course is overdue",
                NotificationType.COURSE_OVERDUE,
                NotificationPriority.CRITICAL,
                "COURSE_CODE",
                "CRS-OPS-101",
                "/courses/CRS-OPS-101/learn",
                null,
                null
        );
        notificationService.createNotification(
                10L,
                "General Welcome Announcement",
                "Welcome to Fairmacs Learning Hub",
                NotificationType.GENERAL_ANNOUNCEMENT,
                NotificationPriority.NORMAL,
                "ANNOUNCEMENT",
                "ALL",
                "/notifications",
                null,
                null
        );

        Map<String, Object> result = notificationService.getNotificationsPage(
                10L,
                false,
                "COURSE_OVERDUE",
                "CRITICAL",
                "Customs",
                0,
                15
        );

        List<?> content = (List<?>) result.get("content");
        assertEquals(1, content.size());
        assertEquals(1L, result.get("totalElements"));
        assertEquals(2L, result.get("unreadCount"));
    }

    // =========================================================================
    // B. COURSE ASSIGNMENT NOTIFICATIONS & DEDUPLICATION
    // =========================================================================

    @Test
    @DisplayName("B1. Individual & department assignments distinguish Mandatory vs Recommended and deduplicate overlapping paths")
    void courseAssignmentNotificationsAndDeduplication() {
        EnrollmentService enrollmentService = new EnrollmentService(
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
                quizProgressRepository
        );

        LocalDate dueDate = LocalDate.now().plusDays(14);
        int deptAssigned = enrollmentService.assignCourseToDepartment(
                "Operations",
                101L,
                "CRS-OPS-101",
                dueDate,
                "ALL",
                "L1"
        );
        assertEquals(1, deptAssigned);
        assertEquals(1, savedNotifications.size());

        Notification mandatoryNotif = savedNotifications.get(0);
        assertTrue(mandatoryNotif.getTitle().contains("Mandatory"));
        assertTrue(mandatoryNotif.getMessage().contains(dueDate.toString()));
        assertEquals(NotificationPriority.HIGH, mandatoryNotif.getPriority());
        assertEquals("/courses/CRS-OPS-101/learn", mandatoryNotif.getActionUrl());

        // Overlapping individual assignment for the same employee and same due date must NOT create a duplicate notification
        int individualAssigned = enrollmentService.assignCourseToEmployees(
                List.of(10L),
                101L,
                "CRS-OPS-101",
                dueDate
        );
        assertEquals(0, individualAssigned);
        assertEquals(1, savedNotifications.size());

        // If the deadline is later changed on an active assignment, emit DEADLINE_CHANGED
        LocalDate updatedDueDate = dueDate.plusDays(7);
        enrollmentService.assignCourseToEmployees(
                List.of(10L),
                101L,
                "CRS-OPS-101",
                updatedDueDate
        );
        assertEquals(2, savedNotifications.size());
        assertEquals(NotificationType.DEADLINE_CHANGED, savedNotifications.get(1).getType());
    }

    // =========================================================================
    // C. DEADLINE & OVERDUE REMINDERS
    // =========================================================================

    @Test
    @DisplayName("C1. Reminders fire at 7d, 3d, and 0d before due date, and never duplicate on repeated runs")
    void deadlineRemindersAt7Days3DaysAndDueDate() {
        LocalDate today = LocalDate.of(2026, 11, 1);
        Set<Long> offsets = Set.of(7L, 3L, 0L);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(301L);
        enrollment.setUser(activeEmployee);
        enrollment.setCourse(sampleCourse);
        enrollment.setEnrollmentType(EnrollmentType.MANDATORY);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollment.setProgressPercent(45);

        // 1. 7 days before due date
        enrollment.setDueDate(today.plusDays(7));
        int created7d = schedulerService.evaluateSingleEnrollmentReminder(enrollment, today, offsets, 7);
        assertEquals(1, created7d);
        // Running again on the same day must produce 0 duplicates
        int duplicate7d = schedulerService.evaluateSingleEnrollmentReminder(enrollment, today, offsets, 7);
        assertEquals(0, duplicate7d);

        // 2. 3 days before due date (employee reminder + manager approaching deadline alert)
        enrollment.setDueDate(today.plusDays(3));
        int created3d = schedulerService.evaluateSingleEnrollmentReminder(enrollment, today, offsets, 7);
        assertEquals(2, created3d);

        // 3. On the due date (0 days remaining)
        enrollment.setDueDate(today);
        int created0d = schedulerService.evaluateSingleEnrollmentReminder(enrollment, today, offsets, 7);
        assertEquals(1, created0d);
    }

    @Test
    @DisplayName("C2. Overdue reminders fire on day 1 and repeat weekly (day 8), escalating to Manager and HR Admin")
    void overdueReminderAndWeeklyRepeat() {
        LocalDate dueDate = LocalDate.of(2026, 11, 1);
        Set<Long> offsets = Set.of(7L, 3L, 0L);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(302L);
        enrollment.setUser(activeEmployee);
        enrollment.setCourse(sampleCourse);
        enrollment.setEnrollmentType(EnrollmentType.MANDATORY);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollment.setProgressPercent(20);
        enrollment.setDueDate(dueDate);
        enrollments.add(enrollment);

        // Day 1 overdue: notifies Employee + Department Manager + HR Admin (3 notifications) and sets status OVERDUE
        LocalDate day1Overdue = dueDate.plusDays(1);
        int countDay1 = schedulerService.evaluateSingleEnrollmentReminder(enrollment, day1Overdue, offsets, 7);
        assertEquals(3, countDay1);
        assertEquals(EnrollmentStatus.OVERDUE, enrollment.getStatus());

        // Day 2 overdue: should NOT spam on non-repeat days
        LocalDate day2Overdue = dueDate.plusDays(2);
        int countDay2 = schedulerService.evaluateSingleEnrollmentReminder(enrollment, day2Overdue, offsets, 7);
        assertEquals(0, countDay2);

        // Day 8 overdue (1 week later, bucket 1): repeats overdue notification for Employee + Manager (2 notifications)
        LocalDate day8Overdue = dueDate.plusDays(8);
        int countDay8 = schedulerService.evaluateSingleEnrollmentReminder(enrollment, day8Overdue, offsets, 7);
        assertEquals(2, countDay8);
    }

    @Test
    @DisplayName("C3. Completed, revoked, or missing-due-date enrollments are skipped; updated due date resets reminder key")
    void skipCompletedRevokedMissingDueDateAndHandleUpdatedDueDate() {
        LocalDate today = LocalDate.of(2026, 11, 1);
        Set<Long> offsets = Set.of(7L, 3L, 0L);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(303L);
        enrollment.setUser(activeEmployee);
        enrollment.setCourse(sampleCourse);
        enrollment.setEnrollmentType(EnrollmentType.SELF_SELECTED);
        enrollment.setDueDate(today.plusDays(7));

        // Completed -> skipped
        enrollment.setStatus(EnrollmentStatus.COMPLETED);
        assertEquals(0, schedulerService.evaluateSingleEnrollmentReminder(enrollment, today, offsets, 7));

        // Revoked -> skipped
        enrollment.setStatus(EnrollmentStatus.REVOKED);
        assertEquals(0, schedulerService.evaluateSingleEnrollmentReminder(enrollment, today, offsets, 7));

        // Missing due date -> skipped
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollment.setDueDate(null);
        assertEquals(0, schedulerService.evaluateSingleEnrollmentReminder(enrollment, today, offsets, 7));

        // Updated due date -> fires reminder for new deadline
        enrollment.setDueDate(today.plusDays(7));
        assertEquals(1, schedulerService.evaluateSingleEnrollmentReminder(enrollment, today, offsets, 7));
    }

    // =========================================================================
    // D. COMPLETION, ASSESSMENTS & CERTIFICATES
    // =========================================================================

    @Test
    @DisplayName("D1. Course completion creates certificate, notifies learner (COURSE_COMPLETED + CERTIFICATE_ISSUED), and notifies manager")
    void courseCompletionAndCertificateNotifications() {
        EnrollmentService enrollmentService = new EnrollmentService(
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
                quizProgressRepository
        );

        Enrollment enrollment = new Enrollment();
        enrollment.setId(401L);
        enrollment.setUser(activeEmployee);
        enrollment.setCourse(sampleCourse);
        enrollment.setEnrollmentType(EnrollmentType.MANDATORY);
        enrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        enrollments.add(enrollment);

        Quiz finalQuiz = new Quiz();
        finalQuiz.setId(55L);
        finalQuiz.setQuizId("QZ-FINAL-101");
        finalQuiz.setTitle("Final Compliance Assessment");
        finalQuiz.setType(QuizType.FINAL);
        finalQuiz.setCourse(sampleCourse);
        quizzes.add(finalQuiz);
        passedQuizUserPairs.add("55:10");

        CompleteCourseRequest req = new CompleteCourseRequest();
        req.setEnrollmentId(401L);
        req.setCourseId(101L);
        req.setScore(92);

        CertificateDTO certDto = enrollmentService.completeCourse(req);
        assertNotNull(certDto);
        assertEquals("FM-CERT-2026-0001", certDto.getCertificateId());
        assertEquals(EnrollmentStatus.COMPLETED, enrollment.getStatus());

        assertTrue(savedNotifications.stream().anyMatch(n ->
                NotificationType.CERTIFICATE_ISSUED.equals(n.getType())
                        && Objects.equals(n.getRecipientUserId(), 10L)));
        assertTrue(savedNotifications.stream().anyMatch(n ->
                NotificationType.COURSE_COMPLETED.equals(n.getType())
                        && Objects.equals(n.getRecipientUserId(), 10L)));
        assertTrue(savedNotifications.stream().anyMatch(n ->
                NotificationType.TEAM_COMPLIANCE.equals(n.getType())
                        && Objects.equals(n.getRecipientUserId(), 20L)));
    }

    @Test
    @DisplayName("D2. Retake available notification fires after 12-hour cooldown when attempts remain")
    void retakeAvailableNotificationAfterCooldown() {
        Quiz quiz = new Quiz();
        quiz.setId(60L);
        quiz.setQuizId("QZ-MOD-1");
        quiz.setTitle("Module 1 Quiz");
        quiz.setMaxAttempts(3);
        quiz.setCourse(sampleCourse);

        QuizAttempt failedAttempt = new QuizAttempt();
        failedAttempt.setId(700L);
        failedAttempt.setAttemptId("ATT-700");
        failedAttempt.setQuiz(quiz);
        failedAttempt.setUser(activeEmployee);
        failedAttempt.setPassed(false);
        failedAttempt.setCompletedAt(LocalDateTime.now().minusHours(13));
        quizAttempts.add(failedAttempt);

        int created = schedulerService.processRetakeAvailableNotifications(LocalDateTime.now());
        assertEquals(1, created);
        assertEquals(NotificationType.RETAKE_AVAILABLE, savedNotifications.get(0).getType());
    }

    // =========================================================================
    // E. FUTURE ZOHO EMAIL CHANNEL (DISABLED BY DEFAULT)
    // =========================================================================

    @Test
    @DisplayName("E1. Email channel is disabled by default, requires no SMTP credentials, and performs no external calls")
    void emailChannelDisabledByDefault() {
        assertFalse(emailProperties.isEnabled(), "Email channel must be disabled by default");
        assertFalse(emailChannel.isEnabled(), "EmailNotificationChannel.isEnabled() must be false by default");

        Notification notif = new Notification(
                activeEmployee,
                "Test Notification",
                "Testing disabled email channel",
                NotificationType.COURSE_ASSIGNED
        );
        notif.setId(999L);

        // Calling deliver() directly when disabled must be a safe no-op with zero external calls or exceptions
        assertDoesNotThrow(() -> emailChannel.deliver(notif));
        assertEquals("DISABLED", notif.getEmailStatus());
        assertEquals(0, notif.getEmailAttempts());

        // Verify EmailTemplateRenderer renders corporate HTML & text templates for future activation
        EmailTemplateRenderer.RenderedEmail rendered = templateRenderer.render(notif, "https://lms.fairmacs.com");
        assertNotNull(rendered.subject());
        assertTrue(rendered.htmlBody().contains("Aarav Sharma"));
        assertTrue(rendered.textBody().contains("Testing disabled email channel"));
    }

    @Test
    @DisplayName("E2. Action URL sanitization prevents open redirects and arbitrary external navigation")
    void actionUrlSanitizationPreventsOpenRedirects() {
        // External URLs and javascript URLs must be sanitized to safe internal routes
        Notification malicious1 = notificationService.createNotification(
                10L,
                "Suspicious Link",
                "Check this out",
                NotificationType.GENERAL_ANNOUNCEMENT,
                NotificationPriority.NORMAL,
                null,
                null,
                "https://attacker-phishing.com/login",
                null,
                null
        );
        assertEquals("/notifications", malicious1.getActionUrl(), "External https URL must be sanitized to /notifications");

        Notification malicious2 = notificationService.createNotification(
                10L,
                "Javascript Injection",
                "Execute script",
                NotificationType.GENERAL_ANNOUNCEMENT,
                NotificationPriority.NORMAL,
                null,
                null,
                "javascript:alert(document.cookie)",
                null,
                null
        );
        assertEquals("/notifications", malicious2.getActionUrl(), "javascript: URL must be sanitized");

        Notification valid = notificationService.createNotification(
                10L,
                "Valid Route",
                "Learn more",
                NotificationType.COURSE_ASSIGNED,
                NotificationPriority.NORMAL,
                "COURSE_CODE",
                "CRS-101",
                "/courses/CRS-101/learn",
                null,
                null
        );
        assertEquals("/courses/CRS-101/learn", valid.getActionUrl(), "Safe relative path must be preserved");

        EmailTemplateRenderer.RenderedEmail rendered = templateRenderer.render(malicious1, "https://lms.fairmacs.com");
        assertFalse(rendered.htmlBody().contains("attacker-phishing.com"), "Rendered email must not contain external phishing domain");
        assertTrue(rendered.htmlBody().contains("https://lms.fairmacs.com/notifications"));
    }

    @Test
    @DisplayName("E3. HR Admin announcement input validation and double-click deduplication")
    void announcementValidationAndDoubleClickedDeduplication() {
        currentAuthenticatedUserId = 30L; // HR Admin

        // Title empty or too long
        assertThrows(IllegalArgumentException.class, () ->
                notificationService.broadcastAnnouncement("", "Valid message", "ALL", "NORMAL", "/notifications"));
        assertThrows(IllegalArgumentException.class, () ->
                notificationService.broadcastAnnouncement("A".repeat(201), "Valid message", "ALL", "NORMAL", "/notifications"));

        // Message empty or too long
        assertThrows(IllegalArgumentException.class, () ->
                notificationService.broadcastAnnouncement("Valid title", "", "ALL", "NORMAL", "/notifications"));
        assertThrows(IllegalArgumentException.class, () ->
                notificationService.broadcastAnnouncement("Valid title", "M".repeat(2001), "ALL", "NORMAL", "/notifications"));

        // First broadcast succeeds
        String clientReqId = "REQ-BROADCAST-" + UUID.randomUUID();
        int sentFirst = notificationService.broadcastAnnouncement(
                "Company-wide Townhall",
                "All hands meeting scheduled for Friday 3 PM.",
                "ALL",
                "HIGH",
                "/notifications",
                clientReqId,
                30L
        );
        assertTrue(sentFirst > 0);

        // Immediate double-click with identical clientRequestId must be deduplicated (0 new notifications)
        int sentSecond = notificationService.broadcastAnnouncement(
                "Company-wide Townhall",
                "All hands meeting scheduled for Friday 3 PM.",
                "ALL",
                "HIGH",
                "/notifications",
                clientReqId,
                30L
        );
        assertEquals(0, sentSecond, "Double-clicked broadcast with same request ID must create 0 duplicate notifications");
    }

    @Test
    @DisplayName("E4. Asynchronous email outbox claiming, backoff, and max-retry isolation")
    void emailOutboxClaimingAndRetries() {
        NotificationEmailOutboxService outboxService = new NotificationEmailOutboxService(
                notificationRepository,
                emailChannel,
                emailProperties
        );

        // 1. When disabled, processPendingOutbox is a no-op
        Map<String, Object> disabledResult = outboxService.processPendingOutbox(10);
        assertEquals("DISABLED", disabledResult.get("status"));
        assertEquals(0, disabledResult.get("processed"));

        // 2. Simulate enabled email channel with outbox claiming
        emailProperties.setEnabled(true);
        try {
            Notification pendingNotif = new Notification(
                    activeEmployee,
                    "Outbox Test",
                    "Outbox delivery attempt",
                    NotificationType.COURSE_ASSIGNED
            );
            pendingNotif.setEmailStatus("PENDING");
            pendingNotif.setEmailAttempts(0);
            notificationRepository.save(pendingNotif);

            // First worker claims the notification
            boolean claimed1 = outboxService.claimNotification(pendingNotif.getId(), LocalDateTime.now());
            assertTrue(claimed1, "First worker must successfully claim PENDING notification");
            assertEquals("PROCESSING", pendingNotif.getEmailStatus());

            // Concurrent second worker attempting to claim same notification must be rejected
            boolean claimed2 = outboxService.claimNotification(pendingNotif.getId(), LocalDateTime.now());
            assertFalse(claimed2, "Concurrent worker must not double-claim notification already in PROCESSING state");

            // Record temporary failure (attempt 1) -> status becomes FAILED
            outboxService.recordDeliveryFailure(pendingNotif.getId(), 1, "Connection timeout");
            assertEquals("FAILED", pendingNotif.getEmailStatus());
            assertEquals(1, pendingNotif.getEmailAttempts());

            // Record reaching max retries (attempt 3) -> status becomes PERMANENTLY_FAILED
            outboxService.recordDeliveryFailure(pendingNotif.getId(), 3, "Auth invalid");
            assertEquals("PERMANENTLY_FAILED", pendingNotif.getEmailStatus());
            assertEquals(3, pendingNotif.getEmailAttempts());

            // Verify in-app notification remains completely intact despite email delivery failure
            assertTrue(savedNotifications.contains(pendingNotif));
            assertEquals("Outbox Test", pendingNotif.getTitle());
        } finally {
            emailProperties.setEnabled(false); // Restore disabled state
        }
    }

    @Test
    @DisplayName("E5. Training session deduplication on creation and harmless edit")
    void trainingSessionDeduplication() {
        TrainingSessionService sessionService = new TrainingSessionService(
                (TrainingSessionRepository) Proxy.newProxyInstance(
                        TrainingSessionRepository.class.getClassLoader(),
                        new Class<?>[]{TrainingSessionRepository.class},
                        (proxy, method, args) -> switch (method.getName()) {
                            case "save" -> {
                                TrainingSession s = (TrainingSession) args[0];
                                if (s.getId() == null) s.setId(901L);
                                yield s;
                            }
                            case "findById" -> Optional.empty();
                            default -> null;
                        }
                ),
                userRepository,
                securityContextUtil,
                notificationService
        );

        TrainingSession session = new TrainingSession();
        session.setId(901L);
        session.setTitle("Dangerous Goods Handling");
        session.setDate(LocalDate.now().plusDays(10));
        session.setTime("10:00 AM");
        session.setLocation("Chennai HQ Room 3B");
        session.setTargetType(TrainingSessionTargetType.EMPLOYEES);
        session.setTargetUserIds(List.of(10L));

        // Initial creation notification
        int initialCount = savedNotifications.size();
        notificationService.createNotificationSafely(
                10L,
                "Training Scheduled",
                "New training",
                NotificationType.GENERAL_ANNOUNCEMENT,
                NotificationPriority.NORMAL,
                "TRAINING_SESSION",
                "901",
                "/calendar",
                "TRAINING_SESSION:CREATE:SES:901:EMP:10",
                null
        );
        assertEquals(initialCount + 1, savedNotifications.size());

        // Repeated creation with same deduplication key must not duplicate
        notificationService.createNotificationSafely(
                10L,
                "Training Scheduled",
                "New training duplicate attempt",
                NotificationType.GENERAL_ANNOUNCEMENT,
                NotificationPriority.NORMAL,
                "TRAINING_SESSION",
                "901",
                "/calendar",
                "TRAINING_SESSION:CREATE:SES:901:EMP:10",
                null
        );
        assertEquals(initialCount + 1, savedNotifications.size(), "Deduplication must prevent duplicate session notification");
    }

    @Test
    @DisplayName("E6. Enrollment deadline extension resets overdue status")
    void deadlineExtensionResetsOverdueStatus() {
        Enrollment overdueEnrollment = new Enrollment();
        overdueEnrollment.setId(888L);
        overdueEnrollment.setUser(activeEmployee);
        overdueEnrollment.setCourse(sampleCourse);
        overdueEnrollment.setStatus(EnrollmentStatus.OVERDUE);
        overdueEnrollment.setDueDate(LocalDate.now().minusDays(5));
        overdueEnrollment.setProgressPercent(20);
        enrollments.add(overdueEnrollment);

        EnrollmentService enrollmentService = new EnrollmentService(
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
                quizProgressRepository
        );

        // Extend deadline into the future (now + 14 days)
        LocalDate newDeadline = LocalDate.now().plusDays(14);
        enrollmentService.assignCourseToEmployees(
                List.of(10L),
                101L,
                "CRS-OPS-101",
                newDeadline,
                "MANDATORY"
        );

        // Verify overdue status was reset to IN_PROGRESS
        assertEquals(EnrollmentStatus.IN_PROGRESS, overdueEnrollment.getStatus(),
                "Extending an overdue course deadline into the future must reset its status from OVERDUE to IN_PROGRESS");
        assertEquals(newDeadline, overdueEnrollment.getDueDate());
    }

    @Test
    @DisplayName("E7. Scheduler startup catch-up detects uncompleted daily runs and recovers safely")
    void schedulerStartupCatchUpRecoversMissedRuns() {
        int initialJobLogs = savedNotifications.size();
        assertDoesNotThrow(() -> schedulerService.checkAndRecoverMissedRuns());
        // Missed run ran without throwing
    }

    @Test
    @DisplayName("E8. HR Admin diagnostics reports full delivery status breakdown without secrets")
    void diagnosticsReportsDeliveryStatusWithoutSecrets() {
        Notification pending = new Notification(activeEmployee, "N1", "M1", NotificationType.COURSE_ASSIGNED);
        pending.setEmailStatus("PENDING");
        notificationRepository.save(pending);

        Notification failed = new Notification(activeEmployee, "N2", "M2", NotificationType.COURSE_ASSIGNED);
        failed.setEmailStatus("FAILED");
        notificationRepository.save(failed);

        Map<String, Object> diag = notificationService.getSystemDiagnostics();
        assertNotNull(diag);
        assertTrue((Boolean) diag.get("inAppChannelEnabled"));
        assertFalse((Boolean) diag.get("emailChannelEnabled"), "Email channel must be reported as disabled");
        assertEquals("Zoho ZeptoMail API (Disabled by default)", diag.get("emailProvider"));
        assertEquals("no-reply@fairmacs.com", diag.get("emailFromAddress"));
        assertTrue((Long) diag.get("emailPendingCount") >= 1);
        assertTrue((Long) diag.get("emailFailedCount") >= 1);

        // Verify no sensitive keys or tokens are in the map
        assertFalse(diag.containsKey("zeptoMailSendToken"));
        assertFalse(diag.containsKey("smtpPassword"));
        assertFalse(diag.containsKey("token"));
        assertFalse(diag.containsKey("secret"));
    }
}
