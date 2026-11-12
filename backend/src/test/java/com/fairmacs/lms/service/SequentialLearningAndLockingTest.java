package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.LessonProgressDTO;
import com.fairmacs.lms.entity.*;
import com.fairmacs.lms.entity.Module;
import com.fairmacs.lms.exception.ResourceNotFoundException;
import com.fairmacs.lms.integration.zoho.ZohoWorkDriveDownloadService;
import com.fairmacs.lms.repository.*;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("Phase 5: Sequential Learning, Lesson Locking & Progress Consistency Test Suite")
class SequentialLearningAndLockingTest {

    private LessonProgressRepository lessonProgressRepository;
    private EnrollmentRepository enrollmentRepository;
    private LessonRepository lessonRepository;
    private ModuleRepository moduleRepository;
    private QuizRepository quizRepository;
    private QuizProgressRepository quizProgressRepository;
    private QuizAttemptRepository quizAttemptRepository;
    private UserRepository userRepository;
    private TestSecurityContextUtil securityContextUtil;
    private TestNotificationService notificationService;
    private ZohoWorkDriveDownloadService downloadService;

    private static class TestNotificationService extends NotificationService {
        public TestNotificationService() {
            super(null, null);
        }
        @Override
        public Notification createNotificationSafely(
                Long userId,
                String title,
                String message,
                String type,
                String priority,
                String relatedEntityType,
                String relatedEntityId,
                String actionUrl,
                String deduplicationKey,
                Map<String, Object> metadata) {
            return null;
        }
    }

    private static class TestSecurityContextUtil extends SecurityContextUtil {
        private User currentUser;
        public TestSecurityContextUtil() { super(null); }
        public void setCurrentUser(User user) { this.currentUser = user; }
        @Override
        public User getCurrentUser() { return currentUser; }
        @Override
        public Long getCurrentUserId() { return currentUser != null ? currentUser.getId() : null; }
        @Override
        public String getCurrentUserRole() { return currentUser != null && currentUser.getRole() != null ? currentUser.getRole().name() : null; }
    }

    private LessonProgressService lessonProgressService;
    private LessonDocumentAccessService lessonDocumentAccessService;
    private QuizService quizService;

    private User employee;
    private User otherEmployee;
    private Course testCourse;
    private Module module1;
    private Module module2;
    private Lesson lesson1;
    private Lesson lesson2;
    private Lesson lesson3;
    private Quiz module1Quiz;
    private Quiz finalQuiz;
    private Enrollment activeEnrollment;

    // In-memory progress store for test simulation
    private final Map<String, LessonProgress> progressStore = new HashMap<>();

    @BeforeEach
    void setUp() {
        lessonProgressRepository = mock(LessonProgressRepository.class);
        enrollmentRepository = mock(EnrollmentRepository.class);
        lessonRepository = mock(LessonRepository.class);
        moduleRepository = mock(ModuleRepository.class);
        quizRepository = mock(QuizRepository.class);
        quizProgressRepository = mock(QuizProgressRepository.class);
        quizAttemptRepository = mock(QuizAttemptRepository.class);
        userRepository = mock(UserRepository.class);
        securityContextUtil = new TestSecurityContextUtil();
                notificationService = new TestNotificationService();
        downloadService = new ZohoWorkDriveDownloadService(null) {
            @Override
            public DownloadedDocument download(String fileId) {
                return new DownloadedDocument("sample-content".getBytes(java.nio.charset.StandardCharsets.UTF_8), "guide.pdf", MediaType.APPLICATION_PDF);
            }
        };

        progressStore.clear();

        // 1. Setup Users
        employee = new User();
        employee.setId(10L);
        employee.setEmployeeId("EMP010");
        employee.setName("Test Learner");
        employee.setRole(Role.EMPLOYEE);
        employee.setStatus(UserStatus.ACTIVE);
        securityContextUtil.setCurrentUser(employee);

        otherEmployee = new User();
        otherEmployee.setId(20L);
        otherEmployee.setEmployeeId("EMP020");
        otherEmployee.setRole(Role.EMPLOYEE);
        otherEmployee.setStatus(UserStatus.ACTIVE);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));

        // 2. Setup Course
        testCourse = new Course();
        testCourse.setId(100L);
        testCourse.setCourseId("CRS-100");
        testCourse.setTitle("Sequential Operations");
        testCourse.setActive(true);
        testCourse.setDraft(false);
        testCourse.setFoundation(false);

        // 3. Setup Modules
        module1 = new Module();
        module1.setId(1L);
        module1.setCourse(testCourse);
        module1.setTitle("Module 1");
        module1.setOrderIndex(1);

        module2 = new Module();
        module2.setId(2L);
        module2.setCourse(testCourse);
        module2.setTitle("Module 2");
        module2.setOrderIndex(2);

        // 4. Setup Lessons
        lesson1 = new Lesson();
        lesson1.setId(101L);
        lesson1.setLessonId("LES-101");
        lesson1.setTitle("Introduction");
        lesson1.setModule(module1);
        lesson1.setOrderIndex(1);
        lesson1.setWorkdriveFileId("WD_FILE_101");

        lesson2 = new Lesson();
        lesson2.setId(102L);
        lesson2.setLessonId("LES-102");
        lesson2.setTitle("Deep Dive");
        lesson2.setModule(module1);
        lesson2.setOrderIndex(2);
        lesson2.setWorkdriveFileId("WD_FILE_102");

        lesson3 = new Lesson();
        lesson3.setId(201L);
        lesson3.setLessonId("LES-201");
        lesson3.setTitle("Advanced Practice");
        lesson3.setModule(module2);
        lesson3.setOrderIndex(1);
        lesson3.setWorkdriveFileId("WD_FILE_201");

        module1.setLessons(List.of(lesson1, lesson2));
        module2.setLessons(List.of(lesson3));
        testCourse.setModules(List.of(module1, module2));

        // 5. Setup Quizzes
        module1Quiz = new Quiz();
        module1Quiz.setId(501L);
        module1Quiz.setQuizId("QZ-MOD-1");
        module1Quiz.setTitle("Module 1 Quiz");
        module1Quiz.setType(QuizType.MODULE);
        module1Quiz.setCourse(testCourse);
        module1Quiz.setModule(module1);
        module1Quiz.setActive(true);
        module1Quiz.setPassingScore(70);

        finalQuiz = new Quiz();
        finalQuiz.setId(502L);
        finalQuiz.setQuizId("QZ-FINAL");
        finalQuiz.setTitle("Final Assessment");
        finalQuiz.setType(QuizType.FINAL);
        finalQuiz.setCourse(testCourse);
        finalQuiz.setActive(true);
        finalQuiz.setPassingScore(80);

        // 6. Setup Enrollment
        activeEnrollment = new Enrollment();
        activeEnrollment.setId(1001L);
        activeEnrollment.setUser(employee);
        activeEnrollment.setCourse(testCourse);
        activeEnrollment.setStatus(EnrollmentStatus.IN_PROGRESS);
        activeEnrollment.setProgressPercent(0);

        // Wire mock repository behavior
        when(enrollmentRepository.findByIdWithUserAndCourse(1001L)).thenReturn(Optional.of(activeEnrollment));
        when(enrollmentRepository.findById(1001L)).thenReturn(Optional.of(activeEnrollment));
        when(enrollmentRepository.findByUserIdAndCourseId(10L, 100L)).thenReturn(Optional.of(activeEnrollment));

        when(lessonRepository.findById(101L)).thenReturn(Optional.of(lesson1));
        when(lessonRepository.findById(102L)).thenReturn(Optional.of(lesson2));
        when(lessonRepository.findById(201L)).thenReturn(Optional.of(lesson3));
        when(lessonRepository.findByLessonId("LES-101")).thenReturn(Optional.of(lesson1));
        when(lessonRepository.findByLessonId("LES-102")).thenReturn(Optional.of(lesson2));
        when(lessonRepository.findByLessonId("LES-201")).thenReturn(Optional.of(lesson3));

        when(moduleRepository.findByCourseIdOrderByOrderIndexAsc(100L)).thenReturn(List.of(module1, module2));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(1L)).thenReturn(List.of(lesson1, lesson2));
        when(lessonRepository.findByModuleIdOrderByOrderIndexAsc(2L)).thenReturn(List.of(lesson3));
        when(lessonRepository.countByModuleCourseId(100L)).thenReturn(3L);

        when(quizRepository.findById(501L)).thenReturn(Optional.of(module1Quiz));
        when(quizRepository.findById(502L)).thenReturn(Optional.of(finalQuiz));
        when(quizRepository.findByCourseIdAndType(100L, QuizType.MODULE)).thenReturn(List.of(module1Quiz));
        when(quizRepository.findByModuleId(1L)).thenReturn(Optional.of(module1Quiz));
        when(quizRepository.findTopByModuleIdOrderByIdDesc(1L)).thenReturn(Optional.of(module1Quiz));

        // Connect progress store to mocks
        when(lessonProgressRepository.findByEnrollmentIdAndLessonId(anyLong(), anyLong()))
                .thenAnswer(inv -> {
                    Long enrId = inv.getArgument(0);
                    Long lesId = inv.getArgument(1);
                    return Optional.ofNullable(progressStore.get(enrId + "_" + lesId));
                });

        when(lessonProgressRepository.save(any(LessonProgress.class)))
                .thenAnswer(inv -> {
                    LessonProgress lp = inv.getArgument(0);
                    if (lp.getId() == null) lp.setId((long) (progressStore.size() + 1));
                    progressStore.put(lp.getEnrollment().getId() + "_" + lp.getLesson().getId(), lp);
                    return lp;
                });

        when(lessonProgressRepository.findByEnrollmentId(anyLong()))
                .thenAnswer(inv -> new ArrayList<>(progressStore.values()));

        when(lessonProgressRepository.areAllLessonsCompleted(anyLong(), eq(1L)))
                .thenAnswer(inv -> {
                    LessonProgress p1 = progressStore.get("1001_101");
                    LessonProgress p2 = progressStore.get("1001_102");
                    return p1 != null && Boolean.TRUE.equals(p1.getCompleted())
                            && p2 != null && Boolean.TRUE.equals(p2.getCompleted());
                });

        when(lessonProgressRepository.areAllLessonsCompleted(anyLong(), eq(2L)))
                .thenAnswer(inv -> {
                    LessonProgress p3 = progressStore.get("1001_201");
                    return p3 != null && Boolean.TRUE.equals(p3.getCompleted());
                });

        // Initialize Services
        lessonProgressService = new LessonProgressService(
                lessonProgressRepository,
                enrollmentRepository,
                lessonRepository,
                securityContextUtil,
                quizRepository,
                quizProgressRepository,
                notificationService,
                moduleRepository
        );

        lessonDocumentAccessService = new LessonDocumentAccessService(
                lessonRepository,
                enrollmentRepository,
                securityContextUtil,
                downloadService,
                lessonProgressService
        );

        quizService = new QuizService(
                quizRepository,
                mock(QuizQuestionRepository.class),
                quizAttemptRepository,
                quizProgressRepository,
                userRepository,
                enrollmentRepository,
                lessonProgressRepository,
                moduleRepository,
                null,
                null,
                securityContextUtil
        );
    }

    // =========================================================================
    // 1. SEQUENTIAL LESSON UNLOCKING TESTS
    // =========================================================================

    @Test
    @DisplayName("1. First lesson of course is always unlocked and accessible")
    void testFirstLesson_AlwaysAccessible() {
        assertTrue(lessonProgressService.isLessonUnlocked(activeEnrollment.getId(), lesson1.getId()));

        LessonProgressDTO result = lessonProgressService.updateProgress(
                activeEnrollment.getId(), lesson1.getId(), 50, 60, 60
        );

        assertNotNull(result);
        assertEquals(50, result.getCompletionPercent());
        assertFalse(result.getCompleted());
    }

    @Test
    @DisplayName("2. Second lesson remains locked before first lesson completion")
    void testSecondLesson_LockedBeforeFirstCompleted() {
        assertFalse(lessonProgressService.isLessonUnlocked(activeEnrollment.getId(), lesson2.getId()));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                lessonProgressService.updateProgress(activeEnrollment.getId(), lesson2.getId(), 100, 100, 100)
        );

        assertTrue(ex.getMessage().contains("Lesson is locked"));
        assertTrue(ex.getMessage().contains("Introduction"));
    }

    @Test
    @DisplayName("3. Second lesson unlocks after first lesson completion")
    void testSecondLesson_UnlocksAfterFirstCompleted() {
        // Complete Lesson 1
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 100, 120, 120);

        // Lesson 2 must now be unlocked
        assertTrue(lessonProgressService.isLessonUnlocked(activeEnrollment.getId(), lesson2.getId()));

        // Complete Lesson 2
        LessonProgressDTO result = lessonProgressService.updateProgress(
                activeEnrollment.getId(), lesson2.getId(), 100, 150, 150
        );

        assertNotNull(result);
        assertTrue(result.getCompleted());
    }

    @Test
    @DisplayName("4. Completed lesson remains accessible for review and position updates")
    void testCompletedLesson_RemainsAccessible() {
        // Complete Lesson 1
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 100, 120, 120);

        // Review Lesson 1: update watched position
        LessonProgressDTO reviewResult = lessonProgressService.updateProgress(
                activeEnrollment.getId(), lesson1.getId(), 100, 30, 30
        );

        assertNotNull(reviewResult);
        assertTrue(reviewResult.getCompleted());
        assertEquals(30, reviewResult.getLastPositionSeconds());
    }

    // =========================================================================
    // 2. SECURITY & AUTHORIZATION TESTS
    // =========================================================================

    @Test
    @DisplayName("5. Unauthorized user cannot update another employee's progress")
    void testUnauthorizedUser_CannotUpdateProgress() {
        securityContextUtil.setCurrentUser(otherEmployee);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 100, 10, 10)
        );

        assertTrue(ex.getMessage().contains("not authorized to update this lesson progress"));
    }

    @Test
    @DisplayName("6. Revoked enrollment rejects progress updates")
    void testRevokedEnrollment_RejectsProgress() {
        activeEnrollment.setStatus(EnrollmentStatus.REVOKED);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 50, 10, 10)
        );

        assertTrue(ex.getMessage().contains("revoked"));
    }

    @Test
    @DisplayName("7. Inactive employee account rejects progress updates")
    void testInactiveAccount_RejectsProgress() {
        employee.setStatus(UserStatus.INACTIVE);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 50, 10, 10)
        );

        assertTrue(ex.getMessage().contains("not active"));
    }

    // =========================================================================
    // 3. MODULE QUIZ & INTER-MODULE PREREQUISITES
    // =========================================================================

    @Test
    @DisplayName("8. Module quiz is locked when lessons in the module are incomplete")
    void testModuleQuiz_LockedWhenLessonsIncomplete() {
        // Only lesson 1 is complete; lesson 2 is not
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 100, 10, 10);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                quizService.startQuiz(module1Quiz.getId())
        );

        assertTrue(ex.getMessage().contains("Complete all lessons in this module before attempting the quiz"));
    }

    @Test
    @DisplayName("9. Module quiz unlocks when all lessons in the module are complete")
    void testModuleQuiz_UnlocksWhenLessonsComplete() {
        // Complete both lessons in Module 1
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 100, 10, 10);
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson2.getId(), 100, 20, 20);

        Map<String, Object> unlockStatus = quizService.getQuizUnlockStatus(module1Quiz.getId());
        assertNotNull(unlockStatus);
        assertTrue(Boolean.TRUE.equals(unlockStatus.get("unlocked")));
        assertTrue(Boolean.TRUE.equals(unlockStatus.get("allLessonsCompleted")));
    }

    @Test
    @DisplayName("10. Module 2 lessons remain locked if Module 1 quiz is not passed")
    void testModule2Lesson1_LockedIfModule1QuizNotPassed() {
        // Complete Module 1 lessons
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 100, 10, 10);
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson2.getId(), 100, 20, 20);

        // Module 1 quiz has not been passed
        when(quizProgressRepository.existsByQuiz_IdAndUser_IdAndPassedTrue(module1Quiz.getId(), employee.getId()))
                .thenReturn(false);

        // Lesson 3 in Module 2 must be locked
        assertFalse(lessonProgressService.isLessonUnlocked(activeEnrollment.getId(), lesson3.getId()));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                lessonProgressService.updateProgress(activeEnrollment.getId(), lesson3.getId(), 100, 10, 10)
        );

        assertTrue(ex.getMessage().contains("pass the module quiz for \"Module 1\""));
    }

    @Test
    @DisplayName("11. Module 2 lessons unlock after passing Module 1 quiz")
    void testModule2Lesson1_UnlocksAfterPassingModule1Quiz() {
        // Complete Module 1 lessons
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 100, 10, 10);
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson2.getId(), 100, 20, 20);

        // Module 1 quiz passed!
        when(quizProgressRepository.existsByQuiz_IdAndUser_IdAndPassedTrue(module1Quiz.getId(), employee.getId()))
                .thenReturn(true);

        // Lesson 3 in Module 2 is now unlocked!
        assertTrue(lessonProgressService.isLessonUnlocked(activeEnrollment.getId(), lesson3.getId()));

        LessonProgressDTO result = lessonProgressService.updateProgress(
                activeEnrollment.getId(), lesson3.getId(), 100, 50, 50
        );
        assertNotNull(result);
        assertTrue(result.getCompleted());
    }

    // =========================================================================
    // 4. FINAL ASSESSMENT PREREQUISITES & ZERO-MODULE-QUIZ COURSES
    // =========================================================================

    @Test
    @DisplayName("12. Final assessment remains locked if lessons across course are incomplete")
    void testFinalQuiz_LockedWhenLessonsIncomplete() {
        // Complete Module 1, but Module 2 lesson 3 is incomplete
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 100, 10, 10);
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson2.getId(), 100, 20, 20);
        when(quizProgressRepository.existsByQuiz_IdAndUser_IdAndPassedTrue(module1Quiz.getId(), employee.getId()))
                .thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                quizService.startQuiz(finalQuiz.getId())
        );

        assertTrue(ex.getMessage().contains("Complete all lessons across all modules before attempting the final assessment"));
    }

    @Test
    @DisplayName("13. Final assessment unlocks with zero module quizzes once all lessons complete")
    void testFinalQuiz_UnlocksWithZeroModuleQuizzes() {
        // Course without module quizzes
        when(quizRepository.findByCourseIdAndType(100L, QuizType.MODULE)).thenReturn(Collections.emptyList());
        when(quizRepository.findTopByModuleIdOrderByIdDesc(1L)).thenReturn(Optional.empty());
        when(quizRepository.findByModuleId(1L)).thenReturn(Optional.empty());

        // Complete all 3 lessons
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 100, 10, 10);
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson2.getId(), 100, 20, 20);
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson3.getId(), 100, 30, 30);

        Map<String, Object> status = quizService.getQuizUnlockStatus(finalQuiz.getId());
        assertNotNull(status);
        assertTrue(Boolean.TRUE.equals(status.get("unlocked")));
        assertTrue(Boolean.TRUE.equals(status.get("allLessonsCompleted")));
        assertTrue(Boolean.TRUE.equals(status.get("allModuleQuizzesPassed")));
    }

    // =========================================================================
    // 5. DOCUMENT ACCESS PROTECTION FOR LOCKED LESSONS
    // =========================================================================

    @Test
    @DisplayName("14. Document download rejected with 403 Forbidden if lesson is locked")
    void testDocumentAccess_LockedForIncompletePrerequisites() {
        // Lesson 2 is locked because Lesson 1 is not complete
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                lessonDocumentAccessService.viewDocument("LES-102")
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertTrue(Objects.requireNonNull(ex.getReason()).contains("Lesson is locked"));
    }

    // =========================================================================
    // 6. FOUNDATION vs STANDARD COURSE PROGRESS CONSISTENCY
    // =========================================================================

    @Test
    @DisplayName("15. Foundation course shows accurate incomplete progress and reaches 100% on all lessons complete")
    void testFoundationCourse_AccurateProgressAndReaches100PercentOnCompletion() {
        testCourse.setFoundation(true);
        activeEnrollment.setStatus(EnrollmentStatus.NOT_STARTED);
        activeEnrollment.setProgressPercent(0);
        when(quizRepository.findByCourseIdAndType(100L, QuizType.MODULE)).thenReturn(Collections.emptyList());
        when(quizRepository.findTopByModuleIdOrderByIdDesc(1L)).thenReturn(Optional.empty());
        when(quizRepository.findByModuleId(1L)).thenReturn(Optional.empty());

        // 1 of 3 lessons complete -> 33%
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 100, 10, 10);
        assertEquals(33, activeEnrollment.getProgressPercent());
        assertEquals(EnrollmentStatus.IN_PROGRESS, activeEnrollment.getStatus());

        // 2 of 3 lessons complete -> 67%
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson2.getId(), 100, 20, 20);
        assertEquals(67, activeEnrollment.getProgressPercent());
        assertEquals(EnrollmentStatus.IN_PROGRESS, activeEnrollment.getStatus());

        // 3 of 3 lessons complete -> 100% and COMPLETED (no 99% cap)
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson3.getId(), 100, 30, 30);
        assertEquals(100, activeEnrollment.getProgressPercent());
        assertEquals(EnrollmentStatus.COMPLETED, activeEnrollment.getStatus());
        assertNotNull(activeEnrollment.getCompletedDate());

        // Reviewing Lesson 1 preserves 100% progress and COMPLETED status
        LessonProgressDTO reviewed = lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 25, 15, 15);
        assertTrue(reviewed.getCompleted());
        assertEquals(100, reviewed.getCompletionPercent());
        assertEquals(100, activeEnrollment.getProgressPercent());
        assertEquals(EnrollmentStatus.COMPLETED, activeEnrollment.getStatus());
    }

    @Test
    @DisplayName("16. Standard course progress is strictly capped at 98% until final assessment is passed")
    void testStandardCourse_ProgressCappedAt98PercentUntilFinalPassed() {
        testCourse.setFoundation(false);
        activeEnrollment.setStatus(EnrollmentStatus.NOT_STARTED);
        activeEnrollment.setProgressPercent(0);

        // Complete Module 1 lessons (2/4 items -> round(2 * 98 / 4) = 49%)
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 100, 10, 10);
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson2.getId(), 100, 20, 20);
        assertEquals(49, activeEnrollment.getProgressPercent());

        // Pass Module 1 Quiz and complete Module 2 lesson 3 (4/4 items -> capped at 98%)
        when(quizProgressRepository.existsByQuiz_IdAndUser_IdAndPassedTrue(module1Quiz.getId(), employee.getId()))
                .thenReturn(true);
        lessonProgressService.updateProgress(activeEnrollment.getId(), lesson3.getId(), 100, 30, 30);

        assertEquals(98, activeEnrollment.getProgressPercent());
        assertEquals(EnrollmentStatus.IN_PROGRESS, activeEnrollment.getStatus());
    }

    // =========================================================================
    // 7. PHASE 5 STEP 3: VIDEO & PDF LEARNING EXPERIENCE TESTS
    // =========================================================================

    @Test
    @DisplayName("17. Video progress checkpoints save resume position and reject stale out-of-order updates")
    void testVideoCheckpoints_SaveResumePositionAndProtectAgainstStaleCheckpoints() {
        // Save checkpoint 1 at 40% (120s watched, 120s position)
        LessonProgressDTO cp1 = lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 40, 120, 120);
        assertFalse(cp1.getCompleted());
        assertEquals(40, cp1.getCompletionPercent());
        assertEquals(120, cp1.getWatchedSeconds());
        assertEquals(120, cp1.getLastPositionSeconds());

        // Save checkpoint 2 at 70% (210s watched, 210s position)
        LessonProgressDTO cp2 = lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 70, 210, 210);
        assertFalse(cp2.getCompleted());
        assertEquals(70, cp2.getCompletionPercent());
        assertEquals(210, cp2.getWatchedSeconds());
        assertEquals(210, cp2.getLastPositionSeconds());

        // Out-of-order stale network request from earlier checkpoint (20%, 60s watched, 60s position)
        // Must NOT overwrite 70% completion, 210s watched, or 210s position
        LessonProgressDTO stale = lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 20, 60, 60);
        assertFalse(stale.getCompleted());
        assertEquals(70, stale.getCompletionPercent());
        assertEquals(210, stale.getWatchedSeconds());
        assertEquals(210, stale.getLastPositionSeconds());

        // Legitimate learner rewind with current/higher cumulative watched time (30%, 225s watched, 90s position)
        // Preserves 70% max progress while updating resume position to 90s
        LessonProgressDTO rewind = lessonProgressService.updateProgress(activeEnrollment.getId(), lesson1.getId(), 30, 225, 90);
        assertFalse(rewind.getCompleted());
        assertEquals(70, rewind.getCompletionPercent());
        assertEquals(225, rewind.getWatchedSeconds());
        assertEquals(90, rewind.getLastPositionSeconds());
    }

    @Test
    @DisplayName("18. Tab-switch auto-pause checkpoint never falsely completes lesson; completion is idempotent")
    void testTabSwitchCheckpoint_DoesNotFalselyCompleteAndCompletionIsIdempotent() {
        // Learner watches to 99% and switches tab -> auto-pause checkpoint capped at 99%
        LessonProgressDTO tabPauseCheckpoint = lessonProgressService.updateProgress(
                activeEnrollment.getId(), lesson1.getId(), 99, 295, 295);
        assertFalse(tabPauseCheckpoint.getCompleted());
        assertEquals(99, tabPauseCheckpoint.getCompletionPercent());
        assertEquals(295, tabPauseCheckpoint.getLastPositionSeconds());

        // Lesson 2 remains locked until Lesson 1 reaches 100%
        assertThrows(IllegalStateException.class, () ->
                lessonProgressService.updateProgress(activeEnrollment.getId(), lesson2.getId(), 10, 5, 5)
        );

        // Video finishes -> 100% completion
        LessonProgressDTO completed1 = lessonProgressService.updateProgress(
                activeEnrollment.getId(), lesson1.getId(), 100, 300, 300);
        assertTrue(completed1.getCompleted());
        assertEquals(100, completed1.getCompletionPercent());
        LocalDateTime firstCompletedAt = completed1.getCompletedAt();
        assertNotNull(firstCompletedAt);

        // Duplicate completion request (e.g. reconnect retry) is idempotent and preserves original completedAt
        LessonProgressDTO completedDuplicate = lessonProgressService.updateProgress(
                activeEnrollment.getId(), lesson1.getId(), 100, 300, 300);
        assertTrue(completedDuplicate.getCompleted());
        assertEquals(100, completedDuplicate.getCompletionPercent());
        assertEquals(firstCompletedAt, completedDuplicate.getCompletedAt());
        assertEquals(1, progressStore.size());
    }

    @Test
    @DisplayName("19. Authenticated PDF delivery preserves original filename and does not auto-complete lesson")
    void testPdfDelivery_PreservesOriginalFilenameAndRequiresExplicitCompletion() {
        com.fairmacs.lms.controller.LessonDocumentController controller =
                new com.fairmacs.lms.controller.LessonDocumentController(lessonDocumentAccessService);

        org.springframework.http.ResponseEntity<byte[]> response = controller.viewDocument("LES-101");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("guide.pdf", response.getHeaders().getFirst("X-Document-Filename"));
        assertTrue(Objects.requireNonNull(response.getHeaders().getFirst("Content-Disposition")).contains("guide.pdf"));
        assertTrue(response.getHeaders().getAccessControlExposeHeaders().contains("X-Document-Filename"));
        assertTrue(response.getHeaders().getAccessControlExposeHeaders().contains("Content-Disposition"));

        // Opening/downloading the PDF must NOT create a completed LessonProgress record
        assertTrue(progressStore.isEmpty());

        // Lesson 1 is only completed when learner explicitly clicks Mark Lesson Complete
        LessonProgressDTO explicitComplete = lessonProgressService.updateProgress(
                activeEnrollment.getId(), lesson1.getId(), 100, 0, 0);
        assertTrue(explicitComplete.getCompleted());
    }

    @Test
    @DisplayName("20. Unauthenticated or unenrolled user cannot download PDF lesson document")
    void testPdfDelivery_RejectsUnauthenticatedAndUnenrolledUsers() {
        // Unauthenticated
        securityContextUtil.setCurrentUser(null);
        ResponseStatusException unauthEx = assertThrows(ResponseStatusException.class, () ->
                lessonDocumentAccessService.viewDocument("LES-101")
        );
        assertEquals(HttpStatus.UNAUTHORIZED, unauthEx.getStatusCode());

        // Authenticated but not enrolled
        securityContextUtil.setCurrentUser(otherEmployee);
        lenient().when(userRepository.findById(otherEmployee.getId())).thenReturn(Optional.of(otherEmployee));
        lenient().when(enrollmentRepository.findByUserIdAndCourseId(otherEmployee.getId(), testCourse.getId()))
                .thenReturn(Optional.empty());

        ResponseStatusException forbiddenEx = assertThrows(ResponseStatusException.class, () ->
                lessonDocumentAccessService.viewDocument("LES-101")
        );
        assertEquals(HttpStatus.FORBIDDEN, forbiddenEx.getStatusCode());
    }
}
