package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.DailyLearningActivityDTO;
import com.fairmacs.lms.dto.LearningStreakDTO;
import com.fairmacs.lms.entity.Role;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.QuizAttemptRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LearningStreakServiceTest {

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
    private LessonProgressRepository lessonProgressRepository;

    @Mock
    private QuizAttemptRepository quizAttemptRepository;

    private TestSecurityContextUtil securityContextUtil;

    private LearningStreakService learningStreakService;

    private User testUser;
    private final Long TEST_USER_ID = 42L;

    @BeforeEach
    void setUp() {
        securityContextUtil = new TestSecurityContextUtil();
        learningStreakService = new LearningStreakService(
                lessonProgressRepository,
                quizAttemptRepository,
                securityContextUtil
        );

        testUser = new User();
        testUser.setId(TEST_USER_ID);
        testUser.setEmail("arjun.mehta@fairmacs.com");
        testUser.setName("Arjun Mehta");
        testUser.setRole(Role.EMPLOYEE);
    }

    @Test
    @DisplayName("1. Employee with no learning activity: returns 0 streaks and empty-state week")
    void testZeroActivityEmployee() {
        securityContextUtil.setCurrentUser(testUser);
        when(lessonProgressRepository.findCompletedLessonTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());
        when(quizAttemptRepository.findCompletedQuizTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());

        LearningStreakDTO dto = learningStreakService.getEmployeeStreaks();

        assertNotNull(dto);
        assertEquals(0, dto.getCurrentStreak());
        assertEquals(0, dto.getLongestStreak());
        assertEquals(0, dto.getWeeklyActiveDays());
        assertEquals(0, dto.getWeeklyCompletedLessons());
        assertEquals(0, dto.getWeeklySubmittedQuizzes());
        assertEquals(5, dto.getWeeklyTargetDays());
        assertEquals(5, dto.getWeeklyTargetLessons());
        assertEquals("Asia/Kolkata", dto.getTimezone());
        assertEquals(7, dto.getDailyActivity().size());

        for (DailyLearningActivityDTO day : dto.getDailyActivity()) {
            assertFalse(day.isActive());
            assertEquals(0, day.getCompletedLessons());
            assertEquals(0, day.getSubmittedQuizzes());
        }
    }

    @Test
    @DisplayName("2. Employee with one completed lesson today: active day = 1, current streak = 1")
    void testOneCompletedLessonToday() {
        LocalDate asOfDate = LocalDate.of(2026, Month.NOVEMBER, 17); // Tuesday
        LocalDateTime lessonUtc = LocalDateTime.of(2026, Month.NOVEMBER, 17, 6, 0); // 11:30 AM IST

        when(lessonProgressRepository.findCompletedLessonTimestampsByUserId(TEST_USER_ID))
                .thenReturn(List.of(lessonUtc));
        when(quizAttemptRepository.findCompletedQuizTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());

        LearningStreakDTO dto = learningStreakService.calculateStreaksForUser(TEST_USER_ID, asOfDate);

        assertEquals(1, dto.getCurrentStreak());
        assertEquals(1, dto.getLongestStreak());
        assertEquals(1, dto.getWeeklyActiveDays());
        assertEquals(1, dto.getWeeklyCompletedLessons());
        assertEquals(0, dto.getWeeklySubmittedQuizzes());

        // Tuesday (index 1) should be active
        DailyLearningActivityDTO tuesday = dto.getDailyActivity().get(1);
        assertEquals("2026-11-17", tuesday.getDate());
        assertTrue(tuesday.isActive());
        assertEquals(1, tuesday.getCompletedLessons());
        assertEquals(0, tuesday.getSubmittedQuizzes());
    }

    @Test
    @DisplayName("3. Employee with one submitted quiz today: active day = 1, current streak = 1")
    void testOneSubmittedQuizToday() {
        LocalDate asOfDate = LocalDate.of(2026, Month.NOVEMBER, 17);
        LocalDateTime quizUtc = LocalDateTime.of(2026, Month.NOVEMBER, 17, 8, 30);

        when(lessonProgressRepository.findCompletedLessonTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());
        when(quizAttemptRepository.findCompletedQuizTimestampsByUserId(TEST_USER_ID))
                .thenReturn(List.of(quizUtc));

        LearningStreakDTO dto = learningStreakService.calculateStreaksForUser(TEST_USER_ID, asOfDate);

        assertEquals(1, dto.getCurrentStreak());
        assertEquals(1, dto.getLongestStreak());
        assertEquals(1, dto.getWeeklyActiveDays());
        assertEquals(0, dto.getWeeklyCompletedLessons());
        assertEquals(1, dto.getWeeklySubmittedQuizzes());
    }

    @Test
    @DisplayName("4. Multiple lessons and quiz on same day: counts as 1 active day, multiple counts")
    void testMultipleActivitiesOnSameDay() {
        LocalDate asOfDate = LocalDate.of(2026, Month.NOVEMBER, 17);
        LocalDateTime lesson1 = LocalDateTime.of(2026, Month.NOVEMBER, 17, 4, 0);
        LocalDateTime lesson2 = LocalDateTime.of(2026, Month.NOVEMBER, 17, 5, 0);
        LocalDateTime quiz1 = LocalDateTime.of(2026, Month.NOVEMBER, 17, 7, 0);

        when(lessonProgressRepository.findCompletedLessonTimestampsByUserId(TEST_USER_ID))
                .thenReturn(List.of(lesson1, lesson2));
        when(quizAttemptRepository.findCompletedQuizTimestampsByUserId(TEST_USER_ID))
                .thenReturn(List.of(quiz1));

        LearningStreakDTO dto = learningStreakService.calculateStreaksForUser(TEST_USER_ID, asOfDate);

        assertEquals(1, dto.getCurrentStreak());
        assertEquals(1, dto.getWeeklyActiveDays()); // Only 1 active day
        assertEquals(2, dto.getWeeklyCompletedLessons()); // 2 lessons
        assertEquals(1, dto.getWeeklySubmittedQuizzes()); // 1 quiz

        DailyLearningActivityDTO tuesday = dto.getDailyActivity().get(1);
        assertTrue(tuesday.isActive());
        assertEquals(2, tuesday.getCompletedLessons());
        assertEquals(1, tuesday.getSubmittedQuizzes());
    }

    @Test
    @DisplayName("5. Consecutive active days: calculates correct streak")
    void testConsecutiveActiveDays() {
        LocalDate asOfDate = LocalDate.of(2026, Month.NOVEMBER, 17); // Tue
        // Activities on Nov 15 (Sun), Nov 16 (Mon), Nov 17 (Tue)
        LocalDateTime sun = LocalDateTime.of(2026, Month.NOVEMBER, 15, 6, 0);
        LocalDateTime mon = LocalDateTime.of(2026, Month.NOVEMBER, 16, 6, 0);
        LocalDateTime tue = LocalDateTime.of(2026, Month.NOVEMBER, 17, 6, 0);

        when(lessonProgressRepository.findCompletedLessonTimestampsByUserId(TEST_USER_ID))
                .thenReturn(List.of(sun, mon, tue));
        when(quizAttemptRepository.findCompletedQuizTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());

        LearningStreakDTO dto = learningStreakService.calculateStreaksForUser(TEST_USER_ID, asOfDate);

        assertEquals(3, dto.getCurrentStreak());
        assertEquals(3, dto.getLongestStreak());
        assertEquals(2, dto.getWeeklyActiveDays()); // Mon + Tue are in the current week
    }

    @Test
    @DisplayName("6. Activity yesterday but not yet today: streak continues from yesterday")
    void testActivityYesterdayNotToday() {
        LocalDate asOfDate = LocalDate.of(2026, Month.NOVEMBER, 17); // Tue
        // Activities on Nov 15 (Sun) and Nov 16 (Mon), nothing on Nov 17 yet
        LocalDateTime sun = LocalDateTime.of(2026, Month.NOVEMBER, 15, 6, 0);
        LocalDateTime mon = LocalDateTime.of(2026, Month.NOVEMBER, 16, 6, 0);

        when(lessonProgressRepository.findCompletedLessonTimestampsByUserId(TEST_USER_ID))
                .thenReturn(List.of(sun, mon));
        when(quizAttemptRepository.findCompletedQuizTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());

        LearningStreakDTO dto = learningStreakService.calculateStreaksForUser(TEST_USER_ID, asOfDate);

        // Streak continues from yesterday
        assertEquals(2, dto.getCurrentStreak());
        assertEquals(2, dto.getLongestStreak());
        assertEquals(1, dto.getWeeklyActiveDays()); // Mon is in current week
    }

    @Test
    @DisplayName("7. Broken streak: activity ended 2 days ago -> current streak is 0")
    void testBrokenStreak() {
        LocalDate asOfDate = LocalDate.of(2026, Month.NOVEMBER, 17); // Tue
        // Last activity on Nov 15 (Sun). Neither Monday Nov 16 nor Tuesday Nov 17 has activity.
        LocalDateTime sun = LocalDateTime.of(2026, Month.NOVEMBER, 15, 6, 0);
        LocalDateTime sat = LocalDateTime.of(2026, Month.NOVEMBER, 14, 6, 0);

        when(lessonProgressRepository.findCompletedLessonTimestampsByUserId(TEST_USER_ID))
                .thenReturn(List.of(sat, sun));
        when(quizAttemptRepository.findCompletedQuizTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());

        LearningStreakDTO dto = learningStreakService.calculateStreaksForUser(TEST_USER_ID, asOfDate);

        assertEquals(0, dto.getCurrentStreak()); // Broken streak
        assertEquals(2, dto.getLongestStreak()); // Historical longest streak was 2
        assertEquals(0, dto.getWeeklyActiveDays()); // Zero in this week
    }

    @Test
    @DisplayName("8. Longest streak exceeding 60 days: fully preserved without artificial cap")
    void testLongestStreakExceeding60Days() {
        LocalDate asOfDate = LocalDate.of(2026, Month.NOVEMBER, 17);

        // Generate 75 consecutive daily activities ending today
        List<LocalDateTime> longSeries = new ArrayList<>();
        for (int i = 74; i >= 0; i--) {
            LocalDate d = asOfDate.minusDays(i);
            longSeries.add(d.atTime(6, 0)); // 6:00 UTC = 11:30 AM IST
        }

        when(lessonProgressRepository.findCompletedLessonTimestampsByUserId(TEST_USER_ID))
                .thenReturn(longSeries);
        when(quizAttemptRepository.findCompletedQuizTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());

        LearningStreakDTO dto = learningStreakService.calculateStreaksForUser(TEST_USER_ID, asOfDate);

        assertEquals(75, dto.getCurrentStreak(), "Current streak must accurately calculate 75 days");
        assertEquals(75, dto.getLongestStreak(), "Longest streak must accurately record 75 days without a 60-day cap");
    }

    @Test
    @DisplayName("9. Monday and Sunday week boundaries: calendar is strictly Monday-Sunday")
    void testWeekBoundaries() {
        LocalDate asOfDate = LocalDate.of(2026, Month.NOVEMBER, 18); // Wednesday

        when(lessonProgressRepository.findCompletedLessonTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());
        when(quizAttemptRepository.findCompletedQuizTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());

        LearningStreakDTO dto = learningStreakService.calculateStreaksForUser(TEST_USER_ID, asOfDate);

        assertEquals("2026-11-16", dto.getWeekStart(), "Week start must be Monday");
        assertEquals("2026-11-22", dto.getWeekEnd(), "Week end must be Sunday");
        assertEquals(7, dto.getDailyActivity().size());
        assertEquals("Mon", dto.getDailyActivity().get(0).getDay());
        assertEquals("2026-11-16", dto.getDailyActivity().get(0).getDate());
        assertEquals("Sun", dto.getDailyActivity().get(6).getDay());
        assertEquals("2026-11-22", dto.getDailyActivity().get(6).getDate());
    }

    @Test
    @DisplayName("10. UTC to IST conversion: late UTC night maps to next morning in IST")
    void testUtcToIstDateConversion() {
        LocalDate asOfDate = LocalDate.of(2026, Month.NOVEMBER, 18); // Wed

        // Completed at 20:30 UTC on Nov 17 -> In IST (+5:30) it is 02:00 AM on Nov 18!
        LocalDateTime lateUtc = LocalDateTime.of(2026, Month.NOVEMBER, 17, 20, 30);

        when(lessonProgressRepository.findCompletedLessonTimestampsByUserId(TEST_USER_ID))
                .thenReturn(List.of(lateUtc));
        when(quizAttemptRepository.findCompletedQuizTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());

        LearningStreakDTO dto = learningStreakService.calculateStreaksForUser(TEST_USER_ID, asOfDate);

        // Should be attributed to Nov 18 in IST
        DailyLearningActivityDTO wednesday = dto.getDailyActivity().get(2);
        assertEquals("2026-11-18", wednesday.getDate());
        assertTrue(wednesday.isActive(), "Late UTC completion must map to next calendar day in IST");
        assertEquals(1, wednesday.getCompletedLessons());

        DailyLearningActivityDTO tuesday = dto.getDailyActivity().get(1);
        assertFalse(tuesday.isActive(), "Tuesday IST had no activity");
    }

    @Test
    @DisplayName("11. Year and month boundary transitions: streak continues uninterrupted")
    void testMonthAndYearBoundary() {
        LocalDate asOfDate = LocalDate.of(2027, Month.JANUARY, 2); // Jan 2, 2027

        // Activities on Dec 31, 2026, Jan 1, 2027, and Jan 2, 2027
        LocalDateTime dec31 = LocalDateTime.of(2026, Month.DECEMBER, 31, 6, 0);
        LocalDateTime jan1 = LocalDateTime.of(2027, Month.JANUARY, 1, 6, 0);
        LocalDateTime jan2 = LocalDateTime.of(2027, Month.JANUARY, 2, 6, 0);

        when(lessonProgressRepository.findCompletedLessonTimestampsByUserId(TEST_USER_ID))
                .thenReturn(List.of(dec31, jan1, jan2));
        when(quizAttemptRepository.findCompletedQuizTimestampsByUserId(TEST_USER_ID))
                .thenReturn(Collections.emptyList());

        LearningStreakDTO dto = learningStreakService.calculateStreaksForUser(TEST_USER_ID, asOfDate);

        assertEquals(3, dto.getCurrentStreak());
        assertEquals(3, dto.getLongestStreak());
    }

    @Test
    @DisplayName("12. Security: unauthorized request without authenticated principal throws 401")
    void testUnauthorizedRequestThrowsException() {
        securityContextUtil.setCurrentUser(null);

        assertThrows(ResponseStatusException.class, () -> {
            learningStreakService.getEmployeeStreaks();
        });
    }
}
