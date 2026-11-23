package com.fairmacs.lms.service;

import com.fairmacs.lms.dto.DailyLearningActivityDTO;
import com.fairmacs.lms.dto.LearningStreakDTO;
import com.fairmacs.lms.entity.User;
import com.fairmacs.lms.repository.LessonProgressRepository;
import com.fairmacs.lms.repository.QuizAttemptRepository;
import com.fairmacs.lms.security.SecurityContextUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
import java.util.*;

/**
 * Fairmacs KMS — Learning Streak & Dual Activity Rings Service
 *
 * Implements strict business rules for learning consistency tracking:
 * 1. Only genuine completed milestones qualify:
 *    - Completed lessons (completed = true, completed_at is not null)
 *    - Submitted quiz attempts (completed_at is not null)
 * 2. Stored UTC timestamps are converted to Asia/Kolkata for exact calendar day alignment.
 * 3. A day with multiple milestones counts as one active day.
 * 4. Current streak starts today if active, or continues from yesterday. If neither, it is zero.
 * 5. Longest streak evaluates all available recorded history without an arbitrary 30-day or 60-day cap.
 * 6. Weekly calendar reflects the Monday-Sunday week.
 */
@Service
public class LearningStreakService {

    public static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");
    public static final String TIMEZONE_NAME = "Asia/Kolkata";

    private final LessonProgressRepository lessonProgressRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final SecurityContextUtil securityContextUtil;

    @Value("${fairmacs.learning.target.days:5}")
    private int weeklyTargetDays = 5;

    @Value("${fairmacs.learning.target.lessons:5}")
    private int weeklyTargetLessons = 5;

    public LearningStreakService(
            LessonProgressRepository lessonProgressRepository,
            QuizAttemptRepository quizAttemptRepository,
            SecurityContextUtil securityContextUtil
    ) {
        this.lessonProgressRepository = lessonProgressRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.securityContextUtil = securityContextUtil;
    }

    /**
     * Retrieves learning streak and dual ring metrics for the currently authenticated employee.
     * Enforces strict employee-level isolation (derived from security principal).
     */
    @Transactional(readOnly = true)
    public LearningStreakDTO getEmployeeStreaks() {
        User currentUser = securityContextUtil != null ? securityContextUtil.getCurrentUser() : null;
        if (currentUser == null || currentUser.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated employee session required");
        }
        return calculateStreaksForUser(currentUser.getId(), null);
    }

    /**
     * Calculates streaks and weekly activity for a given user ID as of a specified reference date.
     * Accessible for testing and deterministic date evaluation.
     *
     * @param userId   Target employee ID
     * @param asOfDate Evaluation date (defaults to current date in Asia/Kolkata if null)
     * @return Fully populated LearningStreakDTO
     */
    @Transactional(readOnly = true)
    public LearningStreakDTO calculateStreaksForUser(Long userId, LocalDate asOfDate) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID must not be null");
        }

        LocalDate today = (asOfDate != null) ? asOfDate : LocalDate.now(IST_ZONE);

        // Fetch completion timestamps
        List<LocalDateTime> lessonTimestamps =
                lessonProgressRepository.findCompletedLessonTimestampsByUserId(userId);
        List<LocalDateTime> quizTimestamps =
                quizAttemptRepository.findCompletedQuizTimestampsByUserId(userId);

        // Group milestones by IST calendar date
        Map<LocalDate, Integer> lessonCountByDate = new HashMap<>();
        if (lessonTimestamps != null) {
            for (LocalDateTime ts : lessonTimestamps) {
                if (ts != null) {
                    LocalDate d = toIstDate(ts);
                    lessonCountByDate.merge(d, 1, Integer::sum);
                }
            }
        }

        Map<LocalDate, Integer> quizCountByDate = new HashMap<>();
        if (quizTimestamps != null) {
            for (LocalDateTime ts : quizTimestamps) {
                if (ts != null) {
                    LocalDate d = toIstDate(ts);
                    quizCountByDate.merge(d, 1, Integer::sum);
                }
            }
        }

        // Distinct qualifying active dates (a day with lesson or quiz or both = 1 active day)
        Set<LocalDate> activeDates = new HashSet<>();
        activeDates.addAll(lessonCountByDate.keySet());
        activeDates.addAll(quizCountByDate.keySet());

        // 1. Calculate Current Streak
        int currentStreak = calculateCurrentStreak(activeDates, today);

        // 2. Calculate Longest Streak across all recorded history
        int longestStreak = calculateLongestStreak(activeDates, currentStreak);

        // 3. Weekly Monday-Sunday window
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate weekEnd = today.with(DayOfWeek.SUNDAY);

        List<DailyLearningActivityDTO> dailyActivity = new ArrayList<>(7);
        int weeklyCompletedLessons = 0;
        int weeklySubmittedQuizzes = 0;
        int weeklyActiveDays = 0;

        for (int i = 0; i < 7; i++) {
            LocalDate date = weekStart.plusDays(i);
            int lessons = lessonCountByDate.getOrDefault(date, 0);
            int quizzes = quizCountByDate.getOrDefault(date, 0);
            boolean active = (lessons > 0 || quizzes > 0);

            if (active) {
                weeklyActiveDays++;
            }
            weeklyCompletedLessons += lessons;
            weeklySubmittedQuizzes += quizzes;

            String dayName = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            dailyActivity.add(new DailyLearningActivityDTO(
                    date.toString(),
                    dayName,
                    lessons,
                    quizzes,
                    active
            ));
        }

        return new LearningStreakDTO(
                currentStreak,
                longestStreak,
                weeklyActiveDays,
                weeklyCompletedLessons,
                weeklySubmittedQuizzes,
                weeklyTargetDays,
                weeklyTargetLessons,
                weekStart.toString(),
                weekEnd.toString(),
                TIMEZONE_NAME,
                dailyActivity
        );
    }

    /**
     * Converts a stored UTC timestamp to Asia/Kolkata calendar date.
     */
    public static LocalDate toIstDate(LocalDateTime utcTimestamp) {
        if (utcTimestamp == null) return null;
        return utcTimestamp.atZone(ZoneOffset.UTC)
                .withZoneSameInstant(IST_ZONE)
                .toLocalDate();
    }

    /**
     * Current streak:
     * - Consecutive calendar days with >= 1 milestone
     * - Starts from today if today has activity
     * - Otherwise continues from yesterday if yesterday has activity
     * - If neither has activity, streak is 0
     */
    private int calculateCurrentStreak(Set<LocalDate> activeDates, LocalDate today) {
        if (activeDates == null || activeDates.isEmpty()) {
            return 0;
        }

        LocalDate yesterday = today.minusDays(1);
        LocalDate checkDate = null;

        if (activeDates.contains(today)) {
            checkDate = today;
        } else if (activeDates.contains(yesterday)) {
            checkDate = yesterday;
        }

        if (checkDate == null) {
            return 0;
        }

        int streak = 0;
        while (activeDates.contains(checkDate)) {
            streak++;
            checkDate = checkDate.minusDays(1);
        }

        return streak;
    }

    /**
     * Longest streak:
     * - Longest consecutive sequence of qualifying dates in available recorded history.
     */
    private int calculateLongestStreak(Set<LocalDate> activeDates, int currentStreak) {
        if (activeDates == null || activeDates.isEmpty()) {
            return 0;
        }

        List<LocalDate> sortedDates = activeDates.stream().sorted().toList();
        int longest = 1;
        int currentRun = 1;

        for (int i = 1; i < sortedDates.size(); i++) {
            LocalDate prev = sortedDates.get(i - 1);
            LocalDate curr = sortedDates.get(i);

            if (curr.equals(prev.plusDays(1))) {
                currentRun++;
            } else if (!curr.equals(prev)) {
                currentRun = 1;
            }

            if (currentRun > longest) {
                longest = currentRun;
            }
        }

        return Math.max(longest, currentStreak);
    }

    public void setWeeklyTargetDays(int weeklyTargetDays) {
        this.weeklyTargetDays = weeklyTargetDays;
    }

    public void setWeeklyTargetLessons(int weeklyTargetLessons) {
        this.weeklyTargetLessons = weeklyTargetLessons;
    }
}
